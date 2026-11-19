import { PLANNING_LABEL, labelText, type Comparison, type CostView } from './engine.ts';
import { tr } from '../i18n';

export type Audience = 'IMPORTER' | 'EXPORTER';

const eur = (n: number) =>
  `€${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Why actual emissions can be cheaper than defaults — each point carries its source.
 * No savings percentage and no claim about who usually pays: that is entered per cost item.
 */
const WHY_ACTUALS: { key: string; source: string }[] = [
  {
    key: 'why1',
    source: 'IR (EU) 2025/2621 Annex I column headers; Guidance Doc. No. 3 p. 115',
  },
  {
    key: 'why2',
    source: 'Guidance Doc. No. 3 p. 115',
  },
  {
    key: 'why3',
    source: 'Reg. (EU) 2023/956 Art. 6(2)(c) and Art. 31; IR (EU) 2025/2620 Annex',
  },
  {
    key: 'why4',
    source: '',
  },
];

/** Points with their text in the current language (read on every access). */
export const EXPORTER_WHY_ACTUALS: { readonly text: string; readonly source: string }[] = WHY_ACTUALS.map((p) => ({
  get text() {
    return tr(`cc.a.${p.key}`);
  },
  get source() {
    return p.source || tr('cc.a.why4src');
  },
}));

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
      ? tr('cc.a.certDown', { v: eur(cs) })
      : tr('cc.a.certUp', { v: eur(cs) });

  const scope =
    view === 'COMBINED'
      ? tr('cc.a.scopeCombined')
      : tr('cc.a.scopeImporter');
  const add = c.additionalCostsFirstYear;
  const ns = c.netSavingFirstYear;
  const netPart = ns >= 0 ? tr('cc.a.netSave', { v: eur(ns) }) : tr('cc.a.netCost', { v: eur(ns) });
  const rec = c.netSavingRecurring;

  let text = tr('cc.a.main', {
    cert: certPart, add: eur(add), scope, net: netPart,
    kind: rec >= 0 ? tr('cc.e.saving') : tr('cc.e.additionalCost'), rec: eur(rec),
  });

  if (cs > 0 && ns < 0) {
    text += tr('cc.a.outweigh');
  } else if (cs <= 0) {
    text += tr('cc.a.noReduce');
  }
  if (c.actual.totals.planning) text += tr('cc.e.conclPlanning', { label: labelText(PLANNING_LABEL) });
  if (c.default.totals.forecast || c.actual.totals.forecast) {
    text += tr('cc.e.conclForecast');
  }
  return text;
}
