# Manage Bons - Quick Reference & Visual Guide

## Quick Start (3 Steps)

### Step 1: View Your Bons
- Navigate to Bons de Commandes page
- See grid view of all your bons
- Each bon card shows supplier name, total amount, and creation date

### Step 2: Click Manage Button (Settings Icon)
- Look for the first button on each bon card (Settings icon ⚙️)
- Opens the manage dialog with two tabs: **Products** | **Offers**

### Step 3: Add Products or Offers
- Fill in forms with required information
- Click "Save Products" or "Save Offers" to persist changes
- See confirmation message when complete

---

## User Interface Layout

### Bon Cards (Grid View)
```
┌─────────────────────────────────┐
│  Supplier Name: ACME Corp       │
│  Status: Pending                │
│  Total: 150,000.00 DA           │
│  Created: 2024-01-15            │
│                                 │
│  [⚙️] [👁️] [✏️] [🖨️] [🗑️]        │
│  Manage View Edit Print Delete   │
└─────────────────────────────────┘
```

### Manage Dialog - Products Tab
```
┌─────────────────────────────────────────────────────────┐
│ Manage Bon de Commande: BON-001                         │
│ Add and manage products and supplier offers             │
│                                                         │
│ [Products] [Offers]                                     │
│                                                         │
│ Existing Products:                                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Product │ Barcode │ Qty │ Unit │ TVA % │ Total DA  │ │
│ │ Laptop  │ 123456  │ 5   │ 8000 │ 19%  │ 47,600.00 │ │
│ │ Mouse   │ 789012  │ 10  │ 500  │ 19%  │ 5,950.00  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Add New Products:                                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Product Name: [_________________]                  │ │
│ │ Barcode: [______] Qty: [__] Price: [____] TVA: [19%] │
│ │ Total: 0.00 DA [X] Remove                          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [+ Add Product] [💾 Save Products]                      │
└─────────────────────────────────────────────────────────┘
```

### Manage Dialog - Offers Tab
```
┌─────────────────────────────────────────────────────────┐
│ Manage Bon de Commande: BON-001                         │
│ Add and manage products and supplier offers             │
│                                                         │
│ [Products] [Offers]                                     │
│                                                         │
│ Existing Offers:                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Supplier: ABC Wholesale                     [IMG]   │ │
│ │ Notes: Good pricing, quick delivery                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Add New Offers:                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Supplier: [Select from dropdown ▼]                 │ │
│ │ Description: [__________________________________]   │ │
│ │ Notes:                                              │ │
│ │ [                                                  │ │ │
│ │                                                    │ │ │
│ │ ]                                                  │ │ │
│ │ Upload Image:                                       │ │
│ │ ┌─────────────────────────────────────┐   [Preview]│ │
│ │ │ 📷 Click to upload image            │            │ │
│ │ └─────────────────────────────────────┘            │ │
│ │ [🗑️ Remove This Offer]                             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [+ Add Offer] [💾 Save Offers]                          │
└─────────────────────────────────────────────────────────┘
```

---

## Product Management Features

### Product Form Fields
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| Product Name | Text | Yes | - | Name of product |
| Barcode | Text | No | - | Optional barcode |
| Quantity | Number | Yes | 1 | Minimum 1 |
| Unit Price | Number | Yes | 0 | In DA currency |
| TVA % | Dropdown | Yes | 19% | Options: 0%, 9%, 19% |
| Total DA | Display | No | Auto-calc | Read-only |

### Auto-Calculation Example
```
Quantity:    5
Unit Price:  10,000 DA
TVA Rate:    19%

Subtotal = 5 × 10,000 = 50,000 DA
TVA Amount = 50,000 × (19/100) = 9,500 DA
Total with TVA = 50,000 + 9,500 = 59,500 DA ✓
```

### Product Actions
- **Add Product Row**: Click "+ Add Product" button to add new row
- **Remove Row**: Click [X] trash icon to remove unsaved row
- **Save All**: Click "💾 Save Products" to persist all products
- **Edit Mode**: Simply click and re-enter values, then save

---

## Offer Management Features

### Offer Form Fields
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| Supplier | Dropdown | Yes | - | Select from active suppliers |
| Description | Text | No | - | Brief description |
| Notes | Textarea | No | - | Additional notes |
| Image | File Upload | No | - | Stored in Supabase "offers" bucket |

### Image Upload
- **Supported Formats**: JPG, PNG, GIF, WebP
- **Storage Location**: Supabase bucket "offers"
- **URL Format**: `https://supabase.../storage/.../offers/bon-{id}-{timestamp}.{ext}`
- **Preview**: Shows thumbnail after upload
- **Max Size**: Depends on Supabase plan (default 5GB/file)

### Offer Actions
- **Add Offer Row**: Click "+ Add Offer" button
- **Upload Image**: Click dashed area or drag-and-drop
- **Remove Row**: Click "[🗑️ Remove This Offer]" button
- **Save All**: Click "💾 Save Offers" to persist all offers

