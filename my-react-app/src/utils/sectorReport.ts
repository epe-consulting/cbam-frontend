// Sector parts of the operator's emissions report (IR (EU) 2025/2547 Annex IV) for iron & steel,
// cement and Aluminium II. The values are read from the calculation result (GET /calculations/{id}/result, see
// docs/steel-api-contract.md §4, docs/cement-api-contract.md §4 and docs/aluminium2-api-contract.md §4);
// nothing is recalculated here.
// The report itself is the EU template and stays in English.

import { isSteelCategory } from './steelSteps';
import { isCementCategory } from './cementSteps';
import { isAluminium2Category, otherElementsReported } from './aluminium2Steps';

export type ReportSector = 'ALUMINIUM' | 'ALUMINIUM_II' | 'STEEL' | 'CEMENT' | 'OTHER';

export function reportSector(category: string | null | undefined): ReportSector {
  const c = (category ?? '').toLowerCase();
  // Aluminium II first: its name contains "aluminium" but it must never use the old aluminium report path.
  if (isAluminium2Category(category)) return 'ALUMINIUM_II';
  if (c.includes('aluminium') || c.includes('aluminum')) return 'ALUMINIUM';
  if (isSteelCategory(category)) return 'STEEL';
  if (isCementCategory(category)) return 'CEMENT';
  return 'OTHER';
}

export interface SectorResultItem {
  formulaCode: string;
  outputCode: string | null;
  passCode: string | null;
  entryIndex: number | null;
  inputSnapshot: string;
  resultValue: number;
}

export interface SectorGood {
  description: string;
  cnCode: string;
  productionRoute: string;
  quantity: string;
  countryOfOrigin: string;
  specificDirectEmbedded: string;
  specificIndirectEmbedded: string;
  shareDefaultValues: string;
  dataSource: string;
}

