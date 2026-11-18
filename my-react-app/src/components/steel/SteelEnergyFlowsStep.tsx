import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { T } from './steelTheme';
import {
  AddButton, CheckField, FullRow, IssueList, NavButtons, NumField, RowCard, SectionTitle, SelectField, StepHeader, type Option,
} from './SteelUi';
import { questionMeta, type SteelStepProps } from './types';
import { useIsStandardFactors } from '../../hooks/useIronSteelRefData';
import {
  EF_NG_WASTE_GAS, FUEL_UNITS, HEAT_METHODS, IS_Q, WASTE_GASES, checkFraction, checkNonNegative, checkPositive, factorLabel,
  newRowId, parseJsonRows, processLabel, toNum,
  type ElProducedRow, type HeatRow, type ProcessRow, type StepIssue, type WasteGasRow,
} from '../../utils/steelSteps';
import { useTranslation } from 'react-i18next';

const str = (n: number | null | undefined) => (n == null ? '' : String(Number(n.toPrecision(10))));

function newHeat(processId: string): HeatRow {
  return {
    row_id: newRowId(), process_id: processId, smjer: 'IMPORT', kolicina_tj: '', metoda_ef: 'FUEL_MIX',
    ef_toplote: '', ef_mix: '', eta: '0.9', gorivo_standard: '', sadrzi_otpadni_plin: false,
    chp: { em_chp: '', q_net_tj: '', e_el_tj: '', e_in_tj: '', eta_ref_heat: '', eta_ref_el: '' }, dokazi: false,
  };
}
function newWg(processId: string): WasteGasRow {
  return { row_id: newRowId(), process_id: processId, smjer: 'EXPORT', plin: 'BLAST_FURNACE_GAS', jedinica: 'TJ', kolicina: '', ncv: '', dokazi: false };
}
function newEl(processId: string): ElProducedRow {
  return { row_id: newRowId(), process_id: processId, mwh: '', ef: '' };
}

