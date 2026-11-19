// CBAM cost calculation engine (pure functions, no UI).
// Steps: scope -> threshold -> embedded emissions -> free-allocation adjustment ->
// foreign carbon-price reduction -> certificates -> cost, run separately for the
// default-value scenario and the actual-emissions scenario.

import { BENCHMARKS } from './data/benchmarks.ts';
import { tr } from '../i18n';
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

/** Internal marker labels (stable, English); show them with labelText(). */
export const PLANNING_LABEL = 'Planning scenario—verification pending';
export const FORECAST_LABEL = 'Forecast';

/** Display text of a scenario label in the current language (markers are translated, other labels already are). */
export function labelText(label: string): string {
  if (label === PLANNING_LABEL) return tr('cc.e.planning');
  if (label === FORECAST_LABEL) return tr('cc.e.forecast');
  return label;
}

const caseText = (c: string) => tr(`cc.e.case.${c}`);

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
  if (!col) return { ok: false, reason: tr('cc.e.noDvYear', { year }) };
  const cnD = digits(cn);
  const notes: string[] = [];

  const ownTable = dvByCountry.get(country);
  if (!ownTable && country !== FALLBACK_COUNTRY) {
    return {
      ok: false,
      reason: tr('cc.e.countryNotInExtract', { country }),
    };
  }
  let variantDesc = variant;
  if (ownTable && country !== FALLBACK_COUNTRY) {
    const own = matchRows(ownTable, cnD);
    if (own.length) {
      const pick = pickVariant(own, variant);
      if (!pick.row) return { ok: false, reason: tr('cc.e.selectVariant'), variants: pick.variants };
      const row = pick.row;
      variantDesc = row.description;
      if (row.blocked) {
        return {
          ok: false,
          reason: tr('cc.e.rowBlocked', { cn: row.cn, desc: row.description, country, page: row.page }),
        };
      }
      const v = row[col];
      if (v != null && row.markers[col] === 'NUM') {
        return { ok: true, row, value: v, usedFallback: false, notes };
      }
      notes.push(tr('cc.e.rowDash', { country, cn: row.cn, page: row.page }));
    } else {
      notes.push(tr('cc.e.noRow', { country }));
    }
  }
  const other = dvByCountry.get(FALLBACK_COUNTRY) ?? [];
  const oth = matchRows(other, cnD);
  if (!oth.length) return { ok: false, reason: tr('cc.e.noDvOther', { cn }) };
  const pick = pickVariant(oth, variantDesc);
  if (!pick.row) return { ok: false, reason: tr('cc.e.selectVariant'), variants: pick.variants };
  const row = pick.row;
  if (row.blocked) return { ok: false, reason: tr('cc.e.fallbackBlocked', { cn: row.cn, page: row.page }) };
  const v = row[col];
  if (v == null || row.markers[col] !== 'NUM') {
    return { ok: false, reason: tr('cc.e.noDvOtherPage', { cn, page: row.page }) };
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
  if (!bm) return { ok: false, reason: tr('cc.e.noBenchmark', { cn }) };
  const band = benchmarkYearBand(year);
  if (band == null) return { ok: false, reason: tr('cc.e.bmYears', { year }) };
  let opts = bm.colB.filter((o) => o.yearBand == null || o.yearBand === band);
  if (!opts.length) return { ok: false, reason: tr('cc.e.bmBand', { band, cn }) };
  const withRoute = opts.filter((o) => o.route);
  if (!withRoute.length) {
    if (opts.length === 1) return { ok: true, value: opts[0].value, option: opts[0], note: tr('cc.e.bmNoRoute'), page: bm.page };
    return { ok: false, reason: tr('cc.e.bmAmbiguous', { cn }) };
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
          ? tr('cc.e.bmHighest', { route: defaultRoute, routes: matched.map((m) => m.route).join(', ') })
          : tr('cc.e.bmFromTable', { route: best.route }),
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
      note: tr('cc.e.bmAlloy', { route: best.route }),
      page: bm.page,
    };
  }
  return {
    ok: false,
    reason: routes.length
      ? tr('cc.e.bmRouteMismatch', { route: defaultRoute, routes: opts.map((o) => o.route).join('/'), cn })
      : tr('cc.e.bmRouteMissing', { cn, routes: opts.map((o) => o.route).join('/') }),
  };
}

