import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
    author: z.string(),
    readingTime: z.string().default('5 min read'),
    // E-EAT: Expertise signals
    expertise: z.enum(['technical', 'business', 'case-study', 'tutorial']).default('technical'),
    // For demonstrating first-hand experience
    includesCodeExamples: z.boolean().default(false),
    includesRealData: z.boolean().default(false),
  }),
});

const authorCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    title: z.string(),
    avatar: z.string().optional(),
    bio: z.string(),
    // E-EAT: Authoritativeness & Trustworthiness signals
    credentials: z.array(z.string()).default([]),
    socialLinks: z.object({
      github: z.string().optional(),
      twitter: z.string().optional(),
      linkedin: z.string().optional(),
      telegram: z.string().optional(),
    }).default({}),
    expertise: z.array(z.string()).default([]),
    yearsOfExperience: z.number().default(0),
  }),
});

const caseStudyCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    heroImage: z.string().optional(),
    // Client/Business info
    clientName: z.string().optional(),
    clientIndustry: z.string().optional(),
    // Challenge & Solution
    challenge: z.string(),
    solution: z.string(),
    // Results (quantifiable metrics for trustworthiness)
    results: z.array(z.object({
      metric: z.string(),
      value: z.string(),
      improvement: z.string().optional(),
    })).default([]),
    // Tech stack used
    techStack: z.array(z.string()).default([]),
    // Testimonial
    testimonial: z.object({
      quote: z.string(),
      author: z.string(),
      role: z.string(),
    }).optional(),
    tags: z.array(z.string()).default([]),
  }),
});

const faqCollection = defineCollection({
  type: 'content',
  schema: z.object({
    question: z.string(),
    answer: z.string(),
    category: z.enum(['technical', 'pricing', 'security', 'integration', 'general']).default('general'),
    order: z.number().default(0),
    // Schema.org FAQ markup support
    featured: z.boolean().default(false),
  }),
});

export const collections = {
  'blog': blogCollection,
  'author': authorCollection,
  'case-study': caseStudyCollection,
  'faq': faqCollection,
};
