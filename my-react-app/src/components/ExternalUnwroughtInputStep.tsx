import React from 'react';
import {
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
import { useCountries } from '../hooks/useCountries';
import { CountrySelect } from './CountrySelect';

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

/** Fixed CN code for external unwrought aluminium on this step only. */
export const EXTERNAL_UNWROUGHT_CN_CODE = '7601';

export interface ExternalUnwroughtEntry {
  id: number;
  countryId: number | null;
  drzava: string;
  kolicina: string;
  clanicaEu: '' | 'EU_MEMBER' | 'NON_EU_MEMBER';
  emisijePoznate: '' | 'YES' | 'NO';
  ugradjeneEmisije: string;
}

export interface ExternalUnwroughtInputStepProps {
  title?: string;
  entries: ExternalUnwroughtEntry[];
  updateEntry: (index: number, updates: Partial<ExternalUnwroughtEntry>) => void;
  addEntry: () => void;
  removeEntry?: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
}

function isEntryValid(entry: ExternalUnwroughtEntry): boolean {
  if (entry.countryId == null || !entry.kolicina.trim() || !entry.clanicaEu) {
    return false;
  }
  if (entry.clanicaEu === 'EU_MEMBER') {
    return true;
  }
  if (!entry.emisijePoznate) {
    return false;
  }
  if (entry.emisijePoznate === 'YES') {
    return entry.ugradjeneEmisije.trim() !== '';
  }
  return true;
}

export function ExternalUnwroughtInputStep({
  title,
  entries,
  updateEntry,
  addEntry,
  removeEntry,
  onBack,
  onNext,
}: ExternalUnwroughtInputStepProps) {
  const { countries, loading: countriesLoading, error: countriesError } = useCountries();
  const allValid = entries.length > 0 && entries.every(isEntryValid);

  return (
    <Grid container spacing={3} sx={{ width: '100%', maxWidth: '100%', fontFamily: T.font.body }}>
      {title && (
        <Grid size={12}>
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink, letterSpacing: '-0.02em', mb: 0.5 }}>
            {title}
          </Typography>
        </Grid>
      )}

      {countriesError && (
        <Grid size={12}>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.error }}>{countriesError}</Typography>
        </Grid>
      )}

      {countriesLoading && (
        <Grid size={12}>
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={28} sx={{ color: T.color.forest }} />
          </Box>
        </Grid>
      )}

      {!countriesLoading && entries.map((entry, index) => (
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
          {entries.length > 1 && removeEntry && (
            <IconButton
              size="small"
              onClick={() => removeEntry(index)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: T.color.muted,
                '&:hover': { bgcolor: T.color.errorLight, color: T.color.error },
              }}
              aria-label="Remove entry"
            >
              <Delete fontSize="small" />
            </IconButton>
          )}

          <Grid size={{ xs: 12, md: 5 }}>
            <CountrySelect
              countries={countries}
              value={entry.countryId}
              disabled={countriesLoading}
              onChange={(selected) => {
                updateEntry(index, {
                  countryId: selected?.id ?? null,
                  drzava: selected?.country ?? '',
                  clanicaEu: selected ? (selected.isEu ? 'EU_MEMBER' : 'NON_EU_MEMBER') : '',
                  emisijePoznate: '',
                  ugradjeneEmisije: '',
                });
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Količina (kg)"
              value={entry.kolicina}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateEntry(index, { kolicina: e.target.value })
              }
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              sx={textFieldSx}
            />
          </Grid>

          <Grid size={12}>
            <FormControl component="fieldset" sx={{ width: '100%' }} required>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.95rem', fontWeight: 600, color: T.color.ink, mb: 1 }}>
                Da li je ova država članica EU?
              </Typography>
              <RadioGroup
                row
                value={entry.clanicaEu}
                onChange={(e) => {
                  const value = e.target.value as 'EU_MEMBER' | 'NON_EU_MEMBER';
                  updateEntry(index, {
                    clanicaEu: value,
                    emisijePoznate: '',
                    ugradjeneEmisije: '',
                  });
                }}
              >
                <FormControlLabel value="EU_MEMBER" control={<Radio />} label="Članica EU" sx={{ fontFamily: T.font.body }} />
                <FormControlLabel value="NON_EU_MEMBER" control={<Radio />} label="Nije članica EU" sx={{ fontFamily: T.font.body }} />
              </RadioGroup>
            </FormControl>
          </Grid>

          {entry.clanicaEu === 'NON_EU_MEMBER' && (
            <Grid size={12}>
              <FormControl component="fieldset" sx={{ width: '100%' }}>
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.95rem', color: T.color.inkSoft, mb: 1 }}>
                  Da li su poznate ugrađene emisije?
                </Typography>
                <RadioGroup
                  row
                  value={entry.emisijePoznate}
                  onChange={(e) => {
                    const value = e.target.value as 'YES' | 'NO';
                    updateEntry(index, {
                      emisijePoznate: value,
                      ugradjeneEmisije: value === 'NO' ? '' : entry.ugradjeneEmisije,
                    });
                  }}
                >
                  <FormControlLabel value="YES" control={<Radio />} label="DA" sx={{ fontFamily: T.font.body }} />
                  <FormControlLabel value="NO" control={<Radio />} label="NE" sx={{ fontFamily: T.font.body }} />
                </RadioGroup>
              </FormControl>
            </Grid>
          )}

          {entry.clanicaEu === 'NON_EU_MEMBER' && entry.emisijePoznate === 'YES' && (
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Ugrađene emisije (kgCO2e/kg)"
                value={entry.ugradjeneEmisije}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateEntry(index, { ugradjeneEmisije: e.target.value })
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
          onClick={addEntry}
          disabled={countriesLoading}
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
          + Add Another
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
            Back
          </Button>
          <Button
            type="button"
            variant="contained"
            size="large"
            disableElevation
            endIcon={<ArrowForward sx={{ fontSize: '18px !important' }} />}
            onClick={onNext}
            disabled={!allValid || countriesLoading}
            sx={{
              fontFamily: T.font.body,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: T.radius.pill,
              bgcolor: T.color.forest,
              '&:hover': { bgcolor: T.color.ctaHover },
            }}
          >
            Next
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
}
