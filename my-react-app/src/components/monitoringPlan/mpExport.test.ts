import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import i18n from '../../i18n';
import type { MpField, MpPlanView, MpQuestion } from '../../api/monitoringPlan';
import { buildDocx, crc32, documentXml } from './docxWriter';
import { diagramSvg, layoutDiagram, wrapLabel } from './mpDiagram';
import { docxTexts, pageBreaks, planHtml } from './mpExport';
import { draftModel, exportFileName, exportValue, versionModel, type MpSnapshot } from './mpExportModel';

/*
 * Plan exports. The sources have no worked example of a monitoring plan; the data below follows the
 * shape of the cement case "grinding of purchased clinker" from the phase 1 acceptance tests.
 */

function f(key: string, element: string, value: MpField['value'], origin: MpField['origin'] = 'APP', confirmed = true): MpField {
  return { key, element, value, origin, sources: [{ type: 'INSTALLATION', id: 100, code: 'address', label: null }], confirmed, conflict: false, conflicts: [] };
}

function q(key: string, element: number, status: MpQuestion['status'], required = true): MpQuestion {
  return { key, element, group: 'INSTALLATION_PRODUCTS', status, required, appData: true, reason: null };
}

const view: MpPlanView = {
  plan: { id: 7, companyId: 10, installationId: 100, status: 'DRAFT', versionNo: 2, ruleVersion: 'MP-2026-11-23.1' },
  verificationNote: 'Internal confirmation by the operator only; not an independent verification.',
  fields: [
    f('operator.name', 'E02', 'Panonia Test d.o.o.'),
    f('installation.name', 'E02', 'Mlin Čelić & <Đurđevik>'),
    f('goods', 'E03', [{ cn: '2523 29 00', name: 'Portland cement', category: 'CEMENT', functionalUnit: 't' }]),
    f('cement.clinkerSource', 'E04', 'PURCHASED', 'SUGGESTION', false),
    f('heatFlows', 'E16', { present: false, rows: [] }),
  ],
  questions: [
    q('operator.name', 2, 'DONE'),
    q('installation.name', 2, 'DONE'),
    q('goods', 3, 'DONE'),
    q('cement.clinkerSource', 4, 'CONFIRM'),
    q('cement.kilnMethod', 10, 'NOT_APPLICABLE'),
    q('precursors.massTracking', 14, 'ASK'),
    q('heatFlows', 16, 'DONE'),
  ],
  issues: [{ code: 'PROCESS_ROUTE_MISSING', severity: 'WARNING', subject: 'P:mill', source: 'MA Annex I 3.4' }],
  links: [{ key: 'k1', from: 'SUPPLIER:Klinker d.o.o.|RS', to: 'P:mill', type: 'PURCHASED_PRECURSOR', material: 'Cement clinker', cnCode: '2523 10 00', origin: 'APP', sources: [], confirmed: true }],
  diagram: {
    nodes: [
      { id: 'SUPPLIER:Klinker d.o.o.|RS', kind: 'SUPPLIER', label: 'Klinker d.o.o. RS' },
      { id: 'P:mill', kind: 'PROCESS', label: 'mill' },
      { id: 'OUT:DELIVERED', kind: 'OUTPUT', label: 'DELIVERED' },
    ],
    edges: [
      { from: 'SUPPLIER:Klinker d.o.o.|RS', to: 'P:mill', type: 'PURCHASED_PRECURSOR', material: 'Cement clinker' },
      { from: 'P:mill', to: 'OUT:DELIVERED', type: 'GOODS_DELIVERED', material: 'Portland cement' },
    ],
    unconfirmedLinks: 0,
  },
  usedCalculationIds: [5], linkedCalculationIds: [], versions: [1],
};

beforeAll(() => i18n.changeLanguage('bs'));
afterAll(() => i18n.changeLanguage('bs'));

