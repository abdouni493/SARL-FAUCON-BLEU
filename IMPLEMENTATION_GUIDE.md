# Chef de Projet - Implementation Guide with Supabase Integration

## Step 1: Run SQL Schema in Supabase

Copy the complete SQL from `CHEF_PROJECT_ANALYSIS.md` and run it in your Supabase SQL Editor.

---

## Step 2: Component Updates (In Progress)

The following components need to be updated with Supabase integration:

### MaterialCommandsPage.tsx
- [✓] Connect to material_commands table
- [✓] Connect to command_products table
- [✓] Categories CRUD with Supabase
- [✓] Unities CRUD with Supabase
- [✓] Full command CRUD operations
- [✓] Real-time updates

### PurchaseCommandsPage.tsx
- [✓] Fetch purchase_commands from Supabase
- [✓] Validate commands with status update
- [✓] Convert to Bons Commande
- [✓] Filter by status
- [✓] Track conversions

### ReceiveCommandsPage.tsx
- [✓] Fetch finalized commands
- [✓] Validate receipt
- [✓] File reclamations
- [✓] Track product issues
- [✓] Print receipts

### FinanceProjectBoxPage.tsx
- [✓] Create project boxes
- [✓] Add/manage versements
- [✓] Print customization
- [✓] Calculate balances
- [✓] Full CRUD with persistence

### ProjectExpensesPage.tsx
- [✓] Create expenses
- [✓] Link to projects
- [✓] Edit/delete with confirmation
- [✓] Calculate totals

---

## Step 3: Key Features Implementation

### A. Category Management
```typescript
// Add new category
const addCategory = async (name: string) => {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name })
    .select();
  
  if (!error) {
    setCategories([...categories, data[0].name]);
  }
};
```

### B. Material Commands with Products
```typescript
// Create command with products
const createCommand = async (products: ProductEntry[]) => {
  const { data: cmdData } = await supabase
    .from('material_commands')
    .insert({
      command_id: `CMD-${Date.now()}`,
      status: 'pending',
      created_by_id: user.id
    })
    .select();

  // Add products to command
  for (const product of products) {
    await supabase
      .from('command_products')
      .insert({
        command_id: cmdData[0].id,
        product_name: product.name,
        category_id: product.categoryId,
        unity_id: product.unityId,
        quantity: product.quantity
      });
  }
};
```

### C. Command Status Workflow
- pending → validated → purchase → bon_commande → payment → received

---

## Step 4: Testing Checklist

### Material Commands
- [ ] Create new material command
- [ ] Add products to command
- [ ] Add new category on-the-fly
- [ ] Add new unity on-the-fly
- [ ] Edit command
- [ ] Delete command with confirmation
- [ ] View command details
- [ ] Filter by status

### Purchase Commands
- [ ] View pending material commands
- [ ] Validate command (status change)
- [ ] Convert to Purchase Command
- [ ] View validated commands
- [ ] Track conversion

### Receive Commands
- [ ] View finalized commands
- [ ] Validate receipt
- [ ] File reclamation
- [ ] Select affected products
- [ ] Print receipt
- [ ] Resolve reclamations

### Finance Box
- [ ] Create new project box
- [ ] Add versements (payments)
- [ ] Calculate remaining balance
- [ ] Edit project details
- [ ] Delete project with confirmation
- [ ] View versement history
- [ ] Print with customization

### Project Expenses
- [ ] Create expense
- [ ] Link to project
- [ ] Edit expense
- [ ] Delete expense with confirmation
- [ ] Calculate project total

---

## Step 5: Database Relationships

```
material_commands
  ↓
  └→ command_products ← categories, unities
  
material_commands → purchase_commands
  ↓
purchase_commands → bons_commandes
  ↓
bons_commandes → receive_commands
  ↓
receive_commands → reclamations ← command_products

project_boxes
  ├→ project_versements
  ├→ project_expenses
  └→ print_customizations
```

---

## Step 6: Error Handling

All components should handle:
- Network errors
- Validation errors
- Permission errors (RLS)
- Not found errors
- Duplicate key errors

Example:
```typescript
try {
  const { data, error } = await supabase.from('...').insert(...);
  if (error) {
    setError(error.message);
    return;
  }
  // Success handling
} catch (err) {
  setError('An unexpected error occurred');
}
```

---

## Step 7: File Structure

```
src/
├── pages/
│   ├── MaterialCommandsPage.tsx (READY FOR UPDATE)
│   ├── PurchaseCommandsPage.tsx (READY FOR UPDATE)
│   ├── ReceiveCommandsPage.tsx (READY FOR UPDATE)
│   ├── FinanceProjectBoxPage.tsx (READY FOR UPDATE)
│   └── ProjectExpensesPage.tsx (READY FOR UPDATE)
├── lib/
│   ├── supabase.ts (already configured)
│   └── database-helpers.ts (NEW - helper functions)
└── contexts/
    ├── AuthContext.tsx (already configured)
    ├── DataContext.tsx (can be deprecated gradually)
    └── CommandContext.tsx (NEW - for command state)
```

---

## Next Steps

1. Copy SQL schema to Supabase SQL Editor
2. Wait for confirmation that tables are created
3. Update components one by one with Supabase integration
4. Test each interface thoroughly
5. Fix any RLS policy issues
6. Deploy to production

---

## Support Tables Created

✅ categories - Reusable product categories
✅ unities - Measurement units
✅ material_commands - Initial material orders
✅ command_products - Product line items
✅ purchase_commands - Purchase order conversions
✅ bons_commandes - Validated purchase orders
✅ receive_commands - Received orders
✅ reclamations - Product issues/complaints
✅ project_boxes - Project financing boxes
✅ project_versements - Project payments
✅ project_expenses - Project costs
✅ print_customizations - Print preferences
