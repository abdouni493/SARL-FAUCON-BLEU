# Debt Management Interface Update (Gestion des Dettes)

**Last Updated:** April 6, 2026  
**Status:** ✅ Implementation Complete  
**Version:** 2.0 (Enhanced)

---

## 📋 Overview

The Debt Management interface for Comptable users has been fully enhanced with:
- **Initial payment input** during debt creation
- **Auto-calculated remaining balance** displayed in real-time
- **Beautiful card display** with debt information
- **Payment recording** with auto-calculations
- **Complete CRUD operations** (Create, Read, Update, Delete)
- **Multi-language support** (Arabic & French)
- **Mobile responsive design**

---

## 🎯 Key Features

### 1. Create New Debt

Users can now create a debt with the following information:

```
┌─────────────────────────────────────┐
│  Create New Debt Dialog             │
├─────────────────────────────────────┤
│  1. Search & Select Bon Commande   │
│  2. Supplier Name                   │ (auto-loaded from offers)
│  3. Total Amount                    │ (from bon)
│  4. Initial Payment Amount          │ ← NEW!
│     └─ Auto-calc remaining         │ ← NEW!
│  5. Due Date (optional)             │ ← NEW!
│  6. Description (optional)          │
│                                     │
│  [Cancel] [Save Debt]              │
└─────────────────────────────────────┘
```

**Auto-Calculation Formula:**
```
Remaining Balance = Total Amount - Initial Payment
```

Example:
- Total: 100,000 د.ج
- Initial Payment: 30,000 د.ج
- Remaining: 70,000 د.ج ✅ (auto-calculated)

---

### 2. Debt Card Display

Each debt is displayed on a beautiful card with:

```
┌──────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐  │
│ │ Supplier Name          [Pending] ⏳  │  │ Header
│ └─────────────────────────────────────┘  │
│                                          │
│ بون: BON-001234567890                   │
│ المبلغ الإجمالي: 100,000 د.ج             │
│ المدفوع: 30,000 د.ج                     │
│ المتبقي: 70,000 د.ج                     │
│                                          │
│ 🟦🟦🟦░░░░░░ 30%                        │ Progress Bar
│                                          │
│ Description (if exists)                 │
│                                          │
│ [💚 Pay] [✏️ Edit] [🗑️ Delete] [📋 Hi] │ Action Buttons
└──────────────────────────────────────────┘
```

**Information Displayed:**
- Supplier Name (in header)
- Status Badge (Pending/Partial/Paid)
- Bon de Commande ID
- Total Amount
- Amount Paid (in green)
- Remaining Balance (in red)
- Progress Bar (visual representation)
- Description (if provided)

**Status Colors:**
- 🟨 **Pending** (Yellow): 0% paid
- 🔵 **Partial** (Blue): 1-99% paid
- 🟢 **Paid** (Green): 100% paid

---

### 3. Payment Recording

When user clicks "Pay" button:

```
┌───────────────────────────────────────────┐
│  Record Payment - Supplier Name           │
├───────────────────────────────────────────┤
│                                           │
│  Summary:                                 │
│  ┌─────────────────────────────────────┐ │
│  │ Total Amount:        100,000 د.ج    │ │
│  │ Amount Paid:          30,000 د.ج    │ │
│  │ Remaining:            70,000 د.ج    │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  Payment Amount *                         │
│  [________________] (Max: 70,000 د.ج)    │
│  → After payment: 50,000 د.ج            │ Auto-calc!
│                                           │
│  Payment Date                             │
│  [____/____/____]                        │
│                                           │
│  Payment Method                           │
│  [▼ Cash           ]                      │
│     • Cash                                │
│     • Check                               │
│     • Transfer                            │
│     • Other                               │
│                                           │
│  Payment Description (optional)           │
│  [_____________________]                  │
│                                           │
│  [Cancel]  [Record Payment]              │
└───────────────────────────────────────────┘
```

**Payment Method Options:**
- 💵 **Cash** (نقداً / Espèces)
- 📄 **Check** (شيك / Chèque)
- 🏦 **Transfer** (تحويل / Virement)
- ❓ **Other** (أخرى / Autre)

