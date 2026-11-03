import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.enum(['Student', 'Lecturer', 'University Staff', 'Business Owner', 'Community Member', 'Organisation']).default('Student'),
  school: z.string().optional(),
  department: z.string().optional(),
  course: z.string().optional(),
  year: z.string().optional(),
  avatar_url: z.string().optional(),
  color: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

