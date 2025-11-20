"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  useDraggable,
} from "@dnd-kit/core";

import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Users,
  Plus,
  Trash2,
  RotateCcw,
  Upload,
  Download,
  Copy,
  Eraser,
} from "lucide-react";

// ================= UI maison (Tailwind)
const cx = (...cls: (string | false | null | undefined)[]) => cls.filter(Boolean).join(" ");

function Button({ children, className = "", variant = "default", size = "md", ...props }: any) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    default: "bg-black text-white hover:bg-black/90",
    outline: "border border-neutral-300 hover:bg-neutral-50",
    ghost: "hover:bg-neutral-100",
  };
  const sizes: Record<string, string> = { sm: "h-8 px-3 text-sm", md: "h-9 px-4 text-sm", icon: "h-9 w-9" };
  return (
    <button className={cx(base, variants[variant] || variants.default, sizes[size] || sizes.md, className)} {...props}>
      {children}
    </button>
  );
}
function Card({ children, className = "" }: any) {
  return <div className={cx("border rounded-xl bg-white", className)}>{children}</div>;
}
function CardContent({ children, className = "" }: any) {
  return <div className={cx("p-4", className)}>{children}</div>;
}
function Input(props: any) {
  return (
    <input
      {...props}
      className={cx(
        "w-full h-9 px-3 rounded-md border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-sky-400",
        props.className
      )}
    />
  );
}
function Textarea(props: any) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full min-h-28 p-3 rounded-md border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-sky-400",
        props.className
      )}
    />
  );
}

// Tabs
const TabsCtx = React.createContext<{ value: string; onValueChange: (v: string) => void } | null>(null);
function Tabs({ value, onValueChange, children }: any) {
  return <TabsCtx.Provider value={{ value, onValueChange }}>{children}</TabsCtx.Provider>;
}
function TabsList({ children, className = "" }: any) {
  return (
    <div role="tablist" aria-label="Vues" className={cx("inline-flex gap-1 bg-neutral-100 p-1 rounded-lg", className)}>
      {children}
    </div>
  );
}
function TabsTrigger({ value, children }: any) {
  const ctx = (React.useContext(TabsCtx) || { value: undefined, onValueChange: () => {} }) as any;
  const active = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={() => ctx.onValueChange(value)}
      className={cx("px-3 py-1.5 rounded-md text-sm", active ? "bg-white shadow text-black" : "text-neutral-600 hover:bg-white/70")}
    >
      {children}
    </button>
  );
}

// Dialog (basique)
function Dialog({ open, onOpenChange, children }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange?.(false)} />
      {children}
    </div>
  );
}
function DialogContent({ children, className = "" }: any) {
  return <div className={cx("relative z-10 w-full max-w-lg rounded-xl bg-white p-4 shadow-lg", className)}>{children}</div>;
}
function DialogHeader({ children }: any) {
  return <div className="mb-2">{children}</div>;
}
function DialogTitle({ children }: any) {
  return <div className="text-lg font-semibold">{children}</div>;
}
function DialogFooter({ children }: any) {
  return <div className="mt-3 flex items-center justify-end gap-2">{children}</div>;
}

// ==================================
// Constantes & Démo
// ==================================
const COLORS = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-lime-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-fuchsia-500",
  "bg-blue-600",
  "bg-red-400",
  "bg-yellow-400",
  "bg-green-400",
  "bg-purple-400",
  "bg-slate-500",
];

// Pastels (3 options) pour mini post-it & surlignage
const PASTELS: Record<string, { bg: string; ring: string; text: string }> = {
  mint: { bg: "bg-green-100", ring: "ring-green-200", text: "text-green-900" },
  sky: { bg: "bg-sky-100", ring: "ring-sky-200", text: "text-sky-900" },
  peach: { bg: "bg-orange-100", ring: "ring-orange-200", text: "text-orange-900" },
};

