import { z } from 'zod';

export const startConversationSchema = z.object({
  recipientId: z.string().uuid(),
});

export const sendMessageSchema = z.object({
  body: z.string().optional(),
  attachment_url: z.string().optional(),
});

