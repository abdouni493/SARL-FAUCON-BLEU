# Chef de Projet Interfaces - Deep Analysis & Database Integration

## Overview
The Chef de Projet role manages 5 interconnected interfaces that require comprehensive database integration:

1. **Commandes Matériel** (Material Commands) - Create material orders
2. **Commandes d'Achat** (Purchase Commands) - Manage purchase orders  
3. **Réception Commandes** (Receive Commands) - Track received orders
4. **Caisse de Financement** (Finance Box) - Manage project financing
5. **Dépenses Projet** (Project Expenses) - Track project expenses

---

## Current State Analysis

### 1. Commandes Matériel (MaterialCommandsPage.tsx)
**Current Issues:**
- ✗ Only uses local DataContext state
- ✗ No Supabase integration
- ✗ Category/Unity CRUD not connected to database
- ✗ Commands not persisted

**Required Features:**
- ✓ Create material commands with products
- ✓ Add/Delete products in command
- ✓ Add new categories dynamically
- ✓ Add new unity measurements dynamically
- ✓ Edit commands
- ✓ Delete commands with confirmation
- ✓ View command details

**Data Dependencies:**
- categories table
- unities table
- material_commands table
- command_products table (junction)

---

### 2. Commandes d'Achat (PurchaseCommandsPage.tsx)
**Current Issues:**
- ✗ Only filters existing commands
- ✗ No validation workflow
- ✗ Convert to Bons Commande not implemented
- ✗ All data local

**Required Features:**
- ✓ Display pending purchase commands
- ✓ Validate commands
- ✓ Convert validated commands to Bons Commande
- ✓ Filter by status (pending/validated)
- ✓ View command details
- ✓ Track conversion to Bons Commande

**Data Dependencies:**
- purchase_commands table
- command_products table
- bons_commandes table

---

### 3. Réception Commandes (ReceiveCommandsPage.tsx)
**Current Issues:**
- ✗ Only shows finalized commands locally
- ✗ Validation not implemented
- ✗ Reclamation system not persistent
- ✗ Print functionality is mock

**Required Features:**
- ✓ Display finalized commands
- ✓ Validate receipt of commands
- ✓ File reclamations for products
- ✓ Select affected products for reclamations
- ✓ Print command receipts
- ✓ Track reclamations

**Data Dependencies:**
- receive_commands table
- command_receipts table
- reclamations table
- reclamation_products table (junction)

---

### 4. Caisse de Financement (FinanceProjectBoxPage.tsx)
**Current Issues:**
- ✗ ProjectBox data only in local state
- ✗ Versements (payments) not persisted
- ✗ Print customization not saved
- ✗ Cannot create new boxes persistently

**Required Features:**
- ✓ Create project financing boxes
- ✓ Add versements (payment transfers)
- ✓ Calculate totals and remaining balance
- ✓ Edit project boxes
- ✓ Delete project boxes with confirmation
- ✓ View versement history
- ✓ Print with customization options
- ✓ Customize print settings (font, color, company name)

**Data Dependencies:**
- project_boxes table
- project_versements table
- print_customizations table

---

### 5. Dépenses Projet (ProjectExpensesPage.tsx)
**Current Issues:**
- ✗ Expenses only in local DataContext
- ✗ No link to project boxes
- ✗ CRUD operations not persistent

**Required Features:**
- ✓ Create project expenses
- ✓ Edit existing expenses
- ✓ Delete expenses with confirmation
- ✓ Link expenses to project boxes
- ✓ Calculate total expenses per project

**Data Dependencies:**
- project_expenses table
- expense_categories table (optional)

---

## Complete SQL Schema

