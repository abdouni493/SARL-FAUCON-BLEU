-- ============================================================================
-- QUICK COPY & PASTE SQL - APPOINTMENTS & PAYMENT ORDERS
-- ============================================================================
-- Just select all and copy into Supabase SQL Editor, then click Run
-- Takes ~10 seconds to execute
-- ============================================================================

-- CREATE APPOINTMENTS TABLE
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

CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON public.appointments(created_at DESC);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
CREATE POLICY "Users can view their own appointments" ON public.appointments FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own appointments" ON public.appointments;
CREATE POLICY "Users can create their own appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
CREATE POLICY "Users can update their own appointments" ON public.appointments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own appointments" ON public.appointments;
CREATE POLICY "Users can delete their own appointments" ON public.appointments FOR DELETE USING (auth.uid() = user_id);

-- CREATE PAYMENT ORDERS TABLE
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

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_bon_commande_id ON public.payment_orders(bon_commande_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON public.payment_orders(created_at DESC);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authorized users can view all payment orders" ON public.payment_orders;
CREATE POLICY "Authorized users can view all payment orders" ON public.payment_orders FOR SELECT USING (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'comptable', 'gestionnaire')) OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "Authorized users can create payment orders" ON public.payment_orders;
CREATE POLICY "Authorized users can create payment orders" ON public.payment_orders FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'comptable', 'gestionnaire'))
);

DROP POLICY IF EXISTS "Authorized users can update payment orders" ON public.payment_orders;
CREATE POLICY "Authorized users can update payment orders" ON public.payment_orders FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'comptable', 'gestionnaire'))
) WITH CHECK (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'comptable', 'gestionnaire'))
);

DROP POLICY IF EXISTS "Authorized users can delete payment orders" ON public.payment_orders;
CREATE POLICY "Authorized users can delete payment orders" ON public.payment_orders FOR DELETE USING (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'comptable', 'gestionnaire'))
);

-- CREATE VIEWS FOR DASHBOARD
CREATE OR REPLACE VIEW public.upcoming_appointments_view AS
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
WHERE a.is_active = true AND CAST(a.date AS DATE) >= CAST(CURRENT_DATE AS DATE)
ORDER BY a.date ASC, a.time ASC;

CREATE OR REPLACE VIEW public.pending_payment_orders_view AS
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
-- DONE! Tables created with RLS policies and indexes
-- ============================================================================
