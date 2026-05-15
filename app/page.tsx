"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
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
  Archive,
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
  Home,
  ListChecks,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

// ================= Modules extraits
import {
  COLORS,
  SITE_COLORS,
  PASTELS,
  DEFAULT_EVENT_CALENDARS,
  QUOTE_COLUMNS,
  QUOTE_TONES,
  EVENT_TYPES,
  EVENT_CELL_STYLE,
  ABSENCE_TYPES,
  ABSENCE_COLORS,
  ABSENCE_LABELS,
  ABSENCE_BADGE,
  COLOR_HEX,
} from "../lib/planner/constants";
import type { EventType, AbsenceType } from "../lib/planner/constants";
import {
  cx,
  pad2,
  toLocalKey,
  startOfISOWeekLocal,
  getWeekDatesLocal,
  getISOWeekAndYear,
  getISOWeek,
  getISOWeekYear,
  weekKeyOf,
  getISOWeeksInYear,
  getISOWeekStart,
  parseWeekKey,
  getWeekRangeFromKeys,
  getMonthWeeks,
  startOfMonthLocal,
  endOfMonthLocal,
  startOfQuarterLocal,
  endOfQuarterLocal,
  startOfYearLocal,
  endOfYearLocal,
  getEasterDate,
  getFrenchHolidays,
  getFrenchHolidaysWithBridges,
  normalizePersonRecord,
  normalizeSiteRecord,
  ORIGINE_OPTIONS,
  normalizeQuoteRecord,
  normalizeTenderRecord,
  normalizeClientRecord,
  isDateWithin,
  cellKey,
  mapWeekDates,
  fromLocalKey,
  hashString,
  parseWeekList,
  getSiteDateRange,
  formatWeeksSummary,
  getQuoteWeekRange,
  toArray,
  ensureId,
  formatFR,
  formatEUR,
  getPortion,
  debounce,
} from "../lib/planner/helpers";
import {
  Button,
  Card,
  CardContent,
  Input,
  Textarea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsCtx,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  ColorPicker,
} from "../components/planner/ui";
import { PersonChip, AssignmentChip } from "../components/planner/chips";
import { DayCell, HoursCell } from "../components/planner/cells";

const todayKey = toLocalKey(new Date());
const nextMonthKey = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return toLocalKey(d);
})();

const DEMO_PEOPLE: ReturnType<typeof normalizePersonRecord>[] = [];
const DEMO_SITES = [
  { id: "s-pezenas",    name: "PÉZENAS — St Jean",               startDate: "2026-04-27", endDate: "2026-07-17", planningWeeks: ["2026-W18","2026-W19","2026-W28","2026-W29"], status: "planned" },
  { id: "s-belmonte",   name: "BELMONTE — Fenêtres",             startDate: "2026-04-27", endDate: "2026-05-01", planningWeeks: ["2026-W18"], status: "planned" },
  { id: "s-merlin",     name: "MERLIN — Boirargues cuisine",     startDate: "2026-05-04", endDate: "2026-05-08", planningWeeks: ["2026-W19"], status: "planned" },
  { id: "s-ortin",      name: "ORTIN — Mauguio",                 startDate: "2026-05-04", endDate: "2026-05-08", planningWeeks: ["2026-W19"], status: "planned" },
  { id: "s-colonna",    name: "COLONNA — Ballaruc",              startDate: "2026-05-04", endDate: "2026-05-08", planningWeeks: ["2026-W19"], status: "planned" },
  { id: "s-anata",      name: "ANATA — Porte Fac St Pierre",     startDate: "2026-05-04", endDate: "2026-05-08", planningWeeks: ["2026-W19"], status: "planned" },
  { id: "s-mireval",    name: "MIREVAL — Mauguio",               startDate: "2026-05-04", endDate: "2026-05-08", planningWeeks: ["2026-W19"], status: "planned" },
  { id: "s-chateau",    name: "CHÂTEAU — Montferrier",           startDate: "2026-05-11", endDate: "2026-05-22", planningWeeks: ["2026-W20","2026-W21"], status: "planned" },
  { id: "s-perez",      name: "PEREZ — Carna",                   startDate: "2026-05-11", endDate: "2026-06-19", planningWeeks: ["2026-W20","2026-W21","2026-W24","2026-W25"], status: "planned" },
  { id: "s-beauvallet", name: "BEAUVALLET — Esc. Mauguio",       startDate: "2026-05-11", endDate: "2026-05-15", planningWeeks: ["2026-W20"], status: "planned" },
  { id: "s-optimwatt",  name: "OPTIMWATT — Guilhem",             startDate: "2026-05-11", endDate: "2026-05-15", planningWeeks: ["2026-W20"], status: "planned" },
  { id: "s-portail",    name: "PORTAIL — Grau du Roi",           startDate: "2026-05-11", endDate: "2026-05-15", planningWeeks: ["2026-W20"], status: "planned" },
  { id: "s-vauvert",    name: "VAUVERT",                         startDate: "2026-05-11", endDate: "2026-06-05", planningWeeks: ["2026-W20","2026-W21","2026-W23"], status: "planned" },
  { id: "s-picard",     name: "PICARD — Bureau",                 startDate: "2026-05-18", endDate: "2026-05-22", planningWeeks: ["2026-W21"], status: "planned" },
  { id: "s-thevenot",   name: "THEVENOT — Sinistre Mauguio",     startDate: "2026-05-18", endDate: "2026-05-22", planningWeeks: ["2026-W21"], status: "planned" },
  { id: "s-ducrot",     name: "DUCROT — Atelier persiennes",     startDate: "2026-05-18", endDate: "2026-05-22", planningWeeks: ["2026-W21"], status: "planned" },
  { id: "s-insee",      name: "INSEE",                           startDate: "2026-05-25", endDate: "2026-07-24", planningWeeks: ["2026-W22","2026-W23","2026-W27","2026-W29","2026-W30"], status: "planned" },
  { id: "s-pontrouge",  name: "PONT ROUGE — Store & TV",         startDate: "2026-06-01", endDate: "2026-06-05", planningWeeks: ["2026-W23"], status: "planned" },
  { id: "s-suau",       name: "SUAU RODENAS — Pergolas",         startDate: "2026-06-01", endDate: "2026-06-05", planningWeeks: ["2026-W23"], status: "planned" },
  { id: "s-gpa",        name: "GPA — Castelnaudary",             startDate: "2026-06-08", endDate: "2026-06-12", planningWeeks: ["2026-W24"], status: "planned" },
  { id: "s-thievet-mau",name: "THIEVET — Mauguio",               startDate: "2026-06-08", endDate: "2026-06-12", planningWeeks: ["2026-W24"], status: "planned" },
  { id: "s-cnrs-cefe",  name: "CNRS CEFE — Salle convivialité",  startDate: "2026-06-08", endDate: "2026-06-12", planningWeeks: ["2026-W24"], status: "planned" },
  { id: "s-cnrs-bureau",name: "CNRS — Bureau Resto",             startDate: "2026-06-08", endDate: "2026-06-12", planningWeeks: ["2026-W24"], status: "planned" },
  { id: "s-laverune",   name: "LAVERUNE — Métiers du fer",       startDate: "2026-06-08", endDate: "2026-06-12", planningWeeks: ["2026-W24"], status: "planned" },
  { id: "s-eglise",     name: "ÉGLISE DON BOSCO",                startDate: "2026-06-15", endDate: "2026-06-19", planningWeeks: ["2026-W25"], status: "planned" },
  { id: "s-stdrezery",  name: "ST DRÉZÉRY — Extension",          startDate: "2026-06-15", endDate: "2026-08-14", planningWeeks: ["2026-W25","2026-W26","2026-W27","2026-W32","2026-W33"], status: "planned" },
  { id: "s-thievet-stb",name: "THIEVET — St Briès",              startDate: "2026-06-22", endDate: "2026-06-26", planningWeeks: ["2026-W26"], status: "planned" },
  { id: "s-faculte",    name: "FACULTÉ — B2 R+4",                startDate: "2026-07-06", endDate: "2026-07-10", planningWeeks: ["2026-W28"], status: "planned" },
  { id: "s-fda",        name: "FD/\\ — Bâtiments",               startDate: "2026-07-20", endDate: "2026-08-21", planningWeeks: ["2026-W30","2026-W32","2026-W34"], status: "planned" },
  { id: "s-quinson",    name: "QUINSON — Mauguio",               startDate: "2026-09-07", endDate: "2026-09-11", planningWeeks: ["2026-W37"], status: "planned" },
  { id: "s-cnrs-labo",  name: "CNRS — Labo Expanim",             startDate: "2026-09-14", endDate: "2026-09-18", planningWeeks: ["2026-W38"], status: "planned" },
  { id: "s-arterio",    name: "ARTERIO — Pierres Blanches",      startDate: "2026-09-14", endDate: "2026-09-18", planningWeeks: ["2026-W38"], status: "planned" },
  { id: "s-jacou",      name: "JACOU — École PAUTES",            startDate: "2026-11-02", endDate: "2026-11-06", planningWeeks: ["2026-W45"], status: "planned" },
  { id: "s-surho",      name: "SURHO — Deschodt",                startDate: "2026-11-16", endDate: "2026-11-20", planningWeeks: ["2026-W47"], status: "planned" },
  { id: "s-buzignargues",name: "BUZIGNARGUES",                   startDate: "2026-11-23", endDate: "2026-11-27", planningWeeks: ["2026-W48"], status: "planned" },
  { id: "s-aof",        name: "AOF — Haute Plage",               startDate: "2026-12-21", endDate: "2026-12-25", planningWeeks: ["2026-W52"], status: "planned" },
];
// (DEFAULT_EVENT_CALENDARS, QUOTE_COLUMNS, QUOTE_TONES imported from lib/planner/constants)
const DEMO_QUOTES: any[] = [];

// ==================================
// Seed équipe + planning S21/S22 (one-shot par semaine via flag)
// ==================================
const ROSTER_SEED_FLAG = "rosterPlanningSeed_v1";

const SEED_PEOPLE_V1 = [
  { id: "p-guillaume", name: "GUILLAUME", color: "bg-slate-700",  role: "" },
  { id: "p-tao",       name: "TAO",       color: "bg-orange-500", role: "" },
  { id: "p-joan",      name: "JOAN",      color: "bg-sky-500",    role: "" },
  { id: "p-yann",      name: "YANN",      color: "bg-pink-500",   role: "" },
  { id: "p-michel",    name: "MICHEL",    color: "bg-green-500",  role: "" },
  { id: "p-chachou",   name: "CHACHOU",   color: "bg-teal-500",   role: "" },
  { id: "p-charlie",   name: "CHARLIE",   color: "bg-blue-700",   role: "" },
  { id: "p-jlou",      name: "JLOU",      color: "bg-violet-500", role: "" },
];

const SEED_SITE_ADDITIONS_V1 = [
  { id: "s-emaus",   name: "EMAÜS",              startDate: "2026-05-25", endDate: "2026-05-29", planningWeeks: ["2026-W22"],            status: "planned" },
  { id: "s-carnon",  name: "CARNON",             startDate: "2026-05-18", endDate: "2026-05-29", planningWeeks: ["2026-W21","2026-W22"], status: "planned" },
  { id: "s-crech",   name: "C RECH",             startDate: "2026-05-25", endDate: "2026-05-29", planningWeeks: ["2026-W22"],            status: "planned" },
  { id: "s-atelier", name: "Atelier",            startDate: "2026-05-18", endDate: "2026-05-29", planningWeeks: ["2026-W21","2026-W22"], status: "planned" },
  { id: "s-ghien",   name: "GHIEN — St Clément", startDate: "2026-05-18", endDate: "2026-05-22", planningWeeks: ["2026-W21"],            status: "planned" },
];

const SEED_SITE_WEEK_PATCHES_V1: Record<string, string[]> = {
  "s-merlin":     ["2026-W22"],
  "s-ortin":      ["2026-W22"],
  "s-mireval":    ["2026-W21","2026-W22"],
  "s-colonna":    ["2026-W22"],
  "s-belmonte":   ["2026-W22"],
  "s-beauvallet": ["2026-W21"],
  "s-chateau":    ["2026-W22"],
  "s-vauvert":    ["2026-W22"],
};

const SEED_ASSIGNMENTS_BY_WEEK_V1: Record<string, Array<{ personId: string; siteId: string; date: string }>> = {
  "2026-W21": [
    { personId: "p-tao",     siteId: "s-thevenot",   date: "2026-05-19" },
    { personId: "p-tao",     siteId: "s-thevenot",   date: "2026-05-20" },
    { personId: "p-charlie", siteId: "s-chateau",    date: "2026-05-18" },
    { personId: "p-charlie", siteId: "s-chateau",    date: "2026-05-19" },
    { personId: "p-charlie", siteId: "s-chateau",    date: "2026-05-20" },
    { personId: "p-tao",     siteId: "s-picard",     date: "2026-05-18" },
    { personId: "p-tao",     siteId: "s-picard",     date: "2026-05-19" },
    { personId: "p-tao",     siteId: "s-picard",     date: "2026-05-20" },
    { personId: "p-joan",    siteId: "s-beauvallet", date: "2026-05-18" },
    { personId: "p-joan",    siteId: "s-beauvallet", date: "2026-05-19" },
    { personId: "p-joan",    siteId: "s-beauvallet", date: "2026-05-20" },
    { personId: "p-jlou",    siteId: "s-ghien",      date: "2026-05-18" },
    { personId: "p-jlou",    siteId: "s-ghien",      date: "2026-05-19" },
    { personId: "p-jlou",    siteId: "s-ghien",      date: "2026-05-20" },
    { personId: "p-jlou",    siteId: "s-ghien",      date: "2026-05-21" },
    { personId: "p-jlou",    siteId: "s-ghien",      date: "2026-05-22" },
    { personId: "p-tao",     siteId: "s-carnon",     date: "2026-05-18" },
    { personId: "p-joan",    siteId: "s-atelier",    date: "2026-05-20" },
    { personId: "p-joan",    siteId: "s-atelier",    date: "2026-05-21" },
    { personId: "p-joan",    siteId: "s-atelier",    date: "2026-05-22" },
  ],
  "2026-W22": [
    { personId: "p-tao",     siteId: "s-vauvert",  date: "2026-05-26" },
    { personId: "p-tao",     siteId: "s-vauvert",  date: "2026-05-27" },
    { personId: "p-joan",    siteId: "s-merlin",   date: "2026-05-25" },
    { personId: "p-tao",     siteId: "s-merlin",   date: "2026-05-25" },
    { personId: "p-joan",    siteId: "s-merlin",   date: "2026-05-26" },
    { personId: "p-joan",    siteId: "s-ortin",    date: "2026-05-25" },
    { personId: "p-tao",     siteId: "s-ortin",    date: "2026-05-25" },
    { personId: "p-jlou",    siteId: "s-ortin",    date: "2026-05-26" },
    { personId: "p-joan",    siteId: "s-ortin",    date: "2026-05-27" },
    { personId: "p-jlou",    siteId: "s-ortin",    date: "2026-05-27" },
    { personId: "p-jlou",    siteId: "s-colonna",  date: "2026-05-25" },
    { personId: "p-jlou",    siteId: "s-colonna",  date: "2026-05-26" },
    { personId: "p-tao",     siteId: "s-emaus",    date: "2026-05-25" },
    { personId: "p-joan",    siteId: "s-emaus",    date: "2026-05-25" },
    { personId: "p-joan",    siteId: "s-belmonte", date: "2026-05-26" },
    { personId: "p-tao",     siteId: "s-crech",    date: "2026-05-26" },
    { personId: "p-charlie", siteId: "s-atelier",  date: "2026-05-25" },
    { personId: "p-charlie", siteId: "s-atelier",  date: "2026-05-26" },
    { personId: "p-charlie", siteId: "s-atelier",  date: "2026-05-27" },
  ],
};

function augmentStateWithRosterSeed(state: any, weekKey: string): any {
  if (state && state[ROSTER_SEED_FLAG] === true) return state;
  const out: any = { ...(state || {}) };

  const currentPeople = Array.isArray(out.people) ? out.people : [];
  const existingPeopleIds = new Set(currentPeople.map((p: any) => p?.id));
  const missingPeople = SEED_PEOPLE_V1.filter((p) => !existingPeopleIds.has(p.id));
  out.people = [...currentPeople, ...missingPeople];

  const currentSites = Array.isArray(out.sites) ? out.sites : [];
  const existingSiteIds = new Set(currentSites.map((s: any) => s?.id));
  const patchedSites = currentSites.map((s: any) => {
    const extra = SEED_SITE_WEEK_PATCHES_V1[s?.id];
    if (!extra) return s;
    const current: string[] = Array.isArray(s.planningWeeks) ? s.planningWeeks : [];
    return { ...s, planningWeeks: Array.from(new Set([...current, ...extra])) };
  });
  const newSites = SEED_SITE_ADDITIONS_V1.filter((s) => !existingSiteIds.has(s.id));
  out.sites = [...patchedSites, ...newSites];

  const weekAssignments = SEED_ASSIGNMENTS_BY_WEEK_V1[weekKey] || [];
  if (weekAssignments.length > 0) {
    const currentAssignments = Array.isArray(out.assignments) ? out.assignments : [];
    const existing = new Set(currentAssignments.map((a: any) => `${a?.personId}|${a?.siteId}|${a?.date}`));
    const toAdd = weekAssignments
      .filter((a) => !existing.has(`${a.personId}|${a.siteId}|${a.date}`))
      .map((a) => ({ ...a, id: `seed-${a.personId}-${a.siteId}-${a.date}` }));
    out.assignments = [...currentAssignments, ...toAdd];
  }

  out[ROSTER_SEED_FLAG] = true;
  return out;
}

// ==================================
// Devis Kanban – Carte draggable
// ==================================
function QuoteCard({ quote, tone, onOpen, onCreateSite }: any) {
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
        {Array.isArray(quote.planningWeeks) && quote.planningWeeks.length > 0 && (
          <div className="flex items-center gap-1 text-sky-700">
            <CalendarRange className="w-3 h-3" /> {formatWeeksSummary(quote.planningWeeks)}
          </div>
        )}
      </div>
      {quote.status === "won" && onCreateSite && (
        <button
          onClick={(e) => { e.stopPropagation(); onCreateSite(quote); }}
          className="w-full text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 hover:bg-emerald-100 transition text-left"
        >
          → Créer le chantier
        </button>
      )}
      {!(quote.status === "won" && onCreateSite) && <div className="text-[11px] text-neutral-500">Cliquer pour voir le détail</div>}
    </button>
  );
}

function QuoteColumn({ col, items, onOpenQuote, onCreateSite }: any) {
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
          <QuoteCard key={q.id} quote={q} tone={tone} onOpen={() => onOpenQuote(q)} onCreateSite={onCreateSite} />
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

// ==================================
// Calendar drag & drop helpers
// ==================================
function CalendarEventChip({ event, weekKey, calHex, onEdit }: { event: any; weekKey: string; calHex: string; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `calendar-event-${event.id}-${weekKey}`,
    data: { type: "calendar-event", eventId: event.id, fromWeekKey: weekKey },
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onEdit}
      className={cx(
        "w-full flex items-center gap-1.5 text-[10px] px-1.5 py-px rounded bg-white border border-neutral-100 leading-5 select-none cursor-grab active:cursor-grabbing transition hover:bg-neutral-50",
        isDragging && "opacity-50"
      )}
      title={event.title}
    >
      <span className="w-2 h-2 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: calHex }} />
      <span className="truncate text-neutral-700">{event.title}</span>
    </div>
  );
}

function CalendarSiteChip({ site, weekKey, className }: { site: any; weekKey: string; className?: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `calendar-site-${site.id}-${weekKey}`,
    data: { type: "calendar-site", siteId: site.id, fromWeekKey: weekKey },
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cx(className, "cursor-grab active:cursor-grabbing select-none", isDragging && "opacity-50")}
      title={site.name}
    >
      {site.name}
    </div>
  );
}

function CalendarWeekDropZone({ weekKey, children, isCurrentWeek }: { weekKey: string; children: React.ReactNode; isCurrentWeek: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `calendar-week-${weekKey}`,
    data: { type: "calendar-week", weekKey },
  });
  return (
    <div
      ref={setNodeRef}
      className={cx(
        "flex-shrink-0 border-r last:border-r-0 flex flex-col",
        isCurrentWeek ? "bg-sky-50" : "bg-white",
        isOver && "ring-2 ring-sky-300 ring-inset"
      )}
      style={{ width: 152 }}
    >
      {children}
    </div>
  );
}

// ==================================
// Dialogs
// ==================================
function AddPersonDialog({ open, setOpen, onAdd, usedColors = [] }: any) {
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
          <ColorPicker value={color} onChange={setColor} usedColors={usedColors} />
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

// Retourne le lundi de la semaine ISO n de l'année donnée
function isoWeekStart(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const d = new Date(jan4);
  d.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);
  return d;
}

// Groupe les semaines ISO d'une année par mois (via le jeudi de la semaine)
function weeksByMonth(year: number): Record<number, number[]> {
  const total = Math.max(52, getISOWeeksInYear(year));
  const result: Record<number, number[]> = {};
  for (let wk = 1; wk <= total; wk++) {
    const thursday = isoWeekStart(year, wk);
    thursday.setDate(thursday.getDate() + 3);
    const m = thursday.getMonth();
    if (!result[m]) result[m] = [];
    result[m].push(wk);
  }
  return result;
}

const MONTH_SHORT = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];

