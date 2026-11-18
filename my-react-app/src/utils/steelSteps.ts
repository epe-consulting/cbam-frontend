/**
 * CBAM "Iron and steel" wizard contract (docs/steel-implementation-spec.md §3, §5, §7;
 * docs/steel-api-contract.md). Everything regulatory here is copied from the spec.
 */

import i18n, { lazyLabels, lazyOptions, tr } from '../i18n';

/** Stored answer value of the product category – compared by routing, never translate it. */
export const STEEL_CATEGORY_NAME = 'Iron and Steel';

export function isSteelCategory(category: string | null | undefined): boolean {
  const c = (category ?? '').trim().toLowerCase();
  return c === 'iron and steel' || c === 'iron_and_steel';
}

/* ─── Steps ─── */

export const IS_STEP = {
  GENERAL: 'IS_GENERAL',
  PROCESSES: 'IS_PROCESSES',
  DIRECT_EMISSIONS: 'IS_DIRECT_EMISSIONS',
  ENERGY_FLOWS: 'IS_ENERGY_FLOWS',
  ELECTRICITY: 'IS_ELECTRICITY',
  PRECURSORS: 'IS_PRECURSORS',
  REPORTING_PARAMS: 'IS_REPORTING_PARAMS',
} as const;

/** Wizard step numbers for steel (aluminium uses 1–14 and 99; these never collide). */
const STEEL_STEP_NUMBERS: Record<string, number> = {
  IS_GENERAL: 20,
  IS_PROCESSES: 22,
  IS_DIRECT_EMISSIONS: 23,
  IS_ENERGY_FLOWS: 24,
  IS_ELECTRICITY: 25,
  IS_PRECURSORS: 26,
  IS_REPORTING_PARAMS: 27,
};

export function isSteelStepCode(code: string | null | undefined): boolean {
  return code != null && code in STEEL_STEP_NUMBERS;
}

export function steelStepNumber(code: string): number | null {
  return STEEL_STEP_NUMBERS[code] ?? null;
}

/** Static previous steps (used for Back after a page reload, spec §5.1). */
export const STEEL_STEP_PREVIOUS: Record<string, string> = {
  IS_GENERAL: 'CBAM_PRODUCT_DETAILS',
  IS_PROCESSES: 'IS_GENERAL',
  IS_DIRECT_EMISSIONS: 'IS_PROCESSES',
  IS_ENERGY_FLOWS: 'IS_DIRECT_EMISSIONS',
  IS_ELECTRICITY: 'IS_ENERGY_FLOWS',
  IS_PRECURSORS: 'IS_ELECTRICITY',
  IS_REPORTING_PARAMS: 'IS_PRECURSORS',
};

/* ─── Question codes ─── */

export const IS_Q = {
  IMPORT_YEAR: 'IS_IMPORT_YEAR',
  DATA_SOURCE: 'IS_DATA_SOURCE',
  /** Id of the company installation selected from Settings (replaces the old IS_INSTALLATION step). */
  INSTALLATION_REF: 'IS_INSTALLATION_REF',
  /** Legacy free-text country of calculations made before the change (read-only fallback). */
  INSTALLATION_COUNTRY_LEGACY: 'IS_INSTALLATION_COUNTRY',
  PROCESS: 'IS_PROCESS_ENTRY',
  FUEL: 'IS_FUEL_ENTRY',
  MATERIAL: 'IS_PROCESS_MATERIAL_ENTRY',
  MASS_BALANCE: 'IS_MASS_BALANCE_ENTRY',
  HEAT: 'IS_HEAT_ENTRY',
  WASTE_GAS: 'IS_WASTE_GAS_ENTRY',
  EL_PRODUCED: 'IS_EL_PRODUCED_ENTRY',
  ELECTRICITY: 'IS_ELECTRICITY_ENTRY',
  PRECURSOR: 'IS_PRECURSOR_ENTRY',
  REPORTING_PARAM: 'IS_REPORTING_PARAM_ENTRY',
} as const;

/** Row questions that reference a process_id (cascade-deleted with the process, spec §5.5). */
export const PROCESS_CHILD_QUESTIONS: string[] = [
  IS_Q.FUEL, IS_Q.MATERIAL, IS_Q.MASS_BALANCE, IS_Q.HEAT, IS_Q.WASTE_GAS,
  IS_Q.EL_PRODUCED, IS_Q.ELECTRICITY, IS_Q.PRECURSOR, IS_Q.REPORTING_PARAM,
];

