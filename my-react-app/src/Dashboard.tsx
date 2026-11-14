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
  LinearProgress,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Logout,
  Settings,
  Calculate,
  Description,
  Help,
  ArrowForward,
  Shield,
  CompareArrows,
  MenuBook,
  CheckCircleOutline,
  HourglassEmpty,
  EditNote,
  TrendingUp,
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

/* Card accent colors mapped to design system */
const cardAccents = [
  { bg: T.color.mint, border: T.color.mintDark, fg: T.color.forest, icon: T.color.forest },
  { bg: '#EBF2FF', border: '#C5D6F7', fg: '#1A4B8E', icon: '#2563EB' },
  { bg: T.color.accentLight, border: '#E5D4A8', fg: '#8A6A20', icon: '#B8922A' },
];

function formatRelativeDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return d.toLocaleDateString();
}

function statusChip(status: DashboardCalculationItem['status']) {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Completed', bg: T.color.mint, color: T.color.forest };
    case 'IN_PROGRESS':
      return { label: 'In progress', bg: '#EBF2FF', color: '#1A4B8E' };
    case 'CANCELLED':
      return { label: 'Cancelled', bg: '#FDEDEC', color: '#C0392B' };
    default:
      return { label: 'Draft', bg: T.color.accentLight, color: '#8A6A20' };
  }
}

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
  const [newCalcError, setNewCalcError] = useState<string | null>(null);
  const [newCalcLoading, setNewCalcLoading] = useState(false);
  const [calculationsCount, setCalculationsCount] = useState<number | null>(null);
  const [calculationsList, setCalculationsList] = useState<DashboardCalculationItem[]>([]);
  const [calculationsLoading, setCalculationsLoading] = useState(false);
  const [calculationsError, setCalculationsError] = useState<string | null>(null);
  const [reportsCount, setReportsCount] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const completedCount = calculationsList.filter((c) => c.status === 'COMPLETED').length;
  const inProgressCount = calculationsList.filter(
    (c) => c.status === 'IN_PROGRESS' || c.status === 'DRAFT'
  ).length;
  const recentCalculations = [...calculationsList]
    .sort((a, b) => {
      const ta = new Date(b.modifiedAt || b.createdAt || 0).getTime();
      const tb = new Date(a.modifiedAt || a.createdAt || 0).getTime();
      return ta - tb;
    })
    .slice(0, 5);

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
            setCompanyName(data.user.companyName || '');
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

  const handleGenerateReport = () => {
    navigate('/dashboard/generate-report');
  };

  const dashboardCards: Array<{
    title: string;
    description: string;
    icon: React.ReactNode;
    count: string;
    label: string;
    seeAllHref?: string;
    accentIdx: number;
  }> = [
    {
      title: 'CBAM Calculations',
      description: 'All emissions calculations for your products',
      icon: <Calculate />,
      count: calculationsCount !== null ? String(calculationsCount) : '—',
      label: 'Total calculations',
      seeAllHref: '/dashboard/calculations',
      accentIdx: 0,
    },
    {
      title: 'Reports',
      description: 'Generated CBAM reports ready to download',
      icon: <Description />,
      count: reportsCount !== null ? String(reportsCount) : '—',
      label: 'Stored reports',
      seeAllHref: '/dashboard/reports',
      accentIdx: 1,
    },
    {
      title: 'Completed',
      description: 'Calculations finished and ready for reporting',
      icon: <CheckCircleOutline />,
      count: calculationsCount !== null ? String(completedCount) : '—',
      label: inProgressCount > 0 ? `${inProgressCount} still in progress` : 'No open drafts',
      seeAllHref: '/dashboard/calculations',
      accentIdx: 2,
    },
  ];

  const gettingStartedSteps = [
    {
      done: (calculationsCount ?? 0) > 0,
      title: 'Start a CBAM calculation',
      desc: 'Enter product and process data for your installation.',
      action: () => handleNewCalculation(),
      actionLabel: 'New calculation',
    },
    {
      done: completedCount > 0,
      title: 'Finish at least one calculation',
      desc: 'Complete the wizard so embedded emissions are computed.',
      action: () => navigate('/dashboard/calculations'),
      actionLabel: 'View calculations',
    },
    {
      done: (reportsCount ?? 0) > 0,
      title: 'Generate a CBAM report',
      desc: 'Turn completed calculations into a shareable report.',
      action: handleGenerateReport,
      actionLabel: 'Generate report',
    },
    {
      done: Boolean(companyName),
      title: 'Confirm company & installation details',
      desc: 'Keep operator and installation data up to date in Settings.',
      action: () => navigate('/dashboard/settings'),
      actionLabel: 'Open settings',
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

            <IconButton
              onClick={() => navigate('/cbam-guide')}
              title="CBAM Guide"
              sx={{ mr: 1, color: T.color.muted, '&:hover': { bgcolor: T.color.mint, color: T.color.forest } }}
            >
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
              <Box
                mb={4}
                display="flex"
                flexDirection={{ xs: 'column', md: 'row' }}
                alignItems={{ md: 'flex-end' }}
                justifyContent="space-between"
                gap={2}
              >
                <Box>
                  <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '1.6rem', md: '2.2rem' }, color: T.color.ink, letterSpacing: '-0.02em', mb: 0.5 }}>
                    {loading ? 'Loading…' : `Welcome back, ${userName}!`}
                  </Typography>
                  <Typography sx={{ fontFamily: T.font.body, fontSize: '1.05rem', color: T.color.muted, lineHeight: 1.6 }}>
                    {companyName
                      ? `${companyName} · CBAM calculations & reports`
                      : 'Manage your CBAM calculations and emissions reports'}
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
                  <Button
                    variant="contained"
                    disableElevation
                    startIcon={<Calculate />}
                    onClick={handleNewCalculation}
                    disabled={newCalcLoading}
                    sx={{
                      fontFamily: T.font.body, fontWeight: 600, textTransform: 'none',
                      bgcolor: T.color.forest, borderRadius: T.radius.pill, px: 3, py: 1.2,
                      '&:hover': { bgcolor: T.color.ctaHover },
                    }}
                  >
                    {newCalcLoading ? 'Creating…' : 'New calculation'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Description />}
                    onClick={handleGenerateReport}
                    sx={{
                      fontFamily: T.font.body, fontWeight: 600, textTransform: 'none',
                      borderColor: T.color.line, color: T.color.inkSoft, borderRadius: T.radius.pill, px: 3, py: 1.1,
                      '&:hover': { borderColor: T.color.forest, bgcolor: T.color.mint, color: T.color.forest },
                    }}
                  >
                    Generate report
                  </Button>
                </Stack>
              </Box>

              {newCalcError && (
                <Paper elevation={0} sx={{ ...sectionPaperSx, p: 2, mb: 3, borderColor: '#F5C6CB', bgcolor: '#FDEDEC' }}>
                  <Typography sx={{ fontFamily: T.font.body, fontSize: '0.9rem', color: '#C0392B' }}>
                    {newCalcError}
                  </Typography>
                </Paper>
              )}

              {calculationsLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1, bgcolor: T.color.mint, '& .MuiLinearProgress-bar': { bgcolor: T.color.forest } }} />}

              {/* Stats */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
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
                          '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 20px 48px -12px rgba(11,79,62,0.10)`, borderColor: accent.border },
                        }}
                      >
                        <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
                          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5}>
                            <Box sx={{ width: 48, height: 48, borderRadius: T.radius.md, bgcolor: accent.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent.icon }}>
                              {card.icon}
                            </Box>
                            <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '2.2rem', color: accent.fg, lineHeight: 1 }}>
                              {card.count}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.1rem', color: T.color.ink, mb: 0.5 }}>
                            {card.title}
                          </Typography>
                          <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.muted, mb: 1, lineHeight: 1.5 }}>
                            {card.description}
                          </Typography>
                          <Typography sx={{ fontFamily: T.font.body, fontSize: '0.8rem', color: T.color.muted, fontWeight: 500 }}>
                            {card.label}
                          </Typography>
                          {card.seeAllHref && (
                            <Button
                              endIcon={<ArrowForward sx={{ fontSize: '16px !important' }} />}
                              onClick={() => navigate(card.seeAllHref!)}
                              sx={{
                                mt: 1.5, px: 0, fontFamily: T.font.body, fontWeight: 600, fontSize: '0.88rem',
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

              <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Recent calculations — real data */}
                <Grid size={{ xs: 12, md: 7 }}>
                  <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 3, md: 3.5 }, height: '100%' }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5}>
                      <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink }}>
                        Recent calculations
                      </Typography>
                      <Button
                        onClick={() => navigate('/dashboard/calculations')}
                        endIcon={<ArrowForward sx={{ fontSize: '16px !important' }} />}
                        sx={{ fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', color: T.color.forest, fontSize: '0.85rem' }}
                      >
                        All
                      </Button>
                    </Box>

                    {calculationsError && (
                      <Typography sx={{ fontFamily: T.font.body, color: '#C0392B', fontSize: '0.9rem', mb: 2 }}>
                        {calculationsError}
                      </Typography>
                    )}

                    {!calculationsLoading && recentCalculations.length === 0 ? (
                      <Box sx={{ py: 4, textAlign: 'center' }}>
                        <EditNote sx={{ fontSize: 40, color: T.color.mintDark, mb: 1 }} />
                        <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, color: T.color.ink, mb: 0.5 }}>
                          No calculations yet
                        </Typography>
                        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.9rem', color: T.color.muted, mb: 2 }}>
                          Start your first CBAM emissions calculation to see it here.
                        </Typography>
                        <Button
                          variant="contained"
                          disableElevation
                          startIcon={<Calculate />}
                          onClick={handleNewCalculation}
                          disabled={newCalcLoading}
                          sx={{
                            fontFamily: T.font.body, fontWeight: 600, textTransform: 'none',
                            bgcolor: T.color.forest, borderRadius: T.radius.pill,
                            '&:hover': { bgcolor: T.color.ctaHover },
                          }}
                        >
                          Start calculation
                        </Button>
                      </Box>
                    ) : (
                      <Stack spacing={1.25} divider={<Divider sx={{ borderColor: T.color.lineFaint }} />}>
                        {recentCalculations.map((calc) => {
                          const chip = statusChip(calc.status);
                          return (
                            <Box
                              key={calc.id}
                              onClick={() => navigate(`/dashboard/new-calculation/${calc.id}`)}
                              sx={{
                                display: 'flex', alignItems: 'center', gap: 2, py: 1.25, px: 1,
                                borderRadius: T.radius.sm, cursor: 'pointer',
                                '&:hover': { bgcolor: T.color.lineFaint },
                              }}
                            >
                              <Box sx={{
                                width: 40, height: 40, borderRadius: T.radius.sm, flexShrink: 0,
                                bgcolor: calc.status === 'COMPLETED' ? T.color.mint : calc.status === 'IN_PROGRESS' ? '#EBF2FF' : T.color.accentLight,
                                color: calc.status === 'COMPLETED' ? T.color.forest : calc.status === 'IN_PROGRESS' ? '#1A4B8E' : '#8A6A20',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {calc.status === 'COMPLETED' ? <CheckCircleOutline sx={{ fontSize: 20 }} /> :
                                  calc.status === 'IN_PROGRESS' ? <HourglassEmpty sx={{ fontSize: 20 }} /> :
                                  <EditNote sx={{ fontSize: 20 }} />}
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.95rem', color: T.color.ink }}>
                                  Calculation #{calc.id}
                                </Typography>
                                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.78rem', color: T.color.muted }}>
                                  {calc.currentStep ? `Step: ${calc.currentStep.replace(/_/g, ' ')}` : 'No step saved'}
                                  {calc.modifiedAt || calc.createdAt ? ` · ${formatRelativeDate(calc.modifiedAt || calc.createdAt)}` : ''}
                                </Typography>
                              </Box>
                              <Chip
                                size="small"
                                label={chip.label}
                                sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.72rem', bgcolor: chip.bg, color: chip.color }}
                              />
                            </Box>
                          );
                        })}
                      </Stack>
                    )}
                  </Paper>
                </Grid>

                {/* Getting started / checklist */}
                <Grid size={{ xs: 12, md: 5 }}>
                  <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 3, md: 3.5 }, height: '100%' }}>
                    <Box display="flex" alignItems="center" gap={1} mb={2.5}>
                      <TrendingUp sx={{ color: T.color.forest, fontSize: 22 }} />
                      <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink }}>
                        Getting started
                      </Typography>
                    </Box>
                    <Stack spacing={2}>
                      {gettingStartedSteps.map((step, i) => (
                        <Box
                          key={i}
                          sx={{
                            p: 1.75,
                            borderRadius: T.radius.md,
                            border: `1px solid ${step.done ? T.color.mintDark : T.color.lineFaint}`,
                            bgcolor: step.done ? T.color.mint : T.color.cream,
                          }}
                        >
                          <Box display="flex" alignItems="flex-start" gap={1.25} mb={step.done ? 0 : 1.25}>
                            <CheckCircleOutline sx={{ fontSize: 20, color: step.done ? T.color.forest : T.color.line, mt: 0.15 }} />
                            <Box>
                              <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.92rem', color: T.color.ink }}>
                                {step.title}
                              </Typography>
                              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.8rem', color: T.color.muted, lineHeight: 1.45 }}>
                                {step.desc}
                              </Typography>
                            </Box>
                          </Box>
                          {!step.done && (
                            <Button
                              size="small"
                              onClick={step.action}
                              sx={{
                                ml: 4, fontFamily: T.font.body, fontWeight: 600, textTransform: 'none',
                                color: T.color.forest, fontSize: '0.82rem',
                              }}
                            >
                              {step.actionLabel} →
                            </Button>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>

              {/* Tools & resources */}
              <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 3, md: 3.5 } }}>
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink, mb: 2.5 }}>
                  Tools & resources
                </Typography>
                <Grid container spacing={2}>
                  {[
                    {
                      icon: <CompareArrows />,
                      title: 'CBAM cost calculator',
                      desc: 'Compare actual emissions vs EU default values before you report.',
                      onClick: () => navigate('/cost-calculator'),
                    },
                    {
                      icon: <MenuBook />,
                      title: 'CBAM guide',
                      desc: 'Timelines, certificates, default values, and who CBAM affects.',
                      onClick: () => navigate('/cbam-guide'),
                    },
                    {
                      icon: <Settings />,
                      title: 'Company settings',
                      desc: 'Update company profile and installation details used in reports.',
                      onClick: () => navigate('/dashboard/settings'),
                    },
                    {
                      icon: <Description />,
                      title: 'Report library',
                      desc: 'Browse and download previously generated CBAM reports.',
                      onClick: () => navigate('/dashboard/reports'),
                    },
                  ].map((tool) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={tool.title}>
                      <Box
                        onClick={tool.onClick}
                        sx={{
                          p: 2.25,
                          height: '100%',
                          borderRadius: T.radius.md,
                          border: `1px solid ${T.color.lineFaint}`,
                          bgcolor: T.color.cream,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': { borderColor: T.color.mintDark, bgcolor: T.color.mint },
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                          <Box sx={{ color: T.color.forest, display: 'flex' }}>{tool.icon}</Box>
                          <Typography sx={{ fontFamily: T.font.body, fontWeight: 700, fontSize: '0.98rem', color: T.color.ink }}>
                            {tool.title}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted, lineHeight: 1.5 }}>
                          {tool.desc}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Container>
          )}

          <Outlet />
        </Box>
      </Box>
    </DashboardCalculationsContext.Provider>
  );
};

export default Dashboard;