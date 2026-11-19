import type { IsCnValidation } from '../../api/ironSteel';
import { cnDigits, type StepIssue } from '../../utils/steelSteps';
import { tr } from '../../i18n';

export type CnCheck =
  | { state: 'ok'; result: IsCnValidation }
  | { state: 'pending' }
  | { state: 'error'; issue: StepIssue };

/**
 * Format check (IS_E_CN_FORMAT) locally, scope check (IS_E_CN_EXCLUDED / IS_E_CN_NOT_CBAM_STEEL) and
 * precision check (IS_E_CN_TOO_SHORT) via backend.
 *
 * allowShort = false (declared goods, process outputs, precursors that may get a default value):
 * 4 to 8 digits (5 for the ferro-alloy headings 7202 1 / 7202 4 / 7202 6), and the code must pick
 * one 2025/2621 Annex I value. Since 2026-11-18 (user decision); before, exactly 8 digits.
 * allowShort = true: 4, 6 or 8 digits, no precision check (no default value needed).
 */
export function checkCn(
  cn: string,
  results: Record<string, IsCnValidation>,
  what: string,
  allowShort = false,
): CnCheck {
  const d = cnDigits(cn);
  const formatOk = allowShort ? /^(\d{4}|\d{6}|\d{8})$/.test(d) : /^\d{4,8}$/.test(d);
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
  const tooShort = { code: 'IS_E_CN_TOO_SHORT', message: tr('steel.cn.tooShort', { what, cn }) };
  if (!r.ok && r.errorCode === 'IS_E_CN_TOO_SHORT') {
    return { state: 'error', issue: tooShort };
  }
  // Results fetched with allowShort carry the flag instead of an error (precursors).
  if (r.ok && !allowShort && r.dvSpecific === false) {
    return { state: 'error', issue: tooShort };
  }
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
