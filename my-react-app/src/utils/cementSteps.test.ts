import { describe, expect, it } from 'vitest';
import {
  CE_STEP, CE_STEP_PREVIOUS, EF_CKD_STD, EF_CLINKER_STD, EF_UREA_DENOX, cementPeriodError, cementProductTotals,
  cementStepNumber, ceMethodIssues, ceProcessIssues, ceProductIssues, checkCeCnTaric, ckRangeOk, ckdEfEq28,
  clinkerFromBalance, clinkerMiSum, findPrecursorCycle, formatCeCode, formatSee, fuColumnApplicable, groupCementResult,
  internalSourceOk, isCementCategory, isCementStepCode, isWhiteGood, needsClinkerContent, nonCarbonateCarbonEf,
  normaliseBalance, processActivityLevel, productsWithoutProcess, rawMealQuantity, roundTonnes, toCeProductRow,
  type CeCkdRow, type CeClinkerOutputRow, type CeCnMappingRow, type CeMaterialRow, type CePrecursorRow, type CeProcessRow,
  type CeResultItemLike,
} from './cementSteps';
import { isSteelStepCode, steelStepNumber } from './steelSteps';
import { inferPreviousStepFallback } from './wizardBackNavigation';

/*
 * Test fixture = GET /ce/cn-mapping as described in docs/cement-api-contract.md §3.1 and
 * docs/cement-implementation-spec.md §2.1 (CBAM-R Annex I p.45; MA Annex I Table 1 p.15; DVC recitals 5–6 p.1).
 * Numbers in the tests are the spec §8 acceptance cases (T1, T4, T6, T7, T8, T10).
 */
const MAPPING: CeCnMappingRow[] = [
  {
    cnCode: '2507 00 80', cnDigits: '25070080', category: 'CALCINED_CLAY', categoryLabel: 'Calcined clay', description: '',
    functionalUnit: 'TONNE_GOOD', complex: false, taricRequired: true, white: null, ckFixed: null, sortOrder: 201,
    taricOptions: [{ taric: '2507 00 80 80', taricDigits: '2507008080', white: false, label: 'Calcined clay' }],
  },
  {
    cnCode: '2523 10 00', cnDigits: '25231000', category: 'CEMENT_CLINKER', categoryLabel: 'Cement clinker', description: '',
    functionalUnit: 'CLINKER_CONTENT', complex: false, taricRequired: true, white: null, ckFixed: 1, sortOrder: 202,
    taricOptions: [
      { taric: '2523 10 00 10', taricDigits: '2523100010', white: true, label: 'White clinker' },
      { taric: '2523 10 00 90', taricDigits: '2523100090', white: false, label: 'Other clinker including grey clinker' },
    ],
  },
  {
    cnCode: '2523 21 00', cnDigits: '25232100', category: 'CEMENT', categoryLabel: 'Cement', description: '',
    functionalUnit: 'CLINKER_CONTENT', complex: true, taricRequired: false, white: true, ckFixed: null, sortOrder: 203, taricOptions: [],
  },
  {
    cnCode: '2523 29 00', cnDigits: '25232900', category: 'CEMENT', categoryLabel: 'Cement', description: '',
    functionalUnit: 'CLINKER_CONTENT', complex: true, taricRequired: false, white: false, ckFixed: null, sortOrder: 204, taricOptions: [],
  },
  {
    cnCode: '2523 90 00', cnDigits: '25239000', category: 'CEMENT', categoryLabel: 'Cement', description: '',
    functionalUnit: 'CLINKER_CONTENT', complex: true, taricRequired: true, white: null, ckFixed: null, sortOrder: 205,
    taricOptions: [
      { taric: '2523 90 00 10', taricDigits: '2523900010', white: true, label: 'White hydraulic cement' },
      { taric: '2523 90 00 90', taricDigits: '2523900090', white: false, label: 'Other hydraulic cements' },
    ],
  },
  {
    cnCode: '2523 30 00', cnDigits: '25233000', category: 'ALUMINOUS_CEMENT', categoryLabel: 'Aluminous cement', description: '',
    functionalUnit: 'TONNE_GOOD', complex: false, taricRequired: false, white: null, ckFixed: null, sortOrder: 206, taricOptions: [],
  },
];

