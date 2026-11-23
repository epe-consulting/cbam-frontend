/**
 * CBAM "Aluminium II" wizard contract (docs/aluminium2-implementation-spec.md §0.3, §1, §3, §4, §7;
 * docs/aluminium2-api-contract.md v1.1, which wins where it differs from the spec).
 * Everything regulatory here is copied from the spec, which cites docs/cbam-sources.
 *
 * Abbreviations in source comments (spec §0.1):
 *   CBAM-R = Reg. (EU) 2023/956 consolidated; MA = Implementing Reg. (EU) 2025/2547;
 *   DVC = Implementing Reg. (EU) 2026/1740; G05e = Guidance 05e aluminium.
 *
 * "Fresh start" (spec intro): nothing here is shared with the old aluminium wizard (ALU_*).
 * CN headings, exclusions, default values, PFC table factors, GWP and Table G factors are NOT hard-coded here:
 * they come from the backend (GET /al2/cn-mapping, /al2/cn-validate, /al2/default-value, /al2/pfc-factors,
 * /is/standard-factors). The few constants below are only used for live previews; the backend computes.
 */

import i18n, { lazyLabels, lazyOptions, tr } from '../i18n';
import type { ElProducedRow, FuelRow, HeatRow, StepIssue } from './steelSteps';
import { cnDigits, formatCn, toNum } from './steelSteps';
import { findPrecursorCycle } from './cementSteps';

/* Stored answer value of the product category – compared by routing, never translate it (spec §0.3; contract §1). */
export const AL2_CATEGORY_NAME = 'Aluminium II';

/**
 * Spec §3.1 / contract §1: detection by the latest CBAM_PRODUCT_CATEGORY = 'Aluminium II' or 'ALUMINIUM_II'
 * (trimmed, case-insensitive, exact – never `contains('aluminium')`, so the old 'Aluminium' never matches).
 */
export function isAluminium2Category(category: string | null | undefined): boolean {
  const c = (category ?? '').trim().toLowerCase();
  return c === 'aluminium ii' || c === 'aluminium_ii';
}

/* ─── Steps (spec §4.1, FE-1) ─── */

export const AL2_STEP = {
  GENERAL: 'AL2_GENERAL',
  PROCESSES: 'AL2_PROCESSES',
  DIRECT_EMISSIONS: 'AL2_DIRECT_EMISSIONS',
  PFC: 'AL2_PFC',
  ENERGY_FLOWS: 'AL2_ENERGY_FLOWS',
  PRECURSORS: 'AL2_PRECURSORS',
  REPORTING_PARAMS: 'AL2_REPORTING_PARAMS',
} as const;

/** Wizard step numbers 40–46 (aluminium 1–14/99, steel 20–27, cement 30–35 never collide; spec FE-1: 40–47). */
const AL2_STEP_NUMBERS: Record<string, number> = {
  AL2_GENERAL: 40,
  AL2_PROCESSES: 41,
  AL2_DIRECT_EMISSIONS: 42,
  AL2_PFC: 43,
  AL2_ENERGY_FLOWS: 44,
  AL2_PRECURSORS: 45,
  AL2_REPORTING_PARAMS: 46,
};

export function isAl2StepCode(code: string | null | undefined): boolean {
  return code != null && Object.prototype.hasOwnProperty.call(AL2_STEP_NUMBERS, code);
}

export function al2StepNumber(code: string): number | null {
  return isAl2StepCode(code) ? AL2_STEP_NUMBERS[code] : null;
}

/** Static previous steps (Back after a page reload; spec §4.2 default_next_step chain). */
export const AL2_STEP_PREVIOUS: Record<string, string> = {
  AL2_GENERAL: 'CBAM_PRODUCT_DETAILS',
  AL2_PROCESSES: 'AL2_GENERAL',
  AL2_DIRECT_EMISSIONS: 'AL2_PROCESSES',
  AL2_PFC: 'AL2_DIRECT_EMISSIONS',
  AL2_ENERGY_FLOWS: 'AL2_PFC',
  AL2_PRECURSORS: 'AL2_ENERGY_FLOWS',
  AL2_REPORTING_PARAMS: 'AL2_PRECURSORS',
};

/* ─── Question codes (spec §4.4; contract §1.1) ─── */

export const AL2_Q = {
  IMPORT_YEAR: 'AL2_IMPORT_YEAR',
  DATA_SOURCE: 'AL2_DATA_SOURCE',
  INSTALLATION_REF: 'AL2_INSTALLATION_REF',
  PROCESS: 'AL2_PROCESS_ENTRY',
  FUEL: 'AL2_FUEL_ENTRY',
  ANODE: 'AL2_ANODE_ENTRY',
  FLUE_GAS: 'AL2_FLUE_GAS_ENTRY',
  PFC: 'AL2_PFC_ENTRY',
  HEAT: 'AL2_HEAT_ENTRY',
  EL_PRODUCED: 'AL2_EL_PRODUCED_ENTRY',
  PRECURSOR: 'AL2_PRECURSOR_ENTRY',
  REPORTING_PARAM: 'AL2_REPORTING_PARAM_ENTRY',
} as const;

/** Row questions that reference a process_id (cascade-deleted with the process, spec §4.5). */
export const AL2_PROCESS_CHILD_QUESTIONS: string[] = [
  AL2_Q.FUEL, AL2_Q.ANODE, AL2_Q.FLUE_GAS, AL2_Q.PFC, AL2_Q.HEAT, AL2_Q.EL_PRODUCED, AL2_Q.PRECURSOR,
  AL2_Q.REPORTING_PARAM,
];

/** Option codes of AL2_DATA_SOURCE (spec §4.4). */
export const AL2_DATA_SOURCE = { DEFAULT: 'DEFAULT_VALUES', ACTUAL: 'ACTUAL_VALUES' } as const;

/* ─── Regulatory constants used in the UI (prefill / preview only; the backend computes) ─── */

