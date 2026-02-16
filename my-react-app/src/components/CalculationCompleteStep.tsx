import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { apiRequest } from '../utils/api';

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

export interface CalculationCompleteStepProps {
  calculationId: number | null;
  questionsFromApi: { id: number; code: string }[];
  getAnswer: (questionId: number) => string;
  onBack: () => void;
  onBackToDashboard: () => void;
  onNewCalculation: () => void;
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

export function CalculationCompleteStep({
  calculationId,
  questionsFromApi,
  getAnswer,
  onBack,
  onBackToDashboard,
  onNewCalculation,
}: CalculationCompleteStepProps) {
  const [result, setResult] = useState<CalcResult | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);

  useEffect(() => {
    if (calculationId == null) return;
    let cancelled = false;
    setResultLoading(true);
    setResultError(null);
    (async () => {
      try {
        const res = await apiRequest<{ success: boolean; result?: CalcResult; message?: string }>(
          `/calculations/${calculationId}/result`
        );
        if (cancelled) return;
        if (res === null || !res.data.success || !res.data.result) {
          setResultError(res?.data?.message ?? 'Failed to load results');
        } else {
          setResult(res.data.result);
        }
      } catch (e) {
        if (!cancelled) setResultError(e instanceof Error ? e.message : 'Failed to load results');
      } finally {
        if (!cancelled) setResultLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [calculationId]);

  // Fallback summary from answers (legacy)
  const directQ = questionsFromApi.find((q) => q.code === 'ALU_TOTAL_DIRECT_EMISSIONS');
  const indirectQ = questionsFromApi.find((q) => q.code === 'ALU_TOTAL_INDIRECT_EMISSIONS');
  const directVal = directQ ? getAnswer(directQ.id) : '';
  const indirectVal = indirectQ ? getAnswer(indirectQ.id) : '';
  const fallbackTotal =
    (Number.parseFloat(String(directVal)) || 0) + (Number.parseFloat(String(indirectVal)) || 0);

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
        Calculation complete
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Your emissions have been computed and saved.
      </Typography>

      {/* Loading */}
      {resultLoading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Error - fall back to old summary */}
      {resultError && !resultLoading && (
        <>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Could not load detailed results: {resultError}
          </Alert>
          {questionsFromApi.length >= 2 && (directVal || indirectVal) && (
            <Paper elevation={1} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'grey.300' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Summary (from answers)
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Total direct emissions: {String(directVal || '—')} tonnes CO₂e
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Total indirect emissions: {String(indirectVal || '—')} tonnes CO₂e
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Total: {fallbackTotal.toFixed(2)} tonnes CO₂e
              </Typography>
            </Paper>
          )}
        </>
      )}

      {/* Results loaded */}
      {!resultLoading && !resultError && result && (
        <>
          {/* Total */}
          <Paper
            elevation={2}
            sx={{
              p: 3,
              mb: 3,
              background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)',
              border: '1px solid',
              borderColor: 'success.light',
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Total Emissions
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.dark' }}>
                  {result.totalEmissions != null ? Number(result.totalEmissions).toFixed(4) : '—'}{' '}
                  <Typography component="span" variant="h6" color="text.secondary">
                    tonnes CO₂e
                  </Typography>
                </Typography>
              </Box>
              <Box textAlign="right">
                <Chip label={result.status} color="success" size="small" sx={{ mb: 0.5 }} />
                <Typography variant="caption" display="block" color="text.secondary">
                  Report year: {result.reportYear}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Breakdown */}
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Emission Breakdown
          </Typography>
          <TableContainer component={Paper} elevation={1} sx={{ mb: 3 }}>
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
                    Result (tonnes CO₂e)
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No computed items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  result.items.map((item, idx) => {
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
                        <TableCell>{item.entryIndex != null ? item.entryIndex + 1 : '—'}</TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.8rem',
                              maxWidth: 280,
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

          <Divider sx={{ mb: 3 }} />
        </>
      )}

      <Box display="flex" gap={2} flexWrap="wrap">
        <Button variant="outlined" size="large" startIcon={<ArrowBack />} onClick={onBack}>
          Back
        </Button>
        <Button variant="contained" size="large" onClick={onBackToDashboard}>
          Back to Dashboard
        </Button>
        <Button variant="outlined" size="large" onClick={onNewCalculation}>
          New calculation
        </Button>
      </Box>
    </Box>
  );
}
