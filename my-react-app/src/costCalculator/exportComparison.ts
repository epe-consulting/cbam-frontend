import { DEFAULT_VALUES_DATASET } from './data/defaultValues.ts';
import type { CompareInput, YearComparison } from './engine.ts';
import { PLANNING_LABEL, calculate, sensitivity } from './engine.ts';
import { CBAM_FACTOR_SOURCE, CSCF_SOURCE } from './regulatory.ts';
import type { CostItem, ImportLine, LineResult, ScenarioLineResult } from './types.ts';

export interface ComparisonExportPayload {
  exportedAt: string;
  datasets: Record<string, string>;
  assumptions: CompareInput;
  verificationStatus: string;
  lineResults: LineResult[];
  years: (YearComparison & { conclusion: string; sensitivity: ReturnType<typeof sensitivity> })[];
}

export function buildExportPayload(
  fullInput: CompareInput,
  years: YearComparison[],
  conclusionFor: (y: YearComparison) => string,
): ComparisonExportPayload {
  const planning = years.some((y) => y.comparison.actual.totals.planning);
  return {
    exportedAt: new Date().toISOString(),
    datasets: {
      defaultValues: `${DEFAULT_VALUES_DATASET.label} — not checked against IR (EU) 2026/1740`,
      benchmarks: 'IR (EU) 2025/2620 Annex point 5.3',
      cbamFactor: CBAM_FACTOR_SOURCE,
      cscf: CSCF_SOURCE,
    },
    assumptions: fullInput,
    verificationStatus: planning
      ? PLANNING_LABEL
      : fullInput.lines.some((l) => l.actualSource === 'VERIFIED_SUPPLIER')
        ? 'Verified supplier data (as declared by user)'
        : 'No actual emissions entered',
    lineResults: calculate(fullInput.lines, fullInput.prices, fullInput.priceCase, fullInput.importer),
    years: years.map((y) => ({ ...y, conclusion: conclusionFor(y), sensitivity: sensitivity(y.input) })),
  };
}

/**
 * CSV cell. Text that a spreadsheet would read as a formula (=, +, -, @) is prefixed with an
 * apostrophe so user-typed labels cannot execute; plain numbers are left as numbers.
 */
