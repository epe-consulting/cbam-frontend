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
import { KeyboardArrowDown, Shield, East, Groups, LocationOn, WorkspacePremium } from '@mui/icons-material';
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
  story: { title: string; p1: string; p2: string; p3: string };
  stats: { location: string; team: string; started: string };
  team: { title: string; subtitle: string; ediRole: string; senadRole: string; ibrahimRole: string };
  cta: { title: string; subtitle: string; button: string };
  footer: {
    tagline: string;
    product: { title: string; features: string; pricing: string; documentation: string };
    resources: { title: string; guide: string; blog: string; support: string };
    company: { title: string; about: string; contact: string; privacy: string };
    copyright: string;
  };
}> = {
  en: {
    nav: { badge: 'About Us', login: 'Login' },
    hero: {
      badge: 'Who We Are',
      title: 'Built in Tuzla for the CBAM era',
      subtitle:
        'Panonia is a Bosnia and Herzegovina team building practical software for carbon accounting and CBAM reporting.',
    },
    story: {
      title: 'Our Story',
      p1:
        'We started developing this idea in 2025 after seeing growing demand for product-level carbon footprint calculations in CBAM-covered sectors.',
      p2:
        'As a non-EU country, Bosnia and Herzegovina needs reliable and efficient ways to support exporters working with EU importers. That gap became our opportunity.',
      p3:
        'Our team combines software engineering with hands-on carbon accounting and reporting experience gained through EU projects, so the platform reflects real compliance workflows, not just generic forms.',
    },
    stats: {
      location: 'Tuzla, Bosnia and Herzegovina',
      team: '2-5 specialists',
      started: 'Started in 2025',
    },
    team: {
      title: 'Our Team',
      subtitle: 'Small, focused, and deeply practical.',
      ediRole: 'CEO, Software Engineer, CBAM Expert',
      senadRole: 'CTO, Software Engineer',
      ibrahimRole: 'CSO (Chief Sales Officer)',
    },
    cta: {
      title: 'Want to see Panonia in action?',
      subtitle: 'We can walk you through calculations, reporting, and real CBAM-ready outputs.',
      button: 'Schedule a Demo',
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
    nav: { badge: 'O Nama', login: 'Prijava' },
    hero: {
      badge: 'Ko smo mi',
      title: 'Nastali u Tuzli za CBAM eru',
      subtitle: 'Panonia je tim iz Bosne i Hercegovine koji gradi praktičan softver za ugljično računovodstvo i CBAM izvještavanje.',
    },
    story: {
      title: 'Naša priča',
      p1:
        'Ovu ideju razvijamo od 2025. godine, kada smo prepoznali rastuću potrebu za izračunom ugljičnog otiska proizvoda u sektorima koje pokriva CBAM.',
      p2:
        'Kao zemlja izvan EU, Bosna i Hercegovina treba pouzdane i efikasne alate za izvoznike koji rade s EU uvoznicima. Upravo tu smo vidjeli priliku.',
      p3:
        'Naš tim spaja softversko inženjerstvo s praktičnim iskustvom u ugljičnom računovodstvu i izvještavanju stečenim kroz EU projekte.',
    },
    stats: {
      location: 'Tuzla, Bosna i Hercegovina',
      team: '2-5 stručnjaka',
      started: 'Pokrenuto 2025.',
    },
    team: {
      title: 'Naš tim',
      subtitle: 'Mali, fokusiran i praktičan tim.',
      ediRole: 'CEO, softverski inženjer, CBAM ekspert',
      senadRole: 'CTO, softverski inženjer',
      ibrahimRole: 'CSO (direktor prodaje)',
    },
    cta: {
      title: 'Želite vidjeti Panonia platformu u praksi?',
      subtitle: 'Možemo vam pokazati izračune, izvještaje i stvarne CBAM-ready rezultate.',
      button: 'Zakažite demo',
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
    nav: { badge: 'Hakkımızda', login: 'Giriş' },
    hero: {
      badge: 'Biz Kimiz',
      title: 'CBAM dönemi için Tuzla’da kuruldu',
      subtitle: 'Panonia, karbon muhasebesi ve CBAM raporlaması için pratik yazılım geliştiren Bosna Hersek merkezli bir ekip.',
    },
    story: {
      title: 'Hikayemiz',
      p1:
        'Bu fikri 2025 yılında geliştirmeye başladık. CBAM kapsamındaki ürünler için ürün bazlı karbon ayak izi hesaplamasına güçlü bir talep olduğunu gördük.',
      p2:
        'Bosna Hersek AB dışı bir ülke olduğu için, AB ithalatçılarıyla çalışan ihracatçılar için güvenilir ve hızlı bir otomasyon ihtiyacı vardı.',
      p3:
        'Ekibimiz, yazılım mühendisliğini AB projelerinden gelen karbon muhasebesi ve raporlama deneyimiyle birleştiriyor.',
    },
    stats: {
      location: 'Tuzla, Bosna Hersek',
      team: '2-5 uzman',
      started: '2025’te başladı',
    },
    team: {
      title: 'Ekibimiz',
      subtitle: 'Küçük, odaklı ve sonuç odaklı.',
      ediRole: 'CEO, Yazılım Mühendisi, CBAM Uzmanı',
      senadRole: 'CTO, Yazılım Mühendisi',
      ibrahimRole: 'CSO (Satış Direktörü)',
    },
    cta: {
      title: 'Panonia’yı canlı görmek ister misiniz?',
      subtitle: 'Hesaplama, raporlama ve gerçek CBAM uyumlu çıktıları birlikte inceleyebiliriz.',
      button: 'Demo Planla',
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

const About: React.FC = () => {
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

      <Box sx={{ pt: { xs: 16, md: 20 }, pb: { xs: 8, md: 10 }, px: { xs: 2, sm: 4 }, position: 'relative' }}>
        <Container maxWidth="lg">
          <Grid container spacing={5} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Chip label={t.hero.badge} sx={{ mb: 2.5, bgcolor: T.color.mint, color: T.color.forest, border: `1px solid ${T.color.mintDark}`, fontFamily: T.font.body, fontWeight: 600 }} />
              <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '2rem', md: '3rem' }, color: T.color.ink, letterSpacing: '-0.03em', lineHeight: 1.1, mb: 2 }}>
                {t.hero.title}
              </Typography>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '1.05rem', color: T.color.muted, lineHeight: 1.8 }}>
                {t.hero.subtitle}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: T.radius.lg, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite }}>
                <Box component="img" src="/panonia-logo.png" alt="Panonia logo" sx={{ width: 64, height: 64, borderRadius: '14px', mb: 2 }} />
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, color: T.color.ink, fontSize: '1.2rem', mb: 1 }}>
                  Panonia
                </Typography>
                <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.7 }}>
                  Carbon accounting, product footprint calculation, and CBAM reporting — built for real exporters and real deadlines.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pb: 10 }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: T.radius.lg, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite }}>
              <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '1.8rem', color: T.color.ink, mb: 2 }}>
                {t.story.title}
              </Typography>
              <Stack spacing={2}>
                <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.8 }}>{t.story.p1}</Typography>
                <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.8 }}>{t.story.p2}</Typography>
                <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.8 }}>{t.story.p3}</Typography>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={2}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: T.radius.md, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite }}>
                <Stack direction="row" spacing={1.3} alignItems="center">
                  <LocationOn sx={{ color: T.color.forest }} />
                  <Typography sx={{ fontFamily: T.font.body, color: T.color.ink }}>{t.stats.location}</Typography>
                </Stack>
              </Paper>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: T.radius.md, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite }}>
                <Stack direction="row" spacing={1.3} alignItems="center">
                  <Groups sx={{ color: T.color.forest }} />
                  <Typography sx={{ fontFamily: T.font.body, color: T.color.ink }}>{t.stats.team}</Typography>
                </Stack>
              </Paper>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: T.radius.md, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite }}>
                <Stack direction="row" spacing={1.3} alignItems="center">
                  <WorkspacePremium sx={{ color: T.color.forest }} />
                  <Typography sx={{ fontFamily: T.font.body, color: T.color.ink }}>{t.stats.started}</Typography>
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>

        <Box sx={{ mt: 6 }}>
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '1.8rem', color: T.color.ink, mb: 1 }}>
            {t.team.title}
          </Typography>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, mb: 3 }}>
            {t.team.subtitle}
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper elevation={0} sx={{ borderRadius: T.radius.lg, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite, overflow: 'hidden' }}>
                <Box component="img" src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1200&q=80" alt="Stock team placeholder 1" sx={{ width: '100%', height: 240, objectFit: 'cover' }} />
                <Box sx={{ p: 2.5 }}>
                  <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, color: T.color.ink, fontSize: '1.15rem' }}>
                    Edi Pekaric
                  </Typography>
                  <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, mt: 0.5 }}>
                    {t.team.ediRole}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper elevation={0} sx={{ borderRadius: T.radius.lg, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite, overflow: 'hidden' }}>
                <Box component="img" src="https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=1200&q=80" alt="Stock team placeholder 2" sx={{ width: '100%', height: 240, objectFit: 'cover' }} />
                <Box sx={{ p: 2.5 }}>
                  <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, color: T.color.ink, fontSize: '1.15rem' }}>
                    Senad Hadzikic
                  </Typography>
                  <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, mt: 0.5 }}>
                    {t.team.senadRole}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper elevation={0} sx={{ borderRadius: T.radius.lg, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite, overflow: 'hidden' }}>
                <Box component="img" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80" alt="Stock team placeholder 3" sx={{ width: '100%', height: 240, objectFit: 'cover' }} />
                <Box sx={{ p: 2.5 }}>
                  <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, color: T.color.ink, fontSize: '1.15rem' }}>
                    Ibrahim Ahmetovic
                  </Typography>
                  <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, mt: 0.5 }}>
                    {t.team.ibrahimRole}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Container>

      <Box sx={{ py: { xs: 8, md: 10 }, px: { xs: 2, sm: 4 }, bgcolor: '#f5f7f5' }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '1.8rem', md: '2.4rem' }, color: T.color.ink, mb: 1.5 }}>
            {t.cta.title}
          </Typography>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.7, mb: 3 }}>
            {t.cta.subtitle}
          </Typography>
          <Button
            variant="contained"
            disableElevation
            endIcon={<East />}
            onClick={() => navigate('/contact')}
            sx={{ fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', bgcolor: T.color.forest, borderRadius: T.radius.pill, px: 4, py: 1.3, '&:hover': { bgcolor: T.color.ctaHover } }}
          >
            {t.cta.button}
          </Button>
        </Container>
      </Box>

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

export default About;
