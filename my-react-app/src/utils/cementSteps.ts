/**
 * CBAM "Cement" wizard contract (docs/cement-implementation-spec.md §0.3, §1, §3, §4, §7).
 * Everything regulatory here is copied from the spec, which cites docs/cbam-sources.
 *
 * Abbreviations in source comments (spec §0.1):
 *   CBAM-R = Reg. (EU) 2023/956 consolidated; MA = Implementing Reg. (EU) 2025/2547;
 *   DVC = Implementing Reg. (EU) 2026/1740; G05a = Guidance 05a cement; FAA = Implementing Reg. (EU) 2025/2620.
 *
 * CN codes, TARIC subdivisions, default values, grid factors and Table G factors are NOT hard-coded here:
 * they come from the backend (GET /ce/cn-mapping, /ce/default-value, /is/grid-ef, /is/standard-factors).
 */

import i18n, { lazyLabels, lazyOptions, tr } from '../i18n';
import type {
  ElectricityRow, ElProducedRow, FuelRow, HeatRow, StepIssue,
} from './steelSteps';
import { cnDigits, toNum } from './steelSteps';

/* Stored answer value of the product category – compared by routing, never translate it (spec §0.3). */
export const CEMENT_CATEGORY_NAME = 'Cement';

/** Spec §3.1: CementSector detects CBAM_PRODUCT_CATEGORY ∈ {Cement, CEMENT}. */
export function isCementCategory(category: string | null | undefined): boolean {
  return (category ?? '').trim().toLowerCase() === 'cement';
}

/* ─── Steps (spec §4.1, FE-1) ─── */

export const CE_STEP = {
  GENERAL: 'CE_GENERAL',
  PROCESSES: 'CE_PROCESSES',
  DIRECT_EMISSIONS: 'CE_DIRECT_EMISSIONS',
  ENERGY_FLOWS: 'CE_ENERGY_FLOWS',
  ELECTRICITY: 'CE_ELECTRICITY',
  PRECURSORS: 'CE_PRECURSORS',
} as const;

/** Wizard step numbers 30–35 (aluminium 1–14/99 and steel 20–27 never collide; spec FE-1). */
const CEMENT_STEP_NUMBERS: Record<string, number> = {
  CE_GENERAL: 30,
  CE_PROCESSES: 31,
  CE_DIRECT_EMISSIONS: 32,
  CE_ENERGY_FLOWS: 33,
  CE_ELECTRICITY: 34,
  CE_PRECURSORS: 35,
};

export function isCementStepCode(code: string | null | undefined): boolean {
  return code != null && code in CEMENT_STEP_NUMBERS;
}

export function cementStepNumber(code: string): number | null {
  return CEMENT_STEP_NUMBERS[code] ?? null;
}

/** Static previous steps (Back after a page reload; spec §4.2 default_next_step chain). */
export const CE_STEP_PREVIOUS: Record<string, string> = {
  CE_GENERAL: 'CBAM_PRODUCT_DETAILS',
  CE_PROCESSES: 'CE_GENERAL',
  CE_DIRECT_EMISSIONS: 'CE_PROCESSES',
  CE_ENERGY_FLOWS: 'CE_DIRECT_EMISSIONS',
  CE_ELECTRICITY: 'CE_ENERGY_FLOWS',
  CE_PRECURSORS: 'CE_ELECTRICITY',
};

/* ─── Question codes (spec §4.4) ─── */

export const CE_Q = {
  IMPORT_YEAR: 'CE_IMPORT_YEAR',
  DATA_SOURCE: 'CE_DATA_SOURCE',
  INSTALLATION_REF: 'CE_INSTALLATION_REF',
  PROCESS: 'CE_PROCESS_ENTRY',
  FUEL: 'CE_FUEL_ENTRY',
  MATERIAL: 'CE_PROCESS_MATERIAL_ENTRY',
  CLINKER_OUTPUT: 'CE_CLINKER_OUTPUT_ENTRY',
  CKD: 'CE_CKD_ENTRY',
  HEAT: 'CE_HEAT_ENTRY',
  EL_PRODUCED: 'CE_EL_PRODUCED_ENTRY',
  ELECTRICITY: 'CE_ELECTRICITY_ENTRY',
  PRECURSOR: 'CE_PRECURSOR_ENTRY',
} as const;

/** Row questions that reference a process_id (cascade-deleted with the process, spec §4.5). */
export const CE_PROCESS_CHILD_QUESTIONS: string[] = [
  CE_Q.FUEL, CE_Q.MATERIAL, CE_Q.CLINKER_OUTPUT, CE_Q.CKD, CE_Q.HEAT, CE_Q.EL_PRODUCED,
  CE_Q.ELECTRICITY, CE_Q.PRECURSOR,
];

