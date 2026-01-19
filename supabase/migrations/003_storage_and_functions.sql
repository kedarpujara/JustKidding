-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
    ('child-avatars', 'child-avatars', true),
    ('doctor-documents', 'doctor-documents', false),
    ('prescriptions', 'prescriptions', false),
    ('intake-attachments', 'intake-attachments', false);

-- Storage policies for child-avatars (public bucket)
CREATE POLICY "Guardians can upload child avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'child-avatars' AND
        EXISTS (
            SELECT 1 FROM children c
            WHERE c.guardian_id = auth.uid()
            AND (storage.foldername(name))[1] = c.id::text
        )
    );

CREATE POLICY "Anyone can view child avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'child-avatars');

CREATE POLICY "Guardians can delete child avatars"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'child-avatars' AND
        EXISTS (
            SELECT 1 FROM children c
            WHERE c.guardian_id = auth.uid()
            AND (storage.foldername(name))[1] = c.id::text
        )
    );

-- Storage policies for doctor-documents
CREATE POLICY "Doctors can upload own documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'doctor-documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Doctors can view own documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'doctor-documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Admins can view all doctor documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'doctor-documents' AND
        is_admin()
    );

-- Storage policies for prescriptions
CREATE POLICY "System can create prescriptions"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'prescriptions');

CREATE POLICY "Guardians can view their prescriptions"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'prescriptions' AND
        EXISTS (
            SELECT 1 FROM prescriptions p
            JOIN children c ON c.id = p.child_id
            WHERE c.guardian_id = auth.uid()
            AND (storage.foldername(name))[1] = p.id::text
        )
    );

CREATE POLICY "Doctors can view prescriptions they created"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'prescriptions' AND
        EXISTS (
            SELECT 1 FROM prescriptions p
            JOIN doctor_profiles dp ON dp.id = p.doctor_id
            WHERE dp.profile_id = auth.uid()
            AND (storage.foldername(name))[1] = p.id::text
        )
    );

-- Storage policies for intake-attachments
CREATE POLICY "Guardians can upload intake attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'intake-attachments' AND
        EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.guardian_id = auth.uid()
            AND (storage.foldername(name))[1] = a.id::text
        )
    );

CREATE POLICY "Guardians can view own intake attachments"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'intake-attachments' AND
        EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.guardian_id = auth.uid()
            AND (storage.foldername(name))[1] = a.id::text
        )
    );

CREATE POLICY "Doctors can view intake attachments for their appointments"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'intake-attachments' AND
        EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.doctor_id = get_doctor_profile_id()
            AND (storage.foldername(name))[1] = a.id::text
        )
    );

