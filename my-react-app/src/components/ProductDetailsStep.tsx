import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { Add, ArrowBack, ArrowForward, Close, Delete, InfoOutlined } from '@mui/icons-material';

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

export interface ProductDetailEntry {
  id: number;
  productName: string;
  cnCode: string;
  quantity: string;
  countryOfOrigin: string;
}

export interface ProductDetailsStepProps {
  title?: string;
  entries: ProductDetailEntry[];
  updateEntry: (index: number, updates: Partial<ProductDetailEntry>) => void;
  addEntry: () => void;
  removeEntry?: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
}

const cnCodeInfo: Array<{ code: string; description: string }> = [
  { code: '7601', description: 'Neobrađeni aluminij (ingoti, blokovi i slični oblici).' },
  { code: '7604', description: 'Šipke, profilne šipke i profili od aluminija.' },
  { code: '7605', description: 'Žica od aluminija.' },
  { code: '7606', description: 'Ploče, limovi i trake od aluminija debljine veće od 0,2 mm.' },
  { code: '7607', description: 'Folije od aluminija (debljine do 0,2 mm).' },
  { code: '7608', description: 'Cijevi od aluminija.' },
  { code: '7609', description: 'Spojnice (fitingi) za cijevi od aluminija.' },
  { code: '7610', description: 'Konstrukcije i dijelovi konstrukcija od aluminija.' },
  { code: '7616', description: 'Ostali proizvodi od aluminija.' },
];

export function ProductDetailsStep({
  title,
  entries,
  updateEntry,
  addEntry,
  removeEntry,
  onBack,
  onNext,
}: ProductDetailsStepProps) {
  const [cnInfoOpen, setCnInfoOpen] = useState(false);

  const allValid = entries.length > 0
    && entries.every(
      (e: ProductDetailEntry) =>
        e.productName.trim() !== ''
        && e.cnCode.trim() !== ''
        && e.quantity.trim() !== ''
        && e.countryOfOrigin.trim() !== ''
    );

  return (
    <Grid container spacing={3} sx={{ width: '100%', maxWidth: '100%', fontFamily: T.font.body }}>
      {title && (
        <Grid size={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink, letterSpacing: '-0.02em', mb: 0.5 }}>
              {title}
            </Typography>
            <IconButton
              size="small"
              aria-label="CN code information"
              onClick={() => setCnInfoOpen(true)}
              sx={{ color: T.color.forest }}
            >
              <InfoOutlined fontSize="small" />
            </IconButton>
          </Box>
        </Grid>
      )}

      {entries.map((entry: ProductDetailEntry, index: number) => (
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
              sx={{ position: 'absolute', top: 8, right: 8, color: T.color.muted, '&:hover': { bgcolor: T.color.errorLight, color: T.color.error } }}
              aria-label="Remove entry"
            >
              <Delete fontSize="small" />
            </IconButton>
          )}

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Product Name"
              value={entry.productName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEntry(index, { productName: e.target.value })}
              sx={textFieldSx}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="CN Code"
              value={entry.cnCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEntry(index, { cnCode: e.target.value })}
              sx={textFieldSx}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Quantity (tonnes)"
              value={entry.quantity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEntry(index, { quantity: e.target.value })}
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              sx={textFieldSx}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Country of Origin"
              value={entry.countryOfOrigin}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEntry(index, { countryOfOrigin: e.target.value })}
              sx={textFieldSx}
            />
          </Grid>
        </Grid>
      ))}

      <Grid size={12}>
        <Button
          type="button"
          variant="outlined"
          size="medium"
          startIcon={<Add sx={{ fontSize: '18px !important' }} />}
          onClick={addEntry}
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
          + Add another
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
            disabled={!allValid}
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

      <Dialog open={cnInfoOpen} onClose={() => setCnInfoOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: T.font.display, fontWeight: 600, color: T.color.ink, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Informacije o CN kodovima
          <IconButton onClick={() => setCnInfoOpen(false)} size="small" aria-label="Close">
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.inkSoft, mb: 2 }}>
            Odaberite odgovarajući CN kod prema tipu proizvoda koji unosite:
          </Typography>
          <Box display="grid" gap={1.25}>
            {cnCodeInfo.map((item) => (
              <Box
                key={item.code}
                sx={{
                  p: 1.25,
                  border: `1px solid ${T.color.lineFaint}`,
                  borderRadius: T.radius.sm,
                  bgcolor: T.color.warmWhite,
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr',
                  gap: 1.5,
                }}
              >
                <Typography sx={{ fontFamily: T.font.body, fontWeight: 700, color: T.color.forest }}>
                  {item.code}
                </Typography>
                <Typography sx={{ fontFamily: T.font.body, color: T.color.inkSoft }}>
                  {item.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </Grid>
  );
}