/** Option codes of CE_DATA_SOURCE (spec §4.4). */
export const CE_DATA_SOURCE = { DEFAULT: 'DEFAULT_VALUES', ACTUAL: 'ACTUAL_VALUES' } as const;

/* ─── Regulatory constants needed in the UI (prefill / preview only; the backend computes) ─── */

/** First year of the definitive period; reporting period and import year must be ≥ this (spec §1.5; MA Art. 1(5), Art. 7(1) p.8). */
export const CE_MIN_YEAR = 2026;
/** Method B minimum-requirement clinker EF, t CO2/t clinker (MA Annex II B.9.2.2, p.50; G05a p.18). */
export const EF_CLINKER_STD = 0.525;
/** Discarded CKD/bypass dust minimum-requirement EF, t CO2/t dust (MA Annex II B.9.2.3, p.50; G05a p.17). */
export const EF_CKD_STD = 0.525;
/** Urea in de-NOx, t CO2/t urea (MA Annex II B.9.1.2, p.49). */
export const EF_UREA_DENOX = 0.7328;
/** Molar ratio CO2/C, t CO2/t C (MA Annex II B.3.1.1 Eq. 9, p.35). */
export const F_CO2_C = 3.664;

/* ─── Categories (spec §0.3, §1.7) ─── */

export type CementCategory = 'CALCINED_CLAY' | 'CEMENT_CLINKER' | 'CEMENT' | 'ALUMINOUS_CEMENT';

export const CE_CATEGORIES: CementCategory[] = ['CALCINED_CLAY', 'CEMENT_CLINKER', 'CEMENT', 'ALUMINOUS_CEMENT'];

export const CE_CATEGORY_LABELS: Record<CementCategory, string> = lazyLabels<CementCategory>('cement.category', CE_CATEGORIES);

export function ceCategoryLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return (CE_CATEGORY_LABELS as Record<string, string>)[code] ?? code;
}

/** Possible precursors per category (G05a Table 2-2, p.10; G03 Table 4-2, p.40; spec §1.7). */
export const CE_PRECURSOR_CATEGORIES: Record<CementCategory, CementCategory[]> = {
  CALCINED_CLAY: [],
  CEMENT_CLINKER: [],
  CEMENT: ['CEMENT_CLINKER', 'CALCINED_CLAY'],
  ALUMINOUS_CEMENT: [],
};

/** Categories a JOINT ("bubble") process may cover (MA Art. 4(9), p.7; spec §3.3(15)). */
export const CE_JOINT_CATEGORIES: CementCategory[] = ['CALCINED_CLAY', 'CEMENT_CLINKER', 'CEMENT'];

/* ─── Option lists ─── */

export const CE_FUEL_USES = lazyOptions('cement.fuelUse', ['KILN', 'NON_KILN']);

export type CeMaterialKind =
  | 'KILN_CARBONATE' | 'RAW_MEAL' | 'NON_CARBONATE_CARBON' | 'FLUE_GAS_CARBONATE' | 'UREA_DENOX' | 'OXIDE_OUTPUT' | 'OTHER';

export const CE_MATERIAL_KINDS: CeMaterialKind[] = [
  'KILN_CARBONATE', 'RAW_MEAL', 'NON_CARBONATE_CARBON', 'FLUE_GAS_CARBONATE', 'UREA_DENOX', 'OXIDE_OUTPUT', 'OTHER',
];

export const CE_MATERIAL_KIND_LABELS: Record<CeMaterialKind, string> = lazyLabels<CeMaterialKind>('cement.materialKind', CE_MATERIAL_KINDS);

/** Method A kiln-carbonate rows that conflict with a Method B clinker row (spec §3.3(5); MA B.9.2.1/B.9.2.2). */
export const KILN_CALCINATION_KINDS = new Set<string>(['KILN_CARBONATE', 'RAW_MEAL']);

/** Out of scope list for UI help "Nije podržano" (spec §1.9). Translated: locale key cement.notSupported. */
export function ceNotSupportedList(): string[] {
  return i18n.t('cement.notSupported', { returnObjects: true }) as string[];
}

/* ─── Reference data shape (GET /ce/cn-mapping, spec §5.2 draft) ─── */

export type FunctionalUnit = 'CLINKER_CONTENT' | 'TONNE_GOOD';

export interface CeTaricOption {
  taric: string;
  taricDigits: string;
  white: boolean;
  label: string;
}

