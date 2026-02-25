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

const T = {
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
    mono: "'DM Mono', 'Fira Code', monospace",
  },
  color: {
    forest: '#0B4F3E',
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
  },
  radius: { sm: '8px', md: '14px', lg: '20px', pill: '999px' },
};

const tableHeadCellSx = {
  fontFamily: T.font.body, fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.03em',
  color: T.color.inkSoft, bgcolor: T.color.cream, borderBottom: `1px solid ${T.color.line}`, whiteSpace: 'nowrap' as const,
};
const tableCellSx = {
  fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.ink, borderBottom: `1px solid ${T.color.lineFaint}`,
};

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

  const directQ = questionsFromApi.find((q) => q.code === 'ALU_TOTAL_DIRECT_EMISSIONS');
  const indirectQ = questionsFromApi.find((q) => q.code === 'ALU_TOTAL_INDIRECT_EMISSIONS');
  const directVal = directQ ? getAnswer(directQ.id) : '';
  const indirectVal = indirectQ ? getAnswer(indirectQ.id) : '';
  const fallbackTotal =
    (Number.parseFloat(String(directVal)) || 0) + (Number.parseFloat(String(indirectVal)) || 0);

  return (
    <Box sx={{ py: 4, fontFamily: T.font.body }}>
      <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '1.5rem', color: T.color.ink, letterSpacing: '-0.02em', mb: 1 }}>
        Calculation complete
      </Typography>
      <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.6, mb: 3 }}>
        Your emissions have been computed and saved.
      </Typography>

      {resultLoading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress sx={{ color: T.color.forest }} />
        </Box>
      )}

      {resultError && !resultLoading && (
        <>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>
            Could not load detailed results: {resultError}
          </Alert>
          {questionsFromApi.length >= 2 && (directVal || indirectVal) && (
            <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: T.color.warmWhite, border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.md }}>
              <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1rem', color: T.color.ink, mb: 2 }}>
                Summary (from answers)
              </Typography>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.95rem', color: T.color.inkSoft, mb: 0.5 }}>
                Total direct emissions: {String(directVal || '—')} tonnes CO₂e
              </Typography>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.95rem', color: T.color.inkSoft, mb: 0.5 }}>
                Total indirect emissions: {String(indirectVal || '—')} tonnes CO₂e
              </Typography>
              <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.95rem', color: T.color.forest }}>
                Total: {fallbackTotal.toFixed(2)} tonnes CO₂e
              </Typography>
            </Paper>
          )}
        </>
      )}

      {!resultLoading && !resultError && result && (
        <>
          {/* Total Emissions Hero Card */}
          <Paper
            elevation={0}
            sx={{
              p: 3, mb: 3, bgcolor: T.color.mint, border: `1px solid ${T.color.mintDark}`, borderRadius: T.radius.lg,
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box>
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.color.muted, mb: 0.5 }}>
                  Total Emissions
                </Typography>
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '2rem', color: T.color.forest, letterSpacing: '-0.02em' }}>
                  {result.totalEmissions != null ? Number(result.totalEmissions).toFixed(4) : '—'}{' '}
                  <Typography component="span" sx={{ fontFamily: T.font.body, fontSize: '1rem', fontWeight: 500, color: T.color.muted }}>
                    tonnes CO₂e
                  </Typography>
                </Typography>
              </Box>
              <Box textAlign="right">
                <Chip label={result.status} size="small"
                  sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.78rem', bgcolor: T.color.forest, color: '#fff', mb: 0.5 }} />
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.82rem', color: T.color.muted }} display="block">
                  Report year: {result.reportYear}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Breakdown Table */}
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.1rem', color: T.color.ink, mb: 2 }}>
            Emission Breakdown
          </Typography>
          <TableContainer component={Paper} elevation={0}
            sx={{ mb: 3, borderRadius: T.radius.lg, border: `1px solid ${T.color.lineFaint}`, bgcolor: T.color.warmWhite, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeadCellSx}>#</TableCell>
                  <TableCell sx={tableHeadCellSx}>Formula</TableCell>
                  <TableCell sx={tableHeadCellSx}>Pass</TableCell>
                  <TableCell sx={tableHeadCellSx}>Entry</TableCell>
                  <TableCell sx={tableHeadCellSx}>Expression</TableCell>
                  <TableCell sx={tableHeadCellSx}>Inputs</TableCell>
                  <TableCell sx={{ ...tableHeadCellSx, textAlign: 'right' }}>Result (tonnes CO₂e)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ ...tableCellSx, py: 4, color: T.color.muted }}>
                      No computed items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  result.items.map((item, idx) => {
                    const snapshot = parseSnapshot(item.inputSnapshot);
                    return (
                      <TableRow key={item.id} sx={{ '&:hover': { bgcolor: T.color.lineFaint }, transition: 'background 0.15s ease' }}>
                        <TableCell sx={tableCellSx}>{idx + 1}</TableCell>
                        <TableCell sx={tableCellSx}>
                          <Typography sx={{ fontFamily: T.font.body, fontWeight: 500, fontSize: '0.88rem', color: T.color.ink }}>
                            {humanizeFormulaCode(item.formulaCode)}
                          </Typography>
                          {item.outputCode && (
                            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.78rem', color: T.color.muted }}>
                              {item.outputCode}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={tableCellSx}>
                          {item.passCode ? (
                            <Chip label={item.passCode} size="small" variant="outlined"
                              sx={{ fontFamily: T.font.body, fontSize: '0.78rem', borderColor: T.color.line, color: T.color.inkSoft }} />
                          ) : '—'}
                        </TableCell>
                        <TableCell sx={tableCellSx}>{item.entryIndex != null ? item.entryIndex + 1 : '—'}</TableCell>
                        <TableCell sx={tableCellSx}>
                          <Typography
                            sx={{
                              fontFamily: T.font.mono, fontSize: '0.8rem', color: T.color.inkSoft,
                              maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
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
                                <Typography key={k} sx={{ fontFamily: T.font.body, fontSize: '0.78rem', color: T.color.muted }} display="block">
                                  <strong>{k}</strong>: {String(v)}
                                </Typography>
                              ))}
                            </Box>
                          ) : (
                            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.muted }}>—</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ ...tableCellSx, textAlign: 'right' }}>
                          <Typography sx={{ fontFamily: T.font.mono, fontWeight: 600, fontSize: '0.88rem', color: T.color.forest }}>
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

          <Divider sx={{ mb: 3, borderColor: T.color.lineFaint }} />
        </>
      )}

      <Box display="flex" gap={2} flexWrap="wrap">
        <Button variant="outlined" size="large" startIcon={<ArrowBack sx={{ fontSize: '18px !important' }} />} onClick={onBack}
          sx={{
            fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', borderRadius: T.radius.pill,
            borderColor: T.color.line, color: T.color.inkSoft,
            '&:hover': { bgcolor: T.color.mint, borderColor: T.color.mintDark, color: T.color.forest },
          }}>
          Back
        </Button>
        <Button variant="contained" size="large" disableElevation onClick={onBackToDashboard}
          sx={{
            fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', borderRadius: T.radius.pill,
            bgcolor: T.color.forest, '&:hover': { bgcolor: T.color.ctaHover },
          }}>
          Back to Dashboard
        </Button>
        <Button variant="outlined" size="large" onClick={onNewCalculation}
          sx={{
            fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', borderRadius: T.radius.pill,
            borderColor: T.color.line, color: T.color.inkSoft,
            '&:hover': { bgcolor: T.color.mint, borderColor: T.color.mintDark, color: T.color.forest },
          }}>
          New calculation
        </Button>
      </Box>
    </Box>
  );
}