describe('draft export', () => {
  const m = draftModel(view, '2026-11-23');

  it('lists all 22 A.5 elements in order', () => {
    expect(m.elements.map((e) => e.no)).toEqual(Array.from({ length: 22 }, (_, i) => i + 1));
  });

  it('is in English while the app runs in Bosnian', () => {
    expect(m.title).toBe('Monitoring plan');
    expect(m.elements[2].title).toMatch(/^Goods produced by CN code/);
    expect(m.elements[1].items.map((i) => i.label)).toContain('Operator name');
  });

  it('marks the open items and leaves out questions that do not apply', () => {
    expect(m.openItems.map((o) => [o.element, o.status])).toEqual([[4, 'CONFIRM'], [14, 'ASK']]);
    expect(m.elements[3].items.find((i) => i.key === 'cement.clinkerSource')?.open).toBe('CONFIRM');
    expect(m.elements[9].items).toHaveLength(0);
    expect(m.elements[9].emptyNote).toBe('Not applicable to this installation.');
    expect(m.statusLine).toContain('open items marked: 2');
  });

  it('shows values with their origin; codes as readable text', () => {
    const cl = m.elements[3].items.find((i) => i.key === 'cement.clinkerSource');
    expect(cl?.value).toEqual({ kind: 'text', text: 'Purchased clinker only' });
    expect(cl?.origin).toBe('Suggestion to confirm');
    expect(m.elements[15].items[0].value).toEqual({ kind: 'text', text: 'None' });
    const goods = m.elements[2].items[0].value;
    expect(goods.kind === 'table' && goods.columns).toEqual(['CN code', 'Name', 'Category', 'Functional unit']);
  });

  it('element 1 says the draft is not confirmed', () => {
    expect(m.elements[0].items[0].value).toEqual({ kind: 'text', text: 'Draft of 2026-11-23 (not internally confirmed)' });
    expect(exportFileName(m, 'pdf')).toBe('Monitoring-plan-Mlin-Celic-Durdevik-v2-DRAFT-2026-11-23.pdf');
  });
});

describe('confirmed version export', () => {
  const snap: MpSnapshot = {
    planId: 7, versionNo: 1, ruleVersion: 'MP-2026-11-23.1', status: 'INTERNALLY_CONFIRMED',
    verificationNote: 'Internal confirmation by the operator only; not an independent verification.',
    confirmedAt: '2026-11-20T09:00:00Z',
    fields: [f('plan.date', 'E01', '2026-11-20'), f('plan.version', 'E01', 1), f('installation.name', 'E02', 'Mlin Tuzla'),
      f('goods', 'E03', [{ cn: '2523 29 00' }])],
    links: [], diagram: { nodes: [], edges: [], unconfirmedLinks: 0 }, warnings: [],
  };
  const m = versionModel(snap);

  it('uses only the stored snapshot: no open items, date and version from the snapshot', () => {
    expect(m.kind).toBe('VERSION');
    expect(m.openItems).toEqual([]);
    expect(m.elements[0].items.map((i) => i.value)).toEqual([{ kind: 'text', text: '2026-11-20' }, { kind: 'text', text: '1' }]);
    expect(m.statusLine).toBe('Version 1, internally confirmed by the operator on 2026-11-20');
    expect(m.elements[21].emptyNote).toBe('No information recorded in this version.');
    expect(exportFileName(m, 'docx')).toBe('Monitoring-plan-Mlin-Tuzla-v1.docx');
  });
});

describe('values', () => {
  it('nested values become readable cell text', () => {
    const v = exportValue([{ key: 'P:kiln', routes: ['CLINKER_KILN'], outputs: [{ cn: '2523 10 00', quantity: 1000 }] }]);
    expect(v).toEqual({ kind: 'table', columns: ['Process id', 'Routes', 'Outputs'], rows: [['kiln', 'CLINKER_KILN', 'CN code: 2523 10 00, Quantity: 1000']] });
    expect(exportValue('')).toEqual({ kind: 'empty' });
    expect(exportValue(true)).toEqual({ kind: 'text', text: 'Yes' });
  });
});

