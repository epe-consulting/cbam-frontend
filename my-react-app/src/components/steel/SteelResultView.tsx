import { useEffect, useState, type ReactNode } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { T } from './steelTheme';
import { getAnswerValuesByCode, getQuestionIdsByCode } from '../../api/ironSteel';
import { notSupportedList, categoryLabel, formatCn, parseJsonRows, type SteelProductRow } from '../../utils/steelSteps';
import { lazyLabels } from '../../i18n';
import { useTranslation } from 'react-i18next';

export interface SteelResultItem {
  id: number;
  formulaCode: string;
  outputCode: string | null;
  passCode: string | null;
  entryIndex: number | null;
  expression: string;
  inputSnapshot: string;
  resultValue: number;
}

export interface SteelResultWarning {
  code: string;
  severity: 'ERROR' | 'WARNING' | string;
  message_bs?: string;
  message?: string;
  context?: Record<string, unknown> | null;
}

export interface SteelResult {
  totalEmissions: number | null;
  reportYear: number;
  status: string;
  items: SteelResultItem[];
  warnings?: SteelResultWarning[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Snapshot = Record<string, any>;

function parse(raw: string): Snapshot {
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

const f5 = (v: number | null | undefined) => (v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toFixed(5));
const f1 = (v: number | null | undefined) => (v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toFixed(1));
const tonnes = (v: number | null | undefined) =>
  (v == null || !Number.isFinite(Number(v)) ? '—' : `${Math.round(Number(v)).toLocaleString('bs-BA')} t`);

const DATA_SOURCE_LABEL: Record<string, string> = lazyLabels('steel.res.ds', ['ACTUAL', 'DEFAULT', 'MIXED', 'OUT_OF_SCOPE']);

/** Fallback text when the backend sends no message for the current language. */
const WARNING_FALLBACK: Record<string, string> = lazyLabels('steel.res.warn', ['IS_E_PROCESS_INVALID', 'IS_E_NO_PRODUCTS', 'IS_E_PERIOD']);

const PRECURSOR_SOURCE_LABEL: Record<string, string> = lazyLabels('steel.res.ps', [
  'INTERNAL', 'VERIFIED_SUPPLIER', 'DEFAULT_ANNEX_I', 'DEFAULT_ANNEX_IV', 'ZERO_EU_EXEMPT',
]);

/** [output code, kind]; labels: locale keys steel.res.proc.<code>. */
const PROC_ROWS: [string, 't' | 'see'][] = [
  ['IS_PROC_DIREM_STAR', 't'],
  ['IS_PROC_EMH_IMP', 't'],
  ['IS_PROC_EMH_EXP', 't'],
  ['IS_PROC_WG_IMP', 't'],
  ['IS_PROC_WG_EXP', 't'],
  ['IS_PROC_EMEL_PROD', 't'],
  ['IS_PROC_ATTR_DIR', 't'],
  ['IS_PROC_ATTR_INDIR', 't'],
  ['IS_PROC_AL', 't'],
  ['IS_PROC_PREC_EE_DIR', 't'],
  ['IS_PROC_PREC_EE_INDIR', 't'],
  ['IS_PROC_SEE_DIR', 'see'],
  ['IS_PROC_SEE_INDIR', 'see'],
  ['IS_PROC_SEE_TOTAL', 'see'],
];

const headSx = {
  fontFamily: T.font.body, fontWeight: 600, fontSize: '0.78rem', color: T.color.inkSoft, bgcolor: T.color.cream,
  borderBottom: `1px solid ${T.color.line}`,
};
const cellSx = { fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.ink, borderBottom: `1px solid ${T.color.lineFaint}` };

function Kv({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box>
      <Typography sx={{ fontFamily: T.font.body, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: T.color.muted }}>
        {label}
      </Typography>
      <Typography component="div" sx={{ fontFamily: T.font.body, fontSize: '0.92rem', color: T.color.ink }}>{value}</Typography>
    </Box>
  );
}

function DefaultValueBlock({ dv }: { dv: Snapshot }) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mt: 1 }}>
      <Kv label={t('steel.res.dvTable')} value={dv.table_country ?? dv.country ?? '—'} />
      <Kv label={t('steel.res.dvRow')} value={dv.matched_cn ?? dv.matchedCnCode ?? '—'} />
      <Kv label={t('steel.res.dvValues')} value={`${dv.direct ?? '—'} / ${dv.indirect ?? 'N/A'} / ${dv.total ?? '—'}`} />
      <Kv label={t('steel.res.dvMarkup')} value={t('steel.res.dvMarkupValue', { pct: dv.markup_pct ?? dv.markupPct ?? '—', year: dv.year ?? '—' })} />
      <Kv label={t('steel.res.dvWithMarkup')} value={f5(dv.value ?? dv.valueForYear)} />
      <Kv label={t('steel.res.dvRoute')} value={dv.route ?? dv.bmRoute ?? '—'} />
      <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 2' } }}>
        <Kv label={t('steel.res.source')} value={dv.source ?? '—'} />
      </Box>
    </Box>
  );
}

