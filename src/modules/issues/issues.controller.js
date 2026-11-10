import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { issuesIntelligenceAgent } from '../../services/ai/issues.agent.js';
import { createNotification } from '../../services/notification.service.js';

async function prepareGuidance(issue, persist) {
  try {
    return await issuesIntelligenceAgent.analyzeIssue(issue, { persist });
  } catch {
    return {
      issue_classification: issue.category || 'Community issue',
      affected_location: issue.location,
      recommended_steps: 'Your report has been received for review. Keep a note of when and where the issue occurred. The community administration team will follow up with routing guidance.',
      evidence_needed: 'Keep relevant photos, dates, reference or account numbers, and any responses from the responsible authority.',
      contact_details: {}, confidence_score: 0, is_emergency: false,
    };
  }
}

function guidanceMessage(guidance) {
  const parts = [guidance.recommended_steps];
  if (guidance.contact_details?.phone) parts.push(`Contact: ${guidance.contact_details.phone}`);
  if (guidance.contact_details?.email) parts.push(`Email: ${guidance.contact_details.email}`);
  if (guidance.official_reporting_link) parts.push(`Official reporting: ${guidance.official_reporting_link}`);
  if (guidance.evidence_needed) parts.push(`Prepare: ${guidance.evidence_needed}`);
  return parts.filter(Boolean).join('\n');
}

export async function getIssues(req, res, next) {
  try {
    const { category, status, search } = req.query;
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('issues')
      .select('*')
      .order('created_at', { ascending: false });

    if (category && category !== 'All categories') {
      query = query.eq('category', category);
    }

    if (status && status !== 'All statuses') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: rawIssues, error } = await query;
    if (error) return sendError(res, error.message, 500);

    const reporterIds = [...new Set((rawIssues || []).map((issue) => issue.reporter_id).filter(Boolean))];
    let reporterById = new Map();
    if (reporterIds.length) {
      const { data: reporters } = await supabase.from('profiles').select('id,name,role').in('id', reporterIds);
      reporterById = new Map((reporters || []).map((reporter) => [reporter.id, reporter]));
    }

    let supportedIds = new Set();
    let followedIds = new Set();

    if (req.user?.id) {
      const issueIds = (rawIssues || []).map((i) => i.id);
      if (issueIds.length > 0) {
        const [supportRes, followRes] = await Promise.all([
          supabase.from('issue_supporters').select('issue_id').eq('user_id', req.user.id).in('issue_id', issueIds),
          supabase.from('issue_followers').select('issue_id').eq('user_id', req.user.id).in('issue_id', issueIds),
        ]);
        supportedIds = new Set((supportRes.data || []).map((r) => r.issue_id));
        followedIds = new Set((followRes.data || []).map((f) => f.issue_id));
      }
    }

    const formatted = (rawIssues || []).map((issue) => ({
      id: issue.id,
      title: issue.title,
      category: issue.category,
      location: issue.location,
      description: issue.description,
      status: issue.status,
      date: issue.observed_date ? `${issue.observed_date} · ${issue.observed_time || ''}`.trim() : new Date(issue.created_at).toLocaleDateString(),
      support: issue.support_count,
      comments: issue.comments_count,
      reporter: reporterById.get(issue.reporter_id)?.name || 'Community member',
      reporterDetails: reporterById.get(issue.reporter_id) || null,
      image: issue.media_url,
      attachment: issue.media_url,
      attachmentName: issue.attachment_name,
      isSupported: supportedIds.has(issue.id),
      isFollowed: followedIds.has(issue.id),
      latitude: issue.latitude,
      longitude: issue.longitude,
    }));

    return sendSuccess(res, formatted, 'Issues retrieved successfully.');
  } catch (err) {
    return next(err);
  }
}

