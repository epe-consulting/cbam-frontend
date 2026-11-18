import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Divider, Typography } from '@mui/material';
import { T } from './steelTheme';
import { AddButton, CheckField, IssueList, NavButtons, NumField, RowCard, SelectField, StepHeader } from './SteelUi';
import { questionMeta, type SteelStepProps } from './types';
import { useCountries } from '../../hooks/useCountries';
import { getIsGridEf, type IsGridEf } from '../../api/ironSteel';
import {
  ELECTRICITY_SOURCES, IS_Q, checkNonNegative, checkPositive, newRowId, parseJsonRows, processCoversSinter, processLabel,
  type ElectricityRow, type StepIssue,
} from '../../utils/steelSteps';
import { useTranslation } from 'react-i18next';

export function SteelElectricityStep({ data, questions, saving, saveError, onBack, onSubmit }: SteelStepProps) {
  const { t } = useTranslation();
  const meta = questionMeta(questions, IS_Q.ELECTRICITY, t('steel.el.label'), t('steel.el.help'));
  const { countries } = useCountries();
  const sinterProcesses = useMemo(() => data.processes.filter(processCoversSinter), [data.processes]);
  const sinterIds = useMemo(() => new Set(sinterProcesses.map((p) => p.process_id)), [sinterProcesses]);
  const storedRows = useMemo(() => parseJsonRows<ElectricityRow>(data.values[IS_Q.ELECTRICITY]), [data.values]);
  const ignoredCount = storedRows.filter((r) => !sinterIds.has(r.process_id)).length;

  const newRow = (processId: string): ElectricityRow => ({
    row_id: newRowId(), process_id: processId, mwh: '', izvor: 'GRID', drzava: data.installationCountry, ef: '', dokazi: false,
  });
  const [rows, setRows] = useState<ElectricityRow[]>(() => {
    const kept = storedRows.filter((r) => sinterIds.has(r.process_id)).map((r) => ({ ...newRow(r.process_id), ...r }));
    sinterProcesses.forEach((p) => {
      if (!kept.some((r) => r.process_id === p.process_id)) kept.push(newRow(p.process_id));
    });
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

  const upd = (rowId: string, patch: Partial<ElectricityRow>) =>
    setRows((prev) => prev.map((r) => (r.row_id === rowId ? { ...r, ...patch } : r)));

  const { errors, warnings } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    sinterProcesses.forEach((p) => {
      if (!rows.some((r) => r.process_id === p.process_id)) {
        e.push({ code: 'IS_E_SINTER_EL_MISSING', message: t('steel.el.eMissing', { id: p.process_id }) });
      }
    });
    rows.forEach((r, idx) => {
      const what = t('steel.el.what', { n: idx + 1, process: r.process_id });
      checkPositive(r.mwh, what, e);
      if (r.izvor === 'GRID') {
        if (!r.drzava && !data.installationCountry) e.push({ code: '', message: t('steel.el.eCountry', { what }) });
      } else {
        checkNonNegative(r.ef, t('steel.ef.ef', { what }), e, true);
        if (!r.dokazi) w.push({ code: 'IS_W_EL_NO_EVIDENCE', message: t('steel.el.wNoEvidence', { what }) });
      }
    });
    return { errors: e, warnings: w };
  }, [rows, sinterProcesses, data.installationCountry, t]);

  const countryOptions = countries.map((c) => ({ value: c.country, label: c.country }));

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={meta.label} help={meta.help} />
      {sinterProcesses.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>
          {t('steel.el.notNeeded')}
          {ignoredCount > 0 && t('steel.el.ignored', { count: ignoredCount })}
        </Alert>
      ) : (
        sinterProcesses.map((p) => (
          <Box key={p.process_id} sx={{ mb: 3 }}>
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.forest, mb: 1 }}>
              {processLabel(p)}
            </Typography>
            {rows.filter((r) => r.process_id === p.process_id).map((r, idx) => {
              const country = r.drzava || data.installationCountry;
              const ef = gridEf[country];
              return (
                <RowCard key={r.row_id} title={t('steel.el.sourceN', { n: idx + 1 })} onRemove={() => setRows((prev) => prev.filter((x) => x.row_id !== r.row_id))}>
                  <NumField label={t('steel.el.consumption')} required value={r.mwh} onChange={(v) => upd(r.row_id, { mwh: v })} />
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
        ))
      )}
      <IssueList errors={errors} warnings={warnings} />
      <NavButtons
        onBack={onBack}
        onNext={() => onSubmit({ rows: { [IS_Q.ELECTRICITY]: rows } })}
        nextDisabled={errors.length > 0}
        saving={saving}
        saveError={saveError}
      />
    </Box>
  );
}
