import { apiRequest } from '../utils/api';
import { tr } from '../i18n';

/*
 * Monitoring plan ("Plan praćenja") API, backend MonitoringPlanController (/monitoring-plans).
 * Shapes mirror the backend records (MpRecords, MpApplicabilityEngine.QuestionState,
 * MpBoundaryChecker.Issue, MpDiagramBuilder.Diagram, MpPlanLogic.Diff / ConfirmBlocker).
 * Field values are free JSON: their shape depends on the field (see components/monitoringPlan/mpFields.ts).
 */

export type MpJson = null | string | number | boolean | MpJson[] | { [k: string]: MpJson };

export type MpOrigin = 'APP' | 'SUGGESTION' | 'USER';
export type MpStatus = 'ASK' | 'CONFIRM' | 'CONFLICT' | 'DONE' | 'NOT_APPLICABLE';
export type MpGroup =
  | 'INSTALLATION_PRODUCTS'
  | 'PROCESSES_BOUNDARIES'
  | 'MATERIALS_PRECURSORS'
  | 'SOURCES_METHODS'
  | 'CONTROLS'
  | 'REVIEW';
export type MpPlanStatus = 'DRAFT' | 'INTERNALLY_CONFIRMED';

export interface MpSourceRef {
  type: string;
  id: number | null;
  code: string | null;
  label: string | null;
}

export interface MpConflictValue {
  value: MpJson;
  sources: MpSourceRef[];
}

export interface MpField {
  key: string;
  /** Enum name of the A.5 element, e.g. "E03". */
  element: string;
  value: MpJson;
  origin: MpOrigin;
  sources: MpSourceRef[];
  confirmed: boolean;
  conflict: boolean;
  conflicts: MpConflictValue[];
}

export interface MpQuestion {
  key: string;
  element: number;
  group: MpGroup;
  status: MpStatus;
  required: boolean;
  appData: boolean;
  /** Source of the applicability rule (regulation reference, English). */
  reason: string | null;
}

export interface MpIssue {
  code: string;
  severity: 'ERROR' | 'WARNING';
  subject: string;
  source: string;
}

export interface MpLink {
  key: string;
  from: string;
  to: string;
  type: string;
  material: string | null;
  cnCode: string | null;
  origin: MpOrigin;
  sources: MpSourceRef[];
  confirmed: boolean;
}

export interface MpDiagram {
  nodes: { id: string; kind: string; label: string }[];
  edges: { from: string; to: string; type: string; material: string | null }[];
  unconfirmedLinks: number;
}

export interface MpPlanRow {
  id: number;
  companyId: number;
  installationId: number;
  status: MpPlanStatus;
  versionNo: number;
  ruleVersion: string;
  createdAt?: string;
  modifiedAt?: string;
}

export interface MpPlanView {
  plan: MpPlanRow;
  verificationNote: string;
  fields: MpField[];
  questions: MpQuestion[];
  issues: MpIssue[];
  links: MpLink[];
  diagram: MpDiagram;
  usedCalculationIds: number[];
  linkedCalculationIds: number[];
  versions: number[];
}

export interface MpPatch {
  key: string;
  /** Omitted = keep the value. */
  value?: MpJson;
  /** Omitted = keep the confirmation. */
  confirmed?: boolean;
}

export interface MpBlocker {
  code: string;
  subject: string;
}

export interface MpVersionRow {
  id: number;
  planId: number;
  versionNo: number;
  ruleVersion: string;
  snapshotJson: string;
  confirmedByUserId: number | null;
  confirmedAt: string;
}

export interface MpDiff {
  key: string;
  element: number;
  change: 'ADDED' | 'REMOVED' | 'CHANGED';
  before: MpJson;
  after: MpJson;
}

type Envelope<K extends string, T> = { success: boolean; message?: string } & { [P in K]?: T };

