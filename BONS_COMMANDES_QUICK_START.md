# Quick Setup Guide - Bons de Commande

## Step 1: Run SQL Schema (Required First)

**File**: `SQL_SCHEMA_BONS_COMMANDES_COMPLETE.sql`

Go to your Supabase Dashboard:
1. Navigate to: SQL Editor
2. Create a new query
3. Copy entire content from `SQL_SCHEMA_BONS_COMMANDES_COMPLETE.sql`
4. Click "Run"
5. Wait for completion (should see multiple "CREATE TABLE" confirmations)

This creates:
- ✅ `bons_commandes` table
- ✅ `bons_commandes_products` table  
- ✅ `bons_commandes_offers` table
- ✅ `suppliers` table
- ✅ Indexes for performance
- ✅ Auto-update triggers
- ✅ Row-level security policies

---

## Step 2: Verify Storage Bucket

Check in Supabase Dashboard > Storage > Buckets

**Must have:**
- Bucket name: `offers`
- Public: Yes/On
- Policy: "Allow authenticated uploads" should exist

If policy is missing, run:
```sql
CREATE POLICY "Allow authenticated uploads 1i5ycnr_0" ON storage.objects 
FOR INSERT TO public 
WITH CHECK (bucket_id = 'offers');
```

---

## Step 3: Add Sample Suppliers (Optional)

In Supabase SQL Editor, run:
```sql
INSERT INTO public.suppliers (name, email, phone, address, city, contact_person, is_active)
VALUES
  ('Global Supplies Inc', 'contact@globalsupply.com', '+213123456789', '123 Business St', 'Algiers', 'Ahmed Ali', TRUE),
  ('Regional Traders', 'sales@regionaltraders.dz', '+213987654321', '456 Commerce Ave', 'Oran', 'Fatima Zahra', TRUE),
  ('Local Hardware Co', 'info@localhardware.dz', '+213555123456', '789 Industrial Rd', 'Constantine', 'Mohammed Hassan', TRUE)
ON CONFLICT (name) DO NOTHING;
```

---

## Step 4: Deploy Updated Frontend

Replace these files in your repository:

1. **src/pages/BonsCommandesPage.tsx**
   - Complete rewrite with database integration
   - Tabs for products and offers
   - Image upload to Supabase storage
   - Mobile camera scan support

2. **src/pages/PurchaseCommandsPage.tsx**
   - Updated `handleConvertToBons` function
   - Role-based access check (purchase role only)

---

## Step 5: Test the Flow

### Login as Purchase User
- Username: `purchase` or Email: `purchase@erp.com`
- Password: `achats123` (from mock users)

### Test Conversion
1. Go to "Commandes d'Achat" (Purchase Commands)
2. Find a "validated" purchase command
3. Click "Convertir" (Convert) button
   - *Only visible if logged in as `purchase` role*
4. Confirm conversion
5. New Bon appears in "Bons de Commande" page

### Test Product Management
1. Go to "Bons de Commande"
2. Click "Add Offer" on any bon
3. Switch to "Products" tab
4. Enter:
   - Product Name: "Steel Pipe 2 inch"
   - Quantity: 10
   - Unit Price: 1500
   - TVA: 19%
   - Status: Active
5. Verify auto-calculated totals:
   - Subtotal: 15,000 DA
   - TVA (19%): 2,850 DA
   - Total: 17,850 DA
6. Click "Save Products"

### Test Offers
1. Still in "Add Offer" dialog
2. Switch to "Offers" tab
3. Enter:
   - Supplier: "Global Supplies Inc"
   - Notes: "Price negotiable"
4. Click "Upload Image" or "Scan Offer"
5. Select/take photo
6. Click "Save Offers"
7. View back in "View Details" > "Offers" tab

---

## Step 6: Verify Database

In Supabase SQL Editor, check data:

```sql
-- View all bons commandes
SELECT * FROM bons_commandes;

-- View products in first bon
SELECT * FROM bons_commandes_products WHERE bon_commande_id = (SELECT id FROM bons_commandes LIMIT 1);

-- View offers
SELECT * FROM bons_commandes_offers;

-- View suppliers
SELECT * FROM suppliers WHERE is_active = TRUE;
```

---

## Key Features Working

After setup, these should work:

✅ **Role-Based Access**: Convert button only shows for `purchase` role users

✅ **Product Management**:
- Add multiple products
- Set quantity and unit price
- Choose TVA rate (0%, 9%, 19%)
- Activate/deactivate products
- Auto-calculate subtotals and totals

✅ **Offer Management**:
- Select supplier from dropdown (active suppliers only)
- Add notes
- Upload image to Supabase `offers` bucket
- Scan offer with device camera
- View all offers with images

✅ **Automatic Calculations**:
- Subtotal = Quantity × Unit Price
- TVA Amount = Subtotal × Rate%
- Total with TVA = Subtotal + TVA Amount
- Bon totals = Sum of active products

✅ **Data Persistence**:
- All data saved to Supabase database
- Images stored in `offers` bucket with public URLs
- RLS policies protect data

---

## Troubleshooting

### Convert Button Not Visible
- Check logged-in user role: Should be `purchase`
- User roles in `AuthContext.tsx`: admin, chef_projet, storage, **purchase**, gestionnaire, technique, comptable, resp_projets

### Storage Upload Fails
- Verify bucket `offers` exists and is public
- Check storage policy is applied
- Ensure logged-in user is authenticated

### Suppliers Dropdown Empty
- Run supplier insert query above
- Check `suppliers` table has records with `is_active = TRUE`

### TVA Calculations Wrong
- Verify TVA rate selection (0%, 9%, 19%)
- Check `unity_price` has valid number
- Confirm `quantity` is positive integer

---

## Database Schema Overview

```
bons_commandes
├── bon_id (unique identifier)
├── supplier_name
├── status (pending/validated/paid/finalized)
├── total_without_tva
├── total_with_tva
└── created_at

bons_commandes_products
├── product_name
├── quantity
├── unity_price
├── is_active (boolean)
├── tva_rate (0, 9, or 19)
├── subtotal (calculated)
├── tva_amount (calculated)
└── total_with_tva (calculated)

bons_commandes_offers
├── supplier_name
├── offer_date
├── image_url (from Supabase storage)
├── image_path (storage path)
└── notes

suppliers
├── name (unique)
├── email, phone, address
├── contact_person
└── is_active (boolean)
```

---

## File Locations

- **SQL Schema**: `SQL_SCHEMA_BONS_COMMANDES_COMPLETE.sql`
- **Frontend Page**: `src/pages/BonsCommandesPage.tsx`
- **Purchase Commands**: `src/pages/PurchaseCommandsPage.tsx`
- **Implementation Guide**: `BONS_COMMANDES_IMPLEMENTATION_COMPLETE.md`

---

## Support

If you encounter issues:

1. Check Supabase logs: Dashboard > Logs
2. Check browser console: F12 > Console tab
3. Verify RLS policies: Database > Policies
4. Test SQL directly: SQL Editor

For more details, see: **BONS_COMMANDES_IMPLEMENTATION_COMPLETE.md**

