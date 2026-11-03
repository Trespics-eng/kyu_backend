import { brevo } from '../config/brevo.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export async function sendTransactionalEmail({ to, subject, html, text }) {
  if (!brevo || !env.BREVO_SENDER_EMAIL) {
    logger.warn('Email is not configured; notification was skipped');
    return { sent: false, reason: 'email_not_configured' };
  }

  try {
    const response = await brevo.transactionalEmails.sendTransacEmail({
      sender: { name: env.BREVO_SENDER_NAME, email: env.BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    });
    return { sent: true, messageId: response.body?.messageId };
  } catch (error) {
    logger.error({ err: error }, 'Brevo email delivery failed');
    return { sent: false, reason: 'provider_error' };
  }
}
