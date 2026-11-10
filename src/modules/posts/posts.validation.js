import { z } from 'zod';

export const createPostSchema = z.object({
  body: z.string().max(10000).optional().default(''),
  category: z.enum(['Campus Life', 'Academics', 'Community Issues', 'Business', 'Opportunities', 'Events', 'Blogs']).default('Campus Life'),
  type: z.enum(['Discussion', 'Question', 'Announcement', 'Text', 'Photo', 'Video']).default('Discussion'),
  media_url: z.string().url().refine((value) => /^https?:\/\//i.test(value), 'Media URLs must use HTTP or HTTPS.').optional().or(z.literal('')),
  media_type: z.enum(['image', 'video', 'link']).optional(),
}).refine((post) => post.body.trim().length > 0 || Boolean(post.media_url), 'Add post content or attach media.');

export const addCommentSchema = z.object({
  text: z.string().min(1, 'Comment text is required'),
});

