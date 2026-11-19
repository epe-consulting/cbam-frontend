import React, { useEffect, useState } from 'react';
import { usePageLanguage } from './i18n/useAppLanguage';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Toolbar,
  Typography,
} from '@mui/material';
import { KeyboardArrowDown, Shield, Gavel } from '@mui/icons-material';
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
    cream: '#FAFAF7',
    warmWhite: '#FFFEF9',
    ink: '#1A2B25',
    muted: '#6B8F82',
    line: '#D6E5DD',
    ctaHover: '#0A3F32',
  },
  radius: { md: '14px', pill: '999px' },
};

const copy: Record<
  Lang,
  {
    nav: { badge: string; login: string };
    hero: { badge: string; title: string; subtitle: string; updated: string };
    sections: Array<{ title: string; items: string[] }>;
    contact: string;
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
    nav: { badge: 'Terms', login: 'Login' },
    hero: {
      badge: 'Terms of Service',
      title: 'Terms governing use of Panonia services',
      subtitle:
        'These terms apply to the CBAM Calculator Platform and On-site Emissions Assessment services offered by Panonia.',
      updated: 'Last updated: November 2026',
    },
    sections: [
      {
        title: '1. Services',
        items: [
          'Panonia provides (a) software access for CBAM calculations and reporting, and/or (b) professional on-site emissions assessment, as agreed in writing.',
          'Platform accounts are created by Panonia after a commercial agreement; self-registration is not offered.',
          'Outputs are decision-support tools and do not replace accredited verification or legal advice where required.',
        ],
      },
      {
        title: '2. Client responsibilities',
        items: [
          'You must provide accurate, complete operational and product data needed for calculations or on-site work.',
          'You remain responsible for how results are used with EU importers, authorities, or third parties.',
          'You must keep login credentials confidential and notify us of unauthorised access.',
        ],
      },
      {
        title: '3. Fees and engagement',
        items: [
          'Fees are set in a proposal or contract. Public pages do not constitute a binding price list.',
          'On-site work depends on site access, safety rules, and timely availability of your personnel and data.',
          'Unless otherwise agreed, unpaid invoices may result in suspension of platform access.',
        ],
      },
      {
        title: '4. Intellectual property & confidentiality',
        items: [
          'Panonia retains IP in the platform, methodologies presentation, and templates, except for your raw input data.',
          'Both parties must keep confidential business information received during the engagement.',
          'You may use generated reports for your legitimate CBAM and commercial purposes.',
        ],
      },
      {
        title: '5. Limitation of liability',
        items: [
          'Panonia provides services with professional care but does not guarantee specific certificate costs, regulatory outcomes, or third-party acceptance.',
          'To the extent permitted by law, liability is limited to fees paid for the specific engagement giving rise to the claim.',
          'Nothing in these terms excludes liability that cannot be excluded under applicable law.',
        ],
      },
      {
        title: '6. Contact',
        items: [
          'Questions about these terms: info@panonia.io',
        ],
      },
    ],
    contact: 'For a written engagement or questions about these terms, contact info@panonia.io.',
    footer: {
      tagline: 'Professional CBAM calculation and on-site emissions support for exporters.',
      product: { title: 'Product', features: 'Features', pricing: 'Pricing' },
      resources: { title: 'Resources', guide: 'CBAM Guide', support: 'Support' },
      company: { title: 'Company', about: 'About', contact: 'Contact', privacy: 'Privacy', terms: 'Terms' },
      copyright: '© 2026 Panonia. All rights reserved.',
    },
  },
  ju: {
    nav: { badge: 'Uslovi', login: 'Prijava' },
    hero: {
      badge: 'Uslovi korištenja',
      title: 'Uslovi koji uređuju Panonia usluge',
      subtitle:
        'Ovi uslovi se odnose na CBAM kalkulator platformu i uslugu procjene emisija na lokaciji koje nudi Panonia.',
      updated: 'Posljednje ažuriranje: novembar 2026.',
    },
    sections: [
      {
        title: '1. Usluge',
        items: [
          'Panonia pruža (a) softverski pristup za CBAM izračune i izvještavanje, i/ili (b) profesionalnu procjenu emisija na lokaciji, kako je dogovoreno pisanim putem.',
          'Nalozi na platformi se otvaraju nakon komercijalnog dogovora; nema samostalne registracije.',
          'Rezultati su podrška odlučivanju i ne zamjenjuju akreditovanu verifikaciju ni pravni savjet gdje je potreban.',
        ],
      },
      {
        title: '2. Obaveze klijenta',
        items: [
          'Morate dostaviti tačne i potpune operativne i proizvodne podatke potrebne za izračune ili rad na lokaciji.',
          'Vi ostajete odgovorni za način korištenja rezultata prema EU uvoznicima, institucijama ili trećim stranama.',
          'Morate čuvati pristupne podatke i obavijestiti nas o neovlaštenom pristupu.',
        ],
      },
      {
        title: '3. Naknade i angažman',
        items: [
          'Naknade se definišu u ponudi ili ugovoru. Javne stranice nisu obavezujući cjenovnik.',
          'Rad na lokaciji zavisi od pristupa, sigurnosnih pravila i pravovremene dostupnosti osoblja i podataka.',
          'Ako nije drugačije dogovoreno, neplaćene fakture mogu dovesti do suspenzije pristupa platformi.',
        ],
      },
      {
        title: '4. Intelektualno vlasništvo i povjerljivost',
        items: [
          'Panonia zadržava IP na platformi, načinu prikaza metodologija i predlošcima, osim vaših sirovih ulaznih podataka.',
          'Obje strane čuvaju poslovne tajne primljene tokom angažmana.',
          'Generisane izvještaje možete koristiti za legitimne CBAM i poslovne svrhe.',
        ],
      },
      {
        title: '5. Ograničenje odgovornosti',
        items: [
          'Panonia pruža usluge s profesionalnom pažnjom, ali ne garantuje konkretne troškove certifikata, regulatorne ishode ni prihvatanje trećih strana.',
          'U mjeri dopuštenoj zakonom, odgovornost je ograničena na naknade plaćene za konkretni angažman.',
          'Ništa u ovim uslovima ne isključuje odgovornost koja se ne može isključiti po zakonu.',
        ],
      },
      {
        title: '6. Kontakt',
        items: ['Pitanja o uslovima: info@panonia.io'],
      },
    ],
    contact: 'Za pisani angažman ili pitanja o uslovima: info@panonia.io.',
    footer: {
      tagline: 'Profesionalni CBAM izračuni i podrška emisijama na lokaciji za izvoznike.',
      product: { title: 'Proizvod', features: 'Mogućnosti', pricing: 'Cijene' },
      resources: { title: 'Resursi', guide: 'CBAM vodič', support: 'Podrška' },
      company: { title: 'Kompanija', about: 'O nama', contact: 'Kontakt', privacy: 'Privatnost', terms: 'Uslovi' },
      copyright: '© 2026 Panonia. Sva prava pridržana.',
    },
  },
  tr: {
    nav: { badge: 'Şartlar', login: 'Giriş' },
    hero: {
      badge: 'Hizmet Şartları',
      title: 'Panonia hizmetlerinin kullanım şartları',
      subtitle:
        'Bu şartlar Panonia’nın sunduğu CBAM Hesaplama Platformu ve Saha Emisyon Değerlendirmesi hizmetleri için geçerlidir.',
      updated: 'Son güncelleme: Kasım 2026',
    },
    sections: [
      {
        title: '1. Hizmetler',
        items: [
          'Panonia, yazılı anlaşmaya göre (a) CBAM hesaplama/raporlama yazılım erişimi ve/veya (b) profesyonel saha emisyon değerlendirmesi sunar.',
          'Platform hesapları ticari anlaşmadan sonra Panonia tarafından açılır; self-servis kayıt yoktur.',
          'Çıktılar karar destek amaçlıdır; gerekli yerlerde akredite doğrulama veya hukuki danışmanlığın yerini tutmaz.',
        ],
      },
      {
        title: '2. Müşteri sorumlulukları',
        items: [
          'Hesaplama veya saha çalışması için gerekli doğru ve eksiksiz operasyonel/ürün verilerini sağlamalısınız.',
          'Sonuçların AB ithalatçıları, otoriteler veya üçüncü taraflarla kullanımından siz sorumlusunuz.',
          'Giriş bilgilerini gizli tutmalı ve yetkisiz erişimi bildirmelisiniz.',
        ],
      },
      {
        title: '3. Ücretler ve sözleşme',
        items: [
          'Ücretler teklif veya sözleşmede belirlenir. Kamuya açık sayfalar bağlayıcı fiyat listesi değildir.',
          'Saha çalışması erişim, güvenlik kuralları ve personel/verinin zamanında sağlanmasıyla bağlıdır.',
          'Aksi kararlaştırılmadıkça ödenmeyen faturalar platform erişiminin askıya alınmasına yol açabilir.',
        ],
      },
      {
        title: '4. Fikri mülkiyet ve gizlilik',
        items: [
          'Ham girdi verileriniz hariç platform, yöntem sunumu ve şablonlarda IP Panonia’ya aittir.',
          'Taraflar sözleşme sırasında alınan ticari bilgileri gizli tutar.',
          'Oluşturulan raporları meşru CBAM ve ticari amaçlarla kullanabilirsiniz.',
        ],
      },
      {
        title: '5. Sorumluluk sınırı',
        items: [
          'Panonia hizmetleri özenle sunar; belirli sertifika maliyetleri, düzenleyici sonuçlar veya üçüncü taraf kabulü garanti edilmez.',
          'Yasaların izin verdiği ölçüde sorumluluk, ilgili iş için ödenen ücretlerle sınırlıdır.',
          'Kanunen hariç tutulamayan sorumluluk bu şartlarla kaldırılmaz.',
        ],
      },
      {
        title: '6. İletişim',
        items: ['Şartlarla ilgili sorular: info@panonia.io'],
      },
    ],
    contact: 'Yazılı sözleşme veya şartlar için: info@panonia.io.',
    footer: {
      tagline: 'İhracatçılar için profesyonel CBAM hesaplama ve saha emisyon desteği.',
      product: { title: 'Ürün', features: 'Özellikler', pricing: 'Fiyatlandırma' },
      resources: { title: 'Kaynaklar', guide: 'CBAM Rehberi', support: 'Destek' },
      company: { title: 'Şirket', about: 'Hakkımızda', contact: 'İletişim', privacy: 'Gizlilik', terms: 'Şartlar' },
      copyright: '© 2026 Panonia. Tüm hakları saklıdır.',
    },
  },
};

