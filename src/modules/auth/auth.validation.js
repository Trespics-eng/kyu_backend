import { z } from 'zod';

const optionalNullableString = z.preprocess(
  (val) => (val === '' || val === null ? undefined : val),
  z.string().optional()
);

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address').transform((e) => e.trim().toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long').transform((n) => n.trim()),
  category: z.enum(['Student', 'Lecturer', 'University Staff', 'Business Owner', 'Community Member', 'Organisation']).default('Student'),
  school: optionalNullableString,
  department: optionalNullableString,
  course: optionalNullableString,
  year: optionalNullableString,
  avatar_url: optionalNullableString,
  color: optionalNullableString,
});

export const adminRegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  department: z.string().optional(),
  roleTitle: z.string().optional(),
  adminCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

