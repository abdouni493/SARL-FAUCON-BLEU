# Bons de Commande - Complete Implementation Guide

## Overview
Complete implementation of the Bons de Commande (Purchase Orders) system with database integration, supplier management, product pricing with TVA calculations, and image storage from Supabase.

---

## 1. DATABASE SCHEMA

### File: `SQL_SCHEMA_BONS_COMMANDES_COMPLETE.sql`

Run this SQL file in your Supabase Database Dashboard to create the complete schema:

#### Tables Created:

**1. `bons_commandes`** - Main Bons de Commande records
- `id` (UUID): Primary key
- `bon_id` (VARCHAR): Unique identifier (e.g., BON-1234567890)
- `purchase_command_id` (UUID): Links to purchase_commands
- `supplier_id` (UUID): Links to suppliers (optional)
- `supplier_name` (VARCHAR): Supplier name
- `status`: pending | validated | paid | finalized
- `total_price` (DECIMAL): Total before TVA
- `total_without_tva` (DECIMAL): Sum of subtotals
- `total_with_tva` (DECIMAL): Final total with TVA
- `created_by_id` (UUID): User who created it
- `created_at`, `updated_at` (TIMESTAMP)
- `notes` (TEXT): Additional information

**2. `bons_commandes_products`** - Products in each Bon
- `id` (UUID): Primary key
- `bon_commande_id` (UUID): Foreign key to bons_commandes
- `product_name` (VARCHAR): Product name
- `quantity` (INTEGER): Quantity ordered
- `unity_price` (DECIMAL): Price per unit
- `is_active` (BOOLEAN): Activate/deactivate product
- `tva_rate` (DECIMAL): 0, 9, or 19 percent
- `subtotal` (DECIMAL): quantity × unity_price
- `tva_amount` (DECIMAL): subtotal × (tva_rate/100)
- `total_with_tva` (DECIMAL): subtotal + tva_amount

**3. `bons_commandes_offers`** - Supplier offers
- `id` (UUID): Primary key
- `bon_commande_id` (UUID): Foreign key to bons_commandes
- `supplier_id` (UUID): Foreign key to suppliers
- `supplier_name` (VARCHAR): Supplier name
- `offer_date` (TIMESTAMP): When offer was received
- `image_path` (VARCHAR): Storage path in Supabase
- `image_url` (VARCHAR): Public URL of the image
- `notes` (TEXT): Offer details

**4. `suppliers`** - Supplier database
- `id` (UUID): Primary key
- `name` (VARCHAR): Supplier name (unique)
- `email`, `phone` (VARCHAR): Contact info
- `address` (TEXT): Full address
- `city` (VARCHAR): City name
- `contact_person` (VARCHAR): Primary contact
- `is_active` (BOOLEAN): Active/inactive status

### Storage Policy Required

```sql
CREATE POLICY "Allow authenticated uploads 1i5ycnr_0" ON storage.objects 
FOR INSERT TO public 
WITH CHECK (bucket_id = 'offers');
```

---

## 2. ROLE-BASED ACCESS CONTROL

### Convert to Bons de Commande Button

**Only visible to users with `purchase` role**

In `PurchaseCommandsPage.tsx`:
```tsx
{cmd.status === 'pending' && (
  <div className="flex gap-2">
    {/* Validation button visible to all */}
    <Button onClick={() => setValidatingId(cmd.id)}>
      {t('common.validate')}
    </Button>
    
    {/* Convert button ONLY for purchase role */}
    {user?.role === 'purchase' && (
      <Button onClick={() => setConvertingId(cmd.id)}>
        {t('common.convert')}
      </Button>
    )}
  </div>
)}

{cmd.status === 'validated' && user?.role === 'purchase' && (
  <Button onClick={() => setConvertingId(cmd.id)}>
    {t('common.convert')}
  </Button>
)}
```

---

## 3. CONVERSION FLOW

### Convert Purchase Command → Bons de Commande

