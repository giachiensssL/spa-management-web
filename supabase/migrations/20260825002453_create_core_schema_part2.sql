/*
# Create core schema for SPA Management System (Part 2)

1. New Tables
- `profiles` — extends auth.users with role and employee link
- `treatments` — treatment programs containing multiple services
- `treatment_details` — services within a treatment
- `packages` — care packages containing multiple treatments
- `package_details` — treatments within a package
2. Security
- RLS enabled on all tables, authenticated CRUD
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('manager', 'receptionist', 'therapist')),
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
CREATE POLICY "profiles_select_authenticated" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_authenticated" ON profiles;
CREATE POLICY "profiles_insert_authenticated" ON profiles FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update_authenticated" ON profiles;
CREATE POLICY "profiles_update_authenticated" ON profiles FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_profiles_updated ON profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============ TREATMENTS ============
CREATE TABLE IF NOT EXISTS treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  total_duration int NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ TREATMENT_DETAILS ============
CREATE TABLE IF NOT EXISTS treatment_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id uuid NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treatment_details_treatment ON treatment_details(treatment_id);
CREATE INDEX IF NOT EXISTS idx_treatment_details_service ON treatment_details(service_id);

ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treatments_select_authenticated" ON treatments;
CREATE POLICY "treatments_select_authenticated" ON treatments FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "treatments_insert_authenticated" ON treatments;
CREATE POLICY "treatments_insert_authenticated" ON treatments FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "treatments_update_authenticated" ON treatments;
CREATE POLICY "treatments_update_authenticated" ON treatments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "treatments_delete_authenticated" ON treatments;
CREATE POLICY "treatments_delete_authenticated" ON treatments FOR DELETE
  TO authenticated USING (true);

DROP POLICY IF EXISTS "treatment_details_select_authenticated" ON treatment_details;
CREATE POLICY "treatment_details_select_authenticated" ON treatment_details FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "treatment_details_insert_authenticated" ON treatment_details;
CREATE POLICY "treatment_details_insert_authenticated" ON treatment_details FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "treatment_details_delete_authenticated" ON treatment_details;
CREATE POLICY "treatment_details_delete_authenticated" ON treatment_details FOR DELETE
  TO authenticated USING (true);

DROP TRIGGER IF EXISTS trg_treatments_updated ON treatments;
CREATE TRIGGER trg_treatments_updated BEFORE UPDATE ON treatments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============ PACKAGES ============
CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  sessions int NOT NULL DEFAULT 1 CHECK (sessions > 0),
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  expiry_days int,
  discount_percent numeric(5,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ PACKAGE_DETAILS ============
CREATE TABLE IF NOT EXISTS package_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  treatment_id uuid NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_details_package ON package_details(package_id);
CREATE INDEX IF NOT EXISTS idx_package_details_treatment ON package_details(treatment_id);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packages_select_authenticated" ON packages;
CREATE POLICY "packages_select_authenticated" ON packages FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "packages_insert_authenticated" ON packages;
CREATE POLICY "packages_insert_authenticated" ON packages FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "packages_update_authenticated" ON packages;
CREATE POLICY "packages_update_authenticated" ON packages FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "packages_delete_authenticated" ON packages;
CREATE POLICY "packages_delete_authenticated" ON packages FOR DELETE
  TO authenticated USING (true);

DROP POLICY IF EXISTS "package_details_select_authenticated" ON package_details;
CREATE POLICY "package_details_select_authenticated" ON package_details FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "package_details_insert_authenticated" ON package_details;
CREATE POLICY "package_details_insert_authenticated" ON package_details FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "package_details_delete_authenticated" ON package_details;
CREATE POLICY "package_details_delete_authenticated" ON package_details FOR DELETE
  TO authenticated USING (true);

DROP TRIGGER IF EXISTS trg_packages_updated ON packages;
CREATE TRIGGER trg_packages_updated BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
