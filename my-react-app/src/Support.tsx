import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Grid,
  Chip,
  Stack,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import { KeyboardArrowDown, Shield, SupportAgent, Mail, Phone } from '@mui/icons-material';
import UnifiedFooter from './components/UnifiedFooter';

type Lang = 'en' | 'ju' | 'tr';

const T = {
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
  },
  color: {
    forest: '#0B4F3E',
    mint: '#E8F5EF',
    mintDark: '#C3E6D5',
    cream: '#FAFAF7',
    warmWhite: '#FFFEF9',
    ink: '#1A2B25',
    muted: '#6B8F82',
    line: '#D6E5DD',
    ctaHover: '#0A3F32',
  },
  radius: { sm: '8px', md: '14px', lg: '20px', pill: '999px' },
};

const translations: Record<Lang, {
  nav: { badge: string; login: string };
  hero: { badge: string; title: string; subtitle: string };
  support: { title: string; intro: string; emailLabel: string; phoneLabel: string };
  footer: {
    tagline: string;
    product: { title: string; features: string; pricing: string; documentation: string };
    resources: { title: string; guide: string; blog: string; support: string };
    company: { title: string; about: string; contact: string; privacy: string };
    copyright: string;
  };
}> = {
  en: {
    nav: { badge: 'Support', login: 'Login' },
    hero: {
      badge: 'Support',
      title: 'Need help with Panonia?',
      subtitle: 'If you have issues with calculations, reports, accounts, or access, reach out and we will help quickly.',
    },
    support: {
      title: 'Contact Support',
      intro: 'For support contact email: edi@panonia.io, or call on phone +387 62 166 630.',
      emailLabel: 'Support email',
      phoneLabel: 'Support phone',
    },
    footer: {
      tagline: 'Making CBAM compliance simple for businesses worldwide.',
      product: { title: 'Product', features: 'Features', pricing: 'Pricing', documentation: 'Documentation' },
      resources: { title: 'Resources', guide: 'CBAM Guide', blog: 'Blog', support: 'Support' },
      company: { title: 'Company', about: 'About', contact: 'Contact', privacy: 'Privacy' },
      copyright: '© 2025 Panonia. All rights reserved.',
    },
  },
  ju: {
    nav: { badge: 'Podrška', login: 'Prijava' },
    hero: {
      badge: 'Podrška',
      title: 'Treba vam pomoć s Panonia platformom?',
      subtitle: 'Ako imate probleme sa izračunima, izvještajima, računom ili pristupom, javite se i brzo ćemo pomoći.',
    },
    support: {
      title: 'Kontakt podrške',
      intro: 'Za podršku kontaktirajte email: edi@panonia.io, ili nazovite na telefon +387 62 166 630.',
      emailLabel: 'Email podrške',
      phoneLabel: 'Telefon podrške',
    },
    footer: {
      tagline: 'Činimo CBAM usklađenost jednostavnom za tvrtke širom svijeta.',
      product: { title: 'Proizvod', features: 'Značajke', pricing: 'Cijene', documentation: 'Dokumentacija' },
      resources: { title: 'Resursi', guide: 'CBAM Vodič', blog: 'Blog', support: 'Podrška' },
      company: { title: 'Tvrtka', about: 'O nama', contact: 'Kontakt', privacy: 'Privatnost' },
      copyright: '© 2025 Panonia. Sva prava pridržana.',
    },
  },
  tr: {
    nav: { badge: 'Destek', login: 'Giriş' },
    hero: {
      badge: 'Destek',
      title: 'Panonia ile ilgili yardıma mı ihtiyacınız var?',
      subtitle: 'Hesaplamalar, raporlar, hesap veya erişim konularında sorun yaşarsanız bize ulaşın; hızlıca yardımcı oluruz.',
    },
    support: {
      title: 'Destek İletişimi',
      intro: 'Destek için e-posta: edi@panonia.io, veya telefonla arayın: +387 62 166 630.',
      emailLabel: 'Destek e-postası',
      phoneLabel: 'Destek telefonu',
    },
    footer: {
      tagline: 'CBAM uyumluluğunu dünya genelinde şirketler için basit hale getiriyoruz.',
      product: { title: 'Ürün', features: 'Özellikler', pricing: 'Fiyatlandırma', documentation: 'Dokümantasyon' },
      resources: { title: 'Kaynaklar', guide: 'CBAM Rehberi', blog: 'Blog', support: 'Destek' },
      company: { title: 'Şirket', about: 'Hakkımızda', contact: 'İletişim', privacy: 'Gizlilik' },
      copyright: '© 2025 Panonia. Tüm hakları saklıdır.',
    },
  },
};

