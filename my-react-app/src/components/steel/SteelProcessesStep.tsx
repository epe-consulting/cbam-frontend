import { useMemo, useRef, useState } from 'react';
import { Autocomplete, Box, IconButton, TextField, Typography } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { T, textFieldSx } from './steelTheme';
import {
  AddButton, CheckField, FullRow, IssueList, NavButtons, NumField, RowCard, SectionTitle, SelectField, StepHeader, TextInput,
} from './SteelUi';
import { questionMeta, type SteelStepProps } from './types';
import { checkCn } from './cnCheck';
import { useIsCnMapping, useIsCnValidation } from '../../hooks/useIronSteelRefData';
import type { IsCnValidation } from '../../api/ironSteel';
import { cnHeadingText, cnHelperText } from '../../utils/steelCnLabel';
import {
  CATEGORY_LABELS, CATEGORY_ROUTES, IS_Q, MB_MANDATORY, METHOD_LABELS, PROCESS_CHILD_QUESTIONS, ROUTE_LABELS,
  STEEL_CATEGORIES, categoryLabel, cnDigits, coveredCategories, mostDownstream, newRowId, nextProcessId,
  parseJsonRows, processCoversSinter, processRequiresMb, toNum,
  type ProcessRow, type SteelCategory, type SteelMethod, type StepIssue,
} from '../../utils/steelSteps';
import { useTranslation } from 'react-i18next';

function emptyProcess(processId: string): ProcessRow {
  return {
    row_id: newRowId(), process_id: processId, naziv: '', tip: 'SINGLE', kategorija: '',
    obuhvacene_kategorije: [], ruta: [], metoda: 'STANDARD', potvrda_bez_prodaje: false,
    proizvodi: [{ cn_code: '', kolicina: '' }],
  };
}

/** Keep routes valid for the covered categories, force MB where mandatory. */
function normalise(p: ProcessRow): ProcessRow {
  const cats = coveredCategories(p) as SteelCategory[];
  const allowed = new Set(cats.flatMap((c) => CATEGORY_ROUTES[c] ?? []));
  let ruta = p.ruta.filter((r) => allowed.has(r as never));
  cats.forEach((c) => {
    const routes = CATEGORY_ROUTES[c] ?? [];
    if (routes.length === 1 && !ruta.includes(routes[0])) ruta = [...ruta, routes[0]];
  });
  const metoda: SteelMethod = cats.some((c) => MB_MANDATORY.has(c)) ? 'MASS_BALANCE' : p.metoda;
  return { ...p, ruta, metoda };
}

function outputCategoryOk(res: IsCnValidation, covered: string[]): boolean {
  if (!res.category) return false;
  if (covered.includes(res.category)) return true;
  // 7205: may be pig iron or iron/steel product (spec §2.1, OQ-8)
  return Boolean(res.ambiguous) && (covered.includes('PIG_IRON') || covered.includes('IRON_STEEL_PRODUCTS'));
}

