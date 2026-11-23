import { describe, expect, it } from 'vitest';
import bs from '../../i18n/locales/bs.json';
import en from '../../i18n/locales/en.json';
import tr from '../../i18n/locales/tr.json';
import type { MpField, MpQuestion } from '../../api/monitoringPlan';
import {
  MP_FIELD_KEYS, MP_GROUPS, applyLocal, badgeFor, editorFor, emptyValue, fieldLabelKey, firstOpenGroup,
  groupProgress, mergePatches, nodeLabel, questionsOfGroup,
} from './mpFields';

function field(key: string, value: MpField['value'], origin: MpField['origin'] = 'APP', confirmed = false): MpField {
  return { key, element: 'E02', value, origin, sources: [], confirmed, conflict: false, conflicts: [] };
}

function q(key: string, group: MpQuestion['group'], status: MpQuestion['status'], element = 2): MpQuestion {
  return { key, element, group, status, required: true, appData: true, reason: null };
}

function lookup(tree: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((n, p) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[p] : undefined), tree);
}

describe('badges', () => {
  it('APP = "Preuzeto iz aplikacije", SUGGESTION = "Prijedlog za potvrdu"', () => {
    expect(badgeFor(field('operator.name', 'Panonia'))).toBe('APP');
    expect(badgeFor(field('cement.clinkerSource', 'OWN', 'SUGGESTION'))).toBe('SUGGESTION');
    expect(lookup(bs, 'mp.badge.APP')).toBe('Preuzeto iz aplikacije');
    expect(lookup(bs, 'mp.badge.SUGGESTION')).toBe('Prijedlog za potvrdu');
  });

  it('no badge without a value', () => {
    expect(badgeFor(undefined)).toBeNull();
    expect(badgeFor(field('goods', []))).toBeNull();
    expect(badgeFor(field('installation.address', '  '))).toBeNull();
  });
});

describe('groups', () => {
  const questions = [
    q('operator.name', 'INSTALLATION_PRODUCTS', 'DONE'),
    q('goods', 'INSTALLATION_PRODUCTS', 'CONFIRM', 3),
    q('cement.kilnMethod', 'SOURCES_METHODS', 'NOT_APPLICABLE', 10),
    q('precursors.massTracking', 'MATERIALS_PRECURSORS', 'ASK', 14),
  ];

  it('not-applicable questions are hidden unless asked for', () => {
    expect(questionsOfGroup(questions, 'SOURCES_METHODS', false)).toHaveLength(0);
    expect(questionsOfGroup(questions, 'SOURCES_METHODS', true)).toHaveLength(1);
  });

  it('progress counts only applicable questions', () => {
    expect(groupProgress(questions, 'INSTALLATION_PRODUCTS')).toEqual({ open: 1, done: 1, total: 2 });
    expect(groupProgress(questions, 'SOURCES_METHODS')).toEqual({ open: 0, done: 0, total: 0 });
  });

  it('resume opens the first group with an open question', () => {
    expect(firstOpenGroup(questions)).toBe('INSTALLATION_PRODUCTS');
    expect(firstOpenGroup([q('a', 'CONTROLS', 'DONE')])).toBe('REVIEW');
  });
});

describe('autosave queue', () => {
  it('keeps one change per field, the newest value wins', () => {
    const merged = mergePatches([{ key: 'ccs', value: 'a' }, { key: 'goods', confirmed: true }], [{ key: 'ccs', value: 'ab' }]);
    expect(merged).toEqual([{ key: 'ccs', value: 'ab' }, { key: 'goods', confirmed: true }]);
  });

  it('keeps a confirmation together with a later value change', () => {
    expect(mergePatches([{ key: 'goods', confirmed: true }], [{ key: 'goods', value: [] }]))
      .toEqual([{ key: 'goods', value: [], confirmed: true }]);
  });

  it('a local edit turns the value into a user value and clears the conflict', () => {
    const f = { ...field('installation.address', 'Old 1'), conflict: true, conflicts: [{ value: 'Old 2', sources: [] }] };
    const [out] = applyLocal([f], [{ key: 'installation.address', value: 'New 3' }]);
    expect(out).toMatchObject({ value: 'New 3', origin: 'USER', conflict: false, confirmed: false });
  });

  it('confirming keeps the origin and the value', () => {
    const [out] = applyLocal([field('operator.name', 'Panonia')], [{ key: 'operator.name', confirmed: true }]);
    expect(out).toMatchObject({ value: 'Panonia', origin: 'APP', confirmed: true });
  });

  it('does not change the input fields', () => {
    const f = field('operator.name', 'Panonia');
    applyLocal([f], [{ key: 'operator.name', value: 'Other' }]);
    expect(f.value).toBe('Panonia');
  });
});

describe('editors', () => {
  it('presence fields start as "none"', () => {
    expect(emptyValue(editorFor('heatFlows'))).toEqual({ present: false, rows: [] });
    expect(emptyValue(editorFor('goods'))).toEqual([]);
    expect(emptyValue(editorFor('control.records'))).toBe('');
  });

  it('choice codes match the codes the backend reads', () => {
    expect(editorFor('cement.clinkerSource')).toEqual({ kind: 'choice', options: ['OWN', 'PURCHASED', 'BOTH'] });
    expect(editorFor('indirect.method')).toEqual({ kind: 'choice', options: ['DEFAULT_GRID', 'ACTUAL'] });
    expect(editorFor('hydrogen.use')).toEqual({ kind: 'choice', options: ['SOLD', 'OWN_AMMONIA', 'OWN_OTHER', 'MIXED'] });
  });

  it('node labels', () => {
    expect(nodeLabel('P:kiln')).toBe('kiln');
    expect(nodeLabel('SUPPLIER:Klinker d.o.o.|RS')).toBe('Klinker d.o.o. (RS)');
    expect(nodeLabel('OUT:DELIVERED')).toBe('DELIVERED');
    const tl = (k: string, f: string) => ({ 'mp.node.DELIVERED': 'Delivered goods', 'mp.node.ELECTRICITY': 'Electricity', 'mp.node.src.GRID': 'Grid' } as Record<string, string>)[k] ?? f;
    expect(nodeLabel('OUT:DELIVERED', tl)).toBe('Delivered goods');
    expect(nodeLabel('ELECTRICITY:GRID|BA', tl)).toBe('Electricity: Grid (BA)');
  });
});

describe('texts in BS / EN / TR', () => {
  const locales = { bs, en, tr };
  const required = [
    ...MP_FIELD_KEYS.map(fieldLabelKey),
    ...MP_GROUPS.map((g) => `mp.group.${g}`),
    ...['ASK', 'CONFIRM', 'CONFLICT', 'DONE', 'NOT_APPLICABLE'].map((s) => `mp.status.${s}`),
    ...['APP', 'SUGGESTION', 'USER'].map((s) => `mp.badge.${s}`),
    ...Array.from({ length: 22 }, (_, i) => `mp.element.${i + 1}`),
    ...MP_FIELD_KEYS.flatMap((k) => {
      const e = editorFor(k);
      return e.kind === 'choice' ? e.options.map((o) => `mp.option.${o}`) : [];
    }),
  ];

  it.each(Object.entries(locales))('%s has every monitoring plan label', (_, tree) => {
    required.forEach((key) => expect(typeof lookup(tree, key), key).toBe('string'));
  });
});
