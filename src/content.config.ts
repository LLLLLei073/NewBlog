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
    /** 文章系列名：同名的文章会在底部显示「本系列」导航。 */
    series: z.string().optional(),
    draft: z.boolean().default(false),
    /** 页面保留公开访问，但暂不建议搜索引擎收录。 */
    noindex: z.boolean().default(false),

    /* ---- 以下为「演算手稿」算法专栏字段(全部可选) ---- */
    /** 算法主题(见 src/data/algorithm/topics.ts)。 */
    topic: z
      .enum([
        'ds',
        'search-sort',
        'graph',
        'dp',
        'greedy',
        'string',
        'math-bit',
      ])
      .optional(),
    /** 难度:beginner 入门 | intermediate 中等 | advanced 进阶。 */
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    /** 整理状态:done 已整理 | reviewing 复习中 | todo 待补充。 */
    status: z.enum(['done', 'reviewing', 'todo']).optional(),
    /** 三位档案编号,如 '047'。 */
    fileNo: z.string().optional(),
    /** 核心结论一句话(列表展开时显示)。 */
    takeaway: z.string().optional(),
    /** 时间复杂度,如 'O(log n)'。 */
    timeComplexity: z.string().optional(),
    /** 空间复杂度,如 'O(1)'。 */
    spaceComplexity: z.string().optional(),
    /** 前置知识(文章侧栏展示)。 */
    prerequisites: z.array(z.string()).optional(),
    /** 相关题目或参考来源。 */
    refs: z.array(z.string()).optional(),
    /** 交互步骤演示器 id(见 src/data/algorithm/demos.ts)。 */
    demo: z.string().optional(),
  }),
});

export const collections = { blog };
