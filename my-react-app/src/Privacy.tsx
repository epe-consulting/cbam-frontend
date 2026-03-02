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
import { KeyboardArrowDown, Shield, Lock, Gavel, Mail } from '@mui/icons-material';
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
  hero: { badge: string; title: string; subtitle: string; updated: string };
  sections: {
    data: { title: string; items: string[] };
    usage: { title: string; items: string[] };
    sharing: { title: string; items: string[] };
    rights: { title: string; items: string[] };
  };
  contact: { title: string; text: string; email: string };
  footer: {
    tagline: string;
    product: { title: string; features: string; pricing: string; documentation: string };
    resources: { title: string; guide: string; blog: string; support: string };
    company: { title: string; about: string; contact: string; privacy: string };
    copyright: string;
  };
}> = {
  en: {
    nav: { badge: 'Privacy', login: 'Login' },
    hero: {
      badge: 'Privacy Policy',
      title: 'Your data, handled responsibly',
      subtitle:
        'This page explains what information Panonia collects, why we collect it, and how we protect it while providing CBAM software services.',
      updated: 'Last updated: March 2026',
    },
    sections: {
      data: {
        title: 'What We Collect',
        items: [
          'Account data such as name, email, and organization details.',
          'Operational data you provide for CBAM calculations and reporting.',
          'Basic usage analytics to improve reliability, performance, and UX.',
        ],
      },
      usage: {
        title: 'How We Use Data',
        items: [
          'To deliver calculations, reporting, and account functionality.',
          'To maintain security, prevent abuse, and monitor system health.',
          'To support users and improve product quality over time.',
        ],
      },
      sharing: {
        title: 'Data Sharing',
        items: [
          'We do not sell personal data.',
          'Data may be shared with infrastructure providers strictly to run the service.',
          'Data can be shared by you with your clients through platform sharing tools.',
        ],
      },
      rights: {
        title: 'Your Rights',
        items: [
          'You can request access, correction, or deletion of personal data.',
          'You can ask for export of your account data where applicable.',
          'You can contact us anytime for privacy-related questions.',
        ],
      },
    },
    contact: {
      title: 'Privacy Contact',
      text: 'For privacy requests or legal inquiries, reach out to us at:',
      email: 'info@panonia.io',
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
    nav: { badge: 'Privatnost', login: 'Prijava' },
    hero: {
      badge: 'Politika privatnosti',
      title: 'Vaši podaci, odgovorno obrađeni',
      subtitle:
        'Ova stranica objašnjava koje informacije Panonia prikuplja, zašto ih prikuplja i kako ih štiti tokom pružanja CBAM softverskih usluga.',
      updated: 'Zadnje ažuriranje: mart 2026',
    },
    sections: {
      data: {
        title: 'Šta prikupljamo',
        items: [
          'Podaci o računu kao što su ime, email i podaci o organizaciji.',
          'Operativni podaci koje unesete za CBAM izračune i izvještavanje.',
          'Osnovna analitika korištenja radi poboljšanja pouzdanosti i performansi.',
        ],
      },
      usage: {
        title: 'Kako koristimo podatke',
        items: [
          'Za isporuku izračuna, izvještaja i funkcionalnosti računa.',
          'Za sigurnost sistema, sprečavanje zloupotrebe i nadzor platforme.',
          'Za korisničku podršku i kontinuirano unapređenje proizvoda.',
        ],
      },
      sharing: {
        title: 'Dijeljenje podataka',
        items: [
          'Ne prodajemo lične podatke.',
          'Podaci se mogu dijeliti sa infrastrukturnim partnerima samo radi rada servisa.',
          'Podatke možete dijeliti sa svojim klijentima putem funkcija platforme.',
        ],
      },
      rights: {
        title: 'Vaša prava',
        items: [
          'Možete tražiti pristup, ispravku ili brisanje ličnih podataka.',
          'Možete tražiti izvoz podataka sa vašeg računa kada je primjenjivo.',
          'Za sva pitanja o privatnosti možete nam se obratiti u bilo kojem trenutku.',
        ],
      },
    },
    contact: {
      title: 'Kontakt za privatnost',
      text: 'Za zahtjeve vezane za privatnost ili pravna pitanja, javite se na:',
      email: 'info@panonia.io',
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
    nav: { badge: 'Gizlilik', login: 'Giriş' },
    hero: {
      badge: 'Gizlilik Politikası',
      title: 'Verileriniz, sorumlu şekilde işlenir',
      subtitle:
        'Bu sayfa Panonia\'nın hangi bilgileri topladığını, neden topladığını ve CBAM yazılım hizmetlerini sunarken bu verileri nasıl koruduğunu açıklar.',
      updated: 'Son güncelleme: Mart 2026',
    },
    sections: {
      data: {
        title: 'Neleri Topluyoruz',
        items: [
          'Ad, e-posta ve kuruluş bilgileri gibi hesap verileri.',
          'CBAM hesaplama ve raporlama için sağladığınız operasyonel veriler.',
          'Güvenilirlik ve performans için temel kullanım analitiği.',
        ],
      },
      usage: {
        title: 'Verileri Nasıl Kullanıyoruz',
        items: [
          'Hesaplama, raporlama ve hesap işlevlerini sunmak için.',
          'Güvenliği sağlamak, kötüye kullanımı önlemek ve sistemi izlemek için.',
          'Kullanıcı desteği ve ürün iyileştirmeleri için.',
        ],
      },
      sharing: {
        title: 'Veri Paylaşımı',
        items: [
          'Kişisel verileri satmayız.',
          'Veriler yalnızca hizmeti çalıştırmak için altyapı sağlayıcılarıyla paylaşılabilir.',
          'Veriler, platform paylaşım araçları ile sizin tarafınızdan müşterilerle paylaşılabilir.',
        ],
      },
      rights: {
        title: 'Haklarınız',
        items: [
          'Kişisel verilere erişim, düzeltme veya silme talebinde bulunabilirsiniz.',
          'Uygun durumlarda hesap verilerinizin dışa aktarımını talep edebilirsiniz.',
          'Gizlilikle ilgili sorular için her zaman bizimle iletişime geçebilirsiniz.',
        ],
      },
    },
    contact: {
      title: 'Gizlilik İletişim',
      text: 'Gizlilik talepleri veya hukuki sorular için bize şu adresten ulaşın:',
      email: 'info@panonia.io',
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

const Privacy: React.FC = () => {
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

      <Box sx={{ pt: { xs: 16, md: 20 }, pb: { xs: 6, md: 8 }, px: { xs: 2, sm: 4 } }}>
        <Container maxWidth="md">
          <Chip icon={<Lock sx={{ fontSize: 14 }} />} label={t.hero.badge} sx={{ mb: 2.5, bgcolor: T.color.mint, color: T.color.forest, border: `1px solid ${T.color.mintDark}`, fontFamily: T.font.body, fontWeight: 600 }} />
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '2rem', md: '3rem' }, color: T.color.ink, letterSpacing: '-0.03em', lineHeight: 1.1, mb: 2 }}>
            {t.hero.title}
          </Typography>
          <Typography sx={{ fontFamily: T.font.body, fontSize: '1.05rem', color: T.color.muted, lineHeight: 1.8, mb: 2 }}>
            {t.hero.subtitle}
          </Typography>
          <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.muted }}>
            {t.hero.updated}
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pb: 10 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: T.radius.lg, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite, height: '100%' }}>
              <Stack direction="row" spacing={1.2} alignItems="center" mb={1.8}>
                <Gavel sx={{ color: T.color.forest }} />
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, color: T.color.ink, fontSize: '1.3rem' }}>
                  {t.sections.data.title}
                </Typography>
              </Stack>
              <Stack spacing={1.2}>
                {t.sections.data.items.map((item) => (
                  <Typography key={item} sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.7 }}>
                    • {item}
                  </Typography>
                ))}
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: T.radius.lg, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite, height: '100%' }}>
              <Stack direction="row" spacing={1.2} alignItems="center" mb={1.8}>
                <Gavel sx={{ color: T.color.forest }} />
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, color: T.color.ink, fontSize: '1.3rem' }}>
                  {t.sections.usage.title}
                </Typography>
              </Stack>
              <Stack spacing={1.2}>
                {t.sections.usage.items.map((item) => (
                  <Typography key={item} sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.7 }}>
                    • {item}
                  </Typography>
                ))}
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: T.radius.lg, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite, height: '100%' }}>
              <Stack direction="row" spacing={1.2} alignItems="center" mb={1.8}>
                <Gavel sx={{ color: T.color.forest }} />
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, color: T.color.ink, fontSize: '1.3rem' }}>
                  {t.sections.sharing.title}
                </Typography>
              </Stack>
              <Stack spacing={1.2}>
                {t.sections.sharing.items.map((item) => (
                  <Typography key={item} sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.7 }}>
                    • {item}
                  </Typography>
                ))}
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: T.radius.lg, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite, height: '100%' }}>
              <Stack direction="row" spacing={1.2} alignItems="center" mb={1.8}>
                <Gavel sx={{ color: T.color.forest }} />
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, color: T.color.ink, fontSize: '1.3rem' }}>
                  {t.sections.rights.title}
                </Typography>
              </Stack>
              <Stack spacing={1.2}>
                {t.sections.rights.items.map((item) => (
                  <Typography key={item} sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.7 }}>
                    • {item}
                  </Typography>
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Paper elevation={0} sx={{ mt: 4, p: 3, borderRadius: T.radius.lg, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite }}>
          <Stack direction="row" spacing={1.2} alignItems="center" mb={1}>
            <Mail sx={{ color: T.color.forest }} />
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, color: T.color.ink, fontSize: '1.25rem' }}>
              {t.contact.title}
            </Typography>
          </Stack>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.7, mb: 1 }}>
            {t.contact.text}
          </Typography>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.forest, fontWeight: 600 }}>
            {t.contact.email}
          </Typography>
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

export default Privacy;