function WeekPicker({
  year,
  selectedWeeks,
  onToggleWeek,
  onToggleMonth,
}: {
  year: number;
  selectedWeeks: string[];
  onToggleWeek: (wkKey: string) => void;
  onToggleMonth: (wkKeys: string[], allSelected: boolean) => void;
}) {
  const groups = weeksByMonth(year);
  return (
    <div className="space-y-0.5">
      {Object.entries(groups).map(([m, weeks]) => {
        const monthWkKeys = (weeks as number[]).map((wk) => `${year}-W${pad2(wk)}`);
        const allSelected = monthWkKeys.every((k) => selectedWeeks.includes(k));
        const someSelected = monthWkKeys.some((k) => selectedWeeks.includes(k));
        return (
          <div key={m} className="flex items-center gap-1.5 py-0.5">
            <button
              type="button"
              onClick={() => onToggleMonth(monthWkKeys, allSelected)}
              title={allSelected ? "Désélectionner le mois" : "Sélectionner le mois"}
              className={cx(
                "text-[11px] font-semibold w-11 shrink-0 text-left rounded px-1 py-0.5 transition hover:bg-neutral-100",
                allSelected ? "text-black" : someSelected ? "text-neutral-600" : "text-neutral-400"
              )}
            >
              {MONTH_SHORT[Number(m)]}
            </button>
            <div className="flex flex-wrap gap-1">
              {(weeks as number[]).map((wk) => {
                const wkKey = `${year}-W${pad2(wk)}`;
                const active = selectedWeeks.includes(wkKey);
                return (
                  <button
                    key={wkKey}
                    type="button"
                    onClick={() => onToggleWeek(wkKey)}
                    className={cx(
                      "text-[11px] rounded border px-1.5 py-0.5 transition leading-none",
                      active
                        ? "bg-black text-white border-black"
                        : "border-neutral-200 hover:bg-neutral-100 text-neutral-500"
                    )}
                  >
                    {pad2(wk)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddSiteDialog({ open, setOpen, onAdd, usedColors = [] }: any) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(SITE_COLORS[6]);
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>([]);
  const [pickerYear, setPickerYear] = useState<number>(() => new Date().getFullYear());
  const toggleWeek = (wkKey: string) =>
    setSelectedWeeks((prev) => prev.includes(wkKey) ? prev.filter((w) => w !== wkKey) : [...prev, wkKey]);
  const toggleMonth = (keys: string[], allSelected: boolean) =>
    setSelectedWeeks((prev) => allSelected ? prev.filter((w) => !keys.includes(w)) : Array.from(new Set([...prev, ...keys])));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter un chantier</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nom du chantier" value={name} onChange={(e: any) => setName(e.target.value)} />
          <div className="space-y-1">
            <div className="text-xs text-neutral-600">Couleur</div>
            <ColorPicker value={color} onChange={setColor} usedColors={usedColors} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-neutral-700">Semaines prévues</div>
                {selectedWeeks.length > 0 && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-black text-white font-semibold">{selectedWeeks.length}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => setPickerYear((y: number) => y - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-xs font-semibold w-10 text-center">{pickerYear}</span>
                <Button size="icon" variant="ghost" onClick={() => setPickerYear((y: number) => y + 1)}><ChevronRight className="w-4 h-4" /></Button>
                {selectedWeeks.length > 0 && (
                  <button type="button" className="text-[11px] text-neutral-500 underline ml-1" onClick={() => setSelectedWeeks([])}>Vider</button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-neutral-400">Cliquer sur un mois pour le sélectionner entier, ou sur les numéros de semaine. Laisser vide = toute l'année.</p>
            <WeekPicker year={pickerYear} selectedWeeks={selectedWeeks} onToggleWeek={toggleWeek} onToggleMonth={toggleMonth} />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              const n = name.trim();
              if (!n) return;
              onAdd(n, selectedWeeks, color);
              setOpen(false);
              setName("");
              setColor(SITE_COLORS[6]);
              setSelectedWeeks([]);
              setPickerYear(new Date().getFullYear());
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
  color,
  usedColors = [],
}: any) {
  const [val, setVal] = useState<string>(name || "");
  const [pickerYear, setPickerYear] = useState<number>(initialYear || new Date().getFullYear());
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>(weekSelection || []);
  const [siteColor, setSiteColor] = useState<string>(color || SITE_COLORS[0]);

  useEffect(() => setVal(name || ""), [name]);
  useEffect(() => setSelectedWeeks(weekSelection || []), [weekSelection]);
  useEffect(() => { if (initialYear) setPickerYear(initialYear); }, [initialYear]);
  useEffect(() => setSiteColor(color || SITE_COLORS[0]), [color]);

  const toggleWeek = (wkKey: string) => {
    setSelectedWeeks((prev) => {
      const exists = prev.includes(wkKey);
      const next = exists ? prev.filter((w) => w !== wkKey) : [...prev, wkKey];
      onWeekSelectionChange?.(next);
      return next;
    });
  };

  const renderWeekPicker = typeof weekSelection !== 'undefined';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Input value={val} onChange={(e: any) => setVal(e.target.value)} placeholder="Nouveau nom" />
        {typeof color !== "undefined" && (
          <div className="mt-3 space-y-1">
            <div className="text-neutral-600 text-sm">Couleur du chantier</div>
            <ColorPicker value={siteColor} onChange={setSiteColor} usedColors={usedColors} />
          </div>
        )}
        {renderWeekPicker && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Semaines visibles</span>
                {selectedWeeks.length > 0 && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-black text-white font-semibold">{selectedWeeks.length}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => setPickerYear((y: number) => y - 1)}><ChevronLeft className="w-3 h-3" /></Button>
                <span className="text-xs font-semibold w-10 text-center">{pickerYear}</span>
                <Button size="icon" variant="ghost" onClick={() => setPickerYear((y: number) => y + 1)}><ChevronRight className="w-3 h-3" /></Button>
                {selectedWeeks.length > 0 && (
                  <button type="button" className="text-[11px] text-neutral-400 underline ml-1" onClick={() => { setSelectedWeeks([]); onWeekSelectionChange?.([]); }}>Vider</button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-neutral-400">Mois = sélectionner toutes ses semaines. Laisser vide = toute l'année.</p>
            <WeekPicker
              year={pickerYear}
              selectedWeeks={selectedWeeks}
              onToggleWeek={toggleWeek}
              onToggleMonth={(keys, allSelected) => {
                const next = allSelected ? selectedWeeks.filter((w) => !keys.includes(w)) : Array.from(new Set([...selectedWeeks, ...keys]));
                setSelectedWeeks(next);
                onWeekSelectionChange?.(next);
              }}
            />
          </div>
        )}
        <DialogFooter>
          <Button
            onClick={() => {
              const n = val.trim();
              if (!n) return;
              onSave(
                n,
                selectedWeeks,
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

function SiteDetailDialog({ open, site, onClose, onSave, onArchive, onDelete, onDuplicate, fallbackYear, usedColors = [], assignments: assignmentsProp = [], people: peopleProp = [], tauxJournalierDefault: tauxJDefault = 350, tauxMaterielDefault: tauxMDefault = 15, quotes: quotesProp = [], onOpenClientHistory }: any) {
  const [tab, setTab] = useState<"infos" | "rentabilite">("infos");
  const [name, setName] = useState<string>("");
  const [status, setStatus] = useState<"planned" | "pending">("pending");
  const [globalNotes, setGlobalNotes] = useState<string>("");
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [clientName, setClientName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [contactName, setContactName] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [weeks, setWeeks] = useState<string>("");
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>([]);
  const [pickerYear, setPickerYear] = useState<number>(() => new Date().getFullYear());
  const [color, setColor] = useState<string>(SITE_COLORS[0]);
  const [tauxMateriel, setTauxMateriel] = useState<string>("");
  const [montantDevis, setMontantDevis] = useState<string>("");
  const [couts, setCouts] = useState<any[]>([]);
  const [newCoutLabel, setNewCoutLabel] = useState("");
  const [newCoutMontant, setNewCoutMontant] = useState("");
  const [situations, setSituations] = useState<any[]>([]);
  const [newSitLabel, setNewSitLabel] = useState("");
  const [newSitMontant, setNewSitMontant] = useState("");
  const [newSitDate, setNewSitDate] = useState("");
  const [origine, setOrigine] = useState<string>("");

  useEffect(() => {
    setTab("infos");
    setName(site?.name || "");
    setStatus(site?.status || "pending");
    setClientName(site?.clientName || site?.quoteSnapshot?.client || "");
    setAddress(site?.address || "");
    setCity(site?.city || "");
    setContactName(site?.contactName || site?.clientName || site?.quoteSnapshot?.client || "");
    setContactPhone(site?.contactPhone || "");
    const initialWeeks = Array.isArray(site?.planningWeeks) ? site.planningWeeks : [];
    setWeeks(initialWeeks.join(", "));
    setSelectedWeeks(initialWeeks);
    const firstWeek = initialWeeks[0];
    const parsed = firstWeek ? parseWeekKey(firstWeek) : null;
    setPickerYear(parsed?.year || new Date().getFullYear());
    setColor(site?.color || SITE_COLORS[0]);
    setGlobalNotes(site?.globalNotes || "");
    setTauxMateriel(site?.tauxMateriel != null ? String(site.tauxMateriel) : "");
    setMontantDevis(site?.montantDevis != null ? String(site.montantDevis) : "");
    setCouts(Array.isArray(site?.couts) ? site.couts : []);
    setNewCoutLabel("");
    setNewCoutMontant("");
    setSituations(Array.isArray(site?.situations) ? site.situations : []);
    setNewSitLabel("");
    setNewSitMontant("");
    setNewSitDate("");
    setOrigine(site?.origine || "");
    setConfirmArchive(false);
    setConfirmDelete(false);
  }, [site]);

  const handleSave = (nextStatus?: "planned" | "pending") => {
    if (!site?.id) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const parsedWeeks = selectedWeeks.length ? selectedWeeks : parseWeekList(weeks, fallbackYear);
    const derived = parsedWeeks.length ? getWeekRangeFromKeys(parsedWeeks) : null;
    const parsedTauxMat = tauxMateriel !== "" && Number.isFinite(Number(tauxMateriel)) ? Number(tauxMateriel) : null;
    onSave({
      ...site,
      name: trimmed,
      status: nextStatus || status,
      startDate: derived?.startKey || site?.startDate,
      endDate: derived?.endKey || site?.endDate,
      clientName,
      address,
      city,
      contactName,
      contactPhone,
      planningWeeks: parsedWeeks,
      color,
      globalNotes,
      tauxMateriel: parsedTauxMat,
      montantDevis: montantDevis !== "" && Number.isFinite(Number(montantDevis)) && Number(montantDevis) > 0 ? Number(montantDevis) : null,
      couts,
      situations,
      origine: origine || null,
    });
  };

  // Rentabilité calculations
  const siteAssignments = (assignmentsProp || []).filter((a: any) => a.siteId === site?.id);
  const moByPerson = peopleProp.reduce((acc: any[], p: any) => {
    const pAss = siteAssignments.filter((a: any) => a.personId === p.id);
    if (!pAss.length) return acc;
    const jours = pAss.reduce((s: number, a: any) => s + getPortion(a.portion), 0);
    const rate = Number.isFinite(Number(p.tauxJournalier)) ? Number(p.tauxJournalier) : null;
    return [...acc, { person: p, jours, rate, cout: rate != null ? jours * rate : null }];
  }, []);
  const moKnown = moByPerson.reduce((s: number, r: any) => s + (r.cout ?? 0), 0);
  const moUnknown = moByPerson.filter((r: any) => r.rate == null);
  const totalCouts = couts.reduce((s: number, c: any) => s + (Number(c.montant) || 0), 0);
  const totalFacture = situations.reduce((s: number, sit: any) => s + (Number(sit.montant) || 0), 0);
  const linkedQuote = site?.quoteId ? quotesProp.find((q: any) => q.id === site.quoteId) : null;
  const budget = Number(linkedQuote?.amount ?? site?.quoteSnapshot?.amount ?? site?.montantDevis ?? 0);
  const tauxMat = tauxMateriel !== "" && Number.isFinite(Number(tauxMateriel)) ? Number(tauxMateriel) : tauxMDefault;
  const coutMateriel = budget > 0 ? budget * (tauxMat / 100) : 0;
  const coutTotal = moKnown + coutMateriel + totalCouts;
  const marge = budget > 0 ? budget - coutTotal : null;
  const margePercent = budget > 0 ? ((budget - coutTotal) / budget) * 100 : null;
  const resteAFacturer = budget > 0 ? budget - totalFacture : null;

  const isArchived = site?.status === "archived";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cx("w-3.5 h-3.5 rounded-full shrink-0", color)} />
            {name || "Détail du chantier"}
          </DialogTitle>
          <DialogDescription>Modifier, planifier ou analyser la rentabilité de ce chantier.</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-neutral-100 -mx-1 mb-2">
          {([["infos", "Infos"], ["rentabilite", "Rentabilité"]] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} className={cx("px-4 py-2 text-sm font-medium transition border-b-2 -mb-px", tab === t ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400 hover:text-neutral-700")}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Infos tab ── */}
        {tab === "infos" && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Button size="sm" variant={status === "pending" ? "default" : "outline"} onClick={() => setStatus("pending")}>À planifier</Button>
              <Button size="sm" variant={status === "planned" ? "default" : "outline"} onClick={() => setStatus("planned")}>Planifié</Button>
              <span className="text-[11px] text-neutral-500">Statut éditable à tout moment</span>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-[11px] text-neutral-600">Nom</span>
                <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Nom du chantier" />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-neutral-600">Origine</span>
                <select
                  value={origine}
                  onChange={(e) => setOrigine(e.target.value)}
                  className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
                >
                  <option value="">— Non renseigné</option>
                  {ORIGINE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-[11px] text-neutral-600">Couleur</span>
                <ColorPicker value={color} onChange={setColor} usedColors={usedColors} />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-neutral-600 flex items-center gap-2">
                  Client
                  {clientName.trim() && onOpenClientHistory && (
                    <button type="button" onClick={() => onOpenClientHistory(clientName)} className="text-sky-600 hover:underline text-[11px]">Voir historique</button>
                  )}
                </span>
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
                <span className="text-[11px] text-neutral-600">Contact</span>
                <Input value={contactName} onChange={(e: any) => setContactName(e.target.value)} placeholder="Interlocuteur" />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-neutral-600">Téléphone</span>
                <Input value={contactPhone} onChange={(e: any) => setContactPhone(e.target.value)} placeholder="Téléphone" />
              </label>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-600 font-semibold">Semaines</span>
                    {selectedWeeks.length > 0 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-black text-white font-semibold">{selectedWeeks.length}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setPickerYear((y: number) => y - 1)}><ChevronLeft className="w-3 h-3" /></Button>
                    <span className="text-xs font-semibold w-10 text-center">{pickerYear}</span>
                    <Button size="icon" variant="ghost" onClick={() => setPickerYear((y: number) => y + 1)}><ChevronRight className="w-3 h-3" /></Button>
                    {selectedWeeks.length > 0 && (
                      <button type="button" className="text-[11px] text-neutral-400 underline ml-1" onClick={() => { setSelectedWeeks([]); setWeeks(""); }}>Vider</button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-neutral-400">Mois = sélectionner toutes ses semaines. Laisser vide = toute l'année.</p>
                <WeekPicker
                  year={pickerYear}
                  selectedWeeks={selectedWeeks}
                  onToggleWeek={(wkKey: string) => setSelectedWeeks((prev) => {
                    const next = prev.includes(wkKey) ? prev.filter((w) => w !== wkKey) : [...prev, wkKey];
                    setWeeks(next.join(", "));
                    return next;
                  })}
                  onToggleMonth={(keys: string[], allSelected: boolean) => setSelectedWeeks((prev) => {
                    const next = allSelected ? prev.filter((w) => !keys.includes(w)) : Array.from(new Set([...prev, ...keys]));
                    setWeeks(next.join(", "));
                    return next;
                  })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-neutral-600 font-semibold">Notes</span>
              <Textarea value={globalNotes} onChange={(e: any) => setGlobalNotes(e.target.value)} placeholder="Notes internes, informations chantier…" rows={3} className="text-sm resize-none" />
            </div>
          </div>
        )}

        {/* ── Rentabilité tab ── */}
        {tab === "rentabilite" && (
          <div className="space-y-4 text-sm">

            {/* Budget */}
            <div className="rounded-lg border border-neutral-200 p-3 space-y-2">
              <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Montant du marché</div>
              {linkedQuote ? (
                <>
                  <div className="text-xl font-bold text-neutral-900">{formatEUR(budget)}</div>
                  <div className="text-[11px] text-neutral-400">Devis lié : {linkedQuote.title}</div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={montantDevis}
                      onChange={(e: any) => setMontantDevis(e.target.value)}
                      placeholder="Saisir le montant HT (€)"
                      className="h-8 text-sm"
                    />
                    {montantDevis && Number(montantDevis) > 0 && (
                      <span className="text-sm font-semibold text-neutral-700 shrink-0">{formatEUR(Number(montantDevis))}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-400">Pas de devis lié — entrez le montant manuellement ou associez un devis depuis l'onglet Devis.</div>
                </div>
              )}
            </div>

            {/* Main d'œuvre */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Main d'œuvre</div>
              {moByPerson.length === 0 && (
                <div className="text-neutral-400 text-xs">Aucun salarié affecté à ce chantier dans le planning.</div>
              )}
              {moByPerson.map((r: any) => (
                <div key={r.person.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-neutral-50">
                  <div className="flex items-center gap-2">
                    <div className={cx("w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0", r.person.color || "bg-neutral-400")}>
                      {r.person.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <span className="font-medium">{r.person.name}</span>
                    <span className="text-neutral-400 text-[11px]">{r.jours}j</span>
                  </div>
                  <div className="text-right">
                    {r.rate != null ? (
                      <span className="font-semibold text-neutral-800">{formatEUR(r.cout)}</span>
                    ) : (
                      <span className="text-amber-600 text-[11px]">Taux non défini — aller dans Salariés</span>
                    )}
                    {r.rate != null && <div className="text-[10px] text-neutral-400">{r.rate} €/j</div>}
                  </div>
                </div>
              ))}
              {moByPerson.length > 0 && (
                <div className="flex justify-between font-semibold pt-1">
                  <span>Total MO{moUnknown.length > 0 ? ` (${moUnknown.length} sans taux)` : ""}</span>
                  <span>{formatEUR(moKnown)}</span>
                </div>
              )}
            </div>

            {/* Matériel */}
            <div className="flex items-center justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-600">Matériel ({tauxMat}% du devis)</span>
              <span className="font-medium">{budget > 0 ? formatEUR(coutMateriel) : <span className="text-neutral-300 text-xs">budget non défini</span>}</span>
            </div>

            {/* Coûts divers */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Coûts divers (sous-traitants, location, etc.)</div>
              {couts.length === 0 && <div className="text-neutral-400 text-xs">Aucun coût ajouté.</div>}
              {couts.map((c: any) => (
                <div key={c.id} className="flex items-center gap-2">
                  <Input
                    value={c.label}
                    onChange={(e: any) => setCouts(prev => prev.map((x: any) => x.id === c.id ? { ...x, label: e.target.value } : x))}
                    placeholder="Libellé"
                    className="flex-1 text-sm"
                  />
                  <input
                    type="number" min={0}
                    value={c.montant}
                    onChange={(e: any) => setCouts(prev => prev.map((x: any) => x.id === c.id ? { ...x, montant: Number(e.target.value) || 0 } : x))}
                    className="w-28 border border-neutral-200 rounded px-2 py-1 text-sm text-right"
                  />
                  <span className="text-neutral-400 text-xs shrink-0">€</span>
                  <button onClick={() => setCouts(prev => prev.filter((x: any) => x.id !== c.id))} className="text-red-400 hover:text-red-600 shrink-0 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <Input value={newCoutLabel} onChange={(e: any) => setNewCoutLabel(e.target.value)} placeholder="Ex: Sous-traitant maçonnerie" className="flex-1 text-sm" />
                <input
                  type="number" min={0}
                  value={newCoutMontant}
                  onChange={(e: any) => setNewCoutMontant(e.target.value)}
                  placeholder="Montant €"
                  className="w-28 border border-neutral-200 rounded px-2 py-1 text-sm text-right"
                />
                <Button size="sm" variant="outline" onClick={() => {
                  if (!newCoutLabel.trim()) return;
                  const id = typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `c${Date.now()}`;
                  setCouts(prev => [...prev, { id, label: newCoutLabel.trim(), montant: Number(newCoutMontant) || 0 }]);
                  setNewCoutLabel("");
                  setNewCoutMontant("");
                }}>Ajouter</Button>
              </div>
              {couts.length > 0 && (
                <div className="flex justify-between font-semibold pt-1">
                  <span>Total coûts divers</span>
                  <span>{formatEUR(totalCouts)}</span>
                </div>
              )}
            </div>

            {/* Situations (tranches de facturation) */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Situations (tranches facturées)</div>
              {situations.length === 0 && <div className="text-neutral-400 text-xs">Aucune situation enregistrée.</div>}
              {situations.map((sit: any) => (
                <div key={sit.id} className="flex items-center gap-2">
                  <input type="date" value={sit.date} onChange={(e: any) => setSituations(prev => prev.map((x: any) => x.id === sit.id ? { ...x, date: e.target.value } : x))} className="border border-neutral-200 rounded px-2 py-1 text-xs w-32" />
                  <Input value={sit.label} onChange={(e: any) => setSituations(prev => prev.map((x: any) => x.id === sit.id ? { ...x, label: e.target.value } : x))} placeholder="Libellé (ex: Situation n°1)" className="flex-1 text-sm" />
                  <input type="number" min={0} value={sit.montant} onChange={(e: any) => setSituations(prev => prev.map((x: any) => x.id === sit.id ? { ...x, montant: Number(e.target.value) || 0 } : x))} className="w-28 border border-neutral-200 rounded px-2 py-1 text-sm text-right" />
                  <span className="text-neutral-400 text-xs shrink-0">€</span>
                  <button onClick={() => setSituations(prev => prev.filter((x: any) => x.id !== sit.id))} className="text-red-400 hover:text-red-600 shrink-0 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <input type="date" value={newSitDate} onChange={(e: any) => setNewSitDate(e.target.value)} className="border border-neutral-200 rounded px-2 py-1 text-xs w-32" />
                <Input value={newSitLabel} onChange={(e: any) => setNewSitLabel(e.target.value)} placeholder="Libellé situation" className="flex-1 text-sm" />
                <input type="number" min={0} value={newSitMontant} onChange={(e: any) => setNewSitMontant(e.target.value)} placeholder="Montant €" className="w-28 border border-neutral-200 rounded px-2 py-1 text-sm text-right" />
                <Button size="sm" variant="outline" onClick={() => {
                  if (!newSitLabel.trim() && !newSitMontant) return;
                  const id = typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `sit${Date.now()}`;
                  setSituations(prev => [...prev, { id, label: newSitLabel.trim() || `Situation n°${prev.length + 1}`, montant: Number(newSitMontant) || 0, date: newSitDate }]);
                  setNewSitLabel(""); setNewSitMontant(""); setNewSitDate("");
                }}>Ajouter</Button>
              </div>
              {situations.length > 0 && (
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>Total facturé</span>
                  <span className="text-sky-700">{formatEUR(totalFacture)}{budget > 0 ? ` (${Math.round(totalFacture / budget * 100)}% du budget)` : ""}</span>
                </div>
              )}
            </div>

            {/* Récap */}
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2">
              <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Récapitulatif</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-neutral-600">Main d'œuvre</span><span>{formatEUR(moKnown)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-600">Matériel ({tauxMat}% du devis)</span><span>{formatEUR(coutMateriel)}</span></div>
                {couts.length > 0 && <div className="flex justify-between"><span className="text-neutral-600">Coûts divers</span><span>{formatEUR(totalCouts)}</span></div>}
                <div className="flex justify-between font-semibold border-t pt-1"><span>Coût total estimé</span><span>{formatEUR(coutTotal)}</span></div>
                {budget > 0 && (
                  <div className={cx("flex justify-between font-bold text-base pt-1", (marge ?? 0) >= 0 ? "text-emerald-700" : "text-red-600")}>
                    <span>Marge estimée</span>
                    <span>{formatEUR(marge ?? 0)} ({margePercent != null ? Math.round(margePercent) : 0}%)</span>
                  </div>
                )}
                {budget > 0 && situations.length > 0 && (
                  <div className="flex justify-between pt-1 border-t text-sky-700 font-medium">
                    <span>Reste à facturer</span>
                    <span>{formatEUR(resteAFacturer ?? 0)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col items-stretch">
          {confirmArchive && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 space-y-2">
              <p>Confirmer l'archivage de <strong>"{site?.name}"</strong> ?</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { setConfirmArchive(false); onArchive?.(site?.id); onClose(); }}>Archiver</Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmArchive(false)}>Annuler</Button>
              </div>
            </div>
          )}
          {confirmDelete && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 space-y-2">
              <p>Supprimer définitivement <strong>"{site?.name}"</strong> ? Cette action est irréversible.</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { setConfirmDelete(false); onDelete?.(site?.id); onClose(); }}>Supprimer</Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Annuler</Button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {!isArchived && (
                <Button size="sm" variant="outline" onClick={() => { setConfirmArchive(true); setConfirmDelete(false); }}>
                  <Archive className="w-3.5 h-3.5 mr-1" /> Archiver
                </Button>
              )}
              {onDuplicate && (
                <Button size="sm" variant="outline" onClick={() => { onDuplicate(site); onClose(); }}>
                  Dupliquer
                </Button>
              )}
              <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 border-red-200" onClick={() => { setConfirmDelete(true); setConfirmArchive(false); }}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Supprimer
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
              <Button variant="outline" size="sm" onClick={() => handleSave("planned")}>Planifier</Button>
              <Button size="sm" onClick={() => handleSave()}>Enregistrer</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function PersonDetailDialog({ open, person, onClose, onSave, onDelete, usedColors = [] }: any) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [skills, setSkills] = useState("");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [tauxJournalier, setTauxJournalier] = useState<string>("");
  const [personHoursPerDay, setPersonHoursPerDay] = useState<string>("");
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setName(person?.name || "");
    setRole(person?.role || "");
    setPhone(person?.phone || "");
    setTauxJournalier(person?.tauxJournalier != null ? String(person.tauxJournalier) : "");
    setPersonHoursPerDay(person?.hoursPerDay != null ? String(person.hoursPerDay) : "");
    setEmail(person?.email || "");
    setSkills((person?.skills || []).join(", "));
    setNotes(person?.notes || "");
    setColor(person?.color || COLORS[0]);
    setConfirmArchive(false);
    setConfirmDelete(false);
  }, [person]);

  const handleSave = () => {
    if (!person?.id) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const parsedSkills = skills.split(/[,;]+/).map((s: string) => s.trim()).filter(Boolean);
    const parsedTaux = tauxJournalier !== "" && Number.isFinite(Number(tauxJournalier)) ? Number(tauxJournalier) : null;
    const parsedHPD = personHoursPerDay !== "" && Number.isFinite(Number(personHoursPerDay)) && Number(personHoursPerDay) > 0 ? Number(personHoursPerDay) : null;
    onSave({ ...person, name: trimmed, role: role.trim(), phone: phone.trim(), email: email.trim(), notes: notes.trim(), skills: parsedSkills, color, tauxJournalier: parsedTaux, hoursPerDay: parsedHPD });
  };

  const isArchived = person?.status === "archived";
  const isDisabled = person?.status === "disabled";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Fiche salarié
            {isArchived && <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">Archivé</span>}
            {isDisabled && <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Désactivé</span>}
          </DialogTitle>
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
          <div className="space-y-1">
            <div className="text-xs text-neutral-600">Taux journalier (€/j) — pour le calcul de rentabilité</div>
            <Input type="number" min={0} value={tauxJournalier} onChange={(e: any) => setTauxJournalier(e.target.value)} placeholder="Ex: 350 (laissez vide pour utiliser le taux global)" />
          </div>
          <Textarea value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder="Notes internes, disponibilités..." />
          <div className="space-y-1">
            <div className="text-xs text-neutral-600">Couleur</div>
            <ColorPicker value={color} onChange={setColor} usedColors={usedColors} />
          </div>
        </div>

        <DialogFooter>
          <div className="flex flex-col gap-2 w-full">
            {/* Confirmations */}
            {confirmArchive && (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm space-y-2">
                <p className="font-medium">{isArchived ? `Restaurer ${name} ?` : `Archiver ${name} ?`}</p>
                <p className="text-xs text-neutral-500">{isArchived ? "Le salarié redeviendra actif." : "Il restera visible dans la grille et les exports mais disparaîtra des listes actives."}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { onSave({ ...person, status: isArchived ? "active" : "archived" }); setConfirmArchive(false); }} className={isArchived ? "bg-emerald-600 text-white" : "bg-neutral-700 text-white"}>
                    {isArchived ? "Restaurer" : "Confirmer l'archivage"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmArchive(false)}>Annuler</Button>
                </div>
              </div>
            )}
            {confirmDelete && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm space-y-2">
                <p className="font-medium text-red-700">Supprimer définitivement {name} ?</p>
                <p className="text-xs text-red-500">Toutes les affectations de ce salarié seront supprimées. Cette action est irréversible.</p>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-red-600 text-white hover:bg-red-700" onClick={() => { onDelete(person.id); setConfirmDelete(false); }}>Supprimer</Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Annuler</Button>
                </div>
              </div>
            )}
            {/* Actions row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setConfirmArchive(true); setConfirmDelete(false); }}>
                  <Archive className="w-3.5 h-3.5 mr-1" />
                  {isArchived ? "Restaurer" : "Archiver"}
                </Button>
                {!isArchived && (
                  <Button size="sm" variant="outline" onClick={() => onSave({ ...person, status: isDisabled ? "active" : "disabled" })}>
                    {isDisabled ? "Réactiver" : "Désactiver"}
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 border-red-200" onClick={() => { setConfirmDelete(true); setConfirmArchive(false); }}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Supprimer
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Fermer</Button>
                <Button onClick={handleSave}>Enregistrer</Button>
              </div>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnnotationDialog({ open, setOpen, value, onSave }: any) {
  const initial = typeof value === "string" ? { text: value } : value || {};

  const getStatus = (i: any) => i.holiday ? "nontravaille" : i.blocked ? "indisponible" : "disponible";

  const [status, setStatus] = useState<"disponible" | "indisponible" | "nontravaille">(getStatus(initial));
  const [eventType, setEventType] = useState<EventType>(initial.eventType || null);
  const [text, setText] = useState<string>(initial.text || "");
  const [highlight, setHighlight] = useState<string>(initial.highlight || "");
  const [hoursOverride, setHoursOverride] = useState<string | number>(initial.hoursOverride ?? "");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    const i = typeof value === "string" ? { text: value } : value || {};
    setStatus(getStatus(i));
    setEventType(i.eventType || null);
    setText(i.text || "");
    setHighlight(i.highlight || "");
    setHoursOverride(i.hoursOverride ?? "");
    setAdvancedOpen(false);
  }, [value]);

  const STATUS_OPTIONS = [
    { id: "disponible", label: "Disponible", icon: "✅", cls: "border-green-200 bg-green-50 text-green-800" },
    { id: "indisponible", label: "Indisponible", icon: "🚧", cls: "border-red-200 bg-red-50 text-red-800" },
    { id: "nontravaille", label: "Non travaillé", icon: "🏖", cls: "border-slate-200 bg-slate-50 text-slate-700" },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Éditer la case</DialogTitle></DialogHeader>
        <div className="space-y-4">

          {/* Statut */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Statut</div>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatus(s.id)}
                  className={cx(
                    "flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-xs font-medium transition",
                    status === s.id ? s.cls + " border-current" : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300"
                  )}
                >
                  <span className="text-lg leading-none">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Événement */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Événement</div>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((et) => (
                <button
                  key={et.id}
                  type="button"
                  onClick={() => setEventType(eventType === et.id ? null : et.id)}
                  className={cx(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition",
                    eventType === et.id ? et.color + " border-current ring-2 ring-offset-1 ring-current/30" : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300"
                  )}
                >
                  <span>{et.icon}</span>{et.label}
                </button>
              ))}
            </div>
            <Input
              value={text}
              onChange={(e: any) => setText(e.target.value)}
              placeholder={eventType ? `Détails (optionnel)` : "Ajouter une note…"}
              className="text-sm"
            />
          </div>

          {/* Options avancées */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide hover:bg-neutral-50"
            >
              Options avancées
              {advancedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {advancedOpen && (
              <div className="px-3 pb-3 space-y-3 border-t">
                <div className="space-y-1.5 pt-3">
                  <div className="text-xs font-medium text-neutral-600">Couleur de la case</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHighlight("")}
                      className={cx("w-7 h-7 rounded-full border-2 bg-white flex items-center justify-center text-neutral-400", !highlight ? "border-black" : "border-neutral-300 hover:border-neutral-400")}
                      aria-label="Aucune couleur"
                    >✕</button>
                    {Object.entries(PASTELS).map(([c, p]) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setHighlight(c)}
                        className={cx("w-7 h-7 rounded-full border-2", p.bg, highlight === c ? "border-black" : "border-transparent hover:border-neutral-400")}
                        aria-label={c}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-neutral-600">Heures spécifiques <span className="text-neutral-400 font-normal">(remplace la valeur par défaut)</span></div>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={hoursOverride}
                    onChange={(e: any) => setHoursOverride(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="ex : 4"
                    className="w-24 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            onClick={() => {
              onSave({
                text: text || undefined,
                holiday: status === "nontravaille" || undefined,
                blocked: status === "indisponible" || undefined,
                eventType: eventType || undefined,
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
// ClientHistoryDialog
// ==================================
function ClientHistoryDialog({ open, onOpenChange, clientName, sites, quotes, tenders, clients, onSaveClient }: any) {
  const matchClient = (a: string, b: string) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();
  const clientSites = (sites || []).filter((s: any) => matchClient(s.clientName || s.quoteSnapshot?.client || "", clientName));
  const clientQuotes = (quotes || []).filter((q: any) => matchClient(q.client || "", clientName));
  const clientTenders = (tenders || []).filter((t: any) => matchClient(t.client || "", clientName));
  const nbSites = clientSites.length;
  const caTotal = clientSites.reduce((s: number, site: any) => s + Number(site.quoteSnapshot?.amount ?? 0), 0);
  const nbDevis = clientQuotes.length;
  const nbAo = clientTenders.length;
  const registeredClient = (clients || []).find((c: any) => matchClient(c.name, clientName));
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", notes: "" });
  useEffect(() => {
    if (registeredClient) {
      setEditForm({ name: registeredClient.name, phone: registeredClient.phone || "", email: registeredClient.email || "", notes: registeredClient.notes || "" });
    } else {
      setEditForm({ name: clientName || "", phone: "", email: "", notes: "" });
    }
    setEditing(false);
  }, [clientName]); // eslint-disable-line react-hooks/exhaustive-deps
  const tenderStatutLabel: Record<string, string> = {
    a_repondre: "À répondre", depose: "Déposé", gagne: "Gagné", perdu: "Perdu", abandonne: "Abandonné",
  };
  const quoteStatusLabel: Record<string, string> = {
    draft: "Brouillon", todo: "À faire", pending: "En attente", sent: "Envoyé", won: "Accepté", lost: "Refusé", expired: "Expiré",
  };
  const badgeCls = (status: string, type: "tender" | "quote") => {
    if (type === "tender") {
      const m: Record<string, string> = { a_repondre: "bg-amber-100 text-amber-800", depose: "bg-blue-100 text-blue-800", gagne: "bg-emerald-100 text-emerald-800", perdu: "bg-rose-100 text-rose-400", abandonne: "bg-neutral-100 text-neutral-500" };
      return m[status] || "bg-neutral-100 text-neutral-500";
    }
    const m2: Record<string, string> = { draft: "bg-neutral-200 text-neutral-600", todo: "bg-neutral-200 text-neutral-600", pending: "bg-amber-100 text-amber-800", sent: "bg-sky-100 text-sky-800", won: "bg-emerald-100 text-emerald-800", lost: "bg-rose-100 text-rose-700", expired: "bg-neutral-100 text-neutral-500" };
    return m2[status] || "bg-neutral-100 text-neutral-500";
  };
  const fmtEUR = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {editing ? (
              <Input value={editForm.name} onChange={(e: any) => setEditForm((p: any) => ({ ...p, name: e.target.value }))} className="text-lg font-bold h-8" />
            ) : (
              <span>{clientName || "Client"}</span>
            )}
            {registeredClient && !editing && (
              <button onClick={() => setEditing(true)} className="text-neutral-400 hover:text-sky-600 transition p-1 rounded">
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </DialogTitle>
          <DialogDescription>Historique complet de l&apos;activité pour ce client.</DialogDescription>
        </DialogHeader>
        {editing && registeredClient && (
          <div className="space-y-2 text-sm border rounded-lg p-3 bg-neutral-50 mb-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1"><span className="text-[11px] text-neutral-500">Téléphone</span><Input value={editForm.phone} onChange={(e: any) => setEditForm((p: any) => ({ ...p, phone: e.target.value }))} placeholder="Téléphone" /></label>
              <label className="space-y-1"><span className="text-[11px] text-neutral-500">Email</span><Input value={editForm.email} onChange={(e: any) => setEditForm((p: any) => ({ ...p, email: e.target.value }))} placeholder="Email" /></label>
            </div>
            <label className="space-y-1 block"><span className="text-[11px] text-neutral-500">Notes</span><Textarea value={editForm.notes} onChange={(e: any) => setEditForm((p: any) => ({ ...p, notes: e.target.value }))} rows={2} className="resize-none text-sm" /></label>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { onSaveClient({ ...registeredClient, ...editForm }); setEditing(false); }}>Enregistrer</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Chantiers", value: String(nbSites) },
            { label: "CA total", value: caTotal > 0 ? fmtEUR(caTotal) : "—" },
            { label: "Devis", value: String(nbDevis) },
            { label: "AO", value: String(nbAo) },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border bg-neutral-50 p-2">
              <div className="text-[11px] text-neutral-500 uppercase tracking-wide">{kpi.label}</div>
              <div className="text-lg font-bold text-neutral-900">{kpi.value}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2 mt-2">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Historique</div>
          {clientTenders.length === 0 && clientQuotes.length === 0 && clientSites.length === 0 && (
            <div className="text-sm text-neutral-400 text-center py-4">Aucune activité trouvée pour ce client.</div>
          )}
          {clientTenders.map((t: any) => (
            <div key={t.id} className="flex items-start gap-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-2.5 text-sm">
              <div className="shrink-0 w-2 h-2 rounded-full bg-indigo-400 mt-1.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-neutral-800">{t.objet || t.reference || "AO"}</span>
                  <span className={cx("px-2 py-0.5 rounded-full text-[11px] font-semibold", badgeCls(t.statut, "tender"))}>{tenderStatutLabel[t.statut] || t.statut}</span>
                </div>
                <div className="text-[11px] text-neutral-500 flex gap-3">
                  {t.reference && <span>Réf. {t.reference}</span>}
                  {t.dateLimite && <span>Limite : {new Date(t.dateLimite).toLocaleDateString("fr-FR")}</span>}
                  {t.montantEstime != null && <span>{fmtEUR(t.montantEstime)}</span>}
                </div>
              </div>
              <span className="text-[10px] text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded shrink-0">AO</span>
            </div>
          ))}
          {clientQuotes.map((q: any) => (
            <div key={q.id} className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50/40 p-2.5 text-sm">
              <div className="shrink-0 w-2 h-2 rounded-full bg-emerald-400 mt-1.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-neutral-800">{q.title || "Devis"}</span>
                  <span className={cx("px-2 py-0.5 rounded-full text-[11px] font-semibold", badgeCls(q.status, "quote"))}>{quoteStatusLabel[q.status] || q.status}</span>
                </div>
                <div className="text-[11px] text-neutral-500 flex gap-3">
                  {q.sentAt && <span>{new Date(q.sentAt).toLocaleDateString("fr-FR")}</span>}
                  {q.amount != null && <span>{fmtEUR(q.amount)}</span>}
                </div>
              </div>
              <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">Devis</span>
            </div>
          ))}
          {clientSites.map((s: any) => (
            <div key={s.id} className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-2.5 text-sm">
              <div className={cx("shrink-0 w-2 h-2 rounded-full mt-1.5", s.color || "bg-neutral-400")} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-neutral-800">{s.name}</span>
                  <span className={cx("px-2 py-0.5 rounded-full text-[11px] font-semibold", s.status === "archived" ? "bg-neutral-100 text-neutral-400" : s.status === "planned" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700")}>
                    {s.status === "archived" ? "Archivé" : s.status === "planned" ? "Planifié" : "À planifier"}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 flex gap-3">
                  {s.city && <span>{s.city}</span>}
                  {s.quoteSnapshot?.amount != null && <span>Budget : {fmtEUR(s.quoteSnapshot.amount)}</span>}
                </div>
              </div>
              <span className="text-[10px] text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded shrink-0">Chantier</span>
            </div>
          ))}
        </div>
        {!registeredClient && clientName && clientName.trim() && (
          <div className="border-t pt-3 mt-2">
            <Button variant="outline" size="sm" className="w-full" onClick={() => onSaveClient({ name: clientName.trim(), phone: "", email: "", notes: "" })}>
              + Enregistrer ce client
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ==================================
// Small helpers
// ==================================
function AddPerson({ onAdd, usedColors = [] }: { onAdd: (name: string, color: string, extra?: any) => void; usedColors?: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-7 h-7 rounded-full border border-neutral-300 bg-white text-neutral-500 hover:border-neutral-900 hover:text-neutral-900 hover:bg-neutral-50 flex items-center justify-center transition"
        title="Ajouter un salarié"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      <AddPersonDialog open={open} setOpen={setOpen} onAdd={onAdd} usedColors={usedColors} />
    </>
  );
}
function AddSite({ onAdd, usedColors = [] }: { onAdd: (name: string, planningWeeks: string[], color: string) => void; usedColors?: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-7 h-7 rounded-full border border-neutral-300 bg-white text-neutral-500 hover:border-neutral-900 hover:text-neutral-900 hover:bg-neutral-50 flex items-center justify-center transition shrink-0"
        title="Ajouter un chantier"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      <AddSiteDialog open={open} setOpen={setOpen} onAdd={onAdd} usedColors={usedColors} />
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
  const [absencesByDay, setAbsencesByDay] = useState<Record<string, Record<string, "CP" | "MAL" | "OFF">>>({});
  const [absenceExpandedId, setAbsenceExpandedId] = useState<string | null>(null);
  const [siteWeekVisibility, setSiteWeekVisibility] = useState<Record<string, string[]>>({});
  const [hoursPerDay, setHoursPerDay] = useState<number>(8);
  const [validatedWeeks, setValidatedWeeks] = useState<Record<string, string>>({});
  const [quotes, setQuotes] = useState<any[]>(() => DEMO_QUOTES.map(normalizeQuoteRecord));
  const [tenders, setTenders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientHistoryOpen, setClientHistoryOpen] = useState(false);
  const [clientHistoryName, setClientHistoryName] = useState<string>("");
  const [clientsCollapsed, setClientsCollapsed] = useState(true);
  const [clientAddFormOpen, setClientAddFormOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ name: "", phone: "", email: "" });
  const [batappliImportOpen, setBatappliImportOpen] = useState(false);
  const [sitesFilter, setSitesFilter] = useState<string>("all");
  const [sitesSort, setSitesSort] = useState<{ col: string; dir: "asc" | "desc" }>({ col: "name", dir: "asc" });
  const [sitesSearch, setSitesSearch] = useState("");
  const [aoFormOpen, setAoFormOpen] = useState(false);
  const [aoFilter, setAoFilter] = useState<"all" | "a_repondre" | "depose" | "gagne" | "perdu">("all");
  const [devisFormOpen, setDevisFormOpen] = useState(false);
  const [devisFilter, setDevisFilter] = useState<"all" | "active" | "accepted" | "refused" | "expired">("all");
  const [aoSort, setAoSort] = useState<{ col: string; dir: "asc" | "desc" }>({ col: "dateLimite", dir: "asc" });
  const [devisSort, setDevisSort] = useState<{ col: string; dir: "asc" | "desc" }>({ col: "sentAt", dir: "desc" });
  const [expandedTenderRows, setExpandedTenderRows] = useState<Set<string>>(new Set());
  const [newAo, setNewAo] = useState({ reference: "", client: "", objet: "", type: "prive" as "prive" | "public", dateLimite: "", montantEstime: "" });
  const [tauxJournalierDefault, setTauxJournalierDefault] = useState<number>(350);
  const [tauxMaterielDefault, setTauxMaterielDefault] = useState<number>(15);
  const [fraisFixesDefault, setFraisFixesDefault] = useState<number>(0);
  const [rentaSort, setRentaSort] = useState<{ col: string; dir: "asc" | "desc" }>({ col: "marge", dir: "desc" });
  const [expandedRentaRows, setExpandedRentaRows] = useState<Set<string>>(new Set());
  const [weekAssignPickerPersonId, setWeekAssignPickerPersonId] = useState<string | null>(null);
  const [rentaFilter, setRentaFilter] = useState<"active" | "all" | "archived">("active");
  const [rentaSearch, setRentaSearch] = useState("");
  const [rentaYear, setRentaYear] = useState<number | null>(null);
  const [rentaSettingsOpen, setRentaSettingsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string>("");
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const [exportType, setExportType] = useState<"planning" | "hours">("planning");
  const [exportPreset, setExportPreset] = useState<"week" | "month" | "year" | "custom">("month");
  const [exportStartDate, setExportStartDate] = useState<string>(toLocalKey(startOfMonthLocal(new Date())));
  const [exportEndDate, setExportEndDate] = useState<string>(toLocalKey(endOfMonthLocal(new Date())));
  const syncVersionRef = useRef<number>(0);
  const maintenanceRef = useRef<HTMLDivElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"exports" | "perso" | "maintenance">("exports");
  const [branding, setBranding] = useState<{
    logoText: string;
    logoImage: string | null;
    title: string;
    subtitle: string;
    accentColor: string;
    density: "normal" | "compact";
  }>(() => {
    const defaults = {
      logoText: "BT",
      logoImage: null,
      title: "BTP Planner",
      subtitle: "Tableau de bord & suivi collaboratif",
      accentColor: "#000000",
      density: "normal" as "normal" | "compact",
    };
    if (typeof window === "undefined") return defaults;
    try {
      const raw = window.localStorage.getItem("btp-planner-branding:v1");
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  });
  const brandingHydrated = useRef(false);
  useEffect(() => {
    if (!brandingHydrated.current) {
      brandingHydrated.current = true;
      return;
    }
    try { localStorage.setItem("btp-planner-branding:v1", JSON.stringify(branding)); } catch {}
  }, [branding]);
  // Undo stack — 20 snapshots max
  const undoStack = useRef<any[]>([]);
  const pushUndo = useCallback((snapshot: any) => {
    undoStack.current = [...undoStack.current.slice(-19), snapshot];
  }, []);
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
    if (selection && selection.length > 0) return selection.includes(wk);
    const site = Array.isArray(sites) ? sites.find((s: any) => s.id === siteId) : null;
    const planningWeeks: string[] = Array.isArray((site as any)?.planningWeeks) ? (site as any).planningWeeks : [];
    if (planningWeeks.length > 0) return planningWeeks.includes(wk);
    return true;
  }, [siteWeekVisibility, sites]);

  // View / navigation
  const [view, setView] = useState<
    "accueil" | "planning" | "hours" | "calendar" | "sites" | "salaries" | "rentabilite"
  >("accueil");
  const [planningView, setPlanningView] = useState<"week" | "month">("week");
  const [collapsedSites, setCollapsedSites] = useState<Set<string>>(new Set());
  const [sidebarChantierOpen, setSidebarChantierOpen] = useState(true);
  const [sidebarArchivedOpen, setSidebarArchivedOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const toggleSiteCollapsed = (id: string) =>
    setCollapsedSites((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const [timelineScope, setTimelineScope] = useState<"month" | "quarter" | "year">("month");
  const calendarScope = "projection" as const;
  const setCalendarScope = (_: any) => {};
  const [calFilterPlanned, setCalFilterPlanned] = useState(true);
  const [calFilterPending, setCalFilterPending] = useState(true);
  const [calFilterAbsences, setCalFilterAbsences] = useState(true);
  const [calFilterEvents, setCalFilterEvents] = useState(true);
  const [eventCalendars, setEventCalendars] = useState<{ id: string; name: string; color: string; visible: boolean; isDefault?: boolean }[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<
    { id: string; groupId?: string; title: string; dateKey: string; endDateKey?: string; calendarId?: string; color?: string; notes?: string }[]
  >([]);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [eventEditId, setEventEditId] = useState<string | null>(null);
  const [eventDraft, setEventDraft] = useState({
    title: "",
    dateKey: todayKey,
    endDateKey: "",
    weekKeys: [] as string[],
    calendarId: "cal-availability",
    color: "",
    notes: "",
    groupId: "",
  });
  const [eventWeekYear, setEventWeekYear] = useState(() => getISOWeekYear(new Date()));
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
  const publicHolidays = useMemo(() => {
    const year = anchor.getFullYear();
    const m = new Map([...getFrenchHolidaysWithBridges(year), ...getFrenchHolidaysWithBridges(year + 1)]);
    return m;
  }, [anchor]);
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
  const [dragging, setDragging] = useState(false);
  const [quoteDetail, setQuoteDetail] = useState<any | null>(null);
  const [quoteDetailOpen, setQuoteDetailOpen] = useState(false);
  const [quoteWeekPickerYear, setQuoteWeekPickerYear] = useState(() => getISOWeekYear(new Date()));
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
  const pendingSites = useMemo(() => safeSites.filter((s) => (s.status || "planned") === "pending"), [safeSites]);
  const archivedSites = useMemo(() => safeSites.filter((s) => s.status === "archived"), [safeSites]);
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
        const range = getSiteDateRange(site, todayKey);
        const s = fromLocalKey(range.startKey);
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
  const allSitesCollapsed = sitesForCurrentWeek.length > 0 && sitesForCurrentWeek.every((s) => collapsedSites.has(s.id));
  const toggleAllSites = () =>
    setCollapsedSites(allSitesCollapsed ? new Set() : new Set(sitesForCurrentWeek.map((s) => s.id)));

  // Chantiers à afficher dans la sidebar selon la vue (semaine ou mois)
  const sidebarVisiblePlannedSites = useMemo(() => {
    if (isPlanningWeek || view === "hours") {
      return plannedSites.filter((s) => isSiteVisibleOnWeek(s.id, currentWeekKey));
    }
    if (isPlanningMonth) {
      const monthWkKeys = new Set(monthWeeks.map((w: Date[]) => weekKeyOf(w[0])));
      return plannedSites.filter((s) =>
        Array.from(monthWkKeys).some((wk) => isSiteVisibleOnWeek(s.id, wk as string))
      );
    }
    return plannedSites;
  }, [isPlanningWeek, isPlanningMonth, view, plannedSites, isSiteVisibleOnWeek, currentWeekKey, monthWeeks]);

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
      const person = people.find((p: any) => p.id === a.personId);
      const effectiveBase = meta.hoursOverride != null && meta.hoursOverride !== ""
        ? Number(meta.hoursOverride)
        : (person?.hoursPerDay ?? hoursPerDay);
      const baseValue = Number.isFinite(effectiveBase) ? effectiveBase : 0;
      const portion = getPortion(a.portion);
      const suggestedHours = baseValue * portion;
      const hasCustomHours = a.hours !== undefined && a.hours !== null && a.hours !== "";
      const parsedCustom = Number(a.hours);
      const hours = hasCustomHours && Number.isFinite(parsedCustom) ? parsedCustom : suggestedHours;
      return { meta, portion, hours, suggestedHours, hasCustomHours, baseValue };
    },
    [getCellMeta, hoursPerDay, people]
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

  const weekConfirmedStats = useMemo(() => {
    const dateSet = new Set(weekDateKeys);
    const weekAssignments = assignments.filter((a: any) => dateSet.has(a.date));
    const confirmed = weekAssignments.filter((a: any) => a.confirmed).length;
    const planned = weekAssignments.length - confirmed;
    return { confirmed, planned, total: weekAssignments.length };
  }, [assignments, weekDateKeys]);

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
        const { startKey, endKey } = getSiteDateRange(site, todayKey);
        const start = fromLocalKey(startKey).getTime();
        const end = fromLocalKey(endKey).getTime();
        return start <= weekEnd && end >= weekStart;
      });
      const pending = visiblePendingSites.filter((site) => {
        const { startKey, endKey } = getSiteDateRange(site, todayKey);
        const start = fromLocalKey(startKey).getTime();
        const end = fromLocalKey(endKey).getTime();
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
  const eventWeekOptions = useMemo(() => {
    const totalWeeks = getISOWeeksInYear(eventWeekYear);
    return Array.from({ length: totalWeeks }, (_, idx) => {
      const weekNum = idx + 1;
      return `${eventWeekYear}-W${pad2(weekNum)}`;
    });
  }, [eventWeekYear]);
  const quoteWeeksInYear = useMemo(() => Math.max(54, getISOWeeksInYear(quoteWeekPickerYear)), [quoteWeekPickerYear]);
  const quoteWeeksList = useMemo(
    () => Array.from({ length: quoteWeeksInYear }, (_, idx) => idx + 1),
    [quoteWeeksInYear]
  );

  const calendarPlannedInMonth = useMemo(
    () =>
      visiblePlannedSites.filter((site) => {
        const { startKey, endKey } = getSiteDateRange(site, todayKey);
        const start = fromLocalKey(startKey);
        const end = fromLocalKey(endKey);
        return start.getTime() <= calendarWindow.end.getTime() && end.getTime() >= calendarWindow.start.getTime();
      }),
    [calendarWindow.end, calendarWindow.start, visiblePlannedSites, todayKey]
  );
  const calendarPendingInMonth = useMemo(
    () =>
      visiblePendingSites.filter((site) => {
        const { startKey, endKey } = getSiteDateRange(site, todayKey);
        const start = fromLocalKey(startKey);
        const end = fromLocalKey(endKey);
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
          const { startKey, endKey } = getSiteDateRange(site, todayKey);
          const start = fromLocalKey(startKey);
          const end = fromLocalKey(endKey);
          return isDateWithin(day, start, end);
        });
      } else {
        plannedMap[key] = [];
      }
      if (pendingVisible) {
        pendingMap[key] = visiblePendingSites.filter((site) => {
          const { startKey, endKey } = getSiteDateRange(site, todayKey);
          const start = fromLocalKey(startKey);
          const end = fromLocalKey(endKey);
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


  const ganttTimeline = useMemo(() => {
    if (!timelineView)
      return { rows: [] as { site: any; bar: { days: number; offsetPct: number; widthPct: number; start: Date; end: Date }; bucketOverlap: { label: string; days: number; pct: number }[] }[], totalDays: 0 };

    const totalDays = Math.max(1, countWorkingDaysInclusive(timelineView.start, timelineView.end));

    const rows = timelinePlannedSites
      .map((site) => {
        const { startKey, endKey } = getSiteDateRange(site, todayKey);
        const siteStart = fromLocalKey(startKey);
        const siteEnd = fromLocalKey(endKey);
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
          const { startKey, endKey } = getSiteDateRange(site, todayKey);
          const siteStart = fromLocalKey(startKey);
          const siteEnd = fromLocalKey(endKey);
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
      .map((q) => {
        const range = getQuoteWeekRange(q);
        return range ? { quote: q, startKey: range.startKey } : null;
      })
      .filter(Boolean)
      .filter((entry: any) => fromLocalKey(entry.startKey).getTime() >= now.getTime())
      .filter((entry: any) => fromLocalKey(entry.startKey).getTime() <= soon.getTime())
      .sort((a: any, b: any) => fromLocalKey(a.startKey).getTime() - fromLocalKey(b.startKey).getTime())
      .map((entry: any) => entry.quote)
      .slice(0, 4);
  }, [actionableQuotes]);

  const backlogQuotes = useMemo(
    () => actionableQuotes.filter((q) => !Array.isArray(q.planningWeeks) || q.planningWeeks.length === 0).slice(0, 3),
    [actionableQuotes]
  );

  const pendingSiteHighlights = useMemo(
    () =>
      [...pendingSites]
        .sort((a, b) => {
          const aRange = getSiteDateRange(a, todayKey);
          const bRange = getSiteDateRange(b, todayKey);
          return fromLocalKey(aRange.startKey).getTime() - fromLocalKey(bRange.startKey).getTime();
        })
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
      setEventCalendars((prev) => [...prev, { id, name, color: calendarDraft.color || COLORS[0], visible: true, isDefault: false }]);
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
    if (!title || eventDraft.weekKeys.length === 0) return;
    const selectedCalendar = eventCalendarsById[eventDraft.calendarId] || eventCalendarsById["cal-availability"];
    const groupId = eventDraft.groupId || `grp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const eventsFromWeeks = eventDraft.weekKeys.map((weekKey) => {
      const [yearRaw, weekRaw] = weekKey.split("-W");
      const year = Number(yearRaw);
      const weekNum = Number(weekRaw);
      const weekStart = getISOWeekStart(year, weekNum);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 4);
      return {
        id: ensureId(`${groupId}-${weekKey}`, "evt"),
        groupId,
        title,
        dateKey: toLocalKey(weekStart),
        endDateKey: toLocalKey(weekEnd),
        calendarId: selectedCalendar?.id,
        color: selectedCalendar?.color,
        notes: eventDraft.notes || undefined,
      };
    });
    setCalendarEvents((prev) => {
      // Remove all events in the same group (or just the edited one if no groupId)
      const cleaned = eventDraft.groupId
        ? prev.filter((evt) => evt.groupId !== eventDraft.groupId)
        : eventEditId
        ? prev.filter((evt) => evt.id !== eventEditId)
        : prev;
      return [...cleaned, ...eventsFromWeeks];
    });
    setEventDraft((prev) => ({
      ...prev,
      title: "",
      notes: "",
      weekKeys: [],
      endDateKey: "",
      dateKey: prev.dateKey || todayKey,
      color: "",
      groupId: "",
      calendarId: prev.calendarId || "cal-availability",
    }));
    setEventEditId(null);
    setEventDialogOpen(false);
  }, [eventCalendarsById, eventDraft, eventEditId]);

  const openEventDialogForEvent = useCallback((event: any) => {
    const gid = event.groupId;
    // Collect all weekKeys from events in the same group, sorted by date
    const groupEvents = gid
      ? calendarEvents.filter((e) => e.groupId === gid).sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      : [event];
    const allWeekKeys = groupEvents.map((e) => weekKeyOf(fromLocalKey(e.dateKey)));
    const parsedDate = fromLocalKey(event.dateKey);
    setEventWeekYear(getISOWeekYear(parsedDate));
    setEventEditId(event.id);
    setEventDraft((prev) => ({
      ...prev,
      title: event.title || "",
      dateKey: event.dateKey || todayKey,
      endDateKey: event.endDateKey || "",
      weekKeys: allWeekKeys,
      notes: event.notes || "",
      color: "",
      groupId: gid || "",
      calendarId: event.calendarId || "cal-availability",
    }));
    setEventDialogOpen(true);
  }, [calendarEvents]);

  const deleteCalendarEvent = useCallback(() => {
    if (!eventEditId) return;
    setCalendarEvents((prev) => {
      const evt = prev.find((e) => e.id === eventEditId);
      return evt?.groupId
        ? prev.filter((e) => e.groupId !== evt.groupId)
        : prev.filter((e) => e.id !== eventEditId);
    });
    setEventEditId(null);
    setEventDialogOpen(false);
  }, [eventEditId]);
  const openEventDialogForDate = useCallback((dateKey: string) => {
    const parsedDate = fromLocalKey(dateKey);
    setEventWeekYear(getISOWeekYear(parsedDate));
    setEventDraft((prev) => ({
      ...prev,
      title: "",
      dateKey,
      endDateKey: "",
      weekKeys: [],
      notes: "",
      color: "",
      calendarId: prev.calendarId || "cal-availability",
    }));
    setEventDialogOpen(true);
  }, []);

  // Gestion des devis (kanban)
  const normalizeQuoteForSave = useCallback((quote: any) => normalizeQuoteRecord(quote), []);

  const upsertChantierFromQuote = useCallback(
    (quote: any) => {
      const normalizedQuote = normalizeQuoteForSave(quote);
      if (!normalizedQuote || normalizedQuote.status !== "won") return;
      if (normalizedQuote.chantierDeleted === true) return;
      const snapshot = {
        title: normalizedQuote.title,
        client: normalizedQuote.client,
        amount: normalizedQuote.amount,
        note: normalizedQuote.note,
        planningWeeks: normalizedQuote.planningWeeks,
      };
      const derived = getQuoteWeekRange(normalizedQuote);
      const baseStart = derived?.startKey || normalizedQuote.sentAt || todayKey;
      const baseEnd = derived?.endKey || baseStart;

      setSites((prev) => {
        const existing = prev.find((s) => s.quoteId === normalizedQuote.id);
        if (existing) {
          const updated = normalizeSiteRecord({
            ...existing,
            name: existing.name || normalizedQuote.title || "Chantier issu d'un devis",
            startDate: existing.startDate || baseStart,
            endDate: existing.endDate || baseEnd,
            planningWeeks: existing.planningWeeks?.length ? existing.planningWeeks : normalizedQuote.planningWeeks,
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
          planningWeeks: normalizedQuote.planningWeeks,
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
    const normalized = normalizeQuoteRecord(quote);
    setQuoteDetail(normalized);
    const firstWeek = Array.isArray(normalized.planningWeeks) ? normalized.planningWeeks[0] : null;
    const parsed = firstWeek ? parseWeekKey(firstWeek) : null;
    setQuoteWeekPickerYear(parsed?.year || getISOWeekYear(new Date()));
    setQuoteDetailOpen(true);
  }, []);

  const toggleQuoteWeek = useCallback((wkKey: string) => {
    setQuoteDetail((prev: any) => {
      if (!prev) return prev;
      const current = Array.isArray(prev.planningWeeks) ? prev.planningWeeks : [];
      const next = current.includes(wkKey) ? current.filter((w: string) => w !== wkKey) : [...current, wkKey];
      return { ...prev, planningWeeks: next };
    });
  }, []);

  const saveQuoteDetail = useCallback(() => {
    if (!quoteDetail) return;
    const normalized = normalizeQuoteForSave(quoteDetail);
    setQuotes((prev) => prev.map((q) => (q.id === normalized.id ? normalized : q)));
    upsertChantierFromQuote(normalized);
    setSites((prev) => {
      const hasLinked = prev.some((s) => s.quoteId === normalized.id);
      if (hasLinked) {
        return prev.map((s) =>
          s.quoteId === normalized.id
            ? { ...s, quoteSnapshot: { ...s.quoteSnapshot, amount: normalized.amount, title: normalized.title, client: normalized.client } }
            : s
        );
      }
      return prev;
    });
    if (sites.some((s) => s.quoteId === normalized.id)) {
      showToast("Budget du chantier lié mis à jour");
    }
    setQuoteDetailOpen(false);
  }, [normalizeQuoteForSave, quoteDetail, upsertChantierFromQuote, sites]);

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

  const createSiteFromQuote = useCallback((quote: any) => {
    const id = typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `site-${Date.now()}`;
    const colorIndex = hashString(String(quote.id || quote.title || Date.now())) % SITE_COLORS.length;
    const newSite = normalizeSiteRecord({
      id,
      name: quote.title || "Chantier",
      clientName: quote.client || "",
      clientId: quote.clientId || undefined,
      startDate: toLocalKey(new Date()),
      endDate: toLocalKey(new Date()),
      planningWeeks: Array.isArray(quote.planningWeeks) ? quote.planningWeeks : [],
      color: SITE_COLORS[colorIndex] || SITE_COLORS[0],
      quoteId: quote.id,
      quoteSnapshot: { title: quote.title, client: quote.client, amount: quote.amount },
      status: "pending",
    });
    setSites(prev => [...prev, newSite]);
    setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, siteId: id } : q));
    setView("sites");
    showToast(`Chantier "${newSite.name}" créé`);
  }, []);

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
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  useEffect(() => {
    if (!weekAssignPickerPersonId) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement)?.closest?.('[data-week-picker]')) {
        setWeekAssignPickerPersonId(null);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [weekAssignPickerPersonId]);

  useEffect(() => {
    if (!dragging) return;
    const onTouchMove = (event: TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest?.('[data-dnd-scope="planning"]')) return;
      event.preventDefault();
    };
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => document.removeEventListener("touchmove", onTouchMove);
  }, [dragging]);

  const isAbsentOnWeek = (pid: string, wk: string) => Boolean(absencesByWeek[wk]?.[pid]);
  const toggleAbsentThisWeek = (pid: string) => {
    setAbsencesByWeek((prev) => {
      const week = { ...(prev[currentWeekKey] || {}) };
      week[pid] = !week[pid];
      return { ...prev, [currentWeekKey]: week };
    });
  };

  const getDayAbsence = (pid: string, dateKey: string): AbsenceType | null =>
    (absencesByDay[dateKey]?.[pid] as AbsenceType) || null;

  const cycleDayAbsence = (pid: string, dateKey: string) => {
    const current = getDayAbsence(pid, dateKey);
    const idx = current ? ABSENCE_TYPES.indexOf(current) : -1;
    const next = idx < ABSENCE_TYPES.length - 1 ? ABSENCE_TYPES[idx + 1] : null;
    setAbsencesByDay((prev) => {
      const day = { ...(prev[dateKey] || {}) };
      if (next) day[pid] = next; else delete day[pid];
      return { ...prev, [dateKey]: day };
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

    if (data.type === "calendar-event" && over.data?.current?.type === "calendar-week") {
      const fromWeekKey: string = data.fromWeekKey;
      const toWeekKey: string = over.data.current.weekKey;
      if (fromWeekKey === toWeekKey) return;
      const eventId: string = data.eventId;
      const fromParsed = parseWeekKey(fromWeekKey);
      const toParsed = parseWeekKey(toWeekKey);
      if (!fromParsed || !toParsed) return;
      const deltaDays = ((toParsed.year * 53 + toParsed.week) - (fromParsed.year * 53 + fromParsed.week)) * 7;
      const shiftDk = (dk: string | undefined): string => {
        if (!dk) return dk ?? "";
        try { const d = fromLocalKey(dk); d.setDate(d.getDate() + deltaDays); return toLocalKey(d); } catch { return dk; }
      };
      // Find the groupId of the dragged event and shift ALL events in the group
      const draggedEvt = calendarEvents.find((e) => e.id === eventId);
      const gid = draggedEvt?.groupId;
      setCalendarEvents((prev) => prev.map((evt) => {
        const shouldShift = gid ? evt.groupId === gid : evt.id === eventId;
        return shouldShift ? { ...evt, dateKey: shiftDk(evt.dateKey), endDateKey: shiftDk(evt.endDateKey) } : evt;
      }));
      return;
    }

    if (data.type === "calendar-site" && over.data?.current?.type === "calendar-week") {
      const fromWeekKey: string = data.fromWeekKey;
      const toWeekKey: string = over.data.current.weekKey;
      if (fromWeekKey === toWeekKey) return;
      const siteId: string = data.siteId;
      // Compute delta in ISO weeks
      const fromParsed = parseWeekKey(fromWeekKey);
      const toParsed = parseWeekKey(toWeekKey);
      if (!fromParsed || !toParsed) return;
      const fromAbs = fromParsed.year * 53 + fromParsed.week;
      const toAbs = toParsed.year * 53 + toParsed.week;
      const deltaDays = (toAbs - fromAbs) * 7;
      const shiftWeekKey = (wk: string): string => {
        const parsed = parseWeekKey(wk);
        if (!parsed) return wk;
        const d = isoWeekStart(parsed.year, parsed.week);
        d.setDate(d.getDate() + deltaDays);
        return weekKeyOf(d);
      };
      setSites((prev: any[]) => prev.map((s: any) => {
        if (s.id !== siteId) return s;
        const newPlanningWeeks = Array.isArray(s.planningWeeks)
          ? s.planningWeeks.map(shiftWeekKey)
          : s.planningWeeks;
        // Shift startDate / endDate
        const shiftDateKey = (dk: string | null | undefined): string | null => {
          if (!dk) return dk ?? null;
          try {
            const d = fromLocalKey(dk);
            d.setDate(d.getDate() + deltaDays);
            return toLocalKey(d);
          } catch { return dk; }
        };
        return {
          ...s,
          planningWeeks: newPlanningWeeks,
          startDate: shiftDateKey(s.startDate),
          endDate: shiftDateKey(s.endDate),
        };
      }));
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
    | { type: 'person' | 'site'; id: string; name: string; color?: string }
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
    pushUndo(snapshotNow());
    setPeople((p) => p.filter((x) => x.id !== id));
    setAssignments((as) => as.filter((a) => a.personId !== id));
    setAbsencesByWeek((prev) => { const next: typeof prev = { ...prev }; for (const wk of Object.keys(next)) { if (next[wk] && Object.prototype.hasOwnProperty.call(next[wk], id)) { const { [id]: _omit, ...rest } = next[wk]; (next as any)[wk] = rest; } } return next; });
  };
  const addSite = (name: string, planningWeeks: string[], color: string) => {
    const derived = planningWeeks.length ? getWeekRangeFromKeys(planningWeeks) : null;
    const startDate = derived?.startKey || toLocalKey(new Date());
    const endDate = derived?.endKey || startDate;
    const id =
      typeof crypto !== "undefined" && (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : `s${Date.now()}`;
    setSites((s) => [
      ...s,
      normalizeSiteRecord({
        id,
        name,
        startDate,
        endDate,
        color,
        status: "planned",
        planningWeeks,
      }),
    ]);
    if (planningWeeks.length > 0) {
      setSiteWeekVisibility((prev) => ({ ...prev, [id]: planningWeeks }));
    }
  };
  const duplicateSite = (id: string) => {
    const original = safeSites.find((s) => s.id === id);
    if (!original) return;
    const newId = ensureId(original.name + "-copy", "site");
    const copy = normalizeSiteRecord({ ...original, id: newId, name: `${original.name} (copie)`, status: "planned" });
    setSites((prev) => [...prev, copy]);
    setSiteWeekVisibility((prev) => original.planningWeeks?.length ? { ...prev, [newId]: original.planningWeeks } : prev);
    showToast(`"${original.name}" dupliqué`);
  };
  const removeSite = (id: string) => {
    pushUndo(snapshotNow());
    const removed = sites.find((x: any) => x.id === id);
    setSites((s) => s.filter((x) => x.id !== id));
    setAssignments((as) => as.filter((a) => a.siteId !== id));
    setNotes((prev) => { const next = { ...prev } as Record<string, any>; Object.keys(next).forEach((k) => { if (k.startsWith(`${id}|`)) delete (next as any)[k]; }); return next; });
    setSiteWeekVisibility((prev) => { const { [id]: _omit, ...rest } = prev; return rest; });
    const linkedQuoteId = (removed as any)?.quoteId;
    if (linkedQuoteId) {
      setQuotes((prev) => prev.map((q: any) => (q.id === linkedQuoteId ? { ...q, chantierDeleted: true, siteId: null } : q)));
    }
  };
  const updateSiteMeta = (id: string, patch: any) =>
    setSites((s) => s.map((x) => (x.id === id ? normalizeSiteRecord({ ...x, ...patch }) : x)));

  const openClientHistory = (name: string) => {
    if (!name || !name.trim()) return;
    setClientHistoryName(name.trim());
    setClientHistoryOpen(true);
  };
  const saveClient = (clientData: any) => {
    const normalized = normalizeClientRecord(clientData);
    setClients((prev) => {
      const idx = prev.findIndex((c) => c.id === normalized.id || c.name.toLowerCase() === normalized.name.toLowerCase());
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...prev[idx], ...normalized };
        return updated;
      }
      return [...prev, normalized];
    });
    showToast(`Client "${normalized.name}" enregistré`);
  };
  const planSite = (id: string, weeks: string[] = []) => {
    const derived = weeks.length ? getWeekRangeFromKeys(weeks) : null;
    setSites((s) =>
      s.map((x) =>
        x.id === id
          ? normalizeSiteRecord({
              ...x,
              status: "planned",
              startDate: derived?.startKey || x.startDate,
              endDate: derived?.endKey || x.endDate,
              planningWeeks: weeks.length ? weeks : x.planningWeeks,
            })
          : x
      )
    );
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
    setPeople(prev => {
      const incoming = toArray(state.people, DEMO_PEOPLE).map(normalizePersonRecord);
      return incoming.map((p: any) => {
        const existing = prev.find((x: any) => x.id === p.id);
        if (existing && p.tauxJournalier == null && existing.tauxJournalier != null) {
          return { ...p, tauxJournalier: existing.tauxJournalier };
        }
        return p;
      });
    });
    const rawSites = toArray(state.sites, []);
    const OLD_DEMO_IDS = new Set(["s1", "s2"]);
    const hasOnlyOldDemo = rawSites.length > 0 && rawSites.every((s: any) => OLD_DEMO_IDS.has(s.id));
    const alreadySeeded2026 = state.chantiersSeeded2026 === true;
    let mergedSites: any[];
    if (rawSites.length === 0 || hasOnlyOldDemo) {
      mergedSites = DEMO_SITES;
    } else if (!alreadySeeded2026) {
      const existingIds = new Set(rawSites.map((s: any) => s.id));
      const additions = DEMO_SITES.filter((s) => !existingIds.has(s.id));
      mergedSites = [...rawSites, ...additions];
    } else {
      mergedSites = rawSites;
    }
    setSites(mergedSites.map(normalizeSiteRecord));
    setAssignments(toArray(state.assignments).map((a: any) => ({ ...a, confirmed: a.confirmed ?? false })));
    setNotes(state.notes || {});
    setAbsencesByWeek(state.absencesByWeek || {});
    setAbsencesByDay(state.absencesByDay || {});
    setSiteWeekVisibility(state.siteWeekVisibility || {});
    setHoursPerDay(state.hoursPerDay ?? 8);
    setQuotes(toArray(state.quotes, DEMO_QUOTES).map(normalizeQuoteRecord));
    setTenders(toArray(state.tenders).map(normalizeTenderRecord));
    setClients(toArray(state.clients).map(normalizeClientRecord));
    if (state.tauxJournalierDefault != null) setTauxJournalierDefault(state.tauxJournalierDefault);
    if (state.tauxMaterielDefault != null) setTauxMaterielDefault(state.tauxMaterielDefault);
    if (state.fraisFixesDefault != null) setFraisFixesDefault(state.fraisFixesDefault);
    if (state.validatedWeeks && typeof state.validatedWeeks === "object") setValidatedWeeks(state.validatedWeeks);
    if (Array.isArray(state.eventCalendars)) setEventCalendars(state.eventCalendars);
    if (Array.isArray(state.calendarEvents)) setCalendarEvents(state.calendarEvents);
    syncVersionRef.current = Number(state.updatedAt || 0);
  }, []);

  const firstLoad = useRef(true);
  const localStateKey = useMemo(() => `btp-planner-state:v1:${currentWeekKey}`, [currentWeekKey]);

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
          const raw = localStorage.getItem(localStateKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (hasPayload(parsed)) {
              localState = parsed;
            }
          }
        } catch {}

        // Priorité serveur, mais on protège le cas "serveur stale" (ex: PUT échoué localement).
        // Si le cache local est plus récent, on garde le local pour éviter de perdre les dernières modifs.
        let chosen: any = null;
        if (remoteState && localState) {
          const remoteTs = Number(remoteState.updatedAt || 0);
          const localTs = Number(localState.updatedAt || 0);
          chosen = localTs > remoteTs ? localState : remoteState;
        } else if (remoteState) {
          chosen = remoteState;
        } else if (localState) {
          chosen = localState;
        }
        if (chosen || SEED_ASSIGNMENTS_BY_WEEK_V1[wk]) {
          applyState(augmentStateWithRosterSeed(chosen || {}, wk));
        }
      } finally {
        if (markLoaded) firstLoad.current = false;
        setRefreshing(false);
      }
    },
    [applyState, currentWeekKey, localStateKey]
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

// Supabase Realtime — sync multi-client
useEffect(() => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const channel = supabase
    .channel(`planner:${currentWeekKey}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "planner_state", filter: `key=eq.${currentWeekKey}` },
      (payload: any) => {
        const remote = payload.new?.data;
        if (!remote) return;
        const remoteClient = remote.clientId;
        const remoteVersion = Number(remote.updatedAt || 0);
        if (remoteClient === clientIdRef.current) return; // c'est notre propre update
        if (remoteVersion <= syncVersionRef.current) return; // on a déjà plus récent
        applyState(remote, false);
        syncVersionRef.current = remoteVersion;
        setSyncStatus("synced");
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [currentWeekKey, applyState]);

const saveRemote = useMemo(() => debounce(async (wk: string, payload: any) => {
  try {
    const res = await fetch(`/api/state/${wk}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`saveRemote failed: ${res.status}`);
  } catch (err) {
    console.error("Autosave distant impossible", err);
  }
}, 600), []);

  const buildSyncPayload = useCallback((stamp: number) => ({
    people,
    sites,
    assignments,
    notes,
    absencesByWeek,
    absencesByDay,
    siteWeekVisibility,
    hoursPerDay,
    quotes,
    tenders,
    clients,
    tauxJournalierDefault,
    tauxMaterielDefault,
    fraisFixesDefault,
    eventCalendars,
    calendarEvents,
    validatedWeeks,
    chantiersSeeded2026: true,
    [ROSTER_SEED_FLAG]: true,
    updatedAt: stamp,
    clientId: clientIdRef.current,
  }), [people, sites, assignments, notes, absencesByWeek, absencesByDay, siteWeekVisibility, hoursPerDay, quotes, tenders, clients, tauxJournalierDefault, tauxMaterielDefault, fraisFixesDefault, eventCalendars, calendarEvents, validatedWeeks]);

  const snapshotNow = useCallback(() => ({
    people, sites, assignments, notes, absencesByWeek, siteWeekVisibility, hoursPerDay, quotes, eventCalendars, calendarEvents,
  }), [people, sites, assignments, notes, absencesByWeek, siteWeekVisibility, hoursPerDay, quotes, eventCalendars, calendarEvents]);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) { showToast("Rien à annuler"); return; }
    const prev = undoStack.current[undoStack.current.length - 1];
    undoStack.current = undoStack.current.slice(0, -1);
    applyState(prev);
    showToast("Action annulée");
  }, [applyState]);

  const savePlanning = useCallback(async () => {
    const stamp = Date.now();
    syncVersionRef.current = stamp;
    const payload = buildSyncPayload(stamp);
    try { localStorage.setItem(localStateKey, JSON.stringify(payload)); } catch {}
    setSaving(true);
    setSyncStatus("syncing");
    setSaveStatusMessage("");
    try {
      const res = await fetch(`/api/state/${currentWeekKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`savePlanning failed: ${res.status}`);
      setSyncStatus("synced");
    } catch (err) {
      console.error("Enregistrement distant impossible", err);
      setSyncStatus("error");
      setSaveStatusMessage("Impossible d'enregistrer sur le serveur.");
    } finally {
      setSaving(false);
    }
  }, [buildSyncPayload, currentWeekKey, localStateKey]);

// Sauvegarder à chaque modif
useEffect(() => {
  if (firstLoad.current) return;
  const stamp = Date.now();
  syncVersionRef.current = stamp;
  const payload = buildSyncPayload(stamp);
  // cache local (backup + rapidité)
  try { localStorage.setItem(localStateKey, JSON.stringify(payload)); } catch {}
  // serveur (par semaine)
  saveRemote(currentWeekKey, payload);
}, [buildSyncPayload, currentWeekKey, localStateKey, saveRemote]);

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
  const getExportRange = () => {
    const now = new Date();
    if (exportPreset === "week") {
      const start = weekDays[0];
      const end = weekDays[weekDays.length - 1];
      return { startKey: toLocalKey(start), endKey: toLocalKey(end), label: currentWeekKey };
    }
    if (exportPreset === "month") {
      const start = startOfMonthLocal(now);
      const end = endOfMonthLocal(now);
      return { startKey: toLocalKey(start), endKey: toLocalKey(end), label: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}` };
    }
    if (exportPreset === "year") {
      const start = startOfYearLocal(now.getFullYear());
      const end = endOfYearLocal(now.getFullYear());
      return { startKey: toLocalKey(start), endKey: toLocalKey(end), label: `${now.getFullYear()}` };
    }
    const startKey = exportStartDate || toLocalKey(startOfMonthLocal(now));
    const endKey = exportEndDate || startKey;
    return fromLocalKey(endKey) < fromLocalKey(startKey)
      ? { startKey: endKey, endKey: startKey, label: `${endKey}_au_${startKey}` }
      : { startKey, endKey, label: `${startKey}_au_${endKey}` };
  };
  const isDateInRange = (dateKey: string, startKey: string, endKey: string) => dateKey >= startKey && dateKey <= endKey;

  const buildExportRows = () => {
    const range = getExportRange();
    const filtered = assignments
      .filter((a) => isDateInRange(a.date, range.startKey, range.endKey))
      .sort((a, b) => (a.date === b.date ? a.siteId.localeCompare(b.siteId) || a.personId.localeCompare(b.personId) : a.date.localeCompare(b.date)));

    const conflictCounts: Record<string, number> = {};
    filtered.forEach((a) => {
      const key = `${a.personId}|${a.date}`;
      conflictCounts[key] = (conflictCounts[key] || 0) + 1;
    });

    const rows = filtered
      .map((a) => {
        const person = peopleById[a.personId];
        const site = sitesById[a.siteId];
        if (!person || !site) return null;
        const info = getAssignmentHoursInfo(a);
        if (info.meta.holiday || info.meta.blocked) return null;
        const dateObj = fromLocalKey(a.date);
        const { week, isoYear } = getISOWeekAndYear(dateObj);
        return {
          isoYear,
          week,
          dateKey: a.date,
          person: person.name,
          site: site.name,
          portion: Number.isFinite(info.portion) ? info.portion : 0,
          hours: Number.isFinite(info.hours) ? info.hours : 0,
          conflict: (conflictCounts[`${a.personId}|${a.date}`] || 0) > 1,
          source: info.hasCustomHours ? "manuel" : info.meta.hoursOverride ? "case" : "global",
        };
      })
      .filter(Boolean) as any[];

    return { rows, range };
  };

  const exportPlanningCSV = () => {
    const { rows, range } = buildExportRows();
    if (rows.length === 0) {
      window.alert("Aucune affectation exportable sur la période choisie.");
      return;
    }
    const header = ["Année ISO", "Semaine", "Date", "Salarié", "Chantier", "Portion"];
    const csvRows = rows.map((row) => [row.isoYear, `S${pad2(row.week)}`, row.dateKey, row.person, row.site, row.portion]);
    const csv = [header, ...csvRows].map((line) => line.map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planning-${range.label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportHoursCSV = () => {
    const { rows, range } = buildExportRows();
    if (rows.length === 0) {
      window.alert("Aucune ligne exportable sur la période choisie.");
      return;
    }

    const header = ["Année ISO", "Semaine", "Date", "Salarié", "Chantier", "Portion", "Heures", "Conflit", "Source heures"];
    const csvRows = rows.map((row) => {
      const conflict = row.conflict ? "Conflit" : "";
      const sourceLabel = row.source === "global"
        ? `global (${hoursPerDay}h/j)`
        : row.source === "case"
        ? "heures de la case"
        : "manuel";
      return [row.isoYear, `S${pad2(row.week)}`, row.dateKey, row.person, row.site, row.portion, row.hours, conflict, sourceLabel];
    });

    const csv = [header, ...csvRows]
      .map((line) => line.map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `heures-${range.label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openExportDialog = (type: "planning" | "hours") => {
    setExportType(type);
    setExportDialogOpen(true);
  };

  const runExport = () => {
    if (exportType === "hours") exportHoursCSV();
    else exportPlanningCSV();
    setExportDialogOpen(false);
  };

  const exportJSON = () => {
    const payload = { people, sites, assignments, notes, absencesByWeek, absencesByDay, siteWeekVisibility, hoursPerDay, quotes, tenders, clients, tauxJournalierDefault, tauxMaterielDefault, fraisFixesDefault, eventCalendars, calendarEvents, validatedWeeks };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `btp-planner-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const onImport = (e: any) => {
    const f = e.target.files?.[0]; if(!f) return; const reader = new FileReader();
    reader.onload = () => { try { const data = JSON.parse(String(reader.result)); setPeople(toArray(data.people, DEMO_PEOPLE).map(normalizePersonRecord)); setSites(toArray(data.sites).map(normalizeSiteRecord)); setAssignments(toArray(data.assignments).map((a: any) => ({ ...a, confirmed: a.confirmed ?? false }))); setNotes(data.notes||{}); setAbsencesByWeek(data.absencesByWeek||{}); setAbsencesByDay(data.absencesByDay||{}); setSiteWeekVisibility(data.siteWeekVisibility||{}); setHoursPerDay(data.hoursPerDay ?? 8); setQuotes(toArray(data.quotes, DEMO_QUOTES).map(normalizeQuoteRecord)); setTenders(toArray(data.tenders).map(normalizeTenderRecord)); setClients(toArray(data.clients).map(normalizeClientRecord)); if (data.tauxJournalierDefault != null) setTauxJournalierDefault(data.tauxJournalierDefault); if (data.tauxMaterielDefault != null) setTauxMaterielDefault(data.tauxMaterielDefault); if (data.fraisFixesDefault != null) setFraisFixesDefault(data.fraisFixesDefault); setEventCalendars(toArray(data.eventCalendars)); setCalendarEvents(toArray(data.calendarEvents)); if (data.validatedWeeks && typeof data.validatedWeeks === "object") setValidatedWeeks(data.validatedWeeks); } catch { alert("Fichier invalide"); } };
    reader.readAsText(f); e.target.value = '';
  };

  // ==========================
  // UI (Semaine / Mois / Heures)
  // ==========================
  return (
    <div className="p-4 md:p-6 space-y-4 min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="space-y-2">
        <Tabs value={view} onValueChange={(v: any) => setView(v)}>
          {/* Navbar unique */}
          <div className="rounded-xl border bg-white shadow-sm px-4 py-2.5 flex items-center gap-3 flex-wrap">
            {/* Logo */}
            <div className="flex items-center gap-2.5 pr-4 border-r border-neutral-100 shrink-0">
              {branding.logoImage ? (
                <img src={branding.logoImage} alt="logo" className="h-8 w-8 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="h-8 w-8 rounded-lg text-white flex items-center justify-center font-bold text-sm shrink-0" style={{ backgroundColor: branding.accentColor }}>
                  {branding.logoText}
                </div>
              )}
              <span className="text-sm font-semibold text-neutral-800 hidden sm:block">{branding.title}</span>
            </div>

            {/* Nav principale */}
            <div className="flex items-center gap-0.5">
              {[
                { v: "accueil", label: "Accueil", icon: <Home className="w-3.5 h-3.5" /> },
                { v: "planning", label: "Planning", icon: <CalendarRange className="w-3.5 h-3.5" /> },
                { v: "hours", label: "Heures", icon: <Clock3 className="w-3.5 h-3.5" /> },
                { v: "calendar", label: "Calendrier", icon: <CalendarRange className="w-3.5 h-3.5" /> },
              ].map(({ v, label, icon }) => (
                <button
                  key={v}
                  onClick={() => setView(v as any)}
                  className={cx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition",
                    view === v
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
                  )}
                >{icon}{label}</button>
              ))}
            </div>

            {/* Séparateur */}
            <div className="w-px h-5 bg-neutral-200 shrink-0" />

            {/* Gestion */}
            <div className="flex items-center gap-0.5">
              {[
                { v: "sites", label: "Chantiers" },
                { v: "salaries", label: "Salariés" },
                { v: "rentabilite", label: "Rentabilité" },
              ].map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => setView(v as any)}
                  className={cx(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition",
                    view === v
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
                  )}
                >{label}</button>
              ))}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Sync + actions */}
            <div className="flex items-center gap-2 shrink-0">
              {syncStatus === "syncing" && (
                <span className="flex items-center gap-1 text-[11px] text-sky-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />Sync…
                </span>
              )}
              {syncStatus === "synced" && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Enregistré
                </span>
              )}
              {syncStatus === "error" && (
                <span className="flex items-center gap-1 text-[11px] text-red-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Erreur
                </span>
              )}
              <input type="file" accept="application/json" ref={fileRef} onChange={onImport} className="hidden" />
              <button
                onClick={savePlanning}
                disabled={saving}
                title={saving ? "Enregistrement…" : "Enregistrer"}
                className={cx(
                  "h-8 w-8 rounded-lg flex items-center justify-center transition border",
                  saving
                    ? "border-neutral-200 text-neutral-300"
                    : "border-neutral-200 text-neutral-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50"
                )}
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                title="Réglages"
                className="h-8 w-8 rounded-lg flex items-center justify-center border border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Tabs>

        {/* Barre contextuelle */}
        <div className={cx("flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 shadow-sm", view === "accueil" && "hidden")}>
          <div className="flex flex-wrap items-center gap-3">
            {view === "planning" && (
              <div className="flex items-center gap-1 pr-3 border-r border-neutral-200">
                {[
                  { v: "week", label: "Semaine" },
                  { v: "month", label: "Mois" },
                ].map(({ v, label }) => (
                  <button
                    key={v}
                    onClick={() => setPlanningView(v as any)}
                    className={cx(
                      "px-3 py-1 rounded-lg text-sm font-medium transition",
                      planningView === v
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
                    )}
                  >{label}</button>
                ))}
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
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{anchor.getFullYear()}</span>
                      <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">Vue tableau annuel</span>
                    </div>
                  )}
                  {view === "timeline" && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{timelineScopeLabel}</span>
                      <span className="text-xs font-semibold text-neutral-700 bg-neutral-100 px-2 py-1 rounded-full">
                        Barres basées sur les semaines planifiées des chantiers
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
              <button
                onClick={clearCurrentWeek}
                title="Vider la semaine"
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm text-neutral-500 border border-neutral-200 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition"
              >
                <Eraser className="w-3.5 h-3.5" /> Vider
              </button>
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
                    ? `Prochain : ${formatWeeksSummary(pendingSiteHighlights[0].planningWeeks || [])}`
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
                          {(site.quoteSnapshot?.amount || site.montantDevis) && (
                            <span className="text-[11px] text-neutral-500">{formatEUR(site.quoteSnapshot?.amount ?? site.montantDevis)}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-600 flex items-center gap-2">
                          {(site.clientName || site.quoteSnapshot?.client) ? (
                            <button onClick={(e) => { e.stopPropagation(); openClientHistory(site.clientName || site.quoteSnapshot?.client); }} className="hover:underline hover:text-sky-700 text-left">{site.clientName || site.quoteSnapshot?.client}</button>
                          ) : <span>Client</span>}
                          <span className="text-neutral-400">•</span>
                          <span>{formatWeeksSummary(site.planningWeeks || [])}</span>
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
                          {(site.clientName || site.quoteSnapshot?.client) ? (
                            <button onClick={() => openClientHistory(site.clientName || site.quoteSnapshot?.client)} className="hover:underline hover:text-sky-700 text-left">{site.clientName || site.quoteSnapshot?.client}</button>
                          ) : <span>Client</span>}
                          <span className="text-neutral-400">•</span>
                          <span>{formatWeeksSummary(site.planningWeeks || [])}</span>
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
                        <span>Semaine {formatWeeksSummary(quote.planningWeeks || [])}</span>
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

      {view === "accueil" && (() => {
        const now = new Date();
        const accueilWeekNum = getISOWeek(now);
        const accueilWeekYear = getISOWeekYear(now);
        const accueilWeekKey = todayWeekKey;
        const accueilWeekStart = getISOWeekStart(accueilWeekYear, accueilWeekNum);
        const accueilWeekDateKeys = Array.from({ length: 5 }, (_, i) => {
          const d = new Date(accueilWeekStart);
          d.setDate(d.getDate() + i);
          return toLocalKey(d);
        });
        const accueilWeekDateSet = new Set(accueilWeekDateKeys);
        const accueilActiveSites = plannedSites.filter((s: any) =>
          isSiteVisibleOnWeek(s.id, accueilWeekKey)
        );
        const accueilWeekAssignments = assignments.filter((a: any) =>
          accueilWeekDateSet.has(a.date)
        );
        const activePeople = safePeople.filter((p: any) => p.status !== "archived");
        const accueilAlerts: {
          type: "urgent" | "warning" | "info";
          icon: string;
          message: string;
          action?: () => void;
        }[] = [];

        tenders.forEach((t: any) => {
          if ((t.statut === "a_repondre" || t.statut === "depose") && t.dateLimite) {
            const deadline = new Date(t.dateLimite);
            const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
            if (diffDays >= 0 && diffDays <= 7) {
              const dateLabel = deadline.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
              });
              accueilAlerts.push({
                type: "urgent",
                icon: "🔴",
                message: `AO '${t.reference || t.objet || "sans ref"}' à rendre le ${dateLabel}`,
                action: () => setView("sites"),
              });
            }
          }
        });

        safeQuotes.forEach((q: any) => {
          if (q.status === "pending" && q.sentAt) {
            const diffDays = Math.floor(
              (now.getTime() - new Date(q.sentAt).getTime()) / 86400000
            );
            if (diffDays > 14) {
              accueilAlerts.push({
                type: "warning",
                icon: "🟡",
                message: `Devis '${q.title}' pour ${q.client || "client"} envoyé il y a ${diffDays} jours sans réponse`,
                action: () => setView("sites"),
              });
            }
          }
        });

        const assignedPersonIds = new Set(
          accueilWeekAssignments.map((a: any) => a.personId)
        );
        const unassignedPeople = activePeople.filter(
          (p: any) => !assignedPersonIds.has(p.id)
        );
        if (unassignedPeople.length > 0) {
          accueilAlerts.push({
            type: "warning",
            icon: "🟡",
            message: `${unassignedPeople.length} salarié(s) sans affectation cette semaine : ${unassignedPeople.map((p: any) => p.name).join(", ")}`,
            action: () => setView("planning"),
          });
        }

        accueilActiveSites.forEach((s: any) => {
          if (!accueilWeekAssignments.some((a: any) => a.siteId === s.id)) {
            accueilAlerts.push({
              type: "warning",
              icon: "🟠",
              message: `Chantier '${s.name}' planifié cette semaine mais aucun salarié affecté`,
              action: () => openSiteDetail(s.id),
            });
          }
        });

        plannedSites.forEach((s: any) => {
          const siteBudget = Number(
            s.quoteSnapshot?.amount ??
              (s.quoteId
                ? safeQuotes.find((q: any) => q.id === s.quoteId)?.amount
                : 0) ??
              0
          );
          const totalFact = (s.situations || []).reduce(
            (sum: number, sit: any) => sum + (Number(sit.montant) || 0),
            0
          );
          if (siteBudget > 0 && totalFact < siteBudget * 0.5) {
            const weeks = Array.isArray(s.planningWeeks) ? s.planningWeeks : [];
            if (weeks.length > 0 && weeks.every((wk: string) => wk < accueilWeekKey)) {
              accueilAlerts.push({
                type: "warning",
                icon: "⚠️",
                message: `Chantier '${s.name}' terminé avec seulement ${Math.round((totalFact / siteBudget) * 100)}% facturé`,
                action: () => setView("rentabilite"),
              });
            }
          }
        });

        const mobilisedIds = new Set(accueilWeekAssignments.map((a: any) => a.personId));
        const mobilisedCount = mobilisedIds.size;
        const activeCount = activePeople.length;
        const tauxOccupation =
          activeCount > 0 ? Math.round((mobilisedCount / activeCount) * 100) : 0;
        const caTotalEnCours = accueilActiveSites.reduce(
          (sum: number, s: any) =>
            sum +
            Number(
              s.quoteSnapshot?.amount ??
                (s.quoteId
                  ? safeQuotes.find((q: any) => q.id === s.quoteId)?.amount
                  : 0) ??
                0
            ),
          0
        );
        const aoEnCours = tenders.filter(
          (t: any) => t.statut === "a_repondre" || t.statut === "depose"
        ).length;

        return (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border bg-white px-5 py-4 shadow-sm">
              <div>
                <div className="text-xl font-bold text-neutral-900">
                  Bonjour — Semaine S{pad2(accueilWeekNum)}, {formatFR(now, true)}
                </div>
                <div className="text-sm text-neutral-500 mt-0.5">
                  Clé de semaine :{" "}
                  <span className="font-mono text-neutral-700">{accueilWeekKey}</span>
                </div>
              </div>
              <span className="shrink-0 text-xs font-semibold text-sky-700 bg-sky-100 px-3 py-1.5 rounded-full">
                {accueilActiveSites.length} chantier
                {accueilActiveSites.length !== 1 ? "s" : ""} actif
                {accueilActiveSites.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Alertes */}
            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-neutral-900">⚠ Alertes</span>
                  {accueilAlerts.length > 0 && (
                    <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      {accueilAlerts.length}
                    </span>
                  )}
                </div>
                {accueilAlerts.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-800">
                    <span>✓</span>
                    <span>Tout est en ordre cette semaine</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {accueilAlerts.map((alert, idx) => (
                      <button
                        key={idx}
                        onClick={alert.action}
                        className={cx(
                          "w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border-l-4 text-sm transition",
                          alert.type === "urgent"
                            ? "border-l-red-500 bg-red-50 hover:bg-red-100"
                            : "border-l-amber-400 bg-amber-50 hover:bg-amber-100"
                        )}
                      >
                        <span className="shrink-0 mt-0.5">{alert.icon}</span>
                        <span className="flex-1 text-neutral-800">{alert.message}</span>
                        {alert.action && (
                          <span className="text-xs text-neutral-400 shrink-0 mt-0.5">→</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* KPIs */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="space-y-1">
                  <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    Chantiers actifs
                  </div>
                  <div className="text-3xl font-bold text-neutral-900">
                    {accueilActiveSites.length}
                  </div>
                  <div className="text-xs text-neutral-500">cette semaine</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-1">
                  <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    Salariés mobilisés
                  </div>
                  <div className="text-3xl font-bold text-neutral-900">{mobilisedCount}</div>
                  <div className="text-xs text-neutral-500">sur {activeCount} actifs</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-1">
                  <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    {"Taux d'occupation"}
                  </div>
                  <div
                    className={cx(
                      "text-3xl font-bold",
                      tauxOccupation >= 80
                        ? "text-emerald-600"
                        : tauxOccupation >= 50
                          ? "text-amber-500"
                          : "text-red-500"
                    )}
                  >
                    {tauxOccupation}%
                  </div>
                  <div className="text-xs text-neutral-500">mobilisés / actifs</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-1">
                  <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    CA en cours
                  </div>
                  <div className="text-2xl font-bold text-neutral-900 truncate">
                    {caTotalEnCours > 0 ? formatEUR(caTotalEnCours) : "—"}
                  </div>
                  <div className="text-xs text-neutral-500">budget chantiers actifs</div>
                </CardContent>
              </Card>
            </div>

            {/* Chantiers actifs cette semaine */}
            <Card>
              <CardContent className="space-y-3">
                <div className="text-base font-bold text-neutral-900">
                  Chantiers actifs cette semaine
                </div>
                {accueilActiveSites.length === 0 ? (
                  <div className="text-sm text-neutral-500">
                    Aucun chantier planifié cette semaine.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {accueilActiveSites.map((site: any) => {
                      const sitePersonIds = new Set(
                        accueilWeekAssignments
                          .filter((a: any) => a.siteId === site.id)
                          .map((a: any) => a.personId)
                      );
                      const assignedPeopleForSite = safePeople.filter((p: any) =>
                        sitePersonIds.has(p.id)
                      );
                      const siteBudget = Number(
                        site.quoteSnapshot?.amount ??
                          (site.quoteId
                            ? safeQuotes.find((q: any) => q.id === site.quoteId)?.amount
                            : 0) ??
                          0
                      );
                      return (
                        <button
                          key={site.id}
                          onClick={() => openSiteDetail(site.id)}
                          className="text-left rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-400 hover:shadow-sm transition space-y-2"
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={cx(
                                "mt-0.5 w-3 h-3 rounded-full shrink-0 border",
                                site.color || "bg-neutral-300",
                                site.color ? "border-black/10" : "border-neutral-200"
                              )}
                              aria-hidden
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-neutral-900 text-sm truncate">
                                {site.name}
                              </div>
                              {(site.clientName || site.quoteSnapshot?.client) && (
                                <div className="text-xs text-neutral-500 truncate">
                                  {site.clientName || site.quoteSnapshot?.client}
                                </div>
                              )}
                            </div>
                          </div>
                          {assignedPeopleForSite.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {assignedPeopleForSite.map((p: any) => (
                                <span
                                  key={p.id}
                                  title={p.name}
                                  className={cx(
                                    "inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-[10px] font-bold border-2 border-white shadow-sm",
                                    p.color || "bg-neutral-400"
                                  )}
                                >
                                  {p.name
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase()}
                                </span>
                              ))}
                            </div>
                          )}
                          {siteBudget > 0 && (
                            <div className="text-xs font-semibold text-neutral-600">
                              {formatEUR(siteBudget)}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions rapides */}
            <Card>
              <CardContent className="space-y-3">
                <div className="text-base font-bold text-neutral-900">
                  À faire cette semaine
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setView("planning")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition"
                  >
                    <CalendarRange className="w-4 h-4" /> Voir le planning
                  </button>
                  <button
                    onClick={() => setView("sites")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-neutral-800 text-sm font-medium hover:bg-neutral-50 transition"
                  >
                    <ListChecks className="w-4 h-4" /> Chantiers ({aoEnCours})
                  </button>
                  <button
                    onClick={() => setView("rentabilite")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-neutral-800 text-sm font-medium hover:bg-neutral-50 transition"
                  >
                    Rentabilité
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {view !== "dashboard" && view !== "accueil" && (
        /* DnD provider */
        <div data-dnd-scope="planning">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={() => setDragging(true)}
            onDragEnd={(event) => {
              setDragging(false);
              onDragEnd(event);
            }}
            onDragCancel={() => setDragging(false)}
          >
            <div className="grid grid-cols-12 gap-4">
              {/* Left column: People & Sites */}
              {view !== "calendar" && (
                <div
                  className={cx(
                    "col-span-12 lg:col-span-3 space-y-4",
                    isPlanningMonth && "lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
                  )}
                >
              <Card className="bg-white border-neutral-200 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-neutral-800">Salariés</div>
                    <AddPerson onAdd={addPerson} usedColors={safePeople.map((p: any) => p.color)} />
                  </div>
                  <div className="space-y-1.5">
                    {safePeople.filter((p: any) => p.status !== "archived").map((p: any) => {
                      const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
                      const absenceDays = weekDays.map((d) => getDayAbsence(p.id, toLocalKey(d)));
                      const hasAnyAbsence = absenceDays.some(Boolean);
                      const absOpen = absenceExpandedId === p.id;

                      const toggleAbsence = (type: "CP" | "MAL" | "OFF", dk: string) => {
                        setAbsencesByDay((prev) => {
                          const day = { ...(prev[dk] || {}) };
                          if (day[p.id] === type) { delete day[p.id]; } else { day[p.id] = type; }
                          return { ...prev, [dk]: day };
                        });
                      };

                      return (
                        <div
                          key={p.id}
                          className={cx("rounded-xl border border-neutral-200 bg-white border-l-4", p.status === "disabled" && "opacity-50")}
                          style={{ borderLeftColor: COLOR_HEX[p.color] || "#94a3b8" }}
                        >
                          <div className="px-2.5 py-2 flex items-center justify-between gap-2">
                            <PersonChip person={p} />
                            <div className="flex items-center gap-0.5 shrink-0">
                              {/* Absence indicator — visible seulement si absences */}
                              <button
                                onClick={() => setAbsenceExpandedId(absOpen ? null : p.id)}
                                title="Gérer les absences de la semaine"
                                className={cx(
                                  "h-6 px-2 rounded-md flex items-center gap-1 transition text-[10px] font-semibold",
                                  hasAnyAbsence
                                    ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                    : "text-neutral-300 hover:text-neutral-500 hover:bg-neutral-50"
                                )}
                              >
                                {hasAnyAbsence ? `${absenceDays.filter(Boolean).length}j abs.` : "Abs."}
                              </button>
                              <div className="w-px h-3.5 bg-neutral-200 mx-0.5" />
                              <div className="relative">
                                <button
                                  className="h-6 w-6 rounded-md flex items-center justify-center text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 transition"
                                  title={`Affecter ${p.name} toute la semaine`}
                                  onClick={() => {
                                    if (sitesForCurrentWeek.length === 0) return;
                                    if (sitesForCurrentWeek.length === 1) {
                                      const siteId = sitesForCurrentWeek[0].id;
                                      weekDateKeys.forEach((dateKey) => {
                                        if (isAbsentOnWeek(p.id, currentWeekKey)) return;
                                        if (getDayAbsence(p.id, dateKey)) return;
                                        const already = assignments.some((a: any) => a.personId === p.id && a.date === dateKey && a.siteId === siteId);
                                        if (already) return;
                                        const id = (crypto as any).randomUUID?.() ?? `${p.id}-${siteId}-${dateKey}-${Date.now()}`;
                                        setAssignments((prev: any) => [...prev, { id, personId: p.id, siteId, date: dateKey }]);
                                      });
                                    } else {
                                      setWeekAssignPickerPersonId((prev) => prev === p.id ? null : p.id);
                                    }
                                  }}
                                ><CalendarRange className="w-3.5 h-3.5" /></button>
                                {weekAssignPickerPersonId === p.id && (
                                  <div data-week-picker className="absolute right-0 top-8 z-50 bg-white border border-neutral-200 rounded-lg shadow-lg p-2 min-w-[140px] space-y-1">
                                    <div className="text-[10px] text-neutral-400 font-semibold px-1 pb-1">Choisir le chantier</div>
                                    {sitesForCurrentWeek.map((site: any) => (
                                      <button
                                        key={site.id}
                                        onClick={() => {
                                          const siteId = site.id;
                                          weekDateKeys.forEach((dateKey) => {
                                            if (isAbsentOnWeek(p.id, currentWeekKey)) return;
                                            if (getDayAbsence(p.id, dateKey)) return;
                                            const already = assignments.some((a: any) => a.personId === p.id && a.date === dateKey && a.siteId === siteId);
                                            if (already) return;
                                            const id = (crypto as any).randomUUID?.() ?? `${p.id}-${siteId}-${dateKey}-${Date.now()}`;
                                            setAssignments((prev: any) => [...prev, { id, personId: p.id, siteId, date: dateKey }]);
                                          });
                                          setWeekAssignPickerPersonId(null);
                                        }}
                                        className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-neutral-100 transition text-xs"
                                      >
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${site.color || "bg-neutral-400"}`} />
                                        <span className="truncate">{site.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <button
                                className="h-6 w-6 rounded-md flex items-center justify-center text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 transition"
                                onClick={() => openPersonDetail(p.id)}
                                title="Modifier"
                              ><Edit3 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>

                          {/* Absence grid */}
                          {absOpen && (
                            <div className="mx-2.5 mb-2.5 pt-2 border-t border-neutral-100">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr>
                                    <th className="text-left text-[10px] text-neutral-400 font-semibold pb-1.5 pr-2 w-24">Type</th>
                                    {DAY_LABELS.map((label, i) => (
                                      <th key={i} className="text-center text-[10px] text-neutral-400 font-semibold pb-1.5 w-10">{label}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="space-y-1">
                                  {([
                                    ["CP",  "Congé payé",    "bg-amber-400 text-white border-amber-400",  "border-amber-200 text-amber-500 hover:bg-amber-50"],
                                    ["MAL", "Maladie",       "bg-red-400 text-white border-red-400",      "border-red-200 text-red-400 hover:bg-red-50"],
                                    ["OFF", "RTT / Jour off","bg-slate-400 text-white border-slate-400",  "border-slate-200 text-slate-400 hover:bg-slate-50"],
                                  ] as const).map(([type, label, activeClass, inactiveClass]) => (
                                    <tr key={type}>
                                      <td className="pr-2 py-0.5 text-[10px] font-medium text-neutral-600 whitespace-nowrap">{label}</td>
                                      {weekDays.map((d, i) => {
                                        const dk = toLocalKey(d);
                                        const abs = getDayAbsence(p.id, dk);
                                        const isActive = abs === type;
                                        return (
                                          <td key={dk} className="text-center py-0.5 px-0.5">
                                            <button
                                              onClick={() => toggleAbsence(type, dk)}
                                              className={cx(
                                                "w-8 h-6 rounded border text-[10px] font-bold transition",
                                                isActive ? activeClass : cx("bg-white", inactiveClass)
                                              )}
                                              title={isActive ? `Retirer ${label}` : `${label} — ${DAY_LABELS[i]}`}
                                            >
                                              {isActive ? "✓" : "·"}
                                            </button>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {hasAnyAbsence && (
                                <button
                                  onClick={() => {
                                    weekDays.forEach((d) => {
                                      const dk = toLocalKey(d);
                                      setAbsencesByDay((prev) => {
                                        const day = { ...(prev[dk] || {}) };
                                        delete day[p.id];
                                        return { ...prev, [dk]: day };
                                      });
                                    });
                                  }}
                                  className="mt-1.5 text-[10px] text-neutral-400 hover:text-red-500 transition underline"
                                >
                                  Effacer toutes les absences
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-neutral-200 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between w-full">
                    <div
                      className="text-sm font-semibold text-neutral-800 flex items-center gap-2 cursor-pointer flex-1"
                      onClick={() => setSidebarChantierOpen((v) => !v)}
                    >
                      {sidebarChantierOpen ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
                      Chantiers
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 font-semibold">
                        {sidebarVisiblePlannedSites.length}
                      </span>
                      {pendingSites.length > 0 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                          {pendingSites.length} à planifier
                        </span>
                      )}
                    </div>
                    <AddSite onAdd={addSite} usedColors={safeSites.map((s: any) => s.color)} />
                  </div>
                  {sidebarChantierOpen && (
                    <div className="space-y-1.5">
                      {sidebarVisiblePlannedSites.length > 3 && (
                        <Input
                          placeholder="Rechercher…"
                          value={sidebarSearch}
                          onChange={(e: any) => setSidebarSearch(e.target.value)}
                          className="h-7 text-xs"
                        />
                      )}
                      {sidebarVisiblePlannedSites.filter((s) => s.name.toLowerCase().includes(sidebarSearch.toLowerCase())).length === 0 && (
                        <p className="text-xs text-neutral-400 italic">{sidebarSearch ? "Aucun résultat." : "Aucun chantier sur cette période."}</p>
                      )}
                      {sidebarVisiblePlannedSites.filter((s) => s.name.toLowerCase().includes(sidebarSearch.toLowerCase())).map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white overflow-hidden border-l-4 px-2.5 py-2"
                          style={{ borderLeftColor: COLOR_HEX[s.color] || "#94a3b8" }}
                        >
                          <span className="text-sm font-medium text-neutral-800 truncate">{s.name}</span>
                          <button
                            onClick={() => openSiteDetail(s.id)}
                            className="h-6 w-6 rounded-md flex items-center justify-center text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 transition shrink-0"
                            aria-label={`Modifier ${s.name}`}
                            title="Modifier"
                          ><Edit3 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}

                </CardContent>
              </Card>
            </div>
          )}

          {/* Right column: Calendars */}
          <div className={cx("col-span-12", view === "calendar" ? "lg:col-span-12" : "lg:col-span-9")}>
            {/* WEEK VIEW */}
            {isPlanningWeek && (
              <div className="space-y-2">
                <div className="grid grid-cols-6 text-xs text-neutral-500">
                  <div className="px-1 flex items-center gap-2">
                    <button
                      onClick={toggleAllSites}
                      className="flex items-center gap-1 hover:text-neutral-800 transition-colors"
                      title={allSitesCollapsed ? "Tout déplier" : "Tout réduire"}
                    >
                      {allSitesCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    <span>Sem. {getISOWeek(weekDays[0])}</span>
                    {isViewingCurrentWeek && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-700">En cours</span>
                    )}
                  </div>
                  {weekDays.map((d, i) => {
                    const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
                    const holiday = publicHolidays.get(toLocalKey(d));
                    return (
                      <div key={i} className={cx("text-center", holiday ? "text-red-600 font-semibold" : "")}>
                        {dayNames[i]}
                        {holiday && <div className="text-[9px] leading-tight truncate" title={holiday}>{holiday}</div>}
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  {sitesForCurrentWeek.map((site) => {
                    const isCollapsed = collapsedSites.has(site.id);
                    return (
                      <div key={site.id} className={cx("grid gap-2 items-stretch", isCollapsed ? "grid-cols-1" : "grid-cols-6")}>
                        <div className="text-base flex items-center gap-2 font-semibold text-neutral-900">
                          <button
                            onClick={() => toggleSiteCollapsed(site.id)}
                            className="flex-shrink-0 text-neutral-400 hover:text-neutral-700 transition-colors"
                            title={isCollapsed ? "Déplier" : "Réduire"}
                          >
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <span
                            className={cx(
                              "w-3 h-3 rounded-full border flex-shrink-0",
                              site.color || "bg-neutral-300",
                              site.color ? "border-black/10" : "border-neutral-200"
                            )}
                            aria-hidden
                          />
                          {site.name}
                        </div>
                        {!isCollapsed && weekDays.map((d) => (
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
                            publicHoliday={publicHolidays.get(toLocalKey(d)) ?? null}
                            absencesByDay={absencesByDay}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* HOURS VIEW */}
            {view === "hours" && (
              <div className="space-y-2">
                {/* Hours week header with validation */}
                {(() => {
                  const isValidated = Boolean(validatedWeeks[currentWeekKey]);
                  const validatedAt = validatedWeeks[currentWeekKey];
                  const validatedDate = validatedAt ? new Date(validatedAt) : null;
                  const pastUnvalidated = (() => {
                    const weeksWithAssignments = new Set(
                      assignments
                        .filter((a: any) => a.date && a.date < weekDays[0].toISOString().slice(0, 10))
                        .map((a: any) => weekKeyOf(new Date(a.date)))
                    );
                    return [...weeksWithAssignments].filter((wk) => !validatedWeeks[wk]).length;
                  })();
                  return (
                    <div className="flex items-center justify-between mb-1 px-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-neutral-600">Sem. {getISOWeek(weekDays[0])}</span>
                        {isViewingCurrentWeek && (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">En cours</span>
                        )}
                        {weekConflictCount > 0 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">{weekConflictCount} conflits</span>
                        )}
                        {isValidated && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                            ✓ Validée{validatedDate ? ` le ${validatedDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}
                          </span>
                        )}
                        {pastUnvalidated > 0 && (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                            {pastUnvalidated} sem. passée{pastUnvalidated > 1 ? "s" : ""} non validée{pastUnvalidated > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (isValidated) {
                            setValidatedWeeks((prev) => { const next = { ...prev }; delete next[currentWeekKey]; return next; });
                          } else {
                            setValidatedWeeks((prev) => ({ ...prev, [currentWeekKey]: new Date().toISOString() }));
                          }
                        }}
                        className={cx(
                          "text-xs font-semibold px-3 py-1.5 rounded-lg border transition",
                          isValidated
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-white hover:border-neutral-300 hover:text-neutral-600"
                            : "bg-white border-neutral-300 text-neutral-600 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700"
                        )}
                      >
                        {isValidated ? "↩ Dévalider" : "✓ Valider la semaine"}
                      </button>
                    </div>
                  );
                })()}
                <div className="grid grid-cols-6 text-xs text-neutral-500">
                  <div className="px-1" />
                  {weekDays.map((d, i) => {
                    const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
                    const holiday = publicHolidays.get(toLocalKey(d));
                    return (
                      <div key={i} className={cx("text-center", holiday ? "text-red-600 font-semibold" : "")}>
                        {dayNames[i]}
                        {holiday && <div className="text-[9px] leading-tight truncate" title={holiday}>{holiday}</div>}
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  {sitesForCurrentWeek.map((site) => (
                    <div key={site.id} className="grid grid-cols-6 gap-2 items-stretch">
                      <div className="flex flex-col gap-1 justify-center">
                        <div className="flex items-center gap-1.5">
                          <span className={cx("w-2.5 h-2.5 rounded-full shrink-0 border border-black/10", site.color || "bg-neutral-300")} />
                          <span className="text-sm font-semibold text-neutral-900 truncate">{site.name}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400">Heures & portions</span>
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
                          onRemoveAssignment={(id: string) => setAssignments((prev: any) => prev.filter((a: any) => a.id !== id))}
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
                          {week.slice(0, 5).map((d: Date, i: number) => {
                            const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
                            const holiday = publicHolidays.get(toLocalKey(d));
                            return (
                              <div key={i} className={cx("text-center", holiday ? "text-red-600 font-semibold" : "")}>
                                {dayNames[i]}
                                {holiday && <div className="text-[9px] leading-tight truncate" title={holiday}>{holiday}</div>}
                              </div>
                            );
                          })}
                        </div>
                        {sitesForWeek.map((site) => {
                          const isCollapsed = collapsedSites.has(site.id);
                          return (
                            <div key={`${idx}-${site.id}`} className={cx("grid gap-2 items-stretch", isCollapsed ? "grid-cols-1" : "grid-cols-6")}>
                              <div className="text-base flex items-center gap-2 font-semibold text-neutral-900">
                                <button
                                  onClick={() => toggleSiteCollapsed(site.id)}
                                  className="flex-shrink-0 text-neutral-400 hover:text-neutral-700 transition-colors"
                                  title={isCollapsed ? "Déplier" : "Réduire"}
                                >
                                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                <span
                                  className={cx(
                                    "w-3 h-3 rounded-full border flex-shrink-0",
                                    site.color || "bg-neutral-300",
                                    site.color ? "border-black/10" : "border-neutral-200"
                                  )}
                                  aria-hidden
                                />
                                {site.name}
                              </div>
                              {!isCollapsed && week.slice(0, 5).map((d) => (
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
                                        publicHoliday={publicHolidays.get(toLocalKey(d)) ?? null}
                                  absencesByDay={absencesByDay}
                                />
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

              </div>
            )}

            {/* CALENDRIER MENSUEL */}
            {view === "calendar" && (
              <div className="space-y-3">
                {/* Controls */}
                <div className="rounded-xl border bg-white shadow-sm px-4 py-2.5 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { key: "planned", label: "Planifiés", active: calFilterPlanned, toggle: () => setCalFilterPlanned(v => !v), activeCls: "bg-sky-500 text-white border-sky-500", dot: "bg-white/70" },
                      { key: "pending", label: "En attente", active: calFilterPending, toggle: () => setCalFilterPending(v => !v), activeCls: "bg-amber-400 text-white border-amber-400", dot: "bg-white/70" },
                      { key: "absences", label: "Absences", active: calFilterAbsences, toggle: () => setCalFilterAbsences(v => !v), activeCls: "bg-rose-400 text-white border-rose-400", dot: "bg-white/70" },
                      { key: "events", label: "Événements", active: calFilterEvents, toggle: () => setCalFilterEvents(v => !v), activeCls: "bg-violet-400 text-white border-violet-400", dot: "bg-white/70" },
                    ].map(({ key, label, active, toggle, activeCls, dot }) => (
                      <button
                        key={key}
                        onClick={toggle}
                        className={cx(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition",
                          active ? activeCls : "bg-white border-neutral-200 text-neutral-400 hover:border-neutral-300 hover:text-neutral-500"
                        )}
                      >
                        <span className={cx("w-1.5 h-1.5 rounded-full", active ? dot : "bg-neutral-300")} />
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1" />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setCalendarDraft({ name: "", color: COLORS[3] }); setCalendarEditTarget(null); setCalendarDialogOpen(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition"
                    ><Plus className="w-3 h-3" />Calendrier</button>
                    <button
                      onClick={() => setEventDialogOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-700 transition"
                    ><Plus className="w-3 h-3" />Événement</button>
                  </div>
                </div>

                {/* Table horizontale */}
                <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <div className="flex" style={{ minWidth: `${projectionWeekSummaries.length * 152}px` }}>
                      {projectionWeekSummaries.map((week) => {
                        const isCurrentWeek = week.weekKey === weekKeyOf(new Date());
                        const monthStart = week.weekNum === 1 || (week.weekNum > 1 && projectionWeekSummaries[projectionWeekSummaries.indexOf(week) - 1]?.start.getMonth() !== week.start.getMonth());
                        return (
                          <CalendarWeekDropZone key={week.weekKey} weekKey={week.weekKey} isCurrentWeek={isCurrentWeek}>
                            {/* Header semaine */}
                            <div className={cx(
                              "px-2 pt-1.5 pb-1 border-b sticky top-0 z-10",
                              isCurrentWeek ? "bg-sky-50 border-b-sky-200" : "bg-white"
                            )}>
                              <div className="mb-1 h-[18px] flex items-center">
                                {monthStart && (
                                  <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-neutral-800 text-white leading-none">
                                    {week.start.toLocaleString("fr-FR", { month: "long", year: "numeric" })}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={cx(
                                    "text-xs font-bold px-1.5 py-0.5 rounded",
                                    isCurrentWeek ? "bg-sky-500 text-white" : "text-neutral-600"
                                  )}>
                                    S{pad2(week.weekNum)}
                                  </span>
                                  <span className="text-[10px] text-neutral-400">
                                    {week.start.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                  </span>
                                </div>
                                <button
                                  onClick={() => openEventDialogForDate(toLocalKey(week.start))}
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 transition"
                                  title="Ajouter un événement"
                                ><Plus className="w-3 h-3" /></button>
                              </div>
                            </div>

                            {/* Post-its */}
                            <div className="p-1.5 space-y-1 flex-1">
                              {/* Chantiers planifiés */}
                              {calFilterPlanned && week.planned.map((site: any) => (
                                <CalendarSiteChip
                                  key={`p-${site.id}`}
                                  site={site}
                                  weekKey={week.weekKey}
                                  className={cx("text-[10px] px-2 py-px rounded font-semibold text-white shadow-sm leading-5", site.color || "bg-sky-500")}
                                />
                              ))}
                              {/* Chantiers en attente */}
                              {calFilterPending && week.pending.map((site: any) => (
                                <CalendarSiteChip
                                  key={`w-${site.id}`}
                                  site={site}
                                  weekKey={week.weekKey}
                                  className="text-[10px] px-2 py-px rounded font-semibold leading-5 bg-amber-100 text-amber-800 border border-amber-200"
                                />
                              ))}
                              {/* Absences */}
                              {calFilterAbsences && week.absences.map((name: string) => (
                                <div
                                  key={`a-${name}`}
                                  className="text-[10px] px-2 py-px rounded font-semibold leading-5 bg-rose-100 text-rose-700 truncate"
                                  title={name}
                                >🏖 {name}</div>
                              ))}
                              {/* Événements */}
                              {calFilterEvents && week.events.map((event: any) => {
                                const cal = eventCalendarsById[event.calendarId];
                                const calHex = cal?.color ? (COLOR_HEX[cal.color] || "#8b5cf6") : "#8b5cf6";
                                return (
                                  <CalendarEventChip
                                    key={event.id}
                                    event={event}
                                    weekKey={week.weekKey}
                                    calHex={calHex}
                                    onEdit={() => openEventDialogForEvent(event)}
                                  />
                                );
                              })}
                              {/* Semaine vide */}
                              {week.planned.length === 0 && week.pending.length === 0 && week.absences.length === 0 && week.events.length === 0 && (
                                <div className="h-4" />
                              )}
                            </div>
                          </CalendarWeekDropZone>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Légende calendriers */}
                <div className="flex items-center gap-2 flex-wrap px-1">
                  {eventCalendars.map((cal) => (
                    <div key={cal.id} className={cx("flex items-center gap-0.5 transition", !cal.visible && "opacity-40")}>
                      <button
                        onClick={() => setEventCalendars(prev => prev.map(c => c.id === cal.id ? { ...c, visible: !c.visible } : c))}
                        className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 transition px-1 py-0.5 rounded hover:bg-neutral-100"
                      >
                        <span className={cx("w-2 h-2 rounded-full shrink-0", cal.color || "bg-neutral-400")} />
                        {cal.name}
                      </button>
                      <button
                        onClick={() => { setCalendarDraft({ name: cal.name, color: cal.color || COLORS[3] }); setCalendarEditTarget({ id: cal.id, isDefault: cal.isDefault }); setCalendarDialogOpen(true); }}
                        className="w-5 h-5 flex items-center justify-center text-neutral-300 hover:text-neutral-600 transition rounded hover:bg-neutral-100"
                        title="Modifier"
                      ><Edit3 className="w-2.5 h-2.5" /></button>
                      {!["cal-planned","cal-pending","cal-leave","cal-availability"].includes(cal.id) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); if (window.confirm(`Supprimer le calendrier "${cal.name}" ? Les événements associés seront aussi supprimés.`)) deleteCalendar(cal.id); }}
                          className="w-5 h-5 flex items-center justify-center text-neutral-300 hover:text-red-400 transition rounded hover:bg-red-50"
                          title="Supprimer ce calendrier"
                        ><Trash2 className="w-2.5 h-2.5" /></button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => { setCalendarDraft({ name: "", color: COLORS[3] }); setCalendarEditTarget(null); setCalendarDialogOpen(true); }}
                    className="text-xs text-neutral-400 hover:text-neutral-600 transition"
                  >+ ajouter</button>
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
                  Barres continues alignées sur les semaines planifiées des chantiers pour identifier d'un coup d'œil les mois, trimestres ou années peu ou très chargés.
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
                            {formatWeeksSummary(row.site.planningWeeks || [])}
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
                              <div className="text-[11px] text-neutral-600">
                                {formatWeeksSummary(site.planningWeeks || [])}
                              </div>
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

            {view === "sites" && (() => {
              const totalCA = [...plannedSites, ...pendingSites].reduce((s: number, site: any) => s + Number(site.quoteSnapshot?.amount ?? 0), 0);

              const parseBatappliCSV = (text: string) => {
                const rows = text.trim().split(/\r?\n/);
                if (rows.length < 2) return [];
                const sep = rows[0].includes(';') ? ';' : ',';
                const headers = rows[0].split(sep).map((h: string) => h.replace(/"/g, '').trim().toLowerCase());
                const col = (...names: string[]) => {
                  for (const n of names) {
                    const idx = headers.findIndex((h: string) => h.includes(n));
                    if (idx !== -1) return idx;
                  }
                  return -1;
                };
                const cTitle = col('intitulé', 'objet', 'désignation', 'libellé', 'titre', 'nom');
                const cClient = col('client', 'maître');
                const cAmount = col('montant ht', 'montant', 'budget', ' ht');
                const cRef = col('référence', 'ref', 'numéro', 'numero', 'n°');
                return rows.slice(1).map((line: string) => {
                  const cols = line.split(sep).map((c: string) => c.replace(/"/g, '').trim());
                  return {
                    name: cTitle !== -1 ? cols[cTitle] : cols[1] || '',
                    clientName: cClient !== -1 ? cols[cClient] : '',
                    amount: cAmount !== -1 ? parseFloat((cols[cAmount] || '0').replace(',', '.').replace(/\s/g, '')) || 0 : 0,
                    ref: cRef !== -1 ? cols[cRef] : '',
                  };
                }).filter((r: any) => r.name && r.name.length > 1);
              };

              const handleBatappliImport = (file: File) => {
                const reader = new FileReader();
                reader.onload = () => {
                  const rows = parseBatappliCSV(String(reader.result));
                  if (!rows.length) { alert("Aucun chantier trouvé dans ce fichier. Vérifiez le format CSV Batappli."); return; }
                  let created = 0;
                  setSites((prev: any[]) => {
                    const updated = [...prev];
                    for (const row of rows) {
                      const exists = updated.some((s: any) => (s.name || '').trim().toLowerCase() === row.name.trim().toLowerCase());
                      if (!exists) {
                        updated.push(normalizeSiteRecord({
                          id: (crypto as any).randomUUID?.() || `s${Date.now()}-${Math.random()}`,
                          name: row.name,
                          clientName: row.clientName,
                          status: 'pending',
                          quoteSnapshot: { amount: row.amount, client: row.clientName },
                          batappliRef: row.ref,
                        }));
                        created++;
                      }
                    }
                    return updated;
                  });
                  setTimeout(() => {
                    setBatappliImportOpen(false);
                    showToast(`${created} chantier${created > 1 ? 's' : ''} importé${created > 1 ? 's' : ''} depuis Batappli${rows.length - created > 0 ? ` (${rows.length - created} déjà existant${rows.length - created > 1 ? 's' : ''})` : ''}`);
                  }, 100);
                };
                reader.readAsText(file, 'utf-8');
              };

              const filteredSites = safeSites
                .filter((s: any) => {
                  const st = s.status || "planned";
                  if (sitesFilter === "pending") return st === "pending";
                  if (sitesFilter === "planned") return st === "planned";
                  if (sitesFilter === "archived") return st === "archived";
                  const origineMatch = ORIGINE_OPTIONS.find(o => o.value === sitesFilter);
                  if (origineMatch) return s.origine === sitesFilter;
                  return true;
                })
                .filter((s: any) => {
                  if (!sitesSearch.trim()) return true;
                  const q = sitesSearch.toLowerCase();
                  return (s.name || '').toLowerCase().includes(q) || (s.clientName || '').toLowerCase().includes(q);
                })
                .sort((a: any, b: any) => {
                  const dir = sitesSort.dir === "asc" ? 1 : -1;
                  if (sitesSort.col === "name") return (a.name || '').localeCompare(b.name || '', 'fr') * dir;
                  if (sitesSort.col === "client") return (a.clientName || '').localeCompare(b.clientName || '', 'fr') * dir;
                  if (sitesSort.col === "budget") return (Number(a.quoteSnapshot?.amount ?? 0) - Number(b.quoteSnapshot?.amount ?? 0)) * dir;
                  if (sitesSort.col === "status") return (a.status || 'planned').localeCompare(b.status || 'planned') * dir;
                  if (sitesSort.col === "origine") return (a.origine || '').localeCompare(b.origine || '', 'fr') * dir;
                  return 0;
                });

              const SortTh = ({ col, label }: { col: string; label: string }) => (
                <th
                  className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 cursor-pointer select-none hover:text-neutral-800 whitespace-nowrap"
                  onClick={() => setSitesSort(prev => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }))}
                >
                  {label}{sitesSort.col === col && <span className="ml-1">{sitesSort.dir === "asc" ? "↑" : "↓"}</span>}
                </th>
              );

              const statusBadge = (status: string) => {
                const map: Record<string, { bg: string; label: string }> = {
                  pending:  { bg: "bg-amber-100 text-amber-800",    label: "À planifier" },
                  planned:  { bg: "bg-emerald-100 text-emerald-800", label: "En cours" },
                  archived: { bg: "bg-neutral-100 text-neutral-500", label: "Archivé" },
                };
                const s = map[status] || map.planned;
                return <span className={cx("px-2 py-0.5 rounded-full text-[11px] font-semibold", s.bg)}>{s.label}</span>;
              };

              const origineBadge = (origine: string | null) => {
                const opt = ORIGINE_OPTIONS.find(o => o.value === origine);
                if (!opt) return <span className="text-neutral-300 text-[11px]">—</span>;
                return <span className={cx("px-2 py-0.5 rounded-full text-[11px] font-semibold border", opt.badge)}>{opt.label}</span>;
              };

              return (
                <div className="space-y-4">
                  {/* KPI bar */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-xl border bg-white p-4 shadow-sm space-y-1">
                      <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">À planifier</div>
                      <div className={cx("text-2xl font-bold", pendingSites.length > 0 ? "text-amber-600" : "text-neutral-300")}>{pendingSites.length}</div>
                      <div className="text-[11px] text-neutral-400">En attente</div>
                    </div>
                    <div className="rounded-xl border bg-white p-4 shadow-sm space-y-1">
                      <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">En cours</div>
                      <div className={cx("text-2xl font-bold", plannedSites.length > 0 ? "text-emerald-600" : "text-neutral-300")}>{plannedSites.length}</div>
                      <div className="text-[11px] text-neutral-400">Planifiés</div>
                    </div>
                    <div className="rounded-xl border bg-white p-4 shadow-sm space-y-1">
                      <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">CA actifs</div>
                      <div className="text-2xl font-bold text-sky-700">{formatEUR(totalCA)}</div>
                      <div className="text-[11px] text-neutral-400">Budget total</div>
                    </div>
                    <div className="rounded-xl border bg-white p-4 shadow-sm space-y-1">
                      <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Archivés</div>
                      <div className="text-2xl font-bold text-neutral-400">{archivedSites.length}</div>
                      <div className="text-[11px] text-neutral-400">Terminés</div>
                    </div>
                  </div>

                  {/* Table card */}
                  <Card>
                    <CardContent className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold">Chantiers</span>
                          <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-2 py-1 rounded-full">{safeSites.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setBatappliImportOpen((v) => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-sm font-medium text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 transition"
                          >
                            <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            Importer Batappli
                          </button>
                          <AddSite onAdd={addSite} usedColors={safeSites.map((s: any) => s.color)} />
                        </div>
                      </div>

                      {/* Import Batappli panel */}
                      {batappliImportOpen && (
                        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-sky-900">Importer depuis Batappli</div>
                            <button onClick={() => setBatappliImportOpen(false)} className="text-neutral-400 hover:text-neutral-700 text-lg leading-none">✕</button>
                          </div>
                          <p className="text-xs text-neutral-600">
                            Dans Batappli, exportez vos chantiers en CSV (Fichier → Exporter → CSV), puis déposez le fichier ici.
                            Les chantiers déjà existants ne seront pas dupliqués.
                          </p>
                          <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-sky-300 rounded-lg cursor-pointer hover:bg-sky-100 transition">
                            <span className="text-sm text-sky-700 font-medium">Cliquer pour choisir un fichier CSV</span>
                            <span className="text-xs text-neutral-500 mt-1">Format Batappli (.csv)</span>
                            <input type="file" accept=".csv,.txt" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleBatappliImport(file); }} />
                          </label>
                        </div>
                      )}

                      {/* Filters + Search */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-0.5 flex-wrap">
                          {([["all", "Tous"], ["pending", "À planifier"], ["planned", "En cours"], ["archived", "Archivés"]] as [string, string][]).map(([val, label]) => (
                            <button key={val} onClick={() => setSitesFilter(val)}
                              className={cx("px-3 py-1 rounded-md text-xs font-medium transition", sitesFilter === val ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800")}
                            >{label}</button>
                          ))}
                          <div className="w-px h-4 bg-neutral-300 mx-0.5" />
                          {ORIGINE_OPTIONS.map(o => (
                            <button key={o.value} onClick={() => setSitesFilter(sitesFilter === o.value ? "all" : o.value)}
                              className={cx("px-2.5 py-1 rounded-md text-xs font-semibold border transition",
                                sitesFilter === o.value ? o.badge : "bg-white text-neutral-500 border-neutral-200 hover:text-neutral-800")}
                            >{o.label}</button>
                          ))}
                        </div>
                        <input
                          value={sitesSearch}
                          onChange={(e) => setSitesSearch(e.target.value)}
                          placeholder="Rechercher…"
                          className="ml-auto rounded-lg border border-neutral-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 w-44"
                        />
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto rounded-lg border border-neutral-100">
                        <table className="w-full text-sm">
                          <thead className="bg-neutral-50 border-b border-neutral-100">
                            <tr>
                              <th className="w-6 px-3 py-2" />
                              <SortTh col="name" label="Chantier" />
                              <SortTh col="client" label="Client" />
                              <SortTh col="budget" label="Budget" />
                              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 whitespace-nowrap">Planification</th>
                              <SortTh col="origine" label="Origine" />
                              <SortTh col="status" label="Statut" />
                              <th className="px-3 py-2" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-50">
                            {filteredSites.length === 0 && (
                              <tr><td colSpan={8} className="px-3 py-6 text-center text-sm text-neutral-400">Aucun chantier trouvé.</td></tr>
                            )}
                            {filteredSites.map((site: any) => (
                              <tr
                                key={site.id}
                                className="hover:bg-neutral-50 transition cursor-pointer"
                                onClick={() => openSiteDetail(site.id)}
                              >
                                <td className="px-3 py-2.5">
                                  <span className={cx("w-3 h-3 rounded-full inline-block border", site.color || "bg-neutral-300", site.color ? "border-black/10" : "border-neutral-200")} />
                                </td>
                                <td className="px-3 py-2.5 font-medium text-neutral-900 max-w-[200px] truncate">{site.name}</td>
                                <td className="px-3 py-2.5 text-neutral-600 max-w-[150px] truncate">
                                  {site.clientName ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openClientHistory(site.clientName); }}
                                      className="hover:underline hover:text-sky-700 text-left"
                                    >
                                      {site.clientName}
                                    </button>
                                  ) : <span className="text-neutral-300">—</span>}
                                </td>
                                <td className="px-3 py-2.5 text-neutral-700 whitespace-nowrap">
                                  {site.quoteSnapshot?.amount ? formatEUR(site.quoteSnapshot.amount) : <span className="text-neutral-300">—</span>}
                                </td>
                                <td className="px-3 py-2.5 text-neutral-500 text-xs whitespace-nowrap">
                                  {site.planningWeeks?.length ? (
                                    <span>{formatWeeksSummary(site.planningWeeks)}</span>
                                  ) : <span className="text-neutral-300">Non planifié</span>}
                                </td>
                                <td className="px-3 py-2.5">{origineBadge(site.origine)}</td>
                                <td className="px-3 py-2.5">{statusBadge(site.status || "planned")}</td>
                                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-1">
                                    {(site.status || "planned") === "pending" && (
                                      <button
                                        onClick={() => openSiteDetail(site.id, "planned")}
                                        className="px-2 py-0.5 rounded text-[11px] bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition whitespace-nowrap"
                                      >
                                        Planifier
                                      </button>
                                    )}
                                    {(site.status || "planned") === "archived" ? (
                                      <button
                                        onClick={() => setSites((prev: any[]) => prev.map((x: any) => x.id === site.id ? { ...x, status: "planned" } : x))}
                                        title="Restaurer"
                                        className="p-1 rounded text-neutral-400 hover:text-emerald-600 transition"
                                      ><RotateCcw className="w-3.5 h-3.5" /></button>
                                    ) : (
                                      <button
                                        onClick={() => setSites((prev: any[]) => prev.map((x: any) => x.id === site.id ? { ...x, status: "archived" } : x))}
                                        title="Archiver"
                                        className="p-1 rounded text-neutral-400 hover:text-neutral-700 transition"
                                      ><Archive className="w-3.5 h-3.5" /></button>
                                    )}
                                    <button
                                      onClick={() => {
                                        if (window.confirm(`Supprimer le chantier "${site.name}" ?\n\nLes affectations et notes liées seront aussi supprimées. Cette action peut être annulée avec Ctrl+Z.`)) {
                                          removeSite(site.id);
                                        }
                                      }}
                                      title="Supprimer"
                                      className="p-1 rounded text-neutral-400 hover:text-red-500 transition"
                                    ><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}


            {view === "salaries" && (
              <div className="space-y-3">
                <Card>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-base font-semibold flex items-center gap-2">
                        <span>Mes salariés</span>
                        <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-2 py-1 rounded-full">
                          {safePeople.filter((p: any) => p.status !== "archived").length} actif{safePeople.filter((p: any) => p.status !== "archived").length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <AddPerson onAdd={addPerson} usedColors={safePeople.map((p: any) => p.color)} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      {safePeople.filter((p: any) => p.status !== "archived").map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => openPersonDetail(p.id)}
                          className={cx(
                            "rounded-lg border p-3 bg-white shadow-sm flex items-start gap-3 text-left hover:border-neutral-300 transition",
                            p.status === "disabled" ? "border-amber-100 opacity-60" : "border-neutral-200"
                          )}
                        >
                          <div className={cx("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5", p.color || "bg-neutral-400")}>
                            {p.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <div className="font-semibold text-neutral-900 flex items-center gap-2 flex-wrap">
                              {p.name}
                              {p.role && <span className="text-[11px] text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">{p.role}</span>}
                              {p.status === "disabled" && <span className="text-[11px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">Désactivé</span>}
                            </div>
                            {(p.phone || p.email) && (
                              <div className="text-[11px] text-neutral-500 space-y-0.5">
                                {p.phone && <div>📞 {p.phone}</div>}
                                {p.email && <div>✉ {p.email}</div>}
                              </div>
                            )}
                            {p.skills?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {p.skills.slice(0, 3).map((s: any, idx: number) => (
                                  <span key={idx} className="text-[11px] px-2 py-0.5 bg-sky-50 border border-sky-100 text-sky-700 rounded-full">{s}</span>
                                ))}
                                {p.skills.length > 3 && <span className="text-[11px] text-neutral-400">+{p.skills.length - 3}</span>}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                      {safePeople.filter((p: any) => p.status !== "archived").length === 0 && (
                        <div className="text-sm text-neutral-500 md:col-span-2">Aucun salarié actif.</div>
                      )}
                    </div>
                    {safePeople.filter((p: any) => p.status === "archived").length > 0 && (
                      <div className="border-t pt-3 space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400 flex items-center gap-2">
                          <Archive className="w-3.5 h-3.5" />
                          Archivés ({safePeople.filter((p: any) => p.status === "archived").length})
                        </div>
                        <div className="grid md:grid-cols-2 gap-2">
                          {safePeople.filter((p: any) => p.status === "archived").map((p: any) => (
                            <button
                              key={p.id}
                              onClick={() => openPersonDetail(p.id)}
                              className="rounded-lg border border-neutral-100 p-3 bg-neutral-50 flex items-start gap-3 text-left hover:border-neutral-200 transition"
                            >
                              <div className={cx("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 grayscale", p.color || "bg-neutral-400")}>
                                {p.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-neutral-500 text-sm">{p.name}</div>
                                {p.role && <div className="text-[11px] text-neutral-400">{p.role}</div>}
                                <div className="text-[11px] text-neutral-400 mt-0.5">Cliquer pour restaurer ou supprimer</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {view === "rentabilite" && (() => {
              const noTauxWarning = safePeople.filter((p: any) => p.status !== "archived" && p.tauxJournalier == null).length;

              // Build all rows (unfiltered for KPIs/spotlights)
              const allRentaRows = safeSites.map((s: any) => {
                const siteAss = assignments.filter((a: any) => a.siteId === s.id);
                const moByPerson = people
                  .map((p: any) => {
                    const pAss = siteAss.filter((a: any) => a.personId === p.id);
                    if (!pAss.length) return null;
                    const jours = pAss.reduce((sum: number, a: any) => sum + getPortion(a.portion), 0);
                    const rate = Number.isFinite(Number(p.tauxJournalier)) ? Number(p.tauxJournalier) : null;
                    return { person: p, jours, rate, cout: rate != null ? jours * rate : null };
                  })
                  .filter(Boolean);
                const mainOeuvre = moByPerson.reduce((sum: number, r: any) => sum + (r.cout ?? 0), 0);
                const tauxMat = s.tauxMateriel != null ? s.tauxMateriel : tauxMaterielDefault;
                const linkedQuote = s.quoteId ? safeQuotes.find((q: any) => q.id === s.quoteId) : null;
                const budget = Number(linkedQuote?.amount ?? s.quoteSnapshot?.amount ?? 0);
                const coutMateriel = budget > 0 ? budget * (tauxMat / 100) : 0;
                const extraCouts = (s.couts || []).reduce((sum: number, c: any) => sum + (Number(c.montant) || 0), 0);
                const fraisFixes = budget > 0 ? budget * (fraisFixesDefault / 100) : 0;
                const coutTotal = mainOeuvre + coutMateriel + extraCouts + fraisFixes;
                const marge = budget > 0 ? budget - coutTotal : null;
                const margePercent = budget > 0 ? ((budget - coutTotal) / budget) * 100 : null;
                const totalFacture = (s.situations || []).reduce((sum: number, sit: any) => sum + (Number(sit.montant) || 0), 0);
                const resteAFacturer = budget > 0 ? budget - totalFacture : null;
                const nbJours = siteAss.reduce((sum: number, a: any) => sum + getPortion(a.portion), 0);
                return { site: s, moByPerson, mainOeuvre, coutMateriel, extraCouts, fraisFixes, coutTotal, budget, marge, margePercent, tauxMat, nbJours, totalFacture, resteAFacturer };
              });

              // KPI aggregates on all non-archived rows
              const kpiRows = allRentaRows.filter((r: any) => r.site.status !== "archived");
              const totalBudget = kpiRows.reduce((s: number, r: any) => s + r.budget, 0);
              const totalMO = kpiRows.reduce((s: number, r: any) => s + r.mainOeuvre, 0);
              const totalCout = kpiRows.reduce((s: number, r: any) => s + r.coutTotal, 0);
              const totalMarge = totalBudget > 0 ? totalBudget - totalCout : 0;
              const totalFactureGlobal = kpiRows.reduce((s: number, r: any) => s + r.totalFacture, 0);
              const avgMarge = kpiRows.filter((r: any) => r.margePercent != null).length > 0
                ? kpiRows.filter((r: any) => r.margePercent != null).reduce((s: number, r: any) => s + (r.margePercent ?? 0), 0) / kpiRows.filter((r: any) => r.margePercent != null).length
                : null;

              // Spotlight: top 3 by marge%, bottom 3 at risk (budget defined)
              const rowsWithMarge = kpiRows.filter((r: any) => r.margePercent != null && r.budget > 0);
              const sortedByMarge = [...rowsWithMarge].sort((a: any, b: any) => b.margePercent - a.margePercent);
              const top3 = sortedByMarge.slice(0, 3);
              const bottom3 = sortedByMarge.slice(-3).reverse();

              // Year filter options
              const allYears = Array.from(new Set(
                safeSites.flatMap((s: any) =>
                  Array.isArray(s.planningWeeks)
                    ? s.planningWeeks.map((wk: string) => parseInt(wk.slice(0, 4), 10)).filter(Number.isFinite)
                    : []
                )
              )).sort() as number[];

              // Apply filters
              const rentaRows = allRentaRows.filter((r: any) => {
                const s = r.site;
                if (rentaFilter === "active" && s.status === "archived") return false;
                if (rentaFilter === "archived" && s.status !== "archived") return false;
                if (rentaSearch.trim()) {
                  const q = rentaSearch.trim().toLowerCase();
                  const hay = `${s.name || ""} ${s.clientName || ""}`.toLowerCase();
                  if (!hay.includes(q)) return false;
                }
                if (rentaYear !== null) {
                  const hasYear = Array.isArray(s.planningWeeks) && s.planningWeeks.some((wk: string) => parseInt(wk.slice(0, 4), 10) === rentaYear);
                  if (!hasYear) return false;
                }
                return true;
              });

              const sorted = [...rentaRows].sort((a, b) => {
                const { col, dir } = rentaSort;
                const mult = dir === "asc" ? 1 : -1;
                const va = col === "name" ? a.site.name : col === "client" ? (a.site.clientName || "") : col === "budget" ? a.budget : col === "mo" ? a.mainOeuvre : col === "cout" ? a.coutTotal : col === "facture" ? a.totalFacture : (a.margePercent ?? -Infinity);
                const vb = col === "name" ? b.site.name : col === "client" ? (b.site.clientName || "") : col === "budget" ? b.budget : col === "mo" ? b.mainOeuvre : col === "cout" ? b.coutTotal : col === "facture" ? b.totalFacture : (b.margePercent ?? -Infinity);
                if (typeof va === "string") return mult * va.localeCompare(vb as string);
                return mult * ((va as number) - (vb as number));
              });

              const SortTh = ({ col, label, className = "" }: any) => (
                <th
                  className={"px-3 py-2 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wide cursor-pointer select-none hover:text-neutral-800 " + className}
                  onClick={() => setRentaSort(prev => ({ col, dir: prev.col === col && prev.dir === "desc" ? "asc" : "desc" }))}
                >
                  {label}{rentaSort.col === col ? (rentaSort.dir === "desc" ? " ↓" : " ↑") : ""}
                </th>
              );

              const rowColor = (pct: number | null) => {
                if (pct == null) return "";
                if (pct >= 20) return "bg-emerald-50";
                if (pct >= 5) return "bg-amber-50";
                return "bg-red-50";
              };
              const margeColor = (pct: number | null) => {
                if (pct == null) return "text-neutral-400";
                if (pct >= 20) return "text-emerald-700 font-semibold";
                if (pct >= 5) return "text-amber-700 font-semibold";
                return "text-red-600 font-semibold";
              };

              return (
                <div className="space-y-4">
                  {/* KPI cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "CA total devis", value: formatEUR(totalBudget), sub: `${kpiRows.filter((r: any) => r.budget > 0).length} chantiers avec budget` },
                      { label: "Main d'œuvre totale", value: formatEUR(totalMO), sub: `${kpiRows.reduce((s: number, r: any) => s + r.nbJours, 0).toFixed(1)} jours planifiés` },
                      { label: "Coût total estimé", value: formatEUR(totalCout), sub: "MO + matériel + frais fixes" },
                      { label: "Marge globale", value: totalBudget > 0 ? `${Math.round((totalMarge / totalBudget) * 100)}%` : "—", sub: totalBudget > 0 ? formatEUR(totalMarge) : "Aucun budget", color: totalBudget > 0 && totalMarge >= 0 ? "text-emerald-600" : "text-red-500" },
                    ].map((kpi: any) => (
                      <Card key={kpi.label}>
                        <CardContent className="p-3 space-y-1">
                          <div className="text-[11px] text-neutral-500 uppercase tracking-wide">{kpi.label}</div>
                          <div className={`text-xl font-bold ${kpi.color || "text-neutral-900"}`}>{kpi.value}</div>
                          {kpi.sub && <div className="text-[11px] text-neutral-400">{kpi.sub}</div>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Analytics spotlight */}
                  <div className="grid md:grid-cols-3 gap-3">
                    {/* Top performers */}
                    <Card>
                      <CardContent className="p-3 space-y-2">
                        <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Top marge</div>
                        {top3.length === 0 && <div className="text-xs text-neutral-400">Aucun chantier avec budget défini.</div>}
                        {top3.map((r: any) => (
                          <div key={r.site.id} className="flex items-center gap-2">
                            <span className="flex-1 text-xs text-neutral-800 truncate">{r.site.name}</span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{Math.round(r.margePercent)}%</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    {/* At-risk */}
                    <Card>
                      <CardContent className="p-3 space-y-2">
                        <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Chantiers à risque</div>
                        {bottom3.length === 0 && <div className="text-xs text-neutral-400">Aucun chantier avec budget défini.</div>}
                        {bottom3.map((r: any) => (
                          <div key={r.site.id} className="flex items-center gap-2">
                            <span className="flex-1 text-xs text-neutral-800 truncate">{r.site.name}</span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${r.margePercent < 5 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{Math.round(r.margePercent)}%</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    {/* Facturation progress */}
                    <Card>
                      <CardContent className="p-3 space-y-2">
                        <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Facturation</div>
                        <div className="text-xs text-neutral-600">
                          <span className="font-semibold text-sky-700">{formatEUR(totalFactureGlobal)}</span>
                          {totalBudget > 0 && <span className="text-neutral-400"> / {formatEUR(totalBudget)}</span>}
                        </div>
                        {totalBudget > 0 && (
                          <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-sky-500 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.round((totalFactureGlobal / totalBudget) * 100))}%` }}
                            />
                          </div>
                        )}
                        {totalBudget > 0 && (
                          <div className="text-[11px] text-neutral-400">{Math.round((totalFactureGlobal / totalBudget) * 100)}% facturé — reste {formatEUR(totalBudget - totalFactureGlobal)}</div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Settings collapsible */}
                  <div className="space-y-2">
                    <button
                      onClick={() => setRentaSettingsOpen(v => !v)}
                      className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-800 transition font-medium"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Paramètres
                      {rentaSettingsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {rentaSettingsOpen && (
                      <Card>
                        <CardContent className="p-3 flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-500 text-xs whitespace-nowrap">Matériel global</span>
                            <input type="number" min={0} max={200} step={1} value={tauxMaterielDefault} onChange={(e: any) => setTauxMaterielDefault(Number(e.target.value))} className="w-14 border border-neutral-200 rounded px-2 py-1 text-sm text-right" />
                            <span className="text-neutral-400 text-xs">% du devis</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-500 text-xs whitespace-nowrap">Frais fixes</span>
                            <input type="number" min={0} max={100} step={0.5} value={fraisFixesDefault} onChange={(e: any) => setFraisFixesDefault(Number(e.target.value))} className="w-14 border border-neutral-200 rounded px-2 py-1 text-sm text-right" />
                            <span className="text-neutral-400 text-xs">% du devis</span>
                          </div>
                          <span className="text-[11px] text-neutral-400">Matériel overridable par chantier</span>
                        </CardContent>
                      </Card>
                    )}
                    {noTauxWarning > 0 && (
                      <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        ⚠️ {noTauxWarning} salarié{noTauxWarning > 1 ? "s" : ""} sans taux journalier défini — la MO de ces salariés n'est pas comptabilisée. Allez dans <strong>Salariés</strong> pour les configurer.
                      </div>
                    )}
                  </div>

                  {/* Filter bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={rentaSearch}
                      onChange={(e: any) => setRentaSearch(e.target.value)}
                      placeholder="Rechercher par nom ou client…"
                      className="border border-neutral-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 w-56"
                    />
                    <div className="flex items-center gap-1">
                      {(["active", "all", "archived"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setRentaFilter(f)}
                          className={cx(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition",
                            rentaFilter === f ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                          )}
                        >
                          {f === "active" ? "En cours" : f === "all" ? "Tous" : "Archivés"}
                        </button>
                      ))}
                    </div>
                    {allYears.length > 0 && (
                      <select
                        value={rentaYear ?? ""}
                        onChange={(e: any) => setRentaYear(e.target.value ? Number(e.target.value) : null)}
                        className="border border-neutral-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-300"
                      >
                        <option value="">Toutes années</option>
                        {allYears.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    )}
                    <span className="text-xs text-neutral-400 ml-auto">{sorted.length} chantier{sorted.length !== 1 ? "s" : ""} affiché{sorted.length !== 1 ? "s" : ""}</span>
                  </div>

                  {/* Table */}
                  <Card>
                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-neutral-100">
                          <tr>
                            <th className="px-2 py-2 w-6" />
                            <SortTh col="name" label="Chantier" />
                            <SortTh col="client" label="Client" />
                            <th className="px-3 py-2 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Origine</th>
                            <SortTh col="budget" label="Budget" />
                            <SortTh col="mo" label="MO" />
                            <th className="px-3 py-2 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Mat. %</th>
                            <SortTh col="cout" label="Coût total" />
                            <SortTh col="marge" label="Marge" />
                            <SortTh col="facture" label="Facturé" />
                            <th className="px-3 py-2 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Reste</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                          {sorted.length === 0 && (
                            <tr><td colSpan={10} className="px-4 py-8 text-center text-neutral-400 text-sm">Aucun chantier correspondant aux filtres.</td></tr>
                          )}
                          {sorted.map(({ site: s, moByPerson, mainOeuvre, coutTotal, budget, marge, margePercent, tauxMat, nbJours, totalFacture, resteAFacturer }: any) => {
                            const isExpanded = expandedRentaRows.has(s.id);
                            return (
                              <>
                                <tr key={s.id} className={`hover:bg-neutral-50 transition ${rowColor(margePercent)}`}>
                                  <td className="px-2 py-2 w-6 text-center">
                                    {moByPerson.length > 0 && (
                                      <button
                                        onClick={() => setExpandedRentaRows(prev => {
                                          const next = new Set(prev);
                                          if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                                          return next;
                                        })}
                                        className="text-neutral-400 hover:text-neutral-700 transition"
                                      >
                                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                      </button>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <button onClick={() => openSiteDetail(s.id)} className="flex items-center gap-2 hover:underline text-left">
                                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.color}`} />
                                      <span className="font-medium text-neutral-900">{s.name}</span>
                                      {s.status === "archived" && <span className="text-[10px] text-neutral-400 border border-neutral-200 rounded px-1">archivé</span>}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2.5 text-neutral-600">{s.clientName ? <button onClick={() => openClientHistory(s.clientName)} className="hover:underline hover:text-sky-700 text-left">{s.clientName}</button> : <span className="text-neutral-300">—</span>}</td>
                                  <td className="px-3 py-2.5">{(() => { const opt = ORIGINE_OPTIONS.find(o => o.value === s.origine); return opt ? <span className={cx("px-2 py-0.5 rounded-full text-[11px] font-semibold border", opt.badge)}>{opt.label}</span> : <span className="text-neutral-300 text-[11px]">—</span>; })()}</td>
                                  <td className="px-3 py-2.5">{budget > 0 ? <span className="text-neutral-800">{formatEUR(budget)}</span> : <span className="text-neutral-300">Non défini</span>}</td>
                                  <td className="px-3 py-2.5 text-neutral-700">{formatEUR(mainOeuvre)}<span className="text-[11px] text-neutral-400 ml-1">({nbJours}j)</span></td>
                                  <td className="px-3 py-2 w-24">
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number" min={0} max={200} step={1}
                                        value={s.tauxMateriel ?? tauxMaterielDefault}
                                        onChange={(e: any) => {
                                          const val = e.target.value === "" ? null : Number(e.target.value);
                                          setSites((prev: any[]) => prev.map((x: any) => x.id === s.id ? { ...x, tauxMateriel: val } : x));
                                        }}
                                        className="w-12 border border-neutral-200 rounded px-1.5 py-0.5 text-xs text-right"
                                      />
                                      <span className="text-[11px] text-neutral-400">%</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 text-neutral-700">{formatEUR(coutTotal)}</td>
                                  <td className={`px-3 py-2.5 ${margeColor(margePercent)}`}>
                                    {marge != null ? (
                                      <span>{formatEUR(marge)} <span className="text-[11px]">({Math.round(margePercent!)}%)</span></span>
                                    ) : <span className="text-neutral-300">—</span>}
                                  </td>
                                  <td className="px-3 py-2.5 text-sky-700">
                                    {totalFacture > 0 ? formatEUR(totalFacture) : <span className="text-neutral-300">—</span>}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {resteAFacturer != null ? (
                                      <span className={resteAFacturer < 0 ? "text-red-600 font-semibold" : "text-neutral-700"}>{formatEUR(resteAFacturer)}</span>
                                    ) : <span className="text-neutral-300">—</span>}
                                  </td>
                                </tr>
                                {isExpanded && moByPerson.map((r: any) => (
                                  <tr key={`${s.id}-${r.person.id}`} className="bg-neutral-50 border-l-2 border-neutral-200">
                                    <td className="px-2 py-1.5" />
                                    <td colSpan={2} className="px-4 py-1.5">
                                      <div className="flex items-center gap-2 text-xs text-neutral-600">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${r.person.color || "bg-neutral-400"}`}>
                                          {r.person.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                                        </div>
                                        <span>{r.person.name}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-xs text-neutral-400">{r.jours}j</td>
                                    <td className="px-3 py-1.5 text-xs text-neutral-400">{r.rate != null ? `${r.rate} €/j` : <span className="text-amber-600">Taux non défini</span>}</td>
                                    <td className="px-3 py-1.5" />
                                    <td className="px-3 py-1.5 text-xs font-medium text-neutral-700">{r.cout != null ? formatEUR(r.cout) : "—"}</td>
                                    <td colSpan={3} className="px-3 py-1.5" />
                                  </tr>
                                ))}
                              </>
                            );
                          })}
                        </tbody>
                        {sorted.length > 0 && (
                          <tfoot className="border-t-2 border-neutral-200 bg-neutral-50">
                            <tr>
                              <td colSpan={3} className="px-3 py-2 pl-4 text-xs font-semibold text-neutral-500">TOTAL ({sorted.length})</td>
                              <td className="px-3 py-2 font-semibold text-neutral-800">{formatEUR(totalBudget)}</td>
                              <td className="px-3 py-2 font-semibold text-neutral-800">{formatEUR(totalMO)}</td>
                              <td className="px-3 py-2 text-[11px] text-neutral-400">{avgMarge != null ? `${Math.round(avgMarge)}% moy.` : ""}</td>
                              <td className="px-3 py-2 font-semibold text-neutral-800">{formatEUR(totalCout)}</td>
                              <td className={`px-3 py-2 ${margeColor(totalBudget > 0 ? (totalMarge / totalBudget) * 100 : null)}`}>
                                {totalBudget > 0 ? `${formatEUR(totalMarge)} (${Math.round((totalMarge / totalBudget) * 100)}%)` : "—"}
                              </td>
                              <td className="px-3 py-2 text-sky-700 font-semibold">{totalFactureGlobal > 0 ? formatEUR(totalFactureGlobal) : "—"}</td>
                              <td className="px-3 py-2 font-semibold text-neutral-700">{totalBudget > 0 ? formatEUR(totalBudget - totalFactureGlobal) : "—"}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </CardContent>
                  </Card>

                </div>
              );
            })()}

          </div>
        </div>
        <DragOverlay />
        </DndContext>
        </div>
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
                  placeholder="Nom du client"
                />
                <Input
                  value={quoteDetail.amount ?? ""}
                  onChange={(e: any) => setQuoteDetail((prev: any) => (prev ? { ...prev, amount: e.target.value } : prev))}
                  placeholder="Montant (€)"
                />
              </div>
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-neutral-700">Semaines prévues</div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setQuoteWeekPickerYear((y: number) => y - 1)}
                      aria-label="Année précédente"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="text-sm font-semibold w-14 text-center">{quoteWeekPickerYear}</div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setQuoteWeekPickerYear((y: number) => y + 1)}
                      aria-label="Année suivante"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-neutral-500">Sélectionnez les semaines pour ce devis. Sans sélection, le devis reste sans période définie.</p>
                <div className="grid grid-cols-6 gap-2 max-h-60 overflow-auto pr-1">
                  {quoteWeeksList.map((wk) => {
                    const wkKey = `${quoteWeekPickerYear}-W${pad2(wk)}`;
                    const active = Array.isArray(quoteDetail.planningWeeks) && quoteDetail.planningWeeks.includes(wkKey);
                    return (
                      <button
                        key={wkKey}
                        type="button"
                        onClick={() => toggleQuoteWeek(wkKey)}
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
                  <button
                    type="button"
                    className="underline"
                    onClick={() =>
                      setQuoteDetail((prev: any) => (prev ? { ...prev, planningWeeks: [] } : prev))
                    }
                  >
                    Toutes les semaines
                  </button>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => {
                      setQuoteDetail((prev: any) => (prev ? { ...prev, planningWeeks: [] } : prev));
                      setQuoteWeekPickerYear(getISOWeekYear(new Date()));
                    }}
                  >
                    Réinitialiser
                  </button>
                </div>
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
          onArchive={(id: string) => { setSites((prev) => prev.map((x) => x.id === id ? { ...x, status: "archived" } : x)); showToast(`"${siteDetail?.name}" a été archivé`); }}
          onDelete={(id: string) => removeSite(id)}
          onDuplicate={duplicateSite}
          usedColors={safeSites.filter((s: any) => s.id !== siteDetail?.id).map((s: any) => s.color)}
          assignments={assignments}
          people={people}
          tauxJournalierDefault={tauxJournalierDefault}
          tauxMaterielDefault={tauxMaterielDefault}
          quotes={quotes}
          onOpenClientHistory={openClientHistory}
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
          onSave={(payload: any) => { savePersonDetail(payload); }}
          onDelete={(id: string) => { removePerson(id); setPersonDetailOpen(false); setPersonDetail(null); }}
          usedColors={safePeople.filter((p: any) => p.id !== personDetail?.id).map((p: any) => p.color)}
        />
      )}

      <AnnotationDialog open={noteOpen} setOpen={setNoteOpen} value={currentNoteValue} onSave={saveNote} />

      {/* === ClientHistoryDialog === */}
      <ClientHistoryDialog
        open={clientHistoryOpen}
        onOpenChange={setClientHistoryOpen}
        clientName={clientHistoryName}
        sites={safeSites}
        quotes={safeQuotes}
        tenders={tenders}
        clients={clients}
        onSaveClient={saveClient}
      />

      {/* === Dialogs Clients === */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Exporter {exportType === "hours" ? "les heures" : "le planning"}</DialogTitle>
            <DialogDescription>Choisissez la période à exporter.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <Button variant={exportPreset === "week" ? "default" : "outline"} onClick={() => setExportPreset("week")}>Semaine courante</Button>
              <Button variant={exportPreset === "month" ? "default" : "outline"} onClick={() => setExportPreset("month")}>Mois courant</Button>
              <Button variant={exportPreset === "year" ? "default" : "outline"} onClick={() => setExportPreset("year")}>Année courante</Button>
              <Button variant={exportPreset === "custom" ? "default" : "outline"} onClick={() => setExportPreset("custom")}>Période personnalisée</Button>
            </div>
            {exportPreset === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-xs text-neutral-600">Début</span>
                  <Input type="date" value={exportStartDate} onChange={(e: any) => setExportStartDate(e.target.value)} />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-neutral-600">Fin</span>
                  <Input type="date" value={exportEndDate} onChange={(e: any) => setExportEndDate(e.target.value)} />
                </label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExportDialogOpen(false)}>Annuler</Button>
            <Button onClick={runExport}>Exporter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{eventEditId ? "Modifier l'événement" : "Nouvel événement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {/* Titre */}
            <Input
              value={eventDraft.title}
              onChange={(e: any) => setEventDraft((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Titre de l'événement"
              autoFocus
            />
            {/* Calendrier */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600">Calendrier</label>
              <div className="flex flex-wrap gap-2">
                {eventCalendars.map((cal) => (
                  <button
                    key={cal.id}
                    onClick={() => setEventDraft((prev) => ({ ...prev, calendarId: cal.id }))}
                    className={cx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition",
                      eventDraft.calendarId === cal.id
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
                    )}
                  >
                    <span className={cx("w-2 h-2 rounded-full shrink-0", cal.color || "bg-neutral-400")} />
                    {cal.name}
                  </button>
                ))}
              </div>
            </div>
            {/* Semaines — plage début→fin */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600">Période (semaines)</label>
              <div className="flex items-center gap-2">
                <select
                  className="flex-1 border border-neutral-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                  value={eventDraft.weekKeys[0] || ""}
                  onChange={(e) => {
                    const start = e.target.value;
                    const end = eventDraft.weekKeys[eventDraft.weekKeys.length - 1];
                    if (!start) { setEventDraft((prev) => ({ ...prev, weekKeys: [] })); return; }
                    if (!end || end < start) { setEventDraft((prev) => ({ ...prev, weekKeys: [start] })); return; }
                    const keys = eventWeekOptions.filter((wk) => wk >= start && wk <= end);
                    setEventDraft((prev) => ({ ...prev, weekKeys: keys }));
                  }}
                >
                  <option value="">Début</option>
                  {eventWeekOptions.map((wk) => <option key={wk} value={wk}>{wk.replace(`${eventWeekYear}-W`, "S")}</option>)}
                </select>
                <span className="text-neutral-400 shrink-0">→</span>
                <select
                  className="flex-1 border border-neutral-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                  value={eventDraft.weekKeys[eventDraft.weekKeys.length - 1] || ""}
                  onChange={(e) => {
                    const end = e.target.value;
                    const start = eventDraft.weekKeys[0];
                    if (!end || !start || end < start) { setEventDraft((prev) => ({ ...prev, weekKeys: end ? [end] : [] })); return; }
                    const keys = eventWeekOptions.filter((wk) => wk >= start && wk <= end);
                    setEventDraft((prev) => ({ ...prev, weekKeys: keys }));
                  }}
                >
                  <option value="">Fin</option>
                  {eventWeekOptions.map((wk) => <option key={wk} value={wk}>{wk.replace(`${eventWeekYear}-W`, "S")}</option>)}
                </select>
                <select
                  value={eventWeekYear}
                  onChange={(e) => setEventWeekYear(Number(e.target.value))}
                  className="border border-neutral-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                >
                  {[eventWeekYear - 1, eventWeekYear, eventWeekYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {eventDraft.weekKeys.length > 0 && (
                <div className="text-[11px] text-neutral-500">
                  {eventDraft.weekKeys.length} semaine{eventDraft.weekKeys.length > 1 ? "s" : ""} sélectionnée{eventDraft.weekKeys.length > 1 ? "s" : ""}
                  {eventDraft.weekKeys.length > 1 && ` (S${eventDraft.weekKeys[0].split("W")[1]} → S${eventDraft.weekKeys[eventDraft.weekKeys.length - 1].split("W")[1]})`}
                </div>
              )}
            </div>
            {/* Notes */}
            <Textarea
              value={eventDraft.notes}
              onChange={(e: any) => setEventDraft((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes (optionnel)"
              className="text-sm resize-none"
              rows={2}
            />
          </div>
          <DialogFooter className="gap-2">
            {eventEditId && (
              <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 mr-auto" onClick={deleteCalendarEvent}>
                Supprimer
              </Button>
            )}
            <Button variant="ghost" onClick={() => setEventDialogOpen(false)}>Annuler</Button>
            <Button onClick={createCalendarEvent} disabled={!eventDraft.title.trim() || eventDraft.weekKeys.length === 0}>
              {eventEditId ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={calendarDialogOpen} onOpenChange={setCalendarDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{calendarEditTarget ? "Modifier le calendrier" : "Nouveau calendrier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <Input
              value={calendarDraft.name}
              onChange={(e: any) => setCalendarDraft((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nom du calendrier"
              autoFocus
            />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600">Couleur</label>
              <ColorPicker
                value={calendarDraft.color}
                onChange={(c) => setCalendarDraft((prev) => ({ ...prev, color: c }))}
                usedColors={eventCalendars.map((cal: any) => cal.color)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {calendarEditTarget && !["cal-planned","cal-pending","cal-leave","cal-availability"].includes(calendarEditTarget.id) && (
              <Button
                variant="outline"
                className="text-red-500 border-red-200 hover:bg-red-50 mr-auto"
                onClick={() => { if (window.confirm(`Supprimer "${calendarDraft.name}" ? Les événements associés seront aussi supprimés.`)) { deleteCalendar(calendarEditTarget.id); setCalendarDialogOpen(false); } }}
              >
                Supprimer
              </Button>
            )}
            <Button variant="ghost" onClick={() => setCalendarDialogOpen(false)}>Annuler</Button>
            <Button onClick={createCalendar} disabled={!calendarDraft.name.trim()}>
              {calendarEditTarget ? "Enregistrer" : "Créer"}
            </Button>
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
        color={renameTarget?.type === 'site' ? renameTarget?.color : undefined}
        usedColors={renameTarget?.type === 'site'
          ? safeSites.filter((s: any) => s.id !== renameTarget?.id).map((s: any) => s.color)
          : safePeople.filter((p: any) => p.id !== renameTarget?.id).map((p: any) => p.color)}
        onSave={(newName: string, weeks?: string[], colorChoice?: string) => {
          if (!renameTarget) return;
          const n = newName.trim();
          if (!n) return;
          if (renameTarget.type === 'person') {
            renamePerson(renameTarget.id, n);
          } else {
            renameSite(renameTarget.id, n, colorChoice);
            if (colorChoice) {
              setRenameTarget((prev) => (prev ? { ...prev, color: colorChoice } : prev));
            }
            if (weeks) {
              const unique = Array.from(new Set(weeks)).filter(Boolean);
              setSiteWeekVisibility((prev) => {
                if (unique.length === 0) {
                  const { [renameTarget.id]: _omit, ...rest } = prev;
                  return rest;
                }
                return { ...prev, [renameTarget.id]: unique };
              });
              const derived = unique.length ? getWeekRangeFromKeys(unique) : null;
              updateSiteMeta(renameTarget.id, {
                planningWeeks: unique,
                startDate: derived?.startKey,
                endDate: derived?.endKey,
              });
            }
          }
          setRenameOpen(false);
        }}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* ===== DRAWER RÉGLAGES ===== */}
      {settingsOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setSettingsOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2 font-semibold text-neutral-800">
                <Settings className="w-4 h-4" /> Réglages
              </div>
              <button onClick={() => setSettingsOpen(false)} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">✕</button>
            </div>
            {/* Tabs */}
            <div className="flex border-b text-sm">
              {(["exports", "perso", "maintenance"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSettingsTab(t)}
                  className={cx(
                    "flex-1 py-2.5 font-medium transition",
                    settingsTab === t
                      ? "border-b-2 border-black text-black"
                      : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  {t === "exports" ? "Exports" : t === "perso" ? "Personnalisation" : "Maintenance"}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* ---- EXPORTS ---- */}
              {settingsTab === "exports" && (
                <div className="space-y-3">
                  <p className="text-xs text-neutral-500">Choisissez la période puis téléchargez le fichier souhaité.</p>

                  {/* Période */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-600">Période</label>
                    <div className="flex gap-2">
                      {(["week","month","year","custom"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setExportPreset(p)}
                          className={cx(
                            "text-xs px-3 py-1.5 rounded-md border transition",
                            exportPreset === p ? "bg-black text-white border-black" : "border-neutral-300 hover:bg-neutral-50"
                          )}
                        >
                          {p === "week" ? "Semaine" : p === "month" ? "Mois" : p === "year" ? "Année" : "Perso"}
                        </button>
                      ))}
                    </div>
                    {exportPreset === "custom" && (
                      <div className="flex gap-2 mt-2">
                        <Input type="date" value={exportStartDate} onChange={(e: any) => setExportStartDate(e.target.value)} className="text-xs" />
                        <Input type="date" value={exportEndDate} onChange={(e: any) => setExportEndDate(e.target.value)} className="text-xs" />
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-3 space-y-2">
                    <button
                      onClick={() => { exportPlanningCSV(); showToast("Planning CSV téléchargé"); }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition text-left"
                    >
                      <div className="w-8 h-8 rounded-md bg-sky-100 flex items-center justify-center shrink-0">
                        <Download className="w-4 h-4 text-sky-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Planning CSV</div>
                        <div className="text-xs text-neutral-400">Affectations par chantier et par jour</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { exportHoursCSV(); showToast("Heures CSV téléchargé"); }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition text-left"
                    >
                      <div className="w-8 h-8 rounded-md bg-amber-100 flex items-center justify-center shrink-0">
                        <Download className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Heures salariés CSV</div>
                        <div className="text-xs text-neutral-400">Récapitulatif heures par personne</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { exportJSON(); showToast("Sauvegarde JSON téléchargée"); }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition text-left"
                    >
                      <div className="w-8 h-8 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
                        <Download className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Sauvegarde JSON</div>
                        <div className="text-xs text-neutral-400">Export complet de toutes les données</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { window.print(); }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition text-left"
                    >
                      <div className="w-8 h-8 rounded-md bg-purple-100 flex items-center justify-center shrink-0">
                        <Download className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Imprimer / PDF</div>
                        <div className="text-xs text-neutral-400">Vue planning prête à l'impression</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* ---- PERSONNALISATION ---- */}
              {settingsTab === "perso" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-600">Logo (image)</label>
                    <div className="flex items-center gap-3">
                      {branding.logoImage ? (
                        <img src={branding.logoImage} alt="logo" className="h-12 w-12 rounded-lg object-cover border border-neutral-200" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg text-white flex items-center justify-center font-bold text-base border border-neutral-200" style={{ backgroundColor: branding.accentColor }}>
                          {branding.logoText}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 rounded-md border border-neutral-300 text-xs font-medium cursor-pointer hover:bg-neutral-50">
                          {branding.logoImage ? "Changer" : "Importer"}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 500_000) {
                                alert("Image trop lourde (max 500 Ko). Compresse-la d'abord.");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = () => {
                                const dataUrl = String(reader.result || "");
                                setBranding((prev) => ({ ...prev, logoImage: dataUrl }));
                              };
                              reader.readAsDataURL(file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {branding.logoImage && (
                          <button
                            onClick={() => setBranding((prev) => ({ ...prev, logoImage: null }))}
                            className="px-3 py-1.5 rounded-md border border-neutral-300 text-xs font-medium hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                          >Retirer</button>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-neutral-400">PNG, JPG, SVG ou WebP. Max 500 Ko. Si aucune image, les initiales ci-dessous sont utilisées.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-600">Initiales / logo texte</label>
                    <Input
                      value={branding.logoText}
                      onChange={(e: any) => setBranding((prev) => ({ ...prev, logoText: e.target.value }))}
                      placeholder="BT"
                      maxLength={3}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-600">Nom de l'entreprise</label>
                    <Input
                      value={branding.title}
                      onChange={(e: any) => setBranding((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="BTP Planner"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-600">Sous-titre</label>
                    <Input
                      value={branding.subtitle}
                      onChange={(e: any) => setBranding((prev) => ({ ...prev, subtitle: e.target.value }))}
                      placeholder="Tableau de bord & suivi collaboratif"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-600">Couleur d'accent</label>
                    <div className="flex flex-wrap gap-2">
                      {["#000000","#1d4ed8","#0891b2","#16a34a","#d97706","#dc2626","#7c3aed","#db2777","#374151"].map((c) => (
                        <button
                          key={c}
                          onClick={() => setBranding((prev) => ({ ...prev, accentColor: c }))}
                          className={cx(
                            "w-7 h-7 rounded-full border-2 transition",
                            branding.accentColor === c ? "border-neutral-900 scale-110" : "border-transparent"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-600">Densité d'affichage</label>
                    <div className="flex gap-2">
                      {(["normal","compact"] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setBranding((prev) => ({ ...prev, density: d }))}
                          className={cx(
                            "flex-1 py-2 rounded-md border text-sm transition",
                            branding.density === d ? "bg-black text-white border-black" : "border-neutral-300 hover:bg-neutral-50"
                          )}
                        >
                          {d === "normal" ? "Normal" : "Compact"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400">La personnalisation est mémorisée dans votre navigateur (local). Pour la retrouver sur un autre poste, exportez/importez les données.</p>
                </div>
              )}

              {/* ---- MAINTENANCE ---- */}
              {settingsTab === "maintenance" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Annuler une action</p>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                      <div>
                        <div className="text-sm font-medium">Annuler</div>
                        <div className="text-xs text-neutral-400">
                          {undoStack.current.length > 0
                            ? `${undoStack.current.length} action${undoStack.current.length > 1 ? "s" : ""} disponible${undoStack.current.length > 1 ? "s" : ""}`
                            : "Aucune action à annuler"}
                        </div>
                      </div>
                      <Button
                        onClick={() => { undo(); }}
                        disabled={undoStack.current.length === 0}
                        variant="outline"
                        className="gap-2"
                      >
                        <RotateCcw className="w-4 h-4" /> Annuler
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Import de données</p>
                    <button
                      onClick={() => { fileRef.current?.click(); }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition text-left"
                    >
                      <div className="w-8 h-8 rounded-md bg-neutral-100 flex items-center justify-center shrink-0">
                        <Upload className="w-4 h-4 text-neutral-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Importer JSON</div>
                        <div className="text-xs text-neutral-400">Restaurer depuis une sauvegarde</div>
                      </div>
                    </button>
                  </div>

                  <div className="text-xs text-neutral-400 pt-2 border-t">
                    L'annulation fonctionne pendant la session en cours. Pour revenir à une version antérieure au chargement de la page, utilisez l'import JSON.
                  </div>
                </div>
              )}

            </div>
          </div>
        </>
      )}
    </div>
  );
}