const out = (cn: string, kolicina: string, ck = '', taric = '') => ({ cn_code: cn, taric_code: taric, kolicina, klinker_udio_posto: ck });

function proc(id: string, patch: Partial<CeProcessRow>): CeProcessRow {
  return {
    row_id: id, process_id: id, naziv: '', tip: 'SINGLE', kategorija: 'CEMENT', obuhvacene_kategorije: [],
    potvrda_bez_prodaje: false, proizvodi: [], ...patch,
  };
}

function mat(processId: string, vrsta: CeMaterialRow['vrsta']): CeMaterialRow {
  return {
    row_id: `${processId}-${vrsta}`, process_id: processId, vrsta, materijal: '', metoda_karbonata: 'A', kolicina: '1',
    udio_posto: '100', ef: '', cf: '1', cc_posto: '', klinker_t: '', raw_meal_ratio: '', naziv_ostalo: '',
  };
}

function cli(processId: string): CeClinkerOutputRow {
  return {
    row_id: `${processId}-B`, process_id: processId, ad_nacin: 'WEIGHING', klinker_t: '1255000',
    bilans: { cement: [], klinker_nabavljen_t: '', klinker_otpremljen_t: '', promjena_zaliha_klinkera_t: '' },
    ef_nacin: 'STANDARD', ef: '0.525', cf: '1',
  };
}

function prec(processId: string, patch: Partial<CePrecursorRow>): CePrecursorRow {
  return {
    row_id: `${processId}-pre`, process_id: processId, kategorija: 'CEMENT_CLINKER', cn_code: '2523 10 00', taric_code: '2523 10 00 90',
    izvor: 'PURCHASED', izvorni_process_id: '', kolicina: '0', country_id: null, drzava: '', drzava_nepoznata: false, podaci: 'DEFAULT',
    see_direktne: '', see_indirektne: '', verifikovano: false, godina_proizvodnje: '', postrojenje: '', ruta: '', ...patch,
  };
}

describe('cement category and steps', () => {
  it('detects the stored category (spec §3.1: Cement | CEMENT)', () => {
    expect(isCementCategory('Cement')).toBe(true);
    expect(isCementCategory('CEMENT')).toBe(true);
    expect(isCementCategory('Iron and Steel')).toBe(false);
    expect(isCementCategory('Aluminium')).toBe(false);
  });

  it('uses step numbers 30–35 that never collide with steel (20–27) or aluminium (1–14, 99)', () => {
    const codes = Object.values(CE_STEP);
    const nums = codes.map((c) => cementStepNumber(c));
    expect(nums).toEqual([30, 31, 32, 33, 34, 35]);
    codes.forEach((c) => { expect(isCementStepCode(c)).toBe(true); expect(isSteelStepCode(c)).toBe(false); expect(steelStepNumber(c)).toBeNull(); });
    expect(isCementStepCode('IS_GENERAL')).toBe(false);
    expect(CE_STEP_PREVIOUS.CE_GENERAL).toBe('CBAM_PRODUCT_DETAILS');
    expect(CE_STEP_PREVIOUS.CE_PRECURSORS).toBe('CE_ELECTRICITY');
  });

  it('Back from COMPLETE after reload goes to CE_GENERAL (default) / CE_PRECURSORS (actual); steel unchanged', () => {
    const lookup = (answers: Record<string, string>) => ({
      getAnswerByCode: (c: string) => answers[c] ?? '', hasAnswerByCode: (c: string) => c in answers,
    });
    expect(inferPreviousStepFallback('COMPLETE', lookup({ CE_DATA_SOURCE: 'DEFAULT_VALUES' }))).toBe('CE_GENERAL');
    expect(inferPreviousStepFallback('COMPLETE', lookup({ CE_DATA_SOURCE: 'ACTUAL_VALUES' }))).toBe('CE_PRECURSORS');
    expect(inferPreviousStepFallback('COMPLETE', lookup({ IS_DATA_SOURCE: 'ACTUAL_VALUES' }))).toBe('IS_REPORTING_PARAMS');
    expect(inferPreviousStepFallback('COMPLETE', lookup({}))).toBeNull();
    expect(inferPreviousStepFallback('CE_ELECTRICITY', lookup({}))).toBe('CE_ENERGY_FLOWS');
  });
});

