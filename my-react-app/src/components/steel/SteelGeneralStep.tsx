import { useMemo, useState } from 'react';
import {
  Alert,
  Link,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { T } from './steelTheme';
import { IssueList, NavButtons, SelectField, StepHeader, TextInput } from './SteelUi';
import { Link as RouterLink } from 'react-router-dom';
import { questionMeta, type SteelStepProps } from './types';
import { DATA_SOURCE, IS_Q, notSupportedList, type StepIssue } from '../../utils/steelSteps';
import { useTranslation } from 'react-i18next';

/** Shown only when the DB options are missing (labels from locale files). */
const FALLBACK_OPTIONS = [
  { code: DATA_SOURCE.DEFAULT, labelKey: 'steel.general.optDefault' },
  { code: DATA_SOURCE.ACTUAL, labelKey: 'steel.general.optActual' },
];

export function SteelGeneralStep({ data, questions, saving, saveError, onBack, onSubmit }: SteelStepProps) {
  const { t } = useTranslation();
  const yearMeta = questionMeta(questions, IS_Q.IMPORT_YEAR, t('steel.general.yearLabel'));
  const sourceMeta = questionMeta(questions, IS_Q.DATA_SOURCE, t('steel.general.sourceLabel'));
  const [importYear, setImportYear] = useState(() => data.values[IS_Q.IMPORT_YEAR]?.at(-1) ?? (data.yRep ? String(data.yRep) : ''));
  const [dataSource, setDataSource] = useState(() => data.values[IS_Q.DATA_SOURCE]?.at(-1) ?? '');
  const installationMeta = questionMeta(questions, IS_Q.INSTALLATION_REF, t('steel.general.installationLabel'),
    t('steel.general.installationHelp'));
  const installations = data.installations;
  const [installationRef, setInstallationRef] = useState(() => {
    const saved = data.values[IS_Q.INSTALLATION_REF]?.at(-1) ?? '';
    if (saved && installations.some((i) => String(i.id) === saved)) return saved;
    return installations.length === 1 ? String(installations[0].id) : '';
  });
  const isActual = dataSource === DATA_SOURCE.ACTUAL;
  const selectedInstallation = installations.find((i) => String(i.id) === installationRef);

  const options = sourceMeta.question?.options?.length
    ? [...sourceMeta.question.options].sort((a, b) => a.sortOrder - b.sortOrder)
    : null;

  const errors = useMemo(() => {
    const list: StepIssue[] = [];
    const y = importYear.trim();
    if (y !== '' && (!/^\d{4}$/.test(y) || Number(y) < 2026)) {
      list.push({ code: 'IS_E_PERIOD', message: t('steel.general.yearError') });
    }
    return list;
  }, [importYear, t]);

  const missingOptions = !options;
  const installationOk = !isActual || selectedInstallation != null;
  const canNext = importYear.trim() !== '' && dataSource !== '' && errors.length === 0 && !missingOptions && installationOk;

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={t('steel.general.title')} />

      <Typography sx={{ mb: 1, fontFamily: T.font.body, fontWeight: 500, fontSize: '0.95rem', color: T.color.ink }}>{yearMeta.label}</Typography>
      {yearMeta.help && (
        <Typography sx={{ mb: 1.5, fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>{yearMeta.help}</Typography>
      )}
      <Box sx={{ maxWidth: 260, mb: 3 }}>
        <TextInput label={t('steel.general.yearInput')} value={importYear} onChange={(v) => setImportYear(v.replace(/\D/g, '').slice(0, 4))} required />
      </Box>

      <FormControl component="fieldset" fullWidth>
        <FormLabel component="legend" sx={{ mb: 1, fontFamily: T.font.body, fontWeight: 500, fontSize: '0.95rem', color: T.color.ink, '&.Mui-focused': { color: T.color.forest } }}>
          {sourceMeta.label}
        </FormLabel>
        {sourceMeta.help && (
          <Typography sx={{ mb: 1, fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>{sourceMeta.help}</Typography>
        )}
        <RadioGroup value={dataSource} onChange={(e) => setDataSource(e.target.value)}>
          {(options ?? FALLBACK_OPTIONS.map((o, i) => ({ id: i, code: o.code, label: t(o.labelKey), sortOrder: i }))).map((opt) => (
            <FormControlLabel
              key={opt.code}
              value={opt.code}
              disabled={missingOptions}
              control={<Radio sx={{ color: T.color.muted, '&.Mui-checked': { color: T.color.forest } }} />}
              label={opt.label}
              sx={{ mb: 1, '& .MuiFormControlLabel-label': { fontFamily: T.font.body, fontSize: '0.92rem', color: T.color.inkSoft } }}
            />
          ))}
        </RadioGroup>
      </FormControl>

      {isActual && (
        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography sx={{ mb: 1, fontFamily: T.font.body, fontWeight: 500, fontSize: '0.95rem', color: T.color.ink }}>{installationMeta.label}</Typography>
          {installationMeta.help && (
            <Typography sx={{ mb: 1.5, fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>{installationMeta.help}</Typography>
          )}
          {installations.length === 0 ? (
            <Alert severity="warning" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>
              {t('steel.general.noInstallationsBefore')}
              <Link component={RouterLink} to="/dashboard/settings">{t('steel.general.settingsLinkFull')}</Link>{t('steel.general.noInstallationsAfter')}
            </Alert>
          ) : (
            <>
              <Box sx={{ maxWidth: 480 }}>
                <SelectField
                  label={t('steel.general.installation')}
                  value={installationRef}
                  onChange={setInstallationRef}
                  required
                  emptyLabel={t('steel.general.selectInstallation')}
                  options={installations.map((i) => ({
                    value: String(i.id),
                    label: [i.installationName, i.country].filter(Boolean).join(' – '),
                  }))}
                />
              </Box>
              {selectedInstallation && (
                <Typography sx={{ mt: 1, fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>
                  {t('steel.general.country')}: {selectedInstallation.country || '—'}
                  {' · '}UN/LOCODE: {selectedInstallation.unLocode || '—'}
                  {' · '}{t('steel.general.cbamInstallationId')}: {selectedInstallation.cbamRegistryInstallationId || '—'}
                </Typography>
              )}
              {selectedInstallation && !selectedInstallation.country?.trim() && (
                <Alert severity="warning" sx={{ mt: 1, borderRadius: T.radius.sm, fontFamily: T.font.body }}>
                  {t('steel.general.noCountryBefore')}
                  <Link component={RouterLink} to="/dashboard/settings">{t('steel.general.settingsLink')}</Link>.
                </Alert>
              )}
            </>
          )}
        </Box>
      )}

      <Accordion elevation={0} sx={{ mt: 2, border: `1px solid ${T.color.lineFaint}`, borderRadius: `${T.radius.md} !important`, '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.9rem', color: T.color.inkSoft }}>{t('steel.general.notSupported')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {notSupportedList().map((item, i) => (
            <Typography key={item} sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted, mb: 0.5 }}>
              {i + 1}. {item}
            </Typography>
          ))}
        </AccordionDetails>
      </Accordion>

      <IssueList
        errors={missingOptions && !sourceMeta.question ? [] : errors}
        infos={missingOptions ? [t('steel.general.optionsMissing')] : undefined}
      />
      <NavButtons
        onBack={onBack}
        onNext={() => onSubmit({
          values: {
            [IS_Q.IMPORT_YEAR]: importYear.trim(),
            [IS_Q.DATA_SOURCE]: dataSource,
            // only the actual-values path needs an installation; '' clears an old selection
            [IS_Q.INSTALLATION_REF]: isActual ? installationRef : '',
          },
        })}
        nextDisabled={!canNext}
        saving={saving}
        saveError={saveError}
      />
    </Box>
  );
}
