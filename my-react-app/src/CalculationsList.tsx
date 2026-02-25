import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
} from '@mui/material';
import { ArrowBack, Edit, Close, Visibility, Delete, ListAlt, PlayArrow } from '@mui/icons-material';
import { useDashboardCalculations, type DashboardCalculationItem } from './Dashboard';
import { apiRequest } from './utils/api';

/* ─── Design tokens (shared across Panonia) ─── */
const T = {
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
  },
  color: {
    forest: '#0B4F3E',
    forestLight: '#14785E',
    sage: '#3A7D6A',
    mint: '#E8F5EF',
    mintDark: '#C3E6D5',
    cream: '#FAFAF7',
    warmWhite: '#FFFEF9',
    ink: '#1A2B25',
    inkSoft: '#3D5A50',
    muted: '#6B8F82',
    accent: '#D4A853',
    accentLight: '#F4E8C9',
    line: '#D6E5DD',
    lineFaint: '#EAF0EC',
    ctaHover: '#0A3F32',
    error: '#C0392B',
    errorLight: '#FDEDEC',
    success: '#0B4F3E',
    successLight: '#E8F5EF',
  },
  radius: {
    sm: '8px',
    md: '14px',
    lg: '20px',
    xl: '28px',
    pill: '999px',
  },
};

const tableHeadCellSx = {
  fontFamily: T.font.body,
  fontWeight: 600,
  fontSize: '0.8rem',
  letterSpacing: '0.03em',
  color: T.color.inkSoft,
  bgcolor: T.color.cream,
  borderBottom: `1px solid ${T.color.line}`,
  whiteSpace: 'nowrap' as const,
};

const tableCellSx = {
  fontFamily: T.font.body,
  fontSize: '0.88rem',
  color: T.color.ink,
  borderBottom: `1px solid ${T.color.lineFaint}`,
};

const sectionPaperSx = {
  borderRadius: T.radius.lg,
  border: `1px solid ${T.color.lineFaint}`,
  bgcolor: T.color.warmWhite,
  overflow: 'hidden' as const,
};

const dialogPaperSx = {
  borderRadius: T.radius.lg,
  overflow: 'hidden' as const,
};

const dialogAccentBar = {
  height: 4,
  background: `linear-gradient(90deg, ${T.color.forest}, ${T.color.sage}, ${T.color.accent})`,
};

const pillBtnSx = (variant: 'forest' | 'outline' | 'error' | 'success') => {
  const base = {
    fontFamily: T.font.body,
    fontWeight: 600,
    fontSize: '0.82rem',
    textTransform: 'none' as const,
    borderRadius: T.radius.pill,
    px: 2,
  };
  if (variant === 'forest') return { ...base, bgcolor: T.color.forest, color: '#fff', '&:hover': { bgcolor: T.color.ctaHover } };
  if (variant === 'success') return { ...base, bgcolor: T.color.forest, color: '#fff', '&:hover': { bgcolor: T.color.ctaHover } };
  if (variant === 'error') return { ...base, borderColor: T.color.error, color: T.color.error, '&:hover': { bgcolor: T.color.errorLight, borderColor: T.color.error } };
  return { ...base, borderColor: T.color.line, color: T.color.inkSoft, '&:hover': { borderColor: T.color.forest, bgcolor: T.color.mint, color: T.color.forest } };
};

type CalculationStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const statusChipSx: Record<CalculationStatus, { bgcolor: string; color: string; borderColor: string }> = {
  DRAFT: { bgcolor: T.color.lineFaint, color: T.color.muted, borderColor: T.color.line },
  IN_PROGRESS: { bgcolor: T.color.accentLight, color: '#8B6914', borderColor: '#E0C97A' },
  COMPLETED: { bgcolor: T.color.mint, color: T.color.forest, borderColor: T.color.mintDark },
  CANCELLED: { bgcolor: T.color.errorLight, color: T.color.error, borderColor: '#F5C6CB' },
};

