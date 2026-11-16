import type { QuestionWithOptions } from '../../hooks/useQuestionsByStep';
import type { ProcessRow, SteelProductRow } from '../../utils/steelSteps';
import type { CompanyInstallation } from '../../api/ironSteel';

/** Saved answers available to every steel step (loaded from calculation_answer). */
export interface SteelWizardData {
  /** Raw stored values by question code (every row of repeatable questions). */
  values: Record<string, string[]>;
  products: SteelProductRow[];
  processes: ProcessRow[];
  /** Year of CBAM_REPORTING_PERIOD_FROM. */
  yRep: number | null;
  /** Installations of the user's company from Settings. */
  installations: CompanyInstallation[];
  /** Country of the selected Settings installation (or legacy free-text answer). */
  installationCountry: string;
}

/** What a step hands back on Next: rows per repeatable question and/or single values. */
export interface SteelPayload {
  rows?: Record<string, object[]>;
  values?: Record<string, string>;
}

export interface SteelStepProps {
  data: SteelWizardData;
  questions: QuestionWithOptions[];
  saving: boolean;
  saveError: string | null;
  onBack: () => void;
  onSubmit: (payload: SteelPayload) => void;
}

export function questionMeta(questions: QuestionWithOptions[], code: string, fallbackLabel: string, fallbackHelp?: string) {
  const q = questions.find((x) => x.code === code);
  return { label: q?.label || fallbackLabel, help: q?.helpText || fallbackHelp || '', question: q };
}