// ------------------------------------------------------------------ scenario steps
function deductionFor(claim: DeductionClaim | undefined, pathway: 'DEFAULT' | 'ACTUAL') {
  const c = claim ?? { kind: 'NONE_ASSUMED' as const };
  switch (c.kind) {
    case 'NONE_ASSUMED':
      return { amount: 0, note: tr('cc.e.dedNone'), label: null };
    case 'UNKNOWN':
      return {
        amount: 0,
        note: tr('cc.e.dedUnknownNote'),
        label: tr('cc.e.dedUnknown'),
      };
    case 'EFFECTIVELY_PAID':
      if (pathway === 'DEFAULT')
        return {
          amount: 0,
          note: tr('cc.e.dedNotEligibleNote', { src: SOURCES.deductionDefault }),
          label: tr('cc.e.dedNotEligible'),
        };
      return {
        amount: 0,
        note: tr('cc.e.dedClaimedNote', { src: SOURCES.deductionConversion }),
        label: tr('cc.e.dedNotQuantified'),
      };
    case 'COMMISSION_DEFAULT_CARBON_PRICE':
      return {
        amount: 0,
        note: tr('cc.e.dedCommissionNote', { src: SOURCES.deductionConversion }),
        label: tr('cc.e.dedNotQuantified'),
      };
  }
}

function priceFor(line: ImportLine, prices: PriceAssumptions, pc: PriceCase) {
  if (line.importYear === 2026) {
    const off = prices.official2026?.[line.importQuarter];
    if (off != null && off > 0) {
      return {
        price: off,
        label: tr('cc.e.priceOfficial', { q: line.importQuarter, src: SOURCES.price2026 }),
        forecast: false,
      };
    }
    return {
      price: prices[pc],
      label: tr('cc.e.priceAssumed2026', { case: caseText(pc), q: line.importQuarter, src: SOURCES.price2026 }),
      forecast: true,
    };
  }
  return {
    price: prices[pc],
    label: tr('cc.e.priceAssumed', { case: caseText(pc), src: SOURCES.priceFrom2027 }),
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
    { label: tr('cc.e.stepEE'), value: `${fmt(see)} × ${fmt(M)} = ${fmt(E)} t CO2e` },
    { label: tr('cc.e.stepFAA'), value: `${fmt(sefa, 6)} × ${fmt(M)} = ${fmt(FAA)} t CO2e`, source: SOURCES.freeAllocationTotal },
    { label: tr('cc.e.stepDed'), value: `${fmt(ded.amount)} t CO2e — ${ded.note}` },
    {
      label: tr('cc.e.stepCerts'),
      value: `${fmt(certs)}`,
      source: SOURCES.certificates,
    },
    { label: tr('cc.e.stepCost'), value: `${fmt(certs)} × €${fmt(p.price, 2)} = €${fmt(certs * p.price, 2)}`, source: p.label },
  ];
  const labels = [...base.labels];
  if (p.forecast) labels.push(FORECAST_LABEL);
  if (ded.label) labels.push(ded.label);
  if (E - FAA - ded.amount < 0) labels.push(tr('cc.e.floored'));
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
  if (cf == null || cscf == null) return { ok: false, reason: tr('cc.e.noFactor', { year }) };
  const sefa = cf * cscf * bm.value;
  return {
    ok: true,
    sefa,
    see: dv.value,
    benchmark: bm.value,
    cbamFactor: cf,
    cscf,
    note: tr('cc.e.sefaNote', { cf, cscf, bm: bm.value, sefa }),
  };
}

