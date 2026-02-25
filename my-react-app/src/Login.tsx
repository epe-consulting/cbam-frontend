import { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Link,
  Stack,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  Email,
  Lock,
  Shield,
} from '@mui/icons-material';

interface LoginProps {
  onBack: () => void;
  onLoginSuccess: () => void;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
    companyName: string;
  };
  message?: string;
}

import { API_BASE_URL } from './utils/api';

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

const textFieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: T.radius.sm, fontFamily: T.font.body },
  '& .MuiInputLabel-root': { fontFamily: T.font.body },
};

const Login: React.FC<LoginProps> = ({ onBack, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const data: LoginResponse = await response.json();

      if (response.ok && data.success && data.token) {
        localStorage.setItem('token', data.token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        onLoginSuccess();
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect to the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      setForgotPasswordMessage('Please enter your email address');
      return;
    }
    console.log('Password reset request for:', forgotPasswordEmail);
    setForgotPasswordMessage('Password reset instructions have been sent to your email address.');
    setTimeout(() => {
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
      setForgotPasswordMessage('');
    }, 3000);
  };

  return (
    <Box sx={{
      minHeight: '100vh', bgcolor: T.color.cream, fontFamily: T.font.body,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', py: 4,
      '&::before': {
        content: '""', position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: '120%', height: '60%',
        background: `radial-gradient(ellipse at center, ${T.color.mint} 0%, transparent 70%)`,
        pointerEvents: 'none', opacity: 0.6,
      },
    }}>
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Button
          startIcon={<ArrowBack sx={{ fontSize: '18px !important' }} />}
          onClick={onBack}
          sx={{
            mb: 3, fontFamily: T.font.body, fontWeight: 500, fontSize: '0.9rem',
            color: T.color.muted, textTransform: 'none', borderRadius: T.radius.pill,
            '&:hover': { bgcolor: T.color.mint, color: T.color.forest },
          }}
        >
          Back to Home
        </Button>

        <Paper elevation={0} sx={{ p: { xs: 4, md: 5 }, borderRadius: T.radius.xl, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite }}>
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Box display="flex" alignItems="center" justifyContent="center" gap={1.5} mb={2.5}>
              <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: T.color.forest, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield sx={{ color: '#fff', fontSize: 24 }} />
              </Box>
              <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '1.6rem', color: T.color.ink, letterSpacing: '-0.02em' }}>
                Panonia
              </Typography>
            </Box>
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '1.5rem', color: T.color.ink, mb: 0.5 }}>
              Welcome Back
            </Typography>
            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.95rem', color: T.color.muted, lineHeight: 1.6 }}>
              Sign in to your CBAM compliance account
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: T.radius.sm, fontFamily: T.font.body }}>
              {error}
            </Alert>
          )}

          {!showForgotPassword ? (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  fullWidth label="Email Address" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                  InputProps={{ startAdornment: <Email sx={{ mr: 1, color: T.color.muted, fontSize: 20 }} /> }}
                  sx={textFieldSx}
                />

                <TextField
                  fullWidth label="Password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)} required
                  InputProps={{ startAdornment: <Lock sx={{ mr: 1, color: T.color.muted, fontSize: 20 }} /> }}
                  sx={textFieldSx}
                />

                <Button
                  type="submit" variant="contained" size="large" fullWidth disableElevation
                  disabled={loading}
                  sx={{
                    py: 1.5, fontFamily: T.font.body, fontWeight: 600, fontSize: '1rem', textTransform: 'none',
                    bgcolor: T.color.forest, borderRadius: T.radius.pill,
                    '&:hover': { bgcolor: T.color.ctaHover },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: '#fff' }} />
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleForgotPassword}>
              <Stack spacing={2.5}>
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink, textAlign: 'center' }}>
                  Reset Your Password
                </Typography>
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.92rem', color: T.color.muted, textAlign: 'center', mb: 1, lineHeight: 1.6 }}>
                  Enter your email address and we'll send you instructions to reset your password.
                </Typography>

                <TextField
                  fullWidth label="Email Address" type="email" value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)} required
                  InputProps={{ startAdornment: <Email sx={{ mr: 1, color: T.color.muted, fontSize: 20 }} /> }}
                  sx={textFieldSx}
                />

                {forgotPasswordMessage && (
                  <Alert severity={forgotPasswordMessage.includes('sent') ? 'success' : 'error'} sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>
                    {forgotPasswordMessage}
                  </Alert>
                )}

                <Stack direction="row" spacing={2}>
                  <Button
                    type="submit" variant="contained" size="large" disableElevation
                    sx={{
                      flex: 1, py: 1.5, fontFamily: T.font.body, fontWeight: 600, fontSize: '0.95rem', textTransform: 'none',
                      bgcolor: T.color.forest, borderRadius: T.radius.pill,
                      '&:hover': { bgcolor: T.color.ctaHover },
                    }}
                  >
                    Send Reset Instructions
                  </Button>
                  <Button
                    variant="outlined" size="large"
                    onClick={() => setShowForgotPassword(false)}
                    sx={{
                      flex: 1, py: 1.5, fontFamily: T.font.body, fontWeight: 600, fontSize: '0.95rem', textTransform: 'none',
                      borderColor: T.color.line, color: T.color.inkSoft, borderRadius: T.radius.pill,
                      '&:hover': { borderColor: T.color.forest, bgcolor: T.color.mint, color: T.color.forest },
                    }}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}

          <Divider sx={{ my: 3, borderColor: T.color.lineFaint }} />

          {!showForgotPassword && (
            <Box textAlign="center">
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.muted }}>
                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowForgotPassword(true);
                  }}
                  sx={{ fontFamily: T.font.body, fontSize: '0.88rem', fontWeight: 600, color: T.color.forest, textDecorationColor: T.color.mintDark, '&:hover': { color: T.color.ctaHover } }}
                >
                  Forgot your password?
                </Link>
              </Typography>
            </Box>
          )}
        </Paper>

        <Box textAlign="center" mt={4}>
          <Typography sx={{ fontFamily: T.font.body, fontSize: '0.82rem', color: T.color.muted }}>
            © {new Date().getFullYear()} Panonia. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;