import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Grid,
  Paper,
  Chip,
  Stack,
  Avatar,
  Divider,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Email,
  Phone,
  LocationOn,
  CheckCircle,
  CalendarMonth,
  Language,
  KeyboardArrowDown,
  AccessTime,
  Public,
} from '@mui/icons-material';
import { API_BASE_URL } from './utils/api';

type Lang = 'en' | 'ju' | 'tr';

const translations: Record<Lang, {
  nav: { back: string; badge: string; login: string };
  hero: { badge: string; title: string; titleHighlight: string; subtitle: string };
  info: {
    email: string;
    phone: string;
    location: string;
    hours: string;
    hoursValue: string;
    global: string;
    globalValue: string;
  };
  demo: {
    button: string;
    title: string;
    name: string;
    email: string;
    company: string;
    message: string;
    cancel: string;
    submit: string;
    success: string;
    error: string;
  };
  cta: { title: string; subtitle: string };
  footer: { copyright: string };
}> = {
  en: {
    nav: { back: 'Back', badge: 'Contact', login: 'Login' },
    hero: {
      badge: 'Get in Touch',
      title: "Let's Talk About ",
      titleHighlight: 'CBAM Compliance',
      subtitle:
        "Have questions about CBAM reporting, our platform, or how we can help your business? We're here to help.",
    },
    info: {
      email: 'Email',
      phone: 'Phone',
      location: 'Location',
      hours: 'Business Hours',
      hoursValue: 'Mon – Fri, 9:00 – 17:00 CET',
      global: 'Coverage',
      globalValue: 'EU, Western Balkans, Turkey',
    },
    demo: {
      button: 'Schedule a Demo',
      title: 'Schedule a Demo',
      name: 'Name',
      email: 'Email',
      company: 'Company',
      message: 'Message',
      cancel: 'Cancel',
      submit: 'Submit',
      success: "Thank you! We'll be in touch soon.",
      error: 'Unable to send request. Please try again.',
    },
    cta: {
      title: 'Ready to Simplify CBAM?',
      subtitle: 'Schedule a demo and see how Panonia can streamline your compliance workflow.',
    },
    footer: { copyright: 'Panonia. All rights reserved.' },
  },
  ju: {
    nav: { back: 'Nazad', badge: 'Kontakt', login: 'Prijava' },
    hero: {
      badge: 'Kontaktirajte Nas',
      title: 'Razgovarajmo o ',
      titleHighlight: 'CBAM Usklađenosti',
      subtitle:
        'Imate pitanja o CBAM izvješćivanju, našoj platformi ili kako možemo pomoći vašem poslovanju? Tu smo da pomognemo.',
    },
    info: {
      email: 'Email',
      phone: 'Telefon',
      location: 'Lokacija',
      hours: 'Radno Vrijeme',
      hoursValue: 'Pon – Pet, 9:00 – 17:00 CET',
      global: 'Pokrivenost',
      globalValue: 'EU, Zapadni Balkan, Turska',
    },
    demo: {
      button: 'Zakažite Demo',
      title: 'Zakažite Demo',
      name: 'Ime',
      email: 'Email',
      company: 'Firma',
      message: 'Poruka',
      cancel: 'Otkaži',
      submit: 'Pošalji',
      success: 'Hvala! Javićemo vam se uskoro.',
      error: 'Nije moguće poslati zahtjev. Pokušajte ponovo.',
    },
    cta: {
      title: 'Spremni Pojednostaviti CBAM?',
      subtitle: 'Zakažite demo i pogledajte kako Panonia može unaprijediti vaš proces usklađenosti.',
    },
    footer: { copyright: 'Panonia. Sva prava pridržana.' },
  },
  tr: {
    nav: { back: 'Geri', badge: 'İletişim', login: 'Giriş' },
    hero: {
      badge: 'Bize Ulaşın',
      title: 'Hakkında Konuşalım ',
      titleHighlight: 'CBAM Uyumluluğu',
      subtitle:
        'CBAM raporlaması, platformumuz veya işletmenize nasıl yardımcı olabileceğimiz hakkında sorularınız mı var? Yardımcı olmak için buradayız.',
    },
    info: {
      email: 'E-posta',
      phone: 'Telefon',
      location: 'Konum',
      hours: 'Çalışma Saatleri',
      hoursValue: 'Pzt – Cum, 9:00 – 17:00 CET',
      global: 'Kapsam',
      globalValue: 'AB, Batı Balkanlar, Türkiye',
    },
    demo: {
      button: 'Demo Planla',
      title: 'Demo Planla',
      name: 'Ad',
      email: 'E-posta',
      company: 'Şirket',
      message: 'Mesaj',
      cancel: 'İptal',
      submit: 'Gönder',
      success: 'Teşekkürler! En kısa sürede size ulaşacağız.',
      error: 'İstek gönderilemedi. Lütfen tekrar deneyin.',
    },
    cta: {
      title: "CBAM'ı Basitleştirmeye Hazır mısınız?",
      subtitle: 'Bir demo planlayın ve Panonia\'nın uyumluluk sürecinizi nasıl kolaylaştırabileceğini görün.',
    },
    footer: { copyright: 'Panonia. Tüm hakları saklıdır.' },
  },
};