export const DATA_SOURCE = { DEFAULT: 'DEFAULT_VALUES', ACTUAL: 'ACTUAL_VALUES' } as const;

/* ─── Categories, routes, methods (spec §3.1, §5.4) ─── */

export type SteelCategory =
  | 'SINTERED_ORE' | 'FEMN' | 'FECR' | 'FENI' | 'PIG_IRON' | 'DRI' | 'CRUDE_STEEL' | 'IRON_STEEL_PRODUCTS';

export const STEEL_CATEGORIES: SteelCategory[] = [
  'SINTERED_ORE', 'FEMN', 'FECR', 'FENI', 'PIG_IRON', 'DRI', 'CRUDE_STEEL', 'IRON_STEEL_PRODUCTS',
];

/** Display labels (locale keys steel.category.*); the codes themselves are stored and never translated. */
export const CATEGORY_LABELS: Record<string, string> = lazyLabels('steel.category', [...STEEL_CATEGORIES, 'HYDROGEN']);

export function categoryLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return CATEGORY_LABELS[code] ?? code;
}

/** "Most downstream" order for JOINT processes (spec §5.4). */
const CATEGORY_RANK: Record<string, number> = {
  SINTERED_ORE: 0, FEMN: 1, FECR: 1, FENI: 1, PIG_IRON: 2, DRI: 2, CRUDE_STEEL: 3, IRON_STEEL_PRODUCTS: 4,
};

export function mostDownstream(categories: string[]): string {
  let best = '';
  let rank = -1;
  for (const c of categories) {
    const r = CATEGORY_RANK[c] ?? -1;
    if (r > rank) { rank = r; best = c; }
  }
  return best;
}

export type SteelRoute =
  | 'SINTERING' | 'PELLETISATION' | 'EAF_SMELTING' | 'BLAST_FURNACE' | 'SMELTING_REDUCTION'
  | 'DIRECT_REDUCTION' | 'BOF' | 'EAF' | 'FORMING';

export const ROUTE_LABELS: Record<SteelRoute, string> = lazyLabels<SteelRoute>('steel.route', [
  'SINTERING', 'PELLETISATION', 'EAF_SMELTING', 'BLAST_FURNACE', 'SMELTING_REDUCTION',
  'DIRECT_REDUCTION', 'BOF', 'EAF', 'FORMING',
]);

export const CATEGORY_ROUTES: Record<SteelCategory, SteelRoute[]> = {
  SINTERED_ORE: ['SINTERING', 'PELLETISATION'],
  FEMN: ['EAF_SMELTING'],
  FECR: ['EAF_SMELTING'],
  FENI: ['EAF_SMELTING'],
  PIG_IRON: ['BLAST_FURNACE', 'SMELTING_REDUCTION'],
  DRI: ['DIRECT_REDUCTION'],
  CRUDE_STEEL: ['BOF', 'EAF'],
  IRON_STEEL_PRODUCTS: ['FORMING'],
};

/** Categories whose system boundary requires the mass balance method (spec §3.1, OQ-11). */
export const MB_MANDATORY = new Set<string>(['FEMN', 'FECR', 'FENI', 'PIG_IRON', 'DRI', 'CRUDE_STEEL']);

export type SteelMethod = 'STANDARD' | 'MASS_BALANCE';
export const METHOD_LABELS: Record<SteelMethod, string> = lazyLabels<SteelMethod>('steel.method', ['STANDARD', 'MASS_BALANCE']);

/** Expected precursor categories per consuming category (G05d Table 2-2 via spec §3.3). */
export const EXPECTED_PRECURSORS: Record<SteelCategory, string[]> = {
  SINTERED_ORE: [],
  FEMN: ['SINTERED_ORE'],
  FECR: ['SINTERED_ORE'],
  FENI: ['SINTERED_ORE'],
  PIG_IRON: ['HYDROGEN', 'SINTERED_ORE', 'FEMN', 'FECR', 'FENI', 'PIG_IRON', 'DRI'],
  DRI: ['HYDROGEN', 'SINTERED_ORE', 'FEMN', 'FECR', 'FENI', 'PIG_IRON', 'DRI'],
  CRUDE_STEEL: ['FEMN', 'FECR', 'FENI', 'PIG_IRON', 'DRI', 'CRUDE_STEEL'],
  IRON_STEEL_PRODUCTS: ['FEMN', 'FECR', 'FENI', 'PIG_IRON', 'DRI', 'CRUDE_STEEL', 'IRON_STEEL_PRODUCTS'],
};

