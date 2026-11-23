/**
 * Aluminium II FE helpers (docs/aluminium2-implementation-spec.md; docs/aluminium2-api-contract.md v1.1).
 * Expected numbers are the spec's Appendix A acceptance values (computed by the PM with exact decimal arithmetic);
 * tolerances as Appendix A: SEE ± 0,000005, emissions ± 0,01 t.
 */
import { describe, expect, it } from 'vitest';
import {
  AL2_STEP, AL2_STEP_PREVIOUS, al2ActivityLevel, al2FormatSee, al2InternalSourceOk, al2MiSum, al2PeriodErrorCode,
  al2PrecursorCycle, al2PrecursorYear, al2ProcessIssues, al2ProductIssues, al2ProductTotal, al2ProductsWithoutProcess,
  al2RoundTonnes, al2StepNumber, al2Suggestions, allowedPrecursorCategories, anodeEf, anodeEmissions, anodeRowIssues,
  c2f6FromCf4, cf4Overvoltage, cf4Slope, checkAl2Cn, flueGasAandB, flueGasEmissions, flueGasRowIssues, formatAl2Cn,
  groupAl2Result, importYearOk, isAl2StepCode, isAluminium2Category, netAnodeConsumption, otherElementsReported,
  pfcAem, pfcDuctCo2e, pfcFactors, pfcPrAlExceedsAl, pfcPreview, pfcRowIssues, pfcTotalCo2e, precursorCategoryIssue,
  precursorMi, precursorUsesDefault, processTakesPrecursors, reportingParamIssues, scrapPerTonne, toAl2ProductRow,
  type Al2AnodeRow, type Al2CnMapping, type Al2FlueGasRow, type Al2PfcFactorRow, type Al2PfcRow, type Al2ProcessRow,
} from './aluminium2Steps';
import { isSteelCategory, steelStepNumber } from './steelSteps';
import { cementStepNumber, isCementCategory } from './cementSteps';

/* ─── Fixtures shaped like the backend responses (contract §3) ─── */

/** GET /al2/cn-mapping: 14 headings of spec §1.1 (CBAM-R Annex I p.47–48; MA Annex I Table 1 p.17–18), excluded 7602/7615 (G05e fn 5 p.11). */
const H = (heading: string, category: string, suggestions: string[] = []) => ({
  heading, headingDigits: heading.replace(/\s+/g, ''), category, categoryLabel: category, description: heading, complex: category !== 'UNWROUGHT_ALUMINIUM',
  suggestions: suggestions.map((c) => ({ cnCode: c, cnDigits: c.replace(/\s+/g, ''), description: c })),
});
const MAPPING: Al2CnMapping = {
  rows: [
    H('7601', 'UNWROUGHT_ALUMINIUM', ['7601 10 10', '7601 10 90', '7601 20 80']),
    H('7603', 'ALUMINIUM_PRODUCTS'), H('7604', 'ALUMINIUM_PRODUCTS', ['7604 10 90']), H('7605', 'ALUMINIUM_PRODUCTS', ['7605 19 00']),
    H('7606', 'ALUMINIUM_PRODUCTS', ['7606 11 99']), H('7607', 'ALUMINIUM_PRODUCTS', ['7607 11 19']), H('7608', 'ALUMINIUM_PRODUCTS'),
    H('7609 00 00', 'ALUMINIUM_PRODUCTS'), H('7610', 'ALUMINIUM_PRODUCTS'), H('7611 00 00', 'ALUMINIUM_PRODUCTS'), H('7612', 'ALUMINIUM_PRODUCTS'),
    H('7613 00 00', 'ALUMINIUM_PRODUCTS'), H('7614', 'ALUMINIUM_PRODUCTS'), H('7616', 'ALUMINIUM_PRODUCTS'),
  ],
  excluded: ['7602', '7615'],
};

/** GET /al2/pfc-factors: MA Annex II B.7.1 Table 2 (p.46–47) and B.7.2 Table 3 (p.47), as the backend enum PfcTechnology. */
const F = (technology: string, sef: number | null, fs: number | null, ovc: number | null, fo: number | null, fallback: string | null = null): Al2PfcFactorRow => ({
  technology, slopeSefCf4: sef, slopeFC2f6: fs, slopeSource: sef == null ? null : 'Table 2', slopeFallbackTechnology: fallback,
  overvoltageOvc: ovc, overvoltageFC2f6: fo, overvoltageSource: ovc == null ? null : 'Table 3',
});
const PFC_TABLE: Al2PfcFactorRow[] = [
  F('PFPB_L', 0.122, 0.097, null, null), F('PFPB_M', 0.104, 0.057, null, null), F('PFPB_MW', null, null, null, null, 'CWPB'),
  F('CWPB', 0.143, 0.121, 1.16, 0.121), F('SWPB', 0.233, 0.280, 3.65, 0.252), F('VSS', 0.058, 0.086, null, null), F('HSS', 0.165, 0.077, null, null),
];
/** GWP CF4 / C2F6 of MA Annex II G Table 6, p.64 (backend cbam_standard_factor category GWP). */
const GWP_CF4 = 6630;
const GWP_C2F6 = 11100;