export function SteelResultView({ calculationId, result }: { calculationId: number | null; result: SteelResult }) {
  const { t, i18n } = useTranslation();
  const isBs = (i18n.resolvedLanguage ?? i18n.language) === 'bs';
  const [products, setProducts] = useState<SteelProductRow[]>([]);
  useEffect(() => {
    if (calculationId == null) return;
    let cancelled = false;
    (async () => {
      try {
        const ids = await getQuestionIdsByCode();
        const values = await getAnswerValuesByCode(calculationId, ids);
        if (!cancelled) setProducts(parseJsonRows<SteelProductRow>(values.CBAM_PRODUCT_ENTRY));
      } catch {
        // product list is only used to show products without results
      }
    })();
    return () => { cancelled = true; };
  }, [calculationId]);

  const warnings = result.warnings ?? [];
  const isError = String(result.status).toUpperCase() === 'ERROR';
  const productItems = result.items.filter((i) => i.passCode === 'PRODUCT');
  const processItems = result.items.filter((i) => i.passCode && i.passCode !== 'PRODUCT');

  const byProduct = new Map<number, { values: Record<string, number>; snap: Snapshot }>();
  productItems.forEach((i) => {
    const idx = i.entryIndex ?? 0;
    const entry = byProduct.get(idx) ?? { values: {}, snap: parse(i.inputSnapshot) };
    if (i.outputCode) entry.values[i.outputCode] = Number(i.resultValue);
    byProduct.set(idx, entry);
  });
  const byProcess = new Map<string, { values: Record<string, number>; snap: Snapshot }>();
  processItems.forEach((i) => {
    const key = i.passCode as string;
    const entry = byProcess.get(key) ?? { values: {}, snap: parse(i.inputSnapshot) };
    if (i.outputCode) entry.values[i.outputCode] = Number(i.resultValue);
    byProcess.set(key, entry);
  });

  const productIndexes = [...new Set([...products.map((_, i) => i), ...byProduct.keys()])].sort((a, b) => a - b);

  return (
    <Box>
      {warnings.length > 0 && (
        <Box sx={{ display: 'grid', gap: 1, mb: 3 }}>
          {warnings.map((w, i) => (
            <Alert key={`${w.code}-${i}`} severity={w.severity === 'ERROR' ? 'error' : 'warning'} sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem' }}>
                {(isBs ? (w.message_bs || WARNING_FALLBACK[w.code] || w.message) : (w.message || WARNING_FALLBACK[w.code] || w.message_bs)) || w.code}
              </Typography>
              {w.context && Object.keys(w.context).length > 0 && (
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.78rem', opacity: 0.8 }}>
                  {Object.entries(w.context).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(' · ')}
                </Typography>
              )}
            </Alert>
          ))}
        </Box>
      )}

      <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: T.color.mint, border: `1px solid ${T.color.mintDark}`, borderRadius: T.radius.lg }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.color.muted, mb: 0.5 }}>
              {t('steel.res.total')}
            </Typography>
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '2rem', color: T.color.forest, letterSpacing: '-0.02em' }}>
              {tonnes(result.totalEmissions)} CO₂e
            </Typography>
            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.82rem', color: isError ? T.color.error : T.color.muted }}>
              {isError
                ? t('steel.res.errorText')
                : t('steel.res.exact', { value: f1(result.totalEmissions) })}
            </Typography>
          </Box>
          <Box textAlign="right">
            <Chip label={isError ? t('steel.res.errorChip') : result.status} size="small" sx={{ fontFamily: T.font.body, fontWeight: 600, bgcolor: isError ? T.color.error : T.color.forest, color: '#fff', mb: 0.5 }} />
            {result.reportYear > 0 && (
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.82rem', color: T.color.muted }} display="block">
                {t('steel.res.reportYear', { year: result.reportYear })}
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>

      <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.1rem', color: T.color.ink, mb: 2 }}>
        {t('steel.res.byCn')}
      </Typography>
      {productIndexes.map((idx) => {
        const entry = byProduct.get(idx);
        const prod = products[idx];
        const snap = entry?.snap ?? {};
        const v = entry?.values ?? {};
        const name = snap.product_name ?? prod?.product_name ?? t('steel.pd.product', { n: idx + 1 });
        const cn = snap.cn_code ?? prod?.cn_code ?? '';
        const category = snap.category ?? prod?.aggregated_category ?? '';
        const indirShown = (v.IS_RESULT_SEE_INDIR ?? 0) !== 0 || category === 'SINTERED_ORE';
        const ds = String(snap.data_source ?? '');
        const share = v.IS_RESULT_DEFAULT_SHARE;
        const dsLabel = ds === 'MIXED' && share != null
          ? t('steel.res.mixed', { share: share.toFixed(1) })
          : DATA_SOURCE_LABEL[ds] ?? (ds || '—');
        const precursors: Snapshot[] = Array.isArray(snap.precursors) ? snap.precursors : [];
        const proc = snap.process_id ? byProcess.get(String(snap.process_id)) : undefined;
        return (
          <Paper key={idx} elevation={0} sx={{ p: 2.5, mb: 2.5, border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.md, bgcolor: T.color.warmWhite }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
              <Box>
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.ink }}>{name}</Typography>
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>
                  CN {formatCn(String(cn))} · {categoryLabel(category)} · {snap.country_of_origin ?? prod?.country_of_origin ?? '—'} · {snap.quantity_t ?? prod?.quantity ?? '—'} t
                </Typography>
              </Box>
              {entry && <Chip label={dsLabel} size="small" sx={{ fontFamily: T.font.body, fontWeight: 600, bgcolor: ds === 'ACTUAL' ? T.color.forest : T.color.mintDark, color: ds === 'ACTUAL' ? '#fff' : T.color.ink }} />}
            </Box>

            {!entry ? (
              <Alert severity="error" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>
                {t('steel.res.noResult')}
              </Alert>
            ) : (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                  <Kv label={t('steel.res.seeDir')} value={f5(v.IS_RESULT_SEE_DIR)} />
                  {indirShown ? <Kv label={t('steel.res.seeIndir')} value={f5(v.IS_RESULT_SEE_INDIR)} /> : <Box />}
                  <Kv label={t('steel.res.seeTotal')} value={<strong>{f5(v.IS_RESULT_SEE_TOTAL)}</strong>} />
                  <Kv label={t('steel.res.eeDir')} value={`${tonnes(v.IS_RESULT_EMBEDDED_DIR)} (${f1(v.IS_RESULT_EMBEDDED_DIR)})`} />
                  {indirShown ? <Kv label={t('steel.res.eeIndir')} value={`${tonnes(v.IS_RESULT_EMBEDDED_INDIR)} (${f1(v.IS_RESULT_EMBEDDED_INDIR)})`} /> : <Box />}
                  <Kv label={t('steel.res.eeTotal')} value={<strong>{`${tonnes(v.IS_RESULT_EMBEDDED_TOTAL)} (${f1(v.IS_RESULT_EMBEDDED_TOTAL)})`}</strong>} />
                </Box>

                {snap.default_value && (
                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.88rem', color: T.color.inkSoft }}>{t('steel.res.defaultValue')}</Typography>
                    <DefaultValueBlock dv={snap.default_value} />
                  </Box>
                )}

                {snap.process_id && (
                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.88rem', color: T.color.inkSoft }}>
                      {t('steel.res.process', { id: snap.process_id })}{snap.process_name ? ` – ${snap.process_name}` : ''}
                      {proc?.values.IS_PROC_AL != null ? t('steel.res.activity', { value: proc.values.IS_PROC_AL.toLocaleString('bs-BA') }) : ''}
                    </Typography>
                  </Box>
                )}

                {precursors.length > 0 && (
                  <TableContainer sx={{ mt: 1.5, border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.sm }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={headSx}>{t('steel.res.precursorCn')}</TableCell>
                          <TableCell sx={headSx}>{t('steel.res.source')}</TableCell>
                          <TableCell sx={{ ...headSx, textAlign: 'right' }}>{t('steel.res.mass')}</TableCell>
                          <TableCell sx={{ ...headSx, textAlign: 'right' }}>m_i (t/t)</TableCell>
                          <TableCell sx={{ ...headSx, textAlign: 'right' }}>{t('steel.res.seeDirShort')}</TableCell>
                          <TableCell sx={{ ...headSx, textAlign: 'right' }}>{t('steel.res.seeIndirShort')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {precursors.map((p, j) => (
                          <TableRow key={j}>
                            <TableCell sx={cellSx}>{formatCn(String(p.cn_code ?? ''))}</TableCell>
                            <TableCell sx={cellSx}>
                              {PRECURSOR_SOURCE_LABEL[String(p.source)] ?? String(p.source ?? '—')}
                              {p.default_value?.source && (
                                <Typography sx={{ fontSize: '0.72rem', color: T.color.muted }}>
                                  {p.default_value.source}{p.default_value.markup_pct != null ? ` · mark-up ${p.default_value.markup_pct} % (${p.default_value.year})` : ''}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ ...cellSx, textAlign: 'right' }}>{p.mass_t ?? '—'}</TableCell>
                            <TableCell sx={{ ...cellSx, textAlign: 'right' }}>{f5(p.m_i)}</TableCell>
                            <TableCell sx={{ ...cellSx, textAlign: 'right' }}>{f5(p.see_dir)}</TableCell>
                            <TableCell sx={{ ...cellSx, textAlign: 'right' }}>{f5(p.see_indir)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
          </Paper>
        );
      })}

      {byProcess.size > 0 && (
        <>
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.1rem', color: T.color.ink, mt: 3, mb: 2 }}>
            {t('steel.res.byProcess')}
          </Typography>
          {[...byProcess.entries()].map(([pid, { values, snap }]) => {
            const rows: Snapshot[] = Array.isArray(snap.rows) ? snap.rows : [];
            return (
              <Paper key={pid} elevation={0} sx={{ p: 2.5, mb: 2.5, border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.md, bgcolor: T.color.warmWhite }}>
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1rem', color: T.color.forest, mb: 1 }}>
                  {pid}{snap.naziv ? ` – ${snap.naziv}` : ''} · {categoryLabel(snap.kategorija)}{snap.metoda ? ` · ${snap.metoda === 'MASS_BALANCE' ? t('steel.res.methodMb') : t('steel.res.methodStd')}` : ''}
                </Typography>
                <Table size="small">
                  <TableBody>
                    {PROC_ROWS.filter(([code]) => values[code] != null).map(([code, kind]) => (
                      <TableRow key={code}>
                        <TableCell sx={cellSx}>{t(`steel.res.proc.${code}`)}</TableCell>
                        <TableCell sx={{ ...cellSx, textAlign: 'right', fontFamily: T.font.mono }}>
                          {kind === 'see' ? f5(values[code]) : f1(values[code])}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length > 0 && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.85rem', color: T.color.inkSoft, mb: 0.5 }}>
                      {t('steel.res.factorsUsed')}
                    </Typography>
                    {rows.map((r, j) => (
                      <Typography key={j} sx={{ fontFamily: T.font.body, fontSize: '0.78rem', color: T.color.muted }}>
                        {Object.entries(r)
                          .filter(([k]) => k !== 'row_id' && k !== 'process_id')
                          .map(([k, val]) => `${k}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`)
                          .join(' · ')}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Paper>
            );
          })}
        </>
      )}

      <Accordion elevation={0} sx={{ mt: 2, mb: 3, border: `1px solid ${T.color.lineFaint}`, borderRadius: `${T.radius.md} !important`, '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.9rem', color: T.color.inkSoft }}>{t('steel.res.notSupported')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {notSupportedList().map((item, i) => (
            <Typography key={item} sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted, mb: 0.5 }}>
              {i + 1}. {item}
            </Typography>
          ))}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
