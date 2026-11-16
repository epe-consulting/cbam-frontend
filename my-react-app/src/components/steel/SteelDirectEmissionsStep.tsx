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

const FUEL_HELP = 'Unesite gorivo potrošeno u procesu. Gorivo za proizvodnju toplote koja se koristi u više procesa ne unosite ovdje nego kao toplotu (korak Energetski tokovi). Otpadne plinove uvezene iz drugog procesa unesite u koraku Energetski tokovi.';
const MATERIAL_HELP = 'Metoda A: ulazni karbonat (npr. krečnjak CaCO3). Metoda B: izlazni oksid (npr. CaO u kreču/šljaci). Udio = maseni udio čistog karbonata/oksida u materijalu.';
const MB_HELP = 'Unesite sve ulaze koji sadrže ugljik (goriva, redukciona sredstva, otpad, legure, elektrode, aditivi, kupljeni prekursori) i izlaze (proizvod, šljaka, prašina). Izlazi se oduzimaju. Ne unosite otpadni plin kao izlaz – njegov izvoz se unosi u koraku Energetski tokovi. CO u neprečišćenom otpadnom plinu računa se kao CO2.';

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
  const fuelMeta = questionMeta(questions, IS_Q.FUEL, 'Goriva (standardna metoda – sagorijevanje)', FUEL_HELP);
  const matMeta = questionMeta(questions, IS_Q.MATERIAL, 'Procesni materijali (karbonati, čišćenje dimnih plinova)', MATERIAL_HELP);
  const mbMeta = questionMeta(questions, IS_Q.MASS_BALANCE, 'Maseni bilans ugljika (ulazi i izlazi)', MB_HELP);
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
    ...fuelFactors.map((f) => ({ value: f.wizardCode, label: f.wizardCode.startsWith('BIO_') ? `${factorLabel(f)} (biomasa)` : factorLabel(f) })),
    { value: 'OTHER', label: 'Ostalo' },
  ];
  const materialOptions: Option[] = [
    ...factors.filter((f) => f.category === 'CARBONATE').map((f) => ({ value: f.wizardCode, label: `Karbonat (metoda A): ${factorLabel(f)}` })),
    ...factors.filter((f) => f.category === 'OXIDE').map((f) => ({ value: f.wizardCode, label: `Oksid (metoda B): ${f.wizardCode}` })),
    ...factors.filter((f) => f.category === 'STEEL_MATERIAL').map((f) => ({ value: f.wizardCode, label: `Materijal: ${factorLabel(f)}` })),
    { value: 'OTHER', label: 'Ostalo' },
  ];
  const mbMaterialOptions: Option[] = [
    ...factors.filter((f) => f.category === 'STEEL_MATERIAL').map((f) => ({ value: f.wizardCode, label: `Materijal: ${factorLabel(f)}` })),
    ...fuelFactors.map((f) => ({ value: f.wizardCode, label: `Gorivo: ${factorLabel(f)}` })),
    { value: 'OTHER', label: 'Ostalo' },
  ];

  const upd = <R extends { row_id: string }>(set: Dispatch<SetStateAction<R[]>>, rowId: string, patch: Partial<R>) =>
    set((prev) => prev.map((r) => (r.row_id === rowId ? { ...r, ...patch } : r)));

  const { errors, warnings } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    fuels.forEach((r, idx) => {
      const what = `Gorivo ${idx + 1} (${r.process_id})`;
      const f = byWizardCode[r.gorivo];
      if (!r.gorivo) e.push({ code: '', message: `${what}: odaberite gorivo.` });
      if (r.gorivo === 'OTHER' && !r.naziv_ostalo.trim()) e.push({ code: '', message: `${what}: unesite naziv goriva.` });
      checkPositive(r.kolicina, what, e);
      if (r.jedinica === '1000Nm3') {
        const n = toNum(r.ncv);
        if (n == null || n <= 0) e.push({ code: 'IS_E_FACTOR_RANGE', message: `${what}: za jedinicu 1000 Nm³ unesite NCV (GJ/1000 Nm³) > 0.` });
      } else if (r.jedinica === 't') {
        const n = toNum(r.ncv);
        const needed = r.gorivo === 'OTHER' || !f || f.ncv == null;
        if ((n == null && needed) || (n != null && n <= 0)) e.push({ code: 'IS_E_FACTOR_RANGE', message: `${what}: unesite NCV (GJ/t) > 0.` });
      }
      checkNonNegative(r.ef, `${what}, EF`, e, r.gorivo === 'OTHER' || !f);
      checkFraction(r.of, `${what}, oksidacioni faktor`, e, true);
      checkPercent(r.bf_posto, `${what}, udio biomase`, e);
      if ((toNum(r.bf_posto) ?? 0) > 0) w.push({ code: 'IS_W_BIOMASS_UNVERIFIED', message: `${what}: udio biomase > 0 – kriteriji održivosti biomase se ne provjeravaju.` });
      if (WASTE_GAS_FUEL_CODES.has(r.gorivo)) w.push({ code: 'IS_W_WG_IN_FUEL', message: `${what}: otpadni plin unesen kao gorivo – provjerite da uvezeni otpadni plin nije dvostruko uračunat.` });
      if (f && (deviatesFromStandard(r.ef, f.emissionFactor) || (r.jedinica === 't' && deviatesFromStandard(r.ncv, f.ncv)))) {
        w.push({ code: 'IS_W_CC_DEVIATION', message: `${what}: uneseni EF/NCV odstupa više od 50 % od standardne vrijednosti.` });
      }
    });
    mats.forEach((r, idx) => {
      const what = `Procesni materijal ${idx + 1} (${r.process_id})`;
      const f = byWizardCode[r.materijal];
      if (!r.materijal) e.push({ code: '', message: `${what}: odaberite materijal.` });
      if (r.materijal === 'OTHER' && !r.naziv_ostalo.trim()) e.push({ code: '', message: `${what}: unesite naziv materijala.` });
      checkPositive(r.kolicina, what, e);
      checkPercent(r.udio_posto, `${what}, udio`, e, true);
      checkFraction(r.cf, `${what}, faktor konverzije`, e, true);
      checkNonNegative(r.ef, `${what}, EF`, e, r.materijal === 'OTHER' || !f);
      if (f && deviatesFromStandard(r.ef, f.emissionFactor)) w.push({ code: 'IS_W_CC_DEVIATION', message: `${what}: uneseni EF odstupa više od 50 % od standardne vrijednosti.` });
    });
    mbs.forEach((r, idx) => {
      const what = `Maseni bilans ${idx + 1} (${r.process_id})`;
      const f = byWizardCode[r.materijal];
      if (!r.naziv.trim() && !r.materijal) e.push({ code: '', message: `${what}: odaberite materijal ili unesite naziv.` });
      checkPositive(r.kolicina, what, e);
      if (r.nacin_unosa === 'CC') {
        checkPercent(r.cc_posto, `${what}, sadržaj ugljika`, e, true);
        if (f?.carbonContent != null && deviatesFromStandard(r.cc_posto, f.carbonContent * 100)) w.push({ code: 'IS_W_CC_DEVIATION', message: `${what}: sadržaj ugljika odstupa više od 50 % od standardne vrijednosti.` });
      } else if (r.nacin_unosa === 'EF_T') {
        checkNonNegative(r.ef_t, `${what}, EF (t CO2/t)`, e, true);
        if (f?.category === 'STEEL_MATERIAL' && deviatesFromStandard(r.ef_t, f.emissionFactor)) w.push({ code: 'IS_W_CC_DEVIATION', message: `${what}: EF odstupa više od 50 % od standardne vrijednosti.` });
      } else {
        checkNonNegative(r.ef_tj, `${what}, EF (t CO2/TJ)`, e, true);
        const n = toNum(r.ncv);
        if (n == null || n <= 0) e.push({ code: 'IS_E_FACTOR_RANGE', message: `${what}: unesite NCV (GJ/t) > 0.` });
        if (f?.category === 'FUEL' && deviatesFromStandard(r.ef_tj, f.emissionFactor)) w.push({ code: 'IS_W_CC_DEVIATION', message: `${what}: EF odstupa više od 50 % od standardne vrijednosti.` });
      }
      checkPercent(r.bf_posto, `${what}, udio biomase`, e);
      if ((toNum(r.bf_posto) ?? 0) > 0) w.push({ code: 'IS_W_BIOMASS_UNVERIFIED', message: `${what}: udio biomase > 0 – kriteriji održivosti biomase se ne provjeravaju.` });
    });
    data.processes.filter((p) => p.metoda === 'MASS_BALANCE').forEach((p) => {
      if (!mbs.some((r) => r.process_id === p.process_id && r.smjer === 'OUTPUT')) {
        w.push({ code: 'IS_W_MB_NO_OUTPUT', message: `Proces ${p.process_id}: nema izlaza u masenom bilansu (ugljik u proizvodu/šljaci nije uračunat).` });
      }
    });
    return { errors: e, warnings: w };
  }, [fuels, mats, mbs, byWizardCode, data.processes]);

  const renderFuel = (r: FuelRow, idx: number) => {
    const f = byWizardCode[r.gorivo];
    return (
      <RowCard key={r.row_id} title={`Gorivo ${idx + 1}`} onRemove={() => setFuels((p) => p.filter((x) => x.row_id !== r.row_id))}>
        <SelectField label="Gorivo" required value={r.gorivo} options={fuelOptions}
          onChange={(v) => upd(setFuels, r.row_id, { gorivo: v, ...fuelPrefill(r, byWizardCode[v], r.jedinica), ...(v === 'OTHER' ? { ef: '', ncv: '', izvor_faktora: 'OTHER' } : {}) })} />
        {r.gorivo === 'OTHER'
          ? <TextInput label="Naziv goriva" required value={r.naziv_ostalo} onChange={(v) => upd(setFuels, r.row_id, { naziv_ostalo: v })} />
          : <Box />}
        <SelectField label="Jedinica" value={r.jedinica} options={FUEL_UNITS}
          onChange={(v) => upd(setFuels, r.row_id, { jedinica: v, ncv: v === 't' ? str(f?.ncv) : '' })} />
        <NumField label={`Količina (${r.jedinica === '1000Nm3' ? '1000 Nm³' : r.jedinica})`} required value={r.kolicina} onChange={(v) => upd(setFuels, r.row_id, { kolicina: v })} />
        {r.jedinica !== 'TJ'
          ? <NumField label={r.jedinica === 't' ? 'NCV (GJ/t)' : 'NCV (GJ/1000 Nm³)'} required={r.jedinica === '1000Nm3'} value={r.ncv} onChange={(v) => upd(setFuels, r.row_id, { ncv: v })} />
          : <Box />}
        <NumField label="EF (t CO2/TJ)" value={r.ef} onChange={(v) => upd(setFuels, r.row_id, { ef: v })} />
        <NumField label="Oksidacioni faktor (0–1)" value={r.of} onChange={(v) => upd(setFuels, r.row_id, { of: v })} />
        <NumField label="Udio biomase (%)" value={r.bf_posto} onChange={(v) => upd(setFuels, r.row_id, { bf_posto: v })} />
        <SelectField label="Izvor faktora" value={r.izvor_faktora} options={FACTOR_SOURCES} onChange={(v) => upd(setFuels, r.row_id, { izvor_faktora: v })} />
        {f?.source && (
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Typography sx={{ fontSize: '0.78rem', color: T.color.muted }}>Standardna vrijednost: EF {str(f.emissionFactor)} t CO2/TJ{f.ncv != null ? `, NCV ${str(f.ncv)} GJ/t` : ''} – {f.source}</Typography>
          </Box>
        )}
      </RowCard>
    );
  };

  const renderMaterial = (r: MaterialRow, idx: number) => {
    const f = byWizardCode[r.materijal];
    return (
      <RowCard key={r.row_id} title={`Procesni materijal ${idx + 1}`} onRemove={() => setMats((p) => p.filter((x) => x.row_id !== r.row_id))}>
        <SelectField label="Materijal" required value={r.materijal} options={materialOptions}
          onChange={(v) => {
            const nf = byWizardCode[v];
            upd(setMats, r.row_id, {
              materijal: v,
              ef: nf ? str(nf.emissionFactor) : '',
              metoda_karbonata: nf?.category === 'OXIDE' ? 'B' : nf?.category === 'CARBONATE' ? 'A' : r.metoda_karbonata,
            });
          }} />
        {r.materijal === 'OTHER'
          ? <TextInput label="Naziv materijala" required value={r.naziv_ostalo} onChange={(v) => upd(setMats, r.row_id, { naziv_ostalo: v })} />
          : <Box />}
        <SelectField label="Metoda" value={r.metoda_karbonata}
          disabled={f?.category === 'CARBONATE' || f?.category === 'OXIDE'}
          options={[{ value: 'A', label: 'A – ulazni karbonat' }, { value: 'B', label: 'B – izlazni oksid' }]}
          onChange={(v) => upd(setMats, r.row_id, { metoda_karbonata: v })} />
        <NumField label="Količina materijala (t)" required value={r.kolicina} onChange={(v) => upd(setMats, r.row_id, { kolicina: v })} />
        <NumField label="Udio čiste supstance (%)" value={r.udio_posto} onChange={(v) => upd(setMats, r.row_id, { udio_posto: v })} />
        <NumField label="EF (t CO2/t čiste supstance)" required={r.materijal === 'OTHER'} value={r.ef} onChange={(v) => upd(setMats, r.row_id, { ef: v })} />
        <NumField label="Faktor konverzije (0–1)" value={r.cf} onChange={(v) => upd(setMats, r.row_id, { cf: v })} />
        {f?.source && (
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Typography sx={{ fontSize: '0.78rem', color: T.color.muted }}>Standardna vrijednost: EF {str(f.emissionFactor)} t CO2/t – {f.source}</Typography>
          </Box>
        )}
      </RowCard>
    );
  };

  const renderMb = (r: MassBalanceRow, idx: number) => (
    <RowCard key={r.row_id} title={`${r.smjer === 'INPUT' ? 'Ulaz' : 'Izlaz'} ${idx + 1}`} onRemove={() => setMbs((p) => p.filter((x) => x.row_id !== r.row_id))}>
      <SelectField label="Smjer" value={r.smjer} options={[{ value: 'INPUT', label: 'Ulaz' }, { value: 'OUTPUT', label: 'Izlaz' }]}
        onChange={(v) => upd(setMbs, r.row_id, { smjer: v as MassBalanceRow['smjer'] })} />
      <SelectField label="Materijal (popunjava faktore)" value={r.materijal} options={mbMaterialOptions} emptyLabel="—"
        onChange={(v) => {
          const nf = byWizardCode[v];
          const patch: Partial<MassBalanceRow> = { materijal: v, naziv: r.naziv || (nf ? factorLabel(nf) : '') };
          if (nf?.category === 'STEEL_MATERIAL' && nf.carbonContent != null) Object.assign(patch, { nacin_unosa: 'CC', cc_posto: str(nf.carbonContent * 100) });
          else if (nf?.category === 'FUEL') Object.assign(patch, { nacin_unosa: 'EF_TJ', ef_tj: str(nf.emissionFactor), ncv: str(nf.ncv) });
          upd(setMbs, r.row_id, patch);
        }} />
      <TextInput label="Naziv" value={r.naziv} onChange={(v) => upd(setMbs, r.row_id, { naziv: v })} />
      <NumField label="Količina (t)" required value={r.kolicina} onChange={(v) => upd(setMbs, r.row_id, { kolicina: v })} />
      <SelectField label="Način unosa" value={r.nacin_unosa}
        options={[
          { value: 'CC', label: 'Sadržaj ugljika (% t C/t)' },
          { value: 'EF_T', label: 'Emisioni faktor (t CO2/t)' },
          { value: 'EF_TJ', label: 'Emisioni faktor (t CO2/TJ) + NCV' },
        ]}
        onChange={(v) => upd(setMbs, r.row_id, { nacin_unosa: v as MassBalanceRow['nacin_unosa'] })} />
      {r.nacin_unosa === 'CC' && <NumField label="Sadržaj ugljika (%)" required value={r.cc_posto} onChange={(v) => upd(setMbs, r.row_id, { cc_posto: v })} />}
      {r.nacin_unosa === 'EF_T' && <NumField label="EF (t CO2/t)" required value={r.ef_t} onChange={(v) => upd(setMbs, r.row_id, { ef_t: v })} />}
      {r.nacin_unosa === 'EF_TJ' && <NumField label="EF (t CO2/TJ)" required value={r.ef_tj} onChange={(v) => upd(setMbs, r.row_id, { ef_tj: v })} />}
      {r.nacin_unosa === 'EF_TJ' && <NumField label="NCV (GJ/t)" required value={r.ncv} onChange={(v) => upd(setMbs, r.row_id, { ncv: v })} />}
      <NumField label="Udio biomase (%)" value={r.bf_posto} onChange={(v) => upd(setMbs, r.row_id, { bf_posto: v })} />
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
            <AddButton label="Dodaj gorivo" onClick={() => setFuels((prev) => [...prev, newFuel(p.process_id)])} />
            <SectionTitle>{matMeta.label}</SectionTitle>
            <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{matMeta.help}</Typography>
            {pm.map(renderMaterial)}
            <AddButton label="Dodaj procesni materijal" onClick={() => setMats((prev) => [...prev, newMaterial(p.process_id)])} />
          </>
        ) : (
          <>
            <SectionTitle>{mbMeta.label}</SectionTitle>
            <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 1 }}>{mbMeta.help}</Typography>
            {pb.map(renderMb)}
            <Box display="flex" gap={1} flexWrap="wrap">
              <AddButton label="Dodaj ulaz" onClick={() => setMbs((prev) => [...prev, newMb(p.process_id, 'INPUT')])} />
              <AddButton label="Dodaj izlaz" onClick={() => setMbs((prev) => [...prev, newMb(p.process_id, 'OUTPUT')])} />
            </Box>
          </>
        )}
        <Divider sx={{ mt: 1, borderColor: T.color.lineFaint }} />
      </Box>
    );
  };

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title="Direktne emisije po procesu" help="Prikazane su samo tabele koje odgovaraju metodi odabranoj za svaki proces. Standardne vrijednosti (Prilog II G Uredbe 2025/2547) se popunjavaju automatski i mogu se izmijeniti." />
      {factorsLoading && <Typography sx={{ fontSize: '0.85rem', color: T.color.muted, mb: 2 }}>Učitavanje standardnih faktora…</Typography>}
      {factorsError && <IssueList infos={[`Standardni faktori nisu učitani (${factorsError}) – vrijednosti unesite ručno ili odaberite „Ostalo“.`]} />}
      {data.processes.map(renderProcess)}
      <IssueList
        errors={errors}
        warnings={warnings}
        infos={initial.dropped > 0 ? [`${initial.dropped} sačuvanih redova ne odgovara metodi ili postojećem procesu i bit će uklonjeno pri spremanju.`] : undefined}
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
