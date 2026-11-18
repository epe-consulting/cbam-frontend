import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { T } from './steelTheme';
import {
  AddButton, IssueList, NavButtons, NumField, RowCard, SectionTitle, SelectField, StepHeader, TextInput, type Option,
} from './SteelUi';
import { questionMeta, type SteelStepProps } from './types';
import { useIsStandardFactors } from '../../hooks/useIronSteelRefData';
import type { IsStandardFactor } from '../../api/ironSteel';
import {
  FACTOR_SOURCES, FUEL_UNITS, IS_Q, METHOD_LABELS, WASTE_GAS_FUEL_CODES, categoryLabel, checkFraction,
  checkNonNegative, checkPercent, checkPositive, deviatesFromStandard, factorLabel, newRowId, parseJsonRows, processLabel, toNum,
  type FuelRow, type MassBalanceRow, type MaterialRow, type ProcessRow, type StepIssue,
} from '../../utils/steelSteps';
import { useTranslation } from 'react-i18next';

const str = (n: number | null | undefined) => (n == null ? '' : String(Number(n.toPrecision(10))));

function newFuel(processId: string): FuelRow {
  return {
    row_id: newRowId(), process_id: processId, gorivo: '', naziv_ostalo: '', jedinica: 't', kolicina: '',
    ncv: '', ef: '', of: '1', bf_posto: '0', izvor_faktora: 'STANDARD_TABLE',
  };
}
function newMaterial(processId: string): MaterialRow {
  return {
    row_id: newRowId(), process_id: processId, materijal: '', metoda_karbonata: 'A', kolicina: '',
    udio_posto: '100', ef: '', cf: '1', naziv_ostalo: '',
  };
}
function newMb(processId: string, smjer: 'INPUT' | 'OUTPUT' = 'INPUT'): MassBalanceRow {
  return {
    row_id: newRowId(), process_id: processId, smjer, materijal: '', naziv: '', kolicina: '', nacin_unosa: 'CC',
    cc_posto: '', ef_t: '', ef_tj: '', ncv: '', bf_posto: '0',
  };
}

function fuelPrefill(row: FuelRow, f: IsStandardFactor | undefined, jedinica: string): Partial<FuelRow> {
  if (!f) return { ncv: jedinica === 'TJ' ? '' : row.ncv };
  return {
    ef: str(f.emissionFactor),
    ncv: jedinica === 't' ? str(f.ncv) : '',
    izvor_faktora: 'STANDARD_TABLE',
  };
}