const Support: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [language, setLanguage] = useState<Lang>('en');
  const t = translations[language];

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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: T.color.cream, fontFamily: T.font.body, overflowX: 'hidden' }}>
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
            <Chip label={t.nav.badge} size="small" sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.04em', bgcolor: T.color.mint, color: T.color.forest, border: `1px solid ${T.color.mintDark}` }} />
          </Box>

          <Box display="flex" alignItems="center" gap={1.5}>
            <Button
              onClick={(e) => setAnchorEl(e.currentTarget)}
              endIcon={<KeyboardArrowDown sx={{ fontSize: '18px !important' }} />}
              sx={{ fontFamily: T.font.body, fontWeight: 500, fontSize: '0.85rem', color: T.color.muted, textTransform: 'none', minWidth: 'auto', px: 1.5, borderRadius: T.radius.pill, '&:hover': { bgcolor: T.color.mint } }}
            >
              {currentLanguage?.flag}
            </Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { borderRadius: T.radius.md, border: `1px solid ${T.color.line}`, boxShadow: '0 12px 32px -8px rgba(0,0,0,0.12)', mt: 1 } }}>
              {languageOptions.map((lang) => (
                <MenuItem key={lang.code} onClick={() => { setLanguage(lang.code); setAnchorEl(null); }} selected={language === lang.code} sx={{ fontFamily: T.font.body, borderRadius: '8px', mx: 0.5, '&.Mui-selected': { bgcolor: T.color.mint } }}>
                  <ListItemIcon><Typography>{lang.flag}</Typography></ListItemIcon>
                  <ListItemText primary={lang.label} primaryTypographyProps={{ fontFamily: T.font.body, fontWeight: language === lang.code ? 600 : 400 }} />
                </MenuItem>
              ))}
            </Menu>
            <Button variant="contained" disableElevation onClick={() => navigate('/login')} sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.88rem', textTransform: 'none', bgcolor: T.color.forest, color: '#fff', borderRadius: T.radius.pill, px: 3, py: 0.9, '&:hover': { bgcolor: T.color.ctaHover } }}>
              {t.nav.login}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ pt: { xs: 16, md: 20 }, pb: { xs: 8, md: 10 }, px: { xs: 2, sm: 4 } }}>
        <Container maxWidth="md">
          <Chip icon={<SupportAgent sx={{ fontSize: 14 }} />} label={t.hero.badge} sx={{ mb: 2.5, bgcolor: T.color.mint, color: T.color.forest, border: `1px solid ${T.color.mintDark}`, fontFamily: T.font.body, fontWeight: 600 }} />
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '2rem', md: '3rem' }, color: T.color.ink, letterSpacing: '-0.03em', lineHeight: 1.1, mb: 2 }}>
            {t.hero.title}
          </Typography>
          <Typography sx={{ fontFamily: T.font.body, fontSize: '1.05rem', color: T.color.muted, lineHeight: 1.8 }}>
            {t.hero.subtitle}
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ pb: 10 }}>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: T.radius.lg, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite }}>
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '1.8rem', color: T.color.ink, mb: 2 }}>
            {t.support.title}
          </Typography>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.8, mb: 3 }}>
            {t.support.intro}
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 2.2, borderRadius: T.radius.md, border: `1px solid ${T.color.line}`, bgcolor: T.color.cream }}>
                <Stack direction="row" spacing={1.2} alignItems="center" mb={0.7}>
                  <Mail sx={{ color: T.color.forest }} />
                  <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, color: T.color.ink }}>
                    {t.support.emailLabel}
                  </Typography>
                </Stack>
                <Typography sx={{ fontFamily: T.font.body, color: T.color.muted }}>
                  edi@panonia.io
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 2.2, borderRadius: T.radius.md, border: `1px solid ${T.color.line}`, bgcolor: T.color.cream }}>
                <Stack direction="row" spacing={1.2} alignItems="center" mb={0.7}>
                  <Phone sx={{ color: T.color.forest }} />
                  <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, color: T.color.ink }}>
                    {t.support.phoneLabel}
                  </Typography>
                </Stack>
                <Typography sx={{ fontFamily: T.font.body, color: T.color.muted }}>
                  +387 62 166 630
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Container>

      <UnifiedFooter
        labels={{
          tagline: t.footer.tagline,
          productTitle: t.footer.product.title,
          productFeatures: t.footer.product.features,
          productPricing: t.footer.product.pricing,
          resourcesTitle: t.footer.resources.title,
          resourcesGuide: t.footer.resources.guide,
          resourcesSupport: t.footer.resources.support,
          companyTitle: t.footer.company.title,
          companyAbout: t.footer.company.about,
          companyContact: t.footer.company.contact,
          companyPrivacy: t.footer.company.privacy,
          copyright: t.footer.copyright,
        }}
      />
    </Box>
  );
};

export default Support;
