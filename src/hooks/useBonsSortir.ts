import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface BonSortirProduct {
  id?: string;
  bon_sortir_id?: string;
  product_id?: string;
  product_name: string;
  barcode?: string;
  quantity: number;
}

export interface BonSortir {
  id: string;
  bon_id: string;
  exit_date: string;
  description?: string;
  project_box_id?: string;
  project_name?: string;
  created_at: string;
  updated_at: string;
  products: BonSortirProduct[];
}

export interface ProductSearchResult {
  id: string;
  name: string;
  barcode?: string;
  unit_price?: number;
  unity_id?: string;
  category_id?: string;
}

export function useBonsSortir() {
  const [bons, setBons] = useState<BonSortir[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBonsSortir = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('bons_sortir')
        .select(`
          *,
          project_boxes(name),
          bons_sortir_products(*)
        `)
        .order('created_at', { ascending: false });

      if (err) {
        // Fallback: basic query without joins
        const { data: fallback, error: fallbackErr } = await supabase
          .from('bons_sortir')
          .select('*')
          .order('created_at', { ascending: false });

        if (fallbackErr) throw fallbackErr;

        // Load products separately
        const enriched: BonSortir[] = await Promise.all(
          (fallback || []).map(async (bon) => {
            const { data: prods } = await supabase
              .from('bons_sortir_products')
              .select('*')
              .eq('bon_sortir_id', bon.id);
            return { ...bon, products: prods || [], project_name: undefined };
          })
        );
        setBons(enriched);
        return;
      }

      const enriched: BonSortir[] = (data || []).map((bon) => ({
        ...bon,
        project_name: bon.project_boxes?.name ?? undefined,
        products: bon.bons_sortir_products ?? [],
      }));

      setBons(enriched);
    } catch (err: any) {
      setError(err.message);
      console.error('useBonsSortir.fetchBonsSortir:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createBonSortir = useCallback(
    async (payload: {
      bon_id: string;
      exit_date: string;
      description?: string;
      project_box_id?: string;
      products: BonSortirProduct[];
    }) => {
      const { products, ...bonData } = payload;

      const { data: newBon, error: bonErr } = await supabase
        .from('bons_sortir')
        .insert([{ ...bonData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
        .select()
        .single();

      if (bonErr) throw bonErr;
      if (!newBon) throw new Error('Failed to create bon de sortir');

      if (products.length > 0) {
        const productsToInsert = products.map((p) => ({
          bon_sortir_id: newBon.id,
          product_id: p.product_id ?? null,
          product_name: p.product_name,
          barcode: p.barcode ?? null,
          quantity: p.quantity,
        }));

        const { error: prodErr } = await supabase
          .from('bons_sortir_products')
          .insert(productsToInsert);

        if (prodErr) throw prodErr;
      }

      return newBon;
    },
    []
  );

  const updateBonSortir = useCallback(
    async (
      id: string,
      payload: {
        bon_id?: string;
        exit_date?: string;
        description?: string;
        project_box_id?: string;
        products?: BonSortirProduct[];
      }
    ) => {
      const { products, ...bonData } = payload;

      const { error: bonErr } = await supabase
        .from('bons_sortir')
        .update({ ...bonData, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (bonErr) throw bonErr;

      if (products !== undefined) {
        // Replace products
        await supabase.from('bons_sortir_products').delete().eq('bon_sortir_id', id);

        if (products.length > 0) {
          const productsToInsert = products.map((p) => ({
            bon_sortir_id: id,
            product_id: p.product_id ?? null,
            product_name: p.product_name,
            barcode: p.barcode ?? null,
            quantity: p.quantity,
          }));

          const { error: prodErr } = await supabase
            .from('bons_sortir_products')
            .insert(productsToInsert);

          if (prodErr) throw prodErr;
        }
      }
    },
    []
  );

  const deleteBonSortir = useCallback(async (id: string) => {
    // Products are cascade-deleted via FK; attempt direct delete anyway
    await supabase.from('bons_sortir_products').delete().eq('bon_sortir_id', id);

    const { error: err } = await supabase.from('bons_sortir').delete().eq('id', id);
    if (err) throw err;
  }, []);

  const searchProducts = useCallback(async (query: string): Promise<ProductSearchResult[]> => {
    if (!query.trim()) return [];

    const { data, error: err } = await supabase
      .from('products')
      .select('id, name, barcode, unit_price, unity_id, category_id')
      .or(`name.ilike.%${query}%,barcode.eq.${query}`)
      .limit(20);

    if (err) {
      console.error('searchProducts error:', err);
      return [];
    }

    return (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode ?? undefined,
      unit_price: p.unit_price ?? undefined,
      unity_id: p.unity_id ?? undefined,
      category_id: p.category_id ?? undefined,
    }));
  }, []);

  return {
    bons,
    loading,
    error,
    fetchBonsSortir,
    createBonSortir,
    updateBonSortir,
    deleteBonSortir,
    searchProducts,
  };
}
