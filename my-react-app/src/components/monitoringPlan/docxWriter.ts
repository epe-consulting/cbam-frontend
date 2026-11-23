import { escapeXml } from './mpDiagram';
import type { ExportModel, ExportValue } from './mpExportModel';

/*
 * Minimal .docx writer (Office Open XML WordprocessingML in a ZIP container, files stored
 * uncompressed). Enough for headings, paragraphs, tables and one PNG image, without a new
 * dependency. Format facts (not CBAM rules): ZIP local / central headers per the PKWARE APPNOTE,
 * CRC-32 polynomial 0xEDB88320, EMU = 914400 per inch = 9525 per pixel at 96 dpi.
 */

// ---------- ZIP (store) ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** ZIP archive with every entry stored (method 0). Fixed timestamp 1980-01-01 00:00. */
export function zipStore(entries: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const DOS_DATE = (0 << 9) | (1 << 5) | 1;
  entries.forEach((e) => {
    const name = enc.encode(e.name);
    const crc = crc32(e.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true);
    local.setUint16(10, 0, true);
    local.setUint16(12, DOS_DATE, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, e.data.length, true);
    local.setUint32(22, e.data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), name, e.data);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, 0, true);
    cd.setUint16(14, DOS_DATE, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, e.data.length, true);
    cd.setUint32(24, e.data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + e.data.length;
  });
  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0));
  let p = 0;
  all.forEach((c) => {
    out.set(c, p);
    p += c.length;
  });
  return out;
}

// ---------- WordprocessingML ----------

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

/** XML-safe text: escapes markup and drops characters XML 1.0 does not allow. */
function x(s: string): string {
  // eslint-disable-next-line no-control-regex
  return escapeXml(s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''));
}

interface RunOpts { bold?: boolean; color?: string; size?: number; italic?: boolean }

function run(text: string, o: RunOpts = {}): string {
  const props = [
    o.bold ? '<w:b/>' : '',
    o.italic ? '<w:i/>' : '',
    o.color ? `<w:color w:val="${o.color}"/>` : '',
    o.size ? `<w:sz w:val="${o.size * 2}"/>` : '',
  ].join('');
  // Line breaks inside a value become <w:br/>.
  const body = text.split('\n').map((l) => `<w:t xml:space="preserve">${x(l)}</w:t>`).join('<w:br/>');
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}${body}</w:r>`;
}

function para(runs: string, style?: string, shade?: string): string {
  const ppr = [style ? `<w:pStyle w:val="${style}"/>` : '', shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>` : ''].join('');
  return `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${runs}</w:p>`;
}

function cell(content: string, header = false, width?: number): string {
  const tcpr = `<w:tcPr>${width ? `<w:tcW w:w="${width}" w:type="dxa"/>` : ''}${header ? '<w:shd w:val="clear" w:color="auto" w:fill="E8F5EF"/>' : ''}</w:tcPr>`;
  return `<w:tc>${tcpr}${para(run(content, { bold: header, size: 9 }))}</w:tc>`;
}