/** First year of the definitive period; reporting period and import year must be ≥ this (spec §1.5; MA Art. 1(5), Art. 7(1) p.8). */
export const AL2_MIN_YEAR = 2026;
/** Molar ratio CO2/C, t CO2/t C (MA Annex II B.3.1.1 Eq. 9, p.35; spec §0.2, §3.3(2)). */
export const F_CO2_C = 3.664;
/** Desulphurisation Method B, t CO2/t dry gypsum produced (MA Annex II B.9.1.1, p.49; spec §2.4). */
export const EF_GYPSUM_B = 0.2558;
/** Urea in de-NOx, t CO2/t urea (MA Annex II B.9.1.2, p.49; spec §2.4). */
export const EF_UREA_DENOX = 0.7328;
/**
 * Total content of elements other than aluminium is reported "If the total content of elements other than
 * aluminium exceeds 1 %" (MA Annex IV pt 2, p.85; spec §3.5).
 */
export const OTHER_ELEMENTS_REPORT_THRESHOLD_PCT = 1;
/** GWP wizard codes in cbam_standard_factor (category GWP, MA Annex II G Table 6, p.64; spec §1.2). Values come from the backend. */
export const GWP_CF4_CODE = 'CF4';
export const GWP_C2F6_CODE = 'C2F6';

/* ─── Categories, routes, options (spec §0.3, §4.4) ─── */

export type Al2Category = 'UNWROUGHT_ALUMINIUM' | 'ALUMINIUM_PRODUCTS';
export const AL2_CATEGORIES: Al2Category[] = ['UNWROUGHT_ALUMINIUM', 'ALUMINIUM_PRODUCTS'];
export const AL2_CATEGORY_LABELS: Record<Al2Category, string> = lazyLabels<Al2Category>('aluminium2.category', AL2_CATEGORIES);

export function al2CategoryLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return (AL2_CATEGORY_LABELS as Record<string, string>)[code] ?? code;
}

/** PRIMARY_SMELTING ↔ MA 3.17.2.1 (p.25); SECONDARY_MELTING ↔ MA 3.17.2.2 (p.26). Products have no route (MA 3.18, p.26). */
export type Al2Route = 'PRIMARY_SMELTING' | 'SECONDARY_MELTING';
export const AL2_ROUTES: Al2Route[] = ['PRIMARY_SMELTING', 'SECONDARY_MELTING'];
export const AL2_ROUTE_LABELS: Record<Al2Route, string> = lazyLabels<Al2Route>('aluminium2.route', AL2_ROUTES);

export type Al2AnodeKind = 'PREBAKED_ANODE' | 'SODERBERG_PASTE' | 'OTHER_ELECTRODE';
export const AL2_ANODE_KINDS = lazyOptions('aluminium2.anodeKind', ['PREBAKED_ANODE', 'SODERBERG_PASTE', 'OTHER_ELECTRODE']);

export type Al2FlueGasKind = 'CARBONATE_A' | 'GYPSUM_B' | 'UREA_DENOX';
export const AL2_FLUE_GAS_KINDS = lazyOptions('aluminium2.flueKind', ['CARBONATE_A', 'GYPSUM_B', 'UREA_DENOX']);

export type Al2PfcMethod = 'SLOPE' | 'OVERVOLTAGE';
export const AL2_PFC_METHODS = lazyOptions('aluminium2.pfcMethod', ['SLOPE', 'OVERVOLTAGE']);

/** Cell technologies of MA Annex II B.7.1 Table 2 (p.46–47); names as printed (locale aluminium2.tech.*). */
export const AL2_PFC_TECHNOLOGIES = ['PFPB_L', 'PFPB_M', 'PFPB_MW', 'CWPB', 'SWPB', 'VSS', 'HSS'] as const;
export const AL2_PFC_TECH_OPTIONS = lazyOptions('aluminium2.tech', AL2_PFC_TECHNOLOGIES);

export const AL2_PRECURSOR_ROUTES = lazyOptions('aluminium2.precursorRoute', ['PRIMARY', 'SECONDARY', 'UNKNOWN']);

/** Out of scope list for UI help "Nije podržano" (spec §1.9). Translated: locale key aluminium2.notSupported. */
export function al2NotSupportedList(): string[] {
  return i18n.t('aluminium2.notSupported', { returnObjects: true }) as string[];
}

/* ─── Reference data shapes (contract §3) ─── */

export interface Al2CnSuggestion { cnCode: string; cnDigits: string; description: string }

export interface Al2CnMappingRow {
  heading: string;
  headingDigits: string;
  category: Al2Category | string;
  categoryLabel: string;
  description: string;
  complex: boolean;
  suggestions: Al2CnSuggestion[];
}

/** GET /al2/cn-mapping: 14 headings + excluded headings (contract §3). */
export interface Al2CnMapping { rows: Al2CnMappingRow[]; excluded: string[] }

export interface Al2PfcFactorRow {
  technology: string;
  slopeSefCf4: number | null;
  slopeFC2f6: number | null;
  slopeSource: string | null;
  slopeFallbackTechnology: string | null;
  overvoltageOvc: number | null;
  overvoltageFC2f6: number | null;
  overvoltageSource: string | null;
}

/* ─── Row types (exact JSON shapes, contract §2) ─── */

export interface Al2ProductRow { product_name: string; cn_code: string; quantity: string; country_of_origin: string }

export interface Al2ProcessOutput { cn_code: string; kolicina: string }

export interface Al2ProcessRow {
  row_id: string;
  process_id: string;
  naziv: string;
  tip: 'SINGLE' | 'JOINT';
  kategorija: string;
  rute: string[];
  obuhvacene_kategorije: string[];
  potvrda_bez_prodaje: boolean;
  proizvodi: Al2ProcessOutput[];
}

/** AL2_FUEL_ENTRY: shape identical to IS_FUEL_ENTRY (contract §2). */
export type Al2FuelRow = FuelRow;
/** AL2_HEAT_ENTRY / AL2_EL_PRODUCED_ENTRY: shapes identical to the steel rows (contract §2). */
export type Al2HeatRow = HeatRow;
export type Al2ElProducedRow = ElProducedRow;

export interface Al2AnodeRow {
  row_id: string; process_id: string; vrsta: Al2AnodeKind | ''; naziv: string;
  ulaz_t: string; ostaci_t: string; cc_posto: string; ef: string; cf: string;
}

