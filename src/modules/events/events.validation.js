import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  category: z.string().default('Community Events'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  location: z.string().min(1, 'Location is required'),
  host: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  registration: z.string().optional(),
  contact: z.string().optional(),
});

