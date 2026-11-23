import { useMemo, useState } from 'react';
import { Alert, Box, Divider, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { T } from '../steel/steelTheme';
import { AddButton, FullRow, IssueList, NavButtons, NumField, RowCard, SelectField, StepHeader } from '../steel/SteelUi';
import { questionMeta, type Al2StepProps } from './types';
import { useIsStandardFactors } from '../../hooks/useIronSteelRefData';
import { useAl2PfcFactors } from '../../hooks/useAluminium2RefData';
import { newRowId, parseJsonRows, type StepIssue } from '../../utils/steelSteps';
import {
  AL2_PFC_METHODS, AL2_PFC_TECH_OPTIONS, AL2_Q, GWP_C2F6_CODE, GWP_CF4_CODE, al2IssueText, al2ProcessLabel, pfcFactors, pfcPrAlExceedsAl,
  pfcPreview, pfcRowIssues, processIsPrimary,
  type Al2PfcMethod, type Al2PfcRow, type Al2ProcessRow,
} from '../../utils/aluminium2Steps';

function newPfc(processId: string): Al2PfcRow {
  return {
    row_id: newRowId(), process_id: processId, metoda: 'SLOPE', tehnologija: '', proizvodnja_primarnog_t: '',
    frekvencija: '', trajanje: '', aem: '', aeo_mv: '', ce_posto: '',
    // blank izvor_faktora = TABLE (contract §2): minimum requirement of MA B.7.1/B.7.2
    izvor_faktora: 'TABLE', sef_cf4: '', ovc: '', f_c2f6: '', efikasnost_sakupljanja_posto: '',
  };
}

/** Only the fields of the chosen method / factor source are sent (the other ones are not read, contract §2). */
function cleanPfcRow(r: Al2PfcRow): Al2PfcRow {
  const slope = r.metoda === 'SLOPE';
  const inst = r.izvor_faktora === 'INSTALLATION_SPECIFIC';
  return {
    ...r,
    frekvencija: slope ? r.frekvencija : '', trajanje: slope ? r.trajanje : '', aem: slope ? r.aem : '',
    aeo_mv: slope ? '' : r.aeo_mv, ce_posto: slope ? '' : r.ce_posto,
    sef_cf4: inst && slope ? r.sef_cf4 : '', ovc: inst && !slope ? r.ovc : '', f_c2f6: inst ? r.f_c2f6 : '',
  };
}

const fmt = (n: number | null | undefined, d = 6) => (n == null || !Number.isFinite(n) ? '—' : n.toLocaleString('bs-BA', { maximumFractionDigits: d }));

/**
 * AL2_PFC (spec §4.4, §3.3(4), FE-8): one row per cell technology on processes with PRIMARY_SMELTING. Method A
 * (slope) / B (overvoltage), Table 2/3 factors from GET /al2/pfc-factors or installation-specific factors, live
 * CF4 / C2F6 / CO2e preview (GWP from GET /is/standard-factors, category GWP).
 */
export function Al2PfcStep({ data, questions, saving, saveError, onBack, onSubmit }: Al2StepProps) {
  const { t } = useTranslation();
  const meta = questionMeta(questions, AL2_Q.PFC, t('aluminium2.pfc.label'), t('aluminium2.pfc.help'));
  const { rows: table, loading: tableLoading, error: tableError } = useAl2PfcFactors();
  const { factors } = useIsStandardFactors();
  const gwp = (code: string) => factors.find((f) => f.category === 'GWP' && f.wizardCode === code)?.emissionFactor ?? null;
  const gwpCf4 = gwp(GWP_CF4_CODE);
  const gwpC2f6 = gwp(GWP_C2F6_CODE);
  const procById = useMemo(() => new Map(data.processes.map((p) => [p.process_id, p])), [data.processes]);
  const primaries = useMemo(() => data.processes.filter(processIsPrimary), [data.processes]);

  const stored = useMemo(() => parseJsonRows<Al2PfcRow>(data.values[AL2_Q.PFC]), [data.values]);
  const [rows, setRows] = useState<Al2PfcRow[]>(() => stored
    .filter((r) => { const p = procById.get(r.process_id); return p != null && processIsPrimary(p); })
    .map((r) => ({ ...newPfc(r.process_id), ...r, izvor_faktora: r.izvor_faktora === 'INSTALLATION_SPECIFIC' ? 'INSTALLATION_SPECIFIC' : 'TABLE' })));
  const ignored = stored.length - rows.length;

  const upd = (rowId: string, patch: Partial<Al2PfcRow>) => setRows((prev) => prev.map((r) => (r.row_id === rowId ? { ...r, ...patch } : r)));

  const { errors, warnings } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    rows.forEach((r, idx) => {
      const what = t('aluminium2.pfc.what', { n: idx + 1, process: r.process_id });
      const res = pfcRowIssues(r, procById.get(r.process_id), table);
      res.errors.forEach((c) => e.push({ code: c, message: al2IssueText(c, { what }) }));
      res.warnings.forEach((c) => w.push({ code: c, message: al2IssueText(c, { what }) }));
    });
    primaries.forEach((p) => {
      const label = al2ProcessLabel(p);
      if (!rows.some((r) => r.process_id === p.process_id)) w.push({ code: 'AL2_W_PFC_MISSING', message: al2IssueText('AL2_W_PFC_MISSING', { what: label }) });
      if (pfcPrAlExceedsAl(p, rows)) w.push({ code: 'AL2_W_PFC_PRAL_GT_AL', message: al2IssueText('AL2_W_PFC_PRAL_GT_AL', { what: label }) });
    });
    return { errors: e, warnings: w };
  }, [rows, procById, primaries, table, t]);

  const renderRow = (r: Al2PfcRow, idx: number) => {
    const slope = r.metoda === 'SLOPE';
    const inst = r.izvor_faktora === 'INSTALLATION_SPECIFIC';
    const fac = r.tehnologija ? pfcFactors(r, table) : null;
    const pv = pfcPreview(r, table, gwpCf4, gwpC2f6);
    return (
      <RowCard key={r.row_id} title={t('aluminium2.pfc.n', { n: idx + 1 })} onRemove={() => setRows((prev) => prev.filter((x) => x.row_id !== r.row_id))}>
        <SelectField label={t('aluminium2.pfc.method')} required value={r.metoda} options={AL2_PFC_METHODS}
          onChange={(v) => upd(r.row_id, { metoda: v as Al2PfcMethod })} />
        <SelectField label={t('aluminium2.pfc.technology')} required value={r.tehnologija} options={AL2_PFC_TECH_OPTIONS}
          onChange={(v) => upd(r.row_id, { tehnologija: v })} />
        <SelectField label={t('aluminium2.pfc.factorSource')} value={r.izvor_faktora}
          options={[{ value: 'TABLE', label: t('aluminium2.pfc.sourceTable') }, { value: 'INSTALLATION_SPECIFIC', label: t('aluminium2.pfc.sourceInstallation') }]}
          onChange={(v) => upd(r.row_id, { izvor_faktora: v as Al2PfcRow['izvor_faktora'] })} />
        <NumField label={t('aluminium2.pfc.prAl')} required value={r.proizvodnja_primarnog_t} onChange={(v) => upd(r.row_id, { proizvodnja_primarnog_t: v })} />
        {slope ? (
          <>
            <NumField label={t('aluminium2.pfc.frequency')} value={r.frekvencija} onChange={(v) => upd(r.row_id, { frekvencija: v })} />
            <NumField label={t('aluminium2.pfc.duration')} value={r.trajanje} onChange={(v) => upd(r.row_id, { trajanje: v })} />
            <NumField label={t('aluminium2.pfc.aem')} value={r.aem} onChange={(v) => upd(r.row_id, { aem: v })} helperText={t('aluminium2.pfc.aemHelp')} />
          </>
        ) : (
          <>
            <NumField label={t('aluminium2.pfc.aeo')} required value={r.aeo_mv} onChange={(v) => upd(r.row_id, { aeo_mv: v })} />
            <NumField label={t('aluminium2.pfc.ce')} required value={r.ce_posto} onChange={(v) => upd(r.row_id, { ce_posto: v })} helperText={t('aluminium2.pfc.ceHelp')} />
          </>
        )}
        {inst && (
          <>
            {slope
              ? <NumField label={t('aluminium2.pfc.sef')} required value={r.sef_cf4} onChange={(v) => upd(r.row_id, { sef_cf4: v })} />
              : <NumField label={t('aluminium2.pfc.ovc')} required value={r.ovc} onChange={(v) => upd(r.row_id, { ovc: v })} />}
            <NumField label={t('aluminium2.pfc.fC2f6')} required value={r.f_c2f6} onChange={(v) => upd(r.row_id, { f_c2f6: v })} />
          </>
        )}
        <NumField label={t('aluminium2.pfc.collection')} value={r.efikasnost_sakupljanja_posto}
          onChange={(v) => upd(r.row_id, { efikasnost_sakupljanja_posto: v })} helperText={t('aluminium2.pfc.collectionHelp')} />
        <FullRow>
          {!inst && fac && (
            <Typography sx={{ fontSize: '0.78rem', color: T.color.muted }}>
              {fac.a != null && fac.f != null
                ? t(slope ? 'aluminium2.pfc.tableSlope' : 'aluminium2.pfc.tableOv', { tech: fac.usedTechnology, a: fac.a, f: fac.f, source: fac.source ?? '—' })
                : t('aluminium2.pfc.tableMissing')}
            </Typography>
          )}
          <Typography sx={{ fontSize: '0.8rem', color: T.color.inkSoft }}>
            {t('aluminium2.pfc.preview', {
              aem: slope ? fmt(pv.aem) : '—', cf4: fmt(pv.cf4), c2f6: fmt(pv.c2f6), duct: fmt(pv.duct, 2), total: fmt(pv.total, 2),
            })}
          </Typography>
          {(gwpCf4 == null || gwpC2f6 == null) && (
            <Typography sx={{ fontSize: '0.78rem', color: T.color.muted }}>{t('aluminium2.pfc.gwpMissing')}</Typography>
          )}
        </FullRow>
      </RowCard>
    );
  };

  const renderProcess = (p: Al2ProcessRow) => (
    <Box key={p.process_id} sx={{ mb: 3 }}>
      <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.forest, mb: 1 }}>{al2ProcessLabel(p)}</Typography>
      {rows.filter((r) => r.process_id === p.process_id).map(renderRow)}
      <AddButton label={t('aluminium2.pfc.add')} onClick={() => setRows((prev) => [...prev, newPfc(p.process_id)])} />
      <Divider sx={{ mt: 1, borderColor: T.color.lineFaint }} />
    </Box>
  );

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={t('aluminium2.step.AL2_PFC')} help={meta.help} />
      <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.95rem', color: T.color.ink, mb: 1.5 }}>{meta.label}</Typography>
      {primaries.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>
          {t('aluminium2.notNeeded')}
          {ignored > 0 && ` ${t('aluminium2.ignoredRows', { count: ignored })}`}
        </Alert>
      ) : (
        <>
          {tableLoading && <Typography sx={{ fontSize: '0.85rem', color: T.color.muted, mb: 2 }}>{t('aluminium2.pfc.tableLoading')}</Typography>}
          {tableError && <IssueList infos={[t('aluminium2.pfc.tableError', { error: tableError })]} />}
          {table.length > 0 && (
            <Box sx={{ mb: 2, overflowX: 'auto' }}>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: T.color.inkSoft, mb: 0.5 }}>{t('aluminium2.pfc.tableTitle')}</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('aluminium2.pfc.technology')}</TableCell>
                    <TableCell align="right">SEF CF4</TableCell>
                    <TableCell align="right">F C2F6 (A)</TableCell>
                    <TableCell align="right">OVC</TableCell>
                    <TableCell align="right">F C2F6 (B)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {table.map((x) => (
                    <TableRow key={x.technology}>
                      <TableCell>{t(`aluminium2.tech.${x.technology}`, { defaultValue: x.technology })}</TableCell>
                      <TableCell align="right">{x.slopeSefCf4 ?? (x.slopeFallbackTechnology ? `→ ${x.slopeFallbackTechnology}` : '–')}</TableCell>
                      <TableCell align="right">{x.slopeFC2f6 ?? '–'}</TableCell>
                      <TableCell align="right">{x.overvoltageOvc ?? '–'}</TableCell>
                      <TableCell align="right">{x.overvoltageFC2f6 ?? '–'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
          {primaries.map(renderProcess)}
        </>
      )}
      <IssueList errors={errors} warnings={warnings} />
      <NavButtons onBack={onBack} onNext={() => onSubmit({ rows: { [AL2_Q.PFC]: rows.map(cleanPfcRow) } })} nextDisabled={errors.length > 0} saving={saving} saveError={saveError} />
    </Box>
  );
}
