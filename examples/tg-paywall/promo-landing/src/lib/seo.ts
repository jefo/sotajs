export interface SEOProps {
  title: string;
  description: string;
  canonicalURL?: string;
  openGraph?: {
    type?: 'website' | 'article';
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    siteName?: string;
    locale?: string;
  };
  twitter?: {
    card?: 'summary_large_image' | 'summary';
    title?: string;
    description?: string;
    image?: string;
    site?: string;
    creator?: string;
  };
  article?: {
    publishedTime?: Date;
    modifiedTime?: Date;
    author?: string;
    section?: string;
    tags?: string[];
  };
  noIndex?: boolean;
}

export const generateSEO = (props: SEOProps) => {
  const {
    title,
    description,
    canonicalURL,
    openGraph = {},
    twitter = {},
    article,
    noIndex = false,
  } = props;

  const siteUrl = 'https://tg-paywall.sotajs.dev';
  const defaultImage = `${siteUrl}/og-default.jpg`;

  return {
    // Basic meta tags
    title,
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'description', content: description },
      { name: 'generator', content: 'Astro' },
      
      // SEO
      { name: 'robots', content: noIndex ? 'noindex, nofollow' : 'index, follow' },
      canonicalURL && { rel: 'canonical', href: canonicalURL },
      
      // Open Graph
      { property: 'og:type', content: openGraph.type || 'website' },
      { property: 'og:title', content: openGraph.title || title },
      { property: 'og:description', content: openGraph.description || description },
      { property: 'og:image', content: openGraph.image || defaultImage },
      { property: 'og:url', content: openGraph.url || canonicalURL || siteUrl },
      { property: 'og:site_name', content: openGraph.siteName || 'TG Paywall | SotaJS' },
      { property: 'og:locale', content: openGraph.locale || 'en_US' },
      
      // Twitter Card
      { name: 'twitter:card', content: twitter.card || 'summary_large_image' },
      { name: 'twitter:title', content: twitter.title || title },
      { name: 'twitter:description', content: twitter.description || description },
      { name: 'twitter:image', content: twitter.image || defaultImage },
      twitter.site && { name: 'twitter:site', content: twitter.site },
      twitter.creator && { name: 'twitter:creator', content: twitter.creator },
      
      // Article specific
      article?.publishedTime && { property: 'article:published_time', content: article.publishedTime.toISOString() },
      article?.modifiedTime && { property: 'article:modified_time', content: article.modifiedTime.toISOString() },
      article?.author && { property: 'article:author', content: article.author },
      article?.section && { property: 'article:section', content: article.section },
      ...(article?.tags || []).map(tag => ({ property: 'article:tag', content: tag })),
      
      // Additional SEO
      { name: 'theme-color', content: '#0057FF' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black' },
    ].filter(Boolean),
    
    // Structured data (JSON-LD)
    scripts: generateStructuredData(props),
  };
};

const generateStructuredData = (props: SEOProps) => {
  const structuredData: any[] = [];
  
  // Organization schema
  structuredData.push({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TG Paywall',
    url: 'https://tg-paywall.sotajs.dev',
    logo: 'https://tg-paywall.sotajs.dev/logo.png',
    description: props.description,
    sameAs: [
      'https://github.com/maxdev1/sotajs',
      'https://t.me/sotajs_dev',
    ],
  });
  
  // SoftwareApplication schema
  structuredData.push({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TG Paywall Infrastructure',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Node.js, Bun',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: props.description,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      ratingCount: '47',
    },
  });
  
  // Article schema if article data is provided
  if (props.article) {
    structuredData.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: props.title,
      description: props.description,
      datePublished: props.article.publishedTime?.toISOString(),
      dateModified: props.article.modifiedTime?.toISOString(),
      author: {
        '@type': 'Person',
        name: props.article.author,
      },
      articleSection: props.article.section,
      keywords: props.article.tags?.join(', '),
    });
  }
  
  // FAQ schema (would need FAQ data passed in)
  // This can be extended based on actual FAQ content
  
  return structuredData.map(data => ({
    type: 'application/ld+json',
    children: JSON.stringify(data, null, 2),
  }));
};
