import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert,
} from '@mui/material';
import {
  LockClock,
  ArrowForward,
} from '@mui/icons-material';

const T = {
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
  },
  color: {
    forest: '#0B4F3E',
    mint: '#E8F5EF',
    cream: '#FAFAF7',
    warmWhite: '#FFFEF9',
    ink: '#1A2B25',
    muted: '#6B8F82',
    line: '#D6E5DD',
    lineFaint: '#EAF0EC',
    accent: '#D4A853',
    accentLight: '#F4E8C9',
    ctaHover: '#0A3F32',
  },
  radius: { sm: '8px', lg: '20px', xl: '28px', pill: '999px' },
};

const SessionExpired: React.FC = () => {
  const navigate = useNavigate();

  const handleGoToLogin = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <Box sx={{
      minHeight: '100vh', bgcolor: T.color.cream, fontFamily: T.font.body,
      display: 'flex', alignItems: 'center', py: 4,
      position: 'relative', overflow: 'hidden',
      '&::before': {
        content: '""', position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: '120%', height: '60%',
        background: `radial-gradient(ellipse at center, ${T.color.mint} 0%, transparent 70%)`,
        pointerEvents: 'none', opacity: 0.5,
      },
    }}>
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper elevation={0} sx={{ p: { xs: 5, md: 6 }, borderRadius: T.radius.xl, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite, textAlign: 'center' }}>
          <Box display="flex" justifyContent="center" mb={3}>
            <Box sx={{ width: 80, height: 80, borderRadius: T.radius.lg, bgcolor: T.color.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LockClock sx={{ fontSize: 44, color: T.color.accent }} />
            </Box>
          </Box>

          <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '1.6rem', color: T.color.ink, letterSpacing: '-0.02em', mb: 2 }}>
            Session Expired
          </Typography>

          <Alert severity="warning" sx={{ mb: 3, textAlign: 'left', borderRadius: T.radius.sm, fontFamily: T.font.body }}>
            Your session has expired for security reasons. Please log in again to continue.
          </Alert>

          <Typography sx={{ fontFamily: T.font.body, fontSize: '0.95rem', color: T.color.muted, lineHeight: 1.7, mb: 4 }}>
            For your security, sessions automatically expire after a period of inactivity.
            Don't worry, your data is safe and you can log back in to continue where you left off.
          </Typography>

          <Button
            variant="contained" size="large" disableElevation
            endIcon={<ArrowForward />}
            onClick={handleGoToLogin}
            sx={{
              px: 5, py: 1.5, fontFamily: T.font.body, fontWeight: 600, fontSize: '1rem', textTransform: 'none',
              bgcolor: T.color.forest, borderRadius: T.radius.pill,
              '&:hover': { bgcolor: T.color.ctaHover },
            }}
          >
            Go to Login
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default SessionExpired;