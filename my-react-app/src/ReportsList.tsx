import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ArrowBack, OpenInNew, Download } from '@mui/icons-material';
import {
  downloadReportAuthenticated,
  listCompanyReports,
  openReportAuthenticated,
  type BlobReportItem,
} from './utils/blobStorage';
import { apiRequest } from './utils/api';

/* ─── Design tokens (shared across Panonia) ─── */
const T = {
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
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
    line: '#D6E5DD',
    lineFaint: '#EAF0EC',
    ctaHover: '#0A3F32',
  },
  radius: {
    sm: '8px',
    md: '14px',
    lg: '20px',
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

const ReportsList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [reports, setReports] = useState<BlobReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      const meResult = await apiRequest<{ success: boolean; user?: { companyId?: number | null } }>('/users/me');
      if (!meResult?.data?.success || meResult.data.user?.companyId == null) {
        setError(t('reports.noCompany'));
        setLoading(false);
        return;
      }
      const companyId = meResult.data.user.companyId;
      const result = await listCompanyReports(companyId);
      if (result.success) {
        setReports(result.reports);
      } else {
        setError(result.error ?? t('reports.loadFailed'));
      }
      setLoading(false);
    };
    fetchReports();
  }, [t]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDisplayName = (fullName: string) => {
    const parts = fullName.split('/');
    return parts[parts.length - 1];
  };

  const handleOpen = async (report: BlobReportItem) => {
    try {
      setActionError(null);
      await openReportAuthenticated(report);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t('reports.openFailed'));
    }
  };

  const handleDownload = async (report: BlobReportItem) => {
    try {
      setActionError(null);
      await downloadReportAuthenticated(report);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t('reports.downloadFailed'));
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, fontFamily: T.font.body }}>
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
          {t('reports.backToDashboard')}
        </Button>
      </Box>
      <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '1.6rem', md: '2rem' }, color: T.color.ink, letterSpacing: '-0.02em', mb: 0.5 }}>
        {t('reports.title')}
      </Typography>
      <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.6, mb: 3 }}>
        {t('reports.subtitle')}
      </Typography>

      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress sx={{ color: T.color.forest }} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>
          {error}
        </Alert>
      )}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>
          {actionError}
        </Alert>
      )}

      {!loading && !error && (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: T.radius.lg,
            border: `1px solid ${T.color.lineFaint}`,
            bgcolor: T.color.warmWhite,
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeadCellSx}>#</TableCell>
                <TableCell sx={tableHeadCellSx}>{t('reports.colName')}</TableCell>
                <TableCell sx={tableHeadCellSx}>{t('reports.colModified')}</TableCell>
                <TableCell sx={tableHeadCellSx}>{t('reports.colSize')}</TableCell>
                <TableCell sx={{ ...tableHeadCellSx, textAlign: 'center' }}>{t('reports.colActions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ ...tableCellSx, py: 5, color: T.color.muted }}>
                    {t('reports.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report, idx) => (
                  <TableRow key={report.name} sx={{ '&:hover': { bgcolor: T.color.lineFaint }, transition: 'background 0.15s ease' }}>
                    <TableCell sx={tableCellSx}>{idx + 1}</TableCell>
                    <TableCell sx={tableCellSx}>
                      <Typography sx={{ fontFamily: T.font.body, fontWeight: 500, fontSize: '0.88rem', color: T.color.ink }}>
                        {getDisplayName(report.name)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={tableCellSx}>{formatDate(report.lastModified)}</TableCell>
                    <TableCell sx={tableCellSx}>{formatSize(report.contentLength)}</TableCell>
                    <TableCell sx={{ ...tableCellSx, textAlign: 'center' }}>
                      <Box display="flex" gap={0.5} justifyContent="center">
                        <Tooltip title={t('reports.open')}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpen(report)}
                            sx={{ color: T.color.muted, '&:hover': { bgcolor: T.color.mint, color: T.color.forest } }}
                          >
                            <OpenInNew sx={{ fontSize: 20 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('reports.download')}>
                          <IconButton
                            size="small"
                            onClick={() => handleDownload(report)}
                            sx={{ color: T.color.muted, '&:hover': { bgcolor: T.color.mint, color: T.color.forest } }}
                          >
                            <Download sx={{ fontSize: 20 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default ReportsList;