const proc = (over: Partial<Al2ProcessRow>): Al2ProcessRow => ({
  row_id: 'r', process_id: 'P1', naziv: '', tip: 'SINGLE', kategorija: 'UNWROUGHT_ALUMINIUM', rute: ['PRIMARY_SMELTING'],
  obuhvacene_kategorije: [], potvrda_bez_prodaje: false, proizvodi: [{ cn_code: '7601 10 10', kolicina: '100000' }], ...over,
});
const pfc = (over: Partial<Al2PfcRow>): Al2PfcRow => ({
  row_id: 'x', process_id: 'P1', metoda: 'SLOPE', tehnologija: 'CWPB', proizvodnja_primarnog_t: '100000', frekvencija: '', trajanje: '',
  aem: '', aeo_mv: '', ce_posto: '', izvor_faktora: 'TABLE', sef_cf4: '', ovc: '', f_c2f6: '', efikasnost_sakupljanja_posto: '', ...over,
});
const anode = (over: Partial<Al2AnodeRow>): Al2AnodeRow => ({
  row_id: 'a', process_id: 'P1', vrsta: 'PREBAKED_ANODE', naziv: '', ulaz_t: '', ostaci_t: '', cc_posto: '', ef: '', cf: '1', ...over,
});
const flue = (over: Partial<Al2FlueGasRow>): Al2FlueGasRow => ({
  row_id: 'f', process_id: 'P1', vrsta: 'CARBONATE_A', materijal: '', kolicina: '', udio_posto: '100', ef: '', cf: '1', ...over,
});

/* ─── Category detection and step routing (spec §3.1, §4.1, FE-1) ─── */

describe('category detection', () => {
  it('matches Aluminium II exactly, never the old Aluminium', () => {
    expect(isAluminium2Category('Aluminium II')).toBe(true);
    expect(isAluminium2Category('ALUMINIUM_II')).toBe(true);
    expect(isAluminium2Category('  aluminium ii ')).toBe(true);
    expect(isAluminium2Category('Aluminium')).toBe(false);
    expect(isAluminium2Category('Aluminium III')).toBe(false);
    expect(isAluminium2Category(null)).toBe(false);
  });
  it('does not change steel / cement detection', () => {
    expect(isSteelCategory('Aluminium II')).toBe(false);
    expect(isCementCategory('Aluminium II')).toBe(false);
  });
});

describe('step routing', () => {
  it('uses step numbers 40–46 without collisions', () => {
    const codes = Object.values(AL2_STEP);
    const nums = codes.map((c) => al2StepNumber(c));
    expect(nums).toEqual([40, 41, 42, 43, 44, 45, 46]);
    codes.forEach((c) => {
      expect(isAl2StepCode(c)).toBe(true);
      expect(steelStepNumber(c)).toBeNull();
      expect(cementStepNumber(c)).toBeNull();
    });
    expect(al2StepNumber('IS_GENERAL')).toBeNull();
    expect(al2StepNumber('ALU_DECLARATION')).toBeNull();
    expect(isAl2StepCode('toString')).toBe(false);
  });
  it('static previous chain follows default_next_step (spec §4.2)', () => {
    expect(AL2_STEP_PREVIOUS.AL2_GENERAL).toBe('CBAM_PRODUCT_DETAILS');
    expect(AL2_STEP_PREVIOUS.AL2_PFC).toBe('AL2_DIRECT_EMISSIONS');
    expect(AL2_STEP_PREVIOUS.AL2_ENERGY_FLOWS).toBe('AL2_PFC');
    expect(AL2_STEP_PREVIOUS.AL2_REPORTING_PARAMS).toBe('AL2_PRECURSORS');
  });
});

/* ─── Period (AL2_E_PERIOD) – Appendix A T2 q ─── */

describe('period and import year', () => {
  it('requires one calendar year from 2026', () => {
    expect(al2PeriodErrorCode('2026-01-01', '2026-12-31')).toBeNull();
    expect(al2PeriodErrorCode('2026-01-01', '2027-01-31')).toBe('sameYear');
    expect(al2PeriodErrorCode('2025-01-01', '2025-12-31')).toBe('from2026');
  });
  it('import year ≥ 2026 (T2 q: 2025 → AL2_E_PERIOD)', () => {
    expect(importYearOk('2025')).toBe(false);
    expect(importYearOk('2026')).toBe(true);
    expect(importYearOk('26')).toBe(false);
    expect(importYearOk('')).toBeNull();
  });
});

/* ─── CN 8-digit rule (spec §2.1, §7; Appendix A T2 n–p; contract §6.13) ─── */