/* ─── Option lists for row fields ─── */

export const FUEL_UNITS = [
  { value: 't', label: 't' },
  { value: '1000Nm3', label: '1000 Nm³' },
  { value: 'TJ', label: 'TJ' },
];

export const FACTOR_SOURCES = lazyOptions('steel.factorSource', ['STANDARD_TABLE', 'NATIONAL_INVENTORY', 'SUPPLIER', 'LAB_ANALYSIS', 'OTHER']);

export const HEAT_METHODS = lazyOptions('steel.heatMethod', ['SUPPLIER_VERIFIED', 'FUEL_MIX', 'CHP', 'STANDARD_90', 'ZERO']);

export const WASTE_GASES = lazyOptions('steel.wasteGas', ['BLAST_FURNACE_GAS', 'OXYGEN_STEEL_FURNACE_GAS', 'COKE_OVEN_GAS', 'OTHER']);

/** Waste gas fuel codes – warning IS_W_WG_IN_FUEL when used as a fuel row. */
export const WASTE_GAS_FUEL_CODES = new Set(['BLAST_FURNACE_GAS', 'OXYGEN_STEEL_FURNACE_GAS', 'COKE_OVEN_GAS']);

/** EF of natural gas used as cap for waste gas in heat/electricity fuel mix (spec §4.2(g), §6.3(2)). */
export const EF_NG_WASTE_GAS = 56.1;

export const ELECTRICITY_SOURCES = lazyOptions('steel.electricitySource', ['GRID', 'OWN_PRODUCTION', 'PPA', 'DIRECT_LINK']);

export const REDUCING_AGENTS = lazyOptions('steel.reducingAgent', ['COKE', 'COAL', 'NATURAL_GAS', 'HYDROGEN', 'CHARCOAL_BIOMASS', 'OTHER', 'UNKNOWN']);

/** Reporting parameters per category: 'req' = ✱ mandatory, 'opt' = ◇ "if known" (spec §5.4). */
export type ParamField =
  | 'redukciono_sredstvo' | 'mn_posto' | 'cr_posto' | 'ni_posto' | 'ostali_legirni_posto'
  | 'c_posto' | 'otpad_t_po_t' | 'pre_consumer_otpad_posto';

export const PARAM_LABELS: Record<ParamField, string> = lazyLabels<ParamField>('steel.param', [
  'redukciono_sredstvo', 'mn_posto', 'cr_posto', 'ni_posto', 'ostali_legirni_posto',
  'c_posto', 'otpad_t_po_t', 'pre_consumer_otpad_posto',
]);

export const CATEGORY_PARAMS: Record<SteelCategory, Partial<Record<ParamField, 'req' | 'opt'>>> = {
  SINTERED_ORE: {},
  PIG_IRON: { redukciono_sredstvo: 'req', mn_posto: 'req', cr_posto: 'req', ni_posto: 'req', ostali_legirni_posto: 'req' },
  FEMN: { mn_posto: 'req', c_posto: 'req' },
  FECR: { cr_posto: 'req', c_posto: 'req' },
  FENI: { ni_posto: 'req', c_posto: 'req' },
  DRI: { redukciono_sredstvo: 'req', mn_posto: 'req', cr_posto: 'req', ni_posto: 'req', ostali_legirni_posto: 'req' },
  CRUDE_STEEL: {
    redukciono_sredstvo: 'opt', mn_posto: 'req', cr_posto: 'req', ni_posto: 'req', ostali_legirni_posto: 'req',
    otpad_t_po_t: 'req', pre_consumer_otpad_posto: 'req',
  },
  IRON_STEEL_PRODUCTS: {
    redukciono_sredstvo: 'opt', mn_posto: 'req', cr_posto: 'req', ni_posto: 'req', ostali_legirni_posto: 'req',
    otpad_t_po_t: 'req', pre_consumer_otpad_posto: 'req',
  },
};

