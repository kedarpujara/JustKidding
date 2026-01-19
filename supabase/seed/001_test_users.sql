-- Test Users Seed Data for JustKidding
-- Run this AFTER creating the auth users in Supabase Dashboard
--
-- IMPORTANT: First, go to Supabase Dashboard > Authentication > Users > Add User
-- Create each user with these emails and password: TestPass123!
--
-- Guardians:
--   guardian1@test.justkidding.app
--   guardian2@test.justkidding.app
--
-- Doctors:
--   doctor1@test.justkidding.app through doctor10@test.justkidding.app
--
-- Admins:
--   kedar@justkidding.app
--   malav@justkidding.app

-- ============================================
-- GUARDIAN PROFILES
-- ============================================

-- Guardian 1: Priya Sharma
INSERT INTO profiles (id, phone, full_name, email, role, is_verified)
SELECT
  id,
  '+919876543210',
  'Priya Sharma',
  'guardian1@test.justkidding.app',
  'guardian',
  true
FROM auth.users WHERE email = 'guardian1@test.justkidding.app'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone;

-- Guardian 2: Rahul Patel
INSERT INTO profiles (id, phone, full_name, email, role, is_verified)
SELECT
  id,
  '+919876543211',
  'Rahul Patel',
  'guardian2@test.justkidding.app',
  'guardian',
  true
FROM auth.users WHERE email = 'guardian2@test.justkidding.app'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone;

-- ============================================
-- DOCTOR PROFILES
-- ============================================

-- Doctor 1: Dr. Anjali Desai
INSERT INTO profiles (id, phone, full_name, email, role, is_verified)
SELECT id, '+919900000001', 'Dr. Anjali Desai', 'doctor1@test.justkidding.app', 'doctor', true
FROM auth.users WHERE email = 'doctor1@test.justkidding.app'
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

INSERT INTO doctor_profiles (profile_id, specialization, qualification, registration_number, experience_years, consultation_fee, bio, languages, verification_status)
SELECT id, 'General Pediatrics', 'MBBS, MD Pediatrics', 'MCI-DOC-001', 12, 500,
  'Experienced pediatrician specializing in child healthcare and development.',
  ARRAY['English', 'Hindi', 'Gujarati'], 'approved'
FROM auth.users WHERE email = 'doctor1@test.justkidding.app'
ON CONFLICT (profile_id) DO UPDATE SET verification_status = 'approved';

-- Doctor 2: Dr. Vikram Singh
INSERT INTO profiles (id, phone, full_name, email, role, is_verified)
SELECT id, '+919900000002', 'Dr. Vikram Singh', 'doctor2@test.justkidding.app', 'doctor', true
FROM auth.users WHERE email = 'doctor2@test.justkidding.app'
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

INSERT INTO doctor_profiles (profile_id, specialization, qualification, registration_number, experience_years, consultation_fee, bio, languages, verification_status)
SELECT id, 'Pediatric Neurology', 'MBBS, DM Neurology', 'MCI-DOC-002', 15, 800,
  'Specialist in pediatric neurological disorders and developmental delays.',
  ARRAY['English', 'Hindi', 'Punjabi'], 'approved'
FROM auth.users WHERE email = 'doctor2@test.justkidding.app'
ON CONFLICT (profile_id) DO UPDATE SET verification_status = 'approved';

-- Doctor 3: Dr. Meera Krishnan
INSERT INTO profiles (id, phone, full_name, email, role, is_verified)
SELECT id, '+919900000003', 'Dr. Meera Krishnan', 'doctor3@test.justkidding.app', 'doctor', true
FROM auth.users WHERE email = 'doctor3@test.justkidding.app'
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

INSERT INTO doctor_profiles (profile_id, specialization, qualification, registration_number, experience_years, consultation_fee, bio, languages, verification_status)
SELECT id, 'Pediatric Cardiology', 'MBBS, DM Cardiology', 'MCI-DOC-003', 10, 1000,
  'Expert in congenital heart defects and pediatric cardiac care.',
  ARRAY['English', 'Hindi', 'Tamil', 'Malayalam'], 'approved'
FROM auth.users WHERE email = 'doctor3@test.justkidding.app'
ON CONFLICT (profile_id) DO UPDATE SET verification_status = 'approved';