export interface CeCnMappingRow {
  cnCode: string;
  cnDigits: string;
  category: CementCategory | string;
  categoryLabel: string;
  description: string;
  functionalUnit: FunctionalUnit | string;
  complex: boolean;
  taricRequired: boolean;
  taricOptions: CeTaricOption[];
  sortOrder: number;
  /** White/grey flag for CN codes without TARIC (spec §2.1; docs/cement-api-contract.md §3.1: null where not applicable). */
  white?: boolean | null;
  /** 1 for clinker (CK fixed, spec §2.1), else null (docs/cement-api-contract.md §3.1). */
  ckFixed?: number | null;
}

/* ─── Row types (exact JSON shapes, spec §4.3–§4.4) ─── */

export interface CeProductRow {
  product_name: string;
  cn_code: string;
  taric_code: string;
  quantity: string;
  country_of_origin: string;
  klinker_udio_posto: string;
}

export interface CeProcessOutput {
  cn_code: string;
  taric_code: string;
  kolicina: string;
  klinker_udio_posto: string;
}

export interface CeProcessRow {
  row_id: string;
  process_id: string;
  naziv: string;
  tip: 'SINGLE' | 'JOINT';
  kategorija: string;
  obuhvacene_kategorije: string[];
  potvrda_bez_prodaje: boolean;
  proizvodi: CeProcessOutput[];
}

/** Shape identical to IS_FUEL_ENTRY plus `primjena` (spec §4.4). */
export interface CeFuelRow extends FuelRow { primjena: 'KILN' | 'NON_KILN' | '' }

export interface CeMaterialRow {
  row_id: string; process_id: string; vrsta: CeMaterialKind | ''; materijal: string; metoda_karbonata: 'A' | 'B';
  kolicina: string; udio_posto: string; ef: string; cf: string; cc_posto: string; klinker_t: string;
  raw_meal_ratio: string; naziv_ostalo: string;
}

export interface CeBalanceCementRow { isporuke_t: string; promjena_zaliha_t: string; ccr_posto: string }

export interface CeClinkerBalance {
  cement: CeBalanceCementRow[];
  klinker_nabavljen_t: string;
  klinker_otpremljen_t: string;
  promjena_zaliha_klinkera_t: string;
}

export interface CeClinkerOutputRow {
  row_id: string; process_id: string; ad_nacin: 'WEIGHING' | 'CEMENT_BALANCE'; klinker_t: string;
  bilans: CeClinkerBalance; ef_nacin: 'STANDARD' | 'ANALYSIS'; ef: string; cf: string;
}

export interface CeCkdRow {
  row_id: string; process_id: string; kolicina_t: string; ef_nacin: 'STANDARD' | 'EQ28'; ef_cli: string; d_posto: string;
}

/** CE_HEAT_ENTRY / CE_EL_PRODUCED_ENTRY / CE_ELECTRICITY_ENTRY: shapes identical to the steel rows (spec §4.4). */
export type CeHeatRow = HeatRow;
export type CeElProducedRow = ElProducedRow;
export type CeElectricityRow = ElectricityRow;

export interface CePrecursorRow {
  row_id: string; process_id: string; kategorija: string; cn_code: string; taric_code: string;
  izvor: 'INTERNAL_PROCESS' | 'PURCHASED'; izvorni_process_id: string; kolicina: string;
  country_id: number | null; drzava: string; drzava_nepoznata: boolean; podaci: '' | 'ACTUAL' | 'DEFAULT';
  see_direktne: string; see_indirektne: string; verifikovano: boolean; godina_proizvodnje: string;
  postrojenje: string; ruta: string;
}

/* ─── Formatting ─── */

export function taricDigits(taric: string | null | undefined): string {
  return (taric ?? '').replace(/\s+/g, '');
}

