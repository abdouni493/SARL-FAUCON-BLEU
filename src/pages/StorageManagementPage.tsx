import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Eye, Edit, Trash2, Plus, Save, Loader, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Product {
  id: string;
  name: string;
  category_id: string;
  unity_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  supplier_id?: string;
  storage_id?: string;
  note?: string;
  created_at: string;
  categories?: { id: string; name: string } | null;
  unities?: { id: string; name: string } | null;
  suppliers?: { id: string; name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

interface Unity {
  id: string;
  name: string;
  symbol?: string;
}

interface Supplier {
  id: string;
  name: string;
  phone?: string;
}

interface Storage {
  id: string;
  name: string;
  address?: string;
}

export default function StorageManagementPage() {
  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [unities, setUnities] = useState<Unity[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [storages, setStorages] = useState<Storage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);
  const [showNewUnity, setShowNewUnity] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleteUnityId, setDeleteUnityId] = useState<string | null>(null);
  const [newCat, setNewCat] = useState('');
  const [newUnity, setNewUnity] = useState('');

  // Helper function to get localized "Add Material" label
  const getAddMaterialLabel = () => {
    if (i18n.language === 'ar') {
      return 'إضافة مادة';
    } else if (i18n.language === 'fr') {
      return 'Ajouter Matière';
    }
    return t('common.create_product');
  };

  // Helper function to get localized "Edit Material" label
  const getEditMaterialLabel = () => {
    if (i18n.language === 'ar') {
      return 'تعديل مادة';
    } else if (i18n.language === 'fr') {
      return 'Modifier Matière';
    }
    return t('common.edit_product');
  };

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    unity_id: '',
    quantity: 0,
    unit_price: 0,
    total_price: 0,
    supplier_id: '',
    storage_id: '',
    note: '',
  });

  // Auto-calculate total price
  const calculateTotal = (qty: number, unitPrice: number) => {
    return qty * unitPrice;
  };

  // Fetch all data from Supabase
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch products with relations
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          categories (id, name),
          unities (id, name, symbol)
        `)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch unities
      const { data: unitiesData, error: unitiesError } = await supabase
        .from('unities')
        .select('*')
        .order('name');
      if (unitiesError) throw unitiesError;
      setUnities(unitiesData || []);

      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id, name, phone')
        .order('name');
      if (suppliersError) throw suppliersError;
      setSuppliers(suppliersData || []);

      // Fetch storages
      const { data: storagesData, error: storagesError } = await supabase
        .from('storages')
        .select('id, name, address')
        .eq('is_active', true)
        .order('name');
      if (storagesError) throw storagesError;
      setStorages(storagesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.category_id || !formData.unity_id) {
      alert(t('common.required_fields') || 'Please fill all required fields');
      return;
    }

    try {
      if (editingId) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Create new product
        const { error } = await supabase
          .from('products')
          .insert([
            {
              ...formData,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          ]);

        if (error) throw error;
      }

      // Refresh products list
      await fetchAllData();
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      // Refresh products list
      await fetchAllData();
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product');
    }
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      category_id: product.category_id,
      unity_id: product.unity_id,
      quantity: product.quantity,
      unit_price: product.unit_price,
      total_price: product.total_price,
      supplier_id: product.supplier_id || '',
      storage_id: product.storage_id || '',
      note: product.note || '',
    });
    setShowCreateDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category_id: '',
      unity_id: '',
      quantity: 0,
      unit_price: 0,
      total_price: 0,
      supplier_id: '',
      storage_id: '',
      note: '',
    });
    setEditingId(null);
    setShowCreateDialog(false);
  };

  const handleAddCategory = async () => {
    if (!newCat.trim()) return;

    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ name: newCat }]);

      if (error) throw error;

      setNewCat('');
      setShowNewCat(false);
      await fetchAllData();
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleAddUnity = async () => {
    if (!newUnity.trim()) return;

    try {
      const { error } = await supabase
        .from('unities')
        .insert([{ name: newUnity }]);

      if (error) throw error;

      setNewUnity('');
      setShowNewUnity(false);
      await fetchAllData();
    } catch (error) {
      console.error('Error adding unity:', error);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', deleteCategoryId);
      if (error) throw error;
      setDeleteCategoryId(null);
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleDeleteUnity = async () => {
    if (!deleteUnityId) return;
    try {
      const { error } = await supabase.from('unities').delete().eq('id', deleteUnityId);
      if (error) throw error;
      setDeleteUnityId(null);
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting unity:', error);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">{t('nav.storage_management')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('storage.manage_inventory')}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2 btn-gradient text-white shadow-lg font-semibold">
          <Plus className="w-5 h-5" /> {getAddMaterialLabel()}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Input
            placeholder={t('common.search_products') || 'Rechercher des produits...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={i18n.language === 'ar' ? 'pr-10' : 'pl-10'}
          />
          <Search className={`absolute top-2.5 h-5 w-5 text-muted-foreground ${i18n.language === 'ar' ? 'right-3' : 'left-3'}`} />
        </div>
        <div className="flex gap-2 min-w-[200px]">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder={t('common.all_categories')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all_categories')}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(searchQuery || selectedCategory !== 'all') && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-2" /> {t('common.clear')}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : products.length === 0 ? (
        <div className="erp-card text-center py-16 text-muted-foreground">
          <p className="text-lg">{t('common.no_data')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative erp-card hover:shadow-xl cursor-pointer border-2 border-blue-100 dark:border-slate-700 overflow-hidden"
            >
              {/* Background decoration */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150" />
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">{t('common.product')}</p>
                    <span className="font-bold text-lg text-foreground">{p.name}</span>
                  </div>
                  <span className="text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-tight bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200">
                    {p.quantity} {p.unities?.name || ''}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 py-3 px-3 bg-blue-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">{t('common.category')}</p>
                    <p className="text-sm font-medium text-foreground">{p.categories?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">{t('common.unit_price')}</p>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{p.unit_price.toLocaleString()} DA</p>
                  </div>
                </div>

                {p.suppliers && (
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-800">
                    <p className="text-xs text-muted-foreground font-semibold">{t('common.supplier')}</p>
                    <p className="text-sm font-medium text-foreground">{p.suppliers?.name}</p>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap pt-2">
                  <Button 
                    size="sm" 
                    onClick={() => setViewProduct(p)} 
                    className="gap-1.5 btn-gradient text-xs font-semibold flex-1"
                  >
                    <Eye className="w-4 h-4" /> {t('common.view')}
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => startEdit(p)} 
                    className="gap-1.5 btn-gradient text-xs font-semibold flex-1"
                  >
                    <Edit className="w-4 h-4" /> {t('common.edit')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setDeleteId(p.id)}
                    className="gap-1.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 text-xs font-semibold"
                  >
                    <Trash2 className="w-4 h-4" /> {t('common.delete')}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* View Product Dialog */}
      <Dialog open={!!viewProduct} onOpenChange={() => setViewProduct(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">{viewProduct?.name}</DialogTitle>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{t('storage.view_product_details')}</p>
              </div>
            </div>
          </DialogHeader>
          {viewProduct && (
            <div className="space-y-6 pr-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.category')}</p>
                  <p className="text-lg font-bold text-foreground">{viewProduct.categories?.name}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.quantity')}</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{viewProduct.quantity} {viewProduct.unities?.name}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.unit_price')}</p>
                  <p className="text-lg font-bold text-foreground">{viewProduct.unit_price.toLocaleString()} DA</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                  {t('common.pricing_summary')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-muted-foreground font-semibold mb-2">{t('common.calculation')}</p>
                    <p className="text-sm font-medium text-foreground">{viewProduct.quantity} × {viewProduct.unit_price.toLocaleString()} = <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{viewProduct.total_price.toLocaleString()} DA</span></p>
                  </div>
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs text-muted-foreground font-semibold mb-2">{t('common.total_price')}</p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{viewProduct.total_price.toLocaleString()} DA</p>
                  </div>
                </div>
              </div>

              {viewProduct.suppliers && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                    {t('common.supplier')}
                  </h3>
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <p className="text-sm font-medium text-foreground">{viewProduct.suppliers?.name || t('storage.not_assigned')}</p>
                  </div>
                </div>
              )}

              {viewProduct.note && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                    {t('common.note')}
                  </h3>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                    <p className="text-sm text-foreground">{viewProduct.note}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Product Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">
              {editingId ? getEditMaterialLabel() : getAddMaterialLabel()}
            </DialogTitle>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{t('storage.add_manage_products')}</p>
          </DialogHeader>
          <div className="space-y-6 pr-6">
            {/* Required Fields Section */}
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                {t('common.required_fields')}
              </h3>
              <div className="space-y-4 border border-blue-200 dark:border-slate-600 rounded-lg p-4 bg-blue-50 dark:bg-slate-800/50">
                <div>
                  <label className="text-sm font-bold text-foreground mb-2 block">{t('common.name')} *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('common.enter_name')}
                    className="border-blue-200 dark:border-slate-600"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-foreground mb-2 block">{t('common.category')} *</label>
                  <div className="flex gap-2">
                    <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                      <SelectTrigger className="flex-1 border-blue-200 dark:border-slate-600">
                        <SelectValue placeholder={t('common.select')} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={() => setShowNewCat(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    {formData.category_id && (
                      <Button 
                        type="button" 
                        size="sm" 
                        onClick={() => setDeleteCategoryId(formData.category_id)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-foreground mb-2 block">{t('common.unity')} *</label>
                  <div className="flex gap-2">
                    <Select value={formData.unity_id} onValueChange={(v) => setFormData({ ...formData, unity_id: v })}>
                      <SelectTrigger className="flex-1 border-blue-200 dark:border-slate-600">
                        <SelectValue placeholder={t('common.select')} />
                      </SelectTrigger>
                      <SelectContent>
                        {unities.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={() => setShowNewUnity(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    {formData.unity_id && (
                      <Button 
                        type="button" 
                        size="sm" 
                        onClick={() => setDeleteUnityId(formData.unity_id)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold text-foreground mb-2 block">{t('common.quantity')} *</label>
                    <Input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => {
                        const qty = Number(e.target.value);
                        const newTotal = calculateTotal(qty, formData.unit_price);
                        setFormData({ ...formData, quantity: qty, total_price: newTotal });
                      }}
                      min="0"
                      placeholder="0"
                      className="text-base border-blue-200 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-foreground mb-2 block">{t('common.unit_price')} (DA) *</label>
                    <Input
                      type="number"
                      value={formData.unit_price}
                      onChange={(e) => {
                        const price = Number(e.target.value);
                        const newTotal = calculateTotal(formData.quantity, price);
                        setFormData({ ...formData, unit_price: price, total_price: newTotal });
                      }}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="text-base border-blue-200 dark:border-slate-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Total Price Display */}
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 rounded-lg p-4 border-2 border-amber-200 dark:border-amber-700">
              <p className="text-sm text-muted-foreground font-semibold mb-2">{t('storage.auto_calculated_total')}</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {formData.quantity} × {formData.unit_price.toLocaleString()} = {formData.total_price.toLocaleString()} DA
              </p>
            </div>

            {/* Optional Fields Section */}
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                <span className="w-1 h-6 bg-gradient-to-b from-slate-400 to-slate-500 rounded" />
                {t('common.optional_fields')}
              </h3>
              <div className="space-y-4 border border-slate-200 dark:border-slate-600 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/30">
                <div>
                  <label className="text-sm font-bold text-foreground mb-2 block">{t('common.storage_selection')}</label>
                  <Select value={formData.storage_id} onValueChange={(v) => setFormData({ ...formData, storage_id: v })}>
                    <SelectTrigger className="border-slate-200 dark:border-slate-600">
                      <SelectValue placeholder={t('common.select_storage_facility')} />
                    </SelectTrigger>
                    <SelectContent>
                      {storages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-bold text-foreground mb-2 block">{t('common.supplier')}</label>
                  <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
                    <SelectTrigger className="border-slate-200 dark:border-slate-600">
                      <SelectValue placeholder={t('common.select_supplier')} />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-bold text-foreground mb-2 block">{t('common.note')}</label>
                  <Input
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder={t('common.enter_note')}
                    className="border-slate-200 dark:border-slate-600"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-blue-200 dark:border-slate-700">
            <Button variant="outline" onClick={resetForm} className="font-semibold">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} className="btn-gradient text-white font-semibold gap-2">
              <Save className="w-4 h-4" /> {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={showNewCat} onOpenChange={setShowNewCat}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-xl font-bold text-blue-950 dark:text-blue-100">{t('common.manage_categories')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-foreground block mb-2">{t('common.category')}</label>
              <div className="flex gap-2">
                <Input
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder={t('storage.enter_category')}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  className="border-blue-200 dark:border-slate-600"
                />
                <Button onClick={handleAddCategory} className="btn-gradient text-white font-semibold gap-1">
                  <Plus className="w-4 h-4" /> {t('common.add')}
                </Button>
              </div>
            </div>

            {categories.length > 0 && (
              <div className="border-t border-blue-200 dark:border-slate-700 pt-4">
                <label className="text-sm font-bold text-foreground block mb-3">{t('common.existing')}</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600 hover:bg-blue-100 dark:hover:bg-slate-600 transition">
                      <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      <Button
                        size="sm"
                        onClick={() => setDeleteCategoryId(cat.id)}
                        className="h-6 px-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-blue-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setShowNewCat(false)} className="font-semibold">
              {t('common.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Unity Dialog */}
      <Dialog open={showNewUnity} onOpenChange={setShowNewUnity}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-xl font-bold text-blue-950 dark:text-blue-100">{t('common.manage_unities')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-foreground block mb-2">{t('common.unity')}</label>
              <div className="flex gap-2">
                <Input
                  value={newUnity}
                  onChange={(e) => setNewUnity(e.target.value)}
                  placeholder={t('storage.enter_unity')}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddUnity()}
                  className="border-blue-200 dark:border-slate-600"
                />
                <Button onClick={handleAddUnity} className="btn-gradient text-white font-semibold gap-1">
                  <Plus className="w-4 h-4" /> {t('common.add')}
                </Button>
              </div>
            </div>

            {unities.length > 0 && (
              <div className="border-t border-blue-200 dark:border-slate-700 pt-4">
                <label className="text-sm font-bold text-foreground block mb-3">{t('common.existing')}</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {unities.map((unity) => (
                    <div key={unity.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600 hover:bg-blue-100 dark:hover:bg-slate-600 transition">
                      <span className="text-sm font-medium text-foreground">{unity.name}</span>
                      <Button
                        size="sm"
                        onClick={() => setDeleteUnityId(unity.id)}
                        className="h-6 px-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-blue-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setShowNewUnity(false)} className="font-semibold">
              {t('common.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('common.delete_warning') || 'Êtes-vous sûr de vouloir supprimer ce produit?'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('storage.delete_category_warning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Unity Confirmation */}
      <AlertDialog open={!!deleteUnityId} onOpenChange={() => setDeleteUnityId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('storage.delete_unity_warning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUnity} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
