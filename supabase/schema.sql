DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pizza_category AS ENUM ('classica', 'especial', 'doce');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pizza_size AS ENUM ('small', 'large');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE cart_item_type AS ENUM ('pizza', 'product');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'sent', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE account_role AS ENUM ('admin', 'partner');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('pending', 'active', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payout_status AS ENUM ('pending', 'paid', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  "openId" varchar(64) NOT NULL UNIQUE,
  name text,
  email varchar(320),
  "loginMethod" varchar(64),
  role user_role NOT NULL DEFAULT 'user',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "lastSignedIn" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pizzas (
  id serial PRIMARY KEY,
  name varchar(100) NOT NULL,
  description text,
  ingredients text NOT NULL,
  category pizza_category NOT NULL,
  "priceSmall" numeric(10, 2) NOT NULL,
  "priceLarge" numeric(10, 2) NOT NULL,
  "imageUrl" varchar(500) NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id serial PRIMARY KEY,
  name varchar(100) NOT NULL,
  description text,
  category varchar(50) NOT NULL,
  price numeric(10, 2) NOT NULL,
  "imageUrl" varchar(500) NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id serial PRIMARY KEY,
  phone varchar(20) NOT NULL UNIQUE,
  name varchar(100) NOT NULL,
  address text NOT NULL,
  "addressNumber" varchar(20) NOT NULL,
  "addressReference" text,
  "savedContact" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "cartItems" (
  id serial PRIMARY KEY,
  "sessionId" varchar(100) NOT NULL,
  "itemType" cart_item_type NOT NULL DEFAULT 'pizza',
  "pizzaId1" integer,
  "pizzaId2" integer,
  "productId" integer,
  size pizza_size,
  quantity integer NOT NULL DEFAULT 1,
  price numeric(10, 2) NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promotions (
  id serial PRIMARY KEY,
  title varchar(200) NOT NULL,
  description text NOT NULL,
  details text,
  "isActive" boolean NOT NULL DEFAULT true,
  "startDate" timestamp NOT NULL,
  "endDate" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id serial PRIMARY KEY,
  "customerId" integer,
  phone varchar(20) NOT NULL,
  name varchar(100) NOT NULL,
  address text NOT NULL,
  "addressNumber" varchar(20) NOT NULL,
  "addressReference" text,
  items text NOT NULL,
  "totalPrice" numeric(10, 2) NOT NULL,
  "savedContact" boolean NOT NULL DEFAULT false,
  "campaignSource" varchar(120),
  "campaignMedium" varchar(120),
  "campaignName" varchar(180),
  "campaignTerm" varchar(180),
  "campaignContent" varchar(180),
  gclid varchar(255),
  fbclid varchar(255),
  "landingPage" text,
  referrer text,
  status order_status NOT NULL DEFAULT 'pending',
  "whatsappMessageId" varchar(100),
  "couponCode" varchar(50),
  "partnerRef" varchar(100),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Backfill the partner referral-link tracking column on pre-existing databases.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "partnerRef" varchar(100);

CREATE TABLE IF NOT EXISTS coupons (
  id serial PRIMARY KEY,
  code varchar(50) NOT NULL UNIQUE,
  "discountPercent" numeric(5, 2) NOT NULL DEFAULT 10,
  "referralPercent" numeric(5, 2) NOT NULL DEFAULT 0,
  email varchar(320),
  instagram varchar(100),
  phone varchar(20),
  pix varchar(200),
  "isActive" boolean NOT NULL DEFAULT true,
  "firstPurchaseOnly" boolean NOT NULL DEFAULT false,
  "accountId" integer,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Backfill the partner ownership column on databases created before partners existed.
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS "accountId" integer;
-- Internal first-purchase-only coupons (e.g. PRIMEIRACOMPRA): only valid for phones with no cadastro.
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS "firstPurchaseOnly" boolean NOT NULL DEFAULT false;

-- Login accounts shared by admins and partners. Separate from `customers` (storefront buyers).
CREATE TABLE IF NOT EXISTS accounts (
  id serial PRIMARY KEY,
  role account_role NOT NULL,
  username varchar(100) NOT NULL UNIQUE,
  "passwordHash" varchar(200) NOT NULL,
  name varchar(100) NOT NULL,
  email varchar(320),
  phone varchar(20),
  instagram varchar(100),
  pix varchar(200),
  "commissionPercent" numeric(5, 2) NOT NULL DEFAULT 10,
  status account_status NOT NULL DEFAULT 'pending',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Withdrawal requests that close a partner's accumulation period and open the next one.
CREATE TABLE IF NOT EXISTS "payoutRequests" (
  id serial PRIMARY KEY,
  "accountId" integer NOT NULL,
  "periodStart" timestamp NOT NULL,
  "periodEnd" timestamp NOT NULL,
  "totalSales" numeric(12, 2) NOT NULL,
  "commissionAmount" numeric(10, 2) NOT NULL,
  status payout_status NOT NULL DEFAULT 'pending',
  "paymentNote" text,
  "requestedAt" timestamp NOT NULL DEFAULT now(),
  "paidAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_pizzas_updated_at ON pizzas;
CREATE TRIGGER set_pizzas_updated_at
BEFORE UPDATE ON pizzas
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON products;
CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_customers_updated_at ON customers;
CREATE TRIGGER set_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_cart_items_updated_at ON "cartItems";
CREATE TRIGGER set_cart_items_updated_at
BEFORE UPDATE ON "cartItems"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_promotions_updated_at ON promotions;
CREATE TRIGGER set_promotions_updated_at
BEFORE UPDATE ON promotions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON orders;
CREATE TRIGGER set_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_coupons_updated_at ON coupons;
CREATE TRIGGER set_coupons_updated_at
BEFORE UPDATE ON coupons
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_accounts_updated_at ON accounts;
CREATE TRIGGER set_accounts_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_payout_requests_updated_at ON "payoutRequests";
CREATE TRIGGER set_payout_requests_updated_at
BEFORE UPDATE ON "payoutRequests"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
