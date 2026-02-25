import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from './utils/api';
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  Snackbar,
  Divider,
  Skeleton,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  Business,
  Person,
  Save,
  Factory,
  Add,
  Edit,
  Delete,
  Close,
} from '@mui/icons-material';

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
    blue: '#1A4B8E',
    blueLight: '#EBF2FF',
  },
  radius: {
    sm: '8px',
    md: '14px',
    lg: '20px',
    xl: '28px',
    pill: '999px',
  },
};

const sectionPaperSx = {
  borderRadius: T.radius.lg,
  border: `1px solid ${T.color.lineFaint}`,
  bgcolor: T.color.warmWhite,
  overflow: 'hidden' as const,
};

const textFieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: T.radius.sm, fontFamily: T.font.body },
  '& .MuiInputLabel-root': { fontFamily: T.font.body },
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

const dialogPaperSx = {
  borderRadius: T.radius.lg,
  border: `1px solid ${T.color.lineFaint}`,
};

const dialogAccentBar = (color?: string) => ({
  height: '4px',
  background: color || `linear-gradient(90deg, ${T.color.forest}, ${T.color.sage}, ${T.color.accent})`,
});

interface UserData {
  id: number;
  username: string;
  email: string;
  companyName: string;
  companyCountry: string;
  companyRegistrationNumber: string;
  companyContactPerson: string;
  companyId: number | null;
}

interface InstallationData {
  id: number;
  companyId: number;
  installationName: string;
  address: string;
  country: string;
  unLocode: string;
  latitude: number | null;
  longitude: number | null;
  cbamRegistryInstallationId: string;
}

interface InstallationForm {
  installationName: string;
  address: string;
  country: string;
  unLocode: string;
  latitude: string;
  longitude: string;
  cbamRegistryInstallationId: string;
}

