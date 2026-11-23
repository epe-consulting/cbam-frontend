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
  al2CategoryLabel, al2FormatSee, al2NotSupportedList, al2ProductTotal, al2RoundTonnes, formatAl2Cn, groupAl2Result,
  otherElementsReported, type Al2ProductRow,
} from '../../utils/aluminium2Steps';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Snapshot = Record<string, any>;

const f1 = (v: number | null | undefined) => (v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toFixed(1));
const tonnes = (v: number | null | undefined) => {
  const r = al2RoundTonnes(v);
  return r == null ? '—' : `${r.toLocaleString('bs-BA')} t`;
};
const num = (v: unknown, d = 4) => (v == null || v === '' || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('bs-BA', { maximumFractionDigits: d }));

const DATA_SOURCE_LABEL: Record<string, string> = lazyLabels('aluminium2.res.ds', ['ACTUAL', 'MIXED', 'DEFAULT', 'ZERO_EU', 'ZERO_EXEMPT']);
const PRECURSOR_SOURCE_LABEL: Record<string, string> = lazyLabels('aluminium2.res.ps', [
  'INTERNAL', 'VERIFIED_SUPPLIER', 'DEFAULT_ANNEX_I', 'DEFAULT_ANNEX_IV', 'ZERO_EU_EXEMPT',
]);

/** [output code, kind] of process items (contract §4); labels: locale keys aluminium2.res.proc.<code>. */
const PROC_ROWS: [string, 't' | 'see' | 'pct' | 'pfc'][] = [
  ['AL2_PROC_EM_COMB', 't'], ['AL2_PROC_EM_ANODE', 't'], ['AL2_PROC_EM_FLUE_GAS', 't'], ['AL2_PROC_PFC_CF4', 'pfc'],
  ['AL2_PROC_PFC_C2F6', 'pfc'], ['AL2_PROC_EM_PFC', 't'], ['AL2_PROC_DIREM_STAR', 't'], ['AL2_PROC_EMH_IMP', 't'],
  ['AL2_PROC_EMH_EXP', 't'], ['AL2_PROC_EMEL_PROD', 't'], ['AL2_PROC_ATTR_DIR', 't'], ['AL2_PROC_AL', 't'],
  ['AL2_PROC_PREC_EE_DIR', 't'], ['AL2_PROC_SEE_DIR', 'see'], ['AL2_PROC_DEFAULT_SHARE', 'pct'], ['AL2_PROC_SCRAP_PER_T', 'see'],
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
      <Kv label={t('aluminium2.res.dvTable')} value={`${dv.table_country ?? '—'}${dv.annex ? ` (${t('aluminium2.res.annex', { annex: dv.annex })})` : ''}${dv.fallback ? ` · ${t('aluminium2.general.fallback')}` : ''}`} />
      <Kv label={t('aluminium2.res.dvRow')} value={formatAl2Cn(String(dv.matched_code ?? '')) || '—'} />
      <Kv label={t('aluminium2.res.dvTotal')} value={dv.total ?? '—'} />
      <Kv label={t('aluminium2.res.dvMarkup')} value={t('aluminium2.res.dvMarkupValue', { pct: dv.markup_pct ?? '—', year: dv.year ?? '—' })} />
      <Kv label={t('aluminium2.res.dvWithMarkup')} value={al2FormatSee(dv.value)} />
      <Kv label={t('aluminium2.res.dvRoute')} value={dv.route ?? '—'} />
      <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 2' } }}>
        <Kv label={t('aluminium2.res.source')} value={<>{dv.source ?? '—'}{dv.dvc_correction ? <Chip size="small" label={t('aluminium2.res.dvcBadge')} sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} /> : null}</>} />
      </Box>
    </Box>
  );
}

