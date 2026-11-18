import { useMemo, useState } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import { Close, InfoOutlined } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { T } from '../steel/steelTheme';
import { AddButton, IssueList, NavButtons, NumField, RowCard, SelectField, TextInput } from '../steel/SteelUi';
import { CountrySelect } from '../CountrySelect';
import { useCountries } from '../../hooks/useCountries';
import { useIsExemptOrigins } from '../../hooks/useIronSteelRefData';
import { useCeCnMapping } from '../../hooks/useCementRefData';
import type { ProductDetailEntry } from '../ProductDetailsStep';
import type { StepIssue } from '../../utils/steelSteps';
import {
  ceCategoryLabel, ceIssueText, ceProductIssues, findCnRow, needsClinkerContent, toCeProductRow,
} from '../../utils/cementSteps';

export interface CementProductDetailsStepProps {
  entries: ProductDetailEntry[];
  updateEntry: (index: number, updates: Partial<ProductDetailEntry>) => void;
  addEntry: () => void;
  removeEntry: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
  saving?: boolean;
  saveError?: string | null;
}

/** CBAM_PRODUCT_DETAILS for cement (spec §4.3, FE-4): CN select (6 codes), TARIC select, t, CountrySelect, CK %. */
export function CementProductDetailsStep({
  entries, updateEntry, addEntry, removeEntry, onBack, onNext, saving, saveError,
}: CementProductDetailsStepProps) {
  const { t } = useTranslation();
  const [infoOpen, setInfoOpen] = useState(false);
  const { countries } = useCountries();
  const { exempt } = useIsExemptOrigins();
  const { rows: mapping, loading: mappingLoading, error: mappingError } = useCeCnMapping();

  const { errors, warnings } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    if (mapping.length === 0) return { errors: e, warnings: w };
    const rows = entries.map(toCeProductRow);
    ceProductIssues(rows, mapping, false).forEach((i) => {
      e.push({ code: i.code, message: ceIssueText(i.code, { what: t('cement.pd.product', { n: i.index + 1 }) }) });
    });
    rows.forEach((r, idx) => {
      const what = t('cement.pd.product', { n: idx + 1 });
      if (!r.country_of_origin) return;
      if (countries.find((c) => c.country === r.country_of_origin)?.isEu) {
        w.push({ code: 'CE_W_ORIGIN_EU', message: ceIssueText('CE_W_ORIGIN_EU', { what }) });
      } else if (exempt.countries.includes(r.country_of_origin)) {
        w.push({ code: 'CE_W_ORIGIN_EXEMPT', message: ceIssueText('CE_W_ORIGIN_EXEMPT', { what }) });
      }
    });
    return { errors: e, warnings: w };
  }, [entries, mapping, countries, exempt, t]);

  const cnOptions = mapping.map((m) => ({ value: m.cnCode, label: `${m.cnCode} – ${m.description || ceCategoryLabel(m.category)}` }));

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink, letterSpacing: '-0.02em' }}>
          {t('cement.pd.title')}
        </Typography>
        <IconButton size="small" aria-label={t('cement.pd.cnInfo')} onClick={() => setInfoOpen(true)} sx={{ color: T.color.forest }}>
          <InfoOutlined fontSize="small" />
        </IconButton>
      </Box>
      <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.muted, mb: 2 }}>{t('cement.pd.intro')}</Typography>

      {entries.map((en, idx) => {
        const row = findCnRow(mapping, en.cnCode);
        const showCk = needsClinkerContent(row);
        return (
          <RowCard key={en.id} title={t('cement.pd.product', { n: idx + 1 })} onRemove={entries.length > 1 ? () => removeEntry(idx) : undefined}>
            <TextInput label={t('cement.pd.name')} required value={en.productName} onChange={(v) => updateEntry(idx, { productName: v })} />
            <SelectField
              label={t('cement.pd.cn')}
              required
              value={row?.cnCode ?? ''}
              options={cnOptions}
              disabled={mappingLoading}
              onChange={(v) => {
                const next = findCnRow(mapping, v);
                updateEntry(idx, {
                  cnCode: v,
                  // TARIC: the only option is preselected (2507 00 80 80); cleared where not required (spec §4.3)
                  taricCode: next?.taricRequired ? (next.taricOptions.length === 1 ? next.taricOptions[0].taric : '') : '',
                  clinkerSharePct: needsClinkerContent(next) ? (en.clinkerSharePct ?? '') : '',
                });
              }}
            />
            {row?.taricRequired ? (
              <SelectField
                label={t('cement.pd.taric')}
                required
                value={en.taricCode ?? ''}
                options={row.taricOptions.map((o) => ({ value: o.taric, label: `${o.taric} – ${o.label}` }))}
                onChange={(v) => updateEntry(idx, { taricCode: v })}
              />
            ) : <Box />}
            <NumField label={t('cement.pd.qty')} required value={en.quantity} onChange={(v) => updateEntry(idx, { quantity: v })} />
            <CountrySelect
              label={t('cement.pd.country')}
              countries={countries}
              value={countries.find((c) => c.country === en.countryOfOrigin)?.id ?? null}
              onChange={(c) => updateEntry(idx, { countryOfOrigin: c?.country ?? '' })}
            />
            {showCk ? (
              <NumField
                label={t('cement.pd.ck')}
                value={en.clinkerSharePct ?? ''}
                onChange={(v) => updateEntry(idx, { clinkerSharePct: v })}
                helperText={t('cement.pd.ckHelp')}
              />
            ) : <Box />}
            {row && (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography sx={{ fontSize: '0.78rem', color: T.color.muted }}>
                  {ceCategoryLabel(row.category)} · {row.functionalUnit === 'CLINKER_CONTENT' ? t('cement.pd.fuClinker') : t('cement.pd.fuGood')}
                </Typography>
              </Box>
            )}
          </RowCard>
        );
      })}
      <AddButton label={t('cement.pd.add')} onClick={addEntry} />
      <IssueList
        errors={errors}
        warnings={warnings}
        infos={[
          ...(mappingLoading ? [t('cement.pd.mappingLoading')] : []),
          ...(mappingError ? [t('cement.pd.mappingError', { error: mappingError })] : []),
          t('cement.pd.ckActualInfo'),
        ]}
      />
      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={errors.length > 0 || mapping.length === 0} saving={saving} saveError={saveError} />

      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: T.font.display, fontWeight: 600, color: T.color.ink, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {t('cement.pd.dialogTitle')}
          <IconButton onClick={() => setInfoOpen(false)} size="small" aria-label={t('common.close')}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.inkSoft, mb: 2, fontSize: '0.9rem' }}>{t('cement.pd.dialogText')}</Typography>
          <Box display="grid" gap={1} sx={{ mb: 2 }}>
            {mapping.map((m) => (
              <Box key={m.cnCode} sx={{ p: 1.25, border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.sm, display: 'grid', gridTemplateColumns: '110px 1fr', gap: 1.5 }}>
                <Typography sx={{ fontFamily: T.font.body, fontWeight: 700, color: T.color.forest }}>{m.cnCode}</Typography>
                <Box>
                  <Typography sx={{ fontFamily: T.font.body, color: T.color.inkSoft, fontSize: '0.88rem' }}>{ceCategoryLabel(m.category)}</Typography>
                  <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, fontSize: '0.78rem' }}>{m.description}</Typography>
                  {m.taricOptions.map((o) => (
                    <Typography key={o.taric} sx={{ fontFamily: T.font.body, color: T.color.muted, fontSize: '0.78rem' }}>TARIC {o.taric} – {o.label}</Typography>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.inkSoft, fontSize: '0.85rem', mb: 1 }}>{t('cement.pd.whiteDefinition')}</Typography>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.inkSoft, fontSize: '0.85rem' }}>{t('cement.pd.rangeRule')}</Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