**Auto-Calculations:**
- Real-time calculation of remaining balance after payment
- Validation: Payment amount ≤ Remaining balance
- Status auto-updates on database (pending → partial → paid)

---

### 4. Edit Debt

Users can modify debt details:

```
┌────────────────────────────────────┐
│  Edit Debt                         │
├────────────────────────────────────┤
│  Supplier Name                     │
│  [________________]                │
│                                    │
│  Total Amount                      │
│  [________________]                │
│                                    │
│  Description                       │
│  [________________]                │
│                                    │
│  [Cancel]  [Save Changes]         │
└────────────────────────────────────┘
```

**Editable Fields:**
- Supplier Name
- Total Amount
- Description

**Non-editable:**
- Bon de Commande (locked)
- Amount Paid (managed via payments)

---

### 5. Delete Debt

Confirmation dialog prevents accidental deletion:

```
┌──────────────────────────────────────────┐
│  Delete Debt                             │
├──────────────────────────────────────────┤
│  ⚠️  This action cannot be undone.      │
│      All related payments will also be   │
│      deleted.                            │
│                                          │
│  [Cancel]  [Delete]                    │
└──────────────────────────────────────────┘
```

**Action:**
- Deletes debt record
- Cascading delete of all related payments
- Confirmation required before deletion

---

### 6. View Payment History

Users can see all payments for a debt:

```
┌───────────────────────────────────────────┐
│  Payment Records                          │
├───────────────────────────────────────────┤
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │ 10,000 د.ج      📄 Check           │ │
│  │ 2026/04/05                          │ │
│  │ Monthly payment for April            │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │ 20,000 د.ج      💵 Cash            │ │
│  │ 2026/03/28                          │ │
│  │ Initial payment                      │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  [Close]                                 │
└───────────────────────────────────────────┘
```

**Information Per Payment:**
- Amount Paid
- Payment Method (with icon)
- Payment Date
- Description (if provided)

---

## 💾 Database Schema

### Debts Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Comptable user |
| `bon_commande_id` | UUID | Purchase order reference |
| `supplier_name` | VARCHAR | Supplier name |
| `total_price` | DECIMAL | Total debt amount |
| `amount_paid` | DECIMAL | Amount paid so far (default: 0) |
| `remaining_balance` | DECIMAL | **GENERATED ALWAYS** (total - paid) |
| `status` | VARCHAR | pending / partial / paid (auto-updated) |
| `due_date` | TIMESTAMP | Optional due date |
| `description` | TEXT | Optional notes |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update time |

### Debt Payments Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `debt_id` | UUID | Foreign key to debts |
| `user_id` | UUID | Who recorded the payment |
| `amount_paid` | DECIMAL | Payment amount |
| `payment_method` | VARCHAR | cash / check / transfer / other |
| `payment_date` | TIMESTAMP | When payment was made |
| `description` | TEXT | Optional payment notes |
| `created_at` | TIMESTAMP | When record was created |

---

## 🌍 Language Support

### Arabic (العربية)

```
إدارة الديون
إضافة دين جديد
المبلغ الإجمالي
المبلغ المدفوع
المبلغ المتبقي
تسجيل الدفعة
سجل الدفعات
```

### French (Français)

```
Gestion des Dettes
Ajouter une nouvelle dette
Montant Total
Montant Payé
Montant Restant
Enregistrer le Paiement
Historique des Paiements
```

---

## 📱 Responsive Design

The interface adapts to all screen sizes:

| Device | Layout |
|--------|--------|
| **Desktop** (1920+px) | 3 columns of cards |
| **Tablet** (768-1024px) | 2 columns of cards |
| **Mobile** (375-767px) | 1 column (full width) |

All dialogs are fully responsive and touch-friendly.

---

## ⚡ Performance

### Auto-Calculations

1. **Remaining Balance (Create Form)**
   - Calculated as user types
   - Formula: `Total - Initial Payment`
   - Real-time preview

2. **Remaining Balance (Pay Form)**
   - Calculated as user types payment amount
   - Formula: `Current Remaining - Payment`
   - Real-time preview

