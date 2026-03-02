import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import Login from './Login';
import Dashboard from './Dashboard';
import NewCalculation from './NewCalculation';
import CalculationsList from './CalculationsList';
import Settings from './Settings';
import GenerateReport from './GenerateReport';
import ReportsList from './ReportsList';
import Admin from './Admin';
import ProtectedRoute from './ProtectedRoute';
import CBAMGuide from './CBAMGuide';
import Contact from './Contact';
import About from './About';
import Privacy from './Privacy';
import Support from './Support';
import Features from './Features';
import UnifiedFooter from './components/UnifiedFooter';
import {
  Shield,
  Language,
  KeyboardArrowDown,
  Calculate,
  Description,
  Send,
  CheckCircle,
  TrendingUp,
  Speed,
  VerifiedUser,
  Handshake,
  East,
} from '@mui/icons-material';
import { API_BASE_URL } from './utils/api';

type Language = 'en' | 'ju' | 'tr';

interface Translations {
  nav: {
    features: string;
    howItWorks: string;
    about: string;
    privacy: string;
    login: string;
  };
  hero: {
    badge: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    scheduleDemo: string;
    learnMore: string;
  };
  features: {
    title: string;
    subtitle: string;
    cards: {
      calculate: {
        title: string;
        description: string;
      };
      reports: {
        title: string;
        description: string;
      };
      sharing: {
        title: string;
        description: string;
      };
    };
  };
  howItWorks: {
    title: string;
    subtitle: string;
    steps: {
      input: {
        title: string;
        description: string;
      };
      calculate: {
        title: string;
        description: string;
      };
      share: {
        title: string;
        description: string;
      };
    };
  };
  benefits: {
    title: string;
    items: {
      compliant: {
        title: string;
        description: string;
      };
      saveTime: {
        title: string;
        description: string;
      };
      reduceErrors: {
        title: string;
        description: string;
      };
      buildTrust: {
        title: string;
        description: string;
      };
    };
    stats: {
      companies: string;
      accuracy: string;
    };
  };
  cta: {
    title: string;
    subtitle: string;
    button: string;
  };
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
}

