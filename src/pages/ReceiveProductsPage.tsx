import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { motion } from 'framer-motion';
import {
  Eye, Plus, Trash2, X, Save, Loader, FileText, Package, PackageCheck,
  BarChart3, Edit, CheckCircle2, Printer
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getPrintLabels, buildPrintHTML, openPrintWindow, formatDateLocale } from '@/lib/printUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ReceptionProduct {
  id: string;
  reception_id: string;
  supplier_id: string | null;
  supplier_name: string;
  storage_id?: string | null;
  reception_date: string;
  status: 'pending' | 'received' | 'completed';
  total_quantity: number;
  total_price: number;
  notes?: string;
  invoice_image_url?: string;
  created_at: string;
}

interface ReceptionItem {
  id: string;
  reception_id: string;
  product_name: string;
  category_id: string | null;
  unity_id: string | null;
  quantity: number;
  price_per_unity: number;
  total_price: number;
  notes?: string;
  categories?: Array<{ name: string }> | null;
  unities?: Array<{ name: string }> | null;
}

interface Supplier {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface Unity {
  id: string;
  name: string;
}

interface Storage {
  id: string;
  name: string;
  address?: string;
}

interface ProductForm {
  product_name: string;
  category_id: string;
  unity_id: string;
  quantity: number;
  price_per_unity: number;
}

const StatCard = ({ icon: Icon, label, value, gradient, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="erp-stat-card"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${gradient}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </motion.div>
);

export default function ReceiveProductsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { enterpriseSettings } = useData();
  const printRef = useRef<HTMLDivElement>(null);
  const isRtl = i18n.language === 'ar';

  // State management
  const [receptions, setReceptions] = useState<ReceptionProduct[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [unities, setUnities] = useState<Unity[]>([]);
  const [storages, setStorages] = useState<Storage[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewReception, setViewReception] = useState<ReceptionProduct | null>(null);
  const [editingReceptionId, setEditingReceptionId] = useState<string | null>(null);

  // Form states
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');
  const [receptionNotes, setReceptionNotes] = useState('');
  const [products, setProducts] = useState<ProductForm[]>([
    { product_name: '', category_id: '', unity_id: '', quantity: 1, price_per_unity: 0 }
  ]);
  const [receptionItems, setReceptionItems] = useState<ReceptionItem[]>([]);

  // Delete state
  const [deletingReceptionId, setDeletingReceptionId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [pendingPrintReception, setPendingPrintReception] = useState<ReceptionProduct | null>(null);
  const [invoiceImage, setInvoiceImage] = useState<File | null>(null);
  const [invoiceImageUrl, setInvoiceImageUrl] = useState<string>('');

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [receptionsData, suppliersData, categoriesData, unitiesData, storagesData] = await Promise.all([
        supabase.from('reception_products').select('*').order('created_at', { ascending: false }),
        supabase.from('suppliers').select('id, name'),
        supabase.from('categories').select('id, name'),
        supabase.from('unities').select('id, name'),
        supabase.from('storages').select('id, name, address').eq('is_active', true).order('name')
      ]);

      setReceptions(receptionsData.data || []);
      setSuppliers(suppliersData.data || []);
      setCategories(categoriesData.data || []);
      setUnities(unitiesData.data || []);
      setStorages(storagesData.data || []);
    } catch (err: any) {
      setMessage(`Error loading data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchReceptionItems = async (receptionId: string) => {
    try {
      const { data, error } = await supabase
        .from('reception_product_items')
        .select('id, reception_id, product_name, category_id, unity_id, quantity, price_per_unity, total_price, notes, categories (name), unities (name)')
        .eq('reception_id', receptionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceptionItems(data || []);
    } catch (err: any) {
      setMessage(`Error loading items: ${err.message}`);
    }
  };

  const handleValidation = async (receptionId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('reception_products')
        .update({ status: 'received' })
        .eq('id', receptionId);
      
      if (updateError) throw updateError;

      const { error: valError } = await supabase
        .from('command_validations')
        .insert({
          reception_products_id: receptionId,
          validated_by: user?.id,
          status: 'validated'
        });

      if (valError) throw valError;

      setMessage('Reception validated successfully!');
      setValidatingId(null);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const generateReceptionId = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `REC-${dateStr}-${seq}`;
  };

  const updateProduct = (idx: number, field: keyof ProductForm, value: any) => {
    const updated = [...products];
    (updated[idx] as any)[field] = value;
    setProducts(updated);
  };

  const addProductRow = () => {
    setProducts([...products, { product_name: '', category_id: '', unity_id: '', quantity: 1, price_per_unity: 0 }]);
  };

  const removeProductRow = (idx: number) => {
    setProducts(products.filter((_, i) => i !== idx));
  };

  const handleSaveReception = async () => {
    try {
      const validProducts = products.filter(p => p.product_name && p.quantity > 0 && p.price_per_unity > 0);
      if (validProducts.length === 0) {
        setMessage('Please add at least one product with valid quantity and price');
        return;
      }

      if (!selectedSupplier) {
        setMessage('Please select a supplier');
        return;
      }

      const supplier = suppliers.find(s => s.id === selectedSupplier);
      let uploadedImageUrl = invoiceImageUrl;

      // Upload invoice image if provided
      if (invoiceImage) {
        try {
          const timestamp = new Date().getTime();
          const fileName = `invoices/${user?.id}/${timestamp}_${invoiceImage.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(fileName, invoiceImage, { upsert: false });

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from('invoices')
            .getPublicUrl(fileName);

          uploadedImageUrl = publicUrlData.publicUrl;
        } catch (uploadErr: any) {
          setMessage(`Error uploading invoice image: ${uploadErr.message}`);
          return;
        }
      }

      if (!editingReceptionId) {
        const newReceptionId = generateReceptionId();
        const totalQuantity = validProducts.reduce((sum, p) => sum + p.quantity, 0);
        const totalPrice = validProducts.reduce((sum, p) => sum + (p.quantity * p.price_per_unity), 0);
        
        const { data: receptionData, error: receptionError } = await supabase
          .from('reception_products')
          .insert([{
            reception_id: newReceptionId,
            supplier_id: selectedSupplier,
            supplier_name: supplier?.name || '',
            reception_date: new Date().toISOString(),
            status: 'completed',
            total_quantity: totalQuantity,
            total_price: totalPrice,
            notes: receptionNotes || '',
            invoice_image_url: uploadedImageUrl || null,
            created_by_id: user?.id,
          }])
          .select()
          .single();

        if (receptionError) throw receptionError;

        const itemsData = validProducts.map(p => ({
          reception_id: receptionData.id,
          product_name: p.product_name,
          category_id: p.category_id || null,
          unity_id: p.unity_id || null,
          quantity: p.quantity,
          price_per_unity: p.price_per_unity,
          total_price: p.quantity * p.price_per_unity,
        }));

        const { error: itemsError } = await supabase.from('reception_product_items').insert(itemsData);
        if (itemsError) throw itemsError;

        setMessage('Reception created successfully!');
      } else {
        const totalQuantity = validProducts.reduce((sum, p) => sum + p.quantity, 0);
        const totalPrice = validProducts.reduce((sum, p) => sum + (p.quantity * p.price_per_unity), 0);

        const { error: updateError } = await supabase
          .from('reception_products')
          .update({
            supplier_id: selectedSupplier,
            supplier_name: supplier?.name || '',
            notes: receptionNotes || '',
            status: 'completed',
            total_quantity: totalQuantity,
            total_price: totalPrice,
            invoice_image_url: uploadedImageUrl || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingReceptionId);

        if (updateError) throw updateError;

        await supabase.from('reception_product_items').delete().eq('reception_id', editingReceptionId);

        const itemsData = validProducts.map(p => ({
          reception_id: editingReceptionId,
          product_name: p.product_name,
          category_id: p.category_id || null,
          unity_id: p.unity_id || null,
          quantity: p.quantity,
          price_per_unity: p.price_per_unity,
          total_price: p.quantity * p.price_per_unity,
        }));

        const { error: itemsError } = await supabase.from('reception_product_items').insert(itemsData);
        if (itemsError) throw itemsError;

        setMessage('Reception updated successfully!');
      }

      setShowCreateDialog(false);
      setSelectedSupplier('');
      setReceptionNotes('');
      setProducts([{ product_name: '', category_id: '', unity_id: '', quantity: 1, price_per_unity: 0 }]);
      setInvoiceImage(null);
      setInvoiceImageUrl('');
      setEditingReceptionId(null);
      await fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error saving reception: ${err.message}`);
    }
  };

  const handleDeleteReception = async (receptionId: string) => {
    try {
      const { error } = await supabase.from('reception_products').delete().eq('id', receptionId);
      if (error) throw error;

      await supabase.from('reception_product_items').delete().eq('reception_id', receptionId);

      setMessage('Reception deleted successfully!');
      setDeletingReceptionId(null);
      setViewReception(null);
      await fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error deleting reception: ${err.message}`);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from('reception_product_items').delete().eq('id', itemId);
      if (error) throw error;

      setMessage('Item deleted successfully!');
      setDeletingItemId(null);
      if (viewReception) {
        await fetchReceptionItems(viewReception.id);
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error deleting item: ${err.message}`);
    }
  };

  const openEditDialog = (reception: ReceptionProduct) => {
    setEditingReceptionId(reception.id);
    setSelectedSupplier(reception.supplier_id || '');
    setSelectedStorage(reception.storage_id || '');
    setReceptionNotes(reception.notes || '');
    fetchReceptionItems(reception.id).then(() => {
      setProducts(
        receptionItems.map(item => ({
          product_name: item.product_name,
          category_id: item.category_id || '',
          unity_id: item.unity_id || '',
          quantity: item.quantity,
          price_per_unity: item.price_per_unity
        }))
      );
    });
    setShowCreateDialog(true);
  };

  const handlePrintReception = (reception: ReceptionProduct, lang: 'ar' | 'fr') => {
    const L = getPrintLabels(lang);
    const body = `
      <div class="details-grid">
        <div class="detail-item"><h3>${L.supplier}</h3><p>${reception.supplier_name}</p></div>
        <div class="detail-item"><h3>${L.date}</h3><p>${formatDateLocale(reception.reception_date, lang)}</p></div>
        <div class="detail-item"><h3>${L.status}</h3><p>${reception.status.toUpperCase()}</p></div>
      </div>
      <h2 class="section-title">${L.isAr ? 'المنتجات المستقبلة' : 'Produits Reçus'}</h2>
      <table><thead><tr><th style="width:5%;">#</th><th>${L.productName}</th><th>${L.quantity}</th><th>${L.unitPrice}</th><th>${L.totalPrice}</th></tr></thead><tbody>
      ${receptionItems.map((item, idx) => `<tr><td style="text-align:center;font-weight:bold;">${idx+1}</td><td class="product-name">${item.product_name}</td><td style="text-align:center;">${item.quantity}</td><td>${item.price_per_unity.toLocaleString()} DA</td><td class="amount">${(item.quantity * item.price_per_unity).toLocaleString()} DA</td></tr>`).join('')}
      <tr class="total-row"><td colspan="3"></td><td>${L.total}:</td><td class="amount">${reception.total_price.toLocaleString()} DA</td></tr>
      </tbody></table>
      ${reception.notes ? `<div class="notes-box"><strong>${L.notes}:</strong><br>${reception.notes}</div>` : ''}`;
    openPrintWindow(buildPrintHTML({
      lang,
      docTitle: { ar: 'استقبال المنتجات', fr: 'Réception Produits' },
      docDate: formatDateLocale(reception.reception_date, lang),
      enterpriseSettings,
    }, body));
  };

  // Calculations
  const totalReceptions = receptions.length;
  const completedReceptions = receptions.filter(r => r.status === 'completed').length;
  const totalProducts = receptionItems.length;
  const totalValue = receptions.reduce((sum, r) => sum + r.total_price, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRtl ? 'rtl' : 'ltr'}`}>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            message.includes('Error')
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {message}
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-3xl font-bold text-foreground"
        >
          {t('nav.receive_products')}
        </motion.h1>
        <Button
          className="gap-2 btn-gradient font-semibold"
          onClick={() => {
            setEditingReceptionId(null);
            setSelectedSupplier('');
            setReceptionNotes('');
            setProducts([{ product_name: '', category_id: '', unity_id: '', quantity: 1, price_per_unity: 0 }]);
            setShowCreateDialog(true);
          }}
        >
          <Plus className="w-4 h-4" /> {t('common.create_new')}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label={t('nav.receive_products')} value={totalReceptions} gradient="btn-gradient" delay={0.1} />
        <StatCard icon={PackageCheck} label={t('common.completed')} value={completedReceptions} gradient="btn-gradient-success" delay={0.15} />
        <StatCard icon={BarChart3} label={t('common.products')} value={totalProducts} gradient="btn-gradient-warm" delay={0.2} />
        <StatCard icon={FileText} label={t('common.total_amount')} value={totalValue.toLocaleString() + ' DA'} gradient="btn-gradient-success" delay={0.25} />
      </div>

      {/* Receptions List */}
      {receptions.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="erp-card text-center py-12">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">{t('common.no_data')}</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {receptions.map((reception, idx) => (
            <motion.div
              key={reception.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + idx * 0.05 }}
              className="erp-card hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">{reception.reception_id}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('common.supplier')}: {reception.supplier_name}</p>
                </div>
                <Badge className={`capitalize ${
                  reception.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  reception.status === 'received' ? 'bg-blue-100 text-blue-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>{reception.status}</Badge>
              </div>

              <div className="space-y-2 mb-4 p-3 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('common.quantity')}:</span>
                  <span className="font-semibold text-foreground">{reception.total_quantity}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-muted-foreground">{t('common.total')}:</span>
                  <span className="text-blue-600 dark:text-blue-300">{reception.total_price.toLocaleString()} DA</span>
                </div>
              </div>

              {reception.invoice_image_url && (
                <div className="mb-4">
                  <img
                    src={reception.invoice_image_url}
                    alt="Invoice"
                    className="w-full h-32 object-cover rounded-lg border border-gray-300 dark:border-slate-600"
                  />
                </div>
              )}

              <p className="text-xs text-muted-foreground mb-4">{new Date(reception.created_at).toLocaleDateString()}</p>

              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="gap-1 btn-gradient text-xs font-semibold"
                  onClick={() => setPendingPrintReception(reception)}
                >
                  <Printer className="w-3.5 h-3.5" /> {t('common.print')}
                </Button>
                <Button
                  size="sm"
                  className="gap-1 btn-gradient text-xs font-semibold flex-1"
                  onClick={() => {
                    setViewReception(reception);
                    fetchReceptionItems(reception.id);
                  }}
                >
                  <Eye className="w-3.5 h-3.5" /> {t('common.view')}
                </Button>
                <Button
                  size="sm"
                  className="gap-1 btn-gradient text-xs font-semibold flex-1"
                  onClick={() => openEditDialog(reception)}
                >
                  <Edit className="w-3.5 h-3.5" /> {t('common.edit')}
                </Button>
                <Button
                  size="sm"
                  className="gap-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 text-xs font-semibold"
                  onClick={() => setDeletingReceptionId(reception.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" /> {t('common.delete')}
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create/Edit Reception Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">
                  {editingReceptionId ? t('common.edit') : t('common.create_new')} {t('nav.receive_products')}
                </DialogTitle>
                <DialogDescription className="text-blue-700 dark:text-blue-300 mt-1">
                  {editingReceptionId ? 'Update reception details' : 'Add new product reception'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 pr-6">
            {/* Supplier Selection */}
            <div>
              <label className="text-sm font-bold text-foreground block mb-2">{t('common.supplier')} *</label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Storage Selection */}
            <div>
              <label className="text-sm font-bold text-foreground block mb-2">{t('common.storage_selection')} *</label>
              <Select value={selectedStorage} onValueChange={setSelectedStorage}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select_storage_facility')} />
                </SelectTrigger>
                <SelectContent>
                  {storages.map(storage => (
                    <SelectItem key={storage.id} value={storage.id}>
                      {storage.name} {storage.address ? `(${storage.address})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Products Table */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                  {t('common.add_product')}
                </h3>
              </div>

              <div className="space-y-3">
                {products.map((product, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('common.product_name')}</label>
                      <Input
                        value={product.product_name}
                        onChange={(e) => updateProduct(idx, 'product_name', e.target.value)}
                        placeholder="Product name"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('common.quantity')}</label>
                      <Input
                        type="number"
                        min="1"
                        value={product.quantity}
                        onChange={(e) => updateProduct(idx, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('common.price')}</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={product.price_per_unity}
                        onChange={(e) => updateProduct(idx, 'price_per_unity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeProductRow(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                size="sm"
                className="mt-3 gap-1"
                variant="outline"
                onClick={addProductRow}
              >
                <Plus className="w-4 h-4" /> {t('common.add_row')}
              </Button>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-bold text-foreground block mb-2">{t('common.notes')}</label>
              <Input
                placeholder="Add any notes..."
                value={receptionNotes}
                onChange={(e) => setReceptionNotes(e.target.value)}
              />
            </div>

            {/* Invoice Image Upload */}
            <div>
              <label className="text-sm font-bold text-foreground block mb-2">
                {t('common.invoice_image') || 'صورة الفاتورة / Image facture'}
              </label>
              <div className="flex gap-2 items-end">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setInvoiceImage(e.target.files?.[0] || null)}
                  className="flex-1 px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500"
                />
                {invoiceImage && (
                  <span className="text-sm text-green-600 font-semibold">
                    ✓ {invoiceImage.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveReception} className="btn-gradient font-semibold">
              <Save className="w-4 h-4 mr-1" /> {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Reception Details Dialog */}
      <Dialog open={!!viewReception} onOpenChange={() => setViewReception(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">{viewReception?.reception_id}</DialogTitle>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">View detailed information about this reception</p>
              </div>
              {viewReception && (
                <Button
                  onClick={() => setPendingPrintReception(viewReception)}
                  className="gap-2 btn-gradient font-semibold"
                >
                  <Printer className="w-4 h-4" /> {t('common.print')}
                </Button>
              )}
            </div>
          </DialogHeader>

          {viewReception && (
            <div className="space-y-6 pr-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.supplier')}</p>
                  <p className="text-lg font-bold text-foreground">{viewReception.supplier_name}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.date')}</p>
                  <p className="text-lg font-bold text-foreground">{new Date(viewReception.reception_date).toLocaleDateString()}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.status')}</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{viewReception.status.toUpperCase()}</p>
                </div>
              </div>

              {/* Products Table */}
              {receptionItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                    {t('common.products')}
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-blue-200 dark:border-slate-600">
                          <th className="text-left py-2 px-3 font-bold text-blue-600 dark:text-blue-400">{t('common.product_name')}</th>
                          <th className="text-right py-2 px-3 font-bold text-blue-600 dark:text-blue-400">{t('common.quantity')}</th>
                          <th className="text-right py-2 px-3 font-bold text-blue-600 dark:text-blue-400">{t('common.price')}</th>
                          <th className="text-right py-2 px-3 font-bold text-blue-600 dark:text-blue-400">{t('common.total')}</th>
                          <th className="text-center py-2 px-3 font-bold text-blue-600 dark:text-blue-400">{t('common.action')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receptionItems.map((item) => (
                          <tr key={item.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700 transition">
                            <td className="py-3 px-3 text-foreground">{item.product_name}</td>
                            <td className="py-3 px-3 text-right text-foreground">{item.quantity}</td>
                            <td className="py-3 px-3 text-right text-foreground">{item.price_per_unity.toLocaleString()} DA</td>
                            <td className="py-3 px-3 text-right font-semibold text-blue-600 dark:text-blue-400">{item.total_price.toLocaleString()} DA</td>
                            <td className="py-3 px-3 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeletingItemId(item.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-blue-100 dark:bg-slate-700 font-bold">
                          <td colSpan={3} className="py-3 px-3 text-right">{t('common.total')}:</td>
                          <td className="py-3 px-3 text-right text-blue-700 dark:text-blue-300">{viewReception.total_price.toLocaleString()} DA</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {viewReception.notes && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                    <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                    {t('common.notes')}
                  </h3>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                    <p className="text-sm text-foreground">{viewReception.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewReception(null)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialogs */}
      <AlertDialog open={!!deletingReceptionId} onOpenChange={() => setDeletingReceptionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')} {t('nav.receive_products')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.are_you_sure')}? {t('common.this_action_cannot_be_undone')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deletingReceptionId) handleDeleteReception(deletingReceptionId); }}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingItemId} onOpenChange={() => setDeletingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')} {t('common.product')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.are_you_sure')}? {t('common.this_action_cannot_be_undone')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deletingItemId) handleDeleteItem(deletingItemId); }}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!validatingId} onOpenChange={() => setValidatingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.validate')} {t('nav.receive_products')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.are_you_sure_validate')}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (validatingId) handleValidation(validatingId); }}
              className="bg-green-600 hover:bg-green-700"
            >
              {t('common.validate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Language Chooser Dialog */}
      <Dialog open={!!pendingPrintReception} onOpenChange={() => setPendingPrintReception(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-xl font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" /> {t('common.choose_print_language')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 px-2 pb-2">
            <Button onClick={() => { if (pendingPrintReception) handlePrintReception(pendingPrintReception, 'ar'); setPendingPrintReception(null); }} className="h-24 flex flex-col gap-2 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-lg rounded-xl shadow-lg">
              <span className="text-2xl">🇩🇿</span> {t('common.print_in_arabic')}
            </Button>
            <Button onClick={() => { if (pendingPrintReception) handlePrintReception(pendingPrintReception, 'fr'); setPendingPrintReception(null); }} className="h-24 flex flex-col gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-xl shadow-lg">
              <span className="text-2xl">🇫🇷</span> {t('common.print_in_french')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
