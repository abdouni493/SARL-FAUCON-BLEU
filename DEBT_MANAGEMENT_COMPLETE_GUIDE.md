# 💰 DEBT MANAGEMENT SYSTEM - COMPLETE IMPLEMENTATION GUIDE

**Date:** April 6, 2026  
**Feature:** Comptable Debt Management Interface  
**Status:** ✅ Ready for Implementation  

---

## 📋 TABLE OF CONTENTS

1. [Feature Overview](#feature-overview)
2. [Database Schema](#database-schema)
3. [React Component](#react-component)
4. [Implementation Steps](#implementation-steps)
5. [Testing Procedures](#testing-procedures)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 FEATURE OVERVIEW

### What This Feature Does

The Debt Management System allows comptable users to:

✅ **Create Debts**
- Search and select bon de commande (purchase order)
- Auto-populate supplier name and total price
- Edit price and add description
- Track debt creation date

✅ **Manage Debts**
- View all created debts in card format
- See summary statistics (total debt, paid, remaining)
- Edit debt details
- Delete debts with confirmation
- View payment progress with visual progress bar

✅ **Record Payments**
- Make partial or full payments
- Auto-calculate remaining balance
- Add payment description
- Track payment history
- View all payments for each debt

✅ **Visual Indicators**
- Color-coded status badges (pending, partial, paid)
- Progress bars showing payment percentage
- Summary cards with key metrics

---

## 🗄️ DATABASE SCHEMA

### Tables Created

#### 1. `debts` Table
Main table storing debt records

```sql
CREATE TABLE debts (
  id UUID PRIMARY KEY,                      -- Unique debt ID
  user_id UUID,                             -- Comptable user ID
  bon_commande_id UUID,                     -- Reference to bon de commande
  supplier_id UUID,                         -- Optional supplier reference
  supplier_name VARCHAR(255),               -- Supplier name
  total_price DECIMAL(15, 2),               -- Total debt amount
  amount_paid DECIMAL(15, 2),               -- Amount paid so far
  remaining_balance DECIMAL (15, 2),        -- Auto-calculated balance
  description TEXT,                          -- Debt description
  status VARCHAR(50),                       -- pending | partial | paid | overdue
  due_date TIMESTAMP,                       -- Optional due date
  created_at TIMESTAMP,                     -- Creation timestamp
  updated_at TIMESTAMP,                     -- Last update timestamp
  created_by_role VARCHAR(50),              -- Role of creator
  notes TEXT                                -- Additional notes
);
```

**Status Values:**
- `pending` - No payment made yet
- `partial` - Some payment made, balance remaining
- `paid` - Fully paid
- `overdue` - Past due date (if set)

#### 2. `debt_payments` Table
Tracks individual payment transactions

```sql
CREATE TABLE debt_payments (
  id UUID PRIMARY KEY,                      -- Unique payment ID
  debt_id UUID,                             -- Reference to debt
  user_id UUID,                             -- User who made payment
  amount_paid DECIMAL(15, 2),               -- Payment amount
  payment_method VARCHAR(100),              -- cash | check | transfer | other
  description TEXT,                         -- Payment description
  payment_date TIMESTAMP,                   -- When payment was made
  reference_number VARCHAR(100),            -- Check/transfer reference
  notes TEXT,                               -- Additional notes
  created_at TIMESTAMP                      -- Record creation time
);
```

#### 3. `suppliers` Table
Optional table for supplier information

```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  tax_id VARCHAR(50),
  status VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Indexes Created

| Index Name | Table | Purpose |
|-----------|-------|---------|
| idx_debts_user_id | debts | Fast queries by user |
| idx_debts_bon_commande_id | debts | Fast queries by purchase order |
| idx_debts_status | debts | Fast status filtering |
| idx_debts_user_status | debts | Combined user + status queries |
| idx_debt_payments_debt_id | debt_payments | Fast payment lookup |
| idx_debt_payments_date | debt_payments | Payment history queries |
| idx_debts_remaining | debts | Find unpaid debts quickly |

### Views Created

#### `debts_summary` View
```sql
-- Shows all debts with calculated metrics
SELECT 
  d.*,
  bc.bon_id,
  COUNT(dp.id) as payment_count,
  MAX(dp.payment_date) as last_payment_date,
  payment_status  -- Fully Paid | Partially Paid | Not Started
```

#### `pending_debts` View
```sql
-- Shows only unpaid debts
SELECT * FROM debts_summary
WHERE status IN ('pending', 'partial', 'overdue')
ORDER BY due_date ASC
```

#### `debt_statistics` View
```sql
-- Summary statistics by user
SELECT 
  user_id,
  total_debts,
  paid_debts,
  unpaid_debts,
  total_paid,
  total_remaining,
  total_debt_amount
```

---

## ⚛️ REACT COMPONENT

### Component: `ComptableDebtManagementPage.tsx`

**Location:** `src/pages/ComptableDebtManagementPage.tsx`

### Key Features

#### 1. **Create Debt Interface**
```typescript
- Search bons de commandes with autocomplete
- Auto-populate supplier and total price
- Allow editing of values
- Add optional description
- Validation before saving
```

#### 2. **Debt Display**
```typescript
- Card layout showing:
  - Supplier name with status badge
  - Total price and payment status
  - Amount paid and remaining balance
  - Progress bar (visual percentage)
  - Action buttons (Pay, Edit, Delete, View Payments)
```

#### 3. **Payment Recording**
```typescript
- Modal dialog to record payments
- Show current debt status
- Input payment amount with validation
- Auto-calculate remaining balance
- Add payment description
- Real-time balance updates
```

#### 4. **Summary Statistics**
```typescript
- Total debt amount across all debts
- Total amount paid
- Total remaining balance
- Display in summary cards
```

### State Variables

```typescript
// Debt Data
const [debts, setDebts] = useState<Debt[]>([]);
const [bonsCommandes, setBonsCommandes] = useState<BonCommande[]>([]);

// Create Debt Form
const [showCreateDebt, setShowCreateDebt] = useState(false);
const [selectedBonId, setSelectedBonId] = useState('');
const [selectedBonData, setSelectedBonData] = useState<BonCommande | null>(null);
const [supplierName, setSupplierName] = useState('');
const [totalPrice, setTotalPrice] = useState('');
const [debtDescription, setDebtDescription] = useState('');

// Edit Debt Form
const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
const [editSupplierName, setEditSupplierName] = useState('');
const [editTotalPrice, setEditTotalPrice] = useState('');
const [editDescription, setEditDescription] = useState('');

// Delete Debt
const [deletingDebtId, setDeletingDebtId] = useState<string | null>(null);

// Pay Debt
const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
const [paymentAmount, setPaymentAmount] = useState('');
const [paymentDescription, setPaymentDescription] = useState('');

// View Payments
const [viewPaymentsDebtId, setViewPaymentsDebtId] = useState<string | null>(null);
const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
```

### Key Functions

#### `fetchData()`
Fetches all debts and bons commandes from database

#### `handleCreateDebt()`
Creates new debt record with validation

#### `handleEditDebt()`
Updates existing debt details

#### `handleDeleteDebt()`
Deletes debt with confirmation

#### `handlePayDebt()`
Records payment and updates debt amount

#### `fetchDebtPayments(debtId)`
Retrieves all payments for specific debt

---

## 🚀 IMPLEMENTATION STEPS

### Step 1: Execute Database Schema (5 minutes)

**File:** `SQL_DEBT_MANAGEMENT_SCHEMA.sql`

1. Open Supabase → SQL Editor
2. Copy entire SQL file content
3. Paste into editor
4. Click Execute button
5. Verify tables created with verification queries

**Verification:**
```sql
-- Check tables exist
SELECT * FROM information_schema.tables 
WHERE table_name IN ('debts', 'debt_payments', 'suppliers');

-- Check columns in debts table
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'debts';
```

### Step 2: Add Route to Application (2 minutes)

**File:** `src/router.tsx` or navigation config

Add new route:
```typescript
{
  path: '/comptable/debts',
  element: <ComptableDebtManagementPage />,
  label: 'إدارة الديون'
}
```

### Step 3: Add Navigation Menu Item (1 minute)

**File:** Navigation/Menu component

Add menu item:
```tsx
<NavLink to="/comptable/debts">
  <CreditCard className="w-4 h-4" />
  إدارة الديون والفواتير
</NavLink>
```

### Step 4: Copy Component File (1 minute)

**File:** `ComptableDebtManagementPage.tsx`

1. Copy entire component file content
2. Create new file at: `src/pages/ComptableDebtManagementPage.tsx`
3. Paste content
4. Save file

### Step 5: Test the Feature (10 minutes)

See [Testing Procedures](#testing-procedures) section below

---

## ✅ TESTING PROCEDURES

### Test Case 1: Create Debt

**Steps:**
1. Login as comptable user
2. Navigate to Debt Management page
3. Click "+ إضافة دين جديد" button
4. Search for bon de commande
5. Select a bon de commande
6. Verify supplier and price auto-populate
7. Edit supplier name if needed
8. Enter amount
9. Add description
10. Click "إنشاء الدين"

**Expected:**
- ✅ Debt appears in card list
- ✅ Status shows "قيد الانتظار" (Pending)
- ✅ Summary cards update with new totals

### Test Case 2: Edit Debt

**Steps:**
1. Find existing debt card
2. Click "تعديل" (Edit) button
3. Change supplier name
4. Change total price
5. Update description
6. Click "حفظ التغييرات"

**Expected:**
- ✅ Debt card updates immediately
- ✅ Summary totals recalculate
- ✅ Success message shows

### Test Case 3: Record Payment

**Steps:**
1. Find debt with pending/partial status
2. Click "الدفع" (Pay) button
3. See debt summary (total, paid, remaining)
4. Enter payment amount
5. Add payment description
6. Click "تسجيل الدفعة"

**Expected:**
- ✅ Amount paid increases
- ✅ Remaining balance decreases
- ✅ Progress bar updates
- ✅ Status may change to "paid" if fully paid
- ✅ Payment appears in payment history

### Test Case 4: View Payment History

**Steps:**
1. Click "الدفعات" (Payments) button on debt card
2. View all payments for that debt
3. See amount, date, and description for each payment
4. Close dialog

**Expected:**
- ✅ All payments listed chronologically
- ✅ Payment amounts and dates visible
- ✅ Dialog closes properly

### Test Case 5: Delete Debt

**Steps:**
1. Click "حذف" (Delete) button on debt card
2. Confirm deletion in dialog
3. Click "حذف" to confirm

**Expected:**
- ✅ Debt is removed from list
- ✅ Summary totals update
- ✅ Success message shows
- ✅ Cannot be undone

### Test Case 6: Database Verification

**SQL Queries:**
```sql
-- Check debts created
SELECT id, supplier_name, total_price, amount_paid, status 
FROM debts 
WHERE user_id = 'user-uuid';

-- Check payments recorded
SELECT * FROM debt_payments 
WHERE debt_id IN (SELECT id FROM debts WHERE user_id = 'user-uuid');

-- Check views work
SELECT * FROM debts_summary LIMIT 5;
SELECT * FROM pending_debts;
SELECT * FROM debt_statistics WHERE user_id = 'user-uuid';
```

---

## 📡 API REFERENCE

### Database Queries Used

#### Get All Debts for User
```sql
SELECT * FROM debts 
WHERE user_id = 'user-id'
ORDER BY created_at DESC;
```

#### Get Debt with Payment History
```sql
SELECT 
  d.*,
  json_agg(json_build_object(
    'id', dp.id,
    'amount', dp.amount_paid,
    'date', dp.payment_date,
    'description', dp.description
  )) as payments
FROM debts d
LEFT JOIN debt_payments dp ON d.id = dp.debt_id
WHERE d.id = 'debt-id'
GROUP BY d.id;
```

#### Get Pending Debts
```sql
SELECT * FROM pending_debts 
WHERE user_id = 'user-id'
ORDER BY due_date ASC;
```

#### Get Debt Statistics
```sql
SELECT * FROM debt_statistics 
WHERE user_id = 'user-id';
```

### React Component API

#### Fetch Debts
```typescript
const { data, error } = await supabase
  .from('debts')
  .select('*')
  .eq('user_id', user?.id)
  .order('created_at', { ascending: false });
```

#### Create Debt
```typescript
const { error } = await supabase.from('debts').insert([{
  user_id: user?.id,
  bon_commande_id: selectedBonId,
  supplier_name: supplierName,
  total_price: parseFloat(totalPrice),
  amount_paid: 0,
  description: debtDescription,
  status: 'pending'
}]);
```

#### Record Payment
```typescript
// Insert payment record
const { error } = await supabase
  .from('debt_payments')
  .insert([{
    debt_id: debt.id,
    user_id: user?.id,
    amount_paid: paymentAmount,
    description: paymentDescription,
    payment_method: 'cash'
  }]);

// Update debt amount paid
const { error } = await supabase
  .from('debts')
  .update({ amount_paid: newTotal })
  .eq('id', debt.id);
```

---

## 🔧 TROUBLESHOOTING

### Issue 1: Database Tables Not Created

**Problem:** SQL execution failed or tables don't exist

**Solution:**
1. Check error message in Supabase
2. Verify bons_commandes table exists
3. Re-run SQL file in smaller chunks if needed
4. Check RLS policies aren't blocking access

**Test:**
```sql
SELECT * FROM debts LIMIT 1;
```

### Issue 2: Can't See Debts in Component

**Problem:** Page loads but no debts display

**Causes:**
- No debts created yet (normal on first use)
- RLS policy blocking access
- Database fetch error

**Solution:**
1. Check browser console for errors (F12)
2. Verify RLS policies allow SELECT
3. Try creating a new debt
4. Check user_id matches in database

### Issue 3: Payments Not Recording

**Problem:** Click pay button but payment doesn't save

**Causes:**
- Invalid payment amount
- Payment exceeds remaining balance
- Database permission issue

**Solution:**
1. Check browser console for error message
2. Verify payment amount < remaining balance
3. Check RLS policy allows INSERT on debt_payments
4. Verify user_id is set correctly

### Issue 4: Summary Totals Not Updating

**Problem:** After payment, totals don't recalculate

**Solution:**
1. Refresh page (F5)
2. Check that fetchData() is called after payment
3. Verify database update succeeded
4. Check for JavaScript errors in console

### Issue 5: Bon de Commandes Not Showing in Search

**Problem:** Search dropdown empty or not filtering

**Causes:**
- No bons de commandes in database
- bons_commandes table permission issue

**Solution:**
1. Check bons_commandes table has records
2. Verify RLS policy allows SELECT
3. Check search filter logic
4. Try different search term

---

## 💡 BEST PRACTICES

### Data Management
- ✅ Always add description when creating debt
- ✅ Record payment immediately when received
- ✅ Review pending debts regularly
- ✅ Archive paid debts after month-end close

### User Experience
- ✅ Use progress bars to show payment status
- ✅ Color-code status for quick recognition
- ✅ Show summary cards for overview
- ✅ Confirm destructive actions (delete)

### Database
- ✅ Use indexes for fast queries
- ✅ Enable RLS for data security
- ✅ Set due dates for overdue tracking
- ✅ Log all payment transactions

---

## 📊 DATABASE SCHEMA DIAGRAM

```
┌─────────────────────────────────────────────┐
│               debts                         │
├─────────────────────────────────────────────┤
│ id (PK) → UUID                              │
│ user_id (FK) → auth.users(id)               │
│ bon_commande_id (FK) → bons_commandes(id)  │
│ supplier_id (FK) → suppliers(id) [NULLABLE]│
│ supplier_name → VARCHAR(255)                │
│ total_price → DECIMAL(15,2)                │
│ amount_paid → DECIMAL(15,2)                │
│ remaining_balance → DECIMAL(15,2) [AUTO]  │
│ description → TEXT [NULLABLE]              │
│ status → VARCHAR(50)                       │
│ due_date → TIMESTAMP [NULLABLE]            │
│ created_at → TIMESTAMP                     │
│ updated_at → TIMESTAMP                     │
│ created_by_role → VARCHAR(50)              │
│ notes → TEXT [NULLABLE]                    │
└─────────────────────────────────────────────┘
                    ↓ 1:N
┌─────────────────────────────────────────────┐
│           debt_payments                     │
├─────────────────────────────────────────────┤
│ id (PK) → UUID                              │
│ debt_id (FK) → debts(id)                    │
│ user_id (FK) → auth.users(id)               │
│ amount_paid → DECIMAL(15,2)                │
│ payment_method → VARCHAR(100)               │
│ description → TEXT [NULLABLE]              │
│ payment_date → TIMESTAMP                   │
│ reference_number → VARCHAR(100)            │
│ notes → TEXT [NULLABLE]                    │
│ created_at → TIMESTAMP                     │
└─────────────────────────────────────────────┘
```

---

## 🔐 SECURITY

### RLS Policies

**Debts Table:**
- Users can only see their own debts
- Users can create debts for themselves
- Users can update their own debts
- Users can delete their own debts

**Debt Payments Table:**
- Users can see payments for their debts
- Only the paying user can create payments
- Prevents unauthorized access

**Enable RLS:**
```sql
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
```

---

## 📞 SUPPORT

For issues or questions:

1. Check the Troubleshooting section above
2. Review database schema for required tables
3. Check RLS policies are correctly applied
4. Verify component is properly imported and routed
5. Check browser console for error messages (F12)

---

**Implementation Status:** ✅ Ready to Deploy  
**Testing Status:** Ready for QA  
**Documentation:** Complete