const translations: Record<Language, Translations> = {
  en: {
    nav: {
      features: 'Features',
      howItWorks: 'How It Works',
      about: 'About CBAM',
      privacy: 'Privacy',
      login: 'Login',
    },
    hero: {
      badge: 'EU CBAM Compliant',
      title: 'Simplify Your ',
      titleHighlight: 'CBAM Emissions',
      subtitle:
        'Calculate product emissions accurately, generate compliant reports, and seamlessly share them with your EU clients. All in one platform.',
      scheduleDemo: 'Schedule a Demo',
      learnMore: 'Learn More',
    },
    features: {
      title: 'Everything You Need for CBAM Compliance',
      subtitle:
        'Streamline your carbon reporting workflow with our comprehensive solution',
      cards: {
        calculate: {
          title: 'Accurate Calculations',
          description:
            'Calculate embedded emissions using official CBAM methodologies and emission factors for all covered sectors.',
        },
        reports: {
          title: 'Compliant Reports',
          description:
            'Generate standardized reports that meet EU requirements, ready for submission by your clients.',
        },
        sharing: {
          title: 'Easy Sharing',
          description:
            'Send emissions data directly to your EU clients with secure, trackable delivery.',
        },
      },
    },
    howItWorks: {
      title: 'How It Works',
      subtitle: 'Three simple steps to complete CBAM compliance',
      steps: {
        input: {
          title: 'Input Product Data',
          description:
            'Enter your product specifications, production methods, and energy consumption data into our intuitive calculator.',
        },
        calculate: {
          title: 'Calculate Emissions',
          description:
            'Our system automatically calculates embedded emissions using verified methodologies and official emission factors.',
        },
        share: {
          title: 'Share with Clients',
          description:
            'Generate compliant reports and send them directly to your EU clients through our secure platform.',
        },
      },
    },
    benefits: {
      title: 'Why Choose Panonia?',
      items: {
        compliant: {
          title: 'Stay Compliant',
          description:
            'Keep up with evolving EU CBAM regulations automatically',
        },
        saveTime: {
          title: 'Save Time',
          description: 'Reduce reporting time from days to minutes',
        },
        reduceErrors: {
          title: 'Reduce Errors',
          description:
            'Eliminate manual calculation mistakes with automated processes',
        },
        buildTrust: {
          title: 'Build Trust',
          description:
            'Provide transparent, verified emissions data to your clients',
        },
      },
      stats: {
        companies: 'Companies already compliant',
        accuracy: 'Calculation accuracy rate',
      },
    },
    cta: {
      title: 'Ready to Streamline Your CBAM Reporting?',
      subtitle:
        'Join thousands of companies making carbon reporting simple and accurate',
      button: 'Schedule a Demo',
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
    nav: {
      features: 'Mogućnosti',
      howItWorks: 'Kako Funkcionira',
      about: 'O CBAM-u',
      privacy: 'Privatnost',
      login: 'Prijava',
    },
    hero: {
      badge: 'EU CBAM Usklađeno',
      title: 'Pojednostavite Vaše ',
      titleHighlight: 'CBAM Izvješćivanje',
      subtitle:
        'Precizno izračunajte emisije proizvoda, generirajte usklađena izvješća i jednostavno ih podijelite sa svojim EU klijentima. Sve na jednoj platformi.',
      scheduleDemo: 'Zakažite Demo',
      learnMore: 'Saznajte Više',
    },
    features: {
      title: 'Sve Što Vam Treba za CBAM Usklađenost',
      subtitle:
        'Pojednostavite proces izvješćivanja o ugljičnom otisku našim sveobuhvatnim rješenjem',
      cards: {
        calculate: {
          title: 'Precizni Izračuni',
          description:
            'Izračunajte ugrađene emisije koristeći službene CBAM metodologije i faktore emisija za sve pokrivene sektore.',
        },
        reports: {
          title: 'Usklađena Izvješća',
          description:
            'Generirajte standardizirana izvješća koja ispunjavaju EU zahtjeve, spremna za podnošenje od strane vaših klijenata.',
        },
        sharing: {
          title: 'Jednostavno Dijeljenje',
          description:
            'Pošaljite podatke o emisijama izravno vašim EU klijentima sa sigurnom, pratljivom dostavom.',
        },
      },
    },
    howItWorks: {
      title: 'Kako Funkcionira',
      subtitle: 'Tri jednostavna koraka do CBAM usklađenosti',
      steps: {
        input: {
          title: 'Unesite Podatke o Proizvodu',
          description:
            'Unesite specifikacije proizvoda, metode proizvodnje i podatke o potrošnji energije u naš intuitivni kalkulator.',
        },
        calculate: {
          title: 'Izračunajte Emisije',
          description:
            'Naš sustav automatski izračunava ugrađene emisije koristeći verificirane metodologije i službene faktore emisija.',
        },
        share: {
          title: 'Podijelite s Klijentima',
          description:
            'Generirajte usklađena izvješća i pošaljite ih izravno vašim EU klijentima kroz našu sigurnu platformu.',
        },
      },
    },
    benefits: {
      title: 'Zašto Odabrati Panonia?',
      items: {
        compliant: {
          title: 'Ostanite Usklađeni',
          description:
            'Pratite promjene EU CBAM regulativa automatski',
        },
        saveTime: {
          title: 'Uštedite Vrijeme',
          description: 'Smanjite vrijeme izvješćivanja s dana na minute',
        },
        reduceErrors: {
          title: 'Smanjite Greške',
          description:
            'Eliminirajte greške u ručnim izračunima automatiziranim procesima',
        },
        buildTrust: {
          title: 'Izgradite Povjerenje',
          description:
            'Pružite transparentne, verificirane podatke o emisijama vašim klijentima',
        },
      },
      stats: {
        companies: 'Tvrtki već usklađeno',
        accuracy: 'Stopa točnosti izračuna',
      },
    },
    cta: {
      title: 'Spremni Pojednostaviti Vaše CBAM Izvješćivanje?',
      subtitle:
        'Pridružite se tisućama tvrtki koje čine izvješćivanje o ugljiku jednostavnim i točnim',
      button: 'Zakažite Demo',
    },
    footer: {
      tagline:
        'Činimo CBAM usklađenost jednostavnom za tvrtke širom svijeta.',
      product: {
        title: 'Proizvod',
        features: 'Mogućnosti',
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
        about: 'O Nama',
        contact: 'Kontakt',
        privacy: 'Privatnost',
      },
      copyright: '© 2025 Panonia. Sva prava pridržana.',
    },
  },
  tr: {
    nav: {
      features: 'Özellikler',
      howItWorks: 'Nasıl Çalışır',
      about: 'CBAM Hakkında',
      privacy: 'Gizlilik',
      login: 'Giriş',
    },
    hero: {
      badge: 'AB CBAM Uyumlu',
      title: 'CBAM ',
      titleHighlight: 'Raporlamanızı',
      subtitle:
        'Ürün emisyonlarınızı hesaplayın, uyumlu raporlar oluşturun ve AB müşterilerinizle güvenle paylaşın. Hepsi tek platformda.',
      scheduleDemo: 'Demo Planla',
      learnMore: 'Daha Fazla Bilgi',
    },
    features: {
      title: 'CBAM Uyumu İçin İhtiyacınız Olan Her Şey',
      subtitle:
        'Kapsamlı çözümümüzle karbon ayak izi raporlamasını kolaylaştırın',
      cards: {
        calculate: {
          title: 'Hassas Hesaplamalar',
          description:
            'Tüm kapsanan sektörler için resmi CBAM metodolojileri ve emisyon faktörleri kullanarak gömülü emisyonları hesaplayın.',
        },
        reports: {
          title: 'Uyumlu Raporlar',
          description:
            'AB gereksinimlerini karşılayan, müşterileriniz tarafından sunulmaya hazır standart raporlar oluşturun.',
        },
        sharing: {
          title: 'Kolay Paylaşım',
          description:
            'Emisyon verilerini güvenli, izlenebilir teslimatla doğrudan AB müşterilerinize iletin.',
        },
      },
    },
    howItWorks: {
      title: 'Nasıl Çalışır',
      subtitle: 'CBAM uyumluluğuna üç basit adım',
      steps: {
        input: {
          title: 'Ürün Verilerini Girin',
          description:
            'Ürün özelliklerini, üretim yöntemlerini ve enerji tüketim verilerini sezgisel hesap makinemize girin.',
        },
        calculate: {
          title: 'Emisyonları Hesaplayın',
          description:
            'Sistemimiz doğrulanmış metodolojiler ve resmi emisyon faktörleri kullanarak gömülü emisyonları otomatik hesaplar.',
        },
        share: {
          title: 'Müşterilerle Paylaşın',
          description:
            'Uyumlu raporlar oluşturun ve güvenli platformumuz aracılığıyla doğrudan AB müşterilerinize gönderin.',
        },
      },
    },
    benefits: {
      title: 'Neden Panonia?',
      items: {
        compliant: {
          title: 'Uyumlu Kalın',
          description:
            'AB CBAM düzenlemelerindeki değişiklikleri otomatik takip edin',
        },
        saveTime: {
          title: 'Zaman Kazanın',
          description: 'Raporlama süresini günlerden dakikalara indirin',
        },
        reduceErrors: {
          title: 'Hataları Azaltın',
          description:
            'Otomatik süreçlerle manuel hesaplama hatalarını ortadan kaldırın',
        },
        buildTrust: {
          title: 'Güven Oluşturun',
          description:
            'Müşterilerinize şeffaf, doğrulanmış emisyon verileri sunun',
        },
      },
      stats: {
        companies: 'Zaten uyumlu şirket',
        accuracy: 'Hesaplama doğruluğu',
      },
    },
    cta: {
      title: 'CBAM Raporlamanızı Kolaylaştırmaya Hazır mısınız?',
      subtitle:
        'Karbon raporlamasını basit ve doğru yapan binlerce şirkete katılın',
      button: 'Demo Planla',
    },
    footer: {
      tagline:
        'CBAM uyumluluğunu dünya genelinde şirketler için basit hale getiriyoruz.',
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

/* ─── Inline keyframes via a <style> tag injected once ─── */
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&display=swap');

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.92); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-8px); }
  }
  @keyframes gradientShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .anim-fade-up {
    opacity: 0;
    animation: fadeInUp 0.7s cubic-bezier(.22,1,.36,1) forwards;
  }
  .anim-fade-in {
    opacity: 0;
    animation: fadeIn 0.6s ease forwards;
  }
  .anim-scale-in {
    opacity: 0;
    animation: scaleIn 0.6s cubic-bezier(.22,1,.36,1) forwards;
  }

  /* stagger helper classes */
  .delay-1 { animation-delay: 0.08s; }
  .delay-2 { animation-delay: 0.16s; }
  .delay-3 { animation-delay: 0.24s; }
  .delay-4 { animation-delay: 0.36s; }
  .delay-5 { animation-delay: 0.48s; }
  .delay-6 { animation-delay: 0.60s; }