function esc(v: string | number | boolean | null | undefined): string {
  let s = v == null ? '' : String(v);
  const isNumber = s.trim() !== '' && Number.isFinite(Number(s));
  if (!isNumber && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function lineSummary(l: ImportLine): string {
  return [
    `cn=${l.cn}${l.variant ? ` (${l.variant})` : ''}`,
    `origin=${l.countryOfOrigin}`,
    `year=${l.importYear} Q${l.importQuarter}`,
    `qty=${l.quantity} ${l.unit}`,
    `actualSee=${l.actualSee ?? ''}`,
    `actualSefa=${l.actualSefa ?? ''}`,
    `actualStatus=${l.actualSource ?? ''}`,
    `productionYear=${l.productionYearEvidence && l.productionYear ? l.productionYear : ''}`,
    `carbonPriceAbroad=${l.actualDeduction?.kind ?? 'NONE_ASSUMED'}`,
  ].join('; ');
}

function costSummary(c: CostItem): string {
  return [
    `label=${c.label}`,
    `scenario=${c.scenario}`,
    `central=${c.amount.central}`,
    `low=${c.amount.low ?? ''}`,
    `high=${c.amount.high ?? ''}`,
    `occurrence=${c.occurrence}`,
    `basis=${c.basis} x ${c.count}`,
    `allocationShare=${c.allocationShare}`,
    `payer=${c.payer}`,
  ].join('; ');
}

const num = (n: number | undefined) => (n == null ? '' : String(n));

function scenarioRows(prefix: string, s: ScenarioLineResult): string[][] {
  const rows: string[][] = [
    [prefix, 'status', s.status, '', [...s.labels, ...s.reasons].join(' | ')],
    [prefix, 'see_tCO2e_per_t', num(s.see), '', s.seeSource ?? ''],
    [prefix, 'sefa_tCO2e_per_t', num(s.sefa), '', s.sefaSource ?? ''],
    [prefix, 'embeddedEmissions_t', num(s.embeddedEmissions), '', ''],
    [prefix, 'freeAllocationAdjustment_t', num(s.freeAllocationAdjustment), '', ''],
    [prefix, 'deduction_t', num(s.deduction), '', s.deductionNote ?? ''],
    [prefix, 'certificates', num(s.certificates), '', ''],
    [prefix, 'price_EUR', num(s.price), '', s.priceLabel ?? ''],
    [prefix, 'certificateCost_EUR', num(s.certificateCost), '', ''],
  ];
  s.steps.forEach((st, i) => rows.push([prefix, `step_${i + 1}`, st.value, '', `${st.label}${st.source ? ` — Source: ${st.source}` : ''}`]));
  return rows;
}

/** Flat CSV for spreadsheet review: assumptions, datasets, per-line results with sources, per-year comparison. */
export function toComparisonCsv(payload: ComparisonExportPayload, extraMeta: [string, string][] = []): string {
  const a = payload.assumptions;
  const rows: string[][] = [
    ['section', 'key', 'value_or_default', 'actual_scenario', 'notes'],
    ['meta', 'exportedAt', '', '', payload.exportedAt],
    ['meta', 'verificationStatus', '', '', payload.verificationStatus],
    ['meta', 'view', '', '', a.view],
    ['meta', 'priceCase', '', '', a.priceCase],
    ['meta', 'costCase', '', '', a.costCase],
    ['meta', 'certificatePriceLow_EUR', String(a.prices.low), '', 'assumed'],
    ['meta', 'certificatePriceCentral_EUR', String(a.prices.central), '', 'assumed'],
    ['meta', 'certificatePriceHigh_EUR', String(a.prices.high), '', 'assumed'],
    ['meta', 'official2026Prices', '', '', JSON.stringify(a.prices.official2026 ?? {})],
    ['meta', 'otherImportsByYear_t', '', '', JSON.stringify(a.importer.otherImportsTonnesByYear)],
    ...extraMeta.map(([k, v]) => ['meta', k, '', '', v]),
    ...Object.entries(payload.datasets).map(([k, v]) => ['dataset', k, '', '', v]),
  ];

  payload.lineResults.forEach((r, i) => {
    const p = `line_${i + 1}`;
    rows.push([p, 'input', '', '', lineSummary(r.line)]);
    rows.push([p, 'scope', '', '', r.scopeNote]);
    if (r.thresholdNote) rows.push([p, 'threshold', '', '', r.thresholdNote]);
    rows.push(...scenarioRows(`${p}_default`, r.defaultScenario));
    if (r.actualScenario) rows.push(...scenarioRows(`${p}_actual`, r.actualScenario));
  });

  a.costItems.forEach((item, i) => rows.push(['costItem', `item_${i + 1}`, '', '', costSummary(item)]));

  payload.years.forEach((y) => {
    const c = y.comparison;
    const p = `year_${y.year}`;
    rows.push(
      [p, 'oneOffCostsIncluded', String(y.oneOffIncluded), '', 'one-off costs count once, in the first year with actual data'],
      [p, 'certificateCost_EUR', String(c.default.certificateCost), String(c.actual.certificateCost), ''],
      [p, 'oneOffOtherCosts_EUR', String(c.default.oneOff), String(c.actual.oneOff), ''],
      [p, 'annualOtherCosts_EUR', String(c.default.annual), String(c.actual.annual), ''],
      [p, 'firstYearTotal_EUR', String(c.default.firstYearTotal), String(c.actual.firstYearTotal), ''],
      [p, 'recurringTotal_EUR', String(c.default.recurringTotal), String(c.actual.recurringTotal), ''],
      [p, 'costPerTonneFirstYear_EUR', num(c.default.costPerTonneFirstYear ?? undefined), num(c.actual.costPerTonneFirstYear ?? undefined), ''],
      [p, 'certificateSaving_EUR', String(c.certificateSaving), '', 'default − actual'],
      [p, 'additionalCostsFirstYear_EUR', String(c.additionalCostsFirstYear), '', ''],
      [p, 'netSavingFirstYear_EUR', String(c.netSavingFirstYear), '', ''],
      [p, 'netSavingRecurring_EUR', String(c.netSavingRecurring), '', 'per year'],
      [p, 'breakEvenFirstYear', num(c.breakEvenFirstYear.quantityTonnes), '', c.breakEvenFirstYear.explanation],
      [p, 'breakEvenRecurring', num(c.breakEvenRecurring.quantityTonnes), '', c.breakEvenRecurring.explanation],
      [p, 'comparable', String(c.comparable), '', c.comparableNote],
      [p, 'conclusion', '', '', y.conclusion],
    );
    y.sensitivity.forEach((s, i) =>
      rows.push([`${p}_sensitivity`, `row_${i + 1}`, String(s.netSavingFirstYear), String(s.netSavingRecurring), s.label]),
    );
  });

  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
