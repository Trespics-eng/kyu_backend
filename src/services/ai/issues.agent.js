import { getSupabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../config/logger.js';
import { aiOrchestrator } from './ai.orchestrator.js';

export class IssuesIntelligenceAgent {
  /**
   * Analyzes an issue report and matches it with verified authorities
   */
  async analyzeIssue(issue, { persist = true } = {}) {
    const supabase = getSupabaseAdmin();

    // 1. Fetch verified authorities directory
    const { data: authorities } = await supabase.from('ai_authorities').select('*');
    const authoritySummaries = (authorities || []).map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      mandate: a.mandate,
      phone: a.phone,
      website: a.website,
      email: a.email,
      office: a.physical_office,
      reporting_instructions: a.reporting_instructions,
      reporting_instructions: a.reporting_instructions,
    }));

    const untrustedDescription = aiOrchestrator.sanitizeAndWrapUntrustedInput(
      `Title: ${issue.title}\nCategory: ${issue.category}\nLocation: ${issue.location}\nDescription: ${issue.description}`
    );

    const systemPrompt = `You are the KyU-Konnekt Public Accountability and Issue Routing Specialist.
Your job is to match a citizen/student issue report to the exact, verified authority that possesses legal jurisdiction to resolve it.
List of verified authorities available:
${JSON.stringify(authoritySummaries, null, 2)}

Rules:
1. If this issue describes an immediate life-threatening emergency (e.g. active violence, violent robbery, severe fire), immediately refer to National Police Service (999/112) or Emergency Services.
2. Select the single best matching primary_authority_id and an optional secondary_authority_id from the provided list.
3. If no authority matches with high confidence, state that clearly and advise on general civic reporting.
4. Provide practical, step-by-step instructions on what evidence to prepare (e.g. photos, meter numbers, timestamps) and how to file a formal complaint.
5. Never invent phone numbers or reporting procedures not in the authority directory.

Return ONLY valid JSON:
{
  "issue_classification": string,
  "affected_location": string,
  "primary_authority_id": string or null,
  "secondary_authority_id": string or null,
  "relevance_explanation": string,
  "recommended_steps": string,
  "official_reporting_link": string or null,
  "contact_details": {
    "phone": string or null,
    "email": string or null,
    "office": string or null
  },
  "evidence_needed": string,
  "confidence_score": number,
  "is_emergency": boolean
}`;

    const userPrompt = `Issue Details:
${untrustedDescription}

Generate classification and recommendation JSON:`;

    const fallback = () => {
      const lower = `${issue.title} ${issue.description} ${issue.category}`.toLowerCase();
      let matchedAuth = (authorities || []).find((a) => {
        if (lower.includes('water') || lower.includes('pipe')) return a.category === 'Water';
        if (lower.includes('power') || lower.includes('blackout') || lower.includes('electric') || lower.includes('transformer')) return a.category === 'Electricity';
        if (lower.includes('road') || lower.includes('pothole') || lower.includes('highway')) return a.category === 'Roads';
        if (lower.includes('exam') || lower.includes('fee') || lower.includes('hostel') || lower.includes('campus')) return a.category === 'University';
        if (lower.includes('police') || lower.includes('theft') || lower.includes('crime') || lower.includes('attack')) return a.category === 'Security';
        return false;
      });

      if (!matchedAuth && authorities?.length) matchedAuth = authorities[0];

      return {
        issue_classification: issue.category || 'General Civic Issue',
        affected_location: issue.location || 'Kirinyaga',
        primary_authority_id: matchedAuth?.id || null,
        secondary_authority_id: null,
        relevance_explanation: matchedAuth
          ? `${matchedAuth.name} holds mandate over ${matchedAuth.category} in this jurisdiction.`
          : 'Referred to general county administration.',
        recommended_steps: matchedAuth?.reporting_instructions || '1. Document the dates and affected residents.\n2. Contact the responsible authority using its official contact details.\n3. Request and keep a reference number.',
        official_reporting_link: matchedAuth?.website || matchedAuth?.official_portal || null,
        contact_details: {
          phone: matchedAuth?.phone || null,
          email: matchedAuth?.email || null,
          office: matchedAuth?.physical_office || null,
        },
        evidence_needed: 'Photographs of the location, account/meter number, and written statement of affected households.',
        confidence_score: 0.90,
        is_emergency: lower.includes('emergency') || lower.includes('attack'),
      };
    };

    const result = await aiOrchestrator.generateStructuredResponse({
      systemPrompt,
      userPrompt,
      agentSlug: 'issues_intelligence',
      taskType: 'recommendation',
      isComplex: true,
      mockFallback: fallback,
    });

    // Save recommendation to database
    if (!persist) {
      return {
        ...result,
        primary_authority: authorities?.find((authority) => authority.id === result.primary_authority_id) || null,
        secondary_authority: authorities?.find((authority) => authority.id === result.secondary_authority_id) || null,
      };
    }

    const { data: savedRec, error: recErr } = await supabase
      .from('ai_issue_recommendations')
      .insert({
        issue_id: issue.id,
        primary_authority_id: result.primary_authority_id,
        secondary_authority_id: result.secondary_authority_id,
        issue_classification: result.issue_classification || issue.category,
        affected_location: result.affected_location || issue.location,
        relevance_explanation: result.relevance_explanation || '',
        recommended_steps: result.recommended_steps || '',
        official_reporting_link: result.official_reporting_link,
        contact_details: result.contact_details || {},
        evidence_needed: result.evidence_needed || '',
        confidence_score: result.confidence_score || 0.85,
      })
      .select(`
        *,
        primary_authority:ai_authorities!primary_authority_id(*),
        secondary_authority:ai_authorities!secondary_authority_id(*)
      `)
      .single();

    if (recErr) {
      logger.error({ recErr }, 'Failed to save issue recommendation');
    }

    return savedRec || result;
  }
}

export const issuesIntelligenceAgent = new IssuesIntelligenceAgent();

