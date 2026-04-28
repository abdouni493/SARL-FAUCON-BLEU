-- ============================================================================
-- SQL SCHEMA FOR RENDEZ-VOUS (APPOINTMENTS) & ORDRES DE PAIEMENT (PAYMENT ORDERS)
-- ============================================================================
-- Execute this SQL in your Supabase PostgreSQL database
-- Date: April 6, 2026

-- ============================================================================
-- 1. APPOINTMENTS TABLE (Rendez-vous)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for appointments
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON public.appointments(created_at DESC);

-- Enable RLS on appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own appointments
CREATE POLICY "Users can view their own appointments"
  ON public.appointments
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can create their own appointments
CREATE POLICY "Users can create their own appointments"
  ON public.appointments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own appointments
CREATE POLICY "Users can update their own appointments"
  ON public.appointments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own appointments
CREATE POLICY "Users can delete their own appointments"
  ON public.appointments
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. PAYMENT ORDERS TABLE (Ordres de Paiement)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bon_commande_id UUID NOT NULL REFERENCES public.bons_commandes(id) ON DELETE RESTRICT,
  total_price NUMERIC(15, 2) NOT NULL CHECK (total_price > 0),
  note TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'validated')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for payment_orders
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_bon_commande_id ON public.payment_orders(bon_commande_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON public.payment_orders(created_at DESC);

-- Enable RLS on payment_orders
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin/Comptable/Gestionnaire can view all payment orders
CREATE POLICY "Authorized users can view all payment orders"
  ON public.payment_orders
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.users WHERE role IN ('admin', 'comptable', 'gestionnaire')
    )
    OR auth.uid() = user_id
  );

-- RLS Policy: Authorized users can create payment orders
CREATE POLICY "Authorized users can create payment orders"
  ON public.payment_orders
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.users WHERE role IN ('admin', 'comptable', 'gestionnaire')
    )
  );

-- RLS Policy: Authorized users can update payment orders
CREATE POLICY "Authorized users can update payment orders"
  ON public.payment_orders
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.users WHERE role IN ('admin', 'comptable', 'gestionnaire')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.users WHERE role IN ('admin', 'comptable', 'gestionnaire')
    )
  );

-- RLS Policy: Authorized users can delete payment orders
CREATE POLICY "Authorized users can delete payment orders"
  ON public.payment_orders
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.users WHERE role IN ('admin', 'comptable', 'gestionnaire')
    )
  );

-- ============================================================================
-- 3. UPDATE BONS_COMMANDES TABLE (if needed - add reference column)
-- ============================================================================
-- Uncomment if bons_commandes doesn't have a 'reference' column
/*
ALTER TABLE public.bons_commandes 
ADD COLUMN IF NOT EXISTS reference VARCHAR(255) UNIQUE;
*/

-- ============================================================================
-- 4. CREATE VIEWS FOR DASHBOARD ALERTS
-- ============================================================================

-- View: Upcoming appointments (for dashboard alerts)
CREATE OR REPLACE VIEW upcoming_appointments_view AS
SELECT 
  a.id,
  a.user_id,
  a.title,
  a.description,
  a.date,
  a.time,
  a.created_at,
  CASE 
    WHEN CAST(a.date AS DATE) = CAST(CURRENT_DATE AS DATE) THEN 'today'
    WHEN CAST(a.date AS DATE) = CAST(CURRENT_DATE + INTERVAL '1 day' AS DATE) THEN 'tomorrow'
    WHEN CAST(a.date AS DATE) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 'this_week'
    ELSE 'later'
  END AS urgency
FROM public.appointments a
WHERE a.is_active = true
  AND CAST(a.date AS DATE) >= CAST(CURRENT_DATE AS DATE)
ORDER BY a.date ASC, a.time ASC;

-- View: Pending payment orders (for dashboard alerts)
CREATE OR REPLACE VIEW pending_payment_orders_view AS
SELECT 
  po.id,
  po.user_id,
  po.bon_commande_id,
  po.total_price,
  po.note,
  po.created_at,
  bc.bon_id AS bon_commande_reference
FROM public.payment_orders po
LEFT JOIN public.bons_commandes bc ON po.bon_commande_id = bc.id
WHERE po.status = 'pending' AND po.is_active = true
ORDER BY po.created_at DESC;

-- ============================================================================
-- 5. SAMPLE DATA (Optional - for testing)
-- ============================================================================
-- Uncomment to insert test data (replace user-id with actual UUID from auth.users)

/*
-- Insert sample appointment
INSERT INTO public.appointments (user_id, title, description, date, time)
VALUES (
  'your-user-id-here',
  'Réunion avec le client',
  'Discuter des nouveaux produits',
  CURRENT_DATE + INTERVAL '3 days',
  '10:00:00'
);

-- Insert sample payment order
-- Note: Replace bon_commande_id with actual ID from bons_commandes table
INSERT INTO public.payment_orders (user_id, bon_commande_id, total_price, note, status)
VALUES (
  'your-user-id-here',
  'actual-bon-commande-id-here',
  15000.00,
  'Paiement pour commande BCP-001',
  'pending'
);
*/

-- ============================================================================
-- 6. VERIFICATION QUERIES (Run these to verify setup)
-- ============================================================================
-- Check appointments table structure
-- SELECT table_name, column_name, data_type FROM information_schema.columns 
-- WHERE table_name IN ('appointments', 'payment_orders');

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename IN ('appointments', 'payment_orders');

-- Check table sizes and record count
-- SELECT COUNT(*) as appointment_count FROM public.appointments;
-- SELECT COUNT(*) as payment_order_count FROM public.payment_orders;

-- ============================================================================
-- END OF SQL SCHEMA SETUP
-- ============================================================================
