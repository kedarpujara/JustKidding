-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE consult_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_call_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_jobs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is doctor
CREATE OR REPLACE FUNCTION is_doctor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'doctor'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get doctor profile id for current user
CREATE OR REPLACE FUNCTION get_doctor_profile_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM doctor_profiles
        WHERE profile_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can update all profiles"
    ON profiles FOR UPDATE
    USING (is_admin());

-- Guardian profiles policies
CREATE POLICY "Guardians can manage own guardian profile"
    ON guardian_profiles FOR ALL
    USING (profile_id = auth.uid());

CREATE POLICY "Admins can manage all guardian profiles"
    ON guardian_profiles FOR ALL
    USING (is_admin());

-- Doctor profiles policies
CREATE POLICY "Anyone can view approved doctors"
    ON doctor_profiles FOR SELECT
    USING (verification_status = 'approved');

CREATE POLICY "Doctors can view own profile"
    ON doctor_profiles FOR SELECT
    USING (profile_id = auth.uid());

CREATE POLICY "Doctors can update own profile"
    ON doctor_profiles FOR UPDATE
    USING (profile_id = auth.uid());

CREATE POLICY "Anyone can apply as doctor"
    ON doctor_profiles FOR INSERT
    WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admins can manage all doctor profiles"
    ON doctor_profiles FOR ALL
    USING (is_admin());

-- Children policies
CREATE POLICY "Guardians can manage own children"
    ON children FOR ALL
    USING (guardian_id = auth.uid());

CREATE POLICY "Doctors can view children they have appointments with"
    ON children FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.child_id = children.id
            AND a.doctor_id = get_doctor_profile_id()
        )
    );

CREATE POLICY "Admins can view all children"
    ON children FOR SELECT
    USING (is_admin());

-- Doctor availability rules policies
CREATE POLICY "Anyone can view active availability rules"
    ON doctor_availability_rules FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Doctors can manage own availability"
    ON doctor_availability_rules FOR ALL
    USING (doctor_id = get_doctor_profile_id());

CREATE POLICY "Admins can manage all availability"
    ON doctor_availability_rules FOR ALL
    USING (is_admin());

-- Doctor time off policies
CREATE POLICY "Doctors can manage own time off"
    ON doctor_time_off FOR ALL
    USING (doctor_id = get_doctor_profile_id());

CREATE POLICY "Admins can manage all time off"
    ON doctor_time_off FOR ALL
    USING (is_admin());

-- Appointment slots policies
CREATE POLICY "Anyone can view available slots"
    ON appointment_slots FOR SELECT
    USING (is_available = TRUE OR held_by = auth.uid());

CREATE POLICY "Doctors can view own slots"
    ON appointment_slots FOR SELECT
    USING (doctor_id = get_doctor_profile_id());

CREATE POLICY "Authenticated users can hold slots"
    ON appointment_slots FOR UPDATE
    USING (is_available = TRUE OR held_by = auth.uid());

CREATE POLICY "Admins can manage all slots"
    ON appointment_slots FOR ALL
    USING (is_admin());

-- Appointments policies
CREATE POLICY "Guardians can view own appointments"
    ON appointments FOR SELECT
    USING (guardian_id = auth.uid());

CREATE POLICY "Guardians can create appointments"
    ON appointments FOR INSERT
    WITH CHECK (guardian_id = auth.uid());

CREATE POLICY "Guardians can update own pending appointments"
    ON appointments FOR UPDATE
    USING (guardian_id = auth.uid() AND status IN ('pending_payment', 'scheduled'));

CREATE POLICY "Doctors can view assigned appointments"
    ON appointments FOR SELECT
    USING (doctor_id = get_doctor_profile_id());

CREATE POLICY "Doctors can update assigned appointments"
    ON appointments FOR UPDATE
    USING (doctor_id = get_doctor_profile_id());

CREATE POLICY "Admins can manage all appointments"
    ON appointments FOR ALL
    USING (is_admin());

-- Intake templates policies
CREATE POLICY "Anyone can view active templates"
    ON intake_templates FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Admins can manage templates"
    ON intake_templates FOR ALL
    USING (is_admin());

