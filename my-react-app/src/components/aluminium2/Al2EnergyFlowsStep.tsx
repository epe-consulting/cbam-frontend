import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { T } from '../steel/steelTheme';
import { AddButton, CheckField, IssueList, NavButtons, NumField, RowCard, SectionTitle, SelectField, StepHeader, type Option } from '../steel/SteelUi';
import { questionMeta, type Al2StepProps } from './types';
import { useIsStandardFactors } from '../../hooks/useIronSteelRefData';
import {
  HEAT_METHODS, checkFraction, checkNonNegative, checkPositive, factorLabel, newRowId, parseJsonRows, type StepIssue,
} from '../../utils/steelSteps';
import { AL2_Q, al2ProcessLabel, type Al2ElProducedRow, type Al2HeatRow, type Al2ProcessRow } from '../../utils/aluminium2Steps';

function newHeat(processId: string): Al2HeatRow {
  return {
    row_id: newRowId(), process_id: processId, smjer: 'IMPORT', kolicina_tj: '', metoda_ef: 'FUEL_MIX',
    ef_toplote: '', ef_mix: '', eta: '0.9', gorivo_standard: '',
    // sadrzi_otpadni_plin always false: waste gases out of scope (spec §1.9 item 5, §4.4; contract §2 ignores it)
    sadrzi_otpadni_plin: false,
    chp: { em_chp: '', q_net_tj: '', e_el_tj: '', e_in_tj: '', eta_ref_heat: '', eta_ref_el: '' }, dokazi: false,
  };
}
function newEl(processId: string): Al2ElProducedRow {
  return { row_id: newRowId(), process_id: processId, mwh: '', ef: '' };
}

/**
 * AL2_ENERGY_FLOWS (spec §4.4, §3.3(6), FE-9): AL2_HEAT_ENTRY (shape = IS_HEAT_ENTRY, sadrzi_otpadni_plin always false)
 * and AL2_EL_PRODUCED_ENTRY (shape = IS_EL_PRODUCED_ENTRY). Same editors as the cement / steel energy-flow steps,
 * without waste gas and without electricity consumption (direct emissions only, CBAM-R Annex II; spec §1.3).
 */
