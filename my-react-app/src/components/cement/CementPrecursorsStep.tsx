import { useMemo, useState } from 'react';
import { Alert, Box, Divider, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { T } from '../steel/steelTheme';
import {
  AddButton, CheckField, FullRow, IssueList, NavButtons, NumField, RowCard, SelectField, StepHeader, TextInput, type Option,
} from '../steel/SteelUi';
import { questionMeta, type CementStepProps } from './types';
import { useCountries } from '../../hooks/useCountries';
import { useIsExemptOrigins } from '../../hooks/useIronSteelRefData';
import { dvRequestKey, useCeDefaultValues, type CeDvRequest } from '../../hooks/useCementRefData';
import { checkNonNegative, checkPositive, newRowId, parseJsonRows, type StepIssue } from '../../utils/steelSteps';
import {
  CE_MIN_YEAR, CE_PRECURSOR_CATEGORIES, CE_Q, ceCategoryLabel, ceIssueText, ceProcessLabel, ceProcessTakesPrecursors,
  checkCeCnTaric, clinkerMiSum, findCnRow, findPrecursorCycle, formatSee, internalSourceOk,
  type CePrecursorRow, type CeProcessRow,
} from '../../utils/cementSteps';

function newPrecursor(processId: string): CePrecursorRow {
  return {
    row_id: newRowId(), process_id: processId, kategorija: '', cn_code: '', taric_code: '', izvor: 'PURCHASED',
    izvorni_process_id: '', kolicina: '', country_id: null, drzava: '', drzava_nepoznata: false, podaci: '',
    see_direktne: '', see_indirektne: '', verifikovano: false, godina_proizvodnje: '', postrojenje: '', ruta: '',
  };
}

/** CE_PRECURSORS (spec §4.4, §3.3(12), FE-9): clinker / calcined clay for CEMENT processes only. */
export function CementPrecursorsStep({ data, questions, saving, saveError, onBack, onSubmit }: CementStepProps) {
  const { t } = useTranslation();
  const meta = questionMeta(questions, CE_Q.PRECURSOR, t('cement.pre.label'), t('cement.pre.help'));
  const { countries } = useCountries();
  const { exempt } = useIsExemptOrigins();
  const mapping = data.mapping;
  const procById = useMemo(() => new Map(data.processes.map((p) => [p.process_id, p])), [data.processes]);
  const consumers = useMemo(() => data.processes.filter(ceProcessTakesPrecursors), [data.processes]);

  const stored = useMemo(() => parseJsonRows<CePrecursorRow>(data.values[CE_Q.PRECURSOR]), [data.values]);
  const [rows, setRows] = useState<CePrecursorRow[]>(() => stored
    .filter((r) => { const p = procById.get(r.process_id); return p != null && ceProcessTakesPrecursors(p); })
    .map((r) => ({ ...newPrecursor(r.process_id), ...r })));
  const ignored = stored.length - rows.length;

  const allowedCats = CE_PRECURSOR_CATEGORIES.CEMENT as string[];
  const cnOptions: Option[] = mapping.filter((m) => allowedCats.includes(m.category))
    .map((m) => ({ value: m.cnCode, label: `${m.cnCode} – ${ceCategoryLabel(m.category)}` }));
  const originOptions: Option[] = [
    ...countries.map((c) => ({ value: c.country, label: c.country })),
    ...exempt.territories.map((name) => ({ value: name, label: t('steel.pre.exemptTerritory', { name }) })),
  ];

  const originZero = (r: CePrecursorRow): 'EU' | 'EXEMPT' | null => {
    if (r.izvor !== 'PURCHASED' || r.drzava_nepoznata || !r.drzava) return null;
    if (countries.find((c) => c.country === r.drzava)?.isEu) return 'EU';
    if (exempt.countries.includes(r.drzava) || exempt.territories.includes(r.drzava)) return 'EXEMPT';
    return null;
  };

  const upd = (rowId: string, patch: Partial<CePrecursorRow>) =>
    setRows((prev) => prev.map((r) => (r.row_id === rowId ? { ...r, ...patch } : r)));

  /** Y_prec = max(2026, godina_proizvodnje or Y_rep) (MA Art. 13 p.10; G03 p.116; spec §3.3(12)). */
  const precursorYear = (r: CePrecursorRow): number | null => {
    const y = /^\d{4}$/.test(r.godina_proizvodnje.trim()) ? Number(r.godina_proizvodnje.trim()) : data.yRep;
    return y == null ? null : Math.max(CE_MIN_YEAR, y);
  };

  const dvRequest = (r: CePrecursorRow): CeDvRequest | null => {
    if (r.izvor !== 'PURCHASED' || originZero(r)) return null;
    const usesDefault = r.podaci === 'DEFAULT' || (r.podaci === 'ACTUAL' && !r.verifikovano);
    if (!usesDefault) return null;
    const chk = checkCeCnTaric(mapping, r.cn_code, r.taric_code);
    const year = precursorYear(r);
    if (!chk.ok || year == null) return null;
    // ASSUMPTION: Annex IV rows are stored under country 'Unknown country of production' (steel-api-contract §5.2 convention).
    if (r.drzava_nepoznata) return { code: chk.key, country: 'Unknown country of production', year, annex: 'IV' };
    if (!r.drzava) return null;
    return { code: chk.key, country: r.drzava, year, annex: 'I' };
  };
  const dvResults = useCeDefaultValues(rows.map(dvRequest).filter((x): x is CeDvRequest => x != null));

  const { errors, warnings } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    rows.forEach((r, idx) => {
      const what = t('cement.pre.what', { n: idx + 1, process: r.process_id });
      const chk = checkCeCnTaric(mapping, r.cn_code, r.taric_code);
      if (!chk.ok) e.push({ code: chk.code, message: ceIssueText(chk.code, { what }) });
      else if (!allowedCats.includes(chk.row.category)) e.push({ code: 'CE_E_PRECURSOR_CATEGORY', message: ceIssueText('CE_E_PRECURSOR_CATEGORY', { what }) });
      checkPositive(r.kolicina, what, e);
      if (r.izvor === 'INTERNAL_PROCESS') {
        const src = procById.get(r.izvorni_process_id);
        if (!r.izvorni_process_id || !internalSourceOk(r, src, mapping)) {
          e.push({ code: 'CE_E_PRECURSOR_SOURCE', message: ceIssueText('CE_E_PRECURSOR_SOURCE', { what }) });
        }
      } else {
        const zero = originZero(r);
        if (!r.drzava_nepoznata && !r.drzava) e.push({ code: '', message: t('steel.pre.eCountry', { what }) });
        if (!zero) {
          if (!r.podaci) e.push({ code: '', message: t('steel.pre.eData', { what }) });
          if (r.podaci === 'ACTUAL') {
            if (String(r.see_direktne).trim() === '' || String(r.see_indirektne).trim() === '') {
              e.push({ code: 'CE_E_PRECURSOR_ACTUAL_MISSING', message: ceIssueText('CE_E_PRECURSOR_ACTUAL_MISSING', { what }) });
            } else {
              checkNonNegative(r.see_direktne, t('steel.pre.seeDirect', { what }), e, true);
              checkNonNegative(r.see_indirektne, t('steel.pre.seeIndirect', { what }), e, true);
            }
            if (!r.verifikovano) w.push({ code: 'CE_W_PRECURSOR_UNVERIFIED', message: ceIssueText('CE_W_PRECURSOR_UNVERIFIED', { what }) });
          }
        }
        const y = r.godina_proizvodnje.trim();
        if (y !== '' && !/^\d{4}$/.test(y)) e.push({ code: '', message: t('steel.pre.eYear', { what }) });
        else if (y !== '' && Number(y) < CE_MIN_YEAR) w.push({ code: '', message: t('steel.pre.wYear', { what }) });
      }
    });
    const cycle = findPrecursorCycle(rows);
    if (cycle) e.push({ code: 'CE_E_PRECURSOR_CYCLE', message: ceIssueText('CE_E_PRECURSOR_CYCLE', { what: cycle.join(' → ') }) });
    consumers.forEach((p) => {
      const withCat = rows.map((r) => ({ ...r, kategorija: findCnRow(mapping, r.cn_code)?.category ?? r.kategorija }));
      const m = clinkerMiSum(p, withCat, mapping);
      if (m != null && m < 1) w.push({ code: 'CE_W_MI_BELOW_ONE', message: ceIssueText('CE_W_MI_BELOW_ONE', { what: ceProcessLabel(p), m: m.toFixed(4) }) });
    });
    return { errors: e, warnings: w };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, mapping, procById, countries, exempt, consumers, t]);

  const handleNext = () => {
    const out = rows.map((r) => {
      const cat = findCnRow(mapping, r.cn_code)?.category ?? r.kategorija;
      if (r.izvor === 'INTERNAL_PROCESS') {
        return {
          ...r, kategorija: cat, country_id: null, drzava: '', drzava_nepoznata: false, podaci: '' as const,
          see_direktne: '', see_indirektne: '', verifikovano: false, godina_proizvodnje: '', postrojenje: '', ruta: '',
        };
      }
      const country = countries.find((c) => c.country === r.drzava);
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
    onSubmit({ rows: { [CE_Q.PRECURSOR]: out } });
  };

  const renderRow = (r: CePrecursorRow, idx: number, p: CeProcessRow) => {
    const row = findCnRow(mapping, r.cn_code);
    const zero = originZero(r);
    const sourceOptions = data.processes
      .filter((q) => q.process_id !== p.process_id && q.tip === 'SINGLE' && (q.kategorija === 'CEMENT_CLINKER' || q.kategorija === 'CALCINED_CLAY'))
      .map((q) => ({ value: q.process_id, label: `${ceProcessLabel(q)} (${ceCategoryLabel(q.kategorija)})` }));
    const req = dvRequest(r);
    const dv = req ? dvResults[dvRequestKey(req)] : undefined;
    return (
      <RowCard key={r.row_id} title={t('steel.pre.n', { n: idx + 1 })} onRemove={() => setRows((prev) => prev.filter((x) => x.row_id !== r.row_id))}>
        <SelectField label={t('steel.pre.origin')} value={r.izvor}
          options={[{ value: 'PURCHASED', label: t('steel.pre.purchased') }, { value: 'INTERNAL_PROCESS', label: t('steel.pre.internal') }]}
          onChange={(v) => upd(r.row_id, { izvor: v as CePrecursorRow['izvor'] })} />
        <SelectField label={t('cement.pd.cn')} required value={row?.cnCode ?? ''} options={cnOptions}
          onChange={(v) => {
            const next = findCnRow(mapping, v);
            upd(r.row_id, { cn_code: v, kategorija: next?.category ?? '', taric_code: next?.taricRequired && next.taricOptions.length === 1 ? next.taricOptions[0].taric : '' });
          }} />
        {row?.taricRequired ? (
          <SelectField label={t('cement.pd.taric')} required value={r.taric_code}
            options={row.taricOptions.map((o) => ({ value: o.taric, label: `${o.taric} – ${o.label}` }))}
            onChange={(v) => upd(r.row_id, { taric_code: v })} />
        ) : <Box />}
        <NumField label={t('cement.pre.mass')} required value={r.kolicina} onChange={(v) => upd(r.row_id, { kolicina: v })} />
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
                <Typography sx={{ fontSize: '0.82rem', color: T.color.forest }}>{zero === 'EU' ? t('steel.pre.zeroEu') : t('steel.pre.zeroExempt')}</Typography>
              </FullRow>
            ) : (
              <>
                <SelectField label={t('steel.pre.emissionData')} value={r.podaci}
                  options={[{ value: 'DEFAULT', label: t('cement.pre.dataDefault') }, { value: 'ACTUAL', label: t('steel.pre.dataActual') }]}
                  onChange={(v) => upd(r.row_id, { podaci: v as CePrecursorRow['podaci'] })} />
                {r.podaci === 'ACTUAL' && (
                  <>
                    <NumField label={t('cement.pre.seeDirectField')} required value={r.see_direktne} onChange={(v) => upd(r.row_id, { see_direktne: v })} />
                    <NumField label={t('cement.pre.seeIndirectField')} required value={r.see_indirektne} onChange={(v) => upd(r.row_id, { see_indirektne: v })} />
                    <CheckField label={t('steel.pre.verified')} checked={r.verifikovano} onChange={(v) => upd(r.row_id, { verifikovano: v })} />
                  </>
                )}
              </>
            )}
            <TextInput label={t('steel.pre.year')} value={r.godina_proizvodnje} onChange={(v) => upd(r.row_id, { godina_proizvodnje: v.replace(/\D/g, '').slice(0, 4) })}
              helperText={data.yRep ? t('steel.pre.yearBlank', { year: data.yRep }) : undefined} />
            <TextInput label={t('steel.pre.supplierInstallation')} value={r.postrojenje} onChange={(v) => upd(r.row_id, { postrojenje: v })} />
            {req && (
              <FullRow>
                <Typography sx={{ fontSize: '0.78rem', color: T.color.muted }}>
                  {dv == null ? t('cement.pre.dvLoading')
                    : dv.ok && dv.value
                      ? t('cement.pre.dvPreview', {
                        value: formatSee(dv.value.valueForYear), year: dv.value.year, markup: dv.value.markupPct ?? '—',
                        table: req.annex === 'IV' ? t('cement.pre.annexIv') : `${dv.value.country}${dv.value.fallbackUsed ? ` (${t('cement.general.fallback')})` : ''}`,
                        source: dv.value.source,
                      })
                      : (dv.errorCode ? ceIssueText(dv.errorCode, { what: '' }) : (dv.message ?? '—'))}
                </Typography>
              </FullRow>
            )}
          </>
        )}
      </RowCard>
    );
  };

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={meta.label} help={meta.help} />
      {consumers.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>
          {t('cement.pre.notNeeded')}
          {ignored > 0 && ` ${t('cement.pre.ignored', { count: ignored })}`}
        </Alert>
      ) : consumers.map((p) => {
        const own = rows.filter((r) => r.process_id === p.process_id);
        return (
          <Box key={p.process_id} sx={{ mb: 3 }}>
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.forest, mb: 1 }}>{ceProcessLabel(p)}</Typography>
            {p.tip === 'JOINT' && <Typography sx={{ fontSize: '0.8rem', color: T.color.muted, mb: 1 }}>{t('cement.pre.jointNote')}</Typography>}
            {own.map((r, idx) => renderRow(r, idx, p))}
            <AddButton label={t('steel.pre.add')} onClick={() => setRows((prev) => [...prev, newPrecursor(p.process_id)])} />
            <Divider sx={{ mt: 1, borderColor: T.color.lineFaint }} />
          </Box>
        );
      })}
      <IssueList errors={errors} warnings={warnings} />
      <NavButtons onBack={onBack} onNext={handleNext} nextDisabled={errors.length > 0} saving={saving} saveError={saveError} />
    </Box>
  );
}