describe('CN check', () => {
  it('accepts any 8-digit code under a heading and derives the category', () => {
    const a = checkAl2Cn(MAPPING, '7606 11 99');
    expect(a.ok && a.category).toBe('ALUMINIUM_PRODUCTS');
    expect(a.ok && a.inSuggestionList).toBe(true);
    const b = checkAl2Cn(MAPPING, '76011090');
    expect(b.ok && b.category).toBe('UNWROUGHT_ALUMINIUM');
    const c = checkAl2Cn(MAPPING, '7608 10 00');
    expect(c.ok && c.inSuggestionList).toBe(false);
  });
  it('T2 p: heading only → AL2_E_CN_FORMAT', () => {
    expect(checkAl2Cn(MAPPING, '7606')).toEqual({ ok: false, code: 'AL2_E_CN_FORMAT' });
    expect(checkAl2Cn(MAPPING, '7606 11 9')).toEqual({ ok: false, code: 'AL2_E_CN_FORMAT' });
    expect(checkAl2Cn(MAPPING, '7606a1199')).toEqual({ ok: false, code: 'AL2_E_CN_FORMAT' });
  });
  it('T2 n/o: 7602 and 7615 → AL2_E_CN_EXCLUDED', () => {
    expect(checkAl2Cn(MAPPING, '7602 00 11')).toEqual({ ok: false, code: 'AL2_E_CN_EXCLUDED' });
    expect(checkAl2Cn(MAPPING, '7615 10 10')).toEqual({ ok: false, code: 'AL2_E_CN_EXCLUDED' });
  });
  it('other codes → AL2_E_CN_NOT_CBAM_ALUMINIUM; 8-digit headings match on all 8 digits', () => {
    expect(checkAl2Cn(MAPPING, '7208 51 20')).toEqual({ ok: false, code: 'AL2_E_CN_NOT_CBAM_ALUMINIUM' });
    expect(checkAl2Cn(MAPPING, '7609 10 00')).toEqual({ ok: false, code: 'AL2_E_CN_NOT_CBAM_ALUMINIUM' });
    expect(checkAl2Cn(MAPPING, '7609 00 00').ok).toBe(true);
  });
  it('formats 8 digits as stored and filters suggestions by category', () => {
    expect(formatAl2Cn('76061199')).toBe('7606 11 99');
    expect(formatAl2Cn(' 7606 ')).toBe('7606');
    expect(al2Suggestions(MAPPING, ['UNWROUGHT_ALUMINIUM']).map((s) => s.cnDigits)).toEqual(['76011010', '76011090', '76012080']);
  });
});

/* ─── Products (spec §4.3) ─── */

describe('product rows', () => {
  it('maps the wizard entry to the stored row', () => {
    expect(toAl2ProductRow({ productName: ' Lim ', cnCode: '76061199', quantity: ' 100 ', countryOfOrigin: 'United States' }))
      .toEqual({ product_name: 'Lim', cn_code: '7606 11 99', quantity: '100', country_of_origin: 'United States' });
  });
  it('validates name, CN, quantity > 0 and country', () => {
    const ok = toAl2ProductRow({ productName: 'Lim', cnCode: '7606 11 99', quantity: '100', countryOfOrigin: 'United States' });
    expect(al2ProductIssues([ok], MAPPING)).toEqual([]);
    const bad = { product_name: '', cn_code: '7602 00 11', quantity: '0', country_of_origin: '' };
    expect(al2ProductIssues([bad], MAPPING).map((i) => i.code)).toEqual(['AL2_E_NAME', 'AL2_E_CN_EXCLUDED', 'AL2_E_QTY', 'AL2_E_COUNTRY']);
    expect(al2ProductIssues([], MAPPING).map((i) => i.code)).toEqual(['AL2_E_NO_PRODUCTS']);
  });
  it('T9: a declared product without process uses the default value', () => {
    const p1 = proc({ proizvodi: [{ cn_code: '7601 10 10', kolicina: '120000' }] });
    const prods = [
      { product_name: 'Tube', cn_code: '7608 10 00', quantity: '10', country_of_origin: 'Bosnia and Herzegovina' },
      { product_name: 'Slab', cn_code: '76011010', quantity: '10', country_of_origin: 'Bosnia and Herzegovina' },
    ];
    expect(al2ProductsWithoutProcess(prods, [p1]).map((p) => p.cn_code)).toEqual(['7608 10 00']);
  });
});

/* ─── Processes (spec §3.3(8), (12), §7; Appendix A T7c, T11 a/d) ─── */

