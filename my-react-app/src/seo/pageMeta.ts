export type PageMeta = {
  title: string;
  description: string;
  path: string;
  keywords?: string;
  noIndex?: boolean;
  type?: 'website' | 'article';
};

export const PAGE_META: Record<string, PageMeta> = {
  '/': {
    path: '/',
    title: 'Panonia — CBAM Calculator & Compliance Helper for Exporters',
    description:
      'Free CBAM cost calculator and compliance platform. Compare CBAM actual emissions vs EU default values, calculate embedded emissions, and generate EU-ready reports for aluminium, steel, cement and more.',
    keywords:
      'CBAM calculator, CBAM helper, CBAM compliance, CBAM cost calculator, CBAM default values, embedded emissions, EU CBAM software',
  },
  '/cost-calculator': {
    path: '/cost-calculator',
    title: 'CBAM Cost Calculator — Actual Emissions vs Default Values | Panonia',
    description:
      'Use the free CBAM calculator to compare measuring actual embedded emissions versus EU default values. Include verifier costs and see if CBAM reporting with Panonia saves you money.',
    keywords:
      'CBAM calculator, CBAM cost calculator, CBAM default values vs actual, CBAM certificate cost, CBAM helper',
  },
  '/cbam-guide': {
    path: '/cbam-guide',
    title: 'CBAM Guide 2026 — How the Carbon Border Adjustment Mechanism Works | Panonia',
    description:
      'Clear CBAM guide for producers and exporters: what CBAM is, who it affects, timelines, certificates, default values, and how to stay compliant with the EU Carbon Border Adjustment Mechanism.',
    keywords:
      'CBAM guide, what is CBAM, Carbon Border Adjustment Mechanism, CBAM 2026, CBAM certificates, CBAM reporting',
    type: 'article',
  },
  '/features': {
    path: '/features',
    title: 'CBAM Software Features — Calculate, Report & Share | Panonia',
    description:
      'Explore Panonia CBAM features: accurate embedded emissions calculations, EU-compliant reports, and secure sharing with authorised CBAM declarants and EU clients.',
    keywords: 'CBAM software, CBAM reporting tool, CBAM emissions calculator features',
  },
  '/about': {
    path: '/about',
    title: 'About Panonia — CBAM Compliance Made Simple',
    description:
      'Panonia helps non-EU producers and exporters calculate CBAM embedded emissions, compare costs, and share compliant data with EU importers.',
  },
  '/contact': {
    path: '/contact',
    title: 'Contact Panonia — CBAM Demo & Support',
    description:
      'Contact the Panonia team for a CBAM product demo, pricing questions, or help getting started with CBAM compliance and reporting.',
  },
  '/support': {
    path: '/support',
    title: 'CBAM Support — Help Center | Panonia',
    description:
      'Get help with Panonia CBAM calculator, reporting workflows, and account support for Carbon Border Adjustment Mechanism compliance.',
  },
  '/privacy': {
    path: '/privacy',
    title: 'Privacy Policy | Panonia',
    description: 'How Panonia collects, uses, and protects personal data when you use our CBAM compliance platform.',
  },
  '/login': {
    path: '/login',
    title: 'Log in | Panonia CBAM',
    description: 'Sign in to your Panonia account to manage CBAM calculations and reports.',
    noIndex: true,
  },
};

export function metaForPath(pathname: string): PageMeta {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    return {
      path: pathname,
      title: 'Panonia CBAM Dashboard',
      description: 'Manage your CBAM calculations and reports.',
      noIndex: true,
    };
  }
  return PAGE_META['/'];
}
