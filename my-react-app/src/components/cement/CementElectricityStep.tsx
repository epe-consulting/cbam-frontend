import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { T } from '../steel/steelTheme';
import { AddButton, CheckField, IssueList, NavButtons, NumField, RowCard, SelectField, StepHeader } from '../steel/SteelUi';
import { questionMeta, type CementStepProps } from './types';
import { useCountries } from '../../hooks/useCountries';
import { getIsGridEf, type IsGridEf } from '../../api/ironSteel';
import { ELECTRICITY_SOURCES, checkNonNegative, newRowId, parseJsonRows, type StepIssue } from '../../utils/steelSteps';
import { CE_Q, ceIssueText, ceProcessLabel, type CeElectricityRow } from '../../utils/cementSteps';

/**
 * CE_ELECTRICITY (spec §4.4, §3.3(9), FE-8): ≥ 1 row per process (CE_E_EL_MISSING; OPEN QUESTION OQ-CE-13), mwh ≥ 0
 * (0 = no electricity). Shape = IS_ELECTRICITY_ENTRY. Indirect emissions count for all cement goods (CBAM-R Art. 7(1) p.13).
 */
export function CementElectricityStep({ data, questions, saving, saveError, onBack, onSubmit }: CementStepProps) {
  const { t } = useTranslation();
  const meta = questionMeta(questions, CE_Q.ELECTRICITY, t('cement.el.label'), t('cement.el.help'));
  const { countries } = useCountries();
  const ids = useMemo(() => new Set(data.processes.map((p) => p.process_id)), [data.processes]);

  const newRow = (processId: string): CeElectricityRow => ({
    row_id: newRowId(), process_id: processId, mwh: '', izvor: 'GRID', drzava: data.installationCountry, ef: '', dokazi: false,
  });
  const [rows, setRows] = useState<CeElectricityRow[]>(() => {
    const kept = parseJsonRows<CeElectricityRow>(data.values[CE_Q.ELECTRICITY])
      .filter((r) => ids.has(r.process_id)).map((r) => ({ ...newRow(r.process_id), ...r }));
    data.processes.forEach((p) => { if (!kept.some((r) => r.process_id === p.process_id)) kept.push(newRow(p.process_id)); });
    return kept;
  });

  const [gridEf, setGridEf] = useState<Record<string, IsGridEf | null>>({});
  const gridCountries = useMemo(
    () => [...new Set(rows.map((r) => r.drzava || data.installationCountry).filter(Boolean))],
    [rows, data.installationCountry],
  );
  const requestedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    gridCountries.filter((c) => !requestedRef.current.has(c)).forEach((c) => {
      requestedRef.current.add(c);
      getIsGridEf(c).then((r) => setGridEf((prev) => ({ ...prev, [c]: r }))).catch(() => {});
    });
  }, [gridCountries]);

  const upd = (rowId: string, patch: Partial<CeElectricityRow>) =>
    setRows((prev) => prev.map((r) => (r.row_id === rowId ? { ...r, ...patch } : r)));

  const { errors, warnings } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    data.processes.forEach((p) => {
      if (!rows.some((r) => r.process_id === p.process_id)) {
        e.push({ code: 'CE_E_EL_MISSING', message: ceIssueText('CE_E_EL_MISSING', { what: ceProcessLabel(p) }) });
      }
    });
    rows.forEach((r, idx) => {
      const what = t('steel.el.what', { n: idx + 1, process: r.process_id });
      checkNonNegative(r.mwh, t('cement.el.mwhWhat', { what }), e, true);
      if (r.izvor === 'GRID') {
        if (!r.drzava && !data.installationCountry) w.push({ code: 'CE_W_INSTALLATION_MISSING', message: ceIssueText('CE_W_INSTALLATION_MISSING', { what }) });
      } else {
        checkNonNegative(r.ef, t('steel.ef.ef', { what }), e, true);
        if (!r.dokazi) w.push({ code: 'CE_W_EL_NO_EVIDENCE', message: ceIssueText('CE_W_EL_NO_EVIDENCE', { what }) });
      }
    });
    return { errors: e, warnings: w };
  }, [rows, data.processes, data.installationCountry, t]);

  const countryOptions = countries.map((c) => ({ value: c.country, label: c.country }));

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={meta.label} help={meta.help} />
      {data.processes.map((p) => (
        <Box key={p.process_id} sx={{ mb: 3 }}>
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.forest, mb: 1 }}>{ceProcessLabel(p)}</Typography>
          {p.tip === 'JOINT' && <Typography sx={{ fontSize: '0.8rem', color: T.color.muted, mb: 1 }}>{t('cement.el.jointNote')}</Typography>}
          {rows.filter((r) => r.process_id === p.process_id).map((r, idx) => {
            const country = r.drzava || data.installationCountry;
            const ef = gridEf[country];
            return (
              <RowCard key={r.row_id} title={t('steel.el.sourceN', { n: idx + 1 })} onRemove={() => setRows((prev) => prev.filter((x) => x.row_id !== r.row_id))}>
                <NumField label={t('steel.el.consumption')} required value={r.mwh} onChange={(v) => upd(r.row_id, { mwh: v })} helperText={t('cement.el.zeroAllowed')} />
                <SelectField label={t('steel.el.source')} value={r.izvor} options={ELECTRICITY_SOURCES}
                  onChange={(v) => upd(r.row_id, { izvor: v, ...(v === 'GRID' ? { ef: '', dokazi: false } : {}) })} />
                <SelectField label={t('steel.el.gridCountry')} value={r.drzava} options={countryOptions} emptyLabel={t('steel.el.installationCountry')}
                  onChange={(v) => upd(r.row_id, { drzava: v })} />
                {r.izvor !== 'GRID' && (
                  <>
                    <NumField label={t('steel.el.actualEf')} required value={r.ef} onChange={(v) => upd(r.row_id, { ef: v })} />
                    <CheckField label={t('steel.ef.evidence')} checked={r.dokazi} onChange={(v) => upd(r.row_id, { dokazi: v })} />
                  </>
                )}
                <Box sx={{ gridColumn: '1 / -1' }}>
                  {ef && (
                    <Typography sx={{ fontSize: '0.78rem', color: T.color.muted }}>
                      {t('steel.el.defaultEf', { country: ef.country, ef: ef.efTPerMwh, fallback: ef.fallbackUsed ? t('steel.el.fallback') : '', source: ef.source })}
                    </Typography>
                  )}
                </Box>
              </RowCard>
            );
          })}
          <AddButton label={t('steel.el.addSource')} onClick={() => setRows((prev) => [...prev, newRow(p.process_id)])} />
          <Divider sx={{ mt: 1, borderColor: T.color.lineFaint }} />
        </Box>
      ))}
      <IssueList errors={errors} warnings={warnings} />
      <NavButtons onBack={onBack} onNext={() => onSubmit({ rows: { [CE_Q.ELECTRICITY]: rows } })} nextDisabled={errors.length > 0} saving={saving} saveError={saveError} />
    </Box>
  );
}