describe('process validation', () => {
  const T1_P1 = proc({ proizvodi: [{ cn_code: '7601 10 10', kolicina: '120000' }, { cn_code: '7601 10 90', kolicina: '80000' }] });
  const T1_P2 = proc({
    process_id: 'P2', kategorija: 'ALUMINIUM_PRODUCTS', rute: [],
    proizvodi: [{ cn_code: '7605 19 00', kolicina: '45000' }, { cn_code: '7606 11 99', kolicina: '60000' }, { cn_code: '7607 11 19', kolicina: '8000' }],
  });
  it('T1 processes are valid; AL = Σ outputs (200 000 / 113 000)', () => {
    expect(al2ProcessIssues([T1_P1, T1_P2], MAPPING).errors).toEqual([]);
    expect(al2ActivityLevel(T1_P1)).toBe(200000);
    expect(al2ActivityLevel(T1_P2)).toBe(113000);
  });
  it('T11 d: unwrought without route, products with route → AL2_E_ROUTE_MISSING', () => {
    expect(al2ProcessIssues([proc({ rute: [] })], MAPPING).errors.map((e) => e.code)).toContain('AL2_E_ROUTE_MISSING');
    expect(al2ProcessIssues([{ ...T1_P2, rute: ['PRIMARY_SMELTING'] }], MAPPING).errors.map((e) => e.code)).toContain('AL2_E_ROUTE_MISSING');
  });
  it('T11 a: same CN in two processes → AL2_E_CN_MULTI_PROCESS', () => {
    const p2 = proc({ process_id: 'P2', proizvodi: [{ cn_code: '76011010', kolicina: '5' }] });
    expect(al2ProcessIssues([T1_P1, p2], MAPPING).errors.map((e) => e.code)).toContain('AL2_E_CN_MULTI_PROCESS');
  });
  it('output category must match the process category', () => {
    const p = { ...T1_P2, proizvodi: [{ cn_code: '7601 10 10', kolicina: '1' }] };
    expect(al2ProcessIssues([p], MAPPING).errors.map((e) => e.code)).toEqual(['AL2_E_OUTPUT_CATEGORY']);
  });
  it('T7 c: JOINT with unwrought output / without confirmation', () => {
    const joint = proc({
      tip: 'JOINT', kategorija: 'ALUMINIUM_PRODUCTS', obuhvacene_kategorije: ['UNWROUGHT_ALUMINIUM', 'ALUMINIUM_PRODUCTS'],
      potvrda_bez_prodaje: true, proizvodi: [{ cn_code: '7606 11 99', kolicina: '60000' }],
    });
    expect(al2ProcessIssues([joint], MAPPING).errors).toEqual([]);
    expect(al2ProcessIssues([{ ...joint, proizvodi: [{ cn_code: '7601 10 90', kolicina: '1' }] }], MAPPING).errors.map((e) => e.code)).toEqual(['AL2_E_OUTPUT_CATEGORY']);
    expect(al2ProcessIssues([{ ...joint, potvrda_bez_prodaje: false }], MAPPING).errors.map((e) => e.code)).toEqual(['AL2_E_JOINT_NOT_ELIGIBLE']);
    expect(al2ProcessIssues([{ ...joint, obuhvacene_kategorije: ['ALUMINIUM_PRODUCTS'] }], MAPPING).errors.map((e) => e.code)).toEqual(['AL2_E_JOINT_NOT_ELIGIBLE']);
    expect(al2ProcessIssues([{ ...joint, rute: [] }], MAPPING).errors.map((e) => e.code)).toEqual(['AL2_E_ROUTE_MISSING']);
  });
  it('quantity > 0 and at least one output; no process → error', () => {
    expect(al2ProcessIssues([proc({ proizvodi: [{ cn_code: '7601 10 10', kolicina: '0' }] })], MAPPING).errors.map((e) => e.code)).toEqual(['AL2_E_QTY']);
    expect(al2ProcessIssues([proc({ proizvodi: [] })], MAPPING).errors.map((e) => e.code)).toEqual(['AL2_E_QTY']);
    expect(al2ProcessIssues([], MAPPING).errors.map((e) => e.code)).toEqual(['AL2_E_NO_PROCESS']);
  });
  it('which processes take precursors (G05e Table 2-2; MA 3.17.2.2; OQ-AL2-20)', () => {
    expect(processTakesPrecursors(proc({ rute: ['PRIMARY_SMELTING'] }))).toBe(false);
    expect(allowedPrecursorCategories(proc({ rute: ['SECONDARY_MELTING'] }))).toEqual(['UNWROUGHT_ALUMINIUM']);
    expect(allowedPrecursorCategories(T1_P2)).toEqual(['UNWROUGHT_ALUMINIUM', 'ALUMINIUM_PRODUCTS']);
  });
});

/* ─── Anodes (spec §3.3(2); Appendix A T1, T4, T5 variant, T11 c) ─── */

