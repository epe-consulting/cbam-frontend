// CBAM cost calculation engine (pure functions, no UI).
// Steps: scope -> threshold -> embedded emissions -> free-allocation adjustment ->
// foreign carbon-price reduction -> certificates -> cost, run separately for the
// default-value scenario and the actual-emissions scenario.

import { BENCHMARKS } from './data/benchmarks.ts';
import { DEFAULT_VALUES } from './data/defaultValues.ts';
import {
  CBAM_FACTOR,
  CBAM_FACTOR_SOURCE,
  CSCF,
  CSCF_SOURCE,
  FALLBACK_COUNTRY,
  MASS_THRESHOLD_TONNES,
  SOURCES,
  benchmarkYearBand,
  defaultValueColumn,
  scopeOf,
  thresholdApplies,
} from './regulatory.ts';
import type {
  BenchmarkOption,
  BenchmarkRow,
  CostItem,
  DeductionClaim,
  DefaultValueRow,
  ImportLine,
  ImporterContext,
  LineResult,
  PriceAssumptions,
  PriceCase,
  ScenarioLineResult,
  Sector,
  Step,
} from './types.ts';

export const PLANNING_LABEL = 'Planning scenario—verification pending';
export const FORECAST_LABEL = 'Forecast';

// ------------------------------------------------------------------ helpers
export const digits = (cn: string) => cn.replace(/\D/g, '');
const fmt = (n: number, d = 4) => (Math.round(n * 10 ** d) / 10 ** d).toString();

const dvByCountry = new Map<string, DefaultValueRow[]>();
for (const r of DEFAULT_VALUES) {
  const list = dvByCountry.get(r.country) ?? [];
  list.push(r);
  dvByCountry.set(r.country, list);
}
const bmByCn = new Map<string, BenchmarkRow>(BENCHMARKS.map((b) => [digits(b.cn), b]));

/** Countries with their own table in this calculator's extract of Annex I. */
export const DATASET_COUNTRIES = [...dvByCountry.keys()].filter((c) => c !== FALLBACK_COUNTRY).sort();
export const FALLBACK_COUNTRY_LABEL = FALLBACK_COUNTRY;

/** Selectable 8-digit CN codes (the CBAM benchmark list, IR 2025/2620 point 5.3) plus electricity. */
export const CN_OPTIONS: { cn: string; description: string; sector: Sector }[] = [
  ...BENCHMARKS.map((b) => ({ cn: b.cn, description: b.description, sector: b.sector })),
  { cn: '2716 00 00', description: 'Electrical energy', sector: 'ELECTRICITY' as Sector },
];

export function toTonnes(quantity: number, unit: 't' | 'kg'): number {
  return unit === 'kg' ? quantity / 1000 : quantity;
}

// ------------------------------------------------------------------ default values
export type DefaultLookup =
  | { ok: true; row: DefaultValueRow; value: number; usedFallback: boolean; notes: string[] }
  | { ok: false; reason: string; variants?: string[] };

function matchRows(rows: DefaultValueRow[], cnDigits: string): DefaultValueRow[] {
  const hits = rows.filter((r) => cnDigits.startsWith(digits(r.cn)));
  if (!hits.length) return [];
  const longest = Math.max(...hits.map((r) => digits(r.cn).length));
  return hits.filter((r) => digits(r.cn).length === longest);
}

function pickVariant(rows: DefaultValueRow[], variant?: string) {
  if (rows.length <= 1) return { row: rows[0] };
  const descs = [...new Set(rows.map((r) => r.description))];
  if (descs.length === 1) return { row: rows[0] }; // identical duplicates are reported as critical in validation
  const hit = rows.find((r) => r.description === variant);
  return hit ? { row: hit } : { variants: descs };
}

/**
 * Default value incl. mark-up for the reporting year. IR 2025/2621 Annex I (p. 4):
 * if the country is not listed, or listed with no value / '–', use 'Other countries and territories'.
 * A missing value is never treated as zero.
 */
