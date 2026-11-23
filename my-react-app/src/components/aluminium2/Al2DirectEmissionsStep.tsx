import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { T } from '../steel/steelTheme';
import {
  AddButton, FullRow, IssueList, NavButtons, NumField, RowCard, SectionTitle, SelectField, StepHeader, TextInput, type Option,
} from '../steel/SteelUi';
import { questionMeta, type Al2StepProps } from './types';
import { useIsStandardFactors } from '../../hooks/useIronSteelRefData';
import type { IsStandardFactor } from '../../api/ironSteel';
import {
  FACTOR_SOURCES, FUEL_UNITS, checkFraction, checkNonNegative, checkPercent, checkPositive, deviatesFromStandard, factorLabel,
  newRowId, parseJsonRows, toNum, type StepIssue,
} from '../../utils/steelSteps';
import {
  AL2_ANODE_KINDS, AL2_FLUE_GAS_KINDS, AL2_Q, EF_GYPSUM_B, EF_UREA_DENOX, al2CategoryLabel, al2IssueText, al2ProcessLabel,
  anodeEf, anodeEmissions, anodeRowIssues, flueGasAandB, flueGasEmissions, flueGasRowIssues, netAnodeConsumption, processIsPrimary,
  type Al2AnodeKind, type Al2AnodeRow, type Al2FlueGasKind, type Al2FlueGasRow, type Al2FuelRow, type Al2ProcessRow,
} from '../../utils/aluminium2Steps';

const str = (n: number | null | undefined) => (n == null ? '' : String(Number(n.toPrecision(10))));
const fmt = (n: number | null | undefined, d = 3) => (n == null ? '—' : n.toLocaleString('bs-BA', { maximumFractionDigits: d }));

function newFuel(processId: string): Al2FuelRow {
  return {
    row_id: newRowId(), process_id: processId, gorivo: '', naziv_ostalo: '', jedinica: 't', kolicina: '',
    ncv: '', ef: '', of: '1', bf_posto: '0', izvor_faktora: 'STANDARD_TABLE',
  };
}
function newAnode(processId: string): Al2AnodeRow {
  // cf default 1 (MA Annex II B.3.1.2, p.35: "may always be used")
  return { row_id: newRowId(), process_id: processId, vrsta: 'PREBAKED_ANODE', naziv: '', ulaz_t: '', ostaci_t: '', cc_posto: '', ef: '', cf: '1' };
}
function newFlue(processId: string): Al2FlueGasRow {
  // udio default 100 %, cf default 1 (contract §2)
  return { row_id: newRowId(), process_id: processId, vrsta: '', materijal: '', kolicina: '', udio_posto: '100', ef: '', cf: '1' };
}

function fuelPrefill(row: Al2FuelRow, f: IsStandardFactor | undefined, jedinica: string): Partial<Al2FuelRow> {
  if (!f) return { ncv: jedinica === 'TJ' ? '' : row.ncv };
  return { ef: str(f.emissionFactor), ncv: jedinica === 't' ? str(f.ncv) : '', izvor_faktora: 'STANDARD_TABLE' };
}