describe('anodes', () => {
  it('T1: 47 000 t and 22 000 t at 100 % C → 172 208 + 80 608 = 252 816 t CO2', () => {
    const a = anodeEmissions(anode({ ulaz_t: '47000', cc_posto: '100' }))!;
    const b = anodeEmissions(anode({ ulaz_t: '22000', cc_posto: '100' }))!;
    expect(a).toBeCloseTo(172208, 2);
    expect(b).toBeCloseTo(80608, 2);
    expect(a + b).toBeCloseTo(252816, 2);
  });
  it('T4: 50 000 t at 100 % C → 183 200 t CO2', () => {
    expect(anodeEmissions(anode({ ulaz_t: '50000', cc_posto: '100' }))).toBeCloseTo(183200, 2);
  });
  it('net = input − stumps (blank = 0); entered EF wins over CC (contract §6.4)', () => {
    expect(netAnodeConsumption('100', '')).toBe(100);
    expect(netAnodeConsumption('100', '30')).toBe(70);
    expect(anodeEf('100', '3.5')).toBe(3.5);
    expect(anodeEf('50', '')).toBeCloseTo(1.832, 10);
    expect(anodeEf('', '')).toBeNull();
  });
  it('T11 c / T5 variant / EF missing', () => {
    const primary = proc({});
    expect(anodeRowIssues(anode({ ulaz_t: '10', ostaci_t: '20', cc_posto: '100' }), primary)).toEqual(['AL2_E_ANODE_NET_NEGATIVE']);
    expect(anodeRowIssues(anode({ ulaz_t: '10', cc_posto: '100' }), proc({ rute: ['SECONDARY_MELTING'] }))).toEqual(['AL2_E_ANODE_ROUTE']);
    expect(anodeRowIssues(anode({ ulaz_t: '10' }), primary)).toEqual(['AL2_E_ANODE_EF_MISSING']);
    expect(anodeRowIssues(anode({ ulaz_t: '10', cc_posto: '120' }), primary)).toEqual(['AL2_E_PERCENT_RANGE']);
    expect(anodeRowIssues(anode({ ulaz_t: '10', cc_posto: '100', cf: '1.2' }), primary)).toEqual(['AL2_E_FACTOR_RANGE']);
  });
});

/* ─── Flue gas (spec §3.3(3); Appendix A T5) ─── */

describe('flue gas', () => {
  it('T5: Na2CO3 200 t (EF 0,415) → 83,0; CaCO3 100 t at 90 % (EF 0,440) → 39,6 t CO2', () => {
    // Table 3 values (MA Annex II G, p.63) come from GET /is/standard-factors in the app
    expect(flueGasEmissions(flue({ materijal: 'Na2CO3', kolicina: '200', udio_posto: '100' }), 0.415)).toBeCloseTo(83.0, 6);
    expect(flueGasEmissions(flue({ materijal: 'CaCO3', kolicina: '100', udio_posto: '90' }), 0.440)).toBeCloseTo(39.6, 6);
  });
  it('gypsum (Method B) and urea use the fixed factors; CF only for carbonates', () => {
    expect(flueGasEmissions(flue({ vrsta: 'GYPSUM_B', kolicina: '100', cf: '0.5' }))).toBeCloseTo(25.58, 6);
    expect(flueGasEmissions(flue({ vrsta: 'UREA_DENOX', kolicina: '10' }))).toBeCloseTo(7.328, 6);
    expect(flueGasEmissions(flue({ materijal: 'Na2CO3', kolicina: '200', cf: '0.5' }), 0.415)).toBeCloseTo(41.5, 6);
  });
  it('validation and A + B warning', () => {
    expect(flueGasRowIssues(flue({ materijal: 'Na2CO3', kolicina: '200' }), 0.415)).toEqual([]);
    expect(flueGasRowIssues(flue({ vrsta: '', kolicina: '200' }))).toEqual(['AL2_E_KIND']);
    expect(flueGasRowIssues(flue({ materijal: 'Na2CO3', kolicina: '0' }), 0.415)).toEqual(['AL2_E_QTY']);
    expect(flueGasRowIssues(flue({ materijal: 'Na2CO3', kolicina: '1', udio_posto: '101' }), 0.415)).toEqual(['AL2_E_PERCENT_RANGE']);
    expect(flueGasRowIssues(flue({ kolicina: '1' }))).toEqual(['AL2_E_FACTOR_RANGE']);
    expect(flueGasAandB([{ vrsta: 'CARBONATE_A' }, { vrsta: 'GYPSUM_B' }])).toBe(true);
    expect(flueGasAandB([{ vrsta: 'CARBONATE_A' }, { vrsta: 'UREA_DENOX' }])).toBe(false);
  });
});

/* ─── PFC (spec §3.3(4); Appendix A T1, T1b, T4 a–e, T11 g) ─── */

