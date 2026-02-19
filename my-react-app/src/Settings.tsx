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
  Avatar,
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
      <Container maxWidth="md" sx={{ py: 2 }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  if (fetchError) {
    return (
      <Container maxWidth="md" sx={{ py: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{fetchError}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Box mb={4}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/dashboard')} sx={{ mb: 2 }}>
          Back to Dashboard
        </Button>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your profile, company information and installation sites
        </Typography>
      </Box>

      {/* User Profile Section */}
      <Paper elevation={2} sx={{ p: 4, borderRadius: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}><Person /></Avatar>
          <Box>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>Your Profile</Typography>
            <Typography variant="body2" color="text.secondary">Update your personal information</Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 3 }} />
        {userError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUserError(null)}>{userError}</Alert>}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Username" value={username} onChange={e => setUsername(e.target.value)}
              variant="outlined" slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Email" type="email" value={email} variant="outlined" disabled
              slotProps={{ inputLabel: { shrink: true } }} helperText="Contact an administrator to change your email" />
          </Grid>
          <Grid size={12}>
            <Box display="flex" justifyContent="flex-end">
              <Button variant="contained" startIcon={<Save />} onClick={handleSaveUser}
                disabled={userSaving || !userChanged}>
                {userSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Company Section */}
      <Paper elevation={2} sx={{ p: 4, borderRadius: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Avatar sx={{ bgcolor: '#059669', width: 48, height: 48 }}><Business /></Avatar>
          <Box>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>Company Information</Typography>
            <Typography variant="body2" color="text.secondary">
              {userData?.companyId ? 'Update your company details' : 'No company assigned — contact your administrator'}
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 3 }} />
        {companyError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCompanyError(null)}>{companyError}</Alert>}
        {userData?.companyId ? (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Company Name" value={companyName}
                onChange={e => setCompanyName(e.target.value)} variant="outlined"
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Country" value={companyCountry}
                onChange={e => setCompanyCountry(e.target.value)} variant="outlined"
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Registration Number" value={companyRegistrationNumber}
                onChange={e => setCompanyRegistrationNumber(e.target.value)} variant="outlined"
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Contact Person" value={companyContactPerson}
                onChange={e => setCompanyContactPerson(e.target.value)} variant="outlined"
                slotProps={{ inputLabel: { shrink: true } }}
                placeholder="Name / email" />
            </Grid>
            <Grid size={12}>
              <Box display="flex" justifyContent="flex-end">
                <Button variant="contained" startIcon={<Save />} onClick={handleSaveCompany}
                  disabled={companySaving || !companyChanged}
                  sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
                  {companySaving ? 'Saving...' : 'Save Company'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="info">
            Your account does not have a company assigned. Please contact your administrator to assign you to a company.
          </Alert>
        )}
      </Paper>

      {/* Installations Section */}
      {userData?.companyId && (
        <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: '#0284c7', width: 48, height: 48 }}><Factory /></Avatar>
              <Box>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>Installation Sites</Typography>
                <Typography variant="body2" color="text.secondary">Manage your production sites</Typography>
              </Box>
            </Box>
            <Button variant="contained" startIcon={<Add />} onClick={openAddInstallation}
              sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
              Add Installation
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />
          {instError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setInstError(null)}>{instError}</Alert>}

          {instLoading ? (
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
          ) : installations.length === 0 ? (
            <Alert severity="info">No installation sites added yet. Click "Add Installation" to create one.</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Country</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Address</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>UN/LOCODE</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>CBAM Registry ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {installations.map(inst => (
                    <TableRow key={inst.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {inst.installationName || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{inst.country || '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inst.address || '—'}
                      </TableCell>
                      <TableCell>
                        {inst.unLocode ? <Chip label={inst.unLocode} size="small" variant="outlined" /> : '—'}
                      </TableCell>
                      <TableCell>{inst.cbamRegistryInstallationId || '—'}</TableCell>
                      <TableCell align="center">
                        <Box display="flex" gap={0.5} justifyContent="center">
                          <IconButton size="small" onClick={() => openEditInstallation(inst)} color="primary">
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => setDeleteConfirmId(inst.id)} color="error">
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
      <Dialog open={instDialogOpen} onClose={() => setInstDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {instEditId ? 'Edit Installation' : 'Add Installation'}
          <IconButton onClick={() => setInstDialogOpen(false)} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {instFormError && <Alert severity="error" sx={{ mb: 2 }}>{instFormError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField fullWidth label="Installation Name" required value={instForm.installationName}
                onChange={e => setInstForm(p => ({ ...p, installationName: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="Address" value={instForm.address}
                onChange={e => setInstForm(p => ({ ...p, address: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Country" value={instForm.country}
                onChange={e => setInstForm(p => ({ ...p, country: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="UN/LOCODE" value={instForm.unLocode}
                onChange={e => setInstForm(p => ({ ...p, unLocode: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Latitude" value={instForm.latitude} type="number"
                onChange={e => setInstForm(p => ({ ...p, latitude: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} placeholder="e.g. 48.8566" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Longitude" value={instForm.longitude} type="number"
                onChange={e => setInstForm(p => ({ ...p, longitude: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} placeholder="e.g. 2.3522" />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="CBAM Registry Installation ID" value={instForm.cbamRegistryInstallationId}
                onChange={e => setInstForm(p => ({ ...p, cbamRegistryInstallationId: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setInstDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveInstallation} disabled={instSaving}
            sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
            {instSaving ? 'Saving...' : instEditId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId != null} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Delete Installation</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this installation site? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteInstallation} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success snackbars */}
      <Snackbar open={userSuccess} autoHideDuration={3000} onClose={() => setUserSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setUserSuccess(false)}>Profile updated successfully</Alert>
      </Snackbar>
      <Snackbar open={companySuccess} autoHideDuration={3000} onClose={() => setCompanySuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setCompanySuccess(false)}>Company updated successfully</Alert>
      </Snackbar>
      <Snackbar open={instSuccess} autoHideDuration={3000} onClose={() => setInstSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setInstSuccess(false)}>Installation saved successfully</Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;