**Function: `handleConvertToBons` in PurchaseCommandsPage.tsx**

Process:
1. Get purchase command details
2. Fetch all products from `purchase_command_products` table
3. Create new record in `bons_commandes` table
4. Copy all products to `bons_commandes_products` with initial values:
   - `unity_price`: 0 (to be filled by user)
   - `is_active`: false (user activates them)
   - `tva_rate`: 19% (default)
5. Update purchase command status to `finalized`

```tsx
const handleConvertToBons = async (cmdId: string) => {
  // 1. Get purchase command
  const purchaseCmd = commands.find(c => c.id === cmdId);
  
  // 2. Fetch products
  const { data: productsData } = await supabase
    .from('purchase_command_products')
    .select('*')
    .eq('purchase_command_id', cmdId);
  
  // 3. Create bon_commande
  const { data: bonData } = await supabase
    .from('bons_commandes')
    .insert({
      bon_id: `BON-${Date.now()}`,
      purchase_command_id: cmdId,
      supplier_name: purchaseCmd.supplier_name,
      status: 'pending',
      created_by_id: user?.id
    })
    .select('id')
    .single();
  
  // 4. Insert products
  const bonProducts = productsData.map(p => ({
    bon_commande_id: bonData.id,
    product_name: p.product_name,
    quantity: p.quantity,
    unity_price: 0,
    is_active: false,
    tva_rate: 19
  }));
  
  await supabase
    .from('bons_commandes_products')
    .insert(bonProducts);
  
  // 5. Update purchase command
  await supabase
    .from('purchase_commands')
    .update({ status: 'finalized' })
    .eq('id', cmdId);
};
```

---

## 4. BONS COMMANDES PAGE - INTERFACE

### Features:

#### A. Dashboard Overview
- Total Bons de Commande count
- Total Offers count
- Total Amount (with TVA)

#### B. Bons List
Display all bons with:
- Bon ID (`bon_id`)
- Supplier name
- Status badge (pending/validated/paid/finalized)
- Total amount (with TVA)
- Creation date
- Action buttons:
  - **View Details**: See products and offers
  - **Add Offer**: Add products/offers to the bon

#### C. View Details Dialog
Tabbed interface:
1. **Products Tab**:
   - Product name
   - Quantity
   - Unit price
   - Total with TVA
   - TVA rate (9% or 19%)
   - Active/Inactive status

2. **Offers Tab**:
   - Supplier name
   - Offer date
   - Notes
   - Image preview

#### D. Add Products/Offers Dialog

**Products Tab Features:**
- Product name (required)
- Quantity (required, minimum 1)
- Unit price (required)
- TVA selection: 0%, 9%, or 19%
- Status: Active/Inactive
- Auto-calculated fields:
  - Subtotal = Quantity × Unit Price
  - TVA Amount = Subtotal × (TVA Rate / 100)
  - Total with TVA = Subtotal + TVA Amount
- Add/Remove product rows
- Save button updates database and recalculates totals

**Offers Tab Features:**
- Supplier dropdown (from `suppliers` table, active only)
- Notes field
- Upload Image button → Supabase `offers` bucket
- Scan Offer button → Camera capture
- Image preview
- Add/Remove offer rows
- Save button inserts to `bons_commandes_offers`

---

## 5. PRODUCT MANAGEMENT

### Add Products to Bon

**User Workflow:**
1. Click "Add Offer" button on Bon card
2. Switch to "Products" tab
3. Enter product details:
   - Product Name
   - Quantity
   - Unit Price
4. Select TVA rate (0%, 9%, or 19%)
5. Choose status: Active or Inactive
6. Click "Save Products" button

**Calculations:**
- Only active products count toward totals
- System auto-calculates:
  - Subtotal = quantity × unity_price
  - TVA amount based on selected rate
  - Total with TVA

**Database Update:**
When saved, inserts to `bons_commandes_products` and updates parent `bons_commandes` table totals.

