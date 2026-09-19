-- Migration: Add Biometric Face Token and Multi-Angle Face Samples to Employees Table
-- Run this in Supabase SQL Editor if columns are not yet present.

ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_token TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_samples JSONB DEFAULT '[]'::jsonb;

-- Optional Index for rapid employee search and face verification lookup
CREATE INDEX IF NOT EXISTS idx_employees_face_token ON employees(face_token);
