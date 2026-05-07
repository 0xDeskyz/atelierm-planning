// ==================================
// Constantes & Démo
// ==================================

// Palette triée arc-en-ciel : rouge → orange → jaune → vert → cyan → bleu → indigo → violet → rose → neutres
export const COLORS = [
  // Rouges
  "bg-red-400", "bg-red-500", "bg-red-600",
  "bg-rose-400", "bg-rose-500", "bg-rose-600",
  // Oranges
  "bg-orange-400", "bg-orange-500", "bg-orange-600",
  "bg-amber-400", "bg-amber-500", "bg-amber-600",
  // Jaunes
  "bg-yellow-400", "bg-yellow-500",
  // Limes / Verts
  "bg-lime-400", "bg-lime-500",
  "bg-green-400", "bg-green-500", "bg-green-600",
  "bg-emerald-400", "bg-emerald-500", "bg-emerald-600",
  // Teals / Cyans
  "bg-teal-400", "bg-teal-500",
  "bg-cyan-400", "bg-cyan-500",
  // Bleus
  "bg-sky-400", "bg-sky-500",
  "bg-blue-400", "bg-blue-500", "bg-blue-600",
  // Indigos / Violets
  "bg-indigo-400", "bg-indigo-500",
  "bg-violet-400", "bg-violet-500",
  "bg-purple-400", "bg-purple-500",
  // Fuchsia / Roses
  "bg-fuchsia-400", "bg-fuchsia-500",
  "bg-pink-400", "bg-pink-500",
  // Neutres
  "bg-slate-400", "bg-slate-500", "bg-slate-600",
  "bg-zinc-500", "bg-neutral-600",
];
export const SITE_COLORS = COLORS;

// Pastels (3 options) pour mini post-it & surlignage
export const PASTELS: Record<string, { bg: string; ring: string; text: string }> = {
  mint: { bg: "bg-green-100", ring: "ring-green-200", text: "text-green-900" },
  sky: { bg: "bg-sky-100", ring: "ring-sky-200", text: "text-sky-900" },
  peach: { bg: "bg-orange-100", ring: "ring-orange-200", text: "text-orange-900" },
};

// Données démo — ces constantes dépendent de COLORS / SITE_COLORS mais pas de runtime Date
// (DEMO_SITES dépend de todayKey/nextMonthKey qui restent dans page.tsx)
export const DEMO_PEOPLE_RAW = [
  { id: "p1", name: "Ali", color: "bg-rose-500", role: "Chef de chantier" },
  { id: "p2", name: "Mina", color: "bg-amber-500", role: "Maçonne" },
  { id: "p3", name: "Rachid", color: "bg-emerald-500", role: "Plombier" },
];

export const DEFAULT_EVENT_CALENDARS = [
  { id: "cal-planned", name: "Chantiers planifiés", color: "bg-sky-500", visible: true, isDefault: true },
  { id: "cal-pending", name: "Chantiers non planifiés", color: "bg-amber-500", visible: true, isDefault: true },
  { id: "cal-leave", name: "Congés payés", color: "bg-rose-500", visible: true, isDefault: true },
  { id: "cal-availability", name: "Disponibilités", color: "bg-black", visible: true, isDefault: true },
];

export const QUOTE_COLUMNS = [
  { id: "todo", label: "À réaliser", hint: "Devis à préparer", tone: "sky" },
  { id: "draft", label: "Préparé, pas envoyé", hint: "Brouillons prêts", tone: "amber" },
  { id: "pending", label: "En attente de réponse", hint: "Envoyé au client", tone: "indigo" },
  { id: "won", label: "Validé", hint: "Accepté", tone: "emerald" },
  { id: "lost", label: "Refusé", hint: "Avec motif optionnel", tone: "rose" },
];

export const QUOTE_TONES: Record<string, { bg: string; border: string; text: string; chip: string }> = {
  sky: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-800", chip: "bg-sky-500" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", chip: "bg-amber-500" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-800", chip: "bg-indigo-500" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", chip: "bg-emerald-500" },
  rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", chip: "bg-rose-500" },
};

// DEMO_QUOTES raw data (weekKeyOf depends on runtime, so the final array is built in page.tsx)
export const DEMO_QUOTES_RAW = [
  { id: "q1", title: "Extension maison", client: "Mme Diallo", amount: 12000, status: "todo" },
  { id: "q2", title: "Rénovation bureau", client: "Société Nova", amount: 18500, status: "draft", note: "Attente métrés" },
  { id: "q3", title: "Création terrasse", client: "M. Karim", amount: 7600, status: "pending" },
  { id: "q4", title: "Salle de réunion", client: "Startup Hexa", amount: 9200, status: "won" },
];

export const EVENT_TYPES = [
  { id: "reunion", label: "Réunion", icon: "🗣", color: "bg-violet-100 text-violet-800 border-violet-200" },
  { id: "livraison", label: "Livraison", icon: "🚚", color: "bg-sky-100 text-sky-800 border-sky-200" },
  { id: "inspection", label: "Inspection", icon: "🔍", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { id: "autre", label: "Autre", icon: "📌", color: "bg-neutral-100 text-neutral-700 border-neutral-200" },
] as const;

export type EventType = typeof EVENT_TYPES[number]["id"] | null;

export const EVENT_CELL_STYLE: Record<string, string> = {
  reunion: "bg-violet-100 text-violet-800",
  livraison: "bg-sky-100 text-sky-800",
  inspection: "bg-amber-100 text-amber-800",
  autre: "bg-neutral-100 text-neutral-700",
};

export const ABSENCE_TYPES = ["CP", "MAL", "OFF"] as const;
export type AbsenceType = typeof ABSENCE_TYPES[number];
export const ABSENCE_COLORS: Record<AbsenceType, string> = { CP: "bg-amber-400", MAL: "bg-red-400", OFF: "bg-slate-400" };
export const ABSENCE_LABELS: Record<AbsenceType, string> = { CP: "Congé payé", MAL: "Maladie", OFF: "Jour off / RTT" };
export const ABSENCE_BADGE: Record<string, string> = { CP: "bg-amber-400", MAL: "bg-red-400", OFF: "bg-slate-400" };
