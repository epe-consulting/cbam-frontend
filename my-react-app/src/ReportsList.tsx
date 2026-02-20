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
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ArrowBack, OpenInNew, Download } from '@mui/icons-material';
import { listCompanyReports, type BlobReportItem } from './utils/blobStorage';
import { apiRequest } from './utils/api';

const BLOB_SAS_TOKEN = import.meta.env.VITE_BLOB_SAS_TOKEN || '';

const ReportsList: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<BlobReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      const meResult = await apiRequest<{ success: boolean; user?: { companyId?: number | null } }>('/users/me');
      if (!meResult?.data?.success || meResult.data.user?.companyId == null) {
        setError('Could not determine your company. Please check your account settings.');
        setLoading(false);
        return;
      }
      const companyId = meResult.data.user.companyId;
      const result = await listCompanyReports(companyId);
      if (result.success) {
        setReports(result.reports);
      } else {
        setError(result.error ?? 'Failed to load reports.');
      }
      setLoading(false);
    };
    fetchReports();
  }, []);

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

  const getSignedUrl = (report: BlobReportItem) => {
    return `${report.url}?${BLOB_SAS_TOKEN}`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={3} display="flex" alignItems="center" gap={2}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
        All Reports
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Reports generated and stored for your company.
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
                <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Report Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Last Modified</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No reports yet. Generate one from the dashboard.
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report, idx) => (
                  <TableRow key={report.name} hover>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {getDisplayName(report.name)}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(report.lastModified)}</TableCell>
                    <TableCell>{formatSize(report.contentLength)}</TableCell>
                    <TableCell align="center">
                      <Box display="flex" gap={1} justifyContent="center">
                        <Tooltip title="Open in new tab">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => window.open(getSignedUrl(report), '_blank')}
                          >
                            <OpenInNew />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download">
                          <IconButton
                            size="small"
                            color="primary"
                            component="a"
                            href={getSignedUrl(report)}
                            download={getDisplayName(report.name)}
                          >
                            <Download />
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
