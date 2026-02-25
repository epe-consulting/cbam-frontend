import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import type { QuestionWithOptions } from '../hooks/useQuestionsByStep';

const T = {
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
  },
  color: {
    forest: '#0B4F3E',
    mint: '#E8F5EF',
    mintDark: '#C3E6D5',
    ink: '#1A2B25',
    inkSoft: '#3D5A50',
    muted: '#6B8F82',
    line: '#D6E5DD',
    lineFaint: '#EAF0EC',
    ctaHover: '#0A3F32',
  },
  radius: { sm: '8px', pill: '999px' },
};

const textFieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: T.radius.sm, fontFamily: T.font.body },
  '& .MuiInputLabel-root': { fontFamily: T.font.body },
  '& .MuiFormHelperText-root': { fontFamily: T.font.body },
};

interface DynamicQuestionStepProps {
  questions: QuestionWithOptions[];
  loading: boolean;
  error: string | null;
  getAnswer: (questionId: number) => string;
  setAnswer: (questionId: number, valueText: string) => void | Promise<void>;
  onOptionSelect?: (questionCode: string, optionCode: string) => void;
  onValueChange?: (questionCode: string, valueText: string) => void;
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}

export function DynamicQuestionStep({
  questions,
  loading,
  error,
  getAnswer,
  setAnswer,
  onOptionSelect,
  onValueChange,
  onBack,
  onNext,
  nextDisabled = false,
}: DynamicQuestionStepProps) {
  const isHasCarbonYes = (val: string) => val === 'YES' || val === 'yes' || val === 'DA' || val === 'da';
  const visibleQuestions = questions.filter((q) => {
    if (q.code === 'ALU_ANODE_CARBON_PERCENT') {
      const hasCarbonQ = questions.find((x) => x.code === 'ALU_HAS_CARBON_PERCENT');
      return hasCarbonQ != null && isHasCarbonYes(getAnswer(hasCarbonQ.id));
    }
    if (q.code === 'ALU_SODERBERG_CARBON_PERCENT') {
      const hasCarbonQ = questions.find((x) => x.code === 'ALU_SODERBERG_HAS_CARBON_PERCENT');
      return hasCarbonQ != null && isHasCarbonYes(getAnswer(hasCarbonQ.id));
    }
    return true;
  });
  const uniqueVisibleQuestions = visibleQuestions.filter(
    (q, i, arr) => arr.findIndex((x) => x.code === q.code) === i
  );

  const canProceed =
    !nextDisabled &&
    uniqueVisibleQuestions.every((q) => {
      const val = getAnswer(q.id);
      if (q.questionType === 'VALUE') return val != null && String(val).trim() !== '';
      if (q.questionType === 'SINGLE_CHOICE' || q.questionType === 'MULTI_CHOICE')
        return val != null && val !== '';
      return true;
    });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={120}>
        <CircularProgress sx={{ color: T.color.forest }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography sx={{ mb: 2, fontFamily: T.font.body, color: '#C0392B' }}>
        {error}
      </Typography>
    );
  }

  if (questions.length === 0) {
    return null;
  }

  return (
    <>
      <Grid container spacing={3}>
        {uniqueVisibleQuestions.map((q) => (
          <Grid size={12} key={q.id}>
            {q.questionType === 'VALUE' && (
              <>
                <Typography sx={{ mb: 2, fontFamily: T.font.body, fontWeight: 500, fontSize: '0.95rem', color: T.color.ink }}>
                  {q.label}
                </Typography>
                {q.helpText && (
                  <Typography sx={{ mb: 1, fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>
                    {q.helpText}
                  </Typography>
                )}
                <TextField
                  fullWidth
                  label={q.label}
                  value={getAnswer(q.id)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAnswer(q.id, val);
                    onValueChange?.(q.code, val);
                  }}
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                  helperText={q.helpText ?? undefined}
                  sx={textFieldSx}
                />
              </>
            )}
            {(q.questionType === 'SINGLE_CHOICE' || q.questionType === 'MULTI_CHOICE') && (
              <FormControl component="fieldset" fullWidth>
                <FormLabel component="legend" sx={{ mb: 2, fontFamily: T.font.body, fontWeight: 500, fontSize: '0.95rem', color: T.color.ink, '&.Mui-focused': { color: T.color.forest } }}>
                  {q.label}
                </FormLabel>
                {q.helpText && (
                  <Typography sx={{ mb: 1, fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>
                    {q.helpText}
                  </Typography>
                )}
                <RadioGroup
                  value={getAnswer(q.id)}
                  onChange={(e) => {
                    const optionCode = e.target.value;
                    setAnswer(q.id, optionCode);
                    onOptionSelect?.(q.code, optionCode);
                  }}
                >
                  {q.options
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((opt) => (
                      <FormControlLabel
                        key={opt.id}
                        value={opt.code}
                        control={<Radio sx={{ color: T.color.muted, '&.Mui-checked': { color: T.color.forest } }} />}
                        label={opt.label}
                        sx={{ mb: 1, '& .MuiFormControlLabel-label': { fontFamily: T.font.body, fontSize: '0.92rem', color: T.color.inkSoft } }}
                      />
                    ))}
                </RadioGroup>
              </FormControl>
            )}
          </Grid>
        ))}
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
              onClick={onNext} disabled={!canProceed}
              sx={{
                fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', borderRadius: T.radius.pill,
                bgcolor: T.color.forest, '&:hover': { bgcolor: T.color.ctaHover },
              }}>
              Next
            </Button>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}