```sql
-- ============================================
-- CATEGORIES & UNITIES
-- ============================================

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.unities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  symbol VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MATERIAL COMMANDS
-- ============================================

CREATE TABLE public.material_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'purchase', 'finalized')),
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.command_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id UUID NOT NULL REFERENCES public.material_commands(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  unity_id UUID REFERENCES public.unities(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(15,2) DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PURCHASE COMMANDS
-- ============================================

CREATE TABLE public.purchase_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id VARCHAR(50) NOT NULL UNIQUE,
  material_command_id UUID NOT NULL REFERENCES public.material_commands(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'finalized')),
  supplier_id VARCHAR(255),
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- BONS COMMANDE
-- ============================================

CREATE TABLE public.bons_commandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_id VARCHAR(50) NOT NULL UNIQUE,
  purchase_command_id UUID NOT NULL REFERENCES public.purchase_commands(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'paid')),
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.bon_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_id UUID NOT NULL REFERENCES public.bons_commandes(id) ON DELETE CASCADE,
  supplier VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- RECEIVE COMMANDS
-- ============================================

CREATE TABLE public.receive_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_id UUID NOT NULL REFERENCES public.bons_commandes(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'received')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.reclamations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receive_command_id UUID NOT NULL REFERENCES public.receive_commands(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.reclamation_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reclamation_id UUID NOT NULL REFERENCES public.reclamations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.command_products(id) ON DELETE CASCADE
);

-- ============================================
-- PROJECT FINANCE
-- ============================================

CREATE TABLE public.project_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  chef_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT,
  total_amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.project_versements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_box_id UUID NOT NULL REFERENCES public.project_boxes(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.print_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_box_id UUID NOT NULL REFERENCES public.project_boxes(id) ON DELETE CASCADE,
  font_size INTEGER DEFAULT 14,
  is_bold BOOLEAN DEFAULT false,
  text_color VARCHAR(7) DEFAULT '#000000',
  company_name VARCHAR(255),
  logo_position_x INTEGER DEFAULT 0,
  logo_position_y INTEGER DEFAULT 0,
  title_font_size INTEGER DEFAULT 24,
  subtitle_font_size INTEGER DEFAULT 12,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PROJECT EXPENSES
-- ============================================

CREATE TABLE public.project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id VARCHAR(50) NOT NULL UNIQUE,
  project_box_id UUID REFERENCES public.project_boxes(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  expense_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_material_commands_status ON public.material_commands(status);
CREATE INDEX idx_material_commands_created_by ON public.material_commands(created_by_id);
CREATE INDEX idx_purchase_commands_material_id ON public.purchase_commands(material_command_id);
CREATE INDEX idx_purchase_commands_status ON public.purchase_commands(status);
CREATE INDEX idx_bons_commandes_purchase_id ON public.bons_commandes(purchase_command_id);
CREATE INDEX idx_command_products_command_id ON public.command_products(command_id);
CREATE INDEX idx_project_boxes_chef_id ON public.project_boxes(chef_id);
CREATE INDEX idx_project_expenses_project_id ON public.project_expenses(project_box_id);
CREATE INDEX idx_receive_commands_bon_id ON public.receive_commands(bon_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bons_commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receive_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclamations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclamation_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_versements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_customizations ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies for authenticated users
CREATE POLICY "Allow authenticated users to read categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage categories" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read unities" ON public.unities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage unities" ON public.unities FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage material commands" ON public.material_commands FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to manage command products" ON public.command_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage purchase commands" ON public.purchase_commands FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to manage bons commandes" ON public.bons_commandes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to manage bon offers" ON public.bon_offers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage receive commands" ON public.receive_commands FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to manage reclamations" ON public.reclamations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to manage reclamation products" ON public.reclamation_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage project boxes" ON public.project_boxes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to manage project versements" ON public.project_versements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to manage project expenses" ON public.project_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to manage print customizations" ON public.print_customizations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- SAMPLE DATA (Optional)
-- ============================================

INSERT INTO public.categories (name, description) VALUES
('Electronics', 'Electronic components and devices'),
('Software', 'Software licenses and tools'),
('Hardware', 'Computer hardware'),
('Supplies', 'Office supplies'),
('Equipment', 'Heavy equipment');

INSERT INTO public.unities (name, symbol) VALUES
('Pièce', 'pcs'),
('Kilogramme', 'kg'),
('Litre', 'L'),
('Mètre', 'm'),
('Heure', 'h');
```

This comprehensive SQL schema provides the foundation for all Chef de Projet operations with proper relationships, constraints, and security policies. The next step would be to implement the corresponding TypeScript/React components with full Supabase integration.

