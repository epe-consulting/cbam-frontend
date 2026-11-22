import { useState } from 'react';
import { Box, Button, Checkbox, FormControl, FormControlLabel, FormGroup, FormLabel, Grid, TextField, Typography } from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import type { QuestionWithOptions } from '../hooks/useQuestionsByStep';
import {
  FLUE_GAS_CARBONATES,
  FLUE_GAS_LIMESTONE_QTY_Q,
  FLUE_GAS_SODA_ASH_QTY_Q,
  FLUE_GAS_TREATMENT_Q,
  flueGasCode,
  flueGasComplete,
  flueGasSelection,
  isPositiveQuantity,
  type CarbonateKey,
  type FlueGasQuantities,
  type FlueGasSelection,
} from '../utils/flueGas';
import { useTranslation } from 'react-i18next';

const T = {
  font: { body: "'DM Sans', system-ui, sans-serif" },
  color: {
    forest: '#0B4F3E',
    mint: '#E8F5EF',
    mintDark: '#C3E6D5',
    ink: '#1A2B25',
    inkSoft: '#3D5A50',
    muted: '#6B8F82',
    line: '#D6E5DD',
    ctaHover: '#0A3F32',
  },
  radius: { sm: '8px', pill: '999px' },
};

const textFieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: T.radius.sm, fontFamily: T.font.body },
  '& .MuiInputLabel-root': { fontFamily: T.font.body },
  '& .MuiFormHelperText-root': { fontFamily: T.font.body },
};

const checkboxSx = { color: T.color.muted, '&.Mui-checked': { color: T.color.forest } };
const labelSx = { mb: 0.5, '& .MuiFormControlLabel-label': { fontFamily: T.font.body, fontSize: '0.92rem', color: T.color.inkSoft } };

export interface FlueGasStepProps {
  questionsFromApi: QuestionWithOptions[];
  getAnswer: (questionId: number) => string;
  setAnswer: (questionId: number, valueText: string) => void | Promise<void>;
  onBack: () => void;
  onNext: () => void;
}

/**
 * Step 9 (aluminium, primary and secondary routes): flue gas treatment.
 * Any carbonate of IR (EU) 2025/2547 Annex II, Section G, Table 3 (p. 63) can be ticked for the
 * same production process; each gets its own quantity (Annex II B.9.1.1, Method A: CO2 per
 * carbonate consumed). A carbonate whose quantity question is not loaded (database before
 * post-045) is not shown.
 */
export function FlueGasStep({ questionsFromApi, getAnswer, setAnswer, onBack, onNext }: FlueGasStepProps) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<CarbonateKey[]>([]);
  const byCode = (code: string) => questionsFromApi.find((q) => q.code === code);
  const treatQ = byCode(FLUE_GAS_TREATMENT_Q);
  const sodaQ = byCode(FLUE_GAS_SODA_ASH_QTY_Q);
  const limeQ = byCode(FLUE_GAS_LIMESTONE_QTY_Q);

  if (!treatQ || !sodaQ || !limeQ) {
    return (
      <Typography sx={{ mb: 2, fontFamily: T.font.body, color: '#C0392B' }}>
        {t('flueGas.notLoaded')}
      </Typography>
    );
  }

  const carbonates = FLUE_GAS_CARBONATES.map((c) => ({ key: c.key, q: byCode(c.qtyQuestion) })).filter(
    (c): c is { key: CarbonateKey; q: QuestionWithOptions } => c.q != null,
  );
  const quantities: FlueGasQuantities = {};
  carbonates.forEach((c) => {
    quantities[c.key] = getAnswer(c.q.id);
  });
  const stored = flueGasSelection(getAnswer(treatQ.id), quantities);
  // Ticked boxes whose quantity is not typed yet (with several carbonates the code alone does not say which).
  const ticked = new Set<CarbonateKey>(stored.nothing ? [] : [...stored.ticked, ...pending]);
  const sel: FlueGasSelection = { ticked: [...ticked], nothing: stored.nothing };

  const apply = (next: FlueGasSelection) => {
    void setAnswer(treatQ.id, flueGasCode(next));
    carbonates.forEach((c) => {
      if (!next.ticked.includes(c.key)) void setAnswer(c.q.id, '');
    });
    setPending(next.ticked);
  };
  const toggle = (key: CarbonateKey, on: boolean) => {
    const rest = sel.ticked.filter((k) => k !== key);
    apply({ ticked: on ? [...rest, key] : rest, nothing: false });
  };

  const optionLabel = (code: string, fallback: string) => treatQ.options.find((o) => o.code === code)?.label ?? fallback;

  const qtyField = (q: QuestionWithOptions, value: string) => (
    <TextField
      fullWidth
      type="number"
      label={q.label}
      value={value}
      onChange={(e) => void setAnswer(q.id, e.target.value)}
      slotProps={{ htmlInput: { min: 0, step: 'any' } }}
      error={value.trim() !== '' && !isPositiveQuantity(value)}
      helperText={value.trim() !== '' && !isPositiveQuantity(value) ? t('flueGas.qtyPositive') : q.helpText ?? undefined}
      sx={{ ...textFieldSx, mt: 1, mb: 2 }}
    />
  );

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <FormControl component="fieldset" fullWidth>
          <FormLabel
            component="legend"
            sx={{ mb: 2, fontFamily: T.font.body, fontWeight: 500, fontSize: '0.95rem', color: T.color.ink, '&.Mui-focused': { color: T.color.ink } }}
          >
            {treatQ.label}
          </FormLabel>
          {treatQ.helpText && (
            <Typography sx={{ mb: 1, fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>{treatQ.helpText}</Typography>
          )}
          <FormGroup>
            {carbonates.map((c) => (
              <Box key={c.key}>
                <FormControlLabel
                  sx={labelSx}
                  control={
                    <Checkbox sx={checkboxSx} checked={ticked.has(c.key)} onChange={(_, on) => toggle(c.key, on)} />
                  }
                  label={
                    c.key === 'SODA_ASH'
                      ? optionLabel('SODA_ASH', t('flueGas.sodaAsh'))
                      : c.key === 'LIMESTONE'
                        ? optionLabel('LIMESTONE', t('flueGas.limestone'))
                        : t(`flueGas.carbonate.${c.key}`)
                  }
                />
                {ticked.has(c.key) && qtyField(c.q, quantities[c.key] ?? '')}
              </Box>
            ))}
            <FormControlLabel
              sx={labelSx}
              control={
                <Checkbox
                  sx={checkboxSx}
                  checked={sel.nothing}
                  onChange={(_, on) => apply({ ticked: [], nothing: on })}
                />
              }
              label={optionLabel('NOTHING', t('flueGas.nothing'))}
            />
          </FormGroup>
        </FormControl>
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
              fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', borderRadius: T.radius.pill,
              borderColor: T.color.line, color: T.color.inkSoft,
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
            disabled={!flueGasComplete(sel, quantities)}
            sx={{
              fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', borderRadius: T.radius.pill,
              bgcolor: T.color.forest, '&:hover': { bgcolor: T.color.ctaHover },
            }}
          >
            {t('common.next')}
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
}