export function SteelProcessesStep({ data, questions, saving, saveError, onBack, onSubmit }: SteelStepProps) {
  const { t } = useTranslation();
  const meta = questionMeta(questions, IS_Q.PROCESS, t('steel.proc.label'), t('steel.proc.help'));
  const initialIds = useMemo(() => data.processes.map((p) => p.process_id), [data.processes]);
  // Next free number; ids are never reused within the session (spec §5.4). An empty step starts with P1.
  const counterRef = useRef<number>(initialIds.length > 0 ? Number(nextProcessId(initialIds).slice(1)) : 2);
  const [rows, setRows] = useState<ProcessRow[]>(() => (
    data.processes.length > 0
      ? data.processes.map((p) => ({
        ...emptyProcess(p.process_id), ...p,
        obuhvacene_kategorije: p.obuhvacene_kategorije ?? [], ruta: p.ruta ?? [], proizvodi: p.proizvodi ?? [],
      }))
      : [emptyProcess('P1')]
  ));

  const productCns = useMemo(
    () => [...new Set(data.products.map((p) => p.cn_code).filter(Boolean))],
    [data.products],
  );
  const allOutputCns = useMemo(() => rows.flatMap((r) => r.proizvodi.map((o) => o.cn_code)), [rows]);
  const cnResults = useIsCnValidation(allOutputCns, false);
  const { rows: cnMapping } = useIsCnMapping();

  /** Helper under an output CN: heading description · category (or nothing while unknown / invalid). */
  const outputCnHelper = (cn: string): string | undefined => {
    const res = cnResults[cnDigits(cn)];
    if (!res?.ok) return undefined;
    return cnHelperText(cnMapping, cn, categoryLabel(res.category));
  };

  const update =(i: number, patch: Partial<ProcessRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? normalise({ ...r, ...patch }) : r)));

  const addProcess = () => {
    const id = `P${counterRef.current}`;
    counterRef.current += 1;
    setRows((prev) => [...prev, emptyProcess(id)]);
  };

  const { errors, warnings, pending } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    let pend = false;
    if (rows.length === 0) e.push({ code: 'IS_E_QTY', message: t('steel.proc.eNone') });
    const cnToProcesses: Record<string, Set<string>> = {};
    rows.forEach((p) => {
      const label = t('steel.proc.process', { id: p.process_id });
      const cats = coveredCategories(p);
      if (p.tip === 'SINGLE' && !p.kategorija) e.push({ code: '', message: t('steel.proc.eCategory', { label }) });
      if (p.tip === 'JOINT') {
        if (p.obuhvacene_kategorije.length < 2) e.push({ code: 'IS_E_JOINT_NOT_ELIGIBLE', message: t('steel.proc.eJointMin', { label }) });
        if (!p.potvrda_bez_prodaje) e.push({ code: 'IS_E_JOINT_NOT_ELIGIBLE', message: t('steel.proc.eJointNoSale', { label }) });
      }
      (cats as SteelCategory[]).forEach((c) => {
        const allowed = CATEGORY_ROUTES[c] ?? [];
        if (!p.ruta.some((r) => allowed.includes(r as never))) {
          e.push({ code: '', message: t('steel.proc.eRoute', { label, category: categoryLabel(c) }) });
        }
      });
      if (processRequiresMb(p) && p.metoda !== 'MASS_BALANCE') {
        e.push({ code: 'IS_E_METHOD', message: t('steel.proc.eMethodMb', { label }) });
      }
      if (p.proizvodi.length === 0) e.push({ code: 'IS_E_QTY', message: t('steel.proc.eNoOutput', { label }) });
      const al = p.proizvodi.reduce((s, o) => s + (toNum(o.kolicina) ?? 0), 0);
      if (p.proizvodi.length > 0 && al <= 0) e.push({ code: 'IS_E_QTY', message: t('steel.proc.eActivity', { label }) });
      p.proizvodi.forEach((o, j) => {
        const what = t('steel.proc.productN', { label, n: j + 1 });
        const chk = checkCn(o.cn_code, cnResults, what);
        if (chk.state === 'error') e.push(chk.issue);
        else if (chk.state === 'pending') pend = true;
        else {
          if (chk.result.precursorOnly) {
            e.push({ code: 'IS_E_CN_NOT_CBAM_STEEL', message: t('steel.proc.eHydrogen', { what }) });
          } else if (!outputCategoryOk(chk.result, cats)) {
            e.push({ code: 'IS_E_OUTPUT_CATEGORY', message: t('steel.proc.eOutputCategory', { what, cn: o.cn_code, category: categoryLabel(chk.result.category) }) });
          }
        }
        const qty = toNum(o.kolicina);
        if (qty == null || qty <= 0) e.push({ code: 'IS_E_QTY', message: t('steel.msg.qty', { what }) });
        const d = cnDigits(o.cn_code);
        if (/^\d{4,8}$/.test(d)) (cnToProcesses[d] ??= new Set()).add(p.process_id);
      });
    });
    Object.entries(cnToProcesses).forEach(([d, set]) => {
      if (set.size > 1) {
        e.push({ code: 'IS_E_CN_MULTI_PROCESS', message: t('steel.proc.eCnMulti', { cn: d, processes: [...set].join(', ') }) });
      }
    });
    data.products.forEach((prod) => {
      const d = cnDigits(prod.cn_code);
      if (d && !cnToProcesses[d]) {
        w.push({
          code: 'IS_W_PRODUCT_NO_PROCESS_DEFAULT_USED',
          message: t('steel.proc.wNoProcess', { cn: prod.cn_code }),
        });
      }
    });
    return { errors: e, warnings: w, pending: pend };
  }, [rows, cnResults, data.products, t]);

  const handleNext = () => {
    const finalRows: ProcessRow[] = rows.map((p) => {
      if (p.tip !== 'JOINT') return { ...p, obuhvacene_kategorije: [], potvrda_bez_prodaje: false };
      const outCats = p.proizvodi
        .map((o) => cnResults[cnDigits(o.cn_code)]?.category)
        .filter((c): c is string => Boolean(c) && p.obuhvacene_kategorije.includes(c as string));
      return { ...p, kategorija: mostDownstream(outCats.length > 0 ? outCats : p.obuhvacene_kategorije) };
    });
    const payloadRows: Record<string, object[]> = { [IS_Q.PROCESS]: finalRows };

    // Cascade: drop rows of removed processes and rows that no longer fit the process method (spec §5.5, §7 IS_E_METHOD).
    const byId = new Map(finalRows.map((p) => [p.process_id, p]));
    const removed = new Set(initialIds.filter((id) => !byId.has(id)));
    const initialMethod = new Map(data.processes.map((p) => [p.process_id, p.metoda]));
    const initialById = new Map(data.processes.map((p) => [p.process_id, p]));
    const lostSinter = new Set(finalRows.filter((p) => {
      const before = initialById.get(p.process_id);
      return before != null && processCoversSinter(before) && !processCoversSinter(p);
    }).map((p) => p.process_id));
    const methodChanged = new Set(finalRows.filter((p) => initialMethod.has(p.process_id) && initialMethod.get(p.process_id) !== p.metoda).map((p) => p.process_id));
    if (removed.size > 0 || methodChanged.size > 0 || lostSinter.size > 0) {
      PROCESS_CHILD_QUESTIONS.forEach((code) => {
        const childRows = parseJsonRows<{ process_id?: string; izvorni_process_id?: string }>(data.values[code]);
        const kept = childRows.filter((r) => {
          if (r.process_id && removed.has(r.process_id)) return false;
          if (code === IS_Q.PRECURSOR && r.izvorni_process_id && removed.has(r.izvorni_process_id)) return false;
          if (code === IS_Q.ELECTRICITY && r.process_id && lostSinter.has(r.process_id)) return false;
          const p = r.process_id ? byId.get(r.process_id) : undefined;
          if (p && methodChanged.has(p.process_id)) {
            if (p.metoda === 'MASS_BALANCE' && (code === IS_Q.FUEL || code === IS_Q.MATERIAL)) return false;
            if (p.metoda === 'STANDARD' && code === IS_Q.MASS_BALANCE) return false;
          }
          return true;
        });
        if (kept.length !== childRows.length) payloadRows[code] = kept;
      });
    }
    onSubmit({ rows: payloadRows });
  };

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={meta.label} help={meta.help} />
      {rows.map((p, i) => {
        const cats = coveredCategories(p) as SteelCategory[];
        const routeOptions = [...new Set(cats.flatMap((c) => CATEGORY_ROUTES[c] ?? []))];
        const mbForced = processRequiresMb(p);
        return (
          <RowCard
            key={p.row_id}
            title={t('steel.proc.process', { id: p.process_id })}
            onRemove={rows.length > 1 ? () => setRows((prev) => prev.filter((_, idx) => idx !== i)) : undefined}
          >
            <TextInput label={t('steel.proc.name')} value={p.naziv} onChange={(v) => update(i, { naziv: v })} />
            <SelectField
              label={t('steel.proc.type')}
              value={p.tip}
              options={[
                { value: 'SINGLE', label: t('steel.proc.typeSingle') },
                { value: 'JOINT', label: t('steel.proc.typeJoint') },
              ]}
              onChange={(v) => {
                if (v === 'JOINT') update(i, { tip: 'JOINT', obuhvacene_kategorije: p.kategorija ? [p.kategorija] : [] });
                else update(i, { tip: 'SINGLE', kategorija: mostDownstream(p.obuhvacene_kategorije), obuhvacene_kategorije: [], potvrda_bez_prodaje: false });
              }}
            />
            {p.tip === 'SINGLE' ? (
              <SelectField
                label={t('steel.proc.category')}
                value={p.kategorija}
                required
                options={STEEL_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
                onChange={(v) => update(i, { kategorija: v })}
              />
            ) : (
              <Box />
            )}

            {p.tip === 'JOINT' && (
              <FullRow>
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', fontWeight: 500, color: T.color.ink }}>
                  {t('steel.proc.coveredCategories')}
                </Typography>
                <Box display="flex" flexWrap="wrap" columnGap={2}>
                  {STEEL_CATEGORIES.map((c) => (
                    <CheckField
                      key={c}
                      label={CATEGORY_LABELS[c]}
                      checked={p.obuhvacene_kategorije.includes(c)}
                      onChange={(checked) => update(i, {
                        obuhvacene_kategorije: checked
                          ? STEEL_CATEGORIES.filter((x) => x === c || p.obuhvacene_kategorije.includes(x))
                          : p.obuhvacene_kategorije.filter((x) => x !== c),
                      })}
                    />
                  ))}
                </Box>
                <CheckField
                  label={t('steel.proc.noSaleConfirm')}
                  checked={p.potvrda_bez_prodaje}
                  onChange={(v) => update(i, { potvrda_bez_prodaje: v })}
                />
              </FullRow>
            )}

            <FullRow>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', fontWeight: 500, color: T.color.ink }}>{t('steel.proc.route')}</Typography>
              {routeOptions.length === 0 ? (
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>{t('steel.proc.selectCategoryFirst')}</Typography>
              ) : (
                <Box display="flex" flexWrap="wrap" columnGap={2}>
                  {routeOptions.map((r) => (
                    <CheckField
                      key={r}
                      label={ROUTE_LABELS[r]}
                      checked={p.ruta.includes(r)}
                      onChange={(checked) => update(i, { ruta: checked ? [...p.ruta, r] : p.ruta.filter((x) => x !== r) })}
                    />
                  ))}
                </Box>
              )}
            </FullRow>

            <SelectField
              label={t('steel.proc.method')}
              value={p.metoda}
              disabled={mbForced}
              options={(Object.keys(METHOD_LABELS) as SteelMethod[]).map((m) => ({ value: m, label: METHOD_LABELS[m] }))}
              onChange={(v) => update(i, { metoda: v as SteelMethod })}
            />
            <FullRow>
              {mbForced && (
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.8rem', color: T.color.muted }}>
                  {t('steel.proc.mbForced')}
                </Typography>
              )}
            </FullRow>

            <FullRow>
              <SectionTitle>{t('steel.proc.outputsTitle')}</SectionTitle>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.8rem', color: T.color.muted, mb: 1 }}>
                {t('steel.proc.outputsHelp')}
              </Typography>
              {p.proizvodi.map((o, j) => (
                <Box key={j} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr auto' }, gap: 2, mb: 1.5, alignItems: 'center' }}>
                  <Autocomplete
                    freeSolo
                    options={productCns}
                    inputValue={o.cn_code}
                    onInputChange={(_, v) => update(i, { proizvodi: p.proizvodi.map((x, k) => (k === j ? { ...x, cn_code: v } : x)) })}
                    renderOption={(props, option) => {
                      const names = data.products.filter((d) => d.cn_code === option).map((d) => d.product_name).filter(Boolean);
                      return (
                        <li {...props} key={option}>
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.88rem' }}>
                              {option}{names.length > 0 ? ` · ${names.join(', ')}` : ''}
                            </Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: T.color.muted }}>{cnHeadingText(cnMapping, option)}</Typography>
                          </Box>
                        </li>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField {...params} size="small" label={t('steel.proc.cn8')} required sx={textFieldSx}
                        helperText={outputCnHelper(o.cn_code)} />
                    )}
                  />
                  <NumField
                    label={t('steel.proc.qtyT')}
                    value={o.kolicina}
                    required
                    onChange={(v) => update(i, { proizvodi: p.proizvodi.map((x, k) => (k === j ? { ...x, kolicina: v } : x)) })}
                  />
                  <IconButton
                    size="small"
                    aria-label={t('steel.proc.removeProduct')}
                    disabled={p.proizvodi.length <= 1}
                    onClick={() => update(i, { proizvodi: p.proizvodi.filter((_, k) => k !== j) })}
                    sx={{ color: T.color.muted, '&:hover': { bgcolor: T.color.errorLight, color: T.color.error } }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <AddButton label={t('steel.proc.addProduct')} onClick={() => update(i, { proizvodi: [...p.proizvodi, { cn_code: '', kolicina: '' }] })} />
            </FullRow>
          </RowCard>
        );
      })}
      <AddButton label={t('steel.proc.addProcess')} onClick={addProcess} />
      {rows.length < data.processes.length && (
        <IssueList infos={[t('steel.proc.deleteInfo')]} />
      )}
      <IssueList errors={errors} warnings={warnings} infos={pending ? [t('steel.proc.cnChecking')] : undefined} />
      <NavButtons onBack={onBack} onNext={handleNext} nextDisabled={errors.length > 0 || pending} saving={saving} saveError={saveError} />
    </Box>
  );
}