---

## Workflow Examples

### Example 1: Add Products to a Bon
1. Click manage button on bon card
2. In Products tab, see existing products (if any)
3. Fill in product form:
   - Product Name: "Printer"
   - Barcode: "PRN-2024-001"
   - Quantity: 2
   - Unit Price: 25,000
   - TVA %: 19%
4. Total automatically shows: 59,500 DA
5. Click "+ Add Product" to add more rows
6. Click "💾 Save Products" to save all
7. See success message

### Example 2: Add Supplier Offers
1. Click manage button on bon card
2. Switch to Offers tab
3. Select supplier from dropdown (e.g., "ACME Suppliers")
4. Add description: "15% volume discount available"
5. Add notes: "Valid until end of month"
6. Upload image by clicking or dragging:
   - Automatic upload to "offers" bucket
   - Image preview appears
7. Click "+ Add Offer" for another supplier
8. Click "💾 Save Offers" to save all
9. See success message, offers appear above form

### Example 3: Multiple Products & Offers
1. Add 3 products with different TVA rates
2. Click "+ Add Product" twice to add 2 more rows
3. Fill in different products:
   - Product 1: 0% TVA (Raw material)
   - Product 2: 9% TVA (Service)
   - Product 3: 19% TVA (Goods)
4. Click "💾 Save Products"
5. Switch to Offers tab
6. Add 2 offers from different suppliers
7. Upload images for each
8. Click "💾 Save Offers"
9. All data persisted successfully

---

## Database Structure

### Products Storage
```
bons_commandes_products table:
├─ bon_commande_id: Links to bon
├─ product_name: "Laptop"
├─ barcode: "123456"
├─ quantity: 5
├─ unity_price: 8000
├─ tva_rate: 19
├─ subtotal: 40000
├─ tva_amount: 7600
├─ total_with_tva: 47600
└─ is_active: true
```

### Offers Storage
```
bons_commandes_offers table:
├─ bon_commande_id: Links to bon
├─ supplier_name: "ABC Suppliers"
├─ description: "Offer details"
├─ notes: "Payment terms"
├─ image_url: "https://...offers/bon-123-1234567890.jpg"
├─ image_path: "offers/bon-123-1234567890.jpg"
└─ created_at: Timestamp

Images Storage:
└─ offers bucket/
   ├─ bon-123-1234567890.jpg
   ├─ bon-123-1234567891.png
   └─ bon-456-1234567892.jpg
```

---

## Keyboard Shortcuts & Tips

| Action | Shortcut | Tip |
|--------|----------|-----|
| Save Products | Tab through fields + Save button | Use Tab key to navigate form |
| Add Product Row | Click "+ Add Product" | Can add unlimited products |
| Remove Row | Click [X] icon | Only removes unsaved rows |
| Upload Image | Drag-and-drop | Faster than clicking |
| Select Supplier | Type to filter | Start typing supplier name |
| Close Dialog | Click outside or X | Unsaved changes will be lost |

---

## Error Messages & Solutions

| Message | Cause | Solution |
|---------|-------|----------|
| "Please add at least one product" | Empty form | Fill in product fields |
| "Please add at least one offer" | Empty form | Fill in offer fields |
| "Error uploading image" | File too large/format issue | Try smaller JPG file |
| "Error saving products" | Database error | Check RLS policies |
| "Error saving offers" | Database error | Check RLS policies |
| No suppliers in dropdown | Table empty | Add suppliers first |

---

## Best Practices

1. **Always Enter Product Name**: Required field, cannot be empty
2. **Include Barcodes**: Helps with inventory tracking
3. **Select Correct TVA Rate**: 0% (raw), 9% (service), 19% (goods)
4. **Upload High-Quality Images**: Clear images of offers help comparison
5. **Add Descriptive Notes**: Help with future reference
6. **Save Frequently**: Don't add too many rows before saving
7. **Review Before Save**: Check totals are correct
8. **Keep Images Organized**: Use clear file names before upload

---

## Troubleshooting

### Problem: Manage button not appearing
- **Solution**: Refresh page, check that bon card is fully loaded

### Problem: Supplier dropdown empty
- **Solution**: Ensure suppliers table has active suppliers (is_active = true)

### Problem: Image not uploading
- **Solution**: Check file format (JPG, PNG), file size, and bucket permissions

### Problem: Save button disabled
- **Solution**: Fill in all required fields first

### Problem: Changes not saved
- **Solution**: Look for error message, check RLS policies in Supabase

---

## Related Documentation

- [MANAGE_BONS_IMPLEMENTATION_GUIDE.md](MANAGE_BONS_IMPLEMENTATION_GUIDE.md) - Technical implementation details
- [FIX_403_FORBIDDEN_BONS_COMMANDES.sql](FIX_403_FORBIDDEN_BONS_COMMANDES.sql) - Database RLS setup
- [ADMIN_VALIDATION_ARCHITECTURE.md](ADMIN_VALIDATION_ARCHITECTURE.md) - Database schema
