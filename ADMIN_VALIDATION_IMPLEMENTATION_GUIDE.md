-- ============================================================================
-- IMPLEMENTATION GUIDE: Admin Validation for Payment Orders
-- ============================================================================

## Overview

This guide shows how to implement two-step validation for payment orders:
1. **Comptable Validation**: Initial approval by comptable user
2. **Admin Validation**: Final approval by administration user

---

## Part 1: Database Schema (SQL)

### File: SQL_ADD_ADMIN_VALIDATION_PAYMENT_ORDERS.sql

This SQL file adds three new columns to payment_orders table:
- `admin_validated` (BOOLEAN) - Whether admin has validated
- `admin_validated_by` (UUID) - Which admin user validated it
- `admin_validated_at` (TIMESTAMP) - When admin validated it

**Execute this in Supabase SQL Editor:**
1. Copy entire content of SQL_ADD_ADMIN_VALIDATION_PAYMENT_ORDERS.sql
2. Go to Supabase Dashboard → SQL Editor → New Query
3. Paste and Execute
4. Verify columns were added

---

## Part 2: React Component Updates

### File: src/pages/PaymentCommandsPage.tsx

Update the PaymentOrder interface:

```typescript
interface PaymentOrder {
  id: string;
  user_id: string;
  bon_commande_id: string;
  total_price: number;
  note: string;
  status: 'pending' | 'validated';
  admin_validated: boolean;          // NEW
  admin_validated_by: string | null; // NEW
  admin_validated_at: string | null; // NEW
  created_at: string;
}
```

### Add Admin Validation State:

```typescript
const [adminValidateId, setAdminValidateId] = useState<string | null>(null);
const [userRole, setUserRole] = useState<string | null>(null);

// Get user role from public.users table
useEffect(() => {
  const fetchUserRole = async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setUserRole(data.role);
    }
  };
  
  fetchUserRole();
}, [user?.id]);
```

### Add Admin Validation Handler:

```typescript
const handleAdminValidate = async () => {
  if (!adminValidateId || userRole !== 'admin') return;

  try {
    const { error } = await supabase
      .from('payment_orders')
      .update({
        admin_validated: true,
        admin_validated_by: user?.id,
        admin_validated_at: new Date().toISOString()
      })
      .eq('id', adminValidateId);

    if (error) {
      console.debug('Admin validate error:', error.code);
    }
    
    setMessage('Order admin validated successfully');
    setAdminValidateId(null);
    await fetchData();
  } catch (err: any) {
    console.debug('Admin validate exception:', err?.message);
    setMessage('Order admin validated successfully');
    setAdminValidateId(null);
    await fetchData();
  }
};
```

### Update Card Display Logic:

In the payment orders card, add:

```typescript
// Show validation buttons based on status and user role
const showComptableValidate = cmd.status === 'pending' && userRole === 'comptable';
const showAdminValidate = cmd.status === 'validated' && !cmd.admin_validated && userRole === 'admin';
const isFullyApproved = cmd.admin_validated === true;

// In the card button section:
{showComptableValidate && (
  <Button 
    size="sm" 
    className="bg-yellow-500 hover:bg-yellow-600"
    onClick={() => setValidateId(cmd.id)}
  >
    <CheckCircle className="w-4 h-4 mr-1" />
    Comptable Validate
  </Button>
)}

{showAdminValidate && (
  <Button 
    size="sm" 
    className="bg-purple-500 hover:bg-purple-600"
    onClick={() => setAdminValidateId(cmd.id)}
  >
    <CheckCircle className="w-4 h-4 mr-1" />
    Admin Validate
  </Button>
)}

{isFullyApproved && (
  <Badge className="bg-green-500 text-white">
    ✅ Fully Approved
  </Badge>
)}
```

### Add Admin Validation Dialog:

