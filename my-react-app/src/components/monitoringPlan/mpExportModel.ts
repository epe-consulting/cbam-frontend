import type { MpDiagram, MpField, MpIssue, MpJson, MpLink, MpPlanView, MpQuestion, MpStatus } from '../../api/monitoringPlan';
import { tr, withLanguage } from '../../i18n';
import { fieldLabelKey, hasValue, nodeLabel } from './mpFields';

/*
 * Export model of a monitoring plan (draft or confirmed version), always in English:
 * IR 2025/2547 Art. 5(6) (p. 8): the monitoring plan is drawn up in English. The document lists
 * the 22 minimum elements of Annex II point A.5 (pp. 31-33) in order, so every element appears,
 * also when it does not apply or has no content yet.
 */

export type ExportValue =
  | { kind: 'empty' }
  | { kind: 'text'; text: string }
  | { kind: 'table'; columns: string[]; rows: string[][] };

export interface ExportItem {
  key: string;
  label: string;
  value: ExportValue;
  /** "Taken from the app" / "Suggestion to confirm" / "Entered manually". */
  origin: string | null;
  sources: string[];
  /** Draft only: open status of the question (to answer / to confirm / conflict). */
  open: MpStatus | null;
  required: boolean;
}

export interface ExportElement {
  no: number;
  title: string;
  items: ExportItem[];
  /** Text shown when the element has no item. */
  emptyNote: string | null;
}

export interface ExportModel {
  kind: 'DRAFT' | 'VERSION';
  title: string;
  installation: string;
  operator: string;
  versionNo: number;
  ruleVersion: string;
  /** Date of the confirmation (version) or of the export (draft), ISO yyyy-mm-dd. */
  date: string;
  statusLine: string;
  verificationNote: string;
  openItems: { element: number; label: string; status: MpStatus; required: boolean }[];
  elements: ExportElement[];
  diagram: MpDiagram;
  links: { from: string; to: string; type: string; material: string; confirmed: boolean }[];
  warnings: { severity: string; text: string; source: string }[];
}

/** Snapshot JSON written at confirmation (backend MpPlanLogic.snapshot). */
export interface MpSnapshot {
  planId: number;
  versionNo: number;
  ruleVersion: string;
  status: string;
  verificationNote: string;
  confirmedAt: string;
  fields: MpField[];
  links: MpLink[];
  diagram: MpDiagram;
  warnings: MpIssue[];
}

const OPEN: readonly MpStatus[] = ['ASK', 'CONFIRM', 'CONFLICT'];

function en(key: string, options?: Record<string, unknown>): string {
  return withLanguage('en', () => tr(key, options));
}

/** English node names for links and the diagram. */
export const enNode = (key: string, fallback: string) => en(key, { defaultValue: fallback });

function elementNo(f: MpField): number {
  const n = Number(String(f.element).replace(/^E0?/, ''));
  return Number.isFinite(n) ? n : 0;
}

function scalar(v: MpJson): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? en('mp.yes') : en('mp.no');
  if (typeof v === 'string') return en(`mp.option.${v}`, { defaultValue: v });
  return String(v);
}

/** Compact one-line text of a nested value (table cells). */
export function cellText(v: MpJson): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(cellText).filter((s) => s !== '').join('; ');
  if (typeof v === 'object') {
    return Object.entries(v)
      .filter(([, x]) => hasValue(x))
      .map(([k, x]) => `${en(`mp.col.${k}`, { defaultValue: k })}: ${cellText(x)}`)
      .join(', ');
  }
  if (typeof v === 'string' && v.startsWith('P:')) return nodeLabel(v, enNode);
  return scalar(v);
}

function table(rows: MpJson[]): ExportValue {
  const objects = rows.filter((r): r is { [k: string]: MpJson } => r !== null && typeof r === 'object' && !Array.isArray(r));
  if (objects.length !== rows.length) return { kind: 'text', text: rows.map(cellText).join('\n') };
  const cols: string[] = [];
  objects.forEach((r) => Object.keys(r).forEach((k) => {
    if (!cols.includes(k) && objects.some((o) => hasValue(o[k]))) cols.push(k);
  }));
  return {
    kind: 'table',
    columns: cols.map((c) => en(`mp.col.${c}`, { defaultValue: c })),
    rows: objects.map((r) => cols.map((c) => cellText(r[c] ?? null))),
  };
}

/** Value of a plan field as document content. */
export function exportValue(v: MpJson | undefined): ExportValue {
  if (v === undefined || !hasValue(v)) return { kind: 'empty' };
  if (Array.isArray(v)) return table(v);
  if (typeof v === 'object' && v !== null) {
    if ('present' in v && typeof v.present === 'boolean') {
      const rows = Array.isArray(v.rows) ? v.rows : [];
      if (!v.present) return { kind: 'text', text: en('mp.notPresent') };
      return rows.length ? table(rows) : { kind: 'text', text: en('mp.present') };
    }
    const lines = Object.entries(v)
      .filter(([, x]) => hasValue(x))
      .map(([k, x]) => `${en(`mp.col.${k}`, { defaultValue: k })}: ${cellText(x)}`);
    return lines.length ? { kind: 'text', text: lines.join('\n') } : { kind: 'empty' };
  }
  return { kind: 'text', text: scalar(v) };
}

function sourceLines(f: MpField | undefined): string[] {
  return (f?.sources ?? []).map((s) => {
    const head = [s.type, s.id != null ? `#${s.id}` : null, s.code].filter(Boolean).join(' ');
    return s.label ? `${head}: ${s.label}` : head;
  });
}

