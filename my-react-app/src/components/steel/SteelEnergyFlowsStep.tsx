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

const HEAT_HELP = 'Neto mjerljiva toplota (para, vrela voda) u TJ. Toplota iz egzotermnih hemijskih procesa i toplota rekuperirana iz električnih procesa ima nula emisija.';
const WG_HELP = 'Uvoz: plin proizveden u drugom procesu i sagorjen u ovom. Izvoz: plin proizveden u ovom procesu i sagorjen u drugom (npr. elektrana). Plinovi proizvedeni i potrošeni u istom procesu ne unose se ovdje.';
const EL_HELP = 'Samo ako se struja proizvodi od goriva uključenih u ovaj proces (Emel,prod u jednačini 55). EF prema jednačini 38; za otpadni plin koristi se najviše EF prirodnog plina.';

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
  const heatMeta = questionMeta(questions, IS_Q.HEAT, 'Mjerljiva toplota (uvoz u proces / izvoz iz procesa)', HEAT_HELP);
  const wgMeta = questionMeta(questions, IS_Q.WASTE_GAS, 'Otpadni plinovi (BFG, konvertorski, koksni plin) – uvoz/izvoz', WG_HELP);
  const elMeta = questionMeta(questions, IS_Q.EL_PRODUCED, 'Električna energija proizvedena unutar granica procesa', EL_HELP);
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
      const what = `Toplota ${idx + 1} (${r.process_id})`;
      checkPositive(r.kolicina_tj, what, e);
      switch (r.metoda_ef) {
        case 'SUPPLIER_VERIFIED':
          checkNonNegative(r.ef_toplote, `${what}, EF toplote`, e, true);
          if (!r.dokazi) {
            w.push({ code: '', message: `${what}: bez dokaza se EF dobavljača ne koristi – primjenjuje se standardni EF goriva / 0,9.` });
            if (!r.gorivo_standard) e.push({ code: '', message: `${what}: odaberite gorivo za standardni EF (koristi se kada nema dokaza).` });
          }
          break;
        case 'FUEL_MIX':
          checkNonNegative(r.ef_mix, `${what}, EF mješavine goriva`, e, true);
          checkFraction(r.eta, `${what}, η`, e, true);
          if (r.sadrzi_otpadni_plin && (toNum(r.ef_mix) ?? 0) > EF_NG_WASTE_GAS) {
            w.push({ code: 'IS_W_WG_EF_CAP', message: `${what}: mješavina sadrži otpadni plin – za otpadni plin smije se koristiti najviše EF prirodnog plina (56,1 t CO2/TJ).` });
          }
          break;
        case 'CHP': {
          checkNonNegative(r.chp.em_chp, `${what}, emisije CHP`, e, true);
          checkPositive(r.chp.q_net_tj, `${what}, neto toplota CHP`, e);
          checkNonNegative(r.chp.e_el_tj, `${what}, proizvedena el. energija CHP`, e, true);
          checkPositive(r.chp.e_in_tj, `${what}, ulazna energija goriva CHP`, e);
          checkFraction(r.chp.eta_ref_heat, `${what}, referentna η toplote`, e);
          checkFraction(r.chp.eta_ref_el, `${what}, referentna η el. energije`, e);
          break;
        }
        case 'STANDARD_90':
          if (!r.gorivo_standard) e.push({ code: '', message: `${what}: odaberite gorivo za standardni EF.` });
          break;
        default:
          break;
      }
    });
    wgs.forEach((r, idx) => {
      const what = `Otpadni plin ${idx + 1} (${r.process_id})`;
      checkPositive(r.kolicina, what, e);
      if (r.jedinica !== 'TJ') {
        const n = toNum(r.ncv);
        const needed = r.jedinica === '1000Nm3' || r.plin === 'OTHER' || byWizardCode[r.plin]?.ncv == null;
        if ((n == null && needed) || (n != null && n <= 0)) {
          e.push({ code: 'IS_E_FACTOR_RANGE', message: `${what}: unesite NCV (${r.jedinica === 't' ? 'GJ/t' : 'GJ/1000 Nm³'}) > 0.` });
        }
      }
      if (r.smjer === 'EXPORT' && !r.dokazi) {
        w.push({ code: 'IS_W_WG_EXPORT_NO_EVIDENCE', message: `${what}: izvoz otpadnog plina bez dokaza za verifikatora – odbitak se ne primjenjuje.` });
      }
    });
    els.forEach((r, idx) => {
      const what = `Proizvedena el. energija ${idx + 1} (${r.process_id})`;
      checkNonNegative(r.mwh, `${what}, MWh`, e, true);
      checkNonNegative(r.ef, `${what}, EF`, e, true);
    });
    return { errors: e, warnings: w };
  }, [heats, wgs, els, byWizardCode]);

  const renderHeat = (r: HeatRow, idx: number) => (
    <RowCard key={r.row_id} title={`Toplota ${idx + 1}`} onRemove={() => setHeats((p) => p.filter((x) => x.row_id !== r.row_id))}>
      <SelectField label="Smjer" value={r.smjer} options={[{ value: 'IMPORT', label: 'Uvoz u proces' }, { value: 'EXPORT', label: 'Izvoz iz procesa' }]}
        onChange={(v) => upd(setHeats, r.row_id, { smjer: v as HeatRow['smjer'] })} />
      <NumField label="Neto mjerljiva toplota (TJ)" required value={r.kolicina_tj} onChange={(v) => upd(setHeats, r.row_id, { kolicina_tj: v })} />
      <SelectField label="Određivanje emisionog faktora" value={r.metoda_ef} options={HEAT_METHODS}
        onChange={(v) => upd(setHeats, r.row_id, { metoda_ef: v })} />
      {r.metoda_ef === 'SUPPLIER_VERIFIED' && (
        <>
          <NumField label="EF toplote (t CO2/TJ toplote)" required value={r.ef_toplote} onChange={(v) => upd(setHeats, r.row_id, { ef_toplote: v })} />
          <CheckField label="Dokazi za verifikatora su dostupni" checked={r.dokazi} onChange={(v) => upd(setHeats, r.row_id, { dokazi: v })} />
          {!r.dokazi
            ? <SelectField label="Gorivo za standardni EF" value={r.gorivo_standard} options={fuelOptions} onChange={(v) => upd(setHeats, r.row_id, { gorivo_standard: v })} />
            : <Box />}
        </>
      )}
      {r.metoda_ef === 'FUEL_MIX' && (
        <>
          <NumField label="EF mješavine goriva (t CO2/TJ goriva)" required value={r.ef_mix} onChange={(v) => upd(setHeats, r.row_id, { ef_mix: v })} />
          <NumField label="Efikasnost proizvodnje toplote η (0–1)" required value={r.eta} onChange={(v) => upd(setHeats, r.row_id, { eta: v })} />
          <CheckField label="Mješavina goriva sadrži otpadni plin" checked={r.sadrzi_otpadni_plin} onChange={(v) => upd(setHeats, r.row_id, { sadrzi_otpadni_plin: v })} />
        </>
      )}
      {r.metoda_ef === 'CHP' && (
        <>
          <NumField label="Emisije CHP postrojenja (t CO2)" required value={r.chp.em_chp} onChange={(v) => upd(setHeats, r.row_id, { chp: { ...r.chp, em_chp: v } })} />
          <NumField label="Neto proizvedena toplota CHP (TJ)" required value={r.chp.q_net_tj} onChange={(v) => upd(setHeats, r.row_id, { chp: { ...r.chp, q_net_tj: v } })} />
          <NumField label="Proizvedena el. energija CHP (TJ)" required value={r.chp.e_el_tj} onChange={(v) => upd(setHeats, r.row_id, { chp: { ...r.chp, e_el_tj: v } })} />
          <NumField label="Ulazna energija goriva CHP (TJ)" required value={r.chp.e_in_tj} onChange={(v) => upd(setHeats, r.row_id, { chp: { ...r.chp, e_in_tj: v } })} />
          <NumField label="Referentna η toplote (prazno = 0,55)" value={r.chp.eta_ref_heat} onChange={(v) => upd(setHeats, r.row_id, { chp: { ...r.chp, eta_ref_heat: v } })} />
          <NumField label="Referentna η el. energije (prazno = 0,25)" value={r.chp.eta_ref_el} onChange={(v) => upd(setHeats, r.row_id, { chp: { ...r.chp, eta_ref_el: v } })} />
          <CheckField label="Mješavina goriva sadrži otpadni plin" checked={r.sadrzi_otpadni_plin} onChange={(v) => upd(setHeats, r.row_id, { sadrzi_otpadni_plin: v })} />
        </>
      )}
      {r.metoda_ef === 'STANDARD_90' && (
        <SelectField label="Gorivo za standardni EF" value={r.gorivo_standard} options={fuelOptions} onChange={(v) => upd(setHeats, r.row_id, { gorivo_standard: v })} />
      )}
      {(r.metoda_ef === 'FUEL_MIX' || r.metoda_ef === 'CHP') && (
        <FullRow>
          <Typography sx={{ fontSize: '0.78rem', color: T.color.muted }}>
            Ako je otpadni plin dio mješavine goriva i njegov EF je veći od 56,1 t CO2/TJ, za otpadni plin koristite 56,1 t CO2/TJ.
          </Typography>
        </FullRow>
      )}
    </RowCard>
  );

  const renderWg = (r: WasteGasRow, idx: number) => (
    <RowCard key={r.row_id} title={`Otpadni plin ${idx + 1}`} onRemove={() => setWgs((p) => p.filter((x) => x.row_id !== r.row_id))}>
      <SelectField label="Smjer" value={r.smjer} options={[{ value: 'IMPORT', label: 'Uvoz u proces' }, { value: 'EXPORT', label: 'Izvoz iz procesa' }]}
        onChange={(v) => upd(setWgs, r.row_id, { smjer: v as WasteGasRow['smjer'], dokazi: v === 'EXPORT' ? r.dokazi : false })} />
      <SelectField label="Plin" value={r.plin} options={WASTE_GASES}
        onChange={(v) => upd(setWgs, r.row_id, { plin: v, ncv: r.jedinica === 't' ? str(byWizardCode[v]?.ncv) : r.ncv })} />
      <SelectField label="Jedinica" value={r.jedinica} options={FUEL_UNITS}
        onChange={(v) => upd(setWgs, r.row_id, { jedinica: v, ncv: v === 't' ? str(byWizardCode[r.plin]?.ncv) : '' })} />
      <NumField label={`Količina (${r.jedinica === '1000Nm3' ? '1000 Nm³' : r.jedinica})`} required value={r.kolicina} onChange={(v) => upd(setWgs, r.row_id, { kolicina: v })} />
      {r.jedinica !== 'TJ'
        ? <NumField label={r.jedinica === 't' ? 'NCV (GJ/t)' : 'NCV (GJ/1000 Nm³)'} required={r.jedinica === '1000Nm3'} value={r.ncv} onChange={(v) => upd(setWgs, r.row_id, { ncv: v })} />
        : <Box />}
      {r.smjer === 'EXPORT'
        ? <CheckField label="Dokazi za verifikatora su dostupni" checked={r.dokazi} onChange={(v) => upd(setWgs, r.row_id, { dokazi: v })} />
        : <Box />}
    </RowCard>
  );

  const renderEl = (r: ElProducedRow, idx: number) => (
    <RowCard key={r.row_id} title={`Proizvedena el. energija ${idx + 1}`} onRemove={() => setEls((p) => p.filter((x) => x.row_id !== r.row_id))}>
      <NumField label="Proizvedena el. energija (MWh)" required value={r.mwh} onChange={(v) => upd(setEls, r.row_id, { mwh: v })} />
      <NumField label="EF el. energije (t CO2/MWh)" required value={r.ef} onChange={(v) => upd(setEls, r.row_id, { ef: v })} />
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
      <AddButton label="Dodaj tok toplote" onClick={() => setHeats((prev) => [...prev, newHeat(p.process_id)])} />
      <SectionTitle>{wgMeta.label}</SectionTitle>
      <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{wgMeta.help}</Typography>
      {wgs.filter((r) => r.process_id === p.process_id).map(renderWg)}
      <AddButton label="Dodaj otpadni plin" onClick={() => setWgs((prev) => [...prev, newWg(p.process_id)])} />
      <SectionTitle>{elMeta.label}</SectionTitle>
      <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{elMeta.help}</Typography>
      {els.filter((r) => r.process_id === p.process_id).map(renderEl)}
      <AddButton label="Dodaj proizvedenu el. energiju" onClick={() => setEls((prev) => [...prev, newEl(p.process_id)])} />
      <Divider sx={{ mt: 1, borderColor: T.color.lineFaint }} />
    </Box>
  );

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title="Energetski tokovi" help="Svi unosi u ovom koraku su opcionalni. Unesite samo tokove toplote i otpadnih plinova koji prelaze granice procesa." />
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
