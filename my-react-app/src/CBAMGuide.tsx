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
  Card,
  CardContent,
  Paper,
  Chip,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Public,
  Factory,
  Gavel,
  CalendarMonth,
  CheckCircle,
  ExpandMore,
  Info,
  AccountBalance,
  LocalShipping,
  BarChart,
  Warning,
  TipsAndUpdates,
  MenuBook,
  KeyboardArrowDown,
  Shield,
  East,
} from '@mui/icons-material';
import UnifiedFooter from './components/UnifiedFooter';

type Lang = 'en' | 'ju' | 'tr';

const translations: Record<Lang, {
  nav: { back: string; badge: string; login: string };
  hero: { badge: string; titleBefore: string; titleHighlight: string; subtitle: string };
  whatIs: {
    chipLabel: string;
    title: string;
    p1: string;
    p2: string;
    pillars: { title: string; desc: string }[];
  };
  sectors: {
    chipLabel: string;
    title: string;
    subtitle: string;
    items: { name: string }[];
  };
  howItWorks: {
    chipLabel: string;
    title: string;
    subtitle: string;
    steps: { title: string; desc: string }[];
  };
  emissions: {
    chipLabel: string;
    title: string;
    direct: { title: string; desc: string; items: string[] };
    indirect: { title: string; desc: string; items: string[] };
  };
  timeline: {
    chipLabel: string;
    title: string;
    subtitle: string;
    items: { date: string; title: string; desc: string }[];
  };
  obligations: {
    chipLabel: string;
    title: string;
    subtitle: string;
    items: { title: string; desc: string }[];
  };
  faq: {
    title: string;
    subtitle: string;
    items: { question: string; answer: string }[];
  };
  cta: { title: string; subtitle: string; startBtn: string; homeBtn: string };
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
    nav: { back: 'Back', badge: 'CBAM Guide', login: 'Login' },
    hero: {
      badge: 'Complete Guide',
      titleBefore: 'Understanding the EU ',
      titleHighlight: 'Carbon Border Adjustment Mechanism',
      subtitle: 'Everything you need to know about CBAM — what it is, who it affects, key timelines, and how to achieve compliance.',
    },
    whatIs: {
      chipLabel: 'Overview',
      title: 'What is CBAM?',
      p1: 'The <strong>Carbon Border Adjustment Mechanism (CBAM)</strong> is a landmark EU regulation designed to put a fair price on carbon emissions embedded in imported goods. It ensures that the carbon price of imports is equivalent to the carbon price of domestic production, preventing "carbon leakage" — where companies move production to countries with less strict climate policies.',
      p2: 'CBAM is a key pillar of the EU\'s <strong>"Fit for 55"</strong> package, aiming to reduce greenhouse gas emissions by at least 55% by 2030 compared to 1990 levels. It works alongside the EU Emissions Trading System (EU ETS) by extending carbon pricing to imported goods.',
      pillars: [
        { title: 'Prevents Carbon Leakage', desc: "Ensures companies can't avoid carbon costs by relocating production outside the EU." },
        { title: 'Level Playing Field', desc: 'EU and non-EU producers face equivalent carbon pricing for fair competition.' },
        { title: 'Encourages Decarbonisation', desc: 'Incentivises non-EU producers to adopt cleaner production technologies.' },
      ],
    },
    sectors: {
      chipLabel: 'Scope',
      title: 'Covered Sectors',
      subtitle: 'CBAM applies to imports in six carbon-intensive sectors. These sectors were chosen because they carry the highest risk of carbon leakage.',
      items: [
        { name: 'Iron & Steel' },
        { name: 'Aluminium' },
        { name: 'Cement' },
        { name: 'Fertilisers' },
        { name: 'Electricity' },
        { name: 'Hydrogen' },
      ],
    },
    howItWorks: {
      chipLabel: 'Mechanism',
      title: 'How CBAM Works',
      subtitle: 'The mechanism operates through a system of reporting and certificates.',
      steps: [
        { title: 'Report Emissions', desc: 'EU importers must report the embedded emissions of their imported goods. Non-EU producers provide the necessary emissions data for each installation and product.' },
        { title: 'Purchase Certificates', desc: 'Starting in 2026, authorised CBAM declarants must purchase CBAM certificates at a price linked to the EU ETS carbon price. Each certificate covers one tonne of CO₂-equivalent emissions.' },
        { title: 'Surrender Certificates', desc: 'By May 31 each year, declarants must surrender CBAM certificates corresponding to the embedded emissions of their imports from the previous year, after deducting any carbon price already paid abroad.' },
      ],
    },
    emissions: {
      chipLabel: 'Key Concepts',
      title: 'Understanding Emissions Under CBAM',
      direct: {
        title: 'Direct Emissions',
        desc: 'Emissions that are released directly from the production process of the good, including:',
        items: ['Combustion of fuels for heat and energy', 'Process emissions from chemical reactions', 'Emissions from raw material decomposition'],
      },
      indirect: {
        title: 'Indirect Emissions',
        desc: 'Emissions from the generation of electricity consumed during the production process. Relevant for:',
        items: ['Electricity used in production facilities', 'Applicable to all CBAM sectors', 'Calculated using grid emission factors or supplier-specific data'],
      },
    },
    timeline: {
      chipLabel: 'Timeline',
      title: 'Key Dates & Milestones',
      subtitle: 'CBAM is being implemented in phases to allow businesses time to adapt.',
      items: [
        { date: 'October 2023', title: 'Transitional Phase Begins', desc: 'EU importers must start reporting embedded emissions of CBAM goods on a quarterly basis. No financial payments are required during this phase.' },
        { date: 'January 2025', title: 'Stricter Reporting Rules', desc: 'Default values can no longer be used for most products. Importers must report actual emissions data from installations.' },
        { date: 'January 2026', title: 'Definitive Phase Starts', desc: 'CBAM certificates must be purchased and surrendered. Financial obligations begin and the EU ETS free allocation phase-out starts.' },
        { date: '2026 – 2034', title: 'Gradual Phase-In', desc: 'CBAM financial obligations increase progressively as EU ETS free allowances are phased out, reaching full implementation by 2034.' },
      ],
    },
    obligations: {
      chipLabel: 'Your Obligations',
      title: 'What Non-EU Producers Must Do',
      subtitle: 'While the legal CBAM obligations fall on EU importers, non-EU producers play a critical role by providing the emissions data their EU clients need.',
      items: [
        { title: 'Calculate Embedded Emissions', desc: 'Determine direct and indirect emissions for each product at each installation.' },
        { title: 'Provide Verified Data', desc: 'Supply accurate emissions data using approved CBAM methodologies and templates.' },
        { title: 'Report Carbon Prices Paid', desc: 'Document any carbon tax or ETS costs paid in the country of origin.' },
        { title: 'Share Data with EU Clients', desc: 'Transmit emissions reports to your EU importing partners in a timely manner.' },
      ],
    },
    faq: {
      title: 'Frequently Asked Questions',
      subtitle: 'Common questions about CBAM and compliance.',
      items: [
        { question: 'Who is affected by CBAM?', answer: 'CBAM primarily affects EU importers of goods in covered sectors (iron & steel, aluminium, cement, fertilisers, electricity, and hydrogen). However, non-EU producers and exporters are also indirectly affected, as they must provide emissions data to their EU clients.' },
        { question: 'What are embedded emissions?', answer: 'Embedded emissions are the greenhouse gas emissions released during the production of a good. CBAM considers both direct emissions (from the production process itself) and, in some cases, indirect emissions (from electricity consumed during production).' },
        { question: 'How is the CBAM price calculated?', answer: 'The CBAM certificate price mirrors the EU Emissions Trading System (EU ETS) carbon price, calculated as the weekly average auction price of EU ETS allowances. This ensures a level playing field between EU and non-EU producers.' },
        { question: 'What happens if a carbon price is already paid in the country of origin?', answer: 'If an explicit carbon price has been paid in the country of origin, the CBAM obligation can be reduced accordingly. Importers can claim a reduction in CBAM certificates based on the carbon price effectively paid abroad.' },
        { question: 'What data do non-EU producers need to provide?', answer: 'Non-EU producers need to provide data on direct emissions from production processes, electricity consumption and its emission factor, production quantities, and details about any carbon price paid in the country of origin.' },
        { question: 'What are the penalties for non-compliance?', answer: 'During the transitional period, non-compliance with reporting obligations can result in penalties ranging from €10 to €50 per tonne of unreported emissions. In the definitive phase, penalties will be aligned with those under the EU ETS.' },
      ],
    },
    cta: {
      title: 'Ready to Get Started?',
      subtitle: 'Panonia makes CBAM compliance simple. Calculate your emissions, generate compliant reports, and share them with your EU clients — all in one platform.',
      startBtn: 'Start Calculating',
      homeBtn: 'Back to Home',
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
    nav: { back: 'Nazad', badge: 'CBAM Vodič', login: 'Prijava' },
    hero: {
      badge: 'Kompletan Vodič',
      titleBefore: 'Razumijevanje EU ',
      titleHighlight: 'Mehanizma za Prilagodbu Ugljika na Granicama',
      subtitle: 'Sve što trebate znati o CBAM-u — što je to, na koga utječe, ključni rokovi i kako postići usklađenost.',
    },
    whatIs: {
      chipLabel: 'Pregled',
      title: 'Što je CBAM?',
      p1: '<strong>Mehanizam za prilagodbu ugljika na granicama (CBAM)</strong> je značajna EU regulativa osmišljena da postavi pravednu cijenu na emisije ugljika ugrađene u uvezenu robu. Osigurava da je cijena ugljika za uvoz ekvivalentna cijeni ugljika domaće proizvodnje, sprečavajući "curenje ugljika" — kada kompanije premještaju proizvodnju u zemlje s manje strogim klimatskim politikama.',
      p2: 'CBAM je ključni stup EU paketa <strong>"Fit for 55"</strong>, koji ima za cilj smanjiti emisije stakleničkih plinova za najmanje 55% do 2030. u odnosu na razine iz 1990. Djeluje zajedno s EU Sustavom za Trgovanje Emisijama (EU ETS) proširujući cijene ugljika na uvezenu robu.',
      pillars: [
        { title: 'Sprečava Curenje Ugljika', desc: 'Osigurava da kompanije ne mogu izbjeći troškove ugljika premještanjem proizvodnje izvan EU.' },
        { title: 'Jednaki Uvjeti', desc: 'EU i ne-EU proizvođači suočavaju se s ekvivalentnim cijenama ugljika za pravednu konkurenciju.' },
        { title: 'Poticanje Dekarbonizacije', desc: 'Potiče ne-EU proizvođače da usvoje čistije proizvodne tehnologije.' },
      ],
    },
    sectors: {
      chipLabel: 'Opseg',
      title: 'Pokriveni Sektori',
      subtitle: 'CBAM se primjenjuje na uvoz u šest ugljično intenzivnih sektora. Ovi sektori su odabrani jer nose najveći rizik od curenja ugljika.',
      items: [
        { name: 'Željezo i Čelik' },
        { name: 'Aluminij' },
        { name: 'Cement' },
        { name: 'Gnojiva' },
        { name: 'Električna Energija' },
        { name: 'Vodik' },
      ],
    },
    howItWorks: {
      chipLabel: 'Mehanizam',
      title: 'Kako CBAM Funkcionira',
      subtitle: 'Mehanizam djeluje kroz sustav izvješćivanja i certifikata.',
      steps: [
        { title: 'Prijavite Emisije', desc: 'EU uvoznici moraju prijaviti ugrađene emisije uvezene robe. Ne-EU proizvođači pružaju potrebne podatke o emisijama za svaku instalaciju i proizvod.' },
        { title: 'Kupite Certifikate', desc: 'Od 2026. ovlašteni CBAM deklaranti moraju kupiti CBAM certifikate po cijeni vezanoj za EU ETS cijenu ugljika. Svaki certifikat pokriva jednu tonu ekvivalenta CO₂ emisija.' },
        { title: 'Predajte Certifikate', desc: 'Do 31. maja svake godine, deklaranti moraju predati CBAM certifikate koji odgovaraju ugrađenim emisijama njihovog uvoza iz prethodne godine, nakon odbitka bilo koje cijene ugljika već plaćene u inozemstvu.' },
      ],
    },
    emissions: {
      chipLabel: 'Ključni Pojmovi',
      title: 'Razumijevanje Emisija pod CBAM-om',
      direct: {
        title: 'Direktne Emisije',
        desc: 'Emisije koje se ispuštaju direktno iz procesa proizvodnje robe, uključujući:',
        items: ['Sagorijevanje goriva za toplinu i energiju', 'Procesne emisije iz kemijskih reakcija', 'Emisije iz razlaganja sirovina'],
      },
      indirect: {
        title: 'Indirektne Emisije',
        desc: 'Emisije od proizvodnje električne energije potrošene tijekom procesa proizvodnje. Relevantno za:',
        items: ['Električna energija korištena u proizvodnim pogonima', 'Primjenjivo na sve CBAM sektore', 'Izračunato pomoću mrežnih faktora emisija ili podataka specifičnih za dobavljača'],
      },
    },
    timeline: {
      chipLabel: 'Vremenski Okvir',
      title: 'Ključni Datumi i Prekretnice',
      subtitle: 'CBAM se provodi u fazama kako bi se poduzećima dalo vrijeme za prilagodbu.',
      items: [
        { date: 'Oktobar 2023.', title: 'Početak Prijelazne Faze', desc: 'EU uvoznici moraju početi izvještavati o ugrađenim emisijama CBAM robe na kvartalnoj osnovi. Tijekom ove faze nisu potrebna financijska plaćanja.' },
        { date: 'Januar 2025.', title: 'Stroža Pravila Izvješćivanja', desc: 'Zadane vrijednosti se više ne mogu koristiti za većinu proizvoda. Uvoznici moraju prijaviti stvarne podatke o emisijama iz instalacija.' },
        { date: 'Januar 2026.', title: 'Početak Konačne Faze', desc: 'CBAM certifikati se moraju kupiti i predati. Počinju financijske obaveze i postupno ukidanje besplatnih alokacija EU ETS-a.' },
        { date: '2026. – 2034.', title: 'Postupno Uvođenje', desc: 'Financijske obaveze CBAM-a postupno rastu kako se besplatne dozvole EU ETS-a ukidaju, dosežući punu primjenu do 2034.' },
      ],
    },
    obligations: {
      chipLabel: 'Vaše Obaveze',
      title: 'Što Ne-EU Proizvođači Moraju Učiniti',
      subtitle: 'Iako zakonske obaveze CBAM-a padaju na EU uvoznike, ne-EU proizvođači igraju ključnu ulogu pružajući podatke o emisijama koje njihovi EU klijenti trebaju.',
      items: [
        { title: 'Izračunajte Ugrađene Emisije', desc: 'Odredite direktne i indirektne emisije za svaki proizvod u svakoj instalaciji.' },
        { title: 'Pružite Verificirane Podatke', desc: 'Dostavite točne podatke o emisijama koristeći odobrene CBAM metodologije i predloške.' },
        { title: 'Prijavite Plaćene Cijene Ugljika', desc: 'Dokumentirajte sve poreze na ugljik ili ETS troškove plaćene u zemlji porijekla.' },
        { title: 'Podijelite Podatke s EU Klijentima', desc: 'Proslijedite izvješća o emisijama vašim EU partnerima uvoznicima pravovremeno.' },
      ],
    },
    faq: {
      title: 'Često Postavljana Pitanja',
      subtitle: 'Česta pitanja o CBAM-u i usklađenosti.',
      items: [
        { question: 'Na koga utječe CBAM?', answer: 'CBAM prvenstveno utječe na EU uvoznike robe u pokrivenim sektorima (željezo i čelik, aluminij, cement, gnojiva, električna energija i vodik). Međutim, ne-EU proizvođači i izvoznici su također indirektno pogođeni, jer moraju pružiti podatke o emisijama svojim EU klijentima.' },
        { question: 'Što su ugrađene emisije?', answer: 'Ugrađene emisije su emisije stakleničkih plinova koje se ispuštaju tijekom proizvodnje robe. CBAM uzima u obzir i direktne emisije (iz samog procesa proizvodnje) i, u nekim slučajevima, indirektne emisije (od električne energije potrošene tijekom proizvodnje).' },
        { question: 'Kako se izračunava cijena CBAM-a?', answer: 'Cijena CBAM certifikata odražava cijenu ugljika EU Sustava za Trgovanje Emisijama (EU ETS), izračunatu kao tjedni prosjek aukcijske cijene EU ETS dozvola. Time se osiguravaju jednaki uvjeti između EU i ne-EU proizvođača.' },
        { question: 'Što se događa ako je cijena ugljika već plaćena u zemlji porijekla?', answer: 'Ako je eksplicitna cijena ugljika plaćena u zemlji porijekla, obaveza CBAM-a se može smanjiti u skladu s tim. Uvoznici mogu zatražiti smanjenje CBAM certifikata na temelju cijene ugljika efektivno plaćene u inozemstvu.' },
        { question: 'Koje podatke ne-EU proizvođači trebaju pružiti?', answer: 'Ne-EU proizvođači trebaju pružiti podatke o direktnim emisijama iz procesa proizvodnje, potrošnji električne energije i njenom faktoru emisija, količinama proizvodnje te detalje o bilo kojoj cijeni ugljika plaćenoj u zemlji porijekla.' },
        { question: 'Koje su kazne za neusklađenost?', answer: 'Tijekom prijelaznog razdoblja, neusklađenost s obavezama izvješćivanja može rezultirati kaznama u rasponu od 10€ do 50€ po toni neprijavljenih emisija. U konačnoj fazi, kazne će biti usklađene s onima prema EU ETS-u.' },
      ],
    },
    cta: {
      title: 'Spremni za Početak?',
      subtitle: 'Panonia čini usklađenost s CBAM-om jednostavnom. Izračunajte emisije, generirajte usklađena izvješća i podijelite ih sa svojim EU klijentima — sve na jednoj platformi.',
      startBtn: 'Započnite Izračun',
      homeBtn: 'Nazad na Početnu',
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
    nav: { back: 'Geri', badge: 'CBAM Rehberi', login: 'Giriş' },
    hero: {
      badge: 'Eksiksiz Rehber',
      titleBefore: 'AB ',
      titleHighlight: 'Sınırda Karbon Düzenleme Mekanizmasını Anlamak',
      subtitle: 'CBAM hakkında bilmeniz gereken her şey — nedir, kimleri etkiler, önemli tarihler ve uyumluluğu nasıl sağlarsınız.',
    },
    whatIs: {
      chipLabel: 'Genel Bakış',
      title: 'CBAM Nedir?',
      p1: '<strong>Sınırda Karbon Düzenleme Mekanizması (CBAM)</strong>, ithal mallarda gömülü karbon emisyonlarına adil bir fiyat koymak için tasarlanmış önemli bir AB düzenlemesidir. İthalatın karbon fiyatının yerli üretimin karbon fiyatına eşdeğer olmasını sağlayarak "karbon kaçağını" — şirketlerin üretimi daha az katı iklim politikalarına sahip ülkelere taşımasını — önler.',
      p2: 'CBAM, sera gazı emisyonlarını 2030 yılına kadar 1990 seviyelerine kıyasla en az %55 azaltmayı hedefleyen AB\'nin <strong>"Fit for 55"</strong> paketinin temel bir ayağıdır. Karbon fiyatlandırmasını ithal mallara genişleterek AB Emisyon Ticaret Sistemi (AB ETS) ile birlikte çalışır.',
      pillars: [
        { title: 'Karbon Kaçağını Önler', desc: 'Şirketlerin üretimi AB dışına taşıyarak karbon maliyetlerinden kaçınamamasını sağlar.' },
        { title: 'Eşit Rekabet Koşulları', desc: 'AB ve AB dışı üreticiler adil rekabet için eşdeğer karbon fiyatlandırmasıyla karşı karşıyadır.' },
        { title: 'Karbonsuzlaştırmayı Teşvik Eder', desc: 'AB dışı üreticileri daha temiz üretim teknolojileri benimsemeye teşvik eder.' },
      ],
    },
    sectors: {
      chipLabel: 'Kapsam',
      title: 'Kapsanan Sektörler',
      subtitle: 'CBAM, altı karbon yoğun sektördeki ithalata uygulanır. Bu sektörler, en yüksek karbon kaçağı riskini taşıdıkları için seçilmiştir.',
      items: [
        { name: 'Demir ve Çelik' },
        { name: 'Alüminyum' },
        { name: 'Çimento' },
        { name: 'Gübreler' },
        { name: 'Elektrik' },
        { name: 'Hidrojen' },
      ],
    },
    howItWorks: {
      chipLabel: 'Mekanizma',
      title: 'CBAM Nasıl Çalışır',
      subtitle: 'Mekanizma, bir raporlama ve sertifika sistemi üzerinden işler.',
      steps: [
        { title: 'Emisyonları Raporlayın', desc: 'AB ithalatçıları, ithal ettikleri malların gömülü emisyonlarını raporlamalıdır. AB dışı üreticiler, her tesis ve ürün için gerekli emisyon verilerini sağlar.' },
        { title: 'Sertifika Satın Alın', desc: '2026\'dan itibaren, yetkili CBAM beyan sahipleri AB ETS karbon fiyatına bağlı bir fiyattan CBAM sertifikaları satın almalıdır. Her sertifika bir ton CO₂ eşdeğeri emisyonu kapsar.' },
        { title: 'Sertifikaları Teslim Edin', desc: 'Her yıl 31 Mayıs\'a kadar, beyan sahipleri önceki yılın ithalatlarının gömülü emisyonlarına karşılık gelen CBAM sertifikalarını, yurt dışında zaten ödenen karbon fiyatı düşüldükten sonra teslim etmelidir.' },
      ],
    },
    emissions: {
      chipLabel: 'Temel Kavramlar',
      title: 'CBAM Kapsamında Emisyonları Anlamak',
      direct: {
        title: 'Doğrudan Emisyonlar',
        desc: 'Malın üretim sürecinden doğrudan salınan emisyonlar, bunlar arasında:',
        items: ['Isı ve enerji için yakıt yakılması', 'Kimyasal reaksiyonlardan kaynaklanan proses emisyonları', 'Hammadde ayrışmasından kaynaklanan emisyonlar'],
      },
      indirect: {
        title: 'Dolaylı Emisyonlar',
        desc: 'Üretim sürecinde tüketilen elektriğin üretiminden kaynaklanan emisyonlar. İlgili olan:',
        items: ['Üretim tesislerinde kullanılan elektrik', 'Tüm CBAM sektörleri için geçerli', 'Şebeke emisyon faktörleri veya tedarikçiye özgü veriler kullanılarak hesaplanır'],
      },
    },
    timeline: {
      chipLabel: 'Zaman Çizelgesi',
      title: 'Önemli Tarihler ve Kilometre Taşları',
      subtitle: 'CBAM, işletmelere uyum sağlamaları için zaman tanımak amacıyla aşamalı olarak uygulanmaktadır.',
      items: [
        { date: 'Ekim 2023', title: 'Geçiş Dönemi Başlangıcı', desc: 'AB ithalatçıları, CBAM mallarının gömülü emisyonlarını üç aylık bazda raporlamaya başlamalıdır. Bu aşamada mali ödeme gerekmemektedir.' },
        { date: 'Ocak 2025', title: 'Daha Sıkı Raporlama Kuralları', desc: 'Çoğu ürün için artık varsayılan değerler kullanılamaz. İthalatçılar tesislerden gerçek emisyon verilerini raporlamalıdır.' },
        { date: 'Ocak 2026', title: 'Kesin Dönem Başlangıcı', desc: 'CBAM sertifikaları satın alınmalı ve teslim edilmelidir. Mali yükümlülükler başlar ve AB ETS ücretsiz tahsisatın aşamalı kaldırılması başlar.' },
        { date: '2026 – 2034', title: 'Kademeli Geçiş', desc: 'CBAM mali yükümlülükleri, AB ETS ücretsiz tahsisatları kaldırıldıkça kademeli olarak artar ve 2034 yılına kadar tam uygulamaya ulaşır.' },
      ],
    },
    obligations: {
      chipLabel: 'Yükümlülükleriniz',
      title: 'AB Dışı Üreticiler Ne Yapmalı',
      subtitle: 'Yasal CBAM yükümlülükleri AB ithalatçılarına düşse de, AB dışı üreticiler AB müşterilerinin ihtiyaç duyduğu emisyon verilerini sağlayarak kritik bir rol oynar.',
      items: [
        { title: 'Gömülü Emisyonları Hesaplayın', desc: 'Her tesisteki her ürün için doğrudan ve dolaylı emisyonları belirleyin.' },
        { title: 'Doğrulanmış Veri Sağlayın', desc: 'Onaylanmış CBAM metodolojileri ve şablonları kullanarak doğru emisyon verileri sağlayın.' },
        { title: 'Ödenen Karbon Fiyatlarını Raporlayın', desc: 'Menşe ülkede ödenen karbon vergisi veya ETS maliyetlerini belgeleyin.' },
        { title: 'Verileri AB Müşterileriyle Paylaşın', desc: 'Emisyon raporlarını AB ithalatçı ortaklarınıza zamanında iletin.' },
      ],
    },
    faq: {
      title: 'Sıkça Sorulan Sorular',
      subtitle: 'CBAM ve uyumluluk hakkında yaygın sorular.',
      items: [
        { question: 'CBAM kimlerden etkilenir?', answer: 'CBAM öncelikle kapsanan sektörlerdeki (demir ve çelik, alüminyum, çimento, gübreler, elektrik ve hidrojen) mal ithalatçılarını etkiler. Ancak, AB dışı üreticiler ve ihracatçılar da dolaylı olarak etkilenir, çünkü AB müşterilerine emisyon verileri sağlamak zorundadırlar.' },
        { question: 'Gömülü emisyonlar nedir?', answer: 'Gömülü emisyonlar, bir malın üretimi sırasında salınan sera gazı emisyonlarıdır. CBAM hem doğrudan emisyonları (üretim sürecinin kendisinden) hem de bazı durumlarda dolaylı emisyonları (üretim sırasında tüketilen elektrikten) dikkate alır.' },
        { question: 'CBAM fiyatı nasıl hesaplanır?', answer: 'CBAM sertifika fiyatı, AB ETS tahsisatlarının haftalık ortalama açık artırma fiyatı olarak hesaplanan AB Emisyon Ticaret Sistemi (AB ETS) karbon fiyatını yansıtır. Bu, AB ve AB dışı üreticiler arasında eşit koşullar sağlar.' },
        { question: 'Menşe ülkede karbon fiyatı zaten ödenmişse ne olur?', answer: 'Menşe ülkede açık bir karbon fiyatı ödenmişse, CBAM yükümlülüğü buna göre azaltılabilir. İthalatçılar, yurt dışında fiilen ödenen karbon fiyatına dayanarak CBAM sertifikalarında indirim talep edebilir.' },
        { question: 'AB dışı üreticiler hangi verileri sağlamalıdır?', answer: 'AB dışı üreticiler, üretim süreçlerinden kaynaklanan doğrudan emisyonlar, elektrik tüketimi ve emisyon faktörü, üretim miktarları ve menşe ülkede ödenen karbon fiyatı hakkında detaylı verileri sağlamalıdır.' },
        { question: 'Uyumsuzluk için cezalar nelerdir?', answer: 'Geçiş döneminde, raporlama yükümlülüklerine uyumsuzluk, raporlanmamış emisyon tonu başına 10€ ile 50€ arasında cezalarla sonuçlanabilir. Kesin dönemde, cezalar AB ETS kapsamındakilerle uyumlu hale getirilecektir.' },
      ],
    },
    cta: {
      title: 'Başlamaya Hazır mısınız?',
      subtitle: 'Panonia, CBAM uyumluluğunu basit hale getirir. Emisyonlarınızı hesaplayın, uyumlu raporlar oluşturun ve AB müşterilerinizle paylaşın — hepsi tek bir platformda.',
      startBtn: 'Hesaplamaya Başla',
      homeBtn: 'Ana Sayfaya Dön',
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

const sectorCNs = ['CN 72, 73', 'CN 76', 'CN 2523', 'CN 2808, 2814, 3102–3105', 'CN 2716', 'CN 2804 10 00'];

/* ─── Design tokens (shared with App.tsx) ─── */
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

/* ─── Shared section chip style ─── */
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

/* ─── Scroll-triggered reveal hook ─── */
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
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

/* ─── Inject global keyframes (idempotent — shared id with App.tsx) ─── */
const GUIDE_STYLES = `
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

const pillarIcons = [<Public key="p" fontSize="small" />, <Gavel key="g" fontSize="small" />, <AccountBalance key="a" fontSize="small" />];

const CBAMGuide: React.FC = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Lang>('en');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const t = translations[language];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  /* Inject styles */
  useEffect(() => {
    if (document.getElementById('panonia-global-styles')) return;
    const style = document.createElement('style');
    style.id = 'panonia-global-styles';
    style.textContent = GUIDE_STYLES;
    document.head.appendChild(style);
  }, []);

  /* Scroll shadow */
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

  /* ─── Reveal refs for major sections ─── */
  const whatIsRef = useReveal<HTMLDivElement>();
  const sectorsRef = useReveal<HTMLDivElement>();
  const howRef = useReveal<HTMLDivElement>();
  const emissionsRef = useReveal<HTMLDivElement>();
  const timelineRef = useReveal<HTMLDivElement>();
  const obligationsRef = useReveal<HTMLDivElement>();
  const faqRef = useReveal<HTMLDivElement>();

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
          {/* Logo */}
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

          {/* Right actions */}
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

      {/* ── Hero Section ── */}
      <Box
        sx={{
          pt: { xs: 16, md: 20 }, pb: { xs: 10, md: 14 }, px: { xs: 2, sm: 4 },
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
              <Chip icon={<MenuBook sx={{ fontSize: 16 }} />} label={t.hero.badge} variant="outlined" sx={{ ...sectionChipSx, py: 0.3, px: 0.5 }} />
            </Box>
            <Typography
              component="h1"
              className="anim-fade-up delay-2"
              sx={{
                fontFamily: T.font.display, fontSize: { xs: '2.2rem', sm: '3rem', md: '3.6rem' },
                fontWeight: 700, lineHeight: 1.12, color: T.color.ink, letterSpacing: '-0.025em', mb: 3,
              }}
            >
              {t.hero.titleBefore}
              <Box component="span" sx={{
                color: T.color.forest, position: 'relative',
                '&::after': {
                  content: '""', position: 'absolute', left: 0, bottom: '0.06em',
                  width: '100%', height: '0.12em', bgcolor: T.color.accentLight, borderRadius: '4px', zIndex: -1,
                },
              }}>
                {t.hero.titleHighlight}
              </Box>
            </Typography>
            <Typography
              className="anim-fade-up delay-3"
              sx={{ fontFamily: T.font.body, fontSize: { xs: '1.05rem', md: '1.2rem' }, color: T.color.muted, lineHeight: 1.7, maxWidth: 620, mx: 'auto' }}
            >
              {t.hero.subtitle}
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* ── What is CBAM ── */}
      <Box ref={whatIsRef.ref} sx={{ py: { xs: 10, md: 14 }, bgcolor: T.color.warmWhite }}>
        <Container maxWidth="lg">
          <Box className={whatIsRef.visible ? 'anim-fade-up delay-1' : ''} sx={{ opacity: whatIsRef.visible ? undefined : 0 }}>
            <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
              <Grid size={{ xs: 12, md: 6 }}>
                <Chip icon={<Info sx={{ fontSize: 14 }} />} label={t.whatIs.chipLabel} variant="outlined" sx={sectionChipSx} />
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '1.9rem', md: '2.4rem' }, color: T.color.ink, letterSpacing: '-0.02em', mb: 3 }}>
                  {t.whatIs.title}
                </Typography>
                <Typography
                  sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.8, mb: 2.5, '& strong': { color: T.color.ink, fontWeight: 600 } }}
                  dangerouslySetInnerHTML={{ __html: t.whatIs.p1 }}
                />
                <Typography
                  sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.8, '& strong': { color: T.color.ink, fontWeight: 600 } }}
                  dangerouslySetInnerHTML={{ __html: t.whatIs.p2 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 3.5, md: 4.5 }, borderRadius: T.radius.xl,
                    border: `1px solid ${T.color.line}`, bgcolor: T.color.warmWhite,
                    position: 'relative', overflow: 'hidden',
                    '&::before': {
                      content: '""', position: 'absolute', top: -50, right: -50, width: 180, height: 180,
                      borderRadius: '50%', background: `radial-gradient(circle, ${T.color.mint} 0%, transparent 70%)`,
                    },
                  }}
                >
                  <Stack spacing={3.5} position="relative" zIndex={1}>
                    {t.whatIs.pillars.map((pillar, i) => (
                      <Box key={i} display="flex" alignItems="flex-start" gap={2.5}>
                        <Box sx={{
                          width: 44, height: 44, borderRadius: T.radius.sm, flexShrink: 0,
                          bgcolor: T.color.mint, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.color.forest,
                        }}>
                          {pillarIcons[i]}
                        </Box>
                        <Box>
                          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.ink, mb: 0.5 }}>
                            {pillar.title}
                          </Typography>
                          <Typography sx={{ fontFamily: T.font.body, fontSize: '0.9rem', color: T.color.muted, lineHeight: 1.6 }}>
                            {pillar.desc}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>

      {/* ── Covered Sectors ── */}
      <Box ref={sectorsRef.ref} sx={{
        py: { xs: 10, md: 14 }, bgcolor: T.color.cream, position: 'relative',
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 40px, ${T.color.lineFaint} 40px, ${T.color.lineFaint} 41px)`,
          opacity: 0.4, pointerEvents: 'none',
        },
      }}>
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box className={sectorsRef.visible ? 'anim-fade-up delay-1' : ''} sx={{ opacity: sectorsRef.visible ? undefined : 0 }}>
            <Box textAlign="center" mb={{ xs: 5, md: 7 }}>
              <Chip icon={<LocalShipping sx={{ fontSize: 14 }} />} label={t.sectors.chipLabel} variant="outlined" sx={sectionChipSx} />
              <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '1.9rem', md: '2.4rem' }, color: T.color.ink, letterSpacing: '-0.02em', mb: 2 }}>
                {t.sectors.title}
              </Typography>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '1.05rem', color: T.color.muted, maxWidth: 580, mx: 'auto', lineHeight: 1.6 }}>
                {t.sectors.subtitle}
              </Typography>
            </Box>
            <Grid container spacing={3}>
              {t.sectors.items.map((sector, i) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                  <Card
                    elevation={0}
                    sx={{
                      height: '100%', bgcolor: T.color.warmWhite, border: `1px solid ${T.color.lineFaint}`,
                      borderRadius: T.radius.lg, transition: 'all 0.35s cubic-bezier(.22,1,.36,1)',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 16px 40px -10px rgba(11,79,62,0.1)`, borderColor: T.color.mintDark },
                    }}
                  >
                    <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2.5 }}>
                      <Box sx={{
                        width: 48, height: 48, borderRadius: T.radius.sm, bgcolor: T.color.mint,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.color.forest, flexShrink: 0,
                      }}>
                        <Factory fontSize="small" />
                      </Box>
                      <Box>
                        <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.ink }}>
                          {sector.name}
                        </Typography>
                        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.82rem', color: T.color.muted }}>{sectorCNs[i]}</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Container>
      </Box>

      {/* ── How CBAM Works ── */}
      <Box ref={howRef.ref} sx={{ py: { xs: 10, md: 14 }, bgcolor: T.color.warmWhite }}>
        <Container maxWidth="lg">
          <Box className={howRef.visible ? 'anim-fade-up delay-1' : ''} sx={{ opacity: howRef.visible ? undefined : 0 }}>
            <Box textAlign="center" mb={{ xs: 5, md: 7 }}>
              <Chip icon={<BarChart sx={{ fontSize: 14 }} />} label={t.howItWorks.chipLabel} variant="outlined" sx={sectionChipSx} />
              <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '1.9rem', md: '2.4rem' }, color: T.color.ink, letterSpacing: '-0.02em', mb: 2 }}>
                {t.howItWorks.title}
              </Typography>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '1.05rem', color: T.color.muted, maxWidth: 520, mx: 'auto', lineHeight: 1.6 }}>
                {t.howItWorks.subtitle}
              </Typography>
            </Box>
            <Grid container spacing={4}>
              {t.howItWorks.steps.map((step, i) => (
                <Grid size={{ xs: 12, md: 4 }} key={i}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 3.5, md: 4.5 }, height: '100%', border: `1px solid ${T.color.lineFaint}`,
                      borderRadius: T.radius.lg, textAlign: 'center', bgcolor: T.color.warmWhite,
                      transition: 'all 0.35s cubic-bezier(.22,1,.36,1)',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 16px 40px -10px rgba(11,79,62,0.1)`, borderColor: T.color.mintDark },
                    }}
                  >
                    <Box sx={{
                      width: 72, height: 72, borderRadius: '50%', mx: 'auto', mb: 3,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: T.color.forest, color: '#fff',
                      fontFamily: T.font.display, fontSize: '1.6rem', fontWeight: 700,
                      boxShadow: `0 8px 24px -4px rgba(11,79,62,0.3)`,
                      position: 'relative',
                      '&::after': { content: '""', position: 'absolute', inset: '-6px', borderRadius: '50%', border: `2px dashed ${T.color.mintDark}` },
                    }}>
                      {i + 1}
                    </Box>
                    <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink, mb: 1.5 }}>
                      {step.title}
                    </Typography>
                    <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.7 }}>
                      {step.desc}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Container>
      </Box>

      {/* ── Emissions Concepts ── */}
      <Box ref={emissionsRef.ref} sx={{
        py: { xs: 10, md: 14 }, bgcolor: T.color.cream, position: 'relative',
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(${T.color.mintDark} 1px, transparent 1px)`,
          backgroundSize: '24px 24px', opacity: 0.2, pointerEvents: 'none',
        },
      }}>
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box className={emissionsRef.visible ? 'anim-fade-up delay-1' : ''} sx={{ opacity: emissionsRef.visible ? undefined : 0 }}>
            <Box textAlign="center" mb={{ xs: 5, md: 7 }}>
              <Chip icon={<TipsAndUpdates sx={{ fontSize: 14 }} />} label={t.emissions.chipLabel} variant="outlined" sx={sectionChipSx} />
              <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '1.9rem', md: '2.4rem' }, color: T.color.ink, letterSpacing: '-0.02em' }}>
                {t.emissions.title}
              </Typography>
            </Box>
            <Grid container spacing={4}>
              {/* Direct */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 3.5, md: 4.5 }, borderRadius: T.radius.lg, height: '100%',
                    border: `1px solid ${T.color.lineFaint}`, bgcolor: T.color.warmWhite,
                    transition: 'border-color 0.3s', '&:hover': { borderColor: T.color.mintDark },
                  }}
                >
                  <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.forest, mb: 1.5 }}>
                    {t.emissions.direct.title}
                  </Typography>
                  <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.8, mb: 2 }}>
                    {t.emissions.direct.desc}
                  </Typography>
                  <List dense disablePadding>
                    {t.emissions.direct.items.map((item) => (
                      <ListItem key={item} sx={{ px: 0, py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckCircle sx={{ color: T.color.forest, fontSize: 18 }} />
                        </ListItemIcon>
                        <ListItemText primary={item} primaryTypographyProps={{ fontFamily: T.font.body, fontSize: '0.92rem', color: T.color.inkSoft }} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>
              {/* Indirect */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 3.5, md: 4.5 }, borderRadius: T.radius.lg, height: '100%',
                    border: `1px solid ${T.color.lineFaint}`, bgcolor: T.color.warmWhite,
                    transition: 'border-color 0.3s', '&:hover': { borderColor: T.color.mintDark },
                  }}
                >
                  <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.sage, mb: 1.5 }}>
                    {t.emissions.indirect.title}
                  </Typography>
                  <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.8, mb: 2 }}>
                    {t.emissions.indirect.desc}
                  </Typography>
                  <List dense disablePadding>
                    {t.emissions.indirect.items.map((item) => (
                      <ListItem key={item} sx={{ px: 0, py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckCircle sx={{ color: T.color.sage, fontSize: 18 }} />
                        </ListItemIcon>
                        <ListItemText primary={item} primaryTypographyProps={{ fontFamily: T.font.body, fontSize: '0.92rem', color: T.color.inkSoft }} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>

      {/* ── Timeline ── */}
      <Box ref={timelineRef.ref} sx={{ py: { xs: 10, md: 14 }, bgcolor: T.color.warmWhite }}>
        <Container maxWidth="md">
          <Box className={timelineRef.visible ? 'anim-fade-up delay-1' : ''} sx={{ opacity: timelineRef.visible ? undefined : 0 }}>
            <Box textAlign="center" mb={{ xs: 5, md: 7 }}>
              <Chip icon={<CalendarMonth sx={{ fontSize: 14 }} />} label={t.timeline.chipLabel} variant="outlined" sx={sectionChipSx} />
              <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '1.9rem', md: '2.4rem' }, color: T.color.ink, letterSpacing: '-0.02em', mb: 2 }}>
                {t.timeline.title}
              </Typography>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '1.05rem', color: T.color.muted }}>
                {t.timeline.subtitle}
              </Typography>
            </Box>
            <Stack spacing={0}>
              {t.timeline.items.map((item, index) => {
                const isPast = index <= 1;
                return (
                  <Box key={item.date} display="flex" gap={3}>
                    {/* Vertical line & circle */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 44 }}>
                      <Box sx={{
                        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: isPast ? T.color.lineFaint : T.color.forest,
                        color: isPast ? T.color.muted : '#fff',
                        fontFamily: T.font.display, fontSize: '0.9rem', fontWeight: 700,
                        border: isPast ? `2px solid ${T.color.line}` : 'none',
                        boxShadow: isPast ? 'none' : `0 4px 14px -3px rgba(11,79,62,0.3)`,
                      }}>
                        {index + 1}
                      </Box>
                      {index < t.timeline.items.length - 1 && (
                        <Box sx={{ width: 2, flexGrow: 1, bgcolor: isPast ? T.color.line : T.color.mintDark, my: 0.5 }} />
                      )}
                    </Box>
                    {/* Content card */}
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3, mb: 3, flexGrow: 1, borderRadius: T.radius.md,
                        border: `1px solid ${isPast ? T.color.lineFaint : T.color.mintDark}`,
                        bgcolor: isPast ? T.color.warmWhite : T.color.mint,
                        transition: 'border-color 0.3s', '&:hover': { borderColor: T.color.forest },
                      }}
                    >
                      <Chip
                        label={item.date}
                        size="small"
                        sx={{
                          fontFamily: T.font.body, fontWeight: 600, fontSize: '0.72rem',
                          bgcolor: isPast ? T.color.lineFaint : T.color.mintDark,
                          color: isPast ? T.color.muted : T.color.forest,
                          mb: 1.5,
                        }}
                      />
                      <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.ink, mb: 0.5 }}>
                        {item.title}
                      </Typography>
                      <Typography sx={{ fontFamily: T.font.body, fontSize: '0.9rem', color: T.color.muted, lineHeight: 1.65 }}>
                        {item.desc}
                      </Typography>
                    </Paper>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* ── Obligations ── */}
      <Box ref={obligationsRef.ref} sx={{ py: { xs: 10, md: 14 }, bgcolor: T.color.cream }}>
        <Container maxWidth="lg">
          <Box className={obligationsRef.visible ? 'anim-fade-up delay-1' : ''} sx={{ opacity: obligationsRef.visible ? undefined : 0 }}>
            <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
              <Grid size={{ xs: 12, md: 5 }}>
                <Chip icon={<Warning sx={{ fontSize: 14 }} />} label={t.obligations.chipLabel} variant="outlined" sx={{ ...sectionChipSx, bgcolor: T.color.accentLight, color: '#8B6914', borderColor: '#E0C97A' }} />
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '1.9rem', md: '2.4rem' }, color: T.color.ink, letterSpacing: '-0.02em', mb: 3 }}>
                  {t.obligations.title}
                </Typography>
                <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.75 }}>
                  {t.obligations.subtitle}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <Stack spacing={2}>
                  {t.obligations.items.map((item, i) => (
                    <Paper
                      key={item.title}
                      elevation={0}
                      sx={{
                        p: 3, display: 'flex', alignItems: 'flex-start', gap: 2.5,
                        border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.md, bgcolor: T.color.warmWhite,
                        transition: 'all 0.3s ease',
                        '&:hover': { bgcolor: T.color.mint, borderColor: T.color.mintDark },
                      }}
                    >
                      <Box sx={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        bgcolor: T.color.mint, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: T.color.forest, fontFamily: T.font.display, fontWeight: 700, fontSize: '0.85rem',
                      }}>
                        {i + 1}
                      </Box>
                      <Box>
                        <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1rem', color: T.color.ink, mb: 0.3 }}>
                          {item.title}
                        </Typography>
                        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.muted, lineHeight: 1.6 }}>
                          {item.desc}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>

      {/* ── FAQ ── */}
      <Box ref={faqRef.ref} sx={{ py: { xs: 10, md: 14 }, bgcolor: T.color.warmWhite }}>
        <Container maxWidth="md">
          <Box className={faqRef.visible ? 'anim-fade-up delay-1' : ''} sx={{ opacity: faqRef.visible ? undefined : 0 }}>
            <Box textAlign="center" mb={{ xs: 5, md: 7 }}>
              <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '1.9rem', md: '2.4rem' }, color: T.color.ink, letterSpacing: '-0.02em', mb: 2 }}>
                {t.faq.title}
              </Typography>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '1.05rem', color: T.color.muted }}>
                {t.faq.subtitle}
              </Typography>
            </Box>
            <Stack spacing={2}>
              {t.faq.items.map((faq) => (
                <Accordion
                  key={faq.question}
                  elevation={0}
                  disableGutters
                  sx={{
                    border: `1px solid ${T.color.lineFaint}`, borderRadius: `${T.radius.md} !important`,
                    bgcolor: T.color.warmWhite, overflow: 'hidden',
                    '&:before': { display: 'none' },
                    '&.Mui-expanded': { margin: 0, borderColor: T.color.mintDark },
                    transition: 'border-color 0.3s',
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore sx={{ color: T.color.muted }} />}
                    sx={{
                      px: 3, py: 0.5,
                      '&:hover': { bgcolor: T.color.mint },
                      transition: 'background 0.2s',
                    }}
                  >
                    <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.02rem', color: T.color.ink }}>
                      {faq.question}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 3, pb: 3 }}>
                    <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.75 }}>
                      {faq.answer}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              disableElevation
              endIcon={<East />}
              onClick={() => navigate('/login')}
              sx={{
                fontFamily: T.font.body, fontWeight: 600, fontSize: '1rem', textTransform: 'none',
                bgcolor: '#fff', color: T.color.forest, borderRadius: T.radius.pill, px: 4.5, py: 1.7,
                transition: 'all 0.3s cubic-bezier(.22,1,.36,1)',
                '&:hover': { bgcolor: T.color.accentLight, transform: 'translateY(-2px)', boxShadow: '0 12px 32px -8px rgba(0,0,0,0.25)' },
              }}
            >
              {t.cta.startBtn}
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/')}
              sx={{
                fontFamily: T.font.body, fontWeight: 600, fontSize: '1rem', textTransform: 'none',
                borderColor: 'rgba(255,255,255,0.3)', color: '#fff', borderRadius: T.radius.pill, px: 4.5, py: 1.7,
                transition: 'all 0.25s ease',
                '&:hover': { borderColor: 'rgba(255,255,255,0.7)', bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              {t.cta.homeBtn}
            </Button>
          </Stack>
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

export default CBAMGuide;