/** AL2_DIRECT_EMISSIONS (spec §4.4, §3.3(1)–(3), FE-7): fuels, anodes (primary only), flue gas per process. */
export function Al2DirectEmissionsStep({ data, questions, saving, saveError, onBack, onSubmit }: Al2StepProps) {
  const { t } = useTranslation();
  const fuelMeta = questionMeta(questions, AL2_Q.FUEL, t('aluminium2.de.fuelLabel'), t('aluminium2.de.fuelHelp'));
  const anodeMeta = questionMeta(questions, AL2_Q.ANODE, t('aluminium2.de.anodeLabel'), t('aluminium2.de.anodeHelp'));
  const flueMeta = questionMeta(questions, AL2_Q.FLUE_GAS, t('aluminium2.de.flueLabel'), t('aluminium2.de.flueHelp'));
  const { factors, byWizardCode, loading: factorsLoading, error: factorsError } = useIsStandardFactors();
  const procById = useMemo(() => new Map(data.processes.map((p) => [p.process_id, p])), [data.processes]);
  const carbonateByCode = useMemo(() => {
    const m: Record<string, IsStandardFactor> = {};
    factors.filter((f) => f.category === 'CARBONATE').forEach((f) => { m[f.wizardCode] = f; });
    return m;
  }, [factors]);

  const initial = useMemo(() => {
    const has = (pid: string) => procById.has(pid);
    const primary = (pid: string) => { const p = procById.get(pid); return p != null && processIsPrimary(p); };
    const fuels = parseJsonRows<Al2FuelRow>(data.values[AL2_Q.FUEL]);
    const anodes = parseJsonRows<Al2AnodeRow>(data.values[AL2_Q.ANODE]);
    const flues = parseJsonRows<Al2FlueGasRow>(data.values[AL2_Q.FLUE_GAS]);
    const kf = fuels.filter((r) => has(r.process_id));
    const ka = anodes.filter((r) => primary(r.process_id));
    const kg = flues.filter((r) => has(r.process_id));
    const dropped = fuels.length - kf.length + anodes.length - ka.length + flues.length - kg.length;
    return { fuels: kf, anodes: ka, flues: kg, dropped };
  }, [data.values, procById]);

  const [fuels, setFuels] = useState<Al2FuelRow[]>(initial.fuels.map((r) => ({ ...newFuel(r.process_id), ...r })));
  const [anodes, setAnodes] = useState<Al2AnodeRow[]>(initial.anodes.map((r) => ({ ...newAnode(r.process_id), ...r })));
  const [flues, setFlues] = useState<Al2FlueGasRow[]>(initial.flues.map((r) => ({ ...newFlue(r.process_id), ...r })));
  const savedPfc = useMemo(() => parseJsonRows<{ process_id: string }>(data.values[AL2_Q.PFC]), [data.values]);

  const fuelOptions: Option[] = [
    ...factors.filter((f) => f.category === 'FUEL').map((f) => ({ value: f.wizardCode, label: f.wizardCode.startsWith('BIO_') ? t('steel.de.biomassSuffix', { label: factorLabel(f) }) : factorLabel(f) })),
    { value: 'OTHER', label: t('common.other') },
  ];
  const carbonateOptions: Option[] = factors.filter((f) => f.category === 'CARBONATE').map((f) => ({ value: f.wizardCode, label: factorLabel(f) }));

  const upd = <R extends { row_id: string }>(set: Dispatch<SetStateAction<R[]>>, rowId: string, patch: Partial<R>) =>
    set((prev) => prev.map((r) => (r.row_id === rowId ? { ...r, ...patch } : r)));

  const { errors, warnings } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    fuels.forEach((r, idx) => {
      const what = t('aluminium2.de.fuelWhat', { n: idx + 1, process: r.process_id });
      const f = byWizardCode[r.gorivo];
      if (!r.gorivo) e.push({ code: '', message: t('steel.de.eSelectFuel', { what }) });
      if (r.gorivo === 'OTHER' && !r.naziv_ostalo.trim()) e.push({ code: '', message: t('steel.de.eFuelName', { what }) });
      checkPositive(r.kolicina, what, e);
      if (r.jedinica === '1000Nm3') {
        const n = toNum(r.ncv);
        if (n == null || n <= 0) e.push({ code: 'AL2_E_FACTOR_RANGE', message: t('steel.de.eNcvNm3', { what }) });
      } else if (r.jedinica === 't') {
        const n = toNum(r.ncv);
        const needed = r.gorivo === 'OTHER' || !f || f.ncv == null;
        if ((n == null && needed) || (n != null && n <= 0)) e.push({ code: 'AL2_E_FACTOR_RANGE', message: t('steel.de.eNcvT', { what }) });
      }
      checkNonNegative(r.ef, `${what}, EF`, e, r.gorivo === 'OTHER' || !f);
      checkFraction(r.of, t('steel.de.oxidationFactor', { what }), e, true);
      checkPercent(r.bf_posto, t('steel.de.biomassShare', { what }), e);
      // Biomass criteria (MA B.3.3) are not checked – warning only (spec §1.9 item 8).
      if ((toNum(r.bf_posto) ?? 0) > 0) w.push({ code: 'AL2_W_BIOMASS_UNVERIFIED', message: al2IssueText('AL2_W_BIOMASS_UNVERIFIED', { what }) });
      if (f && (deviatesFromStandard(r.ef, f.emissionFactor) || (r.jedinica === 't' && deviatesFromStandard(r.ncv, f.ncv)))) {
        w.push({ code: '', message: t('aluminium2.de.wDeviation', { what }) });
      }
    });
    anodes.forEach((r, idx) => {
      const what = t('aluminium2.de.anodeWhat', { n: idx + 1, process: r.process_id });
      anodeRowIssues(r, procById.get(r.process_id)).forEach((c) => e.push({ code: c, message: al2IssueText(c, { what }) }));
    });
    flues.forEach((r, idx) => {
      const what = t('aluminium2.de.flueWhat', { n: idx + 1, process: r.process_id });
      flueGasRowIssues(r, carbonateByCode[r.materijal]?.emissionFactor ?? null).forEach((c) => e.push({ code: c, message: al2IssueText(c, { what }) }));
    });
    data.processes.forEach((p) => {
      const label = al2ProcessLabel(p);
      const own = <R extends { process_id: string }>(rows: R[]) => rows.filter((r) => r.process_id === p.process_id);
      if (flueGasAandB(own(flues))) w.push({ code: 'AL2_W_FLUE_GAS_A_AND_B', message: al2IssueText('AL2_W_FLUE_GAS_A_AND_B', { what: label }) });
      if (processIsPrimary(p) && own(anodes).length === 0) w.push({ code: 'AL2_W_ANODE_MISSING', message: al2IssueText('AL2_W_ANODE_MISSING', { what: label }) });
      if (own(fuels).length + own(anodes).length + own(flues).length + own(savedPfc).length === 0) {
        w.push({ code: 'AL2_W_NO_DIRECT_EMISSIONS', message: al2IssueText('AL2_W_NO_DIRECT_EMISSIONS', { what: label }) });
      }
    });
    return { errors: e, warnings: w };
  }, [fuels, anodes, flues, savedPfc, byWizardCode, carbonateByCode, procById, data.processes, t]);

  const renderFuel = (r: Al2FuelRow, idx: number) => {
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
          <FullRow>
            <Typography sx={{ fontSize: '0.78rem', color: T.color.muted }}>{t('steel.de.standardFuel', { ef: str(f.emissionFactor), ncv: f.ncv != null ? `, NCV ${str(f.ncv)} GJ/t` : '', source: f.source })}</Typography>
          </FullRow>
        )}
      </RowCard>
    );
  };

  const renderAnode = (r: Al2AnodeRow, idx: number) => {
    const net = netAnodeConsumption(r.ulaz_t, r.ostaci_t);
    const ef = anodeEf(r.cc_posto, r.ef);
    const em = anodeEmissions(r);
    return (
      <RowCard key={r.row_id} title={t('aluminium2.de.anodeN', { n: idx + 1 })} onRemove={() => setAnodes((p) => p.filter((x) => x.row_id !== r.row_id))}>
        <SelectField label={t('aluminium2.de.anodeKind')} value={r.vrsta} options={AL2_ANODE_KINDS}
          onChange={(v) => upd(setAnodes, r.row_id, { vrsta: v as Al2AnodeKind })} />
        <TextInput label={t('aluminium2.de.anodeName')} value={r.naziv} onChange={(v) => upd(setAnodes, r.row_id, { naziv: v })} />
        <Box />
        <NumField label={t('aluminium2.de.anodeIn')} required value={r.ulaz_t} onChange={(v) => upd(setAnodes, r.row_id, { ulaz_t: v })} />
        <NumField label={t('aluminium2.de.anodeStubs')} value={r.ostaci_t} onChange={(v) => upd(setAnodes, r.row_id, { ostaci_t: v })} />
        <Box />
        <NumField label={t('aluminium2.de.anodeCc')} value={r.cc_posto} onChange={(v) => upd(setAnodes, r.row_id, { cc_posto: v })}
          helperText={t('aluminium2.de.anodeCcHelp')} />
        <NumField label={t('aluminium2.de.anodeEf')} value={r.ef} onChange={(v) => upd(setAnodes, r.row_id, { ef: v })}
          helperText={t('aluminium2.de.anodeEfHelp')} />
        <NumField label={t('steel.de.conversionField')} value={r.cf} onChange={(v) => upd(setAnodes, r.row_id, { cf: v })} />
        <FullRow>
          <Typography sx={{ fontSize: '0.8rem', color: T.color.inkSoft }}>
            {t('aluminium2.de.anodePreview', { net: fmt(net), ef: ef != null ? str(ef) : '—', em: fmt(em, 1) })}
          </Typography>
        </FullRow>
      </RowCard>
    );
  };

  const renderFlue = (r: Al2FlueGasRow, idx: number) => {
    const tableEf = carbonateByCode[r.materijal]?.emissionFactor ?? null;
    const em = flueGasEmissions(r, tableEf);
    const f = carbonateByCode[r.materijal];
    return (
      <RowCard key={r.row_id} title={t('aluminium2.de.flueN', { n: idx + 1 })} onRemove={() => setFlues((p) => p.filter((x) => x.row_id !== r.row_id))}>
        <SelectField label={t('aluminium2.de.flueKind')} required value={r.vrsta} options={AL2_FLUE_GAS_KINDS}
          onChange={(v) => upd(setFlues, r.row_id, {
            vrsta: v as Al2FlueGasKind, materijal: '', ef: '',
            // udio and CF only apply to CARBONATE_A (contract §2, §6.5)
            udio_posto: v === 'CARBONATE_A' ? '100' : '', cf: v === 'CARBONATE_A' ? '1' : '',
          })} />
        {r.vrsta === 'CARBONATE_A' ? (
          <SelectField label={t('aluminium2.de.flueMaterial')} required value={r.materijal} options={carbonateOptions}
            onChange={(v) => upd(setFlues, r.row_id, { materijal: v, ef: str(carbonateByCode[v]?.emissionFactor) })} />
        ) : <Box />}
        <NumField label={r.vrsta === 'GYPSUM_B' ? t('aluminium2.de.flueQtyGypsum') : r.vrsta === 'UREA_DENOX' ? t('aluminium2.de.flueQtyUrea') : t('aluminium2.de.flueQty')}
          required value={r.kolicina} onChange={(v) => upd(setFlues, r.row_id, { kolicina: v })} />
        {r.vrsta === 'CARBONATE_A' && (
          <>
            <NumField label={t('steel.de.pureShare')} value={r.udio_posto} onChange={(v) => upd(setFlues, r.row_id, { udio_posto: v })} />
            <NumField label={t('steel.de.efPure')} value={r.ef} onChange={(v) => upd(setFlues, r.row_id, { ef: v })} />
            <NumField label={t('steel.de.conversionField')} value={r.cf} onChange={(v) => upd(setFlues, r.row_id, { cf: v })} />
          </>
        )}
        <FullRow>
          <Typography sx={{ fontSize: '0.8rem', color: T.color.inkSoft }}>
            {r.vrsta === 'GYPSUM_B' ? t('aluminium2.de.fluePreviewFixed', { ef: EF_GYPSUM_B, em: fmt(em, 1) })
              : r.vrsta === 'UREA_DENOX' ? t('aluminium2.de.fluePreviewFixed', { ef: EF_UREA_DENOX, em: fmt(em, 1) })
                : t('aluminium2.de.fluePreview', { em: fmt(em, 1) })}
          </Typography>
          {f?.source && (
            <Typography sx={{ fontSize: '0.78rem', color: T.color.muted }}>{t('steel.de.standardMat', { ef: str(f.emissionFactor), source: f.source })}</Typography>
          )}
        </FullRow>
      </RowCard>
    );
  };

  const renderProcess = (p: Al2ProcessRow) => {
    const primary = processIsPrimary(p);
    return (
      <Box key={p.process_id} sx={{ mb: 3 }}>
        <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.forest }}>{al2ProcessLabel(p)}</Typography>
        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>
          {p.tip === 'JOINT' ? t('aluminium2.proc.typeJoint') : al2CategoryLabel(p.kategorija)}
          {p.rute.length > 0 ? ` · ${p.rute.map((r) => t(`aluminium2.route.${r}`)).join(' + ')}` : ''}
        </Typography>
        <SectionTitle>{fuelMeta.label}</SectionTitle>
        <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{fuelMeta.help}</Typography>
        {fuels.filter((r) => r.process_id === p.process_id).map(renderFuel)}
        <AddButton label={t('steel.de.addFuel')} onClick={() => setFuels((prev) => [...prev, newFuel(p.process_id)])} />

        {primary && (
          <>
            <SectionTitle>{anodeMeta.label}</SectionTitle>
            <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{anodeMeta.help}</Typography>
            {anodes.filter((r) => r.process_id === p.process_id).map(renderAnode)}
            <AddButton label={t('aluminium2.de.addAnode')} onClick={() => setAnodes((prev) => [...prev, newAnode(p.process_id)])} />
          </>
        )}

        <SectionTitle>{flueMeta.label}</SectionTitle>
        <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{flueMeta.help}</Typography>
        {flues.filter((r) => r.process_id === p.process_id).map(renderFlue)}
        <AddButton label={t('aluminium2.de.addFlue')} onClick={() => setFlues((prev) => [...prev, newFlue(p.process_id)])} />
        <Divider sx={{ mt: 1, borderColor: T.color.lineFaint }} />
      </Box>
    );
  };

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={t('aluminium2.step.AL2_DIRECT_EMISSIONS')} help={t('aluminium2.de.titleHelp')} />
      {factorsLoading && <Typography sx={{ fontSize: '0.85rem', color: T.color.muted, mb: 2 }}>{t('steel.de.factorsLoading')}</Typography>}
      {factorsError && <IssueList infos={[t('steel.de.factorsError', { error: factorsError })]} />}
      {data.processes.map(renderProcess)}
      <IssueList errors={errors} warnings={warnings} infos={initial.dropped > 0 ? [t('steel.de.dropped', { count: initial.dropped })] : undefined} />
      <NavButtons
        onBack={onBack}
        onNext={() => onSubmit({
          rows: {
            [AL2_Q.FUEL]: fuels,
            [AL2_Q.ANODE]: anodes,
            [AL2_Q.FLUE_GAS]: flues.map((r) => (r.vrsta === 'CARBONATE_A' ? r : { ...r, materijal: '', udio_posto: '', ef: '', cf: '' })),
          },
        })}
        nextDisabled={errors.length > 0}
        saving={saving}
        saveError={saveError}
      />
    </Box>
  );
}
