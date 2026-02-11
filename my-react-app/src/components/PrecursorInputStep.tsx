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

export interface PrecursorEntry {
  id: number;
  vrsta: string;
  kolicina: string;
  ugradjeneEmisije: string;
}

export interface PrecursorInputStepProps {
  /** Optional step title (e.g. from DB question label). */
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
    <Grid container spacing={3} sx={{ width: '100%', maxWidth: '100%' }}>
      {title && (
        <Grid size={12}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
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
            mb: 3,
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            width: '100%',
            position: 'relative',
          }}
        >
          {precursorEntries.length > 1 && removePrecursorEntry && (
            <IconButton
              size="small"
              onClick={() => removePrecursorEntry(index)}
              sx={{ position: 'absolute', top: 8, right: 8 }}
              aria-label="Remove entry"
            >
              <Delete fontSize="small" />
            </IconButton>
          )}
          <Grid size={4}>
            <TextField
              fullWidth
              label="Vrsta"
              value={entry.vrsta}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updatePrecursorEntry(index, { vrsta: e.target.value })
              }
            />
          </Grid>
          <Grid size={4}>
            <TextField
              fullWidth
              label="Količina (kg)"
              value={entry.kolicina}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updatePrecursorEntry(index, { kolicina: e.target.value })
              }
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            />
          </Grid>
          <Grid size={4}>
            <TextField
              fullWidth
              label="Ugrađene emisije (kgCO2e/kg)"
              value={entry.ugradjeneEmisije}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updatePrecursorEntry(index, { ugradjeneEmisije: e.target.value })
              }
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            />
          </Grid>
        </Grid>
      ))}
      <Grid size={12}>
        <Button
          type="button"
          variant="outlined"
          size="medium"
          startIcon={<Add />}
          onClick={addPrecursorEntry}
          sx={{ mb: 2 }}
        >
          + Dodaj
        </Button>
      </Grid>
      <Grid size={12}>
        <Box display="flex" justifyContent="space-between" sx={{ mt: 3 }}>
          <Button type="button" variant="outlined" size="large" startIcon={<ArrowBack />} onClick={onBack}>
            Back
          </Button>
          <Button
            type="button"
            variant="contained"
            size="large"
            endIcon={<ArrowForward />}
            onClick={onNext}
            disabled={!allValid}
          >
            Next
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
}
