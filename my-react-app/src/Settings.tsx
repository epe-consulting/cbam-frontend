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
} from '@mui/material';
import {
  ArrowBack,
  Business,
  Person,
  Save,
} from '@mui/icons-material';

interface UserData {
  id: number;
  username: string;
  email: string;
  companyName: string;
  companyCountry: string;
  companyId: number | null;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // User form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState(false);

  // Company form state
  const [companyName, setCompanyName] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [companySaving, setCompanySaving] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companySuccess, setCompanySuccess] = useState(false);

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
      } else {
        setFetchError('Failed to load your profile. Please try again.');
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleSaveUser = async () => {
    setUserSaving(true);
    setUserError(null);
    try {
      const result = await apiRequest<{ success: boolean; message?: string; user?: UserData }>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ username: username.trim() }),
      });
      if (!result) {
        setUserError('Session expired');
        return;
      }
      if (!result.data.success) {
        setUserError(result.data.message || 'Failed to update profile');
        return;
      }
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
    if (!userData?.companyId) {
      setCompanyError('No company assigned to your account');
      return;
    }
    setCompanySaving(true);
    setCompanyError(null);
    try {
      const result = await apiRequest<{ success: boolean; message?: string; company?: { name: string; country: string } }>(
        `/companies/${userData.companyId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ name: companyName.trim() }),
        }
      );
      if (!result) {
        setCompanyError('Session expired');
        return;
      }
      if (!result.data.success) {
        setCompanyError(result.data.message || 'Failed to update company');
        return;
      }
      if (result.data.company) {
        setCompanyName(result.data.company.name || '');
        setCompanyCountry(result.data.company.country || '');
      }
      setCompanySuccess(true);
    } catch (err) {
      setCompanyError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setCompanySaving(false);
    }
  };

  const userChanged = userData && username.trim() !== (userData.username || '');
  const companyChanged = userData && companyName.trim() !== (userData.companyName || '');

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
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
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
          Manage your profile and company information
        </Typography>
      </Box>

      {/* User Profile Section */}
      <Paper elevation={2} sx={{ p: 4, borderRadius: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
            <Person />
          </Avatar>
          <Box>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
              Your Profile
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update your personal information
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {userError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUserError(null)}>
            {userError}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              variant="outlined"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              variant="outlined"
              disabled
              slotProps={{ inputLabel: { shrink: true } }}
              helperText="Contact an administrator to change your email"
            />
          </Grid>
          <Grid size={12}>
            <Box display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveUser}
                disabled={userSaving || !userChanged}
              >
                {userSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Company Section */}
      <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Avatar sx={{ bgcolor: '#059669', width: 48, height: 48 }}>
            <Business />
          </Avatar>
          <Box>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
              Company Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {userData?.companyId
                ? 'Update your company details'
                : 'No company assigned — contact your administrator'}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {companyError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCompanyError(null)}>
            {companyError}
          </Alert>
        )}

        {userData?.companyId ? (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                variant="outlined"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Country"
                value={companyCountry}
                variant="outlined"
                disabled
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="Contact an administrator to change the country"
              />
            </Grid>
            <Grid size={12}>
              <Box display="flex" justifyContent="flex-end">
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveCompany}
                  disabled={companySaving || !companyChanged}
                  sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                >
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

      {/* Success snackbars */}
      <Snackbar
        open={userSuccess}
        autoHideDuration={3000}
        onClose={() => setUserSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setUserSuccess(false)}>
          Profile updated successfully
        </Alert>
      </Snackbar>
      <Snackbar
        open={companySuccess}
        autoHideDuration={3000}
        onClose={() => setCompanySuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setCompanySuccess(false)}>
          Company updated successfully
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;