export interface Al2FlueGasRow {
  row_id: string; process_id: string; vrsta: Al2FlueGasKind | ''; materijal: string;
  kolicina: string; udio_posto: string; ef: string; cf: string;
}

export interface Al2PfcRow {
  row_id: string; process_id: string; metoda: Al2PfcMethod | ''; tehnologija: string;
  proizvodnja_primarnog_t: string; frekvencija: string; trajanje: string; aem: string;
  aeo_mv: string; ce_posto: string; izvor_faktora: 'TABLE' | 'INSTALLATION_SPECIFIC';
  sef_cf4: string; ovc: string; f_c2f6: string; efikasnost_sakupljanja_posto: string;
}

export interface Al2PrecursorRow {
  row_id: string; process_id: string; cn_code: string; izvor: 'INTERNAL_PROCESS' | 'PURCHASED';
  izvorni_process_id: string; kolicina: string; drzava: string; drzava_nepoznata: boolean;
  podaci: '' | 'DEFAULT' | 'ACTUAL'; see_direktne: string; verifikovano: boolean;
  godina_proizvodnje: string; postrojenje: string; ruta_prekursora: '' | 'PRIMARY' | 'SECONDARY' | 'UNKNOWN';
}

export interface Al2ReportingParamRow {
  row_id: string; process_id: string; otpad_t: string; pre_consumer_otpad_posto: string; ostali_elementi_posto: string;
}

/* ─── CN codes (spec §2.1, §7; contract §3) ─── */

export type Al2CnCheck =
  | { ok: true; digits: string; row: Al2CnMappingRow; category: string; inSuggestionList: boolean }
  | { ok: false; code: 'AL2_E_CN_FORMAT' | 'AL2_E_CN_EXCLUDED' | 'AL2_E_CN_NOT_CBAM_ALUMINIUM' };

/** Spec §2.1: declared goods, process outputs and precursors use exactly 8 digits (spaces allowed). */
export function isAl2CnFormat(cn: string | null | undefined): boolean {
  return /^\d{8}$/.test(cnDigits(cn ?? ''));
}

/**
 * Local mirror of GET /al2/cn-validate (spec §2.1, §7): 8 digits → excluded headings → one of the headings of
 * the backend mapping (the 8-digit headings 7609 00 00 / 7611 00 00 / 7613 00 00 match on all 8 digits,
 * contract §6.13). Headings and exclusions come from GET /al2/cn-mapping, nothing is hard-coded.
 */
export function checkAl2Cn(mapping: Al2CnMapping, cn: string | null | undefined): Al2CnCheck {
  const d = cnDigits(cn ?? '');
  if (!/^\d{8}$/.test(d)) return { ok: false, code: 'AL2_E_CN_FORMAT' };
  if ((mapping.excluded ?? []).some((x) => cnDigits(x) !== '' && d.startsWith(cnDigits(x)))) {
    return { ok: false, code: 'AL2_E_CN_EXCLUDED' };
  }
  const rows = [...(mapping.rows ?? [])].sort((a, b) => headingKey(b).length - headingKey(a).length);
  const row = rows.find((r) => headingKey(r) !== '' && d.startsWith(headingKey(r)));
  if (!row) return { ok: false, code: 'AL2_E_CN_NOT_CBAM_ALUMINIUM' };
  const inSuggestionList = (row.suggestions ?? []).some((s) => cnDigits(s.cnDigits || s.cnCode) === d);
  return { ok: true, digits: d, row, category: String(row.category), inSuggestionList };
}

function headingKey(r: Al2CnMappingRow): string {
  return cnDigits(r.headingDigits || r.heading || '');
}

/** "76061199" → "7606 11 99" (stored format, spec §4.3 example); other input is returned trimmed. */
export function formatAl2Cn(cn: string | null | undefined): string {
  const d = cnDigits(cn ?? '');
  return /^\d{8}$/.test(d) ? formatCn(d) : (cn ?? '').trim();
}

/** Suggestions (template list, OQ-AL2-10) of the given categories, for autocomplete. */
export function al2Suggestions(mapping: Al2CnMapping, categories?: string[]): (Al2CnSuggestion & { category: string; heading: string })[] {
  return (mapping.rows ?? [])
    .filter((r) => !categories || categories.includes(String(r.category)))
    .flatMap((r) => (r.suggestions ?? []).map((s) => ({ ...s, category: String(r.category), heading: r.heading })));
}

/* ─── Period (AL2_E_PERIOD, spec §1.5, §7) ─── */

/** Returns a message key result: 'sameYear' | 'from2026' | null. */
export function al2PeriodErrorCode(from: string, to: string): 'sameYear' | 'from2026' | null {
  const yf = Number((from ?? '').slice(0, 4));
  const yt = Number((to ?? '').slice(0, 4));
  if (!Number.isFinite(yf) || !Number.isFinite(yt) || yf === 0 || yt === 0) return null;
  if (yf !== yt) return 'sameYear';
  if (yf < AL2_MIN_YEAR) return 'from2026';
  return null;
}

export function al2PeriodError(from: string, to: string): string | null {
  const c = al2PeriodErrorCode(from, to);
  if (c === 'sameYear') return tr('aluminium2.msg.periodSameYear');
  if (c === 'from2026') return tr('aluminium2.msg.periodFrom2026');
  return null;
}

/** AL2_IMPORT_YEAR: integer ≥ 2026 (contract §1.1; spec §1.5). Blank → null (caller decides). */
export function importYearOk(value: string | null | undefined): boolean | null {
  const y = String(value ?? '').trim();
  if (y === '') return null;
  return /^\d{4}$/.test(y) && Number(y) >= AL2_MIN_YEAR;
}

/* ─── Products (CBAM_PRODUCT_DETAILS, spec §4.3) ─── */

export interface Al2CodedIssue { code: string; index?: number; processId?: string; outputIndex?: number; rowId?: string; detail?: string }

export function al2ProductIssues(products: Al2ProductRow[], mapping: Al2CnMapping): Al2CodedIssue[] {
  const out: Al2CodedIssue[] = [];
  if (products.length === 0) out.push({ code: 'AL2_E_NO_PRODUCTS' });
  products.forEach((p, index) => {
    if (!p.product_name?.trim()) out.push({ index, code: 'AL2_E_NAME' });
    const chk = checkAl2Cn(mapping, p.cn_code);
    if (!chk.ok) out.push({ index, code: chk.code });
    const q = toNum(p.quantity);
    if (q == null || q <= 0) out.push({ index, code: 'AL2_E_QTY' });
    if (!p.country_of_origin) out.push({ index, code: 'AL2_E_COUNTRY' });
  });
  return out;
}

