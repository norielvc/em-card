-- ============================================================
-- EM CARD - BIOMETRIC & ATTENDANCE SYSTEM FOR FINANCE MODULE
-- Run this in your Supabase SQL Editor to initialize the Finance & Biometric tables.
-- ============================================================

-- 1. EMPLOYEES DIRECTORY TABLE
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(50),
  department VARCHAR(100) DEFAULT 'Operations',
  position VARCHAR(100) DEFAULT 'Staff',
  photo_url TEXT,
  face_token TEXT,
  rate_type VARCHAR(20) DEFAULT 'monthly', -- 'hourly' | 'daily' | 'monthly'
  base_rate NUMERIC(12, 2) DEFAULT 0.00,
  ot_multiplier NUMERIC(4, 2) DEFAULT 1.25,
  allowance NUMERIC(12, 2) DEFAULT 0.00,
  daily_hours NUMERIC(4, 2) DEFAULT 8.00,
  status VARCHAR(20) DEFAULT 'active', -- 'active' | 'inactive' | 'on_leave'
  hire_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_emp_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- 2. BIOMETRIC ATTENDANCE LOGS TABLE
CREATE TABLE IF NOT EXISTS biometric_attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(50) NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_in TIMESTAMPTZ,
  time_out TIMESTAMPTZ,
  time_in_photo TEXT,
  time_out_photo TEXT,
  hours_worked NUMERIC(6, 2) DEFAULT 0.00,
  late_minutes INTEGER DEFAULT 0,
  undertime_minutes INTEGER DEFAULT 0,
  ot_hours NUMERIC(6, 2) DEFAULT 0.00,
  status VARCHAR(30) DEFAULT 'Present', -- 'Present' | 'Late' | 'Half-day' | 'Absent' | 'Overtime'
  location VARCHAR(100) DEFAULT 'Main Headquarters Kiosk',
  confidence_score NUMERIC(5, 2), -- Biometric match percentage e.g. 98.4%
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_emp_date UNIQUE (employee_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON biometric_attendance_logs(employee_id, log_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON biometric_attendance_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON biometric_attendance_logs(status);

-- 3. EMPLOYEE LEAVES & TIME-OFF TABLE
CREATE TABLE IF NOT EXISTS employee_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(50) NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL, -- 'Vacation' | 'Sick' | 'Emergency' | 'Maternity/Paternity'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count NUMERIC(4, 1) DEFAULT 1.0,
  reason TEXT,
  status VARCHAR(30) DEFAULT 'Pending', -- 'Pending' | 'Approved' | 'Rejected'
  approved_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaves_emp ON employee_leaves(employee_id);

-- 4. PAYROLL RECORDS TABLE
CREATE TABLE IF NOT EXISTS payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(50) NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  cutoff_start DATE NOT NULL,
  cutoff_end DATE NOT NULL,
  days_present NUMERIC(4, 1) DEFAULT 0,
  total_regular_hours NUMERIC(6, 2) DEFAULT 0,
  total_ot_hours NUMERIC(6, 2) DEFAULT 0,
  total_late_minutes INTEGER DEFAULT 0,
  basic_pay NUMERIC(12, 2) DEFAULT 0.00,
  ot_pay NUMERIC(12, 2) DEFAULT 0.00,
  allowances NUMERIC(12, 2) DEFAULT 0.00,
  bonuses NUMERIC(12, 2) DEFAULT 0.00,
  night_diff_pay NUMERIC(12, 2) DEFAULT 0.00,
  holiday_pay NUMERIC(12, 2) DEFAULT 0.00,
  gross_pay NUMERIC(12, 2) DEFAULT 0.00,
  deductions_tax NUMERIC(12, 2) DEFAULT 0.00,
  deductions_sss NUMERIC(12, 2) DEFAULT 0.00,
  deductions_philhealth NUMERIC(12, 2) DEFAULT 0.00,
  deductions_pagibig NUMERIC(12, 2) DEFAULT 0.00,
  deductions_late NUMERIC(12, 2) DEFAULT 0.00,
  loan_deductions NUMERIC(12, 2) DEFAULT 0.00,
  cash_advance_deductions NUMERIC(12, 2) DEFAULT 0.00,
  other_deductions NUMERIC(12, 2) DEFAULT 0.00,
  total_deductions NUMERIC(12, 2) DEFAULT 0.00,
  net_pay NUMERIC(12, 2) DEFAULT 0.00,
  sss_er NUMERIC(12, 2) DEFAULT 0.00,
  sss_ec NUMERIC(12, 2) DEFAULT 0.00,
  philhealth_er NUMERIC(12, 2) DEFAULT 0.00,
  pagibig_er NUMERIC(12, 2) DEFAULT 0.00,
  total_employer_cost NUMERIC(12, 2) DEFAULT 0.00,
  disbursement_method VARCHAR(50) DEFAULT 'Bank Transfer', -- 'Bank Transfer' | 'EM-Card Digital Wallet' | 'Cash Voucher' | 'Check'
  status VARCHAR(30) DEFAULT 'Draft', -- 'Draft' | 'Approved' | 'Disbursed'
  disbursed_at TIMESTAMPTZ,
  disbursed_by VARCHAR(150),
  approved_at TIMESTAMPTZ,
  approved_by VARCHAR(150),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_emp_cutoff UNIQUE (employee_id, cutoff_start, cutoff_end)
);

CREATE INDEX IF NOT EXISTS idx_payroll_cutoff ON payroll_records(cutoff_start, cutoff_end);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll_records(status);

-- 5. PAYROLL RUNS & DISBURSEMENT ARCHIVE TABLE
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cutoff_start DATE NOT NULL,
  cutoff_end DATE NOT NULL,
  period_name VARCHAR(100),
  total_employees INTEGER DEFAULT 0,
  total_gross NUMERIC(14, 2) DEFAULT 0.00,
  total_deductions NUMERIC(14, 2) DEFAULT 0.00,
  total_net NUMERIC(14, 2) DEFAULT 0.00,
  total_employer_share NUMERIC(14, 2) DEFAULT 0.00,
  status VARCHAR(30) DEFAULT 'Draft', -- 'Draft' | 'Approved' | 'Disbursed'
  disbursement_method VARCHAR(50) DEFAULT 'Bank Transfer',
  disbursed_at TIMESTAMPTZ,
  disbursed_by VARCHAR(150),
  approved_at TIMESTAMPTZ,
  approved_by VARCHAR(150),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_payroll_run_cutoff UNIQUE (cutoff_start, cutoff_end)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_cutoff ON payroll_runs(cutoff_start, cutoff_end);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);

