/*
# Create core schema for SPA Management System (Part 3)

1. New Tables
- `appointments` — appointment with customer, therapist, status, date/time
- `appointment_details` — services within an appointment
- `invoices` — invoice with payment status and method
- `invoice_details` — line items (services and products) on an invoice
- `ai_history` — AI request/response history
- `audit_logs` — audit trail of important actions
2. Security
- RLS enabled on all tables, authenticated CRUD
*/

-- ============ APPOINTMENTS ============
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  therapist_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist ON appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- ============ APPOINTMENT_DETAILS ============
CREATE TABLE IF NOT EXISTS appointment_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  service_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_details_appointment ON appointment_details(appointment_id);

-- ============ INVOICES ============
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text CHECK (payment_method IN ('cash', 'transfer', 'card')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(payment_status);

-- ============ INVOICE_DETAILS ============
CREATE TABLE IF NOT EXISTS invoice_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('service', 'product')),
  item_id uuid NOT NULL,
  item_name text NOT NULL,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_details_invoice ON invoice_details(invoice_id);

-- ============ AI_HISTORY ============
CREATE TABLE IF NOT EXISTS ai_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  ai_type text NOT NULL CHECK (ai_type IN ('suggestion', 'message', 'summary')),
  input_data jsonb,
  output_content text,
  prompt_used text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_history_customer ON ai_history(customer_id);

-- ============ AUDIT_LOGS ============
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ============ RLS: APPOINTMENTS ============
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_select_authenticated" ON appointments;
CREATE POLICY "appointments_select_authenticated" ON appointments FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "appointments_insert_authenticated" ON appointments;
CREATE POLICY "appointments_insert_authenticated" ON appointments FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "appointments_update_authenticated" ON appointments;
CREATE POLICY "appointments_update_authenticated" ON appointments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "appointments_delete_authenticated" ON appointments;
CREATE POLICY "appointments_delete_authenticated" ON appointments FOR DELETE
  TO authenticated USING (true);

-- ============ RLS: APPOINTMENT_DETAILS ============
ALTER TABLE appointment_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointment_details_select_authenticated" ON appointment_details;
CREATE POLICY "appointment_details_select_authenticated" ON appointment_details FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "appointment_details_insert_authenticated" ON appointment_details;
CREATE POLICY "appointment_details_insert_authenticated" ON appointment_details FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "appointment_details_update_authenticated" ON appointment_details;
CREATE POLICY "appointment_details_update_authenticated" ON appointment_details FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "appointment_details_delete_authenticated" ON appointment_details;
CREATE POLICY "appointment_details_delete_authenticated" ON appointment_details FOR DELETE
  TO authenticated USING (true);

-- ============ RLS: INVOICES ============
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select_authenticated" ON invoices;
CREATE POLICY "invoices_select_authenticated" ON invoices FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "invoices_insert_authenticated" ON invoices;
CREATE POLICY "invoices_insert_authenticated" ON invoices FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "invoices_update_authenticated" ON invoices;
CREATE POLICY "invoices_update_authenticated" ON invoices FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "invoices_delete_authenticated" ON invoices;
CREATE POLICY "invoices_delete_authenticated" ON invoices FOR DELETE
  TO authenticated USING (true);

-- ============ RLS: INVOICE_DETAILS ============
ALTER TABLE invoice_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_details_select_authenticated" ON invoice_details;
CREATE POLICY "invoice_details_select_authenticated" ON invoice_details FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "invoice_details_insert_authenticated" ON invoice_details;
CREATE POLICY "invoice_details_insert_authenticated" ON invoice_details FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "invoice_details_delete_authenticated" ON invoice_details;
CREATE POLICY "invoice_details_delete_authenticated" ON invoice_details FOR DELETE
  TO authenticated USING (true);

-- ============ RLS: AI_HISTORY ============
ALTER TABLE ai_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_history_select_authenticated" ON ai_history;
CREATE POLICY "ai_history_select_authenticated" ON ai_history FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "ai_history_insert_authenticated" ON ai_history;
CREATE POLICY "ai_history_insert_authenticated" ON ai_history FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============ RLS: AUDIT_LOGS ============
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_authenticated" ON audit_logs;
CREATE POLICY "audit_logs_select_authenticated" ON audit_logs FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON audit_logs;
CREATE POLICY "audit_logs_insert_authenticated" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============ TRIGGERS ============
DROP TRIGGER IF EXISTS trg_appointments_updated ON appointments;
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated ON invoices;
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
