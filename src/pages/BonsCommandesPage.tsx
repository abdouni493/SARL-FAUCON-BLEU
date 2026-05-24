import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Edit, Trash2, Plus, Save, Loader, Printer, Package, BarChart3, AlertCircle, CheckCircle, Clock, X, Upload, Settings, ImagePlus, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getPrintLabels, buildPrintHTML, openPrintWindow, formatDateLocale } from '@/lib/printUtils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface BonCommande {
  id: string;
  bon_id: string;
  purchase_command_id: string;
  supplier_id?: string;
  supplier_name: string;
  status: 'pending' | 'validated' | 'paid' | 'finalized';
  total_price: number;
  total_without_tva: number;
  total_with_tva: number;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  purchase_validated?: boolean;
  comptable_validated?: boolean;
  admin_validated?: boolean;
  project_id?: string;
  project_name?: string;
}

interface BonProduct {
  id: string;
  bon_commande_id: string;
  product_name: string;
  product_barcode?: string;
  barcode?: string;
  quantity: number;
  unity_price: number;
  is_active: boolean;
  tva_rate: number;
  subtotal: number;
  tva_amount: number;
  total_with_tva: number;
}

const StatCard = ({ icon: Icon, label, value, gradient, delay }: { icon: React.ElementType; label: string; value: string | number; gradient: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="group relative erp-card hover:shadow-lg transition-all border-2 border-blue-100 dark:border-slate-700 overflow-hidden"
  >
    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150" />
    
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">{label}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${gradient} shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </div>
  </motion.div>
);

interface BonProductForm {
  id?: string;
  product_name: string;
  quantity: number;
  unity_price: number;
  tva_rate: number;
  barcode?: string;
}

interface BonOffer {
  id?: string;
  supplier_name: string;
  image_url?: string;
  image_path?: string;
  notes?: string;
}

interface Supplier {
  id: string;
  name: string;
}

export default function BonsCommandesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { enterpriseSettings } = useData();
  const printRef = useRef<HTMLDivElement>(null);

  // State
  const [bonsCommandes, setBonsCommandes] = useState<BonCommande[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [viewBon, setViewBon] = useState<BonCommande | null>(null);
  const [manageBon, setManageBon] = useState<BonCommande | null>(null);
  const [editingBon, setEditingBon] = useState<BonCommande | null>(null);
  const [bonProducts, setBonProducts] = useState<BonProduct[]>([]);
  const [bonOffers, setBonOffers] = useState<BonOffer[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBonId, setEditingBonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'offers'>('products');
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({}); // Track product counts per bon
  const [pendingPrintBon, setPendingPrintBon] = useState<BonCommande | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    bon_id: '',
    supplier_name: '',
    notes: ''
  });

  const [products, setProducts] = useState<BonProductForm[]>([
    { id: crypto.randomUUID(), product_name: '', quantity: 1, unity_price: 0, tva_rate: 19 }
  ]);

  const [newOffers, setNewOffers] = useState<BonOffer[]>([
    { supplier_name: '', notes: '' }
  ]);
  const [userRole, setUserRole] = useState<string>('');
  const [validatingBonId, setValidatingBonId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    fetchSuppliers();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bons_commandes')
        .select(`
          *,
          project_boxes(name),
          bons_commandes_offers(supplier_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback to basic query if relationship query fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('bons_commandes')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (fallbackError) throw fallbackError;
        setBonsCommandes(fallbackData || []);
        // Load product counts for fallback data
        await loadProductCounts(fallbackData || []);
      } else {
        // If offers exist, use supplier_name from offers, otherwise use bon's supplier_name
        const enrichedData = (data || []).map(bon => ({
          ...bon,
          project_name: bon.project_boxes?.name || 'N/A',
          supplier_name: bon.bons_commandes_offers && bon.bons_commandes_offers.length > 0
            ? bon.bons_commandes_offers[0].supplier_name
            : bon.supplier_name
        }));
        setBonsCommandes(enrichedData);
        // Load product counts
        await loadProductCounts(enrichedData);
      }
    } catch (err: any) {
      console.error('Error loading bons:', err);
      // Final fallback - just load basic data
      try {
        const { data: basicData } = await supabase
          .from('bons_commandes')
          .select('*')
          .order('created_at', { ascending: false });
        setBonsCommandes(basicData || []);
        await loadProductCounts(basicData || []);
      } catch (fallbackErr) {
        setMessage(`Error loading bons: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadProductCounts = async (bons: BonCommande[]) => {
    try {
      const counts: Record<string, number> = {};
      
      for (const bon of bons) {
        const { count, error } = await supabase
          .from('bons_commandes_products')
          .select('*', { count: 'exact', head: true })
          .eq('bon_commande_id', bon.id);
        
        if (!error) {
          counts[bon.id] = count || 0;
        }
      }
      
      setProductCounts(counts);
    } catch (err) {
      console.error('Error loading product counts:', err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchBonProducts = async (bonId: string) => {
    try {
      const { data, error } = await supabase
        .from('bons_commandes_products')
        .select('*')
        .eq('bon_commande_id', bonId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBonProducts(data || []);
    } catch (err: any) {
      setMessage(`Error loading products: ${err.message}`);
    }
  };

  const fetchBonOffers = async (bonId: string) => {
    try {
      const { data, error } = await supabase
        .from('bons_commandes_offers')
        .select('*')
        .eq('bon_commande_id', bonId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBonOffers(data || []);
    } catch (err: any) {
      setMessage(`Error loading offers: ${err.message}`);
    }
  };

  const handleViewBon = async (bon: BonCommande) => {
    setViewBon(bon);
    await fetchBonProducts(bon.id);
    await fetchBonOffers(bon.id);
  };

  const handleEditBon = (bon: BonCommande) => {
    setEditingBon(bon);
    setEditingBonId(bon.id);
    setFormData({
      bon_id: bon.bon_id,
      supplier_name: bon.supplier_name,
      notes: bon.notes || ''
    });
    setProducts([{ product_name: '', quantity: 1, unity_price: 0, tva_rate: 19 }]);
    setShowCreateDialog(true);
  };

  const handleManageBon = async (bon: BonCommande) => {
    setManageBon(bon);
    setActiveTab('products');
    setNewOffers([{ supplier_name: '', notes: '' }]);
    setProducts([{ id: crypto.randomUUID(), product_name: '', quantity: 1, unity_price: 0, tva_rate: 19 }]);
    await fetchBonProducts(bon.id);
    await fetchBonOffers(bon.id);
  };

  const handleAddProductRow = () => {
    setProducts([...products, { id: crypto.randomUUID(), product_name: '', quantity: 1, unity_price: 0, tva_rate: 19 }]);
  };

  const handleRemoveProductRow = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, field: keyof BonProductForm, value: any) => {
    const updated = [...products];
    (updated[index] as any)[field] = value;
    setProducts(updated);
  };

  const handleAddOfferRow = () => {
    setNewOffers([...newOffers, { supplier_name: '', notes: '' }]);
  };

  const handleRemoveOfferRow = (index: number) => {
    setNewOffers(newOffers.filter((_, i) => i !== index));
  };

  const handleOfferChange = (index: number, field: keyof BonOffer, value: any) => {
    const updated = [...newOffers];
    (updated[index] as any)[field] = value;
    setNewOffers(updated);
  };

  const handleSaveProducts = async () => {
    if (!manageBon) return;
    
    try {
      // Filter out empty products
      const validProducts = products.filter(p => p.product_name.trim());
      
      if (validProducts.length === 0) {
        setMessage(t('bonCommandes.pleaseAddProduct'));
        return;
      }

      // Calculate totals for each product
      const productsToSave = validProducts.map(p => ({
        bon_commande_id: manageBon.id,
        product_name: p.product_name,
        barcode: p.barcode || '',
        quantity: Number(p.quantity),
        unity_price: Number(p.unity_price),
        tva_rate: Number(p.tva_rate),
        subtotal: Number(p.quantity) * Number(p.unity_price),
        tva_amount: (Number(p.quantity) * Number(p.unity_price)) * (Number(p.tva_rate) / 100),
        total_with_tva: (Number(p.quantity) * Number(p.unity_price)) * (1 + Number(p.tva_rate) / 100),
        is_active: true
      }));

      // Calculate totals for the bon de commande
      const totalWithoutTva = productsToSave.reduce((sum, p) => sum + (p.subtotal || 0), 0);
      const totalTva = productsToSave.reduce((sum, p) => sum + (p.tva_amount || 0), 0);
      const totalWithTva = productsToSave.reduce((sum, p) => sum + (p.total_with_tva || 0), 0);

      // Delete existing products first
      await supabase
        .from('bons_commandes_products')
        .delete()
        .eq('bon_commande_id', manageBon.id);

      // Insert new products
      const { error } = await supabase
        .from('bons_commandes_products')
        .insert(productsToSave);

      if (error) throw error;

      // Update bon de commande with totals
      await supabase
        .from('bons_commandes')
        .update({
          total_price: totalWithTva,
          total_without_tva: totalWithoutTva,
          total_with_tva: totalWithTva,
          updated_at: new Date().toISOString()
        })
        .eq('id', manageBon.id);

      // Auto-update bon status to validated when products added
      if (manageBon.status === 'pending') {
        await supabase
          .from('bons_commandes')
          .update({ status: 'validated' })
          .eq('id', manageBon.id);
      }

      setMessage(t('bonCommandes.productsSavedSuccessfully'));
      await fetchBonProducts(manageBon.id);
      await fetchData(); // Refresh to update status
      setProducts([{ product_name: '', quantity: 1, unity_price: 0, tva_rate: 19 }]);
    } catch (error: any) {
      console.error('Error saving products:', error);
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleImageUpload = async (file: File, offerIndex: number) => {
    if (!manageBon) return;

    try {
      setUploadingImage(offerIndex);
      
      // Validate file
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setMessage('File size exceeds 5MB limit');
        setUploadingImage(null);
        return;
      }

      if (!file.type.startsWith('image/')) {
        setMessage('Only image files are allowed');
        setUploadingImage(null);
        return;
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const sanitizedFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Upload the file directly - use File object
      const { data, error: uploadError } = await supabase.storage
        .from('offers')
        .upload(sanitizedFileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      if (!data?.path) {
        throw new Error('No path returned from upload');
      }

      // Get public URL with proper transformation
      const { data: urlData } = supabase.storage
        .from('offers')
        .getPublicUrl(data.path);

      if (!urlData?.publicUrl) {
        throw new Error('Could not generate public URL');
      }

      const updated = [...newOffers];
      updated[offerIndex].image_url = urlData.publicUrl;
      updated[offerIndex].image_path = data.path; // Store path in database too
      setNewOffers(updated);

      setMessage('✅ Image uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setUploadingImage(null);
    }
  };

  const handleSaveOffers = async () => {
    if (!manageBon) return;

    try {
      // Filter out empty offers
      const validOffers = newOffers.filter(o => o.supplier_name.trim());

      if (validOffers.length === 0) {
        setMessage(t('bonCommandes.pleaseAddOffer'));
        return;
      }

      const offersToSave = validOffers.map(o => ({
        bon_commande_id: manageBon.id,
        supplier_name: o.supplier_name,
        image_url: o.image_url || '',
        image_path: o.image_path || '',
        notes: o.notes || '',
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('bons_commandes_offers')
        .insert(offersToSave);

      if (error) throw error;

      setMessage('✅ ' + t('bonCommandes.offersSavedSuccessfully'));
      await fetchBonOffers(manageBon.id);
      setNewOffers([{ supplier_name: '', notes: '' }]);
    } catch (error: any) {
      console.error('Error saving offers:', error);
      setMessage(`❌ ${t('common.error')}: ${error.message}`);
    }
  };

  const handlePrintBon = (bon: BonCommande, lang: 'ar' | 'fr') => {
    const L = getPrintLabels(lang);
    const subtotal = bonProducts.reduce((sum, p) => sum + (p.subtotal || 0), 0);
    const totalTva = bonProducts.reduce((sum, p) => sum + (p.tva_amount || 0), 0);
    const totalWithTva = bonProducts.reduce((sum, p) => sum + (p.total_with_tva || 0), 0);
    const supplierName = bonOffers.length > 0 ? bonOffers[0].supplier_name : (bon.supplier_name || 'N/A');
    const body = `
      <div class="details-grid">
        <div class="detail-item"><h3>${L.isAr ? 'رقم الطلب' : 'Bon ID'}</h3><p>${bon.bon_id}</p></div>
        <div class="detail-item"><h3>${L.supplier}</h3><p>${supplierName}</p></div>
        <div class="detail-item"><h3>${L.date}</h3><p>${formatDateLocale(bon.created_at, lang)}</p></div>
        <div class="detail-item"><h3>${L.status}</h3><p>${bon.status.toUpperCase()}</p></div>
        <div class="detail-item"><h3>${L.isAr ? 'المبلغ بدون TVA' : 'Sous-Total'}</h3><p>${subtotal.toLocaleString()} DA</p></div>
        <div class="detail-item"><h3>${L.isAr ? 'المبلغ بـ TVA' : 'Total TTC'}</h3><p>${totalWithTva.toLocaleString()} DA</p></div>
      </div>
      <h2 class="section-title">${L.isAr ? 'قائمة المنتجات' : 'Liste des Produits'}</h2>
      <table><thead><tr><th>#</th><th>${L.productName}</th><th>${L.quantity}</th><th>${L.unitPrice}</th><th>${L.isAr ? 'الإجمالي بدون TVA' : 'Total HT'}</th><th>TVA %</th><th>${L.isAr ? 'الإجمالي مع TVA' : 'Total TTC'}</th></tr></thead><tbody>
      ${bonProducts.map((p, idx) => {
        const totalHT = p.quantity * p.unity_price;
        const totalTTC = totalHT * (1 + p.tva_rate / 100);
        return `<tr><td style="text-align:center;">${idx+1}</td><td class="product-name">${p.product_name}</td><td style="text-align:center;">${p.quantity}</td><td>${p.unity_price.toLocaleString()} DA</td><td class="amount">${totalHT.toLocaleString()} DA</td><td style="text-align:center;">${p.tva_rate}%</td><td class="amount">${totalTTC.toLocaleString()} DA</td></tr>`;
      }).join('')}
      <tr class="total-row"><td colspan="6"></td><td class="amount">${totalWithTva.toLocaleString()} DA</td></tr>
      </tbody></table>
      ${bon.notes ? `<div style="padding:15px;background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b;margin-top:15px;"><strong>${L.notes}:</strong><br>${bon.notes}</div>` : ''}`;
    openPrintWindow(buildPrintHTML({ lang, docTitle: { ar: 'وثيقة بون دي كوموند', fr: 'Bon de Commande' }, enterpriseSettings }, body));
  };

  const handleSaveBon = async () => {
    if (!formData.bon_id || !formData.supplier_name) {
      setMessage('Please fill in all required fields');
      return;
    }

    const validProducts = products.filter(p => p.product_name && p.quantity > 0);
    if (validProducts.length === 0) {
      setMessage('Please add at least one product');
      return;
    }

    try {
      const subtotal = validProducts.reduce((sum, p) => sum + (p.quantity * p.unity_price), 0);
      const totalTva = validProducts.reduce((sum, p) => sum + (p.quantity * p.unity_price * (p.tva_rate / 100)), 0);
      const totalWithTva = subtotal + totalTva;

      if (editingBonId) {
        // Update existing bon
        const { error } = await supabase
          .from('bons_commandes')
          .update({
            bon_id: formData.bon_id,
            supplier_name: formData.supplier_name,
            notes: formData.notes,
            total_price: subtotal,
            total_without_tva: subtotal,
            total_with_tva: totalWithTva,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBonId);

        if (error) throw error;

        // Delete old products
        await supabase
          .from('bons_commandes_products')
          .delete()
          .eq('bon_commande_id', editingBonId);

        // Add new products
        const productsToInsert = validProducts.map(p => ({
          bon_commande_id: editingBonId,
          product_name: p.product_name,
          product_barcode: p.barcode,
          quantity: p.quantity,
          unity_price: p.unity_price,
          is_active: true,
          tva_rate: p.tva_rate,
          subtotal: p.quantity * p.unity_price,
          tva_amount: p.quantity * p.unity_price * (p.tva_rate / 100),
          total_with_tva: p.quantity * p.unity_price * (1 + p.tva_rate / 100)
        }));

        const { error: insertError } = await supabase
          .from('bons_commandes_products')
          .insert(productsToInsert);

        if (insertError) throw insertError;
      } else {
        // Create new bon
        const { data: newBon, error } = await supabase
          .from('bons_commandes')
          .insert([{
            bon_id: formData.bon_id,
            supplier_name: formData.supplier_name,
            notes: formData.notes,
            status: 'pending',
            total_price: subtotal,
            total_without_tva: subtotal,
            total_with_tva: totalWithTva,
            created_by_id: user?.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select();

        if (error) throw error;
        if (!newBon || newBon.length === 0) throw new Error('Failed to create bon');

        const bonId = newBon[0].id;

        // Add products
        const productsToInsert = validProducts.map(p => ({
          bon_commande_id: bonId,
          product_name: p.product_name,
          product_barcode: p.barcode,
          quantity: p.quantity,
          unity_price: p.unity_price,
          is_active: true,
          tva_rate: p.tva_rate,
          subtotal: p.quantity * p.unity_price,
          tva_amount: p.quantity * p.unity_price * (p.tva_rate / 100),
          total_with_tva: p.quantity * p.unity_price * (1 + p.tva_rate / 100)
        }));

        const { error: insertError } = await supabase
          .from('bons_commandes_products')
          .insert(productsToInsert);

        if (insertError) throw insertError;
      }

      setMessage(editingBonId ? 'Bon de commande updated successfully!' : 'Bon de commande created successfully!');
      setShowCreateDialog(false);
      setEditingBonId(null);
      setEditingBon(null);
      setFormData({ bon_id: '', supplier_name: '', notes: '' });
      setProducts([{ product_name: '', quantity: 1, unity_price: 0, tva_rate: 19 }]);
      await fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleDeleteBon = async () => {
    if (!deleteId) return;

    try {
      await supabase.from('bons_commandes_products').delete().eq('bon_commande_id', deleteId);
      await supabase.from('bons_commandes').delete().eq('id', deleteId);

      setMessage('Bon de commande deleted successfully!');
      setDeleteId(null);
      setViewBon(null);
      await fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleValidateBon = async (bon: BonCommande) => {
    const role = user?.role as string;
    const columnMap: Record<string, string> = {
      chef_projet: 'purchase_validated',
      admin: 'admin_validated',
      comptable: 'comptable_validated',
    };
    const col = columnMap[role];
    if (!col) return;

    try {
      setValidatingBonId(bon.id);
      await supabase
        .from('bons_commandes')
        .update({ [col]: true, updated_at: new Date().toISOString() })
        .eq('id', bon.id);

      // Refresh the bon to check if all three flags are now true
      const { data: updated } = await supabase
        .from('bons_commandes')
        .select('purchase_validated, admin_validated, comptable_validated')
        .eq('id', bon.id)
        .single();

      if (updated?.purchase_validated && updated?.admin_validated && updated?.comptable_validated) {
        await supabase
          .from('bons_commandes')
          .update({ status: 'validated', updated_at: new Date().toISOString() })
          .eq('id', bon.id);
      }

      setMessage('✅ Validation enregistrée avec succès!');
      await fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`❌ Erreur: ${err.message}`);
    } finally {
      setValidatingBonId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'validated': return 'bg-blue-100 text-blue-700';
      case 'paid': return 'bg-emerald-100 text-emerald-700';
      case 'finalized': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const stats = {
    total: bonsCommandes.length,
    pending: bonsCommandes.filter(b => b.status === 'pending').length,
    validated: bonsCommandes.filter(b => b.status === 'validated').length,
    totalValue: bonsCommandes.reduce((sum, b) => sum + (b.total_with_tva || 0), 0)
  };

  const filteredBons = bonsCommandes.filter(bon => 
    bon.bon_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (bon.supplier_name && bon.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (bon.project_name && bon.project_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    bon.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-1">
          {t('nav.bons_commandes') || 'Bons de Commande'}
        </h1>
        <p className="text-muted-foreground text-sm">{new Date().toLocaleDateString()}</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={Package} label={t('common.total_bons')} value={stats.total} gradient="btn-gradient" delay={0.1} />
        <StatCard icon={AlertCircle} label={t('common.pending')} value={stats.pending} gradient="btn-gradient-warm" delay={0.15} />
        <StatCard icon={BarChart3} label={t('common.validated')} value={stats.validated} gradient="btn-gradient-success" delay={0.2} />
        <StatCard icon={Package} label={t('common.total_value')} value={`${stats.totalValue.toLocaleString()} ${t('common.payment_amount_currency')}`} gradient="btn-gradient" delay={0.25} />
      </div>

      <div className="relative mb-6">
        <Input
          placeholder={t('bons.search_placeholder') || 'Rechercher par ID, Projet ou Fournisseur...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11"
        />
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-3 hover:text-foreground"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-blue-50 dark:bg-slate-700 border-l-4 border-blue-600 dark:border-blue-400 rounded"
        >
          <p className="text-blue-700 dark:text-blue-200">{message}</p>
        </motion.div>
      )}

      {/* Bons Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredBons.length === 0 ? (
        <div className="text-center p-12 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No bons de commande found</p>
          {searchQuery && <p className="text-sm mt-2">{t('common.no_results_found')}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filteredBons.map((bon, idx) => (
              <motion.div
                key={bon.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.05 }}
                className="erp-card hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
              >
                {/* Card Header with gradient - Improved styling */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-800 -mx-6 -mt-6 px-6 py-5 mb-5 rounded-t-lg border-b-2 border-blue-700 dark:border-indigo-700">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-white truncate">{bon.bon_id}</h3>
                      <p className="text-sm text-blue-100 mt-1 truncate">ID: {bon.id.substring(0, 8)}</p>
                      {bon.project_name && bon.project_name !== 'N/A' && (
                        <p className="text-xs text-blue-200 mt-1 font-semibold truncate">🏗️ {bon.project_name}</p>
                      )}
                    </div>
                    <Badge className={getStatusColor(bon.status)} style={{ minWidth: 'fit-content' }}>
                      {bon.status}
                    </Badge>
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 space-y-4">
                  {/* Supplier Section */}
                  <div className="px-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('bonCommandes.supplier')}</p>
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                      <p className="text-sm font-semibold text-foreground">
                        {bon.supplier_name && bon.supplier_name !== 'To be assigned' 
                          ? bon.supplier_name 
                          : <span className="text-amber-600 dark:text-amber-400">⚠️ {t('bonCommandes.notAssigned')}</span>
                        }
                      </p>
                    </div>
                  </div>

                  {/* Total Section */}
                  <div className="px-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('bonCommandes.totalAmount')}</p>
                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-700 dark:to-slate-700 rounded-lg border border-green-200 dark:border-slate-600">
                      <p className="text-sm text-muted-foreground mb-1">{t('bonCommandes.withTVA')}</p>
                      <p className={`text-2xl font-bold ${bon.total_with_tva > 0 ? 'text-green-700 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {bon.total_with_tva > 0 ? bon.total_with_tva.toLocaleString() : t('bonCommandes.pending')} 
                        {bon.total_with_tva > 0 && ' DA'}
                      </p>
                      {bon.total_without_tva > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('bonCommandes.subtotal')}: {bon.total_without_tva.toLocaleString()} DA
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Date Section */}
                  <div className="px-6 text-xs text-muted-foreground">
                    <p>📅 {t('bonCommandes.created')}: {new Date(bon.created_at).toLocaleDateString()}</p>
                  </div>

                  {/* Products Indicator */}
                  <div className="px-6">
                    <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-slate-700 rounded border border-purple-200 dark:border-slate-600">
                      <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                        {productCounts[bon.id] || 0} {t(`bonCommandes.product${productCounts[bon.id] !== 1 ? 's' : ''}`)} {t('bonCommandes.added')}
                      </span>
                    </div>
                  </div>

                  {/* Validation Badges */}
                  <div className="px-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Validations</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${bon.purchase_validated ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                        {bon.purchase_validated ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        Détecteur
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${bon.admin_validated ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                        {bon.admin_validated ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        Admin
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${bon.comptable_validated ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                        {bon.comptable_validated ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        Comptable
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Improved layout */}
                <div className="px-6 pb-4 pt-2 mt-auto space-y-2">
                  {/* Valider button — shown conditionally per role */}
                  {(() => {
                    const role = user?.role as string;
                    const validatedFlagMap: Record<string, boolean | undefined> = {
                      chef_projet: bon.purchase_validated,
                      admin: bon.admin_validated,
                      comptable: bon.comptable_validated,
                    };
                    const canValidate = ['chef_projet', 'admin', 'comptable'].includes(role)
                      && !validatedFlagMap[role]
                      && !['validated', 'paid', 'finalized'].includes(bon.status);
                    return canValidate ? (
                      <Button
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-semibold"
                        onClick={() => handleValidateBon(bon)}
                        disabled={validatingBonId === bon.id}
                      >
                        {validatingBonId === bon.id
                          ? <Loader className="w-4 h-4 mr-2 animate-spin" />
                          : <CheckCircle className="w-4 h-4 mr-2" />}
                        Valider
                      </Button>
                    ) : null;
                  })()}
                  <Button
                    size="sm"
                    className="w-full btn-gradient text-xs font-semibold"
                    onClick={() => handleManageBon(bon)}
                    title={t('bonCommandes.manageProductsAndOffers')}
                  >
                    <Settings className="w-4 h-4 mr-2" /> {t('bonCommandes.manage')}
                  </Button>
                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewBon(bon)}
                      className="text-xs"
                      title={t('common.view')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditBon(bon)}
                      className="text-xs"
                      title={t('common.edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        setViewBon(bon);
                        fetchBonProducts(bon.id).then(() => fetchBonOffers(bon.id)).then(() => setPendingPrintBon(bon));
                      }}
                      title={t('common.print')}
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteId(bon.id)}
                      className="text-xs"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBonId ? 'Edit Bon de Commande' : 'Create Bon de Commande'}
            </DialogTitle>
            <DialogDescription>
              {editingBonId ? 'Update the bon de commande details' : 'Create a new bon de commande with products'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Bon ID</label>
                <Input
                  value={formData.bon_id}
                  onChange={(e) => setFormData({ ...formData, bon_id: e.target.value })}
                  placeholder="BON-001"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Supplier Name</label>
                <Input
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  placeholder="Supplier name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Notes</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
              />
            </div>

            {/* Products Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-blue-50 dark:bg-slate-800 px-4 py-3 border-b">
                <h3 className="font-semibold text-foreground">Products</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 dark:bg-slate-900">
                      <th className="px-4 py-2 text-left font-semibold">Product Name</th>
                      <th className="px-4 py-2 text-left font-semibold">Barcode</th>
                      <th className="px-4 py-2 text-left font-semibold">Quantity</th>
                      <th className="px-4 py-2 text-left font-semibold">Unit Price</th>
                      <th className="px-4 py-2 text-left font-semibold">Total HT</th>
                      <th className="px-4 py-2 text-left font-semibold">TVA %</th>
                      <th className="px-4 py-2 text-left font-semibold">Total TTC</th>
                      <th className="px-4 py-2 text-left font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, idx) => {
                      const subtotal = (product.quantity || 0) * (product.unity_price || 0);
                      const total = subtotal * (1 + (product.tva_rate || 0) / 100);

                      return (
                        <tr key={idx} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="px-4 py-2">
                            <Input
                              value={product.product_name}
                              onChange={(e) => {
                                const newProducts = [...products];
                                newProducts[idx].product_name = e.target.value;
                                setProducts(newProducts);
                              }}
                              placeholder="Product name"
                              className="text-xs"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              value={product.barcode || ''}
                              onChange={(e) => {
                                const newProducts = [...products];
                                newProducts[idx].barcode = e.target.value;
                                setProducts(newProducts);
                              }}
                              placeholder="Barcode"
                              className="text-xs"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              value={product.quantity}
                              onChange={(e) => {
                                const newProducts = [...products];
                                newProducts[idx].quantity = parseFloat(e.target.value) || 0;
                                setProducts(newProducts);
                              }}
                              min="0"
                              className="text-xs"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              value={product.unity_price}
                              onChange={(e) => {
                                const newProducts = [...products];
                                newProducts[idx].unity_price = parseFloat(e.target.value) || 0;
                                setProducts(newProducts);
                              }}
                              min="0"
                              className="text-xs"
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {subtotal.toLocaleString()} DA
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              value={product.tva_rate}
                              onChange={(e) => {
                                const newProducts = [...products];
                                newProducts[idx].tva_rate = parseFloat(e.target.value) || 0;
                                setProducts(newProducts);
                              }}
                              min="0"
                              className="text-xs"
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {total.toLocaleString()} DA
                          </td>
                          <td className="px-4 py-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setProducts(products.filter((_, i) => i !== idx))}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setProducts([...products, { product_name: '', quantity: 1, unity_price: 0, tva_rate: 19 }])}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Product
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button className="btn-gradient" onClick={handleSaveBon}>
              <Save className="w-4 h-4 mr-2" /> {editingBonId ? 'Update' : 'Create'} Bon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewBon && !showCreateDialog} onOpenChange={(open) => !open && setViewBon(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Bon de Commande: {viewBon?.bon_id}
            </DialogTitle>
            <DialogDescription>
              {viewBon?.supplier_name} - {new Date(viewBon?.created_at || '').toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          {viewBon && (
            <div className="space-y-4">
              {/* Info Grid */}
              <div className="grid grid-cols-3 gap-4 p-3 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                <div>
                  <span className="text-xs text-muted-foreground block">Status</span>
                  <Badge className={getStatusColor(viewBon.status)}>{viewBon.status}</Badge>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Subtotal</span>
                  <span className="font-bold text-foreground">{viewBon.total_without_tva.toLocaleString()} DA</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Total with TVA</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300">{viewBon.total_with_tva.toLocaleString()} DA</span>
                </div>
              </div>

              {/* Products Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-blue-50 dark:bg-slate-800 px-4 py-3 border-b">
                  <h3 className="font-semibold text-foreground">Products ({bonProducts.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 dark:bg-slate-900">
                        <th className="px-4 py-2 text-left font-semibold">Product</th>
                        <th className="px-4 py-2 text-left font-semibold">Barcode</th>
                        <th className="px-4 py-2 text-center font-semibold">Qty</th>
                        <th className="px-4 py-2 text-right font-semibold">Unit Price</th>
                        <th className="px-4 py-2 text-right font-semibold">Total HT</th>
                        <th className="px-4 py-2 text-right font-semibold">TVA</th>
                        <th className="px-4 py-2 text-right font-semibold">Total TTC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bonProducts.map((product, idx) => (
                        <tr key={idx} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="px-4 py-2 font-semibold">{product.product_name}</td>
                          <td className="px-4 py-2 text-sm">{product.product_barcode || product.barcode || '-'}</td>
                          <td className="px-4 py-2 text-center">{product.quantity}</td>
                          <td className="px-4 py-2 text-right">{product.unity_price.toLocaleString()} DA</td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {(product.quantity * product.unity_price).toLocaleString()} DA
                          </td>
                          <td className="px-4 py-2 text-right">{product.tva_rate}%</td>
                          <td className="px-4 py-2 text-right font-semibold text-blue-700 dark:text-blue-300">
                            {(product.total_with_tva || 0).toLocaleString()} DA
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Offers Section */}
              {bonOffers.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-purple-50 dark:bg-slate-800 px-4 py-3 border-b">
                    <h3 className="font-semibold text-foreground">Offers ({bonOffers.length})</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    {bonOffers.map((offer, idx) => (
                      <div key={idx} className="p-4 border border-purple-200 dark:border-slate-600 rounded-lg bg-purple-50 dark:bg-slate-700">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground font-semibold mb-1">Supplier</p>
                            <p className="text-sm font-semibold text-foreground">{offer.supplier_name}</p>
                            {offer.notes && (
                              <div className="mt-3">
                                <p className="text-xs text-muted-foreground font-semibold mb-1">Notes</p>
                                <p className="text-sm text-foreground">{offer.notes}</p>
                              </div>
                            )}
                          </div>
                          {(offer.image_url || offer.image_path) && (
                            <div className="flex justify-center items-center">
                              <div className="w-full h-40 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden border border-gray-300 dark:border-slate-600">
                                <img 
                                  src={offer.image_url || offer.image_path} 
                                  alt={offer.supplier_name}
                                  className="max-w-full max-h-full object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewBon.notes && (
                <div className="p-3 bg-amber-50 dark:bg-slate-700 border border-amber-200 dark:border-slate-600 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">Notes</h4>
                  <p className="text-sm text-foreground">{viewBon.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => viewBon && handleEditBon(viewBon)}
            >
              <Edit className="w-4 h-4 mr-2" /> Edit
            </Button>
            <Button
              className="btn-gradient"
              onClick={() => viewBon && setPendingPrintBon(viewBon)}
            >
              <Printer className="w-4 h-4 mr-2" /> {t('common.print')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setViewBon(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bon de Commande</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bon de commande? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBon}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Products & Offers Dialog */}
      <Dialog open={!!manageBon} onOpenChange={(open) => !open && setManageBon(null)}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-lg -mx-6 -mt-6 mb-4">
            <DialogTitle className="text-white text-lg">
              📋 {t('common.manage')} {t('bonCommandes.bonsCommandes')}: <span className="font-bold">{manageBon?.bon_id}</span>
            </DialogTitle>
            <DialogDescription className="text-blue-100">
              {t('bonCommandes.manageProductsOffers')}
            </DialogDescription>
          </DialogHeader>

          {manageBon && (
            <div className="space-y-6">
              {/* Tabs with Material Design */}
              <div className="flex gap-1 border-b-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`flex-1 py-3 px-4 rounded-md font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === 'products'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  {t('common.products')}
                </button>
                <button
                  onClick={() => setActiveTab('offers')}
                  className={`flex-1 py-3 px-4 rounded-md font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === 'offers'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <ImagePlus className="w-4 h-4" />
                  {t('common.offers')}
                </button>
              </div>

              {/* Products Tab */}
              {activeTab === 'products' && (
                <div className="space-y-5">
                  {/* Existing Products Section */}
                  {bonProducts.length > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                      <h3 className="font-bold text-lg text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5" /> {t('common.existing')} {t('common.products')} ({bonProducts.length})
                      </h3>
                      <div className="border rounded-lg overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                              <th className="px-4 py-3 text-left font-semibold">{t('common.product_name')}</th>
                              <th className="px-4 py-3 text-left font-semibold">{t('common.barcode')}</th>
                              <th className="px-4 py-3 text-center font-semibold">{t('common.quantity')}</th>
                              <th className="px-4 py-3 text-right font-semibold">{t('common.unit_price')}</th>
                              <th className="px-4 py-3 text-center font-semibold">{t('common.tva')}</th>
                              <th className="px-4 py-3 text-right font-semibold">{t('common.total_price')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bonProducts.map((p, idx) => (
                              <tr key={idx} className="border-b hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{p.product_name}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.barcode || '-'}</td>
                                <td className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-slate-100">{p.quantity}</td>
                                <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">{(p.unity_price || 0).toLocaleString()} DA</td>
                                <td className="px-4 py-3 text-center font-semibold text-blue-700 dark:text-blue-300">{p.tva_rate}%</td>
                                <td className="px-4 py-3 text-right font-bold text-indigo-700 dark:text-indigo-300">{(p.total_with_tva || 0).toLocaleString()} DA</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Totals Summary */}
                  {bonProducts.length > 0 || products.some(p => p.product_name) ? (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-300 dark:border-emerald-600 rounded-xl p-5">
                      <h3 className="font-bold text-lg text-emerald-900 dark:text-emerald-100 mb-4">📊 {t('common.summary')} {t('common.totals')}</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {/* Calculate combined totals from existing and new products */}
                        {(() => {
                          const allProductsForCalc = [
                            ...bonProducts.map(p => ({
                              quantity: p.quantity,
                              unity_price: p.unity_price,
                              tva_rate: p.tva_rate,
                              subtotal: p.subtotal || (p.quantity * p.unity_price),
                              tva_amount: p.tva_amount || (p.quantity * p.unity_price * (p.tva_rate / 100)),
                              total_with_tva: p.total_with_tva || (p.quantity * p.unity_price * (1 + p.tva_rate / 100))
                            })),
                            ...products.filter(p => p.product_name).map(p => ({
                              quantity: Number(p.quantity) || 0,
                              unity_price: Number(p.unity_price) || 0,
                              tva_rate: Number(p.tva_rate) || 0,
                              subtotal: Number(p.quantity) * Number(p.unity_price),
                              tva_amount: (Number(p.quantity) * Number(p.unity_price)) * (Number(p.tva_rate) / 100),
                              total_with_tva: (Number(p.quantity) * Number(p.unity_price)) * (1 + Number(p.tva_rate) / 100)
                            }))
                          ];
                          
                          const totalSubtotal = allProductsForCalc.reduce((sum, p) => sum + (p.subtotal || 0), 0);
                          const totalTva = allProductsForCalc.reduce((sum, p) => sum + (p.tva_amount || 0), 0);
                          const totalWithTva = allProductsForCalc.reduce((sum, p) => sum + (p.total_with_tva || 0), 0);
                          
                          return (
                            <>
                              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
                                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold mb-1">Subtotal (HT)</p>
                                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{totalSubtotal.toLocaleString()} DA</p>
                              </div>
                              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-amber-200 dark:border-amber-700">
                                <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold mb-1">TVA (19%)</p>
                                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{totalTva.toLocaleString()} DA</p>
                              </div>
                              <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg p-4 border border-emerald-600 dark:border-emerald-400">
                                <p className="text-xs text-white font-semibold mb-1">Total (TTC)</p>
                                <p className="text-2xl font-bold text-white">{totalWithTva.toLocaleString()} DA</p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ) : null}

                  {/* Add New Products Section */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-5">
                    <h3 className="font-bold text-lg text-indigo-900 dark:text-indigo-100 mb-4 flex items-center gap-2">
                      <Plus className="w-5 h-5" /> {t('common.add')} {t('common.new')} {t('common.products')}
                    </h3>
                    <div className="space-y-4">
                      {products.map((product, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-600 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
                            <div className="md:col-span-2">
                              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">Product Name *</label>
                              <Input
                                value={product.product_name}
                                onChange={(e) => handleProductChange(idx, 'product_name', e.target.value)}
                                placeholder="Enter product name"
                                className="text-sm border-indigo-300 dark:border-indigo-600 focus:border-indigo-500 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">Barcode</label>
                              <Input
                                value={product.barcode || ''}
                                onChange={(e) => handleProductChange(idx, 'barcode', e.target.value)}
                                placeholder="Barcode"
                                className="text-sm border-indigo-300 dark:border-indigo-600 focus:border-indigo-500 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">Qty</label>
                              <Input
                                type="number"
                                value={product.quantity}
                                onChange={(e) => handleProductChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="text-sm border-indigo-300 dark:border-indigo-600 focus:border-indigo-500 focus:ring-indigo-500"
                                min="1"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">Unit Price (DA)</label>
                              <Input
                                type="number"
                                value={product.unity_price}
                                onChange={(e) => handleProductChange(idx, 'unity_price', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="text-sm border-indigo-300 dark:border-indigo-600 focus:border-indigo-500 focus:ring-indigo-500"
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">TVA %</label>
                              <Select value={product.tva_rate.toString()} onValueChange={(v) => handleProductChange(idx, 'tva_rate', parseInt(v))}>
                                <SelectTrigger className="text-sm border-indigo-300 dark:border-indigo-600 focus:border-indigo-500">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">0%</SelectItem>
                                  <SelectItem value="9">9%</SelectItem>
                                  <SelectItem value="19">19%</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg px-4 py-3 font-bold text-sm">
                              💰 Total: {((product.quantity * product.unity_price) * (1 + product.tva_rate / 100)).toLocaleString('en-US', { maximumFractionDigits: 2 })} DA
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveProductRow(idx)}
                              className="gap-1"
                            >
                              <Trash2 className="w-4 h-4" /> Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 mt-5">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleAddProductRow}
                        className="flex-1 border-indigo-300 text-indigo-700 dark:border-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-semibold"
                      >
                        <Plus className="w-4 h-4 mr-2" /> {t('common.add_another')} {t('common.product')}
                      </Button>
                      <Button
                        size="lg"
                        onClick={handleSaveProducts}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        <Save className="w-4 h-4 mr-2" /> {t('common.save')} {t('common.all')} {t('common.products')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Offers Tab */}
              {activeTab === 'offers' && (
                <div className="space-y-5">
                  {/* Existing Offers Section */}
                  {bonOffers.length > 0 && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                      <h3 className="font-bold text-lg text-amber-900 dark:text-amber-100 mb-4 flex items-center gap-2">
                        <ImagePlus className="w-5 h-5" /> {t('common.existing')} {t('common.supplier')} {t('common.offers')} ({bonOffers.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {bonOffers.map((offer, idx) => (
                          <div key={idx} className="border border-amber-200 dark:border-amber-700 rounded-lg p-4 bg-white dark:bg-slate-800 hover:shadow-lg transition-shadow">
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1">
                                <p className="font-bold text-amber-900 dark:text-amber-100">{offer.supplier_name}</p>
                                {offer.notes && <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 italic">📝 {offer.notes}</p>}
                              </div>
                              {offer.image_url && (
                                <img
                                  src={offer.image_url}
                                  alt="Offer"
                                  className="w-20 h-20 object-cover rounded-lg shadow-md"
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add New Offers Section */}
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-700 rounded-xl p-5">
                    <h3 className="font-bold text-lg text-orange-900 dark:text-orange-100 mb-4 flex items-center gap-2">
                      <Plus className="w-5 h-5" /> {t('common.add')} {t('common.new')} {t('common.offers')}
                    </h3>
                    <div className="space-y-4">
                      {newOffers.map((offer, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-600 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">Supplier *</label>
                              <Select value={offer.supplier_name} onValueChange={(v) => handleOfferChange(idx, 'supplier_name', v)}>
                                <SelectTrigger className="text-sm border-orange-300 dark:border-orange-600 focus:border-orange-500">
                                  <SelectValue placeholder="Select supplier..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {suppliers.length === 0 ? (
                                    <SelectItem value="">No suppliers available</SelectItem>
                                  ) : (
                                    suppliers.map(s => (
                                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="mb-4">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">Notes & Comments</label>
                            <Textarea
                              value={offer.notes || ''}
                              onChange={(e) => handleOfferChange(idx, 'notes', e.target.value)}
                              placeholder="Add any additional notes about this offer..."
                              className="text-sm border-orange-300 dark:border-orange-600 focus:border-orange-500 focus:ring-orange-500 h-24 resize-none"
                            />
                          </div>

                          <div className="mb-4">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-3">Upload Offer Image</label>
                            <div className="flex gap-3 items-center">
                              <label className="flex-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-orange-300 dark:border-orange-600 rounded-lg p-4 cursor-pointer hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all">
                                <ImagePlus className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                <div className="text-center">
                                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                                    {uploadingImage === idx ? '⏳ Uploading...' : '📸 Click or drag image'}
                                  </p>
                                  <p className="text-xs text-slate-500">PNG, JPG up to 5MB</p>
                                </div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handleImageUpload(e.target.files[0], idx);
                                    }
                                  }}
                                  className="hidden"
                                  disabled={uploadingImage === idx}
                                />
                              </label>
                              {offer.image_url && (
                                <div className="relative">
                                  <img
                                    src={offer.image_url}
                                    alt="Preview"
                                    className="w-24 h-24 object-cover rounded-lg shadow-lg border-2 border-green-500"
                                  />
                                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✓</div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveOfferRow(idx)}
                              className="gap-1"
                            >
                              <Trash2 className="w-4 h-4" /> Remove Offer
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 mt-5">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleAddOfferRow}
                        className="flex-1 border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 font-semibold"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Another Offer
                      </Button>
                      <Button
                        size="lg"
                        onClick={handleSaveOffers}
                        className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        <Save className="w-4 h-4 mr-2" /> Save All Offers
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Message Display */}
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-sm p-4 rounded-lg font-medium flex items-center gap-2 ${
                    message.includes('Error') || message.includes('error')
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                      : 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                  }`}
                >
                  {message.includes('Error') || message.includes('error') ? (
                    <><AlertCircle className="w-4 h-4" /> {message}</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> {message}</>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Language Chooser Dialog */}
      <Dialog open={!!pendingPrintBon} onOpenChange={() => setPendingPrintBon(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-xl font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" /> {t('common.choose_print_language')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 px-2 pb-2">
            <Button onClick={() => { if (pendingPrintBon) handlePrintBon(pendingPrintBon, 'ar'); setPendingPrintBon(null); }} className="h-24 flex flex-col gap-2 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-lg rounded-xl shadow-lg">
              <span className="text-2xl">🇩🇿</span> {t('common.print_in_arabic')}
            </Button>
            <Button onClick={() => { if (pendingPrintBon) handlePrintBon(pendingPrintBon, 'fr'); setPendingPrintBon(null); }} className="h-24 flex flex-col gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-xl shadow-lg">
              <span className="text-2xl">🇫🇷</span> {t('common.print_in_french')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