function tableXml(columns: string[], rows: string[][]): string {
  const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map((b) => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="BFD3CA"/>`).join('');
  const head = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${columns.map((c) => cell(c, true)).join('')}</w:tr>`;
  const body = rows.map((r) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${r.map((c) => cell(c)).join('')}</w:tr>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${borders}</w:tblBorders><w:tblLayout w:type="autofit"/></w:tblPr>${head}${body}</w:tbl>${para('')}`;
}

function valueXml(v: ExportValue, emptyText: string): string {
  if (v.kind === 'empty') return para(run(emptyText, { italic: true, color: '6B8F82' }));
  if (v.kind === 'text') return para(run(v.text));
  return tableXml(v.columns, v.rows);
}

function imageXml(widthPx: number, heightPx: number, maxWidthPx = 620): string {
  const scale = Math.min(1, maxWidthPx / widthPx);
  const cx = Math.round(widthPx * scale * 9525);
  const cy = Math.round(heightPx * scale * 9525);
  return `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Process diagram"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="diagram.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

export interface DocxText {
  empty: string;
  openMark: (status: string, required: boolean) => string;
  origin: string;
  sources: string;
  openItemsTitle: string;
  diagramTitle: string;
  linksTitle: string;
  linkColumns: [string, string, string, string, string];
  warningsTitle: string;
  yes: string;
  no: string;
  meta: [string, string][];
}

/** document.xml of the plan. */
export function documentXml(m: ExportModel, t: DocxText, image: { w: number; h: number } | null): string {
  const b: string[] = [];
  if (m.kind === 'DRAFT') b.push(para(run(m.statusLine, { bold: true, color: 'C0392B', size: 12 }), undefined, 'FDEDEC'));
  b.push(para(run(m.title), 'Title'));
  t.meta.forEach(([k, v]) => b.push(para(run(`${k}: `, { bold: true }) + run(v))));
  if (m.kind === 'VERSION') b.push(para(run(m.statusLine, { bold: true, color: '0B4F3E' })));
  b.push(para(run(m.verificationNote, { italic: true, color: '3D5A50' })));

  if (m.openItems.length) {
    b.push(para(run(t.openItemsTitle), 'Heading1'));
    m.openItems.forEach((o) => b.push(para(run(`El. ${o.element} - ${o.label}: ${t.openMark(o.status, o.required)}`, { color: 'C0392B' }))));
  }

  m.elements.forEach((el) => {
    b.push(para(run(`${el.no}. ${el.title}`), 'Heading1'));
    if (el.emptyNote) b.push(para(run(el.emptyNote, { italic: true, color: '6B8F82' })));
    el.items.forEach((it) => {
      const mark = it.open ? run(`  [${t.openMark(it.open, it.required)}]`, { bold: true, color: 'C0392B' }) : '';
      b.push(para(run(it.label) + mark, 'Heading2'));
      b.push(valueXml(it.value, t.empty));
      const meta = [it.origin ? `${t.origin}: ${it.origin}` : null, it.sources.length ? `${t.sources}: ${it.sources.join('; ')}` : null].filter(Boolean).join(' | ');
      if (meta) b.push(para(run(meta, { size: 8, color: '6B8F82' })));
    });
    if (el.no === 13) {
      b.push(para(run(t.diagramTitle), 'Heading2'));
      if (image) b.push(imageXml(image.w, image.h));
      if (m.links.length) {
        b.push(para(run(t.linksTitle), 'Heading2'));
        b.push(tableXml([...t.linkColumns], m.links.map((l) => [l.from, l.to, l.type, l.material, l.confirmed ? t.yes : t.no])));
      }
      if (m.warnings.length) {
        b.push(para(run(t.warningsTitle), 'Heading2'));
        m.warnings.forEach((w) => b.push(para(run(`${w.severity}: ${w.text} (${w.source})`, { color: w.severity === 'ERROR' ? 'C0392B' : '8A6A20' }))));
      }
    }
  });

  const sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W_NS}><w:body>${b.join('')}${sect}</w:body></w:document>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="20"/><w:lang w:val="en-GB"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="160"/></w:pPr><w:rPr><w:b/><w:color w:val="0B4F3E"/><w:sz w:val="40"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="100"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="0B4F3E"/><w:sz w:val="26"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="140" w:after="60"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="1A2B25"/><w:sz w:val="21"/></w:rPr></w:style></w:styles>`;

/** The .docx file bytes. `png` = rendered process diagram, if any. */
export function buildDocx(m: ExportModel, t: DocxText, png: { bytes: Uint8Array; w: number; h: number } | null): Uint8Array {
  const enc = new TextEncoder();
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${png ? '<Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/diagram.png"/>' : ''}</Relationships>`;
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(`${m.title} - ${m.installation}`)}</dc:title><dc:language>en-GB</dc:language></cp:coreProperties>`;
  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: enc.encode(types) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: 'docProps/core.xml', data: enc.encode(core) },
    { name: 'word/document.xml', data: enc.encode(documentXml(m, t, png ? { w: png.w, h: png.h } : null)) },
    { name: 'word/styles.xml', data: enc.encode(STYLES) },
    { name: 'word/_rels/document.xml.rels', data: enc.encode(docRels) },
  ];
  if (png) entries.push({ name: 'word/media/diagram.png', data: png.bytes });
  return zipStore(entries);
}
