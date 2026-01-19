-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE user_role AS ENUM ('guardian', 'doctor', 'admin');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE appointment_status AS ENUM ('pending_payment', 'scheduled', 'live', 'completed', 'no_show', 'canceled');
CREATE TYPE payment_status AS ENUM ('created', 'authorized', 'captured', 'failed', 'refunded');
CREATE TYPE refund_status AS ENUM ('pending', 'processed', 'failed');
CREATE TYPE video_session_status AS ENUM ('created', 'active', 'ended');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'guardian',
    full_name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guardian profiles (additional guardian-specific data)
CREATE TABLE guardian_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    emergency_contact TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id)
);

-- Doctor profiles
CREATE TABLE doctor_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    specialization TEXT NOT NULL,
    qualification TEXT NOT NULL,
    registration_number TEXT NOT NULL,
    experience_years INTEGER NOT NULL DEFAULT 0,
    consultation_fee INTEGER NOT NULL DEFAULT 500,
    bio TEXT,
    languages TEXT[] DEFAULT ARRAY['English', 'Hindi'],
    verification_status verification_status DEFAULT 'pending',
    verification_notes TEXT,
    documents_url TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id),
    UNIQUE(registration_number)
);

-- Children (patients)
CREATE TABLE children (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guardian_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender gender_type NOT NULL,
    blood_group TEXT,
    allergies TEXT[],
    chronic_conditions TEXT[],
    current_medications TEXT[],
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctor availability rules (weekly schedule)
CREATE TABLE doctor_availability_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER NOT NULL DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_time > start_time)
);

-- Doctor time off
CREATE TABLE doctor_time_off (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- Appointment slots (pre-generated available slots)
CREATE TABLE appointment_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    held_until TIMESTAMPTZ,
    held_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_time > start_time)
);

-- Create index for efficient slot queries
CREATE INDEX idx_appointment_slots_doctor_time ON appointment_slots(doctor_id, start_time);
CREATE INDEX idx_appointment_slots_available ON appointment_slots(is_available, start_time) WHERE is_available = TRUE;

-- Appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_id UUID REFERENCES appointment_slots(id),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES profiles(id),
    doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),
    status appointment_status DEFAULT 'pending_payment',
    chief_complaint TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for appointment queries
CREATE INDEX idx_appointments_guardian ON appointments(guardian_id, status);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id, status);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);

-- Intake templates (JSON schema for intake forms)
CREATE TABLE intake_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    specialty TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    schema JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intake responses
CREATE TABLE intake_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES intake_templates(id),
    responses JSONB NOT NULL DEFAULT '{}',
    is_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(appointment_id)
);

-- Intake events (for tracking intake progress)
CREATE TABLE intake_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consult notes (SOAP format)
CREATE TABLE consult_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    diagnosis TEXT,
    follow_up_date DATE,
    additional_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(appointment_id)
);

-- Prescriptions
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),
    child_id UUID NOT NULL REFERENCES children(id),
    medications JSONB NOT NULL DEFAULT '[]',
    instructions TEXT,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(appointment_id)
);

-- Video sessions
CREATE TABLE video_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL DEFAULT 'agora',
    provider_room_id TEXT,
    status video_session_status DEFAULT 'created',
    doctor_token TEXT,
    patient_token TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(appointment_id)
);

-- Video call events (for logging)
CREATE TABLE video_call_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES video_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    participant_id UUID NOT NULL,
    participant_role TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES profiles(id),
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'INR',
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    status payment_status DEFAULT 'created',
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(appointment_id)
);

-- Refunds
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id),
    appointment_id UUID NOT NULL REFERENCES appointments(id),
    amount INTEGER,
    razorpay_refund_id TEXT,
    status refund_status DEFAULT 'pending',
    reason TEXT NOT NULL,
    processed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push tokens (for notifications)
CREATE TABLE push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- Notification jobs
CREATE TABLE notification_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES profiles(id),
    recipient_role user_role NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status notification_status DEFAULT 'pending',
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_jobs_pending ON notification_jobs(scheduled_for) WHERE status = 'pending';

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_doctor_profiles_updated_at BEFORE UPDATE ON doctor_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_intake_responses_updated_at BEFORE UPDATE ON intake_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_consult_notes_updated_at BEFORE UPDATE ON consult_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_push_tokens_updated_at BEFORE UPDATE ON push_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
