import { useMemo, useState } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import { Close, InfoOutlined } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { T } from '../steel/steelTheme';
import { AddButton, IssueList, NavButtons, NumField, RowCard, TextInput } from '../steel/SteelUi';
import { CountrySelect } from '../CountrySelect';
import { useCountries } from '../../hooks/useCountries';
import { useIsExemptOrigins } from '../../hooks/useIronSteelRefData';
import { useAl2CnMapping, useAl2CnValidation } from '../../hooks/useAluminium2RefData';
import type { ProductDetailEntry } from '../ProductDetailsStep';
import { cnDigits, type StepIssue } from '../../utils/steelSteps';
import { al2CategoryLabel, al2IssueText, al2ProductIssues, toAl2ProductRow } from '../../utils/aluminium2Steps';
import { Al2CnField } from './Al2CnField';

export interface Al2ProductDetailsStepProps {
  entries: ProductDetailEntry[];
  updateEntry: (index: number, updates: Partial<ProductDetailEntry>) => void;
  addEntry: () => void;
  removeEntry: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
  saving?: boolean;
  saveError?: string | null;
}

/**
 * CBAM_PRODUCT_DETAILS for Aluminium II (spec §4.3, FE-4): 8-digit CN with suggestions (GET /al2/cn-mapping) and
 * free entry, checked locally and by GET /al2/cn-validate; quantity t > 0; CountrySelect. Category is derived.
 */
export function Al2ProductDetailsStep({
  entries, updateEntry, addEntry, removeEntry, onBack, onNext, saving, saveError,
}: Al2ProductDetailsStepProps) {
  const { t } = useTranslation();
  const [infoOpen, setInfoOpen] = useState(false);
  const { countries } = useCountries();
  const { exempt } = useIsExemptOrigins();
  const { mapping, loading: mappingLoading, error: mappingError } = useAl2CnMapping();
  const validations = useAl2CnValidation(entries.map((e) => e.cnCode));

  const { errors, warnings } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    if (mapping.rows.length === 0) return { errors: e, warnings: w };
    const rows = entries.map(toAl2ProductRow);
    al2ProductIssues(rows, mapping).forEach((i) => {
      const what = i.index != null ? t('aluminium2.pd.product', { n: i.index + 1 }) : '';
      e.push({ code: i.code, message: al2IssueText(i.code, { what }) });
    });
    rows.forEach((r, idx) => {
      const what = t('aluminium2.pd.product', { n: idx + 1 });
      // Backend check (GET /al2/cn-validate) is authoritative; report it when it disagrees with the local check.
      const v = validations[cnDigits(r.cn_code)];
      if (v && !v.ok && v.errorCode && v.errorCode.startsWith('AL2_E_')) {
        e.push({ code: v.errorCode, message: al2IssueText(v.errorCode, { what }) });
      }
      if (!r.country_of_origin) return;
      if (countries.find((c) => c.country === r.country_of_origin)?.isEu) {
        w.push({ code: 'AL2_W_ORIGIN_EU', message: al2IssueText('AL2_W_ORIGIN_EU', { what }) });
      } else if (exempt.countries.includes(r.country_of_origin)) {
        w.push({ code: 'AL2_W_ORIGIN_EXEMPT', message: al2IssueText('AL2_W_ORIGIN_EXEMPT', { what }) });
      }
    });
    return { errors: e, warnings: w };
  }, [entries, mapping, validations, countries, exempt, t]);

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink, letterSpacing: '-0.02em' }}>
          {t('aluminium2.pd.title')}
        </Typography>
        <IconButton size="small" aria-label={t('aluminium2.pd.cnInfo')} onClick={() => setInfoOpen(true)} sx={{ color: T.color.forest }}>
          <InfoOutlined fontSize="small" />
        </IconButton>
      </Box>
      <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.muted, mb: 2 }}>{t('aluminium2.pd.intro')}</Typography>

      {entries.map((en, idx) => (
        <RowCard key={en.id} title={t('aluminium2.pd.product', { n: idx + 1 })} onRemove={entries.length > 1 ? () => removeEntry(idx) : undefined}>
          <TextInput label={t('aluminium2.pd.name')} required value={en.productName} onChange={(v) => updateEntry(idx, { productName: v })} />
          <Al2CnField label={t('aluminium2.pd.cn')} required value={en.cnCode} mapping={mapping} disabled={mappingLoading}
            onChange={(v) => updateEntry(idx, { cnCode: v })} />
          <NumField label={t('aluminium2.pd.qty')} required value={en.quantity} onChange={(v) => updateEntry(idx, { quantity: v })} />
          <CountrySelect
            label={t('aluminium2.pd.country')}
            countries={countries}
            value={countries.find((c) => c.country === en.countryOfOrigin)?.id ?? null}
            onChange={(c) => updateEntry(idx, { countryOfOrigin: c?.country ?? '' })}
          />
        </RowCard>
      ))}
      <AddButton label={t('aluminium2.pd.add')} onClick={addEntry} />
      <IssueList
        errors={errors}
        warnings={warnings}
        infos={[
          ...(mappingLoading ? [t('aluminium2.pd.mappingLoading')] : []),
          ...(mappingError ? [t('aluminium2.pd.mappingError', { error: mappingError })] : []),
          t('aluminium2.pd.indirectInfo'),
        ]}
      />
      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={errors.length > 0 || mapping.rows.length === 0} saving={saving} saveError={saveError} />

      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: T.font.display, fontWeight: 600, color: T.color.ink, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {t('aluminium2.pd.dialogTitle')}
          <IconButton onClick={() => setInfoOpen(false)} size="small" aria-label={t('common.close')}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.inkSoft, mb: 2, fontSize: '0.9rem' }}>{t('aluminium2.pd.dialogText')}</Typography>
          <Box display="grid" gap={1} sx={{ mb: 2 }}>
            {mapping.rows.map((m) => (
              <Box key={m.heading} sx={{ p: 1.25, border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.sm, display: 'grid', gridTemplateColumns: '110px 1fr', gap: 1.5 }}>
                <Typography sx={{ fontFamily: T.font.body, fontWeight: 700, color: T.color.forest }}>{m.heading}</Typography>
                <Box>
                  <Typography sx={{ fontFamily: T.font.body, color: T.color.inkSoft, fontSize: '0.88rem' }}>
                    {t(`aluminium2.cn.${m.heading.replace(/\s+/g, '')}`, { defaultValue: m.description })}
                  </Typography>
                  <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, fontSize: '0.78rem' }}>{al2CategoryLabel(String(m.category))}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.inkSoft, fontSize: '0.85rem', mb: 1 }}>
            {t('aluminium2.pd.excluded', { codes: mapping.excluded.join(', ') || '—' })}
          </Typography>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.inkSoft, fontSize: '0.85rem' }}>{t('aluminium2.pd.eightDigitRule')}</Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
