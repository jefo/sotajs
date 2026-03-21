import { defineConfig } from 'astro-robots-txt/config';

export default defineConfig({
  policies: [
    {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/dashboard/',
        '/*.json$',
      ],
    },
    {
      userAgent: 'Googlebot',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
      ],
    },
    {
      userAgent: 'Yandex',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
      ],
    },
  ],
  sitemap: 'https://tg-paywall.sotajs.dev/sitemap-index.xml',
});
