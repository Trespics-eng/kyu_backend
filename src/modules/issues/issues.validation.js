import { z } from 'zod';

export const createIssueSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  category: z.string().min(1, 'Category is required'),
  location: z.string().min(1, 'Location is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  observedDate: z.string().optional(),
  observedTime: z.string().optional(),
  confidential: z.boolean().default(false),
  media_url: z.string().optional(),
  attachment_name: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const addIssueCommentSchema = z.object({
  text: z.string().min(1, 'Comment text is required'),
});

export const updateStatusSchema = z.object({
  status: z.enum(['Submitted', 'Under Review', 'Forwarded to Relevant Authority', 'In Progress', 'Resolved', 'Closed']),
  note: z.string().optional(),
});