export function lookupDefaultValue(country: string, cn: string, year: number, variant?: string): DefaultLookup {
  const col = defaultValueColumn(year);
  if (!col) return { ok: false, reason: `No definitive-period default values for ${year} (Annex I covers 2026 onwards).` };
  const cnD = digits(cn);
  const notes: string[] = [];

  const ownTable = dvByCountry.get(country);
  if (!ownTable && country !== FALLBACK_COUNTRY) {
    return {
      ok: false,
      reason: `${country} is not in this calculator's extract of Annex I. Choose 'Other countries and territories' only if ${country} has no table in Annex I.`,
    };
  }
  let variantDesc = variant;
  if (ownTable && country !== FALLBACK_COUNTRY) {
    const own = matchRows(ownTable, cnD);
    if (own.length) {
      const pick = pickVariant(own, variant);
      if (!pick.row) return { ok: false, reason: 'Select the product variant used in Annex I.', variants: pick.variants };
      const row = pick.row;
      variantDesc = row.description;
      if (row.blocked) {
        return {
          ok: false,
          reason: `Annex I row ${row.cn} '${row.description}' for ${country} (p. ${row.page}) has an unresolved critical discrepancy (see DATA_VALIDATION.md). Not used.`,
        };
      }
      const v = row[col];
      if (v != null && row.markers[col] === 'NUM') {
        return { ok: true, row, value: v, usedFallback: false, notes };
      }
      notes.push(`${country} lists ${row.cn} without a value ('–') on p. ${row.page}; fallback applies.`);
    } else {
      notes.push(`${country} has no row for this CN code; fallback applies.`);
    }
  }
  const other = dvByCountry.get(FALLBACK_COUNTRY) ?? [];
  const oth = matchRows(other, cnD);
  if (!oth.length) return { ok: false, reason: `No default value for ${cn} in 'Other countries and territories'.` };
  const pick = pickVariant(oth, variantDesc);
  if (!pick.row) return { ok: false, reason: 'Select the product variant used in Annex I.', variants: pick.variants };
  const row = pick.row;
  if (row.blocked) return { ok: false, reason: `Fallback row ${row.cn} (p. ${row.page}) has a critical discrepancy.` };
  const v = row[col];
  if (v == null || row.markers[col] !== 'NUM') {
    return { ok: false, reason: `No default value for ${cn} in 'Other countries and territories' (p. ${row.page}).` };
  }
  return { ok: true, row, value: v, usedFallback: country !== FALLBACK_COUNTRY, notes };
}

/** Variants (e.g. white / grey clinker) available for a CN code in a country table and the fallback table. */
export function variantsFor(country: string, cn: string): string[] {
  const cnD = digits(cn);
  const set = new Set<string>();
  for (const c of [country, FALLBACK_COUNTRY]) {
    const rows = matchRows(dvByCountry.get(c) ?? [], cnD);
    if (rows.length > 1) rows.forEach((r) => set.add(r.description));
  }
  return [...set];
}

// ------------------------------------------------------------------ benchmarks
export type BenchmarkLookup =
  | { ok: true; value: number; option: BenchmarkOption; note: string; page: number }
  | { ok: false; reason: string };

/**
 * Default CBAM benchmark (Column B). IR 2025/2620 Annex point 5.1: same production route as
 * the default value's route indicator; where several alloy grades are given for one CN code,
 * the highest benchmark for the relevant production year is used. Point 5.3: (1)/(2) year bands.
 */
export function selectDefaultBenchmark(cn: string, year: number, defaultRoute: string): BenchmarkLookup {
  const bm = bmByCn.get(digits(cn));
  if (!bm) return { ok: false, reason: `No CBAM benchmark for ${cn} in IR 2025/2620 point 5.3.` };
  const band = benchmarkYearBand(year);
  if (band == null) return { ok: false, reason: `IR 2025/2620 gives benchmarks for production years 2026-2030 only (year ${year}).` };
  let opts = bm.colB.filter((o) => o.yearBand == null || o.yearBand === band);
  if (!opts.length) return { ok: false, reason: `No benchmark for year band ${band} for ${cn}.` };
  const withRoute = opts.filter((o) => o.route);
  if (!withRoute.length) {
    if (opts.length === 1) return { ok: true, value: opts[0].value, option: opts[0], note: 'Benchmark independent of production route', page: bm.page };
    return { ok: false, reason: `Ambiguous benchmark for ${cn}.` };
  }
  opts = withRoute;
  const routes = (defaultRoute.match(/[A-L]/g) ?? []) as string[];
  const matched = opts.filter((o) => routes.includes(o.route as string));
  if (matched.length) {
    const best = matched.reduce((a, b) => (b.value > a.value ? b : a));
    return {
      ok: true,
      value: best.value,
      option: best,
      note:
        matched.length > 1
          ? `Route ${defaultRoute}: highest of matching routes (${matched.map((m) => m.route).join(', ')})`
          : `Route (${best.route}) from the default-value table`,
      page: bm.page,
    };
  }
  const alloyOnly = opts.every((o) => ['F', 'G', 'H', 'J'].includes(o.route as string));
  if (alloyOnly) {
    const best = opts.reduce((a, b) => (b.value > a.value ? b : a));
    return {
      ok: true,
      value: best.value,
      option: best,
      note: `Steel alloy grades: highest benchmark for the production year (point 5.1), route (${best.route})`,
      page: bm.page,
    };
  }
  return {
    ok: false,
    reason: routes.length
      ? `Default route ${defaultRoute} does not match benchmark routes ${opts.map((o) => o.route).join('/')} for ${cn}.`
      : `The default-value table gives no production route for ${cn}, but the benchmark depends on the route (${opts
          .map((o) => o.route)
          .join('/')}). IR 2026/1740 corrected missing route indicators; it is not in the sources.`,
  };
}