export async function createIssue(req, res, next) {
  try {
    const userId = req.user.id;
    const { title, category, location, description, observedDate, observedTime, confidential, media_url, attachment_name, latitude, longitude } = req.body;
    const supabase = getSupabaseAdmin();

    if (confidential) {
      const { data, error } = await supabase
        .from('confidential_reports')
        .insert({
          reporter_id: userId,
          title,
          category,
          location,
          description,
          observed_date: observedDate || null,
          observed_time: observedTime || null,
          attachment_url: media_url || null,
          attachment_name: attachment_name || null,
          status: 'Submitted',
        })
        .select()
        .single();

      if (error) return sendError(res, error.message, 500);
      const guidance = await prepareGuidance(data, false);
      const message = guidanceMessage(guidance);
      await createNotification({ userId, title: `Guidance for your ${guidance.issue_classification || 'issue'} report`, body: message, link: '/issues' });
      return sendSuccess(res, { ...data, guidance }, 'Your confidential report was submitted privately. Guidance has been sent to you.', null, 201);
    }

    const { data: issue, error } = await supabase
      .from('issues')
      .insert({
        reporter_id: userId,
        title,
        category,
        location,
        description,
        observed_date: observedDate || null,
        observed_time: observedTime || null,
        media_url: media_url || null,
        attachment_name: attachment_name || null,
        latitude: latitude || null,
        longitude: longitude || null,
        status: 'Submitted',
      })
      .select(`
        *,
        reporter:profiles(id, name, initials, color, role)
      `)
      .single();

    if (error) return sendError(res, error.message, 500);

    // Initial status history entry
    try {
      await supabase.from('issue_status_history').insert({
        issue_id: issue.id,
        actor_id: userId,
        to_status: 'Submitted',
        note: 'Issue reported to KyU Community.',
      });
    } catch {}

    const guidance = await prepareGuidance(issue, true);
    const message = guidanceMessage(guidance);
    await createNotification({ userId, title: `Guidance for your ${guidance.issue_classification || 'issue'} report`, body: message, link: '/issues' });
    return sendSuccess(res, { ...issue, guidance }, 'Your community report was submitted and private guidance was sent to you.', null, 201);
  } catch (err) {
    return next(err);
  }
}

export async function getMyConfidentialReports(req, res, next) {
  try {
    const userId = req.user.id;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('confidential_reports')
      .select('*')
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false });

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, data || [], 'Confidential reports retrieved.');
  } catch (err) {
    return next(err);
  }
}

export async function toggleSupport(req, res, next) {
  try {
    const userId = req.user.id;
    const issueId = req.params.id;
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from('issue_supporters')
      .select('issue_id')
      .eq('issue_id', issueId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('issue_supporters').delete().eq('issue_id', issueId).eq('user_id', userId);
      return sendSuccess(res, { supported: false }, 'Support removed.');
    } else {
      await supabase.from('issue_supporters').insert({ issue_id: issueId, user_id: userId });
      return sendSuccess(res, { supported: true }, 'Issue supported.');
    }
  } catch (err) {
    return next(err);
  }
}

export async function toggleFollow(req, res, next) {
  try {
    const userId = req.user.id;
    const issueId = req.params.id;
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from('issue_followers')
      .select('issue_id')
      .eq('issue_id', issueId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('issue_followers').delete().eq('issue_id', issueId).eq('user_id', userId);
      return sendSuccess(res, { followed: false }, 'Unfollowed issue updates.');
    } else {
      await supabase.from('issue_followers').insert({ issue_id: issueId, user_id: userId });
      return sendSuccess(res, { followed: true }, 'Following issue updates.');
    }
  } catch (err) {
    return next(err);
  }
}

export async function getIssueComments(req, res, next) {
  try {
    const issueId = req.params.id;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('issue_comments')
      .select(`
        id,
        body,
        created_at,
        author:profiles(id, name, initials, color, role)
      `)
      .eq('issue_id', issueId)
      .order('created_at', { ascending: true });

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, data || [], 'Issue comments retrieved.');
  } catch (err) {
    return next(err);
  }
}

export async function addIssueComment(req, res, next) {
  try {
    const userId = req.user.id;
    const issueId = req.params.id;
    const { text } = req.body;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('issue_comments')
      .insert({
        issue_id: issueId,
        author_id: userId,
        body: text,
      })
      .select(`
        id,
        body,
        created_at,
        author:profiles(id, name, initials, color, role)
      `)
      .single();

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, data, 'Comment added to issue.', null, 201);
  } catch (err) {
    return next(err);
  }
}

export async function getIssueHistory(req, res, next) {
  try {
    const issueId = req.params.id;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('issue_status_history')
      .select(`
        id,
        from_status,
        to_status,
        note,
        created_at,
        actor:profiles(name, role)
      `)
      .eq('issue_id', issueId)
      .order('created_at', { ascending: true });

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, data || [], 'Issue history timeline.');
  } catch (err) {
    return next(err);
  }
}

