import { z } from 'zod';

export const createBusinessSchema = z.object({
  name: z.string().min(2, 'Business name is required'),
  category: z.string().min(1, 'Category is required'),
  location: z.string().min(1, 'Location is required'),
  description: z.string().min(5, 'Description is required'),
  phone: z.string().min(8, 'Phone number is required'),
  whatsapp: z.string().optional(),
  price: z.string().optional(),
  hours: z.string().optional(),
  image: z.string().optional(),
  products: z.array(z.string()).optional(),
  student: z.boolean().default(true),
});

export const addProductsSchema = z.object({
  products: z.array(z.string().min(1)),
});

