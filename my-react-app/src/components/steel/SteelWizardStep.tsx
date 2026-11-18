import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import { T } from './steelTheme';
import { NavButtons } from './SteelUi';
import type { QuestionWithOptions } from '../../hooks/useQuestionsByStep';
import {
  getAnswerValuesByCode,
  getMyCompanyInstallations,
  getQuestionIdsByCode,
  replaceRowAnswers,
  replaceValueAnswer,
} from '../../api/ironSteel';
import {
  IS_Q, IS_STEP, parseJsonRows,
  type ProcessRow, type SteelProductRow,
} from '../../utils/steelSteps';
import type { SteelPayload, SteelWizardData } from './types';
import { SteelGeneralStep } from './SteelGeneralStep';
import { SteelProcessesStep } from './SteelProcessesStep';
import { SteelDirectEmissionsStep } from './SteelDirectEmissionsStep';
import { SteelEnergyFlowsStep } from './SteelEnergyFlowsStep';
import { SteelElectricityStep } from './SteelElectricityStep';
import { SteelPrecursorsStep } from './SteelPrecursorsStep';
import { SteelReportingParamsStep } from './SteelReportingParamsStep';
import { useTranslation } from 'react-i18next';

export interface SteelWizardStepProps {
  calculationId: number;
  stepCode: string;
  questions: QuestionWithOptions[];
  questionsLoading: boolean;
  onBack: () => void;
  /** Called after the step's answers were saved; routes to the next step (backend getNextStep). */
  onAdvance: () => Promise<void>;
}

/**
 * Renders the IS_* wizard steps. Loads all saved answers of the calculation (so repeatable rows are
 * reloaded on Back / resume), and saves each repeatable question as delete-then-insert (spec §5.4).
 */
export function SteelWizardStep({ calculationId, stepCode, questions, questionsLoading, onBack, onAdvance }: SteelWizardStepProps) {
  const { t } = useTranslation();
  const [qIds, setQIds] = useState<Record<string, number> | null>(null);
  const [data, setData] = useState<SteelWizardData | null>(null);
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
        // Installation comes from company Settings (IS_INSTALLATION_REF = installation id)
        let installations: Awaited<ReturnType<typeof getMyCompanyInstallations>> = [];
        try {
          installations = await getMyCompanyInstallations();
        } catch {
          installations = [];
        }
        if (cancelled) return;
        const ref = values[IS_Q.INSTALLATION_REF]?.at(-1) ?? '';
        const selected = installations.find((i) => String(i.id) === ref);
        setData({
          values,
          products: parseJsonRows<SteelProductRow>(values.CBAM_PRODUCT_ENTRY),
          processes: parseJsonRows<ProcessRow>(values[IS_Q.PROCESS]),
          yRep: Number.isFinite(y) && y > 0 ? y : null,
          installations,
          installationCountry: selected?.country?.trim() || (values[IS_Q.INSTALLATION_COUNTRY_LEGACY]?.at(-1) ?? ''),
        });
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('steel.wizard.loadFailed'));
      }
    })();
    return () => { cancelled = true; };
    // qIds is only a cache; reload when the step changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculationId, stepCode]);

  const handleSubmit = useCallback(async (payload: SteelPayload) => {
    if (!qIds) return;
    setSaving(true);
    setSaveError(null);
    try {
      const missing = [...Object.keys(payload.rows ?? {}), ...Object.keys(payload.values ?? {})].filter((c) => qIds[c] == null);
      if (missing.length > 0) {
        throw new Error(t('steel.wizard.questionsMissing', { codes: missing.join(', ') }));
      }
      for (const [code, rows] of Object.entries(payload.rows ?? {})) {
        await replaceRowAnswers(calculationId, qIds[code], rows);
      }
      for (const [code, value] of Object.entries(payload.values ?? {})) {
        await replaceValueAnswer(calculationId, qIds[code], value);
      }
      await onAdvance();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('steel.wizard.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [qIds, calculationId, onAdvance, t]);

  if (loadError) {
    return <Alert severity="error" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>{loadError}</Alert>;
  }
  if (!data || questionsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={120}>
        <CircularProgress sx={{ color: T.color.forest }} />
      </Box>
    );
  }

  const props = { data, questions, saving, saveError, onBack, onSubmit: handleSubmit };
  const needsProcesses = stepCode !== IS_STEP.GENERAL && stepCode !== IS_STEP.PROCESSES;
  if (needsProcesses && data.processes.length === 0) {
    return (
      <Box>
        <Alert severity="warning" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body, mb: 2 }}>
          {t('steel.wizard.noProcesses')}
        </Alert>
        <NavButtons onBack={onBack} onNext={() => {}} nextDisabled />
      </Box>
    );
  }

  // key = stepCode so each step mounts with freshly loaded rows
  switch (stepCode) {
    case IS_STEP.GENERAL: return <SteelGeneralStep key={stepCode} {...props} />;
    case IS_STEP.PROCESSES: return <SteelProcessesStep key={stepCode} {...props} />;
    case IS_STEP.DIRECT_EMISSIONS: return <SteelDirectEmissionsStep key={stepCode} {...props} />;
    case IS_STEP.ENERGY_FLOWS: return <SteelEnergyFlowsStep key={stepCode} {...props} />;
    case IS_STEP.ELECTRICITY: return <SteelElectricityStep key={stepCode} {...props} />;
    case IS_STEP.PRECURSORS: return <SteelPrecursorsStep key={stepCode} {...props} />;
    case IS_STEP.REPORTING_PARAMS: return <SteelReportingParamsStep key={stepCode} {...props} />;
    default: return null;
  }
}