---

## 6. OFFERS MANAGEMENT

### Add Offers to Bon

**User Workflow:**
1. Click "Add Offer" button on Bon card
2. Switch to "Offers" tab
3. For each offer:
   - Select Supplier from dropdown
   - Enter Notes (optional)
   - Click "Upload Image" or "Scan Offer"

### Image Handling

#### Upload Image
1. Click "Upload Image" button
2. Select image from device
3. Image uploads to Supabase `offers` bucket
4. Filename: `{bon_id}_offer_{index}_{timestamp}`
5. Public URL displayed as preview
6. URL saved to database

#### Scan Offer (Mobile)
1. Click "Scan Offer" button
2. Device camera opens
3. Take photo of offer/document
4. Image auto-uploads to `offers` bucket
5. URL saved to database

**Storage Details:**
- Bucket: `offers`
- Public access enabled
- Images retrievable by public URL
- Policy allows authenticated uploads

### Database Storage
Data saved to `bons_commandes_offers`:
- Supplier name
- Offer date (auto-timestamp)
- Image URL (public)
- Notes

---

## 7. SUPABASE STORAGE CONFIGURATION

### Bucket Setup

Already created:
```
Bucket Name: offers
Bucket ID: offers
Public: Yes
```

### Policy Applied

```sql
CREATE POLICY "Allow authenticated uploads 1i5ycnr_0" 
ON storage.objects 
FOR INSERT TO public 
WITH CHECK (bucket_id = 'offers');
```

### Upload Process in Code

```tsx
const handleImageUpload = async (idx: number) => {
  const file = /* file from input */;
  
  // Generate unique filename
  const fileName = `${offerBon.bon_id}_offer_${idx}_${Date.now()}`;
  
  // Upload to storage
  const { data, error } = await supabase.storage
    .from('offers')
    .upload(fileName, file);
  
  if (error) throw error;
  
  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('offers')
    .getPublicUrl(fileName);
  
  // Save URL to database
  const imageUrl = publicUrlData.publicUrl;
};
```

---

## 8. CALCULATION LOGIC

### TVA Calculations

Supported rates: 0%, 9%, 19%

**Formula per product:**
```
subtotal = quantity × unity_price
tva_amount = subtotal × (tva_rate / 100)
total_with_tva = subtotal + tva_amount
```

**Bon totals (only active products):**
```
total_without_tva = sum(subtotal for active products)
total_tva_19 = sum(tva_amount where tva_rate=19)
total_tva_9 = sum(tva_amount where tva_rate=9)
total_with_tva = sum(total_with_tva for active products)
```

### Example

Product:
- Name: "Steel Pipe"
- Quantity: 10
- Unit Price: 1,000 DA
- TVA Rate: 19%

Calculation:
- Subtotal = 10 × 1,000 = 10,000 DA
- TVA (19%) = 10,000 × 0.19 = 1,900 DA
- Total = 10,000 + 1,900 = 11,900 DA

---

## 9. FILE STRUCTURE

### New/Modified Files

1. **SQL_SCHEMA_BONS_COMMANDES_COMPLETE.sql**
   - Complete schema with all tables, indexes, triggers, RLS policies

2. **src/pages/BonsCommandesPage.tsx**
   - Completely refactored
   - Database-connected state management
   - Product and offer management
   - Image upload/storage integration
   - Tabbed interface for products and offers

3. **src/pages/PurchaseCommandsPage.tsx**
   - Modified: `handleConvertToBons` function
   - Added: Role-based access check for convert button
   - Only `purchase` role can see convert button

---

## 10. DEPLOYMENT STEPS

### 1. Run SQL Schema
```sql
-- Copy entire content of SQL_SCHEMA_BONS_COMMANDES_COMPLETE.sql
-- Execute in Supabase SQL Editor
```

