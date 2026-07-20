export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'receptionist';
  created_at: string;
}

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  email?: string;
  address?: string;
  blood_group?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface PatientWithVisit extends Patient {
  last_visit?: string;
  total_visits?: number;
}

export interface Visit {
  id: number;
  patient_id: number;
  doctor_id: number;
  doctor_name?: string;
  visit_date: string;
  chief_complaint: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  follow_up_date?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  created_at: string;
}

export interface Appointment {
  id: number;
  patient_id: number;
  patient_name?: string;
  doctor_id: number;
  doctor_name?: string;
  appointment_date: string;
  appointment_time: string;
  reason?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  created_at: string;
}

export interface DashboardStats {
  total_patients: number;
  todays_appointments: number;
  this_week_appointments: number;
  this_month_appointments: number;
  completed_today: number;
  pending_today: number;
  new_patients_this_month: number;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}
