// Editor for one import line of the cost calculator (goods, period, quantity, actual data).

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DeleteOutline } from '@mui/icons-material';
import {
  CN_OPTIONS,
  DATASET_COUNTRIES,
  FALLBACK_COUNTRY_LABEL,
  PLANNING_LABEL,
  labelText,
  suggestDefaultPathwaySefa,
  variantsFor,
} from './engine.ts';
import type { ActualDataSource, DeductionClaim } from './types.ts';
import type { LineDraft } from './lineDraft.ts';

const COUNTRIES = [...DATASET_COUNTRIES, FALLBACK_COUNTRY_LABEL];

interface Props {
  index: number;
  draft: LineDraft;
  canRemove: boolean;
  onChange: (patch: Partial<LineDraft>) => void;
  onRemove: () => void;
  fieldSx: object;
  colors: { line: string; inkSoft: string; muted: string; forest: string; cream: string };
}

export default function ImportLineEditor({ index, draft, canRemove, onChange, onRemove, fieldSx, colors }: Props) {
  const { t } = useTranslation();
  const cnOption = useMemo(() => CN_OPTIONS.find((o) => o.cn === draft.cn) ?? null, [draft.cn]);
  const variants = useMemo(() => variantsFor(draft.country, draft.cn), [draft.country, draft.cn]);
  const suggested = useMemo(
    () => suggestDefaultPathwaySefa(draft.country, draft.cn, draft.importYear, draft.variant || undefined),
    [draft.country, draft.cn, draft.importYear, draft.variant],
  );
  const sefaValue = draft.sefaManual ? draft.actualSefa : suggested.ok ? String(Number(suggested.sefa.toFixed(6))) : '';
  const planning = draft.actualSee.trim() !== '' && (!draft.sefaManual || draft.actualSource === 'PRELIMINARY_ESTIMATE');

  return (
    <Box sx={{ border: `1px solid ${colors.line}`, borderRadius: '14px', p: { xs: 2, md: 2.5 }, bgcolor: colors.cream }}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography sx={{ fontWeight: 700, color: colors.inkSoft }}>{t('cc.l.title', { n: index + 1 })}</Typography>
          {canRemove && (
            <IconButton aria-label={t('cc.l.remove', { n: index + 1 })} onClick={onRemove} size="small">
              <DeleteOutline fontSize="small" />
            </IconButton>
          )}
        </Stack>

        <Autocomplete
          options={CN_OPTIONS}
          value={cnOption}
          onChange={(_, v) => onChange({ cn: v?.cn ?? '', variant: '' })}
          getOptionLabel={(o) => `${o.cn} — ${o.description}`}
          isOptionEqualToValue={(a, b) => a.cn === b.cn}
          renderInput={(params) => <TextField {...params} label={t('cc.l.cn')} required sx={fieldSx} />}
        />

        {variants.length > 0 && (
          <TextField
            select
            fullWidth
            label={t('cc.l.variant')}
            value={draft.variant}
            onChange={(e) => onChange({ variant: e.target.value })}
            sx={fieldSx}
            helperText={t('cc.l.variantHelp')}
          >
            <MenuItem value="">{t('cc.l.selectVariant')}</MenuItem>
            {variants.map((v) => (
              <MenuItem key={v} value={v}>
                {v}
              </MenuItem>
            ))}
          </TextField>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Autocomplete
            sx={{ flex: 2 }}
            options={COUNTRIES}
            value={draft.country || null}
            onChange={(_, v) => onChange({ country: v ?? '' })}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('cc.l.country')}
                required
                sx={fieldSx}
                helperText={t('cc.l.countryHelp')}
              />
            )}
          />
          <TextField
            select
            sx={{ flex: 1, ...fieldSx }}
            label={t('cc.l.year')}
            value={draft.importYear}
            onChange={(e) => onChange({ importYear: Number(e.target.value) })}
          >
            {[2026, 2027, 2028, 2029, 2030].map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            sx={{ flex: 1, ...fieldSx }}
            label={t('cc.l.quarter')}
            value={draft.importQuarter}
            onChange={(e) => onChange({ importQuarter: Number(e.target.value) as 1 | 2 | 3 | 4 })}
          >
            {[1, 2, 3, 4].map((q) => (
              <MenuItem key={q} value={q}>
                Q{q}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            required
            fullWidth
            type="number"
            label={t('cc.l.quantity')}
            value={draft.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
            inputProps={{ min: 0, step: 'any' }}
            sx={fieldSx}
          />
          <TextField
            select
            fullWidth
            label={t('cc.l.unit')}
            value={draft.unit}
            onChange={(e) => onChange({ unit: e.target.value as 't' | 'kg' })}
            sx={fieldSx}
            helperText={
              draft.unit === 'kg' && Number(draft.quantity) > 0
                ? `= ${(Number(draft.quantity) / 1000).toLocaleString('en-GB', { maximumFractionDigits: 6 })} t`
                : t('cc.l.inTonnes')
            }
          >
            <MenuItem value="t">{t('cc.l.tonnes')}</MenuItem>
            <MenuItem value="kg">kg</MenuItem>
          </TextField>
        </Stack>

        <Typography sx={{ fontWeight: 600, color: colors.inkSoft, fontSize: '0.95rem' }}>
          {t('cc.l.actualTitle')}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            type="number"
            label={t('cc.l.actualSee')}
            value={draft.actualSee}
            onChange={(e) => onChange({ actualSee: e.target.value })}
            inputProps={{ min: 0, step: 'any' }}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            type="number"
            label={t('cc.l.actualSefa')}
            value={sefaValue}
            onChange={(e) => onChange({ sefaManual: true, actualSefa: e.target.value })}
            inputProps={{ min: 0, step: 'any' }}
            sx={fieldSx}
            helperText={
              !draft.cn || !draft.country
                ? t('cc.l.sefaFromReport')
                : suggested.ok
                  ? draft.sefaManual
                    ? t('cc.l.sefaManual', { v: Number(suggested.sefa.toFixed(6)) })
                    : t('cc.l.sefaPrefilled', { v: Number(suggested.sefa.toFixed(6)), cf: suggested.cbamFactor, cscf: suggested.cscf, bm: suggested.benchmark })
                  : suggested.reason
            }
          />
          <TextField
            select
            fullWidth
            label={t('cc.l.status')}
            value={draft.actualSource}
            onChange={(e) => onChange({ actualSource: e.target.value as ActualDataSource })}
            sx={fieldSx}
          >
            <MenuItem value="PRELIMINARY_ESTIMATE">{t('cc.l.preliminary')}</MenuItem>
            <MenuItem value="VERIFIED_SUPPLIER">{t('cc.l.verified')}</MenuItem>
          </TextField>
        </Stack>
        {draft.actualSee.trim() !== '' && draft.importYear > 2026 && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField
              select
              sx={{ flex: 1, ...fieldSx }}
              label={t('cc.l.prodYear')}
              value={draft.productionYear}
              onChange={(e) => onChange({ productionYear: e.target.value })}
              helperText={t('cc.l.prodYearHelp')}
            >
              <MenuItem value="">{t('cc.l.sameAsImport')}</MenuItem>
              {Array.from({ length: draft.importYear - 2026 + 1 }, (_, i) => 2026 + i).map((y) => (
                <MenuItem key={y} value={String(y)}>
                  {y}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              sx={{ flex: 1 }}
              control={
                <Checkbox
                  checked={draft.productionYearEvidence}
                  onChange={(_, on) => onChange({ productionYearEvidence: on })}
                />
              }
              label={t('cc.l.evidence')}
            />
          </Stack>
        )}

        <TextField
          select
          fullWidth
          label={t('cc.l.carbon')}
          value={draft.carbonPrice}
          onChange={(e) => onChange({ carbonPrice: e.target.value as DeductionClaim['kind'] })}
          sx={fieldSx}
          helperText={
            draft.carbonPrice === 'NONE_ASSUMED'
              ? t('cc.l.carbonNone')
              : draft.carbonPrice === 'UNKNOWN'
                ? t('cc.l.carbonUnknown')
                : t('cc.l.carbonOther')
          }
        >
          <MenuItem value="NONE_ASSUMED">{t('cc.l.optNone')}</MenuItem>
          <MenuItem value="UNKNOWN">{t('cc.l.optUnknown')}</MenuItem>
          <MenuItem value="EFFECTIVELY_PAID">{t('cc.l.optPaid')}</MenuItem>
          <MenuItem value="COMMISSION_DEFAULT_CARBON_PRICE">{t('cc.l.optCommission')}</MenuItem>
        </TextField>

        {draft.sefaManual && suggested.ok && (
          <Button
            onClick={() => onChange({ sefaManual: false, actualSefa: '' })}
            sx={{ alignSelf: 'flex-start', textTransform: 'none', color: colors.forest }}
          >
            {t('cc.l.resetSefa')}
          </Button>
        )}
        {planning && (
          <Alert severity="warning">
            {labelText(PLANNING_LABEL)}. {t('cc.l.planningWarn')}
          </Alert>
        )}
      </Stack>
    </Box>
  );
}
