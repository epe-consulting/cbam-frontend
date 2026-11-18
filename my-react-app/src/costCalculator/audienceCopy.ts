import { PLANNING_LABEL, type Comparison, type CostView } from './engine.ts';

export type Audience = 'IMPORTER' | 'EXPORTER';

const eur = (n: number) =>
  `€${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Why actual emissions can be cheaper than defaults — each point carries its source.
 * No savings percentage and no claim about who usually pays: that is entered per cost item.
 */
export const EXPORTER_WHY_ACTUALS: { text: string; source: string }[] = [
  {
    text: 'Official default values include a mark-up: 10 % for 2026, 20 % for 2027 and 30 % from 2028 (1 % for fertilisers).',
    source: 'IR (EU) 2025/2621 Annex I column headers; Guidance Doc. No. 3 p. 115',
  },
  {
    text: 'The Commission notes that, because of this mark-up, using actual values should in most cases be more advantageous than default values where actual values are available.',
    source: 'Guidance Doc. No. 3 p. 115',
  },
  {
    text: 'The number of CBAM certificates follows the embedded emissions declared, after the free-allocation adjustment — so a lower verified SEE means fewer certificates for the EU importer.',
    source: 'Reg. (EU) 2023/956 Art. 6(2)(c) and Art. 31; IR (EU) 2025/2620 Annex',
  },
  {
    text: 'Actual emissions are not automatically cheaper: a high SEE, low volume or expensive verification can make defaults the better option. Who pays calculation and verification is a commercial matter — set it per cost item below.',
    source: 'Calculator comparison below',
  },
];

/**
 * Conclusion text for the selected audience. The wording follows the cost view actually used:
 * 'COMBINED' includes producer-paid costs, 'IMPORTER' only costs the importer pays or that are passed on.
 */
export function conclusionForAudience(c: Comparison, audience: Audience, view: CostView = 'COMBINED'): string {
  if (audience === 'IMPORTER') return c.conclusion;
  if (!c.comparable) return c.comparableNote;

  const cs = c.certificateSaving;
  const certPart =
    cs >= 0
      ? `For your EU buyer, using actual emissions is estimated to reduce CBAM certificate costs by ${eur(cs)}`
      : `For your EU buyer, using actual emissions is estimated to INCREASE CBAM certificate costs by ${eur(cs)}`;

  const scope =
    view === 'COMBINED'
      ? 'combined producer–importer cost (non-EU exporter and EU buyer together)'
      : 'the EU importer’s own cost (costs paid by you as non-EU exporter and not passed on are excluded)';
  const add = c.additionalCostsFirstYear;
  const ns = c.netSavingFirstYear;
  const netPart = ns >= 0 ? `a saving of ${eur(ns)}` : `an ADDITIONAL COST of ${eur(ns)}`;
  const rec = c.netSavingRecurring;

  let text = `${certPart}. Additional calculation, verification and reporting costs counted in this view: ${eur(add)} in the first year. The estimated net effect on ${scope} is ${netPart} for the selected period. In later years (recurring costs only) the net ${
    rec >= 0 ? 'saving' : 'additional cost'
  } is ${eur(rec)} per year.`;

  if (cs > 0 && ns < 0) {
    text += ' Certificate costs fall, but the additional costs outweigh that under these assumptions — check the break-even volume and sensitivity.';
  } else if (cs <= 0) {
    text += ' Under these assumptions actual emissions do not reduce certificate costs compared with default values.';
  }
  if (c.actual.totals.planning) text += ` Actual values include preliminary estimates (${PLANNING_LABEL}).`;
  if (c.default.totals.forecast || c.actual.totals.forecast) {
    text += ' Based on an assumed certificate price — this is a forecast.';
  }
  return text;
}
