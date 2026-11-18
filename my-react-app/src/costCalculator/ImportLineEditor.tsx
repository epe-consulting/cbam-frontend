// Editor for one import line of the cost calculator (goods, period, quantity, actual data).

import { useMemo } from 'react';
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
          <Typography sx={{ fontWeight: 700, color: colors.inkSoft }}>Import line {index + 1}</Typography>
          {canRemove && (
            <IconButton aria-label={`Remove import line ${index + 1}`} onClick={onRemove} size="small">
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
          renderInput={(params) => <TextField {...params} label="CN code (search by code or description)" required sx={fieldSx} />}
        />

        {variants.length > 0 && (
          <TextField
            select
            fullWidth
            label="Product variant (Annex I description)"
            value={draft.variant}
            onChange={(e) => onChange({ variant: e.target.value })}
            sx={fieldSx}
            helperText="Required when Annex I lists more than one row for this CN."
          >
            <MenuItem value="">Select variant</MenuItem>
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
                label="Country of origin"
                required
                sx={fieldSx}
                helperText="Country of origin, not country of dispatch."
              />
            )}
          />
          <TextField
            select
            sx={{ flex: 1, ...fieldSx }}
            label="Import year"
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
            label="Quarter"
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
            label="Quantity (net mass)"
            value={draft.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
            inputProps={{ min: 0, step: 'any' }}
            sx={fieldSx}
          />
          <TextField
            select
            fullWidth
            label="Unit"
            value={draft.unit}
            onChange={(e) => onChange({ unit: e.target.value as 't' | 'kg' })}
            sx={fieldSx}
            helperText={
              draft.unit === 'kg' && Number(draft.quantity) > 0
                ? `= ${(Number(draft.quantity) / 1000).toLocaleString('en-GB', { maximumFractionDigits: 6 })} t`
                : 'Calculated in tonnes'
            }
          >
            <MenuItem value="t">tonnes</MenuItem>
            <MenuItem value="kg">kg</MenuItem>
          </TextField>
        </Stack>

        <Typography sx={{ fontWeight: 600, color: colors.inkSoft, fontSize: '0.95rem' }}>
          Actual emissions (optional — leave empty to use default values only)
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            type="number"
            label="Actual SEE (t CO₂e / t)"
            value={draft.actualSee}
            onChange={(e) => onChange({ actualSee: e.target.value })}
            inputProps={{ min: 0, step: 'any' }}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            type="number"
            label="Actual SEFA (t CO₂e / t)"
            value={sefaValue}
            onChange={(e) => onChange({ sefaManual: true, actualSefa: e.target.value })}
            inputProps={{ min: 0, step: 'any' }}
            sx={fieldSx}
            helperText={
              !draft.cn || !draft.country
                ? 'From the supplier’s operator emissions report.'
                : suggested.ok
                  ? draft.sefaManual
                    ? `Manual entry. Default-path value for comparison: ${Number(suggested.sefa.toFixed(6))}.`
                    : `Prefilled planning value ${Number(suggested.sefa.toFixed(6))} = ${suggested.cbamFactor} × ${suggested.cscf} × ${suggested.benchmark}. Replace with the supplier-report SEFA.`
                  : suggested.reason
            }
          />
          <TextField
            select
            fullWidth
            label="Actual data status"
            value={draft.actualSource}
            onChange={(e) => onChange({ actualSource: e.target.value as ActualDataSource })}
            sx={fieldSx}
          >
            <MenuItem value="PRELIMINARY_ESTIMATE">Preliminary estimate</MenuItem>
            <MenuItem value="VERIFIED_SUPPLIER">Verified supplier data</MenuItem>
          </TextField>
        </Stack>
        {draft.actualSee.trim() !== '' && draft.importYear > 2026 && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField
              select
              sx={{ flex: 1, ...fieldSx }}
              label="Production year of the goods (actual data)"
              value={draft.productionYear}
              onChange={(e) => onChange({ productionYear: e.target.value })}
              helperText="Default: the import year. Another year applies only with sufficient evidence (IR 2025/2547 Art. 7(1))."
            >
              <MenuItem value="">Same as import year</MenuItem>
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
              label="Sufficient evidence of the production year is available"
            />
          </Stack>
        )}

        <TextField
          select
          fullWidth
          label="Carbon price paid in the country of origin"
          value={draft.carbonPrice}
          onChange={(e) => onChange({ carbonPrice: e.target.value as DeductionClaim['kind'] })}
          sx={fieldSx}
          helperText={
            draft.carbonPrice === 'NONE_ASSUMED'
              ? 'No deduction assumed (Art. 9).'
              : draft.carbonPrice === 'UNKNOWN'
                ? 'Not applied — the result may overstate the cost.'
                : 'Shown in the breakdown but not quantified: the conversion rules (IR 2026/2498) are not in the sources. With default values only Commission default carbon prices can be used (Art. 9(4)).'
          }
        >
          <MenuItem value="NONE_ASSUMED">No deduction assumed</MenuItem>
          <MenuItem value="UNKNOWN">Unknown</MenuItem>
          <MenuItem value="EFFECTIVELY_PAID">Carbon price effectively paid, with evidence (actual data only)</MenuItem>
          <MenuItem value="COMMISSION_DEFAULT_CARBON_PRICE">Commission default carbon price for the country</MenuItem>
        </TextField>

        {draft.sefaManual && suggested.ok && (
          <Button
            onClick={() => onChange({ sefaManual: false, actualSefa: '' })}
            sx={{ alignSelf: 'flex-start', textTransform: 'none', color: colors.forest }}
          >
            Reset SEFA to planning value
          </Button>
        )}
        {planning && (
          <Alert severity="warning">
            {PLANNING_LABEL}. Preliminary values (or a prefilled SEFA) are for scenario analysis only — not
            eligible for regulatory use until verification requirements are met.
          </Alert>
        )}
      </Stack>
    </Box>
  );
}
