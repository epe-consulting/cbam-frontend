import type { MpField, MpGroup, MpJson, MpOrigin, MpPatch, MpQuestion, MpSourceRef, MpStatus } from '../../api/monitoringPlan';

/*
 * Pure helpers of the monitoring plan wizard. The rules about which question applies and whether it
 * is open come only from the backend (MpApplicabilityEngine); this file only decides how a value is
 * shown and edited. It holds no regulatory values.
 */

/** Wizard groups in display order (backend MpGroup; element 1, date and version, is in REVIEW). */
export const MP_GROUPS: readonly MpGroup[] = [
  'INSTALLATION_PRODUCTS',
  'PROCESSES_BOUNDARIES',
  'MATERIALS_PRECURSORS',
  'SOURCES_METHODS',
  'CONTROLS',
  'REVIEW',
];

/** All plan field keys (mirror of backend MpFieldKey; the locale test checks each has a label). */
export const MP_FIELD_KEYS = [
  'plan.date', 'plan.version',
  'operator.name', 'operator.registrationNumber', 'operator.contactPerson', 'operator.country',
  'installation.name', 'installation.address', 'installation.country', 'installation.unLocode',
  'installation.coordinates', 'installation.registryId', 'installation.processDescription',
  'goods', 'goods.clinkerContent', 'goods.nitrogenContent',
  'processes', 'nonCbamGoods', 'benchmarks',
  'methods.calculation', 'methods.measurementSystems', 'calcFactors.sampling',
  'sourceStreams', 'sourceStreams.methods', 'measurementBased', 'nitricAcid.n2oSources', 'pfc.method',
  'boundaries.description',
  'precursors', 'precursors.massTracking', 'cement.clinkerSource', 'cement.kilnMethod', 'hydrogen.use',
  'zeroRatedFuels', 'heatFlows', 'heatFlows.partners',
  'electricity.ownProduction', 'electricity.ownProductionDetails', 'electricity.consumption',
  'indirect.method', 'indirect.actualEvidence', 'electricity.asGood',
  'electricityImport.method', 'electricityImport.actualEvidence',
  'wasteGases', 'wasteGases.partners', 'ccs', 'urea.co2Received',
  'control.qaEquipment', 'control.riskAssessment', 'control.itQa', 'control.segregation',
  'control.internalReview', 'control.corrections', 'control.outsourced', 'control.records',
] as const;

/** i18n key segment for a field key ("goods.clinkerContent" → "goods_clinkerContent"). */
export function fieldLabelKey(key: string): string {
  return `mp.field.${key.replace(/\./g, '_')}`;
}

export type FieldEditor =
  | { kind: 'text' }
  | { kind: 'longtext' }
  | { kind: 'choice'; options: readonly string[] }
  | { kind: 'rows'; columns: readonly string[] }
  | { kind: 'presence'; columns: readonly string[] };

/*
 * Choice values are the codes the backend reads (MpApplicabilityEngine.profile, MpPrefillEngine):
 * cement.clinkerSource OWN / PURCHASED / BOTH (2025/2547 Annex I 3.3, 3.4);
 * hydrogen.use (Annex I 3.6.1; Art. 4(9)); indirect.method (Annex II D.4);
 * electricityImport.method (Annex II D.2); cement.kilnMethod A (input based) / B (output based)
 * (2025/2547 Annex II B.3.1.2; B.9.2.1 / B.9.2.2 for cement clinker).
 */
const EDITORS: Record<string, FieldEditor> = {
  'operator.name': { kind: 'text' },
  'operator.registrationNumber': { kind: 'text' },
  'operator.contactPerson': { kind: 'text' },
  'operator.country': { kind: 'text' },
  'installation.name': { kind: 'text' },
  'installation.address': { kind: 'text' },
  'installation.country': { kind: 'text' },
  'installation.unLocode': { kind: 'text' },
  'installation.coordinates': { kind: 'text' },
  'installation.registryId': { kind: 'text' },
  goods: { kind: 'rows', columns: ['cn', 'name', 'category', 'functionalUnit'] },
  processes: { kind: 'rows', columns: ['key', 'name', 'category', 'routes', 'method', 'outputs'] },
  sourceStreams: { kind: 'rows', columns: ['processKey', 'kind', 'name', 'factorSource', 'biomassPct'] },
  precursors: {
    kind: 'rows',
    columns: ['processKey', 'cn', 'category', 'source', 'sourceProcessKey', 'supplierInstallation', 'country'],
  },
  'electricity.consumption': { kind: 'rows', columns: ['processKey', 'mwh', 'source', 'country'] },
  heatFlows: { kind: 'presence', columns: ['processKey', 'direction', 'quantityTj', 'method'] },
  'electricity.ownProduction': { kind: 'presence', columns: ['processKey', 'mwh'] },
  wasteGases: { kind: 'presence', columns: ['processKey', 'direction', 'gas'] },
  'cement.clinkerSource': { kind: 'choice', options: ['OWN', 'PURCHASED', 'BOTH'] },
  'cement.kilnMethod': { kind: 'choice', options: ['A', 'B'] },
  'hydrogen.use': { kind: 'choice', options: ['SOLD', 'OWN_AMMONIA', 'OWN_OTHER', 'MIXED'] },
  'indirect.method': { kind: 'choice', options: ['DEFAULT_GRID', 'ACTUAL'] },
  'electricityImport.method': { kind: 'choice', options: ['DEFAULT', 'ACTUAL'] },
};

/** Editor for an empty field. A prefilled value is edited in its own shape (see JsonValueEditor). */
export function editorFor(key: string): FieldEditor {
  return EDITORS[key] ?? { kind: 'longtext' };
}