-- Doctor 4: Dr. Arjun Reddy
INSERT INTO profiles (id, phone, full_name, email, role, is_verified)
SELECT id, '+919900000004', 'Dr. Arjun Reddy', 'doctor4@test.justkidding.app', 'doctor', true
FROM auth.users WHERE email = 'doctor4@test.justkidding.app'
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

INSERT INTO doctor_profiles (profile_id, specialization, qualification, registration_number, experience_years, consultation_fee, bio, languages, verification_status)
SELECT id, 'Pediatric Pulmonology', 'MBBS, MD Pulmonology', 'MCI-DOC-004', 8, 600,
  'Specializing in childhood asthma and respiratory disorders.',
  ARRAY['English', 'Hindi', 'Telugu'], 'approved'
FROM auth.users WHERE email = 'doctor4@test.justkidding.app'
ON CONFLICT (profile_id) DO UPDATE SET verification_status = 'approved';

-- Doctor 5: Dr. Neha Gupta
INSERT INTO profiles (id, phone, full_name, email, role, is_verified)
SELECT id, '+919900000005', 'Dr. Neha Gupta', 'doctor5@test.justkidding.app', 'doctor', true
FROM auth.users WHERE email = 'doctor5@test.justkidding.app'
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

INSERT INTO doctor_profiles (profile_id, specialization, qualification, registration_number, experience_years, consultation_fee, bio, languages, verification_status)
SELECT id, 'Pediatric Dermatology', 'MBBS, MD Dermatology', 'MCI-DOC-005', 6, 450,
  'Expert in childhood skin conditions and allergies.',
  ARRAY['English', 'Hindi'], 'approved'
FROM auth.users WHERE email = 'doctor5@test.justkidding.app'
ON CONFLICT (profile_id) DO UPDATE SET verification_status = 'approved';

-- Doctor 6: Dr. Sanjay Mehta
INSERT INTO profiles (id, phone, full_name, email, role, is_verified)
SELECT id, '+919900000006', 'Dr. Sanjay Mehta', 'doctor6@test.justkidding.app', 'doctor', true
FROM auth.users WHERE email = 'doctor6@test.justkidding.app'
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

INSERT INTO doctor_profiles (profile_id, specialization, qualification, registration_number, experience_years, consultation_fee, bio, languages, verification_status)
SELECT id, 'Pediatric Gastroenterology', 'MBBS, DM Gastro', 'MCI-DOC-006', 14, 750,
  'Specialist in digestive health and nutrition for children.',
  ARRAY['English', 'Hindi', 'Marathi'], 'approved'
FROM auth.users WHERE email = 'doctor6@test.justkidding.app'
ON CONFLICT (profile_id) DO UPDATE SET verification_status = 'approved';

-- Doctor 7: Dr. Pooja Sharma
INSERT INTO profiles (id, phone, full_name, email, role, is_verified)
SELECT id, '+919900000007', 'Dr. Pooja Sharma', 'doctor7@test.justkidding.app', 'doctor', true
FROM auth.users WHERE email = 'doctor7@test.justkidding.app'
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

INSERT INTO doctor_profiles (profile_id, specialization, qualification, registration_number, experience_years, consultation_fee, bio, languages, verification_status)
SELECT id, 'Pediatric Endocrinology', 'MBBS, DM Endocrinology', 'MCI-DOC-007', 9, 700,
  'Expert in childhood diabetes and hormonal disorders.',
  ARRAY['English', 'Hindi'], 'approved'
FROM auth.users WHERE email = 'doctor7@test.justkidding.app'
ON CONFLICT (profile_id) DO UPDATE SET verification_status = 'approved';

-- Doctor 8: Dr. Amit Joshi
INSERT INTO profiles (id, phone, full_name, email, role, is_verified)
SELECT id, '+919900000008', 'Dr. Amit Joshi', 'doctor8@test.justkidding.app', 'doctor', true
FROM auth.users WHERE email = 'doctor8@test.justkidding.app'
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

INSERT INTO doctor_profiles (profile_id, specialization, qualification, registration_number, experience_years, consultation_fee, bio, languages, verification_status)
SELECT id, 'General Pediatrics', 'MBBS, DCH', 'MCI-DOC-008', 5, 400,
  'Caring pediatrician focused on preventive care and vaccinations.',
  ARRAY['English', 'Hindi', 'Gujarati'], 'approved'