3. **Database Auto-Updates**
   - `remaining_balance`: Generated column (no trigger needed)
   - `status`: Auto-updated via trigger based on amount_paid
   - `updated_at`: Auto-updated via trigger

### Performance Optimizations

- **8 indexes** on frequently queried columns
- **Generated column** for remaining_balance (computed automatically)
- **Trigger-based** status updates (no app-side logic)
- **3 database views** for reporting

---

## 🔐 Security

- **Row-Level Security (RLS)** enabled on both tables
- **User isolation**: Each user sees only their own debts
- **Delete confirmation**: Prevents accidental deletion
- **Input validation**: All forms validated before submission
- **Amount validation**: Payment amount ≤ remaining balance

---

## ✅ Summary Cards

At the top of the debt list, users see three summary cards:

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ إجمالي الديون │  │  المدفوع    │  │  المتبقي    │
│ Total Debts  │  │ Amount Paid  │  │ Remaining   │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ 500,000 د.ج  │  │ 200,000 د.ج  │  │ 300,000 د.ج  │
└──────────────┘  └──────────────┘  └──────────────┘
```

- **Total Debts**: Sum of all `total_price` values
- **Amount Paid**: Sum of all `amount_paid` values
- **Remaining**: Sum of all `remaining_balance` values

---

## 🚀 User Workflow Example

### Step 1: Create Debt
1. Click "✚ Add New Debt" button
2. Search for "BON-001"
3. Select bon de commande
4. Supplier name auto-fills: "Global Suppliers Inc"
5. Total amount auto-fills: "100,000 د.ج"
6. Enter initial payment: "30,000 د.ج"
7. Remaining auto-calculates to: "70,000 د.ج" ✅
8. Set due date: "2026/05/30"
9. Click "Save Debt"

### Step 2: Debt Appears on Card
- Card shows all information
- Progress bar shows 30% (30,000 / 100,000)
- Status shows "Partial" in blue

### Step 3: Record Payment
1. Click "💚 Pay" button on card
2. Enter payment: "20,000 د.ج"
3. Remaining auto-calculates to: "50,000 د.ج" ✅
4. Set payment date: "2026/04/15"
5. Select payment method: "Transfer"
6. Enter description: "Monthly payment"
7. Click "Record Payment"

### Step 4: Updates Automatically
- Amount Paid updates to: "50,000 د.ج"
- Remaining Balance updates to: "50,000 د.ج"
- Progress bar updates to: 50%
- Status remains "Partial"

### Step 5: Final Payment
1. Click "💚 Pay" again
2. Enter: "50,000 د.ج" (remaining amount)
3. Click "Record Payment"
4. Amount Paid updates to: "100,000 د.ج"
5. Remaining Balance updates to: "0 د.ج"
6. Status auto-changes to: "Paid" ✅

---

## 📝 Translation Keys

All strings use i18n for multi-language support:

```typescript
// Create Debt
t('debt_management.create_debt')
t('debt_management.search_bon_commande')
t('debt_management.supplier_name')
t('debt_management.total_amount')
t('common.description')

// Payment
t('debt_management.record_payment')
t('debt_management.amount_paid')
t('debt_management.remaining_amount')
t('common.after')
t('common.max')

// Actions
t('common.edit')
t('common.delete')
t('common.save')
t('common.cancel')
```

---

## 🎓 Testing Checklist

- [ ] Create debt with initial payment
- [ ] Verify remaining balance auto-calculates
- [ ] Record payment and verify updates
- [ ] Check payment history displays correctly
- [ ] Edit debt details
- [ ] Delete debt with confirmation
- [ ] Test on mobile device
- [ ] Test Arabic language
- [ ] Test French language
- [ ] Verify summary cards update
- [ ] Test all payment methods

---

## 📞 Support

For issues or questions:
1. Check the database schema in `SQL_DEBT_MANAGEMENT_SCHEMA.sql`
2. Review the component code in `src/pages/ComptableDebtManagementPage.tsx`
3. Check browser console for error messages
4. Verify translations in `src/i18n/ar.json` and `src/i18n/fr.json`

---

**Version 2.0 Complete** ✅