describe('PFC formulas', () => {
  it('T1: slope, installation-specific SEF 0,102 / F 0,12, PrAl 200 000, η 97 %', () => {
    const aem = pfcAem({ aem: '', frekvencija: '0.60393585216050749', trajanje: '0.25' })!;
    expect(aem).toBeCloseTo(0.15098396304012687, 12); // Appendix A T1: 0,150983963040126872
    const cf4 = cf4Slope(aem, 0.102, 200000);
    expect(cf4).toBeCloseTo(3.080072846, 8);
    const c2f6 = c2f6FromCf4(cf4, 0.12);
    expect(c2f6).toBeCloseTo(0.369608742, 8);
    const duct = pfcDuctCo2e(cf4, c2f6, GWP_CF4, GWP_C2F6);
    expect(duct).toBeCloseTo(24523.54, 2);
    expect(pfcTotalCo2e(duct, '97')).toBeCloseTo(25282.0, 2);
    // T1b: blank collection efficiency → no gross-up (OQ-AL2-3)
    expect(pfcTotalCo2e(duct, '')).toBeCloseTo(24523.54, 2);
  });
  it('T1 preview from a row (installation-specific factors)', () => {
    const r = pfc({
      proizvodnja_primarnog_t: '200000', frekvencija: '0.60393585216050749', trajanje: '0.25', izvor_faktora: 'INSTALLATION_SPECIFIC',
      sef_cf4: '0.102', f_c2f6: '0.12', efikasnost_sakupljanja_posto: '97',
    });
    const pv = pfcPreview(r, PFC_TABLE, GWP_CF4, GWP_C2F6);
    expect(pv.total).toBeCloseTo(25282.0, 2);
    expect(pfcRowIssues(r, proc({}), PFC_TABLE)).toEqual({ errors: [], warnings: [] });
  });
  it('T4 a: slope, CWPB table, AEM 1, η 95 % → CF4 14,3 t, C2F6 1,7303 t, duct 114 015,33, total 120 016,1368', () => {
    const r = pfc({ frekvencija: '0.5', trajanje: '2', efikasnost_sakupljanja_posto: '95' });
    const pv = pfcPreview(r, PFC_TABLE, GWP_CF4, GWP_C2F6);
    expect(pv.aem).toBeCloseTo(1, 12);
    expect(pv.cf4).toBeCloseTo(14.3, 8);
    expect(pv.c2f6).toBeCloseTo(1.7303, 8);
    expect(pv.duct).toBeCloseTo(114015.33, 2);
    expect(pv.total).toBeCloseTo(120016.1368, 3);
    // SEE = (183 200 + 120 016,1368) / 100 000 = 3,03216
    expect(al2FormatSee((183200 + pv.total!) / 100000)).toBe('3.03216');
  });
  it('T4 b: overvoltage, CWPB table, AEO 1,5 mV, CE 94,5 % (as percent number, OQ-AL2-4)', () => {
    expect(cf4Overvoltage(1.16, 1.5, 94.5, 100000)).toBeCloseTo(1.841270, 6);
    const r = pfc({ metoda: 'OVERVOLTAGE', aeo_mv: '1.5', ce_posto: '94.5' });
    const pv = pfcPreview(r, PFC_TABLE, GWP_CF4, GWP_C2F6);
    expect(pv.cf4).toBeCloseTo(1.841270, 6);
    expect(pv.c2f6).toBeCloseTo(0.222794, 6);
    expect(pv.total).toBeCloseTo(14680.6286, 3);
    expect(al2FormatSee((183200 + pv.total!) / 100000)).toBe('1.97881');
    expect(pfcRowIssues(r, proc({}), PFC_TABLE)).toEqual({ errors: [], warnings: ['AL2_W_PFC_NO_COLLECTION_EFF'] });
  });
  it('T4 c: overvoltage HSS with table factors → AL2_E_PFC_FACTOR_MISSING', () => {
    const r = pfc({ metoda: 'OVERVOLTAGE', tehnologija: 'HSS', aeo_mv: '1.5', ce_posto: '94.5', efikasnost_sakupljanja_posto: '95' });
    expect(pfcRowIssues(r, proc({}), PFC_TABLE).errors).toEqual(['AL2_E_PFC_FACTOR_MISSING']);
  });
  it('T4 d: PFPB_MW slope with table → CWPB values + warning, result as (a)', () => {
    const r = pfc({ tehnologija: 'PFPB_MW', frekvencija: '0.5', trajanje: '2', efikasnost_sakupljanja_posto: '95' });
    expect(pfcFactors(r, PFC_TABLE)).toMatchObject({ a: 0.143, f: 0.121, usedTechnology: 'CWPB', fallback: true });
    expect(pfcPreview(r, PFC_TABLE, GWP_CF4, GWP_C2F6).total).toBeCloseTo(120016.1368, 3);
    expect(pfcRowIssues(r, proc({}), PFC_TABLE)).toEqual({ errors: [], warnings: ['AL2_W_PFC_PFPB_MW_CWPB'] });
  });
  it('T4 e: PFC row on a secondary-only process → AL2_E_PFC_ROUTE', () => {
    const r = pfc({ frekvencija: '0.5', trajanje: '2', efikasnost_sakupljanja_posto: '95' });
    expect(pfcRowIssues(r, proc({ rute: ['SECONDARY_MELTING'] }), PFC_TABLE).errors).toEqual(['AL2_E_PFC_ROUTE']);
  });
  it('T11 g: CE 0 or 120 → AL2_E_PERCENT_RANGE; incomplete data', () => {
    expect(pfcRowIssues(pfc({ metoda: 'OVERVOLTAGE', aeo_mv: '1.5', ce_posto: '0', efikasnost_sakupljanja_posto: '95' }), proc({}), PFC_TABLE).errors).toEqual(['AL2_E_PERCENT_RANGE']);
    expect(pfcRowIssues(pfc({ metoda: 'OVERVOLTAGE', aeo_mv: '1.5', ce_posto: '120', efikasnost_sakupljanja_posto: '95' }), proc({}), PFC_TABLE).errors).toEqual(['AL2_E_PERCENT_RANGE']);
    expect(pfcRowIssues(pfc({ efikasnost_sakupljanja_posto: '95' }), proc({}), PFC_TABLE).errors).toEqual(['AL2_E_PFC_INCOMPLETE']);
    expect(pfcRowIssues(pfc({ aem: '1', efikasnost_sakupljanja_posto: '0' }), proc({}), PFC_TABLE).errors).toEqual(['AL2_E_PERCENT_RANGE']);
    expect(pfcRowIssues(pfc({ aem: '1', izvor_faktora: 'INSTALLATION_SPECIFIC', efikasnost_sakupljanja_posto: '95' }), proc({}), PFC_TABLE).errors).toEqual(['AL2_E_PFC_FACTOR_MISSING']);
  });
  it('Σ PrAl > AL → AL2_W_PFC_PRAL_GT_AL', () => {
    const p = proc({});
    expect(pfcPrAlExceedsAl(p, [pfc({ proizvodnja_primarnog_t: '100000' })])).toBe(false);
    expect(pfcPrAlExceedsAl(p, [pfc({ proizvodnja_primarnog_t: '60000' }), pfc({ proizvodnja_primarnog_t: '60000' })])).toBe(true);
  });
});