`;

/* ─── Design tokens ─── */
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

/* ─── Utility: scroll-triggered animation via IntersectionObserver ─── */
function useReveal<E extends HTMLElement = HTMLElement>() {
  const ref = useRef<E>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, visible };
}

/* ─── Sub-components ─── */

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  index,
}) => {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <Box
      ref={ref}
      className={visible ? `anim-scale-in delay-${index + 1}` : ''}
      sx={{ opacity: visible ? undefined : 0 }}
    >
      <Card
        elevation={0}
        sx={{
          height: '100%',
          bgcolor: T.color.warmWhite,
          border: `1px solid ${T.color.lineFaint}`,
          borderRadius: T.radius.lg,
          overflow: 'hidden',
          position: 'relative',
          transition: 'all 0.35s cubic-bezier(.22,1,.36,1)',
          '&:hover': {
            transform: 'translateY(-6px)',
            boxShadow: `0 20px 48px -12px rgba(11,79,62,0.12)`,
            borderColor: T.color.mintDark,
            '& .feature-icon': {
              transform: 'scale(1.08) rotate(-3deg)',
            },
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: `linear-gradient(90deg, ${T.color.forest}, ${T.color.sage}, ${T.color.accent})`,
            opacity: 0,
            transition: 'opacity 0.35s ease',
          },
          '&:hover::before': {
            opacity: 1,
          },
        }}
      >
        <CardContent sx={{ p: { xs: 3.5, md: 4.5 } }}>
          <Box
            className="feature-icon"
            sx={{
              width: 56,
              height: 56,
              borderRadius: T.radius.md,
              bgcolor: T.color.mint,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
              transition: 'transform 0.35s cubic-bezier(.22,1,.36,1)',
              color: T.color.forest,
            }}
          >
            {icon}
          </Box>
          <Typography
            variant="h5"
            component="h3"
            gutterBottom
            sx={{
              fontFamily: T.font.display,
              fontWeight: 600,
              fontSize: '1.35rem',
              color: T.color.ink,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontFamily: T.font.body,
              color: T.color.muted,
              lineHeight: 1.7,
              fontSize: '0.95rem',
            }}
          >
            {description}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

interface StepCardProps {
  number: number;
  title: string;
  description: string;
  index: number;
}

const StepCard: React.FC<StepCardProps> = ({
  number,
  title,
  description,
  index,
}) => {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <Box
      ref={ref}
      className={visible ? `anim-fade-up delay-${index + 2}` : ''}
      sx={{ opacity: visible ? undefined : 0, position: 'relative' }}
    >
      <Box
        sx={{
          textAlign: 'center',
          p: { xs: 3, md: 4 },
          position: 'relative',
        }}
      >
        {/* Step number */}
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            mx: 'auto',
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: T.color.forest,
            color: '#fff',
            fontFamily: T.font.display,
            fontSize: '1.6rem',
            fontWeight: 700,
            position: 'relative',
            boxShadow: `0 8px 24px -4px rgba(11,79,62,0.3)`,
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: '-6px',
              borderRadius: '50%',
              border: `2px dashed ${T.color.mintDark}`,
            },
          }}
        >
          {number}
        </Box>
        <Typography
          variant="h5"
          component="h3"
          gutterBottom
          sx={{
            fontFamily: T.font.display,
            fontWeight: 600,
            fontSize: '1.3rem',
            color: T.color.ink,
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            fontFamily: T.font.body,
            color: T.color.muted,
            lineHeight: 1.7,
            maxWidth: 340,
            mx: 'auto',
          }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
  );
};

interface BenefitRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}

const BenefitRow: React.FC<BenefitRowProps> = ({
  icon,
  title,
  description,
  index,
}) => {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <Box
      ref={ref}
      className={visible ? `anim-fade-up delay-${index + 1}` : ''}
      sx={{
        opacity: visible ? undefined : 0,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2.5,
        p: 2.5,
        borderRadius: T.radius.md,
        transition: 'background 0.25s ease',
        '&:hover': { bgcolor: T.color.mint },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: T.radius.sm,
          bgcolor: T.color.mint,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: T.color.forest,
          mt: 0.25,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          variant="h6"
          component="h4"
          sx={{
            fontFamily: T.font.display,
            fontWeight: 600,
            fontSize: '1.05rem',
            color: T.color.ink,
            mb: 0.5,
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontFamily: T.font.body,
            color: T.color.muted,
            lineHeight: 1.65,
          }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
  );
};

/* ─── Main Landing Page ─── */

const CBAMLandingPage: React.FC = () => {
  const [language, setLanguage] = useState<Language>('en');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoCompany, setDemoCompany] = useState('');
  const [demoMessage, setDemoMessage] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoSuccess, setDemoSuccess] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const t = translations[language];

  /* Inject global keyframes once */
  useEffect(() => {
    if (document.getElementById('panonia-global-styles')) return;
    const style = document.createElement('style');
    style.id = 'panonia-global-styles';
    style.textContent = GLOBAL_STYLES;
    document.head.appendChild(style);
  }, []);

  /* Navbar scroll shadow */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const languageOptions = [
    { code: 'en' as Language, label: 'English', flag: '🇬🇧' },
    { code: 'ju' as Language, label: 'Bosanski', flag: '🇧🇦' },
    { code: 'tr' as Language, label: 'Türkçe', flag: '🇹🇷' },
  ];

  const currentLanguage = languageOptions.find(
    (lang) => lang.code === language,
  );

  const handleLanguageClick = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleLanguageClose = () => setAnchorEl(null);
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setAnchorEl(null);
  };
  const handleLoginClick = () => navigate('/login');
  const handleOpenDemoDialog = () => setDemoDialogOpen(true);
  const handleCloseDemoDialog = () => {
    setDemoDialogOpen(false);
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
        setDemoError(
          data?.message || 'Something went wrong. Please try again.',
        );
        setDemoLoading(false);
        return;
      }
      setDemoSuccess(true);
      setDemoLoading(false);
      setTimeout(() => {
        setDemoDialogOpen(false);
        setDemoSuccess(false);
        setDemoName('');
        setDemoEmail('');
        setDemoCompany('');
        setDemoMessage('');
      }, 2000);
    } catch {
      setDemoError('Unable to send request. Please try again.');
      setDemoLoading(false);
    }
  };

  /* Shared sx for section label chips */
  const sectionLabelSx = {
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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: T.color.cream,
        fontFamily: T.font.body,
        overflowX: 'hidden',
      }}
    >
      {/* ── Navigation ── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: scrolled
            ? 'rgba(250,250,247,0.88)'
            : 'rgba(250,250,247,0.6)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid',
          borderColor: scrolled ? T.color.line : 'transparent',
          transition: 'all 0.3s ease',
        }}
      >
        <Toolbar
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            width: '100%',
            px: { xs: 2, md: 4 },
          }}
        >
          {/* Logo */}
          <Box
            display="flex"
            alignItems="center"
            gap={1.2}
            sx={{ flexGrow: 1, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            {/* Leaf / shield mark */}
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: '10px',
                bgcolor: T.color.forest,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Typography
              sx={{
                fontFamily: T.font.display,
                fontWeight: 700,
                fontSize: '1.25rem',
                color: T.color.ink,
                letterSpacing: '-0.02em',
              }}
            >
              Panonia
            </Typography>
          </Box>

          {/* Desktop nav links */}
          {!isMobile && (
            <Box display="flex" gap={1} sx={{ mr: 3 }}>
              {[
                { label: t.nav.features, onClick: () => navigate('/features') },
                { label: t.nav.howItWorks, href: '#how-it-works' },
                {
                  label: t.nav.about,
                  onClick: () => navigate('/cbam-guide'),
                },
                {
                  label: t.nav.privacy,
                  onClick: () => navigate('/privacy'),
                },
              ].map((item) => (
                <Button
                  key={item.label}
                  {...(item.href
                    ? { href: item.href }
                    : { onClick: item.onClick })}
                  sx={{
                    fontFamily: T.font.body,
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    color: T.color.inkSoft,
                    textTransform: 'none',
                    borderRadius: T.radius.pill,
                    px: 2,
                    '&:hover': {
                      bgcolor: T.color.mint,
                      color: T.color.forest,
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          {/* Right actions */}
          <Box display="flex" alignItems="center" gap={1.5}>
            <Button
              onClick={handleLanguageClick}
              endIcon={
                <KeyboardArrowDown sx={{ fontSize: '18px !important' }} />
              }
              sx={{
                fontFamily: T.font.body,
                fontWeight: 500,
                fontSize: '0.85rem',
                color: T.color.muted,
                textTransform: 'none',
                minWidth: 'auto',
                px: 1.5,
                borderRadius: T.radius.pill,
                '&:hover': { bgcolor: T.color.mint },
              }}
            >
              {currentLanguage?.flag}&nbsp;
              {!isMobile && currentLanguage?.label}
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleLanguageClose}
              PaperProps={{
                sx: {
                  borderRadius: T.radius.md,
                  border: `1px solid ${T.color.line}`,
                  boxShadow: '0 12px 32px -8px rgba(0,0,0,0.12)',
                  mt: 1,
                },
              }}
            >
              {languageOptions.map((lang) => (
                <MenuItem
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  selected={language === lang.code}
                  sx={{
                    fontFamily: T.font.body,
                    borderRadius: '8px',
                    mx: 0.5,
                    '&.Mui-selected': {
                      bgcolor: T.color.mint,
                    },
                  }}
                >
                  <ListItemIcon>
                    <Typography>{lang.flag}</Typography>
                  </ListItemIcon>
                  <ListItemText
                    primaryTypographyProps={{
                      fontFamily: T.font.body,
                      fontWeight: language === lang.code ? 600 : 400,
                    }}
                  >
                    {lang.label}
                  </ListItemText>
                </MenuItem>
              ))}
            </Menu>
            <Button
              variant="contained"
              disableElevation
              onClick={handleLoginClick}
              sx={{
                fontFamily: T.font.body,
                fontWeight: 600,
                fontSize: '0.88rem',
                textTransform: 'none',
                bgcolor: T.color.forest,
                color: '#fff',
                borderRadius: T.radius.pill,
                px: 3,
                py: 0.9,
                '&:hover': {
                  bgcolor: T.color.ctaHover,
                },
              }}
            >
              {t.nav.login}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Hero Section ── */}
      <Box
        sx={{
          pt: { xs: 16, md: 20 },
          pb: { xs: 10, md: 14 },
          px: { xs: 2, sm: 4 },
          position: 'relative',
          overflow: 'hidden',
          /* Subtle radial background glow */
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-30%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '140%',
            height: '80%',
            background: `radial-gradient(ellipse at center, ${T.color.mint} 0%, transparent 70%)`,
            pointerEvents: 'none',
            opacity: 0.7,
          },
          /* Decorative dots grid */
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `radial-gradient(${T.color.mintDark} 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
            opacity: 0.25,
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Box textAlign="center">
            {/* Badge */}
            <Box className="anim-fade-in delay-1">
              <Chip
                icon={<Shield sx={{ fontSize: 16 }} />}
                label={t.hero.badge}
                variant="outlined"
                sx={{
                  ...sectionLabelSx,
                  py: 0.3,
                  px: 0.5,
                }}
              />
            </Box>

            {/* Title */}
            <Typography
              component="h1"
              className="anim-fade-up delay-2"
              sx={{
                fontFamily: T.font.display,
                fontSize: { xs: '2.6rem', sm: '3.4rem', md: '4.2rem' },
                fontWeight: 700,
                lineHeight: 1.12,
                color: T.color.ink,
                letterSpacing: '-0.025em',
                mb: 3,
              }}
            >
              {t.hero.title}
              <Box
                component="span"
                sx={{
                  color: T.color.forest,
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    bottom: '0.06em',
                    width: '100%',
                    height: '0.12em',
                    bgcolor: T.color.accentLight,
                    borderRadius: '4px',
                    zIndex: -1,
                  },
                }}
              >
                {t.hero.titleHighlight}
              </Box>
              {' '}Reporting
            </Typography>

            {/* Subtitle */}
            <Typography
              className="anim-fade-up delay-3"
              sx={{
                fontFamily: T.font.body,
                fontSize: { xs: '1.05rem', md: '1.2rem' },
                color: T.color.muted,
                lineHeight: 1.7,
                maxWidth: 620,
                mx: 'auto',
                mb: 5,
              }}
            >
              {t.hero.subtitle}
            </Typography>

            {/* CTA Buttons */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="center"
              className="anim-fade-up delay-4"
            >
              <Button
                variant="contained"
                size="large"
                disableElevation
                endIcon={<East />}
                onClick={handleOpenDemoDialog}
                sx={{
                  fontFamily: T.font.body,
                  fontWeight: 600,
                  fontSize: '1rem',
                  textTransform: 'none',
                  bgcolor: T.color.forest,
                  color: '#fff',
                  borderRadius: T.radius.pill,
                  px: 4,
                  py: 1.6,
                  boxShadow: `0 8px 24px -4px rgba(11,79,62,0.35)`,
                  transition: 'all 0.3s cubic-bezier(.22,1,.36,1)',
                  '&:hover': {
                    bgcolor: T.color.ctaHover,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 12px 32px -4px rgba(11,79,62,0.4)`,
                  },
                }}
              >
                {t.hero.scheduleDemo}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/cbam-guide')}
                sx={{
                  fontFamily: T.font.body,
                  fontWeight: 600,
                  fontSize: '1rem',
                  textTransform: 'none',
                  color: T.color.forest,
                  borderColor: T.color.line,
                  borderRadius: T.radius.pill,
                  px: 4,
                  py: 1.6,
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    borderColor: T.color.forest,
                    bgcolor: T.color.mint,
                  },
                }}
              >
                {t.hero.learnMore}
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* ── Features Section ── */}
      <Box
        id="features"
        sx={{
          py: { xs: 10, md: 14 },
          bgcolor: T.color.warmWhite,
          position: 'relative',
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center" mb={{ xs: 6, md: 8 }}>
            <Chip label="FEATURES" variant="outlined" sx={sectionLabelSx} />
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontFamily: T.font.display,
                fontWeight: 700,
                fontSize: { xs: '2rem', md: '2.6rem' },
                color: T.color.ink,
                letterSpacing: '-0.02em',
                mb: 2,
              }}
            >
              {t.features.title}
            </Typography>
            <Typography
              sx={{
                fontFamily: T.font.body,
                fontSize: '1.1rem',
                color: T.color.muted,
                maxWidth: 560,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              {t.features.subtitle}
            </Typography>
          </Box>

          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 4 }}>
              <FeatureCard
                icon={<Calculate />}
                title={t.features.cards.calculate.title}
                description={t.features.cards.calculate.description}
                index={0}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FeatureCard
                icon={<Description />}
                title={t.features.cards.reports.title}
                description={t.features.cards.reports.description}
                index={1}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FeatureCard
                icon={<Send />}
                title={t.features.cards.sharing.title}
                description={t.features.cards.sharing.description}
                index={2}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── How It Works ── */}
      <Box
        id="how-it-works"
        sx={{
          py: { xs: 10, md: 14 },
          bgcolor: T.color.cream,
          position: 'relative',
          /* Subtle diagonal line texture */
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 40px,
              ${T.color.lineFaint} 40px,
              ${T.color.lineFaint} 41px
            )`,
            opacity: 0.4,
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box textAlign="center" mb={{ xs: 6, md: 8 }}>
            <Chip label="PROCESS" variant="outlined" sx={sectionLabelSx} />
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontFamily: T.font.display,
                fontWeight: 700,
                fontSize: { xs: '2rem', md: '2.6rem' },
                color: T.color.ink,
                letterSpacing: '-0.02em',
                mb: 2,
              }}
            >
              {t.howItWorks.title}
            </Typography>
            <Typography
              sx={{
                fontFamily: T.font.body,
                fontSize: '1.1rem',
                color: T.color.muted,
              }}
            >
              {t.howItWorks.subtitle}
            </Typography>
          </Box>

          <Grid container spacing={4} alignItems="stretch">
            {[
              {
                n: 1,
                title: t.howItWorks.steps.input.title,
                desc: t.howItWorks.steps.input.description,
              },
              {
                n: 2,
                title: t.howItWorks.steps.calculate.title,
                desc: t.howItWorks.steps.calculate.description,
              },
              {
                n: 3,
                title: t.howItWorks.steps.share.title,
                desc: t.howItWorks.steps.share.description,
              },
            ].map((step, i) => (
              <Grid key={step.n} size={{ xs: 12, md: 4 }}>
                <StepCard
                  number={step.n}
                  title={step.title}
                  description={step.desc}
                  index={i}
                />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Benefits Section ── */}
      <Box
        sx={{
          py: { xs: 10, md: 14 },
          bgcolor: T.color.warmWhite,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 6, md: 10 }} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Chip
                label="WHY PANONIA"
                variant="outlined"
                sx={sectionLabelSx}
              />
              <Typography
                variant="h2"
                component="h2"
                sx={{
                  fontFamily: T.font.display,
                  fontWeight: 700,
                  fontSize: { xs: '2rem', md: '2.5rem' },
                  color: T.color.ink,
                  letterSpacing: '-0.02em',
                  mb: 4,
                }}
              >
                {t.benefits.title}
              </Typography>
              <Stack spacing={1}>
                <BenefitRow
                  icon={<VerifiedUser />}
                  title={t.benefits.items.compliant.title}
                  description={t.benefits.items.compliant.description}
                  index={0}
                />
                <BenefitRow
                  icon={<Speed />}
                  title={t.benefits.items.saveTime.title}
                  description={t.benefits.items.saveTime.description}
                  index={1}
                />
                <BenefitRow
                  icon={<TrendingUp />}
                  title={t.benefits.items.reduceErrors.title}
                  description={t.benefits.items.reduceErrors.description}
                  index={2}
                />
                <BenefitRow
                  icon={<Handshake />}
                  title={t.benefits.items.buildTrust.title}
                  description={t.benefits.items.buildTrust.description}
                  index={3}
                />
              </Stack>
            </Grid>

            {/* Stats card */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box className="anim-scale-in delay-3" sx={{ opacity: 0 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 4, md: 6 },
                    borderRadius: T.radius.xl,
                    border: `1px solid ${T.color.line}`,
                    bgcolor: T.color.warmWhite,
                    position: 'relative',
                    overflow: 'hidden',
                    /* Gradient accent corner */
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: -60,
                      right: -60,
                      width: 200,
                      height: 200,
                      borderRadius: '50%',
                      background: `radial-gradient(circle, ${T.color.mint} 0%, transparent 70%)`,
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: -40,
                      left: -40,
                      width: 160,
                      height: 160,
                      borderRadius: '50%',
                      background: `radial-gradient(circle, ${T.color.accentLight} 0%, transparent 70%)`,
                    },
                  }}
                >
                  <Box textAlign="center" position="relative" zIndex={1}>
                    <Typography
                      sx={{
                        fontFamily: T.font.display,
                        fontSize: { xs: '3rem', md: '3.8rem' },
                        fontWeight: 700,
                        color: T.color.forest,
                        lineHeight: 1,
                        mb: 1,
                      }}
                    >
                      2,500+
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: T.font.body,
                        color: T.color.muted,
                        fontSize: '1rem',
                        mb: 5,
                      }}
                    >
                      {t.benefits.stats.companies}
                    </Typography>

                    <Divider
                      sx={{
                        borderColor: T.color.lineFaint,
                        my: 0,
                        maxWidth: 200,
                        mx: 'auto',
                      }}
                    />

                    <Typography
                      sx={{
                        fontFamily: T.font.display,
                        fontSize: { xs: '3rem', md: '3.8rem' },
                        fontWeight: 700,
                        color: T.color.accent,
                        lineHeight: 1,
                        mt: 5,
                        mb: 1,
                      }}
                    >
                      99.8%
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: T.font.body,
                        color: T.color.muted,
                        fontSize: '1rem',
                      }}
                    >
                      {t.benefits.stats.accuracy}
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── CTA Section ── */}
      <Box
        sx={{
          py: { xs: 10, md: 14 },
          position: 'relative',
          overflow: 'hidden',
          bgcolor: T.color.forest,
          /* Animated gradient overlay */
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg, ${T.color.forest} 0%, #0E6B52 30%, ${T.color.forest} 60%, #0A3F32 100%)`,
            backgroundSize: '200% 200%',
            animation: 'gradientShift 8s ease infinite',
          },
          /* Dot grid on dark */
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
          },
        }}
      >
        <Container
          maxWidth="md"
          sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}
        >
          <Typography
            variant="h2"
            component="h2"
            sx={{
              fontFamily: T.font.display,
              fontWeight: 700,
              fontSize: { xs: '2rem', md: '2.8rem' },
              color: '#fff',
              letterSpacing: '-0.02em',
              mb: 2,
            }}
          >
            {t.cta.title}
          </Typography>
          <Typography
            sx={{
              fontFamily: T.font.body,
              fontSize: '1.1rem',
              color: 'rgba(255,255,255,0.65)',
              mb: 5,
              maxWidth: 520,
              mx: 'auto',
              lineHeight: 1.65,
            }}
          >
            {t.cta.subtitle}
          </Typography>
          <Button
            variant="contained"
            size="large"
            disableElevation
            endIcon={<East />}
            onClick={handleOpenDemoDialog}
            sx={{
              fontFamily: T.font.body,
              fontWeight: 600,
              fontSize: '1rem',
              textTransform: 'none',
              bgcolor: '#fff',
              color: T.color.forest,
              borderRadius: T.radius.pill,
              px: 5,
              py: 1.7,
              transition: 'all 0.3s cubic-bezier(.22,1,.36,1)',
              '&:hover': {
                bgcolor: T.color.accentLight,
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 32px -8px rgba(0,0,0,0.25)',
              },
            }}
          >
            {t.cta.button}
          </Button>
        </Container>
      </Box>

      {/* ── Footer ── */}
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

      {/* ── Schedule Demo Dialog ── */}
      <Dialog
        open={demoDialogOpen}
        onClose={handleCloseDemoDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: T.radius.lg,
            overflow: 'hidden',
          },
        }}
      >
        {/* Accent bar at top */}
        <Box
          sx={{
            height: 4,
            background: `linear-gradient(90deg, ${T.color.forest}, ${T.color.sage}, ${T.color.accent})`,
          }}
        />
        <DialogTitle
          sx={{
            fontFamily: T.font.display,
            fontWeight: 700,
            fontSize: '1.4rem',
            color: T.color.ink,
            pt: 3,
          }}
        >
          Schedule a Demo
        </DialogTitle>
        <form onSubmit={handleDemoSubmit}>
          <DialogContent>
            {demoError && (
              <Alert
                severity="error"
                sx={{ mb: 2, borderRadius: T.radius.sm }}
                onClose={() => setDemoError(null)}
              >
                {demoError}
              </Alert>
            )}
            {demoSuccess ? (
              <Alert
                severity="success"
                sx={{ borderRadius: T.radius.sm }}
                icon={<CheckCircle />}
              >
                Thank you! We&apos;ll be in touch soon.
              </Alert>
            ) : (
              <Stack spacing={2.5} sx={{ pt: 1 }}>
                <TextField
                  required
                  label="Name"
                  value={demoName}
                  onChange={(e) => setDemoName(e.target.value)}
                  fullWidth
                  autoFocus
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: T.radius.sm,
                      fontFamily: T.font.body,
                    },
                    '& .MuiInputLabel-root': {
                      fontFamily: T.font.body,
                    },
                  }}
                />
                <TextField
                  required
                  label="Email"
                  type="email"
                  value={demoEmail}
                  onChange={(e) => setDemoEmail(e.target.value)}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: T.radius.sm,
                      fontFamily: T.font.body,
                    },
                    '& .MuiInputLabel-root': {
                      fontFamily: T.font.body,
                    },
                  }}
                />
                <TextField
                  label="Company"
                  value={demoCompany}
                  onChange={(e) => setDemoCompany(e.target.value)}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: T.radius.sm,
                      fontFamily: T.font.body,
                    },
                    '& .MuiInputLabel-root': {
                      fontFamily: T.font.body,
                    },
                  }}
                />
                <TextField
                  label="Message"
                  value={demoMessage}
                  onChange={(e) => setDemoMessage(e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: T.radius.sm,
                      fontFamily: T.font.body,
                    },
                    '& .MuiInputLabel-root': {
                      fontFamily: T.font.body,
                    },
                  }}
                />
              </Stack>
            )}
          </DialogContent>
          {!demoSuccess && (
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button
                onClick={handleCloseDemoDialog}
                disabled={demoLoading}
                sx={{
                  fontFamily: T.font.body,
                  textTransform: 'none',
                  borderRadius: T.radius.pill,
                  px: 3,
                  color: T.color.muted,
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disableElevation
                disabled={demoLoading}
                sx={{
                  fontFamily: T.font.body,
                  fontWeight: 600,
                  textTransform: 'none',
                  bgcolor: T.color.forest,
                  borderRadius: T.radius.pill,
                  px: 4,
                  '&:hover': { bgcolor: T.color.ctaHover },
                }}
              >
                {demoLoading ? (
                  <CircularProgress size={22} sx={{ color: '#fff' }} />
                ) : (
                  'Submit'
                )}
              </Button>
            </DialogActions>
          )}
        </form>
      </Dialog>
    </Box>
  );
};

/* ─── App Router ─── */

const App: React.FC = () => {
  const navigate = useNavigate();

  const handleBackToHome = () => navigate('/');
  const handleLoginSuccess = () => navigate('/dashboard');
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <>
      <ScrollToTopOnRouteChange />
      <Routes>
        <Route path="/" element={<CBAMLandingPage />} />
        <Route path="/features" element={<Features />} />
        <Route path="/cbam-guide" element={<CBAMGuide />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/support" element={<Support />} />
        <Route path="/admin" element={<Admin />} />
        <Route
          path="/login"
          element={
            <Login onBack={handleBackToHome} onLoginSuccess={handleLoginSuccess} />
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard onLogout={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route path="calculations" element={<CalculationsList />} />
          <Route path="reports" element={<ReportsList />} />
          <Route path="settings" element={<Settings />} />
          <Route path="generate-report" element={<GenerateReport />} />
          <Route path="new-calculation" element={<NewCalculation />} />
          <Route
            path="new-calculation/:calculationId"
            element={<NewCalculation />}
          />
        </Route>
      </Routes>
    </>
  );
};

const ScrollToTopOnRouteChange: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
};

export default App;