FROM auth.users WHERE email = 'doctor8@test.justkidding.app'
ON CONFLICT (profile_id) DO UPDATE SET verification_status = 'approved';

-- Doctor 9: Dr. Kavita Nair
INSERT INTO profiles (id, phone, full_name, email, role, is_verified)
SELECT id, '+919900000009', 'Dr. Kavita Nair', 'doctor9@test.justkidding.app', 'doctor', true
FROM auth.users WHERE email = 'doctor9@test.justkidding.app'
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

INSERT INTO doctor_profiles (profile_id, specialization, qualification, registration_number, experience_years, consultation_fee, bio, languages, verification_status)
SELECT id, 'Pediatric Nephrology', 'MBBS, DM Nephrology', 'MCI-DOC-009', 11, 850,
  'Specialist in kidney diseases and urinary tract issues in children.',
  ARRAY['English', 'Hindi', 'Malayalam'], 'approved'
FROM auth.users WHERE email = 'doctor9@test.justkidding.app'
ON CONFLICT (profile_id) DO UPDATE SET verification_status = 'approved';

-- Doctor 10: Dr. Rohan Verma
INSERT INTO profiles (id, phone, full_name, email, role, is_verified)
SELECT id, '+919900000010', 'Dr. Rohan Verma', 'doctor10@test.justkidding.app', 'doctor', true
FROM auth.users WHERE email = 'doctor10@test.justkidding.app'
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

INSERT INTO doctor_profiles (profile_id, specialization, qualification, registration_number, experience_years, consultation_fee, bio, languages, verification_status)
SELECT id, 'Pediatric Infectious Disease', 'MBBS, MD Pediatrics', 'MCI-DOC-010', 7, 550,
  'Expert in childhood infections and tropical diseases.',
  ARRAY['English', 'Hindi'], 'approved'
FROM auth.users WHERE email = 'doctor10@test.justkidding.app'
ON CONFLICT (profile_id) DO UPDATE SET verification_status = 'approved';

-- ============================================
-- ADMIN PROFILES
-- ============================================

-- Admin 1: Kedar
INSERT INTO profiles (id, phone, full_name, email, role, is_verified)
SELECT id, '+919800000001', 'Kedar Pujara', 'kedar@justkidding.app', 'admin', true
FROM auth.users WHERE email = 'kedar@justkidding.app'
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = 'admin';

-- Admin 2: Malav
INSERT INTO profiles (id, phone, full_name, email, role, is_verified)
SELECT id, '+919800000002', 'Malav Shah', 'malav@justkidding.app', 'admin', true
FROM auth.users WHERE email = 'malav@justkidding.app'
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = 'admin';

-- ============================================
-- SAMPLE CHILDREN FOR GUARDIANS
-- ============================================

-- Children for Guardian 1 (Priya Sharma)
INSERT INTO children (guardian_id, full_name, date_of_birth, gender, blood_group, allergies)
SELECT id, 'Aarav Sharma', '2019-03-15', 'male', 'B+', ARRAY['Peanuts']
FROM auth.users WHERE email = 'guardian1@test.justkidding.app';

INSERT INTO children (guardian_id, full_name, date_of_birth, gender, blood_group)
SELECT id, 'Ananya Sharma', '2021-07-22', 'female', 'B+'
FROM auth.users WHERE email = 'guardian1@test.justkidding.app';

-- Children for Guardian 2 (Rahul Patel)
INSERT INTO children (guardian_id, full_name, date_of_birth, gender, blood_group, chronic_conditions)
SELECT id, 'Vivaan Patel', '2018-11-08', 'male', 'O+', ARRAY['Asthma']
FROM auth.users WHERE email = 'guardian2@test.justkidding.app';

-- ============================================
-- DOCTOR AVAILABILITY (Sample schedules)
-- ============================================

-- Add availability for first 3 doctors (Mon-Fri, 9 AM - 5 PM)
INSERT INTO doctor_availability_rules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT dp.id, day, '09:00', '17:00', 15
FROM doctor_profiles dp
JOIN auth.users u ON dp.profile_id = u.id
CROSS JOIN generate_series(1, 5) AS day -- Monday to Friday
WHERE u.email IN ('doctor1@test.justkidding.app', 'doctor2@test.justkidding.app', 'doctor3@test.justkidding.app')
ON CONFLICT DO NOTHING;

-- Done! Remember to create the auth users in Supabase Dashboard first!