/** Out of scope list for UI help "Nije podržano" (spec §1.8). Translated: locale key steel.notSupported. */
export function notSupportedList(): string[] {
  return i18n.t('steel.notSupported', { returnObjects: true }) as string[];
}

/* ─── Row types (exact JSON shapes, spec §5.4 / contract §2) ─── */

export interface ProcessOutput { cn_code: string; kolicina: string }

export interface ProcessRow {
  row_id: string;
  process_id: string;
  naziv: string;
  tip: 'SINGLE' | 'JOINT';
  kategorija: string;
  obuhvacene_kategorije: string[];
  ruta: string[];
  metoda: SteelMethod;
  potvrda_bez_prodaje: boolean;
  proizvodi: ProcessOutput[];
}

export interface FuelRow {
  row_id: string; process_id: string; gorivo: string; naziv_ostalo: string;
  jedinica: string; kolicina: string; ncv: string; ef: string; of: string;
  bf_posto: string; izvor_faktora: string;
}

export interface MaterialRow {
  row_id: string; process_id: string; materijal: string; metoda_karbonata: string;
  kolicina: string; udio_posto: string; ef: string; cf: string; naziv_ostalo: string;
}

export interface MassBalanceRow {
  row_id: string; process_id: string; smjer: 'INPUT' | 'OUTPUT'; materijal: string;
  naziv: string; kolicina: string; nacin_unosa: 'CC' | 'EF_T' | 'EF_TJ';
  cc_posto: string; ef_t: string; ef_tj: string; ncv: string; bf_posto: string;
}

export interface HeatChp {
  em_chp: string; q_net_tj: string; e_el_tj: string; e_in_tj: string; eta_ref_heat: string; eta_ref_el: string;
}

export interface HeatRow {
  row_id: string; process_id: string; smjer: 'IMPORT' | 'EXPORT'; kolicina_tj: string;
  metoda_ef: string; ef_toplote: string; ef_mix: string; eta: string; gorivo_standard: string;
  sadrzi_otpadni_plin: boolean; chp: HeatChp; dokazi: boolean;
}

export interface WasteGasRow {
  row_id: string; process_id: string; smjer: 'IMPORT' | 'EXPORT'; plin: string;
  jedinica: string; kolicina: string; ncv: string; dokazi: boolean;
}

export interface ElProducedRow { row_id: string; process_id: string; mwh: string; ef: string }

export interface ElectricityRow {
  row_id: string; process_id: string; mwh: string; izvor: string; drzava: string; ef: string; dokazi: boolean;
}

export interface PrecursorRow {
  row_id: string; process_id: string; cn_code: string; kategorija: string;
  izvor: 'INTERNAL_PROCESS' | 'PURCHASED'; izvorni_process_id: string;
  kolicina: string; country_id: number | null; drzava: string; drzava_nepoznata: boolean;
  podaci: '' | 'ACTUAL' | 'DEFAULT'; see_direktne: string; see_indirektne: string; verifikovano: boolean;
  godina_proizvodnje: string; postrojenje: string; ruta: string;
}

export interface ReportingParamRow {
  row_id: string; process_id: string; kategorija: string; redukciono_sredstvo: string;
  mn_posto: string; cr_posto: string; ni_posto: string; ostali_legirni_posto: string; c_posto: string;
  otpad_t_po_t: string; pre_consumer_otpad_posto: string;
}

export interface SteelProductRow {
  product_name: string; cn_code: string; quantity: string; country_of_origin: string; aggregated_category?: string;
}

/* ─── Helpers ─── */

