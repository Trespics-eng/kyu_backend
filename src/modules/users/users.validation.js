import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.string().optional(),
  category: z.enum(['Student', 'Lecturer', 'University Staff', 'Business Owner', 'Community Member', 'Organisation']).optional(),
  department: z.string().optional(),
  school: z.string().optional(),
  course: z.string().optional(),
  year: z.string().optional(),
  avatar_url: z.string().optional(),
  color: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  interests: z.array(z.string()).optional(),
});

export const updateSettingsSchema = z.object({
  public_profile: z.boolean().optional(),
  show_course: z.boolean().optional(),
  allow_messages: z.boolean().optional(),
  issue_updates: z.boolean().optional(),
  event_notices: z.boolean().optional(),
  weekly_digest: z.boolean().optional(),
  reduced_motion: z.boolean().optional(),
});

