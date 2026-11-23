import { describe, expect, it } from 'vitest';
import {
  al2ParamRows,
  cementParamRows,
  reportSector,
  resultErrorCount,
  sectorGoods,
  sectorPrecursors,
  sectorProcessNames,
  sectorProcessTotals,
  steelParamRows,
  type SectorResultItem,
} from './sectorReport';

// Result item shapes: docs/steel-api-contract.md §4 and docs/cement-api-contract.md §4.
// The report only shows the calculated values, so the expected values are the inputs themselves.

const item = (code: string, value: number, passCode: string, entryIndex: number, snap: object = {}): SectorResultItem => ({
  formulaCode: code,
  outputCode: code,
  passCode,
  entryIndex,
  inputSnapshot: JSON.stringify(snap),
  resultValue: value,
});

const steelSnap = {
  product_name: 'Hot-rolled coil',
  cn_code: '72085120',
  country_of_origin: 'Bosnia and Herzegovina',
  quantity_t: 100,
  data_source: 'ACTUAL',
  process_id: 'P1',
  process_name: 'EAF',
  precursors: [
    { row_id: 'r1', cn_code: '7207 11 11', source: 'INTERNAL', mass_t: 105, see_dir: 0.5, see_indir: 0.1 },
    { row_id: 'r2', cn_code: '7203', source: 'ZERO_EU_EXEMPT', mass_t: 10, see_dir: 0, see_indir: 0 },
    { row_id: 'r3', cn_code: '7201', source: 'DEFAULT_ANNEX_I', mass_t: 20, see_dir: 1.9, see_indir: 0 },
  ],
};

const steelItems: SectorResultItem[] = [
  item('IS_PROC_ATTR_DIR', 50, 'P1', 0),
  item('IS_PROC_ATTR_INDIR', 12, 'P1', 0),
  item('IS_PROC_ATTR_DIR', 30, 'P2', 1),
  item('IS_RESULT_SEE_DIR', 1.234567, 'PRODUCT', 0, steelSnap),
  item('IS_RESULT_SEE_INDIR', 0.1, 'PRODUCT', 0, steelSnap),
  item('IS_RESULT_DEFAULT_SHARE', 14.8, 'PRODUCT', 0, steelSnap),
  // second product of the same process: same precursors, must not be listed twice
  item('IS_RESULT_SEE_DIR', 2, 'PRODUCT', 1, { ...steelSnap, product_name: 'Wire rod', cn_code: '72131000' }),
];

describe('report sector', () => {
  it('follows the category of the calculation', () => {
    expect(reportSector('Aluminium')).toBe('ALUMINIUM');
    expect(reportSector('Iron and Steel')).toBe('STEEL');
    expect(reportSector('Cement')).toBe('CEMENT');
    expect(reportSector('Fertilisers')).toBe('OTHER');
    expect(reportSector(null)).toBe('OTHER');
  });

  it('routes Aluminium II to its own sector, the old Aluminium stays unchanged', () => {
    expect(reportSector('Aluminium II')).toBe('ALUMINIUM_II');
    expect(reportSector('ALUMINIUM_II')).toBe('ALUMINIUM_II');
    expect(reportSector('Aluminium')).toBe('ALUMINIUM');
  });
});

