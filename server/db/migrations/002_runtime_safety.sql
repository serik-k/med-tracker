-- Runtime integrity and tracking metadata. This migration intentionally keeps
-- patient and driver secrets hashed; access_id is a non-secret order handle.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS access_id text;
UPDATE orders
SET access_id = 'ord_' || substr(md5(token_hash || random()::text), 1, 24)
WHERE access_id IS NULL;
ALTER TABLE orders ALTER COLUMN access_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_access_id_uidx ON orders(access_id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_fingerprint char(64);
CREATE UNIQUE INDEX IF NOT EXISTS orders_clinic_idempotency_uidx
  ON orders(clinic_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS viewer_token_hash char(64);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS viewer_expires_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS orders_viewer_token_uidx
  ON orders(viewer_token_hash) WHERE viewer_token_hash IS NOT NULL;

ALTER TABLE orders ALTER COLUMN current_location DROP NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS hospital_location jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS eta_updated_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sos_acknowledged_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sos_acknowledged_by text REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_order_token_hash_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_order_token_hash_fkey
  FOREIGN KEY (order_token_hash) REFERENCES orders(token_hash) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE crews ADD COLUMN IF NOT EXISTS current_location jsonb;
ALTER TABLE crews ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;
ALTER TABLE crews ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS hospital_options jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE crews DROP CONSTRAINT IF EXISTS crews_clinic_id_car_plate_key;
CREATE UNIQUE INDEX IF NOT EXISTS crews_active_car_plate_uidx
  ON crews(clinic_id, lower(car_plate)) WHERE archived_at IS NULL;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'HOSPITAL_TRANSPORT', 'COMPLETED', 'CANCELLED'));

-- PostgreSQL is the source of truth for crew availability. This constraint
-- closes the race between two dispatchers assigning the same crew.
WITH ranked_assignments AS (
  SELECT token_hash,
         row_number() OVER (PARTITION BY clinic_id, crew_id ORDER BY created_at DESC) AS position
  FROM orders
  WHERE crew_id IS NOT NULL
    AND status IN ('ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'HOSPITAL_TRANSPORT')
)
UPDATE orders
SET crew_id = NULL,
    assigned_at = NULL,
    current_location = NULL,
    route_path = '[]'::jsonb,
    eta_minutes = NULL,
    distance_km = NULL,
    eta_updated_at = NULL
FROM ranked_assignments
WHERE orders.token_hash = ranked_assignments.token_hash
  AND ranked_assignments.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS orders_one_active_per_crew_uidx
  ON orders(clinic_id, crew_id)
  WHERE crew_id IS NOT NULL
    AND status IN ('ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'HOSPITAL_TRANSPORT');

UPDATE crew_access_tokens
SET expires_at = created_at + interval '30 days'
WHERE expires_at IS NULL;

WITH ranked_tokens AS (
  SELECT token_hash,
         row_number() OVER (PARTITION BY clinic_id, crew_id ORDER BY created_at DESC, token_hash DESC) AS position
  FROM crew_access_tokens
  WHERE revoked_at IS NULL
)
UPDATE crew_access_tokens
SET revoked_at = now()
FROM ranked_tokens
WHERE crew_access_tokens.token_hash = ranked_tokens.token_hash
  AND ranked_tokens.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS crew_one_unrevoked_token_uidx
  ON crew_access_tokens(clinic_id, crew_id) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS orders_patient_expiry_idx ON orders(token_hash, expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON orders, crews, crew_access_tokens TO medtracker_app;
