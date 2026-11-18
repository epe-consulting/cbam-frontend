import { useMemo, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { T } from '../steel/steelTheme';
import {
  AddButton, CheckField, FullRow, IssueList, NavButtons, NumField, RowCard, SectionTitle, SelectField, StepHeader, TextInput,
} from '../steel/SteelUi';
import { questionMeta, type CementStepProps } from './types';
import { newRowId, nextProcessId, parseJsonRows, type StepIssue } from '../../utils/steelSteps';
import {
  CE_CATEGORIES, CE_CATEGORY_LABELS, CE_JOINT_CATEGORIES, CE_PROCESS_CHILD_QUESTIONS, CE_Q, ceCategoryLabel, ceIssueText,
  ceProcessCoversClinker, ceProcessIssues, ceProcessTakesPrecursors, findCnRow, needsClinkerContent, processActivityLevel,
  productsWithoutProcess,
  type CeProcessOutput, type CeProcessRow,
} from '../../utils/cementSteps';

const emptyOutput = (): CeProcessOutput => ({ cn_code: '', taric_code: '', kolicina: '', klinker_udio_posto: '' });

function emptyProcess(processId: string): CeProcessRow {
  return {
    row_id: newRowId(), process_id: processId, naziv: '', tip: 'SINGLE', kategorija: '',
    obuhvacene_kategorije: [], potvrda_bez_prodaje: false, proizvodi: [emptyOutput()],
  };
}

/** CE_PROCESSES (spec §4.4, FE-6): SINGLE/JOINT processes, categories, outputs with TARIC / CK. */
export function CementProcessesStep({ data, questions, saving, saveError, onBack, onSubmit }: CementStepProps) {
  const { t } = useTranslation();
  const meta = questionMeta(questions, CE_Q.PROCESS, t('cement.proc.label'), t('cement.proc.help'));
  const mapping = data.mapping;
  const initialIds = useMemo(() => data.processes.map((p) => p.process_id), [data.processes]);
  const counterRef = useRef<number>(initialIds.length > 0 ? Number(nextProcessId(initialIds).slice(1)) : 2);
  const [rows, setRows] = useState<CeProcessRow[]>(() => (
    data.processes.length > 0
      ? data.processes.map((p) => ({ ...emptyProcess(p.process_id), ...p, proizvodi: (p.proizvodi ?? []).map((o) => ({ ...emptyOutput(), ...o })) }))
      : [emptyProcess('P1')]
  ));

  const update = (i: number, patch: Partial<CeProcessRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const updateOutput = (i: number, j: number, patch: Partial<CeProcessOutput>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, proizvodi: r.proizvodi.map((o, k) => (k === j ? { ...o, ...patch } : o)) } : r)));

  const addProcess = () => {
    const id = `P${counterRef.current}`;
    counterRef.current += 1;
    setRows((prev) => [...prev, emptyProcess(id)]);
  };

  const { errors, warnings } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    const res = ceProcessIssues(rows, mapping);
    res.errors.forEach((x) => {
      const label = x.processId ? t('cement.proc.process', { id: x.processId }) : '';
      const what = x.outputIndex != null ? t('cement.proc.outputN', { label, n: x.outputIndex + 1 }) : label;
      const key = x.code === 'CE_E_JOINT_NOT_ELIGIBLE' ? `cement.proc.eJoint_${x.detail}` : null;
      e.push({ code: x.code, message: key ? t(key, { label }) : ceIssueText(x.code, { what, detail: x.detail ?? '' }) });
    });
    res.warnings.forEach((x) => {
      w.push({ code: x.code, message: ceIssueText(x.code, { what: t('cement.proc.process', { id: x.processId }) }) });
    });
    productsWithoutProcess(data.products, rows, mapping).forEach((p) => {
      w.push({ code: 'CE_W_PRODUCT_NO_PROCESS_DEFAULT_USED', message: ceIssueText('CE_W_PRODUCT_NO_PROCESS_DEFAULT_USED', { what: p.taric_code || p.cn_code }) });
    });
    return { errors: e, warnings: w };
  }, [rows, mapping, data.products, t]);

  const handleNext = () => {
    const finalRows: CeProcessRow[] = rows.map((p) => (p.tip === 'JOINT'
      ? { ...p, kategorija: 'CEMENT' }
      : { ...p, obuhvacene_kategorije: [], potvrda_bez_prodaje: false }))
      .map((p) => ({
        ...p,
        proizvodi: p.proizvodi.map((o) => {
          const row = findCnRow(mapping, o.cn_code);
          return {
            ...o,
            taric_code: row?.taricRequired ? o.taric_code : '',
            klinker_udio_posto: needsClinkerContent(row) ? o.klinker_udio_posto : '',
          };
        }),
      }));
    const payloadRows: Record<string, object[]> = { [CE_Q.PROCESS]: finalRows };

    // Cascade (spec §4.5): drop child rows of removed processes, Method B / CKD rows of processes that no longer
    // cover clinker, and precursor rows of processes that are no longer CEMENT.
    const byId = new Map(finalRows.map((p) => [p.process_id, p]));
    const removed = new Set(initialIds.filter((id) => !byId.has(id)));
    CE_PROCESS_CHILD_QUESTIONS.forEach((code) => {
      const childRows = parseJsonRows<{ process_id?: string; izvorni_process_id?: string }>(data.values[code]);
      const kept = childRows.filter((r) => {
        if (r.process_id && removed.has(r.process_id)) return false;
        if (code === CE_Q.PRECURSOR && r.izvorni_process_id && removed.has(r.izvorni_process_id)) return false;
        const p = r.process_id ? byId.get(r.process_id) : undefined;
        if (p && (code === CE_Q.CLINKER_OUTPUT || code === CE_Q.CKD) && !ceProcessCoversClinker(p)) return false;
        if (p && code === CE_Q.PRECURSOR && !ceProcessTakesPrecursors(p)) return false;
        return true;
      });
      if (kept.length !== childRows.length) payloadRows[code] = kept;
    });
    onSubmit({ rows: payloadRows });
  };

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={meta.label} help={meta.help} />
      {rows.map((p, i) => {
        const outCategory = p.tip === 'JOINT' ? 'CEMENT' : p.kategorija;
        const cnOptions = mapping
          .filter((m) => !outCategory || m.category === outCategory)
          .map((m) => ({ value: m.cnCode, label: `${m.cnCode} – ${m.description || ceCategoryLabel(m.category)}` }));
        const { alFu, alMass } = processActivityLevel(p, mapping);
        return (
          <RowCard key={p.row_id} title={t('cement.proc.process', { id: p.process_id })}
            onRemove={rows.length > 1 ? () => setRows((prev) => prev.filter((_, idx) => idx !== i)) : undefined}>
            <TextInput label={t('cement.proc.name')} value={p.naziv} onChange={(v) => update(i, { naziv: v })} />
            <SelectField
              label={t('cement.proc.type')}
              value={p.tip}
              options={[{ value: 'SINGLE', label: t('cement.proc.typeSingle') }, { value: 'JOINT', label: t('cement.proc.typeJoint') }]}
              onChange={(v) => {
                if (v === 'JOINT') {
                  update(i, {
                    tip: 'JOINT', kategorija: 'CEMENT',
                    obuhvacene_kategorije: CE_JOINT_CATEGORIES.filter((c) => c === 'CEMENT' || c === p.kategorija),
                  });
                } else {
                  update(i, { tip: 'SINGLE', kategorija: 'CEMENT', obuhvacene_kategorije: [], potvrda_bez_prodaje: false });
                }
              }}
            />
            {p.tip === 'SINGLE' ? (
              <SelectField label={t('cement.proc.category')} required value={p.kategorija}
                options={CE_CATEGORIES.map((c) => ({ value: c, label: CE_CATEGORY_LABELS[c] }))}
                onChange={(v) => update(i, { kategorija: v })} />
            ) : (
              <Typography sx={{ fontSize: '0.85rem', color: T.color.muted, alignSelf: 'center' }}>{t('cement.proc.jointCategory')}</Typography>
            )}

            {p.tip === 'JOINT' && (
              <FullRow>
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', fontWeight: 500, color: T.color.ink }}>{t('cement.proc.coveredCategories')}</Typography>
                <Box display="flex" flexWrap="wrap" columnGap={2}>
                  {CE_JOINT_CATEGORIES.map((c) => (
                    <CheckField key={c} label={CE_CATEGORY_LABELS[c]} checked={p.obuhvacene_kategorije.includes(c)}
                      onChange={(checked) => update(i, {
                        obuhvacene_kategorije: checked
                          ? CE_JOINT_CATEGORIES.filter((x) => x === c || p.obuhvacene_kategorije.includes(x))
                          : p.obuhvacene_kategorije.filter((x) => x !== c),
                      })} />
                  ))}
                </Box>
                <CheckField label={t('cement.proc.noSaleConfirm')} checked={p.potvrda_bez_prodaje} onChange={(v) => update(i, { potvrda_bez_prodaje: v })} />
                <Typography sx={{ fontSize: '0.8rem', color: T.color.muted }}>{t('cement.proc.jointHelp')}</Typography>
              </FullRow>
            )}

            <FullRow>
              <SectionTitle>{t('cement.proc.outputsTitle')}</SectionTitle>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.8rem', color: T.color.muted, mb: 1 }}>{t('cement.proc.outputsHelp')}</Typography>
              {p.proizvodi.map((o, j) => {
                const row = findCnRow(mapping, o.cn_code);
                return (
                  <Box key={j} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1.5fr 1fr 1fr auto' }, gap: 2, mb: 1.5, alignItems: 'center' }}>
                    <SelectField label={t('cement.pd.cn')} required value={row?.cnCode ?? ''} options={cnOptions}
                      onChange={(v) => {
                        const next = findCnRow(mapping, v);
                        updateOutput(i, j, {
                          cn_code: v,
                          taric_code: next?.taricRequired ? (next.taricOptions.length === 1 ? next.taricOptions[0].taric : '') : '',
                          klinker_udio_posto: needsClinkerContent(next) ? o.klinker_udio_posto : '',
                        });
                      }} />
                    {row?.taricRequired ? (
                      <SelectField label={t('cement.pd.taric')} required value={o.taric_code}
                        options={row.taricOptions.map((x) => ({ value: x.taric, label: `${x.taric} – ${x.label}` }))}
                        onChange={(v) => updateOutput(i, j, { taric_code: v })} />
                    ) : <Box />}
                    <NumField label={t('cement.proc.qtyT')} required value={o.kolicina} onChange={(v) => updateOutput(i, j, { kolicina: v })} />
                    {needsClinkerContent(row) ? (
                      <NumField label={t('cement.pd.ck')} required value={o.klinker_udio_posto} onChange={(v) => updateOutput(i, j, { klinker_udio_posto: v })} />
                    ) : <Box />}
                    <IconButton size="small" aria-label={t('cement.proc.removeOutput')} disabled={p.proizvodi.length <= 1}
                      onClick={() => update(i, { proizvodi: p.proizvodi.filter((_, k) => k !== j) })}
                      sx={{ color: T.color.muted, '&:hover': { bgcolor: T.color.errorLight, color: T.color.error } }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}
              <AddButton label={t('cement.proc.addOutput')} onClick={() => update(i, { proizvodi: [...p.proizvodi, emptyOutput()] })} />
              <Typography sx={{ fontSize: '0.8rem', color: T.color.muted }}>
                {t('cement.proc.alPreview', { fu: alFu.toLocaleString('bs-BA', { maximumFractionDigits: 3 }), mass: alMass.toLocaleString('bs-BA', { maximumFractionDigits: 3 }) })}
              </Typography>
            </FullRow>
          </RowCard>
        );
      })}
      <AddButton label={t('cement.proc.addProcess')} onClick={addProcess} />
      {rows.length < data.processes.length && <IssueList infos={[t('cement.proc.deleteInfo')]} />}
      <IssueList errors={errors} warnings={warnings} />
      <NavButtons onBack={onBack} onNext={handleNext} nextDisabled={errors.length > 0} saving={saving} saveError={saveError} />
    </Box>
  );
}