describe('iron and steel report', () => {
  it('lists each product with its SEE (5 decimals), default share and route', () => {
    const goods = sectorGoods('STEEL', steelItems);
    expect(goods).toHaveLength(2);
    expect(goods[0]).toMatchObject({
      description: 'Hot-rolled coil',
      cnCode: '72085120',
      productionRoute: 'EAF',
      quantity: '100',
      countryOfOrigin: 'Bosnia and Herzegovina',
      specificDirectEmbedded: '1.23457',
      specificIndirectEmbedded: '0.10000',
      shareDefaultValues: '14.8 %',
    });
    expect(goods[1].description).toBe('Wire rod');
  });

  it('lists precursors once, with actual / default / zero-origin', () => {
    const pr = sectorPrecursors('STEEL', steelItems);
    expect(pr).toHaveLength(3);
    expect(pr[0]).toMatchObject({ cnCode: '7207 11 11', valueType: 'actual', quantity: '105', specificDirectEmbedded: '0.50000 direct; 0.10000 indirect' });
    expect(pr[1].valueType).toBe('');
    expect(pr[1].specificDirectEmbedded.startsWith('0 (origin EU')).toBe(true);
    expect(pr[2].valueType).toBe('default');
  });

  it('sums the attributed process emissions (Eq. 55 / 56) and not the product items', () => {
    expect(sectorProcessTotals('STEEL', steelItems)).toEqual({ direct: 80, indirect: 12 });
    expect(sectorProcessTotals('STEEL', steelItems.filter((i) => i.passCode === 'PRODUCT'))).toEqual({ direct: null, indirect: null });
  });

  it('reads the reporting parameters with process names and labels', () => {
    const answers = [
      { questionCode: 'IS_PROCESS_ENTRY', answerValue: JSON.stringify({ process_id: 'P1', naziv: 'EAF', kategorija: 'CRUDE_STEEL' }) },
      { questionCode: 'IS_REPORTING_PARAM_ENTRY', answerValue: JSON.stringify({
        process_id: 'P1', kategorija: '', redukciono_sredstvo: 'COKE', mn_posto: '0.8', cr_posto: '', ni_posto: '',
        ostali_legirni_posto: '0.2', c_posto: '0.1', otpad_t_po_t: '1.1', pre_consumer_otpad_posto: '25',
      }) },
    ];
    const rows = steelParamRows(answers, { category: (c) => `cat:${c}`, reducingAgent: (c) => `ra:${c}` });
    expect(rows).toEqual([{
      process: 'P1 – EAF', category: 'cat:CRUDE_STEEL', reducingAgent: 'ra:COKE', mnPct: '0.8', crPct: '', niPct: '',
      otherAlloyPct: '0.2', carbonPct: '0.1', scrapTPerT: '1.1', preConsumerScrapPct: '25',
    }]);
    expect(sectorProcessNames('STEEL', answers)).toBe('P1 – EAF');
  });

  it('counts result errors', () => {
    expect(resultErrorCount([{ severity: 'ERROR' }, { severity: 'WARNING' }, { severity: 'error' }])).toBe(2);
    expect(resultErrorCount(undefined)).toBe(0);
  });
});

describe('cement report', () => {
  const cementItems: SectorResultItem[] = [
    item('CE_PROC_ATTR_DIR', 700, 'P1', 0),
    item('CE_RESULT_SEE_DIR', 0.62, 'PRODUCT', 0, { product_name: 'CEM II', cn_code: '25232900', category: 'CEMENT', quantity_t: 1000, ck: 0.75 }),
    item('CE_RESULT_CK', 0.75, 'PRODUCT', 0, { product_name: 'CEM II', cn_code: '25232900', category: 'CEMENT', quantity_t: 1000, ck: 0.75 }),
    item('CE_RESULT_SEE_DIR', 0.85, 'PRODUCT', 1, { product_name: 'Clinker', cn_code: '25231000', category: 'CEMENT_CLINKER', quantity_t: 50 }),
    item('CE_RESULT_SEE_DIR', 0.7, 'PRODUCT', 2, { product_name: 'CEM I (default)', taric_code: '2523290000', cn_code: '25232900', category: 'CEMENT', quantity_t: 10 }),
  ];

  it('reports the clinker to cement ratio for cement only (Annex IV point 2)', () => {
    expect(cementParamRows(cementItems)).toEqual([
      { good: 'CEM II', cnCode: '25232900', clinkerToCementPct: '75 %' },
      { good: 'CEM I (default)', cnCode: '2523290000', clinkerToCementPct: '' },
    ]);
  });

  it('lists the goods and the process total', () => {
    expect(sectorGoods('CEMENT', cementItems).map((g) => g.specificDirectEmbedded)).toEqual(['0.62000', '0.85000', '0.70000']);
    expect(sectorProcessTotals('CEMENT', cementItems)).toEqual({ direct: 700, indirect: null });
  });
});

