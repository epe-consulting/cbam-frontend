import { useMemo, useState } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { T } from './steelTheme';
import {
  AddButton, CheckField, FullRow, IssueList, NavButtons, NumField, RowCard, SelectField, StepHeader, TextInput, type Option,
} from './SteelUi';
import { questionMeta, type SteelStepProps } from './types';
import { checkCn } from './cnCheck';
import { useCountries } from '../../hooks/useCountries';
import { useIsCnValidation, useIsExemptOrigins } from '../../hooks/useIronSteelRefData';
import {
  EXPECTED_PRECURSORS, IS_Q, categoryLabel, checkNonNegative, checkPositive, cnDigits, coveredCategories, newRowId,
  parseJsonRows, processLabel, toNum,
  type PrecursorRow, type ProcessRow, type SteelCategory, type StepIssue,
} from '../../utils/steelSteps';

const HELP = 'Masa uključuje i dio koji se odsiječe, izgori ili postane otpad (mi uključuje otpad). Prekursori iz EU, Islanda, Lihtenštajna, Norveške i Švicarske imaju nula emisija. Stvarne vrijednosti dobavljača smiju se koristiti samo uz verifikacioni izvještaj; inače se koristi zadana vrijednost.';

function newPrecursor(processId: string): PrecursorRow {
  return {
    row_id: newRowId(), process_id: processId, cn_code: '', kategorija: '', izvor: 'PURCHASED', izvorni_process_id: '',
    kolicina: '', country_id: null, drzava: '', drzava_nepoznata: false, podaci: '', see_direktne: '', see_indirektne: '',
    verifikovano: false, godina_proizvodnje: '', postrojenje: '', ruta: '',
  };
}

/** Detect a cycle in INTERNAL_PROCESS references (consumer -> source). */
function findCycle(edges: Map<string, Set<string>>): string[] | null {
  const state = new Map<string, number>(); // 1 = visiting, 2 = done
  const stack: string[] = [];
  const visit = (n: string): string[] | null => {
    state.set(n, 1);
    stack.push(n);
    for (const m of edges.get(n) ?? []) {
      if (state.get(m) === 1) return [...stack.slice(stack.indexOf(m)), m];
      if (!state.has(m)) {
        const c = visit(m);
        if (c) return c;
      }
    }
    stack.pop();
    state.set(n, 2);
    return null;
  };
  for (const n of edges.keys()) {
    if (!state.has(n)) {
      const c = visit(n);
      if (c) return c;
    }
  }
  return null;
}

