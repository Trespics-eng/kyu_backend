import { z } from 'zod';

export const createAccommodationSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  type: z.string().default('Hostel'),
  location: z.string().min(1, 'Location is required'),
  rent: z.coerce.number().positive('Rent must be greater than 0'),
  rooms: z.coerce.number().int().min(1).default(1),
  features: z.array(z.string()).optional(),
  image: z.string().optional(),
  contact: z.string().optional(),
});

