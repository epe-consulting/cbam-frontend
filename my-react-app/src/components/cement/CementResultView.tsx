import { useEffect, useState, type ReactNode } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { T } from '../steel/steelTheme';
import type { SteelResult } from '../steel/SteelResultView';
import { getAnswerValuesByCode, getQuestionIdsByCode } from '../../api/ironSteel';
import { lazyLabels } from '../../i18n';
import { parseJsonRows } from '../../utils/steelSteps';
import {
  ceCategoryLabel, ceNotSupportedList, cementProductTotals, formatCeCode, formatSee, fuColumnApplicable, groupCementResult,
  roundTonnes, type CeProductRow,
} from '../../utils/cementSteps';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Snapshot = Record<string, any>;

const f1 = (v: number | null | undefined) => (v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toFixed(1));
const tonnes = (v: number | null | undefined) => {
  const r = roundTonnes(v);
  return r == null ? '—' : `${r.toLocaleString('bs-BA')} t`;
};

const DATA_SOURCE_LABEL: Record<string, string> = lazyLabels('cement.res.ds', ['ACTUAL', 'DEFAULT', 'MIXED', 'OUT_OF_SCOPE']);
const PRECURSOR_SOURCE_LABEL: Record<string, string> = lazyLabels('cement.res.ps', [
  'INTERNAL', 'VERIFIED_SUPPLIER', 'DEFAULT_ANNEX_I', 'DEFAULT_ANNEX_IV', 'ZERO_EU_EXEMPT',
]);
const CK_SOURCE_LABEL: Record<string, string> = lazyLabels('cement.res.ckSource', ['PRODUCT', 'PROCESS', 'FIXED', 'NOT_APPLICABLE']);

/** [output code, kind] of process items (spec §3.5); labels: locale keys cement.res.proc.<code>. */
const PROC_ROWS: [string, 't' | 'see' | 'mwh'][] = [
  ['CE_PROC_EM_COMB', 't'], ['CE_PROC_EM_PROCESS_A', 't'], ['CE_PROC_CLI_PROD', 't'], ['CE_PROC_EM_PROCESS_B', 't'],
  ['CE_PROC_EM_CKD', 't'], ['CE_PROC_DIREM_STAR', 't'], ['CE_PROC_EMH_IMP', 't'], ['CE_PROC_EMH_EXP', 't'],
  ['CE_PROC_EMEL_PROD', 't'], ['CE_PROC_ATTR_DIR', 't'], ['CE_PROC_EL_MWH', 'mwh'], ['CE_PROC_ATTR_INDIR', 't'],
  ['CE_PROC_AL', 't'], ['CE_PROC_AL_MASS', 't'], ['CE_PROC_PREC_EE_DIR', 't'], ['CE_PROC_PREC_EE_INDIR', 't'],
  ['CE_PROC_SEE_DIR', 'see'], ['CE_PROC_SEE_INDIR', 'see'], ['CE_PROC_SEE_TOTAL', 'see'],
];

const headSx = { fontFamily: T.font.body, fontWeight: 600, fontSize: '0.78rem', color: T.color.inkSoft, bgcolor: T.color.cream, borderBottom: `1px solid ${T.color.line}` };
const cellSx = { fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.ink, borderBottom: `1px solid ${T.color.lineFaint}` };

function Kv({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box>
      <Typography sx={{ fontFamily: T.font.body, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: T.color.muted }}>{label}</Typography>
      <Typography component="div" sx={{ fontFamily: T.font.body, fontSize: '0.92rem', color: T.color.ink }}>{value}</Typography>
    </Box>
  );
}

function DefaultValueBlock({ dv }: { dv: Snapshot }) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mt: 1 }}>
      <Kv label={t('cement.res.dvTable')} value={dv.table_country ?? dv.country ?? '—'} />
      <Kv label={t('cement.res.dvRow')} value={formatCeCode(dv.matched_code ?? dv.matchedCode ?? '') || '—'} />
      <Kv label={t('cement.res.dvValues')} value={`${dv.direct ?? '—'} / ${dv.indirect ?? '—'} / ${dv.total ?? '—'}`} />
      <Kv label={t('cement.res.dvMarkup')} value={t('cement.res.dvMarkupValue', { pct: dv.markup_pct ?? dv.markupPct ?? '—', year: dv.year ?? '—' })} />
      <Kv label={t('cement.res.dvWithMarkup')} value={formatSee(dv.value ?? dv.valueForYear)} />
      <Kv label={t('cement.res.dvRoute')} value={dv.route ?? dv.bmRoute ?? '—'} />
      <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 2' } }}><Kv label={t('cement.res.source')} value={dv.source ?? '—'} /></Box>
    </Box>
  );
}

