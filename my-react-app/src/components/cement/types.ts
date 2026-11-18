import type { QuestionWithOptions } from '../../hooks/useQuestionsByStep';
import type { CompanyInstallation } from '../../api/ironSteel';
import type { CeCnMappingRow, CeProcessRow, CeProductRow } from '../../utils/cementSteps';
import type { SteelPayload } from '../steel/types';

/** Saved answers available to every cement step (loaded from calculation_answer). */
export interface CementWizardData {
  values: Record<string, string[]>;
  products: CeProductRow[];
  processes: CeProcessRow[];
  /** Year of CBAM_REPORTING_PERIOD_FROM. */
  yRep: number | null;
  installations: CompanyInstallation[];
  /** Country of the selected Settings installation (CE_INSTALLATION_REF). */
  installationCountry: string;
  /** GET /ce/cn-mapping rows (6 cement CN codes). */
  mapping: CeCnMappingRow[];
}

export type CementPayload = SteelPayload;

export interface CementStepProps {
  data: CementWizardData;
  questions: QuestionWithOptions[];
  saving: boolean;
  saveError: string | null;
  onBack: () => void;
  onSubmit: (payload: CementPayload) => void;
}

export { questionMeta } from '../steel/types';