-- Intake responses policies
CREATE POLICY "Guardians can manage own intake responses"
    ON intake_responses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.id = intake_responses.appointment_id
            AND a.guardian_id = auth.uid()
        )
    );

CREATE POLICY "Doctors can view intake for their appointments"
    ON intake_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.id = intake_responses.appointment_id
            AND a.doctor_id = get_doctor_profile_id()
        )
    );

CREATE POLICY "Admins can view all intake responses"
    ON intake_responses FOR SELECT
    USING (is_admin());

-- Intake events policies
CREATE POLICY "Users can manage own intake events"
    ON intake_events FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.id = intake_events.appointment_id
            AND (a.guardian_id = auth.uid() OR a.doctor_id = get_doctor_profile_id())
        )
    );

-- Consult notes policies
CREATE POLICY "Doctors can manage own consult notes"
    ON consult_notes FOR ALL
    USING (doctor_id = get_doctor_profile_id());

CREATE POLICY "Guardians can view notes for their appointments"
    ON consult_notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.id = consult_notes.appointment_id
            AND a.guardian_id = auth.uid()
            AND a.status = 'completed'
        )
    );

CREATE POLICY "Admins can view all consult notes"
    ON consult_notes FOR SELECT
    USING (is_admin());

-- Prescriptions policies
CREATE POLICY "Doctors can manage prescriptions for their appointments"
    ON prescriptions FOR ALL
    USING (doctor_id = get_doctor_profile_id());

CREATE POLICY "Guardians can view prescriptions for their children"
    ON prescriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM children c
            WHERE c.id = prescriptions.child_id
            AND c.guardian_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all prescriptions"
    ON prescriptions FOR SELECT
    USING (is_admin());

-- Video sessions policies
CREATE POLICY "Participants can view their video sessions"
    ON video_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.id = video_sessions.appointment_id
            AND (a.guardian_id = auth.uid() OR a.doctor_id = get_doctor_profile_id())
        )
    );

CREATE POLICY "System can create video sessions"
    ON video_sessions FOR INSERT
    WITH CHECK (TRUE); -- Controlled by Edge Functions

CREATE POLICY "Doctors can update video session status"
    ON video_sessions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.id = video_sessions.appointment_id
            AND a.doctor_id = get_doctor_profile_id()
        )
    );

-- Video call events policies
CREATE POLICY "Participants can log call events"
    ON video_call_events FOR INSERT
    WITH CHECK (participant_id = auth.uid());

CREATE POLICY "Participants can view call events"
    ON video_call_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM video_sessions vs
            JOIN appointments a ON a.id = vs.appointment_id
            WHERE vs.id = video_call_events.session_id
            AND (a.guardian_id = auth.uid() OR a.doctor_id = get_doctor_profile_id())
        )
    );

-- Payments policies
CREATE POLICY "Guardians can view own payments"
    ON payments FOR SELECT
    USING (guardian_id = auth.uid());

CREATE POLICY "System can manage payments"
    ON payments FOR ALL
    USING (TRUE); -- Controlled by Edge Functions with service role

CREATE POLICY "Admins can view all payments"
    ON payments FOR SELECT
    USING (is_admin());

-- Refunds policies
CREATE POLICY "Guardians can view own refunds"
    ON refunds FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM payments p
            WHERE p.id = refunds.payment_id
            AND p.guardian_id = auth.uid()
        )
    );

CREATE POLICY "Guardians can request refunds"
    ON refunds FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM payments p
            WHERE p.id = refunds.payment_id
            AND p.guardian_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all refunds"
    ON refunds FOR ALL
    USING (is_admin());

-- Push tokens policies
CREATE POLICY "Users can manage own push tokens"
    ON push_tokens FOR ALL
    USING (user_id = auth.uid());

-- Notification jobs policies
CREATE POLICY "Users can view own notifications"
    ON notification_jobs FOR SELECT
    USING (recipient_id = auth.uid());

CREATE POLICY "System can manage notifications"
    ON notification_jobs FOR ALL
    USING (TRUE); -- Controlled by Edge Functions with service role
