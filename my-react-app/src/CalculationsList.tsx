import { useState } from 'react';
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
} from '@mui/material';
import { ArrowBack, Edit, Close } from '@mui/icons-material';
import { useDashboardCalculations } from './Dashboard';
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

const CalculationsList: React.FC = () => {
  const navigate = useNavigate();
  const dashboardCalculations = useDashboardCalculations();
  const calculations = dashboardCalculations?.calculations ?? [];
  const loading = dashboardCalculations?.calculationsLoading ?? true;
  const error = dashboardCalculations?.calculationsError ?? null;

  const [editOpen, setEditOpen] = useState(false);
  const [editCalcId, setEditCalcId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answersError, setAnswersError] = useState<string | null>(null);

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
                <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Modified</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {calculations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No calculations yet. Start one from the dashboard.
                  </TableCell>
                </TableRow>
              ) : (
                calculations.map((calc) => (
                  <TableRow key={calc.id} hover>
                    <TableCell>{calc.id}</TableCell>
                    <TableCell>
                      <Chip label={calc.status} color={statusColor[calc.status]} size="small" />
                    </TableCell>
                    <TableCell>{calc.currentStep ?? '—'}</TableCell>
                    <TableCell>{formatDate(calc.createdAt)}</TableCell>
                    <TableCell>{formatDate(calc.modifiedAt)}</TableCell>
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => handleEdit(calc.id)}
                      >
                        Edit
                      </Button>
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
                          <Typography variant="body2" color="text.secondary">—</Typography>
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
    </Container>
  );
};

export default CalculationsList;
