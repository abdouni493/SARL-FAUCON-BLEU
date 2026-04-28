# Quick Reference: Gestion Commandes Updates

## What's New

✅ **Database Integration** - Now connected to Supabase
✅ **Live Inventory** - Products fetched from database in real-time  
✅ **Auto-Deduction** - Inventory automatically reduced when verified
✅ **Smart Search** - Search and select from actual inventory products
✅ **Proper Translations** - Verify button shows translated text (French & Arabic)
✅ **Loading Indicators** - Visual feedback while loading data

---

## Using the Feature

### 1. Open Commands Management
Navigate to: **Gestion Commandes** (Admin Menu → Gestion Commandes)

### 2. Click Verify on Any Command
- See all products in that command
- Each product shows: Name, Category, Quantity, Unit Price

### 3. For Each Product - Mark as EXISTS or NOT FOUND
- **EXISTS** ✅ - Product available in inventory
- **NOT FOUND** ❌ - Product needs to be ordered

### 4. If EXISTS - Search and Select
- Type product name to search
- Results filtered from Supabase database
- Click product to select
- Shows: "Will deduct X [units] from inventory"

### 5. Click Convert When All Verified
- System automatically deducts selected products
- Inventory updated in Supabase
- Shows confirmation with details:
  - "X products verified and deducted"
  - "Y products not found - converted to purchase order"

### 6. Command Status Updates
- ✅ All found → Status: **FINALIZED** (inventory updated)
- ⚠️ Some missing → Status: **PURCHASE** (convert to order)

---

## Database Structure

```
Products Table (Supabase)
├─ id: UUID
├─ name: Text
├─ quantity: Integer (decreases after verification)
├─ unit_price: Decimal (price per unit)
├─ total_price: Decimal (auto-calculated)
├─ categories: Related table
│  └─ name: Text
├─ unities: Related table
│  ├─ name: Text
│  └─ symbol: Text (e.g., "pcs", "kg", "L")
└─ suppliers: Related table
   └─ full_name: Text
```

---

## Example Workflow

**Scenario:** Create Material Command for 10 Laptops + 5 Mice

```
1. CREATE COMMAND
   └─ Laptop: qty 10
   └─ Mouse: qty 5

2. VERIFY COMMAND
   Laptop:
   ├─ Mark: EXISTS ✅
   ├─ Search: "Laptop"
   ├─ Result: 25 laptops available (inventory)
   ├─ Select: "Dell Laptop" (25 pcs)
   └─ Will deduct: 10 pcs
   
   Mouse:
   ├─ Mark: EXISTS ✅
   ├─ Search: "Mouse"
   ├─ Result: 100 mice available (inventory)
   ├─ Select: "Wireless Mouse" (100 pcs)
   └─ Will deduct: 5 pcs

3. CONVERT
   ✓ Dell Laptop: 25 → 15 pcs (deducted 10)
   ✓ Wireless Mouse: 100 → 95 pcs (deducted 5)
   → Confirmation: "15 products verified and deducted"

4. COMMAND STATUS
   └─ Changed to: FINALIZED
```

---

## Important Notes

⚠️ **Inventory Deduction is Permanent**
- Once verified and converted, inventory is immediately reduced
- Cannot be undone (backup your database!)

⚠️ **Search Only Shows Available Products**
- Only products with `quantity > 0` appear in search
- Out of stock products are hidden

✅ **Real-time Updates**
- Inventory updates appear immediately
- All users see updated quantities

✅ **Mixed Status Handling**
- If some products found and some not:
  - Found products: Deducted from inventory
  - Not found products: Create purchase order
  - Command status: PURCHASE (to process missing items)

---

## Translations

| Action | French | Arabic |
|--------|--------|--------|
| Verify | Vérifier | التحقق |
| View | Voir | عرض |
| Search | Rechercher | بحث |
| Exists | Produit Existe | المنتج موجود |
| Not Found | Produit Non Trouvé | المنتج غير موجود |

---

## Troubleshooting

**Q: Button shows "common.verify" instead of text**
A: Refresh browser (Ctrl+Shift+R). Translation keys just added.

**Q: Products not showing in search**
A: Ensure product quantity > 0 in database. Out of stock items won't appear.

**Q: Inventory didn't decrease after verification**
A: Check Supabase connection. Ensure you clicked "Convert" button, not just "Verify".

**Q: Error when deducting**
A: Check if product exists in database and has valid quantity field.

**Q: Loading spinner keeps spinning**
A: Check Supabase connection status. May indicate network issue.

---

## Files Updated

✅ src/pages/CommandsManagementPage.tsx - Full database integration
✅ src/i18n/fr.json - Added "verify" translation
✅ src/i18n/ar.json - Added "verify" translation

---

## Status: READY TO USE ✅

The feature is complete, tested, and production-ready.
All database operations working correctly.
Translations displaying properly in French and Arabic.
