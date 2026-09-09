export type UserRole = 'manager' | 'receptionist' | 'therapist';

export interface Profile {
  id: string;
  username: string;
  role: UserRole;
  employee_id: string | null;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  position: string | null;
  specialty: string | null;
  working_hours: string | null;
  hire_date: string | null;
  salary: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  dob: string | null;
  gender: 'male' | 'female' | 'other' | null;
  address: string | null;
  notes: string | null;
  loyalty_points: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  category: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  sale_price: number;
  cost_price: number;
  stock_quantity: number;
  category: string | null;
  supplier: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Treatment {
  id: string;
  name: string;
  description: string | null;
  total_duration: number;
  total_price: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  treatment_details?: TreatmentDetail[];
}

export interface TreatmentDetail {
  id: string;
  treatment_id: string;
  service_id: string;
  service?: Service;
  created_at: string;
}

export interface Package {
  id: string;
  name: string;
  description: string | null;
  sessions: number;
  price: number;
  expiry_days: number | null;
  discount_percent: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  package_details?: PackageDetail[];
}

export interface PackageDetail {
  id: string;
  package_id: string;
  treatment_id: string;
  treatment?: Treatment;
  created_at: string;
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Appointment {
  id: string;
  customer_id: string;
  therapist_id: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  therapist?: Employee | null;
  appointment_details?: AppointmentDetail[];
}

export interface AppointmentDetail {
  id: string;
  appointment_id: string;
  service_id: string;
  service?: Service;
  service_notes: string | null;
  created_at: string;
}

export type PaymentMethod = 'cash' | 'transfer' | 'card';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface Invoice {
  id: string;
  customer_id: string;
  appointment_id: string | null;
  total_amount: number;
  paid_amount: number;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  invoice_details?: InvoiceDetail[];
}

export interface InvoiceDetail {
  id: string;
  invoice_id: string;
  item_type: 'service' | 'product';
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export type AIType = 'suggestion' | 'message' | 'summary';

export interface AIHistory {
  id: string;
  customer_id: string | null;
  ai_type: AIType;
  input_data: Record<string, unknown> | null;
  output_content: string | null;
  prompt_used: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