### 2. Create Storage Policy (if not already done)
```sql
CREATE POLICY "Allow authenticated uploads 1i5ycnr_0" ON storage.objects 
FOR INSERT TO public 
WITH CHECK (bucket_id = 'offers');
```

### 3. Update Frontend Files
- Replace BonsCommandesPage.tsx
- Update PurchaseCommandsPage.tsx with new handleConvertToBons logic

### 4. Add Translation Keys (if needed)
In `src/i18n/fr.json` and `src/i18n/ar.json`:
```json
{
  "common": {
    "add_product": "Ajouter un produit",
    "unity_price": "Prix unitaire",
    "save_products": "Enregistrer les produits",
    "save_offers": "Enregistrer les offres",
    "total_without_tva": "Total HT",
    "total_with_tva": "Total TTC",
    "scan_offer": "Scanner l'offre",
    "confirm_delete_message": "Êtes-vous sûr de vouloir supprimer?"
  }
}
```

### 5. Test Flow
1. Login as `purchase` role
2. Go to Purchase Commands
3. Find a validated purchase command
4. Click "Convert to Bon de Commande"
5. Go to Bons de Commande page
6. Click "Add Offer"
7. Add products with pricing and TVA
8. Upload/scan offer images
9. Verify calculations
10. View details to confirm

---

## 11. FEATURES SUMMARY

✅ **Role-Based Access**: Only `purchase` role can convert
✅ **Database Integration**: All data persists in Supabase
✅ **Product Management**: Add/remove products with quantity and pricing
✅ **TVA Calculation**: Automatic calculation for 0%, 9%, 19% rates
✅ **Active/Inactive Status**: Users can toggle product status
✅ **Supplier Dropdown**: Select from active suppliers in database
✅ **Image Upload**: Upload offer images to Supabase storage
✅ **Scan Functionality**: Mobile device camera integration
✅ **Automatic Totals**: Real-time calculation updates
✅ **Tabbed Interface**: Organized product and offer management
✅ **Full CRUD**: Create, Read, Update, Delete operations
✅ **Responsive Design**: Mobile-friendly interface

---

## 12. TROUBLESHOOTING

### Images Not Uploading
- Check Supabase storage policy is applied
- Verify bucket name is exactly `offers`
- Ensure user has permission to upload (authenticated)

### Calculations Not Updating
- Check TVA rate selection triggers update
- Verify `is_active` status is being toggled
- Confirm database fields match schema

### Supplier Dropdown Empty
- Check `suppliers` table has `is_active = true` records
- Verify data fetched in `fetchData()` function

### Convert Button Not Showing
- Verify user role is `purchase`
- Check `user?.role === 'purchase'` condition
- Look in browser DevTools console for role value

---

## 13. API ENDPOINTS USED

All operations use Supabase REST API:

```
GET    /rest/v1/bons_commandes
POST   /rest/v1/bons_commandes
PATCH  /rest/v1/bons_commandes
DELETE /rest/v1/bons_commandes

GET    /rest/v1/bons_commandes_products
POST   /rest/v1/bons_commandes_products
PATCH  /rest/v1/bons_commandes_products
DELETE /rest/v1/bons_commandes_products

GET    /rest/v1/bons_commandes_offers
POST   /rest/v1/bons_commandes_offers
DELETE /rest/v1/bons_commandes_offers

GET    /rest/v1/suppliers

STORAGE /storage/v1/object/offers  (upload/download images)
```

---

## 14. RELATED DOCUMENTS

- **SQL_CREATE_PURCHASE_COMMAND_PRODUCTS.sql**: Product table schema
- **SQL_SCHEMA_UPDATED_WITH_PRICE_CALCULATION.sql**: Purchase commands schema
- **COMMANDS_TO_PURCHASE_INTEGRATION.md**: Commands conversion flow
- **IMPLEMENTATION_GUIDE_COMMANDS.md**: Complete commands workflow

---

**Implementation Date**: April 1, 2026
**Status**: Complete and Ready for Testing
**All Features Implemented**: ✅

