import { z } from 'zod';

export const createPostSchema = z.object({
  body: z.string().min(1, 'Post content cannot be empty'),
  category: z.enum(['Campus Life', 'Academics', 'Community Issues', 'Business', 'Opportunities', 'Events', 'Blogs']).default('Campus Life'),
  type: z.enum(['Discussion', 'Question', 'Announcement', 'Text', 'Photo', 'Video']).default('Discussion'),
  media_url: z.string().optional(),
  media_type: z.enum(['image', 'video']).optional(),
});

export const addCommentSchema = z.object({
  text: z.string().min(1, 'Comment text is required'),
});

