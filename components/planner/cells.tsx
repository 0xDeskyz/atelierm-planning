"use client";

import { useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Edit3 } from "lucide-react";
import { cx, toLocalKey, cellKey, getPortion } from "../../lib/planner/helpers";
import { PASTELS, EVENT_TYPES, EVENT_CELL_STYLE, ABSENCE_BADGE } from "../../lib/planner/constants";
import { AssignmentChip } from "./chips";

function useLongPress(callback: () => void, ms = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef<{ x: number; y: number } | null>(null);
  const start = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    startedAt.current = { x: e.clientX, y: e.clientY };
    timer.current = setTimeout(() => { callback(); timer.current = null; }, ms);
  };
  const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } startedAt.current = null; };
  const move = (e: React.PointerEvent) => {
    if (!startedAt.current || !timer.current) return;
    const dx = Math.abs(e.clientX - startedAt.current.x);
    const dy = Math.abs(e.clientY - startedAt.current.y);
    if (dx > 12 || dy > 12) cancel();
  };
  return { onPointerDown: start, onPointerUp: cancel, onPointerCancel: cancel, onPointerLeave: cancel, onPointerMove: move };
}

// ==================================
// Droppable Cell (Day x Site)
// ==================================
export function DayCell({ date, site, assignments, people, onEditNote, notes, onRemoveAssignment, hoursPerDay, conflictMap, publicHoliday, absencesByDay, onCellAction, locked }: any) {
  const id = `cell-${site.id}-${toLocalKey(date)}`;
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: "day-site", date, site }, disabled: locked });
  const longPress = useLongPress(() => { if (onCellAction && !locked) onCellAction(date, site); }, 500);
  const todays = assignments.filter((a: any) => a.date === toLocalKey(date) && a.siteId === site.id);
  const key = cellKey(site.id, toLocalKey(date));
  const raw = notes[key];
  const meta = typeof raw === "string" ? { text: raw } : (raw || {});
  const pastel = meta.highlight && PASTELS[meta.highlight] ? meta.highlight : null;
  const status = meta.holiday ? "holiday" : (meta.blocked ? "blocked" : null);
  const unavailable = Boolean(status);
  const hoursLabel = meta.hoursOverride !== undefined && meta.hoursOverride !== null && meta.hoursOverride !== "" ? `${meta.hoursOverride}h` : null;
  const baseHours = Number.isFinite(Number(meta.hoursOverride ?? hoursPerDay)) ? Number(meta.hoursOverride ?? hoursPerDay) : 0;

  return (
    <div
      className={cx(
        "relative border min-h-20 p-2 rounded-xl bg-white magic-cell",
        locked && "opacity-90 pointer-events-auto",
        isOver ? "ring-2 ring-sky-400 is-over" : "",
        status === "holiday"
          ? "bg-red-50 ring-2 ring-red-300 border-red-200"
          : status === "blocked"
          ? "bg-sky-50 ring-2 ring-sky-300 border-sky-200"
          : pastel
          ? `${PASTELS[pastel].bg} ${PASTELS[pastel].ring} ring-2`
          : "border-neutral-200",
        unavailable ? "opacity-90" : ""
      )}
      ref={setNodeRef}
      title={meta.text || ""}
      onContextMenu={(e) => { if (!onCellAction || locked) return; e.preventDefault(); onCellAction(date, site); }}
      {...longPress}
    >
      {locked && (
        <div className="absolute top-1 right-1 text-[10px] text-neutral-400" title="Semaine validée — déverrouille pour modifier">🔒</div>
      )}
      {/* Top bar */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {publicHoliday && (<div className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-medium">{publicHoliday === "Pont" ? "🌉 Pont" : `🎌 ${publicHoliday}`}</div>)}
          {meta.holiday && !publicHoliday && (<div className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">🏖 Non travaillé</div>)}
          {meta.blocked && !meta.holiday && (<div className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 font-medium">🚧 Indisponible</div>)}
          {meta.eventType && (() => {
            const et = EVENT_TYPES.find((e) => e.id === meta.eventType);
            return et ? (
              <div className={cx("text-[10px] px-1.5 py-0.5 rounded-full border font-medium", EVENT_CELL_STYLE[et.id])}>
                {et.icon} {et.label}{meta.text ? ` · ${meta.text}` : ""}
              </div>
            ) : null;
          })()}
          {!meta.eventType && meta.text && (
            <div className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200 max-w-[80%] truncate" title={meta.text}>
              📝 {meta.text}
            </div>
          )}
          {hoursLabel && (
            <div className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200" title="Heures spécifiques">
              ⏱ {hoursLabel}
            </div>
          )}
        </div>
        <div className="text-[11px] text-neutral-400 shrink-0 ml-1">{date.getDate()}</div>
      </div>

      {/* Assignments list */}
      <div className="flex flex-wrap gap-1.5">
        {todays.map((a: any) => {
          const p = people.find((pp: any) => pp.id === a.personId);
          const conflictKey = `${a.personId}|${a.date}`;
          const conflict = (conflictMap?.[conflictKey] || 0) > 1;
          const absence = absencesByDay?.[toLocalKey(date)]?.[a.personId] as string | undefined;
          const personBase = meta.hoursOverride != null && meta.hoursOverride !== ""
            ? Number(meta.hoursOverride)
            : (p?.hoursPerDay ?? baseHours);
          return p ? (
            <div key={a.id} className="flex items-center gap-1">
              <AssignmentChip
                a={a}
                person={p}
                onRemove={() => onRemoveAssignment(a.id)}
                baseHours={Number.isFinite(personBase) ? personBase : baseHours}
                conflict={conflict}
              />
              {absence && (
                <span className={cx("text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0", ABSENCE_BADGE[absence] || "bg-neutral-400")} title={absence === "CP" ? "Congé payé" : absence === "MAL" ? "Maladie" : "Jour off / RTT"}>
                  {absence}
                </span>
              )}
            </div>
          ) : null;
        })}
      </div>

      {/* Edit button */}
      {!locked && (
        <div className="mt-1.5 flex justify-end">
          <button onClick={() => onEditNote(date, site)} className="opacity-40 hover:opacity-80 transition" aria-label="Éditer la case" title="Éditer la case">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ==================================
// Hours Cell
// ==================================
export function HoursCell({ date, site, assignments, people, notes, hoursPerDay, conflictMap, onEditNote, onUpdateAssignment, onRemoveAssignment, getInfo }: any) {
  const todays = assignments.filter((a: any) => a.date === toLocalKey(date) && a.siteId === site.id);
  const key = cellKey(site.id, toLocalKey(date));
  const raw = notes[key];
  const meta = typeof raw === "string" ? { text: raw } : (raw || {});
  const status = meta.holiday ? "holiday" : meta.blocked ? "blocked" : null;
  const unavailable = Boolean(status);

  return (
    <div
      className={cx(
        "border min-h-[6rem] p-3 rounded-xl bg-white magic-cell",
        status === "holiday"
          ? "bg-red-50 ring-2 ring-red-300 border-red-200"
          : status === "blocked"
          ? "bg-sky-50 ring-2 ring-sky-300 border-sky-200"
          : "border-neutral-200"
      )}
      title={meta.text || ""}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-neutral-700">{date.getDate()}</span>
          {meta.holiday && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">🏖 Non travaillé</span>}
          {meta.blocked && !meta.holiday && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">🚧 Indispo</span>}
          {meta.eventType && (() => { const et = EVENT_TYPES.find((e) => e.id === meta.eventType); return et ? <span className={cx("text-[10px] px-1.5 py-0.5 rounded-full border font-medium", EVENT_CELL_STYLE[et.id])}>{et.icon}</span> : null; })()}
          {meta.text && !meta.eventType && <span className="text-[10px] text-neutral-400 truncate max-w-[80px]" title={meta.text}>{meta.text}</span>}
        </div>
        <button onClick={() => onEditNote(date, site)} className="opacity-30 hover:opacity-70 transition" title="Éditer">
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1.5">
        {todays.map((a: any) => {
          const p = people.find((pp: any) => pp.id === a.personId);
          if (!p) return null;
          const info = getInfo(a, meta);
          const conflict = (conflictMap?.[`${a.personId}|${a.date}`] || 0) > 1;
          const isFullDay = info.portion === 1;
          const isHalfDay = info.portion === 0.5;
          return (
            <div key={a.id} className="space-y-1">
              {/* Ligne 1 : nom + couleur personne */}
              <div className="flex items-center gap-1.5">
                <span className={cx("w-2.5 h-2.5 rounded-full shrink-0 border border-black/10", p.color || "bg-neutral-400")} />
                <span className="text-xs font-semibold text-neutral-800">{p.name.split(" ")[0]}</span>
                {conflict && <span className="text-[9px] px-1 py-0.5 rounded-full bg-amber-100 text-amber-900 shrink-0">!</span>}
              </div>
              {/* Ligne 2 : contrôles */}
              <div className="flex items-center gap-1">
                <button
                  disabled={unavailable}
                  onClick={() => onUpdateAssignment(a.id, { portion: 1, hours: "" })}
                  className={cx(
                    "h-6 px-2 rounded-md text-[11px] font-semibold border transition",
                    isFullDay && !info.hasCustomHours
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400"
                  )}
                >J</button>
                <button
                  disabled={unavailable}
                  onClick={() => onUpdateAssignment(a.id, { portion: 0.5, hours: "" })}
                  className={cx(
                    "h-6 px-2 rounded-md text-[11px] font-semibold border transition",
                    isHalfDay && !info.hasCustomHours
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400"
                  )}
                >½</button>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  disabled={unavailable}
                  value={info.hasCustomHours ? String(a.hours) : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    onUpdateAssignment(a.id, { hours: v === "" ? "" : v });
                  }}
                  placeholder={`${info.suggestedHours}h`}
                  title="Heures réelles ce jour"
                  className={cx(
                    "h-6 w-12 rounded-md border text-[11px] text-center font-semibold transition px-1 outline-none",
                    info.hasCustomHours
                      ? "border-sky-400 bg-sky-50 text-sky-700"
                      : "border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300"
                  )}
                />
                <button
                  onClick={() => onRemoveAssignment(a.id)}
                  className="h-6 w-6 rounded-md border border-neutral-200 bg-white text-neutral-300 hover:border-red-300 hover:text-red-400 transition flex items-center justify-center text-xs ml-auto"
                  title="Retirer"
                >×</button>
              </div>
            </div>
          );
        })}
        {todays.length === 0 && (
          <div className="text-[11px] text-neutral-400 italic">Aucune affectation</div>
        )}
      </div>
    </div>
  );
}