function defaultScenario(line: ImportLine, M: number, prices: PriceAssumptions, pc: PriceCase): ScenarioLineResult {
  const y = line.importYear; // default values for the final good: year of import (IR 2025/2547 Art. 7; Guidance 3 p. 116)
  const base: ScenarioLineResult = { status: 'INSUFFICIENT_INFO', reasons: [], massTonnes: M, reportingYear: y, labels: [], steps: [] };
  base.steps.push({ label: tr('cc.e.stepPeriod'), value: String(y), source: SOURCES.reportingYearDefault });
  const dv = lookupDefaultValue(line.countryOfOrigin, line.cn, y, line.variant);
  if (!dv.ok) return { ...base, reasons: [dv.reason] };
  base.steps.push({
    label: tr('cc.e.stepDefaultSee', { country: dv.row.country, cn: dv.row.cn, desc: dv.row.description, year: y >= 2028 ? '2028+' : y }),
    value: `${fmt(dv.value)} t CO2e/t`,
    source: `${SOURCES.defaultValues}, p. ${dv.row.page}${dv.usedFallback ? '; ' + SOURCES.fallback : ''}`,
  });
  dv.notes.forEach((n) => base.labels.push(n));
  if (dv.usedFallback) base.labels.push(tr('cc.e.fallbackLabel'));
  const bm = selectDefaultBenchmark(line.cn, y, dv.row.route);
  if (!bm.ok) return { ...base, see: dv.value, reasons: [bm.reason] };
  const cf = CBAM_FACTOR[y];
  const cscf = CSCF[y];
  if (cf == null || cscf == null) return { ...base, see: dv.value, reasons: [tr('cc.e.noFactor', { year: y })] };
  const sefa = cf * cscf * bm.value; // IR 2025/2620 Eq. 6
  base.steps.push({ label: tr('cc.e.stepBm', { note: bm.note }), value: `${fmt(bm.value, 3)} t CO2e/t`, source: `IR (EU) 2025/2620 point 5.3, p. ${bm.page}` });
  base.steps.push({ label: tr('cc.e.stepCbamFactor'), value: String(cf), source: CBAM_FACTOR_SOURCE });
  base.steps.push({ label: 'CSCF', value: String(cscf), source: CSCF_SOURCE });
  base.steps.push({ label: tr('cc.e.stepSefa'), value: `${fmt(sefa, 6)} t CO2e/t`, source: SOURCES.freeAllocationDefault });
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
  base.steps.push({ label: tr('cc.e.stepPeriodActual'), value: String(y), source: 'IR (EU) 2025/2547 Art. 7(1)' });
  if (line.actualSource !== 'VERIFIED_SUPPLIER') base.labels.push(PLANNING_LABEL);
  if (line.actualSee == null) return { ...base, reasons: [tr('cc.e.noActualSee')] };
  if (line.actualSefa == null)
    return {
      ...base,
      see: line.actualSee,
      reasons: [
        tr('cc.e.noActualSefa'),
      ],
    };
  base.steps.push({
    label: tr('cc.e.stepActualSee', { kind: line.actualSource === 'VERIFIED_SUPPLIER' ? tr('cc.e.verifiedData') : tr('cc.e.preliminary') }),
    value: `${fmt(line.actualSee)} t CO2e/t`,
  });
  base.steps.push(
    line.actualSource === 'VERIFIED_SUPPLIER'
      ? { label: tr('cc.e.stepSefaSupplier'), value: `${fmt(line.actualSefa, 6)} t CO2e/t`, source: SOURCES.sefaActual }
      : {
          label: tr('cc.e.stepSefaPlanning'),
          value: `${fmt(line.actualSefa, 6)} t CO2e/t`,
          source: tr('cc.e.notVerifiedSrc', { src: SOURCES.sefaActual }),
        },
  );
  base.seeSource = line.actualSource === 'VERIFIED_SUPPLIER' ? tr('cc.e.verifiedSupplier') : tr('cc.e.preliminaryCap');
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
      const r = empty('INSUFFICIENT_INFO', tr('cc.e.qtyPositive'));
      return { line, sector: sc.sector, scopeNote: sc.note, defaultScenario: r, actualScenario: null };
    }
    if (!sc.inScope) {
      const r = empty('OUT_OF_SCOPE', sc.note);
      return { line, scopeNote: sc.note, defaultScenario: r, actualScenario: null };
    }
    if (sc.sector === 'ELECTRICITY') {
      const r = empty('NOT_IMPLEMENTED', tr('cc.e.electricityNotImpl'));
      return { line, sector: sc.sector, scopeNote: sc.note, defaultScenario: r, actualScenario: null };
    }
    let thresholdNote: string | undefined;
    if (thresholdApplies(sc.sector!)) {
      const linesMass = massByYear.get(line.importYear) ?? 0;
      const other = importer.otherImportsTonnesByYear[line.importYear];
      if (linesMass > MASS_THRESHOLD_TONNES) {
        thresholdNote = tr('cc.e.thresholdOver', { total: fmt(linesMass + (other ?? 0), 3), limit: MASS_THRESHOLD_TONNES, year: line.importYear, src: SOURCES.threshold });
      } else if (other == null) {
        const r = empty(
          'INSUFFICIENT_INFO',
          tr('cc.e.thresholdNeedOther', { total: fmt(linesMass, 3), year: line.importYear, limit: MASS_THRESHOLD_TONNES, src: SOURCES.threshold }),
        );
        return { line, sector: sc.sector, scopeNote: sc.note, defaultScenario: r, actualScenario: line.actualSee != null ? r : null };
      } else {
        const total = linesMass + other;
        if (total <= MASS_THRESHOLD_TONNES) {
          const msg = tr('cc.e.thresholdExempt', { total: fmt(total, 3), limit: MASS_THRESHOLD_TONNES, year: line.importYear, src: SOURCES.threshold });
          const r = empty('EXEMPT', msg);
          return { line, sector: sc.sector, scopeNote: sc.note, thresholdNote: msg, defaultScenario: r, actualScenario: line.actualSee != null ? r : null };
        }
        thresholdNote = tr('cc.e.thresholdOver', { total: fmt(total, 3), limit: MASS_THRESHOLD_TONNES, year: line.importYear, src: SOURCES.threshold });
      }
    } else {
      thresholdNote = tr('cc.e.thresholdHydrogen', { limit: MASS_THRESHOLD_TONNES });
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
  if (!c.comparable || mass <= 0) return { kind: 'NOT_APPLICABLE', explanation: tr('cc.e.beNeedComplete') };
  const extra = basis === 'FIRST' ? c.additionalCostsFirstYear : c.additionalCostsRecurring;
  const savingPerTonne = c.certificateSaving / mass;
  if (savingPerTonne <= 0) {
    return {
      kind: 'NONE',
      explanation:
        extra > 0
          ? tr('cc.e.beNever')
          : tr('cc.e.beOnlyOther'),
    };
  }
  if (extra <= 0) return { kind: 'ALWAYS', explanation: tr('cc.e.beAlways') };
  const simple = extra / savingPerTonne;
  // Full engine (threshold and per-line rules): bisection on a uniform scale of all line quantities.
  let lo = 0;
  let hi = 1;
  let guard = 0;
  while (netSavingAt(input, hi, basis) < 0 && guard++ < 60) hi *= 2;
  if (guard >= 60) return { kind: 'NONE', simpleFormulaTonnes: simple, explanation: tr('cc.e.beNotFound') };
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
    explanation: tr('cc.e.beAt', {
      q: q.toFixed(1), extra: eur(extra), saving: eur(savingPerTonne), simple: simple.toFixed(1),
      diff: differs ? tr('cc.e.beDiffers') : '',
    }),
  };
}