const emptyInstForm = (): InstallationForm => ({
  installationName: '', address: '', country: '', unLocode: '',
  latitude: '', longitude: '', cbamRegistryInstallationId: '',
});

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState('');
  const [companyContactPerson, setCompanyContactPerson] = useState('');
  const [companySaving, setCompanySaving] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companySuccess, setCompanySuccess] = useState(false);

  const [installations, setInstallations] = useState<InstallationData[]>([]);
  const [instLoading, setInstLoading] = useState(false);
  const [instError, setInstError] = useState<string | null>(null);

  const [instDialogOpen, setInstDialogOpen] = useState(false);
  const [instEditId, setInstEditId] = useState<number | null>(null);
  const [instForm, setInstForm] = useState<InstallationForm>(emptyInstForm());
  const [instSaving, setInstSaving] = useState(false);
  const [instFormError, setInstFormError] = useState<string | null>(null);
  const [instSuccess, setInstSuccess] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const result = await apiRequest<{ success: boolean; user?: UserData }>('/users/me');
      if (result && result.data.success && result.data.user) {
        const u = result.data.user;
        setUserData(u);
        setUsername(u.username || '');
        setEmail(u.email || '');
        setCompanyName(u.companyName || '');
        setCompanyCountry(u.companyCountry || '');
        setCompanyRegistrationNumber(u.companyRegistrationNumber || '');
        setCompanyContactPerson(u.companyContactPerson || '');
        if (u.companyId) {
          fetchInstallations(u.companyId);
        }
      } else {
        setFetchError('Failed to load your profile. Please try again.');
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const fetchInstallations = async (companyId: number) => {
    setInstLoading(true);
    setInstError(null);
    const res = await apiRequest<{ success: boolean; installations?: InstallationData[] }>(
      `/installations/company/${companyId}`
    );
    if (res?.data?.success && Array.isArray(res.data.installations)) {
      setInstallations(res.data.installations);
    } else {
      setInstError('Failed to load installations');
    }
    setInstLoading(false);
  };

  const handleSaveUser = async () => {
    setUserSaving(true);
    setUserError(null);
    try {
      const result = await apiRequest<{ success: boolean; message?: string; user?: UserData }>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ username: username.trim() }),
      });
      if (!result) { setUserError('Session expired'); return; }
      if (!result.data.success) { setUserError(result.data.message || 'Failed to update profile'); return; }
      if (result.data.user) {
        setUserData(result.data.user);
        setUsername(result.data.user.username || '');
        setEmail(result.data.user.email || '');
      }
      setUserSuccess(true);
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUserSaving(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!userData?.companyId) { setCompanyError('No company assigned'); return; }
    setCompanySaving(true);
    setCompanyError(null);
    try {
      const result = await apiRequest<{
        success: boolean; message?: string;
        company?: { name: string; country: string; registrationNumber: string; contactPerson: string };
      }>(`/companies/${userData.companyId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: companyName.trim(),
          country: companyCountry.trim(),
          registrationNumber: companyRegistrationNumber.trim(),
          contactPerson: companyContactPerson.trim(),
        }),
      });
      if (!result) { setCompanyError('Session expired'); return; }
      if (!result.data.success) { setCompanyError(result.data.message || 'Failed to update company'); return; }
      if (result.data.company) {
        setCompanyName(result.data.company.name || '');
        setCompanyCountry(result.data.company.country || '');
        setCompanyRegistrationNumber(result.data.company.registrationNumber || '');
        setCompanyContactPerson(result.data.company.contactPerson || '');
      }
      setCompanySuccess(true);
    } catch (err) {
      setCompanyError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setCompanySaving(false);
    }
  };

  const openAddInstallation = () => {
    setInstEditId(null);
    setInstForm(emptyInstForm());
    setInstFormError(null);
    setInstDialogOpen(true);
  };

  const openEditInstallation = (inst: InstallationData) => {
    setInstEditId(inst.id);
    setInstForm({
      installationName: inst.installationName || '',
      address: inst.address || '',
      country: inst.country || '',
      unLocode: inst.unLocode || '',
      latitude: inst.latitude != null ? String(inst.latitude) : '',
      longitude: inst.longitude != null ? String(inst.longitude) : '',
      cbamRegistryInstallationId: inst.cbamRegistryInstallationId || '',
    });
    setInstFormError(null);
    setInstDialogOpen(true);
  };

  const handleSaveInstallation = async () => {
    if (!instForm.installationName.trim()) {
      setInstFormError('Installation name is required');
      return;
    }
    setInstSaving(true);
    setInstFormError(null);
    try {
      const body = {
        installationName: instForm.installationName.trim(),
        address: instForm.address.trim(),
        country: instForm.country.trim(),
        unLocode: instForm.unLocode.trim(),
        latitude: instForm.latitude.trim(),
        longitude: instForm.longitude.trim(),
        cbamRegistryInstallationId: instForm.cbamRegistryInstallationId.trim(),
      };

      if (instEditId) {
        await apiRequest(`/installations/${instEditId}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await apiRequest(`/installations/company/${userData!.companyId}`, { method: 'POST', body: JSON.stringify(body) });
      }

      setInstDialogOpen(false);
      setInstSuccess(true);
      if (userData?.companyId) fetchInstallations(userData.companyId);
    } catch (err) {
      setInstFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setInstSaving(false);
    }
  };

  const handleDeleteInstallation = async () => {
    if (deleteConfirmId == null) return;
    setDeleteLoading(true);
    try {
      await apiRequest(`/installations/${deleteConfirmId}`, { method: 'DELETE' });
      setDeleteConfirmId(null);
      setInstSuccess(true);
      if (userData?.companyId) fetchInstallations(userData.companyId);
    } catch {
      setInstError('Failed to delete installation');
    } finally {
      setDeleteLoading(false);
    }
  };

  const userChanged = userData && username.trim() !== (userData.username || '');
  const companyChanged = userData && (
    companyName.trim() !== (userData.companyName || '') ||
    companyCountry.trim() !== (userData.companyCountry || '') ||
    companyRegistrationNumber.trim() !== (userData.companyRegistrationNumber || '') ||
    companyContactPerson.trim() !== (userData.companyContactPerson || '')
  );

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 3, fontFamily: T.font.body }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2, borderRadius: T.radius.sm }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: T.radius.lg, mb: 3 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: T.radius.lg }} />
      </Container>
    );
  }

  if (fetchError) {
    return (
      <Container maxWidth="md" sx={{ py: 3, fontFamily: T.font.body }}>
        <Alert severity="error" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>{fetchError}</Alert>
        <Button
          startIcon={<ArrowBack sx={{ fontSize: '18px !important' }} />}
          onClick={() => navigate('/dashboard')}
          sx={{ fontFamily: T.font.body, fontWeight: 500, textTransform: 'none', color: T.color.muted, borderRadius: T.radius.pill, '&:hover': { bgcolor: T.color.mint, color: T.color.forest } }}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3, fontFamily: T.font.body }}>
      {/* Header */}
      <Box mb={4}>
        <Button
          startIcon={<ArrowBack sx={{ fontSize: '18px !important' }} />}
          onClick={() => navigate('/dashboard')}
          sx={{
            mb: 2, fontFamily: T.font.body, fontWeight: 500, fontSize: '0.9rem',
            color: T.color.muted, textTransform: 'none', borderRadius: T.radius.pill,
            '&:hover': { bgcolor: T.color.mint, color: T.color.forest },
          }}
        >
          Back to Dashboard
        </Button>
        <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '1.6rem', md: '2rem' }, color: T.color.ink, letterSpacing: '-0.02em', mb: 0.5 }}>
          Settings
        </Typography>
        <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.6 }}>
          Manage your profile, company information and installation sites
        </Typography>
      </Box>

      {/* User Profile Section */}
      <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 3, md: 4 }, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Box sx={{ width: 48, height: 48, borderRadius: T.radius.md, bgcolor: T.color.mint, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.color.forest }}>
            <Person />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.15rem', color: T.color.ink }}>Your Profile</Typography>
            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>Update your personal information</Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 3, borderColor: T.color.lineFaint }} />
        {userError && <Alert severity="error" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }} onClose={() => setUserError(null)}>{userError}</Alert>}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Username" value={username} onChange={e => setUsername(e.target.value)}
              variant="outlined" slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Email" type="email" value={email} variant="outlined" disabled
              slotProps={{ inputLabel: { shrink: true } }} helperText="Contact an administrator to change your email" sx={textFieldSx} />
          </Grid>
          <Grid size={12}>
            <Box display="flex" justifyContent="flex-end">
              <Button variant="contained" disableElevation startIcon={<Save />} onClick={handleSaveUser}
                disabled={userSaving || !userChanged}
                sx={{
                  fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', borderRadius: T.radius.pill,
                  bgcolor: T.color.forest, '&:hover': { bgcolor: T.color.ctaHover },
                }}>
                {userSaving ? 'Saving…' : 'Save Profile'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Company Section */}
      <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 3, md: 4 }, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Box sx={{ width: 48, height: 48, borderRadius: T.radius.md, bgcolor: T.color.mint, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.color.forest }}>
            <Business />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.15rem', color: T.color.ink }}>Company Information</Typography>
            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>
              {userData?.companyId ? 'Update your company details' : 'No company assigned — contact your administrator'}
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 3, borderColor: T.color.lineFaint }} />
        {companyError && <Alert severity="error" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }} onClose={() => setCompanyError(null)}>{companyError}</Alert>}
        {userData?.companyId ? (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Company Name" value={companyName}
                onChange={e => setCompanyName(e.target.value)} variant="outlined"
                slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Country" value={companyCountry}
                onChange={e => setCompanyCountry(e.target.value)} variant="outlined"
                slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Registration Number" value={companyRegistrationNumber}
                onChange={e => setCompanyRegistrationNumber(e.target.value)} variant="outlined"
                slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Contact Person" value={companyContactPerson}
                onChange={e => setCompanyContactPerson(e.target.value)} variant="outlined"
                slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx}
                placeholder="Name / email" />
            </Grid>
            <Grid size={12}>
              <Box display="flex" justifyContent="flex-end">
                <Button variant="contained" disableElevation startIcon={<Save />} onClick={handleSaveCompany}
                  disabled={companySaving || !companyChanged}
                  sx={{
                    fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', borderRadius: T.radius.pill,
                    bgcolor: T.color.forest, '&:hover': { bgcolor: T.color.ctaHover },
                  }}>
                  {companySaving ? 'Saving…' : 'Save Company'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="info" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>
            Your account does not have a company assigned. Please contact your administrator to assign you to a company.
          </Alert>
        )}
      </Paper>

      {/* Installations Section */}
      {userData?.companyId && (
        <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 3, md: 4 } }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Box sx={{ width: 48, height: 48, borderRadius: T.radius.md, bgcolor: T.color.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.color.blue }}>
                <Factory />
              </Box>
              <Box>
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.15rem', color: T.color.ink }}>Installation Sites</Typography>
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>Manage your production sites</Typography>
              </Box>
            </Box>
            <Button variant="contained" disableElevation startIcon={<Add />} onClick={openAddInstallation}
              sx={{
                fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', borderRadius: T.radius.pill,
                bgcolor: T.color.forest, '&:hover': { bgcolor: T.color.ctaHover },
              }}>
              Add Installation
            </Button>
          </Box>
          <Divider sx={{ mb: 3, borderColor: T.color.lineFaint }} />
          {instError && <Alert severity="error" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }} onClose={() => setInstError(null)}>{instError}</Alert>}

          {instLoading ? (
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: T.radius.md }} />
          ) : installations.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>No installation sites added yet. Click "Add Installation" to create one.</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={tableHeadCellSx}>Name</TableCell>
                    <TableCell sx={tableHeadCellSx}>Country</TableCell>
                    <TableCell sx={tableHeadCellSx}>Address</TableCell>
                    <TableCell sx={tableHeadCellSx}>UN/LOCODE</TableCell>
                    <TableCell sx={tableHeadCellSx}>CBAM Registry ID</TableCell>
                    <TableCell sx={{ ...tableHeadCellSx, textAlign: 'center' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {installations.map(inst => (
                    <TableRow key={inst.id} sx={{ '&:hover': { bgcolor: T.color.lineFaint }, transition: 'background 0.15s ease' }}>
                      <TableCell sx={tableCellSx}>
                        <Typography sx={{ fontFamily: T.font.body, fontWeight: 500, fontSize: '0.88rem', color: T.color.ink }}>
                          {inst.installationName || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={tableCellSx}>{inst.country || '—'}</TableCell>
                      <TableCell sx={{ ...tableCellSx, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inst.address || '—'}
                      </TableCell>
                      <TableCell sx={tableCellSx}>
                        {inst.unLocode ? (
                          <Chip label={inst.unLocode} size="small" variant="outlined"
                            sx={{ fontFamily: T.font.body, fontSize: '0.78rem', borderColor: T.color.line, color: T.color.inkSoft }} />
                        ) : '—'}
                      </TableCell>
                      <TableCell sx={tableCellSx}>{inst.cbamRegistryInstallationId || '—'}</TableCell>
                      <TableCell sx={{ ...tableCellSx, textAlign: 'center' }}>
                        <Box display="flex" gap={0.5} justifyContent="center">
                          <IconButton size="small" onClick={() => openEditInstallation(inst)}
                            sx={{ color: T.color.muted, '&:hover': { bgcolor: T.color.mint, color: T.color.forest } }}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => setDeleteConfirmId(inst.id)}
                            sx={{ color: T.color.muted, '&:hover': { bgcolor: T.color.errorLight, color: T.color.error } }}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Installation Add/Edit Dialog */}
      <Dialog open={instDialogOpen} onClose={() => setInstDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: dialogPaperSx }}>
        <Box sx={dialogAccentBar()} />
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: T.font.display, fontWeight: 600, fontSize: '1.15rem', color: T.color.ink }}>
          {instEditId ? 'Edit Installation' : 'Add Installation'}
          <IconButton onClick={() => setInstDialogOpen(false)} size="small"
            sx={{ color: T.color.muted, '&:hover': { bgcolor: T.color.mint, color: T.color.forest } }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: T.color.lineFaint }}>
          {instFormError && <Alert severity="error" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>{instFormError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField fullWidth label="Installation Name" required value={instForm.installationName}
                onChange={e => setInstForm(p => ({ ...p, installationName: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="Address" value={instForm.address}
                onChange={e => setInstForm(p => ({ ...p, address: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Country" value={instForm.country}
                onChange={e => setInstForm(p => ({ ...p, country: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="UN/LOCODE" value={instForm.unLocode}
                onChange={e => setInstForm(p => ({ ...p, unLocode: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Latitude" value={instForm.latitude} type="number"
                onChange={e => setInstForm(p => ({ ...p, latitude: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} placeholder="e.g. 48.8566" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Longitude" value={instForm.longitude} type="number"
                onChange={e => setInstForm(p => ({ ...p, longitude: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} placeholder="e.g. 2.3522" />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="CBAM Registry Installation ID" value={instForm.cbamRegistryInstallationId}
                onChange={e => setInstForm(p => ({ ...p, cbamRegistryInstallationId: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setInstDialogOpen(false)}
            sx={{ fontFamily: T.font.body, fontWeight: 500, textTransform: 'none', color: T.color.muted, borderRadius: T.radius.pill }}>
            Cancel
          </Button>
          <Button variant="contained" disableElevation onClick={handleSaveInstallation} disabled={instSaving}
            sx={{
              fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', borderRadius: T.radius.pill,
              bgcolor: T.color.forest, '&:hover': { bgcolor: T.color.ctaHover },
            }}>
            {instSaving ? 'Saving…' : instEditId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId != null} onClose={() => setDeleteConfirmId(null)}
        PaperProps={{ sx: dialogPaperSx }}>
        <Box sx={dialogAccentBar(`linear-gradient(90deg, ${T.color.error}, #E74C3C, ${T.color.accent})`)} />
        <DialogTitle sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.1rem', color: T.color.ink }}>
          Delete Installation
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.inkSoft, lineHeight: 1.6 }}>
            Are you sure you want to delete this installation site? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteConfirmId(null)}
            sx={{ fontFamily: T.font.body, fontWeight: 500, textTransform: 'none', color: T.color.muted, borderRadius: T.radius.pill }}>
            Cancel
          </Button>
          <Button variant="contained" disableElevation onClick={handleDeleteInstallation} disabled={deleteLoading}
            sx={{
              fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', borderRadius: T.radius.pill,
              bgcolor: T.color.error, '&:hover': { bgcolor: '#A93226' },
            }}>
            {deleteLoading ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success snackbars */}
      <Snackbar open={userSuccess} autoHideDuration={3000} onClose={() => setUserSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setUserSuccess(false)} sx={{ fontFamily: T.font.body, borderRadius: T.radius.sm }}>Profile updated successfully</Alert>
      </Snackbar>
      <Snackbar open={companySuccess} autoHideDuration={3000} onClose={() => setCompanySuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setCompanySuccess(false)} sx={{ fontFamily: T.font.body, borderRadius: T.radius.sm }}>Company updated successfully</Alert>
      </Snackbar>
      <Snackbar open={instSuccess} autoHideDuration={3000} onClose={() => setInstSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setInstSuccess(false)} sx={{ fontFamily: T.font.body, borderRadius: T.radius.sm }}>Installation saved successfully</Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;