/*
# Fix: Ensure profiles table has correct structure for demo accounts sync

This migration:
1. Ensures the profiles table has all required columns
2. Adds a helper function to safely upsert profiles when auth users exist
3. The actual auth.users creation must be done via Supabase Admin API
   (see scripts/seed-auth-users.mjs)

Note: On Supabase Cloud, INSERT INTO auth.users directly via SQL migration
is NOT possible because it requires superuser privileges. Use the
seed-auth-users.mjs script with a service_role key instead.
*/

-- Make sure profiles.full_name column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name text;

-- Make sure profiles.employee_id exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES employees(id) ON DELETE SET NULL;

-- Ensure updated_at column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Trigger for updated_at on profiles
DROP TRIGGER IF EXISTS trg_profiles_updated ON profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Re-sync profiles for any existing auth users with demo emails
-- This runs safely even if auth users don't exist yet
INSERT INTO profiles (id, username, role, full_name, employee_id, updated_at)
SELECT
  auth_user.id,
  split_part(auth_user.email, '@', 1),
  demo.role::text,
  demo.full_name,
  employee.id,
  now()
FROM (VALUES
  ('manager@spa.vn',      'manager',      'Hoàng Thị Mai'),
  ('receptionist@spa.vn', 'receptionist', 'Lê Ngọc Anh'),
  ('therapist@spa.vn',    'therapist',    'Nguyễn Thị Hương')
) AS demo(email, role, full_name)
JOIN auth.users auth_user ON lower(auth_user.email) = lower(demo.email)
LEFT JOIN employees employee ON employee.full_name = demo.full_name
ON CONFLICT (id) DO UPDATE SET
  username    = EXCLUDED.username,
  role        = EXCLUDED.role,
  full_name   = EXCLUDED.full_name,
  employee_id = EXCLUDED.employee_id,
  updated_at  = now();