interface AnswerDetail {
  id: number;
  questionCode: string | null;
  questionLabel: string | null;
  answerType: 'OPTION' | 'VALUE';
  answerValue: string | null;
  answerCode: string | null;
  emissionFactorId: number | null;
  emissionFactorName: string | null;
  emissionFactorSector: string | null;
  emissionFactorSubsector: string | null;
  createdAt: string | null;
}

interface ResultItem {
  id: number;
  formulaCode: string;
  outputCode: string | null;
  passCode: string | null;
  entryIndex: number | null;
  expression: string;
  inputSnapshot: string;
  resultValue: number;
  computedAt: string;
}

interface CalcResult {
  id: number;
  calculationId: number;
  totalEmissions: number | null;
  status: string;
  reportYear: number;
  computedAt: string;
  items: ResultItem[];
}

function humanizeFormulaCode(code: string): string {
  return code
    .replace(/^ALU_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseSnapshot(raw: string): Record<string, string> {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object') return parsed as Record<string, string>;
  } catch {
    // ignore
  }
  return {};
}

const CalculationsList: React.FC = () => {
  const navigate = useNavigate();
  const dashboardCalculations = useDashboardCalculations();
  const calculations = [...(dashboardCalculations?.calculations ?? [])].sort((a, b) => a.id - b.id);
  const loading = dashboardCalculations?.calculationsLoading ?? true;
  const error = dashboardCalculations?.calculationsError ?? null;

  const [editOpen, setEditOpen] = useState(false);
  const [editCalcId, setEditCalcId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answersError, setAnswersError] = useState<string | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewCalcId, setViewCalcId] = useState<number | null>(null);
  const [viewResult, setViewResult] = useState<CalcResult | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCalcId, setDeleteCalcId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [emissionsMap, setEmissionsMap] = useState<Record<number, number | null>>({});

  useEffect(() => {
    const completedCalcs = calculations.filter((c) => c.status === 'COMPLETED');
    if (completedCalcs.length === 0) return;

    let cancelled = false;
    (async () => {
      const entries: [number, number | null][] = [];
      await Promise.allSettled(
        completedCalcs.map(async (calc) => {
          try {
            const res = await apiRequest<{ success: boolean; result?: CalcResult }>(
              `/calculations/${calc.id}/result`
            );
            if (!cancelled && res?.data?.success && res.data.result) {
              entries.push([calc.id, res.data.result.totalEmissions]);
            }
          } catch {
            // skip
          }
        })
      );
      if (!cancelled) {
        setEmissionsMap((prev) => {
          const next = { ...prev };
          for (const [id, total] of entries) next[id] = total;
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculations.length]);

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const handleEdit = async (calcId: number) => {
    setEditCalcId(calcId);
    setEditOpen(true);
    setAnswersLoading(true);
    setAnswersError(null);
    try {
      const result = await apiRequest<{ success: boolean; answers?: AnswerDetail[]; message?: string }>(
        `/calculation-answers/detail/by-calculation?calculationId=${calcId}`
      );
      if (result === null || !result.data.success) {
        setAnswersError(result?.data?.message ?? 'Failed to load answers');
        setAnswers([]);
      } else {
        setAnswers(result.data.answers ?? []);
      }
    } catch (e) {
      setAnswersError(e instanceof Error ? e.message : 'Failed to load answers');
      setAnswers([]);
    } finally {
      setAnswersLoading(false);
    }
  };

  const handleView = async (calcId: number) => {
    setViewCalcId(calcId);
    setViewOpen(true);
    setViewLoading(true);
    setViewError(null);
    setViewResult(null);
    try {
      const res = await apiRequest<{ success: boolean; result?: CalcResult; message?: string }>(
        `/calculations/${calcId}/result`
      );
      if (res === null || !res.data.success || !res.data.result) {
        setViewError(res?.data?.message ?? 'No results available');
      } else {
        setViewResult(res.data.result);
      }
    } catch (e) {
      setViewError(e instanceof Error ? e.message : 'Failed to load results');
    } finally {
      setViewLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteCalcId == null) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await apiRequest<{ success: boolean; message?: string }>(
        `/calculations/${deleteCalcId}`,
        { method: 'DELETE' }
      );
      if (res === null || !res.data.success) {
        setDeleteError(res?.data?.message ?? 'Failed to delete calculation');
        setDeleteLoading(false);
        return;
      }
      setDeleteOpen(false);
      setDeleteCalcId(null);
      setDeleteLoading(false);
      dashboardCalculations?.refetchCalculations();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete calculation');
      setDeleteLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, fontFamily: T.font.body }}>
      {/* Back button */}
      <Box mb={3} display="flex" alignItems="center" gap={2}>
        <Button
          startIcon={<ArrowBack sx={{ fontSize: '18px !important' }} />}
          onClick={() => navigate('/dashboard')}
          sx={{
            fontFamily: T.font.body, fontWeight: 500, fontSize: '0.9rem',
            color: T.color.muted, textTransform: 'none', borderRadius: T.radius.pill,
            '&:hover': { bgcolor: T.color.mint, color: T.color.forest },
          }}
        >
          Back to Dashboard
        </Button>
      </Box>

      {/* Page header */}
      <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '1.6rem', md: '2rem' }, color: T.color.ink, letterSpacing: '-0.02em', mb: 1 }}>
        All Calculations
      </Typography>
      <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, mb: 3, lineHeight: 1.6 }}>
        Calculations for your company and their current status.
      </Typography>

      {loading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress sx={{ color: T.color.forest }} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <Paper elevation={0} sx={sectionPaperSx}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeadCellSx}>ID</TableCell>
                  <TableCell sx={tableHeadCellSx}>Status</TableCell>
                  <TableCell sx={tableHeadCellSx}>Current Step</TableCell>
                  <TableCell sx={tableHeadCellSx}>Emissions (t CO₂e)</TableCell>
                  <TableCell sx={tableHeadCellSx}>Created</TableCell>
                  <TableCell sx={tableHeadCellSx}>Modified</TableCell>
                  <TableCell sx={tableHeadCellSx} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {calculations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ ...tableCellSx, py: 5, color: T.color.muted }}>
                      No calculations yet. Start one from the dashboard.
                    </TableCell>
                  </TableRow>
                ) : (
                  calculations.map((calc: DashboardCalculationItem) => {
                    const chipStyle = statusChipSx[calc.status] ?? statusChipSx.DRAFT;
                    return (
                      <TableRow key={calc.id} sx={{ '&:hover': { bgcolor: T.color.mint } }}>
                        <TableCell sx={tableCellSx}>{calc.id}</TableCell>
                        <TableCell sx={tableCellSx}>
                          <Chip
                            label={calc.status}
                            size="small"
                            sx={{
                              fontFamily: T.font.body, fontWeight: 600, fontSize: '0.72rem',
                              bgcolor: chipStyle.bgcolor, color: chipStyle.color,
                              border: `1px solid ${chipStyle.borderColor}`,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={tableCellSx}>{calc.currentStep ?? '—'}</TableCell>
                        <TableCell sx={tableCellSx}>
                          {calc.status === 'COMPLETED' ? (
                            emissionsMap[calc.id] != null ? (
                              <Typography sx={{ fontWeight: 600, fontFamily: "'DM Sans', monospace", fontSize: '0.88rem', color: T.color.ink }}>
                                {Number(emissionsMap[calc.id]).toFixed(4)}
                              </Typography>
                            ) : (
                              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.muted }}>
                                Loading…
                              </Typography>
                            )
                          ) : (
                            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.muted }}>
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={tableCellSx}>{formatDate(calc.createdAt)}</TableCell>
                        <TableCell sx={tableCellSx}>{formatDate(calc.modifiedAt)}</TableCell>
                        <TableCell align="center" sx={tableCellSx}>
                          <Box display="flex" gap={1} justifyContent="center" flexWrap="wrap">
                            <Button variant="outlined" size="small" disableElevation startIcon={<ListAlt />} onClick={() => handleEdit(calc.id)} sx={pillBtnSx('outline')}>
                              View Steps
                            </Button>
                            {calc.status !== 'COMPLETED' && (
                              <Button
                                variant="contained" size="small" disableElevation
                                startIcon={calc.status === 'DRAFT' ? <PlayArrow /> : <Edit />}
                                onClick={() => navigate(`/dashboard/new-calculation/${calc.id}`)}
                                sx={pillBtnSx('forest')}
                              >
                                {calc.status === 'DRAFT' ? 'Start' : 'Continue'}
                              </Button>
                            )}
                            {calc.status === 'COMPLETED' && (
                              <Button variant="contained" size="small" disableElevation startIcon={<Visibility />} onClick={() => handleView(calc.id)} sx={pillBtnSx('success')}>
                                View
                              </Button>
                            )}
                            <Button variant="outlined" size="small" disableElevation startIcon={<Delete />} onClick={() => { setDeleteCalcId(calc.id); setDeleteError(null); setDeleteOpen(true); }} sx={pillBtnSx('error')}>
                              Delete
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ── Edit Dialog — Answers ── */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="lg" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <Box sx={dialogAccentBar} />
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: T.font.display, fontWeight: 700, fontSize: '1.3rem', color: T.color.ink, pt: 3 }}>
          <span>Calculation #{editCalcId} — Answers</span>
          <IconButton onClick={() => setEditOpen(false)} size="small" sx={{ color: T.color.muted, '&:hover': { bgcolor: T.color.mint } }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: T.color.lineFaint }}>
          {answersLoading && (
            <Box display="flex" justifyContent="center" py={5}>
              <CircularProgress sx={{ color: T.color.forest }} />
            </Box>
          )}
          {answersError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>{answersError}</Alert>
          )}
          {!answersLoading && !answersError && answers.length === 0 && (
            <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, textAlign: 'center', py: 5 }}>
              No answers recorded yet.
            </Typography>
          )}
          {!answersLoading && !answersError && answers.length > 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={tableHeadCellSx}>#</TableCell>
                    <TableCell sx={tableHeadCellSx}>Question</TableCell>
                    <TableCell sx={tableHeadCellSx}>Answer</TableCell>
                    <TableCell sx={tableHeadCellSx}>Type</TableCell>
                    <TableCell sx={tableHeadCellSx}>Emission Factor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {answers.map((a, idx) => (
                    <TableRow key={a.id} sx={{ '&:hover': { bgcolor: T.color.mint } }}>
                      <TableCell sx={tableCellSx}>{idx + 1}</TableCell>
                      <TableCell sx={tableCellSx}>
                        <Typography sx={{ fontFamily: T.font.body, fontWeight: 500, fontSize: '0.88rem', color: T.color.ink }}>
                          {a.questionLabel ?? '—'}
                        </Typography>
                        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.75rem', color: T.color.muted }}>
                          {a.questionCode}
                        </Typography>
                      </TableCell>
                      <TableCell sx={tableCellSx}>
                        {a.answerType === 'OPTION' ? (
                          <Chip
                            label={a.answerValue ?? '—'} size="small"
                            sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.72rem', bgcolor: T.color.mint, color: T.color.forest, border: `1px solid ${T.color.mintDark}` }}
                          />
                        ) : (
                          <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.ink }}>{a.answerValue ?? '—'}</Typography>
                        )}
                        {a.answerCode && (
                          <Typography sx={{ fontFamily: T.font.body, fontSize: '0.72rem', color: T.color.muted, display: 'block' }}>
                            {a.answerCode}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={tableCellSx}>
                        <Chip
                          label={a.answerType} size="small"
                          sx={{
                            fontFamily: T.font.body, fontWeight: 600, fontSize: '0.72rem',
                            ...(a.answerType === 'OPTION'
                              ? { bgcolor: T.color.accentLight, color: '#8B6914', border: '1px solid #E0C97A' }
                              : { bgcolor: T.color.lineFaint, color: T.color.muted, border: `1px solid ${T.color.line}` }),
                          }}
                        />
                      </TableCell>
                      <TableCell sx={tableCellSx}>
                        {a.emissionFactorName ? (
                          <>
                            <Typography sx={{ fontFamily: T.font.body, fontWeight: 500, fontSize: '0.88rem', color: T.color.ink }}>
                              {a.emissionFactorName}
                            </Typography>
                            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.72rem', color: T.color.muted }}>
                              {[a.emissionFactorSector, a.emissionFactorSubsector].filter(Boolean).join(' > ')}
                            </Typography>
                          </>
                        ) : (
                          <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.muted }}>—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ fontFamily: T.font.body, textTransform: 'none', borderRadius: T.radius.pill, px: 3, color: T.color.muted }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={deleteOpen} onClose={() => !deleteLoading && setDeleteOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <Box sx={{ height: 4, background: `linear-gradient(90deg, ${T.color.error}, #E74C3C, ${T.color.error})` }} />
        <DialogTitle sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '1.25rem', color: T.color.ink, pt: 3 }}>
          Delete Calculation #{deleteCalcId}?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.inkSoft, mb: 1.5, lineHeight: 1.6 }}>
            This will permanently delete the calculation and all associated data:
          </Typography>
          <Box component="ul" sx={{ fontFamily: T.font.body, fontSize: '0.9rem', color: T.color.muted, pl: 2.5, mb: 2, '& li': { mb: 0.5 } }}>
            <li>All answers given</li>
            <li>Computed emission results</li>
            <li>Product associations</li>
          </Box>
          <Typography sx={{ fontFamily: T.font.body, fontSize: '0.9rem', color: T.color.error, fontWeight: 600 }}>
            This action cannot be undone.
          </Typography>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>{deleteError}</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setDeleteOpen(false)} disabled={deleteLoading}
            sx={{ fontFamily: T.font.body, textTransform: 'none', borderRadius: T.radius.pill, px: 3, color: T.color.muted }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm} variant="contained" disableElevation disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <Delete />}
            sx={{
              fontFamily: T.font.body, fontWeight: 600, textTransform: 'none',
              bgcolor: T.color.error, borderRadius: T.radius.pill, px: 3,
              '&:hover': { bgcolor: '#A93226' },
            }}
          >
            {deleteLoading ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── View Dialog — Emissions ── */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="lg" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <Box sx={dialogAccentBar} />
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: T.font.display, fontWeight: 700, fontSize: '1.3rem', color: T.color.ink, pt: 3 }}>
          <span>Calculation #{viewCalcId} — Emissions</span>
          <IconButton onClick={() => setViewOpen(false)} size="small" sx={{ color: T.color.muted, '&:hover': { bgcolor: T.color.mint } }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: T.color.lineFaint }}>
          {viewLoading && (
            <Box display="flex" justifyContent="center" py={5}>
              <CircularProgress sx={{ color: T.color.forest }} />
            </Box>
          )}
          {viewError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>{viewError}</Alert>
          )}
          {!viewLoading && !viewError && viewResult && (
            <>
              {/* Total card */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 4 }, mb: 3, borderRadius: T.radius.lg,
                  bgcolor: T.color.mint, border: `1px solid ${T.color.mintDark}`,
                  position: 'relative', overflow: 'hidden',
                  '&::before': {
                    content: '""', position: 'absolute', top: -40, right: -40, width: 140, height: 140,
                    borderRadius: '50%', background: `radial-gradient(circle, ${T.color.mintDark} 0%, transparent 70%)`,
                  },
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} position="relative" zIndex={1}>
                  <Box>
                    <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: T.color.muted, mb: 0.5 }}>
                      Total Emissions
                    </Typography>
                    <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '2rem', md: '2.5rem' }, color: T.color.forest, lineHeight: 1 }}>
                      {viewResult.totalEmissions != null
                        ? Number(viewResult.totalEmissions).toFixed(4)
                        : '—'}{' '}
                      <Typography component="span" sx={{ fontFamily: T.font.body, fontSize: '1rem', color: T.color.muted }}>
                        tonnes CO₂e
                      </Typography>
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Chip
                      label={viewResult.status} size="small"
                      sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.72rem', bgcolor: T.color.warmWhite, color: T.color.forest, border: `1px solid ${T.color.mintDark}`, mb: 0.5 }}
                    />
                    <Typography sx={{ fontFamily: T.font.body, fontSize: '0.78rem', color: T.color.muted, display: 'block' }}>
                      Report year: {viewResult.reportYear}
                    </Typography>
                    <Typography sx={{ fontFamily: T.font.body, fontSize: '0.78rem', color: T.color.muted, display: 'block' }}>
                      Computed: {formatDate(viewResult.computedAt)}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              <Divider sx={{ borderColor: T.color.lineFaint, mb: 3 }} />

              <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.1rem', color: T.color.ink, mb: 2 }}>
                Emission Breakdown
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={tableHeadCellSx}>#</TableCell>
                      <TableCell sx={tableHeadCellSx}>Formula</TableCell>
                      <TableCell sx={tableHeadCellSx}>Pass</TableCell>
                      <TableCell sx={tableHeadCellSx}>Entry</TableCell>
                      <TableCell sx={tableHeadCellSx}>Expression</TableCell>
                      <TableCell sx={tableHeadCellSx}>Inputs</TableCell>
                      <TableCell sx={tableHeadCellSx} align="right">Result (t CO₂e)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewResult.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ ...tableCellSx, py: 4, color: T.color.muted }}>
                          No computed items.
                        </TableCell>
                      </TableRow>
                    ) : (
                      viewResult.items.map((item, idx) => {
                        const snapshot = parseSnapshot(item.inputSnapshot);
                        return (
                          <TableRow key={item.id} sx={{ '&:hover': { bgcolor: T.color.mint } }}>
                            <TableCell sx={tableCellSx}>{idx + 1}</TableCell>
                            <TableCell sx={tableCellSx}>
                              <Typography sx={{ fontFamily: T.font.body, fontWeight: 500, fontSize: '0.88rem', color: T.color.ink }}>
                                {humanizeFormulaCode(item.formulaCode)}
                              </Typography>
                              {item.outputCode && (
                                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.72rem', color: T.color.muted }}>
                                  {item.outputCode}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={tableCellSx}>
                              {item.passCode ? (
                                <Chip label={item.passCode} size="small" sx={{ fontFamily: T.font.body, fontSize: '0.72rem', bgcolor: T.color.lineFaint, color: T.color.muted, border: `1px solid ${T.color.line}` }} />
                              ) : '—'}
                            </TableCell>
                            <TableCell sx={tableCellSx}>
                              {item.entryIndex != null ? item.entryIndex + 1 : '—'}
                            </TableCell>
                            <TableCell sx={tableCellSx}>
                              <Typography
                                sx={{
                                  fontFamily: "'DM Sans', monospace", fontSize: '0.78rem', color: T.color.inkSoft,
                                  maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}
                                title={item.expression}
                              >
                                {item.expression}
                              </Typography>
                            </TableCell>
                            <TableCell sx={tableCellSx}>
                              {Object.keys(snapshot).length > 0 ? (
                                <Box>
                                  {Object.entries(snapshot).map(([k, v]) => (
                                    <Typography key={k} sx={{ fontFamily: T.font.body, fontSize: '0.72rem', color: T.color.muted, display: 'block' }}>
                                      <strong style={{ color: T.color.inkSoft }}>{k}</strong>: {String(v)}
                                    </Typography>
                                  ))}
                                </Box>
                              ) : (
                                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.muted }}>—</Typography>
                              )}
                            </TableCell>
                            <TableCell align="right" sx={tableCellSx}>
                              <Typography sx={{ fontWeight: 600, fontFamily: "'DM Sans', monospace", fontSize: '0.88rem', color: T.color.ink }}>
                                {Number(item.resultValue).toFixed(4)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setViewOpen(false)} sx={{ fontFamily: T.font.body, textTransform: 'none', borderRadius: T.radius.pill, px: 3, color: T.color.muted }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CalculationsList;