import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, Loader, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  full_name: string;
}

export default function CreateProductPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [unities, setUnities] = useState<Unity[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  const [showNewCat, setShowNewCat] = useState(false);
  const [showNewUnity, setShowNewUnity] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [newUnity, setNewUnity] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    unity_id: '',
    quantity: 0,
    unit_price: 0,
    total_price: 0,
    supplier_id: '',
    note: '',
  });

  // Auto-calculate total price
  const calculateTotal = (qty: number, unitPrice: number) => {
    return qty * unitPrice;
  };

  // Handle quantity or unit price change
  const handleQuantityChange = (value: number) => {
    const newTotal = calculateTotal(value, formData.unit_price);
    setFormData({ ...formData, quantity: value, total_price: newTotal });
  };

  const handleUnitPriceChange = (value: number) => {
    const newTotal = calculateTotal(formData.quantity, value);
    setFormData({ ...formData, unit_price: value, total_price: newTotal });
  };

  // Fetch all reference data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setDataLoading(true);

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
        .select('id, full_name')
        .order('full_name');
      if (suppliersError) throw suppliersError;
      setSuppliers(suppliersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
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
      setFormData({ ...formData, category_id: '' });
      await fetchData();
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
      setFormData({ ...formData, unity_id: '' });
      await fetchData();
    } catch (error) {
      console.error('Error adding unity:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.category_id || !formData.unity_id) {
      alert(t('common.required_fields') || 'Please fill all required fields');
      return;
    }

    try {
      setLoading(true);

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

      alert(t('common.saved_successfully') || 'Product created successfully!');
      navigate('/storage-management');
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Error creating product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/storage-management')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> {t('common.cancel')}
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">{t('nav.create_product')}</h1>
          <p className="text-muted-foreground text-sm mt-1">Add a new product to inventory</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Required Fields Section */}
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
            {t('common.required_fields')}
          </h2>
          <div className="erp-card p-6 border-2 border-blue-100 dark:border-slate-700 bg-blue-50/50 dark:bg-slate-800/50 space-y-4">
            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">{t('common.name')} *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('common.enter_name')}
                className="text-base border-blue-200 dark:border-slate-600"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">{t('common.category')} *</label>
              <div className="flex gap-2">
                <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                  <SelectTrigger className="flex-1 border-blue-200 dark:border-slate-600">
                    <SelectValue placeholder={t('common.select') || 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
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
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">{t('common.unity')} *</label>
              <div className="flex gap-2">
                <Select value={formData.unity_id} onValueChange={(v) => setFormData({ ...formData, unity_id: v })}>
                  <SelectTrigger className="flex-1 border-blue-200 dark:border-slate-600">
                    <SelectValue placeholder={t('common.select') || 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {unities.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
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
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-foreground mb-2 block">{t('common.quantity')} *</label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleQuantityChange(Number(e.target.value))}
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
                  onChange={(e) => handleUnitPriceChange(Number(e.target.value))}
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
          <p className="text-sm text-muted-foreground font-semibold mb-2">{t('common.total_price')} (Auto-Calculated)</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {formData.quantity} × {formData.unit_price.toLocaleString()} = {formData.total_price.toLocaleString()} DA
          </p>
        </div>

        {/* Optional Fields Section */}
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <span className="w-1 h-6 bg-gradient-to-b from-slate-400 to-slate-500 rounded" />
            {t('common.optional')}
          </h2>
          <div className="erp-card p-6 border-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">{t('common.supplier')}</label>
              <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
                <SelectTrigger className="border-slate-200 dark:border-slate-600">
                  <SelectValue placeholder={t('common.select_supplier')} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
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

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/storage-management')}
            className="flex-1 font-semibold"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 btn-gradient text-white font-semibold gap-2"
          >
            {loading && <Loader className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" /> {t('common.save')}
          </Button>
        </div>
      </div>

      {/* New Category Dialog */}
      <Dialog open={showNewCat} onOpenChange={setShowNewCat}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-xl font-bold text-blue-950 dark:text-blue-100">{t('common.new_category')}</DialogTitle>
          </DialogHeader>
          <Input
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            placeholder={t('common.name')}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            className="border-blue-200 dark:border-slate-600"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowNewCat(false)} className="font-semibold">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddCategory} className="flex-1 btn-gradient text-white font-semibold">
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Unity Dialog */}
      <Dialog open={showNewUnity} onOpenChange={setShowNewUnity}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-xl font-bold text-blue-950 dark:text-blue-100">{t('common.new_unity')}</DialogTitle>
          </DialogHeader>
          <Input
            value={newUnity}
            onChange={e => setNewUnity(e.target.value)}
            placeholder={t('common.name')}
            onKeyDown={(e) => e.key === 'Enter' && handleAddUnity()}
            className="border-blue-200 dark:border-slate-600"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowNewUnity(false)} className="font-semibold">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddUnity} className="flex-1 btn-gradient text-white font-semibold">
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