-- 6. PAYROLL ADJUSTMENTS & RECURRING LOANS TABLE
CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(50) NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'earning' | 'deduction'
  category VARCHAR(50) NOT NULL, -- 'Bonus' | 'Incentive' | 'Night Diff' | 'Allowance' | 'SSS Loan' | 'Pag-IBIG Loan' | 'Cash Advance' | 'Other'
  title VARCHAR(150) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  is_recurring BOOLEAN DEFAULT false,
  remaining_balance NUMERIC(12, 2),
  cutoff_start DATE,
  cutoff_end DATE,
  status VARCHAR(20) DEFAULT 'active', -- 'active' | 'applied' | 'cancelled'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adjustments_emp ON payroll_adjustments(employee_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_cutoff ON payroll_adjustments(cutoff_start, cutoff_end);

-- 7. OFFICES & GEOFENCE LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  radius_meters INTEGER DEFAULT 100, -- Allowed geofence range radius in meters (e.g. 50, 100, 250, 500)
  status VARCHAR(20) DEFAULT 'active', -- 'active' | 'inactive'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offices_code ON offices(code);
CREATE INDEX IF NOT EXISTS idx_offices_status ON offices(status);

-- 8. STATUTORY & DISBURSEMENT SCHEMA UPDATES
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tin_number VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS sss_number VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS philhealth_number VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pagibig_number VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name VARCHAR(50) DEFAULT 'Landbank of the Philippines';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_token TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_samples JSONB;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS rate_type VARCHAR(20) DEFAULT 'monthly';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS base_rate NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ot_multiplier NUMERIC(4, 2) DEFAULT 1.25;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS allowance NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS daily_hours NUMERIC(4, 2) DEFAULT 8.00;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

ALTER TABLE biometric_attendance_logs ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES offices(id) ON DELETE SET NULL;
ALTER TABLE biometric_attendance_logs ADD COLUMN IF NOT EXISTS is_within_geofence BOOLEAN DEFAULT true;
ALTER TABLE biometric_attendance_logs ADD COLUMN IF NOT EXISTS distance_meters NUMERIC(10, 2);
ALTER TABLE biometric_attendance_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 9. EMPLOYEE MOBILE SELF-SERVICE PORTAL AUTH
ALTER TABLE employees ADD COLUMN IF NOT EXISTS passcode VARCHAR(100) DEFAULT '1234';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_mobile_login TIMESTAMPTZ;

-- 10. PAYROLL ADJUSTMENTS & LOANS ENHANCEMENTS
ALTER TABLE payroll_adjustments ADD COLUMN IF NOT EXISTS date_received DATE DEFAULT CURRENT_DATE;

-- 11. WORKFORCE SCHEDULE & TIME-TRACKING CONFIGURATION
ALTER TABLE employees ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(20) DEFAULT 'fixed'; -- 'fixed' | 'flexi' | 'exempt'
ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_start TIME DEFAULT '08:00:00';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_end TIME DEFAULT '17:00:00';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS grace_period_mins INTEGER DEFAULT 15;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS required_daily_hours NUMERIC(4, 2) DEFAULT 8.00;

-- ==============================================================================
-- QUICK COPY-PASTE MIGRATION FOR SUPABASE SQL EDITOR
-- Run this block in Supabase Dashboard -> SQL Editor to enable 3-Angle Face & Schedules:
-- ==============================================================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_token TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_samples JSONB;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(20) DEFAULT 'fixed';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_start TIME DEFAULT '08:00:00';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_end TIME DEFAULT '17:00:00';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS grace_period_mins INTEGER DEFAULT 15;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS required_daily_hours NUMERIC(4, 2) DEFAULT 8.00;