-- Function to generate appointment slots for a doctor
CREATE OR REPLACE FUNCTION generate_appointment_slots(
    p_doctor_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
    v_date DATE;
    v_rule RECORD;
    v_slot_start TIMESTAMPTZ;
    v_slot_end TIMESTAMPTZ;
    v_count INTEGER := 0;
BEGIN
    v_date := p_start_date;

    WHILE v_date <= p_end_date LOOP
        -- Check if doctor has time off on this date
        IF NOT EXISTS (
            SELECT 1 FROM doctor_time_off
            WHERE doctor_id = p_doctor_id
            AND v_date BETWEEN start_date AND end_date
        ) THEN
            -- Get availability rules for this day of week
            FOR v_rule IN
                SELECT * FROM doctor_availability_rules
                WHERE doctor_id = p_doctor_id
                AND day_of_week = EXTRACT(DOW FROM v_date)
                AND is_active = TRUE
            LOOP
                v_slot_start := v_date + v_rule.start_time;

                WHILE v_slot_start + (v_rule.slot_duration_minutes || ' minutes')::INTERVAL
                      <= v_date + v_rule.end_time LOOP
                    v_slot_end := v_slot_start + (v_rule.slot_duration_minutes || ' minutes')::INTERVAL;

                    -- Only create future slots
                    IF v_slot_start > NOW() THEN
                        -- Check if slot already exists
                        IF NOT EXISTS (
                            SELECT 1 FROM appointment_slots
                            WHERE doctor_id = p_doctor_id
                            AND start_time = v_slot_start
                        ) THEN
                            INSERT INTO appointment_slots (doctor_id, start_time, end_time)
                            VALUES (p_doctor_id, v_slot_start, v_slot_end);
                            v_count := v_count + 1;
                        END IF;
                    END IF;

                    v_slot_start := v_slot_end;
                END LOOP;
            END LOOP;
        END IF;

        v_date := v_date + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release expired slot holds
CREATE OR REPLACE FUNCTION release_expired_slot_holds()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    WITH expired_slots AS (
        UPDATE appointment_slots
        SET is_available = TRUE, held_by = NULL, held_until = NULL
        WHERE held_until IS NOT NULL
        AND held_until < NOW()
        AND is_available = FALSE
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM expired_slots;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark no-show appointments
CREATE OR REPLACE FUNCTION mark_noshow_appointments()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    WITH noshow_appointments AS (
        UPDATE appointments
        SET status = 'no_show', updated_at = NOW()
        WHERE status = 'scheduled'
        AND scheduled_at < NOW() - INTERVAL '30 minutes'
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM noshow_appointments;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get doctor earnings
CREATE OR REPLACE FUNCTION get_doctor_earnings(
    p_doctor_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_earnings BIGINT,
    total_appointments BIGINT,
    completed_appointments BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN p.amount ELSE 0 END), 0)::BIGINT as total_earnings,
        COUNT(*)::BIGINT as total_appointments,
        COUNT(*) FILTER (WHERE a.status = 'completed')::BIGINT as completed_appointments
    FROM appointments a
    JOIN payments p ON p.appointment_id = a.id
    WHERE a.doctor_id = p_doctor_id
    AND p.status = 'captured'
    AND (p_start_date IS NULL OR a.scheduled_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR a.scheduled_at::DATE <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, phone, full_name, role)
    VALUES (
        NEW.id,
        NEW.phone,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'guardian')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to schedule appointment reminders
CREATE OR REPLACE FUNCTION schedule_appointment_reminders()
RETURNS TRIGGER AS $$
DECLARE
    v_child_name TEXT;
    v_doctor_name TEXT;
    v_guardian_id UUID;
    v_doctor_profile_id UUID;
BEGIN
    -- Only schedule reminders when status changes to 'scheduled'
    IF NEW.status = 'scheduled' AND (OLD.status IS NULL OR OLD.status != 'scheduled') THEN
        -- Get child and doctor names
        SELECT c.full_name INTO v_child_name FROM children c WHERE c.id = NEW.child_id;
        SELECT p.full_name INTO v_doctor_name
        FROM doctor_profiles dp
        JOIN profiles p ON p.id = dp.profile_id
        WHERE dp.id = NEW.doctor_id;

        SELECT dp.profile_id INTO v_doctor_profile_id FROM doctor_profiles dp WHERE dp.id = NEW.doctor_id;

        -- 24h reminder for guardian
        INSERT INTO notification_jobs (appointment_id, recipient_id, recipient_role, type, title, body, scheduled_for)
        VALUES (
            NEW.id,
            NEW.guardian_id,
            'guardian',
            'reminder_24h',
            'Appointment Tomorrow',
            format('%s''s appointment with Dr. %s is tomorrow', v_child_name, v_doctor_name),
            NEW.scheduled_at - INTERVAL '24 hours'
        );

        -- 1h reminder for guardian
        INSERT INTO notification_jobs (appointment_id, recipient_id, recipient_role, type, title, body, scheduled_for)
        VALUES (
            NEW.id,
            NEW.guardian_id,
            'guardian',
            'reminder_1h',
            'Appointment in 1 Hour',
            format('%s''s appointment with Dr. %s starts in 1 hour', v_child_name, v_doctor_name),
            NEW.scheduled_at - INTERVAL '1 hour'
        );

        -- 5min reminder for guardian
        INSERT INTO notification_jobs (appointment_id, recipient_id, recipient_role, type, title, body, scheduled_for)
        VALUES (
            NEW.id,
            NEW.guardian_id,
            'guardian',
            'reminder_5min',
            'Appointment Starting Soon',
            format('%s''s appointment starts in 5 minutes. Tap to join.', v_child_name),
            NEW.scheduled_at - INTERVAL '5 minutes'
        );

        -- 5min reminder for doctor
        INSERT INTO notification_jobs (appointment_id, recipient_id, recipient_role, type, title, body, scheduled_for)
        VALUES (
            NEW.id,
            v_doctor_profile_id,
            'doctor',
            'reminder_5min',
            'Appointment Starting Soon',
            format('Appointment with %s starts in 5 minutes', v_child_name),
            NEW.scheduled_at - INTERVAL '5 minutes'
        );
    END IF;

    -- Cancel reminders if appointment is canceled
    IF NEW.status = 'canceled' AND OLD.status != 'canceled' THEN
        UPDATE notification_jobs
        SET status = 'failed', failure_reason = 'Appointment canceled'
        WHERE appointment_id = NEW.id AND status = 'pending';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_appointment_status_change
    AFTER INSERT OR UPDATE OF status ON appointments
    FOR EACH ROW EXECUTE FUNCTION schedule_appointment_reminders();
