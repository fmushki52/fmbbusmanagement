-- BusBoard initial migration

CREATE TABLE IF NOT EXISTS "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  "event_date" date,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "role" text NOT NULL DEFAULT 'user',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "buses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "bus_number" text NOT NULL,
  "bus_name" text NOT NULL,
  "group_leader_name" text NOT NULL,
  "group_leader_contact" text NOT NULL,
  "capacity" int NOT NULL CHECK (capacity > 0),
  "created_at" timestamptz DEFAULT now(),
  UNIQUE ("event_id", "bus_number")
);

CREATE TABLE IF NOT EXISTS "passengers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "ref_id" text NOT NULL,
  "name" text NOT NULL,
  "gender" text,
  "age" int,
  "assigned_bus_id" uuid REFERENCES "buses"("id") ON DELETE SET NULL,
  "seated_bus_id" uuid REFERENCES "buses"("id") ON DELETE SET NULL,
  "seated_at" timestamptz,
  "seated_by" uuid REFERENCES "users"("id"),
  "created_at" timestamptz DEFAULT now(),
  UNIQUE ("event_id", "ref_id")
);

CREATE TABLE IF NOT EXISTS "user_buses" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "bus_id" uuid NOT NULL REFERENCES "buses"("id") ON DELETE CASCADE,
  PRIMARY KEY ("user_id", "bus_id")
);

CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid,
  "bus_id" uuid,
  "passenger_id" uuid,
  "action" text,
  "performed_by" uuid REFERENCES "users"("id"),
  "performed_at" timestamptz DEFAULT now(),
  "note" text
);

-- Indexes (hot paths)
CREATE INDEX IF NOT EXISTS "buses_event_id_idx" ON "buses"("event_id");
CREATE INDEX IF NOT EXISTS "passengers_seated_bus_id_idx" ON "passengers"("seated_bus_id");
CREATE INDEX IF NOT EXISTS "passengers_assigned_bus_id_idx" ON "passengers"("assigned_bus_id");
CREATE INDEX IF NOT EXISTS "passengers_event_id_idx" ON "passengers"("event_id");
CREATE INDEX IF NOT EXISTS "user_buses_user_id_idx" ON "user_buses"("user_id");
CREATE INDEX IF NOT EXISTS "user_buses_bus_id_idx" ON "user_buses"("bus_id");
CREATE INDEX IF NOT EXISTS "audit_log_bus_id_performed_at_idx" ON "audit_log"("bus_id", "performed_at");