/** Aluminium II result page (spec §3.7, FE-12): per declared product SEE (direct only), EE, badges, warnings first. */
export function Al2ResultView({ calculationId, result }: { calculationId: number | null; result: SteelResult }) {
  const { t, i18n } = useTranslation();
  const isBs = (i18n.resolvedLanguage ?? i18n.language) === 'bs';
  const warningSubject = (ctx: Record<string, unknown> | null | undefined): string => {
    if (!ctx) return '';
    const v = ctx.process_id ?? ctx.cn ?? ctx.cn_code ?? (typeof ctx.product_index === 'number' ? `#${ctx.product_index + 1}` : undefined);
    return v == null ? '' : String(v);
  };
  const [products, setProducts] = useState<Al2ProductRow[]>([]);
  useEffect(() => {
    if (calculationId == null) return;
    let cancelled = false;
    (async () => {
      try {
        const ids = await getQuestionIdsByCode();
        const values = await getAnswerValuesByCode(calculationId, ids);
        if (!cancelled) setProducts(parseJsonRows<Al2ProductRow>(values.CBAM_PRODUCT_ENTRY));
      } catch {
        // product list is only used to show products without results
      }
    })();
    return () => { cancelled = true; };
  }, [calculationId]);

  const warnings = result.warnings ?? [];
  const isError = String(result.status).toUpperCase() === 'ERROR';
  const { products: byProduct, processes: byProcess } = groupAl2Result(result.items);
  const sum = al2ProductTotal(byProduct);
  const productIndexes = [...new Set([...products.map((_, i) => i), ...byProduct.keys()])].sort((a, b) => a - b);

  return (
    <Box>
      {warnings.length > 0 && (
        <Box sx={{ display: 'grid', gap: 1, mb: 3 }}>
          {warnings.map((w, i) => (
            <Alert key={`${w.code}-${i}`} severity={w.severity === 'ERROR' ? 'error' : 'warning'} sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem' }}>
                {isBs && w.message_bs
                  ? w.message_bs
                  : t(`aluminium2.err.${w.code}`, { defaultValue: w.message || w.message_bs || w.code, what: warningSubject(w.context), m: w.context?.m ?? '' })}
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
              {t('aluminium2.res.total')}
            </Typography>
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '2rem', color: T.color.forest, letterSpacing: '-0.02em' }}>
              {tonnes(result.totalEmissions)} CO₂e
            </Typography>
            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.82rem', color: isError ? T.color.error : T.color.muted }}>
              {isError ? t('aluminium2.res.errorText') : t('aluminium2.res.exact', { value: f1(result.totalEmissions), sum: f1(sum) })}
            </Typography>
            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.82rem', color: T.color.muted }}>{t('aluminium2.indirectNotApplicable')}</Typography>
          </Box>
          <Box textAlign="right">
            <Chip label={isError ? t('aluminium2.res.errorChip') : result.status} size="small" sx={{ fontFamily: T.font.body, fontWeight: 600, bgcolor: isError ? T.color.error : T.color.forest, color: '#fff', mb: 0.5 }} />
            {result.reportYear > 0 && (
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.82rem', color: T.color.muted }} display="block">{t('aluminium2.res.reportYear', { year: result.reportYear })}</Typography>
            )}
          </Box>
        </Box>
      </Paper>

      <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.1rem', color: T.color.ink, mb: 2 }}>{t('aluminium2.res.byProduct')}</Typography>
      {productIndexes.map((idx) => {
        const entry = byProduct.get(idx);
        const prod = products[idx];
        const snap: Snapshot = entry?.snap ?? {};
        const v = entry?.values ?? {};
        const name = snap.product_name ?? prod?.product_name ?? t('aluminium2.pd.product', { n: idx + 1 });
        const code = snap.cn_code || prod?.cn_code || '';
        const ds = String(snap.data_source ?? '');
        const share = v.AL2_RESULT_DEFAULT_SHARE;
        const dsLabel = ds === 'MIXED' && share != null ? t('aluminium2.res.mixed', { share: share.toFixed(1) }) : DATA_SOURCE_LABEL[ds] ?? (ds || '—');
        const precursors: Snapshot[] = Array.isArray(snap.precursors) ? snap.precursors : [];
        const proc = snap.process_id ? byProcess.get(String(snap.process_id)) : undefined;
        const rp: Snapshot | null = snap.reporting_params && typeof snap.reporting_params === 'object' ? snap.reporting_params : null;
        const otherReported = rp ? (rp.other_elements_reported ?? otherElementsReported(rp.other_elements_pct)) : null;
        return (
          <Paper key={idx} elevation={0} sx={{ p: 2.5, mb: 2.5, border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.md, bgcolor: T.color.warmWhite }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
              <Box>
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.ink }}>{name}</Typography>
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>
                  {formatAl2Cn(String(code))} · {al2CategoryLabel(snap.category)} · {snap.country_of_origin ?? prod?.country_of_origin ?? '—'} · {snap.quantity_t ?? prod?.quantity ?? '—'} t
                </Typography>
              </Box>
              {entry && <Chip label={dsLabel} size="small" sx={{ fontFamily: T.font.body, fontWeight: 600, bgcolor: ds === 'ACTUAL' ? T.color.forest : T.color.mintDark, color: ds === 'ACTUAL' ? '#fff' : T.color.ink }} />}
            </Box>

            {!entry ? (
              <Alert severity="error" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>{t('aluminium2.res.noResult')}</Alert>
            ) : (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                  <Kv label={t('aluminium2.res.seeDir')} value={<strong>{al2FormatSee(v.AL2_RESULT_SEE_DIR)}</strong>} />
                  <Kv label={t('aluminium2.res.eeDir')} value={<strong>{`${tonnes(v.AL2_RESULT_EMBEDDED_DIR)} (${f1(v.AL2_RESULT_EMBEDDED_DIR)})`}</strong>} />
                  <Kv label={t('aluminium2.res.indirect')} value={t('aluminium2.res.indirectNa')} />
                  <Kv label={t('aluminium2.res.defaultShare')} value={share != null ? `${share.toFixed(2)} %` : '—'} />
                </Box>

                {snap.default_value && (
                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.88rem', color: T.color.inkSoft }}>{t('aluminium2.res.defaultValue')}</Typography>
                    <DefaultValueBlock dv={snap.default_value} />
                  </Box>
                )}

                {snap.process_id && (
                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.88rem', color: T.color.inkSoft }}>
                      {t('aluminium2.res.process', { id: snap.process_id })}{snap.process_name ? ` – ${snap.process_name}` : ''}
                      {proc?.values.AL2_PROC_AL != null ? t('aluminium2.res.activity', { al: proc.values.AL2_PROC_AL.toLocaleString('bs-BA') }) : ''}
                    </Typography>
                    {proc && (
                      <Typography sx={{ fontFamily: T.font.body, fontSize: '0.82rem', color: T.color.muted }}>
                        {t('aluminium2.res.breakdown', {
                          comb: f1(proc.values.AL2_PROC_EM_COMB), anode: f1(proc.values.AL2_PROC_EM_ANODE), flue: f1(proc.values.AL2_PROC_EM_FLUE_GAS),
                          pfc: f1(proc.values.AL2_PROC_EM_PFC), cf4: num(proc.values.AL2_PROC_PFC_CF4, 6), c2f6: num(proc.values.AL2_PROC_PFC_C2F6, 6),
                          himp: f1(proc.values.AL2_PROC_EMH_IMP), hexp: f1(proc.values.AL2_PROC_EMH_EXP),
                        })}
                      </Typography>
                    )}
                  </Box>
                )}

                {precursors.length > 0 && (
                  <TableContainer sx={{ mt: 1.5, border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.sm }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={headSx}>{t('aluminium2.res.precursorCode')}</TableCell>
                          <TableCell sx={headSx}>{t('aluminium2.res.source')}</TableCell>
                          <TableCell sx={headSx}>{t('aluminium2.pre.route')}</TableCell>
                          <TableCell sx={{ ...headSx, textAlign: 'right' }}>{t('aluminium2.res.mass')}</TableCell>
                          <TableCell sx={{ ...headSx, textAlign: 'right' }}>m_i</TableCell>
                          <TableCell sx={{ ...headSx, textAlign: 'right' }}>{t('aluminium2.res.seeDirShort')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {precursors.map((p, j) => (
                          <TableRow key={j}>
                            <TableCell sx={cellSx}>{formatAl2Cn(String(p.cn_code ?? ''))}{p.category ? ` · ${al2CategoryLabel(String(p.category))}` : ''}</TableCell>
                            <TableCell sx={cellSx}>
                              {PRECURSOR_SOURCE_LABEL[String(p.source)] ?? String(p.source ?? '—')}
                              {p.country ? ` · ${p.country}` : ''}{p.process_id ? ` · ${p.process_id}` : ''}
                              {p.default_value?.source && (
                                <Typography sx={{ fontSize: '0.72rem', color: T.color.muted }}>
                                  {p.default_value.source}{p.default_value.markup_pct != null ? ` · mark-up ${p.default_value.markup_pct} % (${p.default_value.year})` : ''}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={cellSx}>{p.ruta_prekursora ? t(`aluminium2.precursorRoute.${p.ruta_prekursora}`, { defaultValue: String(p.ruta_prekursora) }) : '—'}</TableCell>
                            <TableCell sx={{ ...cellSx, textAlign: 'right' }}>{p.mass_t ?? '—'}</TableCell>
                            <TableCell sx={{ ...cellSx, textAlign: 'right' }}>{al2FormatSee(p.m_i)}</TableCell>
                            <TableCell sx={{ ...cellSx, textAlign: 'right' }}>{al2FormatSee(p.see_dir)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {rp && (
                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.88rem', color: T.color.inkSoft, mb: 0.5 }}>{t('aluminium2.res.reportingParams')}</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                      <Kv label={t('aluminium2.res.scrapPerT')} value={rp.scrap_t_per_t != null ? al2FormatSee(rp.scrap_t_per_t) : '—'} />
                      <Kv label={t('aluminium2.res.preConsumer')} value={rp.pre_consumer_pct != null ? `${num(rp.pre_consumer_pct)} %` : '—'} />
                      <Kv label={t('aluminium2.res.otherElements')} value={
                        otherReported === false ? t('aluminium2.rp.otherNotRequired')
                          : rp.other_elements_pct != null ? `${num(rp.other_elements_pct)} %` : '—'
                      } />
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Paper>
        );
      })}

      {byProcess.size > 0 && (
        <>
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.1rem', color: T.color.ink, mt: 3, mb: 2 }}>{t('aluminium2.res.byProcess')}</Typography>
          {[...byProcess.entries()].map(([pid, { values, snap }]) => {
            const s = snap as Snapshot;
            const rows: Snapshot[] = Array.isArray(s.rows) ? s.rows : [];
            const routes: string[] = Array.isArray(s.rute) ? s.rute : [];
            return (
              <Paper key={pid} elevation={0} sx={{ p: 2.5, mb: 2.5, border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.md, bgcolor: T.color.warmWhite }}>
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1rem', color: T.color.forest, mb: 1 }}>
                  {pid}{s.naziv ? ` – ${s.naziv}` : ''} · {s.tip === 'JOINT' ? t('aluminium2.proc.typeJoint') : al2CategoryLabel(s.kategorija)}
                  {routes.length > 0 ? ` · ${routes.map((r) => t(`aluminium2.route.${r}`, { defaultValue: r })).join(' + ')}` : ''}
                </Typography>
                <Table size="small">
                  <TableBody>
                    {PROC_ROWS.filter(([c]) => values[c] != null).map(([c, kind]) => (
                      <TableRow key={c}>
                        <TableCell sx={cellSx}>{t(`aluminium2.res.proc.${c}`)}</TableCell>
                        <TableCell sx={{ ...cellSx, textAlign: 'right', fontFamily: T.font.mono }}>
                          {kind === 'see' ? al2FormatSee(values[c]) : kind === 'pct' ? `${num(values[c], 2)} %` : kind === 'pfc' ? num(values[c], 6) : f1(values[c])}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length > 0 && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.85rem', color: T.color.inkSoft, mb: 0.5 }}>{t('aluminium2.res.factorsUsed')}</Typography>
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
          <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.9rem', color: T.color.inkSoft }}>{t('aluminium2.general.notSupported')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {al2NotSupportedList().map((item, i) => (
            <Typography key={item} sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted, mb: 0.5 }}>{i + 1}. {item}</Typography>
          ))}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
