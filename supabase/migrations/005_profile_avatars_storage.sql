-- Create single avatars bucket for all profile photos (children, guardians, doctors)
-- Structure: avatars/children/{childId}/..., avatars/guardians/{userId}/..., avatars/doctors/{userId}/...

INSERT INTO storage.buckets (id, name, public) VALUES
    ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- Policy: Users can upload to their own folder (guardians, doctors, and their children)
CREATE POLICY "Users can upload avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' AND (
            -- Guardians uploading to guardians/{userId}/
            (
                (storage.foldername(name))[1] = 'guardians' AND
                (storage.foldername(name))[2] = auth.uid()::text
            ) OR
            -- Doctors uploading to doctors/{userId}/
            (
                (storage.foldername(name))[1] = 'doctors' AND
                (storage.foldername(name))[2] = auth.uid()::text
            ) OR
            -- Guardians uploading child avatars to children/{childId}/
            (
                (storage.foldername(name))[1] = 'children' AND
                EXISTS (
                    SELECT 1 FROM children c
                    WHERE c.guardian_id = auth.uid()
                    AND c.id::text = (storage.foldername(name))[2]
                )
            )
        )
    );

-- Policy: Users can update their own avatars
CREATE POLICY "Users can update avatars"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' AND (
            (
                (storage.foldername(name))[1] = 'guardians' AND
                (storage.foldername(name))[2] = auth.uid()::text
            ) OR
            (
                (storage.foldername(name))[1] = 'doctors' AND
                (storage.foldername(name))[2] = auth.uid()::text
            ) OR
            (
                (storage.foldername(name))[1] = 'children' AND
                EXISTS (
                    SELECT 1 FROM children c
                    WHERE c.guardian_id = auth.uid()
                    AND c.id::text = (storage.foldername(name))[2]
                )
            )
        )
    );

-- Policy: Users can delete their own avatars
CREATE POLICY "Users can delete avatars"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' AND (
            (
                (storage.foldername(name))[1] = 'guardians' AND
                (storage.foldername(name))[2] = auth.uid()::text
            ) OR
            (
                (storage.foldername(name))[1] = 'doctors' AND
                (storage.foldername(name))[2] = auth.uid()::text
            ) OR
            (
                (storage.foldername(name))[1] = 'children' AND
                EXISTS (
                    SELECT 1 FROM children c
                    WHERE c.guardian_id = auth.uid()
                    AND c.id::text = (storage.foldername(name))[2]
                )
            )
        )
    );

-- Policy: Admins can manage all avatars
CREATE POLICY "Admins can manage all avatars"
    ON storage.objects FOR ALL
    USING (bucket_id = 'avatars' AND is_admin())
    WITH CHECK (bucket_id = 'avatars' AND is_admin());
