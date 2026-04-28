# GESTION PROJETS - COMPLETE IMPLEMENTATION GUIDE

## Overview
Complete restructure of Projects Management with database integration, improved UI, and new features.

---

## 📋 TABLE OF CONTENTS

1. [Database Schema](#database-schema)
2. [ProjectsManagementPage Updates](#projects-management-page-updates)
3. [New Pages to Create](#new-pages-to-create)
4. [Sidebar Navigation Updates](#sidebar-navigation-updates)
5. [SQL Execution Steps](#sql-execution-steps)
6. [Testing Checklist](#testing-checklist)

---

## Database Schema

### Tables Created:
- `projects` - Main projects table
- `project_expenses` - Track project expenses
- `project_versements` - Track project payments/versements
- `general_cash_box` - General cash management
- `project_finance` - Project financing summary
- `project_finance_detail` - Detailed financing records

**Location**: `SQL_GESTION_PROJETS_COMPLETE.sql`

---

## ProjectsManagementPage Updates

### Features Added:
✅ Database-driven projects (not local state)
✅ Chef de Projet selector pulls from users table (role='chef_projet')
✅ Improved card design with gradient headers
✅ Project status badges (pending, active, completed, cancelled)
✅ Search functionality:
  - Search by project name
  - Search by chef de projet email
✅ History button showing all expenses and versements
✅ Add Money button (Add versements/expenses)
✅ View Details dialog
✅ Edit/Delete with confirmation

### Key Functions:
- `fetchProjects()` - Fetch all projects from database
- `fetchChefs()` - Fetch chef_projet users from database
- `fetchProjectHistory(projectId)` - Get expenses and versements for a project
- `handleSaveProject()` - Create/update project
- `handleAddMoney()` - Add versements or expenses
- `handleDeleteProject()` - Delete project with confirmation

### State Management:
- Projects from `projects` table
- Chefs from `users` table (role='chef_projet')
- History data from `project_expenses` and `project_versements`

---

## New Pages to Create

### 1. GeneralCaisseProjectPage.tsx
**Path**: `src/pages/GeneralCaisseProjectPage.tsx`

**Features**:
- Add money to general cash box
- Description (required)
- Amount (required)
- Date (required)
- Category dropdown
- Display all transactions (in/out)
- Calculate total balance
- Edit/Delete transactions

**Database Table**: `general_cash_box`

**Key Fields**:
- transaction_id (auto-generated)
- amount
- description
- transaction_date
- category (frais généraux, salaires, matériel, autre)
- transaction_type (versement, retrait, dépense)
- reference_project_id (optional)

### 2. ProjectsFinancingPage.tsx
**Path**: `src/pages/ProjectsFinancingPage.tsx`

**Features**:
- Select project
- Display project financing summary
- Add new financing entry (with description, amount, date)
- Display all financing history
- Edit button for each entry
- Delete button for each entry
- Calculate totals (allocated, spent, received)
- Display balance

**Database Tables**:
- `project_finance` (summary)
- `project_finance_detail` (transactions)

**Key Fields**:
- finance_id
- project_id
- total_allocated
- total_spent
- total_received
- finance_date
- finance_type (entrée, sortie)
- amount
- description

### 3. UpdateFinanceProjectBoxPage.tsx (Fix existing)
**Path**: `src/pages/FinanceProjectBoxPage.tsx`

**Updates Needed**:
- Connect with `project_finance` table instead of local state
- Implement add/edit/delete for financing records
- Improve UI design (similar to ProjectsManagementPage)
- Add search/filter functionality
- Display balance calculations

---

## Sidebar Navigation Updates

### Add to AppLayout.tsx

**In admin menu, add new items**:

```tsx
// After Projects Management
{
  label: 'nav.general_cash_box',
  icon: Wallet,
  path: '/general-caisse',
  roles: ['admin', 'comptable']
},
{
  label: 'nav.project_financing',
  icon: CreditCard,
  path: '/projects-financing',
  roles: ['admin', 'comptable', 'resp_projets']
}
```

### Import icons:
- `Wallet` for General Caisse
- `CreditCard` for Project Financing

### Translation Keys to Add:

**fr.json**:
```json
{
  "nav": {
    "general_cash_box": "Caisse Générale",
    "project_financing": "Finances Projets"
  }
}
```

**ar.json**:
```json
{
  "nav": {
    "general_cash_box": "الصندوق العام",
    "project_financing": "تمويل المشاريع"
  }
}
```

---

## SQL Execution Steps

### Step 1: Execute Main Schema
Execute the file: `SQL_GESTION_PROJETS_COMPLETE.sql`

This creates:
- All 6 tables
- Indexes for performance
- RLS policies for security

### Step 2: Verify Tables
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('projects', 'project_expenses', 'project_versements', 'general_cash_box', 'project_finance', 'project_finance_detail');
```

### Step 3: Enable RLS (if not automatic)
```sql
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_versements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_cash_box ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_finance_detail ENABLE ROW LEVEL SECURITY;
```

### Step 4: Migrate Existing Data (Optional)
If migrating from old system:
```sql
-- Insert existing projects
INSERT INTO public.projects (project_id, name, address, description, chef_de_projet_id, status, total_budget)
SELECT 
  'PROJ' || id,
  name,
  address,
  description,
  (SELECT id FROM users WHERE email = 'chef_email@example.com'), -- update as needed
  'pending',
  total_budget
FROM old_projects_table;
```

---

## Implementation Steps

### Phase 1: Database Setup (15 min)
1. Execute SQL_GESTION_PROJETS_COMPLETE.sql
2. Verify tables created
3. Test RLS policies

### Phase 2: Update ProjectsManagementPage (30 min)
1. Replace current ProjectsManagementPage.tsx with UPDATED version
2. Verify database connection works
3. Test CRUD operations

### Phase 3: Create GeneralCaisseProjectPage (20 min)
1. Create new file based on template below
2. Add sidebar navigation
3. Test add/edit/delete transactions

### Phase 4: Create ProjectsFinancingPage (20 min)
1. Create new file based on template below
2. Add sidebar navigation
3. Test financing operations

### Phase 5: Update Sidebar (10 min)
1. Add new menu items to AppLayout.tsx
2. Import icons
3. Add translation keys
4. Test navigation

### Phase 6: Testing (30 min)
1. Create test projects
2. Add versements/expenses
3. Verify calculations
4. Test search/filter
5. Test history display

---

## Component Template Examples

### GeneralCaisseProjectPage Template

```tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Plus, Wallet, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  transaction_date: string;
  category: string;
  transaction_type: 'versement' | 'retrait' | 'dépense';
}

export default function GeneralCaisseProjectPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    amount: 0,
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    category: 'frais généraux',
    transaction_type: 'versement' as const
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('general_cash_box')
      .select('*')
      .order('transaction_date', { ascending: false });
    setTransactions(data || []);
  };

  const handleAdd = async () => {
    const { error } = await supabase
      .from('general_cash_box')
      .insert([{
        transaction_id: `GCB${Date.now()}`,
        amount: form.amount,
        description: form.description,
        transaction_date: form.transaction_date,
        category: form.category,
        transaction_type: form.transaction_type,
        created_by_id: user?.id
      }]);

    if (!error) {
      setShowDialog(false);
      fetchTransactions();
    }
  };

  const getTotalIn = () => transactions
    .filter(t => t.transaction_type === 'versement')
    .reduce((sum, t) => sum + t.amount, 0);

  const getTotalOut = () => transactions
    .filter(t => t.transaction_type !== 'versement')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('nav.general_cash_box')}</h1>
        <Button onClick={() => setShowDialog(true)} className="btn-gradient gap-2">
          <Plus className="w-4 h-4" /> Add Transaction
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total In</p>
            <p className="text-2xl font-bold text-green-600">+{getTotalIn().toLocaleString()} DA</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Out</p>
            <p className="text-2xl font-bold text-red-600">-{getTotalOut().toLocaleString()} DA</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className={`text-2xl font-bold ${getTotalIn() - getTotalOut() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(getTotalIn() - getTotalOut()).toLocaleString()} DA
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {transactions.map(t => (
          <Card key={t.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{t.description}</p>
                <p className="text-sm text-muted-foreground">{t.category}</p>
              </div>
              <p className={`text-lg font-bold ${t.transaction_type === 'versement' ? 'text-green-600' : 'text-red-600'}`}>
                {t.transaction_type === 'versement' ? '+' : '-'}{t.amount.toLocaleString()} DA
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Dialog for adding transaction */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          {/* Form fields */}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Database tables created successfully
- [ ] ProjectsManagementPage loads and displays projects
- [ ] Can create new project
- [ ] Chef de Projet selector shows users from database
- [ ] Can add versements to project
- [ ] Can add expenses to project
- [ ] History dialog shows all transactions
- [ ] Can edit project
- [ ] Can delete project
- [ ] Search by project name works
- [ ] Search by chef email works
- [ ] GeneralCaisseProjectPage CRUD works
- [ ] ProjectsFinancingPage CRUD works
- [ ] Calculations are accurate
- [ ] Sidebar navigation displays correctly
- [ ] All translations show properly

---

## File Summary

### Files to Create/Update:
1. **SQL_GESTION_PROJETS_COMPLETE.sql** ✅ Created
2. **ProjectsManagementPage.UPDATED.tsx** ✅ Created (rename to ProjectsManagementPage.tsx)
3. **GeneralCaisseProjectPage.tsx** - To create
4. **ProjectsFinancingPage.tsx** - To create
5. **AppLayout.tsx** - Update sidebar
6. **fr.json & ar.json** - Add translations

### Database Tables:
- projects
- project_expenses
- project_versements
- general_cash_box
- project_finance
- project_finance_detail

---

## Notes

- All timestamps use CURRENT_TIMESTAMP
- All IDs use UUID or custom ID format
- RLS policies ensure users can only see their data
- Calculations done in database where possible
- Delete operations cascade to child tables
- All forms validate required fields before submission
