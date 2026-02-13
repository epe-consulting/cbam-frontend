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
  Card,
  CardContent,
  Paper,
  Chip,
  Stack,
  Avatar,
  Divider,
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
  ArrowBack,
  ArrowForward,
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
  Language,
  KeyboardArrowDown,
} from '@mui/icons-material';

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
  footer: { badge: string; copyright: string };
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
    footer: { badge: 'CBAM Guide', copyright: 'Panonia. All rights reserved.' },
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
    footer: { badge: 'CBAM Vodič', copyright: 'Panonia. Sva prava pridržana.' },
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
    footer: { badge: 'CBAM Rehberi', copyright: 'Panonia. Tüm hakları saklıdır.' },
  },
};

const sectorCNs = ['CN 72, 73', 'CN 76', 'CN 2523', 'CN 2808, 2814, 3102–3105', 'CN 2716', 'CN 2804 10 00'];

const CBAMGuide: React.FC = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Lang>('en');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
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

  const pillarColors = ['#059669', '#2563eb', '#7c3aed'];
  const pillarIcons = [<Public key="p" />, <Gavel key="g" />, <AccountBalance key="a" />];

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
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              {languageOptions.map((lang) => (
                <MenuItem
                  key={lang.code}
                  onClick={() => { setLanguage(lang.code); setAnchorEl(null); }}
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

      {/* Hero Section */}
      <Box
        sx={{
          pt: 16,
          pb: 10,
          px: { xs: 2, sm: 4 },
          background: 'linear-gradient(135deg, #ecfdf5 0%, #dbeafe 50%, #ede9fe 100%)',
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center" maxWidth="md" mx="auto">
            <Chip
              icon={<MenuBook />}
              label={t.hero.badge}
              color="primary"
              variant="outlined"
              sx={{ mb: 3, bgcolor: 'white' }}
            />
            <Typography
              variant="h1"
              component="h1"
              gutterBottom
              sx={{ fontSize: { xs: '2.25rem', md: '3.5rem' }, fontWeight: 700, lineHeight: 1.2 }}
            >
              {t.hero.titleBefore}
              <Typography
                component="span"
                color="primary"
                sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}
              >
                {t.hero.titleHighlight}
              </Typography>
            </Typography>
            <Typography variant="h5" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
              {t.hero.subtitle}
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* What is CBAM */}
      <Box sx={{ py: 10, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Chip icon={<Info />} label={t.whatIs.chipLabel} color="primary" variant="outlined" sx={{ mb: 2 }} />
              <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
                {t.whatIs.title}
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 3, lineHeight: 1.8 }}
                dangerouslySetInnerHTML={{ __html: t.whatIs.p1 }}
              />
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ lineHeight: 1.8 }}
                dangerouslySetInnerHTML={{ __html: t.whatIs.p2 }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  background: 'linear-gradient(135deg, #d1fae5, #dbeafe)',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Stack spacing={3}>
                  {t.whatIs.pillars.map((pillar, i) => (
                    <Box key={i} display="flex" alignItems="flex-start" gap={2}>
                      <Avatar sx={{ bgcolor: pillarColors[i] }}>{pillarIcons[i]}</Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {pillar.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {pillar.desc}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Covered Sectors */}
      <Box sx={{ py: 10, bgcolor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Chip icon={<LocalShipping />} label={t.sectors.chipLabel} color="primary" variant="outlined" sx={{ mb: 2 }} />
            <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
              {t.sectors.title}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 'md', mx: 'auto' }}>
              {t.sectors.subtitle}
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {t.sectors.items.map((sector, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Card
                  sx={{
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}><Factory /></Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>{sector.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{sectorCNs[i]}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How CBAM Works */}
      <Box sx={{ py: 10, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Chip icon={<BarChart />} label={t.howItWorks.chipLabel} color="primary" variant="outlined" sx={{ mb: 2 }} />
            <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
              {t.howItWorks.title}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 'md', mx: 'auto' }}>
              {t.howItWorks.subtitle}
            </Typography>
          </Box>
          <Grid container spacing={4}>
            {t.howItWorks.steps.map((step, i) => (
              <Grid size={{ xs: 12, md: 4 }} key={i}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    textAlign: 'center',
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: 'primary.main',
                      width: 64,
                      height: 64,
                      mx: 'auto',
                      mb: 2,
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {i + 1}
                  </Avatar>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    {step.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {step.desc}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Key Emissions Concepts */}
      <Box sx={{ py: 10, bgcolor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Chip icon={<TipsAndUpdates />} label={t.emissions.chipLabel} color="primary" variant="outlined" sx={{ mb: 2 }} />
            <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
              {t.emissions.title}
            </Typography>
          </Box>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {t.emissions.direct.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
                  {t.emissions.direct.desc}
                </Typography>
                <List dense>
                  {t.emissions.direct.items.map((item) => (
                    <ListItem key={item} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircle color="primary" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#2563eb' }}>
                  {t.emissions.indirect.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
                  {t.emissions.indirect.desc}
                </Typography>
                <List dense>
                  {t.emissions.indirect.items.map((item) => (
                    <ListItem key={item} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircle sx={{ color: '#2563eb' }} fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Timeline */}
      <Box sx={{ py: 10, bgcolor: 'background.paper' }}>
        <Container maxWidth="md">
          <Box textAlign="center" mb={6}>
            <Chip icon={<CalendarMonth />} label={t.timeline.chipLabel} color="primary" variant="outlined" sx={{ mb: 2 }} />
            <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
              {t.timeline.title}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {t.timeline.subtitle}
            </Typography>
          </Box>
          <Stack spacing={0}>
            {t.timeline.items.map((item, index) => (
              <Box key={item.date} display="flex" gap={3}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
                  <Avatar
                    sx={{
                      bgcolor: index <= 1 ? 'grey.400' : 'primary.main',
                      width: 40,
                      height: 40,
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {index + 1}
                  </Avatar>
                  {index < t.timeline.items.length - 1 && (
                    <Box sx={{ width: 2, flexGrow: 1, bgcolor: index < 1 ? 'grey.300' : 'primary.light', my: 0.5 }} />
                  )}
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    mb: 3,
                    flexGrow: 1,
                    border: '1px solid',
                    borderColor: index <= 1 ? 'divider' : 'primary.light',
                    borderRadius: 2,
                    bgcolor: index <= 1 ? 'background.paper' : 'primary.50',
                  }}
                >
                  <Chip label={item.date} size="small" color={index <= 1 ? 'default' : 'primary'} sx={{ mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{item.desc}</Typography>
                </Paper>
              </Box>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* Obligations for Non-EU Producers */}
      <Box sx={{ py: 10, bgcolor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Chip icon={<Warning />} label={t.obligations.chipLabel} color="warning" variant="outlined" sx={{ mb: 2 }} />
              <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
                {t.obligations.title}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
                {t.obligations.subtitle}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2}>
                {t.obligations.items.map((item) => (
                  <Paper
                    key={item.title}
                    elevation={0}
                    sx={{
                      p: 2.5,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                    }}
                  >
                    <CheckCircle color="primary" sx={{ mt: 0.3, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{item.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Box sx={{ py: 10, bgcolor: 'background.paper' }}>
        <Container maxWidth="md">
          <Box textAlign="center" mb={6}>
            <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
              {t.faq.title}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {t.faq.subtitle}
            </Typography>
          </Box>
          <Stack spacing={2}>
            {t.faq.items.map((faq) => (
              <Accordion
                key={faq.question}
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '12px !important',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { margin: 0 },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.05rem' }}>
                    {faq.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {faq.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* CTA */}
      <Box sx={{ py: 10, bgcolor: 'primary.main', color: 'white' }}>
        <Container maxWidth="md">
          <Box textAlign="center">
            <Typography variant="h3" component="h2" gutterBottom sx={{ color: 'white', fontWeight: 700 }}>
              {t.cta.title}
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, color: 'primary.light' }}>
              {t.cta.subtitle}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/login')}
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  '&:hover': { bgcolor: 'grey.100' },
                }}
              >
                {t.cta.startBtn}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/')}
                sx={{
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: 'white',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                {t.cta.homeBtn}
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: 'grey.900', color: 'grey.300', py: 4 }}>
        <Container maxWidth="lg">
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                PANONIA
              </Typography>
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'grey.700', mx: 1 }} />
              <Typography variant="body2">{t.footer.badge}</Typography>
            </Box>
            <Typography variant="body2">
              &copy; {new Date().getFullYear()} {t.footer.copyright}
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default CBAMGuide;
