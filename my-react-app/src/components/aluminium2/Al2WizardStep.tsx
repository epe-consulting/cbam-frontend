import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { T } from '../steel/steelTheme';
import { NavButtons } from '../steel/SteelUi';
import type { QuestionWithOptions } from '../../hooks/useQuestionsByStep';
import {
  getAnswerValuesByCode,
  getMyCompanyInstallations,
  getQuestionIdsByCode,
  replaceRowAnswers,
  replaceValueAnswer,
} from '../../api/ironSteel';
import { parseJsonRows } from '../../utils/steelSteps';
import { AL2_Q, AL2_STEP, type Al2ProcessRow, type Al2ProductRow } from '../../utils/aluminium2Steps';
import { useAl2CnMapping } from '../../hooks/useAluminium2RefData';
import type { Al2Payload, Al2WizardData } from './types';
import { Al2GeneralStep } from './Al2GeneralStep';
import { Al2ProcessesStep } from './Al2ProcessesStep';
import { Al2DirectEmissionsStep } from './Al2DirectEmissionsStep';
import { Al2PfcStep } from './Al2PfcStep';
import { Al2EnergyFlowsStep } from './Al2EnergyFlowsStep';
import { Al2PrecursorsStep } from './Al2PrecursorsStep';
import { Al2ReportingParamsStep } from './Al2ReportingParamsStep';

export interface Al2WizardStepProps {
  calculationId: number;
  stepCode: string;
  questions: QuestionWithOptions[];
  questionsLoading: boolean;
  onBack: () => void;
  /** Called after the step's answers were saved; routes to the next step (backend getNextStep). */
  onAdvance: () => Promise<void>;
}

/**
 * Renders the AL2_* wizard steps (spec §4). Same pattern as Steel/CementWizardStep: loads all saved answers
 * (repeatable rows reload on Back / resume) and saves each repeatable question as delete-then-insert (spec §4.4).
 */
export function Al2WizardStep({ calculationId, stepCode, questions, questionsLoading, onBack, onAdvance }: Al2WizardStepProps) {
  const { t } = useTranslation();
  const { mapping, loading: mappingLoading, error: mappingError } = useAl2CnMapping();
  const [qIds, setQIds] = useState<Record<string, number> | null>(null);
  const [data, setData] = useState<Omit<Al2WizardData, 'mapping'> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setLoadError(null);
    setSaveError(null);
    (async () => {
      try {
        const ids = qIds ?? await getQuestionIdsByCode();
        if (cancelled) return;
        if (!qIds) setQIds(ids);
        const values = await getAnswerValuesByCode(calculationId, ids);
        if (cancelled) return;
        const from = values.CBAM_REPORTING_PERIOD_FROM?.at(-1) ?? '';
        const y = Number(from.slice(0, 4));
        let installations: Awaited<ReturnType<typeof getMyCompanyInstallations>> = [];
        try {
          installations = await getMyCompanyInstallations();
        } catch {
          installations = [];
        }
        if (cancelled) return;
        const ref = values[AL2_Q.INSTALLATION_REF]?.at(-1) ?? '';
        const selected = installations.find((i) => String(i.id) === ref);
        setData({
          values,
          products: parseJsonRows<Al2ProductRow>(values.CBAM_PRODUCT_ENTRY),
          processes: parseJsonRows<Al2ProcessRow>(values[AL2_Q.PROCESS]).map((p) => ({
            ...p, rute: p.rute ?? [], obuhvacene_kategorije: p.obuhvacene_kategorije ?? [], proizvodi: p.proizvodi ?? [],
          })),
          yRep: Number.isFinite(y) && y > 0 ? y : null,
          installations,
          installationCountry: selected?.country?.trim() ?? '',
        });
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('aluminium2.wizard.loadFailed'));
      }
    })();
    return () => { cancelled = true; };
    // qIds is only a cache; reload when the step changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculationId, stepCode]);

  const handleSubmit = useCallback(async (payload: Al2Payload) => {
    if (!qIds) return;
    setSaving(true);
    setSaveError(null);
    try {
      const missing = [...Object.keys(payload.rows ?? {}), ...Object.keys(payload.values ?? {})].filter((c) => qIds[c] == null);
      if (missing.length > 0) throw new Error(t('aluminium2.wizard.questionsMissing', { codes: missing.join(', ') }));
      for (const [code, rows] of Object.entries(payload.rows ?? {})) {
        await replaceRowAnswers(calculationId, qIds[code], rows);
      }
      for (const [code, value] of Object.entries(payload.values ?? {})) {
        await replaceValueAnswer(calculationId, qIds[code], value);
      }
      await onAdvance();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('aluminium2.wizard.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [qIds, calculationId, onAdvance, t]);

  if (loadError) {
    return <Alert severity="error" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>{loadError}</Alert>;
  }
  if (!data || questionsLoading || mappingLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={120}>
        <CircularProgress sx={{ color: T.color.forest }} />
      </Box>
    );
  }
  if (mappingError || mapping.rows.length === 0) {
    return (
      <Box>
        <Alert severity="error" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body, mb: 2 }}>
          {t('aluminium2.wizard.mappingMissing', { error: mappingError ?? '—' })}
        </Alert>
        <NavButtons onBack={onBack} onNext={() => {}} nextDisabled />
      </Box>
    );
  }

  const full: Al2WizardData = { ...data, mapping };
  const props = { data: full, questions, saving, saveError, onBack, onSubmit: handleSubmit };
  const needsProcesses = stepCode !== AL2_STEP.GENERAL && stepCode !== AL2_STEP.PROCESSES;
  if (needsProcesses && full.processes.length === 0) {
    return (
      <Box>
        <Alert severity="warning" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body, mb: 2 }}>
          {t('aluminium2.wizard.noProcesses')}
        </Alert>
        <NavButtons onBack={onBack} onNext={() => {}} nextDisabled />
      </Box>
    );
  }

  switch (stepCode) {
    case AL2_STEP.GENERAL: return <Al2GeneralStep key={stepCode} {...props} />;
    case AL2_STEP.PROCESSES: return <Al2ProcessesStep key={stepCode} {...props} />;
    case AL2_STEP.DIRECT_EMISSIONS: return <Al2DirectEmissionsStep key={stepCode} {...props} />;
    case AL2_STEP.PFC: return <Al2PfcStep key={stepCode} {...props} />;
    case AL2_STEP.ENERGY_FLOWS: return <Al2EnergyFlowsStep key={stepCode} {...props} />;
    case AL2_STEP.PRECURSORS: return <Al2PrecursorsStep key={stepCode} {...props} />;
    case AL2_STEP.REPORTING_PARAMS: return <Al2ReportingParamsStep key={stepCode} {...props} />;
    default: return null;
  }
}
