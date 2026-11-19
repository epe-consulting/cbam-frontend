import { useMemo, useState } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { T } from './steelTheme';
import {
  AddButton, CheckField, FullRow, IssueList, NavButtons, NumField, RowCard, SelectField, StepHeader, TextInput, type Option,
} from './SteelUi';
import { questionMeta, type SteelStepProps } from './types';
import { checkCn } from './cnCheck';
import { useCountries } from '../../hooks/useCountries';
import { useIsCnMapping, useIsCnValidation, useIsExemptOrigins } from '../../hooks/useIronSteelRefData';
import { cnHelperText } from '../../utils/steelCnLabel';
import {
  EXPECTED_PRECURSORS, IS_Q, categoryLabel, checkNonNegative, checkPositive, cnDigits, coveredCategories, newRowId,
  parseJsonRows, processLabel, toNum,
  type PrecursorRow, type ProcessRow, type SteelCategory, type StepIssue,
} from '../../utils/steelSteps';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const meta = questionMeta(questions, IS_Q.PRECURSOR, t('steel.pre.label'), t('steel.pre.help'));
  const { countries } = useCountries();
  const { exempt } = useIsExemptOrigins();
  const procById = useMemo(() => new Map(data.processes.map((p) => [p.process_id, p])), [data.processes]);

  const [rows, setRows] = useState<PrecursorRow[]>(() => parseJsonRows<PrecursorRow>(data.values[IS_Q.PRECURSOR])
    .filter((r) => procById.has(r.process_id))
    .map((r) => ({ ...newPrecursor(r.process_id), ...r })));

  const cnResults = useIsCnValidation(rows.map((r) => r.cn_code), true);
  const { rows: cnMapping } = useIsCnMapping();

  const originOptions: Option[] = [
    ...countries.map((c) => ({ value: c.country, label: c.country })),
    ...exempt.territories.map((name) => ({ value: name, label: t('steel.pre.exemptTerritory', { name }) })),
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
      const what = t('steel.pre.what', { n: idx + 1, process: r.process_id });
      const chk = checkCn(r.cn_code, cnResults, needsFullCn(r) ? t('steel.pre.whatDefault', { what }) : what, !needsFullCn(r));
      if (chk.state === 'error') e.push(chk.issue);
      else if (chk.state === 'pending') pend = true;
      checkPositive(r.kolicina, what, e);
      const consumer = procById.get(r.process_id);
      if (r.izvor === 'INTERNAL_PROCESS') {
        if (!r.izvorni_process_id) e.push({ code: 'IS_E_PRECURSOR_SELF', message: t('steel.pre.eSource', { what }) });
        else if (r.izvorni_process_id === r.process_id) e.push({ code: 'IS_E_PRECURSOR_SELF', message: t('steel.pre.eSelf', { what }) });
        else if (!procById.has(r.izvorni_process_id)) e.push({ code: 'IS_E_PRECURSOR_SELF', message: t('steel.pre.eNoSource', { what, id: r.izvorni_process_id }) });
        else if (procById.get(r.izvorni_process_id)?.tip === 'JOINT') {
          e.push({ code: 'IS_E_PRECURSOR_SELF', message: t('steel.pre.eJoint', { what }) });
        } else {
          const outputs = (procById.get(r.izvorni_process_id)?.proizvodi ?? []).map((o) => cnDigits(o.cn_code));
          const d = cnDigits(r.cn_code);
          if (d && !outputs.some((o) => o === d || o.startsWith(d))) {
            w.push({ code: '', message: t('steel.pre.wNotOutput', { what, cn: r.cn_code, id: r.izvorni_process_id }) });
          }
          const set = edges.get(r.process_id) ?? new Set<string>();
          set.add(r.izvorni_process_id);
          edges.set(r.process_id, set);
        }
      } else {
        const zero = originZero(r);
        if (!r.drzava_nepoznata && !r.drzava) e.push({ code: '', message: t('steel.pre.eCountry', { what }) });
        if (!zero) {
          if (!r.podaci) e.push({ code: '', message: t('steel.pre.eData', { what }) });
          if (r.podaci === 'ACTUAL') {
            if (String(r.see_direktne).trim() === '') e.push({ code: 'IS_E_PRECURSOR_ACTUAL_MISSING', message: t('steel.pre.eActual', { what }) });
            else checkNonNegative(r.see_direktne, t('steel.pre.seeDirect', { what }), e, true);
            checkNonNegative(r.see_indirektne, t('steel.pre.seeIndirect', { what }), e);
            if (!r.verifikovano) w.push({ code: 'IS_W_PRECURSOR_UNVERIFIED', message: t('steel.pre.wUnverified', { what }) });
          }
        }
        const y = r.godina_proizvodnje.trim();
        if (y !== '' && !/^\d{4}$/.test(y)) e.push({ code: '', message: t('steel.pre.eYear', { what }) });
        else if (y !== '' && Number(y) < 2026) w.push({ code: '', message: t('steel.pre.wYear', { what }) });
      }
      const cat = derivedCategory(r).category;
      if (consumer && cat) {
        const expected = new Set(coveredCategories(consumer).flatMap((c) => EXPECTED_PRECURSORS[c as SteelCategory] ?? []));
        if (!expected.has(cat)) {
          w.push({ code: 'IS_W_PRECURSOR_UNUSUAL', message: t('steel.pre.wUnusual', { what, category: categoryLabel(cat), process: processLabel(consumer) }) });
        }
      }
    });
    const cycle = findCycle(edges);
    if (cycle) e.push({ code: 'IS_E_PRECURSOR_CYCLE', message: t('steel.pre.eCycle', { cycle: cycle.join(' → ') }) });

    data.processes.forEach((p) => {
      if (p.tip !== 'SINGLE' || p.kategorija !== 'IRON_STEEL_PRODUCTS') return;
      const own = rows.filter((r) => r.process_id === p.process_id);
      const al = p.proizvodi.reduce((s, o) => s + (toNum(o.kolicina) ?? 0), 0);
      const m = own.length === 1 && al > 0 ? (toNum(own[0].kolicina) ?? 0) / al : null;
      if (m != null && m < 1) {
        w.push({ code: 'IS_W_MI_BELOW_ONE', message: t('steel.pre.wMi', { id: p.process_id, m: m.toFixed(3) }) });
      }
    });
    return { errors: e, warnings: w, pending: pend };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, cnResults, procById, countries, exempt, data.processes, t]);

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
      <RowCard key={r.row_id} title={t('steel.pre.n', { n: idx + 1 })} onRemove={() => setRows((prev) => prev.filter((x) => x.row_id !== r.row_id))}>
        <SelectField label={t('steel.pre.origin')} value={r.izvor}
          options={[{ value: 'PURCHASED', label: t('steel.pre.purchased') }, { value: 'INTERNAL_PROCESS', label: t('steel.pre.internal') }]}
          onChange={(v) => upd(r.row_id, { izvor: v as PrecursorRow['izvor'] })} />
        <TextInput label={t('steel.pre.cn')} required value={r.cn_code} onChange={(v) => upd(r.row_id, { cn_code: v })}
          helperText={category ? cnHelperText(cnMapping, r.cn_code, categoryLabel(category)) : (sourceOutputs.length ? t('steel.pre.sourceOutputs', { list: sourceOutputs.join(', ') }) : (needsFullCn(r) ? t('steel.pre.cn8Default') : t('steel.pre.cn468')))} />
        <NumField label={t('steel.pre.mass')} required value={r.kolicina} onChange={(v) => upd(r.row_id, { kolicina: v })} />
        {ambiguous && (
          <SelectField label={t('steel.pre.category7205')} value={category}
            options={[{ value: 'IRON_STEEL_PRODUCTS', label: categoryLabel('IRON_STEEL_PRODUCTS') }, { value: 'PIG_IRON', label: categoryLabel('PIG_IRON') }]}
            onChange={(v) => upd(r.row_id, { kategorija: v })} />
        )}
        {r.izvor === 'INTERNAL_PROCESS' ? (
          <SelectField label={t('steel.pre.sourceProcess')} required value={r.izvorni_process_id} options={sourceOptions}
            onChange={(v) => upd(r.row_id, { izvorni_process_id: v })} />
        ) : (
          <>
            <SelectField label={t('steel.pre.countryOrigin')} value={r.drzava} options={originOptions} disabled={r.drzava_nepoznata}
              emptyLabel={t('steel.pre.selectCountry')} onChange={(v) => upd(r.row_id, { drzava: v })} />
            <CheckField label={t('steel.pre.countryUnknown')} checked={r.drzava_nepoznata}
              onChange={(v) => upd(r.row_id, { drzava_nepoznata: v, drzava: v ? '' : r.drzava })} />
            {zero ? (
              <FullRow>
                <Typography sx={{ fontSize: '0.82rem', color: T.color.forest }}>
                  {zero === 'EU' ? t('steel.pre.zeroEu') : t('steel.pre.zeroExempt')}
                </Typography>
              </FullRow>
            ) : (
              <>
                <SelectField label={t('steel.pre.emissionData')} value={r.podaci}
                  options={[{ value: 'DEFAULT', label: t('steel.pre.dataDefault') }, { value: 'ACTUAL', label: t('steel.pre.dataActual') }]}
                  onChange={(v) => upd(r.row_id, { podaci: v as PrecursorRow['podaci'], ...(v === 'ACTUAL' && !r.see_indirektne ? { see_indirektne: '0' } : {}) })} />
                {r.podaci === 'ACTUAL' && (
                  <>
                    <NumField label={t('steel.pre.seeDirectField')} required value={r.see_direktne} onChange={(v) => upd(r.row_id, { see_direktne: v })} />
                    <NumField label={t('steel.pre.seeIndirectField')} value={r.see_indirektne} onChange={(v) => upd(r.row_id, { see_indirektne: v })}
                      helperText={category && category !== 'SINTERED_ORE' ? t('steel.pre.seeIndirectHelp') : undefined} />
                    <CheckField label={t('steel.pre.verified')} checked={r.verifikovano} onChange={(v) => upd(r.row_id, { verifikovano: v })} />
                  </>
                )}
              </>
            )}
            <TextInput label={t('steel.pre.year')} value={r.godina_proizvodnje} onChange={(v) => upd(r.row_id, { godina_proizvodnje: v.replace(/\D/g, '').slice(0, 4) })}
              helperText={data.yRep ? t('steel.pre.yearBlank', { year: data.yRep }) : undefined} />
            <TextInput label={t('steel.pre.supplierInstallation')} value={r.postrojenje} onChange={(v) => upd(r.row_id, { postrojenje: v })} />
            <TextInput label={t('steel.pre.supplierRoute')} value={r.ruta} onChange={(v) => upd(r.row_id, { ruta: v })} />
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
              {t('steel.pre.jointNote')}
            </Typography>
          )}
          {rows.filter((r) => r.process_id === p.process_id).map((r, idx) => renderRow(r, idx, p))}
          <AddButton label={t('steel.pre.add')} onClick={() => setRows((prev) => [...prev, newPrecursor(p.process_id)])} />
          <Divider sx={{ mt: 1, borderColor: T.color.lineFaint }} />
        </Box>
      ))}
      <IssueList errors={errors} warnings={warnings} infos={pending ? [t('steel.proc.cnChecking')] : undefined} />
      <NavButtons onBack={onBack} onNext={handleNext} nextDisabled={errors.length > 0 || pending} saving={saving} saveError={saveError} />
    </Box>
  );
}
