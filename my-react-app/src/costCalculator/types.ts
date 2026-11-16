// Types for the frontend CBAM cost calculator. No regulatory values live here.

export type Sector =
  | 'CEMENT'
  | 'ELECTRICITY'
  | 'FERTILISERS'
  | 'HYDROGEN'
  | 'IRON_AND_STEEL'
  | 'ALUMINIUM';

/** How a cell appeared in Annex I of IR 2025/2621. */
export type CellMarker = 'NUM' | 'DASH' | 'NA' | 'BLANK';

export interface DefaultValueRow {
  country: string;
  cn: string; // as printed, e.g. '7604 10 90', '7318 15', '7601'
  description: string;
  sector: Sector;
  direct: number | null;
  indirect: number | null;
  total: number | null;
  y2026: number | null; // including 2026 mark-up
  y2027: number | null; // including 2027 mark-up
  y2028: number | null; // 2028 and onwards, including mark-up
  route: string; // e.g. '(C)', '(K)', '(C)/(F)', ''
  page: number; // PDF page in IR 2025/2621
  markers: Record<'direct' | 'indirect' | 'total' | 'y2026' | 'y2027' | 'y2028', CellMarker>;
  blocked?: boolean; // critical discrepancy, see DATA_VALIDATION.md
}

export interface BenchmarkOption {
  value: number;
  route: string | null; // 'A'..'L'
  yearBand: 1 | 2 | null; // 1 = production years 2026-27, 2 = 2028-30
}

export interface BenchmarkRow {
  cn: string; // 8-digit, e.g. '7604 10 90'
  description: string;
  sector: Sector;
  colA: BenchmarkOption[]; // BMg* (actual data)
  colB: BenchmarkOption[]; // BMg (default values)
  page: number; // PDF page in IR 2025/2620
}

export type LineStatus =
  | 'OUT_OF_SCOPE'
  | 'EXEMPT'
  | 'ESTIMATED'
  | 'INSUFFICIENT_INFO'
  | 'NOT_IMPLEMENTED';

export type ActualDataSource = 'VERIFIED_SUPPLIER' | 'PRELIMINARY_ESTIMATE';

export type DeductionClaim =
  | { kind: 'NONE_ASSUMED' }
  | { kind: 'UNKNOWN' }
  | { kind: 'COMMISSION_DEFAULT_CARBON_PRICE'; note?: string }
  | { kind: 'EFFECTIVELY_PAID'; note?: string };

export interface ImportLine {
  id: string;
  cn: string; // 8-digit CN code, spaced or not
  variant?: string; // default-value row description when one CN has several rows (e.g. white/grey clinker)
  countryOfOrigin: string;
  countryOfDispatch?: string; // informational only; defaults depend on origin
  importYear: number;
  importQuarter: 1 | 2 | 3 | 4;
  quantity: number;
  unit: 't' | 'kg';
  /** Production year, only used for actual data, and only where evidence exists (IR 2025/2547 Art. 7). */
  productionYear?: number;
  productionYearEvidence?: boolean;
  /** Actual-emissions scenario inputs (t CO2e / t of good). */
  actualSee?: number;
  actualSefa?: number;
  actualSource?: ActualDataSource;
  defaultDeduction?: DeductionClaim;
  actualDeduction?: DeductionClaim;
}

export interface PriceAssumptions {
  low: number;
  central: number;
  high: number;
  /** Official 2026 quarterly prices entered by the user (Art. 21(1a)), EUR / certificate. */
  official2026?: Partial<Record<1 | 2 | 3 | 4, number>>;
}

export type PriceCase = 'low' | 'central' | 'high';

export interface ImporterContext {
  /**
   * Net mass (t) of other CBAM goods (excl. electricity and hydrogen) imported by the same
   * importer in each year but not entered as lines here. Needed for the Art. 2a threshold.
   */
  otherImportsTonnesByYear: Record<number, number | undefined>;
}

export type CostOccurrence = 'ONE_OFF' | 'ANNUAL';
export type CostBasis = 'PER_INSTALLATION' | 'PER_REPORTING_PERIOD' | 'PER_PRODUCT' | 'PER_SUPPLIER';
export type CostPayer = 'IMPORTER' | 'PRODUCER' | 'PASSED_ON';
export type CostScenario = 'DEFAULT' | 'ACTUAL';

export interface CostItem {
  id: string;
  label: string;
  scenario: CostScenario;
  /** EUR per unit of basis (per installation, per product, ...). User-entered, never a built-in price. */
  amount: { low?: number; central: number; high?: number };
  occurrence: CostOccurrence;
  basis: CostBasis;
  /** How many installations / products / suppliers / periods this applies to. */
  count: number;
  /** Share (0-1) of the cost attributable to the imports in this comparison. */
  allocationShare: number;
  payer: CostPayer;
}

export interface Step {
  label: string;
  value: string;
  source?: string;
}

export interface ScenarioLineResult {
  status: LineStatus;
  reasons: string[];
  massTonnes: number;
  reportingYear?: number;
  see?: number; // t CO2e/t used
  seeSource?: string;
  sefa?: number;
  sefaSource?: string;
  embeddedEmissions?: number;
  freeAllocationAdjustment?: number;
  deduction?: number;
  deductionNote?: string;
  certificates?: number;
  price?: number;
  priceLabel?: string;
  certificateCost?: number;
  labels: string[]; // e.g. 'Forecast', 'Planning scenario—verification pending'
  steps: Step[];
}

export interface LineResult {
  line: ImportLine;
  sector?: Sector;
  scopeNote: string;
  thresholdNote?: string;
  defaultScenario: ScenarioLineResult;
  actualScenario: ScenarioLineResult | null; // null when no actual data entered
}