// ------------------------------------------------------------------ scenario steps
function deductionFor(claim: DeductionClaim | undefined, pathway: 'DEFAULT' | 'ACTUAL') {
  const c = claim ?? { kind: 'NONE_ASSUMED' as const };
  switch (c.kind) {
    case 'NONE_ASSUMED':
      return { amount: 0, note: 'No foreign carbon-price deduction assumed.', label: null };
    case 'UNKNOWN':
      return {
        amount: 0,
        note: 'Carbon price paid abroad unknown — no deduction applied; cost may be overstated.',
        label: 'Deduction unknown',
      };
    case 'EFFECTIVELY_PAID':
      if (pathway === 'DEFAULT')
        return {
          amount: 0,
          note: `Not eligible: ${SOURCES.deductionDefault}.`,
          label: 'Deduction not eligible with default values',
        };
      return {
        amount: 0,
        note: `Claimed but not quantified: ${SOURCES.deductionConversion}. Requires evidence of effective payment and net of rebates (Art. 9(1)-(2)).`,
        label: 'Deduction not quantified',
      };
    case 'COMMISSION_DEFAULT_CARBON_PRICE':
      return {
        amount: 0,
        note: `Claimed but not quantified: ${SOURCES.deductionConversion}; Commission default carbon prices are not in the sources.`,
        label: 'Deduction not quantified',
      };
  }
}

function priceFor(line: ImportLine, prices: PriceAssumptions, pc: PriceCase) {
  if (line.importYear === 2026) {
    const off = prices.official2026?.[line.importQuarter];
    if (off != null && off > 0) {
      return {
        price: off,
        label: `Official 2026 Q${line.importQuarter} price as entered (check against the Commission publication). ${SOURCES.price2026}`,
        forecast: false,
      };
    }
    return {
      price: prices[pc],
      label: `Assumed ${pc} price for 2026 Q${line.importQuarter} (official quarterly price not entered). ${SOURCES.price2026}`,
      forecast: true,
    };
  }
  return {
    price: prices[pc],
    label: `Assumed ${pc} price. ${SOURCES.priceFrom2027}; the import week does not fix the purchase price.`,
    forecast: true,
  };
}

function finish(
  base: ScenarioLineResult,
  line: ImportLine,
  see: number,
  sefa: number,
  claim: DeductionClaim | undefined,
  pathway: 'DEFAULT' | 'ACTUAL',
  prices: PriceAssumptions,
  pc: PriceCase,
): ScenarioLineResult {
  const M = base.massTonnes;
  const E = see * M;
  const FAA = sefa * M; // IR 2025/2620 Eq. 1
  const ded = deductionFor(claim, pathway);
  const certs = Math.max(0, E - FAA - ded.amount);
  const p = priceFor(line, prices, pc);
  const steps: Step[] = [
    ...base.steps,
    { label: 'Embedded emissions = SEE × mass', value: `${fmt(see)} × ${fmt(M)} = ${fmt(E)} t CO2e` },
    { label: 'Free-allocation adjustment = SEFA × mass', value: `${fmt(sefa, 6)} × ${fmt(M)} = ${fmt(FAA)} t CO2e`, source: SOURCES.freeAllocationTotal },
    { label: 'Foreign carbon-price reduction', value: `${fmt(ded.amount)} t CO2e — ${ded.note}` },
    {
      label: 'Certificates = max(0, emissions − adjustment − reduction)',
      value: `${fmt(certs)}`,
      source: SOURCES.certificates,
    },
    { label: 'Certificate cost = certificates × price', value: `${fmt(certs)} × €${fmt(p.price, 2)} = €${fmt(certs * p.price, 2)}`, source: p.label },
  ];
  const labels = [...base.labels];
  if (p.forecast) labels.push(FORECAST_LABEL);
  if (ded.label) labels.push(ded.label);
  if (E - FAA - ded.amount < 0) labels.push('Adjustment exceeds emissions — floored at 0 (see open questions)');
  return {
    ...base,
    status: 'ESTIMATED',
    see,
    sefa,
    embeddedEmissions: E,
    freeAllocationAdjustment: FAA,
    deduction: ded.amount,
    deductionNote: ded.note,
    certificates: certs,
    price: p.price,
    priceLabel: p.label,
    certificateCost: certs * p.price,
    labels,
    steps,
  };
}

