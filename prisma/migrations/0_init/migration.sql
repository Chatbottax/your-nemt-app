-- Initial migration
CREATE TABLE "Driver" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "home_formatted_address" TEXT NOT NULL,
  "home_place_id" TEXT NOT NULL,
  "home_lat" DOUBLE PRECISION NOT NULL,
  "home_lng" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Student" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "pickup_formatted_address" TEXT NOT NULL,
  "pickup_place_id" TEXT NOT NULL UNIQUE,
  "pickup_lat" DOUBLE PRECISION NOT NULL,
  "pickup_lng" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Route" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "route_pay_one_way_cents" INTEGER NOT NULL,
  "route_pay_total_cents" INTEGER NOT NULL,
  "driver_pay_cents" INTEGER NOT NULL,
  "profit_cents" INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Trip" (
  "id" SERIAL PRIMARY KEY,
  "routeId" INTEGER NOT NULL REFERENCES "Route"("id"),
  "studentId" INTEGER NOT NULL REFERENCES "Student"("id"),
  "pickup_time" TIMESTAMP,
  "dropoff_time" TIMESTAMP,
  "assigned_driver_id" INTEGER REFERENCES "Driver"("id"),
  "assignment_json" JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Upload" (
  "id" SERIAL PRIMARY KEY,
  "filename" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "storage_path" TEXT NOT NULL,
  "ocr_json" JSONB,
  "parsed_json" JSONB,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
