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
  CircularProgress,
} from '@mui/material';
import { ArrowForward } from '@mui/icons-material';

const T = {
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
  },
  color: {
    forest: '#0B4F3E',
    mint: '#E8F5EF',
    ink: '#1A2B25',
    muted: '#6B8F82',
    ctaHover: '#0A3F32',
  },
  radius: { sm: '8px', pill: '999px' },
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

export interface ProductInfoStepProps {
  category: string;
  onCategoryChange: (value: string) => void;
  reportingPeriodFrom: string;
  onReportingPeriodFromChange: (value: string) => void;
  reportingPeriodTo: string;
  onReportingPeriodToChange: (value: string) => void;
  reportingPeriodError: string | null;
  categoryNames: string[];
  categoriesLoading: boolean;
  categoriesError: string | null;
  createError: string | null;
  createLoading: boolean;
  calculationLoading: boolean;
  calculationId: number | null;
  onNext: () => void;
}

export function ProductInfoStep({
  category,
  onCategoryChange,
  reportingPeriodFrom,
  onReportingPeriodFromChange,
  reportingPeriodTo,
  onReportingPeriodToChange,
  reportingPeriodError,
  categoryNames,
  categoriesLoading,
  categoriesError,
  createError,
  createLoading,
  calculationLoading,
  calculationId,
  onNext,
}: ProductInfoStepProps) {
  return (
    <>
      <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink, letterSpacing: '-0.02em', mb: 3 }}>
        Izaberi kategoriju i reporting period
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth disabled={categoriesLoading} error={!!categoriesError} sx={selectSx}>
            <InputLabel>Product Category</InputLabel>
            <Select
              value={category}
              label="Product Category"
              onChange={(e: { target: { value: string } }) => onCategoryChange(e.target.value)}
              renderValue={(v: string) => (categoriesLoading ? 'Loading...' : v)}
            >
              {categoriesLoading ? (
                <MenuItem disabled>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={20} sx={{ color: T.color.forest }} />
                    <Typography sx={{ fontFamily: T.font.body, fontSize: '0.9rem', color: T.color.muted }}>Loading categories...</Typography>
                  </Box>
                </MenuItem>
              ) : (
                categoryNames.map((cat) => (
                  <MenuItem key={cat} value={cat} sx={{ fontFamily: T.font.body }}>
                    {cat}
                  </MenuItem>
                ))
              )}
            </Select>
            {categoriesError && (
              <Typography sx={{ mt: 0.5, fontFamily: T.font.body, fontSize: '0.75rem', color: '#C0392B' }}>
                {categoriesError}
              </Typography>
            )}
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            fullWidth
            label="Od"
            type="date"
            value={reportingPeriodFrom}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onReportingPeriodFromChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={textFieldSx}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            fullWidth
            label="Do"
            type="date"
            value={reportingPeriodTo}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onReportingPeriodToChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={textFieldSx}
          />
        </Grid>
        <Grid size={12}>
          {reportingPeriodError && (
            <Typography sx={{ mb: 1, fontFamily: T.font.body, fontSize: '0.88rem', color: '#C0392B' }}>
              {reportingPeriodError}
            </Typography>
          )}
          {createError && (
            <Typography sx={{ mb: 1, fontFamily: T.font.body, fontSize: '0.88rem', color: '#C0392B' }}>
              {createError}
            </Typography>
          )}
          <Box display="flex" justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button
              variant="contained" size="large" disableElevation
              endIcon={<ArrowForward sx={{ fontSize: '18px !important' }} />}
              onClick={onNext}
              disabled={
                !category ||
                !reportingPeriodFrom ||
                !reportingPeriodTo ||
                categoriesLoading ||
                createLoading ||
                calculationId == null ||
                calculationLoading
              }
              sx={{
                fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', borderRadius: T.radius.pill,
                bgcolor: T.color.forest, '&:hover': { bgcolor: T.color.ctaHover },
              }}
            >
              {createLoading ? 'Saving...' : calculationLoading ? 'Loading...' : 'Next'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}