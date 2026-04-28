# Quick Setup Guide - Unit Price & Total Price Implementation

## What You Need to Do

### Step 1: Run SQL Migration (Supabase)
Copy and run this SQL in your Supabase SQL Editor (one at a time):

```sql
-- Add new columns
ALTER TABLE IF EXISTS public.products
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_price DECIMAL(15,2) NOT NULL DEFAULT 0;
```

```sql
-- Migrate existing data (if you have products with old price field)
UPDATE public.products 
SET unit_price = COALESCE(price, 0),
    total_price = COALESCE(price, 0) * quantity
WHERE unit_price = 0 AND price IS NOT NULL;
```

```sql
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_unit_price ON public.products(unit_price);
CREATE INDEX IF NOT EXISTS idx_products_total_price ON public.products(total_price);
```

### Step 2: Verify Data
```sql
SELECT id, name, quantity, unit_price, total_price FROM public.products LIMIT 5;
```

### Step 3: Remove Old Column (OPTIONAL - only after verification)
```sql
ALTER TABLE IF EXISTS public.products DROP COLUMN IF EXISTS price;
```

---

## How to Use the Feature

### Creating a Product
1. Go to "Nouveau Produit" (Create Product) or open CreateProductPage
2. Fill in: Name, Category, Unity
3. Enter **Quantity** (e.g., 5)
4. Enter **Unit Price** (e.g., 100 DA)
5. **Total Price calculates automatically** → Shows: 5 × 100 = 500 DA
6. Click "Enregistrer" (Save)

### Editing a Product
1. Go to "Gestion de Stock" (Storage Management)
2. Click Edit on any product
3. Modify Quantity or Unit Price
4. **Total Price updates automatically**
5. Click "Enregistrer" (Save)

### Viewing a Product
1. Click View on product card
2. See calculation: "Quantity × Unit Price = Total Price"
3. Shows all three values clearly

---

## The Calculation Logic

**Formula:** `total_price = quantity × unit_price`

**Example:**
- Quantity: 10
- Unit Price: 250 DA
- Total Price: 2,500 DA (auto-calculated)

---

## Files to Review

| File | Purpose |
|------|---------|
| CreateProductPage.tsx | Create new products with auto-calculation |
| StorageManagementPage.tsx | View, edit, delete products with new fields |
| SQL_MIGRATION_PRICE_UPDATE.sql | Database migration script |
| SQL_SCHEMA_UPDATED_WITH_PRICE_CALCULATION.sql | Complete updated schema |
| PRICE_CALCULATION_IMPLEMENTATION.md | Detailed documentation |

---

## Troubleshooting

### Q: Old price field still showing?
**A:** Run the migration steps above to add new columns

### Q: Total price not calculating?
**A:** Clear browser cache and refresh. Ensure you're editing quantity or unit_price, not total_price (it's read-only)

### Q: French/Arabic not showing?
**A:** Browser cache issue. Hard refresh (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac)

### Q: SQL error when running migration?
**A:** Make sure you run each SQL command separately, not all at once

---

## What Changed in the Code

### Before:
```javascript
formData = { price: 100 }
```

### After:
```javascript
formData = { 
  quantity: 5,
  unit_price: 100,
  total_price: 500  // Auto-calculated
}
```

---

## Languages Supported

| Language | Unit Price | Total Price | Auto-Calculated |
|----------|-----------|-----------|-----------------|
| French 🇫🇷 | Prix Unitaire | Prix Total | Calculé automatiquement |
| Arabic 🇸🇦 | السعر الوحدة | السعر الإجمالي | محسوب تلقائياً |

---

## ✅ Checklist

- [ ] Run SQL migration steps (3 queries)
- [ ] Verify data migrated (check query)
- [ ] Test creating a product
- [ ] Test editing a product
- [ ] Test viewing a product
- [ ] Check French translations
- [ ] Check Arabic translations
- [ ] Drop old price column (optional but recommended)

---

**Implementation Status:** ✅ COMPLETE AND READY TO USE

For detailed documentation, see: `PRICE_CALCULATION_IMPLEMENTATION.md`
