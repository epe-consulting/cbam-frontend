import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import type { CountryDto } from '../hooks/useCountries';
import { useTranslation } from 'react-i18next';

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '8px', fontFamily: "'DM Sans', system-ui, sans-serif" },
  '& .MuiInputLabel-root': { fontFamily: "'DM Sans', system-ui, sans-serif" },
};

export interface CountrySelectProps {
  label?: string;
  countries: CountryDto[];
  value: number | null;
  onChange: (country: CountryDto | null) => void;
  disabled?: boolean;
  required?: boolean;
}

/** Dropdown-only country picker (no free-text entry). */
export function CountrySelect({
  label,
  countries,
  value,
  onChange,
  disabled = false,
  required = true,
}: CountrySelectProps) {
  const { t } = useTranslation();
  const fieldLabel = label ?? t('country.origin');
  return (
    <FormControl fullWidth required={required} disabled={disabled || countries.length === 0} sx={fieldSx}>
      <InputLabel id="country-select-label">{fieldLabel}</InputLabel>
      <Select
        labelId="country-select-label"
        label={fieldLabel}
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value as number | '';
          if (raw === '') {
            onChange(null);
            return;
          }
          const id = Number(raw);
          const selected = countries.find((c) => c.id === id) ?? null;
          onChange(selected);
        }}
      >
        <MenuItem value="">
          <em>{t('country.select')}</em>
        </MenuItem>
        {countries.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.country}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
