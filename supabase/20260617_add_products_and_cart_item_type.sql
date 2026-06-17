DO $$ BEGIN
  CREATE TYPE cart_item_type AS ENUM ('pizza', 'product');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

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

ALTER TABLE "cartItems"
  ADD COLUMN IF NOT EXISTS "itemType" cart_item_type NOT NULL DEFAULT 'pizza',
  ADD COLUMN IF NOT EXISTS "productId" integer;

ALTER TABLE "cartItems"
  ALTER COLUMN "pizzaId1" DROP NOT NULL,
  ALTER COLUMN size DROP NOT NULL;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_products_updated_at ON products;
CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
