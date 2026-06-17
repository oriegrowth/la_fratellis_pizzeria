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
  CREATE TYPE order_status AS ENUM ('pending', 'sent', 'completed', 'cancelled');
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

CREATE TABLE IF NOT EXISTS customers (
  id serial PRIMARY KEY,
  phone varchar(20) NOT NULL UNIQUE,
  name varchar(100) NOT NULL,
  address text NOT NULL,
  "addressNumber" varchar(20) NOT NULL,
  "addressReference" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "cartItems" (
  id serial PRIMARY KEY,
  "sessionId" varchar(100) NOT NULL,
  "pizzaId1" integer NOT NULL,
  "pizzaId2" integer,
  size pizza_size NOT NULL,
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
  status order_status NOT NULL DEFAULT 'pending',
  "whatsappMessageId" varchar(100),
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
