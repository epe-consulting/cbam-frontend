import type { MpDiagram } from '../../api/monitoringPlan';
import { nodeLabel, type NodeTl } from './mpFields';

/*
 * Process diagram (IR 2025/2547 Annex II A.5 el. 13: diagram of the installation with system
 * boundaries). Input is the backend diagram, which holds only confirmed links
 * (MpDiagramBuilder). Pure layout, no regulatory content.
 *
 * Layout: columns from left to right by the longest path from an input. Nodes that only receive
 * (delivered goods, export partners) go to the last column. Process nodes sit inside one dashed
 * "installation boundary" box.
 */

export interface PlacedNode {
  id: string;
  kind: string;
  label: string;
  col: number;
  row: number;
  x: number;
  y: number;
}

export interface Layout {
  nodes: PlacedNode[];
  edges: { from: PlacedNode; to: PlacedNode; type: string; material: string | null }[];
  width: number;
  height: number;
  boundary: { x: number; y: number; w: number; h: number } | null;
}

export const NODE_W = 180;
export const NODE_H = 48;
const COL_GAP = 90;
const ROW_GAP = 34;
const PAD = 30;
const TOP = 46;

export function layoutDiagram(d: MpDiagram, tl?: NodeTl): Layout {
  const ids = d.nodes.map((n) => n.id);
  const out = new Map<string, string[]>();
  const indeg = new Map<string, number>(ids.map((id) => [id, 0]));
  d.edges.forEach((e) => {
    out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  });

  // Longest-path depth; a cycle (should not occur) is cut by the visiting guard.
  const depth = new Map<string, number>();
  const visit = (id: string, d0: number, seen: Set<string>) => {
    if (seen.has(id)) return;
    if ((depth.get(id) ?? -1) >= d0) return;
    depth.set(id, d0);
    const next = new Set(seen).add(id);
    (out.get(id) ?? []).forEach((n) => visit(n, d0 + 1, next));
  };
  ids.filter((id) => (indeg.get(id) ?? 0) === 0).forEach((id) => visit(id, 0, new Set()));
  ids.forEach((id) => {
    if (!depth.has(id)) visit(id, 0, new Set());
  });

  const kindOf = new Map(d.nodes.map((n) => [n.id, n.kind]));
  const maxProcessDepth = Math.max(0, ...ids.filter((id) => kindOf.get(id) === 'PROCESS').map((id) => depth.get(id) ?? 0));
  const sinkCol = maxProcessDepth + 1;
  ids.forEach((id) => {
    const isSink = (out.get(id) ?? []).length === 0;
    if (kindOf.get(id) !== 'PROCESS' && isSink && (indeg.get(id) ?? 0) > 0) depth.set(id, Math.max(depth.get(id) ?? 0, sinkCol));
  });

  const cols = new Map<number, string[]>();
  ids.forEach((id) => {
    const c = depth.get(id) ?? 0;
    cols.set(c, [...(cols.get(c) ?? []), id]);
  });
  const usedCols = [...cols.keys()].sort((a, b) => a - b);
  const maxRows = Math.max(1, ...[...cols.values()].map((c) => c.length));
  const placed = new Map<string, PlacedNode>();
  usedCols.forEach((c, ci) => {
    const col = cols.get(c) ?? [];
    const offset = ((maxRows - col.length) * (NODE_H + ROW_GAP)) / 2;
    col.forEach((id, r) => {
      const n = d.nodes.find((x) => x.id === id);
      placed.set(id, {
        id, kind: n?.kind ?? 'OTHER', label: nodeLabel(id, tl), col: ci, row: r,
        x: PAD + ci * (NODE_W + COL_GAP), y: TOP + offset + r * (NODE_H + ROW_GAP),
      });
    });
  });

  const nodes = [...placed.values()];
  const processes = nodes.filter((n) => n.kind === 'PROCESS');
  const boundary = processes.length
    ? {
      x: Math.min(...processes.map((n) => n.x)) - 16,
      y: Math.min(...processes.map((n) => n.y)) - 26,
      w: Math.max(...processes.map((n) => n.x)) - Math.min(...processes.map((n) => n.x)) + NODE_W + 32,
      h: Math.max(...processes.map((n) => n.y)) - Math.min(...processes.map((n) => n.y)) + NODE_H + 42,
    }
    : null;
  return {
    nodes,
    edges: d.edges.flatMap((e) => {
      const from = placed.get(e.from);
      const to = placed.get(e.to);
      return from && to ? [{ from, to, type: e.type, material: e.material }] : [];
    }),
    width: Math.max(320, PAD * 2 + usedCols.length * NODE_W + Math.max(0, usedCols.length - 1) * COL_GAP),
    height: Math.max(140, TOP + maxRows * NODE_H + (maxRows - 1) * ROW_GAP + PAD),
    boundary,
  };
}

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Splits a label into at most two lines that fit a node box. */
export function wrapLabel(s: string, max = 24): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  words.forEach((w) => {
    if ((cur ? `${cur} ${w}` : w).length <= max) cur = cur ? `${cur} ${w}` : w;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  });
  if (cur) lines.push(cur);
  if (lines.length > 2) return [lines[0], `${lines.slice(1).join(' ').slice(0, max - 1)}…`];
  return lines.map((l) => (l.length > max ? `${l.slice(0, max - 1)}…` : l));
}

