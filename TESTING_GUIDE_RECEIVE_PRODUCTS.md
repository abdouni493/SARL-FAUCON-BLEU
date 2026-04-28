# Testing Guide - Receive Products Implementation

## 🧪 Test Scenarios

### Test 1: French Language Interface

**Objective**: Verify all labels display correctly in French

**Steps**:
1. Open the ERP system
2. Go to Settings/Paramètres → Change language to French
3. Navigate to "Réception Produits"
4. Click "Créer Nouveau" button
   - **Expected**: Button text should be "Créer Nouveau"
5. In the dialog, verify labels:
   - [ ] Supplier label visible
   - [ ] "Notes" label visible (not missing)
   - [ ] "Unité" label visible for unit selection
   - [ ] "Prix par Unité" label visible for price
6. Fill in test data:
   ```
   Supplier: Test Supplier
   Notes: Test Notes
   Product 1:
     - Name: Product A
     - Category: Electronics
     - Unit: Unité (or actual unit)
     - Quantity: 10
     - Price Per Unit: 100 DA
   ```
7. Click "Enregistrer" (Save)
   - **Expected**: "Reception created successfully and products added to stock!"
8. Verify reception appears in list as completed
9. Navigate to "Gestion de Stock"
   - **Expected**: Product A should appear with quantity 10 and price 100 DA

---

### Test 2: Arabic Language Interface

**Objective**: Verify all labels display correctly in Arabic with RTL layout

**Steps**:
1. Open the ERP system
2. Go to Settings/الإعدادات → Change language to Arabic
3. Navigate to "استلام المنتجات" (Receive Products)
4. Click "إنشاء جديد" button
   - **Expected**: Button text should be "إنشاء جديد"
   - **Expected**: RTL layout activated
5. In the dialog, verify labels in Arabic:
   - [ ] "ملاحظات" (Notes) label visible
   - [ ] "الوحدة" (Unit) label visible
   - [ ] "السعر لكل وحدة" (Price Per Unit) label visible
6. Fill in test data:
   ```
   Supplier: مورد اختبار
   Notes: ملاحظات اختبارية
   Product 1:
     - Name: منتج B
     - Category: إلكترونيات
     - Unit: وحدة
     - Quantity: 5
     - Price Per Unit: 200 DA
   ```
7. Click "حفظ" (Save)
   - **Expected**: Success message displayed
   - **Expected**: RTL text alignment maintained
8. Navigate to "إدارة المخزون" (Stock Management)
   - **Expected**: Product B appears with quantity 5 and price 200 DA

---

### Test 3: Complete Button Removal

**Objective**: Verify complete button is no longer visible

**Steps**:
1. Create a reception (any language)
2. Verify the reception appears in the list
3. Look for buttons on the reception card:
   - [ ] View button present
   - [ ] Delete button present
   - [ ] Edit button NOT present (because status is 'completed')
   - [ ] Complete button NOT present (intentionally removed)
4. Click View to see details
5. Verify status shows as "completed"

**Expected Result**: No complete button, status is already completed

---

### Test 4: Stock Integration - Single Product

**Objective**: Verify products are added to stock on save

**Steps**:
1. Note current number of products in Stock Management
2. Create new reception with 1 product:
   - Name: "Test Product 1"
   - Category: Test Category
   - Unit: Test Unit
   - Quantity: 15
   - Price Per Unit: 50 DA
3. Save reception
4. Navigate to Stock Management
5. Search for "Test Product 1"
   - **Expected**: Product should appear
   - **Expected**: Quantity: 15
   - **Expected**: Unit Price: 50 DA
   - **Expected**: Total Price: 750 DA

---

### Test 5: Stock Integration - Multiple Products

**Objective**: Verify all products in a reception are added to stock

**Steps**:
1. Create new reception with 3 products:
   ```
   Product 1: "Multi Test A" - Qty: 10 - Price: 100
   Product 2: "Multi Test B" - Qty: 20 - Price: 50
   Product 3: "Multi Test C" - Qty: 5 - Price: 200
   ```
2. Save reception
3. Navigate to Stock Management
4. Search for each product:
   - [ ] "Multi Test A" found - Qty: 10, Price: 100
   - [ ] "Multi Test B" found - Qty: 20, Price: 50
   - [ ] "Multi Test C" found - Qty: 5, Price: 200

**Expected Result**: All 3 products appear in stock

---

## ✅ Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. French Interface | ✓/✗ | All labels in French |
| 2. Arabic Interface | ✓/✗ | All labels in Arabic + RTL |
| 3. Complete Button | ✓/✗ | Button removed from UI |
| 4. Single Product Stock | ✓/✗ | Product added to stock |
| 5. Multiple Products Stock | ✓/✗ | All products added |

---

## 📋 Required Database Tables

Ensure these tables exist with required columns:

### reception_products
```sql
- id (UUID)
- reception_id (VARCHAR)
- supplier_id (UUID FK)
- supplier_name (VARCHAR)
- status (VARCHAR) -- 'completed'
```

### products
```sql
- id (UUID)
- name (VARCHAR)
- quantity (INT)
- unit_price (DECIMAL)
```