/** Wizard product entry (ProductDetailEntry) → stored Aluminium II row (spec §4.3; contract §2). */
export function toAl2ProductRow(e: { productName: string; cnCode: string; quantity: string; countryOfOrigin: string }): Al2ProductRow {
  return {
    product_name: (e.productName ?? '').trim(),
    cn_code: formatAl2Cn(e.cnCode),
    quantity: (e.quantity ?? '').trim(),
    country_of_origin: e.countryOfOrigin ?? '',
  };
}

/* ─── Processes (spec §1.8, §3.3(8), (12), §4.4, §7) ─── */

export function processHasRoute(p: Al2ProcessRow, route: Al2Route): boolean {
  return (p.rute ?? []).includes(route);
}

/** Anode and PFC rows only on processes with the primary route (MA 3.17.2.1 p.25; G05e p.15, p.17). */
export function processIsPrimary(p: Al2ProcessRow): boolean {
  return processHasRoute(p, 'PRIMARY_SMELTING');
}

/** Category the outputs of a process must have (JOINT: aluminium products only, spec §3.3(12)). */
export function processOutputCategory(p: Al2ProcessRow): string {
  return p.tip === 'JOINT' ? 'ALUMINIUM_PRODUCTS' : p.kategorija;
}

/**
 * Precursor categories allowed for a process (G05e Table 2-2 p.11; MA 3.17.2.2 p.26; spec §3.3(9)):
 * UNWROUGHT → unwrought aluminium only and only with SECONDARY_MELTING (OQ-AL2-20); PRODUCTS / JOINT → both.
 */
export function allowedPrecursorCategories(p: Al2ProcessRow): string[] {
  if (p.tip === 'JOINT' || p.kategorija === 'ALUMINIUM_PRODUCTS') return ['UNWROUGHT_ALUMINIUM', 'ALUMINIUM_PRODUCTS'];
  if (p.kategorija === 'UNWROUGHT_ALUMINIUM') return processHasRoute(p, 'SECONDARY_MELTING') ? ['UNWROUGHT_ALUMINIUM'] : [];
  return [];
}

export function processTakesPrecursors(p: Al2ProcessRow): boolean {
  return allowedPrecursorCategories(p).length > 0;
}

/** AL_p = Σ kolicina of the outputs [t] (MA Annex II F, p.60–61; spec §3.3(8)); non-numeric outputs are skipped. */
export function al2ActivityLevel(p: Al2ProcessRow): number {
  return (p.proizvodi ?? []).reduce((s, o) => s + (toNum(o.kolicina) ?? 0), 0);
}

/** Process-step validation (codes of spec §7; contract §2); messages are resolved by the caller. */
export function al2ProcessIssues(processes: Al2ProcessRow[], mapping: Al2CnMapping): { errors: Al2CodedIssue[]; warnings: Al2CodedIssue[] } {
  const errors: Al2CodedIssue[] = [];
  const warnings: Al2CodedIssue[] = [];
  if (processes.length === 0) errors.push({ code: 'AL2_E_NO_PROCESS' });
  const cnToProcesses: Record<string, Set<string>> = {};
  processes.forEach((p) => {
    const pid = p.process_id;
    const routes = p.rute ?? [];
    if (p.tip === 'SINGLE') {
      if (!p.kategorija) errors.push({ code: 'AL2_E_CATEGORY', processId: pid });
      // UNWROUGHT: ≥ 1 route; PRODUCTS: no route (MA 3.17.2 / 3.18; contract §2)
      if (p.kategorija === 'UNWROUGHT_ALUMINIUM' && routes.length === 0) errors.push({ code: 'AL2_E_ROUTE_MISSING', processId: pid });
      if (p.kategorija === 'ALUMINIUM_PRODUCTS' && routes.length > 0) errors.push({ code: 'AL2_E_ROUTE_MISSING', processId: pid, detail: 'products' });
    } else {
      // JOINT: both categories, confirmation, ≥ 1 route (MA Art. 4(9) p.7; G05e p.20; contract §2)
      const cov = p.obuhvacene_kategorije ?? [];
      if (!AL2_CATEGORIES.every((c) => cov.includes(c))) errors.push({ code: 'AL2_E_JOINT_NOT_ELIGIBLE', processId: pid, detail: 'categories' });
      if (!p.potvrda_bez_prodaje) errors.push({ code: 'AL2_E_JOINT_NOT_ELIGIBLE', processId: pid, detail: 'confirmation' });
      if (routes.length === 0) errors.push({ code: 'AL2_E_ROUTE_MISSING', processId: pid });
    }
    if ((p.proizvodi ?? []).length === 0) errors.push({ code: 'AL2_E_QTY', processId: pid, detail: 'noOutput' });
    const expected = processOutputCategory(p);
    (p.proizvodi ?? []).forEach((o, j) => {
      const chk = checkAl2Cn(mapping, o.cn_code);
      if (!chk.ok) errors.push({ code: chk.code, processId: pid, outputIndex: j });
      else {
        if (expected && chk.category !== expected) errors.push({ code: 'AL2_E_OUTPUT_CATEGORY', processId: pid, outputIndex: j });
        (cnToProcesses[chk.digits] ??= new Set()).add(pid);
      }
      const q = toNum(o.kolicina);
      if (q == null || q <= 0) errors.push({ code: 'AL2_E_QTY', processId: pid, outputIndex: j });
    });
  });
  // Same CN in 2 processes → error (MA Art. 4(6), Annex II A.4; contract §2)
  Object.entries(cnToProcesses).forEach(([d, set]) => {
    if (set.size > 1) errors.push({ code: 'AL2_E_CN_MULTI_PROCESS', detail: `${formatCn(d)}: ${[...set].join(', ')}` });
  });
  return { errors, warnings };
}

