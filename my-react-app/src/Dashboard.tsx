import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import SessionExpired from './SessionExpired';
import { isTokenExpired, API_BASE_URL, apiRequest } from './utils/api';
import { listCompanyReports } from './utils/blobStorage';

export interface DashboardCalculationItem {
  id: number;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  currentStep?: string;
  createdAt?: string;
  modifiedAt?: string;
}

interface DashboardCalculationsContextValue {
  calculations: DashboardCalculationItem[];
  calculationsCount: number | null;
  calculationsLoading: boolean;
  calculationsError: string | null;
  refetchCalculations: () => Promise<void>;
}

const DashboardCalculationsContext = createContext<DashboardCalculationsContextValue | null>(null);

export function useDashboardCalculations() {
  const ctx = useContext(DashboardCalculationsContext);
  return ctx;
}

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  TextField,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Logout,
  Settings,
  Calculate,
  Description,
  Send,
  Notifications,
  Help,
  ArrowBack,
  ArrowForward,
  Shield,
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
  },
  radius: {
    sm: '8px',
    md: '14px',
    lg: '20px',
    xl: '28px',
    pill: '999px',
  },
};

const DASH_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&display=swap');
`;

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

/* Card accent colors mapped to design system */
const cardAccents = [
  { bg: T.color.mint, border: T.color.mintDark, fg: T.color.forest, icon: T.color.forest },
  { bg: '#EBF2FF', border: '#C5D6F7', fg: '#1A4B8E', icon: '#2563EB' },
  { bg: '#F3EEFF', border: '#D8C9F5', fg: '#5B2E91', icon: '#7C3AED' },
];

interface DashboardProps {
  onLogout: () => void;
}

interface User {
  id: number;
  username: string;
  email: string;
  companyName: string;
  companyId?: number | null;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [userName, setUserName] = useState<string>('User');
  const [, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'calculation' | 'sharing'>('dashboard');
  const [newCalcError, setNewCalcError] = useState<string | null>(null);
  const [newCalcLoading, setNewCalcLoading] = useState(false);
  const [calculationsCount, setCalculationsCount] = useState<number | null>(null);
  const [calculationsList, setCalculationsList] = useState<DashboardCalculationItem[]>([]);
  const [calculationsLoading, setCalculationsLoading] = useState(false);
  const [calculationsError, setCalculationsError] = useState<string | null>(null);
  const [reportsCount, setReportsCount] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  /* Inject fonts */
  useEffect(() => {
    if (document.getElementById('panonia-global-styles')) return;
    const style = document.createElement('style');
    style.id = 'panonia-global-styles';
    style.textContent = DASH_STYLES;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const refetchCalculations = useCallback(async () => {
    const meResult = await apiRequest<{ success: boolean; user?: { companyId?: number | null } }>('/users/me');
    if (meResult === null || !meResult.data.success || meResult.data.user?.companyId == null) return;
    const companyId = meResult.data.user.companyId;
    setCalculationsLoading(true);
    setCalculationsError(null);
    const calcResult = await apiRequest<{ success: boolean; calculations?: DashboardCalculationItem[]; message?: string }>(
      `/calculations/company/${companyId}`
    );
    if (calcResult !== null && calcResult.data.success && Array.isArray(calcResult.data.calculations)) {
      setCalculationsList(calcResult.data.calculations);
      setCalculationsCount(calcResult.data.calculations.length);
    } else {
      setCalculationsError(calcResult?.data?.message ?? 'Failed to load calculations');
    }
    setCalculationsLoading(false);
  }, []);

  useEffect(() => {
    const fetchCurrentUserAndCalculations = async () => {
      setCalculationsLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/users/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
            setUserName(data.user.username || 'User');
            setSessionExpired(false);
            const companyId = data.user.companyId;
            if (companyId != null) {
              const [calcResult, blobResult] = await Promise.all([
                apiRequest<{ success: boolean; calculations?: DashboardCalculationItem[] }>(
                  `/calculations/company/${companyId}`
                ),
                listCompanyReports(companyId),
              ]);
              if (calcResult !== null && calcResult.data.success && Array.isArray(calcResult.data.calculations)) {
                setCalculationsList(calcResult.data.calculations);
                setCalculationsCount(calcResult.data.calculations.length);
              }
              if (blobResult.success) {
                setReportsCount(blobResult.reports.length);
              }
            }
          }
        } else if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setSessionExpired(true);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
        } else {
          setSessionExpired(true);
        }
      } finally {
        setLoading(false);
        setCalculationsLoading(false);
      }
    };

    fetchCurrentUserAndCalculations();

    const intervalId = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token) {
        const expired = isTokenExpired(token);
        if (expired === true) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setSessionExpired(true);
          return;
        }

        fetch(`${API_BASE_URL}/users/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
          .then((response) => {
            if (response.status === 401) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setSessionExpired(true);
            }
          })
          .catch((error) => {
            console.error('Token validation error:', error);
          });
      } else {
        setSessionExpired(true);
      }
    }, (60 + 2) * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [navigate]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    setAnchorEl(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
  };

  const handleNewCalculation = async () => {
    setNewCalcError(null);
    setNewCalcLoading(true);
    try {
      const meResult = await apiRequest<{ success: boolean; user?: { id: number; companyId?: number | null } }>('/users/me');
      if (meResult === null || !meResult.data.success || !meResult.data.user) {
        setNewCalcError('Session expired or not authenticated');
        setNewCalcLoading(false);
        return;
      }
      const user = meResult.data.user;
      const companyId = user.companyId ?? 0;
      if (!companyId) {
        setNewCalcError('Your account has no company assigned. Please contact your administrator.');
        setNewCalcLoading(false);
        return;
      }
      const calcResult = await apiRequest<{ success: boolean; calculation?: { id: number } }>('/calculations/create', {
        method: 'POST',
        body: JSON.stringify({
          company: { id: companyId },
          createdByUser: { id: user.id },
        }),
      });
      if (calcResult === null || !calcResult.data.success || !calcResult.data.calculation?.id) {
        setNewCalcError((calcResult?.data as { message?: string })?.message ?? 'Failed to create calculation');
        setNewCalcLoading(false);
        return;
      }
      const calculationId = calcResult.data.calculation.id;
      setNewCalcLoading(false);
      navigate(`/dashboard/new-calculation/${calculationId}`);
    } catch (err) {
      setNewCalcError(err instanceof Error ? err.message : 'Failed to create calculation');
      setNewCalcLoading(false);
    }
  };

  useEffect(() => {
    setCurrentView('dashboard');
  }, [location.pathname]);

  const handleGenerateReport = () => {
    navigate('/dashboard/generate-report');
  };

  const handleShareWithClient = () => {
    setCurrentView('sharing');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  // Client Sharing Page Component
  const SharingPage = () => (
    <Container maxWidth="lg">
      <Box mb={4}>
        <Button
          startIcon={<ArrowBack sx={{ fontSize: '18px !important' }} />}
          onClick={handleBackToDashboard}
          sx={{
            mb: 2, fontFamily: T.font.body, fontWeight: 500, fontSize: '0.9rem',
            color: T.color.muted, textTransform: 'none', borderRadius: T.radius.pill,
            '&:hover': { bgcolor: T.color.mint, color: T.color.forest },
          }}
        >
          Back to Dashboard
        </Button>
        <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '1.6rem', md: '2rem' }, color: T.color.ink, letterSpacing: '-0.02em', mb: 1 }}>
          Share with Client
        </Typography>
        <Typography sx={{ fontFamily: T.font.body, fontSize: '1.05rem', color: T.color.muted, lineHeight: 1.6 }}>
          Send emissions data to your EU clients securely
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 3, md: 4 } }}>
        <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink, mb: 3 }}>
          Client Information
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Client Company Name" variant="outlined" sx={textFieldSx} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Contact Email" type="email" variant="outlined" sx={textFieldSx} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Subject" variant="outlined" sx={textFieldSx} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth multiline rows={4} label="Message" variant="outlined" sx={textFieldSx} />
          </Grid>
          <Grid size={12}>
            <Button
              variant="contained" size="large" disableElevation startIcon={<Send />}
              sx={{
                mt: 1, fontFamily: T.font.body, fontWeight: 600, textTransform: 'none',
                bgcolor: T.color.forest, borderRadius: T.radius.pill, px: 4, py: 1.4,
                '&:hover': { bgcolor: T.color.ctaHover },
              }}
            >
              Send to Client
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );

  const dashboardCards: Array<{
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    count: string;
    label: string;
    seeAllHref?: string;
    accentIdx: number;
  }> = [
    {
      title: 'CBAM Calculations',
      description: 'Calculate emissions for your products',
      icon: <Calculate />,
      color: '#059669',
      count: calculationsCount !== null ? String(calculationsCount) : '—',
      label: 'Active Projects',
      seeAllHref: '/dashboard/calculations',
      accentIdx: 0,
    },
    {
      title: 'Reports Generated',
      description: 'View and manage your reports',
      icon: <Description />,
      color: '#2563eb',
      count: reportsCount !== null ? String(reportsCount) : '—',
      label: 'Total Reports',
      seeAllHref: '/dashboard/reports',
      accentIdx: 1,
    },
    {
      title: 'Client Sharing',
      description: 'Share data with EU clients',
      icon: <Send />,
      color: '#7c3aed',
      count: '24',
      label: 'Shared Reports',
      accentIdx: 2,
    },
  ];

  const dashboardCalculationsValue: DashboardCalculationsContextValue = {
    calculations: calculationsList,
    calculationsCount,
    calculationsLoading,
    calculationsError,
    refetchCalculations,
  };

  if (sessionExpired) {
    return <SessionExpired />;
  }

  return (
    <DashboardCalculationsContext.Provider value={dashboardCalculationsValue}>
      <Box sx={{ minHeight: '100vh', bgcolor: T.color.cream, fontFamily: T.font.body }}>
        {/* ── Navigation ── */}
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            bgcolor: scrolled ? 'rgba(250,250,247,0.88)' : 'rgba(250,250,247,0.6)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid',
            borderColor: scrolled ? T.color.line : 'transparent',
            color: T.color.ink,
            transition: 'all 0.3s ease',
          }}
        >
          <Toolbar sx={{ maxWidth: 1200, mx: 'auto', width: '100%', px: { xs: 2, md: 4 } }}>
            <Box display="flex" alignItems="center" gap={1.2} sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
              <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: T.color.forest, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield sx={{ color: '#fff', fontSize: 20 }} />
              </Box>
              <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '1.25rem', color: T.color.ink, letterSpacing: '-0.02em' }}>
                Panonia
              </Typography>
              <Chip
                label="Dashboard"
                size="small"
                sx={{
                  fontFamily: T.font.body, fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.04em',
                  bgcolor: T.color.mint, color: T.color.forest, border: `1px solid ${T.color.mintDark}`, ml: 1,
                }}
              />
            </Box>

            <IconButton sx={{ mr: 0.5, color: T.color.muted, '&:hover': { bgcolor: T.color.mint, color: T.color.forest } }}>
              <Notifications sx={{ fontSize: 22 }} />
            </IconButton>

            <IconButton sx={{ mr: 1, color: T.color.muted, '&:hover': { bgcolor: T.color.mint, color: T.color.forest } }}>
              <Help sx={{ fontSize: 22 }} />
            </IconButton>

            <Button
              onClick={handleMenuClick}
              startIcon={<AccountCircle sx={{ fontSize: '22px !important' }} />}
              endIcon={<MenuIcon sx={{ fontSize: '18px !important' }} />}
              disabled={loading}
              sx={{
                fontFamily: T.font.body, fontWeight: 500, fontSize: '0.88rem',
                color: T.color.inkSoft, textTransform: 'none', borderRadius: T.radius.pill,
                px: 2, '&:hover': { bgcolor: T.color.mint, color: T.color.forest },
              }}
            >
              {loading ? 'Loading…' : userName}
            </Button>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{ sx: { borderRadius: T.radius.md, border: `1px solid ${T.color.line}`, boxShadow: '0 12px 32px -8px rgba(0,0,0,0.12)', mt: 1 } }}
            >
              <MenuItem
                onClick={() => { handleMenuClose(); navigate('/dashboard/settings'); }}
                sx={{ fontFamily: T.font.body, borderRadius: '8px', mx: 0.5 }}
              >
                <ListItemIcon><Settings sx={{ fontSize: 20, color: T.color.muted }} /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontFamily: T.font.body }}>Settings</ListItemText>
              </MenuItem>
              <Divider sx={{ borderColor: T.color.lineFaint, mx: 1 }} />
              <MenuItem
                onClick={handleLogout}
                sx={{ fontFamily: T.font.body, borderRadius: '8px', mx: 0.5 }}
              >
                <ListItemIcon><Logout sx={{ fontSize: 20, color: T.color.muted }} /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontFamily: T.font.body }}>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* ── Main Content ── */}
        <Box sx={{ pt: 11, pb: 5 }}>
          {location.pathname === '/dashboard' && (
            <Container maxWidth="lg">
              {/* Welcome */}
              <Box mb={4}>
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '1.6rem', md: '2.2rem' }, color: T.color.ink, letterSpacing: '-0.02em', mb: 0.5 }}>
                  {loading ? 'Loading…' : `Welcome back, ${userName}!`}
                </Typography>
                <Typography sx={{ fontFamily: T.font.body, fontSize: '1.05rem', color: T.color.muted, lineHeight: 1.6 }}>
                  Manage your CBAM compliance and emissions reporting
                </Typography>
              </Box>

              {/* Dashboard Cards */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {dashboardCards.map((card, index) => {
                  const accent = cardAccents[card.accentIdx] ?? cardAccents[0];
                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                      <Card
                        elevation={0}
                        sx={{
                          height: '100%', borderRadius: T.radius.lg, bgcolor: T.color.warmWhite,
                          border: `1px solid ${T.color.lineFaint}`, position: 'relative', overflow: 'hidden',
                          transition: 'all 0.35s cubic-bezier(.22,1,.36,1)',
                          '&:hover': { transform: 'translateY(-6px)', boxShadow: `0 20px 48px -12px rgba(11,79,62,0.10)`, borderColor: accent.border },
                          '&::before': {
                            content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                            background: `linear-gradient(90deg, ${accent.fg}, ${accent.border})`,
                            opacity: 0, transition: 'opacity 0.35s ease',
                          },
                          '&:hover::before': { opacity: 1 },
                        }}
                      >
                        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                            <Box sx={{ width: 52, height: 52, borderRadius: T.radius.md, bgcolor: accent.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent.icon }}>
                              {card.icon}
                            </Box>
                            <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '2.4rem', color: accent.fg, lineHeight: 1 }}>
                              {card.count}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.15rem', color: T.color.ink, mb: 0.5 }}>
                            {card.title}
                          </Typography>
                          <Typography sx={{ fontFamily: T.font.body, fontSize: '0.92rem', color: T.color.muted, mb: 1.5, lineHeight: 1.5 }}>
                            {card.description}
                          </Typography>
                          <Typography sx={{ fontFamily: T.font.body, fontSize: '0.82rem', color: T.color.muted, fontWeight: 500 }}>
                            {card.label}
                          </Typography>
                          {card.seeAllHref && (
                            <Button
                              component="span"
                              endIcon={<ArrowForward sx={{ fontSize: '16px !important' }} />}
                              onClick={() => navigate(card.seeAllHref!)}
                              sx={{
                                mt: 2, px: 0, fontFamily: T.font.body, fontWeight: 600, fontSize: '0.88rem',
                                textTransform: 'none', color: accent.fg,
                                '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                              }}
                            >
                              See all
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>

              {/* Quick Actions */}
              <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 3, md: 4 } }}>
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink, mb: 3 }}>
                  Quick Actions
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    {newCalcError && (
                      <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: '#C0392B', mb: 1 }}>
                        {newCalcError}
                      </Typography>
                    )}
                    <Button
                      variant="contained" disableElevation startIcon={<Calculate />} fullWidth size="large"
                      onClick={handleNewCalculation} disabled={newCalcLoading}
                      sx={{
                        py: 2, fontFamily: T.font.body, fontWeight: 600, fontSize: '0.95rem', textTransform: 'none',
                        bgcolor: T.color.forest, borderRadius: T.radius.md,
                        '&:hover': { bgcolor: T.color.ctaHover },
                      }}
                    >
                      {newCalcLoading ? 'Creating…' : 'New Calculation'}
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Button
                      variant="outlined" startIcon={<Description />} fullWidth size="large"
                      onClick={handleGenerateReport}
                      sx={{
                        py: 2, fontFamily: T.font.body, fontWeight: 600, fontSize: '0.95rem', textTransform: 'none',
                        borderColor: T.color.line, color: T.color.inkSoft, borderRadius: T.radius.md,
                        '&:hover': { borderColor: T.color.forest, bgcolor: T.color.mint, color: T.color.forest },
                      }}
                    >
                      Generate Report
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Button
                      variant="outlined" startIcon={<Send />} fullWidth size="large"
                      onClick={handleShareWithClient}
                      sx={{
                        py: 2, fontFamily: T.font.body, fontWeight: 600, fontSize: '0.95rem', textTransform: 'none',
                        borderColor: T.color.line, color: T.color.inkSoft, borderRadius: T.radius.md,
                        '&:hover': { borderColor: T.color.forest, bgcolor: T.color.mint, color: T.color.forest },
                      }}
                    >
                      Share with Client
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {/* Recent Activity */}
              <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 3, md: 4 }, mt: 3 }}>
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink, mb: 3 }}>
                  Recent Activity
                </Typography>
                <Stack spacing={2.5}>
                  {[
                    { icon: <Calculate sx={{ fontSize: 18 }} />, bg: T.color.mint, color: T.color.forest, text: 'Completed calculation for Steel Products', time: '2 hours ago' },
                    { icon: <Send sx={{ fontSize: 18 }} />, bg: '#EBF2FF', color: '#2563EB', text: 'Shared report with EU Client GmbH', time: '5 hours ago' },
                    { icon: <Description sx={{ fontSize: 18 }} />, bg: '#F3EEFF', color: '#7C3AED', text: 'Generated monthly compliance report', time: '1 day ago' },
                  ].map((item, i) => (
                    <Box key={i} display="flex" alignItems="center" gap={2} sx={{ p: 1.5, borderRadius: T.radius.sm, transition: 'background 0.2s ease', '&:hover': { bgcolor: T.color.lineFaint } }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: T.radius.sm, bgcolor: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                        {item.icon}
                      </Box>
                      <Box>
                        <Typography sx={{ fontFamily: T.font.body, fontWeight: 500, fontSize: '0.92rem', color: T.color.ink }}>
                          {item.text}
                        </Typography>
                        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.78rem', color: T.color.muted }}>
                          {item.time}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Container>
          )}

          {currentView === 'sharing' && <SharingPage />}
          <Outlet />
        </Box>
      </Box>
    </DashboardCalculationsContext.Provider>
  );
};

export default Dashboard;