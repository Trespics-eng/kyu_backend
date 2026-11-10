-- 005_reset_all_data.sql
-- Run this script in the Supabase Dashboard SQL Editor to wipe out all previous mock/seed data.
-- This leaves the tables, triggers, policies, and buckets intact, but removes all rows so you can start completely fresh.

TRUNCATE TABLE
    audit_logs,
    content_reports,
    notifications,
    messages,
    conversation_participants,
    conversations,
    community_members,
    community_requests,
    communities,
    lost_found_items,
    event_saves,
    event_attendees,
    events,
    accommodation_reviews,
    accommodation_listings,
    opportunities,
    article_comments,
    article_likes,
    articles,
    business_bookmarks,
    businesses,
    issue_followers,
    issue_supporters,
    issue_comments,
    issue_history,
    issues,
    post_bookmarks,
    post_comments,
    post_reactions,
    posts,
    user_settings,
    user_follows,
    profiles
CASCADE;

-- To also delete all Supabase authentication accounts when resetting:
DELETE FROM auth.users;