const Contact: React.FC = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Lang>('en');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoCompany, setDemoCompany] = useState('');
  const [demoMessage, setDemoMessage] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoSuccess, setDemoSuccess] = useState(false);
  const t = translations[language];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const languageOptions = [
    { code: 'en' as Lang, label: 'English', flag: '🇬🇧' },
    { code: 'ju' as Lang, label: 'Bosanski', flag: '🇧🇦' },
    { code: 'tr' as Lang, label: 'Türkçe', flag: '🇹🇷' },
  ];

  const currentLanguage = languageOptions.find((l) => l.code === language);

  const handleCloseDemoDialog = () => {
    setDemoOpen(false);
    setDemoError(null);
    if (demoSuccess) {
      setDemoName('');
      setDemoEmail('');
      setDemoCompany('');
      setDemoMessage('');
      setDemoSuccess(false);
    }
  };

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDemoError(null);
    setDemoLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/demo-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: demoName.trim(),
          email: demoEmail.trim(),
          company: demoCompany.trim() || undefined,
          message: demoMessage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDemoError(data?.message || t.demo.error);
        setDemoLoading(false);
        return;
      }
      setDemoSuccess(true);
      setDemoLoading(false);
      setTimeout(() => {
        setDemoOpen(false);
        setDemoSuccess(false);
        setDemoName('');
        setDemoEmail('');
        setDemoCompany('');
        setDemoMessage('');
      }, 2000);
    } catch {
      setDemoError(t.demo.error);
      setDemoLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Navigation */}
      <AppBar
        position="fixed"
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
        }}
      >
        <Toolbar>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            sx={{ color: 'text.secondary', mr: 2 }}
          >
            {t.nav.back}
          </Button>
          <Box display="flex" alignItems="center" gap={1} sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              PANONIA
            </Typography>
            <Chip label={t.nav.badge} size="small" color="primary" variant="outlined" />
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Button
              onClick={(e) => setAnchorEl(e.currentTarget)}
              startIcon={<Language />}
              endIcon={<KeyboardArrowDown />}
              sx={{ color: 'text.secondary' }}
            >
              {currentLanguage?.label}
            </Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              {languageOptions.map((lang) => (
                <MenuItem
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setAnchorEl(null);
                  }}
                  selected={language === lang.code}
                >
                  <ListItemIcon>
                    <Typography>{lang.flag}</Typography>
                  </ListItemIcon>
                  <ListItemText>{lang.label}</ListItemText>
                  {language === lang.code && <CheckCircle color="primary" />}
                </MenuItem>
              ))}
            </Menu>
            <Button variant="contained" color="primary" onClick={() => navigate('/login')}>
              {t.nav.login}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Hero */}
      <Box
        sx={{
          pt: 16,
          pb: 8,
          px: { xs: 2, sm: 4 },
          background: 'linear-gradient(135deg, #ecfdf5 0%, #dbeafe 50%, #ede9fe 100%)',
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center" maxWidth="md" mx="auto">
            <Chip
              icon={<Email />}
              label={t.hero.badge}
              color="primary"
              variant="outlined"
              sx={{ mb: 3, bgcolor: 'white' }}
            />
            <Typography
              variant="h1"
              component="h1"
              gutterBottom
              sx={{
                fontSize: { xs: '2.25rem', md: '3.5rem' },
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {t.hero.title}
              <Typography
                component="span"
                color="primary"
                sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}
              >
                {t.hero.titleHighlight}
              </Typography>
            </Typography>
            <Typography variant="h5" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {t.hero.subtitle}
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Contact Cards */}
      <Box sx={{ py: 10, bgcolor: 'background.paper' }}>
        <Container maxWidth="md">
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  height: '100%',
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' },
                  transition: 'all 0.3s ease',
                }}
                onClick={() => (window.location.href = 'mailto:info@panonia.io')}
              >
                <Avatar
                  sx={{
                    bgcolor: '#059669',
                    width: 56,
                    height: 56,
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <Email />
                </Avatar>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {t.info.email}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  info@panonia.io
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  height: '100%',
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' },
                  transition: 'all 0.3s ease',
                }}
                onClick={() => (window.location.href = 'tel:+38762278004')}
              >
                <Avatar
                  sx={{
                    bgcolor: '#2563eb',
                    width: 56,
                    height: 56,
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <Phone />
                </Avatar>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {t.info.phone}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  +387 62 278 004
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  height: '100%',
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: '#7c3aed',
                    width: 56,
                    height: 56,
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <LocationOn />
                </Avatar>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {t.info.location}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Tuzla, BiH
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Extra details */}
          <Paper
            elevation={0}
            sx={{
              mt: 4,
              p: 3,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
            }}
          >
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <AccessTime color="primary" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {t.info.hours}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {t.info.hoursValue}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Public color="primary" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {t.info.global}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {t.info.globalValue}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Container>
      </Box>

      {/* CTA */}
      <Box sx={{ py: 10, bgcolor: 'primary.main', color: 'white' }}>
        <Container maxWidth="md">
          <Box textAlign="center">
            <Typography
              variant="h3"
              component="h2"
              gutterBottom
              sx={{ color: 'white', fontWeight: 700 }}
            >
              {t.cta.title}
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, color: 'primary.light' }}>
              {t.cta.subtitle}
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<CalendarMonth />}
              endIcon={<ArrowForward />}
              onClick={() => setDemoOpen(true)}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': { bgcolor: 'grey.100' },
              }}
            >
              {t.demo.button}
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: 'grey.900', color: 'grey.300', py: 4 }}>
        <Container maxWidth="lg">
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={2}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                PANONIA
              </Typography>
              <Divider
                orientation="vertical"
                flexItem
                sx={{ borderColor: 'grey.700', mx: 1 }}
              />
              <Typography variant="body2">{t.nav.badge}</Typography>
            </Box>
            <Typography variant="body2">
              &copy; {new Date().getFullYear()} {t.footer.copyright}
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Schedule Demo Dialog */}
      <Dialog open={demoOpen} onClose={handleCloseDemoDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t.demo.title}</DialogTitle>
        <form onSubmit={handleDemoSubmit}>
          <DialogContent>
            {demoError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDemoError(null)}>
                {demoError}
              </Alert>
            )}
            {demoSuccess ? (
              <Alert severity="success">{t.demo.success}</Alert>
            ) : (
              <Stack spacing={2} sx={{ pt: 1 }}>
                <TextField
                  required
                  label={t.demo.name}
                  value={demoName}
                  onChange={(e) => setDemoName(e.target.value)}
                  fullWidth
                  autoFocus
                />
                <TextField
                  required
                  label={t.demo.email}
                  type="email"
                  value={demoEmail}
                  onChange={(e) => setDemoEmail(e.target.value)}
                  fullWidth
                />
                <TextField
                  label={t.demo.company}
                  value={demoCompany}
                  onChange={(e) => setDemoCompany(e.target.value)}
                  fullWidth
                />
                <TextField
                  label={t.demo.message}
                  value={demoMessage}
                  onChange={(e) => setDemoMessage(e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                />
              </Stack>
            )}
          </DialogContent>
          {!demoSuccess && (
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCloseDemoDialog} disabled={demoLoading}>
                {t.demo.cancel}
              </Button>
              <Button type="submit" variant="contained" disabled={demoLoading}>
                {demoLoading ? <CircularProgress size={24} /> : t.demo.submit}
              </Button>
            </DialogActions>
          )}
        </form>
      </Dialog>
    </Box>
  );
};

export default Contact;