// ==================================
// Date Helpers (ISO week, local time, Lun->Ven)
// ==================================
const pad2 = (n: number) => String(n).padStart(2, "0");
const toLocalKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
function startOfISOWeekLocal(d: Date) {
  const c = new Date(d);
  const day = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - day);
  c.setHours(0, 0, 0, 0);
  return c;
}
function getWeekDatesLocal(anchor: Date) {
  const start = startOfISOWeekLocal(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(start);
    dd.setDate(start.getDate() + i);
    return dd;
  });
}
function getISOWeekAndYear(date: Date) {
  const tmp = new Date(date);
  tmp.setHours(0, 0, 0, 0);
  const day = (tmp.getDay() + 6) % 7;
  tmp.setDate(tmp.getDate() - day + 3);
  const isoYear = tmp.getFullYear();
  const jan4 = new Date(isoYear, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const week1Start = new Date(jan4);
  week1Start.setDate(jan4.getDate() - jan4Day);
  const diffMs = tmp.getTime() - week1Start.getTime();
  const week = 1 + Math.floor(diffMs / (7 * 24 * 3600 * 1000));
  return { week, isoYear };
}
const getISOWeek = (d: Date) => getISOWeekAndYear(d).week;
const getISOWeekYear = (d: Date) => getISOWeekAndYear(d).isoYear;
const weekKeyOf = (d: Date) => `${getISOWeekYear(d)}-W${pad2(getISOWeek(d))}`;
const getISOWeeksInYear = (year: number) => getISOWeek(new Date(year, 11, 28));
function getMonthWeeks(anchor: Date) {
  const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const lastDay = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const weeks: Date[][] = [];
  let start = startOfISOWeekLocal(firstDay);

  while (true) {
    const week = Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(start);
      dd.setDate(start.getDate() + i);
      return dd;
    });

    const overlapsMonth = week.some((d) => d.getMonth() === firstDay.getMonth());
    if (!overlapsMonth && start > lastDay) break;
    if (overlapsMonth) weeks.push(week);

    start = new Date(start);
    start.setDate(start.getDate() + 7);
  }

  return weeks;
}
const startOfMonthLocal = (d: Date) => {
  const dt = new Date(d.getFullYear(), d.getMonth(), 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const endOfMonthLocal = (d: Date) => {
  const dt = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const startOfQuarterLocal = (d: Date) => {
  const quarterStartMonth = Math.floor(d.getMonth() / 3) * 3;
  const dt = new Date(d.getFullYear(), quarterStartMonth, 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const endOfQuarterLocal = (d: Date) => {
  const quarterStartMonth = Math.floor(d.getMonth() / 3) * 3;
  const dt = new Date(d.getFullYear(), quarterStartMonth + 3, 0);
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const startOfYearLocal = (year: number) => {
  const dt = new Date(year, 0, 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const endOfYearLocal = (year: number) => {
  const dt = new Date(year, 12, 0);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const todayKey = toLocalKey(new Date());
const nextMonthKey = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return toLocalKey(d);
})();

const DEMO_PEOPLE = [
  { id: "p1", name: "Ali", color: "bg-rose-500" },
  { id: "p2", name: "Mina", color: "bg-amber-500" },
  { id: "p3", name: "Rachid", color: "bg-emerald-500" },
];
const DEMO_SITES = [
  { id: "s1", name: "Chantier A", startDate: todayKey, endDate: nextMonthKey },
  { id: "s2", name: "Chantier B", startDate: todayKey, endDate: todayKey },
];
const isDateWithin = (date: Date, start: Date, end: Date) => date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
const cellKey = (siteId: string, dateKey: string) => `${siteId}|${dateKey}`;
const mapWeekDates = (src: Date[], dest: Date[]) => {
  const len = Math.min(src.length, dest.length);
  const result: Record<string, string> = {};
  for (let i = 0; i < len; i++) {
    result[toLocalKey(src[i])] = toLocalKey(dest[i]);
  }
  return result;
};
const fromLocalKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y || 0, (m || 1) - 1, d || 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const normalizeSiteRecord = (site: any) => {
  const start = site?.startDate || toLocalKey(new Date());
  const end = site?.endDate || start;
  return { ...site, startDate: start, endDate: end };
};
// Helper format FR (jour mois année)
function formatFR(d: Date, withWeekday: boolean = false): string {
  try {
    const opts: Intl.DateTimeFormatOptions = withWeekday
      ? { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
      : { day: '2-digit', month: 'long', year: 'numeric' };
    return d.toLocaleDateString('fr-FR', opts);
  } catch {
    // Fallback minimal si locale indispo
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
}
// Debounce helper for throttling remote saves
function debounce<T extends (...args:any[])=>void>(fn: T, ms=600) {
  let t: any;
  return (...args: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ==================================
// Draggable Person Chip
// ==================================
function PersonChip({ person }: any) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `person-${person.id}`, data: { type: "person", person } });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`select-none inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm ${person.color} shadow cursor-grab`}>
      <Users className="w-4 h-4" /> {person.name}
    </div>
  );
}

// ==================================
// Assignment chip (draggable)
// ==================================
const getPortion = (val: any) => {
  const portion = Number(val ?? 1);
  return Number.isFinite(portion) && portion > 0 ? portion : 1;
};

function AssignmentChip({ a, person, onRemove, baseHours, conflict }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `assign-${a.id}`,
    data: { type: "assignment", assignmentId: a.id, personId: a.personId, from: { siteId: a.siteId, dateKey: a.date } },
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 5 } : undefined;
  const portion = getPortion(a.portion);
  const hasCustomHours = a.hours !== undefined && a.hours !== null && a.hours !== "";
  const parsedHours = Number(a.hours);
  const hours = hasCustomHours && Number.isFinite(parsedHours) ? parsedHours : baseHours * portion;
  const extraLabel = (() => {
    if (hasCustomHours) return `${hours || 0}h`;
    if (portion !== 1) return portion === 0.5 ? "½j" : `${portion}j`;
    return null;
  })();
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`px-2 py-0.5 rounded-full text-white text-xs ${person.color} flex items-center gap-1 select-none ${isDragging ? "opacity-80 ring-2 ring-black/30" : ""} ${conflict ? "ring-2 ring-amber-400" : ""}`}
      title={hasCustomHours ? `${person.name} – ${hours || 0}h` : portion !== 1 ? `${person.name} – ${portion} journée(s)` : person.name}
    >
      <span>{person.name}</span>
      {extraLabel && <span className="text-[10px] px-1 py-0.5 rounded-full bg-black/30">{extraLabel}</span>}
      {conflict && <span className="text-[10px] px-1 py-0.5 rounded-full bg-amber-200 text-amber-900">Conflit</span>}
      <button className="ml-1 w-4 h-4 leading-none rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center" title="Retirer du jour" aria-label={`Retirer ${person.name}`} onClick={onRemove}>×</button>
    </div>
  );
}

// ==================================
// Droppable Cell (Day x Site)
// ==================================
function DayCell({ date, site, assignments, people, onEditNote, notes, onRemoveAssignment, hoursPerDay, conflictMap }: any) {
  const id = `cell-${site.id}-${toLocalKey(date)}`;
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: "day-site", date, site } });
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
        "border min-h-20 p-2 rounded-xl bg-white",
        isOver ? "ring-2 ring-sky-400" : "",
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
      title={meta.text || meta?.brNote?.text || ""}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 flex-wrap">
          {meta.holiday && (<div className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">Férié</div>)}
          {meta.blocked && !meta.holiday && (<div className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-200">Indispo</div>)}
          {meta.text && (
            <div className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 max-w-[60%] truncate" title={meta.text}>
              {meta.text}
            </div>
          )}
          {hoursLabel && (
            <div className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200" title="Heures spécifiques pour cette case">
              {hoursLabel}
            </div>
          )}
        </div>
        <div className="text-[11px] text-neutral-500">{date.getDate()}</div>
      </div>

      {/* Assignments list */}
      <div className="flex flex-wrap gap-1">
        {todays.map((a: any) => {
          const p = people.find((pp: any) => pp.id === a.personId);
          const conflictKey = `${a.personId}|${a.date}`;
          const conflict = (conflictMap?.[conflictKey] || 0) > 1;
          return p ? (
            <AssignmentChip
              key={a.id}
              a={a}
              person={p}
              onRemove={() => onRemoveAssignment(a.id)}
              baseHours={baseHours}
              conflict={conflict}
            />
          ) : null;
        })}
      </div>

      {/* Bottom bar */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap min-h-[18px]">
          {meta.brNote?.text && (
            <div className={cx("text-[10px] px-1.5 py-0.5 rounded shadow border", meta.brNote.color && PASTELS[meta.brNote.color]?.bg)} title={meta.brNote.text}>
              {meta.brNote.text}
            </div>
          )}
        </div>
        <button onClick={() => onEditNote(date, site)} className="opacity-70 hover:opacity-100" aria-label="Éditer la case" title="Éditer la case">
          <Edit3 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function HoursCell({ date, site, assignments, people, notes, hoursPerDay, conflictMap, onEditNote, onUpdateAssignment, getInfo }: any) {
  const todays = assignments.filter((a: any) => a.date === toLocalKey(date) && a.siteId === site.id);
  const key = cellKey(site.id, toLocalKey(date));
  const raw = notes[key];
  const meta = typeof raw === "string" ? { text: raw } : (raw || {});
  const status = meta.holiday ? "holiday" : meta.blocked ? "blocked" : null;
  const baseValue = Number.isFinite(Number(meta.hoursOverride ?? hoursPerDay)) ? Number(meta.hoursOverride ?? hoursPerDay) : 0;
  const unavailable = Boolean(status);

  return (
    <div
      className={cx(
        "border min-h-[6rem] p-3 rounded-xl bg-white",
        status === "holiday"
          ? "bg-red-50 ring-2 ring-red-300 border-red-200"
          : status === "blocked"
          ? "bg-sky-50 ring-2 ring-sky-300 border-sky-200"
          : "border-neutral-200"
      )}
      title={meta.text || meta?.brNote?.text || ""}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700">{toLocalKey(date)}</span>
          {meta.holiday && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">Férié</span>
          )}
          {meta.blocked && !meta.holiday && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-200">Indispo</span>
          )}
          {meta.text && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 max-w-[60%] truncate" title={meta.text}>
              {meta.text}
            </span>
          )}
          {meta.hoursOverride !== undefined && meta.hoursOverride !== null && meta.hoursOverride !== "" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200" title="Heures propres à la case">
              {meta.hoursOverride}h / jour
            </span>
          )}
        </div>
        <button onClick={() => onEditNote(date, site)} className="opacity-70 hover:opacity-100" aria-label="Éditer la case" title="Éditer la case">
          <Edit3 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {todays.map((a: any) => {
          const p = people.find((pp: any) => pp.id === a.personId);
          if (!p) return null;
          const info = getInfo(a, meta);
          const conflict = (conflictMap?.[`${a.personId}|${a.date}`] || 0) > 1;
          const portionLabel = info.portion === 1 ? "journée" : info.portion === 0.5 ? "½ journée" : `${info.portion} j`;
          const displayHours = Number.isFinite(info.hours) ? info.hours : 0;
          return (
            <div key={a.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-2 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-2">
                    <span className={cx("inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white shadow", p.color)}>
                      <span className="w-2 h-2 rounded-full bg-white/70" />
                      {p.name}
                    </span>
                    <span className="text-[11px] rounded-full bg-white px-2 py-0.5 border border-neutral-200">{portionLabel}</span>
                  </span>
                  {conflict && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">Conflit possible</span>
                  )}
                </div>
                <span className="text-[11px] text-neutral-600">{displayHours.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Button size="sm" variant={info.portion === 1 && !info.hasCustomHours ? "default" : "outline"} disabled={unavailable} onClick={() => onUpdateAssignment(a.id, { portion: 1 })}>
                  Journée
                </Button>
                <Button size="sm" variant={info.portion === 0.5 && !info.hasCustomHours ? "default" : "outline"} disabled={unavailable} onClick={() => onUpdateAssignment(a.id, { portion: 0.5 })}>
                  ½ journée
                </Button>
                <Input
                  type="number"
                  step={0.25}
                  min={0}
                  className="w-24 h-8"
                  disabled={unavailable}
                  value={info.hasCustomHours ? info.hours : ""}
                  placeholder={info.suggestedHours.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                  onChange={(e: any) => onUpdateAssignment(a.id, { hours: e.target.value === "" ? "" : Number(e.target.value) })}
                />
                <Button size="sm" variant="ghost" disabled={unavailable} onClick={() => onUpdateAssignment(a.id, { hours: "" })}>
                  Défaut
                </Button>
              </div>

              <div className="text-[11px] text-neutral-500 leading-snug">
                Base {baseValue}h × {info.portion} = {info.suggestedHours.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h
                {info.hasCustomHours
                  ? " (override manuel)"
                  : meta.hoursOverride
                  ? " (heures de la case)"
                  : ` (heure/jour globale ${hoursPerDay}h)`}
              </div>
            </div>
          );
        })}

        {todays.length === 0 && (
          <div className="text-[11px] text-neutral-500">Aucune affectation sur ce jour.</div>
        )}
      </div>
    </div>
  );
}

// ==================================
// Dialogs
// ==================================
function AddPersonDialog({ open, setOpen, onAdd }: any) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter un salarié</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Input placeholder="Nom" value={name} onChange={(e: any) => setName(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <div key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full cursor-pointer ${c} ${color === c ? "ring-2 ring-black" : ""}`} title={c} />
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => { if (name.trim()) { onAdd(name.trim(), color); setOpen(false); setName(""); setColor(COLORS[0]); } }}>Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSiteDialog({ open, setOpen, onAdd }: any) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState<string>(() => toLocalKey(new Date()));
  const [endDate, setEndDate] = useState<string>(() => toLocalKey(new Date()));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter un chantier</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nom du chantier" value={name} onChange={(e: any) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="space-y-1">
              <span className="text-neutral-600">Début</span>
              <Input type="date" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-neutral-600">Fin</span>
              <Input type="date" value={endDate} min={startDate} onChange={(e: any) => setEndDate(e.target.value)} />
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              const n = name.trim();
              if (!n) return;
              if (!startDate || !endDate || fromLocalKey(endDate) < fromLocalKey(startDate)) {
                window.alert("Merci de saisir des dates de début et fin valides.");
                return;
              }
              onAdd(n, startDate, endDate);
              setOpen(false);
              setName("");
              setStartDate(toLocalKey(new Date()));
              setEndDate(toLocalKey(new Date()));
            }}
          >
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({
  open,
  setOpen,
  name,
  onSave,
  title = "Renommer",
  weekSelection,
  onWeekSelectionChange,
  initialYear,
  startDate,
  endDate,
}: any) {
  const [val, setVal] = useState<string>(name || "");
  const [pickerYear, setPickerYear] = useState<number>(initialYear || new Date().getFullYear());
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>(weekSelection || []);
  const [scheduleStart, setScheduleStart] = useState<string>(startDate || "");
  const [scheduleEnd, setScheduleEnd] = useState<string>(endDate || "");

  useEffect(() => setVal(name || ""), [name]);
  useEffect(() => setSelectedWeeks(weekSelection || []), [weekSelection]);
  useEffect(() => { if (initialYear) setPickerYear(initialYear); }, [initialYear]);
  useEffect(() => setScheduleStart(startDate || ""), [startDate]);
  useEffect(() => setScheduleEnd(endDate || ""), [endDate]);

  const toggleWeek = (wkKey: string) => {
    setSelectedWeeks((prev) => {
      const exists = prev.includes(wkKey);
      const next = exists ? prev.filter((w) => w !== wkKey) : [...prev, wkKey];
      onWeekSelectionChange?.(next);
      return next;
    });
  };

  const weeksInYear = Math.max(54, getISOWeeksInYear(pickerYear));
  const weeksList = Array.from({ length: weeksInYear }, (_, i) => i + 1);
  const renderWeekPicker = typeof weekSelection !== 'undefined';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Input value={val} onChange={(e: any) => setVal(e.target.value)} placeholder="Nouveau nom" />
        {typeof startDate !== "undefined" && typeof endDate !== "undefined" && (
          <div className="grid grid-cols-2 gap-3 text-sm mt-3">
            <label className="space-y-1">
              <span className="text-neutral-600">Début du chantier</span>
              <Input type="date" value={scheduleStart} onChange={(e: any) => setScheduleStart(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-neutral-600">Fin du chantier</span>
              <Input type="date" value={scheduleEnd} min={scheduleStart} onChange={(e: any) => setScheduleEnd(e.target.value)} />
            </label>
          </div>
        )}
        {renderWeekPicker && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Semaines visibles</div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={() => setPickerYear((y: number) => y - 1)} aria-label="Année précédente"><ChevronLeft className="w-4 h-4" /></Button>
                <div className="text-sm font-semibold w-14 text-center">{pickerYear}</div>
                <Button size="icon" variant="ghost" onClick={() => setPickerYear((y: number) => y + 1)} aria-label="Année suivante"><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
            <p className="text-xs text-neutral-500">Sélectionnez les semaines où le chantier doit s'afficher. Sans sélection, il restera visible toute l'année.</p>
            <div className="grid grid-cols-6 gap-2 max-h-60 overflow-auto pr-1">
              {weeksList.map((wk) => {
                const wkKey = `${pickerYear}-W${pad2(wk)}`;
                const active = selectedWeeks.includes(wkKey);
                return (
                  <button
                    key={wkKey}
                    type="button"
                    onClick={() => toggleWeek(wkKey)}
                    className={cx(
                      "text-xs rounded-md border px-2 py-1 text-center transition",
                      active ? "bg-black text-white border-black" : "border-neutral-200 hover:bg-neutral-100"
                    )}
                  >
                    S{pad2(wk)}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <button type="button" className="underline" onClick={() => { setSelectedWeeks([]); onWeekSelectionChange?.([]); }}>Toutes les semaines</button>
              <button type="button" className="underline" onClick={() => { setSelectedWeeks([]); onWeekSelectionChange?.([]); setPickerYear(initialYear || new Date().getFullYear()); }}>Réinitialiser</button>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            onClick={() => {
              const n = val.trim();
              if (!n) return;
              if (scheduleStart && scheduleEnd && fromLocalKey(scheduleEnd) < fromLocalKey(scheduleStart)) {
                window.alert("La fin doit être postérieure ou égale au début du chantier.");
                return;
              }
              onSave(n, selectedWeeks, scheduleStart && scheduleEnd ? { startDate: scheduleStart, endDate: scheduleEnd } : undefined);
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnnotationDialog({ open, setOpen, value, onSave }: any) {
  const initial = typeof value === "string" ? { text: value } : value || {};
  const [text, setText] = useState<string>(initial.text || "");
  const [holiday, setHoliday] = useState<boolean>(!!initial.holiday);
  const [blocked, setBlocked] = useState<boolean>(!!initial.blocked);
  const [brText, setBrText] = useState<string>(initial.brNote?.text || "");
  const [brColor, setBrColor] = useState<string>(initial.brNote?.color || "mint");
  const [highlight, setHighlight] = useState<string>(initial.highlight || "");
  const [hoursOverride, setHoursOverride] = useState<string | number>(
    initial.hoursOverride ?? ""
  );

  useEffect(() => {
    const i = typeof value === "string" ? { text: value } : value || {};
    setText(i.text || "");
    setHoliday(!!i.holiday);
    setBlocked(!!i.blocked);
    setBrText(i.brNote?.text || "");
    setBrColor(i.brNote?.color || "mint");
    setHighlight(i.highlight || "");
    setHoursOverride(i.hoursOverride ?? "");
  }, [value]);

  const ColorDot = ({ c, selected, onClick }: any) => (
    <button type="button" onClick={onClick} className={cx("w-7 h-7 rounded-full border", PASTELS[c].bg, selected ? "ring-2 ring-black" : "")} aria-label={`Couleur ${c}`} title={c} />
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Éditer la case</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {/* Disponibilité */}
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={holiday} onChange={(e) => setHoliday(e.target.checked)} />Jour férié</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} />Chantier indisponible</label>
          </div>
          {/* Note principale */}
          <div className="space-y-1">
            <div className="text-sm font-medium">Note principale</div>
            <Textarea className="min-h-24" value={text} onChange={(e: any) => setText(e.target.value)} placeholder="Note générale de la case" />
          </div>
          {/* Bas-droit (mini post-it) */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Post-it bas-droit</div>
            <Input value={brText} onChange={(e: any) => setBrText(e.target.value)} placeholder="Court texte du post-it" />
            <div className="flex items-center gap-2">
              {["mint", "sky", "peach"].map((c) => (
                <ColorDot key={c} c={c} selected={brColor === c} onClick={() => setBrColor(c)} />
              ))}
            </div>
          </div>
          {/* Surlignage */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Surlignage de la case</div>
            <div className="flex items-center gap-3">
              <button type="button" className={cx("px-2 py-1 text-sm rounded border", !highlight ? "border-black" : "")} onClick={() => setHighlight("")}>Aucun</button>
              {["mint", "sky", "peach"].map((c) => (
                <button key={c} type="button" onClick={() => setHighlight(c)} className={cx("px-2 py-1 text-sm rounded border", PASTELS[c].bg, highlight === c ? "ring-2 ring-black" : "")}>{c}</button>
              ))}
            </div>
          </div>

          {/* Heures */}
          <div className="space-y-1">
            <div className="text-sm font-medium">Heures de la case (optionnel)</div>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={hoursOverride}
              onChange={(e: any) => setHoursOverride(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Laisser vide pour utiliser les heures/jour"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              onSave({
                text,
                holiday,
                blocked,
                brNote: brText ? { text: brText, color: brColor } : undefined,
                highlight: highlight || undefined,
                hoursOverride: hoursOverride === "" ? undefined : hoursOverride,
              });
              setOpen(false);
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================================
// Small helpers
// ==================================
function AddPerson({ onAdd }: { onAdd: (name: string, color: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
      <AddPersonDialog open={open} setOpen={setOpen} onAdd={onAdd} />
    </>
  );
}
function AddSite({ onAdd }: { onAdd: (name: string, startDate: string, endDate: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
      <AddSiteDialog open={open} setOpen={setOpen} onAdd={onAdd} />
    </>
  );
}

// ==================================
// Main Component (Page) – Semaine / Mois / Heures
// ==================================
export default function Page() {
  // Core state
  const [people, setPeople] = useState(DEMO_PEOPLE);
  const [sites, setSites] = useState(() => DEMO_SITES.map(normalizeSiteRecord));
  const [assignments, setAssignments] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, any>>({});
  const [absencesByWeek, setAbsencesByWeek] = useState<Record<string, Record<string, boolean>>>({});
  const [siteWeekVisibility, setSiteWeekVisibility] = useState<Record<string, string[]>>({});
  const [hoursPerDay, setHoursPerDay] = useState<number>(8);
  const today = useMemo(() => new Date(), []);

  const isSiteVisibleOnWeek = useCallback((siteId: string, wk: string) => {
    const selection = siteWeekVisibility[siteId];
    if (!selection || selection.length === 0) return true;
    return selection.includes(wk);
  }, [siteWeekVisibility]);

  // View / navigation
  const [view, setView] = useState<"week" | "month" | "hours" | "timeline">("week");
  const [timelineScope, setTimelineScope] = useState<"month" | "quarter" | "year">("month");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const weekFull = useMemo(() => getWeekDatesLocal(anchor), [anchor]);
  const weekDays = useMemo(() => weekFull.slice(0, 5), [weekFull]);
  const previousWeek = useMemo(() => {
    const d = new Date(anchor);
    d.setDate(d.getDate() - 7);
    return getWeekDatesLocal(d);
  }, [anchor]);
  const monthWeeks = useMemo(() => getMonthWeeks(anchor), [anchor]);
  const timelineWindow = useMemo(() => {
    const base = new Date(anchor);
    base.setHours(0, 0, 0, 0);

    if (timelineScope === "month") {
      const start = startOfMonthLocal(base);
      const end = endOfMonthLocal(base);
      const buckets = getMonthWeeks(base).map((week) => {
        const startDay = new Date(week[0]);
        startDay.setHours(0, 0, 0, 0);
        const endDay = new Date(week[6]);
        endDay.setHours(0, 0, 0, 0);
        return { label: `S${pad2(getISOWeek(week[0]))}`, start: startDay, end: endDay };
      });
      return { start, end, buckets, label: base.toLocaleString("fr-FR", { month: "long", year: "numeric" }) };
    }

    if (timelineScope === "quarter") {
      const start = startOfQuarterLocal(base);
      const end = endOfQuarterLocal(base);
      const startMonth = start.getMonth();
      const buckets = Array.from({ length: 3 }, (_, idx) => {
        const s = new Date(start.getFullYear(), startMonth + idx, 1);
        const e = endOfMonthLocal(s);
        return { label: s.toLocaleString("fr-FR", { month: "short" }), start: s, end: e };
      });
      const quarterIndex = Math.floor(base.getMonth() / 3) + 1;
      return { start, end, buckets, label: `T${quarterIndex} ${base.getFullYear()}` };
    }

    const start = startOfYearLocal(base.getFullYear());
    const end = endOfYearLocal(base.getFullYear());
    const buckets = Array.from({ length: 12 }, (_, idx) => {
      const s = new Date(base.getFullYear(), idx, 1);
      const e = endOfMonthLocal(s);
      return { label: s.toLocaleString("fr-FR", { month: "short" }), start: s, end: e };
    });
    return { start, end, buckets, label: `${base.getFullYear()}` };
  }, [anchor, timelineScope]);
  const currentWeekKey = useMemo(() => weekKeyOf(weekDays[0]), [weekDays]);
  const previousWeekKey = useMemo(() => weekKeyOf(previousWeek[0]), [previousWeek]);
  const todayWeekKey = useMemo(() => weekKeyOf(today), [today]);
  const todayWeekNumber = useMemo(() => getISOWeek(today), [today]);
  const isViewingCurrentWeek = useMemo(() => currentWeekKey === todayWeekKey, [currentWeekKey, todayWeekKey]);
  const sitesForCurrentWeek = useMemo(
    () => sites.filter((s) => isSiteVisibleOnWeek(s.id, currentWeekKey)),
    [sites, siteWeekVisibility, currentWeekKey, isSiteVisibleOnWeek]
  );

  const getCellMeta = useCallback(
    (siteId: string, dateKey: string) => {
      const raw = notes[cellKey(siteId, dateKey)];
      return (typeof raw === "string" ? { text: raw } : raw || {}) as any;
    },
    [notes]
  );

  const getAssignmentHoursInfo = useCallback(
    (a: any, metaFromCell?: any) => {
      const meta = metaFromCell || getCellMeta(a.siteId, a.date);
      const baseValue = Number.isFinite(Number(meta.hoursOverride ?? hoursPerDay))
        ? Number(meta.hoursOverride ?? hoursPerDay)
        : 0;
      const portion = getPortion(a.portion);
      const suggestedHours = baseValue * portion;
      const hasCustomHours = a.hours !== undefined && a.hours !== null && a.hours !== "";
      const parsedCustom = Number(a.hours);
      const hours = hasCustomHours && Number.isFinite(parsedCustom) ? parsedCustom : suggestedHours;
      return { meta, portion, hours, suggestedHours, hasCustomHours, baseValue };
    },
    [getCellMeta, hoursPerDay]
  );

  const weekDateKeys = useMemo(() => weekDays.map((d) => toLocalKey(d)), [weekDays]);
  const weekDateSet = useMemo(() => new Set(weekDateKeys), [weekDateKeys]);
  const weekAssignments = useMemo(
    () => assignments.filter((a) => weekDateSet.has(a.date)),
    [assignments, weekDateSet]
  );

  const conflictMap = useMemo(() => {
    const counts: Record<string, number> = {};
    assignments.forEach((a) => {
      const key = `${a.personId}|${a.date}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [assignments]);

  const weekConflictCount = useMemo(() => {
    const dateSet = new Set(weekDateKeys);
    return Object.entries(conflictMap).reduce((sum, [key, count]) => {
      if (count <= 1) return sum;
      const [, date] = key.split("|");
      return dateSet.has(date) ? sum + count : sum;
    }, 0);
  }, [conflictMap, weekDateKeys]);

  const peopleById = useMemo(() => {
    const map: Record<string, any> = {};
    people.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [people]);

  const sitesById = useMemo(() => {
    const map: Record<string, any> = {};
    sites.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [sites]);

  const exportableHours = useMemo(() => {
    const rows: {
      isoYear: number;
      week: number;
      dateKey: string;
      dateLabel: string;
      person: string;
      personColor?: string;
      site: string;
      portion: number;
      hours: number;
      conflict: boolean;
      source: string;
    }[] = [];

    const sorted = [...weekAssignments].sort((a, b) => {
      if (a.date === b.date) {
        return a.siteId.localeCompare(b.siteId) || a.personId.localeCompare(b.personId);
      }
      return a.date.localeCompare(b.date);
    });

    sorted.forEach((a) => {
      const person = peopleById[a.personId];
      const site = sitesById[a.siteId];
      if (!person || !site) return;

      const info = getAssignmentHoursInfo(a);
      if (info.meta.holiday || info.meta.blocked) return;

      const dateObj = fromLocalKey(a.date);
      const { week, isoYear } = getISOWeekAndYear(dateObj);
      const hoursValue = Number.isFinite(info.hours) ? info.hours : 0;
      const conflict = (conflictMap?.[`${a.personId}|${a.date}`] || 0) > 1;
      const source = info.hasCustomHours ? "manuel" : info.meta.hoursOverride ? "case" : "global";

      rows.push({
        isoYear,
        week,
        dateKey: a.date,
        dateLabel: formatFR(dateObj),
        person: person.name,
        personColor: person.color,
        site: site.name,
        portion: Number.isFinite(info.portion) ? info.portion : 0,
        hours: hoursValue,
        conflict,
        source,
      });
    });

    return rows;
  }, [conflictMap, getAssignmentHoursInfo, peopleById, sitesById, weekAssignments]);

  const ganttTimeline = useMemo(() => {
    if (!timelineWindow)
      return { rows: [] as { site: any; values: { days: number; offsetPct: number; widthPct: number; bucketDays: number }[]; total: number }[], maxOverlap: 0 };

    const rows = sites
      .map((site) => {
        const siteStart = fromLocalKey(site.startDate || todayKey);
        const siteEnd = fromLocalKey(site.endDate || site.startDate || todayKey);
        if (siteEnd < timelineWindow.start || siteStart > timelineWindow.end) return null;

        const values = timelineWindow.buckets.map((bucket) => {
          const bucketDays = Math.max(1, Math.round((bucket.end.getTime() - bucket.start.getTime()) / (24 * 3600 * 1000)) + 1);
          const overlapStart = new Date(Math.max(bucket.start.getTime(), siteStart.getTime()));
          const overlapEnd = new Date(Math.min(bucket.end.getTime(), siteEnd.getTime()));
          const hasOverlap = overlapEnd.getTime() >= overlapStart.getTime();
          const days = hasOverlap
            ? Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (24 * 3600 * 1000)) + 1
            : 0;
          const offsetDays = hasOverlap
            ? Math.max(0, Math.round((overlapStart.getTime() - bucket.start.getTime()) / (24 * 3600 * 1000)))
            : 0;
          const offsetPct = bucketDays > 0 ? (offsetDays / bucketDays) * 100 : 0;
          const widthPct = bucketDays > 0 ? Math.min(100, Math.max(6, (days / bucketDays) * 100)) : 0;
          return { days, offsetPct, widthPct, bucketDays };
        });

        const total = values.reduce((sum, v) => sum + v.days, 0);
        if (total === 0) return null;
        return { site, values, total };
      })
      .filter(Boolean) as { site: any; values: { days: number; offsetPct: number; widthPct: number; bucketDays: number }[]; total: number }[];

    const maxOverlap = rows.reduce((max, row) => {
      const rowMax = Math.max(...row.values.map((v) => v.days));
      return rowMax > max ? rowMax : max;
    }, 0);

    return { rows, maxOverlap };
  }, [sites, timelineWindow]);

  const timelineScopeLabel = useMemo(() => {
    if (!timelineWindow) return "";
    if (timelineScope === "month") return `Vue mensuelle • ${timelineWindow.label}`;
    if (timelineScope === "quarter") return `Vue trimestrielle • ${timelineWindow.label}`;
    return `Vue annuelle • ${timelineWindow.label}`;
  }, [timelineScope, timelineWindow]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 2 } }),
    useSensor(TouchSensor)
  );

  const isAbsentOnWeek = (pid: string, wk: string) => Boolean(absencesByWeek[wk]?.[pid]);
  const toggleAbsentThisWeek = (pid: string) => {
    setAbsencesByWeek((prev) => {
      const week = { ...(prev[currentWeekKey] || {}) };
      week[pid] = !week[pid];
      return { ...prev, [currentWeekKey]: week };
    });
  };

  const onDragEnd = (e: any) => {
    const { active, over } = e;
    if (!over || !active?.data?.current) return;
    const data = active.data.current;
    if (over.data?.current?.type !== "day-site") return;
    const targetDate: Date = over.data.current.date;
    const targetSite: any = over.data.current.site;
    const targetDateKey = toLocalKey(targetDate);
    const wkKey = weekKeyOf(targetDate);

    // Bloque drop si case fériée/indispo
    const cellMeta = (() => { const raw = notes[cellKey(targetSite.id, targetDateKey)]; return typeof raw === "string" ? { text: raw } : raw || {}; })();
    if (cellMeta.holiday || cellMeta.blocked) return;

    if (data.type === "person" && data.person) {
      const person = data.person;
      if (isAbsentOnWeek(person.id, wkKey)) return;
      const duplicate = assignments.some(
        (a) => a.personId === person.id && a.date === targetDateKey && a.siteId === targetSite.id
      );
      if (duplicate) return;
      const id = typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${person.id}-${targetSite.id}-${targetDateKey}-${Date.now()}`;
      setAssignments((prev) => [...prev, { id, personId: person.id, siteId: targetSite.id, date: targetDateKey }]);
      return;
    }

    if (data.type === "assignment" && data.assignmentId) {
      const assId = data.assignmentId as string;
      const ass = assignments.find((a) => a.id === assId);
      if (!ass) return;
      if (isAbsentOnWeek(ass.personId, wkKey)) return;
      const duplicate = assignments.some(
        (a) => a.personId === ass.personId && a.date === targetDateKey && a.siteId === targetSite.id && a.id !== assId
      );
      if (duplicate) return;
      if (ass.date === targetDateKey && ass.siteId === targetSite.id) return;
      setAssignments((prev) => prev.map((a) => (a.id === assId ? { ...a, date: targetDateKey, siteId: targetSite.id } : a)));
      return;
    }
  };

  const shift = (delta: number) => {
    const d = new Date(anchor);
    if (view === "month") {
      d.setMonth(d.getMonth() + delta);
    } else if (view === "timeline") {
      if (timelineScope === "month") d.setMonth(d.getMonth() + delta);
      else if (timelineScope === "quarter") d.setMonth(d.getMonth() + delta * 3);
      else d.setFullYear(d.getFullYear() + delta);
    } else {
      d.setDate(d.getDate() + delta * 7);
    }
    setAnchor(d);
  };

  const monthWeekRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [pendingScrollWeek, setPendingScrollWeek] = useState<string | null>(null);

  const jumpToCurrentWeek = (opts?: { forceView?: "week" | "hours" }) => {
    const now = new Date();
    const wkKey = weekKeyOf(now);
    setAnchor(now);
    if (view === "month") {
      setPendingScrollWeek(wkKey);
    }
    if (opts?.forceView) setView(opts.forceView);
  };

  useEffect(() => {
    const keys = new Set(monthWeeks.map((w) => weekKeyOf(w[0])));
    Object.keys(monthWeekRefs.current).forEach((key) => {
      if (!keys.has(key)) delete monthWeekRefs.current[key];
    });
  }, [monthWeeks]);

  useEffect(() => {
    if (!pendingScrollWeek || view !== "month") return;
    const el = monthWeekRefs.current[pendingScrollWeek];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingScrollWeek(null);
    }
  }, [pendingScrollWeek, view, monthWeeks]);

  // Notes / Rename dialogs state
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<null | { type: 'person' | 'site'; id: string; name: string; startDate?: string; endDate?: string }>(null);
  const [renameWeeks, setRenameWeeks] = useState<string[]>([]);
  const [renamePickerYear, setRenamePickerYear] = useState<number>(() => new Date().getFullYear());
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteKeyState, setNoteKeyState] = useState<string | null>(null);
  const currentNoteValue = noteKeyState ? (typeof notes[noteKeyState] === "string" ? { text: notes[noteKeyState] } : notes[noteKeyState] ?? {}) : {};
  const openNote = (date: Date, site: any) => { setNoteKeyState(cellKey(site.id, toLocalKey(date))); setNoteOpen(true); };
  const saveNote = (val: any) => { if (!noteKeyState) return; setNotes((prev) => ({ ...prev, [noteKeyState]: val })); };

  const clearCurrentWeek = () => {
    const confirmClear = window.confirm(
      "Supprimer toutes les affectations, notes et absences de la semaine courante ?"
    );
    if (!confirmClear) return;
    const targetDates = new Set(weekDays.map((d) => toLocalKey(d)));
    setAssignments((prev) => prev.filter((a) => !targetDates.has(a.date)));
    setNotes((prev) => {
      const next = { ...prev } as Record<string, any>;
      sites.forEach((site) => {
        targetDates.forEach((dateKey) => {
          delete next[cellKey(site.id, dateKey)];
        });
      });
      return next;
    });
    setAbsencesByWeek((prev) => {
      if (!prev[currentWeekKey]) return prev;
      const next = { ...prev } as typeof prev;
      delete (next as any)[currentWeekKey];
      return next;
    });
  };

  const copyFromPreviousWeek = () => {
    const ok = window.confirm("Copier la semaine précédente vers celle-ci ?");
    if (!ok) return;
    const prevDates = previousWeek.slice(0, 5);
    const prevKeys = prevDates.map((d) => toLocalKey(d));
    const currentKeys = weekDays.map((d) => toLocalKey(d));
    const dateMap = mapWeekDates(prevDates, weekDays);

    setAssignments((prev) => {
      const existing = new Set(prev.map((a) => `${a.personId}-${a.date}-${a.siteId}`));
      const additions = prev
        .filter((a) => dateMap[a.date])
        .map((a) => {
          const newDate = dateMap[a.date];
          if (!newDate) return null;
          if (isAbsentOnWeek(a.personId, currentWeekKey)) return null;
          if (existing.has(`${a.personId}-${newDate}-${a.siteId}`)) return null;
          return {
            ...a,
            id:
              typeof crypto !== "undefined" && (crypto as any).randomUUID
                ? (crypto as any).randomUUID()
                : `a${Date.now()}-${Math.random()}`,
            date: newDate,
          };
        })
        .filter(Boolean) as typeof prev;
      return [...prev, ...additions];
    });

    setNotes((prev) => {
      const next = { ...prev } as Record<string, any>;
      sites.forEach((site) => {
        prevKeys.forEach((prevKey, idx) => {
          const srcKey = cellKey(site.id, prevKey);
          const destKey = cellKey(site.id, currentKeys[idx]);
          if (prev[srcKey] && !next[destKey]) {
            next[destKey] = prev[srcKey];
          }
        });
      });
      return next;
    });

    setAbsencesByWeek((prev) => {
      if (!prev[previousWeekKey] || prev[currentWeekKey]) return prev;
      return { ...prev, [currentWeekKey]: { ...prev[previousWeekKey] } };
    });
  };

  // CRUD helpers
  const renamePerson = (id: string, name: string) => setPeople((p) => p.map((x) => (x.id === id ? { ...x, name } : x)));
  const renameSite = (id: string, name: string) => setSites((s) => s.map((x) => (x.id === id ? { ...x, name } : x)));
  const updateSiteSchedule = (id: string, startDate: string, endDate: string) =>
    setSites((s) => s.map((x) => (x.id === id ? { ...x, startDate, endDate } : x)));
  const removeAssignment = (id: string) => setAssignments((prev) => prev.filter((a) => a.id !== id));
  const updateAssignment = (id: string, changes: { hours?: any; portion?: any }) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const next: any = { ...a };
        if (Object.prototype.hasOwnProperty.call(changes, "portion")) {
          next.portion = getPortion(changes.portion);
        }
        if (Object.prototype.hasOwnProperty.call(changes, "hours")) {
          const raw = changes.hours;
          if (raw === undefined || raw === null || raw === "") {
            delete next.hours;
          } else if (Number.isFinite(Number(raw))) {
            next.hours = Number(raw);
          }
        }
        return next;
      })
    );
  };
  const addPerson = (name: string, color: string) => setPeople((p) => [...p, { id: typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `p${Date.now()}`, name, color }]);
  const removePerson = (id: string) => {
    setPeople((p) => p.filter((x) => x.id !== id));
    setAssignments((as) => as.filter((a) => a.personId !== id));
    setAbsencesByWeek((prev) => { const next: typeof prev = { ...prev }; for (const wk of Object.keys(next)) { if (next[wk] && Object.prototype.hasOwnProperty.call(next[wk], id)) { const { [id]: _omit, ...rest } = next[wk]; (next as any)[wk] = rest; } } return next; });
  };
  const addSite = (name: string, startDate: string, endDate: string) =>
    setSites((s) => [
      ...s,
      normalizeSiteRecord({
        id: typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `s${Date.now()}`,
        name,
        startDate,
        endDate,
      }),
    ]);
  const removeSite = (id: string) => {
    setSites((s) => s.filter((x) => x.id !== id));
    setAssignments((as) => as.filter((a) => a.siteId !== id));
    setNotes((prev) => { const next = { ...prev } as Record<string, any>; Object.keys(next).forEach((k) => { if (k.startsWith(`${id}|`)) delete (next as any)[k]; }); return next; });
    setSiteWeekVisibility((prev) => { const { [id]: _omit, ...rest } = prev; return rest; });
  };

  // ==========================
// Persistance serveur (Vercel Blob) + cache local
// ==========================
const firstLoad = useRef(true);

// Charger depuis le serveur pour la semaine affichée (fallback localStorage)
useEffect(() => {
  (async () => {
    try {
      const wk = currentWeekKey;
      const res = await fetch(`/api/state/${wk}`, { cache: 'no-store' });
      const srv = await res.json();
      if (srv && typeof srv === 'object') {
        setPeople(srv.people || DEMO_PEOPLE);
        setSites((srv.sites || DEMO_SITES).map(normalizeSiteRecord));
        setAssignments(srv.assignments || []);
        setNotes(srv.notes || {});
        setAbsencesByWeek(srv.absencesByWeek || {});
        setSiteWeekVisibility(srv.siteWeekVisibility || {});
        setHoursPerDay(srv.hoursPerDay ?? 8);
        firstLoad.current = false;
        return;
      }
    } catch {}
    // fallback localStorage si pas de remote
    try {
      const raw = localStorage.getItem("btp-planner-state:v1");
      if (raw) {
        const s = JSON.parse(raw);
        setPeople(s.people || DEMO_PEOPLE);
        setSites((s.sites || DEMO_SITES).map(normalizeSiteRecord));
        setAssignments(s.assignments || []);
        setNotes(s.notes || {});
        setAbsencesByWeek(s.absencesByWeek || {});
        setSiteWeekVisibility(s.siteWeekVisibility || {});
        setHoursPerDay(s.hoursPerDay ?? 8);
      }
    } catch {}
    firstLoad.current = false;
  })();
}, [currentWeekKey]);

const saveRemote = useMemo(() => debounce(async (wk: string, payload: any) => {
  try {
    await fetch(`/api/state/${wk}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {}
}, 600), []);

// Sauvegarder à chaque modif
useEffect(() => {
  if (firstLoad.current) return;
  const payload = { people, sites, assignments, notes, absencesByWeek, siteWeekVisibility, hoursPerDay };
  // cache local (backup + rapidité)
  try { localStorage.setItem("btp-planner-state:v1", JSON.stringify(payload)); } catch {}
  // serveur (par semaine)
  saveRemote(currentWeekKey, payload);
}, [people, sites, assignments, notes, absencesByWeek, siteWeekVisibility, currentWeekKey, saveRemote, hoursPerDay]);

// ==========================
// Dev Self-Tests (NE PAS modifier les existants ; on ajoute des tests)
  // ==========================
  useEffect(() => {
    // existants
    console.assert(/\d{4}-\d{2}-\d{2}/.test(toLocalKey(new Date("2025-10-02"))), "toLocalKey format");
    console.assert(weekKeyOf(new Date("2021-01-04")) === "2021-W01", "weekKeyOf ISO-year");
    console.assert(getISOWeek(new Date("2020-12-31")) === 53, "ISO week 2020-12-31 = 53");
    console.assert(getISOWeeksInYear(2020) >= 52 && getISOWeeksInYear(2020) <= 54, "getISOWeeksInYear range");

    // palette
    console.assert(Array.isArray(COLORS) && COLORS.length >= 17, "COLORS étendu (>=17)");
    console.assert(COLORS.every((c) => /^bg-[-a-z0-9]+$/i.test(c)), "Chaque couleur est une classe tailwind bg-*");

    // cellKey
    const nk = cellKey("s42", "2025-11-05");
    console.assert(nk === "s42|2025-11-05", "cellKey format s|date");

    // highlight + compat string
    const compat = typeof "Juste une note" === "string" ? { text: "Juste une note" } : {};
    console.assert(compat.text === "Juste une note", "compat string->object ok");
    // @ts-ignore
    console.assert(!PASTELS["unknown"], "highlight ignore unknown color");

    // rename helpers
    const _ppl = [{ id: 'pp', name: 'Old', color: 'bg-red-400' }];
    const _pplRenamed = _ppl.map(x => x.id === 'pp' ? { ...x, name: 'New' } : x);
    console.assert(_pplRenamed[0].name === 'New', 'rename person mapping works');
    const _sites = [{ id: 'ss', name: 'Site A' }];
    const _sitesRenamed = _sites.map(x => x.id === 'ss' ? { ...x, name: 'Site B' } : x);
    console.assert(_sitesRenamed[0].name === 'Site B', 'rename site mapping works');

    // mapWeekDates helper
    const m = mapWeekDates(
      [new Date('2025-01-06'), new Date('2025-01-07')],
      [new Date('2025-01-13'), new Date('2025-01-14')]
    );
    console.assert(m['2025-01-06'] === '2025-01-13' && m['2025-01-07'] === '2025-01-14', 'mapWeekDates preserves order');

    // week visibility helper (default all weeks when empty)
    console.assert(isSiteVisibleOnWeek('unknown', '2025-W10') === true, 'site visible if no selection');
    const tmpSel = { test: ['2025-W02', '2025-W03'] } as Record<string, string[]>;
    const tmpCheck = (id: string, wk: string) => {
      const selection = tmpSel[id];
      if (!selection || selection.length === 0) return true;
      return selection.includes(wk);
    };
    console.assert(tmpCheck('test', '2025-W03') && !tmpCheck('test', '2025-W05'), 'manual visibility toggle works');

    // month grid shape$1// export blob test

    // formatFR
    const frs = formatFR(new Date('2025-11-07'), true);
    console.assert(typeof frs === 'string' && /novembre|11\/?2025/i.test(frs), 'formatFR fr locale string');

    // timeline helpers
    const quarterStart = startOfQuarterLocal(new Date('2025-07-15'));
    console.assert(quarterStart.getMonth() === 6 && quarterStart.getDate() === 1, 'quarter start aligns to July 1');
    const yearEnd = endOfYearLocal(2025);
    console.assert(yearEnd.getMonth() === 11 && yearEnd.getDate() === 31, 'year end aligns to Dec 31');

    const b = new Blob([JSON.stringify({ a: 1 })], { type: 'application/json' });
    console.assert(b.type === 'application/json', 'export blob type ok');
  }, []);

  // ==========================
  // Import / Export JSON
  // ==========================
  const fileRef = useRef<HTMLInputElement | null>(null);
  const exportJSON = () => {
    const payload = { people, sites, assignments, notes, absencesByWeek, siteWeekVisibility, hoursPerDay };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `btp-planner-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const exportHoursCSV = () => {
    if (exportableHours.length === 0) {
      window.alert("Aucune ligne exportable pour cette semaine (heures ou affectations manquantes).");
      return;
    }

    const header = ["Année ISO", "Semaine", "Date", "Salarié", "Chantier", "Portion", "Heures", "Conflit", "Source heures"];
    const rows = exportableHours.map((row) => {
      const conflict = row.conflict ? "Conflit" : "";
      const sourceLabel = row.source === "global"
        ? `global (${hoursPerDay}h/j)`
        : row.source === "case"
        ? "heures de la case"
        : "manuel";

      return [
        row.isoYear,
        `S${pad2(row.week)}`,
        row.dateKey,
        row.person,
        row.site,
        row.portion,
        row.hours,
        conflict,
        sourceLabel,
      ];
    });

    const csv = [header, ...rows]
      .map((line) => line.map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `heures-semaine-${currentWeekKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const onImport = (e: any) => {
    const f = e.target.files?.[0]; if(!f) return; const reader = new FileReader();
    reader.onload = () => { try { const data = JSON.parse(String(reader.result)); setPeople(data.people||[]); setSites((data.sites||[]).map(normalizeSiteRecord)); setAssignments(data.assignments||[]); setNotes(data.notes||{}); setAbsencesByWeek(data.absencesByWeek||{}); setSiteWeekVisibility(data.siteWeekVisibility||{}); setHoursPerDay(data.hoursPerDay ?? 8); } catch { alert("Fichier invalide"); } };
    reader.readAsText(f); e.target.value = '';
  };

  // ==========================
  // UI (Semaine / Mois / Heures)
  // ==========================
  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => shift(-1)} aria-label="Précédent"><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" onClick={() => shift(1)} aria-label="Suivant"><ChevronRight className="w-4 h-4" /></Button>
          <Button
            variant="outline"
            onClick={() => jumpToCurrentWeek({ forceView: view === "hours" ? "hours" : view === "week" ? "week" : undefined })}
            className="ml-1"
            aria-label="Aller à la semaine actuelle"
            title="Revenir rapidement à la semaine en cours"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <div className="font-semibold text-lg flex items-center gap-2">
            <CalendarRange className="w-5 h-5" />
            {(view === 'week' || view === 'hours') && (
              <div className="flex items-center gap-2 flex-wrap">
                <span>{`Semaine ${getISOWeek(weekDays[0])} - du ${formatFR(weekDays[0], true)} au ${formatFR(weekDays[4], true)}`}</span>
                <span className="text-xs font-semibold text-sky-700 bg-sky-100 px-2 py-1 rounded-full">
                  Semaine actuelle : S{pad2(todayWeekNumber)}
                </span>
              </div>
            )}
            {view === 'month' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span>{anchor.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                <span className="text-xs font-semibold text-sky-700 bg-sky-100 px-2 py-1 rounded-full">
                  Semaine actuelle : S{pad2(todayWeekNumber)}
                </span>
              </div>
            )}
            {view === 'timeline' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span>{timelineScopeLabel}</span>
                <span className="text-xs font-semibold text-neutral-700 bg-neutral-100 px-2 py-1 rounded-full">
                  Jauge par affectations existantes
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium flex items-center gap-2" title="Heures appliquées par défaut à chaque affectation">
            Heures/jour
            <Input
              type="number"
              min={0}
              step={0.5}
              value={hoursPerDay}
              onChange={(e: any) => setHoursPerDay(e.target.value === "" ? 0 : Number(e.target.value))}
              className="w-20 h-9"
            />
          </label>
          <input type="file" accept="application/json" ref={fileRef} onChange={onImport} className="hidden" />
          <Button variant="outline" onClick={copyFromPreviousWeek} aria-label="Copier semaine précédente" title="Copie les affectations, notes et absences de la semaine N-1">
            <Copy className="w-4 h-4 mr-1" /> Copier N-1
          </Button>
          <Button variant="outline" onClick={clearCurrentWeek} aria-label="Vider la semaine" title="Retire toutes les données de la semaine affichée">
            <Eraser className="w-4 h-4 mr-1" /> Vider
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} aria-label="Importer"><Upload className="w-4 h-4 mr-1" />Importer</Button>
          <Button onClick={exportJSON} aria-label="Exporter le JSON"><Download className="w-4 h-4 mr-1" />Exporter JSON</Button>
          <Button variant="outline" onClick={exportHoursCSV} aria-label="Exporter les heures en CSV">
            <Download className="w-4 h-4 mr-1" /> Export heures CSV
          </Button>
          <Tabs value={view} onValueChange={(v: any) => setView(v)}>
            <TabsList>
              <TabsTrigger value="week">Semaine</TabsTrigger>
              <TabsTrigger value="month">Mois</TabsTrigger>
              <TabsTrigger value="hours">Heures</TabsTrigger>
              <TabsTrigger value="timeline">Calendrier</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="ghost"
            onClick={() => jumpToCurrentWeek({ forceView: view === "hours" ? "hours" : view === "week" ? "week" : undefined })}
            className="hidden md:inline-flex"
            aria-label="Afficher la semaine actuelle"
          >
            Aller à la semaine en cours
          </Button>
        </div>
      </div>

      {/* DnD provider */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-12 gap-4">
          {/* Left column: People & Sites */}
          <div
            className={cx(
              "col-span-12 lg:col-span-3 space-y-4",
              view === "month" && "lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
            )}
          >
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Salariés</div>
                  <AddPerson onAdd={addPerson} />
                </div>
                <div className="space-y-2">
                  {people.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2">
                      <PersonChip person={p} />
                      <div className="flex items-center gap-2">
                        <label className="text-xs flex items-center gap-1">
                          <input type="checkbox" checked={isAbsentOnWeek(p.id, currentWeekKey)} onChange={() => toggleAbsentThisWeek(p.id)} />
                          Abs. S{getISOWeek(weekDays[0])}
                        </label>
                        <Button size="icon" variant="ghost" onClick={() => { setRenameTarget({ type: 'person', id: p.id, name: p.name }); setRenameOpen(true); }} aria-label={`Renommer ${p.name}`}><Edit3 className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => removePerson(p.id)} aria-label={`Supprimer ${p.name}`}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-neutral-500">L'absence ne vaut que pour la <b>semaine affichée</b>.</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Chantiers</div>
                  <AddSite onAdd={addSite} />
                </div>
                <div className="space-y-2">
                  {sites.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <span>{s.name}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setRenameTarget({ type: 'site', id: s.id, name: s.name, startDate: s.startDate, endDate: s.endDate });
                            setRenameWeeks(siteWeekVisibility[s.id] || []);
                            setRenamePickerYear(getISOWeekYear(anchor));
                            setRenameOpen(true);
                          }}
                          aria-label={`Renommer ${s.name}`}
                        ><Edit3 className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => removeSite(s.id)} aria-label={`Supprimer ${s.name}`}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Calendars */}
          <div className="col-span-12 lg:col-span-9">
            {/* WEEK VIEW */}
            {view === "week" && (
              <div className="space-y-2">
                <div className="grid grid-cols-6 text-xs text-neutral-500">
                  <div className="px-1 flex items-center gap-2">
                    <span>Sem. {getISOWeek(weekDays[0])}</span>
                    {isViewingCurrentWeek && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-700">En cours</span>
                    )}
                  </div>
                  {["Lun", "Mar", "Mer", "Jeu", "Ven"].map((d) => (<div key={d} className="text-center">{d}</div>))}
                </div>
                <div className="space-y-2">
                  {sitesForCurrentWeek.map((site) => (
                    <div key={site.id} className="grid grid-cols-6 gap-2 items-stretch">
                      <div className="text-sm flex items-center">{site.name}</div>
                      {weekDays.map((d) => (
                        <DayCell
                          key={`${site.id}-${toLocalKey(d)}`}
                          date={d}
                          site={site}
                          people={people}
                          assignments={assignments}
                          onEditNote={openNote}
                          notes={notes}
                          hoursPerDay={hoursPerDay}
                          conflictMap={conflictMap}
                          onRemoveAssignment={(id:string)=>setAssignments((prev)=>prev.filter(a=>a.id!==id))}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HOURS VIEW */}
            {view === "hours" && (
              <div className="space-y-2">
                <div className="grid grid-cols-6 text-xs text-neutral-500">
                  <div className="px-1 flex items-center gap-2">
                    <span>Sem. {getISOWeek(weekDays[0])}</span>
                    {isViewingCurrentWeek && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-700">En cours</span>
                    )}
                    {weekConflictCount > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">{weekConflictCount} conflits potentiels</span>
                    )}
                  </div>
                  {["Lun", "Mar", "Mer", "Jeu", "Ven"].map((d) => (<div key={d} className="text-center">{d}</div>))}
                </div>
                <div className="space-y-2">
                  {sitesForCurrentWeek.map((site) => (
                    <div key={site.id} className="grid grid-cols-6 gap-2 items-stretch">
                      <div className="text-sm flex items-center font-semibold justify-between">
                        <span>{site.name}</span>
                        <span className="text-[11px] text-neutral-500">Heures & portions</span>
                      </div>
                      {weekDays.map((d) => (
                        <HoursCell
                          key={`${site.id}-${toLocalKey(d)}`}
                          date={d}
                          site={site}
                          people={people}
                          assignments={assignments}
                          notes={notes}
                          hoursPerDay={hoursPerDay}
                          conflictMap={conflictMap}
                          onEditNote={openNote}
                          onUpdateAssignment={updateAssignment}
                          getInfo={getAssignmentHoursInfo}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MONTH VIEW */}
            {view === "month" && (
              <div className="space-y-4">

                {monthWeeks.map((week, idx) => {
                  const wkKey = weekKeyOf(week[0]);
                  const isCurrent = wkKey === todayWeekKey;
                  const sitesForWeek = sites.filter((site) => isSiteVisibleOnWeek(site.id, wkKey));
                  return (
                    <div
                      key={idx}
                      ref={(el) => {
                        if (el) monthWeekRefs.current[wkKey] = el;
                        else delete monthWeekRefs.current[wkKey];
                      }}
                      className={cx("space-y-3", idx > 0 && "pt-4")}
                    >
                      {idx > 0 && <div className="h-px bg-neutral-300" aria-hidden />}
                      <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 shadow-sm">
                        <div className="grid grid-cols-6 items-center text-xs text-neutral-600">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 font-semibold text-sky-800 shadow-inner">
                              Semaine {getISOWeek(week[0])}
                            </span>
                            {isCurrent && (
                              <span className="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">Semaine en cours</span>
                            )}
                          </div>
                          {["Lun", "Mar", "Mer", "Jeu", "Ven"].map((d) => (<div key={d} className="text-center">{d}</div>))}
                        </div>
                        {sitesForWeek.map((site) => (
                          <div key={`${idx}-${site.id}`} className="grid grid-cols-6 gap-2 items-stretch">
                            <div className="text-sm flex items-center font-medium text-neutral-800">{site.name}</div>
                            {week.slice(0, 5).map((d) => (
                              <DayCell
                                key={`${site.id}-${toLocalKey(d)}`}
                                date={d}
                                site={site}
                                people={people}
                                assignments={assignments}
                                onEditNote={openNote}
                                notes={notes}
                                hoursPerDay={hoursPerDay}
                                conflictMap={conflictMap}
                                onRemoveAssignment={(id:string)=>setAssignments((prev)=>prev.filter(a=>a.id!==id))}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

              </div>
            )}

            {/* TIMELINE / CALENDRIER GANTT */}
            {view === "timeline" && timelineWindow && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Calendrier Gantt</span>
                    <span className="text-xs text-neutral-600">{formatFR(timelineWindow.start)} → {formatFR(timelineWindow.end)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={timelineScope === "month" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimelineScope("month")}
                    >
                      Mensuel
                    </Button>
                    <Button
                      variant={timelineScope === "quarter" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimelineScope("quarter")}
                    >
                      Trimestre
                    </Button>
                    <Button
                      variant={timelineScope === "year" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimelineScope("year")}
                    >
                      Année
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-neutral-600">
                  Jauges basées sur la plage planifiée de chaque chantier (dates de début/fin), pour visualiser la couverture sur la période.
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-full space-y-2">
                    <div
                      className="grid items-center text-[11px] font-semibold text-neutral-600 gap-2"
                      style={{ gridTemplateColumns: `180px repeat(${timelineWindow.buckets.length}, minmax(140px, 1fr))` }}
                    >
                      <div className="px-2">Chantier</div>
                      {timelineWindow.buckets.map((bucket, idx) => (
                        <div key={`${bucket.label}-${idx}`} className="text-center">
                          {bucket.label}
                        </div>
                      ))}
                    </div>

                    {ganttTimeline.rows.length === 0 && (
                      <div className="text-sm text-neutral-500 px-2">Aucun chantier planifié sur cette période.</div>
                    )}

                    {ganttTimeline.rows.map((row) => (
                      <div
                        key={row.site.id}
                        className="grid items-center gap-2 text-sm"
                        style={{ gridTemplateColumns: `180px repeat(${timelineWindow.buckets.length}, minmax(140px, 1fr))` }}
                      >
                        <div className="flex items-center gap-2 px-2">
                          <span className="font-medium text-neutral-800">{row.site.name}</span>
                          <span className="text-[11px] text-neutral-500">{row.total} j.</span>
                        </div>
                        {row.values.map((val, idx) => (
                          <div key={`${row.site.id}-${idx}`} className="relative h-8 rounded-lg border border-neutral-200 bg-neutral-50 overflow-hidden">
                            {val.days > 0 && (
                              <div
                                className="absolute inset-y-1 left-1 rounded-md bg-sky-500/80"
                                style={{
                                  width: `${val.widthPct}%`,
                                  left: `${val.offsetPct}%`,
                                }}
                              />
                            )}
                            <div className="relative z-10 flex items-center justify-center text-xs font-semibold text-neutral-800">
                              {val.days > 0 ? `${val.days} j.` : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <DragOverlay />
      </DndContext>

      {/* Dialogs */}
      <AnnotationDialog open={noteOpen} setOpen={setNoteOpen} value={currentNoteValue} onSave={saveNote} />
      <RenameDialog
        open={renameOpen}
        setOpen={setRenameOpen}
        name={renameTarget?.name || ''}
        title={renameTarget?.type === 'person' ? 'Renommer le salarié' : 'Renommer le chantier'}
        weekSelection={renameTarget?.type === 'site' ? renameWeeks : undefined}
        onWeekSelectionChange={renameTarget?.type === 'site' ? setRenameWeeks : undefined}
        initialYear={renamePickerYear}
        startDate={renameTarget?.type === 'site' ? renameTarget?.startDate : undefined}
        endDate={renameTarget?.type === 'site' ? renameTarget?.endDate : undefined}
        onSave={(newName: string, weeks?: string[], schedule?: { startDate: string; endDate: string }) => {
          if (!renameTarget) return;
          const n = newName.trim();
          if (!n) return;
          if (renameTarget.type === 'person') {
            renamePerson(renameTarget.id, n);
          } else {
            renameSite(renameTarget.id, n);
            if (schedule?.startDate && schedule?.endDate) {
              updateSiteSchedule(renameTarget.id, schedule.startDate, schedule.endDate);
              setRenameTarget((prev) => (prev ? { ...prev, startDate: schedule.startDate, endDate: schedule.endDate } : prev));
            }
            if (weeks) {
              setSiteWeekVisibility((prev) => {
                const unique = Array.from(new Set(weeks)).filter(Boolean);
                if (unique.length === 0) {
                  const { [renameTarget.id]: _omit, ...rest } = prev;
                  return rest;
                }
                return { ...prev, [renameTarget.id]: unique };
              });
            }
          }
          setRenameOpen(false);
        }}
      />
    </div>
  );
}