/** Declared products that no process outputs (→ default value + AL2_W_PRODUCT_NO_PROCESS_DEFAULT_USED, spec §3.4). */
export function al2ProductsWithoutProcess(products: Al2ProductRow[], processes: Al2ProcessRow[]): Al2ProductRow[] {
  const outs = new Set<string>();
  processes.forEach((p) => (p.proizvodi ?? []).forEach((o) => { const d = cnDigits(o.cn_code ?? ''); if (/^\d{8}$/.test(d)) outs.add(d); }));
  return products.filter((prod) => { const d = cnDigits(prod.cn_code ?? ''); return /^\d{8}$/.test(d) && !outs.has(d); });
}

export function al2ProcessLabel(p: Al2ProcessRow | undefined, fallbackId?: string): string {
  if (!p) return fallbackId ?? '—';
  return p.naziv?.trim() ? `${p.process_id} – ${p.naziv}` : p.process_id;
}

/* ─── Anodes (spec §3.3(2)) ─── */

/** Net consumption AD = ulaz_t − ostaci_t, blank ostaci = 0 (G05e p.25). Null if ulaz is not numeric. */
export function netAnodeConsumption(ulaz: string, ostaci: string): number | null {
  const u = toNum(ulaz);
  if (u == null) return null;
  const o = String(ostaci ?? '').trim() === '' ? 0 : toNum(ostaci);
  if (o == null) return null;
  return u - o;
}

/**
 * EF of an anode row [t CO2/t]: entered `ef` wins over `cc_posto` (contract §6.4, OPEN_QUESTIONS 2026-11-22);
 * otherwise EF = cc_posto/100 × 3,664 (MA Eq. 9, p.35). Null when neither is given (AL2_E_ANODE_EF_MISSING).
 */
export function anodeEf(ccPosto: string, ef: string): number | null {
  const e = toNum(ef);
  if (e != null) return e;
  const cc = toNum(ccPosto);
  if (cc == null) return null;
  return (cc / 100) * F_CO2_C;
}

/** Em_anode = AD × EF × CF, CF default 1 (MA B.3.1.2 Eq. 11, p.35; MA B.3.1.2 "may always be used" p.35). */
export function anodeEmissions(r: Pick<Al2AnodeRow, 'ulaz_t' | 'ostaci_t' | 'cc_posto' | 'ef' | 'cf'>): number | null {
  const ad = netAnodeConsumption(r.ulaz_t, r.ostaci_t);
  const ef = anodeEf(r.cc_posto, r.ef);
  const cf = String(r.cf ?? '').trim() === '' ? 1 : toNum(r.cf);
  if (ad == null || ef == null || cf == null) return null;
  return ad * ef * cf;
}

export function anodeRowIssues(r: Al2AnodeRow, process: Al2ProcessRow | undefined): string[] {
  const out: string[] = [];
  if (process && !processIsPrimary(process)) out.push('AL2_E_ANODE_ROUTE');
  const u = toNum(r.ulaz_t);
  if (u == null || u < 0) out.push('AL2_E_QTY');
  const o = String(r.ostaci_t ?? '').trim() === '' ? 0 : toNum(r.ostaci_t);
  if (o == null || o < 0) out.push('AL2_E_QTY');
  const net = netAnodeConsumption(r.ulaz_t, r.ostaci_t);
  if (net != null && net < 0) out.push('AL2_E_ANODE_NET_NEGATIVE');
  const hasEf = String(r.ef ?? '').trim() !== '';
  const hasCc = String(r.cc_posto ?? '').trim() !== '';
  if (!hasEf && !hasCc) out.push('AL2_E_ANODE_EF_MISSING');
  if (hasCc) { const cc = toNum(r.cc_posto); if (cc == null || cc < 0 || cc > 100) out.push('AL2_E_PERCENT_RANGE'); }
  if (hasEf) { const e = toNum(r.ef); if (e == null || e < 0) out.push('AL2_E_FACTOR_RANGE'); }
  if (!fractionOk(r.cf)) out.push('AL2_E_FACTOR_RANGE');
  return [...new Set(out)];
}

/** 0 < x ≤ 1, blank allowed (default 1) – OF, CF, η (MA Eq. 7, 11, 44; spec §7 AL2_E_FACTOR_RANGE). */
export function fractionOk(v: string | null | undefined): boolean {
  if (String(v ?? '').trim() === '') return true;
  const n = toNum(v);
  return n != null && n > 0 && n <= 1;
}

/** 0 ≤ x ≤ 100, blank allowed (spec §7 AL2_E_PERCENT_RANGE). */
export function percentOk(v: string | null | undefined): boolean {
  if (String(v ?? '').trim() === '') return true;
  const n = toNum(v);
  return n != null && n >= 0 && n <= 100;
}

/** 0 < x ≤ 100, blank allowed (collection efficiency, CE; MA Eq. 20, 24; spec §7). */
export function positivePercentOk(v: string | null | undefined): boolean {
  if (String(v ?? '').trim() === '') return true;
  const n = toNum(v);
  return n != null && n > 0 && n <= 100;
}

/* ─── Flue gas (spec §3.3(3)) ─── */

/**
 * Emissions of a flue-gas row [t CO2]: CARBONATE_A = kolicina × udio/100 × EF × CF (MA B.9.1.1, Eq. 11);
 * GYPSUM_B = kolicina × 0,2558; UREA_DENOX = kolicina × 0,7328 (MA B.9.1.1 / B.9.1.2, p.49). CF only for
 * CARBONATE_A (contract §6.5). `tableEf` = Table 3 value of `materijal` (MA Annex II G, p.63) from the backend.
 */
export function flueGasEmissions(r: Pick<Al2FlueGasRow, 'vrsta' | 'kolicina' | 'udio_posto' | 'ef' | 'cf'>, tableEf?: number | null): number | null {
  const q = toNum(r.kolicina);
  if (q == null) return null;
  switch (r.vrsta) {
    case 'CARBONATE_A': {
      const udio = String(r.udio_posto ?? '').trim() === '' ? 100 : toNum(r.udio_posto);
      const ef = String(r.ef ?? '').trim() === '' ? (tableEf ?? null) : toNum(r.ef);
      const cf = String(r.cf ?? '').trim() === '' ? 1 : toNum(r.cf);
      if (udio == null || ef == null || cf == null) return null;
      return q * (udio / 100) * ef * cf;
    }
    case 'GYPSUM_B': return q * EF_GYPSUM_B;
    case 'UREA_DENOX': return q * EF_UREA_DENOX;
    default: return null;
  }
}

