import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Shield,
  Email,
  Lock,
  PersonAdd,
  Logout,
  ArrowBack,
  AdminPanelSettings,
  TableChart,
  Search,
  ArrowUpward,
  ArrowDownward,
  Add,
  Business,
} from '@mui/icons-material';
import { API_BASE_URL } from './utils/api';

/* ─── Design tokens (shared across all Panonia pages) ─── */
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
  },
  radius: {
    sm: '8px',
    md: '14px',
    lg: '20px',
    pill: '999px',
  },
};

const textFieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: T.radius.sm, fontFamily: T.font.body },
  '& .MuiInputLabel-root': { fontFamily: T.font.body },
};

const ADMIN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&display=swap');
`;

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role?: string;
  createdAt?: string;
  modifiedAt?: string;
}

interface StoredUser {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface Company {
  id: number;
  name: string;
  createdAt?: string;
  modifiedAt?: string;
}

const DATA_TABLES: { id: string; label: string; endpoint: string; responseKey: string; createEndpoint: string }[] = [
  { id: 'admins', label: 'Admins', endpoint: '/admin/all', responseKey: 'admins', createEndpoint: '/admin/create' },
  { id: 'companies', label: 'Companies', endpoint: '/companies/all', responseKey: 'companies', createEndpoint: '/companies/create' },
  { id: 'users', label: 'Users', endpoint: '/users', responseKey: 'users', createEndpoint: '/users/create' },
  { id: 'emission-factors', label: 'Emission Factors', endpoint: '/emission-factors/all', responseKey: 'emissionFactors', createEndpoint: '/emission-factors/create' },
  { id: 'emission-factor-types', label: 'Emission Factor Types', endpoint: '/emission-factor-types/all', responseKey: 'emissionFactorTypes', createEndpoint: '/emission-factor-types/create' },
  { id: 'emission-factor-values', label: 'Emission Factor Values', endpoint: '/emission-factor-values/all', responseKey: 'emissionFactorValues', createEndpoint: '/emission-factor-values/create' },
  { id: 'nominators', label: 'Nominators', endpoint: '/nominators/all', responseKey: 'nominators', createEndpoint: '/nominators/create' },
  { id: 'denominators', label: 'Denominators', endpoint: '/denominators/all', responseKey: 'denominators', createEndpoint: '/denominators/create' },
];

function getCellDisplay(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
    const obj = value as Record<string, unknown>;
    if (Object.keys(obj).length === 0) return '—';
    if ('id' in obj && Object.keys(obj).length <= 2) return String(obj.id);
    if ('username' in obj) return String(obj.username);
    if ('email' in obj) return String(obj.email);
    if ('emissionFactorType' in obj) return String((obj as { emissionFactorType?: string }).emissionFactorType);
    if ('nominator' in obj && typeof (obj as { nominator?: unknown }).nominator === 'object') return String((obj as { nominator?: { nominator?: string } }).nominator?.nominator ?? '');
    if ('denominator' in obj && typeof (obj as { denominator?: unknown }).denominator === 'object') return String((obj as { denominator?: { denominator?: string } }).denominator?.denominator ?? '');
    return JSON.stringify(obj).slice(0, 80);
  }
  if (Array.isArray(value)) return value.length ? `[${value.length} items]` : '[]';
  if (typeof value === 'string' && value.length > 60) return value.slice(0, 60) + '…';
  return String(value);
}

function getSortableValue(value: unknown): string | number | Date {
  if (value == null) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return value as number;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && value !== null && 'id' in (value as object)) return (value as { id: unknown }).id as number;
  return getCellDisplay(value);
}

const Admin: React.FC = () => {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [createUsername, setCreateUsername] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [activeTab, setActiveTab] = useState(0);
  const [dataTableId, setDataTableId] = useState<string | null>(null);
  const [dataRows, setDataRows] = useState<Record<string, unknown>[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [dataSearch, setDataSearch] = useState('');
  const [dataSortKey, setDataSortKey] = useState<string | null>(null);
  const [dataSortDir, setDataSortDir] = useState<'asc' | 'desc'>('asc');

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState<Record<string, string>>({});
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [createCompanyName, setCreateCompanyName] = useState('');
  const [createCompanyCountry, setCreateCompanyCountry] = useState('');
  const [createCompanyLoading, setCreateCompanyLoading] = useState(false);
  const [createCompanyError, setCreateCompanyError] = useState('');
  const [createCompanySuccess, setCreateCompanySuccess] = useState('');
  const [countries, setCountries] = useState<string[]>([]);

  /* Inject fonts */
  useEffect(() => {
    if (document.getElementById('panonia-global-styles')) return;
    const style = document.createElement('style');
    style.id = 'panonia-global-styles';
    style.textContent = ADMIN_STYLES;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (token && userStr) {
      try {
        const user: StoredUser = JSON.parse(userStr);
        setIsAdmin(user.role === 'ADMIN');
      } catch {
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setAdminsLoading(true);
    fetch(`${API_BASE_URL}/admin/all`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.admins) setAdmins(data.admins);
      })
      .catch(() => setAdmins([]))
      .finally(() => setAdminsLoading(false));
  }, [isAdmin, createSuccess]);

  useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_BASE_URL}/emission-factors/lookup/subsubsectors?sector=Energy&subsector=Electricity`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.subsubsectors)) {
          setCountries(data.subsubsectors.sort());
        }
      })
      .catch(() => setCountries([]));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setCompaniesLoading(true);
    fetch(`${API_BASE_URL}/companies/all`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.companies) setCompanies(data.companies);
      })
      .catch(() => setCompanies([]))
      .finally(() => setCompaniesLoading(false));
  }, [isAdmin, createCompanySuccess]);

  const loadDataTable = (tableId: string) => {
    const config = DATA_TABLES.find((t) => t.id === tableId);
    if (!config) return;
    setDataTableId(tableId);
    setDataError('');
    setDataSearch('');
    setDataSortKey(null);
    setDataSortDir('asc');
    const token = localStorage.getItem('token');
    if (!token) {
      setDataError(t('admin.notAuth'));
      setDataRows([]);
      return;
    }
    setDataLoading(true);
    fetch(`${API_BASE_URL}${config.endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data[config.responseKey] != null) {
          const rows = Array.isArray(data[config.responseKey]) ? data[config.responseKey] : [];
          setDataRows(rows.map((r: unknown) => (r && typeof r === 'object' ? (r as Record<string, unknown>) : {})));
        } else {
          setDataRows([]);
          setDataError(data.message || t('admin.loadFailed'));
        }
      })
      .catch(() => {
        setDataRows([]);
        setDataError(t('admin.requestFailed'));
      })
      .finally(() => setDataLoading(false));
  };

  const dataColumns = dataRows.length > 0 ? Object.keys(dataRows[0]).filter((k) => k !== 'password') : [];
  const filteredRows = dataSearch.trim()
    ? dataRows.filter((row) =>
        dataColumns.some((col) =>
          getCellDisplay(row[col]).toLowerCase().includes(dataSearch.trim().toLowerCase())
        )
      )
    : dataRows;
  const sortedRows =
    dataSortKey == null
      ? filteredRows
      : [...filteredRows].sort((a, b) => {
          const va = getSortableValue(a[dataSortKey]);
          const vb = getSortableValue(b[dataSortKey]);
          const cmp =
            typeof va === 'number' && typeof vb === 'number'
              ? va - vb
              : String(va).localeCompare(String(vb), undefined, { numeric: true });
          return dataSortDir === 'asc' ? cmp : -cmp;
        });

  const handleSort = (key: string) => {
    if (dataSortKey === key) setDataSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setDataSortKey(key);
      setDataSortDir('asc');
    }
  };

  const getDefaultAddForm = (tableId: string): Record<string, string> => {
    const defaults: Record<string, Record<string, string>> = {
      admins: { username: '', email: '', password: '' },
      users: { username: '', email: '', password: '', companyId: '' },
      companies: { name: '', country: '' },
      'emission-factors': { sector: '', subsector: '', subsubsector: '', emissionFactorName: '', emissionFactorTypeId: '', nominatorId: '', denominatorId: '', emissionFactorValueId: '', createdByUserId: '' },
      'emission-factor-types': { emissionFactorType: '' },
      'emission-factor-values': { value: '', co2: '', ch4: '', n2o: '', hfcs: '', pfcs: '', sf6: '', nf3: '', description: '', year: '', location: '', sourceName: '', sourceUrl: '', sourceAuthor: '', tags: '' },
      nominators: { nominator: '' },
      denominators: { denominator: '' },
    };
    return { ...(defaults[tableId] || {}) };
  };

  const openAddDialog = () => {
    if (!dataTableId) return;
    setAddForm(getDefaultAddForm(dataTableId));
    setAddError('');
    setAddDialogOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataTableId) return;
    const config = DATA_TABLES.find((t) => t.id === dataTableId);
    if (!config) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setAddError(t('admin.notAuth'));
      return;
    }
    setAddLoading(true);
    setAddError('');
    try {
      let body: Record<string, unknown> = {};
      if (dataTableId === 'companies') {
        const name = addForm.name?.trim();
        if (!name) {
          setAddError(t('admin.companyNameRequired'));
          setAddLoading(false);
          return;
        }
        let companyUrl = `${API_BASE_URL}${config.createEndpoint}?name=${encodeURIComponent(name)}`;
        if (addForm.country) {
          companyUrl += `&country=${encodeURIComponent(addForm.country)}`;
        }
        const res = await fetch(companyUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setAddDialogOpen(false);
          loadDataTable(dataTableId);
          setCreateCompanySuccess((s) => (s ? '' : ' '));
        } else {
          setAddError(data.message || t('admin.createCompanyFailed'));
        }
        setAddLoading(false);
        return;
      }
      if (dataTableId === 'admins' || dataTableId === 'users') {
        body = { username: addForm.username, email: addForm.email, password: addForm.password };
        if (dataTableId === 'users' && addForm.companyId) {
          const companyId = Number(addForm.companyId);
          if (!Number.isNaN(companyId)) body.companyId = companyId;
        }
      } else if (dataTableId === 'emission-factor-types') {
        body = { emissionFactorType: addForm.emissionFactorType };
      } else if (dataTableId === 'nominators') {
        body = { nominator: addForm.nominator };
      } else if (dataTableId === 'denominators') {
        body = { denominator: addForm.denominator };
      } else if (dataTableId === 'emission-factors') {
        body = {
          sector: addForm.sector,
          subsector: addForm.subsector,
          subsubsector: addForm.subsubsector,
          emissionFactorName: addForm.emissionFactorName,
          emissionFactorTypeId: addForm.emissionFactorTypeId ? Number(addForm.emissionFactorTypeId) : undefined,
          nominatorId: addForm.nominatorId ? Number(addForm.nominatorId) : undefined,
          denominatorId: addForm.denominatorId ? Number(addForm.denominatorId) : undefined,
          emissionFactorValueId: addForm.emissionFactorValueId ? Number(addForm.emissionFactorValueId) : undefined,
          createdByUserId: addForm.createdByUserId ? Number(addForm.createdByUserId) : undefined,
        };
      } else if (dataTableId === 'emission-factor-values') {
        const tags = addForm.tags ? addForm.tags.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
        body = {
          value: addForm.value,
          co2: addForm.co2 || undefined,
          ch4: addForm.ch4 || undefined,
          n2o: addForm.n2o || undefined,
          hfcs: addForm.hfcs || undefined,
          pfcs: addForm.pfcs || undefined,
          sf6: addForm.sf6 || undefined,
          nf3: addForm.nf3 || undefined,
          description: addForm.description || undefined,
          year: addForm.year ? parseInt(addForm.year, 10) : undefined,
          location: addForm.location || undefined,
          sourceName: addForm.sourceName,
          sourceUrl: addForm.sourceUrl,
          sourceAuthor: addForm.sourceAuthor,
          tags,
        };
      }
      const res = await fetch(`${API_BASE_URL}${config.createEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAddDialogOpen(false);
        loadDataTable(dataTableId);
      } else {
        setAddError(data.message || t('admin.createFailed'));
      }
    } catch {
      setAddError(t('admin.requestFailed'));
    } finally {
      setAddLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok && data.success && data.token && data.admin) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({ ...data.admin, role: 'ADMIN' }));
        setIsAdmin(true);
      } else {
        setLoginError(data.message || t('admin.invalidLogin'));
      }
    } catch {
      setLoginError(t('admin.loginFailed'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAdmin(false);
    setEmail('');
    setPassword('');
    setLoginError('');
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreateLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setCreateError(t('admin.notAuth'));
      setCreateLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/admin/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: createUsername,
          email: createEmail,
          password: createPassword,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCreateSuccess(t('admin.adminCreated'));
        setCreateUsername('');
        setCreateEmail('');
        setCreatePassword('');
      } else {
        setCreateError(data.message || t('admin.createAdminFailed'));
      }
    } catch {
      setCreateError(t('admin.requestFailedRetry'));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleBackToHome = () => {
    window.location.href = '/';
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateCompanyError('');
    setCreateCompanySuccess('');
    const name = createCompanyName.trim();
    if (!name) {
      setCreateCompanyError(t('admin.companyNameRequired'));
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setCreateCompanyError(t('admin.notAuth'));
      return;
    }
    setCreateCompanyLoading(true);
    try {
      let url = `${API_BASE_URL}/companies/create?name=${encodeURIComponent(name)}`;
      if (createCompanyCountry) {
        url += `&country=${encodeURIComponent(createCompanyCountry)}`;
      }
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCreateCompanySuccess(t('admin.companyCreated'));
        setCreateCompanyName('');
        setCreateCompanyCountry('');
      } else {
        setCreateCompanyError(data.message || t('admin.createCompanyFailed'));
      }
    } catch {
      setCreateCompanyError(t('admin.requestFailedRetry'));
    } finally {
      setCreateCompanyLoading(false);
    }
  };

  /* ─── Shared styled paper for sections ─── */
  const sectionPaperSx = {
    borderRadius: T.radius.lg,
    border: `1px solid ${T.color.lineFaint}`,
    bgcolor: T.color.warmWhite,
    overflow: 'hidden',
  };

  const sectionHeaderSx = {
    p: 2.5,
    borderBottom: `1px solid ${T.color.lineFaint}`,
    bgcolor: T.color.cream,
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

  /* ─── Loading state ─── */
  if (isAdmin === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: T.color.cream }}>
        <CircularProgress sx={{ color: T.color.forest }} />
      </Box>
    );
  }

  /* ─── Login screen ─── */
  if (!isAdmin) {
    return (
      <Box sx={{
        minHeight: '100vh', bgcolor: T.color.cream, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: T.font.body, position: 'relative', overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: '120%', height: '60%',
          background: `radial-gradient(ellipse at center, ${T.color.mint} 0%, transparent 70%)`,
          pointerEvents: 'none', opacity: 0.6,
        },
      }}>
        <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
          <Paper elevation={0} sx={{ p: { xs: 4, md: 5 }, borderRadius: T.radius.lg, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: T.color.forest, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield sx={{ color: '#fff', fontSize: 22 }} />
              </Box>
              <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '1.5rem', color: T.color.ink }}>
                {t('admin.signInTitle')}
              </Typography>
            </Stack>
            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.92rem', color: T.color.muted, mb: 3.5, lineHeight: 1.6 }}>
              {t('admin.signInText')}
            </Typography>
            {loginError && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: T.radius.sm, fontFamily: T.font.body }}>
                {loginError}
              </Alert>
            )}
            <form onSubmit={handleAdminLogin}>
              <Stack spacing={2.5}>
                <TextField
                  fullWidth label={t('admin.email')} type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                  InputProps={{ startAdornment: <Email sx={{ mr: 1, color: T.color.muted, fontSize: 20 }} /> }}
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth label={t('admin.password')} type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                  InputProps={{ startAdornment: <Lock sx={{ mr: 1, color: T.color.muted, fontSize: 20 }} /> }}
                  sx={textFieldSx}
                />
                <Button
                  type="submit" variant="contained" size="large" fullWidth disableElevation
                  disabled={loginLoading}
                  startIcon={loginLoading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <Shield />}
                  sx={{
                    fontFamily: T.font.body, fontWeight: 600, fontSize: '0.95rem', textTransform: 'none',
                    bgcolor: T.color.forest, borderRadius: T.radius.pill, py: 1.4,
                    '&:hover': { bgcolor: T.color.ctaHover },
                  }}
                >
                  {loginLoading ? t('admin.signingIn') : t('admin.signIn')}
                </Button>
              </Stack>
            </form>
            <Button
              startIcon={<ArrowBack sx={{ fontSize: '18px !important' }} />}
              onClick={handleBackToHome}
              sx={{ mt: 3, fontFamily: T.font.body, fontWeight: 500, textTransform: 'none', color: T.color.muted, borderRadius: T.radius.pill, '&:hover': { bgcolor: T.color.mint, color: T.color.forest } }}
            >
              {t('admin.backToSite')}
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  /* ─── Admin dashboard ─── */
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: T.color.cream, fontFamily: T.font.body }}>
      {/* Top bar */}
      <Paper
        elevation={0}
        sx={{
          px: { xs: 2, md: 4 }, py: 1.8, mb: 0, borderRadius: 0,
          bgcolor: T.color.warmWhite, borderBottom: `1px solid ${T.color.line}`,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: T.color.forest, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AdminPanelSettings sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '1.2rem', color: T.color.ink }}>
              {t('admin.admin')}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button
              startIcon={<ArrowBack sx={{ fontSize: '18px !important' }} />}
              href="/"
              sx={{ fontFamily: T.font.body, fontWeight: 500, textTransform: 'none', color: T.color.muted, borderRadius: T.radius.pill, fontSize: '0.88rem', '&:hover': { bgcolor: T.color.mint, color: T.color.forest } }}
            >
              {t('admin.site')}
            </Button>
            <Button
              startIcon={<Logout sx={{ fontSize: '18px !important' }} />}
              onClick={handleLogout}
              variant="outlined"
              sx={{
                fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', fontSize: '0.88rem',
                borderColor: T.color.line, color: T.color.forest, borderRadius: T.radius.pill,
                '&:hover': { borderColor: T.color.forest, bgcolor: T.color.mint },
              }}
            >
              {t('admin.signOut')}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Container maxWidth="lg" sx={{ pt: 4, pb: 6 }}>
        <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '1.6rem', md: '2rem' }, color: T.color.ink, letterSpacing: '-0.02em', mb: 3 }}>
          {t('admin.dashboardTitle')}
        </Typography>

        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            mb: 4,
            '& .MuiTabs-indicator': { bgcolor: T.color.forest, height: 3, borderRadius: '3px 3px 0 0' },
            '& .MuiTab-root': {
              fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', fontSize: '0.92rem',
              color: T.color.muted, '&.Mui-selected': { color: T.color.forest },
            },
          }}
        >
          <Tab label={t('admin.tabAdmins')} icon={<AdminPanelSettings sx={{ fontSize: 20 }} />} iconPosition="start" />
          <Tab label={t('admin.tabData')} icon={<TableChart sx={{ fontSize: 20 }} />} iconPosition="start" />
        </Tabs>

        {/* ── Tab 0: Admins ── */}
        {activeTab === 0 && (
          <Box>
            {/* Create admin */}
            <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 3, md: 4 }, mb: 4 }}>
              <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.15rem', color: T.color.ink, mb: 2.5 }}>
                {t('admin.createAdminTitle')}
              </Typography>
              {createError && <Alert severity="error" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>{createError}</Alert>}
              {createSuccess && <Alert severity="success" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>{createSuccess}</Alert>}
              <form onSubmit={handleCreateAdmin}>
                <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" useFlexGap>
                  <TextField label={t('admin.username')} value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} required size="small" sx={{ minWidth: 160, ...textFieldSx }} />
                  <TextField label={t('admin.email')} type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} required size="small" sx={{ minWidth: 200, ...textFieldSx }} />
                  <TextField label={t('admin.password')} type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} required size="small" sx={{ minWidth: 160, ...textFieldSx }} inputProps={{ minLength: 6 }} />
                  <Button
                    type="submit" variant="contained" disableElevation
                    startIcon={createLoading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <PersonAdd />}
                    disabled={createLoading}
                    sx={{ fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', bgcolor: T.color.forest, borderRadius: T.radius.pill, px: 3, '&:hover': { bgcolor: T.color.ctaHover } }}
                  >
                    {createLoading ? t('admin.creating') : t('admin.createAdmin')}
                  </Button>
                </Stack>
              </form>
            </Paper>

            {/* Admin users table */}
            <Paper elevation={0} sx={sectionPaperSx}>
              <Box sx={sectionHeaderSx}>
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.1rem', color: T.color.ink }}>
                  {t('admin.adminUsers')}
                </Typography>
              </Box>
              {adminsLoading ? (
                <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress sx={{ color: T.color.forest }} /></Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={tableHeadCellSx}>ID</TableCell>
                        <TableCell sx={tableHeadCellSx}>{t('admin.username')}</TableCell>
                        <TableCell sx={tableHeadCellSx}>{t('admin.email')}</TableCell>
                        <TableCell sx={tableHeadCellSx}>{t('admin.colCreated')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {admins.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ ...tableCellSx, py: 4, color: T.color.muted }}>{t('admin.noAdmins')}</TableCell>
                        </TableRow>
                      ) : (
                        admins.map((admin) => (
                          <TableRow key={admin.id} sx={{ '&:hover': { bgcolor: T.color.mint } }}>
                            <TableCell sx={tableCellSx}>{admin.id}</TableCell>
                            <TableCell sx={tableCellSx}>{admin.username}</TableCell>
                            <TableCell sx={tableCellSx}>{admin.email}</TableCell>
                            <TableCell sx={tableCellSx}>{admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '—'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>

            {/* Create company */}
            <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 3, md: 4 }, mt: 4, mb: 4 }}>
              <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.15rem', color: T.color.ink, mb: 2.5 }}>
                {t('admin.createCompanyTitle')}
              </Typography>
              {createCompanyError && <Alert severity="error" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>{createCompanyError}</Alert>}
              {createCompanySuccess && <Alert severity="success" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>{createCompanySuccess}</Alert>}
              <form onSubmit={handleCreateCompany}>
                <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" useFlexGap alignItems="center">
                  <TextField label={t('admin.companyName')} value={createCompanyName} onChange={(e) => setCreateCompanyName(e.target.value)} required size="small" sx={{ minWidth: 240, ...textFieldSx }} />
                  <FormControl size="small" sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: T.radius.sm, fontFamily: T.font.body }, '& .MuiInputLabel-root': { fontFamily: T.font.body } }} required>
                    <InputLabel id="create-company-country-label">{t('admin.country')}</InputLabel>
                    <Select labelId="create-company-country-label" label={t('admin.country')} value={createCompanyCountry} onChange={(e) => setCreateCompanyCountry(e.target.value)}>
                      <MenuItem value=""><em>{t('admin.selectCountry')}</em></MenuItem>
                      {countries.map((c) => (<MenuItem key={c} value={c}>{c}</MenuItem>))}
                    </Select>
                  </FormControl>
                  <Button
                    type="submit" variant="contained" disableElevation
                    startIcon={createCompanyLoading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <Business />}
                    disabled={createCompanyLoading}
                    sx={{ fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', bgcolor: T.color.forest, borderRadius: T.radius.pill, px: 3, '&:hover': { bgcolor: T.color.ctaHover } }}
                  >
                    {createCompanyLoading ? t('admin.creating') : t('admin.createCompany')}
                  </Button>
                </Stack>
              </form>
            </Paper>

            {/* Companies table */}
            <Paper elevation={0} sx={sectionPaperSx}>
              <Box sx={sectionHeaderSx}>
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.1rem', color: T.color.ink }}>
                  {t('admin.companies')}
                </Typography>
              </Box>
              {companiesLoading ? (
                <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress sx={{ color: T.color.forest }} /></Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={tableHeadCellSx}>ID</TableCell>
                        <TableCell sx={tableHeadCellSx}>{t('admin.colName')}</TableCell>
                        <TableCell sx={tableHeadCellSx}>{t('admin.colCreated')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {companies.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} align="center" sx={{ ...tableCellSx, py: 4, color: T.color.muted }}>{t('admin.noCompanies')}</TableCell>
                        </TableRow>
                      ) : (
                        companies.map((company) => (
                          <TableRow key={company.id} sx={{ '&:hover': { bgcolor: T.color.mint } }}>
                            <TableCell sx={tableCellSx}>{company.id}</TableCell>
                            <TableCell sx={tableCellSx}>{company.name}</TableCell>
                            <TableCell sx={tableCellSx}>{company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '—'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Box>
        )}

        {/* ── Tab 1: Data Tables ── */}
        {activeTab === 1 && (
          <Box>
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.15rem', color: T.color.ink, mb: 2 }}>
              {t('admin.selectTable')}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
              {DATA_TABLES.map((tbl) => (
                <Button
                  key={tbl.id}
                  variant={dataTableId === tbl.id ? 'contained' : 'outlined'}
                  size="small"
                  disableElevation
                  onClick={() => loadDataTable(tbl.id)}
                  sx={{
                    fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', fontSize: '0.85rem',
                    borderRadius: T.radius.pill, px: 2.5,
                    ...(dataTableId === tbl.id
                      ? { bgcolor: T.color.forest, color: '#fff', '&:hover': { bgcolor: T.color.ctaHover } }
                      : { borderColor: T.color.line, color: T.color.inkSoft, '&:hover': { borderColor: T.color.forest, bgcolor: T.color.mint, color: T.color.forest } }),
                  }}
                >
                  {t(`admin.tables.${tbl.id}`)}
                </Button>
              ))}
            </Stack>
            {dataTableId && (
              <>
                <Stack direction="row" alignItems="center" gap={2} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
                  <TextField
                    size="small" placeholder={t('admin.search')} value={dataSearch}
                    onChange={(e) => setDataSearch(e.target.value)}
                    sx={{ minWidth: 280, ...textFieldSx }}
                    InputProps={{ startAdornment: (<InputAdornment position="start"><Search sx={{ color: T.color.muted, fontSize: 20 }} /></InputAdornment>) }}
                  />
                  <Button
                    variant="contained" disableElevation startIcon={<Add />} onClick={openAddDialog}
                    sx={{ fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', bgcolor: T.color.forest, borderRadius: T.radius.pill, px: 3, '&:hover': { bgcolor: T.color.ctaHover } }}
                  >
                    {t('admin.add')}
                  </Button>
                </Stack>
                {dataError && <Alert severity="error" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>{dataError}</Alert>}
                {dataLoading ? (
                  <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress sx={{ color: T.color.forest }} /></Box>
                ) : (
                  <Paper elevation={0} sx={{ ...sectionPaperSx, overflow: 'auto' }}>
                    <TableContainer sx={{ maxHeight: 560 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            {dataColumns.map((col) => (
                              <TableCell
                                key={col}
                                onClick={() => handleSort(col)}
                                sx={{ ...tableHeadCellSx, cursor: 'pointer', userSelect: 'none' }}
                              >
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  {col.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                                  {dataSortKey === col && (dataSortDir === 'asc' ? <ArrowUpward sx={{ fontSize: 16 }} /> : <ArrowDownward sx={{ fontSize: 16 }} />)}
                                </Stack>
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedRows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={dataColumns.length} align="center" sx={{ ...tableCellSx, py: 4, color: T.color.muted }}>
                                {dataRows.length === 0 ? t('admin.noRows') : t('admin.noRowsMatch')}
                              </TableCell>
                            </TableRow>
                          ) : (
                            sortedRows.map((row, idx) => (
                              <TableRow key={idx} sx={{ '&:hover': { bgcolor: T.color.mint } }}>
                                {dataColumns.map((col) => (
                                  <TableCell key={col} sx={{ ...tableCellSx, maxWidth: 320 }}>
                                    {getCellDisplay(row[col])}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                )}
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted, mt: 1.5 }}>
                  {t('admin.rowCount', { count: sortedRows.length })}
                  {dataSearch.trim() && filteredRows.length !== dataRows.length && t('admin.filteredFrom', { total: dataRows.length })}
                </Typography>

                {/* Add dialog */}
                <Dialog open={addDialogOpen} onClose={() => !addLoading && setAddDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: T.radius.lg, overflow: 'hidden' } }}>
                  <Box sx={{ height: 4, background: `linear-gradient(90deg, ${T.color.forest}, ${T.color.sage}, ${T.color.accent})` }} />
                  <form onSubmit={handleAddSubmit}>
                    <DialogTitle sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '1.3rem', color: T.color.ink, pt: 3 }}>
                      {t('admin.addTo', { table: dataTableId ? t(`admin.tables.${dataTableId}`) : '' })}
                    </DialogTitle>
                    <DialogContent>
                      {addError && <Alert severity="error" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>{addError}</Alert>}
                      <Stack spacing={2} sx={{ pt: 1 }}>
                        {(dataTableId === 'admins' || dataTableId === 'users') && (
                          <>
                            <TextField label={t('admin.username')} value={addForm.username ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value }))} required size="small" fullWidth sx={textFieldSx} />
                            <TextField label={t('admin.email')} type="email" value={addForm.email ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} required size="small" fullWidth sx={textFieldSx} />
                            <TextField label={t('admin.password')} type="password" value={addForm.password ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))} required size="small" fullWidth inputProps={{ minLength: 6 }} sx={textFieldSx} />
                            {dataTableId === 'users' && (
                              <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: T.radius.sm, fontFamily: T.font.body }, '& .MuiInputLabel-root': { fontFamily: T.font.body } }}>
                                <InputLabel id="add-user-company-label">{t('admin.company')}</InputLabel>
                                <Select labelId="add-user-company-label" label={t('admin.company')} value={addForm.companyId ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, companyId: e.target.value }))}>
                                  <MenuItem value=""><em>{t('admin.none')}</em></MenuItem>
                                  {companies.map((c) => (<MenuItem key={c.id} value={String(c.id)}>{c.name} (ID:{c.id})</MenuItem>))}
                                </Select>
                              </FormControl>
                            )}
                          </>
                        )}
                        {dataTableId === 'companies' && (
                          <>
                            <TextField label={t('admin.companyName')} value={addForm.name ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} required size="small" fullWidth sx={textFieldSx} />
                            <FormControl size="small" fullWidth required sx={{ '& .MuiOutlinedInput-root': { borderRadius: T.radius.sm, fontFamily: T.font.body }, '& .MuiInputLabel-root': { fontFamily: T.font.body } }}>
                              <InputLabel id="add-company-country-label">{t('admin.country')}</InputLabel>
                              <Select labelId="add-company-country-label" label={t('admin.country')} value={addForm.country ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, country: e.target.value }))}>
                                <MenuItem value=""><em>{t('admin.selectCountry')}</em></MenuItem>
                                {countries.map((c) => (<MenuItem key={c} value={c}>{c}</MenuItem>))}
                              </Select>
                            </FormControl>
                          </>
                        )}
                        {dataTableId === 'emission-factor-types' && (
                          <TextField label={t('admin.f.efType')} value={addForm.emissionFactorType ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, emissionFactorType: e.target.value }))} required size="small" fullWidth sx={textFieldSx} />
                        )}
                        {dataTableId === 'nominators' && (
                          <TextField label={t('admin.f.nominator')} value={addForm.nominator ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, nominator: e.target.value }))} required size="small" fullWidth sx={textFieldSx} />
                        )}
                        {dataTableId === 'denominators' && (
                          <TextField label={t('admin.f.denominator')} value={addForm.denominator ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, denominator: e.target.value }))} required size="small" fullWidth sx={textFieldSx} />
                        )}
                        {dataTableId === 'emission-factors' && (
                          <>
                            <TextField label={t('admin.f.sector')} value={addForm.sector ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, sector: e.target.value }))} required size="small" fullWidth sx={textFieldSx} />
                            <TextField label={t('admin.f.subsector')} value={addForm.subsector ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, subsector: e.target.value }))} required size="small" fullWidth sx={textFieldSx} />
                            <TextField label={t('admin.f.subsubsector')} value={addForm.subsubsector ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, subsubsector: e.target.value }))} required size="small" fullWidth sx={textFieldSx} />
                            <TextField label={t('admin.f.efName')} value={addForm.emissionFactorName ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, emissionFactorName: e.target.value }))} required size="small" fullWidth sx={textFieldSx} />
                            <TextField label={t('admin.f.efTypeId')} type="number" value={addForm.emissionFactorTypeId ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, emissionFactorTypeId: e.target.value }))} size="small" fullWidth sx={textFieldSx} />
                            <TextField label={t('admin.f.nominatorId')} type="number" value={addForm.nominatorId ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, nominatorId: e.target.value }))} size="small" fullWidth sx={textFieldSx} />
                            <TextField label={t('admin.f.denominatorId')} type="number" value={addForm.denominatorId ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, denominatorId: e.target.value }))} size="small" fullWidth sx={textFieldSx} />
                            <TextField label={t('admin.f.efValueId')} type="number" value={addForm.emissionFactorValueId ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, emissionFactorValueId: e.target.value }))} size="small" fullWidth sx={textFieldSx} />
                            <TextField label={t('admin.f.createdBy')} type="number" value={addForm.createdByUserId ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, createdByUserId: e.target.value }))} size="small" fullWidth sx={textFieldSx} />
                          </>
                        )}
                        {dataTableId === 'emission-factor-values' && (
                          <>
                            <TextField label={t('admin.f.value')} type="number" value={addForm.value ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, value: e.target.value }))} required size="small" fullWidth inputProps={{ step: 'any' }} sx={textFieldSx} />
                            <TextField label={t('admin.f.sourceName')} value={addForm.sourceName ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, sourceName: e.target.value }))} required size="small" fullWidth sx={textFieldSx} />
                            <TextField label={t('admin.f.sourceUrl')} value={addForm.sourceUrl ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, sourceUrl: e.target.value }))} required size="small" fullWidth sx={textFieldSx} />
                            <TextField label={t('admin.f.sourceAuthor')} value={addForm.sourceAuthor ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, sourceAuthor: e.target.value }))} required size="small" fullWidth sx={textFieldSx} />
                            <TextField label="CO2" type="number" value={addForm.co2 ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, co2: e.target.value }))} size="small" fullWidth inputProps={{ step: 'any' }} sx={textFieldSx} />
                            <TextField label="CH4" type="number" value={addForm.ch4 ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, ch4: e.target.value }))} size="small" fullWidth inputProps={{ step: 'any' }} sx={textFieldSx} />
                            <TextField label="N2O" type="number" value={addForm.n2o ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, n2o: e.target.value }))} size="small" fullWidth inputProps={{ step: 'any' }} sx={textFieldSx} />
                            <TextField label={t('admin.f.description')} value={addForm.description ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} size="small" fullWidth multiline sx={textFieldSx} />
                            <TextField label={t('admin.f.year')} type="number" value={addForm.year ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, year: e.target.value }))} size="small" fullWidth sx={textFieldSx} />
                            <TextField label={t('admin.f.location')} value={addForm.location ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, location: e.target.value }))} size="small" fullWidth sx={textFieldSx} />
                            <TextField label={t('admin.f.tags')} value={addForm.tags ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, tags: e.target.value }))} size="small" fullWidth placeholder="tag1, tag2" sx={textFieldSx} />
                          </>
                        )}
                      </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                      <Button
                        onClick={() => setAddDialogOpen(false)} disabled={addLoading}
                        sx={{ fontFamily: T.font.body, textTransform: 'none', borderRadius: T.radius.pill, px: 3, color: T.color.muted }}
                      >
                        {t('admin.cancel')}
                      </Button>
                      <Button
                        type="submit" variant="contained" disableElevation disabled={addLoading}
                        startIcon={addLoading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <Add />}
                        sx={{ fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', bgcolor: T.color.forest, borderRadius: T.radius.pill, px: 3, '&:hover': { bgcolor: T.color.ctaHover } }}
                      >
                        {addLoading ? t('admin.adding') : t('admin.add')}
                      </Button>
                    </DialogActions>
                  </form>
                </Dialog>
              </>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default Admin;