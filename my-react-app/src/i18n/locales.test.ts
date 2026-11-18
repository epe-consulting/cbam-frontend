import { afterAll, describe, expect, it } from 'vitest';
import bs from './locales/bs.json';
import en from './locales/en.json';
import i18n, { lazyLabels, productCategoryLabel } from './index';

type Tree = { [k: string]: string | string[] | Tree };

function flatKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? flatKeys(v as Tree, `${prefix}${k}.`) : [`${prefix}${k}`]);
}

describe('locale files', () => {
  afterAll(() => i18n.changeLanguage('bs'));

  it('bs and en define exactly the same keys', () => {
    expect(flatKeys(en as Tree).sort()).toEqual(flatKeys(bs as Tree).sort());
  });

  it('no translation is empty', () => {
    for (const tree of [bs, en] as Tree[]) {
      flatKeys(tree).forEach((key) => {
        expect(String(i18n.getResource(tree === bs ? 'bs' : 'en', 'translation', key)).trim(), key).not.toBe('');
      });
    }
  });

  it('lazy labels follow the current language', async () => {
    const labels = lazyLabels('steel.category', ['PIG_IRON']);
    await i18n.changeLanguage('bs');
    expect(labels.PIG_IRON).toBe('Sirovo željezo');
    await i18n.changeLanguage('en');
    expect(labels.PIG_IRON).toBe('Pig iron');
  });

  it('stored category names are only mapped for display, unknown names pass through', async () => {
    await i18n.changeLanguage('bs');
    expect(productCategoryLabel('Iron and Steel')).toBe('Željezo i čelik');
    expect(productCategoryLabel('Something new')).toBe('Something new');
  });
});
