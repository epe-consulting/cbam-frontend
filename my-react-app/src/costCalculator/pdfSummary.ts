// Readable PDF summary of a cost comparison: inputs, assumptions, dataset versions,
// calculation steps with source references, results and conclusion.

import { jsPDF } from 'jspdf';
import { DEFAULT_VALUES_DATASET } from './data/defaultValues.ts';
import { calculate, sensitivity, type CompareInput, type YearComparison } from './engine.ts';
import { CBAM_FACTOR_SOURCE, CSCF_SOURCE } from './regulatory.ts';
import type { ScenarioLineResult } from './types.ts';

const eur = (n: number) =>
  `${n < 0 ? '-' : ''}EUR ${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// jsPDF's built-in fonts are Latin-1 only: replace characters they cannot draw.
const latin = (s: string) =>
  s
    .replace(/[₂]/g, '2')
    .replace(/[—–]/g, '-')
    .replace(/[−]/g, '-')
    .replace(/[×]/g, 'x')
    .replace(/[÷]/g, '/')
    .replace(/[≤]/g, '<=')
    .replace(/[≥]/g, '>=')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/€/g, 'EUR ')
    .replace(/[^\x20-\xFF\n]/g, '?');

export function downloadComparisonPdf(
  input: CompareInput,
  years: (YearComparison & { conclusion: string })[],
  audienceLabel: string,
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth() - 80;
  let y = 50;
  const ensure = (h: number) => {
    if (y + h > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y = 50;
    }
  };
  const text = (s: string, size = 9, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    for (const line of doc.splitTextToSize(latin(s), W) as string[]) {
      ensure(size + 4);
      doc.text(line, 40, y);
      y += size + 4;
    }
  };
  const gap = (h = 6) => (y += h);

  text('CBAM cost comparison - default values vs actual emissions', 14, true);
  text(`Generated ${new Date().toISOString()} - ${audienceLabel}. Screening estimate, not legal advice.`, 8);
  gap();
  for (const yc of years) {
    const c = yc.comparison;
    text(`Import year ${yc.year}`, 13, true);
    if (!yc.oneOffIncluded) text('One-off costs are counted once, in the first year with actual data; this year carries recurring costs.', 8);
    text('Conclusion', 11, true);
    text(yc.conclusion);
    gap();
    text('Results', 11, true);
    const rows: [string, number, number][] = [
      ['CBAM certificate cost', c.default.certificateCost, c.actual.certificateCost],
      ['One-off calculation / data preparation', c.default.oneOff, c.actual.oneOff],
      ['Annual verification / reporting / admin', c.default.annual, c.actual.annual],
      ['Total first year', c.default.firstYearTotal, c.actual.firstYearTotal],
      ['Recurring annual total', c.default.recurringTotal, c.actual.recurringTotal],
    ];
    text('Component | Official default values | Actual emissions + verification', 9, true);
    rows.forEach(([l, d, a]) => text(`${l} | ${eur(d)} | ${eur(a)}`));
    text(`Certificate saving: ${eur(c.certificateSaving)}; additional costs first year: ${eur(c.additionalCostsFirstYear)}`);
    text(`Net saving first year: ${eur(c.netSavingFirstYear)}; recurring: ${eur(c.netSavingRecurring)} per year`);
    text(`Break-even (first year): ${c.breakEvenFirstYear.explanation}`);
    text(`Break-even (recurring): ${c.breakEvenRecurring.explanation}`);
    text(`Comparability: ${c.comparableNote}`);
    gap();
    text('Sensitivity (net saving first year / recurring)', 11, true);
    sensitivity(yc.input).forEach((r) => text(`${r.label}: ${eur(r.netSavingFirstYear)} / ${eur(r.netSavingRecurring)}`));
    gap();
  }

  text('Inputs and assumptions', 11, true);
  input.lines.forEach((l, i) =>
    text(
      `Line ${i + 1}: CN ${l.cn}${l.variant ? ` (${l.variant})` : ''}, origin ${l.countryOfOrigin}, import ${l.importYear} Q${l.importQuarter}, ${l.quantity} ${l.unit}; actual SEE ${l.actualSee ?? '-'}, SEFA ${l.actualSefa ?? '-'}, data status ${l.actualSource ?? 'none'}; production year ${l.productionYearEvidence && l.productionYear ? l.productionYear : 'not evidenced'}; carbon price abroad ${l.actualDeduction?.kind ?? 'NONE_ASSUMED'}.`,
    ),
  );
  text(
    `Certificate prices (assumed, EUR): low ${input.prices.low}, central ${input.prices.central}, high ${input.prices.high}; case used: ${input.priceCase}.` +
      (input.prices.official2026 ? ` Official 2026 quarterly price entered: ${JSON.stringify(input.prices.official2026)}.` : ''),
  );
  text(`Other CBAM imports by year (t): ${JSON.stringify(input.importer.otherImportsTonnesByYear)}`);
  text(`Cost view: ${input.view === 'IMPORTER' ? 'importer only' : 'combined producer-importer'}; cost case: ${input.costCase}.`);
  input.costItems.forEach((ci) =>
    text(
      `Cost item "${ci.label}" (${ci.scenario}): central ${eur(ci.amount.central)}${ci.amount.low != null ? `, low ${eur(ci.amount.low)}` : ''}${
        ci.amount.high != null ? `, high ${eur(ci.amount.high)}` : ''
      }; ${ci.occurrence}, ${ci.basis} x ${ci.count}, allocation share ${ci.allocationShare}, paid by ${ci.payer}.`,
    ),
  );
  gap();

  text('Datasets and regulatory parameters', 11, true);
  text(`Default values: ${DEFAULT_VALUES_DATASET.label}. Status: not checked against the correction in IR (EU) 2026/1740.`);
  text('Benchmarks: IR (EU) 2025/2620 Annex point 5.3 (Column B for default values).');
  text(`CBAM factor: ${CBAM_FACTOR_SOURCE}.`);
  text(`CSCF: ${CSCF_SOURCE}.`);
  gap();

  text('Calculation steps', 11, true);
  const results = calculate(input.lines, input.prices, input.priceCase, input.importer);
  const scen = (title: string, s: ScenarioLineResult) => {
    text(`${title}: ${s.status}${s.labels.length ? ` [${s.labels.join('; ')}]` : ''}`, 9, true);
    s.reasons.forEach((r) => text(`Reason: ${r}`));
    s.steps.forEach((st) => text(`- ${st.label}: ${st.value}${st.source ? ` (Source: ${st.source})` : ''}`, 8));
  };
  results.forEach((r, i) => {
    text(`Line ${i + 1} - ${r.line.cn}, ${r.line.countryOfOrigin}`, 10, true);
    text(`Scope: ${r.scopeNote}`, 8);
    if (r.thresholdNote) text(`Threshold: ${r.thresholdNote}`, 8);
    scen('Official default values', r.defaultScenario);
    if (r.actualScenario) scen('Actual emissions', r.actualScenario);
    gap(4);
  });

  doc.save(`cbam-cost-comparison-${Date.now()}.pdf`);
}