export function SteelDirectEmissionsStep({ data, questions, saving, saveError, onBack, onSubmit }: SteelStepProps) {
  const { t } = useTranslation();
  const fuelMeta = questionMeta(questions, IS_Q.FUEL, t('steel.de.fuelLabel'), t('steel.de.fuelHelp'));
  const matMeta = questionMeta(questions, IS_Q.MATERIAL, t('steel.de.matLabel'), t('steel.de.matHelp'));
  const mbMeta = questionMeta(questions, IS_Q.MASS_BALANCE, t('steel.de.mbLabel'), t('steel.de.mbHelp'));
  const { factors, byWizardCode, loading: factorsLoading, error: factorsError } = useIsStandardFactors();

  const processIds = useMemo(() => new Set(data.processes.map((p) => p.process_id)), [data.processes]);
  const procById = useMemo(() => new Map(data.processes.map((p) => [p.process_id, p])), [data.processes]);

  const initial = useMemo(() => {
    const isMb = (pid: string) => procById.get(pid)?.metoda === 'MASS_BALANCE';
    const fuels = parseJsonRows<FuelRow>(data.values[IS_Q.FUEL]);
    const mats = parseJsonRows<MaterialRow>(data.values[IS_Q.MATERIAL]);
    const mbs = parseJsonRows<MassBalanceRow>(data.values[IS_Q.MASS_BALANCE]);
    const keptFuels = fuels.filter((r) => processIds.has(r.process_id) && !isMb(r.process_id));
    const keptMats = mats.filter((r) => processIds.has(r.process_id) && !isMb(r.process_id));
    const keptMbs = mbs.filter((r) => processIds.has(r.process_id) && isMb(r.process_id));
    const dropped = fuels.length - keptFuels.length + mats.length - keptMats.length + mbs.length - keptMbs.length;
    return { fuels: keptFuels, mats: keptMats, mbs: keptMbs, dropped };
  }, [data.values, processIds, procById]);

  const [fuels, setFuels] = useState<FuelRow[]>(initial.fuels.map((r) => ({ ...newFuel(r.process_id), ...r })));
  const [mats, setMats] = useState<MaterialRow[]>(initial.mats.map((r) => ({ ...newMaterial(r.process_id), ...r })));
  const [mbs, setMbs] = useState<MassBalanceRow[]>(initial.mbs.map((r) => ({ ...newMb(r.process_id), ...r })));

  const fuelFactors = factors.filter((f) => f.category === 'FUEL');
  const fuelOptions: Option[] = [
    ...fuelFactors.map((f) => ({ value: f.wizardCode, label: f.wizardCode.startsWith('BIO_') ? t('steel.de.biomassSuffix', { label: factorLabel(f) }) : factorLabel(f) })),
    { value: 'OTHER', label: t('common.other') },
  ];
  const materialOptions: Option[] = [
    ...factors.filter((f) => f.category === 'CARBONATE').map((f) => ({ value: f.wizardCode, label: t('steel.de.carbonateA', { label: factorLabel(f) }) })),
    ...factors.filter((f) => f.category === 'OXIDE').map((f) => ({ value: f.wizardCode, label: t('steel.de.oxideB', { label: f.wizardCode }) })),
    ...factors.filter((f) => f.category === 'STEEL_MATERIAL').map((f) => ({ value: f.wizardCode, label: t('steel.de.materialOpt', { label: factorLabel(f) }) })),
    { value: 'OTHER', label: t('common.other') },
  ];
  const mbMaterialOptions: Option[] = [
    ...factors.filter((f) => f.category === 'STEEL_MATERIAL').map((f) => ({ value: f.wizardCode, label: t('steel.de.materialOpt', { label: factorLabel(f) }) })),
    ...fuelFactors.map((f) => ({ value: f.wizardCode, label: t('steel.de.fuelOpt', { label: factorLabel(f) }) })),
    { value: 'OTHER', label: t('common.other') },
  ];

  const upd = <R extends { row_id: string }>(set: Dispatch<SetStateAction<R[]>>, rowId: string, patch: Partial<R>) =>
    set((prev) => prev.map((r) => (r.row_id === rowId ? { ...r, ...patch } : r)));

  const { errors, warnings } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    fuels.forEach((r, idx) => {
      const what = t('steel.de.fuelWhat', { n: idx + 1, process: r.process_id });
      const f = byWizardCode[r.gorivo];
      if (!r.gorivo) e.push({ code: '', message: t('steel.de.eSelectFuel', { what }) });
      if (r.gorivo === 'OTHER' && !r.naziv_ostalo.trim()) e.push({ code: '', message: t('steel.de.eFuelName', { what }) });
      checkPositive(r.kolicina, what, e);
      if (r.jedinica === '1000Nm3') {
        const n = toNum(r.ncv);
        if (n == null || n <= 0) e.push({ code: 'IS_E_FACTOR_RANGE', message: t('steel.de.eNcvNm3', { what }) });
      } else if (r.jedinica === 't') {
        const n = toNum(r.ncv);
        const needed = r.gorivo === 'OTHER' || !f || f.ncv == null;
        if ((n == null && needed) || (n != null && n <= 0)) e.push({ code: 'IS_E_FACTOR_RANGE', message: t('steel.de.eNcvT', { what }) });
      }
      checkNonNegative(r.ef, `${what}, EF`, e, r.gorivo === 'OTHER' || !f);
      checkFraction(r.of, t('steel.de.oxidationFactor', { what }), e, true);
      checkPercent(r.bf_posto, t('steel.de.biomassShare', { what }), e);
      if ((toNum(r.bf_posto) ?? 0) > 0) w.push({ code: 'IS_W_BIOMASS_UNVERIFIED', message: t('steel.de.wBiomass', { what }) });
      if (WASTE_GAS_FUEL_CODES.has(r.gorivo)) w.push({ code: 'IS_W_WG_IN_FUEL', message: t('steel.de.wWgInFuel', { what }) });
      if (f && (deviatesFromStandard(r.ef, f.emissionFactor) || (r.jedinica === 't' && deviatesFromStandard(r.ncv, f.ncv)))) {
        w.push({ code: 'IS_W_CC_DEVIATION', message: t('steel.de.wEfNcvDev', { what }) });
      }
    });
    mats.forEach((r, idx) => {
      const what = t('steel.de.matWhat', { n: idx + 1, process: r.process_id });
      const f = byWizardCode[r.materijal];
      if (!r.materijal) e.push({ code: '', message: t('steel.de.eSelectMaterial', { what }) });
      if (r.materijal === 'OTHER' && !r.naziv_ostalo.trim()) e.push({ code: '', message: t('steel.de.eMaterialName', { what }) });
      checkPositive(r.kolicina, what, e);
      checkPercent(r.udio_posto, t('steel.de.share', { what }), e, true);
      checkFraction(r.cf, t('steel.de.conversionFactor', { what }), e, true);
      checkNonNegative(r.ef, `${what}, EF`, e, r.materijal === 'OTHER' || !f);
      if (f && deviatesFromStandard(r.ef, f.emissionFactor)) w.push({ code: 'IS_W_CC_DEVIATION', message: t('steel.de.wEfDevEntered', { what }) });
    });
    mbs.forEach((r, idx) => {
      const what = t('steel.de.mbWhat', { n: idx + 1, process: r.process_id });
      const f = byWizardCode[r.materijal];
      if (!r.naziv.trim() && !r.materijal) e.push({ code: '', message: t('steel.de.eMbMaterial', { what }) });
      checkPositive(r.kolicina, what, e);
      if (r.nacin_unosa === 'CC') {
        checkPercent(r.cc_posto, t('steel.de.carbonContent', { what }), e, true);
        if (f?.carbonContent != null && deviatesFromStandard(r.cc_posto, f.carbonContent * 100)) w.push({ code: 'IS_W_CC_DEVIATION', message: t('steel.de.wCcDev', { what }) });
      } else if (r.nacin_unosa === 'EF_T') {
        checkNonNegative(r.ef_t, `${what}, EF (t CO2/t)`, e, true);
        if (f?.category === 'STEEL_MATERIAL' && deviatesFromStandard(r.ef_t, f.emissionFactor)) w.push({ code: 'IS_W_CC_DEVIATION', message: t('steel.de.wEfDev', { what }) });
      } else {
        checkNonNegative(r.ef_tj, `${what}, EF (t CO2/TJ)`, e, true);
        const n = toNum(r.ncv);
        if (n == null || n <= 0) e.push({ code: 'IS_E_FACTOR_RANGE', message: t('steel.de.eNcvT', { what }) });
        if (f?.category === 'FUEL' && deviatesFromStandard(r.ef_tj, f.emissionFactor)) w.push({ code: 'IS_W_CC_DEVIATION', message: t('steel.de.wEfDev', { what }) });
      }
      checkPercent(r.bf_posto, t('steel.de.biomassShare', { what }), e);
      if ((toNum(r.bf_posto) ?? 0) > 0) w.push({ code: 'IS_W_BIOMASS_UNVERIFIED', message: t('steel.de.wBiomass', { what }) });
    });
    data.processes.filter((p) => p.metoda === 'MASS_BALANCE').forEach((p) => {
      if (!mbs.some((r) => r.process_id === p.process_id && r.smjer === 'OUTPUT')) {
        w.push({ code: 'IS_W_MB_NO_OUTPUT', message: t('steel.de.wMbNoOutput', { id: p.process_id }) });
      }
    });
    return { errors: e, warnings: w };
  }, [fuels, mats, mbs, byWizardCode, data.processes, t]);

  const renderFuel = (r: FuelRow, idx: number) => {
    const f = byWizardCode[r.gorivo];
    return (
      <RowCard key={r.row_id} title={t('steel.de.fuelN', { n: idx + 1 })} onRemove={() => setFuels((p) => p.filter((x) => x.row_id !== r.row_id))}>
        <SelectField label={t('steel.de.fuel')} required value={r.gorivo} options={fuelOptions}
          onChange={(v) => upd(setFuels, r.row_id, { gorivo: v, ...fuelPrefill(r, byWizardCode[v], r.jedinica), ...(v === 'OTHER' ? { ef: '', ncv: '', izvor_faktora: 'OTHER' } : {}) })} />
        {r.gorivo === 'OTHER'
          ? <TextInput label={t('steel.de.fuelName')} required value={r.naziv_ostalo} onChange={(v) => upd(setFuels, r.row_id, { naziv_ostalo: v })} />
          : <Box />}
        <SelectField label={t('steel.de.unit')} value={r.jedinica} options={FUEL_UNITS}
          onChange={(v) => upd(setFuels, r.row_id, { jedinica: v, ncv: v === 't' ? str(f?.ncv) : '' })} />
        <NumField label={t('steel.de.qtyUnit', { unit: r.jedinica === '1000Nm3' ? '1000 Nm³' : r.jedinica })} required value={r.kolicina} onChange={(v) => upd(setFuels, r.row_id, { kolicina: v })} />
        {r.jedinica !== 'TJ'
          ? <NumField label={r.jedinica === 't' ? 'NCV (GJ/t)' : 'NCV (GJ/1000 Nm³)'} required={r.jedinica === '1000Nm3'} value={r.ncv} onChange={(v) => upd(setFuels, r.row_id, { ncv: v })} />
          : <Box />}
        <NumField label="EF (t CO2/TJ)" value={r.ef} onChange={(v) => upd(setFuels, r.row_id, { ef: v })} />
        <NumField label={t('steel.de.oxidationFactorField')} value={r.of} onChange={(v) => upd(setFuels, r.row_id, { of: v })} />
        <NumField label={t('steel.de.biomassField')} value={r.bf_posto} onChange={(v) => upd(setFuels, r.row_id, { bf_posto: v })} />
        <SelectField label={t('steel.de.factorSource')} value={r.izvor_faktora} options={FACTOR_SOURCES} onChange={(v) => upd(setFuels, r.row_id, { izvor_faktora: v })} />
        {f?.source && (
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Typography sx={{ fontSize: '0.78rem', color: T.color.muted }}>{t('steel.de.standardFuel', { ef: str(f.emissionFactor), ncv: f.ncv != null ? `, NCV ${str(f.ncv)} GJ/t` : '', source: f.source })}</Typography>
          </Box>
        )}
      </RowCard>
    );
  };

  const renderMaterial = (r: MaterialRow, idx: number) => {
    const f = byWizardCode[r.materijal];
    return (
      <RowCard key={r.row_id} title={t('steel.de.matN', { n: idx + 1 })} onRemove={() => setMats((p) => p.filter((x) => x.row_id !== r.row_id))}>
        <SelectField label={t('steel.de.material')} required value={r.materijal} options={materialOptions}
          onChange={(v) => {
            const nf = byWizardCode[v];
            upd(setMats, r.row_id, {
              materijal: v,
              ef: nf ? str(nf.emissionFactor) : '',
              metoda_karbonata: nf?.category === 'OXIDE' ? 'B' : nf?.category === 'CARBONATE' ? 'A' : r.metoda_karbonata,
            });
          }} />
        {r.materijal === 'OTHER'
          ? <TextInput label={t('steel.de.materialName')} required value={r.naziv_ostalo} onChange={(v) => upd(setMats, r.row_id, { naziv_ostalo: v })} />
          : <Box />}
        <SelectField label={t('steel.de.method')} value={r.metoda_karbonata}
          disabled={f?.category === 'CARBONATE' || f?.category === 'OXIDE'}
          options={[{ value: 'A', label: t('steel.de.methodA') }, { value: 'B', label: t('steel.de.methodB') }]}
          onChange={(v) => upd(setMats, r.row_id, { metoda_karbonata: v })} />
        <NumField label={t('steel.de.materialQty')} required value={r.kolicina} onChange={(v) => upd(setMats, r.row_id, { kolicina: v })} />
        <NumField label={t('steel.de.pureShare')} value={r.udio_posto} onChange={(v) => upd(setMats, r.row_id, { udio_posto: v })} />
        <NumField label={t('steel.de.efPure')} required={r.materijal === 'OTHER'} value={r.ef} onChange={(v) => upd(setMats, r.row_id, { ef: v })} />
        <NumField label={t('steel.de.conversionField')} value={r.cf} onChange={(v) => upd(setMats, r.row_id, { cf: v })} />
        {f?.source && (
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Typography sx={{ fontSize: '0.78rem', color: T.color.muted }}>{t('steel.de.standardMat', { ef: str(f.emissionFactor), source: f.source })}</Typography>
          </Box>
        )}
      </RowCard>
    );
  };

  const renderMb = (r: MassBalanceRow, idx: number) => (
    <RowCard key={r.row_id} title={`${r.smjer === 'INPUT' ? t('steel.de.input') : t('steel.de.output')} ${idx + 1}`} onRemove={() => setMbs((p) => p.filter((x) => x.row_id !== r.row_id))}>
      <SelectField label={t('steel.de.direction')} value={r.smjer} options={[{ value: 'INPUT', label: t('steel.de.input') }, { value: 'OUTPUT', label: t('steel.de.output') }]}
        onChange={(v) => upd(setMbs, r.row_id, { smjer: v as MassBalanceRow['smjer'] })} />
      <SelectField label={t('steel.de.mbMaterial')} value={r.materijal} options={mbMaterialOptions} emptyLabel="—"
        onChange={(v) => {
          const nf = byWizardCode[v];
          const patch: Partial<MassBalanceRow> = { materijal: v, naziv: r.naziv || (nf ? factorLabel(nf) : '') };
          if (nf?.category === 'STEEL_MATERIAL' && nf.carbonContent != null) Object.assign(patch, { nacin_unosa: 'CC', cc_posto: str(nf.carbonContent * 100) });
          else if (nf?.category === 'FUEL') Object.assign(patch, { nacin_unosa: 'EF_TJ', ef_tj: str(nf.emissionFactor), ncv: str(nf.ncv) });
          upd(setMbs, r.row_id, patch);
        }} />
      <TextInput label={t('steel.de.name')} value={r.naziv} onChange={(v) => upd(setMbs, r.row_id, { naziv: v })} />
      <NumField label={t('steel.proc.qtyT')} required value={r.kolicina} onChange={(v) => upd(setMbs, r.row_id, { kolicina: v })} />
      <SelectField label={t('steel.de.entryMode')} value={r.nacin_unosa}
        options={[
          { value: 'CC', label: t('steel.de.modeCc') },
          { value: 'EF_T', label: t('steel.de.modeEfT') },
          { value: 'EF_TJ', label: t('steel.de.modeEfTj') },
        ]}
        onChange={(v) => upd(setMbs, r.row_id, { nacin_unosa: v as MassBalanceRow['nacin_unosa'] })} />
      {r.nacin_unosa === 'CC' && <NumField label={t('steel.de.ccField')} required value={r.cc_posto} onChange={(v) => upd(setMbs, r.row_id, { cc_posto: v })} />}
      {r.nacin_unosa === 'EF_T' && <NumField label="EF (t CO2/t)" required value={r.ef_t} onChange={(v) => upd(setMbs, r.row_id, { ef_t: v })} />}
      {r.nacin_unosa === 'EF_TJ' && <NumField label="EF (t CO2/TJ)" required value={r.ef_tj} onChange={(v) => upd(setMbs, r.row_id, { ef_tj: v })} />}
      {r.nacin_unosa === 'EF_TJ' && <NumField label="NCV (GJ/t)" required value={r.ncv} onChange={(v) => upd(setMbs, r.row_id, { ncv: v })} />}
      <NumField label={t('steel.de.biomassField')} value={r.bf_posto} onChange={(v) => upd(setMbs, r.row_id, { bf_posto: v })} />
    </RowCard>
  );

  const renderProcess = (p: ProcessRow) => {
    const pf = fuels.filter((r) => r.process_id === p.process_id);
    const pm = mats.filter((r) => r.process_id === p.process_id);
    const pb = mbs.filter((r) => r.process_id === p.process_id);
    return (
      <Box key={p.process_id} sx={{ mb: 3 }}>
        <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.forest }}>
          {processLabel(p)}
        </Typography>
        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>
          {categoryLabel(p.kategorija)} · {METHOD_LABELS[p.metoda]}
        </Typography>
        {p.metoda === 'STANDARD' ? (
          <>
            <SectionTitle>{fuelMeta.label}</SectionTitle>
            <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{fuelMeta.help}</Typography>
            {pf.map(renderFuel)}
            <AddButton label={t('steel.de.addFuel')} onClick={() => setFuels((prev) => [...prev, newFuel(p.process_id)])} />
            <SectionTitle>{matMeta.label}</SectionTitle>
            <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{matMeta.help}</Typography>
            {pm.map(renderMaterial)}
            <AddButton label={t('steel.de.addMaterial')} onClick={() => setMats((prev) => [...prev, newMaterial(p.process_id)])} />
          </>
        ) : (
          <>
            <SectionTitle>{mbMeta.label}</SectionTitle>
            <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{mbMeta.help}</Typography>
            {pb.map(renderMb)}
            <Box display="flex" gap={1} flexWrap="wrap">
              <AddButton label={t('steel.de.addInput')} onClick={() => setMbs((prev) => [...prev, newMb(p.process_id, 'INPUT')])} />
              <AddButton label={t('steel.de.addOutput')} onClick={() => setMbs((prev) => [...prev, newMb(p.process_id, 'OUTPUT')])} />
            </Box>
          </>
        )}
        <Divider sx={{ mt: 1, borderColor: T.color.lineFaint }} />
      </Box>
    );
  };

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={t('steel.de.title')} help={t('steel.de.titleHelp')} />
      {factorsLoading && <Typography sx={{ fontSize: '0.85rem', color: T.color.muted, mb: 2 }}>{t('steel.de.factorsLoading')}</Typography>}
      {factorsError && <IssueList infos={[t('steel.de.factorsError', { error: factorsError })]} />}
      {data.processes.map(renderProcess)}
      <IssueList
        errors={errors}
        warnings={warnings}
        infos={initial.dropped > 0 ? [t('steel.de.dropped', { count: initial.dropped })] : undefined}
      />
      <NavButtons
        onBack={onBack}
        onNext={() => onSubmit({ rows: { [IS_Q.FUEL]: fuels, [IS_Q.MATERIAL]: mats, [IS_Q.MASS_BALANCE]: mbs } })}
        nextDisabled={errors.length > 0}
        saving={saving}
        saveError={saveError}
      />
    </Box>
  );
}
