ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "savedContact" boolean NOT NULL DEFAULT false;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "savedContact" boolean NOT NULL DEFAULT false;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "campaignSource" varchar(120);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "campaignMedium" varchar(120);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "campaignName" varchar(180);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "campaignTerm" varchar(180);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "campaignContent" varchar(180);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "gclid" varchar(255);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "fbclid" varchar(255);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "landingPage" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "referrer" text;
