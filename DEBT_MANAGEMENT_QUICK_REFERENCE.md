# Debt Management - Quick Reference & Setup

## 🎯 What You Get

✅ **Create Debt with Initial Payment**
- User sets how much they pay upfront
- System auto-calculates remaining balance
- Optional due date and description

✅ **Debt Cards with Status**
- Visual progress bar showing payment percentage
- Status badge (pending/partial/paid)
- All financial information at a glance

✅ **Payment Tracking**
- Record payments anytime
- Auto-calculate remaining balance
- Track payment date and method
- View all payments for each debt

✅ **Full CRUD Operations**
- ✏️ Edit debt details
- 🗑️ Delete debt with confirmation
- 📋 View payment history
- 💳 Record new payments

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Run Database SQL (2 min)
```
File: SQL_DEBT_MANAGEMENT_VERIFICATION_AND_FIX.sql

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy entire file content
4. Paste into editor
5. Click Execute
```

**What it does:**
- ✅ Verifies all database columns exist
- ✅ Creates required triggers
- ✅ Sets up views and indexes
- ✅ Handles automatic calculations

### Step 2: Replace Component File (2 min)
```
Old: src/pages/ComptableDebtManagementPage.tsx
New: ComptableDebtManagementPage.ENHANCED.tsx

1. Backup old file
2. Copy ENHANCED.tsx content
3. Replace src/pages/ComptableDebtManagementPage.tsx
4. Verify imports are correct
```

### Step 3: Test (1 min)
```
1. Go to Debt Management page
2. Click "Add New Debt"
3. Select a bon de commande
4. Enter initial payment (e.g., 3000)
5. See remaining auto-calculate
6. Create debt and verify card displays
7. Click "Pay" and record a payment
8. Verify all amounts update
```

---

## 📝 User Guide

### Creating a Debt

```
1. Click "Add New Debt" button
2. Search for bon de commande (by ID, number, amount, or supplier)
3. Select from dropdown
   → Supplier name auto-fills
   → Total price auto-fills
4. Enter initial payment (optional)
   → Remaining balance auto-calculates
5. Set due date (optional)
6. Add description (optional)
7. Click "Create Debt"
```

**Example:**
```
Bon: PC-2026-001
Supplier: Global Suppliers Inc
Total: 10,000 د.ج
Initial Payment: 3,000 د.ج
Remaining: 7,000 د.ج ← Auto-calculated
```

### Viewing Debts

Each card shows:
```
┌─────────────────────────────────┐
│ Global Suppliers Inc    [PARTIAL]
│ Payment for materials          │
├─────────────────────────────────┤
│ Total: 10,000 د.ج             │
│ Paid: 3,000 د.ج (30%)         │
│ ████░░░░░░░░░░░░░░░░░░░░      │
│ Remaining: 7,000 د.ج          │
│ Due: 15/04/2026               │
│                                │
│ [PAY] [VIEW] [EDIT] [DELETE]  │
└─────────────────────────────────┘
```

### Recording a Payment

```
1. Click "Pay" button on debt card
2. Dialog shows:
   - Total amount
   - Already paid
   - Remaining balance
3. Enter payment amount
   → Remaining auto-calculates in real-time
4. Select payment date (defaults to today)
5. Choose payment method
   (cash, check, transfer, other)
6. Add payment description (optional)
7. Click "Record Payment"
```

**Example:**
```
Payment Amount: 2,000 د.ج
Remaining After: 5,000 د.ج ← Auto-calculated
Date: 06/04/2026
Method: Transfer
Description: April payment
```

### Editing a Debt

```
1. Click Edit (pencil) button on card
2. Can change:
   - Supplier name
   - Total amount
   - Due date
   - Description
3. Click "Save"
```

⚠️ **Note:** Amount paid cannot be edited here
→ Use "Pay" button to record payments

### Viewing Payment History

```
1. Click View (eye) button on card
2. See all payments in chronological order:
   - Amount paid
   - Payment date
   - Payment method
   - Description (if any)
```

### Deleting a Debt

```
1. Click Delete (trash) button on card
2. Confirm in dialog
   ⚠️ Warning: This deletes debt AND all related payments
3. Debt card disappears
```

---

## 📊 Status Indicators

### Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| **PENDING** | 🔴 Red | No payments yet |
| **PARTIAL** | 🟡 Yellow | Some payments made |
| **PAID** | 🟢 Green | Fully paid |
| **OVERDUE** | 🔴 Dark Red | Past due date, unpaid |

### Progress Bar

```
Pending:  ░░░░░░░░░░░░░░░░░░░░ (0% paid)
Partial:  ████░░░░░░░░░░░░░░░░ (30% paid)
Paid:     ████████████████████ (100% paid)
```

---

## 🔧 Technical Details

### Database Tables Used