/** Empty value the editor starts from. */
export function emptyValue(editor: FieldEditor): MpJson {
  switch (editor.kind) {
    case 'rows':
      return [];
    case 'presence':
      return { present: false, rows: [] };
    default:
      return '';
  }
}

export function emptyRow(columns: readonly string[]): { [k: string]: MpJson } {
  const row: { [k: string]: MpJson } = {};
  columns.forEach((c) => {
    row[c] = '';
  });
  return row;
}

export function hasValue(v: MpJson | undefined): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}

export type Badge = 'APP' | 'SUGGESTION' | 'USER' | null;

/**
 * Badge next to a value: "Preuzeto iz aplikacije" (APP), "Prijedlog za potvrdu" (SUGGESTION),
 * "Uneseno ručno" (USER). No badge when there is no value.
 */
export function badgeFor(field: MpField | undefined): Badge {
  if (!field || !hasValue(field.value)) return null;
  return field.origin as MpOrigin;
}

/** Questions of one group in element order. NOT_APPLICABLE ones only when asked for. */
export function questionsOfGroup(questions: MpQuestion[], group: MpGroup, showNotApplicable: boolean): MpQuestion[] {
  return questions
    .filter((q) => q.group === group && (showNotApplicable || q.status !== 'NOT_APPLICABLE'))
    .slice()
    .sort((a, b) => a.element - b.element);
}

const OPEN: readonly MpStatus[] = ['ASK', 'CONFIRM', 'CONFLICT'];

export function isOpen(q: MpQuestion): boolean {
  return OPEN.includes(q.status);
}

export interface GroupProgress {
  open: number;
  done: number;
  total: number;
}

export function groupProgress(questions: MpQuestion[], group: MpGroup): GroupProgress {
  const qs = questions.filter((q) => q.group === group && q.status !== 'NOT_APPLICABLE');
  const open = qs.filter(isOpen).length;
  return { open, done: qs.length - open, total: qs.length };
}

/** The first group that still has an open question (used when a plan is resumed). */
export function firstOpenGroup(questions: MpQuestion[]): MpGroup {
  return MP_GROUPS.find((g) => groupProgress(questions, g).open > 0) ?? 'REVIEW';
}

/**
 * Autosave queue: merges pending changes per key. A later value replaces an earlier one; a later
 * confirmation flag is kept together with the newest value.
 */
export function mergePatches(pending: MpPatch[], next: MpPatch[]): MpPatch[] {
  const byKey = new Map<string, MpPatch>();
  [...pending, ...next].forEach((p) => {
    const prev = byKey.get(p.key);
    const merged: MpPatch = { key: p.key };
    const value = 'value' in p ? p.value : prev?.value;
    const hasVal = 'value' in p || (prev !== undefined && 'value' in prev);
    if (hasVal) merged.value = value;
    const confirmed = p.confirmed !== undefined ? p.confirmed : prev?.confirmed;
    if (confirmed !== undefined) merged.confirmed = confirmed;
    byKey.set(p.key, merged);
  });
  return [...byKey.values()];
}

/** Applies pending changes locally so the screen shows them before the server answers. */
export function applyLocal(fields: MpField[], patches: MpPatch[]): MpField[] {
  const out = fields.map((f) => ({ ...f }));
  patches.forEach((p) => {
    let f = out.find((x) => x.key === p.key);
    if (!f) {
      f = {
        key: p.key, element: '', value: null, origin: 'USER', sources: [], confirmed: false,
        conflict: false, conflicts: [],
      };
      out.push(f);
    }
    if ('value' in p) {
      const changed = JSON.stringify(f.value) !== JSON.stringify(p.value);
      f.value = p.value ?? null;
      if (changed) {
        f.origin = 'USER';
        f.conflict = false;
        f.conflicts = [];
        f.confirmed = p.confirmed ?? false;
      }
    }
    if (p.confirmed !== undefined) f.confirmed = p.confirmed;
  });
  return out;
}

/** Short one-line text of any value (diffs, conflict choices, nested cells). */
export function summarize(v: MpJson | undefined, max = 160): string {
  if (v === null || v === undefined) return '—';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Translator for node names: (i18n key, fallback) → text. */
export type NodeTl = (key: string, fallback: string) => string;
const plainTl: NodeTl = (_k, fallback) => fallback;

/**
 * Diagram / link node label from the backend node id (MpLinkDeriver): "P:kiln" → "kiln",
 * "SUPPLIER:name|country" → "name (country)", "OUT:DELIVERED", "PARTNER:HEAT",
 * "PARTNER:WASTE_GAS" and "ELECTRICITY:<source>|<country>" → translated names.
 */
export function nodeLabel(id: string, tl: NodeTl = plainTl): string {
  const i = id.indexOf(':');
  const prefix = i > 0 ? id.slice(0, i) : '';
  const rest = i > 0 ? id.slice(i + 1) : id;
  const [name, country] = rest.split('|');
  switch (prefix) {
    case 'P':
      return rest;
    case 'SUPPLIER':
      return country ? `${name} (${country})` : name;
    case 'OUT':
      return tl(`mp.node.${rest}`, rest);
    case 'PARTNER':
      return tl(`mp.node.PARTNER_${rest}`, rest);
    case 'ELECTRICITY': {
      const src = tl(`mp.node.src.${name}`, name);
      return `${tl('mp.node.ELECTRICITY', 'Electricity')}: ${src}${country ? ` (${country})` : ''}`;
    }
    default:
      return id;
  }
}

/** One source line: "CALCULATION_ANSWER #123 CE_FUEL_ENTRY: label". */
export function sourceText(s: MpSourceRef): string {
  const parts = [s.type, s.id != null ? `#${s.id}` : null, s.code].filter(Boolean).join(' ');
  return s.label ? `${parts}: ${s.label}` : parts;
}
