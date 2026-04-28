# Fix: Project Creation - Database Schema Mismatch Error

## Problem Summary
When attempting to create a new project in the "Gestion Administration Générale" interface, users encountered a **400 Bad Request** error from the Supabase API endpoint `/rest/v1/project_boxes`. The error message displayed was:
```
Erreur lors de la sauvegarde (Error saving)
```

## Root Cause Analysis

The issue was a **database schema mismatch** between the code and the actual table structure:

### Database Schema (Actual)
The `project_boxes` table in the database has the following structure:
```sql
CREATE TABLE public.project_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  chef_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT,
  total_amount DECIMAL(15,2) NOT NULL,  -- ← This is the ACTUAL column
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Additional columns added later:
  status VARCHAR(50) DEFAULT 'pending',
  chef_de_projet_email VARCHAR(255),
  created_by_id UUID
);
```

### Code (Incorrect)
The React component was sending:
```typescript
interface Project {
  // ... other fields
  total_budget: number;  // ❌ WRONG - doesn't exist in table
}

const handleSaveProject = async () => {
  // ...
  .insert({
    // ...
    total_budget: form.total_budget,  // ❌ Sending wrong column name
    // ...
  });
}
```

## Solution
Changed all occurrences of `total_budget` to `total_amount` to match the actual database column.

### Files Modified
**[ProjectsManagementPage.tsx](src/pages/ProjectsManagementPage.tsx)**

#### Changes Made:
1. **Project Interface** (Line 23)
   - Changed: `total_budget: number;` → `total_amount: number;`

2. **Form State Declaration** (Lines 85-100)
   - Changed: `total_budget: number;` → `total_amount: number;`
   - Changed: `total_budget: 0` → `total_amount: 0`

3. **INSERT Query** (Line 212)
   - Changed: `total_budget: form.total_budget,` → `total_amount: form.total_amount,`

4. **UPDATE Query** (Line 194)
   - Changed: `total_budget: form.total_budget,` → `total_amount: form.total_amount,`

5. **Edit Project Function** (Line 318)
   - Changed: `total_budget: project.total_budget` → `total_amount: project.total_amount`

6. **Reset Form Function** (Line 336)
   - Changed: `total_budget: 0` → `total_amount: 0`

7. **Form Input Binding** (Lines 613-614)
   - Changed: `value={form.total_budget}` → `value={form.total_amount}`
   - Changed: `total_budget: parseFloat(...)` → `total_amount: parseFloat(...)`

## Testing Instructions

### Test Creating a New Project:
1. Navigate to **"Gestion Administration Générale"** (General Administration)
2. Click **"Ajouter Projet"** (Add Project) button
3. Fill in the form:
   - **Nom**: Test Project
   - **Chef de Projet**: Select "Chef de Projet" from dropdown
   - **Adresse**: Test Address
   - **Description**: Test Description
   - **Budget**: 100000
   - **Statut**: Active
4. Click **"Créer"** (Create) button
5. **Expected Result**: ✅ Project should be created successfully with message "Projet créé avec succès"

### Test Editing an Existing Project:
1. Click on a project card
2. Click **"Modifier"** (Edit) button
3. Modify the budget value
4. Click **"Mettre à jour"** (Update) button
5. **Expected Result**: ✅ Project should update without errors

## Related Files & Configurations
- **Database**: `project_boxes` table in Supabase
- **Frontend**: `src/pages/ProjectsManagementPage.tsx`
- **Schema Definition**: `SQL_SCHEMA_UPDATED_WITH_PRICE_CALCULATION.sql`
- **Adaptation File**: `SQL_GESTION_PROJETS_ADAPT.sql`

## Additional Notes
- The database column is named `total_amount` while the budget label in the UI still says "Budget" (this is fine - it's just a display label)
- The same pattern should be verified in other project-related pages like `ProjectsFinancingPage.tsx`, `FinanceProjectBoxPage.tsx`, etc. to ensure consistency

## Previously Fixed Issues
This fix was completed after fixing the Chef de Projet dropdown issue where the code was querying the `workers` table instead of the `users` table.