/**
 * Default-path SEFA for planning when the supplier report is not available yet.
 * SEFA = CBAM factor × CSCF × BMg (IR 2025/2620 Annex Equation 6). Not a substitute for
 * verified installation SEFA in a regulatory filing.
 */
export function suggestDefaultPathwaySefa(
  country: string,
  cn: string,
  year: number,
  variant?: string,
):
  | { ok: true; sefa: number; see: number; benchmark: number; cbamFactor: number; cscf: number; note: string }
  | { ok: false; reason: string } {
  const dv = lookupDefaultValue(country, cn, year, variant);
  if (!dv.ok) return { ok: false, reason: dv.reason };
  const bm = selectDefaultBenchmark(cn, year, dv.row.route);
  if (!bm.ok) return { ok: false, reason: bm.reason };
  const cf = CBAM_FACTOR[year];
  const cscf = CSCF[year];
  if (cf == null || cscf == null) return { ok: false, reason: `No CBAM factor / CSCF for ${year} in the sources.` };
  const sefa = cf * cscf * bm.value;
  return {
    ok: true,
    sefa,
    see: dv.value,
    benchmark: bm.value,
    cbamFactor: cf,
    cscf,
    note: `Default-path SEFA = ${cf} × ${cscf} × ${bm.value} = ${sefa} t CO₂e/t (IR 2025/2620 Eq. 6). Planning estimate only — replace with supplier-report SEFA when available.`,
  };
}

function defaultScenario(line: ImportLine, M: number, prices: PriceAssumptions, pc: PriceCase): ScenarioLineResult {
  const y = line.importYear; // default values for the final good: year of import (IR 2025/2547 Art. 7; Guidance 3 p. 116)
  const base: ScenarioLineResult = { status: 'INSUFFICIENT_INFO', reasons: [], massTonnes: M, reportingYear: y, labels: [], steps: [] };
  base.steps.push({ label: 'Reporting period', value: String(y), source: SOURCES.reportingYearDefault });
  const dv = lookupDefaultValue(line.countryOfOrigin, line.cn, y, line.variant);
  if (!dv.ok) return { ...base, reasons: [dv.reason] };
  base.steps.push({
    label: `Default SEE (${dv.row.country}, ${dv.row.cn} ${dv.row.description}, incl. ${y >= 2028 ? '2028+' : y} mark-up)`,
    value: `${fmt(dv.value)} t CO2e/t`,
    source: `${SOURCES.defaultValues}, p. ${dv.row.page}${dv.usedFallback ? '; ' + SOURCES.fallback : ''}`,
  });
  dv.notes.forEach((n) => base.labels.push(n));
  if (dv.usedFallback) base.labels.push('Fallback default (Other countries and territories)');
  const bm = selectDefaultBenchmark(line.cn, y, dv.row.route);
  if (!bm.ok) return { ...base, see: dv.value, reasons: [bm.reason] };
  const cf = CBAM_FACTOR[y];
  const cscf = CSCF[y];
  if (cf == null || cscf == null) return { ...base, see: dv.value, reasons: [`No CBAM factor / CSCF for ${y} in the sources.`] };
  const sefa = cf * cscf * bm.value; // IR 2025/2620 Eq. 6
  base.steps.push({ label: `Default benchmark BMg (Column B) — ${bm.note}`, value: `${fmt(bm.value, 3)} t CO2e/t`, source: `IR (EU) 2025/2620 point 5.3, p. ${bm.page}` });
  base.steps.push({ label: 'CBAM factor', value: String(cf), source: CBAM_FACTOR_SOURCE });
  base.steps.push({ label: 'CSCF', value: String(cscf), source: CSCF_SOURCE });
  base.steps.push({ label: 'SEFA = CBAM factor × CSCF × BMg', value: `${fmt(sefa, 6)} t CO2e/t`, source: SOURCES.freeAllocationDefault });
  base.seeSource = `${SOURCES.defaultValues} p. ${dv.row.page}`;
  base.sefaSource = SOURCES.freeAllocationDefault;
  return finish(base, line, dv.value, sefa, line.defaultDeduction, 'DEFAULT', prices, pc);
}

