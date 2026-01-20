// User and Role Types
export type UserRole = 'guardian' | 'doctor' | 'admin';

export interface Profile {
  id: string;
  phone: string;
  role: UserRole;
  full_name: string;
  email?: string;
  avatar_url?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface GuardianProfile {
  id: string;
  profile_id: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  emergency_contact?: string;
  created_at: string;
}

export interface DoctorStateRegistration {
  state: string;
  registration_number: string;
}

export interface DoctorProfile {
  id: string;
  profile_id: string;
  specialization: string;
  qualification: string;
  registration_number: string;
  experience_years: number;
  consultation_fee: number;
  bio?: string;
  languages: string[];
  verification_status: 'pending' | 'approved' | 'rejected';
  verification_notes?: string;
  documents_url?: string[];
  state_registrations?: DoctorStateRegistration[];
  mbbs_institute?: string;
  mbbs_institute_other?: string;
  md_institute?: string;
  md_institute_other?: string;
  created_at: string;
  updated_at: string;
}

// Child Profile Types
export type Gender = 'male' | 'female' | 'other';

export interface Child {
  id: string;
  guardian_id: string;
  full_name: string;
  date_of_birth: string;
  gender: Gender;
  blood_group?: string;
  height_cm?: number;
  weight_kg?: number;
  allergies?: string[];
  chronic_conditions?: string[];
  current_medications?: string[];
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Availability Types
export interface DoctorAvailabilityRule {
  id: string;
  doctor_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // HH:mm format
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface DoctorTimeOff {
  id: string;
  doctor_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  created_at: string;
}

export interface AppointmentSlot {
  id: string;
  doctor_id: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  held_until?: string;
  held_by?: string;
  created_at: string;
}

// Appointment Types
export type AppointmentStatus =
  | 'pending_payment'
  | 'scheduled'
  | 'live'
  | 'completed'
  | 'no_show'
  | 'canceled';

export interface Appointment {
  id: string;
  slot_id: string;
  child_id: string;
  guardian_id: string;
  doctor_id: string;
  status: AppointmentStatus;
  chief_complaint?: string;
  scheduled_at: string;
  started_at?: string;
  ended_at?: string;
  canceled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  // Snapshot fields (preserved even if accounts are deleted)
  doctor_name?: string;
  doctor_avatar_url?: string;
  guardian_name?: string;
  guardian_phone?: string;
  child_name?: string;
  child_dob?: string;
  // Joined fields (may be null if accounts deleted)
  child?: Child;
  guardian?: Profile;
  doctor?: DoctorProfile & { profile: Profile };
  slot?: AppointmentSlot;
}

// Intake Types
export interface IntakeTemplate {
  id: string;
  name: string;
  specialty?: string;
  version: number;
  schema: IntakeSchema;
  is_active: boolean;
  created_at: string;
}

export interface IntakeSchema {
  sections: IntakeSection[];
}

export interface IntakeSection {
  id: string;
  title: string;
  description?: string;
  questions: IntakeQuestion[];
  conditions?: IntakeCondition[];
}

export interface IntakeQuestion {
  id: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'boolean' | 'scale';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: IntakeOption[];
  validation?: IntakeValidation;
  conditions?: IntakeCondition[];
  unit?: string;
  min?: number;
  max?: number;
}

export interface IntakeOption {
  value: string;
  label: string;
}

export interface IntakeValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface IntakeCondition {
  questionId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string | number | boolean | string[];
}

export interface IntakeResponse {
  id: string;
  appointment_id: string;
  template_id: string;
  responses: Record<string, unknown>;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntakeEvent {
  id: string;
  appointment_id: string;
  event_type: 'started' | 'saved' | 'completed' | 'additional_requested';
  data?: Record<string, unknown>;
  created_at: string;
}

// Consult Notes Types
export interface ConsultNote {
  id: string;
  appointment_id: string;
  doctor_id: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  diagnosis?: string;
  follow_up_date?: string;
  additional_notes?: string;
  created_at: string;
  updated_at: string;
}

// Prescription Types
export interface Prescription {
  id: string;
  appointment_id: string;
  doctor_id: string;
  child_id: string;
  medications: PrescriptionMedication[];
  instructions?: string;
  pdf_url?: string;
  created_at: string;
}

export interface PrescriptionMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

// Video Session Types
export interface VideoSession {
  id: string;
  appointment_id: string;
  room_name: string;
  provider: 'agora' | 'daily' | 'twilio';
  provider_room_id?: string;
  status: 'created' | 'active' | 'ended';
  doctor_token?: string;
  patient_token?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface VideoCallEvent {
  id: string;
  session_id: string;
  event_type: 'doctor_joined' | 'patient_joined' | 'doctor_left' | 'patient_left' | 'reconnected' | 'ended';
  participant_id: string;
  participant_role: 'doctor' | 'patient';
  metadata?: Record<string, unknown>;
  created_at: string;
}

// Payment Types
export interface Payment {
  id: string;
  appointment_id: string;
  guardian_id: string;
  amount: number;
  currency: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';
  failure_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Refund {
  id: string;
  payment_id: string;
  appointment_id: string;
  amount: number;
  razorpay_refund_id?: string;
  status: 'pending' | 'processed' | 'failed';
  reason: string;
  processed_by?: string;
  created_at: string;
  updated_at: string;
}

// Notification Types
export interface NotificationJob {
  id: string;
  appointment_id: string;
  recipient_id: string;
  recipient_role: UserRole;
  type: 'reminder_24h' | 'reminder_1h' | 'reminder_5min' | 'doctor_ready' | 'appointment_confirmed' | 'appointment_canceled';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  scheduled_for: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
  failure_reason?: string;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Navigation Types
export type RootStackParamList = {
  '(auth)': undefined;
  '(guardian)': undefined;
  '(doctor)': undefined;
  '(admin)': undefined;
};
