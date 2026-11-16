import type { Comparison, CompareInput } from './engine.ts';
import { PLANNING_LABEL, sensitivity } from './engine.ts';
import type { CostItem, ImportLine } from './types.ts';

export interface ComparisonExportPayload {
  exportedAt: string;
  assumptions: CompareInput;
  comparison: Comparison;
  sensitivity: ReturnType<typeof sensitivity>;
  verificationStatus: string;
}

export function buildExportPayload(input: CompareInput, comparison: Comparison): ComparisonExportPayload {
  const planning = comparison.actual.totals.planning;
  return {
    exportedAt: new Date().toISOString(),
    assumptions: input,
    comparison,
    sensitivity: sensitivity(input),
    verificationStatus: planning
      ? PLANNING_LABEL
      : input.lines.some((l) => l.actualSource === 'VERIFIED_SUPPLIER')
        ? 'Verified supplier data (as declared by user)'
        : 'No actual emissions entered',
  };
}

function esc(v: string | number | boolean | null | undefined): string {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function lineSummary(l: ImportLine): string {
  return [
    `id=${l.id}`,
    `cn=${l.cn}`,
    `origin=${l.countryOfOrigin}`,
    `year=${l.importYear}`,
    `Q${l.importQuarter}`,
    `qty=${l.quantity}${l.unit}`,
    `actualSee=${l.actualSee ?? ''}`,
    `actualSefa=${l.actualSefa ?? ''}`,
    `actualSource=${l.actualSource ?? ''}`,
  ].join('; ');
}

function costSummary(c: CostItem): string {
  return [
    `id=${c.id}`,
    `label=${c.label}`,
    `scenario=${c.scenario}`,
    `amountCentral=${c.amount.central}`,
    `low=${c.amount.low ?? ''}`,
    `high=${c.amount.high ?? ''}`,
    `occurrence=${c.occurrence}`,
    `basis=${c.basis}`,
    `count=${c.count}`,
    `allocationShare=${c.allocationShare}`,
    `payer=${c.payer}`,
  ].join('; ');
}

/** Flat CSV suitable for spreadsheet review — includes assumptions and results. */
export function toComparisonCsv(payload: ComparisonExportPayload): string {
  const { assumptions: a, comparison: c } = payload;
  const rows: string[][] = [
    ['section', 'key', 'default_scenario', 'actual_scenario', 'notes'],
    ['meta', 'exportedAt', '', '', payload.exportedAt],
    ['meta', 'verificationStatus', '', '', payload.verificationStatus],
    ['meta', 'view', '', '', a.view],
    ['meta', 'priceCase', '', '', a.priceCase],
    ['meta', 'costCase', '', '', a.costCase],
    ['meta', 'certificatePriceLow', '', '', String(a.prices.low)],
    ['meta', 'certificatePriceCentral', '', '', String(a.prices.central)],
    ['meta', 'certificatePriceHigh', '', '', String(a.prices.high)],
    ['result', 'certificateCost', String(c.default.certificateCost), String(c.actual.certificateCost), 'EUR'],
    ['result', 'oneOffOtherCosts', String(c.default.oneOff), String(c.actual.oneOff), 'EUR'],
    ['result', 'annualOtherCosts', String(c.default.annual), String(c.actual.annual), 'EUR'],
    ['result', 'firstYearTotal', String(c.default.firstYearTotal), String(c.actual.firstYearTotal), 'EUR'],
    ['result', 'recurringTotal', String(c.default.recurringTotal), String(c.actual.recurringTotal), 'EUR'],
    [
      'result',
      'costPerTonneFirstYear',
      c.default.costPerTonneFirstYear == null ? '' : String(c.default.costPerTonneFirstYear),
      c.actual.costPerTonneFirstYear == null ? '' : String(c.actual.costPerTonneFirstYear),
      'EUR/t',
    ],
    ['result', 'certificateSaving', String(c.certificateSaving), '', 'default − actual, EUR'],
    ['result', 'additionalCostsFirstYear', String(c.additionalCostsFirstYear), '', 'EUR'],
    ['result', 'netSavingFirstYear', String(c.netSavingFirstYear), '', 'EUR'],
    ['result', 'netSavingRecurring', String(c.netSavingRecurring), '', 'EUR/year'],
    ['result', 'breakEvenFirstYear', '', '', c.breakEvenFirstYear.explanation],
    ['result', 'breakEvenRecurring', '', '', c.breakEvenRecurring.explanation],
    ['result', 'conclusion', '', '', c.conclusion],
    ['result', 'comparable', String(c.comparable), '', c.comparableNote],
  ];

  a.lines.forEach((l, i) => {
    rows.push(['importLine', `line_${i + 1}`, '', '', lineSummary(l)]);
  });
  a.costItems.forEach((item, i) => {
    rows.push(['costItem', `item_${i + 1}`, '', '', costSummary(item)]);
  });
  payload.sensitivity.forEach((s, i) => {
    rows.push([
      'sensitivity',
      `row_${i + 1}`,
      String(s.netSavingFirstYear),
      String(s.netSavingRecurring),
      s.label,
    ]);
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