export function newRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function nextProcessId(existing: string[], minNext = 1): string {
  let max = minNext - 1;
  existing.forEach((id) => {
    const m = /^P(\d+)$/.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return `P${max + 1}`;
}

/** Numbers are stored as strings with a dot decimal (spec §5.4). */
export function normNum(value: string): string {
  return value.replace(/,/g, '.').replace(/\s+/g, '');
}

export function toNum(value: string | null | undefined): number | null {
  if (value == null) return null;
  const s = normNum(String(value));
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function cnDigits(cn: string): string {
  return (cn ?? '').replace(/\s+/g, '');
}

export function isEightDigitCn(cn: string): boolean {
  return /^\d{8}$/.test(cnDigits(cn));
}

export function formatCn(cn: string): string {
  const d = cnDigits(cn);
  if (/^\d{8}$/.test(d)) return `${d.slice(0, 4)} ${d.slice(4, 6)} ${d.slice(6, 8)}`;
  if (/^\d{6}$/.test(d)) return `${d.slice(0, 4)} ${d.slice(4, 6)}`;
  return cn;
}

export function parseJsonRows<T>(values: string[] | undefined): T[] {
  const out: T[] = [];
  (values ?? []).forEach((v) => {
    try {
      const parsed = JSON.parse(v);
      if (parsed && typeof parsed === 'object') out.push(parsed as T);
    } catch {
      // ignore malformed rows
    }
  });
  return out;
}

/** Categories a process covers (SINGLE: its category, JOINT: obuhvacene_kategorije). */
export function coveredCategories(p: ProcessRow): string[] {
  return p.tip === 'JOINT' ? p.obuhvacene_kategorije : (p.kategorija ? [p.kategorija] : []);
}

export function processRequiresMb(p: ProcessRow): boolean {
  return coveredCategories(p).some((c) => MB_MANDATORY.has(c));
}

export function processCoversSinter(p: ProcessRow): boolean {
  return coveredCategories(p).includes('SINTERED_ORE');
}

export function processLabel(p: ProcessRow | undefined, fallbackId?: string): string {
  if (!p) return fallbackId ?? '—';
  return p.naziv?.trim() ? `${p.process_id} – ${p.naziv}` : p.process_id;
}

/* ─── Validation messages (spec §7) ─── */

export interface StepIssue { code: string; message: string }

export const MSG = {
  qty: (what: string) => ({ code: 'IS_E_QTY', message: tr('steel.msg.qty', { what }) }),
  pct: (what: string) => ({ code: 'IS_E_CC_RANGE', message: tr('steel.msg.pct', { what }) }),
  factor: (what: string) => ({ code: 'IS_E_FACTOR_RANGE', message: `${what}` }),
};

export function checkPositive(value: string, what: string, issues: StepIssue[]): void {
  const n = toNum(value);
  if (n == null || n <= 0) issues.push(MSG.qty(what));
}

export function checkPercent(value: string, what: string, issues: StepIssue[], required = false): void {
  const n = toNum(value);
  if (n == null) {
    if (required || String(value ?? '').trim() !== '') issues.push(MSG.pct(what));
    return;
  }
  if (n < 0 || n > 100) issues.push(MSG.pct(what));
}

/** 0 < x ≤ 1 (OF, CF, η – MA Eq. 7, 11, 44). Blank allowed when not required. */
export function checkFraction(value: string, what: string, issues: StepIssue[], required = false): void {
  const n = toNum(value);
  if (n == null) {
    if (required || String(value ?? '').trim() !== '') issues.push(MSG.factor(tr('steel.msg.fraction', { what })));
    return;
  }
  if (n <= 0 || n > 1) issues.push(MSG.factor(tr('steel.msg.fraction', { what })));
}

export function checkNonNegative(value: string, what: string, issues: StepIssue[], required = false): void {
  const n = toNum(value);
  if (n == null) {
    if (required || String(value ?? '').trim() !== '') issues.push(MSG.factor(tr('steel.msg.enterNonNegative', { what })));
    return;
  }
  if (n < 0) issues.push(MSG.factor(tr('steel.msg.notNegative', { what })));
}

/** User value deviates > 50 % from the Table G value (IS_W_CC_DEVIATION, app heuristic). */
export function deviatesFromStandard(user: string, standard: number | null | undefined): boolean {
  const u = toNum(user);
  if (u == null || standard == null || standard === 0) return false;
  return Math.abs(u - standard) / Math.abs(standard) > 0.5;
}

/** Reporting period check IS_E_PERIOD (spec §1.5, §7). Returns error text or null. */
export function steelPeriodError(from: string, to: string): string | null {
  const yf = Number((from ?? '').slice(0, 4));
  const yt = Number((to ?? '').slice(0, 4));
  if (!Number.isFinite(yf) || !Number.isFinite(yt) || yf === 0 || yt === 0) return null;
  if (yf !== yt) return tr('steel.msg.periodSameYear');
  if (yf < 2026) return tr('steel.msg.periodFrom2026');
  return null;
}

/** Display name of a Table G standard factor: the description comes localized from GET /is/standard-factors. */
export function factorLabel(f: { wizardCode: string; description: string }): string {
  return f.description || f.wizardCode;
}
