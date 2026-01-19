-- Create doctor-avatars bucket (public for display)
INSERT INTO storage.buckets (id, name, public) VALUES
    ('doctor-avatars', 'doctor-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Doctors can upload their own avatars
CREATE POLICY "Doctors can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'doctor-avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Anyone can view doctor avatars (public profiles)
CREATE POLICY "Anyone can view doctor avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'doctor-avatars');

-- Doctors can update their own avatars
CREATE POLICY "Doctors can update own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'doctor-avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Doctors can delete their own avatars
CREATE POLICY "Doctors can delete own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'doctor-avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Also add UPDATE policy for child avatars (for replacing photos)
CREATE POLICY "Guardians can update child avatars"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'child-avatars' AND
        EXISTS (
            SELECT 1 FROM children c
            WHERE c.guardian_id = auth.uid()
            AND (storage.foldername(name))[1] = c.id::text
        )
    );