/** Cement result page (spec §3.6, FE-10): per declared product per-good and per-FU SEE, CK, badges, warnings. */
export function CementResultView({ calculationId, result }: { calculationId: number | null; result: SteelResult }) {
  const { t, i18n } = useTranslation();
  const isBs = (i18n.resolvedLanguage ?? i18n.language) === 'bs';
  // Short subject for the translated message (process / CN / product); the full context is shown below.
  const warningSubject = (ctx: Record<string, unknown> | null | undefined): string => {
    if (!ctx) return '';
    const v = ctx.process_id ?? ctx.cn ?? ctx.taric ?? (typeof ctx.product_index === 'number' ? `#${ctx.product_index + 1}` : undefined);
    return v == null ? '' : String(v);
  };
  const [products, setProducts] = useState<CeProductRow[]>([]);
  useEffect(() => {
    if (calculationId == null) return;
    let cancelled = false;
    (async () => {
      try {
        const ids = await getQuestionIdsByCode();
        const values = await getAnswerValuesByCode(calculationId, ids);
        if (!cancelled) setProducts(parseJsonRows<CeProductRow>(values.CBAM_PRODUCT_ENTRY));
      } catch {
        // product list is only used to show products without results
      }
    })();
    return () => { cancelled = true; };
  }, [calculationId]);

  const warnings = result.warnings ?? [];
  const isError = String(result.status).toUpperCase() === 'ERROR';
  const { products: byProduct, processes: byProcess } = groupCementResult(result.items);
  const sums = cementProductTotals(byProduct);
  const productIndexes = [...new Set([...products.map((_, i) => i), ...byProduct.keys()])].sort((a, b) => a - b);

  return (
    <Box>
      {warnings.length > 0 && (
        <Box sx={{ display: 'grid', gap: 1, mb: 3 }}>
          {warnings.map((w, i) => (
            <Alert key={`${w.code}-${i}`} severity={w.severity === 'ERROR' ? 'error' : 'warning'} sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem' }}>
                {t(`cement.err.${w.code}`, { defaultValue: (isBs ? w.message_bs : undefined) || w.message || w.message_bs || w.code, what: warningSubject(w.context), m: w.context?.m ?? '', detail: '' })}
              </Typography>
              {w.context && Object.keys(w.context).length > 0 && (
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.78rem', opacity: 0.8 }}>
                  {w.code} · {Object.entries(w.context).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(' · ')}
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
              {t('cement.res.total')}
            </Typography>
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '2rem', color: T.color.forest, letterSpacing: '-0.02em' }}>
              {tonnes(result.totalEmissions)} CO₂e
            </Typography>
            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.82rem', color: isError ? T.color.error : T.color.muted }}>
              {isError ? t('cement.res.errorText') : t('cement.res.exact', { value: f1(result.totalEmissions), dir: f1(sums.direct), indir: f1(sums.indirect) })}
            </Typography>
          </Box>
          <Box textAlign="right">
            <Chip label={isError ? t('cement.res.errorChip') : result.status} size="small" sx={{ fontFamily: T.font.body, fontWeight: 600, bgcolor: isError ? T.color.error : T.color.forest, color: '#fff', mb: 0.5 }} />
            {result.reportYear > 0 && (
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.82rem', color: T.color.muted }} display="block">{t('cement.res.reportYear', { year: result.reportYear })}</Typography>
            )}
          </Box>
        </Box>
      </Paper>

      <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.1rem', color: T.color.ink, mb: 2 }}>{t('cement.res.byProduct')}</Typography>
      {productIndexes.map((idx) => {
        const entry = byProduct.get(idx);
        const prod = products[idx];
        const snap: Snapshot = entry?.snap ?? {};
        const v = entry?.values ?? {};
        const name = snap.product_name ?? prod?.product_name ?? t('cement.pd.product', { n: idx + 1 });
        const code = snap.taric_code || snap.cn_code || prod?.taric_code || prod?.cn_code || '';
        const ds = String(snap.data_source ?? '');
        const share = v.CE_RESULT_DEFAULT_SHARE;
        const dsLabel = ds === 'MIXED' && share != null ? t('cement.res.mixed', { share: share.toFixed(1) }) : DATA_SOURCE_LABEL[ds] ?? (ds || '—');
        const precursors: Snapshot[] = Array.isArray(snap.precursors) ? snap.precursors : [];
        const proc = snap.process_id ? byProcess.get(String(snap.process_id)) : undefined;
        const showFu = fuColumnApplicable(snap);
        const ck = v.CE_RESULT_CK ?? (snap.ck != null ? Number(snap.ck) : null);
        const white = snap.white === true ? t('cement.res.white') : snap.white === false ? t('cement.res.grey') : null;
        return (
          <Paper key={idx} elevation={0} sx={{ p: 2.5, mb: 2.5, border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.md, bgcolor: T.color.warmWhite }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
              <Box>
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.ink }}>{name}</Typography>
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>
                  {formatCeCode(String(code))} · {ceCategoryLabel(snap.category)}{white ? ` · ${white}` : ''} · {snap.country_of_origin ?? prod?.country_of_origin ?? '—'} · {snap.quantity_t ?? prod?.quantity ?? '—'} t
                </Typography>
              </Box>
              {entry && <Chip label={dsLabel} size="small" sx={{ fontFamily: T.font.body, fontWeight: 600, bgcolor: ds === 'ACTUAL' ? T.color.forest : T.color.mintDark, color: ds === 'ACTUAL' ? '#fff' : T.color.ink }} />}
            </Box>

            {!entry ? (
              <Alert severity="error" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>{t('cement.res.noResult')}</Alert>
            ) : (
              <>
                <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.82rem', color: T.color.inkSoft, mb: 1 }}>{t('cement.res.perGood')}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                  <Kv label={t('cement.res.seeDir')} value={formatSee(v.CE_RESULT_SEE_DIR)} />
                  <Kv label={t('cement.res.seeIndir')} value={formatSee(v.CE_RESULT_SEE_INDIR)} />
                  <Kv label={t('cement.res.seeTotal')} value={<strong>{formatSee(v.CE_RESULT_SEE_TOTAL)}</strong>} />
                  <Kv label={t('cement.res.eeDir')} value={`${tonnes(v.CE_RESULT_EMBEDDED_DIR)} (${f1(v.CE_RESULT_EMBEDDED_DIR)})`} />
                  <Kv label={t('cement.res.eeIndir')} value={`${tonnes(v.CE_RESULT_EMBEDDED_INDIR)} (${f1(v.CE_RESULT_EMBEDDED_INDIR)})`} />
                  <Kv label={t('cement.res.eeTotal')} value={<strong>{`${tonnes(v.CE_RESULT_EMBEDDED_TOTAL)} (${f1(v.CE_RESULT_EMBEDDED_TOTAL)})`}</strong>} />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.5, mt: 1.5 }}>
                  <Kv label={t('cement.res.ck')} value={ck != null ? `${(ck * 100).toFixed(2)} % (${CK_SOURCE_LABEL[String(snap.ck_source)] ?? String(snap.ck_source ?? '—')})` : '—'} />
                  {showFu ? (
                    <Box sx={{ gridColumn: { md: 'span 2' } }}>
                      <Kv label={t('cement.res.perFu')} value={`${formatSee(v.CE_RESULT_SEE_FU_DIR)} / ${formatSee(v.CE_RESULT_SEE_FU_INDIR)} / ${formatSee(v.CE_RESULT_SEE_FU_TOTAL)}`} />
                    </Box>
                  ) : (
                    <Box sx={{ gridColumn: { md: 'span 2' } }}><Kv label={t('cement.res.perFu')} value={t('cement.res.fuNotApplicable')} /></Box>
                  )}
                </Box>

                {snap.default_value && (
                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.88rem', color: T.color.inkSoft }}>{t('cement.res.defaultValue')}</Typography>
                    <DefaultValueBlock dv={snap.default_value} />
                  </Box>
                )}

                {snap.process_id && (
                  <Typography sx={{ mt: 2, fontFamily: T.font.body, fontWeight: 600, fontSize: '0.88rem', color: T.color.inkSoft }}>
                    {t('cement.res.process', { id: snap.process_id })}{snap.process_name ? ` – ${snap.process_name}` : ''}
                    {proc?.values.CE_PROC_AL != null ? t('cement.res.activity', {
                      fu: proc.values.CE_PROC_AL.toLocaleString('bs-BA'),
                      mass: proc.values.CE_PROC_AL_MASS != null ? proc.values.CE_PROC_AL_MASS.toLocaleString('bs-BA') : '—',
                    }) : ''}
                    {proc?.values.CE_PROC_EL_MWH != null ? t('cement.res.electricity', { mwh: proc.values.CE_PROC_EL_MWH.toLocaleString('bs-BA') }) : ''}
                  </Typography>
                )}

                {precursors.length > 0 && (
                  <TableContainer sx={{ mt: 1.5, border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.sm }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={headSx}>{t('cement.res.precursorCode')}</TableCell>
                          <TableCell sx={headSx}>{t('cement.res.source')}</TableCell>
                          <TableCell sx={{ ...headSx, textAlign: 'right' }}>{t('cement.res.mass')}</TableCell>
                          <TableCell sx={{ ...headSx, textAlign: 'right' }}>m_i</TableCell>
                          <TableCell sx={{ ...headSx, textAlign: 'right' }}>{t('cement.res.seeDirShort')}</TableCell>
                          <TableCell sx={{ ...headSx, textAlign: 'right' }}>{t('cement.res.seeIndirShort')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {precursors.map((p, j) => (
                          <TableRow key={j}>
                            <TableCell sx={cellSx}>{formatCeCode(String(p.taric_code || p.cn_code || ''))}</TableCell>
                            <TableCell sx={cellSx}>
                              {PRECURSOR_SOURCE_LABEL[String(p.source)] ?? String(p.source ?? '—')}
                              {p.default_value?.source && (
                                <Typography sx={{ fontSize: '0.72rem', color: T.color.muted }}>
                                  {p.default_value.source}{p.default_value.markup_pct != null ? ` · mark-up ${p.default_value.markup_pct} % (${p.default_value.year})` : ''}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ ...cellSx, textAlign: 'right' }}>{p.mass_t ?? '—'}</TableCell>
                            <TableCell sx={{ ...cellSx, textAlign: 'right' }}>{formatSee(p.m_i)}</TableCell>
                            <TableCell sx={{ ...cellSx, textAlign: 'right' }}>{formatSee(p.see_dir)}</TableCell>
                            <TableCell sx={{ ...cellSx, textAlign: 'right' }}>{formatSee(p.see_indir)}</TableCell>
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
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.1rem', color: T.color.ink, mt: 3, mb: 2 }}>{t('cement.res.byProcess')}</Typography>
          {[...byProcess.entries()].map(([pid, { values, snap }]) => {
            const s = snap as Snapshot;
            const rows: Snapshot[] = Array.isArray(s.rows) ? s.rows : [];
            return (
              <Paper key={pid} elevation={0} sx={{ p: 2.5, mb: 2.5, border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.md, bgcolor: T.color.warmWhite }}>
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1rem', color: T.color.forest, mb: 1 }}>
                  {pid}{s.naziv ? ` – ${s.naziv}` : ''} · {ceCategoryLabel(s.kategorija)}
                </Typography>
                <Table size="small">
                  <TableBody>
                    {PROC_ROWS.filter(([c]) => values[c] != null).map(([c, kind]) => (
                      <TableRow key={c}>
                        <TableCell sx={cellSx}>{t(`cement.res.proc.${c}`)}</TableCell>
                        <TableCell sx={{ ...cellSx, textAlign: 'right', fontFamily: T.font.mono }}>{kind === 'see' ? formatSee(values[c]) : f1(values[c])}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length > 0 && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.85rem', color: T.color.inkSoft, mb: 0.5 }}>{t('cement.res.factorsUsed')}</Typography>
                    {rows.map((r, j) => (
                      <Typography key={j} sx={{ fontFamily: T.font.body, fontSize: '0.78rem', color: T.color.muted }}>
                        {Object.entries(r).filter(([k]) => k !== 'row_id' && k !== 'process_id')
                          .map(([k, val]) => `${k}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`).join(' · ')}
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
          <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.9rem', color: T.color.inkSoft }}>{t('cement.general.notSupported')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {ceNotSupportedList().map((item, i) => (
            <Typography key={item} sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted, mb: 0.5 }}>{i + 1}. {item}</Typography>
          ))}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
