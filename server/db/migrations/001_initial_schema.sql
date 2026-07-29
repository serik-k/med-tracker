CREATE TABLE clinics (
  id text PRIMARY KEY,
  name text NOT NULL,
  legal_name text NOT NULL,
  bin varchar(12) NOT NULL UNIQUE CHECK (bin ~ '^\d{12}$'),
  city text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Almaty',
  contact_phone text NOT NULL,
  plan text NOT NULL DEFAULT 'START' CHECK (plan IN ('START', 'PRO', 'ENTERPRISE')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('TRIAL', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id text PRIMARY KEY,
  clinic_id text REFERENCES clinics(id) ON DELETE RESTRICT,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('platform_admin', 'clinic_owner', 'clinic_admin', 'dispatcher')),
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('INVITED', 'ACTIVE', 'DISABLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((role = 'platform_admin' AND clinic_id IS NULL) OR (role <> 'platform_admin' AND clinic_id IS NOT NULL))
);

CREATE TABLE sessions (
  token_hash char(64) PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crews (
  id text NOT NULL,
  clinic_id text NOT NULL REFERENCES clinics(id) ON DELETE RESTRICT,
  name text NOT NULL,
  car_plate text NOT NULL,
  type text NOT NULL,
  driver_name text NOT NULL,
  status text NOT NULL DEFAULT 'ON_DUTY' CHECK (status IN ('ON_DUTY', 'ON_CALL', 'BREAK', 'OFF_DUTY')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id, id),
  UNIQUE (clinic_id, car_plate)
);

CREATE TABLE crew_access_tokens (
  token_hash char(64) PRIMARY KEY,
  clinic_id text NOT NULL,
  crew_id text NOT NULL,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (clinic_id, crew_id) REFERENCES crews(clinic_id, id) ON DELETE CASCADE
);

CREATE TABLE orders (
  token_hash char(64) PRIMARY KEY,
  business_id text NOT NULL,
  clinic_id text NOT NULL REFERENCES clinics(id) ON DELETE RESTRICT,
  crew_id text,
  patient_name text NOT NULL,
  patient_phone text NOT NULL,
  address text NOT NULL,
  priority text NOT NULL DEFAULT 'EMERGENCY' CHECK (priority IN ('EMERGENCY', 'URGENT', 'STANDARD')),
  status text NOT NULL DEFAULT 'ACCEPTED' CHECK (status IN ('ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'HOSPITAL_TRANSPORT', 'COMPLETED')),
  hospital_name text,
  destination jsonb NOT NULL,
  current_location jsonb NOT NULL,
  route_path jsonb NOT NULL DEFAULT '[]'::jsonb,
  eta_minutes integer,
  distance_km double precision,
  access_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  symptoms jsonb NOT NULL DEFAULT '[]'::jsonb,
  sos_alert boolean NOT NULL DEFAULT false,
  sos_time timestamptz,
  is_simulating boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, business_id),
  FOREIGN KEY (clinic_id, crew_id) REFERENCES crews(clinic_id, id) ON DELETE RESTRICT
);

CREATE TABLE audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clinic_id text NOT NULL REFERENCES clinics(id) ON DELETE RESTRICT,
  order_token_hash char(64) REFERENCES orders(token_hash) ON DELETE CASCADE,
  actor_user_id text REFERENCES users(id) ON DELETE SET NULL,
  event text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX users_clinic_id_idx ON users(clinic_id);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);
CREATE INDEX crews_clinic_status_idx ON crews(clinic_id, status);
CREATE INDEX orders_clinic_status_idx ON orders(clinic_id, status, created_at DESC);
CREATE INDEX orders_clinic_crew_idx ON orders(clinic_id, crew_id, created_at DESC);
CREATE INDEX audit_logs_clinic_created_idx ON audit_logs(clinic_id, created_at DESC);

CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER clinics_updated_at BEFORE UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER crews_updated_at BEFORE UPDATE ON crews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE FUNCTION app_is_platform_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('app.is_platform_admin', true), '')::boolean, false)
$$;

CREATE FUNCTION app_current_clinic_id() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_clinic_id', true), '')
$$;

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics FORCE ROW LEVEL SECURITY;
CREATE POLICY clinics_tenant_policy ON clinics USING (app_is_platform_admin() OR id = app_current_clinic_id()) WITH CHECK (app_is_platform_admin() OR id = app_current_clinic_id());

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
CREATE POLICY users_tenant_policy ON users USING (app_is_platform_admin() OR clinic_id = app_current_clinic_id()) WITH CHECK (app_is_platform_admin() OR clinic_id = app_current_clinic_id());

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY sessions_policy ON sessions USING (app_is_platform_admin() OR EXISTS (SELECT 1 FROM users WHERE users.id = sessions.user_id AND users.clinic_id = app_current_clinic_id())) WITH CHECK (app_is_platform_admin() OR EXISTS (SELECT 1 FROM users WHERE users.id = sessions.user_id AND users.clinic_id = app_current_clinic_id()));

ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE crews FORCE ROW LEVEL SECURITY;
CREATE POLICY crews_tenant_policy ON crews USING (app_is_platform_admin() OR clinic_id = app_current_clinic_id()) WITH CHECK (app_is_platform_admin() OR clinic_id = app_current_clinic_id());

ALTER TABLE crew_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_access_tokens FORCE ROW LEVEL SECURITY;
CREATE POLICY crew_tokens_tenant_policy ON crew_access_tokens USING (app_is_platform_admin() OR clinic_id = app_current_clinic_id()) WITH CHECK (app_is_platform_admin() OR clinic_id = app_current_clinic_id());

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
CREATE POLICY orders_tenant_policy ON orders USING (app_is_platform_admin() OR clinic_id = app_current_clinic_id()) WITH CHECK (app_is_platform_admin() OR clinic_id = app_current_clinic_id());

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_tenant_policy ON audit_logs USING (app_is_platform_admin() OR clinic_id = app_current_clinic_id()) WITH CHECK (app_is_platform_admin() OR clinic_id = app_current_clinic_id());

GRANT USAGE ON SCHEMA public TO medtracker_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON clinics, users, sessions, crews, crew_access_tokens, orders, audit_logs TO medtracker_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO medtracker_app;