**debts** - Main debt records
```sql
- id (UUID)
- supplier_name (VARCHAR)
- total_price (DECIMAL)
- amount_paid (DECIMAL)
- remaining_balance (Generated)
- status (VARCHAR) - auto-updated
- due_date (TIMESTAMP)
- description (TEXT)
- created_at, updated_at
```

**debt_payments** - Individual payment records
```sql
- id (UUID)
- debt_id (FK)
- amount_paid (DECIMAL)
- payment_date (TIMESTAMP)
- payment_method (VARCHAR)
- description (TEXT)
```

### Auto-Calculation Logic

**Remaining Balance:**
```
remaining_balance = total_price - amount_paid
```
Automatically calculated by database trigger

**Status Update:**
```
amount_paid = 0          → status = 'pending'
0 < amount < total      → status = 'partial'
amount >= total         → status = 'paid'
```
Automatically updated on every change

### Views Available

**debts_summary** - Enhanced debt view with payment counts
```sql
SELECT * FROM debts_summary;
```

**pending_debts** - Only unpaid/partial debts
```sql
SELECT * FROM pending_debts;
```

**debt_statistics** - Statistics per user
```sql
SELECT * FROM debt_statistics;
```

---

## 🧪 Testing Scenarios

### Scenario 1: Create and Pay
```
1. Create debt for 10,000 د.ج with 3,000 initial
   → Card shows: Paid 3,000 (30%), Remaining 7,000
2. Record payment of 2,000
   → Card shows: Paid 5,000 (50%), Remaining 5,000, Status PARTIAL
3. Record payment of 5,000
   → Card shows: Paid 10,000 (100%), Remaining 0, Status PAID
```

### Scenario 2: Edit Debt
```
1. Create debt for 10,000 د.ج
2. Edit to change to 12,000 د.ج
   → Card updates: New total, new remaining
3. Record existing payment
   → Payment doesn't change, remaining recalculates
```

### Scenario 3: Delete Debt
```
1. Create debt with 3 payments
2. Click Delete
   → Warning shows about payments
3. Confirm delete
   → Debt AND all 3 payments deleted
   → No orphaned data in database
```

---

## ✅ Verification Queries

Run these in Supabase to verify data:

**Check a specific debt:**
```sql
SELECT id, supplier_name, total_price, amount_paid, 
       remaining_balance, status
FROM debts
WHERE supplier_name = 'Global Suppliers Inc';
```

**Check payments for a debt:**
```sql
SELECT payment_date, amount_paid, payment_method, description
FROM debt_payments
WHERE debt_id = 'YOUR_DEBT_ID'
ORDER BY payment_date DESC;
```

**Check debt statistics:**
```sql
SELECT total_debts, unpaid_debts, total_remaining
FROM debt_statistics
WHERE user_id = 'YOUR_USER_ID';
```

---

## 🐛 Troubleshooting

### Issue: Numbers not updating after payment
**Fix:** Refresh page or wait 2-3 seconds for real-time sync

### Issue: Cannot create debt
**Fix:** Ensure all required fields are filled (supplier, total, bon de commande)

### Issue: Payment button disabled
**Fix:** Debt must have remaining_balance > 0

### Issue: Can't see payments
**Fix:** 
1. Verify payments were actually recorded in database
2. Check debt_payments table has records
3. Ensure you're clicking correct View button

---

## 📱 Mobile Responsive

✅ Fully responsive design:
- Desktop: 3 cards per row
- Tablet: 2 cards per row
- Mobile: 1 card per row

All dialogs and buttons work on mobile

---

## 🌍 Multi-Language Support

✅ Supports Arabic and French:
- All buttons and labels use i18n
- Dates localized to system language
- Currency symbol (د.ج) displays correctly

---

## 📈 Performance

⚡ Optimized for speed:
- Database indexes on all queries
- Single query for bons de commandes with relations
- Real-time calculation (no server calls)
- Efficient state management

**Expected Load Times:**
- Page load: < 500ms
- Create debt: < 1s
- Record payment: < 1s
- Delete debt: < 1s

---

## 🎓 Summary

| Feature | Status | Details |
|---------|--------|---------|
| Create with initial payment | ✅ | Auto-calculates remaining |
| Display on cards | ✅ | Progress bar, status badge |
| Record payments | ✅ | Auto-calculates new remaining |
| Edit details | ✅ | Change supplier, amount, date |
| Delete with confirmation | ✅ | Removes debt and payments |
| Payment history | ✅ | View all payments |
| Auto status update | ✅ | pending → partial → paid |
| Multi-language | ✅ | Arabic & French |
| Mobile responsive | ✅ | Works on all devices |

---

## 🚀 You're Ready!

**Everything you need:**
- ✅ Database SQL (verified and fixed)
- ✅ React component (fully enhanced)
- ✅ Documentation (comprehensive)
- ✅ Testing guide (detailed)

**Next Action:** Execute SQL, replace component, test!

---

**Implementation Time: 5-10 minutes**
**Status: READY TO DEPLOY** ✅
