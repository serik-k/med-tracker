-- Protected access photos must survive application restarts and deployments.
-- Keep the bytes tenant-scoped and outside the order JSON/document payload.

CREATE TABLE access_photos (
  token varchar(80) PRIMARY KEY,
  clinic_id text NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  contents bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX access_photos_clinic_created_idx ON access_photos(clinic_id, created_at DESC);

ALTER TABLE access_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_photos FORCE ROW LEVEL SECURITY;
CREATE POLICY access_photos_tenant_policy ON access_photos
  USING (app_is_platform_admin() OR clinic_id = app_current_clinic_id())
  WITH CHECK (app_is_platform_admin() OR clinic_id = app_current_clinic_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON access_photos TO medtracker_app;