function actualScenario(line: ImportLine, M: number, prices: PriceAssumptions, pc: PriceCase): ScenarioLineResult | null {
  if (line.actualSee == null && line.actualSefa == null) return null;
  // IR 2025/2547 Art. 7(1): 2026 imports -> 2026; otherwise import year unless evidence of production year.
  const y =
    line.importYear === 2026
      ? 2026
      : line.productionYearEvidence && line.productionYear
        ? line.productionYear
        : line.importYear;
  const base: ScenarioLineResult = { status: 'INSUFFICIENT_INFO', reasons: [], massTonnes: M, reportingYear: y, labels: [], steps: [] };
  base.steps.push({ label: 'Reporting period (actual data)', value: String(y), source: 'IR (EU) 2025/2547 Art. 7(1)' });
  if (line.actualSource !== 'VERIFIED_SUPPLIER') base.labels.push(PLANNING_LABEL);
  if (line.actualSee == null) return { ...base, reasons: ['Actual specific embedded emissions (SEE) not entered.'] };
  if (line.actualSefa == null)
    return {
      ...base,
      see: line.actualSee,
      reasons: [
        "Supplier's specific embedded free allocation (SEFA) not entered. It is part of the operator's emissions report (Guidance Doc. No. 4 §2.2); the calculator does not estimate it.",
      ],
    };
  base.steps.push({
    label: `Actual SEE (${line.actualSource === 'VERIFIED_SUPPLIER' ? 'verified supplier data' : 'preliminary estimate'})`,
    value: `${fmt(line.actualSee)} t CO2e/t`,
  });
  base.steps.push({ label: "SEFA from supplier's emissions report", value: `${fmt(line.actualSefa, 6)} t CO2e/t`, source: SOURCES.sefaActual });
  base.seeSource = line.actualSource === 'VERIFIED_SUPPLIER' ? 'Verified supplier data' : 'Preliminary estimate';
  base.sefaSource = SOURCES.sefaActual;
  return finish(base, line, line.actualSee, line.actualSefa, line.actualDeduction, 'ACTUAL', prices, pc);
}

// ------------------------------------------------------------------ portfolio
export function calculate(
  lines: ImportLine[],
  prices: PriceAssumptions,
  priceCase: PriceCase,
  importer: ImporterContext,
): LineResult[] {
  // 1) scope
  const scoped = lines.map((line) => {
    const M = toTonnes(line.quantity, line.unit);
    const sc = scopeOf(digits(line.cn));
    return { line, M, sc };
  });
  // 2) threshold per import year (Art. 2a): total net mass of all CBAM goods except electricity/hydrogen
  const massByYear = new Map<number, number>();
  for (const s of scoped) {
    if (s.sc.inScope && s.sc.sector && thresholdApplies(s.sc.sector)) {
      massByYear.set(s.line.importYear, (massByYear.get(s.line.importYear) ?? 0) + s.M);
    }
  }
  return scoped.map(({ line, M, sc }) => {
    const empty = (status: ScenarioLineResult['status'], reason: string): ScenarioLineResult => ({
      status,
      reasons: [reason],
      massTonnes: M,
      labels: [],
      steps: [],
    });
    if (!(M > 0)) {
      const r = empty('INSUFFICIENT_INFO', 'Quantity must be greater than zero.');
      return { line, sector: sc.sector, scopeNote: sc.note, defaultScenario: r, actualScenario: null };
    }
    if (!sc.inScope) {
      const r = empty('OUT_OF_SCOPE', sc.note);
      return { line, scopeNote: sc.note, defaultScenario: r, actualScenario: null };
    }
    if (sc.sector === 'ELECTRICITY') {
      const r = empty('NOT_IMPLEMENTED', 'Electricity (MWh, IR 2025/2621 Annex III) is not implemented in this calculator.');
      return { line, sector: sc.sector, scopeNote: sc.note, defaultScenario: r, actualScenario: null };
    }
    let thresholdNote: string | undefined;
    if (thresholdApplies(sc.sector!)) {
      const linesMass = massByYear.get(line.importYear) ?? 0;
      const other = importer.otherImportsTonnesByYear[line.importYear];
      if (linesMass > MASS_THRESHOLD_TONNES) {
        thresholdNote = `Annual total ${fmt(linesMass + (other ?? 0), 3)} t > ${MASS_THRESHOLD_TONNES} t: all ${line.importYear} imports are subject to CBAM (${SOURCES.threshold}).`;
      } else if (other == null) {
        const r = empty(
          'INSUFFICIENT_INFO',
          `Lines total ${fmt(linesMass, 3)} t in ${line.importYear}. Enter your other CBAM imports for that year to assess the ${MASS_THRESHOLD_TONNES} t exemption (${SOURCES.threshold}).`,
        );
        return { line, sector: sc.sector, scopeNote: sc.note, defaultScenario: r, actualScenario: line.actualSee != null ? r : null };
      } else {
        const total = linesMass + other;
        if (total <= MASS_THRESHOLD_TONNES) {
          const msg = `Annual total ${fmt(total, 3)} t does not exceed ${MASS_THRESHOLD_TONNES} t: importer exempt for ${line.importYear} (${SOURCES.threshold}).`;
          const r = empty('EXEMPT', msg);
          return { line, sector: sc.sector, scopeNote: sc.note, thresholdNote: msg, defaultScenario: r, actualScenario: line.actualSee != null ? r : null };
        }
        thresholdNote = `Annual total ${fmt(total, 3)} t > ${MASS_THRESHOLD_TONNES} t: all ${line.importYear} imports are subject to CBAM (${SOURCES.threshold}).`;
      }
    } else {
      thresholdNote = `The ${MASS_THRESHOLD_TONNES} t exemption does not apply to hydrogen (Art. 2a(4)).`;
    }
    return {
      line,
      sector: sc.sector,
      scopeNote: sc.note,
      thresholdNote,
      defaultScenario: defaultScenario(line, M, prices, priceCase),
      actualScenario: actualScenario(line, M, prices, priceCase),
    };
  });
}

