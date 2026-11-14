import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  Calculate,
  Factory,
  KeyboardArrowDown,
  Shield,
  East,
  CheckCircle,
} from '@mui/icons-material';
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
    inkSoft: '#3D5A50',
    muted: '#6B8F82',
    line: '#D6E5DD',
    accentLight: '#F4E8C9',
    ctaHover: '#0A3F32',
  },
  radius: { sm: '8px', md: '14px', lg: '20px', pill: '999px' },
};

const copy: Record<
  Lang,
  {
    nav: { badge: string; login: string };
    hero: { badge: string; title: string; subtitle: string };
    contactCta: string;
    plans: Array<{
      name: string;
      tag: string;
      summary: string;
      points: string[];
      cta: string;
    }>;
    note: string;
    footer: {
      tagline: string;
      product: { title: string; features: string; pricing: string };
      resources: { title: string; guide: string; support: string };
      company: { title: string; about: string; contact: string; privacy: string; terms: string };
      copyright: string;
    };
  }
> = {
  en: {
    nav: { badge: 'Pricing', login: 'Login' },
    hero: {
      badge: 'Services & engagement',
      title: 'Two ways to work with Panonia',
      subtitle:
        'Choose the engagement model that fits your organisation — software-led calculation, or full on-site emissions assessment by our specialists.',
    },
    contactCta: 'Contact us for pricing',
    plans: [
      {
        name: 'CBAM Calculator Platform',
        tag: 'Software',
        summary:
          'Access to Panonia’s CBAM calculation and reporting workspace. Your team enters production data and generates emissions results and reports in-platform.',
        points: [
          'Guided CBAM calculation workflows',
          'Emissions factors and reporting outputs',
          'Company and installation management',
          'Accounts provisioned by Panonia after agreement',
        ],
        cta: 'Request calculator access',
      },
      {
        name: 'On-site Emissions Assessment',
        tag: 'Advisory',
        summary:
          'Our specialists visit your site, collect the required operational data, and calculate embedded emissions for you. You provide information — we handle the technical work.',
        points: [
          'On-site data collection with your operations team',
          'Embedded emissions calculated by Panonia experts',
          'Structured outputs ready for EU CBAM discussions',
          'Minimal burden on your staff beyond providing data',
        ],
        cta: 'Request on-site engagement',
      },
    ],
    note: 'Pricing depends on scope, sector, number of installations, and reporting period. Contact us for a tailored proposal — no public list prices.',
    footer: {
      tagline: 'Professional CBAM calculation and on-site emissions support for exporters.',
      product: { title: 'Product', features: 'Features', pricing: 'Pricing' },
      resources: { title: 'Resources', guide: 'CBAM Guide', support: 'Support' },
      company: {
        title: 'Company',
        about: 'About',
        contact: 'Contact',
        privacy: 'Privacy',
        terms: 'Terms',
      },
      copyright: '© 2026 Panonia. All rights reserved.',
    },
  },
  ju: {
    nav: { badge: 'Cijene', login: 'Prijava' },
    hero: {
      badge: 'Usluge i saradnja',
      title: 'Dva načina rada s Panoniom',
      subtitle:
        'Odaberite model koji odgovara vašoj organizaciji — softverski vođen izračun, ili kompletna procjena emisija na lokaciji od naših stručnjaka.',
    },
    contactCta: 'Kontaktirajte nas za cijenu',
    plans: [
      {
        name: 'CBAM kalkulator platforma',
        tag: 'Softver',
        summary:
          'Pristup Panonia prostoru za CBAM izračune i izvještavanje. Vaš tim unosi proizvodne podatke i generiše rezultate emisija i izvještaje u platformi.',
        points: [
          'Vođeni CBAM tokovi izračuna',
          'Faktori emisija i izvještajni outputi',
          'Upravljanje kompanijom i instalacijama',
          'Nalozi se otvaraju nakon dogovora s Panoniom',
        ],
        cta: 'Zatražite pristup kalkulatoru',
      },
      {
        name: 'Procjena emisija na lokaciji',
        tag: 'Savjetovanje',
        summary:
          'Naši stručnjaci dolaze na vaš sajt, prikupljaju potrebne operativne podatke i izračunavaju ugrađene emisije umjesto vas. Vi date podatke — mi radimo tehnički dio.',
        points: [
          'Prikupljanje podataka na lokaciji s vašim timom',
          'Ugrađene emisije računa Panonia',
          'Strukturirani outputi za razgovore o EU CBAM-u',
          'Minimalno opterećenje za osoblje osim davanja podataka',
        ],
        cta: 'Zatražite angažman na lokaciji',
      },
    ],
    note: 'Cijena zavisi od obima, sektora, broja instalacija i izvještajnog perioda. Kontaktirajte nas za prilagođenu ponudu — nema javnog cjenovnika.',
    footer: {
      tagline: 'Profesionalni CBAM izračuni i podrška emisijama na lokaciji za izvoznike.',
      product: { title: 'Proizvod', features: 'Mogućnosti', pricing: 'Cijene' },
      resources: { title: 'Resursi', guide: 'CBAM vodič', support: 'Podrška' },
      company: {
        title: 'Kompanija',
        about: 'O nama',
        contact: 'Kontakt',
        privacy: 'Privatnost',
        terms: 'Uslovi',
      },
      copyright: '© 2026 Panonia. Sva prava pridržana.',
    },
  },
  tr: {
    nav: { badge: 'Fiyatlandırma', login: 'Giriş' },
    hero: {
      badge: 'Hizmetler',
      title: 'Panonia ile çalışmanın iki yolu',
      subtitle:
        'Kuruluşunuza uygun modeli seçin — yazılım odaklı hesaplama veya uzmanlarımızın sahada yaptığı tam emisyon değerlendirmesi.',
    },
    contactCta: 'Fiyat için bize ulaşın',
    plans: [
      {
        name: 'CBAM Hesaplama Platformu',
        tag: 'Yazılım',
        summary:
          'Panonia CBAM hesaplama ve raporlama alanına erişim. Ekibiniz üretim verilerini girer; emisyon sonuçları ve raporlar platformda oluşur.',
        points: [
          'Rehberli CBAM hesaplama akışları',
          'Emisyon faktörleri ve rapor çıktıları',
          'Şirket ve tesis yönetimi',
          'Hesaplar anlaşma sonrası Panonia tarafından açılır',
        ],
        cta: 'Hesaplayıcı erişimi talep edin',
      },
      {
        name: 'Saha Emisyon Değerlendirmesi',
        tag: 'Danışmanlık',
        summary:
          'Uzmanlarımız tesisinize gelir, gerekli operasyonel verileri toplar ve gömülü emisyonları sizin yerinize hesaplar. Siz veriyi verirsiniz — teknik işi biz yaparız.',
        points: [
          'Operasyon ekibinizle sahada veri toplama',
          'Gömülü emisyonları Panonia uzmanları hesaplar',
          'AB CBAM görüşmeleri için yapılandırılmış çıktılar',
          'Personeliniz yalnızca veri sağlamakla sınırlı kalır',
        ],
        cta: 'Saha hizmeti talep edin',
      },
    ],
    note: 'Fiyat kapsam, sektör, tesis sayısı ve raporlama dönemine göre değişir. Özel teklif için bize ulaşın — kamuya açık fiyat listesi yoktur.',
    footer: {
      tagline: 'İhracatçılar için profesyonel CBAM hesaplama ve saha emisyon desteği.',
      product: { title: 'Ürün', features: 'Özellikler', pricing: 'Fiyatlandırma' },
      resources: { title: 'Kaynaklar', guide: 'CBAM Rehberi', support: 'Destek' },
      company: {
        title: 'Şirket',
        about: 'Hakkımızda',
        contact: 'İletişim',
        privacy: 'Gizlilik',
        terms: 'Şartlar',
      },
      copyright: '© 2026 Panonia. Tüm hakları saklıdır.',
    },
  },
};

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Lang>('en');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const t = copy[language];

  useEffect(() => {
    if (document.getElementById('panonia-global-styles')) return;
    const style = document.createElement('style');
    style.id = 'panonia-global-styles';
    style.textContent = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@600;700&display=swap');`;
    document.head.appendChild(style);
  }, []);

  const languageOptions = [
    { code: 'en' as Lang, label: 'English', flag: '🇬🇧' },
    { code: 'ju' as Lang, label: 'Bosanski', flag: '🇧🇦' },
    { code: 'tr' as Lang, label: 'Türkçe', flag: '🇹🇷' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: T.color.cream, fontFamily: T.font.body }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'rgba(250,250,247,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.color.line}` }}>
        <Toolbar sx={{ maxWidth: 1100, mx: 'auto', width: '100%', px: { xs: 2, md: 3 } }}>
          <Box display="flex" alignItems="center" gap={1} sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: T.color.forest, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, color: T.color.ink }}>Panonia</Typography>
            <Chip label={t.nav.badge} size="small" sx={{ ml: 1, bgcolor: T.color.mint, color: T.color.forest, fontWeight: 600, fontSize: '0.7rem' }} />
          </Box>
          <Button onClick={(e) => setAnchorEl(e.currentTarget)} endIcon={<KeyboardArrowDown />} sx={{ textTransform: 'none', color: T.color.muted, fontFamily: T.font.body }}>
            {languageOptions.find((l) => l.code === language)?.flag}
          </Button>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            {languageOptions.map((lang) => (
              <MenuItem key={lang.code} selected={lang.code === language} onClick={() => { setLanguage(lang.code); setAnchorEl(null); }}>
                <ListItemIcon><Typography>{lang.flag}</Typography></ListItemIcon>
                <ListItemText>{lang.label}</ListItemText>
              </MenuItem>
            ))}
          </Menu>
          <Button variant="contained" disableElevation onClick={() => navigate('/login')} sx={{ ml: 1, textTransform: 'none', bgcolor: T.color.forest, borderRadius: T.radius.pill, fontWeight: 600, '&:hover': { bgcolor: T.color.ctaHover } }}>
            {t.nav.login}
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 }, px: { xs: 2, md: 3 } }}>
        <Chip label={t.hero.badge} sx={{ mb: 2, bgcolor: T.color.mint, color: T.color.forest, fontWeight: 600, fontSize: '0.75rem' }} />
        <Typography component="h1" sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '2rem', md: '2.6rem' }, color: T.color.ink, mb: 1.5, letterSpacing: '-0.02em' }}>
          {t.hero.title}
        </Typography>
        <Typography sx={{ color: T.color.muted, fontSize: '1.05rem', lineHeight: 1.7, mb: 5, maxWidth: 640 }}>
          {t.hero.subtitle}
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {t.plans.map((plan, i) => (
            <Grid size={{ xs: 12, md: 6 }} key={plan.name}>
              <Box
                sx={{
                  height: '100%',
                  p: { xs: 3, md: 3.5 },
                  borderRadius: T.radius.lg,
                  border: `1px solid ${T.color.line}`,
                  bgcolor: T.color.warmWhite,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Chip
                  icon={i === 0 ? <Calculate sx={{ fontSize: '16px !important' }} /> : <Factory sx={{ fontSize: '16px !important' }} />}
                  label={plan.tag}
                  size="small"
                  sx={{ alignSelf: 'flex-start', mb: 2, bgcolor: i === 0 ? T.color.mint : T.color.accentLight, color: T.color.ink, fontWeight: 600 }}
                />
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '1.35rem', color: T.color.ink, mb: 1.25 }}>
                  {plan.name}
                </Typography>
                <Typography sx={{ color: T.color.muted, fontSize: '0.95rem', lineHeight: 1.65, mb: 2.5 }}>
                  {plan.summary}
                </Typography>
                <Stack spacing={1.25} sx={{ mb: 3, flexGrow: 1 }}>
                  {plan.points.map((p) => (
                    <Box key={p} display="flex" gap={1.25} alignItems="flex-start">
                      <CheckCircle sx={{ fontSize: 18, color: T.color.forest, mt: 0.2 }} />
                      <Typography sx={{ fontSize: '0.9rem', color: T.color.inkSoft, lineHeight: 1.45 }}>{p}</Typography>
                    </Box>
                  ))}
                </Stack>
                <Button
                  variant={i === 0 ? 'contained' : 'outlined'}
                  disableElevation
                  endIcon={<East />}
                  onClick={() => navigate('/contact')}
                  sx={{
                    alignSelf: 'stretch',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: T.radius.pill,
                    py: 1.2,
                    bgcolor: i === 0 ? T.color.forest : undefined,
                    borderColor: T.color.forest,
                    color: i === 0 ? '#fff' : T.color.forest,
                    '&:hover': { bgcolor: i === 0 ? T.color.ctaHover : T.color.mint, borderColor: T.color.forest },
                  }}
                >
                  {plan.cta}
                </Button>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ p: 3, borderRadius: T.radius.md, bgcolor: T.color.mint, border: `1px solid ${T.color.mintDark}`, mb: 3 }}>
          <Typography sx={{ color: T.color.inkSoft, lineHeight: 1.65, mb: 2 }}>{t.note}</Typography>
          <Button
            variant="contained"
            disableElevation
            onClick={() => navigate('/contact')}
            sx={{ textTransform: 'none', fontWeight: 600, bgcolor: T.color.forest, borderRadius: T.radius.pill, '&:hover': { bgcolor: T.color.ctaHover } }}
          >
            {t.contactCta}
          </Button>
        </Box>
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
          companyTerms: t.footer.company.terms,
          copyright: t.footer.copyright,
        }}
      />
    </Box>
  );
};

export default Pricing;
