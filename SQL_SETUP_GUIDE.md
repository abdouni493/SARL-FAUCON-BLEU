# SQL Schema Setup Guide - ERP Supplier & Storage Management

## 📋 Table of Contents
1. [Suppliers Table](#suppliers-table)
2. [Products Table](#products-table)
3. [Indexes](#indexes)
4. [RLS Policies](#rls-policies)
5. [Sample Data](#sample-data)
6. [Setup Instructions](#setup-instructions)

---

## Suppliers Table

### Table Definition
```sql
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  commercial_registration VARCHAR(255),
  nif VARCHAR(255),
  nis VARCHAR(255),
  article VARCHAR(255),
  company_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Field Descriptions

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated unique identifier |
| full_name | VARCHAR(255) | NOT NULL | Supplier's full name (REQUIRED) |
| phone_number | VARCHAR(20) | NOT NULL | Contact phone number (REQUIRED) |
| address | TEXT | NOT NULL | Supplier's address (REQUIRED) |
| commercial_registration | VARCHAR(255) | NULLABLE | Commercial registration number (OPTIONAL) |
| nif | VARCHAR(255) | NULLABLE | National Identification Number (OPTIONAL) |
| nis | VARCHAR(255) | NULLABLE | Social Insurance Number (OPTIONAL) |
| article | VARCHAR(255) | NULLABLE | Business article/category (OPTIONAL) |
| company_name | VARCHAR(255) | NULLABLE | Official company name (OPTIONAL) |
| created_at | TIMESTAMP | DEFAULT NOW | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW | Last update timestamp |

---

## Products Table

### Table Definition
```sql
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  unity_id UUID,
  quantity INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Field Descriptions

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated unique identifier |
| name | VARCHAR(255) | NOT NULL | Product name |
| category_id | UUID | FOREIGN KEY | Reference to categories table |
| unity_id | UUID | - | Reference to unities table |
| quantity | INTEGER | DEFAULT 0 | Current stock quantity |
| price | DECIMAL(15,2) | DEFAULT 0 | Unit price in DA |
| supplier_id | UUID | FOREIGN KEY | Reference to suppliers table (OPTIONAL) |
| note | TEXT | NULLABLE | Additional product notes |
| created_at | TIMESTAMP | DEFAULT NOW | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW | Last update timestamp |

### Foreign Key Relationships
- **category_id** → `categories.id` (ON DELETE SET NULL)
- **supplier_id** → `suppliers.id` (ON DELETE SET NULL)
- **unity_id** → `unities.id` (implicit, for future reference)

---

## Indexes

### Performance Indexes Created

```sql
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON public.products(supplier_id);
```

### Index Strategy
- Indexes on foreign keys for faster joins
- Ensures efficient filtering by category and supplier
- Improves query performance on product listings

---

## RLS Policies

### Enable RLS

```sql
ALTER TABLE IF EXISTS public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
```

### Suppliers Policies

#### READ Policy
```sql
DROP POLICY IF EXISTS "Allow authenticated users to read suppliers" ON public.suppliers;
CREATE POLICY "Allow authenticated users to read suppliers" 
  ON public.suppliers 
  FOR SELECT 
  TO authenticated 
  USING (true);
```

#### WRITE/DELETE/UPDATE Policy
```sql
DROP POLICY IF EXISTS "Allow authenticated users to manage suppliers" ON public.suppliers;
CREATE POLICY "Allow authenticated users to manage suppliers" 
  ON public.suppliers 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);
```

### Products Policies

#### READ Policy
```sql
DROP POLICY IF EXISTS "Allow authenticated users to read products" ON public.products;
CREATE POLICY "Allow authenticated users to read products" 
  ON public.products 
  FOR SELECT 
  TO authenticated 
  USING (true);
```

#### WRITE/DELETE/UPDATE Policy
```sql
DROP POLICY IF EXISTS "Allow authenticated users to manage products" ON public.products;
CREATE POLICY "Allow authenticated users to manage products" 
  ON public.products 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);
```

### Security Notes
- RLS ensures only authenticated users can access data
- All authenticated users have full access to CRUD operations
- Adjust policies for more restrictive access control if needed
- For role-based access, modify `TO authenticated` with specific role checks

---

## Sample Data

### Insert Sample Suppliers

```sql
INSERT INTO public.suppliers (
  full_name, 
  phone_number, 
  address, 
  company_name, 
  commercial_registration, 
  nif
) VALUES
('Ahmed Ben Amar', '+213 555 123 456', '123 Rue de la Paix, Alger, 16000', 
 'Ben Amar SARL', 'RC123456', '012345678'),
('Fatima Kaddouri', '+213 661 987 654', 'Centre Commercial, Oran, 31000',
 'Kaddouri & Fils', 'RC987654', '987654321'),
('Mohamed Slimane', '+213 792 456 789', 'Zone Industrielle, Tlemcen, 13000',
 'Slimane Trade', 'RC456789', '456789012');
```

### Insert Sample Categories

```sql
INSERT INTO public.categories (name, description) VALUES
('Matériaux de Construction', 'Ciment, béton, acier'),
('Électricité', 'Câbles, interrupteurs, prises'),
('Plomberie', 'Tuyaux, robinets, joints'),
('Peinture et Revêtements', 'Peintures, vernis, carrelage'),
('Outils et Équipements', 'Outils manuels et électriques')
ON CONFLICT (name) DO NOTHING;
```

### Insert Sample Unities

```sql
INSERT INTO public.unities (name, symbol) VALUES
('Kilogramme', 'kg'),
('Tonne', 't'),
('Litre', 'L'),
('Mètre', 'm'),
('Mètre carré', 'm²'),
('Pièce', 'pcs'),
('Palette', 'pal')
ON CONFLICT (name) DO NOTHING;
```

---

## Setup Instructions

### Step 1: Access Supabase
1. Go to [supabase.com](https://supabase.com)
2. Login to your account
3. Select your project

### Step 2: Open SQL Editor
1. Click on "SQL Editor" in the left sidebar
2. Click "New Query"
3. Clear any default text

### Step 3: Copy SQL Schema
1. Open file: `SQL_SCHEMA_READY_TO_COPY.sql`
2. Select all content (Ctrl+A)
3. Copy (Ctrl+C)

### Step 4: Paste and Execute
1. Paste into Supabase SQL editor (Ctrl+V)
2. Review the SQL code
3. Click "Run" button or press Ctrl+Enter

### Step 5: Verify Creation
Look for success messages:
```
✓ Create table "suppliers"
✓ Create table "products"
✓ Create index "idx_products_category_id"
✓ Create index "idx_products_supplier_id"
✓ Create policy "Allow authenticated users to read suppliers"
✓ Create policy "Allow authenticated users to manage suppliers"
✓ Create policy "Allow authenticated users to read products"
✓ Create policy "Allow authenticated users to manage products"
```

### Step 6: Insert Sample Data (Optional)
1. Create new query in SQL Editor
2. Copy sample data SQL from above
3. Execute to populate test data

---

## Database Relationships

```
┌─────────────┐
│ categories  │◄────┐
├─────────────┤     │
│ id (UUID)   │     │
│ name        │     │
└─────────────┘     │
                    │
┌──────────────────────┐
│     products         │
├──────────────────────┤
│ id (UUID)            │
│ name                 │
│ category_id ─────────┼─→ categories.id
│ unity_id             │
│ quantity             │
│ price                │
│ supplier_id ─────────┼─→ suppliers.id
│ note                 │   (optional)
└──────────────────────┘

┌──────────────┐
│  suppliers   │
├──────────────┤
│ id (UUID)    │
│ full_name    │
│ phone_number │
│ address      │
│ ... more     │
└──────────────┘
```

---

## Query Examples

### Get All Products with Related Data
```sql
SELECT 
  p.id,
  p.name,
  c.name as category,
  u.name as unity,
  p.quantity,
  p.price,
  s.full_name as supplier
FROM public.products p
LEFT JOIN public.categories c ON p.category_id = c.id
LEFT JOIN public.unities u ON p.unity_id = u.id
LEFT JOIN public.suppliers s ON p.supplier_id = s.id
ORDER BY p.created_at DESC;
```

### Get Supplier Details
```sql
SELECT 
  id,
  full_name,
  phone_number,
  address,
  company_name,
  nif,
  nis
FROM public.suppliers
WHERE full_name ILIKE '%search_term%'
ORDER BY full_name;
```

### Get Products by Supplier
```sql
SELECT 
  p.name,
  p.quantity,
  p.price,
  s.full_name as supplier
FROM public.products p
JOIN public.suppliers s ON p.supplier_id = s.id
WHERE p.supplier_id = 'supplier_uuid_here'
ORDER BY p.name;
```

### Low Stock Alert
```sql
SELECT 
  p.id,
  p.name,
  p.quantity,
  c.name as category
FROM public.products p
LEFT JOIN public.categories c ON p.category_id = c.id
WHERE p.quantity < 10
ORDER BY p.quantity ASC;
```

---

## Troubleshooting

### Issue: "Relation does not exist"
**Solution:** Ensure you ran the entire SQL schema including the CREATE TABLE statements

### Issue: RLS Policy Error
**Solution:** Confirm RLS is enabled and policies are correctly applied:
```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('suppliers', 'products');
```

### Issue: Foreign Key Constraint Error
**Solution:** Ensure categories and unities tables exist. These are required dependencies in the full schema.

### Issue: Cannot insert NULL into NOT NULL field
**Solution:** Check required fields are provided:
- Suppliers: full_name, phone_number, address
- Products: name, quantity, price

---

## Maintenance

### Regular Tasks

1. **Monitor Table Growth**
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

2. **Backup Tables**
   - Use Supabase automatic backups
   - Export data regularly to CSV

3. **Update RLS Policies**
   - Review and adjust as access requirements change
   - Add role-based restrictions if needed

---

**Last Updated:** April 1, 2026  
**Version:** 1.0  
**Status:** Production Ready ✅
