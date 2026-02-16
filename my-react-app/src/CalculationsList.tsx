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
import { ArrowBack, Edit, Close, Visibility } from '@mui/icons-material';
import { useDashboardCalculations, type DashboardCalculationItem } from './Dashboard';
import { apiRequest } from './utils/api';

type CalculationStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const statusColor: Record<CalculationStatus, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  DRAFT: 'default',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'error',
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
  const calculations = dashboardCalculations?.calculations ?? [];
  const loading = dashboardCalculations?.calculationsLoading ?? true;
  const error = dashboardCalculations?.calculationsError ?? null;

  // Answers dialog state (Edit)
  const [editOpen, setEditOpen] = useState(false);
  const [editCalcId, setEditCalcId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answersError, setAnswersError] = useState<string | null>(null);

  // Emissions dialog state (View)
  const [viewOpen, setViewOpen] = useState(false);
  const [viewCalcId, setViewCalcId] = useState<number | null>(null);
  const [viewResult, setViewResult] = useState<CalcResult | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);

  // Emissions totals cache: calcId -> totalEmissions
  const [emissionsMap, setEmissionsMap] = useState<Record<number, number | null>>({});

  // Fetch emissions totals for all COMPLETED calculations
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={3} display="flex" alignItems="center" gap={2}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
        All calculations
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Calculations for your company and their current status.
      </Typography>

      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Current step</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Emissions (t CO₂e)</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Modified</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {calculations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No calculations yet. Start one from the dashboard.
                  </TableCell>
                </TableRow>
              ) : (
                calculations.map((calc: DashboardCalculationItem) => (
                  <TableRow key={calc.id} hover>
                    <TableCell>{calc.id}</TableCell>
                    <TableCell>
                      <Chip label={calc.status} color={statusColor[calc.status]} size="small" />
                    </TableCell>
                    <TableCell>{calc.currentStep ?? '—'}</TableCell>
                    <TableCell>
                      {calc.status === 'COMPLETED' ? (
                        emissionsMap[calc.id] != null ? (
                          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                            {Number(emissionsMap[calc.id]).toFixed(4)}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Loading...
                          </Typography>
                        )
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(calc.createdAt)}</TableCell>
                    <TableCell>{formatDate(calc.modifiedAt)}</TableCell>
                    <TableCell align="center">
                      <Box display="flex" gap={1} justifyContent="center">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => handleEdit(calc.id)}
                        >
                          Edit
                        </Button>
                        {calc.status === 'COMPLETED' && (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => handleView(calc.id)}
                            color="success"
                          >
                            View
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Dialog — shows all calculation answers */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Calculation #{editCalcId} — Answers</span>
          <IconButton onClick={() => setEditOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {answersLoading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}
          {answersError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {answersError}
            </Alert>
          )}
          {!answersLoading && !answersError && answers.length === 0 && (
            <Typography color="text.secondary" align="center" py={4}>
              No answers recorded yet.
            </Typography>
          )}
          {!answersLoading && !answersError && answers.length > 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Question</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Answer</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Emission Factor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {answers.map((a, idx) => (
                    <TableRow key={a.id} hover>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {a.questionLabel ?? '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {a.questionCode}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {a.answerType === 'OPTION' ? (
                          <Chip label={a.answerValue ?? '—'} size="small" color="primary" variant="outlined" />
                        ) : (
                          <Typography variant="body2">{a.answerValue ?? '—'}</Typography>
                        )}
                        {a.answerCode && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {a.answerCode}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={a.answerType}
                          size="small"
                          color={a.answerType === 'OPTION' ? 'info' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {a.emissionFactorName ? (
                          <>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {a.emissionFactorName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {[a.emissionFactorSector, a.emissionFactorSubsector].filter(Boolean).join(' > ')}
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog — shows emission results */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Calculation #{viewCalcId} — Emissions</span>
          <IconButton onClick={() => setViewOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {viewLoading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}
          {viewError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {viewError}
            </Alert>
          )}
          {!viewLoading && !viewError && viewResult && (
            <>
              {/* Total card */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)',
                  border: '1px solid',
                  borderColor: 'success.light',
                  borderRadius: 2,
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Total Emissions
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.dark' }}>
                      {viewResult.totalEmissions != null
                        ? Number(viewResult.totalEmissions).toFixed(4)
                        : '—'}{' '}
                      <Typography component="span" variant="h6" color="text.secondary">
                        tonnes CO₂e
                      </Typography>
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Chip label={viewResult.status} color="success" size="small" sx={{ mb: 0.5 }} />
                    <Typography variant="caption" display="block" color="text.secondary">
                      Report year: {viewResult.reportYear}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Computed: {formatDate(viewResult.computedAt)}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              <Divider sx={{ mb: 2 }} />

              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Emission Breakdown
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Formula</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Pass</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Entry</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Expression</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Inputs</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">
                        Result (t CO₂e)
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewResult.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No computed items.
                        </TableCell>
                      </TableRow>
                    ) : (
                      viewResult.items.map((item, idx) => {
                        const snapshot = parseSnapshot(item.inputSnapshot);
                        return (
                          <TableRow key={item.id} hover>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {humanizeFormulaCode(item.formulaCode)}
                              </Typography>
                              {item.outputCode && (
                                <Typography variant="caption" color="text.secondary">
                                  {item.outputCode}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.passCode ? (
                                <Chip label={item.passCode} size="small" variant="outlined" />
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell>
                              {item.entryIndex != null ? item.entryIndex + 1 : '—'}
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.8rem',
                                  maxWidth: 260,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={item.expression}
                              >
                                {item.expression}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {Object.keys(snapshot).length > 0 ? (
                                <Box>
                                  {Object.entries(snapshot).map(([k, v]) => (
                                    <Typography key={k} variant="caption" display="block" color="text.secondary">
                                      <strong>{k}</strong>: {String(v)}
                                    </Typography>
                                  ))}
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  —
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
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
        <DialogActions>
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CalculationsList;
