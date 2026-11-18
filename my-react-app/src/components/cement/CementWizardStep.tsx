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
import { CE_Q, CE_STEP, type CeProcessRow, type CeProductRow } from '../../utils/cementSteps';
import { useCeCnMapping } from '../../hooks/useCementRefData';
import type { CementPayload, CementWizardData } from './types';
import { CementGeneralStep } from './CementGeneralStep';
import { CementProcessesStep } from './CementProcessesStep';
import { CementDirectEmissionsStep } from './CementDirectEmissionsStep';
import { CementEnergyFlowsStep } from './CementEnergyFlowsStep';
import { CementElectricityStep } from './CementElectricityStep';
import { CementPrecursorsStep } from './CementPrecursorsStep';

export interface CementWizardStepProps {
  calculationId: number;
  stepCode: string;
  questions: QuestionWithOptions[];
  questionsLoading: boolean;
  onBack: () => void;
  /** Called after the step's answers were saved; routes to the next step (backend getNextStep). */
  onAdvance: () => Promise<void>;
}

/**
 * Renders the CE_* wizard steps (spec §4). Same pattern as SteelWizardStep: loads all saved answers (repeatable rows
 * reload on Back / resume) and saves each repeatable question as delete-then-insert (spec §4.4 conventions).
 */
export function CementWizardStep({ calculationId, stepCode, questions, questionsLoading, onBack, onAdvance }: CementWizardStepProps) {
  const { t } = useTranslation();
  const { rows: mapping, loading: mappingLoading, error: mappingError } = useCeCnMapping();
  const [qIds, setQIds] = useState<Record<string, number> | null>(null);
  const [data, setData] = useState<Omit<CementWizardData, 'mapping'> | null>(null);
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
        const ref = values[CE_Q.INSTALLATION_REF]?.at(-1) ?? '';
        const selected = installations.find((i) => String(i.id) === ref);
        setData({
          values,
          products: parseJsonRows<CeProductRow>(values.CBAM_PRODUCT_ENTRY),
          processes: parseJsonRows<CeProcessRow>(values[CE_Q.PROCESS]).map((p) => ({
            ...p, obuhvacene_kategorije: p.obuhvacene_kategorije ?? [], proizvodi: p.proizvodi ?? [],
          })),
          yRep: Number.isFinite(y) && y > 0 ? y : null,
          installations,
          installationCountry: selected?.country?.trim() ?? '',
        });
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('cement.wizard.loadFailed'));
      }
    })();
    return () => { cancelled = true; };
    // qIds is only a cache; reload when the step changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculationId, stepCode]);

  const handleSubmit = useCallback(async (payload: CementPayload) => {
    if (!qIds) return;
    setSaving(true);
    setSaveError(null);
    try {
      const missing = [...Object.keys(payload.rows ?? {}), ...Object.keys(payload.values ?? {})].filter((c) => qIds[c] == null);
      if (missing.length > 0) throw new Error(t('cement.wizard.questionsMissing', { codes: missing.join(', ') }));
      for (const [code, rows] of Object.entries(payload.rows ?? {})) {
        await replaceRowAnswers(calculationId, qIds[code], rows);
      }
      for (const [code, value] of Object.entries(payload.values ?? {})) {
        await replaceValueAnswer(calculationId, qIds[code], value);
      }
      await onAdvance();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('cement.wizard.saveFailed'));
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
  if (mappingError || mapping.length === 0) {
    return (
      <Box>
        <Alert severity="error" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body, mb: 2 }}>
          {t('cement.wizard.mappingMissing', { error: mappingError ?? '—' })}
        </Alert>
        <NavButtons onBack={onBack} onNext={() => {}} nextDisabled />
      </Box>
    );
  }

  const full: CementWizardData = { ...data, mapping };
  const props = { data: full, questions, saving, saveError, onBack, onSubmit: handleSubmit };
  const needsProcesses = stepCode !== CE_STEP.GENERAL && stepCode !== CE_STEP.PROCESSES;
  if (needsProcesses && full.processes.length === 0) {
    return (
      <Box>
        <Alert severity="warning" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body, mb: 2 }}>
          {t('cement.wizard.noProcesses')}
        </Alert>
        <NavButtons onBack={onBack} onNext={() => {}} nextDisabled />
      </Box>
    );
  }

  switch (stepCode) {
    case CE_STEP.GENERAL: return <CementGeneralStep key={stepCode} {...props} />;
    case CE_STEP.PROCESSES: return <CementProcessesStep key={stepCode} {...props} />;
    case CE_STEP.DIRECT_EMISSIONS: return <CementDirectEmissionsStep key={stepCode} {...props} />;
    case CE_STEP.ENERGY_FLOWS: return <CementEnergyFlowsStep key={stepCode} {...props} />;
    case CE_STEP.ELECTRICITY: return <CementElectricityStep key={stepCode} {...props} />;
    case CE_STEP.PRECURSORS: return <CementPrecursorsStep key={stepCode} {...props} />;
    default: return null;
  }
}
