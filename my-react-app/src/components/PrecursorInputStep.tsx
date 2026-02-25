import React from 'react';
import {
  Box,
  Button,
  Grid,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { Add, ArrowBack, ArrowForward, Delete } from '@mui/icons-material';

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

export interface PrecursorEntry {
  id: number;
  vrsta: string;
  kolicina: string;
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

export function PrecursorInputStep({
  title,
  precursorEntries,
  updatePrecursorEntry,
  addPrecursorEntry,
  removePrecursorEntry,
  onBack,
  onNext,
}: PrecursorInputStepProps) {
  const allValid = precursorEntries.length > 0 && precursorEntries.every(
    (e) => e.vrsta.trim() !== '' && e.kolicina.trim() !== '' && e.ugradjeneEmisije.trim() !== ''
  );

  return (
    <Grid container spacing={3} sx={{ width: '100%', maxWidth: '100%', fontFamily: T.font.body }}>
      {title && (
        <Grid size={12}>
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink, letterSpacing: '-0.02em', mb: 0.5 }}>
            {title}
          </Typography>
        </Grid>
      )}
      {precursorEntries.map((entry, index) => (
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
            position: 'relative',
          }}
        >
          {precursorEntries.length > 1 && removePrecursorEntry && (
            <IconButton
              size="small"
              onClick={() => removePrecursorEntry(index)}
              sx={{ position: 'absolute', top: 8, right: 8, color: T.color.muted, '&:hover': { bgcolor: T.color.errorLight, color: T.color.error } }}
              aria-label="Remove entry"
            >
              <Delete fontSize="small" />
            </IconButton>
          )}
          <Grid size={4}>
            <TextField
              fullWidth label="Vrsta" value={entry.vrsta}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updatePrecursorEntry(index, { vrsta: e.target.value })
              }
              sx={textFieldSx}
            />
          </Grid>
          <Grid size={4}>
            <TextField
              fullWidth label="Količina (kg)" value={entry.kolicina}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updatePrecursorEntry(index, { kolicina: e.target.value })
              }
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              sx={textFieldSx}
            />
          </Grid>
          <Grid size={4}>
            <TextField
              fullWidth label="Ugrađene emisije (kgCO2e/kg)" value={entry.ugradjeneEmisije}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updatePrecursorEntry(index, { ugradjeneEmisije: e.target.value })
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
          onClick={addPrecursorEntry}
          sx={{
            mb: 2, fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', borderRadius: T.radius.pill,
            borderColor: T.color.line, color: T.color.forest,
            '&:hover': { bgcolor: T.color.mint, borderColor: T.color.mintDark },
          }}
        >
          + Dodaj
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
            onClick={onNext} disabled={!allValid}
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