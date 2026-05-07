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
  normalizeQuoteRecord,
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

const DEMO_PEOPLE = [
  normalizePersonRecord({ id: "p1", name: "Ali", color: "bg-rose-500", role: "Chef de chantier" }),
  normalizePersonRecord({ id: "p2", name: "Mina", color: "bg-amber-500", role: "Maçonne" }),
  normalizePersonRecord({ id: "p3", name: "Rachid", color: "bg-emerald-500", role: "Plombier" }),
];
const DEMO_SITES = [
  { id: "s1", name: "Chantier A", startDate: todayKey, endDate: nextMonthKey, color: SITE_COLORS[3] },
  { id: "s2", name: "Chantier B", startDate: todayKey, endDate: todayKey, color: SITE_COLORS[4] },
];
// (DEFAULT_EVENT_CALENDARS, QUOTE_COLUMNS, QUOTE_TONES imported from lib/planner/constants)
const DEMO_QUOTES = [
  { id: "q1", title: "Extension maison", client: "Mme Diallo", amount: 12000, status: "todo", planningWeeks: [weekKeyOf(new Date())] },
  { id: "q2", title: "Rénovation bureau", client: "Société Nova", amount: 18500, status: "draft", note: "Attente métrés" },
  { id: "q3", title: "Création terrasse", client: "M. Karim", amount: 7600, status: "pending", sentAt: todayKey },
  { id: "q4", title: "Salle de réunion", client: "Startup Hexa", amount: 9200, status: "won", sentAt: todayKey },
];
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