describe('CN / TARIC validation (spec §2.1, §7, T5m, T10a/b)', () => {
  it('accepts CN without TARIC and returns the 8-digit key', () => {
    const r = checkCeCnTaric(MAPPING, '2523 29 00', '');
    expect(r.ok && r.key).toBe('25232900');
  });
  it('uses the TARIC as lookup key where required', () => {
    const r = checkCeCnTaric(MAPPING, '2523 10 00', '2523 10 00 90');
    expect(r.ok && r.key).toBe('2523100090');
    expect(isWhiteGood(r)).toBe(false);
    expect(isWhiteGood(checkCeCnTaric(MAPPING, '2523 21 00', ''))).toBe(true);
    expect(isWhiteGood(checkCeCnTaric(MAPPING, '2523 30 00', ''))).toBeNull();
  });
  it('T10(a): 2523 90 10 → CE_E_CN_NOT_CBAM_CEMENT', () => {
    expect(checkCeCnTaric(MAPPING, '2523 90 10', '')).toEqual({ ok: false, code: 'CE_E_CN_NOT_CBAM_CEMENT' });
  });
  it('T10(b): 2507 00 80 with TARIC 2507 00 80 10 → CE_E_CN_NOT_CALCINED', () => {
    expect(checkCeCnTaric(MAPPING, '2507 00 80', '2507 00 80 10')).toEqual({ ok: false, code: 'CE_E_CN_NOT_CALCINED' });
  });
  it('T5(m): 2523 10 00 without TARIC → CE_E_TARIC_REQUIRED', () => {
    expect(checkCeCnTaric(MAPPING, '2523 10 00', '')).toEqual({ ok: false, code: 'CE_E_TARIC_REQUIRED' });
  });
  it('TARIC on a CN without TARIC rule, wrong TARIC, bad format', () => {
    expect(checkCeCnTaric(MAPPING, '2523 29 00', '2523 29 00 10')).toEqual({ ok: false, code: 'CE_E_TARIC_INVALID' });
    expect(checkCeCnTaric(MAPPING, '2523 90 00', '2523 90 00 50')).toEqual({ ok: false, code: 'CE_E_TARIC_INVALID' });
    expect(checkCeCnTaric(MAPPING, '2523', '')).toEqual({ ok: false, code: 'CE_E_CN_FORMAT' });
  });
  it('clinker content is entered only for cement goods 2523 21/29/90', () => {
    const ck = MAPPING.filter(needsClinkerContent).map((m) => m.cnDigits);
    expect(ck).toEqual(['25232100', '25232900', '25239000']);
  });
  it('formats codes', () => {
    expect(formatCeCode('2523100090')).toBe('2523 10 00 90');
    expect(formatCeCode('25232900')).toBe('2523 29 00');
  });
});

describe('period and product validation (spec §1.5, §4.3, T10c/h)', () => {
  it('T10(c): period 2025 → error; different years → error; 2026 ok', () => {
    expect(cementPeriodError('2025-01-01', '2025-12-31')).not.toBeNull();
    expect(cementPeriodError('2026-01-01', '2027-03-31')).not.toBeNull();
    expect(cementPeriodError('2026-01-01', '2026-12-31')).toBeNull();
  });
  it('T10(h): CK 0 or 120 → out of range; 95 ok; blank unknown', () => {
    expect(ckRangeOk('0')).toBe(false);
    expect(ckRangeOk('120')).toBe(false);
    expect(ckRangeOk('95')).toBe(true);
    expect(ckRangeOk('100')).toBe(true);
    expect(ckRangeOk('')).toBeNull();
  });
  it('CK is required only on the actual path', () => {
    const p = { product_name: 'CEM I', cn_code: '2523 29 00', taric_code: '', quantity: '100', country_of_origin: 'Lebanon', klinker_udio_posto: '' };
    expect(ceProductIssues([p], MAPPING, false)).toEqual([]);
    expect(ceProductIssues([p], MAPPING, true).map((i) => i.code)).toEqual(['CE_E_CK_MISSING']);
    expect(ceProductIssues([{ ...p, klinker_udio_posto: '120', quantity: '0' }], MAPPING, false).map((i) => i.code))
      .toEqual(['CE_E_QTY', 'CE_E_CK_RANGE']);
  });
  it('maps a wizard entry to the spec §4.3 row shape', () => {
    expect(toCeProductRow({
      productName: ' Portland cement CEM I ', cnCode: '2523 29 00', quantity: '100', countryOfOrigin: 'Bosnia and Herzegovina', clinkerSharePct: '95',
    })).toEqual({
      product_name: 'Portland cement CEM I', cn_code: '2523 29 00', taric_code: '', quantity: '100',
      country_of_origin: 'Bosnia and Herzegovina', klinker_udio_posto: '95',
    });
  });
});

