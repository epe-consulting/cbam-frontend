import { useMemo, useState } from 'react';
import { Alert, Box, Divider, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { T } from '../steel/steelTheme';
import {
  AddButton, CheckField, FullRow, IssueList, NavButtons, NumField, RowCard, SelectField, StepHeader, TextInput, type Option,
} from '../steel/SteelUi';
import { questionMeta, type Al2StepProps } from './types';
import { useCountries } from '../../hooks/useCountries';
import { useIsExemptOrigins } from '../../hooks/useIronSteelRefData';
import { al2DvRequestKey, useAl2DefaultValues, type Al2DvRequest } from '../../hooks/useAluminium2RefData';
import { checkNonNegative, checkPositive, newRowId, parseJsonRows, type StepIssue } from '../../utils/steelSteps';
import {
  AL2_MIN_YEAR, AL2_PRECURSOR_ROUTES, AL2_Q, al2ActivityLevel, al2FormatSee, al2InternalSourceOk, al2IssueText, al2MiSum,
  al2PrecursorCycle, al2PrecursorYear, al2ProcessLabel, allowedPrecursorCategories, checkAl2Cn, formatAl2Cn,
  precursorCategoryIssue, precursorMi, precursorUsesDefault, processTakesPrecursors,
  type Al2PrecursorRow, type Al2ProcessRow,
} from '../../utils/aluminium2Steps';
import { Al2CnField } from './Al2CnField';

function newPrecursor(processId: string): Al2PrecursorRow {
  return {
    row_id: newRowId(), process_id: processId, cn_code: '', izvor: 'PURCHASED', izvorni_process_id: '', kolicina: '',
    drzava: '', drzava_nepoznata: false, podaci: '', see_direktne: '', verifikovano: false, godina_proizvodnje: '',
    postrojenje: '', ruta_prekursora: '',
  };
}

/**
 * AL2_PRECURSORS (spec §4.4, §3.3(9), FE-10): unwrought aluminium / aluminium products consumed by products and
 * joint processes, and by unwrought processes with the secondary route. Internal vs purchased, EU / exempt origin,
 * unknown country (Annex IV), ACTUAL only with verification, primary/secondary info.
 */
export function Al2PrecursorsStep({ data, questions, saving, saveError, onBack, onSubmit }: Al2StepProps) {
  const { t } = useTranslation();
  const meta = questionMeta(questions, AL2_Q.PRECURSOR, t('aluminium2.pre.label'), t('aluminium2.pre.help'));
  const { countries } = useCountries();
  const { exempt } = useIsExemptOrigins();
  const mapping = data.mapping;
  const procById = useMemo(() => new Map(data.processes.map((p) => [p.process_id, p])), [data.processes]);
  const consumers = useMemo(() => data.processes.filter(processTakesPrecursors), [data.processes]);

  const stored = useMemo(() => parseJsonRows<Al2PrecursorRow>(data.values[AL2_Q.PRECURSOR]), [data.values]);
  const [rows, setRows] = useState<Al2PrecursorRow[]>(() => stored
    .filter((r) => { const p = procById.get(r.process_id); return p != null && processTakesPrecursors(p); })
    .map((r) => ({ ...newPrecursor(r.process_id), ...r })));
  const ignored = stored.length - rows.length;

  const originOptions: Option[] = [
    ...countries.map((c) => ({ value: c.country, label: c.country })),
    ...exempt.territories.map((name) => ({ value: name, label: t('steel.pre.exemptTerritory', { name }) })),
  ];

  /** EU / CBAM-R Annex III pt 1 origin → SEE 0 (CBAM-R Annex IV pt 3, p.54; spec §1.6). */
  const originZero = (r: Al2PrecursorRow): 'EU' | 'EXEMPT' | null => {
    if (r.izvor !== 'PURCHASED' || r.drzava_nepoznata || !r.drzava) return null;
    if (countries.find((c) => c.country === r.drzava)?.isEu) return 'EU';
    if (exempt.countries.includes(r.drzava) || exempt.territories.includes(r.drzava)) return 'EXEMPT';
    return null;
  };

  const upd = (rowId: string, patch: Partial<Al2PrecursorRow>) =>
    setRows((prev) => prev.map((r) => (r.row_id === rowId ? { ...r, ...patch } : r)));

  const dvRequest = (r: Al2PrecursorRow): Al2DvRequest | null => {
    if (!precursorUsesDefault(r) || originZero(r)) return null;
    const chk = checkAl2Cn(mapping, r.cn_code);
    const year = al2PrecursorYear(r.godina_proizvodnje, data.yRep);
    if (!chk.ok || year == null) return null;
    // Annex IV (DVC Annex II) for a precursor whose country of production is unknown (DVC p.1883; contract §3)
    if (r.drzava_nepoznata) return { cn: chk.digits, country: '', year, annex: 'IV' };
    if (!r.drzava) return null;
    return { cn: chk.digits, country: r.drzava, year, annex: 'I' };
  };
  const dvResults = useAl2DefaultValues(rows.map(dvRequest).filter((x): x is Al2DvRequest => x != null));

  const { errors, warnings } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    rows.forEach((r, idx) => {
      const what = t('aluminium2.pre.what', { n: idx + 1, process: r.process_id });
      const p = procById.get(r.process_id);
      const catIssue = p ? precursorCategoryIssue(r, p, mapping) : null;
      if (catIssue) e.push({ code: catIssue, message: al2IssueText(catIssue, { what }) });
      checkPositive(r.kolicina, what, e);
      if (r.izvor === 'INTERNAL_PROCESS') {
        if (!r.izvorni_process_id || !al2InternalSourceOk(r, procById.get(r.izvorni_process_id))) {
          e.push({ code: 'AL2_E_PRECURSOR_SOURCE', message: al2IssueText('AL2_E_PRECURSOR_SOURCE', { what }) });
        }
      } else {
        const zero = originZero(r);
        if (!r.drzava_nepoznata && !r.drzava) e.push({ code: '', message: t('steel.pre.eCountry', { what }) });
        if (!zero) {
          if (!r.podaci) e.push({ code: '', message: t('steel.pre.eData', { what }) });
          if (r.podaci === 'ACTUAL') {
            // Verified ACTUAL needs see_direktne; unverified ACTUAL falls back to the default value (backend, contract §2).
            if (String(r.see_direktne).trim() === '') {
              if (r.verifikovano) e.push({ code: 'AL2_E_PRECURSOR_ACTUAL_MISSING', message: al2IssueText('AL2_E_PRECURSOR_ACTUAL_MISSING', { what }) });
            } else {
              checkNonNegative(r.see_direktne, t('aluminium2.pre.seeDirect', { what }), e, true);
            }
            if (!r.verifikovano) w.push({ code: 'AL2_W_PRECURSOR_UNVERIFIED', message: al2IssueText('AL2_W_PRECURSOR_UNVERIFIED', { what }) });
          }
        }
        const y = r.godina_proizvodnje.trim();
        if (y !== '' && !/^\d{4}$/.test(y)) e.push({ code: '', message: t('steel.pre.eYear', { what }) });
        else if (y !== '' && Number(y) < AL2_MIN_YEAR) w.push({ code: '', message: t('steel.pre.wYear', { what }) });
      }
    });
    const cycle = al2PrecursorCycle(rows);
    if (cycle) e.push({ code: 'AL2_E_PRECURSOR_CYCLE', message: al2IssueText('AL2_E_PRECURSOR_CYCLE', { what: cycle.join(' → ') }) });
    consumers.forEach((p) => {
      const m = al2MiSum(p, rows);
      if (m != null && m < 1) w.push({ code: 'AL2_W_MI_BELOW_ONE', message: al2IssueText('AL2_W_MI_BELOW_ONE', { what: al2ProcessLabel(p), m: m.toFixed(4) }) });
    });
    return { errors: e, warnings: w };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, mapping, procById, countries, exempt, consumers, t]);

  const handleNext = () => {
    const out = rows.map((r) => {
      const chk = checkAl2Cn(mapping, r.cn_code);
      const base = {
        ...r,
        cn_code: formatAl2Cn(r.cn_code),
        // primary / secondary info only for unwrought aluminium (G05e p.11, p.16; OQ-AL2-15)
        ruta_prekursora: chk.ok && chk.category === 'UNWROUGHT_ALUMINIUM' ? r.ruta_prekursora : '' as const,
      };
      if (r.izvor === 'INTERNAL_PROCESS') {
        return {
          ...base, drzava: '', drzava_nepoznata: false, podaci: '' as const, see_direktne: '', verifikovano: false,
          godina_proizvodnje: '', postrojenje: '',
        };
      }
      return {
        ...base,
        izvorni_process_id: '',
        drzava: r.drzava_nepoznata ? '' : r.drzava,
        see_direktne: r.podaci === 'ACTUAL' ? r.see_direktne : '',
        verifikovano: r.podaci === 'ACTUAL' ? r.verifikovano : false,
      };
    });
    onSubmit({ rows: { [AL2_Q.PRECURSOR]: out } });
  };

  const renderRow = (r: Al2PrecursorRow, idx: number, p: Al2ProcessRow) => {
    const zero = originZero(r);
    const chk = checkAl2Cn(mapping, r.cn_code);
    const sourceOptions = data.processes
      .filter((q) => q.process_id !== p.process_id && q.tip === 'SINGLE')
      .map((q) => ({ value: q.process_id, label: al2ProcessLabel(q) }));
    const req = dvRequest(r);
    const dv = req ? dvResults[al2DvRequestKey(req)] : undefined;
    const mi = precursorMi(r.kolicina, al2ActivityLevel(p));
    return (
      <RowCard key={r.row_id} title={t('steel.pre.n', { n: idx + 1 })} onRemove={() => setRows((prev) => prev.filter((x) => x.row_id !== r.row_id))}>
        <SelectField label={t('steel.pre.origin')} value={r.izvor}
          options={[{ value: 'PURCHASED', label: t('steel.pre.purchased') }, { value: 'INTERNAL_PROCESS', label: t('steel.pre.internal') }]}
          onChange={(v) => upd(r.row_id, { izvor: v as Al2PrecursorRow['izvor'] })} />
        <Al2CnField label={t('aluminium2.pd.cn')} required value={r.cn_code} mapping={mapping} categories={allowedPrecursorCategories(p)}
          onChange={(v) => upd(r.row_id, { cn_code: v })} />
        <NumField label={t('aluminium2.pre.mass')} required value={r.kolicina} onChange={(v) => upd(r.row_id, { kolicina: v })}
          helperText={mi != null ? t('aluminium2.pre.miPreview', { m: mi.toFixed(6) }) : undefined} />
        {chk.ok && chk.category === 'UNWROUGHT_ALUMINIUM' ? (
          <SelectField label={t('aluminium2.pre.route')} value={r.ruta_prekursora} options={AL2_PRECURSOR_ROUTES} emptyLabel={t('aluminium2.pre.routeBlank')}
            onChange={(v) => upd(r.row_id, { ruta_prekursora: v as Al2PrecursorRow['ruta_prekursora'] })} />
        ) : <Box />}
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
                  options={[{ value: 'DEFAULT', label: t('aluminium2.pre.dataDefault') }, { value: 'ACTUAL', label: t('steel.pre.dataActual') }]}
                  onChange={(v) => upd(r.row_id, { podaci: v as Al2PrecursorRow['podaci'] })} />
                {r.podaci === 'ACTUAL' && (
                  <>
                    <NumField label={t('aluminium2.pre.seeDirectField')} required value={r.see_direktne} onChange={(v) => upd(r.row_id, { see_direktne: v })} />
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
                  {dv == null ? t('aluminium2.pre.dvLoading')
                    : dv.ok && dv.value
                      ? t('aluminium2.pre.dvPreview', {
                        value: al2FormatSee(dv.value.valueForYear), year: dv.value.year, markup: dv.value.markupPct ?? '—',
                        table: req.annex === 'IV' ? t('aluminium2.pre.annexIv') : `${dv.value.country}${dv.value.fallbackUsed ? ` (${t('aluminium2.general.fallback')})` : ''}`,
                        source: dv.value.source,
                      })
                      : (dv.errorCode ? al2IssueText(dv.errorCode) : (dv.message ?? '—'))}
                  {dv?.ok && dv.value?.dvcCorrection ? ` · ${t('aluminium2.res.dvcBadge')}` : ''}
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
      <StepHeader title={t('aluminium2.step.AL2_PRECURSORS')} help={meta.help} />
      <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.95rem', color: T.color.ink, mb: 1.5 }}>{meta.label}</Typography>
      {consumers.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>
          {t('aluminium2.notNeeded')}
          {ignored > 0 && ` ${t('aluminium2.ignoredRows', { count: ignored })}`}
        </Alert>
      ) : consumers.map((p) => {
        const own = rows.filter((r) => r.process_id === p.process_id);
        return (
          <Box key={p.process_id} sx={{ mb: 3 }}>
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.forest, mb: 1 }}>{al2ProcessLabel(p)}</Typography>
            {p.tip === 'SINGLE' && p.kategorija === 'UNWROUGHT_ALUMINIUM' && (
              <Typography sx={{ fontSize: '0.8rem', color: T.color.muted, mb: 1 }}>{t('aluminium2.pre.unwroughtNote')}</Typography>
            )}
            {p.tip === 'JOINT' && <Typography sx={{ fontSize: '0.8rem', color: T.color.muted, mb: 1 }}>{t('aluminium2.pre.jointNote')}</Typography>}
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