const Terms: React.FC = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = usePageLanguage();
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
        <Toolbar sx={{ maxWidth: 960, mx: 'auto', width: '100%', px: { xs: 2, md: 3 } }}>
          <Box display="flex" alignItems="center" gap={1} sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: T.color.forest, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, color: T.color.ink }}>Panonia</Typography>
            <Chip label={t.nav.badge} size="small" sx={{ ml: 1, bgcolor: T.color.mint, color: T.color.forest, fontWeight: 600, fontSize: '0.7rem' }} />
          </Box>
          <Button onClick={(e) => setAnchorEl(e.currentTarget)} endIcon={<KeyboardArrowDown />} sx={{ textTransform: 'none', color: T.color.muted }}>
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
        <Chip icon={<Gavel sx={{ fontSize: 16 }} />} label={t.hero.badge} sx={{ mb: 2, bgcolor: T.color.mint, color: T.color.forest, fontWeight: 600 }} />
        <Typography component="h1" sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '2rem', md: '2.5rem' }, color: T.color.ink, mb: 1.5 }}>
          {t.hero.title}
        </Typography>
        <Typography sx={{ color: T.color.muted, mb: 1, lineHeight: 1.7 }}>{t.hero.subtitle}</Typography>
        <Typography sx={{ color: T.color.muted, fontSize: '0.85rem', mb: 4 }}>{t.hero.updated}</Typography>

        {t.sections.map((section) => (
          <Paper key={section.title} elevation={0} sx={{ p: 3, mb: 2, borderRadius: T.radius.md, border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite }}>
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: '1.15rem', color: T.color.ink, mb: 1.5 }}>
              {section.title}
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {section.items.map((item) => (
                <Typography component="li" key={item} sx={{ color: T.color.muted, fontSize: '0.95rem', lineHeight: 1.65, mb: 1 }}>
                  {item}
                </Typography>
              ))}
            </Box>
          </Paper>
        ))}

        <Typography sx={{ color: T.color.muted, mt: 2, lineHeight: 1.6 }}>{t.contact}</Typography>
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

export default Terms;
