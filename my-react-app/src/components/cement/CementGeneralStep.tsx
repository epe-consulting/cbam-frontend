import { useMemo, useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, FormControl, FormControlLabel, FormLabel, Link, Radio, RadioGroup,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { T } from '../steel/steelTheme';
import { IssueList, NavButtons, SelectField, StepHeader, TextInput } from '../steel/SteelUi';
import { questionMeta, type CementStepProps } from './types';
import { useCountries } from '../../hooks/useCountries';
import { useIsExemptOrigins } from '../../hooks/useIronSteelRefData';
import { dvRequestKey, useCeDefaultValues, type CeDvRequest } from '../../hooks/useCementRefData';
import type { StepIssue } from '../../utils/steelSteps';
import {
  CE_DATA_SOURCE, CE_MIN_YEAR, CE_Q, ceIssueText, ceNotSupportedList, ceProductIssues, checkCeCnTaric, formatCeCode, formatSee,
} from '../../utils/cementSteps';

/** Shown only when the DB options are missing (labels from locale files). */
const FALLBACK_OPTIONS = [
  { code: CE_DATA_SOURCE.DEFAULT, labelKey: 'cement.general.optDefault' },
  { code: CE_DATA_SOURCE.ACTUAL, labelKey: 'cement.general.optActual' },
];

/** CE_GENERAL (spec §4.4): import year, data source (routing), installation (actual path), CK check of products. */
export function CementGeneralStep({ data, questions, saving, saveError, onBack, onSubmit }: CementStepProps) {
  const { t } = useTranslation();
  const { countries } = useCountries();
  const { exempt } = useIsExemptOrigins();
  const yearMeta = questionMeta(questions, CE_Q.IMPORT_YEAR, t('cement.general.yearLabel'), t('cement.general.yearHelp'));
  const sourceMeta = questionMeta(questions, CE_Q.DATA_SOURCE, t('cement.general.sourceLabel'), t('cement.general.sourceHelp'));
  const installationMeta = questionMeta(questions, CE_Q.INSTALLATION_REF, t('cement.general.installationLabel'), t('cement.general.installationHelp'));
  const [importYear, setImportYear] = useState(() => data.values[CE_Q.IMPORT_YEAR]?.at(-1) ?? (data.yRep ? String(data.yRep) : ''));
  const [dataSource, setDataSource] = useState(() => data.values[CE_Q.DATA_SOURCE]?.at(-1) ?? '');
  const installations = data.installations;
  const [installationRef, setInstallationRef] = useState(() => {
    const saved = data.values[CE_Q.INSTALLATION_REF]?.at(-1) ?? '';
    if (saved && installations.some((i) => String(i.id) === saved)) return saved;
    return installations.length === 1 ? String(installations[0].id) : '';
  });
  const isActual = dataSource === CE_DATA_SOURCE.ACTUAL;
  const isDefault = dataSource === CE_DATA_SOURCE.DEFAULT;
  const selectedInstallation = installations.find((i) => String(i.id) === installationRef);

  const options = sourceMeta.question?.options?.length
    ? [...sourceMeta.question.options].sort((a, b) => a.sortOrder - b.sortOrder)
    : null;
  const missingOptions = !options;

  const year = /^\d{4}$/.test(importYear.trim()) ? Number(importYear.trim()) : null;

  const errors = useMemo(() => {
    const list: StepIssue[] = [];
    const y = importYear.trim();
    if (y !== '' && (!/^\d{4}$/.test(y) || Number(y) < CE_MIN_YEAR)) {
      list.push({ code: 'CE_E_PERIOD', message: t('cement.general.yearError') });
    }
    // Actual path: CK of cement goods is required on the product rows (spec §4.3, FE-5).
    if (isActual) {
      ceProductIssues(data.products, data.mapping, true)
        .filter((i) => i.code === 'CE_E_CK_MISSING' || i.code === 'CE_E_CK_RANGE')
        .forEach((i) => list.push({
          code: i.code,
          message: `${ceIssueText(i.code, { what: t('cement.pd.product', { n: i.index + 1 }) })} ${t('cement.general.ckGoBack')}`,
        }));
    }
    return list;
  }, [importYear, isActual, data.products, data.mapping, t]);

  const installationOk = !isActual || selectedInstallation != null;
  const canNext = importYear.trim() !== '' && dataSource !== '' && errors.length === 0 && !missingOptions && installationOk;

  // Default-value preview for the declared products (DVC Annex I via GET /ce/default-value; spec §3.2).
  const previewRows = useMemo(() => data.products.map((p) => {
    const chk = checkCeCnTaric(data.mapping, p.cn_code, p.taric_code);
    const country = countries.find((c) => c.country === p.country_of_origin);
    const zero = country?.isEu ? 'EU' : (exempt.countries.includes(p.country_of_origin) ? 'EXEMPT' : null);
    const req: CeDvRequest | null = chk.ok && year != null && year >= CE_MIN_YEAR && !zero && p.country_of_origin
      ? { code: chk.key, country: p.country_of_origin, year, annex: 'I' }
      : null;
    return { p, req, zero };
  }), [data.products, data.mapping, countries, exempt, year]);
  const dvResults = useCeDefaultValues(isDefault ? previewRows.map((r) => r.req).filter((r): r is CeDvRequest => r != null) : []);

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={t('cement.general.title')} />

      <Typography sx={{ mb: 1, fontFamily: T.font.body, fontWeight: 500, fontSize: '0.95rem', color: T.color.ink }}>{yearMeta.label}</Typography>
      {yearMeta.help && <Typography sx={{ mb: 1.5, fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>{yearMeta.help}</Typography>}
      <Box sx={{ maxWidth: 260, mb: 3 }}>
        <TextInput label={t('cement.general.yearInput')} value={importYear} onChange={(v) => setImportYear(v.replace(/\D/g, '').slice(0, 4))} required />
      </Box>

      <FormControl component="fieldset" fullWidth>
        <FormLabel component="legend" sx={{ mb: 1, fontFamily: T.font.body, fontWeight: 500, fontSize: '0.95rem', color: T.color.ink, '&.Mui-focused': { color: T.color.forest } }}>
          {sourceMeta.label}
        </FormLabel>
        {sourceMeta.help && <Typography sx={{ mb: 1, fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>{sourceMeta.help}</Typography>}
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
          {installationMeta.help && <Typography sx={{ mb: 1.5, fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>{installationMeta.help}</Typography>}
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
                  options={installations.map((i) => ({ value: String(i.id), label: [i.installationName, i.country].filter(Boolean).join(' – ') }))}
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

      {isDefault && previewRows.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.9rem', color: T.color.inkSoft, mb: 0.5 }}>
            {t('cement.general.dvPreview', { year: year ?? '—' })}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('cement.pd.name')}</TableCell>
                <TableCell>{t('cement.pd.code')}</TableCell>
                <TableCell>{t('cement.general.dvTable')}</TableCell>
                <TableCell align="right">{t('cement.general.dvValue')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {previewRows.map(({ p, req, zero }, i) => {
                const r = req ? dvResults[dvRequestKey(req)] : undefined;
                let value: string = '…';
                let table = '—';
                if (zero) { value = '0'; table = zero === 'EU' ? t('cement.general.zeroEu') : t('cement.general.zeroExempt'); }
                else if (!req) value = '—';
                else if (r?.ok && r.value) {
                  value = formatSee(r.value.valueForYear);
                  table = `${r.value.country}${r.value.fallbackUsed ? ` (${t('cement.general.fallback')})` : ''} · +${r.value.markupPct ?? '—'} %`;
                } else if (r) { value = '—'; table = r.errorCode ? ceIssueText(r.errorCode, { what: '' }) : (r.message ?? '—'); }
                return (
                  <TableRow key={i}>
                    <TableCell>{p.product_name || t('cement.pd.product', { n: i + 1 })}</TableCell>
                    <TableCell>{formatCeCode(p.taric_code || p.cn_code)}</TableCell>
                    <TableCell>{table}</TableCell>
                    <TableCell align="right">{value}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Typography sx={{ mt: 0.5, fontFamily: T.font.body, fontSize: '0.78rem', color: T.color.muted }}>{t('cement.general.dvPreviewNote')}</Typography>
        </Box>
      )}

      <Accordion elevation={0} sx={{ mt: 2, border: `1px solid ${T.color.lineFaint}`, borderRadius: `${T.radius.md} !important`, '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.9rem', color: T.color.inkSoft }}>{t('cement.general.notSupported')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {ceNotSupportedList().map((item, i) => (
            <Typography key={item} sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted, mb: 0.5 }}>{i + 1}. {item}</Typography>
          ))}
        </AccordionDetails>
      </Accordion>

      <IssueList
        errors={missingOptions && !sourceMeta.question ? [] : errors}
        infos={missingOptions ? [t('cement.general.optionsMissing')] : undefined}
      />
      <NavButtons
        onBack={onBack}
        onNext={() => onSubmit({
          values: {
            [CE_Q.IMPORT_YEAR]: importYear.trim(),
            [CE_Q.DATA_SOURCE]: dataSource,
            [CE_Q.INSTALLATION_REF]: isActual ? installationRef : '',
          },
        })}
        nextDisabled={!canNext}
        saving={saving}
        saveError={saveError}
      />
    </Box>
  );
}
