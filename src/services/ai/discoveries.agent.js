import { getSupabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../config/logger.js';
import { aiOrchestrator } from './ai.orchestrator.js';

export class OpportunitiesAndEventsAgent {
  /**
   * Evaluates text for scholarship/job opportunity and structures it
   */
  async extractOpportunity(rawText, source) {
    const untrusted = aiOrchestrator.sanitizeAndWrapUntrustedInput(rawText);

    const systemPrompt = `You are the KyU Career & Opportunity Intelligence Analyst.
Extract scholarship, internship, attachment, or employment details.
Never invent deadlines or application links.
Return ONLY valid JSON:
{
  "is_opportunity": boolean,
  "title": string,
  "org": string,
  "type": "Internship" | "Scholarship" | "Job" | "Attachment" | "Training" | "Grant",
  "location": string,
  "deadline": string,
  "summary": string,
  "url": string or null,
  "confidence_score": number
}`;

    const userPrompt = `Source: ${source?.name || 'Public Announcement'}
Text:
${untrusted}

Extract opportunity JSON:`;

    const fallback = () => ({
      is_opportunity: true,
      title: 'Opportunity Announcement',
      org: source?.name || 'Kirinyaga University / Partner',
      type: 'Scholarship',
      location: 'Kirinyaga / Remote',
      deadline: 'Refer to source',
      summary: rawText.slice(0, 200),
      url: source?.url || null,
      confidence_score: 0.85,
    });

    return await aiOrchestrator.generateStructuredResponse({
      systemPrompt,
      userPrompt,
      agentSlug: 'accommodation_events',
      taskType: 'extraction',
      mockFallback: fallback,
    });
  }

  /**
   * Evaluates text for campus or community event
   */
  async extractEvent(rawText, source) {
    const untrusted = aiOrchestrator.sanitizeAndWrapUntrustedInput(rawText);

    const systemPrompt = `You are the KyU Events Intelligence Analyst.
Extract upcoming campus, tech, academic, or county events.
Never invent dates or venues.
Return ONLY valid JSON:
{
  "is_event": boolean,
  "title": string,
  "category": "Academic" | "Technology" | "Sports" | "Career" | "Community",
  "date": string,
  "time": string,
  "location": string,
  "host": string,
  "description": string,
  "registration": string or null,
  "confidence_score": number
}`;

    const userPrompt = `Source: ${source?.name || 'Public Announcement'}
Text:
${untrusted}

Extract event JSON:`;

    const fallback = () => ({
      is_event: true,
      title: 'Upcoming Community Event',
      category: 'Technology',
      date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      time: '10:00 AM - 1:00 PM',
      location: 'Kirinyaga University Main Hall',
      host: source?.name || 'Campus Organizing Committee',
      description: rawText.slice(0, 250),
      registration: source?.url || null,
      confidence_score: 0.85,
    });

    return await aiOrchestrator.generateStructuredResponse({
      systemPrompt,
      userPrompt,
      agentSlug: 'accommodation_events',
      taskType: 'extraction',
      mockFallback: fallback,
    });
  }

  /**
   * Promotes an extracted opportunity directly to the opportunities table
   */
  async publishOpportunity(opportunityData, creatorId) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('opportunities')
      .insert({
        creator_id: creatorId,
        title: opportunityData.title,
        org: opportunityData.org,
        type: opportunityData.type || 'Internship',
        location: opportunityData.location || 'Kirinyaga',
        deadline: opportunityData.deadline || 'Open until filled',
        summary: opportunityData.summary,
        url: opportunityData.url,
        is_verified: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const opportunitiesAndEventsAgent = new OpportunitiesAndEventsAgent();

