DO $$ BEGIN
  CREATE TYPE "account_role" AS ENUM ('admin', 'partner');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "account_status" AS ENUM ('pending', 'active', 'disabled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "payout_status" AS ENUM ('pending', 'paid', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" serial PRIMARY KEY,
  "role" "account_role" NOT NULL,
  "username" varchar(100) NOT NULL UNIQUE,
  "passwordHash" varchar(200) NOT NULL,
  "name" varchar(100) NOT NULL,
  "email" varchar(320),
  "phone" varchar(20),
  "instagram" varchar(100),
  "pix" varchar(200),
  "commissionPercent" numeric(5, 2) NOT NULL DEFAULT 0,
  "status" "account_status" NOT NULL DEFAULT 'pending',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "accountId" integer;

CREATE TABLE IF NOT EXISTS "payoutRequests" (
  "id" serial PRIMARY KEY,
  "accountId" integer NOT NULL,
  "periodStart" timestamp NOT NULL,
  "periodEnd" timestamp NOT NULL,
  "totalSales" numeric(12, 2) NOT NULL,
  "commissionAmount" numeric(10, 2) NOT NULL,
  "status" "payout_status" NOT NULL DEFAULT 'pending',
  "paymentNote" text,
  "requestedAt" timestamp NOT NULL DEFAULT now(),
  "paidAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
