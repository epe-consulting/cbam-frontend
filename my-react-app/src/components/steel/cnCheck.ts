import type { IsCnValidation } from '../../api/ironSteel';
import { cnDigits, type StepIssue } from '../../utils/steelSteps';
import { tr } from '../../i18n';

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
          ? tr('steel.cn.eLenShort', { what })
          : tr('steel.cn.eLen8', { what }),
      },
    };
  }
  const r = results[d];
  if (!r) return { state: 'pending' };
  if (!r.ok) {
    const code = r.errorCode ?? 'IS_E_CN_NOT_CBAM_STEEL';
    const text = code === 'IS_E_CN_EXCLUDED'
      ? tr('steel.cn.excluded')
      : code === 'IS_E_CN_NOT_CBAM_STEEL'
        ? tr('steel.cn.notSteel')
        : code === 'IS_E_CN_FORMAT'
          ? tr('steel.cn.badFormat')
          : (r.message ?? tr('steel.cn.checkFailed'));
    return { state: 'error', issue: { code, message: `${what} (${cn}): ${text}` } };
  }
  return { state: 'ok', result: r };
}
