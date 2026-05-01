-- Create biometric user mapping table
CREATE TABLE IF NOT EXISTS biometric_user_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  machine_user_id VARCHAR(50) NOT NULL,
  machine_id VARCHAR(50) DEFAULT 'zkteco_k40',
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(machine_user_id, machine_id),
  UNIQUE(user_id, machine_id)
);

-- Create index for faster lookups
CREATE INDEX idx_biometric_mapping_user_id ON biometric_user_mapping(user_id);
CREATE INDEX idx_biometric_mapping_machine_user_id ON biometric_user_mapping(machine_user_id);

-- Create biometric sync log table to track sync operations
CREATE TABLE IF NOT EXISTS biometric_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id VARCHAR(50) NOT NULL,
  sync_started_at TIMESTAMPTZ NOT NULL,
  sync_completed_at TIMESTAMPTZ,
  records_fetched INTEGER DEFAULT 0,
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, failed
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for sync logs
CREATE INDEX idx_biometric_sync_log_machine_id ON biometric_sync_log(machine_id);
CREATE INDEX idx_biometric_sync_log_created_at ON biometric_sync_log(created_at DESC);

-- Add RLS policies
ALTER TABLE biometric_user_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_sync_log ENABLE ROW LEVEL SECURITY;

-- Super admins can manage mappings
CREATE POLICY "Super admins can view biometric mappings"
  ON biometric_user_mapping FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert biometric mappings"
  ON biometric_user_mapping FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update biometric mappings"
  ON biometric_user_mapping FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete biometric mappings"
  ON biometric_user_mapping FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Super admins can view sync logs
CREATE POLICY "Super admins can view sync logs"
  ON biometric_sync_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Add comment
COMMENT ON TABLE biometric_user_mapping IS 'Maps system users to biometric machine user IDs';
COMMENT ON TABLE biometric_sync_log IS 'Tracks biometric attendance sync operations';
