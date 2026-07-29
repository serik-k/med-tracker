#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=app_password="$POSTGRES_APP_PASSWORD" <<-'EOSQL'
  SELECT format('CREATE ROLE medtracker_app LOGIN PASSWORD %L', :'app_password')
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'medtracker_app')\gexec
  SELECT format('GRANT CONNECT ON DATABASE %I TO medtracker_app', current_database())\gexec
EOSQL