describe('Aluminium II report', () => {
  // docs/aluminium2-api-contract.md §4; values from docs/aluminium2-implementation-spec.md Appendix A (T1, T3, T5).
  const t1Snap = {
    product_name: 'Sheet', cn_code: '7606 11 99', category: 'ALUMINIUM_PRODUCTS', country_of_origin: 'United States', quantity_t: 100,
    data_source: 'ACTUAL', process_id: 'P2', process_name: 'Rolling', indirect_applicable: false,
    precursors: [{ row_id: 'r1', cn_code: '7601 10 10', source: 'INTERNAL', process_id: 'P1', mass_t: 120000, m_i: 1.061947, see_dir: 1.555006616 }],
    reporting_params: { scrap_t_per_t: 0.92, pre_consumer_pct: 20, other_elements_pct: 4.5, other_elements_reported: true },
  };
  const t3Snap = {
    product_name: 'Profile', cn_code: '7604 10 90', category: 'ALUMINIUM_PRODUCTS', country_of_origin: 'Bosnia and Herzegovina', quantity_t: 1000,
    data_source: 'MIXED', process_id: 'P3', process_name: 'Extrusion',
    precursors: [{ row_id: 'r2', cn_code: '7601 10 90', source: 'DEFAULT_ANNEX_I', country: 'Montenegro', mass_t: 10400, see_dir: 1.87 }],
    reporting_params: { scrap_t_per_t: null, pre_consumer_pct: null, other_elements_pct: 0.153, other_elements_reported: false },
  };
  const items: SectorResultItem[] = [
    item('AL2_PROC_ATTR_DIR', 311001.3232, 'P1', 0),
    item('AL2_PROC_ATTR_DIR', 5283.2736, 'P2', 1),
    item('AL2_RESULT_SEE_DIR', 1.698089093, 'PRODUCT', 0, t1Snap),
    item('AL2_RESULT_EMBEDDED_DIR', 169.8089093, 'PRODUCT', 0, t1Snap),
    item('AL2_RESULT_DEFAULT_SHARE', 0, 'PRODUCT', 0, t1Snap),
    item('AL2_RESULT_SEE_DIR', 2.07944, 'PRODUCT', 1, t3Snap),
    item('AL2_RESULT_DEFAULT_SHARE', 93.52518, 'PRODUCT', 1, t3Snap),
  ];

  it('lists the goods with direct SEE only (Annex II)', () => {
    const goods = sectorGoods('ALUMINIUM_II', items);
    expect(goods).toHaveLength(2);
    expect(goods[0]).toMatchObject({
      description: 'Sheet', cnCode: '7606 11 99', productionRoute: 'Rolling', quantity: '100', specificDirectEmbedded: '1.69809',
      specificIndirectEmbedded: '', shareDefaultValues: '0 %', dataSource: 'ACTUAL',
    });
    expect(goods[1]).toMatchObject({ specificDirectEmbedded: '2.07944', shareDefaultValues: '93.52518 %' });
  });

  it('lists precursors with direct SEE only and sums the process totals (no indirect)', () => {
    const pr = sectorPrecursors('ALUMINIUM_II', items);
    expect(pr.map((p) => [p.cnCode, p.valueType, p.specificDirectEmbedded])).toEqual([
      ['7601 10 10', 'actual', '1.55501'],
      ['7601 10 90', 'default', '1.87000'],
    ]);
    const totals = sectorProcessTotals('ALUMINIUM_II', items);
    expect(totals.direct).toBeCloseTo(316284.5968, 4);
    expect(totals.indirect).toBeNull();
  });

  it('reads the aluminium parameters (Annex IV point 2): other elements only above 1 %', () => {
    expect(al2ParamRows(items)).toEqual([
      { good: 'Sheet', cnCode: '7606 11 99', scrapTPerT: '0.92000', preConsumerScrapPct: '20 %', otherElementsPct: '4.5 %', otherElementsReported: true },
      { good: 'Profile', cnCode: '7604 10 90', scrapTPerT: '', preConsumerScrapPct: '', otherElementsPct: '', otherElementsReported: false },
    ]);
    // default path: no reporting parameters in the snapshot
    expect(al2ParamRows([item('AL2_RESULT_SEE_DIR', 1.87, 'PRODUCT', 0, { product_name: 'Slab', cn_code: '7601 10 10' })])).toEqual([]);
  });

  it('names the Aluminium II processes', () => {
    const answers = [
      { questionCode: 'AL2_PROCESS_ENTRY', answerValue: JSON.stringify({ process_id: 'P1', naziv: 'Electrolysis' }) },
      { questionCode: 'AL2_PROCESS_ENTRY', answerValue: JSON.stringify({ process_id: 'P2', naziv: 'Rolling' }) },
      { questionCode: 'CE_PROCESS_ENTRY', answerValue: JSON.stringify({ process_id: 'X', naziv: 'Kiln' }) },
    ];
    expect(sectorProcessNames('ALUMINIUM_II', answers)).toBe('P1 – Electrolysis; P2 – Rolling');
    expect(sectorProcessNames('CEMENT', answers)).toBe('X – Kiln');
  });
});