describe('processes: activity level and checks (spec §3.3(10), (15), T1, T2, T4, T10d/e)', () => {
  it('T1/T2: 1 321 052,6315789474 t cement × CK 95 % = AL 1 255 000 t clinker', () => {
    const p2 = proc('P2', { proizvodi: [out('2523 29 00', '1321052.6315789474', '95')] });
    const al = processActivityLevel(p2, MAPPING);
    expect(al.alFu).toBeCloseTo(1255000, 6);
    expect(al.alMass).toBeCloseTo(1321052.6315789474, 6);
    // clinker: FU = t clinker (CK fixed 1)
    const p1 = proc('P1', { kategorija: 'CEMENT_CLINKER', proizvodi: [out('2523 10 00', '1255000', '', '2523 10 00 90')] });
    expect(processActivityLevel(p1, MAPPING).alFu).toBe(1255000);
  });

  it('T4: multifunctional bubble AL = 144 900 t clinker, white/grey mixed warning', () => {
    const joint = proc('P1', {
      tip: 'JOINT', obuhvacene_kategorije: ['CEMENT_CLINKER', 'CEMENT'], potvrda_bez_prodaje: true,
      proizvodi: [out('2523 29 00', '50000', '95'), out('2523 21 00', '40000', '98'), out('2523 90 00', '60000', '97', '2523 90 00 10')],
    });
    expect(processActivityLevel(joint, MAPPING).alFu).toBeCloseTo(144900, 6);
    const res = ceProcessIssues([joint], MAPPING);
    expect(res.errors).toEqual([]);
    expect(res.warnings.map((w) => w.code)).toEqual(['CE_W_WHITE_GREY_MIXED']);
  });

  it('T10(d): same output in two processes → CE_E_CN_MULTI_PROCESS', () => {
    const a = proc('P1', { proizvodi: [out('2523 29 00', '10', '90')] });
    const b = proc('P2', { proizvodi: [out('2523 29 00', '10', '90')] });
    expect(ceProcessIssues([a, b], MAPPING).errors.map((e) => e.code)).toEqual(['CE_E_CN_MULTI_PROCESS']);
  });

  it('T10(e): JOINT without confirmation → CE_E_JOINT_NOT_ELIGIBLE; JOINT must contain CEMENT + a precursor category', () => {
    const j = proc('P1', { tip: 'JOINT', obuhvacene_kategorije: ['CEMENT_CLINKER', 'CEMENT'], proizvodi: [out('2523 29 00', '1', '95')] });
    expect(ceProcessIssues([j], MAPPING).errors).toEqual([{ code: 'CE_E_JOINT_NOT_ELIGIBLE', processId: 'P1', detail: 'confirmation' }]);
    const j2 = { ...j, potvrda_bez_prodaje: true, obuhvacene_kategorije: ['CEMENT'] };
    expect(ceProcessIssues([j2], MAPPING).errors.map((e) => e.detail)).toEqual(['categories']);
    const j3 = { ...j2, obuhvacene_kategorije: ['CEMENT', 'ALUMINOUS_CEMENT'] };
    expect(ceProcessIssues([j3], MAPPING).errors.map((e) => e.detail)).toEqual(['categories']);
  });

  it('outputs must belong to the process category; CK required on cement outputs', () => {
    const p = proc('P1', { kategorija: 'CEMENT_CLINKER', proizvodi: [out('2523 29 00', '10', '')] });
    expect(ceProcessIssues([p], MAPPING).errors.map((e) => e.code)).toEqual(['CE_E_OUTPUT_CATEGORY', 'CE_E_CK_MISSING']);
  });

  it('declared products without a producing process (→ default path, spec §3.4)', () => {
    const products = [
      { product_name: 'a', cn_code: '2523 29 00', taric_code: '', quantity: '1', country_of_origin: 'x', klinker_udio_posto: '95' },
      { product_name: 'b', cn_code: '2523 10 00', taric_code: '2523 10 00 10', quantity: '1', country_of_origin: 'x', klinker_udio_posto: '' },
    ];
    const p = proc('P1', { kategorija: 'CEMENT_CLINKER', proizvodi: [out('2523 10 00', '5', '', '2523 10 00 90')] });
    expect(productsWithoutProcess(products, [p], MAPPING).map((x) => x.product_name)).toEqual(['a', 'b']);
  });
});

