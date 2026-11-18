import { useMemo, useState } from 'react';
import {
  Autocomplete, Box, Dialog, DialogContent, DialogTitle, IconButton, TextField, Typography,
} from '@mui/material';
import { Close, InfoOutlined } from '@mui/icons-material';
import { T, textFieldSx } from './steelTheme';
import { AddButton, IssueList, NavButtons, NumField, RowCard, SelectField, TextInput } from './SteelUi';
import { checkCn } from './cnCheck';
import { CountrySelect } from '../CountrySelect';
import { useCountries } from '../../hooks/useCountries';
import { useIsCnMapping, useIsCnValidation, useIsExemptOrigins } from '../../hooks/useIronSteelRefData';
import type { ProductDetailEntry } from '../ProductDetailsStep';
import { categoryLabel, cnDigits, toNum, type StepIssue } from '../../utils/steelSteps';
import { cnHelperText } from '../../utils/steelCnLabel';
import { useTranslation } from 'react-i18next';

export interface SteelProductDetailsStepProps {
  entries: ProductDetailEntry[];
  updateEntry: (index: number, updates: Partial<ProductDetailEntry>) => void;
  addEntry: () => void;
  removeEntry: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
  saving?: boolean;
  saveError?: string | null;
}

/** CBAM_PRODUCT_DETAILS for iron & steel (spec §5.3): 8-digit CN, tonnes, CountrySelect, 7205 category. */
export function SteelProductDetailsStep({
  entries, updateEntry, addEntry, removeEntry, onBack, onNext, saving, saveError,
}: SteelProductDetailsStepProps) {
  const { t } = useTranslation();
  const [infoOpen, setInfoOpen] = useState(false);
  const { countries } = useCountries();
  const { exempt } = useIsExemptOrigins();
  const { rows: mapping, error: mappingError } = useIsCnMapping();
  const cnResults = useIsCnValidation(entries.map((e) => e.cnCode), false);
  const suggestions = useMemo(() => mapping.filter((m) => !m.precursorOnly), [mapping]);

  const { errors, warnings, pending } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    let pend = false;
    entries.forEach((en, idx) => {
      const what = t('steel.pd.product', { n: idx + 1 });
      if (!en.productName.trim()) e.push({ code: '', message: t('steel.pd.eName', { what }) });
      const chk = checkCn(en.cnCode, cnResults, what);
      if (chk.state === 'error') e.push(chk.issue);
      else if (chk.state === 'pending') pend = true;
      else if (chk.result.precursorOnly) {
        e.push({ code: 'IS_E_CN_NOT_CBAM_STEEL', message: t('steel.pd.eHydrogen', { what }) });
      }
      const q = toNum(en.quantity);
      if (q == null || q <= 0) e.push({ code: 'IS_E_QTY', message: t('steel.pd.eQty', { what }) });
      if (!en.countryOfOrigin) e.push({ code: '', message: t('steel.pd.eCountry', { what }) });
      else if (countries.find((c) => c.country === en.countryOfOrigin)?.isEu) {
        w.push({ code: 'IS_W_ORIGIN_EU', message: t('steel.pd.wEu', { what }) });
      } else if (exempt.countries.includes(en.countryOfOrigin)) {
        w.push({ code: 'IS_W_ORIGIN_EXEMPT', message: t('steel.pd.wExempt', { what }) });
      }
    });
    return { errors: e, warnings: w, pending: pend };
  }, [entries, cnResults, countries, exempt, t]);

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink, letterSpacing: '-0.02em' }}>
          {t('steel.pd.title')}
        </Typography>
        <IconButton size="small" aria-label={t('steel.pd.cnInfo')} onClick={() => setInfoOpen(true)} sx={{ color: T.color.forest }}>
          <InfoOutlined fontSize="small" />
        </IconButton>
      </Box>
      <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.muted, mb: 2 }}>
        {t('steel.pd.intro')}
      </Typography>

      {entries.map((en, idx) => {
        const res = cnResults[cnDigits(en.cnCode)];
        const ambiguous = Boolean(res?.ok && res.ambiguous);
        return (
          <RowCard key={en.id} title={t('steel.pd.product', { n: idx + 1 })} onRemove={entries.length > 1 ? () => removeEntry(idx) : undefined}>
            <TextInput label={t('steel.pd.name')} required value={en.productName} onChange={(v) => updateEntry(idx, { productName: v })} />
            <Autocomplete
              freeSolo
              options={suggestions.map((m) => m.cnCode)}
              getOptionLabel={(o) => o}
              filterOptions={(options, state) => {
                // Search by code (with or without spaces) or by heading description.
                const q = state.inputValue.trim().toLowerCase();
                if (!q) return options;
                const qDigits = cnDigits(q);
                return options.filter((o) => {
                  const m = suggestions.find((x) => x.cnCode === o);
                  const d = m?.cnDigits ?? cnDigits(o);
                  return (qDigits.length > 0 && (d.startsWith(qDigits) || qDigits.startsWith(d)))
                    || (m?.description ?? '').toLowerCase().includes(q);
                });
              }}
              renderOption={(props, option) => {
                const m = suggestions.find((x) => x.cnCode === option);
                return (
                  <li {...props} key={option}>
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.88rem' }}>{option}</Typography>
                      {m?.description && (
                        <Typography sx={{ fontSize: '0.8rem', color: T.color.inkSoft }}>{m.description}</Typography>
                      )}
                      <Typography sx={{ fontSize: '0.72rem', color: T.color.muted }}>{categoryLabel(m?.category)}</Typography>
                    </Box>
                  </li>
                );
              }}
              inputValue={en.cnCode}
              onInputChange={(_, v) => updateEntry(idx, { cnCode: v })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  required
                  label={t('steel.proc.cn8')}
                  helperText={res?.ok
                    ? cnHelperText(mapping, en.cnCode, categoryLabel(ambiguous ? (en.aggregatedCategory || 'IRON_STEEL_PRODUCTS') : res.category))
                    : t('steel.pd.cnExample')}
                  sx={textFieldSx}
                />
              )}
            />
            <NumField label={t('steel.proc.qtyT')} required value={en.quantity} onChange={(v) => updateEntry(idx, { quantity: v })} />
            <CountrySelect
              label={t('steel.pre.countryOrigin')}
              countries={countries}
              value={countries.find((c) => c.country === en.countryOfOrigin)?.id ?? null}
              onChange={(c) => updateEntry(idx, { countryOfOrigin: c?.country ?? '' })}
            />
            {ambiguous && (
              <SelectField
                label={t('steel.pd.aggCategory')}
                value={en.aggregatedCategory || 'IRON_STEEL_PRODUCTS'}
                options={[
                  { value: 'IRON_STEEL_PRODUCTS', label: categoryLabel('IRON_STEEL_PRODUCTS') },
                  { value: 'PIG_IRON', label: categoryLabel('PIG_IRON') },
                ]}
                onChange={(v) => updateEntry(idx, { aggregatedCategory: v })}
              />
            )}
          </RowCard>
        );
      })}
      <AddButton label={t('steel.proc.addProduct')} onClick={addEntry} />
      <IssueList
        errors={errors}
        warnings={warnings}
        infos={[
          ...(pending ? [t('steel.proc.cnChecking')] : []),
          ...(mappingError ? [t('steel.pd.cnListError', { error: mappingError })] : []),
        ]}
      />
      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={errors.length > 0 || pending} saving={saving} saveError={saveError} />

      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: T.font.display, fontWeight: 600, color: T.color.ink, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {t('steel.pd.dialogTitle')}
          <IconButton onClick={() => setInfoOpen(false)} size="small" aria-label={t('common.close')}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.inkSoft, mb: 2, fontSize: '0.9rem' }}>
            {t('steel.pd.dialogText')}
          </Typography>
          <Box display="grid" gap={1}>
            {suggestions.map((m) => (
              <Box key={m.cnCode} sx={{ p: 1.25, border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.sm, display: 'grid', gridTemplateColumns: '110px 1fr', gap: 1.5 }}>
                <Typography sx={{ fontFamily: T.font.body, fontWeight: 700, color: T.color.forest }}>{m.cnCode}</Typography>
                <Box>
                  <Typography sx={{ fontFamily: T.font.body, color: T.color.inkSoft, fontSize: '0.88rem' }}>{categoryLabel(m.category)}</Typography>
                  <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, fontSize: '0.78rem' }}>{m.description}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