export interface SectorPrecursor {
  cnCode: string;
  name: string;
  countryOfOrigin: string;
  quantity: string;
  valueType: 'actual' | 'default' | '';
  specificDirectEmbedded: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Snapshot = Record<string, any>;

function parse(raw: string | null | undefined): Snapshot {
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

/** SEE with 5 decimals (IR 2025/2547 Annex II A.1 point 6 as applied in the result views). */
export const see5 = (v: unknown): string =>
  v == null || v === '' || !Number.isFinite(Number(v)) ? '' : Number(v).toFixed(5);

const num = (v: unknown): string => (v == null || v === '' || !Number.isFinite(Number(v)) ? '' : String(Number(v)));

const prefixOf = (sector: ReportSector) => (sector === 'STEEL' ? 'IS' : sector === 'ALUMINIUM_II' ? 'AL2' : 'CE');

/** Product items of the result grouped by product row (passCode PRODUCT, entryIndex). */
function productGroups(items: SectorResultItem[], prefix: string) {
  const groups = new Map<number, { values: Record<string, number>; snap: Snapshot }>();
  items
    .filter((i) => i.passCode === 'PRODUCT' && (i.outputCode ?? i.formulaCode).startsWith(`${prefix}_RESULT_`))
    .forEach((i) => {
      const idx = i.entryIndex ?? 0;
      const g = groups.get(idx) ?? { values: {}, snap: parse(i.inputSnapshot) };
      g.values[i.outputCode ?? i.formulaCode] = i.resultValue;
      groups.set(idx, g);
    });
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => g);
}

/** Goods table (Annex IV): one row per declared product that has result items. */
export function sectorGoods(sector: ReportSector, items: SectorResultItem[]): SectorGood[] {
  const p = prefixOf(sector);
  return productGroups(items, p).map(({ values, snap }) => {
    const dv: Snapshot = snap.default_value ?? {};
    return {
      description: String(snap.product_name ?? ''),
      cnCode: String(snap.taric_code || snap.cn_code || ''),
      productionRoute: String(snap.process_name || dv.route || ''),
      quantity: num(snap.quantity_t),
      countryOfOrigin: String(snap.country_of_origin ?? ''),
      specificDirectEmbedded: see5(values[`${p}_RESULT_SEE_DIR`]),
      specificIndirectEmbedded: see5(values[`${p}_RESULT_SEE_INDIR`]),
      shareDefaultValues: values[`${p}_RESULT_DEFAULT_SHARE`] != null ? `${num(values[`${p}_RESULT_DEFAULT_SHARE`])} %` : '',
      dataSource: String(snap.data_source ?? ''),
    };
  });
}

const PRECURSOR_VALUE_TYPE: Record<string, 'actual' | 'default' | ''> = {
  INTERNAL: 'actual',
  VERIFIED_SUPPLIER: 'actual',
  DEFAULT_ANNEX_I: 'default',
  DEFAULT_ANNEX_IV: 'default',
  ZERO_EU_EXEMPT: '',
};

/** Precursors of all products, each listed once (the same precursor is repeated on every product of a process). */
export function sectorPrecursors(sector: ReportSector, items: SectorResultItem[]): SectorPrecursor[] {
  const seen = new Set<string>();
  const out: SectorPrecursor[] = [];
  productGroups(items, prefixOf(sector)).forEach(({ snap }) => {
    const list: Snapshot[] = Array.isArray(snap.precursors) ? snap.precursors : [];
    list.forEach((pr) => {
      const key = [snap.process_id, pr.row_id, pr.cn_code, pr.taric_code, pr.source, pr.mass_t].join('|');
      if (seen.has(key)) return;
      seen.add(key);
      const source = String(pr.source ?? '');
      const zero = source === 'ZERO_EU_EXEMPT';
      out.push({
        cnCode: String(pr.taric_code || pr.cn_code || ''),
        name: String(pr.category ?? ''),
        countryOfOrigin: String(pr.country ?? (source === 'INTERNAL' ? 'own installation' : '')),
        quantity: num(pr.mass_t),
        valueType: PRECURSOR_VALUE_TYPE[source] ?? '',
        specificDirectEmbedded: zero
          ? '0 (origin EU / Annex III point 1 to Reg. (EU) 2023/956; IR (EU) 2025/2547 Annex III B)'
          // Aluminium II: direct emissions only (CBAM-R Annex II; aluminium2 spec §1.3)
          : sector === 'ALUMINIUM_II'
            ? `${see5(pr.see_dir) || '—'}`
            : `${see5(pr.see_dir) || '—'} direct; ${see5(pr.see_indir) || '—'} indirect`,
      });
    });
  });
  return out;
}

/**
 * Attributed direct / indirect emissions of the installation's processes (IR 2025/2547 Annex III A,
 * Eq. 55 and 56): sum of the process items. Null when no process was calculated (default-value path).
 */
export function sectorProcessTotals(sector: ReportSector, items: SectorResultItem[]): { direct: number | null; indirect: number | null } {
  const p = prefixOf(sector);
  const sum = (code: string) => {
    const xs = items.filter((i) => (i.outputCode ?? i.formulaCode) === code && i.passCode !== 'PRODUCT');
    return xs.length ? xs.reduce((s, i) => s + Number(i.resultValue || 0), 0) : null;
  };
  return { direct: sum(`${p}_PROC_ATTR_DIR`), indirect: sum(`${p}_PROC_ATTR_INDIR`) };
}

/** Iron & steel sector parameters (IR 2025/2547 Annex IV, point 2, pp. 84-85), one row per IS_REPORTING_PARAM_ENTRY. */
export interface SteelParamRow {
  process: string;
  category: string;
  reducingAgent: string;
  mnPct: string;
  crPct: string;
  niPct: string;
  otherAlloyPct: string;
  carbonPct: string;
  scrapTPerT: string;
  preConsumerScrapPct: string;
}

interface AnswerRow {
  questionCode: string | null;
  answerValue: string | null;
}

function jsonRows(answers: AnswerRow[], code: string): Snapshot[] {
  return answers
    .filter((a) => a.questionCode === code && a.answerValue)
    .map((a) => parse(a.answerValue))
    .filter((r) => Object.keys(r).length > 0);
}

/**
 * Steel parameters from the wizard answers. `processName` / `category` / `reducingAgent` turn codes into
 * report text (the caller passes English labels).
 */
export function steelParamRows(
  answers: AnswerRow[],
  label: { category: (code: string) => string; reducingAgent: (code: string) => string },
): SteelParamRow[] {
  const processes = new Map<string, Snapshot>();
  jsonRows(answers, 'IS_PROCESS_ENTRY').forEach((p) => processes.set(String(p.process_id ?? ''), p));
  return jsonRows(answers, 'IS_REPORTING_PARAM_ENTRY').map((r) => {
    const proc = processes.get(String(r.process_id ?? ''));
    const cat = String(r.kategorija || proc?.kategorija || '');
    return {
      process: [r.process_id, proc?.naziv].filter(Boolean).join(' – '),
      category: cat ? label.category(cat) : '',
      reducingAgent: r.redukciono_sredstvo ? label.reducingAgent(String(r.redukciono_sredstvo)) : '',
      mnPct: num(r.mn_posto),
      crPct: num(r.cr_posto),
      niPct: num(r.ni_posto),
      otherAlloyPct: num(r.ostali_legirni_posto),
      carbonPct: num(r.c_posto),
      scrapTPerT: num(r.otpad_t_po_t),
      preConsumerScrapPct: num(r.pre_consumer_otpad_posto),
    };
  });
}

/**
 * Cement sector parameter (IR 2025/2547 Annex IV, point 2, p. 84): "Mass ratio of tonnes cement clinker
 * consumed per produced tonne of cement (clinker to cement ratio expressed in per cent)" — cement only;
 * clinker, calcined clay and aluminous cement: N.a. Read from the product result (`ck`, fraction 0-1).
 */
export interface CementParamRow {
  good: string;
  cnCode: string;
  clinkerToCementPct: string;
}

export function cementParamRows(items: SectorResultItem[]): CementParamRow[] {
  return productGroups(items, 'CE')
    .filter(({ snap }) => String(snap.category ?? '') === 'CEMENT')
    .map(({ values, snap }) => {
      const ck = values.CE_RESULT_CK ?? (snap.ck != null && snap.ck !== '' ? Number(snap.ck) : null);
      return {
        good: String(snap.product_name ?? ''),
        cnCode: String(snap.taric_code || snap.cn_code || ''),
        clinkerToCementPct: ck != null && Number.isFinite(Number(ck)) ? `${Number((Number(ck) * 100).toFixed(2))} %` : '',
      };
    });
}

/**
 * Aluminium sector parameters (IR 2025/2547 Annex IV, point 2, p. 85; aluminium2 spec §3.5): tonnes scrap used
 * per tonne of product, % pre-consumer scrap and – only if above 1 % – the total content of elements other than
 * aluminium. One row per declared product, read from the product snapshot `reporting_params`
 * (docs/aluminium2-api-contract.md §4). Empty strings where nothing was entered.
 */
export interface Al2ParamRow {
  good: string;
  cnCode: string;
  scrapTPerT: string;
  preConsumerScrapPct: string;
  otherElementsPct: string;
  /** false = entered but ≤ 1 % (not reported), null = not entered. */
  otherElementsReported: boolean | null;
}

export function al2ParamRows(items: SectorResultItem[]): Al2ParamRow[] {
  return productGroups(items, 'AL2')
    .filter(({ snap }) => snap.reporting_params && typeof snap.reporting_params === 'object')
    .map(({ snap }) => {
      const rp: Snapshot = snap.reporting_params;
      const reported = typeof rp.other_elements_reported === 'boolean'
        ? (rp.other_elements_pct == null || rp.other_elements_pct === '' ? null : rp.other_elements_reported)
        : otherElementsReported(rp.other_elements_pct);
      return {
        good: String(snap.product_name ?? ''),
        cnCode: String(snap.cn_code ?? ''),
        scrapTPerT: see5(rp.scrap_t_per_t),
        preConsumerScrapPct: rp.pre_consumer_pct != null && rp.pre_consumer_pct !== '' ? `${num(rp.pre_consumer_pct)} %` : '',
        otherElementsPct: reported ? `${num(rp.other_elements_pct)} %` : '',
        otherElementsReported: reported,
      };
    });
}

/** "P1 – name; P2 – name" of the sector's production processes (IS_ / CE_ / AL2_PROCESS_ENTRY). */
export function sectorProcessNames(sector: ReportSector, answers: AnswerRow[]): string {
  const code = sector === 'STEEL' ? 'IS_PROCESS_ENTRY' : sector === 'CEMENT' ? 'CE_PROCESS_ENTRY'
    : sector === 'ALUMINIUM_II' ? 'AL2_PROCESS_ENTRY' : '';
  if (!code) return '';
  return jsonRows(answers, code)
    .map((p) => [p.process_id, p.naziv].filter(Boolean).join(' – '))
    .filter(Boolean)
    .join('; ');
}

/** Number of result errors (products / processes without result items). */
export function resultErrorCount(warnings: { severity?: string }[] | undefined): number {
  return (warnings ?? []).filter((w) => (w.severity ?? '').toUpperCase() === 'ERROR').length;
}