describe('direct emissions helpers (spec §3.3(2)–(5), T7, T8)', () => {
  it('T7: Eq. 27 balance → Cli_prod = 942 000 t → × 0,525 = 494 550 t CO2', () => {
    const b = {
      cement: [{ isporuke_t: '1100000', promjena_zaliha_t: '20000', ccr_posto: '90' }],
      klinker_nabavljen_t: '50000', klinker_otpremljen_t: '30000', promjena_zaliha_klinkera_t: '10000',
    };
    const c = clinkerFromBalance(b);
    expect(c).toBeCloseTo(942000, 6);
    expect((c as number) * EF_CLINKER_STD).toBeCloseTo(494550, 6);
    expect(clinkerFromBalance({ ...b, cement: [] })).toBeNull();
    expect(clinkerFromBalance({ ...b, cement: [{ isporuke_t: 'x', promjena_zaliha_t: '', ccr_posto: '90' }] })).toBeNull();
  });

  it('balance blanks are sent as "0" (docs/cement-api-contract.md §2)', () => {
    const n = normaliseBalance({
      cement: [{ isporuke_t: '100', promjena_zaliha_t: '', ccr_posto: '90' }],
      klinker_nabavljen_t: '', klinker_otpremljen_t: '5', promjena_zaliha_klinkera_t: ' ',
    });
    expect(n).toEqual({
      cement: [{ isporuke_t: '100', promjena_zaliha_t: '0', ccr_posto: '90' }],
      klinker_nabavljen_t: '0', klinker_otpremljen_t: '5', promjena_zaliha_klinkera_t: '0',
    });
    expect(clinkerFromBalance(n)).toBeCloseTo(90 - 0 + 5 - 0, 9);
  });

  it('T7: CKD 5 000 t standard → 2 625; Eq. 28 with EF_cli 0,525, d 50 % → EF_CKD 0,207921 → 1 039,60', () => {
    expect(5000 * EF_CKD_STD).toBeCloseTo(2625, 9);
    const ef = ckdEfEq28('0.525', '50') as number;
    expect(ef).toBeCloseTo(0.207921, 6);
    expect(5000 * ef).toBeCloseTo(1039.60, 2);
    expect(ckdEfEq28('0', '50')).toBeNull();
    expect(ckdEfEq28('0.525', '120')).toBeNull();
  });

  it('T8: non-carbonate carbon cc 0,2 % → EF 0,007328 → 11 724,8 t; urea 1 000 t → 732,8 t', () => {
    const ef = nonCarbonateCarbonEf('0.2') as number;
    expect(ef).toBeCloseTo(0.007328, 9);
    expect(1600000 * ef).toBeCloseTo(11724.8, 6);
    expect(1000 * EF_UREA_DENOX).toBeCloseTo(732.8, 9);
    expect(nonCarbonateCarbonEf('')).toBeNull();
  });

  it('raw meal AD helper = clinker × ratio', () => {
    expect(rawMealQuantity('1000', '1.55')).toBeCloseTo(1550, 9);
    expect(rawMealQuantity('', '1.55')).toBeNull();
  });

  it('T8: Method A kiln carbonates + Method B on one clinker process → CE_E_METHOD_MIX', () => {
    const p = proc('P1', { kategorija: 'CEMENT_CLINKER' });
    expect(ceMethodIssues(p, [mat('P1', 'KILN_CARBONATE')], [cli('P1')], []).errors).toEqual(['CE_E_METHOD_MIX']);
    // non-carbonate carbon / urea are allowed with Method B
    expect(ceMethodIssues(p, [mat('P1', 'NON_CARBONATE_CARBON'), mat('P1', 'UREA_DENOX')], [cli('P1')], []).errors).toEqual([]);
    // neither A nor B → warning
    expect(ceMethodIssues(p, [], [], []).warnings).toEqual(['CE_W_NO_CALCINATION']);
  });

  it('Method B / CKD only on clinker processes; OXIDE_OUTPUT only on calcined clay / aluminous cement', () => {
    const cement = proc('P2', { kategorija: 'CEMENT' });
    const ckd: CeCkdRow = { row_id: 'c', process_id: 'P2', kolicina_t: '1', ef_nacin: 'STANDARD', ef_cli: '', d_posto: '' };
    expect(ceMethodIssues(cement, [], [cli('P2')], []).errors).toEqual(['CE_E_METHOD']);
    expect(ceMethodIssues(cement, [], [], [ckd]).errors).toEqual(['CE_E_METHOD']);
    expect(ceMethodIssues(cement, [mat('P2', 'OXIDE_OUTPUT')], [], []).errors).toEqual(['CE_E_METHOD']);
    const clay = proc('P3', { kategorija: 'CALCINED_CLAY' });
    expect(ceMethodIssues(clay, [mat('P3', 'OXIDE_OUTPUT')], [], []).errors).toEqual([]);
    const two = proc('P1', { kategorija: 'CEMENT_CLINKER' });
    expect(ceMethodIssues(two, [], [cli('P1'), { ...cli('P1'), row_id: 'x' }], []).errors).toEqual(['CE_E_METHOD']);
  });
});