/* ─── Precursors (spec §3.3(9); Appendix A T3, T11 b/e/f) ─── */

describe('precursors', () => {
  const unwroughtPrimary = proc({});
  const unwroughtSecondary = proc({ rute: ['SECONDARY_MELTING'] });
  const products = proc({ process_id: 'P2', kategorija: 'ALUMINIUM_PRODUCTS', rute: [], proizvodi: [{ cn_code: '7604 10 90', kolicina: '10000' }] });
  it('T11 e/f and allowed combinations (category checked before route, contract §6.8)', () => {
    expect(precursorCategoryIssue({ cn_code: '7604 10 90' }, unwroughtSecondary, MAPPING)).toBe('AL2_E_PRECURSOR_CATEGORY');
    expect(precursorCategoryIssue({ cn_code: '7604 10 90' }, unwroughtPrimary, MAPPING)).toBe('AL2_E_PRECURSOR_CATEGORY');
    expect(precursorCategoryIssue({ cn_code: '7601 10 90' }, unwroughtPrimary, MAPPING)).toBe('AL2_E_PRECURSOR_ROUTE');
    expect(precursorCategoryIssue({ cn_code: '7601 10 90' }, unwroughtSecondary, MAPPING)).toBeNull();
    expect(precursorCategoryIssue({ cn_code: '7606 11 99' }, products, MAPPING)).toBeNull();
    expect(precursorCategoryIssue({ cn_code: '7602 00 11' }, products, MAPPING)).toBe('AL2_E_CN_EXCLUDED');
  });
  it('internal source must be another SINGLE process with that output', () => {
    const p1 = proc({ proizvodi: [{ cn_code: '7601 10 10', kolicina: '120000' }] });
    expect(al2InternalSourceOk({ cn_code: '76011010', process_id: 'P2' }, p1)).toBe(true);
    expect(al2InternalSourceOk({ cn_code: '7601 10 90', process_id: 'P2' }, p1)).toBe(false);
    expect(al2InternalSourceOk({ cn_code: '7601 10 10', process_id: 'P1' }, p1)).toBe(false);
    expect(al2InternalSourceOk({ cn_code: '7601 10 10', process_id: 'P2' }, { ...p1, tip: 'JOINT' })).toBe(false);
  });
  it('T11 b: P1 → P2 → P1 is a cycle', () => {
    expect(al2PrecursorCycle([
      { process_id: 'P1', izvor: 'INTERNAL_PROCESS', izvorni_process_id: 'P2' },
      { process_id: 'P2', izvor: 'INTERNAL_PROCESS', izvorni_process_id: 'P1' },
    ])).not.toBeNull();
    expect(al2PrecursorCycle([{ process_id: 'P2', izvor: 'INTERNAL_PROCESS', izvorni_process_id: 'P1' }])).toBeNull();
  });
  it('T3: m = 10 400 / 10 000 = 1,04; Σ m_i ≥ 1 → no warning; T10-like Σ m_i < 1 → warning', () => {
    expect(precursorMi('10400', al2ActivityLevel(products))).toBeCloseTo(1.04, 12);
    expect(al2MiSum(products, [{ process_id: 'P2', kolicina: '10400' }])).toBeCloseTo(1.04, 12);
    expect(al2MiSum(products, [{ process_id: 'P2', kolicina: '9000' }])).toBeCloseTo(0.9, 12);
    expect(al2MiSum(products, [])).toBeNull();
    expect(al2MiSum({ ...products, tip: 'JOINT' }, [{ process_id: 'P2', kolicina: '9000' }])).toBeNull();
  });
  it('T3 e: precursor year = max(2026, production year or Y_rep)', () => {
    expect(al2PrecursorYear('2025', 2026)).toBe(2026);
    expect(al2PrecursorYear('', 2027)).toBe(2027);
    expect(al2PrecursorYear('2028', 2026)).toBe(2028);
    expect(al2PrecursorYear('', null)).toBeNull();
  });
  it('T3 c/d: ACTUAL only with verification, otherwise the default value', () => {
    expect(precursorUsesDefault({ izvor: 'PURCHASED', podaci: 'DEFAULT', verifikovano: false })).toBe(true);
    expect(precursorUsesDefault({ izvor: 'PURCHASED', podaci: 'ACTUAL', verifikovano: false })).toBe(true);
    expect(precursorUsesDefault({ izvor: 'PURCHASED', podaci: 'ACTUAL', verifikovano: true })).toBe(false);
    expect(precursorUsesDefault({ izvor: 'INTERNAL_PROCESS', podaci: '', verifikovano: false })).toBe(false);
  });
});