const FILL: Record<string, string> = {
  PROCESS: '#E8F5EF',
  SUPPLIER: '#F4E8C9',
  OUTPUT: '#EBF2FF',
  ELECTRICITY_SOURCE: '#FFF6D6',
  PARTNER_INSTALLATION: '#F3EEF9',
  OTHER: '#F2F2F2',
};

/**
 * Standalone SVG (fixed colours, so it also prints and exports the same way).
 * Text is escaped; labels come from plan data.
 */
export function diagramSvg(d: MpDiagram, labels: { boundary: string; empty: string; tl?: NodeTl }): string {
  const L = layoutDiagram(d, labels.tl);
  const font = "font-family=\"Helvetica, Arial, sans-serif\"";
  if (L.nodes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="80" viewBox="0 0 420 80"><rect width="420" height="80" fill="#ffffff"/><text x="210" y="44" text-anchor="middle" ${font} font-size="13" fill="#6B8F82">${escapeXml(labels.empty)}</text></svg>`;
  }
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${L.width}" height="${L.height}" viewBox="0 0 ${L.width} ${L.height}">`);
  parts.push('<defs><marker id="mp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#3A7D6A"/></marker></defs>');
  parts.push(`<rect width="${L.width}" height="${L.height}" fill="#ffffff"/>`);
  if (L.boundary) {
    const b = L.boundary;
    parts.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10" fill="none" stroke="#0B4F3E" stroke-width="1.4" stroke-dasharray="6 4"/>`);
    parts.push(`<text x="${b.x + 8}" y="${b.y + 16}" ${font} font-size="11" font-weight="bold" fill="#0B4F3E">${escapeXml(labels.boundary)}</text>`);
  }
  L.edges.forEach((e) => {
    const x1 = e.from.x + NODE_W;
    const y1 = e.from.y + NODE_H / 2;
    const backwards = e.to.x <= e.from.x;
    const x2 = backwards ? e.to.x + NODE_W / 2 : e.to.x;
    const y2 = backwards ? e.to.y + (e.to.y > e.from.y ? 0 : NODE_H) : e.to.y + NODE_H / 2;
    const mx = (x1 + x2) / 2;
    parts.push(`<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" fill="none" stroke="#3A7D6A" stroke-width="1.5" marker-end="url(#mp-arrow)"/>`);
    if (e.material) {
      const t = e.material.length > 26 ? `${e.material.slice(0, 25)}…` : e.material;
      parts.push(`<text x="${mx}" y="${(y1 + y2) / 2 - 5}" text-anchor="middle" ${font} font-size="10" fill="#3D5A50">${escapeXml(t)}</text>`);
    }
  });
  L.nodes.forEach((n) => {
    parts.push(`<rect x="${n.x}" y="${n.y}" width="${NODE_W}" height="${NODE_H}" rx="8" fill="${FILL[n.kind] ?? FILL.OTHER}" stroke="#9FBFB2" stroke-width="1"/>`);
    const lines = wrapLabel(n.label);
    lines.forEach((line, i) => {
      const y = n.y + NODE_H / 2 + 4 + (i - (lines.length - 1) / 2) * 14;
      parts.push(`<text x="${n.x + NODE_W / 2}" y="${y}" text-anchor="middle" ${font} font-size="12" fill="#1A2B25">${escapeXml(line)}</text>`);
    });
  });
  parts.push('</svg>');
  return parts.join('');
}