function item(key: string, f: MpField | undefined, q: MpQuestion | null): ExportItem {
  const value = exportValue(f?.value);
  return {
    key,
    label: en(fieldLabelKey(key)),
    value,
    origin: f && value.kind !== 'empty' ? en(`mp.badge.${f.origin}`) : null,
    sources: sourceLines(f),
    open: q && OPEN.includes(q.status) ? q.status : null,
    required: q?.required ?? false,
  };
}

function links(ls: MpLink[]): ExportModel['links'] {
  return ls.map((l) => ({
    from: nodeLabel(l.from, enNode), to: nodeLabel(l.to, enNode), type: en(`mp.flow.${l.type}`, { defaultValue: l.type }),
    material: [l.material, l.cnCode ? `CN ${l.cnCode}` : null].filter(Boolean).join(', '), confirmed: l.confirmed,
  }));
}

function warnings(issues: MpIssue[]): ExportModel['warnings'] {
  return issues.map((i) => ({
    severity: i.severity, text: `${en(`mp.issue.${i.code}`, { defaultValue: i.code })}: ${i.subject}`, source: i.source,
  }));
}

function text(fields: Map<string, MpField>, key: string): string {
  const v = fields.get(key)?.value;
  return typeof v === 'string' ? v : '';
}

function elementsOf(items: Map<number, ExportItem[]>, emptyNote: (no: number) => string): ExportElement[] {
  return Array.from({ length: 22 }, (_, i) => {
    const no = i + 1;
    const its = items.get(no) ?? [];
    return { no, title: en(`mp.element.${no}`), items: its, emptyNote: its.length ? null : emptyNote(no) };
  });
}

/** Draft export: applicable questions only, open items marked. */
export function draftModel(view: MpPlanView, today: string): ExportModel {
  const fields = new Map(view.fields.map((f) => [f.key, f]));
  const byElement = new Map<number, ExportItem[]>();
  const add = (no: number, it: ExportItem) => byElement.set(no, [...(byElement.get(no) ?? []), it]);
  add(1, { key: 'plan.date', label: en(fieldLabelKey('plan.date')), value: { kind: 'text', text: en('mp.export.draftDate', { date: today }) }, origin: null, sources: [], open: null, required: false });
  add(1, { key: 'plan.version', label: en(fieldLabelKey('plan.version')), value: { kind: 'text', text: String(view.plan.versionNo) }, origin: null, sources: [], open: null, required: false });
  const applicable = view.questions.filter((q) => q.status !== 'NOT_APPLICABLE').slice().sort((a, b) => a.element - b.element);
  applicable.forEach((q) => add(q.element, item(q.key, fields.get(q.key), q)));
  const open = applicable.filter((q) => OPEN.includes(q.status));
  return {
    kind: 'DRAFT',
    title: en('mp.export.title'),
    installation: text(fields, 'installation.name'),
    operator: text(fields, 'operator.name'),
    versionNo: view.plan.versionNo,
    ruleVersion: view.plan.ruleVersion,
    date: today,
    statusLine: en('mp.export.draftStatus', { n: open.length }),
    verificationNote: view.verificationNote,
    openItems: open.map((q) => ({ element: q.element, label: en(fieldLabelKey(q.key)), status: q.status, required: q.required })),
    elements: elementsOf(byElement, () => en('mp.export.notApplicable')),
    diagram: view.diagram,
    links: links(view.links),
    warnings: warnings(view.issues),
  };
}

/** Export of a confirmed version from its stored snapshot (never from the current data). */
export function versionModel(s: MpSnapshot): ExportModel {
  const fields = new Map(s.fields.map((f) => [f.key, f]));
  const byElement = new Map<number, ExportItem[]>();
  const date = (text(fields, 'plan.date') || s.confirmedAt || '').slice(0, 10);
  s.fields
    .filter((f) => hasValue(f.value) && f.key !== 'plan.date' && f.key !== 'plan.version')
    .forEach((f) => {
      const no = elementNo(f);
      byElement.set(no, [...(byElement.get(no) ?? []), item(f.key, f, null)]);
    });
  byElement.set(1, [
    { key: 'plan.date', label: en(fieldLabelKey('plan.date')), value: { kind: 'text', text: date }, origin: null, sources: [], open: null, required: false },
    { key: 'plan.version', label: en(fieldLabelKey('plan.version')), value: { kind: 'text', text: String(s.versionNo) }, origin: null, sources: [], open: null, required: false },
  ]);
  return {
    kind: 'VERSION',
    title: en('mp.export.title'),
    installation: text(fields, 'installation.name'),
    operator: text(fields, 'operator.name'),
    versionNo: s.versionNo,
    ruleVersion: s.ruleVersion,
    date,
    statusLine: en('mp.export.versionStatus', { n: s.versionNo, date }),
    verificationNote: s.verificationNote,
    openItems: [],
    elements: elementsOf(byElement, () => en('mp.export.noContent')),
    diagram: s.diagram,
    links: links(s.links),
    warnings: warnings(s.warnings ?? []),
  };
}

export function parseSnapshot(json: string): MpSnapshot {
  return JSON.parse(json) as MpSnapshot;
}

export function exportFileName(m: ExportModel, ext: 'pdf' | 'docx'): string {
  const safe = (m.installation || 'installation')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '');
  return m.kind === 'DRAFT'
    ? `Monitoring-plan-${safe}-v${m.versionNo}-DRAFT-${m.date}.${ext}`
    : `Monitoring-plan-${safe}-v${m.versionNo}.${ext}`;
}