describe('precursors (spec §3.3(12), T1, T6, T10g)', () => {
  const p1 = proc('P1', { kategorija: 'CEMENT_CLINKER', proizvodi: [out('2523 10 00', '1255000', '', '2523 10 00 90')] });
  const p2 = proc('P2', { kategorija: 'CEMENT', proizvodi: [out('2523 29 00', '1321052.6315789474', '95')] });

  it('T1: internal clinker precursor from P1 is a valid source, m = 1', () => {
    const r = prec('P2', { izvor: 'INTERNAL_PROCESS', izvorni_process_id: 'P1', kolicina: '1255000' });
    expect(internalSourceOk(r, p1, MAPPING)).toBe(true);
    expect(internalSourceOk({ ...r, taric_code: '2523 10 00 10' }, p1, MAPPING)).toBe(false); // white not produced by P1
    expect(internalSourceOk(r, p2, MAPPING)).toBe(false);
    expect(clinkerMiSum(p2, [r], MAPPING)).toBeCloseTo(1, 9);
  });

  it('T6: purchased clinker 9 100 t for AL 9 000 → m = 1,011111 (no CE_W_MI_BELOW_ONE)', () => {
    const grinding = proc('P1', { kategorija: 'CEMENT', proizvodi: [out('2523 29 00', '10000', '90')] });
    const m = clinkerMiSum(grinding, [prec('P1', { kolicina: '9100' })], MAPPING) as number;
    expect(m).toBeCloseTo(1.011111, 6);
    expect(clinkerMiSum(grinding, [prec('P1', { kolicina: '8000' })], MAPPING)).toBeLessThan(1);
  });

  it('T10(g): P1 → P2 → P1 → CE_E_PRECURSOR_CYCLE', () => {
    const rows = [
      prec('P1', { izvor: 'INTERNAL_PROCESS', izvorni_process_id: 'P2' }),
      prec('P2', { izvor: 'INTERNAL_PROCESS', izvorni_process_id: 'P1' }),
    ];
    expect(findPrecursorCycle(rows)).toEqual(['P1', 'P2', 'P1']);
    expect(findPrecursorCycle([rows[0]])).toBeNull();
  });
});

