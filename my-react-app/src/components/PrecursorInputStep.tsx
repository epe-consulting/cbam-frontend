import React from 'react';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import { Add, ArrowBack, ArrowForward, Delete } from '@mui/icons-material';
import { useCnCodes, type CnCodeDto } from '../hooks/useCnCodes';
import { useCountries } from '../hooks/useCountries';
import { CountrySelect } from './CountrySelect';
import { useTranslation } from 'react-i18next';

const T = {
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
  },
  color: {
    forest: '#0B4F3E',
    mint: '#E8F5EF',
    mintDark: '#C3E6D5',
    warmWhite: '#FFFEF9',
    ink: '#1A2B25',
    inkSoft: '#3D5A50',
    muted: '#6B8F82',
    line: '#D6E5DD',
    lineFaint: '#EAF0EC',
    ctaHover: '#0A3F32',
    error: '#C0392B',
    errorLight: '#FDEDEC',
  },
  radius: { sm: '8px', md: '14px', pill: '999px' },
};

const textFieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: T.radius.sm, fontFamily: T.font.body },
  '& .MuiInputLabel-root': { fontFamily: T.font.body },
  '& .MuiFormHelperText-root': { fontFamily: T.font.body },
};

const readOnlyFieldSx = {
  ...textFieldSx,
  '& .MuiOutlinedInput-root': {
    ...textFieldSx['& .MuiOutlinedInput-root'],
    bgcolor: T.color.mint,
  },
};

export interface PrecursorEntry {
  id: number;
  cnCodeId: number | null;
  cnCode: string;
  vrsta: string;
  countryId: number | null;
  drzava: string;
  kolicina: string;
  emisijePoznate: '' | 'YES' | 'NO';
  ugradjeneEmisije: string;
}

export interface PrecursorInputStepProps {
  title?: string;
  precursorEntries: PrecursorEntry[];
  updatePrecursorEntry: (index: number, updates: Partial<PrecursorEntry>) => void;
  addPrecursorEntry: () => void;
  removePrecursorEntry?: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
}

function isEntryValid(entry: PrecursorEntry): boolean {
  if (entry.cnCodeId == null || entry.countryId == null || !entry.kolicina.trim() || !entry.emisijePoznate) {
    return false;
  }
  if (entry.emisijePoznate === 'YES') {
    return entry.ugradjeneEmisije.trim() !== '';
  }
  return true;
}