export function compare(input: CompareInput): Comparison {
  const res = calculate(input.lines, input.prices, input.priceCase, input.importer);
  const d = summary(res, input.costItems, 'DEFAULT', input.view, input.costCase);
  const a = summary(res, input.costItems, 'ACTUAL', input.view, input.costCase);
  const anyActual = res.some((r) => r.actualScenario);
  const comparable = anyActual && !d.totals.incomplete && !a.totals.incomplete;
  const comparableNote = !anyActual
    ? tr('cc.e.cmpNeedActual')
    : comparable
      ? tr('cc.e.cmpOk')
      : tr('cc.e.cmpIncomplete');
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
        ? tr('cc.e.conclCertDown', { v: eur(cs) })
        : tr('cc.e.conclCertUp', { v: eur(cs) });
    const ns = base.netSavingFirstYear;
    const netPart =
      ns >= 0 ? tr('cc.e.conclNetSave', { v: eur(ns) }) : tr('cc.e.conclNetCost', { v: eur(ns) });
    const rec = base.netSavingRecurring;
    conclusion = tr('cc.e.conclMain', {
      cert: certPart, extra: eur(base.additionalCostsFirstYear), net: netPart,
      kind: rec >= 0 ? tr('cc.e.saving') : tr('cc.e.additionalCost'), rec: eur(rec),
    });
    if (a.totals.planning) conclusion += tr('cc.e.conclPlanning', { label: labelText(PLANNING_LABEL) });
    if (d.totals.forecast || a.totals.forecast) conclusion += tr('cc.e.conclForecast');
  }
  return { ...base, breakEvenFirstYear: be1, breakEvenRecurring: be2, conclusion };
}

