import { PLANNING_LABEL, type Comparison } from './engine.ts';

export type Audience = 'IMPORTER' | 'EXPORTER';

const eur = (n: number) =>
  `€${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Why actual emissions can beat defaults — explanatory only; no invented savings %. */
export const EXPORTER_WHY_ACTUALS = [
  'Official default values (IR 2025/2621) include mark-ups for 2026, 2027 and 2028 onwards, so they are often higher than a well-monitored installation’s real SEE.',
  'The EU importer’s CBAM certificate cost is based on the emissions figure used. Lower verified actual SEE usually means fewer certificates for your buyer.',
  'Monitoring, consultancy and verification are typically paid by the non-EU producer/exporter — the party that holds the installation data verifiers need.',
  'Actual emissions are not automatically cheaper: if your SEE is high, volume is low, or verification is expensive, defaults can still win. Use the comparison below — do not assume a saving.',
] as const;

export function conclusionForAudience(c: Comparison, audience: Audience): string {
  if (audience === 'IMPORTER') return c.conclusion;
  if (!c.comparable) return c.comparableNote;

  const cs = c.certificateSaving;
  const certPart =
    cs >= 0
      ? `For your EU buyer, using actual emissions is estimated to reduce CBAM certificate costs by ${eur(cs)}`
      : `For your EU buyer, using actual emissions is estimated to INCREASE CBAM certificate costs by ${eur(cs)}`;

  const add = c.additionalCostsFirstYear;
  const ns = c.netSavingFirstYear;
  const netPart =
    ns >= 0
      ? `the estimated net effect on combined producer–importer cost is a saving of ${eur(ns)}`
      : `the estimated net effect on combined producer–importer cost is an ADDITIONAL COST of ${eur(ns)}`;

  const rec = c.netSavingRecurring;
  let text = `${certPart}. As the non-EU exporter you typically carry calculation and verification costs (${eur(add)} in the first year under these assumptions). After those costs, ${netPart} for the selected period. In later years (recurring costs only) the net ${
    rec >= 0 ? 'saving' : 'additional cost'
  } is ${eur(rec)} per year.`;

  if (cs > 0 && ns >= 0) {
    text +=
      ' Lower certificate costs for the importer can strengthen your commercial case — provided your verified SEE stays below the marked-up defaults enough to cover verification.';
  } else if (cs > 0 && ns < 0) {
    text +=
      ' Certificate costs for the buyer fall, but your verification/consultancy spend still outweighs that under these assumptions — check break-even volume and sensitivity.';
  } else if (cs <= 0) {
    text +=
      ' Under these assumptions, actual emissions do not reduce certificate costs versus defaults — measuring may still be needed for compliance, but not for a cost saving.';
  }

  if (c.actual.totals.planning) text += ` Actual values include preliminary estimates (${PLANNING_LABEL}).`;
  if (c.default.totals.forecast || c.actual.totals.forecast) {
    text += ' Based on an assumed certificate price — this is a forecast.';
  }
  return text;
}
