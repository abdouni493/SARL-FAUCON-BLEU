# Fix: Chef de Projet Dropdown - No Workers Display Issue

## Problem Description
When creating a new project in the "Gestion Administration Générale" (General Administration Management) interface, users were unable to select a "Chef de Projet" (Project Manager) from the dropdown. The system displayed "No workers available" even though there were valid workers with the `chef_projet` role in the database.

### User Evidence
The database contains the following users with `chef_projet` role:
```json
{
  "id": "6752ec22-c80f-402f-bf45-00b3b7e06b2b",
  "email": "test@test.com",
  "full_name": "test",
  "username": "test",
  "role": "chef_projet",
  "created_at": "2026-04-06 12:28:31.913975+00"
},
{
  "id": "52a74346-c9f5-4498-850c-6f7a9dde929d",
  "email": "chef@projet.com",
  "full_name": "Chef de Projet",
  "username": "chef_projet",
  "role": "chef_projet",
  "created_at": "2026-03-29 07:17:14.519453+00"
}
```

## Root Cause
The issue was in the `fetchChefs()` function in [ProjectsManagementPage.tsx](src/pages/ProjectsManagementPage.tsx#L127):

### Before (WRONG):
```typescript
const fetchChefs = async () => {
  try {
    const { data, error } = await supabase
      .from('workers')  // ❌ WRONG TABLE
      .select('id, email, full_name')
      .eq('role', 'chef_projet')
      .order('full_name');

    if (error) throw error;
    setChefs(data || []);
  } catch (error) {
    console.error('Error fetching chefs:', error);
  }
};
```

**Problem:** The query was trying to fetch from a `workers` table that doesn't exist or doesn't contain the user data. The actual user data with roles is stored in the `users` table.

## Solution
Changed the table reference from `workers` to `users`:

### After (CORRECT):
```typescript
const fetchChefs = async () => {
  try {
    const { data, error } = await supabase
      .from('users')  // ✅ CORRECT TABLE
      .select('id, email, full_name')
      .eq('role', 'chef_projet')
      .order('full_name');

    if (error) throw error;
    setChefs(data || []);
  } catch (error) {
    console.error('Error fetching chefs:', error);
  }
};
```

## Files Modified
- **[ProjectsManagementPage.tsx](src/pages/ProjectsManagementPage.tsx)** - Line 127-140
  - Changed `.from('workers')` to `.from('users')`
  - Updated comment to reflect "users" instead of "workers"

## Impact
✅ The Chef de Projet dropdown now correctly displays all users with the `chef_projet` role
✅ Users can now successfully select a project manager when creating new projects
✅ The "Create New Project" dialog in General Administration will now populate the chef selection correctly

## Testing Steps
1. Navigate to "Gestion Administration Générale" (General Administration)
2. Click "Ajouter Projet" (Add Project) button
3. In the "Chef de Projet" dropdown field, verify that you can see:
   - "test" (test@test.com)
   - "Chef de Projet" (chef@projet.com)
4. Select one and create the project successfully

## Related Files
- [src/pages/ProjectsManagementPage.tsx](src/pages/ProjectsManagementPage.tsx) - Main project management page
- Database Schema: `users` table with `role` field