export interface YearComparison {
  year: number;
  input: CompareInput;
  comparison: Comparison;
  /** One-off cost items are counted only in the earliest import year. */
  oneOffIncluded: boolean;
}

/**
 * Compare each import year separately. Certificates are surrendered per calendar year
 * (Reg. (EU) 2023/956 Art. 22(1)) and the 50 t threshold is assessed per calendar year
 * (Art. 2a), so lines of different years must not be added into one annual figure.
 * One-off costs belong to the first year only; later years carry recurring costs.
 */
export function compareByYear(input: CompareInput): YearComparison[] {
  const years = [...new Set(input.lines.map((l) => l.importYear))].sort((a, b) => a - b);
  // One-off set-up costs fall in the first year in which actual data is used (else the first year).
  const withActual = years.filter((y) => input.lines.some((l) => l.importYear === y && l.actualSee != null));
  const oneOffYear = withActual[0] ?? years[0];
  return years.map((year) => {
    const yInput: CompareInput = {
      ...input,
      lines: input.lines.filter((l) => l.importYear === year),
      costItems: year === oneOffYear ? input.costItems : input.costItems.filter((c) => c.occurrence !== 'ONE_OFF'),
    };
    return { year, input: yInput, comparison: compare(yInput), oneOffIncluded: year === oneOffYear };
  });
}

/** Sensitivity of the recurring and first-year net saving. */
export function sensitivity(input: CompareInput) {
  const rows: { label: string; netSavingFirstYear: number; netSavingRecurring: number }[] = [];
  const run = (label: string, patch: Partial<CompareInput>) => {
    const c = compare({ ...input, ...patch });
    rows.push({ label, netSavingFirstYear: c.netSavingFirstYear, netSavingRecurring: c.netSavingRecurring });
  };
  (['low', 'central', 'high'] as PriceCase[]).forEach((pc) => run(tr('cc.e.sensPrice', { case: caseText(pc), price: input.prices[pc] }), { priceCase: pc }));
  [0.8, 1.2].forEach((f) =>
    run(tr('cc.e.sensSee', { f }), {
      lines: input.lines.map((l) => (l.actualSee != null ? { ...l, actualSee: l.actualSee * f } : l)),
    }),
  );
  (['low', 'high'] as CostCase[]).forEach((cc) => run(tr('cc.e.sensCost', { case: caseText(cc) }), { costCase: cc }));
  return rows;
}
