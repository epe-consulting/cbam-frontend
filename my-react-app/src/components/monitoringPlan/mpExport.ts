import { tr, withLanguage } from '../../i18n';
import { buildDocx, type DocxText } from './docxWriter';
import { diagramSvg, escapeXml } from './mpDiagram';
import { enNode, exportFileName, type ExportModel, type ExportValue } from './mpExportModel';

/*
 * Browser side of the monitoring plan export: English DOCX and PDF (IR 2025/2547 Art. 5(6), p. 8).
 * The PDF follows the existing report export (GenerateReport.tsx): HTML in a hidden iframe,
 * html2canvas, jsPDF; this keeps č, ć, đ, š, ž, which jsPDF's built-in fonts cannot draw.
 */

function en(key: string, options?: Record<string, unknown>): string {
  return withLanguage('en', () => tr(key, options));
}

export function exportDiagramSvg(m: ExportModel): string {
  return diagramSvg(m.diagram, { boundary: en('mp.diagram.boundary'), empty: en('mp.diagram.empty'), tl: enNode });
}

function meta(m: ExportModel): [string, string][] {
  return [
    [en('mp.export.operator'), m.operator || '-'],
    [en('mp.export.installation'), m.installation || '-'],
    [en('mp.export.version'), String(m.versionNo)],
    [en('mp.export.date'), m.date],
    [en('mp.export.ruleVersion'), m.ruleVersion],
  ];
}

export function docxTexts(m: ExportModel): DocxText {
  return {
    empty: en('mp.export.noValue'),
    openMark: (status, required) => `${en(`mp.export.open.${status}`)}${required ? '' : ` (${en('mp.export.optional')})`}`,
    origin: en('mp.export.origin'),
    sources: en('mp.export.sources'),
    openItemsTitle: en('mp.export.openItems', { n: m.openItems.length }),
    diagramTitle: en('mp.export.diagram'),
    linksTitle: en('mp.export.links'),
    linkColumns: [en('mp.export.linkFrom'), en('mp.export.linkTo'), en('mp.export.linkType'), en('mp.export.linkMaterial'), en('mp.links.confirmed')],
    warningsTitle: en('mp.export.warnings'),
    yes: en('mp.yes'),
    no: en('mp.no'),
    meta: meta(m),
  };
}

function h(s: string): string {
  return escapeXml(s).replace(/\n/g, '<br/>');
}

