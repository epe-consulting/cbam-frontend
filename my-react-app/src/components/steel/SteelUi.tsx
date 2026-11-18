import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { Add, ArrowBack, ArrowForward, Delete } from '@mui/icons-material';
import { T, outlinedButtonSx, textFieldSx } from './steelTheme';
import type { StepIssue } from '../../utils/steelSteps';
import { normNum } from '../../utils/steelSteps';
import { useTranslation } from 'react-i18next';

export function StepHeader({ title, help }: { title?: string | null; help?: string | null }) {
  return (
    <Box sx={{ mb: 2 }}>
      {title && (
        <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink, letterSpacing: '-0.02em', mb: 0.5 }}>
          {title}
        </Typography>
      )}
      {help && (
        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.muted, lineHeight: 1.6 }}>
          {help}
        </Typography>
      )}
    </Box>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1rem', color: T.color.ink, mt: 2, mb: 1 }}>
      {children}
    </Typography>
  );
}

export function RowCard({ title, onRemove, children }: { title?: ReactNode; onRemove?: () => void; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        mb: 2, p: 2.5, border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.md,
        bgcolor: T.color.warmWhite, position: 'relative',
      }}
    >
      {(title || onRemove) && (
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.92rem', color: T.color.inkSoft }}>
            {title}
          </Typography>
          {onRemove && (
            <IconButton
              size="small"
              onClick={onRemove}
              aria-label={t('common.removeRow')}
              sx={{ color: T.color.muted, '&:hover': { bgcolor: T.color.errorLight, color: T.color.error } }}
            >
              <Delete fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
        {children}
      </Box>
    </Box>
  );
}

/** Spans the full row width inside a RowCard grid. */
export function FullRow({ children }: { children: ReactNode }) {
  return <Box sx={{ gridColumn: '1 / -1' }}>{children}</Box>;
}

export function AddButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      type="button"
      variant="outlined"
      size="small"
      startIcon={<Add sx={{ fontSize: '18px !important' }} />}
      onClick={onClick}
      disabled={disabled}
      sx={{ ...outlinedButtonSx, mb: 2 }}
    >
      {label}
    </Button>
  );
}

export function NumField({
  label, value, onChange, required, disabled, helperText, error,
}: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; disabled?: boolean;
  helperText?: string; error?: boolean;
}) {
  return (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={value ?? ''}
      required={required}
      disabled={disabled}
      error={error}
      helperText={helperText}
      onChange={(e) => onChange(normNum(e.target.value))}
      slotProps={{ htmlInput: { inputMode: 'decimal' } }}
      sx={textFieldSx}
    />
  );
}

export function TextInput({
  label, value, onChange, required, disabled, helperText, error,
}: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; disabled?: boolean;
  helperText?: string; error?: boolean;
}) {
  return (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={value ?? ''}
      required={required}
      disabled={disabled}
      error={error}
      helperText={helperText}
      onChange={(e) => onChange(e.target.value)}
      sx={textFieldSx}
    />
  );
}

export interface Option { value: string; label: string }

export function SelectField({
  label, value, options, onChange, required, disabled, emptyLabel,
}: {
  label: string; value: string; options: Option[]; onChange: (v: string) => void; required?: boolean;
  disabled?: boolean; emptyLabel?: string;
}) {
  return (
    <FormControl fullWidth size="small" required={required} disabled={disabled} sx={textFieldSx}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={options.some((o) => o.value === value) ? value : ''} onChange={(e) => onChange(String(e.target.value))}>
        {emptyLabel && (
          <MenuItem value="">
            <em>{emptyLabel}</em>
          </MenuItem>
        )}
        {options.map((o) => (
          <MenuItem key={o.value} value={o.value} sx={{ fontFamily: T.font.body, whiteSpace: 'normal' }}>
            {o.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export function CheckField({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={Boolean(checked)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          sx={{ color: T.color.muted, '&.Mui-checked': { color: T.color.forest } }}
        />
      }
      label={label}
      sx={{ '& .MuiFormControlLabel-label': { fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.inkSoft } }}
    />
  );
}

export function IssueList({ errors, warnings, infos }: { errors?: StepIssue[]; warnings?: StepIssue[]; infos?: string[] }) {
  const { t } = useTranslation();
  const dedupe = (list: StepIssue[] = []) => list.filter((x, i, arr) => arr.findIndex((y) => y.message === x.message) === i);
  const e = dedupe(errors);
  const w = dedupe(warnings);
  if (e.length === 0 && w.length === 0 && (!infos || infos.length === 0)) return null;
  return (
    <Box sx={{ mt: 2, display: 'grid', gap: 1 }}>
      {e.length > 0 && (
        <Alert severity="error" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>
          <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.88rem', mb: 0.5 }}>{t('steel.ui.fixBeforeContinue')}</Typography>
          {e.map((x) => (
            <Typography key={x.message} sx={{ fontFamily: T.font.body, fontSize: '0.85rem' }}>
              • {x.message}
            </Typography>
          ))}
        </Alert>
      )}
      {w.length > 0 && (
        <Alert severity="warning" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>
          {w.map((x) => (
            <Typography key={x.message} sx={{ fontFamily: T.font.body, fontSize: '0.85rem' }}>
              • {x.message}
            </Typography>
          ))}
        </Alert>
      )}
      {infos && infos.length > 0 && (
        <Alert severity="info" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>
          {infos.map((x) => (
            <Typography key={x} sx={{ fontFamily: T.font.body, fontSize: '0.85rem' }}>• {x}</Typography>
          ))}
        </Alert>
      )}
    </Box>
  );
}

export function NavButtons({
  onBack, onNext, nextDisabled, saving, saveError,
}: { onBack: () => void; onNext: () => void; nextDisabled?: boolean; saving?: boolean; saveError?: string | null }) {
  const { t } = useTranslation();
  return (
    <>
      {saveError && (
        <Alert severity="error" sx={{ mt: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>{saveError}</Alert>
      )}
      <Box display="flex" justifyContent="space-between" sx={{ mt: 3 }}>
        <Button
          type="button" variant="outlined" size="large"
          startIcon={<ArrowBack sx={{ fontSize: '18px !important' }} />}
          onClick={onBack}
          disabled={saving}
          sx={{ ...outlinedButtonSx, color: T.color.inkSoft }}
        >
          {t('common.back')}
        </Button>
        <Button
          type="button" variant="contained" size="large" disableElevation
          endIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <ArrowForward sx={{ fontSize: '18px !important' }} />}
          onClick={onNext}
          disabled={nextDisabled || saving}
          sx={{
            fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', borderRadius: T.radius.pill,
            bgcolor: T.color.forest, '&:hover': { bgcolor: T.color.ctaHover },
          }}
        >
          {t('common.next')}
        </Button>
      </Box>
    </>
  );
}