export function SteelPrecursorsStep({ data, questions, saving, saveError, onBack, onSubmit }: SteelStepProps) {
  const meta = questionMeta(questions, IS_Q.PRECURSOR, 'Prekursori (ulazni materijali koji su CBAM roba)', HELP);
  const { countries } = useCountries();
  const { exempt } = useIsExemptOrigins();
  const procById = useMemo(() => new Map(data.processes.map((p) => [p.process_id, p])), [data.processes]);

  const [rows, setRows] = useState<PrecursorRow[]>(() => parseJsonRows<PrecursorRow>(data.values[IS_Q.PRECURSOR])
    .filter((r) => procById.has(r.process_id))
    .map((r) => ({ ...newPrecursor(r.process_id), ...r })));

  const cnResults = useIsCnValidation(rows.map((r) => r.cn_code), true);

  const originOptions: Option[] = [
    ...countries.map((c) => ({ value: c.country, label: c.country })),
    ...exempt.territories.map((t) => ({ value: t, label: `${t} (teritorija izuzeta iz CBAM-a)` })),
  ];

  const originZero = (r: PrecursorRow): 'EU' | 'EXEMPT' | null => {
    if (r.izvor !== 'PURCHASED' || r.drzava_nepoznata || !r.drzava) return null;
    if (countries.find((c) => c.country === r.drzava)?.isEu) return 'EU';
    if (exempt.countries.includes(r.drzava) || exempt.territories.includes(r.drzava)) return 'EXEMPT';
    return null;
  };

  /**
   * Rows that may fall back to a default value need a full 8-digit CN (longest-prefix DV match, spec §5.4, §6.3(9)).
   * 4/6 digits only for internal precursors, verified actual supplier data, or EU/exempt origin.
   */
  const needsFullCn = (r: PrecursorRow): boolean => {
    if (r.izvor !== 'PURCHASED') return false;
    if (r.drzava_nepoznata) return true;
    if (originZero(r)) return false;
    return !(r.podaci === 'ACTUAL' && r.verifikovano);
  };

  /** Category from CN (backend validation); 7205 = user choice (PIG_IRON | IRON_STEEL_PRODUCTS). */
  const derivedCategory = (r: PrecursorRow): { category: string; ambiguous: boolean } => {
    const res = cnResults[cnDigits(r.cn_code)];
    if (!res?.ok) return { category: r.kategorija, ambiguous: false };
    if (res.ambiguous) {
      return { category: r.kategorija === 'PIG_IRON' ? 'PIG_IRON' : 'IRON_STEEL_PRODUCTS', ambiguous: true };
    }
    return { category: res.category ?? '', ambiguous: false };
  };

  const upd = (rowId: string, patch: Partial<PrecursorRow>) =>
    setRows((prev) => prev.map((r) => (r.row_id === rowId ? { ...r, ...patch } : r)));

  const { errors, warnings, pending } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    let pend = false;
    const edges = new Map<string, Set<string>>();
    rows.forEach((r, idx) => {
      const what = `Prekursor ${idx + 1} (${r.process_id})`;
      const chk = checkCn(r.cn_code, cnResults, needsFullCn(r) ? `${what} (zadana vrijednost)` : what, !needsFullCn(r));
      if (chk.state === 'error') e.push(chk.issue);
      else if (chk.state === 'pending') pend = true;
      checkPositive(r.kolicina, what, e);
      const consumer = procById.get(r.process_id);
      if (r.izvor === 'INTERNAL_PROCESS') {
        if (!r.izvorni_process_id) e.push({ code: 'IS_E_PRECURSOR_SELF', message: `${what}: odaberite proces iz kojeg prekursor dolazi.` });
        else if (r.izvorni_process_id === r.process_id) e.push({ code: 'IS_E_PRECURSOR_SELF', message: `${what}: proces ne može biti prekursor samom sebi.` });
        else if (!procById.has(r.izvorni_process_id)) e.push({ code: 'IS_E_PRECURSOR_SELF', message: `${what}: izvorni proces ${r.izvorni_process_id} ne postoji.` });
        else if (procById.get(r.izvorni_process_id)?.tip === 'JOINT') {
          e.push({ code: 'IS_E_PRECURSOR_SELF', message: `${what}: prekursor ne može dolaziti iz zajedničkog procesa ('bubble').` });
        } else {
          const outputs = (procById.get(r.izvorni_process_id)?.proizvodi ?? []).map((o) => cnDigits(o.cn_code));
          const d = cnDigits(r.cn_code);
          if (d && !outputs.some((o) => o === d || o.startsWith(d))) {
            w.push({ code: '', message: `${what}: CN ${r.cn_code} nije izlaz procesa ${r.izvorni_process_id}.` });
          }
          const set = edges.get(r.process_id) ?? new Set<string>();
          set.add(r.izvorni_process_id);
          edges.set(r.process_id, set);
        }
      } else {
        const zero = originZero(r);
        if (!r.drzava_nepoznata && !r.drzava) e.push({ code: '', message: `${what}: odaberite državu porijekla ili označite da je nepoznata.` });
        if (!zero) {
          if (!r.podaci) e.push({ code: '', message: `${what}: odaberite izvor podataka (stvarni / zadani).` });
          if (r.podaci === 'ACTUAL') {
            if (String(r.see_direktne).trim() === '') e.push({ code: 'IS_E_PRECURSOR_ACTUAL_MISSING', message: `${what}: unesite stvarne specifične direktne emisije dobavljača.` });
            else checkNonNegative(r.see_direktne, `${what}, SEE direktne`, e, true);
            checkNonNegative(r.see_indirektne, `${what}, SEE indirektne`, e);
            if (!r.verifikovano) w.push({ code: 'IS_W_PRECURSOR_UNVERIFIED', message: `${what}: stvarni podaci nisu verifikovani – koristit će se zadana vrijednost.` });
          }
        }
        const y = r.godina_proizvodnje.trim();
        if (y !== '' && !/^\d{4}$/.test(y)) e.push({ code: '', message: `${what}: godina proizvodnje mora biti četverocifrena.` });
        else if (y !== '' && Number(y) < 2026) w.push({ code: '', message: `${what}: za godine prije 2026. koristi se zadana vrijednost za 2026.` });
      }
      const cat = derivedCategory(r).category;
      if (consumer && cat) {
        const expected = new Set(coveredCategories(consumer).flatMap((c) => EXPECTED_PRECURSORS[c as SteelCategory] ?? []));
        if (!expected.has(cat)) {
          w.push({ code: 'IS_W_PRECURSOR_UNUSUAL', message: `${what}: kategorija „${categoryLabel(cat)}“ nije uobičajen prekursor za ${processLabel(consumer)}.` });
        }
      }
    });
    const cycle = findCycle(edges);
    if (cycle) e.push({ code: 'IS_E_PRECURSOR_CYCLE', message: `Kružna veza prekursora između procesa: ${cycle.join(' → ')}.` });

    data.processes.forEach((p) => {
      if (p.tip !== 'SINGLE' || p.kategorija !== 'IRON_STEEL_PRODUCTS') return;
      const own = rows.filter((r) => r.process_id === p.process_id);
      const al = p.proizvodi.reduce((s, o) => s + (toNum(o.kolicina) ?? 0), 0);
      const m = own.length === 1 && al > 0 ? (toNum(own[0].kolicina) ?? 0) / al : null;
      if (m != null && m < 1) {
        w.push({ code: 'IS_W_MI_BELOW_ONE', message: `Proces ${p.process_id}: masa prekursora po toni proizvoda je ${m.toFixed(3)} < 1 – provjerite da je uključen i odsječeni otpad.` });
      }
    });
    return { errors: e, warnings: w, pending: pend };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, cnResults, procById, countries, exempt, data.processes]);

  const handleNext = () => {
    const out = rows.map((r) => {
      const cat = derivedCategory(r).category;
      const country = countries.find((c) => c.country === r.drzava);
      if (r.izvor === 'INTERNAL_PROCESS') {
        return {
          ...r, kategorija: cat, country_id: null, drzava: '', drzava_nepoznata: false, podaci: '' as const,
          see_direktne: '', see_indirektne: '', verifikovano: false, godina_proizvodnje: '', postrojenje: '', ruta: '',
        };
      }
      return {
        ...r,
        kategorija: cat,
        izvorni_process_id: '',
        country_id: r.drzava_nepoznata ? null : (country?.id ?? null),
        drzava: r.drzava_nepoznata ? '' : r.drzava,
        see_direktne: r.podaci === 'ACTUAL' ? r.see_direktne : '',
        see_indirektne: r.podaci === 'ACTUAL' ? r.see_indirektne : '',
        verifikovano: r.podaci === 'ACTUAL' ? r.verifikovano : false,
      };
    });
    onSubmit({ rows: { [IS_Q.PRECURSOR]: out } });
  };

  const renderRow = (r: PrecursorRow, idx: number, p: ProcessRow) => {
    const { category, ambiguous } = derivedCategory(r);
    const zero = originZero(r);
    const sourceOptions = data.processes
      .filter((q) => q.process_id !== p.process_id)
      .map((q) => ({ value: q.process_id, label: processLabel(q) }));
    const sourceOutputs = r.izvorni_process_id ? procById.get(r.izvorni_process_id)?.proizvodi.map((o) => o.cn_code).filter(Boolean) ?? [] : [];
    return (
      <RowCard key={r.row_id} title={`Prekursor ${idx + 1}`} onRemove={() => setRows((prev) => prev.filter((x) => x.row_id !== r.row_id))}>
        <SelectField label="Porijeklo prekursora" value={r.izvor}
          options={[{ value: 'PURCHASED', label: 'Kupljen (od dobavljača)' }, { value: 'INTERNAL_PROCESS', label: 'Iz drugog procesa ovog postrojenja' }]}
          onChange={(v) => upd(r.row_id, { izvor: v as PrecursorRow['izvor'] })} />
        <TextInput label="CN kod prekursora" required value={r.cn_code} onChange={(v) => upd(r.row_id, { cn_code: v })}
          helperText={category ? categoryLabel(category) : (sourceOutputs.length ? `Izlazi procesa: ${sourceOutputs.join(', ')}` : (needsFullCn(r) ? '8 cifara (zadana vrijednost)' : '4, 6 ili 8 cifara'))} />
        <NumField label="Potrošena masa (t, uključujući otpad)" required value={r.kolicina} onChange={(v) => upd(r.row_id, { kolicina: v })} />
        {ambiguous && (
          <SelectField label="Kategorija (7205)" value={category}
            options={[{ value: 'IRON_STEEL_PRODUCTS', label: categoryLabel('IRON_STEEL_PRODUCTS') }, { value: 'PIG_IRON', label: categoryLabel('PIG_IRON') }]}
            onChange={(v) => upd(r.row_id, { kategorija: v })} />
        )}
        {r.izvor === 'INTERNAL_PROCESS' ? (
          <SelectField label="Izvorni proces" required value={r.izvorni_process_id} options={sourceOptions}
            onChange={(v) => upd(r.row_id, { izvorni_process_id: v })} />
        ) : (
          <>
            <SelectField label="Država porijekla" value={r.drzava} options={originOptions} disabled={r.drzava_nepoznata}
              emptyLabel="Odaberite državu" onChange={(v) => upd(r.row_id, { drzava: v })} />
            <CheckField label="Država proizvodnje nije poznata" checked={r.drzava_nepoznata}
              onChange={(v) => upd(r.row_id, { drzava_nepoznata: v, drzava: v ? '' : r.drzava })} />
            {zero ? (
              <FullRow>
                <Typography sx={{ fontSize: '0.82rem', color: T.color.forest }}>
                  {zero === 'EU' ? 'Prekursor porijeklom iz EU' : 'Prekursor iz države/teritorije izuzete iz CBAM-a'} – ugrađene emisije se računaju kao nula.
                </Typography>
              </FullRow>
            ) : (
              <>
                <SelectField label="Podaci o emisijama" value={r.podaci}
                  options={[{ value: 'DEFAULT', label: 'Zadana vrijednost (Uredba 2025/2621)' }, { value: 'ACTUAL', label: 'Stvarne vrijednosti dobavljača' }]}
                  onChange={(v) => upd(r.row_id, { podaci: v as PrecursorRow['podaci'], ...(v === 'ACTUAL' && !r.see_indirektne ? { see_indirektne: '0' } : {}) })} />
                {r.podaci === 'ACTUAL' && (
                  <>
                    <NumField label="SEE direktne (t CO2e/t)" required value={r.see_direktne} onChange={(v) => upd(r.row_id, { see_direktne: v })} />
                    <NumField label="SEE indirektne (t CO2e/t)" value={r.see_indirektne} onChange={(v) => upd(r.row_id, { see_indirektne: v })}
                      helperText={category && category !== 'SINTERED_ORE' ? 'Samo prenesene indirektne emisije sinter rude.' : undefined} />
                    <CheckField label="Podaci su verifikovani od akreditovanog verifikatora" checked={r.verifikovano} onChange={(v) => upd(r.row_id, { verifikovano: v })} />
                  </>
                )}
              </>
            )}
            <TextInput label="Godina proizvodnje (opcionalno)" value={r.godina_proizvodnje} onChange={(v) => upd(r.row_id, { godina_proizvodnje: v.replace(/\D/g, '').slice(0, 4) })}
              helperText={data.yRep ? `Prazno = ${data.yRep}` : undefined} />
            <TextInput label="Postrojenje dobavljača (opcionalno)" value={r.postrojenje} onChange={(v) => upd(r.row_id, { postrojenje: v })} />
            <TextInput label="Proizvodna ruta dobavljača (opcionalno)" value={r.ruta} onChange={(v) => upd(r.row_id, { ruta: v })} />
          </>
        )}
      </RowCard>
    );
  };

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={meta.label} help={meta.help} />
      {data.processes.map((p) => (
        <Box key={p.process_id} sx={{ mb: 3 }}>
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.forest, mb: 1 }}>
            {processLabel(p)}
          </Typography>
          {p.tip === 'JOINT' && (
            <Typography sx={{ fontSize: '0.8rem', color: T.color.muted, mb: 1 }}>
              Prekursori proizvedeni unutar zajedničkog procesa ne unose se kao prekursori.
            </Typography>
          )}
          {rows.filter((r) => r.process_id === p.process_id).map((r, idx) => renderRow(r, idx, p))}
          <AddButton label="Dodaj prekursor" onClick={() => setRows((prev) => [...prev, newPrecursor(p.process_id)])} />
          <Divider sx={{ mt: 1, borderColor: T.color.lineFaint }} />
        </Box>
      ))}
      <IssueList errors={errors} warnings={warnings} infos={pending ? ['Provjera CN kodova u toku…'] : undefined} />
      <NavButtons onBack={onBack} onNext={handleNext} nextDisabled={errors.length > 0 || pending} saving={saving} saveError={saveError} />
    </Box>
  );
}
