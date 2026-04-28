-- ============================================================================
-- ADD_ADMIN_VALIDATION_TO_PAYMENT_ORDERS.sql
-- ============================================================================
-- PURPOSE: Add two-step validation for payment orders
--   Step 1: Comptable validates (existing functionality)
--   Step 2: General Administration validates (new)
-- ============================================================================

-- STEP 1: ADD ADMIN VALIDATION FIELDS
-- ============================================================================
-- Add columns to track administration validation

ALTER TABLE public.payment_orders 
ADD COLUMN IF NOT EXISTS admin_validated BOOLEAN DEFAULT false;

ALTER TABLE public.payment_orders 
ADD COLUMN IF NOT EXISTS admin_validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.payment_orders 
ADD COLUMN IF NOT EXISTS admin_validated_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- STEP 2: UPDATE STATUS CONSTRAINT (Optional - for enhanced tracking)
-- ============================================================================
-- Current status: pending, validated
-- After this change:
--   pending = not validated by comptable
--   validated = validated by comptable only
--   finalized = validated by both comptable and administration

-- NOTE: This comment documents the new workflow
-- Do NOT execute the ALTER TABLE below if you want to keep existing status values
-- Instead, use the boolean flags (admin_validated) to track admin approval

-- If you want to add 'finalized' status, uncomment and run:
-- ALTER TABLE public.payment_orders 
-- DROP CONSTRAINT IF EXISTS payment_orders_status_check;

-- ALTER TABLE public.payment_orders 
-- ADD CONSTRAINT payment_orders_status_check 
-- CHECK (status IN ('pending', 'validated', 'finalized'));

-- ============================================================================
-- STEP 3: CREATE INDEX FOR ADMIN VALIDATION QUERIES
-- ============================================================================
-- Improves performance for filtering orders by admin validation status

CREATE INDEX IF NOT EXISTS idx_payment_orders_admin_validated 
ON public.payment_orders(admin_validated);

CREATE INDEX IF NOT EXISTS idx_payment_orders_admin_validated_by 
ON public.payment_orders(admin_validated_by);

CREATE INDEX IF NOT EXISTS idx_payment_orders_validation_status 
ON public.payment_orders(status, admin_validated);

-- ============================================================================
-- STEP 4: VIEW - ORDERS AWAITING ADMIN VALIDATION
-- ============================================================================
-- Useful for administration dashboard - shows orders validated by comptable
-- but not yet by administration

CREATE OR REPLACE VIEW orders_awaiting_admin_validation AS
SELECT 
  po.id,
  po.user_id,
  po.bon_commande_id,
  po.total_price,
  po.note,
  po.status,
  po.admin_validated,
  bc.bon_id,
  bc.total_price as bon_total_price,
  po.created_at,
  po.updated_at,
  CASE 
    WHEN po.status = 'validated' AND po.admin_validated = false THEN 'Awaiting Admin Approval'
    WHEN po.admin_validated = true THEN 'Admin Approved'
    ELSE 'Not Yet Comptable Approved'
  END as validation_stage
FROM public.payment_orders po
LEFT JOIN public.bons_commandes bc ON po.bon_commande_id = bc.id
WHERE po.status = 'validated' AND po.admin_validated = false
ORDER BY po.created_at ASC;

-- ============================================================================
-- STEP 5: VERIFICATION QUERIES
-- ============================================================================

-- Check if columns were added successfully
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_orders'
AND column_name IN ('admin_validated', 'admin_validated_by', 'admin_validated_at')
ORDER BY column_name;

-- Check if indexes were created
SELECT indexname
FROM pg_indexes
WHERE tablename = 'payment_orders'
AND indexname LIKE '%admin%'
ORDER BY indexname;

-- Check if view was created
SELECT table_name FROM information_schema.tables
WHERE table_type = 'VIEW' AND table_name = 'orders_awaiting_admin_validation';

-- ============================================================================
-- STEP 6: SAMPLE DATA UPDATES (Optional - for testing)
-- ============================================================================
-- If you have existing validated orders, you can mark some for admin validation
-- Uncomment to use:

-- Mark first order as awaiting admin validation:
-- UPDATE public.payment_orders 
-- SET admin_validated = false
-- WHERE status = 'validated'
-- LIMIT 1;

-- Mark one order as admin validated:
-- UPDATE public.payment_orders 
-- SET admin_validated = true, 
--     admin_validated_by = auth.uid(),
--     admin_validated_at = CURRENT_TIMESTAMP
-- WHERE status = 'validated'
-- LIMIT 1;

-- ============================================================================
-- STEP 7: MIGRATION GUIDE
-- ============================================================================

-- VALIDATION WORKFLOW:
-- 
-- 1. User (Comptable Role):
--    - Creates payment order (status = 'pending')
--    - Clicks "Validate" button
--    - Changes status to 'validated' (admin_validated = false)
--
-- 2. Manager (Administration Role):
--    - Sees orders where status = 'validated' AND admin_validated = false
--    - Reviews the order
--    - Clicks "Admin Validate" button
--    - Sets admin_validated = true, admin_validated_by = current_user, admin_validated_at = now
--
-- STATUSES:
-- - pending: Created but not comptable validated
-- - validated: Comptable validated, awaiting admin validation
-- - finalized: Both comptable and admin validated (optional - use admin_validated boolean)

-- ============================================================================
-- COMPLETION CHECKLIST
-- ============================================================================
-- After running this SQL:
--
-- ✅ Columns added: admin_validated, admin_validated_by, admin_validated_at
-- ✅ Indexes created for performance
-- ✅ View created for admin dashboard
-- ✅ Verification queries show correct output
--
-- Then update React component:
-- ✅ Show "Comptable Validate" button if status = 'pending' AND user.role = 'comptable'
-- ✅ Show "Admin Validate" button if status = 'validated' AND admin_validated = false AND user.role = 'admin'
-- ✅ Show checkmark/approved badge if admin_validated = true

-- ============================================================================