// ------------------------------------------------------------------ totals
export interface ScenarioTotals {
  massTonnes: number;
  embeddedEmissions: number;
  freeAllocationAdjustment: number;
  deduction: number;
  certificates: number;
  certificateCost: number;
  incomplete: boolean; // some in-scope line could not be estimated
  planning: boolean; // contains preliminary (unverified) actual data
  forecast: boolean;
}

/** Scenario result per line; in the actual scenario, lines without actual data keep the default result. */
export function scenarioLine(r: LineResult, scenario: 'DEFAULT' | 'ACTUAL'): ScenarioLineResult {
  return scenario === 'ACTUAL' && r.actualScenario ? r.actualScenario : r.defaultScenario;
}

export function totals(results: LineResult[], scenario: 'DEFAULT' | 'ACTUAL'): ScenarioTotals {
  const t: ScenarioTotals = {
    massTonnes: 0,
    embeddedEmissions: 0,
    freeAllocationAdjustment: 0,
    deduction: 0,
    certificates: 0,
    certificateCost: 0,
    incomplete: false,
    planning: false,
    forecast: false,
  };
  for (const r of results) {
    const s = scenarioLine(r, scenario);
    if (s.status === 'INSUFFICIENT_INFO' || s.status === 'NOT_IMPLEMENTED') t.incomplete = true;
    if (s.labels.includes(PLANNING_LABEL)) t.planning = true;
    if (s.status === 'EXEMPT') t.massTonnes += s.massTonnes;
    if (s.status !== 'ESTIMATED') continue;
    if (s.labels.includes(FORECAST_LABEL)) t.forecast = true;
    t.massTonnes += s.massTonnes;
    t.embeddedEmissions += s.embeddedEmissions ?? 0;
    t.freeAllocationAdjustment += s.freeAllocationAdjustment ?? 0;
    t.deduction += s.deduction ?? 0;
    t.certificates += s.certificates ?? 0;
    t.certificateCost += s.certificateCost ?? 0;
  }
  return t;
}

// ------------------------------------------------------------------ other costs
export type CostView = 'IMPORTER' | 'COMBINED';
export type CostCase = 'low' | 'central' | 'high';

export function costItemAmount(item: CostItem, cc: CostCase): number {
  const a = item.amount[cc] ?? item.amount.central;
  return a * Math.max(0, item.count) * Math.min(1, Math.max(0, item.allocationShare));
}

/**
 * Importer view: costs the importer pays directly or that are passed on to it.
 * Combined view: also costs the producer pays and does not pass on (each cost counted once).
 */
