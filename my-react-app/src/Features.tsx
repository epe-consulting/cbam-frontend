import { useState, useEffect, useRef } from "react";
import type { RefObject, SVGProps } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Stack,
} from "@mui/material";
import { KeyboardArrowDown, Shield } from "@mui/icons-material";
import UnifiedFooter from "./components/UnifiedFooter";

/* ─── Design tokens (Panonia) ─── */
type Lang = "en" | "ju" | "tr";

const T = {
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
  },
  color: {
    forest: "#0B4F3E",
    forestLight: "#14785E",
    sage: "#3A7D6A",
    mint: "#E8F5EF",
    mintDark: "#C3E6D5",
    cream: "#FAFAF7",
    warmWhite: "#FFFEF9",
    ink: "#1A2B25",
    inkSoft: "#3D5A50",
    muted: "#6B8F82",
    accent: "#D4A853",
    accentLight: "#F4E8C9",
    line: "#D6E5DD",
    lineFaint: "#EAF0EC",
    ctaHover: "#0A3F32",
    blue: "#2563EB",
    blueLight: "#EBF2FF",
  },
  radius: { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 },
};

/* ─── Feature data (localized) ─── */
const featureSets: Record<Lang, FeatureItem[]> = {
  en: [
  {
    tag: "Calculations",
    title: "Guided Emission\u00A0Wizard",
    description:
      "Step-by-step calculation flow that walks operators through every CBAM data requirement — from fuel inputs and anode emissions to PFC methods and electricity sources. No spreadsheet gymnastics required.",
    details: [
      "Multi-pass calculation engine",
      "Cascading emission factor lookups",
      "Real-time formula previews",
      "Supports primary, secondary & mixed production",
    ],
    icon: "calc",
    accent: T.color.forest,
    accentBg: T.color.mint,
  },
  {
    tag: "Reports",
    title: "One-Click CBAM\u00A0Reports",
    description:
      "Generate regulation-ready CBAM communication reports with a single click. Every section — producer details, installations, products, emissions, verification, carbon price — is pre-filled from your calculation data.",
    details: [
      "EU-compliant report structure",
      "PDF download & cloud storage",
      "Auto-populated from calculations",
      "Reporting year tracking",
    ],
    icon: "report",
    accent: T.color.blue,
    accentBg: T.color.blueLight,
  },
  {
    tag: "Products",
    title: "Full Aluminium\u00A0Coverage",
    description:
      "Purpose-built for the aluminium value chain — unwrought aluminium (CN 7601), wire, plates, foils, profiles, tubes and fittings. Each product type follows its own tailored calculation pathway.",
    details: [
      "CN code-level product mapping",
      "Production route auto-detection",
      "Precursor tracking for products",
      "Alloying element percentages",
    ],
    icon: "product",
    accent: T.color.accent,
    accentBg: T.color.accentLight,
  },
  {
    tag: "Installations",
    title: "Multi-Site\u00A0Management",
    description:
      "Register and manage all your production installations in one place. Each site carries its own address, coordinates, UN/LOCODE and CBAM registry ID — ready for any audit trail.",
    details: [
      "Unlimited installation sites",
      "Geo-coordinates & UN/LOCODE",
      "CBAM Registry ID tracking",
      "Per-site emission breakdowns",
    ],
    icon: "site",
    accent: T.color.sage,
    accentBg: "#E2F0EB",
  },
  {
    tag: "Sharing",
    title: "Client\u00A0Communication",
    description:
      "Share completed reports directly with EU importers. Compose a message, attach the report, and send — keeping your compliance chain transparent and documented.",
    details: [
      "Direct email sharing",
      "Custom cover messages",
      "Audit-ready delivery log",
      "Multi-stakeholder access",
    ],
    icon: "share",
    accent: "#7C5CBA",
    accentBg: "#F0EBFA",
  },
  {
    tag: "Compliance",
    title: "Deadline\u00A0Intelligence",
    description:
      "Stay ahead of the EU CBAM transitional and definitive phase timelines. Dashboard insights surface upcoming deadlines, missing data, and report status at a glance.",
    details: [
      "Phase-aware timeline tracking",
      "Missing-data alerts",
      "Calculation status overview",
      "Quarterly reporting reminders",
    ],
    icon: "compliance",
    accent: T.color.forestLight,
    accentBg: "#E0F5ED",
  },
  ],
  ju: [
  {
    tag: "Izračuni",
    title: "Vođeni čarobnjak emisija",
    description:
      "Korak-po-korak tok izračuna vodi operatere kroz sve CBAM zahtjeve podataka — od unosa goriva i anoda do PFC metoda i izvora električne energije. Bez komplikovanih tabela.",
    details: [
      "Motor izračuna sa više prolaza",
      "Kaskadni lookup faktora emisije",
      "Pregled formula u realnom vremenu",
      "Podržava primarnu, sekundarnu i mješovitu proizvodnju",
    ],
    icon: "calc",
    accent: T.color.forest,
    accentBg: T.color.mint,
  },
  {
    tag: "Izvještaji",
    title: "CBAM izvještaji jednim klikom",
    description:
      "Generišite CBAM izvještaje spremne za regulativu jednim klikom. Svaki odjeljak — podaci o proizvođaču, postrojenjima, proizvodima, emisijama, verifikaciji i cijeni ugljika — popunjava se iz podataka izračuna.",
    details: [
      "EU-kompatibilna struktura izvještaja",
      "PDF preuzimanje i cloud pohrana",
      "Automatsko popunjavanje iz izračuna",
      "Praćenje izvještajne godine",
    ],
    icon: "report",
    accent: T.color.blue,
    accentBg: T.color.blueLight,
  },
  {
    tag: "Proizvodi",
    title: "Potpuna pokrivenost aluminija",
    description:
      "Namjenski napravljeno za aluminijski lanac vrijednosti — neobrađeni aluminij (CN 7601), žice, ploče, folije, profili, cijevi i fitinzi. Svaki tip proizvoda prati svoj tok izračuna.",
    details: [
      "Mapiranje proizvoda na nivou CN koda",
      "Automatsko prepoznavanje proizvodnog puta",
      "Praćenje prekursora za proizvode",
      "Procenti legirajućih elemenata",
    ],
    icon: "product",
    accent: T.color.accent,
    accentBg: T.color.accentLight,
  },
  {
    tag: "Postrojenja",
    title: "Upravljanje više lokacija",
    description:
      "Registrujte i upravljajte svim proizvodnim postrojenjima na jednom mjestu. Svaka lokacija ima svoju adresu, koordinate, UN/LOCODE i CBAM Registry ID — spremno za audit.",
    details: [
      "Neograničen broj lokacija",
      "Geo-koordinate i UN/LOCODE",
      "Praćenje CBAM Registry ID",
      "Razrada emisija po lokaciji",
    ],
    icon: "site",
    accent: T.color.sage,
    accentBg: "#E2F0EB",
  },
  {
    tag: "Dijeljenje",
    title: "Komunikacija sa klijentima",
    description:
      "Dijelite završene izvještaje direktno sa EU uvoznicima. Napišite poruku, dodajte izvještaj i pošaljite — uz transparentan i dokumentovan compliance lanac.",
    details: [
      "Direktno slanje emailom",
      "Prilagođene poruke",
      "Audit-log isporuke",
      "Pristup za više učesnika",
    ],
    icon: "share",
    accent: "#7C5CBA",
    accentBg: "#F0EBFA",
  },
  {
    tag: "Usklađenost",
    title: "Praćenje rokova",
    description:
      "Budite ispred rokova EU CBAM tranzicione i definitivne faze. Dashboard prikazuje predstojeće rokove, nedostajuće podatke i status izvještaja.",
    details: [
      "Praćenje rokova po fazama",
      "Upozorenja za nedostajuće podatke",
      "Pregled statusa izračuna",
      "Podsjetnici za kvartalne izvještaje",
    ],
    icon: "compliance",
    accent: T.color.forestLight,
    accentBg: "#E0F5ED",
  },
  ],
  tr: [
  {
    tag: "Hesaplamalar",
    title: "Yönlendirmeli emisyon sihirbazı",
    description:
      "Adım adım hesaplama akışı, operatörleri tüm CBAM veri gereksinimlerinden geçirir — yakıt girişleri ve anot emisyonlarından PFC yöntemlerine ve elektrik kaynaklarına kadar.",
    details: [
      "Çok geçişli hesaplama motoru",
      "Kademeli emisyon faktörü aramaları",
      "Gerçek zamanlı formül önizlemesi",
      "Birincil, ikincil ve karma üretim desteği",
    ],
    icon: "calc",
    accent: T.color.forest,
    accentBg: T.color.mint,
  },
  {
    tag: "Raporlar",
    title: "Tek tıkla CBAM raporları",
    description:
      "Mevzuata hazır CBAM raporlarını tek tıkla oluşturun. Üretici bilgileri, tesisler, ürünler, emisyonlar, doğrulama ve karbon fiyatı bölümleri hesaplama verilerinden otomatik doldurulur.",
    details: [
      "AB uyumlu rapor yapısı",
      "PDF indirme ve bulut depolama",
      "Hesaplamalardan otomatik doldurma",
      "Raporlama yılı takibi",
    ],
    icon: "report",
    accent: T.color.blue,
    accentBg: T.color.blueLight,
  },
  {
    tag: "Ürünler",
    title: "Tam alüminyum kapsamı",
    description:
      "Alüminyum değer zinciri için özel olarak tasarlandı — işlenmemiş alüminyum (CN 7601), tel, plaka, folyo, profil, boru ve bağlantı parçaları.",
    details: [
      "CN kod düzeyinde ürün eşleme",
      "Üretim yolunun otomatik algılanması",
      "Ürünler için prekürsör takibi",
      "Alaşım elementi yüzdeleri",
    ],
    icon: "product",
    accent: T.color.accent,
    accentBg: T.color.accentLight,
  },
  {
    tag: "Tesisler",
    title: "Çoklu tesis yönetimi",
    description:
      "Tüm üretim tesislerinizi tek yerden yönetin. Her tesis; adres, koordinat, UN/LOCODE ve CBAM Registry ID bilgileriyle denetime hazırdır.",
    details: [
      "Sınırsız tesis",
      "Geo-koordinatlar ve UN/LOCODE",
      "CBAM Registry ID takibi",
      "Tesis bazlı emisyon kırılımı",
    ],
    icon: "site",
    accent: T.color.sage,
    accentBg: "#E2F0EB",
  },
  {
    tag: "Paylaşım",
    title: "Müşteri iletişimi",
    description:
      "Tamamlanan raporları AB ithalatçılarıyla doğrudan paylaşın. Mesaj yazın, raporu ekleyin ve gönderin — şeffaf ve kayıtlı bir uyumluluk zinciriyle.",
    details: [
      "Doğrudan e-posta paylaşımı",
      "Özel mesajlar",
      "Denetim için teslimat kaydı",
      "Çok paydaşlı erişim",
    ],
    icon: "share",
    accent: "#7C5CBA",
    accentBg: "#F0EBFA",
  },
  {
    tag: "Uyumluluk",
    title: "Son tarih zekası",
    description:
      "AB CBAM geçiş ve kesin faz zaman çizelgesinde önde kalın. Panel, yaklaşan son tarihleri, eksik verileri ve rapor durumlarını gösterir.",
    details: [
      "Faz bazlı zaman çizelgesi takibi",
      "Eksik veri uyarıları",
      "Hesaplama durum görünümü",
      "Çeyreklik raporlama hatırlatmaları",
    ],
    icon: "compliance",
    accent: T.color.forestLight,
    accentBg: "#E0F5ED",
  },
  ],
};

