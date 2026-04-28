-- SQL Script to Insert Test Data for Material Commands (Commandes Matériel)
-- This script inserts sample material commands with 2-4 products each for testing

-- First, let's ensure we have some categories and unities
INSERT INTO public.categories (name, description) VALUES
('Électricité', 'Produits électriques'),
('Plomberie', 'Produits de plomberie'),
('Quincaillerie', 'Articles de quincaillerie'),
('Peinture', 'Produits de peinture et revêtement')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.unities (name, symbol) VALUES
('Mètre', 'm'),
('Kilogramme', 'kg'),
('Unité', 'u'),
('Litre', 'l'),
('Boîte', 'bx')
ON CONFLICT (name) DO NOTHING;

-- Get IDs for categories and unities (we'll reference them)
-- Note: Replace 'your-user-id-here' with an actual user ID from auth.users
-- You can find valid user IDs by running: SELECT id FROM auth.users LIMIT 1;

-- Insert Material Commands
-- Command 1: Électricité et Câblage
WITH new_cmd AS (
  INSERT INTO public.material_commands (command_id, status, created_by_id, created_at, updated_at) 
  VALUES (
    'CMD-' || LPAD((FLOOR(RANDOM() * 100000)::int)::text, 5, '0'),
    'pending',
    (SELECT id FROM auth.users LIMIT 1),
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO public.command_products (command_id, product_name, category_id, unity_id, quantity, price, note, created_at)
SELECT 
  nc.id,
  'Câble électrique 2.5mm',
  (SELECT id FROM public.categories WHERE name = 'Électricité' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Mètre' LIMIT 1),
  50,
  2500,
  'Câble de qualité standard',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Disjoncteur 16A',
  (SELECT id FROM public.categories WHERE name = 'Électricité' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Unité' LIMIT 1),
  10,
  850,
  'Disjoncteur automatique bipolaire',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Prise électrique',
  (SELECT id FROM public.categories WHERE name = 'Électricité' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Unité' LIMIT 1),
  20,
  450,
  'Prise 2P+T avec terre',
  NOW()
FROM new_cmd nc;

-- Command 2: Plomberie et Tuyauterie
WITH new_cmd AS (
  INSERT INTO public.material_commands (command_id, status, created_by_id, created_at, updated_at) 
  VALUES (
    'CMD-' || LPAD((FLOOR(RANDOM() * 100000)::int)::text, 5, '0'),
    'pending',
    (SELECT id FROM auth.users LIMIT 1),
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO public.command_products (command_id, product_name, category_id, unity_id, quantity, price, note, created_at)
SELECT 
  nc.id,
  'Tuyau PVC 20mm',
  (SELECT id FROM public.categories WHERE name = 'Plomberie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Mètre' LIMIT 1),
  100,
  1200,
  'Tuyau rigide PVC pour eau froide',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Robinet d''arrêt',
  (SELECT id FROM public.categories WHERE name = 'Plomberie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Unité' LIMIT 1),
  8,
  3500,
  'Robinet d''arrêt 3/4 pouces',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Coude PVC 90°',
  (SELECT id FROM public.categories WHERE name = 'Plomberie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Unité' LIMIT 1),
  30,
  350,
  'Coude 20mm pour tuyauterie',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Sceau étanchéité',
  (SELECT id FROM public.categories WHERE name = 'Plomberie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Boîte' LIMIT 1),
  5,
  2800,
  'Sceau pour joints étanches',
  NOW()
FROM new_cmd nc;

-- Command 3: Quincaillerie
WITH new_cmd AS (
  INSERT INTO public.material_commands (command_id, status, created_by_id, created_at, updated_at) 
  VALUES (
    'CMD-' || LPAD((FLOOR(RANDOM() * 100000)::int)::text, 5, '0'),
    'pending',
    (SELECT id FROM auth.users LIMIT 1),
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO public.command_products (command_id, product_name, category_id, unity_id, quantity, price, note, created_at)
SELECT 
  nc.id,
  'Vis acier 4x50mm',
  (SELECT id FROM public.categories WHERE name = 'Quincaillerie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Boîte' LIMIT 1),
  10,
  950,
  'Boîte de 500 vis',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Clou galvanisé 3.5mm',
  (SELECT id FROM public.categories WHERE name = 'Quincaillerie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Kilogramme' LIMIT 1),
  5,
  1200,
  'Clous galvanisés premium',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Charnière porte 100mm',
  (SELECT id FROM public.categories WHERE name = 'Quincaillerie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Unité' LIMIT 1),
  12,
  2100,
  'Charnière en acier zingué',
  NOW()
FROM new_cmd nc;

-- Command 4: Peinture et Revêtement
WITH new_cmd AS (
  INSERT INTO public.material_commands (command_id, status, created_by_id, created_at, updated_at) 
  VALUES (
    'CMD-' || LPAD((FLOOR(RANDOM() * 100000)::int)::text, 5, '0'),
    'pending',
    (SELECT id FROM auth.users LIMIT 1),
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO public.command_products (command_id, product_name, category_id, unity_id, quantity, price, note, created_at)
SELECT 
  nc.id,
  'Peinture acrylique blanche',
  (SELECT id FROM public.categories WHERE name = 'Peinture' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Litre' LIMIT 1),
  20,
  3500,
  'Peinture 100% acrylique - Finish mat',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Pinceau 25mm',
  (SELECT id FROM public.categories WHERE name = 'Peinture' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Unité' LIMIT 1),
  15,
  850,
  'Pinceau poils mixtes',
  NOW()
FROM new_cmd nc;

-- Command 5: Matériaux mixtes
WITH new_cmd AS (
  INSERT INTO public.material_commands (command_id, status, created_by_id, created_at, updated_at) 
  VALUES (
    'CMD-' || LPAD((FLOOR(RANDOM() * 100000)::int)::text, 5, '0'),
    'pending',
    (SELECT id FROM auth.users LIMIT 1),
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO public.command_products (command_id, product_name, category_id, unity_id, quantity, price, note, created_at)
SELECT 
  nc.id,
  'Ciment gris 50kg',
  (SELECT id FROM public.categories WHERE name = 'Quincaillerie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Kilogramme' LIMIT 1),
  30,
  450,
  'Sac de 50kg ciment Portland',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Sable fin',
  (SELECT id FROM public.categories WHERE name = 'Quincaillerie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Kilogramme' LIMIT 1),
  500,
  180,
  'Sable de rivière lavé',
  NOW()
FROM new_cmd nc;

-- Verify the data was inserted
SELECT 'Total Material Commands Created:' as info, COUNT(*) as count 
FROM public.material_commands 
WHERE created_at > NOW() - INTERVAL '10 minutes';

SELECT 'Total Command Products Created:' as info, COUNT(*) as count 
FROM public.command_products 
WHERE created_at > NOW() - INTERVAL '10 minutes';

-- View the created data
SELECT 
  mc.command_id,
  mc.status,
  COUNT(cp.id) as product_count,
  mc.created_at
FROM public.material_commands mc
LEFT JOIN public.command_products cp ON mc.id = cp.command_id
WHERE mc.created_at > NOW() - INTERVAL '10 minutes'
GROUP BY mc.id, mc.command_id, mc.status, mc.created_at
ORDER BY mc.created_at DESC;
