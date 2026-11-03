import { z } from 'zod';

export const createOpportunitySchema = z.object({
  title: z.string().min(2, 'Title is required'),
  org: z.string().min(1, 'Organisation is required'),
  type: z.string().default('Internships'),
  location: z.string().min(1, 'Location is required'),
  deadline: z.string().min(1, 'Deadline is required'),
  summary: z.string().min(10, 'Summary is required'),
  url: z.string().optional(),
});