const uiText = {
  en: {
    chip: "Features",
    nav: { overview: "Overview", highlights: "Highlights", features: "Features", login: "Login" },
    hero: {
      tag: "Platform Features",
      titleStart: "Everything you need for",
      titleHighlight: "CBAM compliance",
      subtitle: "From emission calculations to regulatory reports, Panonia gives aluminium producers a single platform to manage every aspect of EU CBAM compliance.",
      start: "Start Calculating",
      docs: "View Documentation",
    },
    stats: ["Product categories", "Calculation steps", "EU regulation coverage", "Average report time"],
    cta: {
      title: "Ready to simplify your CBAM workflow?",
      subtitle: "Join producers who've replaced spreadsheets and consultants with a purpose-built compliance platform.",
      button: "Get Started — It's Free",
      note: "No credit card required · Free during transitional phase",
    },
    footer: {
      tagline: "Making CBAM compliance simple for businesses worldwide.",
      product: "Product",
      resources: "Resources",
      company: "Company",
      items: {
        features: "Features",
        pricing: "Pricing",
        documentation: "Documentation",
        guide: "CBAM Guide",
        blog: "Blog",
        support: "Support",
        about: "About",
        privacy: "Privacy",
        contact: "Contact",
      },
      copyright: "© 2025 Panonia. All rights reserved.",
    },
  },
  ju: {
    chip: "Funkcionalnosti",
    nav: { overview: "Pregled", highlights: "Istaknuto", features: "Funkcionalnosti", login: "Prijava" },
    hero: {
      tag: "Platformske funkcionalnosti",
      titleStart: "Sve što vam treba za",
      titleHighlight: "CBAM usklađenost",
      subtitle: "Od izračuna emisija do regulatornih izvještaja, Panonia proizvođačima aluminija daje jedinstvenu platformu za upravljanje EU CBAM usklađenošću.",
      start: "Pokreni izračun",
      docs: "Pogledaj dokumentaciju",
    },
    stats: ["Kategorije proizvoda", "Koraci izračuna", "Pokrivenost EU regulative", "Prosječno vrijeme izvještaja"],
    cta: {
      title: "Spremni da pojednostavite CBAM tok?",
      subtitle: "Pridružite se proizvođačima koji su zamijenili tabele i konsultante namjenskom platformom za usklađenost.",
      button: "Počni — Besplatno je",
      note: "Bez kreditne kartice · Besplatno tokom tranzicione faze",
    },
    footer: {
      tagline: "Činimo CBAM usklađenost jednostavnom za kompanije širom svijeta.",
      product: "Proizvod",
      resources: "Resursi",
      company: "Kompanija",
      items: {
        features: "Funkcionalnosti",
        pricing: "Cijene",
        documentation: "Dokumentacija",
        guide: "CBAM Vodič",
        blog: "Blog",
        support: "Podrška",
        about: "O nama",
        privacy: "Privatnost",
        contact: "Kontakt",
      },
      copyright: "© 2025 Panonia. Sva prava pridržana.",
    },
  },
  tr: {
    chip: "Özellikler",
    nav: { overview: "Genel Bakış", highlights: "Öne Çıkanlar", features: "Özellikler", login: "Giriş" },
    hero: {
      tag: "Platform Özellikleri",
      titleStart: "İhtiyacınız olan her şey",
      titleHighlight: "CBAM uyumluluğu için",
      subtitle: "Emisyon hesaplamalarından mevzuata uygun raporlara kadar Panonia, alüminyum üreticilerine AB CBAM uyumluluğu için tek bir platform sunar.",
      start: "Hesaplamaya Başla",
      docs: "Dokümantasyonu Gör",
    },
    stats: ["Ürün kategorileri", "Hesaplama adımları", "AB mevzuat kapsamı", "Ortalama rapor süresi"],
    cta: {
      title: "CBAM sürecini sadeleştirmeye hazır mısınız?",
      subtitle: "Elektronik tabloları ve danışmanları, amaca yönelik bir uyumluluk platformuyla değiştiren üreticilere katılın.",
      button: "Başla — Ücretsiz",
      note: "Kredi kartı gerekmez · Geçiş döneminde ücretsiz",
    },
    footer: {
      tagline: "CBAM uyumluluğunu dünya genelinde işletmeler için basitleştiriyoruz.",
      product: "Ürün",
      resources: "Kaynaklar",
      company: "Şirket",
      items: {
        features: "Özellikler",
        pricing: "Fiyatlandırma",
        documentation: "Dokümantasyon",
        guide: "CBAM Rehberi",
        blog: "Blog",
        support: "Destek",
        about: "Hakkımızda",
        privacy: "Gizlilik",
        contact: "İletişim",
      },
      copyright: "© 2025 Panonia. Tüm hakları saklıdır.",
    },
  },
};

