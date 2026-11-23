import { useMemo, useState, type ReactNode } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, FormControl, FormControlLabel, FormLabel, Link, Radio, RadioGroup,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { T } from '../steel/steelTheme';
import { IssueList, NavButtons, SelectField, StepHeader, TextInput } from '../steel/SteelUi';
import { questionMeta, type Al2StepProps } from './types';
import { useCountries } from '../../hooks/useCountries';
import { useIsExemptOrigins } from '../../hooks/useIronSteelRefData';
import { al2DvRequestKey, useAl2DefaultValues, type Al2DvRequest } from '../../hooks/useAluminium2RefData';
import type { StepIssue } from '../../utils/steelSteps';
import {
  AL2_DATA_SOURCE, AL2_Q, al2FormatSee, al2IssueText, al2NotSupportedList, checkAl2Cn, formatAl2Cn, importYearOk,
} from '../../utils/aluminium2Steps';

/** Shown only when the DB options are missing (labels from locale files). */
const FALLBACK_OPTIONS = [
  { code: AL2_DATA_SOURCE.DEFAULT, labelKey: 'aluminium2.general.optDefault' },
  { code: AL2_DATA_SOURCE.ACTUAL, labelKey: 'aluminium2.general.optActual' },
];

/** AL2_GENERAL (spec §4.4, FE-5): import year, data source (routing), installation (actual path), DV preview. */
export function Al2GeneralStep({ data, questions, saving, saveError, onBack, onSubmit }: Al2StepProps) {
  const { t } = useTranslation();
  const { countries } = useCountries();
  const { exempt } = useIsExemptOrigins();
  const yearMeta = questionMeta(questions, AL2_Q.IMPORT_YEAR, t('aluminium2.general.yearLabel'), t('aluminium2.general.yearHelp'));
  const sourceMeta = questionMeta(questions, AL2_Q.DATA_SOURCE, t('aluminium2.general.sourceLabel'), t('aluminium2.general.sourceHelp'));
  const installationMeta = questionMeta(questions, AL2_Q.INSTALLATION_REF, t('aluminium2.general.installationLabel'), t('aluminium2.general.installationHelp'));
  const [importYear, setImportYear] = useState(() => data.values[AL2_Q.IMPORT_YEAR]?.at(-1) ?? (data.yRep ? String(data.yRep) : ''));
  const [dataSource, setDataSource] = useState(() => data.values[AL2_Q.DATA_SOURCE]?.at(-1) ?? '');
  const installations = data.installations;
  const [installationRef, setInstallationRef] = useState(() => {
    const saved = data.values[AL2_Q.INSTALLATION_REF]?.at(-1) ?? '';
    if (saved && installations.some((i) => String(i.id) === saved)) return saved;
    return installations.length === 1 ? String(installations[0].id) : '';
  });
  const isActual = dataSource === AL2_DATA_SOURCE.ACTUAL;
  const isDefault = dataSource === AL2_DATA_SOURCE.DEFAULT;
  const selectedInstallation = installations.find((i) => String(i.id) === installationRef);

  const options = sourceMeta.question?.options?.length
    ? [...sourceMeta.question.options].sort((a, b) => a.sortOrder - b.sortOrder)
    : null;
  const missingOptions = !options;

  const yearOk = importYearOk(importYear);
  const year = yearOk ? Number(importYear.trim()) : null;

  const errors = useMemo(() => {
    const list: StepIssue[] = [];
    if (yearOk === false) list.push({ code: 'AL2_E_PERIOD', message: t('aluminium2.general.yearError') });
    return list;
  }, [yearOk, t]);

  // AL2_INSTALLATION_REF is optional in the DB, the FE requires it on the actual path (contract §1.1).
  const installationOk = !isActual || selectedInstallation != null;
  const canNext = importYear.trim() !== '' && dataSource !== '' && errors.length === 0 && !missingOptions && installationOk;

  // Default-value preview for the declared products (DVC Annex I via GET /al2/default-value; spec §3.2).
  const previewRows = useMemo(() => data.products.map((p) => {
    const chk = checkAl2Cn(data.mapping, p.cn_code);
    const country = countries.find((c) => c.country === p.country_of_origin);
    const zero = country?.isEu ? 'EU' : (exempt.countries.includes(p.country_of_origin) ? 'EXEMPT' : null);
    const req: Al2DvRequest | null = chk.ok && year != null && !zero && p.country_of_origin
      ? { cn: chk.digits, country: p.country_of_origin, year, annex: 'I' }
      : null;
    return { p, req, zero };
  }), [data.products, data.mapping, countries, exempt, year]);
  const dvResults = useAl2DefaultValues(isDefault ? previewRows.map((r) => r.req).filter((r): r is Al2DvRequest => r != null) : []);

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={t('aluminium2.step.AL2_GENERAL')} />

      <Typography sx={{ mb: 1, fontFamily: T.font.body, fontWeight: 500, fontSize: '0.95rem', color: T.color.ink }}>{yearMeta.label}</Typography>
      {yearMeta.help && <Typography sx={{ mb: 1.5, fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>{yearMeta.help}</Typography>}
      <Box sx={{ maxWidth: 260, mb: 3 }}>
        <TextInput label={t('aluminium2.general.yearInput')} value={importYear} onChange={(v) => setImportYear(v.replace(/\D/g, '').slice(0, 4))} required />
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

      <Alert severity="info" sx={{ mt: 1, mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>{t('aluminium2.indirectNotApplicable')}</Alert>

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
            {t('aluminium2.general.dvPreview', { year: year ?? '—' })}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('aluminium2.pd.name')}</TableCell>
                <TableCell>{t('aluminium2.pd.cn')}</TableCell>
                <TableCell>{t('aluminium2.general.dvTable')}</TableCell>
                <TableCell align="right">{t('aluminium2.general.dvValue')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {previewRows.map(({ p, req, zero }, i) => {
                const r = req ? dvResults[al2DvRequestKey(req)] : undefined;
                let value = '…';
                let table: ReactNode = '—';
                if (zero) { value = '0'; table = zero === 'EU' ? t('aluminium2.general.zeroEu') : t('aluminium2.general.zeroExempt'); }
                else if (!req) value = '—';
                else if (r?.ok && r.value) {
                  value = al2FormatSee(r.value.valueForYear);
                  table = (
                    <>
                      {r.value.country}{r.value.fallbackUsed ? ` (${t('aluminium2.general.fallback')})` : ''} · {formatAl2Cn(r.value.matchedCode)} · {r.value.total ?? '—'} +{r.value.markupPct ?? '—'} %{r.value.bmRoute ? ` · ${r.value.bmRoute}` : ''}
                      {r.value.dvcCorrection && <Chip size="small" label={t('aluminium2.res.dvcBadge')} sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} />}
                    </>
                  );
                } else if (r) { value = '—'; table = r.errorCode ? al2IssueText(r.errorCode) : (r.message ?? '—'); }
                return (
                  <TableRow key={i}>
                    <TableCell>{p.product_name || t('aluminium2.pd.product', { n: i + 1 })}</TableCell>
                    <TableCell>{formatAl2Cn(p.cn_code)}</TableCell>
                    <TableCell>{table}</TableCell>
                    <TableCell align="right">{value}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Typography sx={{ mt: 0.5, fontFamily: T.font.body, fontSize: '0.78rem', color: T.color.muted }}>{t('aluminium2.general.dvPreviewNote')}</Typography>
        </Box>
      )}

      <Accordion elevation={0} sx={{ mt: 2, border: `1px solid ${T.color.lineFaint}`, borderRadius: `${T.radius.md} !important`, '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.9rem', color: T.color.inkSoft }}>{t('aluminium2.general.notSupported')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {al2NotSupportedList().map((item, i) => (
            <Typography key={item} sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted, mb: 0.5 }}>{i + 1}. {item}</Typography>
          ))}
        </AccordionDetails>
      </Accordion>

      <IssueList
        errors={missingOptions && !sourceMeta.question ? [] : errors}
        infos={missingOptions ? [t('aluminium2.general.optionsMissing')] : undefined}
      />
      <NavButtons
        onBack={onBack}
        onNext={() => onSubmit({
          values: {
            [AL2_Q.IMPORT_YEAR]: importYear.trim(),
            [AL2_Q.DATA_SOURCE]: dataSource,
            [AL2_Q.INSTALLATION_REF]: isActual ? installationRef : '',
          },
        })}
        nextDisabled={!canNext}
        saving={saving}
        saveError={saveError}
      />
    </Box>
  );
}