/** "2523100090" → "2523 10 00 90"; 8 digits → "2523 10 00". */
export function formatCeCode(code: string | null | undefined): string {
  const d = cnDigits(code ?? '');
  if (/^\d{10}$/.test(d)) return `${d.slice(0, 4)} ${d.slice(4, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
  if (/^\d{8}$/.test(d)) return `${d.slice(0, 4)} ${d.slice(4, 6)} ${d.slice(6, 8)}`;
  return code ?? '';
}

/* ─── CN / TARIC validation against the backend mapping (spec §2.1, §4.3, §7) ─── */

export function findCnRow(mapping: CeCnMappingRow[], cn: string): CeCnMappingRow | undefined {
  const d = cnDigits(cn);
  return mapping.find((m) => cnDigits(m.cnDigits || m.cnCode) === d);
}

export type CeCnCheck =
  | { ok: true; row: CeCnMappingRow; taric: CeTaricOption | null; key: string }
  | { ok: false; code: string };

/**
 * CE_E_CN_FORMAT | CE_E_CN_NOT_CBAM_CEMENT | CE_E_CN_NOT_CALCINED | CE_E_TARIC_REQUIRED | CE_E_TARIC_INVALID.
 * `key` = TARIC digits if the CN requires one, else the 8-digit CN (lookup key, spec §2.3.3, §3.4).
 */
export function checkCeCnTaric(mapping: CeCnMappingRow[], cn: string, taric: string): CeCnCheck {
  const d = cnDigits(cn);
  if (!/^\d{8}$/.test(d)) return { ok: false, code: 'CE_E_CN_FORMAT' };
  const row = findCnRow(mapping, d);
  if (!row) return { ok: false, code: 'CE_E_CN_NOT_CBAM_CEMENT' };
  const t = taricDigits(taric);
  if (!row.taricRequired) {
    if (t !== '') return { ok: false, code: 'CE_E_TARIC_INVALID' };
    return { ok: true, row, taric: null, key: d };
  }
  if (t === '') return { ok: false, code: 'CE_E_TARIC_REQUIRED' };
  if (!/^\d{10}$/.test(t)) return { ok: false, code: 'CE_E_CN_FORMAT' };
  const opt = row.taricOptions.find((o) => taricDigits(o.taricDigits || o.taric) === t);
  if (!opt) {
    // 2507 00 80 with any TARIC other than calcined clay (CBAM-R Annex I (M1) p.45; G05a p.10–11)
    return { ok: false, code: row.category === 'CALCINED_CLAY' ? 'CE_E_CN_NOT_CALCINED' : 'CE_E_TARIC_INVALID' };
  }
  return { ok: true, row, taric: opt, key: t };
}

/** White/grey flag (spec §2.1): from the TARIC option, else the optional row flag; null = unknown. */
export function isWhiteGood(check: CeCnCheck): boolean | null {
  if (!check.ok) return null;
  if (check.taric) return check.taric.white;
  return typeof check.row.white === 'boolean' ? check.row.white : null;
}

/** Clinker content is entered for cement goods (category CEMENT: 2523 21 00 / 29 00 / 90 00; spec §4.3, MA Art. 4(5) p.7). */
export function needsClinkerContent(row: CeCnMappingRow | undefined): boolean {
  return Boolean(row && row.functionalUnit === 'CLINKER_CONTENT' && row.category === 'CEMENT');
}

/** CE_E_CK_RANGE: 0 < CK ≤ 100 % (spec §3.4, §7). Blank → null (caller decides whether required). */
export function ckRangeOk(value: string | null | undefined): boolean | null {
  const n = toNum(value);
  if (n == null) return null;
  return n > 0 && n <= 100;
}

/* ─── Period (CE_E_PERIOD, spec §1.5, §7) ─── */

export function cementPeriodError(from: string, to: string): string | null {
  const yf = Number((from ?? '').slice(0, 4));
  const yt = Number((to ?? '').slice(0, 4));
  if (!Number.isFinite(yf) || !Number.isFinite(yt) || yf === 0 || yt === 0) return null;
  if (yf !== yt) return tr('cement.msg.periodSameYear');
  if (yf < CE_MIN_YEAR) return tr('cement.msg.periodFrom2026');
  return null;
}

/* ─── Product rows (CBAM_PRODUCT_DETAILS, spec §4.3) ─── */

export interface CeProductIssue extends StepIssue { index: number }

/**
 * Validation of declared products. `actualPath` = CE_DATA_SOURCE is ACTUAL_VALUES (CK then required for cement goods).
 * Messages are resolved by the caller from `code` (keeps the helper testable without React).
 */
export function ceProductIssues(products: CeProductRow[], mapping: CeCnMappingRow[], actualPath: boolean): CeProductIssue[] {
  const out: CeProductIssue[] = [];
  products.forEach((p, index) => {
    if (!p.product_name?.trim()) out.push({ index, code: 'CE_E_NAME', message: '' });
    const chk = checkCeCnTaric(mapping, p.cn_code, p.taric_code);
    if (!chk.ok) out.push({ index, code: chk.code, message: '' });
    const q = toNum(p.quantity);
    if (q == null || q <= 0) out.push({ index, code: 'CE_E_QTY', message: '' });
    if (!p.country_of_origin) out.push({ index, code: 'CE_E_COUNTRY', message: '' });
    if (chk.ok && needsClinkerContent(chk.row)) {
      const ck = ckRangeOk(p.klinker_udio_posto);
      if (ck === false) out.push({ index, code: 'CE_E_CK_RANGE', message: '' });
      if (ck == null && actualPath) out.push({ index, code: 'CE_E_CK_MISSING', message: '' });
    }
  });
  return out;
}

/* ─── Processes (spec §3.3(10), (15), §4.4, §7) ─── */

/** Categories a process covers (SINGLE: its category, JOINT: obuhvacene_kategorije). */
export function ceCoveredCategories(p: CeProcessRow): string[] {
  return p.tip === 'JOINT' ? (p.obuhvacene_kategorije ?? []) : (p.kategorija ? [p.kategorija] : []);
}

export function ceProcessCoversClinker(p: CeProcessRow): boolean {
  return ceCoveredCategories(p).includes('CEMENT_CLINKER');
}

/** Only processes of category CEMENT (SINGLE or JOINT) may have precursor rows (spec §1.7, §4.4). */
export function ceProcessTakesPrecursors(p: CeProcessRow): boolean {
  return p.kategorija === 'CEMENT';
}

/** FU(o): t clinker contained for cement goods (kolicina × CK/100), else t good (MA Art. 4(5) p.7; spec §3.3(10)). */
export function outputFunctionalUnits(o: CeProcessOutput, row: CeCnMappingRow | undefined): number | null {
  const qty = toNum(o.kolicina);
  if (qty == null) return null;
  if (needsClinkerContent(row)) {
    const ck = toNum(o.klinker_udio_posto);
    if (ck == null) return null;
    return qty * (ck / 100);
  }
  return qty;
}

/** Activity level of a process: AL in FU and AL_mass in t good (spec §3.3(10)); null parts are skipped. */
export function processActivityLevel(p: CeProcessRow, mapping: CeCnMappingRow[]): { alFu: number; alMass: number } {
  let alFu = 0;
  let alMass = 0;
  (p.proizvodi ?? []).forEach((o) => {
    const fu = outputFunctionalUnits(o, findCnRow(mapping, o.cn_code));
    if (fu != null) alFu += fu;
    alMass += toNum(o.kolicina) ?? 0;
  });
  return { alFu, alMass };
}

export interface CeCodedIssue { code: string; processId?: string; outputIndex?: number; detail?: string }

/** Process-step validation (codes of spec §7); messages are resolved by the caller. */
export function ceProcessIssues(processes: CeProcessRow[], mapping: CeCnMappingRow[]): { errors: CeCodedIssue[]; warnings: CeCodedIssue[] } {
  const errors: CeCodedIssue[] = [];
  const warnings: CeCodedIssue[] = [];
  if (processes.length === 0) errors.push({ code: 'CE_E_NO_PROCESS' });
  const keyToProcesses: Record<string, Set<string>> = {};
  processes.forEach((p) => {
    const pid = p.process_id;
    if (p.tip === 'SINGLE' && !p.kategorija) errors.push({ code: 'CE_E_CATEGORY', processId: pid });
    if (p.tip === 'JOINT') {
      const cov = p.obuhvacene_kategorije ?? [];
      const allowed = cov.every((c) => (CE_JOINT_CATEGORIES as string[]).includes(c));
      if (!allowed || !cov.includes('CEMENT') || cov.length < 2) errors.push({ code: 'CE_E_JOINT_NOT_ELIGIBLE', processId: pid, detail: 'categories' });
      if (!p.potvrda_bez_prodaje) errors.push({ code: 'CE_E_JOINT_NOT_ELIGIBLE', processId: pid, detail: 'confirmation' });
    }
    if ((p.proizvodi ?? []).length === 0) errors.push({ code: 'CE_E_QTY', processId: pid, detail: 'noOutput' });
    let white = false;
    let grey = false;
    (p.proizvodi ?? []).forEach((o, j) => {
      const chk = checkCeCnTaric(mapping, o.cn_code, o.taric_code);
      if (!chk.ok) { errors.push({ code: chk.code, processId: pid, outputIndex: j }); }
      else {
        const expected = p.tip === 'JOINT' ? 'CEMENT' : p.kategorija;
        if (expected && chk.row.category !== expected) errors.push({ code: 'CE_E_OUTPUT_CATEGORY', processId: pid, outputIndex: j });
        (keyToProcesses[chk.key] ??= new Set()).add(pid);
        if (needsClinkerContent(chk.row)) {
          const ck = ckRangeOk(o.klinker_udio_posto);
          if (ck == null) errors.push({ code: 'CE_E_CK_MISSING', processId: pid, outputIndex: j });
          else if (!ck) errors.push({ code: 'CE_E_CK_RANGE', processId: pid, outputIndex: j });
        }
        const w = isWhiteGood(chk);
        if (w === true) white = true;
        if (w === false) grey = true;
      }
      const q = toNum(o.kolicina);
      if (q == null || q <= 0) errors.push({ code: 'CE_E_QTY', processId: pid, outputIndex: j });
    });
    // OPEN QUESTION OQ-CE-1: white + grey in one process allowed, info warning only.
    if (white && grey) warnings.push({ code: 'CE_W_WHITE_GREY_MIXED', processId: pid });
  });
  Object.entries(keyToProcesses).forEach(([key, set]) => {
    if (set.size > 1) errors.push({ code: 'CE_E_CN_MULTI_PROCESS', detail: `${formatCeCode(key)}: ${[...set].join(', ')}` });
  });
  return { errors, warnings };
}

/** Lookup key of a declared product (TARIC if required else CN) – same rule as the backend mapping (spec §3.4). */
export function productKey(p: { cn_code: string; taric_code: string }, mapping: CeCnMappingRow[]): string | null {
  const chk = checkCeCnTaric(mapping, p.cn_code, p.taric_code);
  return chk.ok ? chk.key : null;
}

/** Declared products that no process outputs (→ default path + CE_W_PRODUCT_NO_PROCESS_DEFAULT_USED, spec §3.4). */
export function productsWithoutProcess(products: CeProductRow[], processes: CeProcessRow[], mapping: CeCnMappingRow[]): CeProductRow[] {
  const keys = new Set<string>();
  processes.forEach((p) => (p.proizvodi ?? []).forEach((o) => { const k = productKey(o, mapping); if (k) keys.add(k); }));
  return products.filter((prod) => { const k = productKey(prod, mapping); return k != null && !keys.has(k); });
}

/* ─── Direct emissions (spec §3.3(2)–(5)) ─── */

/** Helper ef for non-carbonate carbon: cc_posto/100 × 3,664 t CO2/t (relation of MA Eq. 14, p.36; spec §3.3(2)). */
export function nonCarbonateCarbonEf(ccPosto: string | null | undefined): number | null {
  const cc = toNum(ccPosto);
  if (cc == null) return null;
  return (cc / 100) * F_CO2_C;
}

/** Optional AD helper for RAW_MEAL: kolicina = klinker_t × raw_meal_ratio (MA Annex II B.9.2.1, p.50). */
export function rawMealQuantity(klinkerT: string, ratio: string): number | null {
  const k = toNum(klinkerT);
  const r = toNum(ratio);
  if (k == null || r == null) return null;
  return k * r;
}

/**
 * MA Equation 27 (Annex II B.9.2.2, p.50), generalised to several cement products (spec §3.3(3), OPEN QUESTION OQ-CE-2):
 * Cli_prod = Σ_k (Cem_deliv,k − Cem_SV,k) × CCR_k − Cli_s + Cli_d − Cli_SV. CCR entered in %.
 * Returns null if any required field is not numeric or there is no cement row (→ CE_E_BALANCE_INCOMPLETE).
 * Blank clinker supplied/dispatched/stock variation count as 0.
 */
/**
 * docs/cement-api-contract.md §2: all balance fields must be numbers – blank optional terms are sent as "0"
 * (blank → CE_E_BALANCE_INCOMPLETE in the backend). Required fields (isporuke_t, ccr_posto) are left as entered.
 */
export function normaliseBalance(b: CeClinkerBalance): CeClinkerBalance {
  const z = (v: string) => (String(v ?? '').trim() === '' ? '0' : v);
  return {
    cement: (b.cement ?? []).map((c) => ({ ...c, promjena_zaliha_t: z(c.promjena_zaliha_t) })),
    klinker_nabavljen_t: z(b.klinker_nabavljen_t),
    klinker_otpremljen_t: z(b.klinker_otpremljen_t),
    promjena_zaliha_klinkera_t: z(b.promjena_zaliha_klinkera_t),
  };
}

export function clinkerFromBalance(b: CeClinkerBalance): number | null {
  if (!b || !Array.isArray(b.cement) || b.cement.length === 0) return null;
  let sum = 0;
  for (const c of b.cement) {
    const deliv = toNum(c.isporuke_t);
    const sv = String(c.promjena_zaliha_t ?? '').trim() === '' ? 0 : toNum(c.promjena_zaliha_t);
    const ccr = toNum(c.ccr_posto);
    if (deliv == null || sv == null || ccr == null) return null;
    sum += (deliv - sv) * (ccr / 100);
  }
  const opt = (v: string) => (String(v ?? '').trim() === '' ? 0 : toNum(v));
  const s = opt(b.klinker_nabavljen_t);
  const d = opt(b.klinker_otpremljen_t);
  const sv = opt(b.promjena_zaliha_klinkera_t);
  if (s == null || d == null || sv == null) return null;
  return sum - s + d - sv;
}

/**
 * MA Equation 28 (Annex II B.9.2.3, p.50–51): x = EF_Cli/(1 + EF_Cli) × d; EF_CKD = x/(1 − x).
 * OPEN QUESTION OQ-CE-15: d entered in % and used as d/100.
 */
export function ckdEfEq28(efCli: string | number | null | undefined, dPosto: string | number | null | undefined): number | null {
  const ef = toNum(efCli == null ? null : String(efCli));
  const d = toNum(dPosto == null ? null : String(dPosto));
  if (ef == null || d == null || ef <= 0 || d < 0 || d > 100) return null;
  const x = (ef / (1 + ef)) * (d / 100);
  if (x >= 1) return null;
  return x / (1 - x);
}

/** Method consistency per process (spec §3.3(5); MA B.9.2.1/B.9.2.2; §7 CE_E_METHOD_MIX / CE_E_METHOD / CE_W_NO_CALCINATION). */
export function ceMethodIssues(
  p: CeProcessRow, materials: CeMaterialRow[], clinkerRows: CeClinkerOutputRow[], ckdRows: CeCkdRow[],
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const own = <R extends { process_id: string }>(rows: R[]) => rows.filter((r) => r.process_id === p.process_id);
  const mats = own(materials);
  const cli = own(clinkerRows);
  const ckd = own(ckdRows);
  const coversClinker = ceProcessCoversClinker(p);
  const hasA = mats.some((m) => KILN_CALCINATION_KINDS.has(m.vrsta));
  if (cli.length > 1) errors.push('CE_E_METHOD');
  if (cli.length > 0 && !coversClinker) errors.push('CE_E_METHOD');
  if (ckd.length > 0 && !coversClinker) errors.push('CE_E_METHOD');
  // OXIDE_OUTPUT only for CALCINED_CLAY / ALUMINOUS_CEMENT processes (spec §4.4)
  const cats = ceCoveredCategories(p);
  if (mats.some((m) => m.vrsta === 'OXIDE_OUTPUT') && !cats.every((c) => c === 'CALCINED_CLAY' || c === 'ALUMINOUS_CEMENT')) {
    errors.push('CE_E_METHOD');
  }
  if (coversClinker && hasA && cli.length > 0) errors.push('CE_E_METHOD_MIX');
  if (coversClinker && !hasA && cli.length === 0) warnings.push('CE_W_NO_CALCINATION');
  return { errors: [...new Set(errors)], warnings };
}

/* ─── Precursors (spec §3.3(12), §7) ─── */

/** Detect a cycle in INTERNAL_PROCESS references (consumer -> source). */
export function findPrecursorCycle(rows: { process_id: string; izvor: string; izvorni_process_id: string }[]): string[] | null {
  const edges = new Map<string, Set<string>>();
  rows.forEach((r) => {
    if (r.izvor !== 'INTERNAL_PROCESS' || !r.izvorni_process_id) return;
    const s = edges.get(r.process_id) ?? new Set<string>();
    s.add(r.izvorni_process_id);
    edges.set(r.process_id, s);
  });
  const state = new Map<string, number>();
  const stack: string[] = [];
  const visit = (n: string): string[] | null => {
    state.set(n, 1);
    stack.push(n);
    for (const m of edges.get(n) ?? []) {
      if (state.get(m) === 1) return [...stack.slice(stack.indexOf(m)), m];
      if (!state.has(m)) { const c = visit(m); if (c) return c; }
    }
    stack.pop();
    state.set(n, 2);
    return null;
  };
  for (const n of edges.keys()) {
    if (!state.has(n)) { const c = visit(n); if (c) return c; }
  }
  return null;
}

/**
 * CE_E_PRECURSOR_SOURCE check for INTERNAL_PROCESS rows: source must be a SINGLE process of category
 * CEMENT_CLINKER or CALCINED_CLAY whose outputs contain the precursor key (spec §3.3(12)).
 */
export function internalSourceOk(row: CePrecursorRow, source: CeProcessRow | undefined, mapping: CeCnMappingRow[]): boolean {
  if (!source || source.process_id === row.process_id) return false;
  if (source.tip !== 'SINGLE' || !(source.kategorija === 'CEMENT_CLINKER' || source.kategorija === 'CALCINED_CLAY')) return false;
  const key = productKey(row, mapping);
  if (!key) return false;
  return (source.proizvodi ?? []).some((o) => productKey(o, mapping) === key);
}

/** App heuristic CE_W_MI_BELOW_ONE: Σ m_i(clinker) < 1 on a SINGLE CEMENT process (spec §3.3(12)). */
export function clinkerMiSum(p: CeProcessRow, precursors: CePrecursorRow[], mapping: CeCnMappingRow[]): number | null {
  if (p.tip !== 'SINGLE' || p.kategorija !== 'CEMENT') return null;
  const { alFu } = processActivityLevel(p, mapping);
  if (alFu <= 0) return null;
  const own = precursors.filter((r) => r.process_id === p.process_id && r.kategorija === 'CEMENT_CLINKER');
  if (own.length === 0) return null;
  return own.reduce((s, r) => s + (toNum(r.kolicina) ?? 0), 0) / alFu;
}

/* ─── Result view aggregation (spec §3.5, §3.6) ─── */

export interface CeResultItemLike {
  outputCode: string | null;
  passCode: string | null;
  entryIndex: number | null;
  inputSnapshot: string;
  resultValue: number;
}

export interface CeGroup { values: Record<string, number>; snap: Record<string, unknown> }

function parseSnap(raw: unknown): Record<string, unknown> {
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Groups result items into products (passCode PRODUCT, by entryIndex) and processes (by passCode = process_id). */
export function groupCementResult(items: CeResultItemLike[]): { products: Map<number, CeGroup>; processes: Map<string, CeGroup> } {
  const products = new Map<number, CeGroup>();
  const processes = new Map<string, CeGroup>();
  items.forEach((i) => {
    if (!i.passCode) return;
    if (i.passCode === 'PRODUCT') {
      const idx = i.entryIndex ?? 0;
      const g = products.get(idx) ?? { values: {}, snap: parseSnap(i.inputSnapshot) };
      if (i.outputCode) g.values[i.outputCode] = Number(i.resultValue);
      products.set(idx, g);
    } else {
      const g = processes.get(i.passCode) ?? { values: {}, snap: parseSnap(i.inputSnapshot) };
      if (i.outputCode) g.values[i.outputCode] = Number(i.resultValue);
      processes.set(i.passCode, g);
    }
  });
  return { products, processes };
}

/** Σ embedded emissions over declared products (t CO2e); only CE_RESULT_EMBEDDED_* items are summed (spec §3.1 total_emissions). */
export function cementProductTotals(products: Map<number, CeGroup>): { direct: number; indirect: number; total: number } {
  let direct = 0;
  let indirect = 0;
  let total = 0;
  products.forEach((g) => {
    direct += g.values.CE_RESULT_EMBEDDED_DIR ?? 0;
    indirect += g.values.CE_RESULT_EMBEDDED_INDIR ?? 0;
    total += g.values.CE_RESULT_EMBEDDED_TOTAL ?? 0;
  });
  return { direct, indirect, total };
}

/**
 * Whether the per-FU columns differ from the per-good columns for a product (spec §3.5: default path flags
 * `fu_not_applicable`; TONNE_GOOD goods have FU = t good).
 */
export function fuColumnApplicable(snap: Record<string, unknown>): boolean {
  if (snap.fu_not_applicable === true) return false;
  const src = String(snap.ck_source ?? '');
  return src === 'PRODUCT' || src === 'PROCESS';
}

/** Emissions over the reporting period rounded to full tonnes (MA Annex II A.1 pt 6, p.28). */
export function roundTonnes(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(Number(v))) return null;
  return Math.round(Number(v));
}

/** SEE shown with max. 5 decimals (MA Annex II A.1 pt 8, p.28). */
export function formatSee(v: number | null | undefined): string {
  return v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toFixed(5);
}

/* ─── Messages ─── */

/** Text of a cement error/warning code (locale keys cement.err.<CODE>); `what` names the row. */
export function ceIssueText(code: string, params?: Record<string, unknown>): string {
  return tr(`cement.err.${code}`, { defaultValue: code, ...(params ?? {}) });
}

/** Wizard product entry (ProductDetailEntry) → stored cement row shape (spec §4.3). */
export function toCeProductRow(e: {
  productName: string; cnCode: string; taricCode?: string; quantity: string; countryOfOrigin: string; clinkerSharePct?: string;
}): CeProductRow {
  return {
    product_name: e.productName.trim(),
    cn_code: e.cnCode.trim(),
    taric_code: (e.taricCode ?? '').trim(),
    quantity: e.quantity.trim(),
    country_of_origin: e.countryOfOrigin,
    klinker_udio_posto: (e.clinkerSharePct ?? '').trim(),
  };
}

export function ceProcessLabel(p: CeProcessRow | undefined, fallbackId?: string): string {
  if (!p) return fallbackId ?? '—';
  return p.naziv?.trim() ? `${p.process_id} – ${p.naziv}` : p.process_id;
}
