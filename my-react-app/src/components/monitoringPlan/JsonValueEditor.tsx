import { Box, Button, IconButton, MenuItem, Switch, TextField, Typography, FormControlLabel } from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { MpJson } from '../../api/monitoringPlan';
import { T, textFieldSx } from '../steel/steelTheme';
import { emptyRow, type FieldEditor } from './mpFields';

type Obj = { [k: string]: MpJson };

function isObj(v: MpJson | undefined): v is Obj {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}


/**
 * Edits a plan value in its own JSON shape: text, yes/no, lists of rows (tables) and nested objects.
 * Prefilled values keep the shape the backend gave them; empty fields start from the field's editor.
 */
export default function JsonValueEditor({
  value, editor, onChange, disabled, depth = 0,
}: {
  value: MpJson;
  editor?: FieldEditor;
  onChange: (v: MpJson) => void;
  disabled?: boolean;
  depth?: number;
}) {
  const { t } = useTranslation();

  if (editor?.kind === 'choice' && (value === null || typeof value === 'string')) {
    return (
      <TextField
        select fullWidth size="small" disabled={disabled} value={value ?? ''} sx={textFieldSx}
        label={t('mp.chooseOne')}
        onChange={(e) => onChange(e.target.value)}
      >
        <MenuItem value=""><em>{t('mp.notChosen')}</em></MenuItem>
        {editor.options.map((o) => (
          <MenuItem key={o} value={o} sx={{ fontFamily: T.font.body, whiteSpace: 'normal' }}>
            {t(`mp.option.${o}`, { defaultValue: o })}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <FormControlLabel
        disabled={disabled}
        control={<Switch checked={value} onChange={(e) => onChange(e.target.checked)} />}
        label={<Typography sx={{ fontFamily: T.font.body, fontSize: '0.9rem' }}>{value ? t('mp.yes') : t('mp.no')}</Typography>}
      />
    );
  }

  if (Array.isArray(value)) {
    const scalarList = value.every((v) => v === null || typeof v !== 'object');
    if (scalarList && value.length > 0 && depth > 0) {
      return (
        <TextField
          fullWidth size="small" disabled={disabled} sx={textFieldSx}
          helperText={t('mp.commaSeparated')}
          value={value.map((v) => (v === null ? '' : String(v))).join(', ')}
          onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter((s) => s !== ''))}
        />
      );
    }
    const columns = editor?.kind === 'rows' || editor?.kind === 'presence' ? editor.columns : [];
    const known = new Set<string>(columns);
    value.forEach((r) => isObj(r) && Object.keys(r).forEach((k) => known.add(k)));
    const cols = [...known];
    return (
      <Box>
        {value.length === 0 && (
          <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted, mb: 1 }}>
            {t('mp.noRows')}
          </Typography>
        )}
        {value.map((row, i) => (
          <Box
            key={i}
            sx={{ border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.sm, p: 1.5, mb: 1, bgcolor: depth % 2 ? T.color.cream : T.color.warmWhite }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.8rem', fontWeight: 600, color: T.color.inkSoft }}>
                {t('mp.row', { n: i + 1 })}
              </Typography>
              {!disabled && (
                <IconButton size="small" aria-label={t('mp.removeRow')} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                  <Delete fontSize="small" />
                </IconButton>
              )}
            </Box>
            {isObj(row) ? (
              <ObjectEditor value={row} keys={cols} disabled={disabled} depth={depth + 1}
                onChange={(nv) => onChange(value.map((r, j) => (j === i ? nv : r)))} />
            ) : (
              <JsonValueEditor value={row} disabled={disabled} depth={depth + 1}
                onChange={(nv) => onChange(value.map((r, j) => (j === i ? nv : r)))} />
            )}
          </Box>
        ))}
        {!disabled && (
          <Button size="small" startIcon={<Add />} sx={{ fontFamily: T.font.body, textTransform: 'none', color: T.color.forest }}
            onClick={() => onChange([...value, cols.length ? emptyRow(cols) : ''])}>
            {t('mp.addRow')}
          </Button>
        )}
      </Box>
    );
  }

  if (isObj(value)) {
    const keys = Object.keys(value);
    if (editor?.kind === 'presence') {
      const present = value.present === true;
      const rows = Array.isArray(value.rows) ? value.rows : [];
      return (
        <Box>
          <FormControlLabel
            disabled={disabled}
            control={<Switch checked={present} onChange={(e) => onChange({ ...value, present: e.target.checked })} />}
            label={<Typography sx={{ fontFamily: T.font.body, fontSize: '0.9rem' }}>{present ? t('mp.present') : t('mp.notPresent')}</Typography>}
          />
          {present && (
            <JsonValueEditor value={rows} editor={{ kind: 'rows', columns: editor.columns }} disabled={disabled} depth={depth + 1}
              onChange={(nv) => onChange({ ...value, rows: nv })} />
          )}
          {keys.filter((k) => k !== 'present' && k !== 'rows').length > 0 && (
            <ObjectEditor value={value} keys={keys.filter((k) => k !== 'present' && k !== 'rows')} disabled={disabled} depth={depth + 1} onChange={onChange} />
          )}
        </Box>
      );
    }
    return <ObjectEditor value={value} keys={keys} disabled={disabled} depth={depth + 1} onChange={onChange} />;
  }

  const multiline = editor?.kind === 'longtext';
  return (
    <TextField
      fullWidth size="small" disabled={disabled} sx={textFieldSx}
      multiline={multiline} minRows={multiline ? 3 : undefined}
      value={value === null || value === undefined ? '' : String(value)}
      onChange={(e) => onChange(typeof value === 'number' && e.target.value !== '' && !Number.isNaN(Number(e.target.value))
        ? Number(e.target.value) : e.target.value)}
    />
  );
}

function ObjectEditor({
  value, keys, onChange, disabled, depth,
}: {
  value: Obj;
  keys: string[];
  onChange: (v: Obj) => void;
  disabled?: boolean;
  depth: number;
}) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.2 }}>
      {keys.map((k) => {
        const v = value[k] ?? '';
        const wide = v !== null && typeof v === 'object';
        return (
          <Box key={k} sx={{ gridColumn: wide ? '1 / -1' : undefined }}>
            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.75rem', color: T.color.muted, mb: 0.3 }}>
              {t(`mp.col.${k}`, { defaultValue: k })}
            </Typography>
            <JsonValueEditor value={v} disabled={disabled} depth={depth} onChange={(nv) => onChange({ ...value, [k]: nv })} />
          </Box>
        );
      })}
    </Box>
  );
}
