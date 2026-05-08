"use client";

import { useDraggable } from "@dnd-kit/core";
import { cx, getPortion } from "../../lib/planner/helpers";

// ==================================
// Draggable Person Chip
// ==================================
export function PersonChip({ person }: any) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `person-${person.id}`, data: { type: "person", person } });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, touchAction: "none" }
    : { touchAction: "none" };
  const initials = person.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={cx("select-none inline-flex items-center gap-2 pr-3 pl-1 py-1 rounded-full text-white text-xs shadow cursor-grab hover:brightness-110 transition", person.color || "bg-neutral-500")}
    >
      <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-semibold text-[10px] shrink-0">{initials}</span>
      <span className="font-medium">{person.name}</span>
    </div>
  );
}

// ==================================
// Assignment chip (draggable)
// ==================================
export function AssignmentChip({ a, person, onRemove, onToggleConfirmed, baseHours, conflict }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `assign-${a.id}`,
    data: { type: "assignment", assignmentId: a.id, personId: a.personId, from: { siteId: a.siteId, dateKey: a.date } },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 5, touchAction: "none" }
    : { touchAction: "none" };
  const portion = getPortion(a.portion);
  const hasCustomHours = a.hours !== undefined && a.hours !== null && a.hours !== "";
  const parsedHours = Number(a.hours);
  const hours = hasCustomHours && Number.isFinite(parsedHours) ? parsedHours : baseHours * portion;
  const extraLabel = (() => {
    if (hasCustomHours) return `${hours || 0}h`;
    if (portion !== 1) return portion === 0.5 ? "½j" : `${portion}j`;
    return null;
  })();
  const isConfirmed = Boolean(a.confirmed);
  const statusTitle = isConfirmed ? "Confirmé (cliquer pour planifié)" : "Planifié (cliquer pour confirmer)";
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cx(
        "pl-1 pr-2 py-0.5 rounded-full text-white text-xs flex items-center gap-1.5 select-none transition",
        person.color || "bg-neutral-500",
        isDragging ? "opacity-80 ring-2 ring-black/30" : "hover:brightness-105",
        conflict ? "ring-2 ring-amber-400" : "",
        isConfirmed ? "ring-2 ring-offset-1 ring-white/70 font-bold" : ""
      )}
      title={hasCustomHours ? `${person.name} – ${hours || 0}h` : portion !== 1 ? `${person.name} – ${portion} j.` : person.name}
    >
      <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center font-bold text-[9px] shrink-0">
        {person.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
      </span>
      <span className={cx("leading-none", isConfirmed ? "font-bold" : "font-medium")}>{person.name.split(" ")[0]}</span>
      {extraLabel && <span className="text-[10px] px-1 py-0.5 rounded-full bg-black/25">{extraLabel}</span>}
      {conflict && <span className="text-[10px] px-1 py-0.5 rounded-full bg-amber-200 text-amber-900">!</span>}
      <button
        className={cx(
          "w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 leading-none transition",
          isConfirmed ? "bg-white/40 hover:bg-white/60 text-white font-bold text-[10px]" : "bg-black/15 hover:bg-white/30 text-white/60 text-[10px]"
        )}
        title={statusTitle}
        aria-label={statusTitle}
        onClick={(e) => { e.stopPropagation(); onToggleConfirmed?.(); }}
      >{isConfirmed ? "✓" : "·"}</button>
      <button className="w-3.5 h-3.5 rounded-full bg-black/25 hover:bg-black/50 text-white flex items-center justify-center shrink-0 leading-none" title="Retirer" aria-label={`Retirer ${person.name}`} onClick={onRemove}>×</button>
    </div>
  );
}
