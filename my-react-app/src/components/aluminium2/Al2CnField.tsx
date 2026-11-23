import { Autocomplete, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { textFieldSx } from '../steel/steelTheme';
import {
  al2CategoryLabel, al2IssueText, al2Suggestions, checkAl2Cn, formatAl2Cn, type Al2CnMapping,
} from '../../utils/aluminium2Steps';

/**
 * 8-digit CN entry with the template suggestions as autocomplete (spec §2.1 / §4.3, OQ-AL2-10): any 8-digit
 * code under one of the headings of GET /al2/cn-mapping is accepted (free entry).
 * `categories` restricts the suggestions (e.g. process category); validation still uses all headings.
 */
export function Al2CnField({
  label, value, onChange, mapping, categories, required, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void; mapping: Al2CnMapping; categories?: string[];
  required?: boolean; disabled?: boolean;
}) {
  const { t } = useTranslation();
  const options = al2Suggestions(mapping, categories);
  const chk = checkAl2Cn(mapping, value);
  const blank = String(value ?? '').trim() === '';
  const helper = blank
    ? t('aluminium2.cnField.help')
    : chk.ok
      ? `${al2CategoryLabel(chk.category)} · ${t(`aluminium2.cn.${chk.row.heading.replace(/\s+/g, '')}`, { defaultValue: chk.row.description })}${chk.inSuggestionList ? '' : ` · ${t('aluminium2.cnField.notInList')}`}`
      : al2IssueText(chk.code);
  return (
    <Autocomplete
      freeSolo
      size="small"
      disabled={disabled}
      options={options}
      groupBy={(o) => (typeof o === 'string' ? '' : `${o.heading} – ${al2CategoryLabel(o.category)}`)}
      getOptionLabel={(o) => (typeof o === 'string' ? o : o.cnCode)}
      renderOption={(props, o) => {
        const { key, ...rest } = props as typeof props & { key: string };
        return <li key={key} {...rest}>{typeof o === 'string' ? o : `${o.cnCode} – ${o.description}`}</li>;
      }}
      inputValue={value ?? ''}
      onInputChange={(_, v, reason) => { if (reason !== 'reset') onChange(v); }}
      onChange={(_, v) => { if (v == null) onChange(''); else onChange(typeof v === 'string' ? v : v.cnCode); }}
      onBlur={() => { if (chk.ok) onChange(formatAl2Cn(value)); }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={!blank && !chk.ok}
          helperText={helper}
          sx={textFieldSx}
        />
      )}
    />
  );
}
