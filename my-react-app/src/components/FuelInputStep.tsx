import React from 'react';
import {
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { Add, ArrowBack, ArrowForward } from '@mui/icons-material';

const T = {
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
  },
  color: {
    forest: '#0B4F3E',
    mint: '#E8F5EF',
    mintDark: '#C3E6D5',
    cream: '#FAFAF7',
    warmWhite: '#FFFEF9',
    ink: '#1A2B25',
    inkSoft: '#3D5A50',
    muted: '#6B8F82',
    line: '#D6E5DD',
    lineFaint: '#EAF0EC',
    ctaHover: '#0A3F32',
  },
  radius: { sm: '8px', md: '14px', pill: '999px' },
};

const textFieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: T.radius.sm, fontFamily: T.font.body },
  '& .MuiInputLabel-root': { fontFamily: T.font.body },
  '& .MuiFormHelperText-root': { fontFamily: T.font.body },
};

const selectSx = {
  '& .MuiOutlinedInput-root': { borderRadius: T.radius.sm, fontFamily: T.font.body },
  '& .MuiInputLabel-root': { fontFamily: T.font.body },
  '& .MuiSelect-select': { fontFamily: T.font.body },
};

export interface FuelEntry {
  id: number;
  sector: string;
  subsector: string;
  subsubsector: string;
  emissionFactorName: string;
  denominator: string;
  amount: string;
  emissionFactorId: number | null;
  emissionFactorValue: number | null;
}

export interface FuelInputStepProps {
  title?: string;
  addButtonLabel?: string;
  fuelEntries: FuelEntry[];
  updateFuelEntry: (index: number, updates: Partial<FuelEntry>) => void;
  resolveEmissionFactorId: (entry: FuelEntry) => Promise<void>;
  addFuelEntry: () => void;
  fuelSectors: string[];
  subsectorsCache: Record<string, string[]>;
  subsubsectorsCache: Record<string, string[]>;
  emissionFactorNamesCache: Record<string, string[]>;
  denominatorsCache: Record<string, string[]>;
  fuelLookupLoading: boolean;
  fuelLookupError: string | null;
  onBack: () => void;
  onNext: () => void;
}

