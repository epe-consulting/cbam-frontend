import type { QuestionWithOptions } from '../../hooks/useQuestionsByStep';
import type { CompanyInstallation } from '../../api/ironSteel';
import type { Al2CnMapping, Al2ProcessRow, Al2ProductRow } from '../../utils/aluminium2Steps';
import type { SteelPayload } from '../steel/types';

/** Saved answers available to every Aluminium II step (loaded from calculation_answer). */
export interface Al2WizardData {
  values: Record<string, string[]>;
  products: Al2ProductRow[];
  processes: Al2ProcessRow[];
  /** Year of CBAM_REPORTING_PERIOD_FROM. */
  yRep: number | null;
  installations: CompanyInstallation[];
  /** Country of the selected Settings installation (AL2_INSTALLATION_REF). */
  installationCountry: string;
  /** GET /al2/cn-mapping (14 headings + suggestions + excluded headings). */
  mapping: Al2CnMapping;
}

export type Al2Payload = SteelPayload;

export interface Al2StepProps {
  data: Al2WizardData;
  questions: QuestionWithOptions[];
  saving: boolean;
  saveError: string | null;
  onBack: () => void;
  onSubmit: (payload: Al2Payload) => void;
}

export { questionMeta } from '../steel/types';
