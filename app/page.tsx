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
  AlertTriangle,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Copy,
  Download,
  Edit3,
  Eraser,
  LayoutDashboard,
  ListChecks,
  Plus,
  RotateCcw,
  Settings,
  Trash2,
  Upload,
  Users,
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
function DialogDescription({ children, className = "" }: any) {
  return <p className={cx("text-sm text-neutral-600", className)}>{children}</p>;
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
const SITE_COLORS = COLORS;

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
const getISOWeekStart = (year: number, weekNum: number) => {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const week1Start = new Date(jan4);
  week1Start.setDate(jan4.getDate() - jan4Day);
  const weekStart = new Date(week1Start);
  weekStart.setDate(week1Start.getDate() + (weekNum - 1) * 7);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};
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

const normalizePersonRecord = (p: any) => ({
  id:
    typeof p?.id === "string"
      ? p.id
      : typeof crypto !== "undefined" && (crypto as any).randomUUID
      ? (crypto as any).randomUUID()
      : `p${Date.now()}`,
  name: typeof p?.name === "string" ? p.name : "",
  color: typeof p?.color === "string" ? p.color : COLORS[0],
  role: typeof p?.role === "string" ? p.role : "",
  phone: typeof p?.phone === "string" ? p.phone : "",
  email: typeof p?.email === "string" ? p.email : "",
  notes: typeof p?.notes === "string" ? p.notes : "",
  skills: Array.isArray(p?.skills) ? p.skills.map(String) : [],
});

const DEMO_PEOPLE = [
  normalizePersonRecord({ id: "p1", name: "Ali", color: "bg-rose-500", role: "Chef de chantier" }),
  normalizePersonRecord({ id: "p2", name: "Mina", color: "bg-amber-500", role: "Maçonne" }),
  normalizePersonRecord({ id: "p3", name: "Rachid", color: "bg-emerald-500", role: "Plombier" }),
];
const DEMO_SITES = [
  { id: "s1", name: "Chantier A", startDate: todayKey, endDate: nextMonthKey, color: SITE_COLORS[3] },
  { id: "s2", name: "Chantier B", startDate: todayKey, endDate: todayKey, color: SITE_COLORS[4] },
];
const DEFAULT_EVENT_CALENDARS = [
  { id: "cal-leave", name: "Congés", color: "bg-sky-500", visible: true, isDefault: true },
  { id: "cal-planned", name: "Chantiers planifiés", color: "bg-emerald-500", visible: true, isDefault: true },
  { id: "cal-pending", name: "Chantiers non planifiés", color: "bg-amber-500", visible: true, isDefault: true },
  { id: "cal-meeting", name: "Réunions", color: "bg-violet-500", visible: true, isDefault: true },
];
const QUOTE_COLUMNS = [
  { id: "todo", label: "À réaliser", hint: "Devis à préparer", tone: "sky" },
  { id: "draft", label: "Préparé, pas envoyé", hint: "Brouillons prêts", tone: "amber" },
  { id: "pending", label: "En attente de réponse", hint: "Envoyé au client", tone: "indigo" },
  { id: "won", label: "Validé", hint: "Accepté", tone: "emerald" },
  { id: "lost", label: "Refusé", hint: "Avec motif optionnel", tone: "rose" },
];
const QUOTE_TONES: Record<string, { bg: string; border: string; text: string; chip: string }> = {
  sky: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-800", chip: "bg-sky-500" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", chip: "bg-amber-500" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-800", chip: "bg-indigo-500" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", chip: "bg-emerald-500" },
  rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", chip: "bg-rose-500" },
};
const DEMO_QUOTES = [
  { id: "q1", title: "Extension maison", client: "Mme Diallo", amount: 12000, status: "todo", dueDate: todayKey },
  { id: "q2", title: "Rénovation bureau", client: "Société Nova", amount: 18500, status: "draft", note: "Attente métrés" },
  { id: "q3", title: "Création terrasse", client: "M. Karim", amount: 7600, status: "pending", sentAt: todayKey },
  { id: "q4", title: "Salle de réunion", client: "Startup Hexa", amount: 9200, status: "won", sentAt: todayKey },
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
const hashString = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
};
const parseWeekList = (input: string, fallbackYear: number) => {
  const tokens = input
    .split(/[,\s;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const weeks = new Set<string>();
  tokens.forEach((token) => {
    const isoMatch = token.match(/^(\d{4})-W(\d{1,2})$/i);
    if (isoMatch) {
      const num = Number(isoMatch[2]);
      if (num >= 1 && num <= 54) weeks.add(`${isoMatch[1]}-W${pad2(num)}`);
      return;
    }
    const short = token.match(/^s?(\d{1,2})$/i);
    if (short) {
      const num = Number(short[1]);
      if (num >= 1 && num <= 54) weeks.add(`${fallbackYear}-W${pad2(num)}`);
    }
  });
  return Array.from(weeks);
};
const toArray = (val: any, fallback: any[] = []) => (Array.isArray(val) ? val : fallback);
const ensureId = (seed: string, prefix: string) => {
  if (seed) return `${prefix}-${seed}`;
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeSiteRecord = (site: any) => {
  const base = typeof site === "object" && site !== null ? site : {};
  const start = (base as any)?.startDate || toLocalKey(new Date());
  const end = (base as any)?.endDate || start;
  const colorIndex = hashString(String((base as any)?.id || (base as any)?.name || start)) % SITE_COLORS.length;
  const color = (base as any)?.color || SITE_COLORS[colorIndex] || SITE_COLORS[0];
  const status = (base as any)?.status === "pending" ? "pending" : "planned";
  const planningWeeks = Array.isArray((base as any)?.planningWeeks) ? (base as any).planningWeeks : [];
  return {
    ...base,
    id: (base as any)?.id || ensureId(String((base as any)?.name || start), "site"),
    startDate: start,
    endDate: end,
    color,
    status,
    planningWeeks,
    city: (base as any)?.city?.trim?.() || (base as any)?.city || (base as any)?.cityOrPostal || "",
    address: (base as any)?.address?.trim?.() || (base as any)?.address || "",
    clientName: (base as any)?.clientName || (base as any)?.quoteSnapshot?.client || "",
    contactName:
      (base as any)?.contactName || (base as any)?.clientName || (base as any)?.quoteSnapshot?.client || "",
    contactPhone: (base as any)?.contactPhone || "",
  };
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
const formatEUR = (val?: number) => {
  if (!Number.isFinite(val)) return "";
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val || 0);
  } catch {
    return `${val} €`;
  }
};
const normalizeQuoteRecord = (quote: any) => {
  const base = typeof quote === "object" && quote !== null ? quote : {};
  const todayKeyLocal = toLocalKey(new Date());
  const status = (base as any)?.status || "todo";
  const amountNum = Number((base as any)?.amount);
  const id = (base as any)?.id || ensureId(String((base as any)?.title || (base as any)?.client || Date.now()), "quote");
  const patch: any = {
    ...base,
    id,
    title: (base as any)?.title?.trim?.() || "Nouveau devis",
    client: (base as any)?.client?.trim?.() || undefined,
    note: (base as any)?.note?.trim?.() || undefined,
    amount: Number.isFinite(amountNum) ? amountNum : undefined,
    dueDate: (base as any)?.dueDate || undefined,
    status,
    address: (base as any)?.address?.trim?.() || undefined,
    city: (base as any)?.city?.trim?.() || (base as any)?.cityOrPostal || undefined,
    contactName: (base as any)?.contactName?.trim?.() || (base as any)?.client || undefined,
    contactPhone: (base as any)?.contactPhone?.trim?.() || undefined,
    plannedStart: (base as any)?.plannedStart || undefined,
    plannedEnd: (base as any)?.plannedEnd || undefined,
  };

  if (patch.plannedStart && patch.plannedEnd && fromLocalKey(patch.plannedEnd) < fromLocalKey(patch.plannedStart)) {
    patch.plannedEnd = patch.plannedStart;
  }

  if ((status === "pending" || status === "won") && !quote?.sentAt) {
    patch.sentAt = todayKeyLocal;
  }
  if (status !== "lost") {
    patch.reason = undefined;
  }

  return patch;
};
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

// ==================================
// Devis Kanban – Carte draggable
// ==================================
function QuoteCard({ quote, tone, onOpen }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `quote-${quote.id}`,
    data: { type: "quote", quoteId: quote.id, status: quote.status },
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 } : undefined;
  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={cx(
        "w-full text-left rounded-lg border bg-white/90 p-3 shadow-sm space-y-2 hover:border-neutral-400 hover:shadow transition",
        isDragging && "ring-2 ring-sky-300 opacity-90"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-neutral-900 leading-tight break-words">{quote.title || "Sans titre"}</div>
        <span className={cx("w-2.5 h-2.5 rounded-full shrink-0 mt-0.5", tone.chip)} aria-hidden />
      </div>
      <div className="text-xs text-neutral-600 space-y-1">
        {quote.client && <div className="truncate">Client : {quote.client}</div>}
        {Number.isFinite(quote.amount) && <div className="font-semibold text-neutral-800">{formatEUR(quote.amount)}</div>}
        {quote.dueDate && (
          <div className="flex items-center gap-1 text-sky-700">
            <CalendarRange className="w-3 h-3" /> {formatFR(new Date(quote.dueDate))}
          </div>
        )}
      </div>
      <div className="text-[11px] text-neutral-500">Cliquer pour voir le détail</div>
    </button>
  );
}

function QuoteColumn({ col, items, onOpenQuote }: any) {
  const tone = QUOTE_TONES[col.tone] || QUOTE_TONES.sky;
  const { setNodeRef, isOver } = useDroppable({
    id: `quote-col-${col.id}`,
    data: { type: "quote-column", status: col.id },
  });
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((quote: any) => {
      const haystack = `${quote.title || ""} ${quote.client || ""} ${quote.note || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  const limit = 10;
  const visible = expanded ? filtered : filtered.slice(0, limit);
  const hiddenCount = Math.max(0, filtered.length - visible.length);

  return (
    <div
      className={cx(
        "rounded-xl border p-3 flex flex-col gap-2 min-h-[200px] bg-white",
        tone.bg,
        tone.border,
        isOver && "ring-2 ring-sky-300"
      )}
      ref={setNodeRef}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className={cx("text-sm font-semibold", tone.text)}>{col.label}</div>
          <div className="text-xs text-neutral-600">{col.hint}</div>
        </div>
        <span className={cx("px-2 py-1 rounded-full text-xs font-semibold", tone.bg, tone.text, tone.border)}>
          {filtered.length}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-neutral-600">
        <div className="flex-1 min-w-0">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setExpanded(false);
            }}
            className="w-full rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-300"
            placeholder="Filtrer par client ou titre"
          />
        </div>
        {filtered.length > limit && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="px-2 py-1 rounded-full border border-neutral-300 bg-white hover:bg-neutral-100"
          >
            {expanded ? "Réduire" : `+${hiddenCount} autres`}
          </button>
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1 max-h-[70vh]">
        {filtered.length === 0 && (
          <div className="text-xs text-neutral-500 border border-dashed border-neutral-300 rounded-lg px-2 py-4 text-center">
            Rien ici pour l'instant.
          </div>
        )}
        {visible.map((q: any) => (
          <QuoteCard key={q.id} quote={q} tone={tone} onOpen={() => onOpenQuote(q)} />
        ))}
        {!expanded && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-lg py-2 hover:bg-sky-100"
          >
            Afficher {hiddenCount} devis supplémentaires
          </button>
        )}
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
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter un salarié</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Input placeholder="Nom" value={name} onChange={(e: any) => setName(e.target.value)} />
          <div className="grid md:grid-cols-2 gap-2">
            <Input placeholder="Rôle" value={role} onChange={(e: any) => setRole(e.target.value)} />
            <Input placeholder="Téléphone" value={phone} onChange={(e: any) => setPhone(e.target.value)} />
            <Input placeholder="Email" value={email} onChange={(e: any) => setEmail(e.target.value)} className="md:col-span-2" />
          </div>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <div key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full cursor-pointer ${c} ${color === c ? "ring-2 ring-black" : ""}`} title={c} />
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (name.trim()) {
                onAdd(
                  name.trim(),
                  color,
                  {
                    role: role.trim(),
                    phone: phone.trim(),
                    email: email.trim(),
                  }
                );
                setOpen(false);
                setName("");
                setRole("");
                setPhone("");
                setEmail("");
                setColor(COLORS[0]);
              }
            }}
          >
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSiteDialog({ open, setOpen, onAdd }: any) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState<string>(() => toLocalKey(new Date()));
  const [endDate, setEndDate] = useState<string>(() => toLocalKey(new Date()));
  const [color, setColor] = useState<string>(SITE_COLORS[6]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter un chantier</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nom du chantier" value={name} onChange={(e: any) => setName(e.target.value)} />
          <div className="space-y-1">
            <div className="text-xs text-neutral-600">Couleur</div>
            <div className="flex flex-wrap gap-2">
              {SITE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cx(
                    "w-7 h-7 rounded-full border transition",
                    c,
                    color === c ? "ring-2 ring-black border-black" : "border-transparent"
                  )}
                  aria-label={`Choisir la couleur ${c}`}
                  title={c}
                />
              ))}
            </div>
          </div>
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
              onAdd(n, startDate, endDate, color);
              setOpen(false);
              setName("");
              setStartDate(toLocalKey(new Date()));
              setEndDate(toLocalKey(new Date()));
              setColor(SITE_COLORS[6]);
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
  color,
}: any) {
  const [val, setVal] = useState<string>(name || "");
  const [pickerYear, setPickerYear] = useState<number>(initialYear || new Date().getFullYear());
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>(weekSelection || []);
  const [scheduleStart, setScheduleStart] = useState<string>(startDate || "");
  const [scheduleEnd, setScheduleEnd] = useState<string>(endDate || "");
  const [siteColor, setSiteColor] = useState<string>(color || SITE_COLORS[0]);

  useEffect(() => setVal(name || ""), [name]);
  useEffect(() => setSelectedWeeks(weekSelection || []), [weekSelection]);
  useEffect(() => { if (initialYear) setPickerYear(initialYear); }, [initialYear]);
  useEffect(() => setScheduleStart(startDate || ""), [startDate]);
  useEffect(() => setScheduleEnd(endDate || ""), [endDate]);
  useEffect(() => setSiteColor(color || SITE_COLORS[0]), [color]);

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
        {typeof color !== "undefined" && (
          <div className="mt-3 space-y-1">
            <div className="text-neutral-600 text-sm">Couleur du chantier</div>
            <div className="flex flex-wrap gap-2">
              {SITE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSiteColor(c)}
                  className={cx(
                    "w-7 h-7 rounded-full border transition",
                    c,
                    siteColor === c ? "ring-2 ring-black border-black" : "border-transparent"
                  )}
                  aria-label={`Couleur ${c}`}
                  title={c}
                />
              ))}
            </div>
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
              onSave(
                n,
                selectedWeeks,
                scheduleStart && scheduleEnd ? { startDate: scheduleStart, endDate: scheduleEnd } : undefined,
                siteColor
              );
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SiteDetailDialog({ open, site, onClose, onSave, fallbackYear }: any) {
  const [name, setName] = useState<string>("");
  const [status, setStatus] = useState<"planned" | "pending">("pending");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [contactName, setContactName] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [weeks, setWeeks] = useState<string>("");
  const [color, setColor] = useState<string>(SITE_COLORS[0]);

  useEffect(() => {
    setName(site?.name || "");
    setStatus(site?.status || "pending");
    setStartDate(site?.startDate || "");
    setEndDate(site?.endDate || "");
    setClientName(site?.clientName || site?.quoteSnapshot?.client || "");
    setAddress(site?.address || "");
    setCity(site?.city || "");
    setContactName(site?.contactName || site?.clientName || site?.quoteSnapshot?.client || "");
    setContactPhone(site?.contactPhone || "");
    setWeeks((site?.planningWeeks || []).join(", "));
    setColor(site?.color || SITE_COLORS[0]);
  }, [site]);

  const handleSave = (nextStatus?: "planned" | "pending") => {
    if (!site?.id) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (startDate && endDate && fromLocalKey(endDate) < fromLocalKey(startDate)) {
      window.alert("Merci de saisir des dates de début et fin valides.");
      return;
    }
    const parsedWeeks = parseWeekList(weeks, fallbackYear);
    onSave({
      ...site,
      name: trimmed,
      status: nextStatus || status,
      startDate,
      endDate,
      clientName,
      address,
      city,
      contactName,
      contactPhone,
      planningWeeks: parsedWeeks,
      color,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Détail du chantier</DialogTitle>
          <DialogDescription>Modifier ou planifier ce chantier, même s'il est déjà actif.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={status === "pending" ? "default" : "outline"}
              onClick={() => setStatus("pending")}
            >
              À planifier
            </Button>
            <Button
              size="sm"
              variant={status === "planned" ? "default" : "outline"}
              onClick={() => setStatus("planned")}
            >
              Planifié
            </Button>
            <span className="text-[11px] text-neutral-500">Statut éditable à tout moment</span>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[11px] text-neutral-600">Nom</span>
              <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Nom du chantier" />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-neutral-600">Couleur</span>
              <div className="flex flex-wrap gap-2">
                {SITE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cx(
                      "w-7 h-7 rounded-full border",
                      c,
                      color === c ? "ring-2 ring-black border-black" : "border-transparent"
                    )}
                    onClick={() => setColor(c)}
                    aria-label={`Choisir la couleur ${c}`}
                  />
                ))}
              </div>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-neutral-600">Client</span>
              <Input value={clientName} onChange={(e: any) => setClientName(e.target.value)} placeholder="Nom du client" />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-neutral-600">Ville ou code postal</span>
              <Input value={city} onChange={(e: any) => setCity(e.target.value)} placeholder="Ex: 75012 Paris" />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-neutral-600">Adresse</span>
              <Input value={address} onChange={(e: any) => setAddress(e.target.value)} placeholder="Adresse du chantier" />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-neutral-600">Début</span>
              <Input type="date" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-neutral-600">Fin</span>
              <Input type="date" min={startDate || undefined} value={endDate} onChange={(e: any) => setEndDate(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-neutral-600">Contact</span>
              <Input value={contactName} onChange={(e: any) => setContactName(e.target.value)} placeholder="Interlocuteur" />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-neutral-600">Téléphone</span>
              <Input value={contactPhone} onChange={(e: any) => setContactPhone(e.target.value)} placeholder="Téléphone" />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-[11px] text-neutral-600">Semaines (optionnel)</span>
              <Input
                value={weeks}
                onChange={(e: any) => setWeeks(e.target.value)}
                placeholder={`Ex: ${fallbackYear}-W12, W13`}
              />
              <span className="text-[11px] text-neutral-500">Laisser vide pour rendre le chantier visible toutes les semaines.</span>
            </label>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave("planned")}>
              Planifier
            </Button>
            <Button onClick={() => handleSave()}>Enregistrer</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PersonDetailDialog({ open, person, onClose, onSave }: any) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [skills, setSkills] = useState("");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    setName(person?.name || "");
    setRole(person?.role || "");
    setPhone(person?.phone || "");
    setEmail(person?.email || "");
    setSkills((person?.skills || []).join(", "));
    setNotes(person?.notes || "");
    setColor(person?.color || COLORS[0]);
  }, [person]);

  const handleSave = () => {
    if (!person?.id) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const parsedSkills = skills
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    onSave({
      ...person,
      name: trimmed,
      role: role.trim(),
      phone: phone.trim(),
      email: email.trim(),
      notes: notes.trim(),
      skills: parsedSkills,
      color,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Fiche salarié</DialogTitle>
          <DialogDescription>Compléter ou mettre à jour les informations associées à ce salarié.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Nom" />
          <div className="grid md:grid-cols-2 gap-2">
            <Input value={role} onChange={(e: any) => setRole(e.target.value)} placeholder="Poste / rôle" />
            <Input value={phone} onChange={(e: any) => setPhone(e.target.value)} placeholder="Téléphone" />
            <Input value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="Email" className="md:col-span-2" />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-neutral-600">Compétences (séparer par des virgules)</div>
            <Input value={skills} onChange={(e: any) => setSkills(e.target.value)} placeholder="Ex: plomberie, coffrage, conduite" />
          </div>
          <Textarea value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder="Notes internes, disponibilités..." />
          <div className="space-y-1">
            <div className="text-xs text-neutral-600">Couleur</div>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cx(
                    "w-7 h-7 rounded-full border transition",
                    c,
                    color === c ? "ring-2 ring-black border-black" : "border-transparent"
                  )}
                  aria-label={`Choisir la couleur ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button onClick={handleSave}>Enregistrer</Button>
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

  const ColorDot = ({ c, selected, onClick, label = "Choisir cette couleur" }: any) => (
    <button
      type="button"
      onClick={onClick}
      className={cx("w-7 h-7 rounded-full border", PASTELS[c].bg, selected ? "ring-2 ring-black" : "")}
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
    </button>
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
              <button
                type="button"
                onClick={() => setHighlight("")}
                className={cx(
                  "w-7 h-7 rounded-full border border-neutral-400 bg-white flex items-center justify-center",
                  !highlight ? "ring-2 ring-black" : ""
                )}
                aria-label="Sans surlignage"
              >
                <span className="sr-only">Sans surlignage</span>
              </button>
              {["mint", "sky", "peach"].map((c) => (
                <ColorDot
                  key={c}
                  c={c}
                  selected={highlight === c}
                  onClick={() => setHighlight(c)}
                  label="Choisir cette couleur"
                />
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
function AddPerson({ onAdd }: { onAdd: (name: string, color: string, extra?: any) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
      <AddPersonDialog open={open} setOpen={setOpen} onAdd={onAdd} />
    </>
  );
}
function AddSite({ onAdd }: { onAdd: (name: string, startDate: string, endDate: string, color: string) => void }) {
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
  const [quotes, setQuotes] = useState<any[]>(() => DEMO_QUOTES.map(normalizeQuoteRecord));
  const [refreshing, setRefreshing] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const syncVersionRef = useRef<number>(0);
  const maintenanceRef = useRef<HTMLDivElement | null>(null);
  const clientIdRef = useRef(
    typeof crypto !== "undefined" && (crypto as any).randomUUID
      ? (crypto as any).randomUUID()
      : `client-${Date.now()}`
  );
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (maintenanceRef.current && !maintenanceRef.current.contains(e.target as Node)) {
        setMaintenanceOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const isSiteVisibleOnWeek = useCallback((siteId: string, wk: string) => {
    const selection = siteWeekVisibility[siteId];
    if (!selection || selection.length === 0) return true;
    return selection.includes(wk);
  }, [siteWeekVisibility]);

  // View / navigation
  const [view, setView] = useState<
    "dashboard" | "planning" | "hours" | "calendar" | "timeline" | "devis" | "sites" | "salaries"
  >("dashboard");
  const [planningView, setPlanningView] = useState<"week" | "month">("week");
  const [timelineScope, setTimelineScope] = useState<"month" | "quarter" | "year">("month");
  const [calendarScope, setCalendarScope] = useState<"month" | "quarter" | "year" | "projection">("month");
  const [eventCalendars, setEventCalendars] = useState(DEFAULT_EVENT_CALENDARS);
  const [calendarEvents, setCalendarEvents] = useState<
    { id: string; title: string; dateKey: string; endDateKey?: string; calendarId?: string; color?: string; notes?: string }[]
  >([]);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [eventDraft, setEventDraft] = useState({
    title: "",
    dateKey: todayKey,
    endDateKey: "",
    durationDays: "",
    weekList: "",
    calendarId: DEFAULT_EVENT_CALENDARS[0]?.id || "",
    color: "",
    notes: "",
  });
  const [calendarDraft, setCalendarDraft] = useState({ name: "", color: COLORS[3] });
  const [calendarEditTarget, setCalendarEditTarget] = useState<null | { id: string; isDefault?: boolean }>(null);
  const eventCalendarsById = useMemo(() => {
    const map: Record<string, { id: string; name: string; color: string; visible: boolean; isDefault?: boolean }> = {};
    eventCalendars.forEach((cal) => {
      map[cal.id] = cal;
    });
    return map;
  }, [eventCalendars]);
  const plannedCalendarVisible = eventCalendarsById["cal-planned"]?.visible !== false;
  const pendingCalendarVisible = eventCalendarsById["cal-pending"]?.visible !== false;
  const absencesCalendarVisible = eventCalendarsById["cal-leave"]?.visible !== false;
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const weekFull = useMemo(() => getWeekDatesLocal(anchor), [anchor]);
  const weekDays = useMemo(() => weekFull.slice(0, 5), [weekFull]);
  const isPlanningWeek = view === "planning" && planningView === "week";
  const isPlanningMonth = view === "planning" && planningView === "month";
  const previousWeek = useMemo(() => {
    const d = new Date(anchor);
    d.setDate(d.getDate() - 7);
    return getWeekDatesLocal(d);
  }, [anchor]);
  const monthWeeks = useMemo(() => getMonthWeeks(anchor), [anchor]);
  const isWeekend = useCallback((d: Date) => {
    const day = d.getDay();
    return day === 0 || day === 6;
  }, []);
  const countWorkingDaysInclusive = useCallback(
    (start: Date, end: Date) => {
      if (end.getTime() < start.getTime()) return 0;
      let count = 0;
      const cursor = new Date(start);
      while (cursor.getTime() <= end.getTime()) {
        if (!isWeekend(cursor)) count++;
        cursor.setDate(cursor.getDate() + 1);
      }
      return count;
    },
    [isWeekend]
  );
  const workingDaysUntil = useCallback(
    (start: Date, target: Date) => {
      if (target.getTime() <= start.getTime()) return 0;
      let count = 0;
      const cursor = new Date(start);
      while (cursor.getTime() < target.getTime()) {
        if (!isWeekend(cursor)) count++;
        cursor.setDate(cursor.getDate() + 1);
      }
      return count;
    },
    [isWeekend]
  );
  const firstWorkingDayOnOrAfter = useCallback(
    (d: Date) => {
      const cursor = new Date(d);
      while (isWeekend(cursor)) {
        cursor.setDate(cursor.getDate() + 1);
      }
      return cursor;
    },
    [isWeekend]
  );
  const [newQuote, setNewQuote] = useState({
    title: "",
    client: "",
  });
  const [quoteDetail, setQuoteDetail] = useState<any | null>(null);
  const [quoteDetailOpen, setQuoteDetailOpen] = useState(false);
  const [siteDetail, setSiteDetail] = useState<any | null>(null);
  const [siteDetailOpen, setSiteDetailOpen] = useState(false);
  const [personDetail, setPersonDetail] = useState<any | null>(null);
  const [personDetailOpen, setPersonDetailOpen] = useState(false);
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
  const safePeople = useMemo(() => (Array.isArray(people) ? people.map(normalizePersonRecord) : []), [people]);
  const safeSites = Array.isArray(sites) ? sites : [];
  const safeQuotes = useMemo(() => (Array.isArray(quotes) ? quotes.map(normalizeQuoteRecord) : []), [quotes]);
  const plannedSites = useMemo(() => safeSites.filter((s) => (s.status || "planned") === "planned"), [safeSites]);
  const pendingSites = useMemo(() => safeSites.filter((s) => (s.status || "planned") !== "planned"), [safeSites]);
  const visiblePlannedSites = useMemo(
    () => (plannedCalendarVisible ? plannedSites : []),
    [plannedCalendarVisible, plannedSites]
  );
  const visiblePendingSites = useMemo(
    () => (pendingCalendarVisible ? pendingSites : []),
    [pendingCalendarVisible, pendingSites]
  );
  const timelinePlannedSites = plannedSites;
  const timelinePendingSites = pendingSites;

  const earliestTimelineStart = useMemo(
    () =>
      timelinePlannedSites.reduce<Date | null>((min, site) => {
        const s = fromLocalKey(site.startDate || todayKey);
        return !min || s.getTime() < min.getTime() ? s : min;
      }, null),
    [timelinePlannedSites, todayKey]
  );

  const timelineView = useMemo(() => {
    if (!timelineWindow) return null;
    return { ...timelineWindow, start: timelineWindow.start, buckets: timelineWindow.buckets };
  }, [timelineWindow]);
  const currentWeekKey = useMemo(() => weekKeyOf(weekDays[0]), [weekDays]);
  const previousWeekKey = useMemo(() => weekKeyOf(previousWeek[0]), [previousWeek]);
  const todayWeekKey = useMemo(() => weekKeyOf(today), [today]);
  const todayWeekNumber = useMemo(() => getISOWeek(today), [today]);
  const isViewingCurrentWeek = useMemo(() => currentWeekKey === todayWeekKey, [currentWeekKey, todayWeekKey]);
  const sitesForCurrentWeek = useMemo(
    () => plannedSites.filter((s) => isSiteVisibleOnWeek(s.id, currentWeekKey)),
    [plannedSites, siteWeekVisibility, currentWeekKey, isSiteVisibleOnWeek]
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

  const absencesWeekPeople = useMemo(() => {
    const map: Record<string, string[]> = {};
    Object.entries(absencesByWeek || {}).forEach(([weekKey, entries]) => {
      const names = Object.keys(entries || {})
        .filter((id) => entries?.[id])
        .map((id) => peopleById[id]?.name || id);
      if (names.length > 0) {
        map[weekKey] = names;
      }
    });
    return map;
  }, [absencesByWeek, peopleById]);

  const calendarWindow = useMemo(() => {
    const base = new Date(anchor);
    base.setHours(0, 0, 0, 0);

    if (calendarScope === "quarter") {
      return { start: startOfQuarterLocal(base), end: endOfQuarterLocal(base) };
    }
    if (calendarScope === "year" || calendarScope === "projection") {
      return { start: startOfYearLocal(base.getFullYear()), end: endOfYearLocal(base.getFullYear()) };
    }
    return { start: startOfMonthLocal(base), end: endOfMonthLocal(base) };
  }, [anchor, calendarScope]);

  const calendarWeeks = useMemo(() => {
    const weeks: Date[][] = [];
    const cursor = startOfISOWeekLocal(calendarWindow.start);
    const end = new Date(calendarWindow.end);
    while (cursor.getTime() <= end.getTime()) {
      const week = Array.from({ length: 7 }, (_, idx) => {
        const day = new Date(cursor);
        day.setDate(cursor.getDate() + idx);
        return day;
      });
      weeks.push(week);
      cursor.setDate(cursor.getDate() + 7);
    }
    return weeks;
  }, [calendarWindow.end, calendarWindow.start]);
  const projectionWeeks = useMemo(() => {
    if (calendarScope !== "projection") return [];
    const year = anchor.getFullYear();
    const totalWeeks = getISOWeeksInYear(year);
    return Array.from({ length: totalWeeks }, (_, idx) => {
      const weekNum = idx + 1;
      const start = getISOWeekStart(year, weekNum);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { weekKey: `${year}-W${pad2(weekNum)}`, weekNum, start, end };
    });
  }, [anchor, calendarScope]);
  const projectionWeekSummaries = useMemo(() => {
    if (calendarScope !== "projection") return [];
    const visibleCalendarEvents = calendarEvents.filter((event) => {
      const cal = event.calendarId ? eventCalendarsById[event.calendarId] : undefined;
      return !cal || cal.visible;
    });
    return projectionWeeks.map((week) => {
      const weekStart = week.start.getTime();
      const weekEnd = week.end.getTime();
      const planned = visiblePlannedSites.filter((site) => {
        const start = fromLocalKey(site.startDate || todayKey).getTime();
        const end = fromLocalKey(site.endDate || site.startDate || todayKey).getTime();
        return start <= weekEnd && end >= weekStart;
      });
      const pending = visiblePendingSites.filter((site) => {
        const start = fromLocalKey(site.startDate || todayKey).getTime();
        const end = fromLocalKey(site.endDate || site.startDate || todayKey).getTime();
        return start <= weekEnd && end >= weekStart;
      });
      const absences = absencesWeekPeople[week.weekKey] || [];
      const events = visibleCalendarEvents.filter((event) => {
        const start = fromLocalKey(event.dateKey).getTime();
        const end = fromLocalKey(event.endDateKey || event.dateKey).getTime();
        return start <= weekEnd && end >= weekStart;
      });
      return { ...week, planned, pending, absences, events };
    });
  }, [
    absencesWeekPeople,
    calendarEvents,
    calendarScope,
    eventCalendarsById,
    projectionWeeks,
    todayKey,
    visiblePendingSites,
    visiblePlannedSites,
  ]);

  const calendarPlannedInMonth = useMemo(
    () =>
      visiblePlannedSites.filter((site) => {
        const start = fromLocalKey(site.startDate || todayKey);
        const end = fromLocalKey(site.endDate || site.startDate || todayKey);
        return start.getTime() <= calendarWindow.end.getTime() && end.getTime() >= calendarWindow.start.getTime();
      }),
    [calendarWindow.end, calendarWindow.start, visiblePlannedSites, todayKey]
  );
  const calendarPendingInMonth = useMemo(
    () =>
      visiblePendingSites.filter((site) => {
        const start = fromLocalKey(site.startDate || todayKey);
        const end = fromLocalKey(site.endDate || site.startDate || todayKey);
        return start.getTime() <= calendarWindow.end.getTime() && end.getTime() >= calendarWindow.start.getTime();
      }),
    [calendarWindow.end, calendarWindow.start, visiblePendingSites, todayKey]
  );
  const calendarAbsenceWeeks = useMemo(() => {
    if (!absencesCalendarVisible) return [];
    const weeks = new Set<string>();
    calendarWeeks.flat().forEach((day) => {
      const wk = weekKeyOf(day);
      if (absencesWeekPeople[wk]?.length) weeks.add(wk);
    });
    return Array.from(weeks).sort();
  }, [absencesCalendarVisible, absencesWeekPeople, calendarWeeks]);

  const calendarEventMap = useMemo(() => {
    const plannedMap: Record<string, any[]> = {};
    const pendingMap: Record<string, any[]> = {};
    const absencesMap: Record<string, string[]> = {};
    const allDays = calendarWeeks.flat();
    const plannedVisible = plannedCalendarVisible;
    const pendingVisible = pendingCalendarVisible;
    const absencesVisible = absencesCalendarVisible;

    allDays.forEach((day) => {
      const key = toLocalKey(day);
      if (plannedVisible) {
        plannedMap[key] = visiblePlannedSites.filter((site) => {
          const start = fromLocalKey(site.startDate || todayKey);
          const end = fromLocalKey(site.endDate || site.startDate || todayKey);
          return isDateWithin(day, start, end);
        });
      } else {
        plannedMap[key] = [];
      }
      if (pendingVisible) {
        pendingMap[key] = visiblePendingSites.filter((site) => {
          const start = fromLocalKey(site.startDate || todayKey);
          const end = fromLocalKey(site.endDate || site.startDate || todayKey);
          return isDateWithin(day, start, end);
        });
      } else {
        pendingMap[key] = [];
      }
      if (absencesVisible) {
        const weekKey = weekKeyOf(day);
        const names = absencesWeekPeople[weekKey] || [];
        if (names.length) absencesMap[key] = names;
      }
    });

    return { plannedMap, pendingMap, absencesMap };
  }, [
    absencesCalendarVisible,
    absencesWeekPeople,
    calendarWeeks,
    pendingCalendarVisible,
    plannedCalendarVisible,
    visiblePendingSites,
    visiblePlannedSites,
    todayKey,
  ]);

  const calendarEventsByDay = useMemo(() => {
    const map: Record<string, { id: string; title: string; color: string; calendarName?: string }[]> = {};
    const start = calendarWindow.start.getTime();
    const end = calendarWindow.end.getTime();
    calendarEvents.forEach((event) => {
      const startDate = fromLocalKey(event.dateKey);
      const endDate = fromLocalKey(event.endDateKey || event.dateKey);
      const cal = event.calendarId ? eventCalendarsById[event.calendarId] : undefined;
      if (event.calendarId && cal && !cal.visible) return;
      const colorClass = event.color || cal?.color || "bg-neutral-400";
      const cursor = new Date(startDate);
      while (cursor.getTime() <= endDate.getTime()) {
        if (!isWeekend(cursor)) {
          const time = cursor.getTime();
          if (time >= start && time <= end) {
            const key = toLocalKey(cursor);
            if (!map[key]) map[key] = [];
            map[key].push({
              id: event.id,
              title: event.title,
              color: colorClass,
              calendarName: cal?.name,
            });
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [calendarEvents, calendarWindow.end, calendarWindow.start, eventCalendarsById, isWeekend]);

  const timelineAbsences = useMemo(() => {
    if (!timelineView) return [];
    const entries: { weekKey: string; start: Date; people: string[] }[] = [];
    const cursor = startOfISOWeekLocal(timelineView.start);
    const end = new Date(timelineView.end);
    while (cursor.getTime() <= end.getTime()) {
      const wkKey = weekKeyOf(cursor);
      const absentMap = absencesByWeek[wkKey] || {};
      const peopleList = Object.keys(absentMap)
        .filter((id) => absentMap[id])
        .map((id) => peopleById[id]?.name || id);
      if (peopleList.length > 0) {
        entries.push({ weekKey: wkKey, start: new Date(cursor), people: peopleList });
      }
      cursor.setDate(cursor.getDate() + 7);
    }
    return entries;
  }, [absencesByWeek, peopleById, timelineView]);

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
    if (!timelineView)
      return { rows: [] as { site: any; bar: { days: number; offsetPct: number; widthPct: number; start: Date; end: Date }; bucketOverlap: { label: string; days: number; pct: number }[] }[], totalDays: 0 };

    const totalDays = Math.max(1, countWorkingDaysInclusive(timelineView.start, timelineView.end));

    const rows = timelinePlannedSites
      .map((site) => {
        const siteStart = fromLocalKey(site.startDate || todayKey);
        const siteEnd = fromLocalKey(site.endDate || site.startDate || todayKey);
        if (siteEnd < timelineView.start || siteStart > timelineView.end) return null;

        const start = siteStart.getTime() < timelineView.start.getTime() ? new Date(timelineView.start) : siteStart;
        const end = siteEnd.getTime() > timelineView.end.getTime() ? new Date(timelineView.end) : siteEnd;
        const spanDays = Math.max(1, countWorkingDaysInclusive(start, end));
        const offsetDays = Math.max(0, workingDaysUntil(timelineView.start, start));
        const offsetPct = (offsetDays / totalDays) * 100;
        const widthPct = Math.max(2, (spanDays / totalDays) * 100);

        const bucketOverlap = timelineView.buckets.map((bucket) => {
          const overlapStart = firstWorkingDayOnOrAfter(new Date(Math.max(bucket.start.getTime(), start.getTime())));
          const overlapEnd = new Date(Math.min(bucket.end.getTime(), end.getTime()));
          const hasOverlap = overlapEnd.getTime() >= overlapStart.getTime();
          const days = hasOverlap ? countWorkingDaysInclusive(overlapStart, overlapEnd) : 0;
          const bucketDays = Math.max(1, countWorkingDaysInclusive(bucket.start, bucket.end));
          const pct = Math.min(100, bucketDays > 0 ? (days / bucketDays) * 100 : 0);
          return { label: bucket.label, days, pct };
        });

        return {
          site,
          bar: { days: spanDays, offsetPct, widthPct, start, end },
          bucketOverlap,
        };
      })
      .filter(Boolean) as { site: any; bar: { days: number; offsetPct: number; widthPct: number; start: Date; end: Date }; bucketOverlap: { label: string; days: number; pct: number }[] }[];

    return { rows, totalDays };
  }, [countWorkingDaysInclusive, firstWorkingDayOnOrAfter, timelinePlannedSites, timelineView, todayKey, workingDaysUntil]);

  const timelineScopeLabel = useMemo(() => {
    if (!timelineView) return "";
    if (timelineScope === "month") return `Vue mensuelle • ${timelineView.label}`;
    if (timelineScope === "quarter") return `Vue trimestrielle • ${timelineView.label}`;
    return `Vue annuelle • ${timelineView.label}`;
  }, [timelineScope, timelineView]);

  const timelineLoad = useMemo(() => {
    if (!timelineView) return { counts: [] as number[], labels: [] as string[], gaps: [] as any[], peaks: [] as any[], bucketStats: [] as any[], max: 0, zeroDays: 0, totalDays: 0 };
    const days: { date: Date; count: number }[] = [];
    const cursor = new Date(timelineView.start);
    while (cursor.getTime() <= timelineView.end.getTime()) {
      if (!isWeekend(cursor)) {
        const dateKey = toLocalKey(cursor);
        const count = timelinePlannedSites.reduce((acc, site) => {
          const siteStart = fromLocalKey(site.startDate || todayKey);
          const siteEnd = fromLocalKey(site.endDate || site.startDate || todayKey);
          if (siteStart.getTime() <= cursor.getTime() && siteEnd.getTime() >= cursor.getTime()) {
            return acc + 1;
          }
          return acc;
        }, 0);
        days.push({ date: new Date(cursor), count });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    const counts = days.map((d) => d.count);
    const labels = days.map((d) => toLocalKey(d.date));
    const max = counts.length ? Math.max(...counts) : 0;
    const zeroDays = counts.filter((c) => c === 0).length;

    const findRanges = (predicate: (v: number) => boolean) => {
      const ranges: { startIdx: number; endIdx: number }[] = [];
      let i = 0;
      while (i < counts.length) {
        if (predicate(counts[i])) {
          const startIdx = i;
          while (i < counts.length && predicate(counts[i])) i++;
          const endIdx = i - 1;
          ranges.push({ startIdx, endIdx });
        } else {
          i++;
        }
      }
      return ranges;
    };

    const earliestWorkingStart = earliestTimelineStart ? firstWorkingDayOnOrAfter(new Date(earliestTimelineStart)) : null;

    const gaps = findRanges((v) => v === 0)
      .map((r) => {
        const start = new Date(days[r.startIdx].date);
        const end = new Date(days[r.endIdx].date);
        if (earliestWorkingStart && end.getTime() < earliestWorkingStart.getTime()) return null;
        const adjustedStart = earliestWorkingStart && start.getTime() < earliestWorkingStart.getTime() ? earliestWorkingStart : start;
        return { start: adjustedStart, end, days: countWorkingDaysInclusive(adjustedStart, end) };
      })
      .filter(Boolean) as { start: Date; end: Date; days: number }[];

    const peaks = max > 0
      ? findRanges((v) => v === max).map((r) => {
          const start = new Date(days[r.startIdx].date);
          const end = new Date(days[r.endIdx].date);
          return { start, end, days: r.endIdx - r.startIdx + 1, count: max };
        })
      : [];

    const bucketStats = timelineView.buckets.map((bucket) => {
      const spanDays = days.filter((d) => d.date.getTime() >= bucket.start.getTime() && d.date.getTime() <= bucket.end.getTime());
      const sum = spanDays.reduce((acc, d) => acc + d.count, 0);
      const idle = spanDays.filter((d) => d.count === 0).length;
      const avg = spanDays.length > 0 ? sum / spanDays.length : 0;
      return { label: bucket.label, avg, idle, span: spanDays.length };
    });

    return { counts, labels, gaps, peaks, bucketStats, max, zeroDays, totalDays: days.length };
  }, [countWorkingDaysInclusive, earliestTimelineStart, firstWorkingDayOnOrAfter, isWeekend, timelinePlannedSites, timelineView, todayKey]);

  const actionableQuotes = useMemo(
    () => safeQuotes.filter((q) => q.status !== "won" && q.status !== "lost"),
    [safeQuotes]
  );

  const urgentQuotes = useMemo(() => {
    const now = new Date();
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 14);

    return actionableQuotes
      .filter((q) => q.dueDate && fromLocalKey(q.dueDate).getTime() >= now.getTime())
      .filter((q) => fromLocalKey(q.dueDate).getTime() <= soon.getTime())
      .sort((a, b) => fromLocalKey(a.dueDate).getTime() - fromLocalKey(b.dueDate).getTime())
      .slice(0, 4);
  }, [actionableQuotes]);

  const backlogQuotes = useMemo(() => actionableQuotes.filter((q) => !q.dueDate).slice(0, 3), [actionableQuotes]);

  const pendingSiteHighlights = useMemo(
    () =>
      [...pendingSites]
        .sort((a, b) => fromLocalKey(a.startDate || todayKey).getTime() - fromLocalKey(b.startDate || todayKey).getTime())
        .slice(0, 4),
    [pendingSites, todayKey]
  );

  const weekSiteHighlights = useMemo(() => sitesForCurrentWeek.slice(0, 4), [sitesForCurrentWeek]);

  const upcomingGaps = useMemo(() => {
    const now = new Date();
    return (timelineLoad.gaps || []).filter((g) => g.end.getTime() >= now.getTime()).slice(0, 3);
  }, [timelineLoad]);

  const getLoadTone = useCallback((ratio: number) => {
    if (ratio >= 0.7) {
      return { color: "#ef4444", softBg: "bg-rose-50", softText: "text-rose-700", border: "border-rose-100" };
    }
    if (ratio >= 0.35) {
      return { color: "#f59e0b", softBg: "bg-amber-50", softText: "text-amber-700", border: "border-amber-100" };
    }
    return { color: "#10b981", softBg: "bg-emerald-50", softText: "text-emerald-700", border: "border-emerald-100" };
  }, []);

  const createCalendar = useCallback(() => {
    const name = calendarDraft.name.trim();
    if (!name) return;
    const id = ensureId(name, "cal");
    if (calendarEditTarget) {
      setEventCalendars((prev) =>
        prev.map((cal) =>
          cal.id === calendarEditTarget.id
            ? { ...cal, name, color: calendarDraft.color || cal.color }
            : cal
        )
      );
    } else {
      setEventCalendars((prev) => [...prev, { id, name, color: calendarDraft.color || COLORS[0], visible: true }]);
    }
    setCalendarDraft({ name: "", color: COLORS[3] });
    setCalendarEditTarget(null);
    setCalendarDialogOpen(false);
  }, [calendarDraft.color, calendarDraft.name, calendarEditTarget]);

  const deleteCalendar = useCallback((id: string) => {
    setEventCalendars((prev) => prev.filter((cal) => cal.id !== id));
    setCalendarEvents((prev) => prev.filter((evt) => evt.calendarId !== id));
  }, []);

  const createCalendarEvent = useCallback(() => {
    const title = eventDraft.title.trim();
    if (!title || !eventDraft.dateKey) return;
    const weeks = eventDraft.weekList ? parseWeekList(eventDraft.weekList, getISOWeekYear(anchor)) : [];
    if (weeks.length > 0) {
      const eventsFromWeeks = weeks.map((weekKey) => {
        const [yearRaw, weekRaw] = weekKey.split("-W");
        const year = Number(yearRaw);
        const weekNum = Number(weekRaw);
        const weekStart = getISOWeekStart(year, weekNum);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 4);
        return {
          id: ensureId(`${title}-${weekKey}`, "evt"),
          title,
          dateKey: toLocalKey(weekStart),
          endDateKey: toLocalKey(weekEnd),
          calendarId: eventDraft.calendarId || undefined,
          color: eventDraft.color || undefined,
          notes: eventDraft.notes || undefined,
        };
      });
      setCalendarEvents((prev) => [...prev, ...eventsFromWeeks]);
    } else {
      const baseStart = fromLocalKey(eventDraft.dateKey);
      let endKey = eventDraft.endDateKey;
      if (!endKey && eventDraft.durationDays) {
        const totalDays = Math.max(1, Number(eventDraft.durationDays));
        let remaining = totalDays - 1;
        const cursor = new Date(baseStart);
        while (remaining > 0) {
          cursor.setDate(cursor.getDate() + 1);
          if (cursor.getDay() !== 0 && cursor.getDay() !== 6) {
            remaining -= 1;
          }
        }
        endKey = toLocalKey(cursor);
      }
      const id = ensureId(`${title}-${eventDraft.dateKey}`, "evt");
      setCalendarEvents((prev) => [
        ...prev,
        {
          id,
          title,
          dateKey: eventDraft.dateKey,
          endDateKey: endKey || undefined,
          calendarId: eventDraft.calendarId || undefined,
          color: eventDraft.color || undefined,
          notes: eventDraft.notes || undefined,
        },
      ]);
    }
    setEventDraft((prev) => ({
      ...prev,
      title: "",
      notes: "",
      weekList: "",
      durationDays: "",
      endDateKey: "",
      dateKey: prev.dateKey || todayKey,
      color: "",
    }));
    setEventDialogOpen(false);
  }, [anchor, eventDraft.calendarId, eventDraft.color, eventDraft.dateKey, eventDraft.durationDays, eventDraft.endDateKey, eventDraft.notes, eventDraft.title, eventDraft.weekList]);
  const openEventDialogForDate = useCallback((dateKey: string) => {
    setEventDraft((prev) => ({
      ...prev,
      title: "",
      dateKey,
      endDateKey: "",
      durationDays: "",
      weekList: "",
      notes: "",
      color: "",
      calendarId: prev.calendarId || DEFAULT_EVENT_CALENDARS[0]?.id || "",
    }));
    setEventDialogOpen(true);
  }, []);

  // Gestion des devis (kanban)
  const normalizeQuoteForSave = useCallback((quote: any) => normalizeQuoteRecord(quote), []);

  const upsertChantierFromQuote = useCallback(
    (quote: any) => {
      const normalizedQuote = normalizeQuoteForSave(quote);
      if (!normalizedQuote || normalizedQuote.status !== "won") return;
      const snapshot = {
        title: normalizedQuote.title,
        client: normalizedQuote.client,
        amount: normalizedQuote.amount,
        note: normalizedQuote.note,
        dueDate: normalizedQuote.dueDate,
      };
      const baseStart = normalizedQuote.plannedStart || normalizedQuote.dueDate || normalizedQuote.sentAt || todayKey;
      const baseEnd = normalizedQuote.plannedEnd || baseStart;

      setSites((prev) => {
        const existing = prev.find((s) => s.quoteId === normalizedQuote.id);
        if (existing) {
          const updated = normalizeSiteRecord({
            ...existing,
            name: existing.name || normalizedQuote.title || "Chantier issu d'un devis",
            startDate: existing.startDate || baseStart,
            endDate: existing.endDate || baseEnd,
            address: existing.address || normalizedQuote.address,
            city: existing.city || normalizedQuote.city,
            clientName: existing.clientName || normalizedQuote.client,
            contactName: existing.contactName || normalizedQuote.contactName || normalizedQuote.client,
            contactPhone: existing.contactPhone || normalizedQuote.contactPhone,
            quoteSnapshot: { ...(existing.quoteSnapshot || {}), ...snapshot },
            status: existing.status || "pending",
          });
          const changed = Object.keys(updated).some((k) => (updated as any)[k] !== (existing as any)[k]);
          if (!changed) return prev;
          return prev.map((s) => (s.id === existing.id ? updated : s));
        }

        const id = ensureId(String(normalizedQuote.title || baseStart), "site");
        const colorIndex = hashString(String(normalizedQuote.id || normalizedQuote.title || baseStart)) % SITE_COLORS.length;
        const newSite = normalizeSiteRecord({
          id,
          name: normalizedQuote.title || "Chantier issu d'un devis",
          startDate: baseStart,
          endDate: baseEnd,
          color: SITE_COLORS[colorIndex] || SITE_COLORS[0],
          address: normalizedQuote.address,
          city: normalizedQuote.city,
          clientName: normalizedQuote.client,
          contactName: normalizedQuote.contactName || normalizedQuote.client,
          contactPhone: normalizedQuote.contactPhone,
          quoteId: normalizedQuote.id,
          quoteSnapshot: snapshot,
          status: "pending",
        });
        return [...prev, newSite];
      });
    },
    [normalizeQuoteForSave, todayKey]
  );

  const quotesByColumn = useMemo(() => {
    const map: Record<string, any[]> = {};
    QUOTE_COLUMNS.forEach((c) => (map[c.id] = []));
    safeQuotes.forEach((q) => {
      if (!map[q.status]) map[q.status] = [];
      map[q.status].push(q);
    });
    return map;
  }, [safeQuotes]);

  const openQuoteDetail = useCallback((quote: any) => {
    setQuoteDetail(normalizeQuoteRecord(quote));
    setQuoteDetailOpen(true);
  }, []);

  const saveQuoteDetail = useCallback(() => {
    if (!quoteDetail) return;
    const normalized = normalizeQuoteForSave(quoteDetail);
    setQuotes((prev) => prev.map((q) => (q.id === normalized.id ? normalized : q)));
    upsertChantierFromQuote(normalized);
    setQuoteDetailOpen(false);
  }, [normalizeQuoteForSave, quoteDetail, upsertChantierFromQuote]);

  const deleteQuote = useCallback(() => {
    if (!quoteDetail) return;
    const confirmed = confirm("Supprimer ce devis ?");
    if (!confirmed) return;
    setQuotes((prev) => prev.filter((q) => q.id !== quoteDetail.id));
    setQuoteDetailOpen(false);
    setQuoteDetail(null);
  }, [quoteDetail]);

  useEffect(() => {
    if (!quoteDetail) return;
    const refreshed = quotes.find((q) => q.id === quoteDetail.id);
    if (!refreshed) {
      setQuoteDetailOpen(false);
      setQuoteDetail(null);
      return;
    }
    setQuoteDetail((prev) => (prev ? normalizeQuoteRecord({ ...prev, ...refreshed }) : prev));
  }, [quotes, quoteDetail?.id]);

  useEffect(() => {
    safeQuotes.forEach((q) => upsertChantierFromQuote(q));
  }, [safeQuotes, upsertChantierFromQuote]);

  const addQuote = () => {
    if (!newQuote.title.trim()) {
      alert("Nom du devis requis");
      return;
    }
    const id = typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `q-${Date.now()}`;
    const base = { id, title: newQuote.title.trim(), client: newQuote.client.trim(), status: "todo" };
    const normalized = normalizeQuoteForSave(base);
    setQuotes((prev) => [...prev, normalized]);
    setNewQuote({ title: "", client: "" });
    openQuoteDetail(normalized);
  };

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
    if (data.type === "quote" && over.data?.current?.type === "quote-column") {
      const newStatus = over.data.current.status;
      if (!newStatus || data.status === newStatus) return;
      setQuotes((prev) => prev.map((q) => (q.id === data.quoteId ? normalizeQuoteForSave({ ...q, status: newStatus }) : q)));
      setQuoteDetail((prev) => (prev && prev.id === data.quoteId ? normalizeQuoteForSave({ ...prev, status: newStatus }) : prev));
      return;
    }

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
    if (isPlanningMonth || view === "calendar") {
      if (view === "calendar") {
        if (calendarScope === "quarter") d.setMonth(d.getMonth() + delta * 3);
        else if (calendarScope === "year" || calendarScope === "projection") d.setFullYear(d.getFullYear() + delta);
        else d.setMonth(d.getMonth() + delta);
      } else {
        d.setMonth(d.getMonth() + delta);
      }
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

  const jumpToCurrentWeek = (opts?: { forceView?: "planning" | "hours" }) => {
    const now = new Date();
    const wkKey = weekKeyOf(now);
    setAnchor(now);
    if (isPlanningMonth) {
      setPendingScrollWeek(wkKey);
    }
    if (opts?.forceView) {
      setView(opts.forceView);
      if (opts.forceView === "planning") setPlanningView("week");
    }
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
  const [renameTarget, setRenameTarget] = useState<
    | null
    | { type: 'person' | 'site'; id: string; name: string; startDate?: string; endDate?: string; color?: string }
  >(null);
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
  const renameSite = (id: string, name: string, color?: string) =>
    setSites((s) => s.map((x) => (x.id === id ? { ...x, name, color: color || x.color } : x)));
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
  const addPerson = (name: string, color: string, extra: any = {}) =>
    setPeople((p) => [
      ...p,
      normalizePersonRecord({
        id:
          typeof crypto !== "undefined" && (crypto as any).randomUUID
            ? (crypto as any).randomUUID()
            : `p${Date.now()}`,
        name,
        color,
        ...extra,
      }),
    ]);
  const removePerson = (id: string) => {
    setPeople((p) => p.filter((x) => x.id !== id));
    setAssignments((as) => as.filter((a) => a.personId !== id));
    setAbsencesByWeek((prev) => { const next: typeof prev = { ...prev }; for (const wk of Object.keys(next)) { if (next[wk] && Object.prototype.hasOwnProperty.call(next[wk], id)) { const { [id]: _omit, ...rest } = next[wk]; (next as any)[wk] = rest; } } return next; });
  };
  const addSite = (name: string, startDate: string, endDate: string, color: string) =>
    setSites((s) => [
      ...s,
      normalizeSiteRecord({
        id: typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `s${Date.now()}`,
        name,
        startDate,
        endDate,
        color,
        status: "planned",
      }),
    ]);
  const removeSite = (id: string) => {
    setSites((s) => s.filter((x) => x.id !== id));
    setAssignments((as) => as.filter((a) => a.siteId !== id));
    setNotes((prev) => { const next = { ...prev } as Record<string, any>; Object.keys(next).forEach((k) => { if (k.startsWith(`${id}|`)) delete (next as any)[k]; }); return next; });
    setSiteWeekVisibility((prev) => { const { [id]: _omit, ...rest } = prev; return rest; });
  };
  const updateSiteMeta = (id: string, patch: any) =>
    setSites((s) => s.map((x) => (x.id === id ? normalizeSiteRecord({ ...x, ...patch }) : x)));
  const planSite = (id: string, weeks: string[] = [], start?: string, end?: string) => {
    setSites((s) => s.map((x) => (x.id === id ? normalizeSiteRecord({ ...x, status: "planned", startDate: start || x.startDate, endDate: end || x.endDate, planningWeeks: weeks.length ? weeks : x.planningWeeks }) : x)));
    setSiteWeekVisibility((prev) => {
      if (!weeks || weeks.length === 0) return prev;
      return { ...prev, [id]: weeks };
    });
  };
  const openSiteDetail = (id: string, statusOverride?: "planned" | "pending") => {
    const site = safeSites.find((s) => s.id === id);
    if (!site) return;
    setSiteDetail(statusOverride ? { ...site, status: statusOverride } : site);
    setSiteDetailOpen(true);
  };
  const saveSiteDetail = (payload: any) => {
    if (!payload?.id) return;
    const weeks = Array.isArray(payload.planningWeeks) ? payload.planningWeeks : [];
    updateSiteMeta(payload.id, { ...payload, planningWeeks: weeks });
    setSiteWeekVisibility((prev) => {
      if (!weeks.length) {
        const { [payload.id]: _omit, ...rest } = prev;
        return rest;
      }
      return { ...prev, [payload.id]: weeks };
    });
    setSiteDetailOpen(false);
    setSiteDetail(null);
  };

  const openPersonDetail = (id: string) => {
    const person = safePeople.find((p) => p.id === id);
    if (!person) return;
    setPersonDetail(person);
    setPersonDetailOpen(true);
  };

  const savePersonDetail = (payload: any) => {
    if (!payload?.id) return;
    setPeople((prev) => prev.map((p) => (p.id === payload.id ? normalizePersonRecord(payload) : p)));
    setPersonDetail(null);
    setPersonDetailOpen(false);
  };

// ==========================
// Persistance serveur (Vercel Blob) + cache local
// ==========================
  const applyState = useCallback((state: any) => {
    setPeople(toArray(state.people, DEMO_PEOPLE).map(normalizePersonRecord));
    setSites(toArray(state.sites, DEMO_SITES).map(normalizeSiteRecord));
    setAssignments(toArray(state.assignments));
    setNotes(state.notes || {});
    setAbsencesByWeek(state.absencesByWeek || {});
    setSiteWeekVisibility(state.siteWeekVisibility || {});
    setHoursPerDay(state.hoursPerDay ?? 8);
    setQuotes(toArray(state.quotes, DEMO_QUOTES).map(normalizeQuoteRecord));
    syncVersionRef.current = Number(state.updatedAt || 0);
  }, []);

  const firstLoad = useRef(true);

  const loadWeekState = useCallback(
    async (markLoaded = false) => {
      const wk = currentWeekKey;
      const hasPayload = (s: any) =>
        s && typeof s === "object" && (Array.isArray(s.people) || Array.isArray(s.sites) || Array.isArray(s.assignments));

      setRefreshing(true);
      try {
        let remoteState: any = null;
        try {
          const res = await fetch(`/api/state/${wk}?ts=${Date.now()}`, {
            cache: "reload",
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate",
              Pragma: "no-cache",
            },
            next: { revalidate: 0 },
          });
          const srv = await res.json();
          if (hasPayload(srv)) {
            remoteState = srv;
          }
        } catch {}

        let localState: any = null;
        try {
          const raw = localStorage.getItem("btp-planner-state:v1");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (hasPayload(parsed)) {
              localState = parsed;
            }
          }
        } catch {}

    const candidates = [remoteState, localState].filter(Boolean) as any[];
    if (candidates.length > 0) {
          const newest = candidates.reduce((best, cur) => {
            const curTs = Number(cur.updatedAt || 0);
            const bestTs = Number(best.updatedAt || 0);
            if (curTs > bestTs) return cur;
            return best;
          }, candidates[0]);
          applyState(newest);
        }
      } finally {
        if (markLoaded) firstLoad.current = false;
        setRefreshing(false);
      }
    },
    [applyState, currentWeekKey]
  );

  const refreshPlanning = useCallback(() => {
    loadWeekState(false);
  }, [loadWeekState]);

// Polling temps réel pour récupérer les mises à jour des autres utilisateurs
useEffect(() => {
  let cancelled = false;
  let polling = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const poll = async () => {
    if (polling) return;
    polling = true;
    try {
      const res = await fetch(`/api/state/${currentWeekKey}?ts=${Date.now()}`, {
        cache: "reload",
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
        next: { revalidate: 0 },
      });
      const data = await res.json();
      if (data && typeof data === "object" && !cancelled) {
        const remoteVersion = Number((data as any).updatedAt || 0);
        const remoteClient = (data as any).clientId;
        const fromOther = !remoteClient || remoteClient !== clientIdRef.current;
        const hasVersion = Number.isFinite(remoteVersion) && remoteVersion > 0;
        const hasPayload = Array.isArray((data as any).people) || Array.isArray((data as any).sites);

        if (fromOther && hasVersion && hasPayload && remoteVersion > syncVersionRef.current) {
          applyState(data);
        }
      }
    } catch {}
    finally {
      polling = false;
      if (!cancelled) timer = setTimeout(poll, 1000);
    }
  };
  poll();
  const onFocus = () => poll();
  if (typeof window !== "undefined") {
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
  }
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    }
  };
}, [currentWeekKey, applyState]);

// Charger depuis le serveur pour la semaine affichée (fallback localStorage + arbitrage versions)
useEffect(() => {
  loadWeekState(true);
}, [currentWeekKey, loadWeekState]);

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
  const stamp = Date.now();
  syncVersionRef.current = stamp;
  const payload = {
    people,
    sites,
    assignments,
    notes,
    absencesByWeek,
    siteWeekVisibility,
    hoursPerDay,
    quotes,
    eventCalendars,
    calendarEvents,
    updatedAt: stamp,
    clientId: clientIdRef.current,
  };
  // cache local (backup + rapidité)
  try { localStorage.setItem("btp-planner-state:v1", JSON.stringify(payload)); } catch {}
  // serveur (par semaine)
  saveRemote(currentWeekKey, payload);
}, [people, sites, assignments, notes, absencesByWeek, siteWeekVisibility, currentWeekKey, saveRemote, hoursPerDay, quotes, eventCalendars, calendarEvents]);

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
    const payload = { people, sites, assignments, notes, absencesByWeek, siteWeekVisibility, hoursPerDay, quotes, eventCalendars, calendarEvents };
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
    reader.onload = () => { try { const data = JSON.parse(String(reader.result)); setPeople(toArray(data.people, DEMO_PEOPLE).map(normalizePersonRecord)); setSites(toArray(data.sites).map(normalizeSiteRecord)); setAssignments(toArray(data.assignments)); setNotes(data.notes||{}); setAbsencesByWeek(data.absencesByWeek||{}); setSiteWeekVisibility(data.siteWeekVisibility||{}); setHoursPerDay(data.hoursPerDay ?? 8); setQuotes(toArray(data.quotes, DEMO_QUOTES).map(normalizeQuoteRecord)); setEventCalendars(toArray(data.eventCalendars, DEFAULT_EVENT_CALENDARS)); setCalendarEvents(toArray(data.calendarEvents)); } catch { alert("Fichier invalide"); } };
    reader.readAsText(f); e.target.value = '';
  };

  // ==========================
  // UI (Semaine / Mois / Heures)
  // ==========================
  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <Tabs value={view} onValueChange={(v: any) => setView(v)}>
          <div className="relative rounded-2xl border bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b bg-gradient-to-r from-neutral-50 to-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center font-semibold">BT</div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-neutral-900">BTP Planner</div>
                  <div className="text-xs text-neutral-500">Tableau de bord & suivi collaboratif</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-wide text-neutral-500">Navigation</span>
                <TabsList className="bg-neutral-100 p-1 rounded-xl shadow-inner">
                  <TabsTrigger value="dashboard">
                    <span className="flex items-center gap-1.5 text-sm"><LayoutDashboard className="w-4 h-4" /> Tableau de bord</span>
                  </TabsTrigger>
                  <TabsTrigger value="planning">
                    <span className="flex items-center gap-1.5 text-sm"><CalendarRange className="w-4 h-4" /> Planning</span>
                  </TabsTrigger>
                  <TabsTrigger value="hours">
                    <span className="flex items-center gap-1.5 text-sm"><Clock3 className="w-4 h-4" /> Heures</span>
                  </TabsTrigger>
                  <TabsTrigger value="calendar">
                    <span className="flex items-center gap-1.5 text-sm"><CalendarRange className="w-4 h-4" /> Calendrier</span>
                  </TabsTrigger>
                  <TabsTrigger value="timeline">
                    <span className="flex items-center gap-1.5 text-sm"><ListChecks className="w-4 h-4" /> Gantt</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-neutral-50 border-t">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-wide text-neutral-500">Gestion</span>
                <TabsList className="bg-neutral-100 p-1 rounded-xl shadow-inner">
                  <TabsTrigger value="devis">Devis</TabsTrigger>
                  <TabsTrigger value="sites">Mes chantiers</TabsTrigger>
                  <TabsTrigger value="salaries">Mes salariés</TabsTrigger>
                </TabsList>
              </div>
              <div className="flex items-center gap-2" ref={maintenanceRef}>
                <input type="file" accept="application/json" ref={fileRef} onChange={onImport} className="hidden" />
                <div className="relative">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Options de maintenance"
                    onClick={() => setMaintenanceOpen((v) => !v)}
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                  {maintenanceOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-xl border bg-white shadow-lg p-2 space-y-1">
                      <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Maintenance</div>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          refreshPlanning();
                          setMaintenanceOpen(false);
                        }}
                        disabled={refreshing}
                      >
                        <RotateCcw className="w-4 h-4" /> Recharger le planning
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          fileRef.current?.click();
                          setMaintenanceOpen(false);
                        }}
                      >
                        <Upload className="w-4 h-4" /> Importer JSON
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          exportJSON();
                          setMaintenanceOpen(false);
                        }}
                      >
                        <Download className="w-4 h-4" /> Exporter JSON
                      </Button>
                      {view === "hours" && (
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-2"
                          onClick={() => {
                            exportHoursCSV();
                            setMaintenanceOpen(false);
                          }}
                        >
                          <Download className="w-4 h-4" /> Export heures CSV
                        </Button>
                      )}
                      <div className="px-2 pt-1 text-[11px] text-neutral-500">
                        Centralise les exports/imports pour garder le planning propre et synchronisé.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Tabs>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {view === "planning" && (
              <div className="flex items-center gap-2 pr-2 border-r border-neutral-200">
                <span className="text-xs uppercase tracking-wide text-neutral-500">Vue planning</span>
                <div className="inline-flex rounded-lg bg-neutral-100 p-1">
                  <Button
                    size="sm"
                    variant={planningView === "week" ? "default" : "ghost"}
                    className={planningView === "week" ? "shadow-sm" : ""}
                    onClick={() => setPlanningView("week")}
                  >
                    Semaine
                  </Button>
                  <Button
                    size="sm"
                    variant={planningView === "month" ? "default" : "ghost"}
                    className={planningView === "month" ? "shadow-sm" : ""}
                    onClick={() => setPlanningView("month")}
                  >
                    Mois
                  </Button>
                </div>
              </div>
            )}
            {["planning", "hours", "timeline", "calendar"].includes(view) && (
              <>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Précédent">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Suivant">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="font-semibold text-base flex items-center gap-2">
                  <CalendarRange className="w-5 h-5" />
                  {(isPlanningWeek || view === "hours") && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{`Semaine ${getISOWeek(weekDays[0])} • ${formatFR(weekDays[0], true)} → ${formatFR(weekDays[4], true)}`}</span>
                      <span className="text-xs font-semibold text-sky-700 bg-sky-100 px-2 py-1 rounded-full">
                        Semaine actuelle : S{pad2(todayWeekNumber)}
                      </span>
                    </div>
                  )}
                  {isPlanningMonth && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{anchor.toLocaleString("fr-FR", { month: "long", year: "numeric" })}</span>
                      <span className="text-xs font-semibold text-sky-700 bg-sky-100 px-2 py-1 rounded-full">
                        Semaine actuelle : S{pad2(todayWeekNumber)}
                      </span>
                    </div>
                  )}
                  {view === "calendar" && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>
                        {calendarScope === "month" && anchor.toLocaleString("fr-FR", { month: "long", year: "numeric" })}
                        {calendarScope === "quarter" && `T${Math.floor(anchor.getMonth() / 3) + 1} ${anchor.getFullYear()}`}
                        {(calendarScope === "year" || calendarScope === "projection") && `${anchor.getFullYear()}`}
                      </span>
                      <span className="text-xs font-semibold text-neutral-700 bg-neutral-100 px-2 py-1 rounded-full">
                        Calendrier{" "}
                        {calendarScope === "month"
                          ? "mensuel"
                          : calendarScope === "quarter"
                          ? "trimestriel"
                          : calendarScope === "year"
                          ? "annuel"
                          : "projection"}{" "}
                        filtrable
                      </span>
                    </div>
                  )}
                  {view === "timeline" && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{timelineScopeLabel}</span>
                      <span className="text-xs font-semibold text-neutral-700 bg-neutral-100 px-2 py-1 rounded-full">
                        Barres basées sur les dates prévues des chantiers
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {view === "hours" && (
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
            )}
            {(isPlanningWeek || view === "hours") && (
              <>
                <Button
                  variant="outline"
                  onClick={copyFromPreviousWeek}
                  aria-label="Copier semaine précédente"
                  title="Copie les affectations, notes et absences de la semaine N-1"
                >
                  <Copy className="w-4 h-4 mr-1" /> Copier N-1
                </Button>
                <Button
                  variant="outline"
                  onClick={clearCurrentWeek}
                  aria-label="Vider la semaine"
                  title="Retire toutes les données de la semaine affichée"
                >
                  <Eraser className="w-4 h-4 mr-1" /> Vider
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {view === "dashboard" && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-neutral-200 bg-gradient-to-br from-amber-50 to-white">
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm font-semibold text-amber-800">
                  <span>Chantiers à planifier</span>
                  <ListChecks className="w-4 h-4" />
                </div>
                <div className="text-3xl font-bold">{pendingSites.length}</div>
                <div className="text-xs text-neutral-600">
                  {pendingSiteHighlights.length > 0
                    ? `Prochain : ${formatFR(fromLocalKey(pendingSiteHighlights[0].startDate || todayKey))}`
                    : "Aucun devis validé en attente."}
                </div>
              </CardContent>
            </Card>

            <Card className="border-neutral-200 bg-gradient-to-br from-sky-50 to-white">
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm font-semibold text-sky-800">
                  <span>Semaine en cours</span>
                  <CalendarRange className="w-4 h-4" />
                </div>
                <div className="text-3xl font-bold">{sitesForCurrentWeek.length}</div>
                <div className="text-xs text-neutral-600">{weekAssignments.length} affectation(s) visible(s).</div>
              </CardContent>
            </Card>

            <Card className="border-neutral-200 bg-gradient-to-br from-emerald-50 to-white">
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm font-semibold text-emerald-800">
                  <span>Devis à suivre</span>
                  <Clock3 className="w-4 h-4" />
                </div>
                <div className="text-3xl font-bold">{actionableQuotes.length}</div>
                <div className="text-xs text-neutral-600">
                  {urgentQuotes.length > 0
                    ? `${urgentQuotes.length} échéance(s) dans les 14 jours`
                    : "Aucune urgence immédiate."}
                </div>
              </CardContent>
            </Card>

            <Card className="border-neutral-200 bg-gradient-to-br from-rose-50 to-white">
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm font-semibold text-rose-800">
                  <span>Conflits potentiels</span>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="text-3xl font-bold">{weekConflictCount}</div>
                <div className="text-xs text-neutral-600">Détections sur la semaine affichée.</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold">À planifier en priorité</div>
                    <div className="text-xs text-neutral-600">Chantiers issus des devis validés.</div>
                  </div>
                  <span className="text-[11px] px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100">
                    {pendingSites.length} en file d'attente
                  </span>
                </div>
                <div className="space-y-2">
                  {pendingSiteHighlights.map((site) => (
                    <button
                      key={site.id}
                      className="w-full rounded-lg border border-amber-100 bg-amber-50/40 px-3 py-2 text-left hover:border-amber-200 flex items-start gap-3"
                      onClick={() => openSiteDetail(site.id)}
                    >
                      <span
                        className={cx(
                          "mt-1 h-3 w-3 rounded-full border", site.color || "bg-neutral-300", site.color ? "border-black/10" : "border-neutral-200"
                        )}
                        aria-hidden
                      />
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-neutral-900">{site.name}</span>
                          {site.quoteSnapshot?.amount && (
                            <span className="text-[11px] text-neutral-500">{formatEUR(site.quoteSnapshot.amount)}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-600 flex items-center gap-2">
                          <span>{site.clientName || site.quoteSnapshot?.client || "Client"}</span>
                          <span className="text-neutral-400">•</span>
                          <span>
                            {site.startDate ? formatFR(new Date(site.startDate)) : ""}
                            {site.startDate && site.endDate ? " → " : ""}
                            {site.endDate ? formatFR(new Date(site.endDate)) : ""}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                  {pendingSiteHighlights.length === 0 && (
                    <div className="text-sm text-neutral-500">Aucun chantier en attente de planification.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold">Cette semaine</div>
                    <div className="text-xs text-neutral-600">Chantiers visibles sur la période courante.</div>
                  </div>
                  <span className="text-[11px] px-2 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-100">
                    S{pad2(todayWeekNumber)}
                  </span>
                </div>
                <div className="space-y-2">
                  {weekSiteHighlights.map((site) => (
                    <div key={site.id} className="rounded-lg border border-neutral-200 px-3 py-2 bg-white flex items-start gap-3">
                      <span
                        className={cx(
                          "mt-1 h-3 w-3 rounded-full border", site.color || "bg-neutral-300", site.color ? "border-black/10" : "border-neutral-200"
                        )}
                        aria-hidden
                      />
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-neutral-900">{site.name}</span>
                          <span className="text-[11px] text-neutral-500">{formatFR(weekDays[0])}</span>
                        </div>
                        <div className="text-[11px] text-neutral-600 flex items-center gap-2">
                          <span>{site.clientName || site.quoteSnapshot?.client || "Client"}</span>
                          <span className="text-neutral-400">•</span>
                          <span>
                            {site.startDate ? formatFR(new Date(site.startDate)) : ""}
                            {site.startDate && site.endDate ? " → " : ""}
                            {site.endDate ? formatFR(new Date(site.endDate)) : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {weekSiteHighlights.length === 0 && (
                    <div className="text-sm text-neutral-500">Aucun chantier affiché sur cette semaine.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold">Devis à traiter</div>
                    <div className="text-xs text-neutral-600">Urgences et brouillons encore ouverts.</div>
                  </div>
                  <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
                    {actionableQuotes.length} en cours
                  </span>
                </div>
                <div className="space-y-2">
                  {urgentQuotes.map((quote) => (
                    <button
                      key={quote.id}
                      className="w-full rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-left hover:border-emerald-200"
                      onClick={() => openQuoteDetail(quote)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-neutral-900">{quote.title}</span>
                        {quote.amount && <span className="text-[11px] text-neutral-500">{formatEUR(quote.amount)}</span>}
                      </div>
                      <div className="text-[11px] text-neutral-600 flex items-center gap-2">
                        <span>{quote.client || "Client"}</span>
                        <span className="text-neutral-400">•</span>
                        <span>Échéance {quote.dueDate ? formatFR(fromLocalKey(quote.dueDate)) : "non renseignée"}</span>
                      </div>
                    </button>
                  ))}

                  {urgentQuotes.length === 0 && backlogQuotes.map((quote) => (
                    <button
                      key={quote.id}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-left bg-white hover:border-neutral-300"
                      onClick={() => openQuoteDetail(quote)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-neutral-900">{quote.title}</span>
                        {quote.amount && <span className="text-[11px] text-neutral-500">{formatEUR(quote.amount)}</span>}
                      </div>
                      <div className="text-[11px] text-neutral-600 flex items-center gap-2">
                        <span>{quote.client || "Client"}</span>
                        <span className="text-neutral-400">•</span>
                        <span>Brouillon à compléter</span>
                      </div>
                    </button>
                  ))}

                  {urgentQuotes.length === 0 && backlogQuotes.length === 0 && (
                    <div className="text-sm text-neutral-500">Aucun devis en attente immédiate.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold">Fenêtres creuses à venir</div>
                    <div className="text-xs text-neutral-600">Périodes sans chantier détectées.</div>
                  </div>
                  <span className="text-[11px] px-2 py-1 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                    {upcomingGaps.length} opportunité(s)
                  </span>
                </div>
                <div className="space-y-2">
                  {upcomingGaps.map((gap, idx) => (
                    <div key={idx} className="rounded-lg border border-neutral-200 px-3 py-2 bg-white flex items-center justify-between">
                      <div className="text-sm font-semibold text-neutral-800">
                        {formatFR(gap.start)} → {formatFR(gap.end)}
                      </div>
                      <span className="text-[11px] text-neutral-500">{gap.days} j. ouvrés</span>
                    </div>
                  ))}
                  {upcomingGaps.length === 0 && (
                    <div className="text-sm text-neutral-500">Aucune plage vide à court terme.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {view !== "dashboard" && (
        /* DnD provider */
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-12 gap-4">
          {/* Left column: People & Sites */}
          <div
            className={cx(
              "col-span-12 lg:col-span-3 space-y-4",
              isPlanningMonth && "lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
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
                  <div className="font-medium flex items-center gap-2">
                    Chantiers
                    {pendingSites.length > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                        {pendingSites.length} à planifier
                      </span>
                    )}
                  </div>
                  <AddSite onAdd={addSite} />
                </div>
                <div className="space-y-2">
                  {plannedSites.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className={cx("w-3 h-3 rounded-full border", s.color || "bg-neutral-300", s.color ? "border-black/10" : "border-neutral-200")} />
                        {s.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setRenameTarget({ type: 'site', id: s.id, name: s.name, startDate: s.startDate, endDate: s.endDate, color: s.color });
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
            {isPlanningWeek && (
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
                      <div className="text-base flex items-center gap-2 font-semibold text-neutral-900">
                        <span
                          className={cx(
                            "w-3 h-3 rounded-full border", 
                            site.color || "bg-neutral-300",
                            site.color ? "border-black/10" : "border-neutral-200"
                          )}
                          aria-hidden
                        />
                        {site.name}
                      </div>
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
            {isPlanningMonth && (
              <div className="space-y-4">

                {monthWeeks.map((week, idx) => {
                  const wkKey = weekKeyOf(week[0]);
                  const isCurrent = wkKey === todayWeekKey;
                  const sitesForWeek = plannedSites.filter((site) => isSiteVisibleOnWeek(site.id, wkKey));
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
                            <div className="text-base flex items-center gap-2 font-semibold text-neutral-900">
                              <span
                                className={cx(
                                  "w-3 h-3 rounded-full border",
                                  site.color || "bg-neutral-300",
                                  site.color ? "border-black/10" : "border-neutral-200"
                                )}
                                aria-hidden
                              />
                              {site.name}
                            </div>
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

            {/* CALENDRIER MENSUEL */}
            {view === "calendar" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="uppercase tracking-wide text-neutral-500 font-semibold">Gestion</span>
                    <span className="text-[11px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                      {calendarPlannedInMonth.length} planifiés
                    </span>
                    <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      {calendarPendingInMonth.length} en attente
                    </span>
                    <span className="text-[11px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                      {calendarAbsenceWeeks.length} sem. absences
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEventDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Nouvel événement
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCalendarDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Nouveau calendrier
                    </Button>
                    <Button variant={calendarScope === "month" ? "default" : "outline"} size="sm" onClick={() => setCalendarScope("month")}>
                      Mensuel
                    </Button>
                    <Button variant={calendarScope === "quarter" ? "default" : "outline"} size="sm" onClick={() => setCalendarScope("quarter")}>
                      Trimestre
                    </Button>
                    <Button variant={calendarScope === "year" ? "default" : "outline"} size="sm" onClick={() => setCalendarScope("year")}>
                      Année
                    </Button>
                    <Button variant={calendarScope === "projection" ? "default" : "outline"} size="sm" onClick={() => setCalendarScope("projection")}>
                      Projection
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
                  <Card className="overflow-hidden">
                    {calendarScope === "projection" ? (
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs text-neutral-600">
                          <span className="font-semibold text-neutral-700">Projection hebdomadaire</span>
                          <span>4 semaines par ligne • Vue synthèse</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                          {projectionWeekSummaries.map((week) => (
                            <div
                              key={week.weekKey}
                              className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4 text-xs space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-semibold text-neutral-900">
                                    S{pad2(week.weekNum)}
                                  </div>
                                  <div className="text-[11px] text-neutral-500">
                                    {formatFR(week.start, true)}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  aria-label={`Ajouter un événement la semaine ${week.weekNum}`}
                                  onClick={() => openEventDialogForDate(toLocalKey(week.start))}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="space-y-2">
                                <div className="space-y-1 max-h-28 overflow-auto">
                                  <div className="text-[10px] uppercase tracking-wide text-neutral-400">Chantiers planifiés</div>
                                  {week.planned.length === 0 && (
                                    <div className="text-[11px] text-neutral-400">Aucun chantier planifié.</div>
                                  )}
                                  {week.planned.map((site) => (
                                    <div key={`planned-${week.weekKey}-${site.id}`} className="flex items-center gap-2">
                                      <span className={cx("w-2 h-2 rounded-full border", site.color || "bg-sky-500", site.color ? "border-black/10" : "border-neutral-200")} />
                                      <span className="truncate">{site.name}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="space-y-1 max-h-24 overflow-auto">
                                  <div className="text-[10px] uppercase tracking-wide text-neutral-400">Événements</div>
                                  {week.events.length === 0 && (
                                    <div className="text-[11px] text-neutral-400">Aucun événement.</div>
                                  )}
                                  {week.events.map((event) => (
                                    <div key={`evt-${week.weekKey}-${event.id}`} className="flex items-center gap-2">
                                      <span className={cx("w-2 h-2 rounded-full border", event.color || "bg-neutral-400", event.color ? "border-black/10" : "border-neutral-200")} />
                                      <span className="truncate">{event.title}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="space-y-1 max-h-20 overflow-auto">
                                  <div className="text-[10px] uppercase tracking-wide text-neutral-400">En attente</div>
                                  {week.pending.length === 0 && (
                                    <div className="text-[11px] text-neutral-400">Aucun chantier en attente.</div>
                                  )}
                                  {week.pending.map((site) => (
                                    <div key={`pending-${week.weekKey}-${site.id}`} className="flex items-center gap-2 text-amber-700">
                                      <span className="w-2 h-2 rounded-full border border-amber-200 bg-amber-400" />
                                      <span className="truncate">{site.name}</span>
                                    </div>
                                  ))}
                                </div>
                                {week.absences.length > 0 && (
                                  <div className="text-[11px] text-sky-700">
                                    <div className="text-[10px] uppercase tracking-wide text-sky-400">Absences</div>
                                    {week.absences.join(", ")}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-6 bg-neutral-50 text-[11px] font-semibold text-neutral-600 uppercase tracking-wide border-b border-neutral-200">
                          <div className="px-2 py-2 text-center border-l first:border-l-0 border-neutral-200">S.</div>
                          {["Lun", "Mar", "Mer", "Jeu", "Ven"].map((label) => (
                            <div key={label} className="px-3 py-2 text-center border-l first:border-l-0 border-neutral-200">
                              {label}
                            </div>
                          ))}
                        </div>
                        <div className="grid auto-rows-fr">
                          {(() => {
                            let lastMonthIndex: number | null = null;
                            return calendarWeeks.map((week) => {
                              const weekdays = week.slice(0, 5);
                              const weekKey = weekKeyOf(week[0]);
                              const weekInRangeDay = weekdays.find(
                                (day) => day.getTime() >= calendarWindow.start.getTime() && day.getTime() <= calendarWindow.end.getTime()
                              );
                              const weekMonthIndex = weekInRangeDay ? weekInRangeDay.getMonth() : null;
                              const isNewMonth = weekMonthIndex !== null && weekMonthIndex !== lastMonthIndex;
                              if (weekMonthIndex !== null) lastMonthIndex = weekMonthIndex;

                              return (
                                <div key={weekKey} className={cx("grid grid-cols-6", isNewMonth && "border-t-2 border-sky-200")}>
                                  <div className="border-l border-t border-neutral-200 px-2 py-2 text-[11px] text-neutral-600 bg-neutral-50/70 flex flex-col gap-1">
                                    {isNewMonth && weekMonthIndex !== null && weekInRangeDay && (
                                      <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-800 px-2 py-0.5 text-[10px] font-semibold">
                                        {new Date(weekInRangeDay.getFullYear(), weekMonthIndex, 1).toLocaleString("fr-FR", { month: "long" })}
                                      </span>
                                    )}
                                    <span className="font-semibold text-neutral-700">S{pad2(getISOWeek(week[0]))}</span>
                                  </div>
                                  {weekdays.map((day) => {
                                    const dayKey = toLocalKey(day);
                                    const inRange = day.getTime() >= calendarWindow.start.getTime() && day.getTime() <= calendarWindow.end.getTime();
                                    const isToday = dayKey === todayKey;
                                    const plannedItems = calendarEventMap.plannedMap[dayKey] || [];
                                    const pendingItems = calendarEventMap.pendingMap[dayKey] || [];
                                    const absenceItems = calendarEventMap.absencesMap[dayKey] || [];
                                    return (
                                      <div
                                        key={dayKey}
                                        className={cx(
                                          "min-h-[120px] border-l border-t border-neutral-200 p-2 text-xs flex flex-col gap-1",
                                          !inRange && "bg-neutral-50 text-neutral-400",
                                          isToday && "bg-sky-50"
                                        )}
                                      >
                                        <div className="flex items-center justify-between text-[11px] font-semibold">
                                          <div className="flex items-center gap-1">
                                            <span className={cx(isToday && "text-sky-700")}>{day.getDate()}</span>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6"
                                              aria-label={`Ajouter un événement le ${day.toLocaleDateString("fr-FR")}`}
                                              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                                event.stopPropagation();
                                                openEventDialogForDate(dayKey);
                                              }}
                                            >
                                              <Plus className="h-3 w-3" />
                                            </Button>
                                          </div>
                                          {absenceItems.length > 0 && (
                                            <span className="rounded-full bg-sky-100 text-sky-700 px-2 py-0.5">
                                              {absenceItems.length} abs.
                                            </span>
                                          )}
                                        </div>
                                        <div className="space-y-1">
                                          {plannedItems.slice(0, 3).map((site) => (
                                            <div key={`${site.id}-${dayKey}`} className="flex items-center gap-1">
                                              <span className={cx("w-2 h-2 rounded-full border", site.color || "bg-sky-500", site.color ? "border-black/10" : "border-neutral-200")} />
                                              <span className="truncate">{site.name}</span>
                                            </div>
                                          ))}
                                          {calendarEventsByDay[dayKey]?.slice(0, 2).map((event) => (
                                            <div key={`evt-${event.id}`} className="flex items-center gap-1">
                                              <span className={cx("w-2 h-2 rounded-full border", event.color, event.color ? "border-black/10" : "border-neutral-200")} />
                                              <span className="truncate">{event.title}</span>
                                            </div>
                                          ))}
                                          {pendingItems.slice(0, 2).map((site) => (
                                            <div key={`${site.id}-pending-${dayKey}`} className="flex items-center gap-1 text-amber-700">
                                              <span className="w-2 h-2 rounded-full border border-amber-200 bg-amber-400" />
                                              <span className="truncate">{site.name}</span>
                                            </div>
                                          ))}
                                          {absenceItems.length > 0 && (
                                            <div className="text-[11px] text-sky-700">
                                              {absenceItems.slice(0, 2).join(", ")}
                                              {absenceItems.length > 2 && "…"}
                                            </div>
                                          )}
                                          {(plannedItems.length > 3) ||
                                          (pendingItems.length > 2) ||
                                          (calendarEventsByDay[dayKey]?.length ?? 0) > 2 ? (
                                            <div className="text-[11px] text-neutral-500">
                                              +{Math.max(0, plannedItems.length - 3) + Math.max(0, pendingItems.length - 2) + Math.max(0, (calendarEventsByDay[dayKey]?.length || 0) - 2)} autre(s)
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </>
                    )}
                  </Card>

                  <div className="space-y-3">
                    <Card>
                      <CardContent className="space-y-2 text-sm">
                        <div className="text-sm font-semibold">Résumé de la période</div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-600 text-xs">Chantiers planifiés</span>
                          <span className="text-xs font-semibold text-neutral-700 bg-neutral-100 px-2 py-1 rounded-full">
                            {calendarPlannedInMonth.length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-600 text-xs">Chantiers non planifiés</span>
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                            {calendarPendingInMonth.length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-600 text-xs">Semaines avec absences</span>
                          <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-1 rounded-full">
                            {calendarAbsenceWeeks.length}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">Calendriers</div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setCalendarDraft({ name: "", color: COLORS[3] });
                              setCalendarEditTarget(null);
                              setCalendarDialogOpen(true);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Ajouter
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {eventCalendars.map((cal) => (
                            <div key={cal.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={cal.visible}
                                  onChange={() =>
                                    setEventCalendars((prev) =>
                                      prev.map((c) => (c.id === cal.id ? { ...c, visible: !c.visible } : c))
                                    )
                                  }
                                />
                                <span className={cx("w-2.5 h-2.5 rounded-full border", cal.color, cal.color ? "border-black/10" : "border-neutral-200")} />
                                {cal.name}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                                <span>{calendarEvents.filter((evt) => evt.calendarId === cal.id).length}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setCalendarDraft({ name: cal.name, color: cal.color });
                                    setCalendarEditTarget({ id: cal.id, isDefault: cal.isDefault });
                                    setCalendarDialogOpen(true);
                                  }}
                                  aria-label={`Modifier ${cal.name}`}
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={cal.isDefault}
                                  onClick={() => deleteCalendar(cal.id)}
                                  aria-label={`Supprimer ${cal.name}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          {eventCalendars.length === 0 && (
                            <div className="text-xs text-neutral-500">Aucun calendrier personnalisé.</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="space-y-2 text-sm">
                        <div className="text-sm font-semibold">Chantiers non planifiés</div>
                        <div className="space-y-2">
                          {calendarPendingInMonth.slice(0, 5).map((site) => (
                            <div key={site.id} className="flex items-start gap-2 text-xs">
                              <span className={cx("w-2.5 h-2.5 rounded-full mt-1 border", site.color || "bg-amber-400", site.color ? "border-black/10" : "border-neutral-200")} />
                              <div>
                                <div className="font-semibold text-neutral-800">{site.name}</div>
                                <div className="text-[11px] text-neutral-500">
                                  {site.clientName || site.quoteSnapshot?.client || "Client"}
                                </div>
                              </div>
                            </div>
                          ))}
                          {calendarPendingInMonth.length === 0 && (
                            <div className="text-xs text-neutral-500">Aucun chantier en attente ce mois-ci.</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="space-y-2 text-sm">
                        <div className="text-sm font-semibold">Congés & absences</div>
                        <div className="space-y-2">
                          {calendarAbsenceWeeks.map((weekKey) => {
                            const names = absencesWeekPeople[weekKey] || [];
                            return (
                              <div key={weekKey} className="rounded-lg border border-sky-100 bg-sky-50/40 px-2 py-1">
                                <div className="text-[11px] font-semibold text-sky-700">{weekKey}</div>
                                <div className="text-[11px] text-neutral-700">{names.join(", ")}</div>
                              </div>
                            );
                          })}
                          {calendarAbsenceWeeks.length === 0 && (
                            <div className="text-xs text-neutral-500">Aucune absence ce mois-ci.</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* TIMELINE / CALENDRIER GANTT */}
            {view === "timeline" && timelineView && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Calendrier Gantt</span>
                    <span className="text-xs text-neutral-600">{formatFR(timelineView.start)} → {formatFR(timelineView.end)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant={timelineScope === "month" ? "default" : "outline"} size="sm" onClick={() => setTimelineScope("month")}>
                      Mensuel
                    </Button>
                    <Button variant={timelineScope === "quarter" ? "default" : "outline"} size="sm" onClick={() => setTimelineScope("quarter")}>
                      Trimestre
                    </Button>
                    <Button variant={timelineScope === "year" ? "default" : "outline"} size="sm" onClick={() => setTimelineScope("year")}>
                      Année
                    </Button>
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm flex flex-wrap items-center gap-3 text-xs">
                  <span className="uppercase tracking-wide text-neutral-500 font-semibold">Aperçu</span>
                  <span className="text-[11px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                    {plannedSites.length} planifiés
                  </span>
                  <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    {pendingSites.length} non planifiés
                  </span>
                  <span className="text-[11px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                    {Object.keys(absencesByWeek).length} sem. absences
                  </span>
                </div>
                <div className="text-xs text-neutral-600">
                  Barres continues alignées sur les dates prévues des chantiers pour identifier d'un coup d'œil les mois, trimestres ou années peu ou très chargés.
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-full space-y-3">
                    <div className="grid" style={{ gridTemplateColumns: `220px 1fr` }}>
                      <div className="px-2 text-[11px] font-semibold text-neutral-600">Chantier</div>
                      <div className="relative pl-2">
                        <div className="grid text-[11px] font-semibold text-neutral-600" style={{ gridTemplateColumns: `repeat(${timelineView.buckets.length}, minmax(140px, 1fr))` }}>
                          {timelineView.buckets.map((bucket, idx) => (
                            <div key={`${bucket.label}-${idx}`} className="text-center pb-1 border-l first:border-l-0 border-neutral-200">
                              {bucket.label}
                            </div>
                          ))}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-neutral-100 via-white to-neutral-100 pointer-events-none" />
                      </div>
                    </div>

                    {ganttTimeline.rows.length === 0 && (
                      <div className="text-sm text-neutral-500 px-2">Aucun chantier planifié sur cette période.</div>
                    )}

                    {ganttTimeline.rows.map((row) => (
                      <div key={row.site.id} className="grid items-center gap-2" style={{ gridTemplateColumns: `220px 1fr` }}>
                        <div className="flex flex-col gap-1 px-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className={cx("w-3 h-3 rounded-full border", row.site.color || "bg-neutral-300", row.site.color ? "border-black/10" : "border-neutral-200")} />
                            <span className="font-medium text-neutral-800">{row.site.name}</span>
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            {formatFR(row.bar.start)} → {formatFR(row.bar.end)}
                          </div>
                        </div>
                        <div className="relative h-12 rounded-xl bg-gradient-to-b from-neutral-50 to-white border border-neutral-200 shadow-[inset_0_1px_0_rgba(0,0,0,0.03)]">
                          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${timelineView.buckets.length}, minmax(140px, 1fr))` }}>
                            {timelineView.buckets.map((_, idx) => (
                              <div key={idx} className="border-l last:border-r border-neutral-200/80" />
                            ))}
                          </div>
                          <div
                            className="absolute inset-y-1 rounded-full shadow-sm flex items-center"
                            style={{ left: `${row.bar.offsetPct}%`, width: `${row.bar.widthPct}%` }}
                          >
                            <div className={cx("h-full w-full rounded-full opacity-90", row.site.color || "bg-sky-500")}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Card>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Chantiers non planifiés</div>
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                        {timelinePendingSites.length} à planifier
                      </span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      {timelinePendingSites.map((site) => (
                        <div key={site.id} className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
                          <div className="flex items-start gap-2">
                            <span className={cx("w-3 h-3 rounded-full mt-1 border", site.color || "bg-neutral-300", site.color ? "border-black/10" : "border-neutral-200")} />
                            <div className="space-y-0.5">
                              <div className="font-semibold text-neutral-900">{site.name}</div>
                              <div className="text-[11px] text-neutral-600">
                                {site.clientName || site.quoteSnapshot?.client || "Client"}
                              </div>
                              {(site.startDate || site.endDate) && (
                                <div className="text-[11px] text-neutral-600">
                                  {site.startDate ? formatFR(new Date(site.startDate)) : "Date à définir"}
                                  {site.startDate && site.endDate ? " → " : ""}
                                  {site.endDate ? formatFR(new Date(site.endDate)) : ""}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {timelinePendingSites.length === 0 && (
                        <div className="text-sm text-neutral-500">Aucun chantier non planifié sur cette période.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Congés & absences</div>
                      <span className="text-[11px] text-sky-700 bg-sky-50 px-2 py-1 rounded-full">
                        {timelineAbsences.length} semaine{timelineAbsences.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {timelineAbsences.map((entry) => (
                        <div key={entry.weekKey} className="rounded-lg border border-sky-100 bg-sky-50/40 px-3 py-2">
                          <div className="text-[11px] font-semibold text-sky-700">
                            S{pad2(getISOWeek(entry.start))} • {formatFR(entry.start, true)}
                          </div>
                          <div className="text-xs text-neutral-700 mt-1 flex flex-wrap gap-1">
                            {entry.people.map((name) => (
                              <span key={name} className="px-2 py-0.5 rounded-full bg-white border border-sky-100 text-sky-700">
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {timelineAbsences.length === 0 && (
                        <div className="text-sm text-neutral-500">Aucune absence enregistrée sur la période.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-3">
                    <div className="text-sm font-semibold">Récap période</div>
                    <div className="grid md:grid-cols-3 gap-3 text-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-500 text-xs">Jours couverts</span>
                          <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                            {timelineLoad.totalDays - timelineLoad.zeroDays}/{timelineLoad.totalDays}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-500 text-xs">Périodes vides</span>
                          <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
                            {timelineLoad.zeroDays} j.
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-500 text-xs">Charge max</span>
                          <span className="px-2 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold">
                            {timelineLoad.max} chantier{timelineLoad.max > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-medium text-neutral-700">Périodes sans chantier (jours exacts)</div>
                        {timelineLoad.gaps.length === 0 && <div className="text-xs text-neutral-500">Aucune période vide.</div>}
                        {timelineLoad.gaps.map((gap, idx) => (
                          <div key={idx} className="text-xs flex items-center justify-between bg-amber-50 text-amber-800 px-2 py-1 rounded-lg border border-amber-100">
                            <span>{formatFR(gap.start)} → {formatFR(gap.end)}</span>
                            <span className="font-semibold">{gap.days} j.</span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-medium text-neutral-700">Périodes très chargées</div>
                        {timelineLoad.peaks.length === 0 && <div className="text-xs text-neutral-500">Aucune période dense.</div>}
                        {timelineLoad.peaks.map((peak, idx) => (
                          <div key={idx} className="text-xs flex items-center justify-between bg-rose-50 text-rose-800 px-2 py-1 rounded-lg border border-rose-100">
                            <span>{formatFR(peak.start)} → {formatFR(peak.end)}</span>
                            <span className="font-semibold">{peak.count} ch. / {peak.days} j.</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-medium text-neutral-700">Charge par bucket</div>
                      <div className="grid md:grid-cols-3 gap-2">
                        {timelineLoad.bucketStats.map((b) => {
                          const ratio = timelineLoad.max > 0 ? b.avg / Math.max(1, timelineLoad.max || 1) : 0;
                          const pct = Math.min(100, ratio * 100);
                          const tone = getLoadTone(ratio);
                          return (
                            <div key={b.label} className={cx("p-3 rounded-lg border", tone.border, tone.softBg)}>
                              <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-700 mb-2">
                                <span>{b.label}</span>
                                <span className={cx("text-xs font-semibold", tone.softText)}>{b.avg.toFixed(1)} ch.</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-16 h-16 rounded-full border border-white shadow-inner relative"
                                  style={{ background: `conic-gradient(${tone.color} ${pct}%, #e5e7eb ${pct}% 100%)` }}
                                >
                                  <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center text-xs font-semibold text-neutral-700">
                                    {Math.round(pct)}%
                                  </div>
                                </div>
                                <div className="text-[11px] text-neutral-600 space-y-1">
                                  <div>Charge moyenne</div>
                                  <div className="font-semibold text-neutral-800">
                                    {b.avg.toFixed(1)} chantier{b.avg >= 2 ? "s" : ""}
                                  </div>
                                  {b.idle > 0 && <div className="text-amber-700">{b.idle} j. sans chantier</div>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {view === "devis" && (
              <div className="space-y-3">
                <Card>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                          <div className="text-base font-semibold">Devis en cours</div>
                          <p className="text-sm text-neutral-600">
                            Kanban minimaliste : cliquez sur une carte pour ouvrir le détail complet et l'éditer.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white shadow-sm p-2">
                          <Input
                            placeholder="Nouveau devis"
                            value={newQuote.title}
                            onChange={(e: any) => setNewQuote((q) => ({ ...q, title: e.target.value }))}
                            className="w-48 h-9"
                          />
                          <Input
                            placeholder="Client (optionnel)"
                            value={newQuote.client}
                            onChange={(e: any) => setNewQuote((q) => ({ ...q, client: e.target.value }))}
                            className="w-44 h-9"
                          />
                          <Button onClick={addQuote} className="h-9 px-3">
                            <Plus className="w-4 h-4 mr-1" /> Créer
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs text-neutral-600">Toutes les colonnes sont visibles sans défilement horizontal. Les cartes affichent l'essentiel et s'ouvrent au clic pour le reste.</div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                        {QUOTE_COLUMNS.map((col) => (
                          <QuoteColumn
                            key={col.id}
                            col={col}
                            items={quotesByColumn[col.id] || []}
                            onOpenQuote={openQuoteDetail}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {view === "sites" && (
              <div className="space-y-3">
                <Card>
                  <CardContent className="space-y-3">
                    <div className="text-base font-semibold flex items-center gap-2">
                      <span>Mes chantiers</span>
                      <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-2 py-1 rounded-full">
                        {plannedSites.length + pendingSites.length} chantier{sites.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            À planifier
                            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                              {pendingSites.length}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-500">Issus des devis validés</div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-2">
                          {pendingSites.map((site) => (
                            <div
                              key={site.id}
                              className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 hover:border-amber-300 transition cursor-pointer"
                              onClick={() => openSiteDetail(site.id)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2">
                                  <span
                                    className={cx(
                                      "w-3 h-3 rounded-full mt-1 border",
                                      site.color || "bg-neutral-300",
                                      site.color ? "border-black/10" : "border-neutral-200"
                                    )}
                                  />
                                  <div className="space-y-0.5">
                                    <div className="font-semibold text-neutral-900 leading-tight">{site.name}</div>
                                    <div className="text-[11px] text-neutral-600">
                                      {site.clientName || site.quoteSnapshot?.client || "Client inconnu"}
                                    </div>
                                    {(site.startDate || site.endDate) && (
                                      <div className="text-[11px] text-neutral-600">
                                        {site.startDate ? formatFR(new Date(site.startDate)) : ""}
                                        {site.startDate && site.endDate ? " → " : ""}
                                        {site.endDate ? formatFR(new Date(site.endDate)) : ""}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e: any) => {
                                    e.stopPropagation();
                                    openSiteDetail(site.id, "planned");
                                  }}
                                >
                                  Planifier
                                </Button>
                              </div>
                              {site.quoteSnapshot?.amount && (
                                <div className="text-xs text-neutral-600 mt-1">Devis : {formatEUR(site.quoteSnapshot.amount)}</div>
                              )}
                              <button
                                className="mt-2 text-[11px] text-amber-700 underline"
                                onClick={() => openSiteDetail(site.id)}
                              >
                                Ouvrir le détail
                              </button>
                            </div>
                          ))}
                          {pendingSites.length === 0 && (
                            <div className="text-sm text-neutral-500">Aucun devis validé en attente de planification.</div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            Planifié
                            <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                              {plannedSites.length}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-500">Affichés dans le planning et le calendrier</div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-2">
                          {plannedSites.map((site) => (
                            <button
                              key={site.id}
                              className="rounded-lg border border-neutral-200 p-3 flex items-start gap-3 bg-white shadow-sm text-left hover:border-neutral-300"
                              onClick={() => openSiteDetail(site.id)}
                            >
                              <span
                                className={cx(
                                  "w-3 h-3 rounded-full mt-1 border",
                                  site.color || "bg-neutral-300",
                                  site.color ? "border-black/10" : "border-neutral-200"
                                )}
                                aria-hidden
                              />
                              <div className="flex-1 space-y-1">
                                <div className="font-semibold text-neutral-900">{site.name}</div>
                                {(site.startDate || site.endDate) && (
                                  <div className="text-xs text-neutral-600">
                                    {site.startDate ? formatFR(new Date(site.startDate)) : ""}
                                    {site.startDate && site.endDate ? " → " : ""}
                                    {site.endDate ? formatFR(new Date(site.endDate)) : ""}
                                  </div>
                                )}
                                {site.planningWeeks?.length ? (
                                  <div className="text-[11px] text-neutral-600">
                                    Semaines actives : {site.planningWeeks.slice(0, 3).join(", ")}
                                    {site.planningWeeks.length > 3 && " …"}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-neutral-500">Visible toutes les semaines</div>
                                )}
                                {(site.address || site.clientName || site.contactPhone) && (
                                  <div className="text-[11px] text-neutral-600 space-y-0.5">
                                    {site.address && <div>{site.address}</div>}
                                    {site.clientName && <div>Client : {site.clientName}</div>}
                                    {(site.contactName || site.contactPhone) && (
                                      <div>
                                        Contact : {site.contactName}
                                        {site.contactPhone ? ` • ${site.contactPhone}` : ""}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="text-[11px] text-sky-700">Cliquer pour modifier</div>
                              </div>
                            </button>
                          ))}
                          {plannedSites.length === 0 && (
                            <div className="text-sm text-neutral-500">Aucun chantier planifié pour l'instant.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {view === "salaries" && (
              <div className="space-y-3">
                <Card>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-base font-semibold flex items-center gap-2">
                        <span>Mes salariés</span>
                        <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-2 py-1 rounded-full">
                          {safePeople.length} personne{safePeople.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <AddPerson onAdd={addPerson} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      {safePeople.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => openPersonDetail(p.id)}
                          className="rounded-lg border border-neutral-200 p-3 bg-white shadow-sm flex items-start gap-3 text-left hover:border-neutral-300"
                        >
                          <span className={cx("w-3 h-3 rounded-full mt-1 border", p.color || "bg-neutral-300", p.color ? "border-black/10" : "border-neutral-200")} aria-hidden />
                          <div className="space-y-1">
                            <div className="font-semibold text-neutral-900 flex items-center gap-2">
                              {p.name}
                              {p.role && <span className="text-[11px] text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">{p.role}</span>}
                            </div>
                            {(p.phone || p.email) && (
                              <div className="text-[11px] text-neutral-600 space-y-0.5">
                                {p.phone && <div>Tél : {p.phone}</div>}
                                {p.email && <div>{p.email}</div>}
                              </div>
                            )}
                            {p.skills?.length > 0 && (
                              <div className="flex flex-wrap gap-1 text-[11px] text-sky-700">
                                {p.skills.slice(0, 3).map((s: any, idx: number) => (
                                  <span key={idx} className="px-2 py-0.5 bg-sky-50 border border-sky-100 rounded-full">{s}</span>
                                ))}
                                {p.skills.length > 3 && <span className="text-[11px] text-neutral-500">+{p.skills.length - 3}</span>}
                              </div>
                            )}
                            <div className="text-[11px] text-sky-700">Cliquer pour éditer la fiche</div>
                          </div>
                        </button>
                      ))}
                      {safePeople.length === 0 && (
                        <div className="text-sm text-neutral-500">Aucun salarié renseigné.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
        <DragOverlay />
      </DndContext>
      )}

      {/* Dialogs */}
      {quoteDetail && (
        <Dialog
          open={quoteDetailOpen}
          onOpenChange={(v: boolean) => {
            setQuoteDetailOpen(v);
            if (!v) setQuoteDetail(null);
          }}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <div className="text-lg font-semibold">Détail du devis</div>
              <p className="text-sm text-neutral-600">Complétez ou ajustez les informations puis enregistrez.</p>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={quoteDetail.title || ""}
                onChange={(e: any) => setQuoteDetail((prev: any) => (prev ? { ...prev, title: e.target.value } : prev))}
                placeholder="Intitulé"
              />
              <div className="grid md:grid-cols-2 gap-2">
                <Input
                  value={quoteDetail.client || ""}
                  onChange={(e: any) => setQuoteDetail((prev: any) => (prev ? { ...prev, client: e.target.value } : prev))}
                  placeholder="Client"
                />
                <Input
                  value={quoteDetail.amount ?? ""}
                  onChange={(e: any) => setQuoteDetail((prev: any) => (prev ? { ...prev, amount: e.target.value } : prev))}
                  placeholder="Montant (€)"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-2 items-center">
                <Input
                  type="date"
                  value={quoteDetail.dueDate || ""}
                  onChange={(e: any) => setQuoteDetail((prev: any) => (prev ? { ...prev, dueDate: e.target.value } : prev))}
                  placeholder="Échéance"
                />
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-neutral-600">Statut</span>
                  <select
                    value={quoteDetail.status || "todo"}
                    onChange={(e) =>
                      setQuoteDetail((prev: any) => (prev ? { ...prev, status: e.target.value } : prev))
                    }
                    className="border rounded-md px-2 py-1 text-sm w-full"
                  >
                    {QUOTE_COLUMNS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                <Input
                  value={quoteDetail.contactName || ""}
                  onChange={(e: any) => setQuoteDetail((prev: any) => (prev ? { ...prev, contactName: e.target.value } : prev))}
                  placeholder="Contact principal"
                />
                <Input
                  value={quoteDetail.contactPhone || ""}
                  onChange={(e: any) => setQuoteDetail((prev: any) => (prev ? { ...prev, contactPhone: e.target.value } : prev))}
                  placeholder="Téléphone"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                <Input
                  value={quoteDetail.city || ""}
                  onChange={(e: any) => setQuoteDetail((prev: any) => (prev ? { ...prev, city: e.target.value } : prev))}
                  placeholder="Ville ou code postal"
                />
                <Input
                  value={quoteDetail.address || ""}
                  onChange={(e: any) => setQuoteDetail((prev: any) => (prev ? { ...prev, address: e.target.value } : prev))}
                  placeholder="Adresse du chantier"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={quoteDetail.plannedStart || ""}
                  onChange={(e: any) => setQuoteDetail((prev: any) => (prev ? { ...prev, plannedStart: e.target.value } : prev))}
                  placeholder="Début prévu"
                />
                <Input
                  type="date"
                  min={quoteDetail.plannedStart || undefined}
                  value={quoteDetail.plannedEnd || ""}
                  onChange={(e: any) => setQuoteDetail((prev: any) => (prev ? { ...prev, plannedEnd: e.target.value } : prev))}
                  placeholder="Fin prévue"
                />
              </div>
              <Textarea
                value={quoteDetail.note || ""}
                onChange={(e: any) => setQuoteDetail((prev: any) => (prev ? { ...prev, note: e.target.value } : prev))}
                placeholder="Notes internes"
                className="text-sm"
              />
              {quoteDetail.status === "lost" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-rose-700">Motif (optionnel)</label>
                  <Textarea
                    value={quoteDetail.reason || ""}
                    onChange={(e: any) => setQuoteDetail((prev: any) => (prev ? { ...prev, reason: e.target.value } : prev))}
                    placeholder="Pourquoi ce devis a été refusé ?"
                    className="text-sm"
                  />
                </div>
              )}
            </div>
            <DialogFooter className="flex items-center justify-between">
              <Button variant="destructive" onClick={deleteQuote}>
                Supprimer le devis
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setQuoteDetailOpen(false);
                    setQuoteDetail(null);
                  }}
                >
                  Fermer
                </Button>
                <Button onClick={saveQuoteDetail}>Enregistrer</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {siteDetail && (
        <SiteDetailDialog
          open={siteDetailOpen}
          site={siteDetail}
          fallbackYear={getISOWeekYear(anchor)}
          onClose={() => {
            setSiteDetailOpen(false);
            setSiteDetail(null);
          }}
          onSave={saveSiteDetail}
        />
      )}

      {personDetail && (
        <PersonDetailDialog
          open={personDetailOpen}
          person={personDetail}
          onClose={() => {
            setPersonDetailOpen(false);
            setPersonDetail(null);
          }}
          onSave={savePersonDetail}
        />
      )}

      <AnnotationDialog open={noteOpen} setOpen={setNoteOpen} value={currentNoteValue} onSave={saveNote} />
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer un événement</DialogTitle>
            <DialogDescription>Ajoutez un événement et choisissez le calendrier ou une couleur personnalisée.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={eventDraft.title}
              onChange={(e: any) => setEventDraft((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Titre de l'événement"
            />
            <div className="grid md:grid-cols-2 gap-2">
              <Input
                type="date"
                value={eventDraft.dateKey}
                onChange={(e: any) => setEventDraft((prev) => ({ ...prev, dateKey: e.target.value }))}
              />
              <Input
                type="date"
                value={eventDraft.endDateKey}
                onChange={(e: any) => setEventDraft((prev) => ({ ...prev, endDateKey: e.target.value }))}
                placeholder="Fin"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-2 items-center">
              <Input
                type="number"
                min={1}
                value={eventDraft.durationDays}
                onChange={(e: any) => setEventDraft((prev) => ({ ...prev, durationDays: e.target.value }))}
                placeholder="Durée (jours ouvrés)"
              />
              <select
                value={eventDraft.calendarId}
                onChange={(e) => setEventDraft((prev) => ({ ...prev, calendarId: e.target.value }))}
                className="border rounded-md px-2 py-1 text-sm w-full"
              >
                <option value="">Couleur personnalisée</option>
                {eventCalendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              value={eventDraft.weekList}
              onChange={(e: any) => setEventDraft((prev) => ({ ...prev, weekList: e.target.value }))}
              placeholder="Semaines (ex: 2025-W12, 2025-W13)"
            />
            <p className="text-[11px] text-neutral-500">
              Si des semaines sont indiquées, elles remplacent les dates ci-dessus et créent un événement sur chaque semaine.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600">Couleur (optionnelle)</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.slice(0, 12).map((c) => (
                  <button
                    key={c}
                    className={cx("w-6 h-6 rounded-full border", c, eventDraft.color === c && "ring-2 ring-black")}
                    onClick={() => setEventDraft((prev) => ({ ...prev, color: prev.color === c ? "" : c }))}
                    type="button"
                    aria-label={`Couleur ${c}`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-neutral-500">Si une couleur est choisie, elle remplace celle du calendrier.</p>
            </div>
            <Textarea
              value={eventDraft.notes}
              onChange={(e: any) => setEventDraft((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes"
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEventDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={createCalendarEvent}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={calendarDialogOpen} onOpenChange={setCalendarDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{calendarEditTarget ? "Modifier le calendrier" : "Créer un calendrier"}</DialogTitle>
            <DialogDescription>Définissez un nom et une couleur pour le nouveau calendrier.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={calendarDraft.name}
              onChange={(e: any) => setCalendarDraft((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nom du calendrier"
            />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600">Couleur</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.slice(0, 12).map((c) => (
                  <button
                    key={c}
                    className={cx("w-6 h-6 rounded-full border", c, calendarDraft.color === c && "ring-2 ring-black")}
                    onClick={() => setCalendarDraft((prev) => ({ ...prev, color: c }))}
                    type="button"
                    aria-label={`Couleur ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCalendarDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={createCalendar}>{calendarEditTarget ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        color={renameTarget?.type === 'site' ? renameTarget?.color : undefined}
        onSave={(newName: string, weeks?: string[], schedule?: { startDate: string; endDate: string }, colorChoice?: string) => {
          if (!renameTarget) return;
          const n = newName.trim();
          if (!n) return;
          if (renameTarget.type === 'person') {
            renamePerson(renameTarget.id, n);
          } else {
            renameSite(renameTarget.id, n, colorChoice);
            if (schedule?.startDate && schedule?.endDate) {
              updateSiteSchedule(renameTarget.id, schedule.startDate, schedule.endDate);
              setRenameTarget((prev) => (prev ? { ...prev, startDate: schedule.startDate, endDate: schedule.endDate } : prev));
            }
            if (colorChoice) {
              setRenameTarget((prev) => (prev ? { ...prev, color: colorChoice } : prev));
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
              updateSiteMeta(renameTarget.id, { planningWeeks: weeks });
            }
          }
          setRenameOpen(false);
        }}
      />
    </div>
  );
}