/* ─── Icon components ─── */
type FeatureIconType = "calc" | "report" | "product" | "site" | "share" | "compliance";

type FeatureItem = {
  tag: string;
  title: string;
  description: string;
  details: string[];
  icon: FeatureIconType;
  accent: string;
  accentBg: string;
};

function FeatureIcon({ type, color, size = 28 }: { type: FeatureIconType; color: string; size?: number }) {
  const props: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    fill: "none",
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (type) {
    case "calc":
      return (<svg {...props} viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="16" y2="14" /><line x1="8" y1="18" x2="16" y2="18" /></svg>);
    case "report":
      return (<svg {...props} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="12" y2="17" /></svg>);
    case "product":
      return (<svg {...props} viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>);
    case "site":
      return (<svg {...props} viewBox="0 0 24 24"><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><line x1="9" y1="9" x2="9" y2="9.01" /><line x1="9" y1="13" x2="9" y2="13.01" /><line x1="9" y1="17" x2="9" y2="17.01" /></svg>);
    case "share":
      return (<svg {...props} viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>);
    case "compliance":
      return (<svg {...props} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>);
    default:
      return null;
  }
}

/* ─── Intersection observer hook ─── */
function useInView(threshold = 0.15): [RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ─── Animated feature card ─── */
function FeatureCard({ feature, index }: { feature: FeatureItem; index: number }) {
  const [ref, visible] = useInView(0.12);
  const [hovered, setHovered] = useState(false);
  const isEven = index % 2 === 0;

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0,
        alignItems: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.7s cubic-bezier(.22,1,.36,1) ${index * 0.08}s, transform 0.7s cubic-bezier(.22,1,.36,1) ${index * 0.08}s`,
        direction: isEven ? "ltr" : "rtl",
      }}
    >
      {/* Content side */}
      <div style={{ direction: "ltr", padding: "48px 40px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 14px",
            borderRadius: T.radius.pill,
            backgroundColor: feature.accentBg,
            marginBottom: 20,
          }}
        >
          <FeatureIcon type={feature.icon} color={feature.accent} size={16} />
          <span
            style={{
              fontFamily: T.font.body,
              fontSize: "0.78rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: feature.accent,
              textTransform: "uppercase",
            }}
          >
            {feature.tag}
          </span>
        </div>

        <h3
          style={{
            fontFamily: T.font.display,
            fontSize: "1.75rem",
            fontWeight: 700,
            color: T.color.ink,
            letterSpacing: "-0.025em",
            lineHeight: 1.2,
            margin: "0 0 16px 0",
          }}
        >
          {feature.title}
        </h3>

        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "1rem",
            color: T.color.muted,
            lineHeight: 1.7,
            margin: "0 0 24px 0",
            maxWidth: 440,
          }}
        >
          {feature.description}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {feature.details.map((d: string, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div
                style={{
                  marginTop: 6,
                  width: 6,
                  height: 6,
                  borderRadius: 6,
                  backgroundColor: feature.accent,
                  flexShrink: 0,
                  opacity: 0.6,
                }}
              />
              <span
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.9rem",
                  color: T.color.inkSoft,
                  lineHeight: 1.5,
                }}
              >
                {d}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Visual side */}
      <div
        style={{
          direction: "ltr",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 32px",
          position: "relative",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 360,
            aspectRatio: "4 / 3",
            borderRadius: T.radius.lg,
            backgroundColor: feature.accentBg,
            border: `1px solid ${T.color.lineFaint}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            transform: hovered ? "scale(1.02)" : "scale(1)",
            transition: "transform 0.5s cubic-bezier(.22,1,.36,1)",
          }}
        >
          {/* Decorative grid pattern */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `radial-gradient(${feature.accent}12 1px, transparent 1px)`,
              backgroundSize: "20px 20px",
              opacity: 0.5,
            }}
          />
          {/* Decorative floating shapes */}
          <div
            style={{
              position: "absolute",
              top: "15%",
              right: "10%",
              width: 60,
              height: 60,
              borderRadius: T.radius.md,
              border: `2px solid ${feature.accent}30`,
              transform: hovered ? "rotate(12deg)" : "rotate(6deg)",
              transition: "transform 0.6s cubic-bezier(.22,1,.36,1)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "12%",
              left: "8%",
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: `${feature.accent}15`,
              transform: hovered ? "translate(4px, -4px)" : "translate(0, 0)",
              transition: "transform 0.6s cubic-bezier(.22,1,.36,1)",
            }}
          />
          {/* Central icon */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: T.radius.lg,
              backgroundColor: T.color.warmWhite,
              border: `1px solid ${T.color.lineFaint}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              zIndex: 1,
              boxShadow: "0 8px 32px rgba(11,79,62,0.08)",
              transform: hovered ? "translateY(-4px)" : "translateY(0)",
              transition: "transform 0.5s cubic-bezier(.22,1,.36,1)",
            }}
          >
            <FeatureIcon type={feature.icon} color={feature.accent} size={36} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Stat pill ─── */
function StatPill({ value, label, delay }: { value: string; label: string; delay: number }) {
  const [ref, visible] = useInView(0.2);
  return (
    <div
      ref={ref}
      style={{
        textAlign: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `all 0.6s cubic-bezier(.22,1,.36,1) ${delay}s`,
      }}
    >
      <div
        style={{
          fontFamily: T.font.display,
          fontSize: "2.8rem",
          fontWeight: 700,
          color: T.color.forest,
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: T.font.body,
          fontSize: "0.88rem",
          color: T.color.muted,
          marginTop: 8,
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ─── Main Features page ─── */
export default function Features() {
  const navigate = useNavigate();
  const [heroVisible, setHeroVisible] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [language, setLanguage] = useState<Lang>("en");

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const languageOptions = [
    { code: "en" as const, label: "English", flag: "🇬🇧" },
    { code: "ju" as const, label: "Bosanski", flag: "🇧🇦" },
    { code: "tr" as const, label: "Türkçe", flag: "🇹🇷" },
  ];
  const currentLanguage = languageOptions.find((l) => l.code === language);
  const t = uiText[language];
  const features = featureSets[language];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: T.color.cream,
        fontFamily: T.font.body,
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes floatReverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(8px) rotate(-1.5deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @media (max-width: 768px) {
          .features-grid > div { grid-template-columns: 1fr !important; direction: ltr !important; }
        }
      `}</style>

      {/* ── Navigation ── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: scrolled ? "rgba(250,250,247,0.88)" : "rgba(250,250,247,0.6)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid",
          borderColor: scrolled ? T.color.line : "transparent",
          transition: "all 0.3s ease",
        }}
      >
        <Toolbar sx={{ maxWidth: 1200, mx: "auto", width: "100%", px: { xs: 2, md: 4 } }}>
          <Box
            display="flex"
            alignItems="center"
            gap={1.2}
            sx={{ flexGrow: 1, cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "10px",
                bgcolor: T.color.forest,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield sx={{ color: "#fff", fontSize: 20 }} />
            </Box>
            <Typography
              sx={{
                fontFamily: T.font.display,
                fontWeight: 700,
                fontSize: "1.25rem",
                color: T.color.ink,
                letterSpacing: "-0.02em",
              }}
            >
              Panonia
            </Typography>
            <Chip
              label={t.chip}
              size="small"
              sx={{
                fontFamily: T.font.body,
                fontWeight: 600,
                fontSize: "0.7rem",
                letterSpacing: "0.04em",
                bgcolor: T.color.mint,
                color: T.color.forest,
                border: `1px solid ${T.color.mintDark}`,
              }}
            />
          </Box>

          <Stack direction="row" spacing={1} sx={{ display: { xs: "none", md: "flex" }, mr: 2 }}>
            {[
              { label: t.nav.overview, id: "features-hero" },
              { label: t.nav.highlights, id: "features-stats" },
              { label: t.nav.features, id: "features-list" },
            ].map((item) => (
              <Button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                sx={{
                  fontFamily: T.font.body,
                  fontWeight: 500,
                  fontSize: "0.85rem",
                  color: T.color.muted,
                  textTransform: "none",
                  borderRadius: T.radius.pill,
                  "&:hover": { bgcolor: T.color.mint, color: T.color.forest },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>

          <Box display="flex" alignItems="center" gap={1.5}>
            <Button
              onClick={(e) => setAnchorEl(e.currentTarget)}
              endIcon={<KeyboardArrowDown sx={{ fontSize: "18px !important" }} />}
              sx={{
                fontFamily: T.font.body,
                fontWeight: 500,
                fontSize: "0.85rem",
                color: T.color.muted,
                textTransform: "none",
                minWidth: "auto",
                px: 1.5,
                borderRadius: T.radius.pill,
                "&:hover": { bgcolor: T.color.mint },
              }}
            >
              {currentLanguage?.flag}
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              PaperProps={{
                sx: {
                  borderRadius: `${T.radius.md}px`,
                  border: `1px solid ${T.color.line}`,
                  boxShadow: "0 12px 32px -8px rgba(0,0,0,0.12)",
                  mt: 1,
                },
              }}
            >
              {languageOptions.map((lang) => (
                <MenuItem
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setAnchorEl(null);
                  }}
                  selected={language === lang.code}
                  sx={{
                    fontFamily: T.font.body,
                    borderRadius: "8px",
                    mx: 0.5,
                    "&.Mui-selected": { bgcolor: T.color.mint },
                  }}
                >
                  <ListItemIcon>
                    <Typography>{lang.flag}</Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={lang.label}
                    primaryTypographyProps={{
                      fontFamily: T.font.body,
                      fontWeight: language === lang.code ? 600 : 400,
                    }}
                  />
                </MenuItem>
              ))}
            </Menu>
            <Button
              variant="contained"
              disableElevation
              onClick={() => navigate("/login")}
              sx={{
                fontFamily: T.font.body,
                fontWeight: 600,
                fontSize: "0.88rem",
                textTransform: "none",
                bgcolor: T.color.forest,
                color: "#fff",
                borderRadius: T.radius.pill,
                px: 3,
                py: 0.9,
                "&:hover": { bgcolor: T.color.ctaHover },
              }}
            >
              {t.nav.login}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ─── Hero ─── */}
      <section
        id="features-hero"
        style={{
          padding: "156px 24px 80px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative background */}
        <div
          style={{
            position: "absolute",
            top: "-30%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "140%",
            height: "80%",
            background: `radial-gradient(ellipse at center, ${T.color.mint} 0%, transparent 65%)`,
            opacity: 0.45,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 60,
            right: "12%",
            width: 120,
            height: 120,
            borderRadius: T.radius.xl,
            border: `2px solid ${T.color.lineFaint}`,
            animation: "float 8s ease-in-out infinite",
            opacity: 0.4,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: "8%",
            width: 80,
            height: 80,
            borderRadius: "50%",
            backgroundColor: T.color.accentLight,
            animation: "floatReverse 10s ease-in-out infinite",
            opacity: 0.3,
          }}
        />

        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? "translateY(0)" : "translateY(30px)",
            transition: "all 0.8s cubic-bezier(.22,1,.36,1)",
          }}
        >
          {/* Tag */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: T.radius.pill,
              backgroundColor: T.color.mint,
              border: `1px solid ${T.color.mintDark}`,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: 7,
                backgroundColor: T.color.forest,
              }}
            />
            <span
              style={{
                fontFamily: T.font.body,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: T.color.forest,
                letterSpacing: "0.02em",
              }}
            >
              {t.hero.tag}
            </span>
          </div>

          <h1
            style={{
              fontFamily: T.font.display,
              fontSize: "clamp(2.2rem, 5vw, 3.4rem)",
              fontWeight: 700,
              color: T.color.ink,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              marginBottom: 20,
            }}
          >
            {t.hero.titleStart}{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${T.color.forest}, ${T.color.sage})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {t.hero.titleHighlight}
            </span>
          </h1>

          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "1.15rem",
              color: T.color.muted,
              lineHeight: 1.7,
              maxWidth: 560,
              margin: "0 auto 40px",
            }}
          >
            {t.hero.subtitle}
          </p>

          {/* CTA */}
          <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
            <button
              style={{
                fontFamily: T.font.body,
                fontSize: "0.95rem",
                fontWeight: 600,
                padding: "14px 32px",
                borderRadius: T.radius.pill,
                border: "none",
                backgroundColor: T.color.forest,
                color: "#fff",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = T.color.ctaHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = T.color.forest)}
              onClick={() => navigate("/dashboard/new-calculation")}
            >
              {t.hero.start}
            </button>
            <button
              style={{
                fontFamily: T.font.body,
                fontSize: "0.95rem",
                fontWeight: 600,
                padding: "14px 32px",
                borderRadius: T.radius.pill,
                border: `1px solid ${T.color.line}`,
                backgroundColor: "transparent",
                color: T.color.inkSoft,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = T.color.mint;
                e.currentTarget.style.borderColor = T.color.mintDark;
                e.currentTarget.style.color = T.color.forest;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = T.color.line;
                e.currentTarget.style.color = T.color.inkSoft;
              }}
              onClick={() => navigate("/cbam-guide")}
            >
              {t.hero.docs}
            </button>
          </div>
        </div>
      </section>

      {/* ─── Stats bar ─── */}
      <section
        id="features-stats"
        style={{
          maxWidth: 900,
          margin: "0 auto 80px",
          padding: "36px 40px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 32,
          backgroundColor: T.color.warmWhite,
          borderRadius: T.radius.lg,
          border: `1px solid ${T.color.lineFaint}`,
        }}
      >
        <StatPill value="6" label={t.stats[0]} delay={0} />
        <StatPill value="12+" label={t.stats[1]} delay={0.1} />
        <StatPill value="100%" label={t.stats[2]} delay={0.2} />
        <StatPill value="<5min" label={t.stats[3]} delay={0.3} />
      </section>

      {/* ─── Feature cards ─── */}
      <section
        id="features-list"
        className="features-grid"
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "0 24px 100px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {features.map((f, i) => (
          <div
            key={f.tag}
            style={{
              backgroundColor: i % 2 === 0 ? T.color.warmWhite : "transparent",
              borderRadius: T.radius.lg,
              border: i % 2 === 0 ? `1px solid ${T.color.lineFaint}` : "1px solid transparent",
              overflow: "hidden",
            }}
          >
            <FeatureCard feature={f} index={i} />
          </div>
        ))}
      </section>

      {/* ─── Bottom CTA ─── */}
      <section
        id="features-cta"
        style={{
          padding: "80px 24px 100px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: "-20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "120%",
            height: "70%",
            background: `radial-gradient(ellipse at center, ${T.color.mint} 0%, transparent 65%)`,
            opacity: 0.35,
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: T.font.display,
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              fontWeight: 700,
              color: T.color.ink,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              marginBottom: 16,
            }}
          >
            {t.cta.title}
          </h2>
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "1.05rem",
              color: T.color.muted,
              lineHeight: 1.7,
              marginBottom: 32,
            }}
          >
            {t.cta.subtitle}
          </p>
          <button
            style={{
              fontFamily: T.font.body,
              fontSize: "1rem",
              fontWeight: 600,
              padding: "16px 40px",
              borderRadius: T.radius.pill,
              border: "none",
              backgroundColor: T.color.forest,
              color: "#fff",
              cursor: "pointer",
              transition: "background 0.2s ease",
              boxShadow: `0 4px 24px ${T.color.forest}30`,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = T.color.ctaHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = T.color.forest)}
            onClick={() => navigate("/login")}
          >
            {t.cta.button}
          </button>
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.82rem",
              color: T.color.muted,
              marginTop: 14,
              opacity: 0.7,
            }}
          >
            {t.cta.note}
          </p>
        </div>
      </section>

      <UnifiedFooter
        labels={{
          tagline: t.footer.tagline,
          productTitle: t.footer.product,
          productFeatures: t.footer.items.features,
          productPricing: t.footer.items.pricing,
          resourcesTitle: t.footer.resources,
          resourcesGuide: t.footer.items.guide,
          resourcesSupport: t.footer.items.support,
          companyTitle: t.footer.company,
          companyAbout: t.footer.items.about,
          companyContact: t.footer.items.contact,
          companyPrivacy: t.footer.items.privacy,
          copyright: t.footer.copyright,
        }}
      />
    </div>
  );
}