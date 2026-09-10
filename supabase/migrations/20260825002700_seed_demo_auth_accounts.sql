/*
# Seed demo login accounts

Creates the demo users shown on LoginPage and links them to profiles and
existing employees. The statements are idempotent so the migration can be
applied to a database that already contains some of these records.
*/

-- ============ AUTH USERS ==========
-- Passwords match the demo account buttons in src/pages/LoginPage.tsx.
UPDATE auth.users AS auth_user
SET
  encrypted_password = crypt(demo.password, gen_salt('bf')),
  email_confirmed_at = COALESCE(auth_user.email_confirmed_at, now()),
  updated_at = now()
FROM (VALUES
  ('manager@spa.vn', 'Manager@123'),
  ('receptionist@spa.vn', 'Reception@123'),
  ('therapist@spa.vn', 'Therapist@123')
) AS demo(email, password)
WHERE lower(auth_user.email) = lower(demo.email);

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  demo.email,
  crypt(demo.password, gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('demo', true, 'role', demo.role),
  now(),
  now(),
  '',
  '',
  '',
  ''
FROM (VALUES
  ('manager@spa.vn', 'Manager@123', 'manager'),
  ('receptionist@spa.vn', 'Reception@123', 'receptionist'),
  ('therapist@spa.vn', 'Therapist@123', 'therapist')
) AS demo(email, password, role)
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users existing_user WHERE lower(existing_user.email) = lower(demo.email)
);

-- ============ PROFILES ==========
INSERT INTO profiles (id, username, role, employee_id, full_name)
SELECT
  auth_user.id,
  split_part(auth_user.email, '@', 1),
  demo.role,
  employee.id,
  employee.full_name
FROM (VALUES
  ('manager@spa.vn', 'manager', 'Dương Dương'),
  ('receptionist@spa.vn', 'receptionist', 'Lê Ngọc Anh'),
  ('therapist@spa.vn', 'therapist', 'Nguyễn Thị Hương')
) AS demo(email, role, employee_name)
JOIN auth.users auth_user ON lower(auth_user.email) = lower(demo.email)
LEFT JOIN employees employee ON employee.full_name = demo.employee_name
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  role = EXCLUDED.role,
  employee_id = EXCLUDED.employee_id,
  full_name = EXCLUDED.full_name,
  updated_at = now();