export function flueGasRowIssues(r: Al2FlueGasRow, tableEf?: number | null): string[] {
  const out: string[] = [];
  if (!r.vrsta) out.push('AL2_E_KIND');
  const q = toNum(r.kolicina);
  if (q == null || q <= 0) out.push('AL2_E_QTY');
  if (r.vrsta === 'CARBONATE_A') {
    if (!r.materijal && String(r.ef ?? '').trim() === '') out.push('AL2_E_FACTOR_RANGE');
    if (r.materijal && String(r.ef ?? '').trim() === '' && tableEf == null) out.push('AL2_E_FACTOR_RANGE');
    if (!percentOk(r.udio_posto)) out.push('AL2_E_PERCENT_RANGE');
    if (String(r.ef ?? '').trim() !== '') { const e = toNum(r.ef); if (e == null || e < 0) out.push('AL2_E_FACTOR_RANGE'); }
    if (!fractionOk(r.cf)) out.push('AL2_E_FACTOR_RANGE');
  }
  return [...new Set(out)];
}

/** Both CARBONATE_A and GYPSUM_B on one process → AL2_W_FLUE_GAS_A_AND_B (spec §3.3(3), OQ-AL2-21). */
export function flueGasAandB(rows: Pick<Al2FlueGasRow, 'vrsta'>[]): boolean {
  return rows.some((r) => r.vrsta === 'CARBONATE_A') && rows.some((r) => r.vrsta === 'GYPSUM_B');
}

/* ─── PFC (spec §3.3(4); MA Annex II B.7, p.45–48) ─── */

/** AEM = frequency × duration (Eq. 23), or the entered AEM. */
export function pfcAem(r: Pick<Al2PfcRow, 'aem' | 'frekvencija' | 'trajanje'>): number | null {
  const a = toNum(r.aem);
  if (a != null) return a;
  const f = toNum(r.frekvencija);
  const d = toNum(r.trajanje);
  if (f == null || d == null) return null;
  return f * d;
}

/** Method A: CF4 [t] = AEM × (SEF_CF4 / 1 000) × PrAl (Eq. 21, SEF in kg CF4/t Al per AE-min/cell-day). */
export function cf4Slope(aem: number, sefCf4: number, prAl: number): number {
  return aem * (sefCf4 / 1000) * prAl;
}

/** Method B: CF4 [t] = OVC × (AEO / CE) × PrAl × 0,001 (Eq. 24); CE used as the percent number (OQ-AL2-4). */
export function cf4Overvoltage(ovc: number, aeoMv: number, cePct: number, prAl: number): number {
  return ovc * (aeoMv / cePct) * prAl * 0.001;
}

/** C2F6 [t] = CF4 × F_C2F6 (Eq. 22 / 25). */
export function c2f6FromCf4(cf4: number, fC2f6: number): number {
  return cf4 * fC2f6;
}

/** PFC of the duct [t CO2e] = CF4 × GWP_CF4 + C2F6 × GWP_C2F6 (Eq. 26, p.48); GWP from the backend (Table 6, p.64). */
export function pfcDuctCo2e(cf4: number, c2f6: number, gwpCf4: number, gwpC2f6: number): number {
  return cf4 * gwpCf4 + c2f6 * gwpC2f6;
}

/** Total PFC = duct / (η_coll/100) (Eq. 20, p.45); blank η → no gross-up (OQ-AL2-3, AL2_W_PFC_NO_COLLECTION_EFF). */
export function pfcTotalCo2e(duct: number, collectionEffPct: string | null | undefined): number | null {
  if (String(collectionEffPct ?? '').trim() === '') return duct;
  const eta = toNum(collectionEffPct);
  if (eta == null || eta <= 0 || eta > 100) return null;
  return duct / (eta / 100);
}

export interface PfcFactors { a: number | null; f: number | null; usedTechnology: string; fallback: boolean; source: string | null }

/**
 * Factors used for a PFC row: INSTALLATION_SPECIFIC → entered sef_cf4/ovc and f_c2f6; TABLE → GET /al2/pfc-factors
 * (Table 2 for SLOPE, Table 3 for OVERVOLTAGE). PFPB_MW slope with TABLE → fallback technology of the backend
 * (CWPB, MA p.47 fn 1, OQ-AL2-13). Null factor = missing (AL2_E_PFC_FACTOR_MISSING).
 */
export function pfcFactors(r: Pick<Al2PfcRow, 'metoda' | 'tehnologija' | 'izvor_faktora' | 'sef_cf4' | 'ovc' | 'f_c2f6'>, table: Al2PfcFactorRow[]): PfcFactors {
  if (r.izvor_faktora === 'INSTALLATION_SPECIFIC') {
    return {
      a: toNum(r.metoda === 'OVERVOLTAGE' ? r.ovc : r.sef_cf4), f: toNum(r.f_c2f6),
      usedTechnology: r.tehnologija, fallback: false, source: null,
    };
  }
  const row = table.find((x) => x.technology === r.tehnologija);
  if (!row) return { a: null, f: null, usedTechnology: r.tehnologija, fallback: false, source: null };
  if (r.metoda === 'OVERVOLTAGE') {
    return { a: row.overvoltageOvc, f: row.overvoltageFC2f6, usedTechnology: row.technology, fallback: false, source: row.overvoltageSource };
  }
  if (row.slopeSefCf4 == null && row.slopeFallbackTechnology) {
    const fb = table.find((x) => x.technology === row.slopeFallbackTechnology);
    return { a: fb?.slopeSefCf4 ?? null, f: fb?.slopeFC2f6 ?? null, usedTechnology: row.slopeFallbackTechnology, fallback: true, source: fb?.slopeSource ?? null };
  }
  return { a: row.slopeSefCf4, f: row.slopeFC2f6, usedTechnology: row.technology, fallback: false, source: row.slopeSource };
}

