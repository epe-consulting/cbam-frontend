import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  MenuItem, Switch, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { CheckCircleOutline, Download, Refresh, Link as LinkIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import {
  comparePlan, confirmPlan, confirmPlanLinks, linkPlanCalculation, listCompanyCalculations, listPlanVersions, refreshPlan,
  type MpBlocker, type MpCompanyCalculation, type MpDiff, type MpGroup, type MpJson, type MpPlanView, type MpVersionRow,
} from '../../api/monitoringPlan';
import { apiRequest } from '../../utils/api';
import { T, outlinedButtonSx, textFieldSx } from '../steel/steelTheme';
import QuestionCard from './QuestionCard';
import MpDiagramView from './MpDiagramView';
import { exportDocx, exportPdf } from './mpExport';
import { draftModel, parseSnapshot, versionModel } from './mpExportModel';
import { useMpAutosave } from './useMpAutosave';
import {
  MP_GROUPS, type NodeTl, fieldLabelKey, firstOpenGroup, groupProgress, isOpen, nodeLabel, questionsOfGroup, summarize,
} from './mpFields';

const primaryBtn = {
  fontFamily: T.font.body, fontWeight: 600, textTransform: 'none' as const, bgcolor: T.color.forest,
  borderRadius: T.radius.pill, px: 3, '&:hover': { bgcolor: T.color.ctaHover },
};

export default function MonitoringPlanWizard({ initial }: { initial: MpPlanView }) {
  const { t } = useTranslation();
  const { view, state, error, change, flush, replace } = useMpAutosave(initial);
  const [group, setGroup] = useState<MpGroup>(() => firstOpenGroup(initial.questions));
  const [showNa, setShowNa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<MpBlocker[] | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const planId = view.plan.id;

  const fieldMap = useMemo(() => new Map(view.fields.map((f) => [f.key, f])), [view.fields]);
  const questions = questionsOfGroup(view.questions, group, showNa);
  const openQuestions = view.questions.filter(isOpen);
  const confirmed = view.plan.status === 'INTERNALLY_CONFIRMED';

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await flush();
      await fn();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onValue = (key: string, value: MpJson) => change([{ key, value }]);
  const onConfirm = (key: string, c: boolean) => change([{ key, confirmed: c }]);

  const goTo = (key: string) => {
    const q = view.questions.find((x) => x.key === key);
    if (!q) return;
    setGroup(q.group);
    setTimeout(() => document.getElementById(`mp-q-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  return (
    <Box>
      {/* Status bar */}
      <Box display="flex" flexWrap="wrap" alignItems="center" gap={1} mb={2}>
        <Chip
          icon={confirmed ? <CheckCircleOutline /> : undefined}
          label={t(`mp.planStatus.${view.plan.status}`)}
          sx={{ fontFamily: T.font.body, fontWeight: 600, bgcolor: confirmed ? T.color.mint : '#F4E8C9', color: confirmed ? T.color.forest : '#8A6A20' }}
        />
        <Chip label={t('mp.versionNo', { n: view.plan.versionNo })} sx={{ fontFamily: T.font.body, bgcolor: T.color.lineFaint }} />
        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.8rem', color: T.color.muted, flexGrow: 1 }}>
          {t(`mp.save.${state}`)}
        </Typography>
        <Button size="small" startIcon={<Refresh />} disabled={busy} sx={outlinedButtonSx} variant="outlined"
          onClick={() => run(async () => replace(await refreshPlan(planId)))}>
          {t('mp.refresh')}
        </Button>
        <Button size="small" startIcon={<LinkIcon />} disabled={busy} sx={outlinedButtonSx} variant="outlined" onClick={() => setLinkOpen(true)}>
          {t('mp.linkCalc')}
        </Button>
      </Box>
      <Alert severity="info" sx={{ mb: 2, fontFamily: T.font.body }}>{t('mp.verificationNote')}</Alert>
      {confirmed && <Alert severity="success" sx={{ mb: 2, fontFamily: T.font.body }}>{t('mp.confirmedEditHint')}</Alert>}
      {(error || actionError) && <Alert severity="error" sx={{ mb: 2 }}>{error ?? actionError}</Alert>}

      <Tabs value={group} onChange={(_, g) => setGroup(g)} variant="scrollable" scrollButtons="auto"
        sx={{ mb: 2, '& .MuiTab-root': { fontFamily: T.font.body, textTransform: 'none', fontWeight: 600 } }}>
        {MP_GROUPS.map((g, i) => {
          const p = groupProgress(view.questions, g);
          return (
            <Tab key={g} value={g} label={
              <Box display="flex" alignItems="center" gap={0.8}>
                <span>{i + 1}. {t(`mp.group.${g}`)}</span>
                {p.open > 0 && <Chip size="small" label={p.open} sx={{ height: 18, fontSize: '0.7rem', bgcolor: '#F4E8C9' }} />}
              </Box>
            } />
          );
        })}
      </Tabs>

      <FormControlLabel
        control={<Switch size="small" checked={showNa} onChange={(e) => setShowNa(e.target.checked)} />}
        label={<Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>{t('mp.showNa')}</Typography>}
        sx={{ mb: 1 }}
      />

      {questions.map((q) => (
        <QuestionCard key={q.key} question={q} field={fieldMap.get(q.key)} onValue={onValue} onConfirm={onConfirm} />
      ))}

      {group === 'PROCESSES_BOUNDARIES' && (
        <LinksPanel view={view} busy={busy}
          onConfirm={(keys, c) => run(async () => replace(await confirmPlanLinks(planId, keys, c)))} />
      )}

      {group === 'REVIEW' && (
        <ReviewPanel
          view={view} busy={busy} blockers={blockers} openCount={openQuestions.length} goTo={goTo}
          onConfirm={() => run(async () => {
            const r = await confirmPlan(planId);
            if (r.ok) {
              setBlockers(null);
              replace(r.view);
            } else {
              setBlockers(r.blockers);
              setActionError(r.message);
            }
          })}
        />
      )}

      <LinkCalculationDialog open={linkOpen} view={view} onClose={() => setLinkOpen(false)}
        onLink={(id, note) => run(async () => {
          replace(await linkPlanCalculation(planId, id, note));
          setLinkOpen(false);
        })} />
    </Box>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ mb: 2, p: 2.5, borderRadius: T.radius.md, bgcolor: T.color.warmWhite, border: `1px solid ${T.color.lineFaint}` }}>
      <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.02rem', color: T.color.ink, mb: 1.2 }}>{title}</Typography>
      {children}
    </Box>
  );
}

function LinksPanel({ view, busy, onConfirm }: { view: MpPlanView; busy: boolean; onConfirm: (keys: string[], c: boolean) => void }) {
  const { t } = useTranslation();
  const tl = (k: string, fallback: string) => t(k, { defaultValue: fallback });
  const unconfirmed = view.links.filter((l) => !l.confirmed).map((l) => l.key);
  return (
    <Section title={t('mp.links.title')}>
      <Typography sx={{ fontFamily: T.font.body, fontSize: '0.84rem', color: T.color.muted, mb: 1.5 }}>{t('mp.links.help')}</Typography>
      {view.links.length === 0 && <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem' }}>{t('mp.links.none')}</Typography>}
      {view.links.map((l) => (
        <Box key={l.key} display="flex" alignItems="center" gap={1} py={0.8} sx={{ borderBottom: `1px solid ${T.color.lineFaint}` }}>
          <Box flexGrow={1}>
            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.ink }}>
              {nodeLabel(l.from, tl)} → {nodeLabel(l.to, tl)}
              {l.material && <Box component="span" sx={{ color: T.color.muted }}> · {l.material}{l.cnCode ? ` (${l.cnCode})` : ''}</Box>}
            </Typography>
            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.75rem', color: T.color.muted }}>
              {t(`mp.flow.${l.type}`, { defaultValue: l.type })} · {t(`mp.badge.${l.origin}`)}
            </Typography>
          </Box>
          <FormControlLabel disabled={busy}
            control={<Switch size="small" checked={l.confirmed} onChange={(e) => onConfirm([l.key], e.target.checked)} />}
            label={<Typography sx={{ fontFamily: T.font.body, fontSize: '0.82rem' }}>{t('mp.links.confirmed')}</Typography>} />
        </Box>
      ))}
      {unconfirmed.length > 1 && (
        <Button size="small" disabled={busy} sx={{ ...outlinedButtonSx, mt: 1.5 }} variant="outlined" onClick={() => onConfirm(unconfirmed, true)}>
          {t('mp.links.confirmAll', { n: unconfirmed.length })}
        </Button>
      )}
      <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '0.95rem', color: T.color.ink, mt: 2.5, mb: 1 }}>
        {t('mp.diagram.title')}
      </Typography>
      <MpDiagramView diagram={view.diagram} />
    </Section>
  );
}

function ReviewPanel({
  view, busy, blockers, openCount, goTo, onConfirm,
}: {
  view: MpPlanView; busy: boolean; blockers: MpBlocker[] | null; openCount: number;
  goTo: (key: string) => void; onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const open = view.questions.filter(isOpen);
  const errors = view.issues.filter((i) => i.severity === 'ERROR');
  const warnings = view.issues.filter((i) => i.severity === 'WARNING');
  const confirmed = view.plan.status === 'INTERNALLY_CONFIRMED';
  const [from, setFrom] = useState<number | ''>('');
  const [to, setTo] = useState<number>(0);
  const [diff, setDiff] = useState<MpDiff[] | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);

  useEffect(() => {
    setDiff(null);
  }, [view.plan.versionNo, from, to]);

  return (
    <>
      <Section title={t('mp.review.openTitle', { n: openCount })}>
        {open.length === 0 && <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.forest }}>{t('mp.review.noOpen')}</Typography>}
        {open.map((q) => (
          <Box key={q.key} display="flex" alignItems="center" gap={1} py={0.5}>
            <Chip size="small" label={t(`mp.status.${q.status}`)} sx={{ height: 20, fontSize: '0.7rem' }} />
            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.86rem', flexGrow: 1 }}>
              {t('mp.elementShort', { n: q.element })} · {t(fieldLabelKey(q.key))}{q.required ? ' *' : ''}
            </Typography>
            <Button size="small" sx={{ textTransform: 'none', fontFamily: T.font.body }} onClick={() => goTo(q.key)}>{t('mp.review.open')}</Button>
          </Box>
        ))}
      </Section>

      {(errors.length > 0 || warnings.length > 0) && (
        <Section title={t('mp.review.issuesTitle')}>
          {[...errors, ...warnings].map((i, n) => (
            <Alert key={n} severity={i.severity === 'ERROR' ? 'error' : 'warning'} sx={{ mb: 1, fontFamily: T.font.body }}>
              {t(`mp.issue.${i.code}`, { defaultValue: i.code })}: <strong>{i.subject}</strong>
              <Box component="span" sx={{ display: 'block', fontSize: '0.75rem', opacity: 0.8 }}>{t('mp.ruleSource')}: {i.source}</Box>
            </Alert>
          ))}
        </Section>
      )}

      <Section title={t('mp.review.confirmTitle')}>
        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.86rem', color: T.color.inkSoft, mb: 1.5 }}>
          {confirmed ? t('mp.review.alreadyConfirmed', { n: view.plan.versionNo }) : t('mp.review.confirmHelp')}
        </Typography>
        {blockers && blockers.length > 0 && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.85rem', mb: 0.5 }}>{t('mp.review.blockers')}</Typography>
            {blockers.map((b, i) => (
              <Box key={i} sx={{ fontSize: '0.8rem' }}>
                {t(`mp.blocker.${b.code.replace(/^BOUNDARY_.*/, 'BOUNDARY').replace(/^QUESTION_.*/, 'QUESTION')}`)}:{' '}
                {blockerSubject(b, view, (k) => t(k), (k, f) => t(k, { defaultValue: f }))}
              </Box>
            ))}
          </Alert>
        )}
        <Button variant="contained" disableElevation disabled={busy || confirmed} sx={primaryBtn} onClick={onConfirm}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutline />}>
          {t('mp.review.confirmButton')}
        </Button>
      </Section>

      <ExportSection view={view} busy={busy} />

      <Section title={t('mp.review.versionsTitle')}>
        {view.versions.length === 0 ? (
          <Typography sx={{ fontFamily: T.font.body, fontSize: '0.86rem', color: T.color.muted }}>{t('mp.review.noVersions')}</Typography>
        ) : (
          <Box display="flex" flexWrap="wrap" gap={1} alignItems="center">
            <TextField select size="small" label={t('mp.review.compareFrom')} value={from} sx={{ ...textFieldSx, minWidth: 180 }}
              onChange={(e) => setFrom(Number(e.target.value))}>
              {view.versions.map((v) => <MenuItem key={v} value={v}>{t('mp.versionNo', { n: v })}</MenuItem>)}
            </TextField>
            <TextField select size="small" label={t('mp.review.compareTo')} value={to} sx={{ ...textFieldSx, minWidth: 180 }}
              onChange={(e) => setTo(Number(e.target.value))}>
              <MenuItem value={0}>{t('mp.review.currentDraft')}</MenuItem>
              {view.versions.filter((v) => from === '' || v > from).map((v) => <MenuItem key={v} value={v}>{t('mp.versionNo', { n: v })}</MenuItem>)}
            </TextField>
            <Button variant="outlined" sx={outlinedButtonSx} disabled={from === ''}
              onClick={async () => {
                setDiffError(null);
                try {
                  setDiff(await comparePlan(view.plan.id, Number(from), to));
                } catch (e) {
                  setDiffError(e instanceof Error ? e.message : String(e));
                }
              }}>
              {t('mp.review.compare')}
            </Button>
          </Box>
        )}
        {diffError && <Alert severity="error" sx={{ mt: 1 }}>{diffError}</Alert>}
        {diff && (
          <Box mt={1.5}>
            {diff.length === 0 && <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem' }}>{t('mp.review.noChanges')}</Typography>}
            {diff.map((d) => (
              <Box key={d.key} py={0.8} sx={{ borderBottom: `1px solid ${T.color.lineFaint}` }}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Chip size="small" label={t(`mp.change.${d.change}`)} sx={{ height: 20, fontSize: '0.7rem', bgcolor: CHANGE_BG[d.change] }} />
                  <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', fontWeight: 600 }}>
                    {t('mp.elementShort', { n: d.element })} · {t(fieldLabelKey(d.key), { defaultValue: d.key })}
                  </Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
                  {(['before', 'after'] as const).map((side) => (
                    <Box key={side} sx={{ p: 1, borderRadius: T.radius.sm, bgcolor: side === 'before' ? '#FDF3F2' : '#EEF8F3' }}>
                      <Typography sx={{ fontFamily: T.font.body, fontSize: '0.7rem', color: T.color.muted }}>
                        {side === 'before' ? t('mp.versionNo', { n: from }) : (to === 0 ? t('mp.review.currentDraft') : t('mp.versionNo', { n: to }))}
                      </Typography>
                      <Typography sx={{ fontFamily: T.font.mono, fontSize: '0.75rem', color: T.color.inkSoft, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {summarize(d[side], 600)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Section>
    </>
  );
}

const CHANGE_BG: Record<string, string> = { ADDED: '#E8F5EF', REMOVED: '#FDEDEC', CHANGED: '#F4E8C9' };

function ExportSection({ view, busy }: { view: MpPlanView; busy: boolean }) {
  const { t } = useTranslation();
  const [running, setRunning] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [versions, setVersions] = useState<MpVersionRow[] | null>(null);

  useEffect(() => {
    if (view.versions.length === 0) {
      setVersions([]);
      return;
    }
    listPlanVersions(view.plan.id).then(setVersions, (e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [view.plan.id, view.versions.length]);

  const go = async (id: string, fn: () => Promise<void>) => {
    setRunning(id);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(null);
    }
  };
  const today = new Date().toISOString().slice(0, 10);
  const draft = () => draftModel(view, today);
  const btn = (id: string, label: string, fn: () => Promise<void>) => (
    <Button key={id} variant="outlined" size="small" sx={outlinedButtonSx} disabled={busy || running !== null}
      startIcon={running === id ? <CircularProgress size={14} /> : <Download />} onClick={() => go(id, fn)}>
      {label}
    </Button>
  );
  const open = view.questions.filter(isOpen).length;

  return (
    <Section title={t('mp.export.sectionTitle')}>
      <Typography sx={{ fontFamily: T.font.body, fontSize: '0.84rem', color: T.color.muted, mb: 1.5 }}>{t('mp.export.englishHint')}</Typography>
      <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', fontWeight: 600, mb: 1 }}>
        {t('mp.export.draftTitle', { n: view.plan.versionNo, open })}
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
        {btn('draft-pdf', t('mp.export.pdf'), () => exportPdf(draft()))}
        {btn('draft-docx', t('mp.export.docx'), () => exportDocx(draft()))}
      </Box>
      {versions && versions.length > 0 && (
        <>
          <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', fontWeight: 600, mb: 1 }}>{t('mp.export.confirmedTitle')}</Typography>
          {versions.map((v) => (
            <Box key={v.versionNo} display="flex" flexWrap="wrap" alignItems="center" gap={1} mb={1}>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.86rem', minWidth: 190 }}>
                {t('mp.versionNo', { n: v.versionNo })} · {v.confirmedAt?.slice(0, 10)}
              </Typography>
              {btn(`v${v.versionNo}-pdf`, t('mp.export.pdf'), () => exportPdf(versionModel(parseSnapshot(v.snapshotJson))))}
              {btn(`v${v.versionNo}-docx`, t('mp.export.docx'), () => exportDocx(versionModel(parseSnapshot(v.snapshotJson))))}
            </Box>
          ))}
        </>
      )}
      {err && <Alert severity="error" sx={{ mt: 1 }}>{err}</Alert>}
    </Section>
  );
}

function blockerSubject(b: MpBlocker, view: MpPlanView, label: (k: string) => string, tl: NodeTl): string {
  if (b.code.startsWith('QUESTION_')) return label(fieldLabelKey(b.subject));
  const link = b.code === 'LINK_UNCONFIRMED' ? view.links.find((l) => l.key === b.subject) : undefined;
  return link ? `${nodeLabel(link.from, tl)} → ${nodeLabel(link.to, tl)}${link.material ? ` (${link.material})` : ''}` : b.subject;
}

function LinkCalculationDialog({
  open, view, onClose, onLink,
}: { open: boolean; view: MpPlanView; onClose: () => void; onLink: (id: number, note: string) => void }) {
  const { t } = useTranslation();
  const [calcs, setCalcs] = useState<MpCompanyCalculation[] | null>(null);
  const [calcId, setCalcId] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    void (async () => {
      try {
        // Only the plan's own company; the backend checks this again (MonitoringPlanService.linkCalculation).
        const me = await apiRequest<{ success: boolean; user?: { companyId: number | null } }>('/users/me');
        const companyId = me?.data?.user?.companyId ?? view.plan.companyId;
        const all = await listCompanyCalculations(companyId);
        setCalcs(all.filter((c) => !view.usedCalculationIds.includes(c.id) && !view.linkedCalculationIds.includes(c.id)));
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [open, view.plan.companyId, view.usedCalculationIds, view.linkedCalculationIds]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontFamily: T.font.display }}>{t('mp.linkDialog.title')}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.86rem', color: T.color.muted, mb: 2 }}>{t('mp.linkDialog.help')}</Typography>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        {calcs === null && !err && <CircularProgress size={22} />}
        {calcs && calcs.length === 0 && <Typography sx={{ fontFamily: T.font.body, fontSize: '0.86rem' }}>{t('mp.linkDialog.none')}</Typography>}
        {calcs && calcs.length > 0 && (
          <TextField select fullWidth size="small" label={t('mp.linkDialog.calc')} value={calcId} sx={{ ...textFieldSx, mb: 2 }}
            onChange={(e) => setCalcId(Number(e.target.value))}>
            {calcs.map((c) => (
              <MenuItem key={c.id} value={c.id}>#{c.id} · {t(`dashboard.status.${c.status}`, { defaultValue: c.status })}{c.modifiedAt ? ` · ${c.modifiedAt.slice(0, 10)}` : ''}</MenuItem>
            ))}
          </TextField>
        )}
        <TextField fullWidth size="small" multiline minRows={2} label={t('mp.linkDialog.note')} value={note} sx={textFieldSx}
          helperText={t('mp.linkDialog.noteHelp')} onChange={(e) => setNote(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontFamily: T.font.body }}>{t('mp.cancel')}</Button>
        <Button variant="contained" disableElevation sx={primaryBtn} disabled={calcId === '' || note.trim() === ''}
          onClick={() => calcId !== '' && onLink(calcId, note.trim())}>
          {t('mp.linkDialog.link')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
