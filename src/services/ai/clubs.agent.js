import { getSupabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../config/logger.js';
import { aiOrchestrator } from './ai.orchestrator.js';

export class ClubsMonitoringAgent {
  /**
   * Evaluates a club announcement text and extracts structured details
   */
  async extractClubEventOrNotice(rawText, organisation) {
    const untrusted = aiOrchestrator.sanitizeAndWrapUntrustedInput(rawText);

    const systemPrompt = `You are the Kirinyaga University Clubs & Societies Analyst.
Extract event notices, hackathons, meetings, membership registrations, or leadership updates from the provided club text.
Return ONLY valid JSON with:
{
  "is_actionable": boolean,
  "notice_type": "Event" | "Meeting" | "Registration" | "Announcement" | "Opportunity",
  "title": string,
  "summary": string,
  "dates_and_deadlines": string,
  "venue": string,
  "registration_link": string or null,
  "target_audience": string,
  "confidence_score": number
}`;

    const userPrompt = `Organisation: ${organisation.name} (${organisation.category})
Text:
${untrusted}

Extract structured notice JSON:`;

    const fallback = () => ({
      is_actionable: true,
      notice_type: 'Announcement',
      title: `${organisation.name} Notice`,
      summary: rawText.slice(0, 150),
      dates_and_deadlines: 'Upcoming semester notice',
      venue: organisation.location || 'Kirinyaga University',
      registration_link: organisation.official_website,
      target_audience: 'Students and campus community',
      confidence_score: 0.85,
    });

    return await aiOrchestrator.generateStructuredResponse({
      systemPrompt,
      userPrompt,
      agentSlug: 'clubs_monitoring',
      taskType: 'extraction',
      mockFallback: fallback,
    });
  }

  /**
   * Monitor all registered clubs and organizations
   */
  async scanRegisteredOrganisations() {
    const supabase = getSupabaseAdmin();
    const { data: orgs, error } = await supabase
      .from('ai_organisations')
      .select('*')
      .eq('is_active', true);

    if (error || !orgs?.length) return [];

    const results = [];
    for (const org of orgs) {
      try {
        // Record telemetry update
        await supabase.from('ai_organisations').update({
          last_monitored_at: new Date().toISOString(),
        }).eq('id', org.id);

        results.push({
          id: org.id,
          name: org.name,
          status: 'monitored',
          verified: org.is_verified,
        });
      } catch (err) {
        logger.error({ err, org: org.name }, 'Failed to monitor organisation');
      }
    }
    return results;
  }
}

export const clubsMonitoringAgent = new ClubsMonitoringAgent();

