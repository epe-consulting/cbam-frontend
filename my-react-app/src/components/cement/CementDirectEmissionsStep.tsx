import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Box, Divider, IconButton, Typography } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { T } from '../steel/steelTheme';
import {
  AddButton, FullRow, IssueList, NavButtons, NumField, RowCard, SectionTitle, SelectField, StepHeader, TextInput, type Option,
} from '../steel/SteelUi';
import { questionMeta, type CementStepProps } from './types';
import { useIsStandardFactors } from '../../hooks/useIronSteelRefData';
import type { IsStandardFactor } from '../../api/ironSteel';
import {
  FACTOR_SOURCES, FUEL_UNITS, checkFraction, checkNonNegative, checkPercent, checkPositive, deviatesFromStandard, factorLabel,
  newRowId, parseJsonRows, toNum, type StepIssue,
} from '../../utils/steelSteps';
import {
  CE_FUEL_USES, CE_MATERIAL_KINDS, CE_MATERIAL_KIND_LABELS, CE_Q, EF_CKD_STD, EF_CLINKER_STD, EF_UREA_DENOX,
  ceCategoryLabel, ceCoveredCategories, ceIssueText, ceMethodIssues, ceProcessLabel, ceProcessCoversClinker, ckdEfEq28, clinkerFromBalance,
  nonCarbonateCarbonEf, normaliseBalance, rawMealQuantity,
  type CeCkdRow, type CeClinkerOutputRow, type CeFuelRow, type CeMaterialKind, type CeMaterialRow, type CeProcessRow,
} from '../../utils/cementSteps';

const str = (n: number | null | undefined) => (n == null ? '' : String(Number(n.toPrecision(10))));
const fmt = (n: number | null | undefined, d = 3) => (n == null ? '—' : n.toLocaleString('bs-BA', { maximumFractionDigits: d }));

function newFuel(processId: string): CeFuelRow {
  return {
    row_id: newRowId(), process_id: processId, gorivo: '', naziv_ostalo: '', jedinica: 't', kolicina: '',
    ncv: '', ef: '', of: '1', bf_posto: '0', izvor_faktora: 'STANDARD_TABLE', primjena: 'KILN',
  };
}
function newMaterial(processId: string): CeMaterialRow {
  return {
    row_id: newRowId(), process_id: processId, vrsta: '', materijal: '', metoda_karbonata: 'A', kolicina: '',
    udio_posto: '100', ef: '', cf: '1', cc_posto: '', klinker_t: '', raw_meal_ratio: '', naziv_ostalo: '',
  };
}
function newClinker(processId: string): CeClinkerOutputRow {
  return {
    row_id: newRowId(), process_id: processId, ad_nacin: 'WEIGHING', klinker_t: '',
    bilans: { cement: [{ isporuke_t: '', promjena_zaliha_t: '', ccr_posto: '' }], klinker_nabavljen_t: '', klinker_otpremljen_t: '', promjena_zaliha_klinkera_t: '' },
    // Minimum requirement 0,525 t CO2/t clinker (MA Annex II B.9.2.2, p.50)
    ef_nacin: 'STANDARD', ef: String(EF_CLINKER_STD), cf: '1',
  };
}
function newCkd(processId: string): CeCkdRow {
  return { row_id: newRowId(), process_id: processId, kolicina_t: '', ef_nacin: 'STANDARD', ef_cli: '', d_posto: '' };
}

function fuelPrefill(row: CeFuelRow, f: IsStandardFactor | undefined, jedinica: string): Partial<CeFuelRow> {
  if (!f) return { ncv: jedinica === 'TJ' ? '' : row.ncv };
  return { ef: str(f.emissionFactor), ncv: jedinica === 't' ? str(f.ncv) : '', izvor_faktora: 'STANDARD_TABLE' };
}

/** Material kinds allowed for a process (spec §4.4: OXIDE_OUTPUT only for CALCINED_CLAY / ALUMINOUS_CEMENT). */
function kindsFor(p: CeProcessRow): CeMaterialKind[] {
  const cats = ceCoveredCategories(p);
  const oxideOk = cats.length > 0 && cats.every((c) => c === 'CALCINED_CLAY' || c === 'ALUMINOUS_CEMENT');
  return CE_MATERIAL_KINDS.filter((k) => k !== 'OXIDE_OUTPUT' || oxideOk);
}

