import { afterAll, describe, expect, it } from 'vitest';
import i18n, { tr, withLanguage } from '../i18n';
import { labelText, PLANNING_LABEL } from './engine.ts';
import { EXPORTER_WHY_ACTUALS } from './audienceCopy.ts';
import { scopeOf } from './regulatory.ts';

// The cost calculator follows the app language; export files are forced to English.
describe('cost calculator translations', () => {
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('answers in Turkish when the app language is tr', async () => {
    await i18n.changeLanguage('tr');
    expect(labelText(PLANNING_LABEL)).toBe('Planlama senaryosu—doğrulama bekleniyor');
    expect(scopeOf('99999999').note.startsWith("GTİP kodu Ek I'de listelenmemiş.")).toBe(true);
    expect(EXPORTER_WHY_ACTUALS[3].source).toBe('Aşağıdaki hesaplayıcı karşılaştırması');
  });

  it('withLanguage forces English for exports without changing the UI language', async () => {
    await i18n.changeLanguage('bs');
    expect(withLanguage('en', () => tr('cc.e.forecast'))).toBe('Forecast');
    expect(tr('cc.e.forecast')).toBe('Prognoza');
    expect(i18n.language).toBe('bs');
  });
});