export function otherCosts(items: CostItem[], scenario: 'DEFAULT' | 'ACTUAL', view: CostView, cc: CostCase) {
  let oneOff = 0;
  let annual = 0;
  for (const i of items) {
    if (i.scenario !== scenario) continue;
    if (view === 'IMPORTER' && i.payer === 'PRODUCER') continue;
    const a = costItemAmount(i, cc);
    if (i.occurrence === 'ONE_OFF') oneOff += a;
    else annual += a;
  }
  return { oneOff, annual };
}

// ------------------------------------------------------------------ comparison
export interface ScenarioSummary {
  certificateCost: number;
  oneOff: number;
  annual: number;
  firstYearTotal: number;
  recurringTotal: number;
  costPerTonneFirstYear: number | null;
  costPerTonneRecurring: number | null;
  totals: ScenarioTotals;
}

export interface BreakEven {
  kind: 'NONE' | 'ALWAYS' | 'AT_QUANTITY' | 'NOT_APPLICABLE';
  quantityTonnes?: number;
  simpleFormulaTonnes?: number;
  explanation: string;
}

export interface Comparison {
  default: ScenarioSummary;
  actual: ScenarioSummary;
  certificateSaving: number;
  additionalCostsFirstYear: number;
  additionalCostsRecurring: number;
  netSavingFirstYear: number;
  netSavingRecurring: number;
  comparable: boolean;
  comparableNote: string;
  breakEvenFirstYear: BreakEven;
  breakEvenRecurring: BreakEven;
  conclusion: string;
}

export interface CompareInput {
  lines: ImportLine[];
  prices: PriceAssumptions;
  priceCase: PriceCase;
  importer: ImporterContext;
  costItems: CostItem[];
  view: CostView;
  costCase: CostCase;
}

function summary(results: LineResult[], items: CostItem[], scenario: 'DEFAULT' | 'ACTUAL', view: CostView, cc: CostCase): ScenarioSummary {
  const t = totals(results, scenario);
  const oc = otherCosts(items, scenario, view, cc);
  const first = t.certificateCost + oc.oneOff + oc.annual;
  const rec = t.certificateCost + oc.annual;
  return {
    certificateCost: t.certificateCost,
    oneOff: oc.oneOff,
    annual: oc.annual,
    firstYearTotal: first,
    recurringTotal: rec,
    costPerTonneFirstYear: t.massTonnes > 0 ? first / t.massTonnes : null,
    costPerTonneRecurring: t.massTonnes > 0 ? rec / t.massTonnes : null,
    totals: t,
  };
}

