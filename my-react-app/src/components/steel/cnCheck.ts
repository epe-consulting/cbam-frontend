import type { IsCnValidation } from '../../api/ironSteel';
import { cnDigits, type StepIssue } from '../../utils/steelSteps';

export type CnCheck =
  | { state: 'ok'; result: IsCnValidation }
  | { state: 'pending' }
  | { state: 'error'; issue: StepIssue };

/** Format check (IS_E_CN_FORMAT) locally, scope check (IS_E_CN_EXCLUDED / IS_E_CN_NOT_CBAM_STEEL) via backend. */
export function checkCn(
  cn: string,
  results: Record<string, IsCnValidation>,
  what: string,
  allowShort = false,
): CnCheck {
  const d = cnDigits(cn);
  const formatOk = allowShort ? /^(\d{4}|\d{6}|\d{8})$/.test(d) : /^\d{8}$/.test(d);
  if (!formatOk) {
    return {
      state: 'error',
      issue: {
        code: 'IS_E_CN_FORMAT',
        message: allowShort
          ? `${what}: CN kod mora imati 4, 6 ili 8 cifara.`
          : `${what}: CN kod mora imati 8 cifara (npr. 7208 51 20).`,
      },
    };
  }
  const r = results[d];
  if (!r) return { state: 'pending' };
  if (!r.ok) {
    const code = r.errorCode ?? 'IS_E_CN_NOT_CBAM_STEEL';
    const text = code === 'IS_E_CN_EXCLUDED'
      ? 'kod je izričito isključen iz CBAM-a (npr. ferosilicij, otpad i lom 7204).'
      : code === 'IS_E_CN_NOT_CBAM_STEEL'
        ? 'kod nije CBAM roba sektora željeza i čelika.'
        : code === 'IS_E_CN_FORMAT'
          ? 'neispravan format CN koda.'
          : (r.message ?? 'provjera nije uspjela.');
    return { state: 'error', issue: { code, message: `${what} (${cn}): ${text}` } };
  }
  return { state: 'ok', result: r };
}