export function SteelEnergyFlowsStep({ data, questions, saving, saveError, onBack, onSubmit }: SteelStepProps) {
  const { t } = useTranslation();
  const heatMeta = questionMeta(questions, IS_Q.HEAT, t('steel.ef.heatLabel'), t('steel.ef.heatHelp'));
  const wgMeta = questionMeta(questions, IS_Q.WASTE_GAS, t('steel.ef.wgLabel'), t('steel.ef.wgHelp'));
  const elMeta = questionMeta(questions, IS_Q.EL_PRODUCED, t('steel.ef.elLabel'), t('steel.ef.elHelp'));
  const { factors, byWizardCode } = useIsStandardFactors();
  const ids = useMemo(() => new Set(data.processes.map((p) => p.process_id)), [data.processes]);

  const [heats, setHeats] = useState<HeatRow[]>(() => parseJsonRows<HeatRow>(data.values[IS_Q.HEAT])
    .filter((r) => ids.has(r.process_id))
    .map((r) => { const d = newHeat(r.process_id); return { ...d, ...r, chp: { ...d.chp, ...(r.chp ?? {}) } }; }));
  const [wgs, setWgs] = useState<WasteGasRow[]>(() => parseJsonRows<WasteGasRow>(data.values[IS_Q.WASTE_GAS])
    .filter((r) => ids.has(r.process_id)).map((r) => ({ ...newWg(r.process_id), ...r })));
  const [els, setEls] = useState<ElProducedRow[]>(() => parseJsonRows<ElProducedRow>(data.values[IS_Q.EL_PRODUCED])
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
          if (r.sadrzi_otpadni_plin && (toNum(r.ef_mix) ?? 0) > EF_NG_WASTE_GAS) {
            w.push({ code: 'IS_W_WG_EF_CAP', message: t('steel.ef.wWgCap', { what }) });
          }
          break;
        case 'CHP': {
          checkNonNegative(r.chp.em_chp, t('steel.ef.chpEm', { what }), e, true);
          checkPositive(r.chp.q_net_tj, t('steel.ef.chpQ', { what }), e);
          checkNonNegative(r.chp.e_el_tj, t('steel.ef.chpEl', { what }), e, true);
          checkPositive(r.chp.e_in_tj, t('steel.ef.chpIn', { what }), e);
          checkFraction(r.chp.eta_ref_heat, t('steel.ef.chpRefHeat', { what }), e);
          checkFraction(r.chp.eta_ref_el, t('steel.ef.chpRefEl', { what }), e);
          break;
        }
        case 'STANDARD_90':
          if (!r.gorivo_standard) e.push({ code: '', message: t('steel.ef.eFuelForStd', { what }) });
          break;
        default:
          break;
      }
    });
    wgs.forEach((r, idx) => {
      const what = t('steel.ef.wgWhat', { n: idx + 1, process: r.process_id });
      checkPositive(r.kolicina, what, e);
      if (r.jedinica !== 'TJ') {
        const n = toNum(r.ncv);
        const needed = r.jedinica === '1000Nm3' || r.plin === 'OTHER' || byWizardCode[r.plin]?.ncv == null;
        if ((n == null && needed) || (n != null && n <= 0)) {
          e.push({ code: 'IS_E_FACTOR_RANGE', message: t('steel.ef.eNcv', { what, unit: r.jedinica === 't' ? 'GJ/t' : 'GJ/1000 Nm³' }) });
        }
      }
      if (r.smjer === 'EXPORT' && !r.dokazi) {
        w.push({ code: 'IS_W_WG_EXPORT_NO_EVIDENCE', message: t('steel.ef.wWgExport', { what }) });
      }
    });
    els.forEach((r, idx) => {
      const what = t('steel.ef.elWhat', { n: idx + 1, process: r.process_id });
      checkNonNegative(r.mwh, t('steel.ef.mwh', { what }), e, true);
      checkNonNegative(r.ef, t('steel.ef.ef', { what }), e, true);
    });
    return { errors: e, warnings: w };
  }, [heats, wgs, els, byWizardCode, t]);

  const renderHeat = (r: HeatRow, idx: number) => (
    <RowCard key={r.row_id} title={t('steel.ef.heatN', { n: idx + 1 })} onRemove={() => setHeats((p) => p.filter((x) => x.row_id !== r.row_id))}>
      <SelectField label={t('steel.ef.direction')} value={r.smjer} options={[{ value: 'IMPORT', label: t('steel.ef.import') }, { value: 'EXPORT', label: t('steel.ef.export') }]}
        onChange={(v) => upd(setHeats, r.row_id, { smjer: v as HeatRow['smjer'] })} />
      <NumField label={t('steel.ef.netHeat')} required value={r.kolicina_tj} onChange={(v) => upd(setHeats, r.row_id, { kolicina_tj: v })} />
      <SelectField label={t('steel.ef.efDetermination')} value={r.metoda_ef} options={HEAT_METHODS}
        onChange={(v) => upd(setHeats, r.row_id, { metoda_ef: v })} />
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
          <CheckField label={t('steel.ef.mixHasWg')} checked={r.sadrzi_otpadni_plin} onChange={(v) => upd(setHeats, r.row_id, { sadrzi_otpadni_plin: v })} />
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
          <CheckField label={t('steel.ef.mixHasWg')} checked={r.sadrzi_otpadni_plin} onChange={(v) => upd(setHeats, r.row_id, { sadrzi_otpadni_plin: v })} />
        </>
      )}
      {r.metoda_ef === 'STANDARD_90' && (
        <SelectField label={t('steel.ef.fuelForStd')} value={r.gorivo_standard} options={fuelOptions} onChange={(v) => upd(setHeats, r.row_id, { gorivo_standard: v })} />
      )}
      {(r.metoda_ef === 'FUEL_MIX' || r.metoda_ef === 'CHP') && (
        <FullRow>
          <Typography sx={{ fontSize: '0.78rem', color: T.color.muted }}>
            {t('steel.ef.wgCapNote')}
          </Typography>
        </FullRow>
      )}
    </RowCard>
  );

  const renderWg = (r: WasteGasRow, idx: number) => (
    <RowCard key={r.row_id} title={t('steel.ef.wgN', { n: idx + 1 })} onRemove={() => setWgs((p) => p.filter((x) => x.row_id !== r.row_id))}>
      <SelectField label={t('steel.ef.direction')} value={r.smjer} options={[{ value: 'IMPORT', label: t('steel.ef.import') }, { value: 'EXPORT', label: t('steel.ef.export') }]}
        onChange={(v) => upd(setWgs, r.row_id, { smjer: v as WasteGasRow['smjer'], dokazi: v === 'EXPORT' ? r.dokazi : false })} />
      <SelectField label={t('steel.ef.gas')} value={r.plin} options={WASTE_GASES}
        onChange={(v) => upd(setWgs, r.row_id, { plin: v, ncv: r.jedinica === 't' ? str(byWizardCode[v]?.ncv) : r.ncv })} />
      <SelectField label={t('steel.de.unit')} value={r.jedinica} options={FUEL_UNITS}
        onChange={(v) => upd(setWgs, r.row_id, { jedinica: v, ncv: v === 't' ? str(byWizardCode[r.plin]?.ncv) : '' })} />
      <NumField label={t('steel.de.qtyUnit', { unit: r.jedinica === '1000Nm3' ? '1000 Nm³' : r.jedinica })} required value={r.kolicina} onChange={(v) => upd(setWgs, r.row_id, { kolicina: v })} />
      {r.jedinica !== 'TJ'
        ? <NumField label={r.jedinica === 't' ? 'NCV (GJ/t)' : 'NCV (GJ/1000 Nm³)'} required={r.jedinica === '1000Nm3'} value={r.ncv} onChange={(v) => upd(setWgs, r.row_id, { ncv: v })} />
        : <Box />}
      {r.smjer === 'EXPORT'
        ? <CheckField label={t('steel.ef.evidence')} checked={r.dokazi} onChange={(v) => upd(setWgs, r.row_id, { dokazi: v })} />
        : <Box />}
    </RowCard>
  );

  const renderEl = (r: ElProducedRow, idx: number) => (
    <RowCard key={r.row_id} title={t('steel.ef.elN', { n: idx + 1 })} onRemove={() => setEls((p) => p.filter((x) => x.row_id !== r.row_id))}>
      <NumField label={t('steel.ef.elMwh')} required value={r.mwh} onChange={(v) => upd(setEls, r.row_id, { mwh: v })} />
      <NumField label={t('steel.ef.elEf')} required value={r.ef} onChange={(v) => upd(setEls, r.row_id, { ef: v })} />
    </RowCard>
  );

  const renderProcess = (p: ProcessRow) => (
    <Box key={p.process_id} sx={{ mb: 3 }}>
      <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.forest, mb: 1 }}>
        {processLabel(p)}
      </Typography>
      <SectionTitle>{heatMeta.label}</SectionTitle>
      <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{heatMeta.help}</Typography>
      {heats.filter((r) => r.process_id === p.process_id).map(renderHeat)}
      <AddButton label={t('steel.ef.addHeat')} onClick={() => setHeats((prev) => [...prev, newHeat(p.process_id)])} />
      <SectionTitle>{wgMeta.label}</SectionTitle>
      <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{wgMeta.help}</Typography>
      {wgs.filter((r) => r.process_id === p.process_id).map(renderWg)}
      <AddButton label={t('steel.ef.addWg')} onClick={() => setWgs((prev) => [...prev, newWg(p.process_id)])} />
      <SectionTitle>{elMeta.label}</SectionTitle>
      <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{elMeta.help}</Typography>
      {els.filter((r) => r.process_id === p.process_id).map(renderEl)}
      <AddButton label={t('steel.ef.addEl')} onClick={() => setEls((prev) => [...prev, newEl(p.process_id)])} />
      <Divider sx={{ mt: 1, borderColor: T.color.lineFaint }} />
    </Box>
  );

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={t('steel.ef.title')} help={t('steel.ef.titleHelp')} />
      {data.processes.map(renderProcess)}
      <IssueList errors={errors} warnings={warnings} />
      <NavButtons
        onBack={onBack}
        onNext={() => onSubmit({ rows: { [IS_Q.HEAT]: heats, [IS_Q.WASTE_GAS]: wgs, [IS_Q.EL_PRODUCED]: els } })}
        nextDisabled={errors.length > 0}
        saving={saving}
        saveError={saveError}
      />
    </Box>
  );
}