/** CE_DIRECT_EMISSIONS (spec §4.4, §3.3(1)–(5), FE-7). */
export function CementDirectEmissionsStep({ data, questions, saving, saveError, onBack, onSubmit }: CementStepProps) {
  const { t } = useTranslation();
  const fuelMeta = questionMeta(questions, CE_Q.FUEL, t('cement.de.fuelLabel'), t('cement.de.fuelHelp'));
  const matMeta = questionMeta(questions, CE_Q.MATERIAL, t('cement.de.matLabel'), t('cement.de.matHelp'));
  const cliMeta = questionMeta(questions, CE_Q.CLINKER_OUTPUT, t('cement.de.cliLabel'), t('cement.de.cliHelp'));
  const ckdMeta = questionMeta(questions, CE_Q.CKD, t('cement.de.ckdLabel'), t('cement.de.ckdHelp'));
  const { factors, byWizardCode, loading: factorsLoading, error: factorsError } = useIsStandardFactors();
  const procById = useMemo(() => new Map(data.processes.map((p) => [p.process_id, p])), [data.processes]);

  const initial = useMemo(() => {
    const has = (pid: string) => procById.has(pid);
    const clinkerOk = (pid: string) => { const p = procById.get(pid); return p != null && ceProcessCoversClinker(p); };
    const fuels = parseJsonRows<CeFuelRow>(data.values[CE_Q.FUEL]);
    const mats = parseJsonRows<CeMaterialRow>(data.values[CE_Q.MATERIAL]);
    const clis = parseJsonRows<CeClinkerOutputRow>(data.values[CE_Q.CLINKER_OUTPUT]);
    const ckds = parseJsonRows<CeCkdRow>(data.values[CE_Q.CKD]);
    const kf = fuels.filter((r) => has(r.process_id));
    const km = mats.filter((r) => has(r.process_id));
    const kc = clis.filter((r) => clinkerOk(r.process_id));
    const kd = ckds.filter((r) => clinkerOk(r.process_id));
    const dropped = fuels.length - kf.length + mats.length - km.length + clis.length - kc.length + ckds.length - kd.length;
    return { fuels: kf, mats: km, clis: kc, ckds: kd, dropped };
  }, [data.values, procById]);

  const [fuels, setFuels] = useState<CeFuelRow[]>(initial.fuels.map((r) => ({ ...newFuel(r.process_id), ...r })));
  const [mats, setMats] = useState<CeMaterialRow[]>(initial.mats.map((r) => ({ ...newMaterial(r.process_id), ...r })));
  const [clis, setClis] = useState<CeClinkerOutputRow[]>(initial.clis.map((r) => {
    const d = newClinker(r.process_id);
    return { ...d, ...r, bilans: { ...d.bilans, ...(r.bilans ?? {}), cement: r.bilans?.cement?.length ? r.bilans.cement : d.bilans.cement } };
  }));
  const [ckds, setCkds] = useState<CeCkdRow[]>(initial.ckds.map((r) => ({ ...newCkd(r.process_id), ...r })));

  const fuelOptions: Option[] = [
    ...factors.filter((f) => f.category === 'FUEL').map((f) => ({ value: f.wizardCode, label: f.wizardCode.startsWith('BIO_') ? t('steel.de.biomassSuffix', { label: factorLabel(f) }) : factorLabel(f) })),
    { value: 'OTHER', label: t('common.other') },
  ];
  const carbonateOptions: Option[] = factors.filter((f) => f.category === 'CARBONATE').map((f) => ({ value: f.wizardCode, label: factorLabel(f) }));
  const oxideOptions: Option[] = factors.filter((f) => f.category === 'OXIDE').map((f) => ({ value: f.wizardCode, label: factorLabel(f) }));

  const upd = <R extends { row_id: string }>(set: Dispatch<SetStateAction<R[]>>, rowId: string, patch: Partial<R>) =>
    set((prev) => prev.map((r) => (r.row_id === rowId ? { ...r, ...patch } : r)));

  const { errors, warnings } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    fuels.forEach((r, idx) => {
      const what = t('cement.de.fuelWhat', { n: idx + 1, process: r.process_id });
      const f = byWizardCode[r.gorivo];
      if (!r.gorivo) e.push({ code: '', message: t('steel.de.eSelectFuel', { what }) });
      if (r.gorivo === 'OTHER' && !r.naziv_ostalo.trim()) e.push({ code: '', message: t('steel.de.eFuelName', { what }) });
      checkPositive(r.kolicina, what, e);
      if (r.jedinica === '1000Nm3') {
        const n = toNum(r.ncv);
        if (n == null || n <= 0) e.push({ code: 'CE_E_FACTOR_RANGE', message: t('steel.de.eNcvNm3', { what }) });
      } else if (r.jedinica === 't') {
        const n = toNum(r.ncv);
        const needed = r.gorivo === 'OTHER' || !f || f.ncv == null;
        if ((n == null && needed) || (n != null && n <= 0)) e.push({ code: 'CE_E_FACTOR_RANGE', message: t('steel.de.eNcvT', { what }) });
      }
      checkNonNegative(r.ef, `${what}, EF`, e, r.gorivo === 'OTHER' || !f);
      checkFraction(r.of, t('steel.de.oxidationFactor', { what }), e, true);
      checkPercent(r.bf_posto, t('steel.de.biomassShare', { what }), e);
      // OPEN QUESTION OQ-CE-11: biomass criteria (MA B.3.3) are not checked – warning only.
      if ((toNum(r.bf_posto) ?? 0) > 0) w.push({ code: 'CE_W_BIOMASS_UNVERIFIED', message: ceIssueText('CE_W_BIOMASS_UNVERIFIED', { what }) });
      if (f && (deviatesFromStandard(r.ef, f.emissionFactor) || (r.jedinica === 't' && deviatesFromStandard(r.ncv, f.ncv)))) {
        w.push({ code: 'CE_W_CC_DEVIATION', message: ceIssueText('CE_W_CC_DEVIATION', { what }) });
      }
    });
    mats.forEach((r, idx) => {
      const what = t('cement.de.matWhat', { n: idx + 1, process: r.process_id });
      const f = byWizardCode[r.materijal];
      if (!r.vrsta) { e.push({ code: '', message: t('cement.de.eKind', { what }) }); return; }
      const tableKind = r.vrsta === 'KILN_CARBONATE' || r.vrsta === 'FLUE_GAS_CARBONATE' || r.vrsta === 'OXIDE_OUTPUT';
      if (tableKind && !r.materijal) e.push({ code: '', message: t('steel.de.eSelectMaterial', { what }) });
      if (r.vrsta === 'OTHER' && !r.naziv_ostalo.trim()) e.push({ code: '', message: t('steel.de.eMaterialName', { what }) });
      checkPositive(r.kolicina, what, e);
      checkPercent(r.udio_posto, t('steel.de.share', { what }), e, true);
      checkFraction(r.cf, t('steel.de.conversionFactor', { what }), e, true);
      if (r.vrsta === 'NON_CARBONATE_CARBON') {
        const hasEf = String(r.ef ?? '').trim() !== '';
        const hasCc = String(r.cc_posto ?? '').trim() !== '';
        if (!hasEf && !hasCc) e.push({ code: '', message: t('cement.de.eEfOrCc', { what }) });
        if (hasCc) checkPercent(r.cc_posto, t('cement.de.cc', { what }), e, true);
        if (hasEf) checkNonNegative(r.ef, `${what}, EF`, e, true);
      } else {
        checkNonNegative(r.ef, `${what}, EF`, e, r.vrsta === 'RAW_MEAL' || r.vrsta === 'OTHER' || (tableKind && !f));
      }
      if (f && deviatesFromStandard(r.ef, f.emissionFactor)) w.push({ code: 'CE_W_CC_DEVIATION', message: ceIssueText('CE_W_CC_DEVIATION', { what }) });
    });
    clis.forEach((r, idx) => {
      const what = t('cement.de.cliWhat', { n: idx + 1, process: r.process_id });
      if (r.ad_nacin === 'WEIGHING') checkPositive(r.klinker_t, what, e);
      else {
        const cli = clinkerFromBalance(r.bilans);
        if (cli == null || cli <= 0) e.push({ code: 'CE_E_BALANCE_INCOMPLETE', message: ceIssueText('CE_E_BALANCE_INCOMPLETE', { what }) });
        r.bilans.cement.forEach((c, j) => checkPercent(c.ccr_posto, t('cement.de.ccrWhat', { what, n: j + 1 }), e, true));
      }
      if (r.ef_nacin === 'ANALYSIS') {
        const n = toNum(r.ef);
        if (n == null || n <= 0) e.push({ code: 'CE_E_FACTOR_RANGE', message: t('cement.de.eEfAnalysis', { what }) });
      }
      checkFraction(r.cf, t('steel.de.conversionFactor', { what }), e, true);
    });
    ckds.forEach((r, idx) => {
      const what = t('cement.de.ckdWhat', { n: idx + 1, process: r.process_id });
      checkPositive(r.kolicina_t, what, e);
      if (r.ef_nacin === 'EQ28') {
        const ef = toNum(r.ef_cli);
        if (ef == null || ef <= 0) e.push({ code: 'CE_E_FACTOR_RANGE', message: t('cement.de.eEfCli', { what }) });
        checkPercent(r.d_posto, t('cement.de.dWhat', { what }), e, true);
      }
    });
    data.processes.forEach((p) => {
      const res = ceMethodIssues(p, mats, clis, ckds);
      const label = ceProcessLabel(p);
      res.errors.forEach((c) => e.push({ code: c, message: ceIssueText(c, { what: label }) }));
      res.warnings.forEach((c) => w.push({ code: c, message: ceIssueText(c, { what: label }) }));
    });
    return { errors: e, warnings: w };
  }, [fuels, mats, clis, ckds, byWizardCode, data.processes, t]);

  const renderFuel = (r: CeFuelRow, idx: number) => {
    const f = byWizardCode[r.gorivo];
    return (
      <RowCard key={r.row_id} title={t('steel.de.fuelN', { n: idx + 1 })} onRemove={() => setFuels((p) => p.filter((x) => x.row_id !== r.row_id))}>
        <SelectField label={t('steel.de.fuel')} required value={r.gorivo} options={fuelOptions}
          onChange={(v) => upd(setFuels, r.row_id, { gorivo: v, ...fuelPrefill(r, byWizardCode[v], r.jedinica), ...(v === 'OTHER' ? { ef: '', ncv: '', izvor_faktora: 'OTHER' } : {}) })} />
        {r.gorivo === 'OTHER'
          ? <TextInput label={t('steel.de.fuelName')} required value={r.naziv_ostalo} onChange={(v) => upd(setFuels, r.row_id, { naziv_ostalo: v })} />
          : <Box />}
        <SelectField label={t('cement.de.fuelUse')} value={r.primjena} options={CE_FUEL_USES}
          onChange={(v) => upd(setFuels, r.row_id, { primjena: v as CeFuelRow['primjena'] })} />
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

  const renderMaterial = (r: CeMaterialRow, idx: number, p: CeProcessRow) => {
    const f = byWizardCode[r.materijal];
    const kindOptions = kindsFor(p).map((k) => ({ value: k, label: CE_MATERIAL_KIND_LABELS[k] }));
    const tableOptions = r.vrsta === 'OXIDE_OUTPUT' ? oxideOptions : carbonateOptions;
    const ccEf = nonCarbonateCarbonEf(r.cc_posto);
    const rawQty = rawMealQuantity(r.klinker_t, r.raw_meal_ratio);
    return (
      <RowCard key={r.row_id} title={t('steel.de.matN', { n: idx + 1 })} onRemove={() => setMats((x) => x.filter((y) => y.row_id !== r.row_id))}>
        <SelectField label={t('cement.de.kind')} required value={r.vrsta} options={kindOptions}
          onChange={(v) => upd(setMats, r.row_id, {
            vrsta: v as CeMaterialKind, materijal: '', naziv_ostalo: '', cc_posto: '', klinker_t: '', raw_meal_ratio: '',
            metoda_karbonata: v === 'OXIDE_OUTPUT' ? 'B' : 'A',
            // 0,7328 t CO2/t urea prefilled (MA Annex II B.9.1.2, p.49)
            ef: v === 'UREA_DENOX' ? String(EF_UREA_DENOX) : '',
          })} />
        {(r.vrsta === 'KILN_CARBONATE' || r.vrsta === 'FLUE_GAS_CARBONATE' || r.vrsta === 'OXIDE_OUTPUT') ? (
          <SelectField label={t('steel.de.material')} required value={r.materijal} options={tableOptions}
            onChange={(v) => upd(setMats, r.row_id, { materijal: v, ef: str(byWizardCode[v]?.emissionFactor) })} />
        ) : r.vrsta === 'OTHER' ? (
          <TextInput label={t('steel.de.materialName')} required value={r.naziv_ostalo} onChange={(v) => upd(setMats, r.row_id, { naziv_ostalo: v })} />
        ) : <Box />}
        <NumField label={t('cement.de.matQty')} required value={r.kolicina} onChange={(v) => upd(setMats, r.row_id, { kolicina: v })} />
        <NumField label={t('steel.de.pureShare')} value={r.udio_posto} onChange={(v) => upd(setMats, r.row_id, { udio_posto: v })} />
        {r.vrsta === 'NON_CARBONATE_CARBON' && (
          <NumField label={t('cement.de.ccField')} value={r.cc_posto} onChange={(v) => upd(setMats, r.row_id, { cc_posto: v })}
            helperText={ccEf != null ? t('cement.de.ccEfPreview', { ef: str(ccEf) }) : undefined} />
        )}
        <NumField label={r.vrsta === 'RAW_MEAL' ? t('cement.de.efRawMeal') : t('steel.de.efPure')}
          required={r.vrsta === 'RAW_MEAL' || r.vrsta === 'OTHER'} value={r.ef} onChange={(v) => upd(setMats, r.row_id, { ef: v })} />
        <NumField label={t('steel.de.conversionField')} value={r.cf} onChange={(v) => upd(setMats, r.row_id, { cf: v })} />
        {r.vrsta === 'RAW_MEAL' && (
          <>
            <NumField label={t('cement.de.rawMealClinker')} value={r.klinker_t} onChange={(v) => upd(setMats, r.row_id, { klinker_t: v })} />
            <NumField label={t('cement.de.rawMealRatio')} value={r.raw_meal_ratio} onChange={(v) => upd(setMats, r.row_id, { raw_meal_ratio: v })}
              helperText={t('cement.de.rawMealRatioHelp')} />
            <FullRow>
              <AddButton label={t('cement.de.rawMealApply', { qty: fmt(rawQty) })} disabled={rawQty == null}
                onClick={() => upd(setMats, r.row_id, { kolicina: str(rawQty) })} />
            </FullRow>
          </>
        )}
        {f?.source && (
          <FullRow>
            <Typography sx={{ fontSize: '0.78rem', color: T.color.muted }}>{t('steel.de.standardMat', { ef: str(f.emissionFactor), source: f.source })}</Typography>
          </FullRow>
        )}
      </RowCard>
    );
  };

  const renderClinker = (r: CeClinkerOutputRow) => {
    const cli = r.ad_nacin === 'WEIGHING' ? toNum(r.klinker_t) : clinkerFromBalance(r.bilans);
    const ef = r.ef_nacin === 'STANDARD' ? EF_CLINKER_STD : toNum(r.ef);
    const em = cli != null && ef != null ? cli * ef * (toNum(r.cf) ?? 1) : null;
    const setB = (patch: Partial<CeClinkerOutputRow['bilans']>) => upd(setClis, r.row_id, { bilans: { ...r.bilans, ...patch } });
    return (
      <RowCard key={r.row_id} title={t('cement.de.cliCard')} onRemove={() => setClis((x) => x.filter((y) => y.row_id !== r.row_id))}>
        <SelectField label={t('cement.de.adMode')} value={r.ad_nacin}
          options={[{ value: 'WEIGHING', label: t('cement.de.adWeighing') }, { value: 'CEMENT_BALANCE', label: t('cement.de.adBalance') }]}
          onChange={(v) => upd(setClis, r.row_id, { ad_nacin: v as CeClinkerOutputRow['ad_nacin'] })} />
        <SelectField label={t('cement.de.efMode')} value={r.ef_nacin}
          options={[{ value: 'STANDARD', label: t('cement.de.efStandard') }, { value: 'ANALYSIS', label: t('cement.de.efAnalysis') }]}
          onChange={(v) => upd(setClis, r.row_id, { ef_nacin: v as CeClinkerOutputRow['ef_nacin'], ef: v === 'STANDARD' ? String(EF_CLINKER_STD) : '' })} />
        <NumField label={t('cement.de.efClinker')} required disabled={r.ef_nacin === 'STANDARD'} value={r.ef_nacin === 'STANDARD' ? String(EF_CLINKER_STD) : r.ef}
          onChange={(v) => upd(setClis, r.row_id, { ef: v })}
          helperText={r.ef_nacin === 'ANALYSIS' ? t('cement.de.efAnalysisHelp') : undefined} />
        <NumField label={t('steel.de.conversionField')} value={r.cf} onChange={(v) => upd(setClis, r.row_id, { cf: v })} />
        {r.ad_nacin === 'WEIGHING' ? (
          <NumField label={t('cement.de.clinkerT')} required value={r.klinker_t} onChange={(v) => upd(setClis, r.row_id, { klinker_t: v })} />
        ) : (
          <FullRow>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: T.color.ink, mb: 1 }}>{t('cement.de.balanceTitle')}</Typography>
            {r.bilans.cement.map((c, j) => (
              <Box key={j} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr auto' }, gap: 2, mb: 1.5, alignItems: 'center' }}>
                <NumField label={t('cement.de.cemDeliv')} required value={c.isporuke_t}
                  onChange={(v) => setB({ cement: r.bilans.cement.map((x, k) => (k === j ? { ...x, isporuke_t: v } : x)) })} />
                <NumField label={t('cement.de.cemSv')} value={c.promjena_zaliha_t}
                  onChange={(v) => setB({ cement: r.bilans.cement.map((x, k) => (k === j ? { ...x, promjena_zaliha_t: v } : x)) })} />
                <NumField label={t('cement.de.ccr')} required value={c.ccr_posto}
                  onChange={(v) => setB({ cement: r.bilans.cement.map((x, k) => (k === j ? { ...x, ccr_posto: v } : x)) })} />
                <IconButton size="small" aria-label={t('common.removeRow')} disabled={r.bilans.cement.length <= 1}
                  onClick={() => setB({ cement: r.bilans.cement.filter((_, k) => k !== j) })}>
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <AddButton label={t('cement.de.addCementRow')} onClick={() => setB({ cement: [...r.bilans.cement, { isporuke_t: '', promjena_zaliha_t: '', ccr_posto: '' }] })} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
              <NumField label={t('cement.de.cliSupplied')} value={r.bilans.klinker_nabavljen_t} onChange={(v) => setB({ klinker_nabavljen_t: v })} />
              <NumField label={t('cement.de.cliDispatched')} value={r.bilans.klinker_otpremljen_t} onChange={(v) => setB({ klinker_otpremljen_t: v })} />
              <NumField label={t('cement.de.cliSv')} value={r.bilans.promjena_zaliha_klinkera_t} onChange={(v) => setB({ promjena_zaliha_klinkera_t: v })} />
            </Box>
            <Typography sx={{ fontSize: '0.78rem', color: T.color.muted, mt: 1 }}>{t('cement.de.balanceHelp')}</Typography>
          </FullRow>
        )}
        <FullRow>
          <Typography sx={{ fontSize: '0.8rem', color: T.color.inkSoft }}>
            {t('cement.de.cliPreview', { cli: fmt(cli), em: fmt(em, 1) })}
          </Typography>
        </FullRow>
      </RowCard>
    );
  };

  const renderCkd = (r: CeCkdRow, idx: number) => {
    const efCkd = r.ef_nacin === 'STANDARD' ? EF_CKD_STD : ckdEfEq28(r.ef_cli, r.d_posto);
    const qty = toNum(r.kolicina_t);
    return (
      <RowCard key={r.row_id} title={t('cement.de.ckdN', { n: idx + 1 })} onRemove={() => setCkds((x) => x.filter((y) => y.row_id !== r.row_id))}>
        <NumField label={t('cement.de.ckdQty')} required value={r.kolicina_t} onChange={(v) => upd(setCkds, r.row_id, { kolicina_t: v })} />
        <SelectField label={t('cement.de.efMode')} value={r.ef_nacin}
          options={[{ value: 'STANDARD', label: t('cement.de.ckdStandard') }, { value: 'EQ28', label: t('cement.de.ckdEq28') }]}
          onChange={(v) => upd(setCkds, r.row_id, { ef_nacin: v as CeCkdRow['ef_nacin'] })} />
        <Box />
        {r.ef_nacin === 'EQ28' && (
          <>
            <NumField label={t('cement.de.efCli')} required value={r.ef_cli} onChange={(v) => upd(setCkds, r.row_id, { ef_cli: v })} />
            <NumField label={t('cement.de.dPct')} required value={r.d_posto} onChange={(v) => upd(setCkds, r.row_id, { d_posto: v })} helperText={t('cement.de.dHelp')} />
            <Box />
          </>
        )}
        <FullRow>
          <Typography sx={{ fontSize: '0.8rem', color: T.color.inkSoft }}>
            {t('cement.de.ckdPreview', { ef: efCkd != null ? efCkd.toFixed(6) : '—', em: fmt(efCkd != null && qty != null ? efCkd * qty : null, 1) })}
          </Typography>
        </FullRow>
      </RowCard>
    );
  };

  const renderProcess = (p: CeProcessRow) => {
    const clinker = ceProcessCoversClinker(p);
    const pc = clis.filter((r) => r.process_id === p.process_id);
    return (
      <Box key={p.process_id} sx={{ mb: 3 }}>
        <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.forest }}>
          {ceProcessLabel(p)}
        </Typography>
        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>
          {p.tip === 'JOINT' ? ceCoveredCategories(p).map(ceCategoryLabel).join(' + ') : ceCategoryLabel(p.kategorija)}
        </Typography>
        <SectionTitle>{fuelMeta.label}</SectionTitle>
        <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{fuelMeta.help}</Typography>
        {fuels.filter((r) => r.process_id === p.process_id).map(renderFuel)}
        <AddButton label={t('steel.de.addFuel')} onClick={() => setFuels((prev) => [...prev, newFuel(p.process_id)])} />

        <SectionTitle>{matMeta.label}</SectionTitle>
        <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{matMeta.help}</Typography>
        {mats.filter((r) => r.process_id === p.process_id).map((r, i) => renderMaterial(r, i, p))}
        <AddButton label={t('steel.de.addMaterial')} onClick={() => setMats((prev) => [...prev, newMaterial(p.process_id)])} />

        {clinker && (
          <>
            <SectionTitle>{cliMeta.label}</SectionTitle>
            <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{cliMeta.help}</Typography>
            {pc.map(renderClinker)}
            {pc.length === 0 && <AddButton label={t('cement.de.addCli')} onClick={() => setClis((prev) => [...prev, newClinker(p.process_id)])} />}

            <SectionTitle>{ckdMeta.label}</SectionTitle>
            <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{ckdMeta.help}</Typography>
            {ckds.filter((r) => r.process_id === p.process_id).map(renderCkd)}
            <AddButton label={t('cement.de.addCkd')} onClick={() => setCkds((prev) => [...prev, newCkd(p.process_id)])} />
          </>
        )}
        <Divider sx={{ mt: 1, borderColor: T.color.lineFaint }} />
      </Box>
    );
  };

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={t('cement.de.title')} help={t('cement.de.titleHelp')} />
      {factorsLoading && <Typography sx={{ fontSize: '0.85rem', color: T.color.muted, mb: 2 }}>{t('steel.de.factorsLoading')}</Typography>}
      {factorsError && <IssueList infos={[t('steel.de.factorsError', { error: factorsError })]} />}
      {data.processes.map(renderProcess)}
      <IssueList errors={errors} warnings={warnings} infos={initial.dropped > 0 ? [t('steel.de.dropped', { count: initial.dropped })] : undefined} />
      <NavButtons
        onBack={onBack}
        onNext={() => onSubmit({ rows: { [CE_Q.FUEL]: fuels, [CE_Q.MATERIAL]: mats, [CE_Q.CLINKER_OUTPUT]: clis.map((r) => ({ ...r, bilans: normaliseBalance(r.bilans) })), [CE_Q.CKD]: ckds } })}
        nextDisabled={errors.length > 0}
        saving={saving}
        saveError={saveError}
      />
    </Box>
  );
}