describe('diagram', () => {
  it('inputs left, processes in the middle, delivered goods right', () => {
    const L = layoutDiagram(view.diagram);
    const col = (id: string) => L.nodes.find((n) => n.id === id)?.col;
    expect([col('SUPPLIER:Klinker d.o.o.|RS'), col('P:mill'), col('OUT:DELIVERED')]).toEqual([0, 1, 2]);
    expect(L.boundary).not.toBeNull();
  });

  it('escapes labels and shows a note without confirmed links', () => {
    const svg = diagramSvg({ nodes: [{ id: 'P:a<b>&"c"', kind: 'PROCESS', label: 'x' }], edges: [], unconfirmedLinks: 0 }, { boundary: 'B', empty: 'E' });
    expect(svg).toContain('a&lt;b&gt;&amp;&quot;c&quot;');
    expect(svg).not.toContain('<b>');
    expect(diagramSvg({ nodes: [], edges: [], unconfirmedLinks: 2 }, { boundary: 'B', empty: 'No links' })).toContain('No links');
  });

  it('long labels wrap into at most two lines', () => {
    expect(wrapLabel('Reduction smelting in an electric furnace for ferro-alloys')).toHaveLength(2);
    expect(wrapLabel('mill')).toEqual(['mill']);
  });
});

describe('PDF page breaks', () => {
  it('never cuts a block in two when it fits on a page', () => {
    const blocks: [number, number][] = [[0, 40], [40, 90], [90, 160], [160, 230], [230, 260]];
    const breaks = pageBreaks(blocks, 260, 100);
    expect(breaks).toEqual([0, 90, 160]);
    breaks.forEach((b) => blocks.forEach(([t, bo]) => expect(b > t && b < bo).toBe(false)));
  });

  it('cuts inside a block only when the block is taller than a page', () => {
    expect(pageBreaks([[0, 250]], 250, 100)).toEqual([0, 100, 200]);
  });
});

describe('DOCX', () => {
  it('CRC-32 check value (PKWARE APPNOTE / ISO 3309)', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  function readZip(bytes: Uint8Array): Map<string, Uint8Array> {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const out = new Map<string, Uint8Array>();
    let p = 0;
    while (dv.getUint32(p, true) === 0x04034b50) {
      const crc = dv.getUint32(p + 14, true);
      const size = dv.getUint32(p + 18, true);
      const nameLen = dv.getUint16(p + 26, true);
      const name = new TextDecoder().decode(bytes.subarray(p + 30, p + 30 + nameLen));
      const data = bytes.subarray(p + 30 + nameLen, p + 30 + nameLen + size);
      expect(crc32(data), name).toBe(crc);
      out.set(name, data);
      p += 30 + nameLen + size;
    }
    expect(dv.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
    expect(dv.getUint16(bytes.length - 22 + 10, true)).toBe(out.size);
    return out;
  }

  it('is a valid package with the Word parts; the image only when there is one', () => {
    const m = draftModel(view, '2026-11-23');
    const noImg = readZip(buildDocx(m, docxTexts(m), null));
    expect([...noImg.keys()]).toEqual(['[Content_Types].xml', '_rels/.rels', 'docProps/core.xml', 'word/document.xml', 'word/styles.xml', 'word/_rels/document.xml.rels']);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const withImg = readZip(buildDocx(m, docxTexts(m), { bytes: png, w: 600, h: 200 }));
    expect(withImg.get('word/media/diagram.png')).toEqual(png);
    expect(new TextDecoder().decode(withImg.get('word/_rels/document.xml.rels'))).toContain('media/diagram.png');
  });

  it('document text is escaped, keeps č/đ and marks open items', () => {
    const m = draftModel(view, '2026-11-23');
    const xml = documentXml(m, docxTexts(m), null);
    expect(xml).toContain('Mlin Čelić &amp; &lt;Đurđevik&gt;');
    expect(xml).not.toContain('<Đurđevik>');
    expect(xml).toContain('[OPEN - to answer]');
    expect(xml).toContain('22. Control system for data quality (a)-(h)');
    expect(xml.match(/<w:p>|<w:p /g)?.length ?? 0).toBeGreaterThan(30);
  });
});

describe('PDF HTML', () => {
  it('holds the diagram and escaped data', () => {
    const html = planHtml(draftModel(view, '2026-11-23'));
    expect(html).toContain('<svg');
    expect(html).toContain('Mlin Čelić &amp; &lt;Đurđevik&gt;');
    expect(html).toContain('DRAFT - not internally confirmed - open items marked: 2');
  });
});
