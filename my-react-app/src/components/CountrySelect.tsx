import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import type { CountryDto } from '../hooks/useCountries';

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
  label = 'Država porijekla',
  countries,
  value,
  onChange,
  disabled = false,
  required = true,
}: CountrySelectProps) {
  return (
    <FormControl fullWidth required={required} disabled={disabled || countries.length === 0} sx={fieldSx}>
      <InputLabel id="country-select-label">{label}</InputLabel>
      <Select
        labelId="country-select-label"
        label={label}
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
          <em>Odaberite državu</em>
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