async function call<K extends string, T>(key: K, endpoint: string, init?: RequestInit): Promise<T> {
  const res = await apiRequest<Envelope<K, T>>(endpoint, init);
  if (res === null) throw new Error(tr('err.session'));
  if (!res.data.success || res.data[key] === undefined) {
    throw new Error(res.data.message || tr('mp.err.request'));
  }
  return res.data[key] as T;
}

const creating = new Map<number, Promise<MpPlanView>>();

/**
 * "Kreiraj plan": creates a prefilled draft, or resumes the installation's existing plan.
 * Calls for the same installation that overlap share one request, so a double click (or React's
 * dev double effect) cannot create two plans.
 */
export function createOrResumePlan(installationId: number): Promise<MpPlanView> {
  const running = creating.get(installationId);
  if (running) return running;
  const p = call<'plan', MpPlanView>('plan', `/monitoring-plans/installation/${installationId}`, { method: 'POST' })
    .finally(() => creating.delete(installationId));
  creating.set(installationId, p);
  return p;
}

export function listPlans(installationId: number): Promise<MpPlanRow[]> {
  return call('plans', `/monitoring-plans/installation/${installationId}`);
}

export function getPlan(planId: number): Promise<MpPlanView> {
  return call('plan', `/monitoring-plans/${planId}`);
}

/** Autosave: only the changed fields. */
export function savePlanFields(planId: number, changes: MpPatch[]): Promise<MpPlanView> {
  return call('plan', `/monitoring-plans/${planId}/fields`, {
    method: 'PATCH',
    body: JSON.stringify({ changes }),
  });
}

export function confirmPlanLinks(planId: number, keys: string[], confirmed: boolean): Promise<MpPlanView> {
  return call('plan', `/monitoring-plans/${planId}/links/confirm`, {
    method: 'POST',
    body: JSON.stringify({ keys, confirmed }),
  });
}

/** Documented link to a calculation of the same company (e.g. old aluminium calculations without a site). */
export function linkPlanCalculation(planId: number, calculationId: number, note: string): Promise<MpPlanView> {
  return call('plan', `/monitoring-plans/${planId}/calculation-links`, {
    method: 'POST',
    body: JSON.stringify({ calculationId, note }),
  });
}

/** Re-reads the app data; user values are never overwritten (backend MpPlanLogic.mergeRefresh). */
export function refreshPlan(planId: number): Promise<MpPlanView> {
  return call('plan', `/monitoring-plans/${planId}/refresh`, { method: 'POST' });
}

export type ConfirmResult = { ok: true; view: MpPlanView } | { ok: false; message: string; blockers: MpBlocker[] };

/** "Interno potvrđen". On HTTP 409 the backend returns the open items that block the confirmation. */
export async function confirmPlan(planId: number): Promise<ConfirmResult> {
  const res = await apiRequest<Envelope<'plan', MpPlanView> & { blockers?: MpBlocker[] }>(
    `/monitoring-plans/${planId}/confirm`,
    { method: 'POST' }
  );
  if (res === null) throw new Error(tr('err.session'));
  if (res.data.success && res.data.plan) return { ok: true, view: res.data.plan };
  return { ok: false, message: res.data.message ?? tr('mp.err.request'), blockers: res.data.blockers ?? [] };
}

export function listPlanVersions(planId: number): Promise<MpVersionRow[]> {
  return call('versions', `/monitoring-plans/${planId}/versions`);
}

/** to = 0 compares with the current draft. */
export function comparePlan(planId: number, from: number, to = 0): Promise<MpDiff[]> {
  return call('changes', `/monitoring-plans/${planId}/compare?from=${from}&to=${to}`);
}

export interface MpCompanyCalculation {
  id: number;
  status: string;
  modifiedAt?: string;
}

/** Calculations of the user's own company (for the documented calculation link). */
export async function listCompanyCalculations(companyId: number): Promise<MpCompanyCalculation[]> {
  return call('calculations', `/calculations/company/${companyId}`);
}
