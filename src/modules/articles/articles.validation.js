import { z } from 'zod';

export const createArticleSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, 'Title is required'),
  excerpt: z.string().optional(),
  body: z.string().min(10, 'Body content is required'),
  category: z.string().default('Campus Life'),
  tags: z.string().optional(),
  image: z.string().optional(),
  publish: z.boolean().default(true),
});

export const addArticleCommentSchema = z.object({
  text: z.string().min(1, 'Comment text is required'),
});