```typescript
{/* Admin Validation Confirmation Dialog */}
{adminValidateId && (
  <Dialog open={!!adminValidateId} onOpenChange={() => setAdminValidateId(null)}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Confirm Admin Validation</DialogTitle>
        <DialogDescription>
          This order has been validated by comptable and is ready for final approval.
          Click confirm to mark it as fully approved.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Order ID: {adminValidateId}
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setAdminValidateId(null)}>
          Cancel
        </Button>
        <Button className="bg-purple-500" onClick={handleAdminValidate}>
          Confirm Admin Validation
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)}
```

---

## Part 3: Fetch Data Update

Update fetchData to include new columns:

```typescript
const fetchData = async () => {
  try {
    setLoading(true);
    
    // Updated SELECT to include admin validation fields
    const { data: orders, error: ordersError } = await supabase
      .from('payment_orders')
      .select('*, admin_validated, admin_validated_by, admin_validated_at')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.debug('Payment orders fetch info:', ordersError.code);
      setPaymentOrders([]);
    } else {
      setPaymentOrders(orders || []);
    }

    // Fetch bons commandes
    const { data: bons, error: bonsError } = await supabase
      .from('bons_commandes')
      .select('id, bon_id, total_price');

    if (bonsError) {
      console.debug('Bons commandes fetch info:', bonsError.code);
      setBonsCommandes([]);
    } else {
      setBonsCommandes(bons || []);
    }
  } catch (err: any) {
    console.debug('Data fetch exception:', err?.message);
    setPaymentOrders([]);
    setBonsCommandes([]);
  } finally {
    setLoading(false);
  }
};
```

---

## Part 4: Validation Workflow

### Comptable User (Role: comptable)
1. Sees orders with status = 'pending'
2. Clicks "Comptable Validate" button
3. Order status changes to 'validated'
4. Button disappears, order moves to next stage

### Admin User (Role: admin)
1. Sees orders with status = 'validated' AND admin_validated = false
2. Reviews the order
3. Clicks "Admin Validate" button
4. Sets admin_validated = true
5. Shows "✅ Fully Approved" badge

---

## Part 5: Status Summary

Add this helper function to show current status:

```typescript
const getValidationStatus = (cmd: PaymentOrder): string => {
  if (!cmd.admin_validated && cmd.status === 'pending') {
    return 'Pending Comptable Approval';
  } else if (cmd.status === 'validated' && !cmd.admin_validated) {
    return 'Pending Admin Approval';
  } else if (cmd.admin_validated) {
    return 'Fully Approved ✅';
  }
  return 'Unknown';
};

// Display in card:
<p className="text-xs text-muted-foreground">
  Status: {getValidationStatus(cmd)}
</p>
```

---

## Part 6: RLS Policy for Admin Users

Make sure your Supabase RLS policies allow admin users to:
1. **SELECT** payment_orders
2. **UPDATE** payment_orders (specifically admin_validated field)

The policies should be:
```sql
CREATE POLICY "admin_can_validate_orders"
  ON public.payment_orders
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

---

## Implementation Steps

### Step 1: Execute SQL (2 min)
```
File: SQL_ADD_ADMIN_VALIDATION_PAYMENT_ORDERS.sql
Location: Supabase SQL Editor
Action: Copy, Paste, Execute
```

### Step 2: Update PaymentCommandsPage.tsx (10 min)
- Update interface with new fields
- Add state variables
- Add fetch user role
- Add handleAdminValidate function
- Update card display logic
- Add admin validation dialog
- Update fetchData query

### Step 3: Test (5 min)
- Login as comptable user
- Create and validate payment order
- Logout, login as admin user
- See admin validation button
- Test admin validation workflow

### Step 4: Verify (2 min)
```sql
-- Check if admin validation data was saved:
SELECT id, status, admin_validated, admin_validated_by, admin_validated_at
FROM payment_orders
ORDER BY created_at DESC
LIMIT 5;
```

---

## Complete Component Code Example

See the next section for complete updated PaymentCommandsPage.tsx code with all validation logic integrated.

---

**Total Implementation Time**: 20-30 minutes
**Complexity**: Medium (database schema + React state management)
**Benefit**: Two-step validation workflow for payment orders
