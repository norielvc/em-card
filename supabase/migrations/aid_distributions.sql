-- Aid & Benefits Distribution Table
CREATE TABLE IF NOT EXISTS aid_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  scanned_by VARCHAR(255),
  notes TEXT,
  barangay VARCHAR(100),
  claim_number INT DEFAULT 1,
  distributed_at TIMESTAMPTZ DEFAULT now()
);

-- Index for high performance scan verification & deduplication
CREATE INDEX IF NOT EXISTS idx_aid_dist_reg_cat ON aid_distributions(registration_id, category);
CREATE INDEX IF NOT EXISTS idx_aid_dist_date ON aid_distributions(distributed_at DESC);
CREATE INDEX IF NOT EXISTS idx_aid_dist_barangay ON aid_distributions(barangay);
