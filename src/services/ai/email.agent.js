import { google } from 'googleapis';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { encryptText, decryptText } from '../encryption.service.js';
import { aiOrchestrator } from './ai.orchestrator.js';
import crypto from 'node:crypto';

export class EmailIntelligenceAgent {
  /**
   * Generates OAuth Authorization URL for Gmail
   */
  getGoogleAuthUrl(userId, emailAddress) {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Gmail authorization is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the backend environment.');
    }

    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      `${env.FRONTEND_URL}/api/v1/ai/email/callback`
    );

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/gmail.readonly', 'openid', 'email'],
      state: this.createOAuthState(userId, emailAddress),
      login_hint: emailAddress,
    });
  }

  createOAuthState(userId, emailAddress) {
    const payload = Buffer.from(JSON.stringify({ userId, emailAddress, issuedAt: Date.now() })).toString('base64url');
    const signature = crypto.createHmac('sha256', env.ENCRYPTION_SECRET).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  readOAuthState(state) {
    const [payload, signature] = String(state || '').split('.');
    if (!payload || !signature) throw new Error('Invalid Gmail authorization state.');
    const expected = crypto.createHmac('sha256', env.ENCRYPTION_SECRET).update(payload).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error('Invalid Gmail authorization state.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!decoded.userId || !decoded.emailAddress || Date.now() - decoded.issuedAt > 10 * 60 * 1000) throw new Error('Gmail authorization request expired. Please try again.');
    return decoded;
  }

  /**
   * Evaluates an email body to determine whether it is a public university/community announcement
   */
  async analyzeEmailContent(emailPayload) {
    const rawContent = aiOrchestrator.sanitizeAndWrapUntrustedInput(
      `Subject: ${emailPayload.subject}\nFrom: ${emailPayload.from}\nDate: ${emailPayload.date}\nBody: ${emailPayload.body}`
    );

    const systemPrompt = `You are the KyU-Konnekt Email Privacy and Announcement Classifier.
Analyze this email. Strictly enforce these privacy rules:
1. Is it personal correspondence or private conversation? If YES, set is_public_announcement to FALSE and discard.
2. Does it contain sensitive personal data, grades, passwords, or confidential disciplinary letters? If YES, set is_public_announcement to FALSE.
3. Only classify as TRUE for a scholarship or bursary opportunity, hackathon or public innovation competition, or an official announcement/notice that materially affects students, the university, or the public. Ignore routine personal, transactional, promotional, and unrelated emails.
Return ONLY valid JSON:
{
  "is_public_announcement": boolean,
  "category": "Scholarship" | "Hackathon" | "Public Announcement" | "Other",
  "title": string,
  "summary": string,
  "affected_people": string,
  "required_actions": string,
  "confidence_score": number,
  "privacy_flag": string
}`;

    const userPrompt = `Email Data:\n${rawContent}\n\nClassify and extract JSON:`;

    const fallback = () => {
      const text = `${emailPayload.subject || ''} ${emailPayload.body || ''}`.toLowerCase();
      const from = String(emailPayload.from || '').toLowerCase();
      const trustedSender = /@[^\s>]*(?:kyu\.ac\.ke|helb\.co\.ke|\.go\.ke)/i.test(from);
      const isScholarship = /scholarship|bursary|helb|financial aid/.test(text);
      const isHackathon = /hackathon|innovation challenge|coding challenge/.test(text);
      const isAnnouncement = /announcement|public notice|important notice/.test(text);
      const isOfficial = trustedSender && (isScholarship || isHackathon || isAnnouncement);

      return {
        is_public_announcement: Boolean(isOfficial),
        category: isScholarship ? 'Scholarship' : isHackathon ? 'Hackathon' : isAnnouncement ? 'Public Announcement' : 'Other',
        title: emailPayload.subject,
        summary: emailPayload.body?.slice(0, 200) || '',
        affected_people: 'Kirinyaga University Students',
        required_actions: 'Review notice',
        confidence_score: isOfficial ? 0.88 : 0.40,
        privacy_flag: isOfficial ? 'None' : 'Private correspondence',
      };
    };

    return await aiOrchestrator.generateStructuredResponse({
      systemPrompt,
      userPrompt,
      agentSlug: 'email_intelligence',
      taskType: 'extraction',
      mockFallback: fallback,
    });
  }

  async completeGoogleAuthorization(code, state) {
    const { userId, emailAddress: expectedEmail } = this.readOAuthState(state);
    const oauth2Client = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, `${env.FRONTEND_URL}/api/v1/ai/email/callback`);
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) throw new Error('Google did not return a refresh token. Revoke the prior grant in Google Account settings and authorize again.');
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const { data: profile } = await gmail.users.getProfile({ userId: 'me' });
    const actualEmail = String(profile.emailAddress || '').toLowerCase();
    if (actualEmail !== expectedEmail.toLowerCase()) throw new Error(`Authorized account ${actualEmail || '(unknown)'} does not match ${expectedEmail}.`);
    return this.registerConnectedAccount(userId, 'gmail', actualEmail, tokens.refresh_token, tokens.access_token, tokens.scope?.split(' ') || []);
  }

  async scanAuthorizedMailbox(userId, integrationId) {
    const supabase = getSupabaseAdmin();
    const { data: integration, error } = await supabase.from('ai_user_integrations').select('*').eq('id', integrationId).eq('user_id', userId).eq('provider', 'gmail').eq('status', 'connected').maybeSingle();
    if (error) throw error;
    if (!integration) throw new Error('Connected Gmail account not found.');
    const oauth2Client = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, `${env.FRONTEND_URL}/api/v1/ai/email/callback`);
    oauth2Client.setCredentials({ refresh_token: decryptText(integration.encrypted_refresh_token) });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const { data: messages } = await gmail.users.messages.list({ userId: 'me', maxResults: 40, q: 'newer_than:30d {scholarship bursary HELB hackathon announcement notice}' });
    const findings = [];
    for (const message of messages.messages || []) {
      const { data } = await gmail.users.messages.get({ userId: 'me', id: message.id, format: 'full' });
      const headers = data.payload?.headers || [];
      const header = (name) => headers.find((h) => h.name?.toLowerCase() === name)?.value || '';
      const parts = [];
      const visit = (part) => {
        if (part.mimeType === 'text/plain' && part.body?.data) parts.push(Buffer.from(part.body.data, 'base64url').toString('utf8'));
        for (const child of part.parts || []) visit(child);
      };
      visit(data.payload || {});
      const body = parts.join('\n').replace(/\s+/g, ' ').trim().slice(0, 12000);
      const payload = { subject: header('subject'), from: header('from'), date: header('date'), body };
      const result = await this.analyzeEmailContent(payload);
      if (['Scholarship', 'Hackathon', 'Public Announcement'].includes(result.category) && result.is_public_announcement && Number(result.confidence_score || 0) >= 0.7) {
        findings.push({ id: data.id, category: result.category, title: result.title || payload.subject, summary: result.summary, from: payload.from, date: payload.date, required_actions: result.required_actions, confidence_score: result.confidence_score });
      }
    }
    await supabase.from('ai_user_integrations').update({ last_checked_at: new Date().toISOString() }).eq('id', integration.id);
    return findings;
  }

  /**
   * Saves or updates connected account with encrypted tokens
   */
  async registerConnectedAccount(userId, provider, emailAddress, refreshToken, accessToken = null, scopes = []) {
    const supabase = getSupabaseAdmin();
    const encryptedRefresh = encryptText(refreshToken);
    const encryptedAccess = accessToken ? encryptText(accessToken) : null;

    const { data, error } = await supabase
      .from('ai_user_integrations')
      .upsert({
        user_id: userId,
        provider,
        email_address: emailAddress,
        encrypted_refresh_token: encryptedRefresh,
        encrypted_access_token: encryptedAccess,
        scopes,
        status: 'connected',
        last_checked_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider,email_address' })
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to save email integration');
      throw error;
    }

    return {
      id: data.id,
      provider: data.provider,
      emailAddress: data.email_address,
      status: data.status,
      sharingPreferences: data.sharing_preferences,
    };
  }

  /**
   * Disconnects an email account
   */
  async disconnectAccount(userId, integrationId) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('ai_user_integrations')
      .delete()
      .eq('id', integrationId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }
}

export const emailIntelligenceAgent = new EmailIntelligenceAgent();

