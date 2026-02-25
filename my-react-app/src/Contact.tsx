import React, { useState, useEffect, useRef } from 'react';
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
  Email,
  Phone,
  LocationOn,
  CheckCircle,
  CalendarMonth,
  KeyboardArrowDown,
  AccessTime,
  Public,
  Shield,
  East,
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
  footer: {
    tagline: string;
    product: {
      title: string;
      features: string;
      pricing: string;
      documentation: string;
    };
    resources: {
      title: string;
      guide: string;
      blog: string;
      support: string;
    };
    company: {
      title: string;
      about: string;
      contact: string;
      privacy: string;
    };
    copyright: string;
  };
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
    footer: {
      tagline: 'Making CBAM compliance simple for businesses worldwide.',
      product: {
        title: 'Product',
        features: 'Features',
        pricing: 'Pricing',
        documentation: 'Documentation',
      },
      resources: {
        title: 'Resources',
        guide: 'CBAM Guide',
        blog: 'Blog',
        support: 'Support',
      },
      company: {
        title: 'Company',
        about: 'About',
        contact: 'Contact',
        privacy: 'Privacy',
      },
      copyright: '© 2025 Panonia. All rights reserved.',
    },
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
    footer: {
      tagline: 'Činimo CBAM usklađenost jednostavnom za tvrtke širom svijeta.',
      product: {
        title: 'Proizvod',
        features: 'Značajke',
        pricing: 'Cijene',
        documentation: 'Dokumentacija',
      },
      resources: {
        title: 'Resursi',
        guide: 'CBAM Vodič',
        blog: 'Blog',
        support: 'Podrška',
      },
      company: {
        title: 'Tvrtka',
        about: 'O nama',
        contact: 'Kontakt',
        privacy: 'Privatnost',
      },
      copyright: '© 2025 Panonia. Sva prava pridržana.',
    },
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
    footer: {
      tagline: 'CBAM uyumluluğunu dünya genelinde şirketler için basit hale getiriyoruz.',
      product: {
        title: 'Ürün',
        features: 'Özellikler',
        pricing: 'Fiyatlandırma',
        documentation: 'Dokümantasyon',
      },
      resources: {
        title: 'Kaynaklar',
        guide: 'CBAM Rehberi',
        blog: 'Blog',
        support: 'Destek',
      },
      company: {
        title: 'Şirket',
        about: 'Hakkımızda',
        contact: 'İletişim',
        privacy: 'Gizlilik',
      },
      copyright: '© 2025 Panonia. Tüm hakları saklıdır.',
    },
  },
};

/* ─── Design tokens (shared with App.tsx / CBAMGuide.tsx) ─── */
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
    cta: '#0B4F3E',
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

const sectionChipSx = {
  fontFamily: T.font.body,
  fontWeight: 600,
  fontSize: '0.75rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  bgcolor: T.color.mint,
  color: T.color.forest,
  border: `1px solid ${T.color.mintDark}`,
  mb: 2,
};

const textFieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: T.radius.sm, fontFamily: T.font.body },
  '& .MuiInputLabel-root': { fontFamily: T.font.body },
};