export interface PfcPreview { aem: number | null; cf4: number | null; c2f6: number | null; duct: number | null; total: number | null }

/** Live preview of one PFC row (Eq. 20–26). GWP null → CO2e parts are null. */
export function pfcPreview(r: Al2PfcRow, table: Al2PfcFactorRow[], gwpCf4: number | null, gwpC2f6: number | null): PfcPreview {
  const empty: PfcPreview = { aem: null, cf4: null, c2f6: null, duct: null, total: null };
  const prAl = toNum(r.proizvodnja_primarnog_t);
  const { a, f } = pfcFactors(r, table);
  if (prAl == null || a == null || f == null) return empty;
  let cf4: number | null = null;
  let aem: number | null = null;
  if (r.metoda === 'SLOPE') {
    aem = pfcAem(r);
    if (aem == null) return empty;
    cf4 = cf4Slope(aem, a, prAl);
  } else if (r.metoda === 'OVERVOLTAGE') {
    const aeo = toNum(r.aeo_mv);
    const ce = toNum(r.ce_posto);
    if (aeo == null || ce == null || ce <= 0) return empty;
    cf4 = cf4Overvoltage(a, aeo, ce, prAl);
  } else return empty;
  const c2f6 = c2f6FromCf4(cf4, f);
  const duct = gwpCf4 != null && gwpC2f6 != null ? pfcDuctCo2e(cf4, c2f6, gwpCf4, gwpC2f6) : null;
  const total = duct != null ? pfcTotalCo2e(duct, r.efikasnost_sakupljanja_posto) : null;
  return { aem, cf4, c2f6, duct, total };
}

