import { useMemo, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { T } from '../steel/steelTheme';
import {
  AddButton, CheckField, FullRow, IssueList, NavButtons, NumField, RowCard, SectionTitle, SelectField, StepHeader, TextInput,
} from '../steel/SteelUi';
import { questionMeta, type Al2StepProps } from './types';
import { newRowId, nextProcessId, parseJsonRows, type StepIssue } from '../../utils/steelSteps';
import {
  AL2_CATEGORIES, AL2_CATEGORY_LABELS, AL2_PROCESS_CHILD_QUESTIONS, AL2_Q, AL2_ROUTES, AL2_ROUTE_LABELS, al2ActivityLevel,
  al2IssueText, al2ProcessIssues, al2ProductsWithoutProcess, formatAl2Cn, processIsPrimary, processOutputCategory,
  processTakesPrecursors,
  type Al2ProcessOutput, type Al2ProcessRow,
} from '../../utils/aluminium2Steps';
import { Al2CnField } from './Al2CnField';

const emptyOutput = (): Al2ProcessOutput => ({ cn_code: '', kolicina: '' });

function emptyProcess(processId: string): Al2ProcessRow {
  return {
    row_id: newRowId(), process_id: processId, naziv: '', tip: 'SINGLE', kategorija: '', rute: [],
    obuhvacene_kategorije: [], potvrda_bez_prodaje: false, proizvodi: [emptyOutput()],
  };
}

/** AL2_PROCESSES (spec §4.4, FE-6): SINGLE/JOINT processes, category, routes, outputs, joint confirmation. */
export function Al2ProcessesStep({ data, questions, saving, saveError, onBack, onSubmit }: Al2StepProps) {
  const { t } = useTranslation();
  const meta = questionMeta(questions, AL2_Q.PROCESS, t('aluminium2.proc.label'), t('aluminium2.proc.help'));
  const mapping = data.mapping;
  const initialIds = useMemo(() => data.processes.map((p) => p.process_id), [data.processes]);
  const counterRef = useRef<number>(initialIds.length > 0 ? Number(nextProcessId(initialIds).slice(1)) : 2);
  const [rows, setRows] = useState<Al2ProcessRow[]>(() => (
    data.processes.length > 0
      ? data.processes.map((p) => ({ ...emptyProcess(p.process_id), ...p, proizvodi: (p.proizvodi ?? []).map((o) => ({ ...emptyOutput(), ...o })) }))
      : [emptyProcess('P1')]
  ));

  const update = (i: number, patch: Partial<Al2ProcessRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const updateOutput = (i: number, j: number, patch: Partial<Al2ProcessOutput>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, proizvodi: r.proizvodi.map((o, k) => (k === j ? { ...o, ...patch } : o)) } : r)));

  const addProcess = () => {
    const id = `P${counterRef.current}`;
    counterRef.current += 1;
    setRows((prev) => [...prev, emptyProcess(id)]);
  };

  const { errors, warnings } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    const res = al2ProcessIssues(rows, mapping);
    res.errors.forEach((x) => {
      const label = x.processId ? t('aluminium2.proc.process', { id: x.processId }) : '';
      const what = x.outputIndex != null ? t('aluminium2.proc.outputN', { label, n: x.outputIndex + 1 }) : label;
      let message: string;
      if (x.code === 'AL2_E_JOINT_NOT_ELIGIBLE') message = t(`aluminium2.proc.eJoint_${x.detail}`, { label });
      else if (x.code === 'AL2_E_ROUTE_MISSING' && x.detail === 'products') message = t('aluminium2.proc.eRouteProducts', { label });
      else if (x.code === 'AL2_E_QTY' && x.detail === 'noOutput') message = t('aluminium2.proc.eNoOutput', { label });
      else message = al2IssueText(x.code, { what: what || x.detail || '' });
      e.push({ code: x.code, message });
    });
    al2ProductsWithoutProcess(data.products, rows).forEach((p) => {
      w.push({ code: 'AL2_W_PRODUCT_NO_PROCESS_DEFAULT_USED', message: al2IssueText('AL2_W_PRODUCT_NO_PROCESS_DEFAULT_USED', { what: formatAl2Cn(p.cn_code) }) });
    });
    return { errors: e, warnings: w };
  }, [rows, mapping, data.products, t]);

  const handleNext = () => {
    const finalRows: Al2ProcessRow[] = rows.map((p) => {
      const base = { ...p, proizvodi: p.proizvodi.map((o) => ({ cn_code: formatAl2Cn(o.cn_code), kolicina: o.kolicina })) };
      // JOINT: kategorija PRODUCTS, both categories (contract §2); SINGLE: no joint fields, PRODUCTS without route.
      if (p.tip === 'JOINT') return { ...base, kategorija: 'ALUMINIUM_PRODUCTS' };
      return {
        ...base, obuhvacene_kategorije: [], potvrda_bez_prodaje: false,
        rute: p.kategorija === 'ALUMINIUM_PRODUCTS' ? [] : p.rute,
      };
    });
    const payloadRows: Record<string, object[]> = { [AL2_Q.PROCESS]: finalRows };

    // Cascade (spec §4.5): drop child rows of removed processes, anode / PFC rows of processes without the primary
    // route and precursor rows of processes that no longer take precursors.
    const byId = new Map(finalRows.map((p) => [p.process_id, p]));
    const removed = new Set(initialIds.filter((id) => !byId.has(id)));
    AL2_PROCESS_CHILD_QUESTIONS.forEach((code) => {
      const childRows = parseJsonRows<{ process_id?: string; izvorni_process_id?: string }>(data.values[code]);
      const kept = childRows.filter((r) => {
        if (r.process_id && removed.has(r.process_id)) return false;
        if (code === AL2_Q.PRECURSOR && r.izvorni_process_id && removed.has(r.izvorni_process_id)) return false;
        const p = r.process_id ? byId.get(r.process_id) : undefined;
        if (p && (code === AL2_Q.ANODE || code === AL2_Q.PFC) && !processIsPrimary(p)) return false;
        if (p && code === AL2_Q.PRECURSOR && !processTakesPrecursors(p)) return false;
        return true;
      });
      if (kept.length !== childRows.length) payloadRows[code] = kept;
    });
    onSubmit({ rows: payloadRows });
  };

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={t('aluminium2.step.AL2_PROCESSES')} help={meta.help} />
      <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.95rem', color: T.color.ink, mb: 1.5 }}>{meta.label}</Typography>
      {rows.map((p, i) => {
        const outCategory = processOutputCategory(p);
        const al = al2ActivityLevel(p);
        const showRoutes = p.tip === 'JOINT' || p.kategorija === 'UNWROUGHT_ALUMINIUM';
        return (
          <RowCard key={p.row_id} title={t('aluminium2.proc.process', { id: p.process_id })}
            onRemove={rows.length > 1 ? () => setRows((prev) => prev.filter((_, idx) => idx !== i)) : undefined}>
            <TextInput label={t('aluminium2.proc.name')} value={p.naziv} onChange={(v) => update(i, { naziv: v })} />
            <SelectField
              label={t('aluminium2.proc.type')}
              value={p.tip}
              options={[{ value: 'SINGLE', label: t('aluminium2.proc.typeSingle') }, { value: 'JOINT', label: t('aluminium2.proc.typeJoint') }]}
              onChange={(v) => {
                if (v === 'JOINT') {
                  update(i, { tip: 'JOINT', kategorija: 'ALUMINIUM_PRODUCTS', obuhvacene_kategorije: [...AL2_CATEGORIES] });
                } else {
                  update(i, { tip: 'SINGLE', kategorija: '', obuhvacene_kategorije: [], potvrda_bez_prodaje: false });
                }
              }}
            />
            {p.tip === 'SINGLE' ? (
              <SelectField label={t('aluminium2.proc.category')} required value={p.kategorija}
                options={AL2_CATEGORIES.map((c) => ({ value: c, label: AL2_CATEGORY_LABELS[c] }))}
                onChange={(v) => update(i, { kategorija: v, rute: v === 'ALUMINIUM_PRODUCTS' ? [] : p.rute })} />
            ) : (
              <Typography sx={{ fontSize: '0.85rem', color: T.color.muted, alignSelf: 'center' }}>{t('aluminium2.proc.jointCategory')}</Typography>
            )}

            {showRoutes && (
              <FullRow>
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', fontWeight: 500, color: T.color.ink }}>
                  {t('aluminium2.proc.routes')} *
                </Typography>
                <Box display="flex" flexWrap="wrap" columnGap={2}>
                  {AL2_ROUTES.map((r) => (
                    <CheckField key={r} label={AL2_ROUTE_LABELS[r]} checked={p.rute.includes(r)}
                      onChange={(checked) => update(i, {
                        rute: checked ? AL2_ROUTES.filter((x) => x === r || p.rute.includes(x)) : p.rute.filter((x) => x !== r),
                      })} />
                  ))}
                </Box>
                <Typography sx={{ fontSize: '0.8rem', color: T.color.muted }}>{t('aluminium2.proc.routesHelp')}</Typography>
              </FullRow>
            )}
            {p.tip === 'SINGLE' && p.kategorija === 'ALUMINIUM_PRODUCTS' && (
              <FullRow>
                <Typography sx={{ fontSize: '0.8rem', color: T.color.muted }}>{t('aluminium2.proc.productsNoRoute')}</Typography>
              </FullRow>
            )}

            {p.tip === 'JOINT' && (
              <FullRow>
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', fontWeight: 500, color: T.color.ink }}>{t('aluminium2.proc.coveredCategories')}</Typography>
                <Box display="flex" flexWrap="wrap" columnGap={2}>
                  {AL2_CATEGORIES.map((c) => (
                    <CheckField key={c} label={AL2_CATEGORY_LABELS[c]} checked={p.obuhvacene_kategorije.includes(c)}
                      onChange={(checked) => update(i, {
                        obuhvacene_kategorije: checked
                          ? AL2_CATEGORIES.filter((x) => x === c || p.obuhvacene_kategorije.includes(x))
                          : p.obuhvacene_kategorije.filter((x) => x !== c),
                      })} />
                  ))}
                </Box>
                <CheckField label={t('aluminium2.proc.noSaleConfirm')} checked={p.potvrda_bez_prodaje} onChange={(v) => update(i, { potvrda_bez_prodaje: v })} />
                <Typography sx={{ fontSize: '0.8rem', color: T.color.muted }}>{t('aluminium2.proc.jointHelp')}</Typography>
              </FullRow>
            )}

            <FullRow>
              <SectionTitle>{t('aluminium2.proc.outputsTitle')}</SectionTitle>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.8rem', color: T.color.muted, mb: 1 }}>{t('aluminium2.proc.outputsHelp')}</Typography>
              {p.proizvodi.map((o, j) => (
                <Box key={j} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr auto' }, gap: 2, mb: 1.5, alignItems: 'flex-start' }}>
                  <Al2CnField label={t('aluminium2.pd.cn')} required value={o.cn_code} mapping={mapping}
                    categories={outCategory ? [outCategory] : undefined}
                    onChange={(v) => updateOutput(i, j, { cn_code: v })} />
                  <NumField label={t('aluminium2.proc.qtyT')} required value={o.kolicina} onChange={(v) => updateOutput(i, j, { kolicina: v })} />
                  <IconButton size="small" aria-label={t('aluminium2.proc.removeOutput')} disabled={p.proizvodi.length <= 1}
                    onClick={() => update(i, { proizvodi: p.proizvodi.filter((_, k) => k !== j) })}
                    sx={{ mt: 0.5, color: T.color.muted, '&:hover': { bgcolor: T.color.errorLight, color: T.color.error } }}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <AddButton label={t('aluminium2.proc.addOutput')} onClick={() => update(i, { proizvodi: [...p.proizvodi, emptyOutput()] })} />
              <Typography sx={{ fontSize: '0.8rem', color: T.color.muted }}>
                {t('aluminium2.proc.alPreview', { al: al.toLocaleString('bs-BA', { maximumFractionDigits: 3 }) })}
              </Typography>
            </FullRow>
          </RowCard>
        );
      })}
      <AddButton label={t('aluminium2.proc.addProcess')} onClick={addProcess} />
      {rows.length < data.processes.length && <IssueList infos={[t('aluminium2.proc.deleteInfo')]} />}
      <IssueList errors={errors} warnings={warnings} />
      <NavButtons onBack={onBack} onNext={handleNext} nextDisabled={errors.length > 0} saving={saving} saveError={saveError} />
    </Box>
  );
}