/* ─── Inject global keyframes (idempotent) ─── */
const CONTACT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&display=swap');
  @keyframes fadeInUp   { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeIn     { from { opacity:0 } to { opacity:1 } }
  @keyframes scaleIn    { from { opacity:0; transform:scale(.92) } to { opacity:1; transform:scale(1) } }
  @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  .anim-fade-up  { opacity:0; animation: fadeInUp .7s cubic-bezier(.22,1,.36,1) forwards }
  .anim-fade-in  { opacity:0; animation: fadeIn .6s ease forwards }
  .anim-scale-in { opacity:0; animation: scaleIn .6s cubic-bezier(.22,1,.36,1) forwards }
  .delay-1{animation-delay:.08s} .delay-2{animation-delay:.16s} .delay-3{animation-delay:.24s}
  .delay-4{animation-delay:.36s} .delay-5{animation-delay:.48s} .delay-6{animation-delay:.60s}
`;

/* ─── Scroll-triggered reveal ─── */
function useReveal<E extends HTMLElement = HTMLElement>() {
  const ref = useRef<E>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

/* ─── Contact card data ─── */
const contactCards = (t: typeof translations['en']) => [
  {
    icon: <Email fontSize="small" />,
    label: t.info.email,
    value: 'info@panonia.io',
    onClick: () => { window.location.href = 'mailto:info@panonia.io'; },
  },
  {
    icon: <Phone fontSize="small" />,
    label: t.info.phone,
    value: '+387 62 278 004',
    onClick: () => { window.location.href = 'tel:+38762278004'; },
  },
  {
    icon: <LocationOn fontSize="small" />,
    label: t.info.location,
    value: 'Tuzla, BiH',
    onClick: undefined,
  },
];

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
  const [scrolled, setScrolled] = useState(false);
  const t = translations[language];

  const cardsRef = useReveal<HTMLDivElement>();
  const detailsRef = useReveal<HTMLDivElement>();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (document.getElementById('panonia-global-styles')) return;
    const style = document.createElement('style');
    style.id = 'panonia-global-styles';
    style.textContent = CONTACT_STYLES;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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

  const cards = contactCards(t);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: T.color.cream, fontFamily: T.font.body, overflowX: 'hidden' }}>

      {/* ── Navigation ── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: scrolled ? 'rgba(250,250,247,0.88)' : 'rgba(250,250,247,0.6)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid',
          borderColor: scrolled ? T.color.line : 'transparent',
          transition: 'all 0.3s ease',
        }}
      >
        <Toolbar sx={{ maxWidth: 1200, mx: 'auto', width: '100%', px: { xs: 2, md: 4 } }}>
          <Box display="flex" alignItems="center" gap={1.2} sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: T.color.forest, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '1.25rem', color: T.color.ink, letterSpacing: '-0.02em' }}>
              Panonia
            </Typography>
            <Chip
              label={t.nav.badge}
              size="small"
              sx={{
                fontFamily: T.font.body, fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.04em',
                bgcolor: T.color.mint, color: T.color.forest, border: `1px solid ${T.color.mintDark}`,
              }}
            />
          </Box>

          <Box display="flex" alignItems="center" gap={1.5}>
            <Button
              onClick={(e) => setAnchorEl(e.currentTarget)}
              endIcon={<KeyboardArrowDown sx={{ fontSize: '18px !important' }} />}
              sx={{
                fontFamily: T.font.body, fontWeight: 500, fontSize: '0.85rem',
                color: T.color.muted, textTransform: 'none', minWidth: 'auto', px: 1.5,
                borderRadius: T.radius.pill, '&:hover': { bgcolor: T.color.mint },
              }}
            >
              {currentLanguage?.flag}
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              PaperProps={{ sx: { borderRadius: T.radius.md, border: `1px solid ${T.color.line}`, boxShadow: '0 12px 32px -8px rgba(0,0,0,0.12)', mt: 1 } }}
            >
              {languageOptions.map((lang) => (
                <MenuItem
                  key={lang.code}
                  onClick={() => { setLanguage(lang.code); setAnchorEl(null); }}
                  selected={language === lang.code}
                  sx={{ fontFamily: T.font.body, borderRadius: '8px', mx: 0.5, '&.Mui-selected': { bgcolor: T.color.mint } }}
                >
                  <ListItemIcon><Typography>{lang.flag}</Typography></ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontFamily: T.font.body, fontWeight: language === lang.code ? 600 : 400 }}>
                    {lang.label}
                  </ListItemText>
                </MenuItem>
              ))}
            </Menu>
            <Button
              variant="contained"
              disableElevation
              onClick={() => navigate('/login')}
              sx={{
                fontFamily: T.font.body, fontWeight: 600, fontSize: '0.88rem', textTransform: 'none',
                bgcolor: T.color.forest, color: '#fff', borderRadius: T.radius.pill, px: 3, py: 0.9,
                '&:hover': { bgcolor: T.color.ctaHover },
              }}
            >
              {t.nav.login}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Hero ── */}
      <Box
        sx={{
          pt: { xs: 16, md: 20 }, pb: { xs: 8, md: 12 }, px: { xs: 2, sm: 4 },
          position: 'relative', overflow: 'hidden',
          '&::before': {
            content: '""', position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
            width: '140%', height: '80%',
            background: `radial-gradient(ellipse at center, ${T.color.mint} 0%, transparent 70%)`,
            pointerEvents: 'none', opacity: 0.7,
          },
          '&::after': {
            content: '""', position: 'absolute', inset: 0,
            backgroundImage: `radial-gradient(${T.color.mintDark} 1px, transparent 1px)`,
            backgroundSize: '28px 28px', opacity: 0.25, pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Box textAlign="center">
            <Box className="anim-fade-in delay-1">
              <Chip icon={<Email sx={{ fontSize: 16 }} />} label={t.hero.badge} variant="outlined" sx={{ ...sectionChipSx, py: 0.3, px: 0.5 }} />
            </Box>
            <Typography
              component="h1"
              className="anim-fade-up delay-2"
              sx={{
                fontFamily: T.font.display, fontSize: { xs: '2.4rem', sm: '3.2rem', md: '3.8rem' },
                fontWeight: 700, lineHeight: 1.12, color: T.color.ink, letterSpacing: '-0.025em', mb: 3,
              }}
            >
              {t.hero.title}
              <Box
                component="span"
                sx={{
                  color: T.color.forest, position: 'relative',
                  '&::after': {
                    content: '""', position: 'absolute', left: 0, bottom: '0.06em',
                    width: '100%', height: '0.12em', bgcolor: T.color.accentLight, borderRadius: '4px', zIndex: -1,
                  },
                }}
              >
                {t.hero.titleHighlight}
              </Box>
            </Typography>
            <Typography
              className="anim-fade-up delay-3"
              sx={{ fontFamily: T.font.body, fontSize: { xs: '1.05rem', md: '1.2rem' }, color: T.color.muted, lineHeight: 1.7, maxWidth: 580, mx: 'auto' }}
            >
              {t.hero.subtitle}
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* ── Contact Cards ── */}
      <Box ref={cardsRef.ref} sx={{ py: { xs: 8, md: 12 }, bgcolor: T.color.warmWhite }}>
        <Container maxWidth="md">
          <Box className={cardsRef.visible ? 'anim-fade-up delay-1' : ''} sx={{ opacity: cardsRef.visible ? undefined : 0 }}>
            <Grid container spacing={3}>
              {cards.map((card, i) => (
                <Grid size={{ xs: 12, md: 4 }} key={i}>
                  <Paper
                    elevation={0}
                    onClick={card.onClick}
                    sx={{
                      p: { xs: 3.5, md: 4 }, textAlign: 'center', height: '100%',
                      border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.lg,
                      bgcolor: T.color.warmWhite,
                      cursor: card.onClick ? 'pointer' : 'default',
                      position: 'relative', overflow: 'hidden',
                      transition: 'all 0.35s cubic-bezier(.22,1,.36,1)',
                      '&:hover': {
                        transform: card.onClick ? 'translateY(-6px)' : 'none',
                        boxShadow: card.onClick ? `0 20px 48px -12px rgba(11,79,62,0.12)` : 'none',
                        borderColor: T.color.mintDark,
                      },
                      '&::before': {
                        content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                        background: `linear-gradient(90deg, ${T.color.forest}, ${T.color.sage}, ${T.color.accent})`,
                        opacity: 0, transition: 'opacity 0.35s ease',
                      },
                      '&:hover::before': { opacity: 1 },
                    }}
                  >
                    <Box sx={{
                      width: 56, height: 56, borderRadius: T.radius.md, mx: 'auto', mb: 2.5,
                      bgcolor: T.color.mint, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: T.color.forest, transition: 'transform 0.35s cubic-bezier(.22,1,.36,1)',
                    }}>
                      {card.icon}
                    </Box>
                    <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted, mb: 0.5 }}>
                      {card.label}
                    </Typography>
                    <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.1rem', color: T.color.ink }}>
                      {card.value}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Extra details */}
          <Box ref={detailsRef.ref} className={detailsRef.visible ? 'anim-fade-up delay-2' : ''} sx={{ opacity: detailsRef.visible ? undefined : 0, mt: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 }, borderRadius: T.radius.lg,
                border: `1px solid ${T.color.lineFaint}`, bgcolor: T.color.warmWhite,
              }}
            >
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box display="flex" alignItems="center" gap={2.5}>
                    <Box sx={{
                      width: 44, height: 44, borderRadius: T.radius.sm, flexShrink: 0,
                      bgcolor: T.color.mint, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.color.forest,
                    }}>
                      <AccessTime fontSize="small" />
                    </Box>
                    <Box>
                      <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>
                        {t.info.hours}
                      </Typography>
                      <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1rem', color: T.color.ink }}>
                        {t.info.hoursValue}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box display="flex" alignItems="center" gap={2.5}>
                    <Box sx={{
                      width: 44, height: 44, borderRadius: T.radius.sm, flexShrink: 0,
                      bgcolor: T.color.mint, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.color.forest,
                    }}>
                      <Public fontSize="small" />
                    </Box>
                    <Box>
                      <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>
                        {t.info.global}
                      </Typography>
                      <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1rem', color: T.color.ink }}>
                        {t.info.globalValue}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        </Container>
      </Box>

      {/* ── CTA Section ── */}
      <Box
        sx={{
          py: { xs: 10, md: 14 }, position: 'relative', overflow: 'hidden', bgcolor: T.color.forest,
          '&::before': {
            content: '""', position: 'absolute', inset: 0,
            background: `linear-gradient(135deg, ${T.color.forest} 0%, #0E6B52 30%, ${T.color.forest} 60%, #0A3F32 100%)`,
            backgroundSize: '200% 200%', animation: 'gradientShift 8s ease infinite',
          },
          '&::after': {
            content: '""', position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '24px 24px', pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '2rem', md: '2.8rem' }, color: '#fff', letterSpacing: '-0.02em', mb: 2 }}>
            {t.cta.title}
          </Typography>
          <Typography sx={{ fontFamily: T.font.body, fontSize: '1.1rem', color: 'rgba(255,255,255,0.65)', mb: 5, maxWidth: 520, mx: 'auto', lineHeight: 1.65 }}>
            {t.cta.subtitle}
          </Typography>
          <Button
            variant="contained"
            size="large"
            disableElevation
            startIcon={<CalendarMonth />}
            endIcon={<East />}
            onClick={() => setDemoOpen(true)}
            sx={{
              fontFamily: T.font.body, fontWeight: 600, fontSize: '1rem', textTransform: 'none',
              bgcolor: '#fff', color: T.color.forest, borderRadius: T.radius.pill, px: 5, py: 1.7,
              transition: 'all 0.3s cubic-bezier(.22,1,.36,1)',
              '&:hover': { bgcolor: T.color.accentLight, transform: 'translateY(-2px)', boxShadow: '0 12px 32px -8px rgba(0,0,0,0.25)' },
            }}
          >
            {t.demo.button}
          </Button>
        </Container>
      </Box>

      {/* ── Footer ── */}
      <Box
        component="footer"
        sx={{
          bgcolor: T.color.ink,
          color: 'rgba(255,255,255,0.55)',
          pt: { xs: 6, md: 8 },
          pb: 4,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ mb: 6 }}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Box display="flex" alignItems="center" gap={1.2} mb={2}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '8px',
                    bgcolor: T.color.forest,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Shield sx={{ color: '#fff', fontSize: 16 }} />
                </Box>
                <Typography
                  sx={{
                    fontFamily: T.font.display,
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: '#fff',
                  }}
                >
                  Panonia
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontFamily: T.font.body,
                  fontSize: '0.9rem',
                  lineHeight: 1.65,
                  maxWidth: 240,
                }}
              >
                {t.footer.tagline}
              </Typography>
            </Grid>

            <Grid size={{ xs: 6, md: 3 }}>
              <Typography
                sx={{
                  fontFamily: T.font.body,
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.35)',
                  mb: 2.5,
                }}
              >
                {t.footer.product.title}
              </Typography>
              <Stack spacing={1.5}>
                {[t.footer.product.features, t.footer.product.pricing, t.footer.product.documentation].map((item) => (
                  <Typography
                    key={item}
                    component="a"
                    href="#"
                    sx={{
                      fontFamily: T.font.body,
                      fontSize: '0.9rem',
                      color: 'rgba(255,255,255,0.55)',
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                      '&:hover': { color: '#fff' },
                    }}
                  >
                    {item}
                  </Typography>
                ))}
              </Stack>
            </Grid>

            <Grid size={{ xs: 6, md: 3 }}>
              <Typography
                sx={{
                  fontFamily: T.font.body,
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.35)',
                  mb: 2.5,
                }}
              >
                {t.footer.resources.title}
              </Typography>
              <Stack spacing={1.5}>
                <Typography
                  component="a"
                  onClick={() => navigate('/cbam-guide')}
                  sx={{
                    fontFamily: T.font.body,
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.55)',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                    '&:hover': { color: '#fff' },
                  }}
                >
                  {t.footer.resources.guide}
                </Typography>
                {[t.footer.resources.blog, t.footer.resources.support].map((item) => (
                  <Typography
                    key={item}
                    component="a"
                    href="#"
                    sx={{
                      fontFamily: T.font.body,
                      fontSize: '0.9rem',
                      color: 'rgba(255,255,255,0.55)',
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                      '&:hover': { color: '#fff' },
                    }}
                  >
                    {item}
                  </Typography>
                ))}
              </Stack>
            </Grid>

            <Grid size={{ xs: 6, md: 3 }}>
              <Typography
                sx={{
                  fontFamily: T.font.body,
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.35)',
                  mb: 2.5,
                }}
              >
                {t.footer.company.title}
              </Typography>
              <Stack spacing={1.5}>
                <Typography
                  component="a"
                  href="#"
                  sx={{
                    fontFamily: T.font.body,
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.55)',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                    '&:hover': { color: '#fff' },
                  }}
                >
                  {t.footer.company.about}
                </Typography>
                <Typography
                  component="a"
                  onClick={() => navigate('/contact')}
                  sx={{
                    fontFamily: T.font.body,
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.55)',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                    '&:hover': { color: '#fff' },
                  }}
                >
                  {t.footer.company.contact}
                </Typography>
                <Typography
                  component="a"
                  href="#"
                  sx={{
                    fontFamily: T.font.body,
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.55)',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                    '&:hover': { color: '#fff' },
                  }}
                >
                  {t.footer.company.privacy}
                </Typography>
              </Stack>
            </Grid>
          </Grid>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 3 }} />

          <Typography
            sx={{
              fontFamily: T.font.body,
              fontSize: '0.82rem',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            {t.footer.copyright}
          </Typography>
        </Container>
      </Box>

      {/* ── Schedule Demo Dialog ── */}
      <Dialog
        open={demoOpen}
        onClose={handleCloseDemoDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: T.radius.lg, overflow: 'hidden' } }}
      >
        <Box sx={{ height: 4, background: `linear-gradient(90deg, ${T.color.forest}, ${T.color.sage}, ${T.color.accent})` }} />
        <DialogTitle sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '1.4rem', color: T.color.ink, pt: 3 }}>
          {t.demo.title}
        </DialogTitle>
        <form onSubmit={handleDemoSubmit}>
          <DialogContent>
            {demoError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: T.radius.sm }} onClose={() => setDemoError(null)}>
                {demoError}
              </Alert>
            )}
            {demoSuccess ? (
              <Alert severity="success" sx={{ borderRadius: T.radius.sm }} icon={<CheckCircle />}>
                {t.demo.success}
              </Alert>
            ) : (
              <Stack spacing={2.5} sx={{ pt: 1 }}>
                <TextField required label={t.demo.name} value={demoName} onChange={(e) => setDemoName(e.target.value)} fullWidth autoFocus sx={textFieldSx} />
                <TextField required label={t.demo.email} type="email" value={demoEmail} onChange={(e) => setDemoEmail(e.target.value)} fullWidth sx={textFieldSx} />
                <TextField label={t.demo.company} value={demoCompany} onChange={(e) => setDemoCompany(e.target.value)} fullWidth sx={textFieldSx} />
                <TextField label={t.demo.message} value={demoMessage} onChange={(e) => setDemoMessage(e.target.value)} fullWidth multiline rows={3} sx={textFieldSx} />
              </Stack>
            )}
          </DialogContent>
          {!demoSuccess && (
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button
                onClick={handleCloseDemoDialog}
                disabled={demoLoading}
                sx={{ fontFamily: T.font.body, textTransform: 'none', borderRadius: T.radius.pill, px: 3, color: T.color.muted }}
              >
                {t.demo.cancel}
              </Button>
              <Button
                type="submit"
                variant="contained"
                disableElevation
                disabled={demoLoading}
                sx={{
                  fontFamily: T.font.body, fontWeight: 600, textTransform: 'none',
                  bgcolor: T.color.forest, borderRadius: T.radius.pill, px: 4,
                  '&:hover': { bgcolor: T.color.ctaHover },
                }}
              >
                {demoLoading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : t.demo.submit}
              </Button>
            </DialogActions>
          )}
        </form>
      </Dialog>
    </Box>
  );
};

export default Contact;