function SiteDetailDialog({ open, site, onClose, onSave, onArchive, onDelete, onDuplicate, fallbackYear, usedColors = [], assignments: assignmentsProp = [], people: peopleProp = [], tauxJournalierDefault: tauxJDefault = 350, tauxMaterielDefault: tauxMDefault = 15, quotes: quotesProp = [] }: any) {
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
  const [couts, setCouts] = useState<any[]>([]);
  const [newCoutLabel, setNewCoutLabel] = useState("");
  const [newCoutMontant, setNewCoutMontant] = useState("");
  const [situations, setSituations] = useState<any[]>([]);
  const [newSitLabel, setNewSitLabel] = useState("");
  const [newSitMontant, setNewSitMontant] = useState("");
  const [newSitDate, setNewSitDate] = useState("");

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
    setCouts(Array.isArray(site?.couts) ? site.couts : []);
    setNewCoutLabel("");
    setNewCoutMontant("");
    setSituations(Array.isArray(site?.situations) ? site.situations : []);
    setNewSitLabel("");
    setNewSitMontant("");
    setNewSitDate("");
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
      couts,
      situations,
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
  const budget = Number(linkedQuote?.amount ?? site?.quoteSnapshot?.amount ?? 0);
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
              <label className="space-y-1 md:col-span-2">
                <span className="text-[11px] text-neutral-600">Couleur</span>
                <ColorPicker value={color} onChange={setColor} usedColors={usedColors} />
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
            <div className="rounded-lg border border-neutral-200 p-3 space-y-1">
              <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Budget devis</div>
              {budget > 0 ? (
                <div className="text-xl font-bold text-neutral-900">{formatEUR(budget)}</div>
              ) : (
                <div className="text-neutral-400 text-xs">Pas de devis lié — associez un devis à ce chantier pour calculer la marge.</div>
              )}
              {linkedQuote && <div className="text-[11px] text-neutral-400">{linkedQuote.title}</div>}
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
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setName(person?.name || "");
    setRole(person?.role || "");
    setPhone(person?.phone || "");
    setTauxJournalier(person?.tauxJournalier != null ? String(person.tauxJournalier) : "");
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
    onSave({ ...person, name: trimmed, role: role.trim(), phone: phone.trim(), email: email.trim(), notes: notes.trim(), skills: parsedSkills, color, tauxJournalier: parsedTaux });
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
// Small helpers
// ==================================
function AddPerson({ onAdd, usedColors = [] }: { onAdd: (name: string, color: string, extra?: any) => void; usedColors?: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
      <AddPersonDialog open={open} setOpen={setOpen} onAdd={onAdd} usedColors={usedColors} />
    </>
  );
}
function AddSite({ onAdd, usedColors = [] }: { onAdd: (name: string, planningWeeks: string[], color: string) => void; usedColors?: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
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
  const [quotes, setQuotes] = useState<any[]>(() => DEMO_QUOTES.map(normalizeQuoteRecord));
  const [tauxJournalierDefault, setTauxJournalierDefault] = useState<number>(350);
  const [tauxMaterielDefault, setTauxMaterielDefault] = useState<number>(15);
  const [fraisFixesDefault, setFraisFixesDefault] = useState<number>(0);
  const [rentaSort, setRentaSort] = useState<{ col: string; dir: "asc" | "desc" }>({ col: "marge", dir: "desc" });
  const [expandedRentaRows, setExpandedRentaRows] = useState<Set<string>>(new Set());
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
  const [branding, setBranding] = useState({
    logoText: "BT",
    title: "BTP Planner",
    subtitle: "Tableau de bord & suivi collaboratif",
    accentColor: "#000000",
    density: "normal" as "normal" | "compact",
  });
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
    if (!selection || selection.length === 0) return true;
    return selection.includes(wk);
  }, [siteWeekVisibility]);

  // View / navigation
  const [view, setView] = useState<
    "planning" | "hours" | "calendar" | "devis" | "sites" | "salaries" | "rentabilite"
  >("planning");
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
  const [eventCalendars, setEventCalendars] = useState(DEFAULT_EVENT_CALENDARS);
  const [calendarEvents, setCalendarEvents] = useState<
    { id: string; title: string; dateKey: string; endDateKey?: string; calendarId?: string; color?: string; notes?: string }[]
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
    if (!title || eventDraft.weekKeys.length === 0) return;
    const selectedCalendar = eventCalendarsById[eventDraft.calendarId] || eventCalendarsById["cal-availability"];
    const eventsFromWeeks = eventDraft.weekKeys.map((weekKey) => {
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
        calendarId: selectedCalendar?.id,
        color: selectedCalendar?.color,
        notes: eventDraft.notes || undefined,
      };
    });
    setCalendarEvents((prev) => {
      const cleaned = eventEditId ? prev.filter((evt) => evt.id !== eventEditId) : prev;
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
      calendarId: prev.calendarId || "cal-availability",
    }));
    setEventEditId(null);
    setEventDialogOpen(false);
  }, [eventCalendarsById, eventDraft.calendarId, eventDraft.notes, eventDraft.title, eventDraft.weekKeys, eventEditId]);

  const openEventDialogForEvent = useCallback((event: any) => {
    const parsedDate = fromLocalKey(event.dateKey);
    const eventWeekKey = weekKeyOf(parsedDate);
    setEventWeekYear(getISOWeekYear(parsedDate));
    setEventEditId(event.id);
    setEventDraft((prev) => ({
      ...prev,
      title: event.title || "",
      dateKey: event.dateKey || todayKey,
      endDateKey: event.endDateKey || "",
      weekKeys: eventWeekKey ? [eventWeekKey] : [],
      notes: event.notes || "",
      color: "",
      calendarId: event.calendarId || "cal-availability",
    }));
    setEventDialogOpen(true);
  }, []);

  const deleteCalendarEvent = useCallback(() => {
    if (!eventEditId) return;
    setCalendarEvents((prev) => prev.filter((evt) => evt.id !== eventEditId));
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
    setSites((s) => s.filter((x) => x.id !== id));
    setAssignments((as) => as.filter((a) => a.siteId !== id));
    setNotes((prev) => { const next = { ...prev } as Record<string, any>; Object.keys(next).forEach((k) => { if (k.startsWith(`${id}|`)) delete (next as any)[k]; }); return next; });
    setSiteWeekVisibility((prev) => { const { [id]: _omit, ...rest } = prev; return rest; });
  };
  const updateSiteMeta = (id: string, patch: any) =>
    setSites((s) => s.map((x) => (x.id === id ? normalizeSiteRecord({ ...x, ...patch }) : x)));
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
    setSites(toArray(state.sites, DEMO_SITES).map(normalizeSiteRecord));
    setAssignments(toArray(state.assignments));
    setNotes(state.notes || {});
    setAbsencesByWeek(state.absencesByWeek || {});
    setAbsencesByDay(state.absencesByDay || {});
    setSiteWeekVisibility(state.siteWeekVisibility || {});
    setHoursPerDay(state.hoursPerDay ?? 8);
    setQuotes(toArray(state.quotes, DEMO_QUOTES).map(normalizeQuoteRecord));
    if (state.tauxJournalierDefault != null) setTauxJournalierDefault(state.tauxJournalierDefault);
    if (state.tauxMaterielDefault != null) setTauxMaterielDefault(state.tauxMaterielDefault);
    if (state.fraisFixesDefault != null) setFraisFixesDefault(state.fraisFixesDefault);
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
        if (remoteState && localState) {
          const remoteTs = Number(remoteState.updatedAt || 0);
          const localTs = Number(localState.updatedAt || 0);
          applyState(localTs > remoteTs ? localState : remoteState);
        } else if (remoteState) {
          applyState(remoteState);
        } else if (localState) {
          applyState(localState);
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
    tauxJournalierDefault,
    tauxMaterielDefault,
    fraisFixesDefault,
    eventCalendars,
    calendarEvents,
    updatedAt: stamp,
    clientId: clientIdRef.current,
  }), [people, sites, assignments, notes, absencesByWeek, absencesByDay, siteWeekVisibility, hoursPerDay, quotes, tauxJournalierDefault, tauxMaterielDefault, fraisFixesDefault, eventCalendars, calendarEvents]);

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
    const payload = { people, sites, assignments, notes, absencesByWeek, absencesByDay, siteWeekVisibility, hoursPerDay, quotes, tauxJournalierDefault, tauxMaterielDefault, fraisFixesDefault, eventCalendars, calendarEvents };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `btp-planner-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const onImport = (e: any) => {
    const f = e.target.files?.[0]; if(!f) return; const reader = new FileReader();
    reader.onload = () => { try { const data = JSON.parse(String(reader.result)); setPeople(toArray(data.people, DEMO_PEOPLE).map(normalizePersonRecord)); setSites(toArray(data.sites).map(normalizeSiteRecord)); setAssignments(toArray(data.assignments)); setNotes(data.notes||{}); setAbsencesByWeek(data.absencesByWeek||{}); setAbsencesByDay(data.absencesByDay||{}); setSiteWeekVisibility(data.siteWeekVisibility||{}); setHoursPerDay(data.hoursPerDay ?? 8); setQuotes(toArray(data.quotes, DEMO_QUOTES).map(normalizeQuoteRecord)); if (data.tauxJournalierDefault != null) setTauxJournalierDefault(data.tauxJournalierDefault); if (data.tauxMaterielDefault != null) setTauxMaterielDefault(data.tauxMaterielDefault); if (data.fraisFixesDefault != null) setFraisFixesDefault(data.fraisFixesDefault); setEventCalendars(toArray(data.eventCalendars, DEFAULT_EVENT_CALENDARS)); setCalendarEvents(toArray(data.calendarEvents)); } catch { alert("Fichier invalide"); } };
    reader.readAsText(f); e.target.value = '';
  };

  // ==========================
  // UI (Semaine / Mois / Heures)
  // ==========================
  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <Tabs value={view} onValueChange={(v: any) => setView(v)}>
          {/* Navbar unique */}
          <div className="rounded-xl border bg-white shadow-sm px-4 py-2.5 flex items-center gap-3 flex-wrap">
            {/* Logo */}
            <div className="flex items-center gap-2.5 pr-4 border-r border-neutral-100 shrink-0">
              <div className="h-8 w-8 rounded-lg text-white flex items-center justify-center font-bold text-sm shrink-0" style={{ backgroundColor: branding.accentColor }}>
                {branding.logoText}
              </div>
              <span className="text-sm font-semibold text-neutral-800 hidden sm:block">{branding.title}</span>
            </div>

            {/* Nav principale */}
            <div className="flex items-center gap-0.5">
              {[
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
                { v: "devis", label: "Devis" },
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 shadow-sm">
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
                          {site.quoteSnapshot?.amount && (
                            <span className="text-[11px] text-neutral-500">{formatEUR(site.quoteSnapshot.amount)}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-600 flex items-center gap-2">
                          <span>{site.clientName || site.quoteSnapshot?.client || "Client"}</span>
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
                          <span>{site.clientName || site.quoteSnapshot?.client || "Client"}</span>
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

      {view !== "dashboard" && (
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
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Salariés</div>
                    <AddPerson onAdd={addPerson} usedColors={safePeople.map((p: any) => p.color)} />
                  </div>
                  <div className="space-y-1.5">
                    {safePeople.filter((p: any) => p.status !== "archived").map((p: any) => {
                      const DAY_LABELS = ["L","Ma","Me","J","V"];
                      const absenceDays = weekDays.map((d) => getDayAbsence(p.id, toLocalKey(d)));
                      const hasAnyAbsence = absenceDays.some(Boolean);
                      const absOpen = absenceExpandedId === p.id;
                      return (
                        <div key={p.id} className={cx("rounded-lg border border-neutral-100 bg-neutral-50 p-2", p.status === "disabled" && "opacity-50")}>
                          {/* Row 1: chip + actions */}
                          <div className="flex items-center justify-between gap-1">
                            <PersonChip person={p} />
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Absence dots indicator + toggle */}
                              <button
                                onClick={() => setAbsenceExpandedId(absOpen ? null : p.id)}
                                title="Gérer les absences"
                                className={cx(
                                  "h-7 px-1.5 rounded-md flex items-center gap-0.5 transition border text-[9px] font-bold",
                                  hasAnyAbsence
                                    ? "border-amber-300 bg-amber-50 text-amber-700"
                                    : "border-neutral-200 bg-white text-neutral-300 hover:border-neutral-400 hover:text-neutral-500"
                                )}
                              >
                                {hasAnyAbsence ? (
                                  absenceDays.map((abs, i) => (
                                    <span key={i} className={cx("w-2 h-2 rounded-full", abs ? (ABSENCE_COLORS[abs] || "bg-neutral-300") : "bg-neutral-200")} />
                                  ))
                                ) : (
                                  <span className="text-[9px] leading-none px-0.5">abs</span>
                                )}
                              </button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                title={`Affecter ${p.name} toute la S${getISOWeek(weekDays[0])}`}
                                onClick={() => {
                                  const siteId = sitesForCurrentWeek[0]?.id;
                                  if (!siteId) return;
                                  weekDateKeys.forEach((dateKey) => {
                                    if (isAbsentOnWeek(p.id, currentWeekKey)) return;
                                    if (getDayAbsence(p.id, dateKey)) return;
                                    const already = assignments.some((a: any) => a.personId === p.id && a.date === dateKey && a.siteId === siteId);
                                    if (already) return;
                                    const id = (crypto as any).randomUUID?.() ?? `${p.id}-${siteId}-${dateKey}-${Date.now()}`;
                                    setAssignments((prev: any) => [...prev, { id, personId: p.id, siteId, date: dateKey }]);
                                  });
                                }}
                              ><CalendarRange className="w-3.5 h-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openPersonDetail(p.id)}><Edit3 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </div>
                          {/* Row 2: absence panel (collapsible) */}
                          {absOpen && (
                            <div className="mt-1.5 pt-1.5 border-t border-neutral-200">
                              <div className="flex items-center gap-1 flex-wrap">
                                {weekDays.map((d, i) => {
                                  const dk = toLocalKey(d);
                                  const abs = getDayAbsence(p.id, dk);
                                  return (
                                    <button
                                      key={dk}
                                      onClick={() => cycleDayAbsence(p.id, dk)}
                                      title={abs ? ABSENCE_LABELS[abs] : `Marquer absence ${DAY_LABELS[i]}`}
                                      className={cx(
                                        "h-6 px-2 rounded text-[9px] font-bold transition border flex items-center gap-1",
                                        abs
                                          ? cx(ABSENCE_COLORS[abs], "text-white border-transparent")
                                          : "bg-white text-neutral-400 border-neutral-200 hover:border-neutral-400"
                                      )}
                                    >
                                      {DAY_LABELS[i]}{abs && <span className="opacity-80">{abs}</span>}
                                    </button>
                                  );
                                })}
                                {/* Toute la semaine */}
                                {(["CP","MAL","OFF"] as const).map((type) => (
                                  <button
                                    key={type}
                                    onClick={() => {
                                      weekDays.forEach((d) => {
                                        const dk = toLocalKey(d);
                                        setAbsencesByDay((prev) => {
                                          const day = { ...(prev[dk] || {}) };
                                          const cur = day[p.id];
                                          if (cur === type) { delete day[p.id]; } else { day[p.id] = type; }
                                          return { ...prev, [dk]: day };
                                        });
                                      });
                                    }}
                                    title={`${type} toute la semaine`}
                                    className={cx(
                                      "h-6 px-2 rounded text-[9px] font-bold border transition",
                                      absenceDays.every((a) => a === type)
                                        ? cx(ABSENCE_COLORS[type], "text-white border-transparent")
                                        : "bg-white text-neutral-400 border-neutral-200 hover:border-neutral-400"
                                    )}
                                  >
                                    {type} sem.
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between w-full">
                    <div
                      className="font-medium flex items-center gap-2 cursor-pointer flex-1"
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
                        <div key={s.id} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2">
                            <span className={cx("w-2.5 h-2.5 rounded-full border", s.color || "bg-neutral-300", s.color ? "border-black/10" : "border-neutral-200")} />
                            {s.name}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openSiteDetail(s.id)}
                            aria-label={`Modifier ${s.name}`}
                          ><Edit3 className="w-4 h-4" /></Button>
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
                      { key: "planned", label: "Planifiés", active: calFilterPlanned, toggle: () => setCalFilterPlanned(v => !v), dot: "bg-sky-500" },
                      { key: "pending", label: "En attente", active: calFilterPending, toggle: () => setCalFilterPending(v => !v), dot: "bg-amber-400" },
                      { key: "absences", label: "Absences", active: calFilterAbsences, toggle: () => setCalFilterAbsences(v => !v), dot: "bg-rose-400" },
                      { key: "events", label: "Événements", active: calFilterEvents, toggle: () => setCalFilterEvents(v => !v), dot: "bg-violet-400" },
                    ].map(({ key, label, active, toggle, dot }) => (
                      <button
                        key={key}
                        onClick={toggle}
                        className={cx(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition",
                          active ? "bg-white border-neutral-300 text-neutral-700" : "bg-neutral-100 border-transparent text-neutral-400"
                        )}
                      >
                        <span className={cx("w-2 h-2 rounded-full", active ? dot : "bg-neutral-300")} />
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1" />
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setCalendarDraft({ name: "", color: COLORS[3] }); setCalendarEditTarget(null); setCalendarDialogOpen(true); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition"
                    >+ Calendrier</button>
                    <button
                      onClick={() => setEventDialogOpen(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-700 transition"
                    >+ Événement</button>
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
                          <div
                            key={week.weekKey}
                            className={cx(
                              "flex-shrink-0 border-r last:border-r-0 flex flex-col",
                              isCurrentWeek ? "bg-sky-50" : "bg-white"
                            )}
                            style={{ width: 152 }}
                          >
                            {/* Header semaine */}
                            <div className={cx(
                              "px-2 py-2 border-b sticky top-0 z-10",
                              isCurrentWeek ? "bg-sky-100" : "bg-neutral-50"
                            )}>
                              {monthStart && (
                                <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-0.5">
                                  {week.start.toLocaleString("fr-FR", { month: "long" })}
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className={cx("text-sm font-bold", isCurrentWeek ? "text-sky-700" : "text-neutral-800")}>
                                    S{pad2(week.weekNum)}
                                  </span>
                                  <span className="text-[10px] text-neutral-400 ml-1.5">{formatFR(week.start, true)}</span>
                                </div>
                                <button
                                  onClick={() => openEventDialogForDate(toLocalKey(week.start))}
                                  className="w-5 h-5 rounded flex items-center justify-center text-neutral-300 hover:text-neutral-600 hover:bg-white transition"
                                  title="Ajouter un événement"
                                ><Plus className="w-3 h-3" /></button>
                              </div>
                            </div>

                            {/* Post-its */}
                            <div className="p-1.5 space-y-1 flex-1">
                              {/* Chantiers planifiés */}
                              {calFilterPlanned && week.planned.map((site: any) => (
                                <div
                                  key={`p-${site.id}`}
                                  className={cx("text-[11px] px-2 py-0.5 rounded-md truncate font-medium text-white shadow-sm", site.color || "bg-sky-500")}
                                  title={site.name}
                                >{site.name}</div>
                              ))}
                              {/* Chantiers en attente */}
                              {calFilterPending && week.pending.map((site: any) => (
                                <div
                                  key={`w-${site.id}`}
                                  className="text-[11px] px-2 py-0.5 rounded-md truncate font-medium bg-amber-100 text-amber-800 border border-amber-200"
                                  title={site.name}
                                >⏳ {site.name}</div>
                              ))}
                              {/* Absences */}
                              {calFilterAbsences && week.absences.map((name: string) => (
                                <div
                                  key={`a-${name}`}
                                  className="text-[11px] px-2 py-0.5 rounded-md truncate font-medium bg-rose-100 text-rose-700"
                                  title={name}
                                >🏖 {name}</div>
                              ))}
                              {/* Événements */}
                              {calFilterEvents && week.events.map((event: any) => {
                                const cal = eventCalendarsById[event.calendarId];
                                return (
                                  <button
                                    key={event.id}
                                    onClick={() => openEventDialogForEvent(event)}
                                    className={cx(
                                      "w-full text-left text-[11px] px-2 py-0.5 rounded-md truncate font-medium transition hover:opacity-80",
                                      cal?.color ? cx(cal.color, "text-white") : "bg-violet-100 text-violet-800"
                                    )}
                                    title={event.title}
                                  >📌 {event.title}</button>
                                );
                              })}
                              {/* Semaine vide */}
                              {week.planned.length === 0 && week.pending.length === 0 && week.absences.length === 0 && week.events.length === 0 && (
                                <div className="h-4" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Légende calendriers custom */}
                {eventCalendars.filter(c => !c.isDefault).length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap px-1">
                    {eventCalendars.map((cal) => (
                      <button
                        key={cal.id}
                        onClick={() => setEventCalendars(prev => prev.map(c => c.id === cal.id ? { ...c, visible: !c.visible } : c))}
                        className={cx("flex items-center gap-1.5 text-xs transition", !cal.visible && "opacity-40")}
                      >
                        <span className={cx("w-2.5 h-2.5 rounded-full", cal.color || "bg-neutral-400")} />
                        {cal.name}
                      </button>
                    ))}
                    <button
                      onClick={() => { setCalendarDraft({ name: "", color: COLORS[3] }); setCalendarEditTarget(null); setCalendarDialogOpen(true); }}
                      className="text-xs text-neutral-400 hover:text-neutral-600"
                    >+ ajouter</button>
                  </div>
                )}
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
                            onCreateSite={createSiteFromQuote}
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
                        {plannedSites.length + pendingSites.length + archivedSites.length} chantier{(plannedSites.length + pendingSites.length + archivedSites.length) > 1 ? "s" : ""}
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
                                    <div className="text-[11px] text-neutral-600">
                                      {formatWeeksSummary(site.planningWeeks || [])}
                                    </div>
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
                                {site.globalNotes && (
                                  <div className="text-[11px] text-neutral-500 italic truncate" title={site.globalNotes}>{site.globalNotes}</div>
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

                      {archivedSites.length > 0 && (
                        <div className="space-y-2">
                          <button
                            className="flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-700 w-full"
                            onClick={() => setSidebarArchivedOpen((v) => !v)}
                          >
                            {sidebarArchivedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            Chantiers archivés
                            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-400 font-semibold">{archivedSites.length}</span>
                          </button>
                          {sidebarArchivedOpen && (
                            <div className="grid md:grid-cols-2 gap-2">
                              {archivedSites.map((site) => (
                                <div
                                  key={site.id}
                                  className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 flex items-start gap-3 opacity-60"
                                >
                                  <span className={cx("w-3 h-3 rounded-full mt-1 border flex-shrink-0", site.color || "bg-neutral-300", site.color ? "border-black/10" : "border-neutral-200")} aria-hidden />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-neutral-700 line-through truncate">{site.name}</div>
                                    {site.clientName && <div className="text-[11px] text-neutral-500">{site.clientName}</div>}
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setSites((prev) => prev.map((x) => x.id === site.id ? { ...x, status: "planned" } : x))}
                                      title="Restaurer"
                                      className="h-7 w-7"
                                    ><RotateCcw className="w-3.5 h-3.5" /></Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => removeSite(site.id)}
                                      title="Supprimer définitivement"
                                      className="h-7 w-7 text-red-400 hover:text-red-600"
                                    ><Trash2 className="w-3.5 h-3.5" /></Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

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
              const rentaRows = safeSites.filter((s: any) => s.status !== "archived").map((s: any) => {
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

              const sorted = [...rentaRows].sort((a, b) => {
                const { col, dir } = rentaSort;
                const mult = dir === "asc" ? 1 : -1;
                const va = col === "name" ? a.site.name : col === "client" ? (a.site.clientName || "") : col === "budget" ? a.budget : col === "mo" ? a.mainOeuvre : col === "cout" ? a.coutTotal : col === "facture" ? a.totalFacture : (a.margePercent ?? -Infinity);
                const vb = col === "name" ? b.site.name : col === "client" ? (b.site.clientName || "") : col === "budget" ? b.budget : col === "mo" ? b.mainOeuvre : col === "cout" ? b.coutTotal : col === "facture" ? b.totalFacture : (b.margePercent ?? -Infinity);
                if (typeof va === "string") return mult * va.localeCompare(vb as string);
                return mult * ((va as number) - (vb as number));
              });

              const totalBudget = rentaRows.reduce((s: number, r: any) => s + r.budget, 0);
              const totalMO = rentaRows.reduce((s: number, r: any) => s + r.mainOeuvre, 0);
              const totalCout = rentaRows.reduce((s: number, r: any) => s + r.coutTotal, 0);
              const totalMarge = totalBudget > 0 ? totalBudget - totalCout : 0;
              const totalFactureGlobal = rentaRows.reduce((s: number, r: any) => s + r.totalFacture, 0);
              const avgMarge = rentaRows.filter((r: any) => r.margePercent != null).length > 0
                ? rentaRows.filter((r: any) => r.margePercent != null).reduce((s: number, r: any) => s + (r.margePercent ?? 0), 0) / rentaRows.filter((r: any) => r.margePercent != null).length
                : null;

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
                      { label: "CA total devis", value: formatEUR(totalBudget), sub: `${rentaRows.filter((r: any) => r.budget > 0).length} chantiers avec budget` },
                      { label: "Main d'œuvre totale", value: formatEUR(totalMO), sub: `${rentaRows.reduce((s: number, r: any) => s + r.nbJours, 0).toFixed(1)} jours planifiés` },
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

                  {/* Settings bar */}
                  <div className="flex flex-wrap gap-3 items-start">
                    <Card className="flex-1 min-w-[320px]">
                      <CardContent className="p-3 flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Settings className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="text-neutral-500 text-xs font-semibold uppercase tracking-wide">Paramètres</span>
                        </div>
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
                    {noTauxWarning > 0 && (
                      <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        ⚠️ {noTauxWarning} salarié{noTauxWarning > 1 ? "s" : ""} sans taux journalier défini — la MO de ces salariés n'est pas comptabilisée. Allez dans <strong>Salariés</strong> pour les configurer.
                      </div>
                    )}
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
                            <tr><td colSpan={10} className="px-4 py-8 text-center text-neutral-400 text-sm">Aucun chantier actif. Ajoutez des chantiers et affectez des salariés.</td></tr>
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
                                    </button>
                                  </td>
                                  <td className="px-3 py-2.5 text-neutral-600">{s.clientName || <span className="text-neutral-300">—</span>}</td>
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
                              <td colSpan={3} className="px-3 py-2 pl-4 text-xs font-semibold text-neutral-500">TOTAL</td>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{eventEditId ? "Modifier l'événement" : "Créer un événement"}</DialogTitle>
            <DialogDescription>Ajoutez un événement de disponibilité ou de congé et sélectionnez les semaines concernées.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={eventDraft.title}
              onChange={(e: any) => setEventDraft((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Titre de l'événement"
            />
            <div className="grid md:grid-cols-2 gap-2 items-center">
              <select
                value={eventDraft.calendarId}
                onChange={(e) => setEventDraft((prev) => ({ ...prev, calendarId: e.target.value }))}
                className="border rounded-md px-2 py-1 text-sm w-full"
              >
                <option value="cal-availability">Disponibilités (noir)</option>
                <option value="cal-leave">Congés payés (rose)</option>
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-neutral-600">Semaines ciblées</label>
                <div className="flex items-center gap-2">
                  <select
                    value={eventWeekYear}
                    onChange={(e) => setEventWeekYear(Number(e.target.value))}
                    className="border rounded-md px-2 py-1 text-xs"
                  >
                    {[eventWeekYear - 1, eventWeekYear, eventWeekYear + 1].map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEventDraft((prev) => ({ ...prev, weekKeys: [] }))}
                  >
                    Effacer
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-32 overflow-auto rounded-md border border-neutral-200 bg-neutral-50 p-2">
                {eventWeekOptions.map((weekKey) => {
                  const checked = eventDraft.weekKeys.includes(weekKey);
                  return (
                    <label key={weekKey} className="flex items-center gap-1 text-[11px] text-neutral-600">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setEventDraft((prev) => ({
                            ...prev,
                            weekKeys: checked
                              ? prev.weekKeys.filter((wk) => wk !== weekKey)
                              : [...prev.weekKeys, weekKey],
                          }))
                        }
                      />
                      {weekKey.replace(`${eventWeekYear}-W`, "S")}
                    </label>
                  );
                })}
              </div>
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
            {eventEditId && (
              <Button variant="outline" onClick={deleteCalendarEvent}>
                Supprimer
              </Button>
            )}
            <Button onClick={createCalendarEvent}>{eventEditId ? "Enregistrer" : "Créer"}</Button>
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
              <ColorPicker
                value={calendarDraft.color}
                onChange={(c) => setCalendarDraft((prev) => ({ ...prev, color: c }))}
                usedColors={eventCalendars.map((cal: any) => cal.color)}
              />
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
                  <p className="text-xs text-neutral-400">La personnalisation est locale à votre navigateur pour l'instant.</p>
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