export function PrecursorInputStep({
  title,
  precursorEntries,
  updatePrecursorEntry,
  addPrecursorEntry,
  removePrecursorEntry,
  onBack,
  onNext,
}: PrecursorInputStepProps) {
  const { t } = useTranslation();
  const { cnCodes, loading: cnCodesLoading, error: cnCodesError } = useCnCodes();
  const { countries, loading: countriesLoading, error: countriesError } = useCountries();
  const allValid = precursorEntries.length > 0 && precursorEntries.every(isEntryValid);
  const dataLoading = cnCodesLoading || countriesLoading;

  const resolveSelectedCnCode = (entry: PrecursorEntry): CnCodeDto | null => {
    if (entry.cnCodeId != null) {
      return cnCodes.find((c) => c.id === entry.cnCodeId) ?? null;
    }
    if (entry.cnCode) {
      return cnCodes.find((c) => c.cnCode === entry.cnCode) ?? null;
    }
    return null;
  };

  return (
    <Grid container spacing={3} sx={{ width: '100%', maxWidth: '100%', fontFamily: T.font.body }}>
      {title && (
        <Grid size={12}>
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink, letterSpacing: '-0.02em', mb: 0.5 }}>
            {title}
          </Typography>
        </Grid>
      )}

      {(cnCodesError || countriesError) && (
        <Grid size={12}>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.error }}>
            {cnCodesError ?? countriesError}
          </Typography>
        </Grid>
      )}

      {dataLoading && (
        <Grid size={12}>
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={28} sx={{ color: T.color.forest }} />
          </Box>
        </Grid>
      )}

      {!dataLoading && precursorEntries.map((entry, index) => (
        <Grid
          container
          key={entry.id}
          spacing={2}
          sx={{
            mb: 3,
            p: 2.5,
            border: `1px solid ${T.color.lineFaint}`,
            borderRadius: T.radius.md,
            bgcolor: T.color.warmWhite,
            width: '100%',
            position: 'relative',
          }}
        >
          {precursorEntries.length > 1 && removePrecursorEntry && (
            <IconButton
              size="small"
              onClick={() => removePrecursorEntry(index)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: T.color.muted,
                '&:hover': { bgcolor: T.color.errorLight, color: T.color.error },
              }}
              aria-label={t('common.removeEntry')}
            >
              <Delete fontSize="small" />
            </IconButton>
          )}

          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete
              options={cnCodes}
              value={resolveSelectedCnCode(entry)}
              onChange={(_event, selected) => {
                updatePrecursorEntry(index, {
                  cnCodeId: selected?.id ?? null,
                  cnCode: selected?.cnCode ?? '',
                  vrsta: selected?.description ?? '',
                });
              }}
              getOptionLabel={(option) => option.description}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              disabled={cnCodes.length === 0}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('alu.pre.type')}
                  required
                  sx={textFieldSx}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              label={t('product.details.cn')}
              value={entry.cnCode}
              slotProps={{ input: { readOnly: true } }}
              sx={readOnlyFieldSx}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <CountrySelect
              countries={countries}
              value={entry.countryId}
              disabled={countriesLoading}
              onChange={(selected) => {
                updatePrecursorEntry(index, {
                  countryId: selected?.id ?? null,
                  drzava: selected?.country ?? '',
                });
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label={t('alu.ext.qtyKg')}
              value={entry.kolicina}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updatePrecursorEntry(index, { kolicina: e.target.value })
              }
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              sx={textFieldSx}
            />
          </Grid>

          <Grid size={12}>
            <FormControl component="fieldset" sx={{ width: '100%' }} required>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.95rem', color: T.color.inkSoft, mb: 1 }}>
                {t('alu.ext.emissionsKnown')}
              </Typography>
              <RadioGroup
                row
                value={entry.emisijePoznate}
                onChange={(e) => {
                  const value = e.target.value as 'YES' | 'NO';
                  updatePrecursorEntry(index, {
                    emisijePoznate: value,
                    ugradjeneEmisije: value === 'NO' ? '' : entry.ugradjeneEmisije,
                  });
                }}
              >
                <FormControlLabel value="YES" control={<Radio />} label={t('common.yes')} sx={{ fontFamily: T.font.body }} />
                <FormControlLabel value="NO" control={<Radio />} label={t('common.no')} sx={{ fontFamily: T.font.body }} />
              </RadioGroup>
            </FormControl>
          </Grid>

          {entry.emisijePoznate === 'YES' && (
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('alu.ext.embedded')}
                value={entry.ugradjeneEmisije}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updatePrecursorEntry(index, { ugradjeneEmisije: e.target.value })
                }
                slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                sx={textFieldSx}
              />
            </Grid>
          )}
        </Grid>
      ))}

      <Grid size={12}>
        <Button
          type="button"
          variant="outlined"
          size="medium"
          startIcon={<Add sx={{ fontSize: '18px !important' }} />}
          onClick={addPrecursorEntry}
          disabled={dataLoading}
          sx={{
            mb: 2,
            fontFamily: T.font.body,
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: T.radius.pill,
            borderColor: T.color.line,
            color: T.color.forest,
            '&:hover': { bgcolor: T.color.mint, borderColor: T.color.mintDark },
          }}
        >
          {t('common.addAnother')}
        </Button>
      </Grid>

      <Grid size={12}>
        <Box display="flex" justifyContent="space-between" sx={{ mt: 3 }}>
          <Button
            type="button"
            variant="outlined"
            size="large"
            startIcon={<ArrowBack sx={{ fontSize: '18px !important' }} />}
            onClick={onBack}
            sx={{
              fontFamily: T.font.body,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: T.radius.pill,
              borderColor: T.color.line,
              color: T.color.inkSoft,
              '&:hover': { bgcolor: T.color.mint, borderColor: T.color.mintDark, color: T.color.forest },
            }}
          >
            {t('common.back')}
          </Button>
          <Button
            type="button"
            variant="contained"
            size="large"
            disableElevation
            endIcon={<ArrowForward sx={{ fontSize: '18px !important' }} />}
            onClick={onNext}
            disabled={!allValid || dataLoading}
            sx={{
              fontFamily: T.font.body,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: T.radius.pill,
              bgcolor: T.color.forest,
              '&:hover': { bgcolor: T.color.ctaHover },
            }}
          >
            {t('common.next')}
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
}