const eur = (n: number) =>
  `€${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function netSavingAt(input: CompareInput, k: number, basis: 'FIRST' | 'RECURRING'): number {
  const lines = input.lines.map((l) => ({ ...l, quantity: l.quantity * k }));
  const res = calculate(lines, input.prices, input.priceCase, input.importer);
  const d = summary(res, input.costItems, 'DEFAULT', input.view, input.costCase);
  const a = summary(res, input.costItems, 'ACTUAL', input.view, input.costCase);
  return basis === 'FIRST' ? d.firstYearTotal - a.firstYearTotal : d.recurringTotal - a.recurringTotal;
}

function breakEven(input: CompareInput, c: Omit<Comparison, 'breakEvenFirstYear' | 'breakEvenRecurring' | 'conclusion'>, basis: 'FIRST' | 'RECURRING'): BreakEven {
  const mass = c.default.totals.massTonnes;
  if (!c.comparable || mass <= 0) return { kind: 'NOT_APPLICABLE', explanation: 'Break-even needs a complete comparison of the same goods.' };
  const extra = basis === 'FIRST' ? c.additionalCostsFirstYear : c.additionalCostsRecurring;
  const savingPerTonne = c.certificateSaving / mass;
  if (savingPerTonne <= 0) {
    return {
      kind: 'NONE',
      explanation:
        extra > 0
          ? 'Actual emissions do not lower certificate costs under these assumptions, so the additional costs are never recovered — no break-even volume.'
          : 'Actual emissions do not lower certificate costs; any difference comes only from the other cost items.',
    };
  }
  if (extra <= 0) return { kind: 'ALWAYS', explanation: 'No additional costs for the actual-emissions route, so it is cheaper at any liable volume.' };
  const simple = extra / savingPerTonne;
  // Full engine (threshold and per-line rules): bisection on a uniform scale of all line quantities.
  let lo = 0;
  let hi = 1;
  let guard = 0;
  while (netSavingAt(input, hi, basis) < 0 && guard++ < 60) hi *= 2;
  if (guard >= 60) return { kind: 'NONE', simpleFormulaTonnes: simple, explanation: 'No break-even found within a realistic volume range.' };
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (netSavingAt(input, mid, basis) >= 0) hi = mid;
    else lo = mid;
  }
  const q = hi * mass;
  const differs = Math.abs(q - simple) > 0.01 * Math.max(1, simple);
  return {
    kind: 'AT_QUANTITY',
    quantityTonnes: q,
    simpleFormulaTonnes: simple,
    explanation: `Break-even at about ${q.toFixed(1)} t (same product mix, scaled). Simple estimate: additional costs ${eur(extra)} ÷ certificate saving ${eur(savingPerTonne)}/t = ${simple.toFixed(1)} t${
      differs ? '; the full calculation differs because of the 50 t threshold or other per-line rules' : ''
    }. Assumes the additional costs are fixed and do not change with volume.`,
  };
}

export function compare(input: CompareInput): Comparison {
  const res = calculate(input.lines, input.prices, input.priceCase, input.importer);
  const d = summary(res, input.costItems, 'DEFAULT', input.view, input.costCase);
  const a = summary(res, input.costItems, 'ACTUAL', input.view, input.costCase);
  const anyActual = res.some((r) => r.actualScenario);
  const comparable = anyActual && !d.totals.incomplete && !a.totals.incomplete;
  const comparableNote = !anyActual
    ? 'Enter actual emissions for at least one line to compare.'
    : comparable
      ? 'Both scenarios use the same goods, quantities, origins, years and price assumptions. Lines without actual data use default values in both scenarios.'
      : 'Some lines could not be estimated in one scenario — totals are incomplete and must not be compared as final.';
  const base = {
    default: d,
    actual: a,
    certificateSaving: d.certificateCost - a.certificateCost,
    additionalCostsFirstYear: a.oneOff + a.annual - (d.oneOff + d.annual),
    additionalCostsRecurring: a.annual - d.annual,
    netSavingFirstYear: d.firstYearTotal - a.firstYearTotal,
    netSavingRecurring: d.recurringTotal - a.recurringTotal,
    comparable,
    comparableNote,
  };
  const be1 = breakEven(input, base, 'FIRST');
  const be2 = breakEven(input, base, 'RECURRING');
  let conclusion: string;
  if (!comparable) conclusion = comparableNote;
  else {
    const cs = base.certificateSaving;
    const certPart =
      cs >= 0
        ? `Using actual emissions is estimated to reduce certificate costs by ${eur(cs)}`
        : `Using actual emissions is estimated to INCREASE certificate costs by ${eur(cs)}`;
    const ns = base.netSavingFirstYear;
    const netPart =
      ns >= 0 ? `the estimated net saving is ${eur(ns)}` : `the estimated net result is an ADDITIONAL COST of ${eur(ns)}`;
    const rec = base.netSavingRecurring;
    conclusion = `${certPart}. After ${eur(base.additionalCostsFirstYear)} in additional calculation, verification and reporting costs in the first year, ${netPart} for the selected period. In later years (recurring costs only) the net ${
      rec >= 0 ? 'saving' : 'additional cost'
    } is ${eur(rec)} per year.`;
    if (a.totals.planning) conclusion += ` Actual values include preliminary estimates (${PLANNING_LABEL}).`;
    if (d.totals.forecast || a.totals.forecast) conclusion += ' Based on an assumed certificate price — this is a forecast.';
  }
  return { ...base, breakEvenFirstYear: be1, breakEvenRecurring: be2, conclusion };
}

/** Sensitivity of the recurring and first-year net saving. */
export function sensitivity(input: CompareInput) {
  const rows: { label: string; netSavingFirstYear: number; netSavingRecurring: number }[] = [];
  const run = (label: string, patch: Partial<CompareInput>) => {
    const c = compare({ ...input, ...patch });
    rows.push({ label, netSavingFirstYear: c.netSavingFirstYear, netSavingRecurring: c.netSavingRecurring });
  };
  (['low', 'central', 'high'] as PriceCase[]).forEach((pc) => run(`Certificate price ${pc} (€${input.prices[pc]})`, { priceCase: pc }));
  [0.8, 1.2].forEach((f) =>
    run(`Actual SEE ×${f}`, {
      lines: input.lines.map((l) => (l.actualSee != null ? { ...l, actualSee: l.actualSee * f } : l)),
    }),
  );
  (['low', 'high'] as CostCase[]).forEach((cc) => run(`Calculation/verification costs ${cc}`, { costCase: cc }));
  return rows;
}