/* ─── Reporting parameters (spec §3.5; Appendix A T5) ─── */

describe('reporting parameters', () => {
  it('T5: scrap 46 000 t / AL 50 000 t = 0,92 t/t; other elements 4,5 % reported (> 1 %)', () => {
    expect(scrapPerTonne('46000', 50000)).toBeCloseTo(0.92, 12);
    expect(otherElementsReported('4.5')).toBe(true);
    expect(otherElementsReported('0.153')).toBe(false);
    expect(otherElementsReported('1')).toBe(false);
    expect(otherElementsReported('')).toBeNull();
  });
  it('ranges', () => {
    const r = { row_id: 'x', process_id: 'P1', otpad_t: '46000', pre_consumer_otpad_posto: '20', ostali_elementi_posto: '4.5' };
    expect(reportingParamIssues(r)).toEqual([]);
    expect(reportingParamIssues({ ...r, otpad_t: '-1' })).toEqual(['AL2_E_QTY']);
    expect(reportingParamIssues({ ...r, pre_consumer_otpad_posto: '120' })).toEqual(['AL2_E_PERCENT_RANGE']);
  });
});

/* ─── Result aggregation (contract §4; Appendix A T1 product, T2 a) ─── */

describe('result view totals', () => {
  const item = (code: string, value: number, passCode: string, entryIndex: number) => ({
    formulaCode: code, outputCode: code, passCode, entryIndex, inputSnapshot: '{}', resultValue: value,
  });
  it('T1 product 100 t × 1,69809 → 169,81 t; T2 a 100 t × 1,87 → 187,00 t; only AL2 items are summed', () => {
    const items = [
      item('AL2_PROC_SEE_DIR', 1.698089093, 'P2', 1),
      item('AL2_RESULT_SEE_DIR', 1.698089093, 'PRODUCT', 0),
      item('AL2_RESULT_EMBEDDED_DIR', 169.8089093, 'PRODUCT', 0),
      item('AL2_RESULT_EMBEDDED_DIR', 187.0, 'PRODUCT', 1),
      item('IS_RESULT_EMBEDDED_TOTAL', 999, 'PRODUCT', 0),
    ];
    const { products, processes } = groupAl2Result(items);
    expect(products.size).toBe(2);
    expect(processes.get('P2')?.values.AL2_PROC_SEE_DIR).toBeCloseTo(1.698089093, 9);
    expect(al2FormatSee(products.get(0)?.values.AL2_RESULT_SEE_DIR)).toBe('1.69809');
    expect(products.get(0)?.values.AL2_RESULT_EMBEDDED_DIR).toBeCloseTo(169.81, 2);
    expect(al2ProductTotal(products)).toBeCloseTo(356.81, 2);
    expect(al2RoundTonnes(169.8089093)).toBe(170);
  });
});

/* ─── i18n of the category and step titles (FE-13; stored value is never translated) ─── */

describe('labels', () => {
  it('maps the stored category name for display only; step titles exist in BS/EN/TR', async () => {
    const { default: i18n, productCategoryLabel, tr } = await import('../i18n');
    const expected: Record<string, string> = { bs: 'Aluminij II', en: 'Aluminium II', tr: 'Alüminyum II' };
    for (const lng of ['bs', 'en', 'tr']) {
      await i18n.changeLanguage(lng);
      expect(productCategoryLabel('Aluminium II')).toBe(expected[lng]);
      Object.values(AL2_STEP).forEach((code) => expect(tr(`aluminium2.step.${code}`)).not.toBe(`aluminium2.step.${code}`));
    }
    await i18n.changeLanguage('bs');
  });
});
