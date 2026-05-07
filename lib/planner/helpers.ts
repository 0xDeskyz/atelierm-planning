import { COLORS, SITE_COLORS } from "./constants";

// ==================================
// cx utility
// ==================================
export const cx = (...cls: (string | false | null | undefined)[]) => cls.filter(Boolean).join(" ");

// ==================================
// Date Helpers (ISO week, local time, Lun->Ven)
// ==================================
export const pad2 = (n: number) => String(n).padStart(2, "0");
export const toLocalKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export function startOfISOWeekLocal(d: Date) {
  const c = new Date(d);
  const day = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - day);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function getWeekDatesLocal(anchor: Date) {
  const start = startOfISOWeekLocal(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(start);
    dd.setDate(start.getDate() + i);
    return dd;
  });
}

export function getISOWeekAndYear(date: Date) {
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

export const getISOWeek = (d: Date) => getISOWeekAndYear(d).week;
export const getISOWeekYear = (d: Date) => getISOWeekAndYear(d).isoYear;
export const weekKeyOf = (d: Date) => `${getISOWeekYear(d)}-W${pad2(getISOWeek(d))}`;
export const getISOWeeksInYear = (year: number) => getISOWeek(new Date(year, 11, 28));
export const getISOWeekStart = (year: number, weekNum: number) => {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const week1Start = new Date(jan4);
  week1Start.setDate(jan4.getDate() - jan4Day);
  const weekStart = new Date(week1Start);
  weekStart.setDate(week1Start.getDate() + (weekNum - 1) * 7);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

export const parseWeekKey = (wk: string) => {
  const match = wk.match(/^(\d{4})-W(\d{1,2})$/i);
  if (!match) return null;
  return { year: Number(match[1]), week: Number(match[2]) };
};

export const getWeekRangeFromKeys = (weekKeys: string[]) => {
  const parsed = weekKeys
    .map(parseWeekKey)
    .filter(Boolean) as { year: number; week: number }[];
  if (parsed.length === 0) return null;
  parsed.sort((a, b) => (a.year - b.year) || (a.week - b.week));
  const start = getISOWeekStart(parsed[0].year, parsed[0].week);
  const end = getISOWeekStart(parsed[parsed.length - 1].year, parsed[parsed.length - 1].week);
  const endDate = new Date(end);
  endDate.setDate(endDate.getDate() + 6);
  return { startKey: toLocalKey(start), endKey: toLocalKey(endDate) };
};

export function getMonthWeeks(anchor: Date) {
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

export const startOfMonthLocal = (d: Date) => {
  const dt = new Date(d.getFullYear(), d.getMonth(), 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

export const endOfMonthLocal = (d: Date) => {
  const dt = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

export const startOfQuarterLocal = (d: Date) => {
  const quarterStartMonth = Math.floor(d.getMonth() / 3) * 3;
  const dt = new Date(d.getFullYear(), quarterStartMonth, 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

export const endOfQuarterLocal = (d: Date) => {
  const quarterStartMonth = Math.floor(d.getMonth() / 3) * 3;
  const dt = new Date(d.getFullYear(), quarterStartMonth + 3, 0);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

export const startOfYearLocal = (year: number) => {
  const dt = new Date(year, 0, 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

export const endOfYearLocal = (year: number) => {
  const dt = new Date(year, 12, 0);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

// ── Jours fériés français ────────────────────────────────────────────────────
export function getEasterDate(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function getFrenchHolidays(year: number): Map<string, string> {
  const map = new Map<string, string>();
  const add = (d: Date, name: string) => map.set(toLocalKey(d), name);
  const d = (m: number, day: number) => new Date(year, m - 1, day);
  const easter = getEasterDate(year);
  const addDays = (base: Date, n: number) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);

  add(d(1, 1), "Jour de l'an");
  add(addDays(easter, 1), "Lundi de Pâques");
  add(d(5, 1), "Fête du Travail");
  add(d(5, 8), "Victoire 1945");
  add(addDays(easter, 39), "Ascension");
  add(addDays(easter, 50), "Lundi de Pentecôte");
  add(d(7, 14), "Fête Nationale");
  add(d(8, 15), "Assomption");
  add(d(11, 1), "Toussaint");
  add(d(11, 11), "Armistice");
  add(d(12, 25), "Noël");
  return map;
}

export function getFrenchHolidaysWithBridges(year: number): Map<string, string> {
  const holidays = getFrenchHolidays(year);
  const result = new Map(holidays);
  holidays.forEach((_name, key) => {
    const [y, m, day] = key.split("-").map(Number);
    const date = new Date(y, m - 1, day);
    const dow = date.getDay(); // 0=Sun, 1=Mon…
    if (dow === 2) { // Mardi → Lundi est un pont
      const bridge = new Date(y, m - 1, day - 1);
      if (!result.has(toLocalKey(bridge))) result.set(toLocalKey(bridge), "Pont");
    }
    if (dow === 4) { // Jeudi → Vendredi est un pont
      const bridge = new Date(y, m - 1, day + 1);
      if (!result.has(toLocalKey(bridge))) result.set(toLocalKey(bridge), "Pont");
    }
  });
  return result;
}
// ─────────────────────────────────────────────────────────────────────────────

export const normalizePersonRecord = (p: any) => ({
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
  status: ["active","disabled","archived"].includes(p?.status) ? p.status : "active" as "active" | "disabled" | "archived",
  tauxJournalier: Number.isFinite(Number(p?.tauxJournalier)) ? Number(p.tauxJournalier) : null,
});

export const normalizeClientRecord = (c: any) => ({
  id: typeof c?.id === "string" ? c.id : (typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `c${Date.now()}`),
  name: typeof c?.name === "string" ? c.name : "",
  contactName: c?.contactName || "",
  phone: c?.phone || "",
  email: c?.email || "",
  address: c?.address || "",
  city: c?.city || "",
  notes: c?.notes || "",
  tauxJournalier: Number.isFinite(Number(c?.tauxJournalier)) ? Number(c.tauxJournalier) : null,
});

export const hashString = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
};

export const ensureId = (seed: string, prefix: string) => {
  if (seed) return `${prefix}-${seed}`;
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const normalizeSiteRecord = (site: any) => {
  const base = typeof site === "object" && site !== null ? site : {};
  const start = (base as any)?.startDate || toLocalKey(new Date());
  const end = (base as any)?.endDate || start;
  const colorIndex = hashString(String((base as any)?.id || (base as any)?.name || start)) % SITE_COLORS.length;
  const color = (base as any)?.color || SITE_COLORS[colorIndex] || SITE_COLORS[0];
  const status = (base as any)?.status === "archived" ? "archived" : (base as any)?.status === "pending" ? "pending" : "planned";
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
    tauxMateriel: Number.isFinite(Number((base as any)?.tauxMateriel)) ? Number((base as any).tauxMateriel) : null,
    couts: Array.isArray((base as any)?.couts) ? (base as any).couts.map((c: any) => ({
      id: c?.id || (typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `cout-${Date.now()}-${Math.random()}`),
      label: typeof c?.label === "string" ? c.label : "",
      montant: Number.isFinite(Number(c?.montant)) ? Number(c.montant) : 0,
    })) : [],
  };
};

export function formatFR(d: Date, withWeekday: boolean = false): string {
  try {
    const opts: Intl.DateTimeFormatOptions = withWeekday
      ? { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
      : { day: '2-digit', month: 'long', year: 'numeric' };
    return d.toLocaleDateString('fr-FR', opts);
  } catch {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
}

export const formatEUR = (val?: number) => {
  if (!Number.isFinite(val)) return "";
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val || 0);
  } catch {
    return `${val} €`;
  }
};

export const normalizeQuoteRecord = (quote: any) => {
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
    status,
    address: (base as any)?.address?.trim?.() || undefined,
    city: (base as any)?.city?.trim?.() || (base as any)?.cityOrPostal || undefined,
    contactName: (base as any)?.contactName?.trim?.() || (base as any)?.client || undefined,
    contactPhone: (base as any)?.contactPhone?.trim?.() || undefined,
    planningWeeks: Array.isArray((base as any)?.planningWeeks) ? (base as any)?.planningWeeks : [],
  };

  if ((status === "pending" || status === "won") && !quote?.sentAt) {
    patch.sentAt = todayKeyLocal;
  }
  if (status !== "lost") {
    patch.reason = undefined;
  }

  return patch;
};

// ==================================
// Misc helpers
// ==================================
export const isDateWithin = (date: Date, start: Date, end: Date) => date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
export const cellKey = (siteId: string, dateKey: string) => `${siteId}|${dateKey}`;
export const mapWeekDates = (src: Date[], dest: Date[]) => {
  const len = Math.min(src.length, dest.length);
  const result: Record<string, string> = {};
  for (let i = 0; i < len; i++) {
    result[toLocalKey(src[i])] = toLocalKey(dest[i]);
  }
  return result;
};
export const fromLocalKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y || 0, (m || 1) - 1, d || 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
};
export const parseWeekList = (input: string, fallbackYear: number) => {
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
export const getSiteDateRange = (site: any, fallbackKey: string) => {
  const planningWeeks = Array.isArray(site?.planningWeeks) ? site.planningWeeks : [];
  const derived = planningWeeks.length ? getWeekRangeFromKeys(planningWeeks) : null;
  const startKey = derived?.startKey || site?.startDate || fallbackKey;
  const endKey = derived?.endKey || site?.endDate || site?.startDate || fallbackKey;
  return { startKey, endKey };
};
export const formatWeeksSummary = (weeks: string[]) => {
  if (!weeks || weeks.length === 0) return "Toutes les semaines";
  const parsed = weeks
    .map(parseWeekKey)
    .filter(Boolean) as { year: number; week: number }[];
  if (parsed.length === 0) return "Toutes les semaines";
  parsed.sort((a, b) => (a.year - b.year) || (a.week - b.week));
  const first = parsed[0];
  const last = parsed[parsed.length - 1];
  if (first.year === last.year) {
    if (first.week === last.week) return `S${pad2(first.week)} • ${first.year}`;
    return `S${pad2(first.week)} → S${pad2(last.week)} • ${first.year}`;
  }
  return `S${pad2(first.week)} ${first.year} → S${pad2(last.week)} ${last.year}`;
};
export const getQuoteWeekRange = (quote: any) => {
  const planningWeeks = Array.isArray(quote?.planningWeeks) ? quote.planningWeeks : [];
  return planningWeeks.length ? getWeekRangeFromKeys(planningWeeks) : null;
};
export const toArray = (val: any, fallback: any[] = []) => (Array.isArray(val) ? val : fallback);
export const getPortion = (val: any) => {
  const portion = Number(val ?? 1);
  return Number.isFinite(portion) && portion > 0 ? portion : 1;
};
export function debounce<T extends (...args: any[]) => void>(fn: T, ms = 600) {
  let t: any;
  return (...args: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