function valueHtml(v: ExportValue): string {
  if (v.kind === 'empty') return `<p class="muted"><i>${h(en('mp.export.noValue'))}</i></p>`;
  if (v.kind === 'text') return `<p>${h(v.text)}</p>`;
  return `<table><thead><tr>${v.columns.map((c) => `<th>${h(c)}</th>`).join('')}</tr></thead><tbody>${v.rows
    .map((r) => `<tr data-block>${r.map((c) => `<td>${h(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

/** English HTML of the plan (also usable for printing). */
export function planHtml(m: ExportModel): string {
  const t = docxTexts(m);
  const b: string[] = [];
  if (m.kind === 'DRAFT') b.push(`<div class="draft" data-block>${h(m.statusLine)}</div>`);
  b.push(`<h1 data-block>${h(m.title)}</h1>`);
  b.push(`<table class="meta" data-block>${t.meta.map(([k, v]) => `<tr><th>${h(k)}</th><td>${h(v)}</td></tr>`).join('')}</table>`);
  if (m.kind === 'VERSION') b.push(`<p class="ok" data-block>${h(m.statusLine)}</p>`);
  b.push(`<p class="note" data-block>${h(m.verificationNote)}</p>`);
  if (m.openItems.length) {
    b.push(`<h2 data-block>${h(t.openItemsTitle)}</h2>`);
    m.openItems.forEach((o) => b.push(`<p class="open" data-block>El. ${o.element} - ${h(o.label)}: <b>${h(t.openMark(o.status, o.required))}</b></p>`));
  }
  m.elements.forEach((el) => {
    b.push(`<h2 data-block>${el.no}. ${h(el.title)}</h2>`);
    if (el.emptyNote) b.push(`<p class="muted" data-block><i>${h(el.emptyNote)}</i></p>`);
    el.items.forEach((it) => {
      const mark = it.open ? ` <span class="openmark">[${h(t.openMark(it.open, it.required))}]</span>` : '';
      const metaLine = [it.origin ? `${t.origin}: ${it.origin}` : null, it.sources.length ? `${t.sources}: ${it.sources.join('; ')}` : null].filter(Boolean).join(' | ');
      b.push(`<div class="item${it.open ? ' is-open' : ''}"><h3 data-block>${h(it.label)}${mark}</h3>${valueHtml(it.value)}${metaLine ? `<p class="src" data-block>${h(metaLine)}</p>` : ''}</div>`);
    });
    if (el.no === 13) {
      b.push(`<h3 data-block>${h(t.diagramTitle)}</h3><div class="diagram" data-block>${exportDiagramSvg(m)}</div>`);
      if (m.links.length) {
        b.push(`<h3 data-block>${h(t.linksTitle)}</h3>`);
        b.push(valueHtml({ kind: 'table', columns: [...t.linkColumns], rows: m.links.map((l) => [l.from, l.to, l.type, l.material, l.confirmed ? t.yes : t.no]) }));
      }
      if (m.warnings.length) {
        b.push(`<h3 data-block>${h(t.warningsTitle)}</h3>`);
        m.warnings.forEach((w) => b.push(`<p class="${w.severity === 'ERROR' ? 'open' : 'warn'}" data-block>${h(`${w.severity}: ${w.text} (${w.source})`)}</p>`));
      }
    }
  });
  const css = `body{font-family:Helvetica,Arial,sans-serif;color:#1A2B25;font-size:12px;margin:0;padding:36px 44px;width:706px;background:#fff}
h1{color:#0B4F3E;font-size:24px;margin:8px 0 12px}h2{color:#0B4F3E;font-size:16px;margin:22px 0 6px;border-bottom:1px solid #D6E5DD;padding-bottom:4px}
h3{font-size:13px;margin:12px 0 4px}p{margin:3px 0 6px;line-height:1.45}table{border-collapse:collapse;width:100%;margin:4px 0 8px}
th,td{border:1px solid #BFD3CA;padding:4px 6px;text-align:left;vertical-align:top;font-size:11px}th{background:#E8F5EF}
table.meta th{width:170px}.muted{color:#6B8F82}.note{color:#3D5A50;font-style:italic}.src{color:#6B8F82;font-size:10px}
.draft{background:#FDEDEC;color:#C0392B;font-weight:bold;padding:8px 10px;border-radius:6px}.ok{color:#0B4F3E;font-weight:bold}
.open{color:#C0392B}.warn{color:#8A6A20}.openmark{color:#C0392B}.item.is-open{border-left:3px solid #C0392B;padding-left:8px}
.diagram svg{max-width:100%;height:auto}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${h(m.title)}</title><style>${css}</style></head><body>${b.join('')}</body></html>`;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Renders an SVG string to PNG bytes (for the DOCX image). */
async function svgToPng(svg: string): Promise<{ bytes: Uint8Array; w: number; h: number }> {
  const w = Number(/width="(\d+(?:\.\d+)?)"/.exec(svg)?.[1] ?? 600);
  const hgt = Number(/height="(\d+(?:\.\d+)?)"/.exec(svg)?.[1] ?? 300);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('diagram image'));
      img.src = url;
    });
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(hgt * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'));
    return { bytes: new Uint8Array(await blob.arrayBuffer()), w, h: hgt };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportDocx(m: ExportModel): Promise<void> {
  let png: { bytes: Uint8Array; w: number; h: number } | null = null;
  if (m.diagram.nodes.length) png = await svgToPng(exportDiagramSvg(m));
  const bytes = buildDocx(m, docxTexts(m), png);
  download(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), exportFileName(m, 'docx'));
}

/**
 * Page breaks between blocks (headings, paragraphs, table rows), so no line is cut in two.
 * `blocks` are [top, bottom] in canvas pixels, `page` the page height in canvas pixels.
 */
export function pageBreaks(blocks: [number, number][], total: number, page: number): number[] {
  const breaks: number[] = [0];
  let start = 0;
  const sorted = blocks.slice().sort((a, b) => a[0] - b[0]);
  while (total - start > page) {
    const limit = start + page;
    let cut = limit;
    for (const [top, bottom] of sorted) {
      if (top >= limit) break;
      if (bottom > limit && top > start) {
        cut = top;
        break;
      }
    }
    if (cut <= start) cut = limit;
    breaks.push(cut);
    start = cut;
  }
  return breaks;
}

export async function exportPdf(m: ExportModel): Promise<void> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:1200px;border:0;';
  document.body.appendChild(iframe);
  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error('iframe');
    doc.open();
    doc.write(planHtml(m));
    doc.close();
    await new Promise((r) => setTimeout(r, 300));
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
    const body = doc.body;
    const scale = 2;
    const canvas = await html2canvas(body, { scale, backgroundColor: '#ffffff', windowWidth: body.scrollWidth, windowHeight: body.scrollHeight });
    const blocks: [number, number][] = [];
    body.querySelectorAll('[data-block]').forEach((el) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      blocks.push([(r.top + (iframe.contentWindow?.scrollY ?? 0)) * scale, (r.bottom + (iframe.contentWindow?.scrollY ?? 0)) * scale]);
    });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const footer = 10;
    const pagePx = Math.floor(((ph - footer) * canvas.width) / pw);
    const breaks = pageBreaks(blocks, canvas.height, pagePx);
    // Footer in ASCII (built-in font); the page content keeps all characters.
    const label = m.kind === 'DRAFT' ? `DRAFT - not internally confirmed - version ${m.versionNo}` : `Monitoring plan - version ${m.versionNo}`;
    breaks.forEach((top, i) => {
      const bottom = i + 1 < breaks.length ? breaks[i + 1] : canvas.height;
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = bottom - top;
      const ctx = slice.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, top, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      if (i > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, pw, (slice.height * pw) / canvas.width);
      pdf.setFontSize(8);
      pdf.setTextColor(m.kind === 'DRAFT' ? 192 : 107, m.kind === 'DRAFT' ? 57 : 143, m.kind === 'DRAFT' ? 43 : 130);
      pdf.text(`${label}   ${i + 1} / ${breaks.length}`, 12, ph - 5);
    });
    pdf.save(exportFileName(m, 'pdf'));
  } finally {
    iframe.remove();
  }
}
