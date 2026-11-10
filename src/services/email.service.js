import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { brevo } from '../config/brevo.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function sendTransactionalEmail({ to, subject, html, text, attachments }) {
  if (!brevo || !env.BREVO_SENDER_EMAIL) {
    logger.warn('Email is not configured; notification was skipped');
    return { sent: false, reason: 'email_not_configured' };
  }

  try {
    const payload = {
      sender: { name: env.BREVO_SENDER_NAME || 'KyU Connect', email: env.BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    };
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      payload.attachment = attachments;
    }
    const response = await brevo.transactionalEmails.sendTransacEmail(payload);
    return { sent: true, messageId: response?.messageId || response?.body?.messageId };
  } catch (error) {
    logger.error({ err: error }, 'Brevo email delivery failed');
    return { sent: false, reason: 'provider_error' };
  }
}

/**
 * Send a welcome email to newly registered users via Brevo.
 * Includes the platform name (KyU Connect) and the official platform logo.
 */
export async function sendWelcomeEmail({ email, name, category }) {
  const firstName = (name || 'Member').trim().split(/\s+/)[0];
  const userCategory = category || 'Student';
  const appUrl = (env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();

  // Load platform logo for inline attachment
  let attachments = undefined;
  try {
    const candidates = [
      path.join(__dirname, '..', 'assets', 'logo.png'),
      path.resolve(__dirname, '../../../logo.png'),
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        const buffer = fs.readFileSync(cand);
        attachments = [
          {
            name: 'logo.png',
            content: buffer.toString('base64'),
          },
        ];
        break;
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Could not read logo image for welcome email');
  }

  const subject = `Welcome to KyU Connect, ${firstName}! 🎓`;
  const textContent = `Hello ${name},\n\nWelcome to KyU Connect! Your account has been created successfully as a ${userCategory}.\n\nKyU Connect brings our entire Kirinyaga University community together in one place:\n- Campus Discussions & News\n- Student Marketplace & Local Businesses\n- Community Issues & Student Support\n- Campus Events & Opportunities\n\nGet started now at: ${appUrl}\n\nBest regards,\nThe KyU Connect Team\nKirinyaga University`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to KyU Connect</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header with Logo and Brand -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; background: linear-gradient(135deg, #042f2e 0%, #0d9488 100%); text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <img src="cid:logo.png" alt="KyU Connect Logo" width="180" style="max-width: 180px; height: auto; display: block; margin: 0 auto 12px auto; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 750; letter-spacing: -0.5px;">KyU Connect</h1>
                    <p style="margin: 6px 0 0 0; color: #ccfbf1; font-size: 13px; font-weight: 500;">Connecting People. Sharing Ideas. Solving Problems.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Welcome Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #0f172a; font-weight: 700;">Welcome to the community, ${firstName}! 👋</h2>
              
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                We are thrilled to welcome you to <strong>KyU Connect</strong>. Your account has been registered successfully as a verified <strong>${userCategory}</strong>.
              </p>

              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                KyU Connect is Kirinyaga University's central digital hub designed for students, lecturers, staff, and our surrounding community.
              </p>

              <!-- Feature Highlights Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="margin-bottom: 12px; font-size: 14px; color: #0f172a;">
                      <span style="font-size: 16px; margin-right: 8px;">💬</span>
                      <strong>Campus Feed:</strong> Share ideas, discuss coursework, and stay informed with real-time news.
                    </div>
                    <div style="margin-bottom: 12px; font-size: 14px; color: #0f172a;">
                      <span style="font-size: 16px; margin-right: 8px;">🛍️</span>
                      <strong>Marketplace:</strong> Buy and sell textbooks, electronics, and discover student-run businesses.
                    </div>
                    <div style="margin-bottom: 12px; font-size: 14px; color: #0f172a;">
                      <span style="font-size: 16px; margin-right: 8px;">🚨</span>
                      <strong>Community Issues:</strong> Report campus challenges and track resolutions with relevant authorities.
                    </div>
                    <div style="font-size: 14px; color: #0f172a;">
                      <span style="font-size: 16px; margin-right: 8px;">📅</span>
                      <strong>Events & Opportunities:</strong> Explore university activities, internships, and student clubs.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}" style="display: inline-block; background-color: #0d9488; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(13, 148, 136, 0.3);">
                      Open KyU Connect →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b; text-align: center;">
                Need help or have questions? Simply reply to this email or visit our Help & Feedback section on the platform.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; font-weight: 600;">
                KyU Connect — Kirinyaga University Community Platform
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                Kerugoya, Kirinyaga County, Kenya · Sent via Brevo
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendTransactionalEmail({
    to: email,
    subject,
    text: textContent,
    html: htmlContent,
    attachments,
  });
}

