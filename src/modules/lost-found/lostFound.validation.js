import { z } from 'zod';

export const createLostFoundSchema = z.object({
  name: z.string().min(2, 'Item name is required'),
  status: z.enum(['Lost', 'Found']).default('Lost'),
  location: z.string().min(1, 'Location is required'),
  date: z.string().optional(),
  description: z.string().min(5, 'Description is required'),
  image: z.string().optional(),
  contact: z.string().optional(),
});