export function FuelInputStep({
  title,
  addButtonLabel = 'Add more fuels',
  fuelEntries,
  updateFuelEntry,
  resolveEmissionFactorId,
  addFuelEntry,
  fuelSectors,
  subsectorsCache,
  subsubsectorsCache,
  emissionFactorNamesCache,
  denominatorsCache,
  fuelLookupLoading,
  fuelLookupError,
  onBack,
  onNext,
}: FuelInputStepProps) {
  return (
    <Grid container spacing={3} sx={{ width: '100%', maxWidth: '100%', fontFamily: T.font.body }}>
      {title && (
        <Grid size={12}>
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink, letterSpacing: '-0.02em', mb: 0.5 }}>
            {title}
          </Typography>
        </Grid>
      )}
      {fuelLookupError && (
        <Grid size={12}>
          <Typography sx={{ mb: 2, fontFamily: T.font.body, color: '#C0392B' }}>
            {fuelLookupError}
          </Typography>
        </Grid>
      )}
      {fuelEntries.map((entry: FuelEntry, index: number) => (
        <Grid
          container
          key={entry.id}
          spacing={2}
          sx={{
            mb: 3, p: 2.5,
            border: `1px solid ${T.color.lineFaint}`,
            borderRadius: T.radius.md,
            bgcolor: T.color.warmWhite,
            width: '100%',
          }}
        >
          <Grid size={4}>
            <FormControl fullWidth disabled={fuelLookupLoading} sx={selectSx}>
              <InputLabel>Sector</InputLabel>
              <Select
                value={entry.sector}
                label="Sector"
                onChange={(e: { target: { value: string } }) =>
                  updateFuelEntry(index, {
                    sector: e.target.value,
                    subsector: '',
                    subsubsector: '',
                    emissionFactorName: '',
                    denominator: '',
                    emissionFactorId: null,
                    emissionFactorValue: null,
                  })
                }
              >
                {fuelSectors.map((s: string) => (
                  <MenuItem key={s} value={s} sx={{ fontFamily: T.font.body }}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={4}>
            <FormControl fullWidth disabled={fuelLookupLoading || !entry.sector} sx={selectSx}>
              <InputLabel>Subsector</InputLabel>
              <Select
                value={entry.subsector}
                label="Subsector"
                onChange={(e: { target: { value: string } }) =>
                  updateFuelEntry(index, {
                    subsector: e.target.value,
                    subsubsector: '',
                    emissionFactorName: '',
                    denominator: '',
                    emissionFactorId: null,
                    emissionFactorValue: null,
                  })
                }
              >
                {(subsectorsCache[entry.sector] ?? []).map((s: string) => (
                  <MenuItem key={s} value={s} sx={{ fontFamily: T.font.body }}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={4}>
            <FormControl fullWidth disabled={fuelLookupLoading || !entry.subsector} sx={selectSx}>
              <InputLabel>Subsubsector</InputLabel>
              <Select
                value={entry.subsubsector}
                label="Subsubsector"
                onChange={(e: { target: { value: string } }) =>
                  updateFuelEntry(index, {
                    subsubsector: e.target.value,
                    emissionFactorName: '',
                    denominator: '',
                    emissionFactorId: null,
                    emissionFactorValue: null,
                  })
                }
              >
                {(
                  subsubsectorsCache[
                    entry.sector && entry.subsector ? `${entry.sector}|${entry.subsector}` : ''
                  ] ?? []
                ).map((s: string) => (
                  <MenuItem key={s} value={s} sx={{ fontFamily: T.font.body }}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={4}>
            <FormControl fullWidth disabled={fuelLookupLoading || !entry.subsector} sx={selectSx}>
              <InputLabel>EmissionFactorName</InputLabel>
              <Select
                value={entry.emissionFactorName}
                label="EmissionFactorName"
                onChange={(e: { target: { value: string } }) =>
                  updateFuelEntry(index, {
                    emissionFactorName: e.target.value,
                    denominator: '',
                    emissionFactorId: null,
                    emissionFactorValue: null,
                  })
                }
              >
                {(
                  emissionFactorNamesCache[
                    entry.sector && entry.subsector
                      ? `${entry.sector}|${entry.subsector}|${entry.subsubsector ?? ''}`
                      : ''
                  ] ?? []
                ).map((s: string) => (
                  <MenuItem key={s} value={s} sx={{ fontFamily: T.font.body }}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={4}>
            <FormControl fullWidth disabled={fuelLookupLoading || !entry.emissionFactorName} sx={selectSx}>
              <InputLabel>Denominator</InputLabel>
              <Select
                value={entry.denominator}
                label="Denominator"
                onChange={async (e: { target: { value: string } }) => {
                  const denom = e.target.value;
                  updateFuelEntry(index, { denominator: denom });
                  const nextEntry = { ...entry, denominator: denom };
                  await resolveEmissionFactorId(nextEntry);
                }}
              >
                {(
                  denominatorsCache[
                    entry.sector && entry.subsector && entry.emissionFactorName
                      ? `${entry.sector}|${entry.subsector}|${entry.subsubsector ?? ''}|${entry.emissionFactorName}`
                      : ''
                  ] ?? []
                ).map((s: string) => (
                  <MenuItem key={s} value={s} sx={{ fontFamily: T.font.body }}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={4}>
            <TextField
              fullWidth
              label="Amount (Količina)"
              value={entry.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateFuelEntry(index, { amount: e.target.value })
              }
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              sx={textFieldSx}
            />
          </Grid>
        </Grid>
      ))}
      <Grid size={12}>
        <Button
          type="button" variant="outlined" size="medium"
          startIcon={<Add sx={{ fontSize: '18px !important' }} />}
          onClick={addFuelEntry}
          sx={{
            mb: 2, fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', borderRadius: T.radius.pill,
            borderColor: T.color.line, color: T.color.forest,
            '&:hover': { bgcolor: T.color.mint, borderColor: T.color.mintDark },
          }}
        >
          {addButtonLabel}
        </Button>
      </Grid>
      <Grid size={12}>
        <Box display="flex" justifyContent="space-between" sx={{ mt: 3 }}>
          <Button type="button" variant="outlined" size="large" startIcon={<ArrowBack sx={{ fontSize: '18px !important' }} />} onClick={onBack}
            sx={{
              fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', borderRadius: T.radius.pill,
              borderColor: T.color.line, color: T.color.inkSoft,
              '&:hover': { bgcolor: T.color.mint, borderColor: T.color.mintDark, color: T.color.forest },
            }}>
            Back
          </Button>
          <Button
            type="button" variant="contained" size="large" disableElevation
            endIcon={<ArrowForward sx={{ fontSize: '18px !important' }} />}
            onClick={onNext} disabled={fuelLookupLoading}
            sx={{
              fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', borderRadius: T.radius.pill,
              bgcolor: T.color.forest, '&:hover': { bgcolor: T.color.ctaHover },
            }}>
            Next
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
}