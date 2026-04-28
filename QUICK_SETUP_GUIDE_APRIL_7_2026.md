# Quick Setup Guide - April 7, 2026 Updates

## What Was Changed?

### 1. ✅ Logo and Name on All Pages
- Already working globally across all profiles
- Displays in sidebar header and navbar

### 2. ✅ Project Expenses Interface Fixed
- Users can now select their project when creating an expense
- Last selected project is remembered automatically
- Expense form now includes category dropdown

### 3. ✅ Database SQL Schema Created
- New `project_expenses` table with full structure
- File: `project_expenses_schema.sql`

### 4. ✅ Menu Reorganization
- "Dépenses Projet" now appears before "Caisse de Financement"
- Logical grouping for expense management

### 5. ✅ Role-Based Access Control
- Chef de Projet users cannot see Edit, Delete, or Add Versement buttons
- Other roles can still access all Finance Box features

---

## How to Deploy (3 Simple Steps)

### Step 1: Execute the SQL Schema
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Create new query
4. Copy entire content from: `project_expenses_schema.sql`
5. Click Run
6. Verify success message

### Step 2: Verify Files are Updated
Check these files are in place:
- ✅ `src/pages/ProjectExpensesPage.tsx` - Updated with project dropdown
- ✅ `src/pages/FinanceProjectBoxPage.tsx` - Updated with role-based access
- ✅ `src/components/AppLayout.tsx` - Menu order fixed
- ✅ `project_expenses_schema.sql` - Database schema
- ✅ `IMPLEMENTATION_SUMMARY_APRIL_7_2026.md` - Full documentation

### Step 3: Test the Features
1. Clear browser cache (hard refresh F5 in VS Code)
2. Login as chef_de_projet
3. Go to "Dépenses Projet" menu
4. Click "Create Expense"
5. Verify:
   - Project dropdown appears
   - Category field appears
   - Last project is pre-selected
   - "Caisse de Financement" appears below in menu

---

## Testing Checklist

### Chef de Projet User:
- [ ] Can see "Dépenses Projet" in menu
- [ ] Can see "Caisse de Financement" below it in menu
- [ ] Can create new expense with project selection
- [ ] Can select from project dropdown
- [ ] Sees category field in form
- [ ] Cannot see Edit button on Finance Box projects
- [ ] Cannot see Delete button on Finance Box projects
- [ ] Cannot see "Ajouter un Versement" button
- [ ] CAN see View Details, History, and Print buttons

### Admin User:
- [ ] All buttons visible in Finance Box
- [ ] Can edit and delete projects
- [ ] Can add versements

---

## Key Features Implemented

### Project Expense Form
```
Project:      [Dropdown with available projects] *
Description:  [Text area] *
Amount:       [Number input] *
Category:     [autre, materiel, main_oeuvre, transport, frais_generaux]
Date:         [Date picker, defaults to today]
```

### Last Project Memory
- Automatically saves selected project to browser storage
- Next time user opens expense form, previously selected project is shown
- User can change if needed

### Role-Based Buttons (Finance Box Page)
**Chef de Projet Cannot See:**
- ❌ "Ajouter un Versement" (Add Payment)
- ❌ "Modifier" (Edit)
- ❌ "Supprimer" (Delete)

**Chef de Projet Can See:**
- ✅ "Voir les détails" (View Details)
- ✅ "Historique" (History)
- ✅ "Imprimer" (Print)

---

## File Locations Reference

| Component | File Path |
|-----------|-----------|
| Project Expenses | `src/pages/ProjectExpensesPage.tsx` |
| Finance Box | `src/pages/FinanceProjectBoxPage.tsx` |
| App Layout/Menu | `src/components/AppLayout.tsx` |
| SQL Schema | `project_expenses_schema.sql` |
| Documentation | `IMPLEMENTATION_SUMMARY_APRIL_7_2026.md` |

---

## Troubleshooting

### Issue: Project dropdown is empty
**Solution:** 
- Verify logged-in user is a chef_de_projet
- Check that user has chef_id matching projects in database
- Check that projects exist in `project_boxes` table

### Issue: Last selected project not showing
**Solution:**
- Clear browser cache
- Check localStorage is enabled in browser settings
- Create a new expense first to set the last selected project

### Issue: Buttons still visible for chef_de_projet
**Solution:**
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Clear all caches
- Verify useAuth hook is imported in FinanceProjectBoxPage.tsx

### Issue: SQL schema didn't apply
**Solution:**
- Check Supabase connection
- Verify no syntax errors in SQL file
- Try executing parts of schema separately
- Check Supabase logs for error details

---

## API Queries Generated

### Get Projects for Chef de Projet
```sql
SELECT id, name, chef_id 
FROM project_boxes 
WHERE chef_id = current_user_id
ORDER BY created_at DESC;
```

### Create Expense
```sql
INSERT INTO project_expenses (
  expense_id, project_box_id, description, amount, 
  category, expense_date, created_by_id, chef_de_projet_id
) VALUES (
  'EXP-' || EXTRACT(EPOCH FROM NOW()),
  selected_project_id, description, amount, 
  category, expense_date, current_user_id, current_user_id
);
```

### View Expense Summary
```sql
SELECT * FROM project_expenses_summary
WHERE project_id = selected_project_id;
```

---

## Success Indicators

After deployment, you should see:

1. **Menu Structure**
   ```
   Dashboard
   Material Commands
   Purchase Commands
   Receive Commands
   ➡️ Dépenses Projet          ⬅️ Now appears FIRST
   ➡️ Caisse de Financement    ⬅️ Now appears SECOND
   Settings
   ```

2. **Project Expenses Form**
   - Project dropdown with available projects
   - Category selection
   - Amount field instead of price
   - Date picker

3. **Finance Box Visibility (for Chef de Projet)**
   - Cannot click Edit button
   - Cannot click Delete button
   - Cannot click Add Versement button
   - Can click View Details, History, Print

---

**Last Updated:** April 7, 2026
**Status:** ✅ Ready for Production