export function Al2EnergyFlowsStep({ data, questions, saving, saveError, onBack, onSubmit }: Al2StepProps) {
  const { t } = useTranslation();
  const heatMeta = questionMeta(questions, AL2_Q.HEAT, t('aluminium2.ef.heatLabel'), t('aluminium2.ef.heatHelp'));
  const elMeta = questionMeta(questions, AL2_Q.EL_PRODUCED, t('aluminium2.ef.elLabel'), t('aluminium2.ef.elHelp'));
  const { factors } = useIsStandardFactors();
  const ids = useMemo(() => new Set(data.processes.map((p) => p.process_id)), [data.processes]);

  const [heats, setHeats] = useState<Al2HeatRow[]>(() => parseJsonRows<Al2HeatRow>(data.values[AL2_Q.HEAT])
    .filter((r) => ids.has(r.process_id))
    .map((r) => { const d = newHeat(r.process_id); return { ...d, ...r, sadrzi_otpadni_plin: false, chp: { ...d.chp, ...(r.chp ?? {}) } }; }));
  const [els, setEls] = useState<Al2ElProducedRow[]>(() => parseJsonRows<Al2ElProducedRow>(data.values[AL2_Q.EL_PRODUCED])
    .filter((r) => ids.has(r.process_id)).map((r) => ({ ...newEl(r.process_id), ...r })));

  const fuelOptions: Option[] = factors.filter((f) => f.category === 'FUEL' && !f.wizardCode.startsWith('BIO_'))
    .map((f) => ({ value: f.wizardCode, label: factorLabel(f) }));

  const upd = <R extends { row_id: string }>(set: Dispatch<SetStateAction<R[]>>, rowId: string, patch: Partial<R>) =>
    set((prev) => prev.map((r) => (r.row_id === rowId ? { ...r, ...patch } : r)));

  const { errors, warnings } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    heats.forEach((r, idx) => {
      const what = t('steel.ef.heatWhat', { n: idx + 1, process: r.process_id });
      checkPositive(r.kolicina_tj, what, e);
      switch (r.metoda_ef) {
        case 'SUPPLIER_VERIFIED':
          checkNonNegative(r.ef_toplote, t('steel.ef.efHeat', { what }), e, true);
          if (!r.dokazi) {
            w.push({ code: '', message: t('steel.ef.wNoEvidence', { what }) });
            if (!r.gorivo_standard) e.push({ code: '', message: t('steel.ef.eFuelForStdNoEvidence', { what }) });
          }
          break;
        case 'FUEL_MIX':
          checkNonNegative(r.ef_mix, t('steel.ef.efMix', { what }), e, true);
          checkFraction(r.eta, t('steel.ef.eta', { what }), e, true);
          break;
        case 'CHP':
          checkNonNegative(r.chp.em_chp, t('steel.ef.chpEm', { what }), e, true);
          checkPositive(r.chp.q_net_tj, t('steel.ef.chpQ', { what }), e);
          checkNonNegative(r.chp.e_el_tj, t('steel.ef.chpEl', { what }), e, true);
          checkPositive(r.chp.e_in_tj, t('steel.ef.chpIn', { what }), e);
          checkFraction(r.chp.eta_ref_heat, t('steel.ef.chpRefHeat', { what }), e);
          checkFraction(r.chp.eta_ref_el, t('steel.ef.chpRefEl', { what }), e);
          break;
        case 'STANDARD_90':
          if (!r.gorivo_standard) e.push({ code: '', message: t('steel.ef.eFuelForStd', { what }) });
          break;
        default:
          break;
      }
    });
    els.forEach((r, idx) => {
      const what = t('steel.ef.elWhat', { n: idx + 1, process: r.process_id });
      checkNonNegative(r.mwh, t('steel.ef.mwh', { what }), e, true);
      checkNonNegative(r.ef, t('steel.ef.ef', { what }), e, true);
    });
    return { errors: e, warnings: w };
  }, [heats, els, t]);

  const renderHeat = (r: Al2HeatRow, idx: number) => (
    <RowCard key={r.row_id} title={t('steel.ef.heatN', { n: idx + 1 })} onRemove={() => setHeats((p) => p.filter((x) => x.row_id !== r.row_id))}>
      <SelectField label={t('steel.ef.direction')} value={r.smjer} options={[{ value: 'IMPORT', label: t('steel.ef.import') }, { value: 'EXPORT', label: t('steel.ef.export') }]}
        onChange={(v) => upd(setHeats, r.row_id, { smjer: v as Al2HeatRow['smjer'] })} />
      <NumField label={t('steel.ef.netHeat')} required value={r.kolicina_tj} onChange={(v) => upd(setHeats, r.row_id, { kolicina_tj: v })} />
      <SelectField label={t('steel.ef.efDetermination')} value={r.metoda_ef} options={HEAT_METHODS} onChange={(v) => upd(setHeats, r.row_id, { metoda_ef: v })} />
      {r.metoda_ef === 'SUPPLIER_VERIFIED' && (
        <>
          <NumField label={t('steel.ef.efHeatField')} required value={r.ef_toplote} onChange={(v) => upd(setHeats, r.row_id, { ef_toplote: v })} />
          <CheckField label={t('steel.ef.evidence')} checked={r.dokazi} onChange={(v) => upd(setHeats, r.row_id, { dokazi: v })} />
          {!r.dokazi
            ? <SelectField label={t('steel.ef.fuelForStd')} value={r.gorivo_standard} options={fuelOptions} onChange={(v) => upd(setHeats, r.row_id, { gorivo_standard: v })} />
            : <Box />}
        </>
      )}
      {r.metoda_ef === 'FUEL_MIX' && (
        <>
          <NumField label={t('steel.ef.efMixField')} required value={r.ef_mix} onChange={(v) => upd(setHeats, r.row_id, { ef_mix: v })} />
          <NumField label={t('steel.ef.etaField')} required value={r.eta} onChange={(v) => upd(setHeats, r.row_id, { eta: v })} />
          <Box />
        </>
      )}
      {r.metoda_ef === 'CHP' && (
        <>
          <NumField label={t('steel.ef.chpEmField')} required value={r.chp.em_chp} onChange={(v) => upd(setHeats, r.row_id, { chp: { ...r.chp, em_chp: v } })} />
          <NumField label={t('steel.ef.chpQField')} required value={r.chp.q_net_tj} onChange={(v) => upd(setHeats, r.row_id, { chp: { ...r.chp, q_net_tj: v } })} />
          <NumField label={t('steel.ef.chpElField')} required value={r.chp.e_el_tj} onChange={(v) => upd(setHeats, r.row_id, { chp: { ...r.chp, e_el_tj: v } })} />
          <NumField label={t('steel.ef.chpInField')} required value={r.chp.e_in_tj} onChange={(v) => upd(setHeats, r.row_id, { chp: { ...r.chp, e_in_tj: v } })} />
          <NumField label={t('steel.ef.chpRefHeatField')} value={r.chp.eta_ref_heat} onChange={(v) => upd(setHeats, r.row_id, { chp: { ...r.chp, eta_ref_heat: v } })} />
          <NumField label={t('steel.ef.chpRefElField')} value={r.chp.eta_ref_el} onChange={(v) => upd(setHeats, r.row_id, { chp: { ...r.chp, eta_ref_el: v } })} />
        </>
      )}
      {r.metoda_ef === 'STANDARD_90' && (
        <SelectField label={t('steel.ef.fuelForStd')} value={r.gorivo_standard} options={fuelOptions} onChange={(v) => upd(setHeats, r.row_id, { gorivo_standard: v })} />
      )}
    </RowCard>
  );

  const renderEl = (r: Al2ElProducedRow, idx: number) => (
    <RowCard key={r.row_id} title={t('steel.ef.elN', { n: idx + 1 })} onRemove={() => setEls((p) => p.filter((x) => x.row_id !== r.row_id))}>
      <NumField label={t('steel.ef.elMwh')} required value={r.mwh} onChange={(v) => upd(setEls, r.row_id, { mwh: v })} />
      <NumField label={t('steel.ef.elEf')} required value={r.ef} onChange={(v) => upd(setEls, r.row_id, { ef: v })} />
    </RowCard>
  );

  const renderProcess = (p: Al2ProcessRow) => (
    <Box key={p.process_id} sx={{ mb: 3 }}>
      <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.forest, mb: 1 }}>{al2ProcessLabel(p)}</Typography>
      <SectionTitle>{heatMeta.label}</SectionTitle>
      <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{heatMeta.help}</Typography>
      {heats.filter((r) => r.process_id === p.process_id).map(renderHeat)}
      <AddButton label={t('steel.ef.addHeat')} onClick={() => setHeats((prev) => [...prev, newHeat(p.process_id)])} />
      <SectionTitle>{elMeta.label}</SectionTitle>
      <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{elMeta.help}</Typography>
      {els.filter((r) => r.process_id === p.process_id).map(renderEl)}
      <AddButton label={t('steel.ef.addEl')} onClick={() => setEls((prev) => [...prev, newEl(p.process_id)])} />
      <Divider sx={{ mt: 1, borderColor: T.color.lineFaint }} />
    </Box>
  );

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={t('aluminium2.step.AL2_ENERGY_FLOWS')} help={t('aluminium2.ef.titleHelp')} />
      {data.processes.map(renderProcess)}
      <IssueList errors={errors} warnings={warnings} />
      <NavButtons
        onBack={onBack}
        onNext={() => onSubmit({ rows: { [AL2_Q.HEAT]: heats, [AL2_Q.EL_PRODUCED]: els } })}
        nextDisabled={errors.length > 0}
        saving={saving}
        saveError={saveError}
      />
    </Box>
  );
}