/** PFC row validation (spec §4.4 required fields, §7). */
export function pfcRowIssues(r: Al2PfcRow, process: Al2ProcessRow | undefined, table: Al2PfcFactorRow[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (process && !processIsPrimary(process)) errors.push('AL2_E_PFC_ROUTE');
  if (!r.metoda || !r.tehnologija) errors.push('AL2_E_PFC_INCOMPLETE');
  const prAl = toNum(r.proizvodnja_primarnog_t);
  if (prAl == null || prAl <= 0) errors.push('AL2_E_QTY');
  if (r.metoda === 'SLOPE') {
    const hasAem = String(r.aem ?? '').trim() !== '';
    const hasFd = String(r.frekvencija ?? '').trim() !== '' && String(r.trajanje ?? '').trim() !== '';
    if (!hasAem && !hasFd) errors.push('AL2_E_PFC_INCOMPLETE');
    if (hasAem && (toNum(r.aem) ?? -1) < 0) errors.push('AL2_E_FACTOR_RANGE');
    if (!hasAem && hasFd && ((toNum(r.frekvencija) ?? -1) < 0 || (toNum(r.trajanje) ?? -1) < 0)) errors.push('AL2_E_FACTOR_RANGE');
  }
  if (r.metoda === 'OVERVOLTAGE') {
    const aeo = toNum(r.aeo_mv);
    if (aeo == null || aeo <= 0) errors.push('AL2_E_PFC_INCOMPLETE');
    if (String(r.ce_posto ?? '').trim() === '') errors.push('AL2_E_PFC_INCOMPLETE');
    else if (!positivePercentOk(r.ce_posto)) errors.push('AL2_E_PERCENT_RANGE');
  }
  if (r.metoda && r.tehnologija) {
    const fac = pfcFactors(r, table);
    if (r.izvor_faktora === 'INSTALLATION_SPECIFIC') {
      if (fac.a == null || fac.f == null) errors.push('AL2_E_PFC_FACTOR_MISSING');
      else if (fac.a < 0 || fac.f < 0) errors.push('AL2_E_FACTOR_RANGE');
    } else if (fac.a == null || fac.f == null) {
      errors.push('AL2_E_PFC_FACTOR_MISSING');
    }
    if (r.izvor_faktora !== 'INSTALLATION_SPECIFIC' && fac.fallback) warnings.push('AL2_W_PFC_PFPB_MW_CWPB');
  }
  if (!positivePercentOk(r.efikasnost_sakupljanja_posto)) errors.push('AL2_E_PERCENT_RANGE');
  if (String(r.efikasnost_sakupljanja_posto ?? '').trim() === '') warnings.push('AL2_W_PFC_NO_COLLECTION_EFF');
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

/** Σ PrAl of a process > AL of the process → AL2_W_PFC_PRAL_GT_AL (spec §3.3(4)). */
export function pfcPrAlExceedsAl(p: Al2ProcessRow, rows: Al2PfcRow[]): boolean {
  const sum = rows.filter((r) => r.process_id === p.process_id).reduce((s, r) => s + (toNum(r.proizvodnja_primarnog_t) ?? 0), 0);
  return sum > al2ActivityLevel(p);
}

/* ─── Precursors (spec §3.3(9), §7) ─── */

/** Precursor validation against the consuming process (category before route, contract §6.8). */
export function precursorCategoryIssue(r: Pick<Al2PrecursorRow, 'cn_code'>, p: Al2ProcessRow, mapping: Al2CnMapping): string | null {
  const chk = checkAl2Cn(mapping, r.cn_code);
  if (!chk.ok) return chk.code;
  if (p.tip === 'SINGLE' && p.kategorija === 'UNWROUGHT_ALUMINIUM') {
    if (chk.category !== 'UNWROUGHT_ALUMINIUM') return 'AL2_E_PRECURSOR_CATEGORY';
    if (!processHasRoute(p, 'SECONDARY_MELTING')) return 'AL2_E_PRECURSOR_ROUTE';
    return null;
  }
  return allowedPrecursorCategories(p).includes(chk.category) ? null : 'AL2_E_PRECURSOR_CATEGORY';
}

/** INTERNAL source must be a SINGLE process (not the consumer) whose outputs contain the precursor CN (spec §3.3(9)). */
export function al2InternalSourceOk(r: Pick<Al2PrecursorRow, 'cn_code' | 'process_id'>, source: Al2ProcessRow | undefined): boolean {
  if (!source || source.process_id === r.process_id || source.tip !== 'SINGLE') return false;
  const d = cnDigits(r.cn_code ?? '');
  if (!/^\d{8}$/.test(d)) return false;
  return (source.proizvodi ?? []).some((o) => cnDigits(o.cn_code ?? '') === d);
}

export function al2PrecursorCycle(rows: Pick<Al2PrecursorRow, 'process_id' | 'izvor' | 'izvorni_process_id'>[]): string[] | null {
  return findPrecursorCycle(rows);
}

/** Y_prec = max(2026, godina_proizvodnje or Y_rep) (MA Art. 13 p.10; G03 p.111–112, p.116; contract §2). */
export function al2PrecursorYear(godina: string, yRep: number | null): number | null {
  const y = /^\d{4}$/.test(String(godina ?? '').trim()) ? Number(String(godina).trim()) : yRep;
  return y == null ? null : Math.max(AL2_MIN_YEAR, y);
}

/** Default value used for a purchased precursor: DEFAULT, or ACTUAL without verification (MA Annex II A.1 pt 4–5, p.27–28). */
export function precursorUsesDefault(r: Pick<Al2PrecursorRow, 'izvor' | 'podaci' | 'verifikovano'>): boolean {
  return r.izvor === 'PURCHASED' && (r.podaci === 'DEFAULT' || (r.podaci === 'ACTUAL' && !r.verifikovano));
}

/** m_i = M_i / AL_p (G05e p.28 "mass ratio"; display only). */
export function precursorMi(kolicina: string, al: number): number | null {
  const m = toNum(kolicina);
  if (m == null || al <= 0) return null;
  return m / al;
}

/**
 * App heuristic AL2_W_MI_BELOW_ONE (spec §3.3(9)): Σ m_i < 1 – only SINGLE ALUMINIUM_PRODUCTS processes with
 * ≥ 1 precursor (contract §6.7). Null when not applicable.
 */
export function al2MiSum(p: Al2ProcessRow, rows: Pick<Al2PrecursorRow, 'process_id' | 'kolicina'>[]): number | null {
  if (p.tip !== 'SINGLE' || p.kategorija !== 'ALUMINIUM_PRODUCTS') return null;
  const al = al2ActivityLevel(p);
  const own = rows.filter((r) => r.process_id === p.process_id);
  if (own.length === 0 || al <= 0) return null;
  return own.reduce((s, r) => s + (toNum(r.kolicina) ?? 0), 0) / al;
}

/* ─── Reporting parameters (spec §3.5) ─── */

/** Tonnes scrap per tonne of product = otpad_t / AL_p (MA Annex IV pt 2, p.85; OQ-AL2-19). */
export function scrapPerTonne(otpadT: string, al: number): number | null {
  const s = toNum(otpadT);
  if (s == null || al <= 0) return null;
  return s / al;
}

/** Other elements are reported only above 1 % (MA Annex IV pt 2, p.85). Null when blank. */
export function otherElementsReported(pct: string | number | null | undefined): boolean | null {
  const n = typeof pct === 'number' ? pct : toNum(pct == null ? null : String(pct));
  if (n == null) return null;
  return n > OTHER_ELEMENTS_REPORT_THRESHOLD_PCT;
}

export function reportingParamIssues(r: Al2ReportingParamRow): string[] {
  const out: string[] = [];
  if (String(r.otpad_t ?? '').trim() !== '') { const n = toNum(r.otpad_t); if (n == null || n < 0) out.push('AL2_E_QTY'); }
  if (!percentOk(r.pre_consumer_otpad_posto) || !percentOk(r.ostali_elementi_posto)) out.push('AL2_E_PERCENT_RANGE');
  return out;
}

/* ─── Result view aggregation (contract §4; spec §3.6, §3.7) ─── */

export interface Al2ResultItemLike {
  outputCode: string | null;
  formulaCode?: string | null;
  passCode: string | null;
  entryIndex: number | null;
  inputSnapshot: string;
  resultValue: number;
}

export interface Al2Group { values: Record<string, number>; snap: Record<string, unknown> }

function parseSnap(raw: unknown): Record<string, unknown> {
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Groups AL2 items into products (passCode PRODUCT, by entryIndex) and processes (passCode = process_id). */
export function groupAl2Result(items: Al2ResultItemLike[]): { products: Map<number, Al2Group>; processes: Map<string, Al2Group> } {
  const products = new Map<number, Al2Group>();
  const processes = new Map<string, Al2Group>();
  items.forEach((i) => {
    const code = i.outputCode ?? i.formulaCode ?? null;
    if (!i.passCode || !code || !code.startsWith('AL2_')) return;
    if (i.passCode === 'PRODUCT') {
      const idx = i.entryIndex ?? 0;
      const g = products.get(idx) ?? { values: {}, snap: parseSnap(i.inputSnapshot) };
      g.values[code] = Number(i.resultValue);
      products.set(idx, g);
    } else {
      const g = processes.get(i.passCode) ?? { values: {}, snap: parseSnap(i.inputSnapshot) };
      g.values[code] = Number(i.resultValue);
      processes.set(i.passCode, g);
    }
  });
  return { products, processes };
}

/** Σ embedded emissions over declared products (t CO2e) = Σ AL2_RESULT_EMBEDDED_DIR (contract §4 totalEmissions). */
export function al2ProductTotal(products: Map<number, Al2Group>): number {
  let sum = 0;
  products.forEach((g) => { sum += g.values.AL2_RESULT_EMBEDDED_DIR ?? 0; });
  return sum;
}

/** Emissions over the reporting period rounded to full tonnes (MA Annex II A.1 pt 6, p.28). */
export function al2RoundTonnes(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(Number(v))) return null;
  return Math.round(Number(v));
}

/** SEE shown with max. 5 decimals (MA Annex II A.1 pt 8, p.28). */
export function al2FormatSee(v: number | null | undefined): string {
  return v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toFixed(5);
}

/* ─── Messages ─── */

/** Text of an Aluminium II error/warning code (locale keys aluminium2.err.<CODE>); `what` names the row. */
export function al2IssueText(code: string, params?: Record<string, unknown>): string {
  return tr(`aluminium2.err.${code}`, { defaultValue: code, what: '', ...(params ?? {}) });
}

export function toIssues(codes: string[], what: string): StepIssue[] {
  return codes.map((code) => ({ code, message: al2IssueText(code, { what }) }));
}
