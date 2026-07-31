import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    /** 所属专栏：algorithm | math | music | game；未填则归入「其他」。 */
    category: z.enum(['algorithm', 'math', 'music', 'game']).optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