describe('result view aggregation (spec §3.5, §3.6, T1, T4)', () => {
  const item = (outputCode: string, passCode: string, entryIndex: number, resultValue: number, snap: object = {}): CeResultItemLike => ({
    outputCode, passCode, entryIndex, resultValue, inputSnapshot: JSON.stringify(snap),
  });

  it('T1: 100 t CEM (CK 95): per good 0,78521 / 0,09187 / 0,87708; EE 78,52 / 9,19 / 87,71 t', () => {
    // values as the backend returns them (full precision, spec §8 T1 / T3)
    const snap = { ck_source: 'PRODUCT', process_id: 'P2' };
    const items = [
      item('CE_RESULT_SEE_DIR', 'PRODUCT', 0, 0.78521474103585653, snap),
      item('CE_RESULT_SEE_INDIR', 'PRODUCT', 0, 0.091865, snap),
      item('CE_RESULT_SEE_TOTAL', 'PRODUCT', 0, 0.877080, snap),
      item('CE_RESULT_EMBEDDED_DIR', 'PRODUCT', 0, 78.521474, snap),
      item('CE_RESULT_EMBEDDED_INDIR', 'PRODUCT', 0, 9.1865, snap),
      item('CE_RESULT_EMBEDDED_TOTAL', 'PRODUCT', 0, 87.708, snap),
      item('CE_PROC_AL', 'P2', 1, 1255000),
      item('CE_PROC_SEE_DIR', 'P2', 1, 0.826542),
    ];
    const { products, processes } = groupCementResult(items);
    expect(products.size).toBe(1);
    expect(processes.get('P2')?.values.CE_PROC_AL).toBe(1255000);
    const g = products.get(0)!;
    expect(formatSee(g.values.CE_RESULT_SEE_DIR)).toBe('0.78521');
    expect(formatSee(g.values.CE_RESULT_SEE_INDIR)).toBe('0.09187');
    expect(formatSee(g.values.CE_RESULT_SEE_TOTAL)).toBe('0.87708');
    expect(fuColumnApplicable(g.snap)).toBe(true);
    const tot = cementProductTotals(products);
    expect(tot.direct).toBeCloseTo(78.52, 2);
    expect(tot.indirect).toBeCloseTo(9.19, 2);
    expect(tot.total).toBeCloseTo(87.71, 2);
    expect(roundTonnes(tot.total)).toBe(88);
  });

  it('T4: three products 40 976,5 + 33 816,4 + 50 207,0 t; process items are never summed', () => {
    const items = [
      item('CE_RESULT_EMBEDDED_TOTAL', 'PRODUCT', 0, 40976.5),
      item('CE_RESULT_EMBEDDED_TOTAL', 'PRODUCT', 1, 33816.4),
      item('CE_RESULT_EMBEDDED_TOTAL', 'PRODUCT', 2, 50207.0),
      item('CE_RESULT_SEE_TOTAL', 'PRODUCT', 0, 0.81953),
      item('CE_PROC_DIREM_STAR', 'P1', 0, 125000),
      item('CE_PROC_AL', 'P1', 0, 144900),
    ];
    const { products } = groupCementResult(items);
    expect(products.size).toBe(3);
    expect(cementProductTotals(products).total).toBeCloseTo(125000 - 0.1, 6);
    expect(roundTonnes(cementProductTotals(products).total)).toBe(125000);
  });

  it('per-FU column only for actual results with a clinker content (default path flags fu_not_applicable)', () => {
    expect(fuColumnApplicable({ fu_not_applicable: true, ck_source: 'PRODUCT' })).toBe(false);
    expect(fuColumnApplicable({ ck_source: 'NOT_APPLICABLE' })).toBe(false);
    expect(fuColumnApplicable({ ck_source: 'PROCESS' })).toBe(true);
    expect(formatSee(null)).toBe('—');
    expect(roundTonnes(undefined)).toBeNull();
  });
});
