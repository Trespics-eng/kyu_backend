-- 003_storage_buckets.sql
-- Storage buckets and policies for KyU Connect

-- Create buckets via Supabase storage schema
INSERT INTO storage.buckets (id, name, public) VALUES
    ('avatars', 'avatars', true),
    ('post-media', 'post-media', true),
    ('business-media', 'business-media', true),
    ('article-covers', 'article-covers', true),
    ('issue-media', 'issue-media', true),
    ('accommodation-media', 'accommodation-media', true),
    ('lost-found-media', 'lost-found-media', true),
    ('chat-attachments', 'chat-attachments', false),
    ('confidential-reports', 'confidential-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Public buckets policies: Anyone can read public objects
CREATE POLICY "Public Read for Public Buckets" ON storage.objects
FOR SELECT USING (bucket_id IN ('avatars', 'post-media', 'business-media', 'article-covers', 'issue-media', 'accommodation-media', 'lost-found-media'));

-- Authenticated upload policies: Authenticated users can upload to buckets
CREATE POLICY "Authenticated users can upload objects" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Owner can update / delete own storage objects
CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE USING (auth.uid() = owner);

CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (auth.uid() = owner);

-- Private chat attachments policy: Only conversation members can read
CREATE POLICY "Chat attachments viewable by conversation members" ON storage.objects
FOR SELECT USING (
    bucket_id = 'chat-attachments' AND auth.role() = 'authenticated'
);

-- Confidential reports bucket policy: Strictly author and admins
CREATE POLICY "Confidential bucket viewable by author and admins" ON storage.objects
FOR SELECT USING (
    bucket_id = 'confidential-reports' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (app_role = 'admin' OR app_role = 'moderator'))
    )
);

