import { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { T } from '../steel/steelTheme';
import { FullRow, IssueList, NavButtons, NumField, RowCard, StepHeader } from '../steel/SteelUi';
import { questionMeta, type Al2StepProps } from './types';
import { newRowId, parseJsonRows, type StepIssue } from '../../utils/steelSteps';
import {
  AL2_Q, al2ActivityLevel, al2IssueText, al2ProcessLabel, otherElementsReported, reportingParamIssues, scrapPerTonne,
  type Al2ReportingParamRow,
} from '../../utils/aluminium2Steps';

function emptyRow(processId: string): Al2ReportingParamRow {
  return { row_id: newRowId(), process_id: processId, otpad_t: '', pre_consumer_otpad_posto: '', ostali_elementi_posto: '' };
}

/**
 * AL2_REPORTING_PARAMS (spec §4.4, §3.5, FE-11): one row per process (MA Annex IV pt 2, p.85): scrap used,
 * share of pre-consumer scrap, content of elements other than aluminium (reported if > 1 %). Does not change SEE.
 */
export function Al2ReportingParamsStep({ data, questions, saving, saveError, onBack, onSubmit }: Al2StepProps) {
  const { t } = useTranslation();
  const meta = questionMeta(questions, AL2_Q.REPORTING_PARAM, t('aluminium2.rp.label'), t('aluminium2.rp.help'));

  const [rows, setRows] = useState<Record<string, Al2ReportingParamRow>>(() => {
    const stored = parseJsonRows<Al2ReportingParamRow>(data.values[AL2_Q.REPORTING_PARAM]);
    const out: Record<string, Al2ReportingParamRow> = {};
    data.processes.forEach((p) => {
      // the last row of a process wins (contract §2)
      const found = [...stored].reverse().find((r) => r.process_id === p.process_id);
      out[p.process_id] = { ...emptyRow(p.process_id), ...(found ?? {}), process_id: p.process_id };
    });
    return out;
  });

  const upd = (pid: string, patch: Partial<Al2ReportingParamRow>) => setRows((prev) => ({ ...prev, [pid]: { ...prev[pid], ...patch } }));

  const errors = useMemo(() => {
    const e: StepIssue[] = [];
    data.processes.forEach((p) => {
      const r = rows[p.process_id];
      if (r) reportingParamIssues(r).forEach((c) => e.push({ code: c, message: al2IssueText(c, { what: al2ProcessLabel(p) }) }));
    });
    return e;
  }, [rows, data.processes]);

  const isBlank = (r: Al2ReportingParamRow) =>
    [r.otpad_t, r.pre_consumer_otpad_posto, r.ostali_elementi_posto].every((v) => String(v ?? '').trim() === '');

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={t('aluminium2.step.AL2_REPORTING_PARAMS')} help={meta.help} />
      <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.95rem', color: T.color.ink, mb: 1.5 }}>{meta.label}</Typography>
      {data.processes.map((p) => {
        const r = rows[p.process_id];
        const al = al2ActivityLevel(p);
        const perT = scrapPerTonne(r.otpad_t, al);
        const other = otherElementsReported(r.ostali_elementi_posto);
        return (
          <RowCard key={p.process_id} title={al2ProcessLabel(p)}>
            <NumField label={t('aluminium2.rp.scrap')} value={r.otpad_t} onChange={(v) => upd(p.process_id, { otpad_t: v })} />
            <NumField label={t('aluminium2.rp.preConsumer')} value={r.pre_consumer_otpad_posto} onChange={(v) => upd(p.process_id, { pre_consumer_otpad_posto: v })} />
            <NumField label={t('aluminium2.rp.otherElements')} value={r.ostali_elementi_posto} onChange={(v) => upd(p.process_id, { ostali_elementi_posto: v })} />
            <FullRow>
              <Typography sx={{ fontSize: '0.8rem', color: T.color.inkSoft }}>
                {t('aluminium2.rp.scrapPreview', { al: al.toLocaleString('bs-BA', { maximumFractionDigits: 3 }), perT: perT != null ? perT.toFixed(5) : '—' })}
              </Typography>
              {other === false && <Typography sx={{ fontSize: '0.8rem', color: T.color.muted }}>{t('aluminium2.rp.otherNotRequired')}</Typography>}
              {other === true && <Typography sx={{ fontSize: '0.8rem', color: T.color.forest }}>{t('aluminium2.rp.otherReported')}</Typography>}
            </FullRow>
          </RowCard>
        );
      })}
      <Box sx={{ mt: 1 }} />
      <IssueList errors={errors} />
      <NavButtons
        onBack={onBack}
        onNext={() => onSubmit({ rows: { [AL2_Q.REPORTING_PARAM]: data.processes.map((p) => rows[p.process_id]).filter((r) => r && !isBlank(r)) } })}
        nextDisabled={errors.length > 0}
        saving={saving}
        saveError={saveError}
      />
    </Box>
  );
}
