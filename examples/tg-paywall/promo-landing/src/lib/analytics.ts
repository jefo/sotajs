/**
 * Analytics Utilities for TG Paywall Landing
 * 
 * Supports multiple analytics providers:
 * - Google Analytics 4 (GA4)
 * - Plausible Analytics (privacy-focused)
 * - Yandex Metrica
 * 
 * Usage: Import and call initAnalytics() in Layout.astro
 */

export interface AnalyticsConfig {
  provider: 'ga4' | 'plausible' | 'yandex' | 'custom';
  id: string;
  domain?: string;
  host?: string;
}

/**
 * Generate GA4 script tag
 */
export const getGA4Script = (measurementId: string) => {
  return {
    type: 'text/javascript',
    children: `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}', {
        anonymize_ip: true,
        send_page_view: true
      });
    `.trim(),
  };
};

/**
 * Get GA4 preconnect links
 */
export const getGA4Preconnect = () => [
  { rel: 'preconnect', href: 'https://www.googletagmanager.com' },
  { rel: 'preconnect', href: 'https://www.google-analytics.com' },
];

/**
 * Generate Plausible Analytics script
 */
export const getPlausibleScript = (domain: string, host?: string) => {
  const plausibleHost = host || 'https://plausible.io';
  return {
    type: 'text/javascript',
    async: true,
    defer: true,
    'data-domain': domain,
    src: `${plausibleHost}/js/script.js`,
  };
};

/**
 * Generate Yandex Metrica script
 */
export const getYandexScript = (counterId: string) => {
  return {
    type: 'text/javascript',
    children: `
      (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
      (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

      ym(${counterId}, "init", {
        clickmap:true,
        trackLinks:true,
        accurateTrackBounce:true,
        webvisor:true
      });
    `.trim(),
  };
};

/**
 * Get Yandex preconnect links
 */
export const getYandexPreconnect = () => [
  { rel: 'preconnect', href: 'https://mc.yandex.ru' },
];

/**
 * Event tracking helpers for manual tracking
 */
export const trackEvent = {
  /**
   * Track form submission
   */
  formSubmit: (formName: string, provider: 'ga4' | 'yandex' = 'ga4') => {
    if (provider === 'ga4' && typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'form_submit', {
        event_category: 'engagement',
        event_label: formName,
      });
    }
    
    if (provider === 'yandex' && typeof window !== 'undefined' && (window as any).ym) {
      (window as any).ym('reachGoal', `${formName}_submit`);
    }
  },

  /**
   * Track CTA click
   */
  ctaClick: (ctaName: string, provider: 'ga4' | 'yandex' = 'ga4') => {
    if (provider === 'ga4' && typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'cta_click', {
        event_category: 'conversion',
        event_label: ctaName,
      });
    }
  },

  /**
   * Track pricing plan selection
   */
  pricingSelect: (planName: string, provider: 'ga4' | 'yandex' = 'ga4') => {
    if (provider === 'ga4' && typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'select_pricing', {
        event_category: 'pricing',
        event_label: planName,
      });
    }
  },

  /**
   * Track demo request
   */
  demoRequest: (provider: 'ga4' | 'yandex' = 'ga4') => {
    if (provider === 'ga4' && typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'demo_request', {
        event_category: 'conversion',
      });
    }
    
    if (provider === 'yandex' && typeof window !== 'undefined' && (window as any).ym) {
      (window as any).ym('reachGoal', 'demo_request');
    }
  },
};

/**
 * SEO: Generate FAQ structured data from content
 */
export const generateFAQSchema = (faqs: Array<{ question: string; answer: string }>) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
};

/**
 * SEO: Generate Product/Offer structured data
 */
export const generateProductSchema = (product: {
  name: string;
  description: string;
  offers: Array<{ name: string; price: number; currency: string }>;
  rating?: { value: number; count: number };
}) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: product.name,
    description: product.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Cloud-based',
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: Math.min(...product.offers.map((o) => o.price)),
      highPrice: Math.max(...product.offers.map((o) => o.price)),
      priceCurrency: product.offers[0].currency,
      offerCount: product.offers.length.toString(),
    },
    aggregateRating: product.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: product.rating.value.toString(),
          ratingCount: product.rating.count.toString(),
        }
      : undefined,
  };
};

/**
 * SEO: Generate BreadcrumbList structured data
 */
export const generateBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
};
