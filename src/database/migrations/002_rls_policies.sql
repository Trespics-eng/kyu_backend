-- 002_rls_policies.sql
-- Row Level Security (RLS) for KyU Connect

-- Enable RLS across all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE confidential_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_supporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_found_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions for role checks
CREATE OR REPLACE FUNCTION is_admin_or_moderator()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND (app_role = 'admin' OR app_role = 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Anyone can view public profiles; owners can update
CREATE POLICY "Public profiles are readable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Settings: Only user can view and edit own settings
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Follows: Anyone can view; authenticated user can insert/delete own
CREATE POLICY "Follows are readable by everyone" ON user_follows FOR SELECT USING (true);
CREATE POLICY "Users can follow/unfollow" ON user_follows FOR ALL USING (auth.uid() = follower_id);

-- Posts: Active posts are readable by everyone; authenticated can create; author can update/delete
CREATE POLICY "Active posts are readable" ON posts FOR SELECT USING (status != 'removed');
CREATE POLICY "Authenticated users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update own posts" ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete own posts" ON posts FOR DELETE USING (auth.uid() = author_id);

-- Post reactions, bookmarks, comments
CREATE POLICY "Post comments readable" ON post_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON post_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can delete comments" ON post_comments FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Reactions readable" ON post_reactions FOR SELECT USING (true);
CREATE POLICY "Users can manage own reactions" ON post_reactions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own bookmarks" ON post_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own bookmarks" ON post_bookmarks FOR ALL USING (auth.uid() = user_id);

-- Issues: Public issues readable by all; reporter or admin can update
CREATE POLICY "Public issues are viewable by all" ON issues FOR SELECT USING (true);
CREATE POLICY "Authenticated users can report public issues" ON issues FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reporters or admins can update issue" ON issues FOR UPDATE USING (auth.uid() = reporter_id OR is_admin_or_moderator());

-- Confidential Reports: STRICTLY isolated to author and admin/moderator
CREATE POLICY "Confidential reports visible only to author and admins" ON confidential_reports
FOR SELECT USING (auth.uid() = reporter_id OR is_admin_or_moderator());
CREATE POLICY "Authenticated users can submit confidential reports" ON confidential_reports
FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can update confidential reports" ON confidential_reports
FOR UPDATE USING (is_admin_or_moderator());

-- Businesses: Active businesses viewable by all; owner manages
CREATE POLICY "Businesses viewable by all" ON businesses FOR SELECT USING (true);
CREATE POLICY "Owners can manage own business" ON businesses FOR ALL USING (auth.uid() = owner_id);

-- Articles: Published viewable by all; drafts only viewable by author
CREATE POLICY "Published articles viewable by all" ON articles FOR SELECT USING (is_draft = false OR auth.uid() = author_id);
CREATE POLICY "Authors can manage own articles" ON articles FOR ALL USING (auth.uid() = author_id);

-- Opportunities, Accommodation, Events, Lost & Found: Public read, owner manage
CREATE POLICY "Opportunities viewable by all" ON opportunities FOR SELECT USING (true);
CREATE POLICY "Users can create opportunities" ON opportunities FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update opportunities" ON opportunities FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Accommodation viewable by all" ON accommodation_listings FOR SELECT USING (true);
CREATE POLICY "Owners can manage accommodation" ON accommodation_listings FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Events viewable by all" ON events FOR SELECT USING (true);
CREATE POLICY "Organizers can manage events" ON events FOR ALL USING (auth.uid() = organizer_id);

CREATE POLICY "Lost & Found viewable by all" ON lost_found_items FOR SELECT USING (true);
CREATE POLICY "Reporters can manage lost & found" ON lost_found_items FOR ALL USING (auth.uid() = reporter_id);

-- Communities: Viewable by all; join/leave managed by user
CREATE POLICY "Communities viewable by all" ON communities FOR SELECT USING (true);
CREATE POLICY "Users manage own community membership" ON community_members FOR ALL USING (auth.uid() = user_id);

-- Conversations & Messages: Members only
CREATE POLICY "Members can view conversation" ON conversations FOR SELECT
USING (EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = id AND user_id = auth.uid()));

CREATE POLICY "Members can view messages" ON messages FOR SELECT
USING (EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));

CREATE POLICY "Members can send messages" ON messages FOR INSERT
WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));

-- Notifications: User only
CREATE POLICY "Users view and manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- Reports & Admin Audits
CREATE POLICY "Users can submit reports" ON content_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can view and manage reports" ON content_reports FOR ALL USING (is_admin_or_moderator());
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (is_admin_or_moderator());

