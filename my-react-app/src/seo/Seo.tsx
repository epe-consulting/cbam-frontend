import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CONTACT_EMAIL,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
} from './siteConfig';
import { metaForPath } from './pageMeta';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(id: string, data: Record<string, unknown> | Record<string, unknown>[]) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Updates document head on every route change for SEO (title, description, OG, canonical, JSON-LD).
 */
export default function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = metaForPath(pathname);
    const canonical = `${SITE_URL}${meta.path === '/' ? '' : meta.path}`;
    const title = meta.title;
    const description = meta.description;
    const keywords = meta.keywords || DEFAULT_KEYWORDS;
    const ogType = meta.type || 'website';

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'keywords', keywords);
    upsertMeta('name', 'robots', meta.noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    upsertMeta('name', 'author', SITE_NAME);
    upsertMeta('name', 'theme-color', '#0B4F3E');

    upsertLink('canonical', canonical);

    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:locale', 'en_US');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', DEFAULT_OG_IMAGE);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', DEFAULT_OG_IMAGE);

    // Organization + WebSite (+ SearchAction) — helps brand/entity understanding
    upsertJsonLd('seo-ld-org', {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${SITE_URL}/#organization`,
          name: SITE_NAME,
          url: SITE_URL,
          email: CONTACT_EMAIL,
          logo: {
            '@type': 'ImageObject',
            url: DEFAULT_OG_IMAGE,
          },
          description:
            'Panonia is a CBAM calculator and compliance helper for exporters calculating embedded emissions and EU Carbon Border Adjustment Mechanism reports.',
          sameAs: [],
        },
        {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          url: SITE_URL,
          name: SITE_NAME,
          description:
            'CBAM calculator, CBAM helper, and compliance platform for embedded emissions reporting.',
          publisher: { '@id': `${SITE_URL}/#organization` },
          inLanguage: ['en', 'bs', 'tr'],
        },
        {
          '@type': 'SoftwareApplication',
          '@id': `${SITE_URL}/#cbam-calculator`,
          name: 'Panonia CBAM Calculator',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          url: `${SITE_URL}/cost-calculator`,
          description:
            'Free CBAM cost calculator comparing actual embedded emissions versus EU default values, including verifier and platform costs.',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'EUR',
          },
          provider: { '@id': `${SITE_URL}/#organization` },
        },
      ],
    });

    if (pathname === '/cbam-guide') {
      upsertJsonLd('seo-ld-faq', {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is CBAM?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The Carbon Border Adjustment Mechanism (CBAM) is an EU regulation that puts a carbon price on certain imported goods so the carbon cost of imports matches EU domestic production.',
            },
          },
          {
            '@type': 'Question',
            name: 'Who needs a CBAM calculator?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Non-EU producers and exporters of CBAM goods (such as iron and steel, aluminium, cement, fertilisers, electricity and hydrogen) use a CBAM calculator to estimate embedded emissions and certificate costs for EU clients.',
            },
          },
          {
            '@type': 'Question',
            name: 'Are CBAM default values or actual emissions better?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'EU default values are often higher due to mark-ups. Measuring actual verified emissions can reduce CBAM certificate costs, but you must account for verification and reporting costs. Panonia’s CBAM cost calculator helps compare both options.',
            },
          },
        ],
      });
    } else {
      document.getElementById('seo-ld-faq')?.remove();
    }
  }, [pathname]);

  return null;
}
