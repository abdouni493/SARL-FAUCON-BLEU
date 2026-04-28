import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { motion } from 'framer-motion';
import { Eye, Edit, Trash2, Plus, Save, Loader, Package, Warehouse } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Storage {
  id: string;
  name: string;
  address?: string;
  description?: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

interface StorageProduct {
  id: string;
  name: string;
  category_id?: string;
  unity_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  supplier_id?: string;
  categories?: { id: string; name: string } | null;
  unities?: { id: string; name: string } | null;
  suppliers?: { id: string; name: string } | null;
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

export default function StoragesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { enterpriseSettings } = useData();
  const isRtl = i18n.language === 'ar';

  const [storages, setStorages] = useState<Storage[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewStorage, setViewStorage] = useState<Storage | null>(null);
  const [storageProducts, setStorageProducts] = useState<StorageProduct[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingStorage, setEditingStorage] = useState<Storage | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: ''
  });

  useEffect(() => {
    fetchStorages();
  }, []);

  const fetchStorages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('storages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStorages(data || []);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageProducts = async (storageId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('storage_id', storageId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStorageProducts(data || []);
    } catch (err: any) {
      setMessage(`Error loading products: ${err.message}`);
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleOpenCreate = () => {
    setEditingStorage(null);
    setFormData({ name: '', address: '', description: '' });
    setShowCreateDialog(true);
  };

  const handleOpenEdit = (storage: Storage) => {
    setEditingStorage(storage);
    setFormData({
      name: storage.name,
      address: storage.address || '',
      description: storage.description || ''
    });
    setShowCreateDialog(true);
  };

  const handleOpenView = async (storage: Storage) => {
    setViewStorage(storage);
    await fetchStorageProducts(storage.id);
  };

  const handleSaveStorage = async () => {
    if (!formData.name.trim()) {
      setMessage(t('common.storage_name_required'));
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      if (editingStorage) {
        // Update existing storage
        const { error } = await supabase
          .from('storages')
          .update({
            name: formData.name,
            address: formData.address,
            description: formData.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingStorage.id);

        if (error) throw error;
        setMessage('Storage updated successfully!');
      } else {
        // Create new storage
        const { error } = await supabase
          .from('storages')
          .insert({
            name: formData.name,
            address: formData.address,
            description: formData.description,
            created_by_id: user?.id
          });

        if (error) throw error;
        setMessage('Storage created successfully!');
      }

      setMessageType('success');
      setShowCreateDialog(false);
      setFormData({ name: '', address: '', description: '' });
      await fetchStorages();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteStorage = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('storages')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      setMessage('Storage deleted successfully!');
      setMessageType('success');
      setDeleteId(null);
      await fetchStorages();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Warehouse className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('nav.storages')}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t('common.storage_create_description')}</p>
            </div>
          </div>
          <Button
            onClick={handleOpenCreate}
            className="gap-2 btn-gradient text-white font-semibold"
          >
            <Plus className="w-5 h-5" />
            {t('common.add_storage')}
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`mb-6 p-4 rounded-lg font-semibold ${
            messageType === 'success'
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'
          }`}
        >
          {message}
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={Warehouse}
          label={t('common.total_storages')}
          value={storages.length}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          delay={0}
        />
        <StatCard
          icon={Package}
          label={t('common.active_storages')}
          value={storages.filter(s => s.is_active).length}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          delay={0.1}
        />
        <StatCard
          icon={Warehouse}
          label={t('common.total_products')}
          value={storageProducts.length}
          gradient="bg-gradient-to-br from-orange-500 to-red-600"
          delay={0.2}
        />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </div>
      ) : storages.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-blue-200 dark:border-slate-700"
        >
          <Warehouse className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
          <p className="text-muted-foreground text-lg">{t('common.no_data')}</p>
          <p className="text-sm text-muted-foreground mt-2">{t('common.create_first_storage')}</p>
        </motion.div>
      ) : (
        /* Storages Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {storages.map((storage, idx) => (
            <motion.div
              key={storage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -5 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-600/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300">
                {/* Header with gradient */}
                <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-2 right-2 w-24 h-24 bg-white rounded-full opacity-10" />
                  </div>
                  <div className="relative h-full flex items-end px-4 pb-4">
                    <div className="w-12 h-12 bg-white rounded-lg shadow-lg flex items-center justify-center mb-2">
                      <Warehouse className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-foreground mb-1 truncate">{storage.name}</h3>
                  
                  {storage.address && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      📍 {storage.address}
                    </p>
                  )}

                  {storage.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {storage.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between py-2 px-3 bg-blue-50 dark:bg-slate-700 rounded-lg mb-3">
                    <p className="text-xs text-muted-foreground font-semibold">{t('common.date')}</p>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {new Date(storage.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleOpenView(storage)}
                      className="gap-1.5 btn-gradient text-xs font-semibold flex-1"
                    >
                      <Eye className="w-4 h-4" /> {t('common.view')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOpenEdit(storage)}
                      className="gap-1.5 btn-gradient text-xs font-semibold flex-1"
                    >
                      <Edit className="w-4 h-4" /> {t('common.edit')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setDeleteId(storage.id)}
                      className="gap-1.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 text-xs font-semibold"
                    >
                      <Trash2 className="w-4 h-4" /> {t('common.delete')}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">
              {editingStorage ? t('common.update_storage') : t('common.create_new_storage')}
            </DialogTitle>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {editingStorage ? t('common.update_storage_description') : t('common.create_storage_description')}
            </p>
          </DialogHeader>

          <div className="space-y-6 pr-6">
            {/* Name */}
            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">
                {t('common.storage_name')} *
              </label>
              <Input
                placeholder={t('common.storage_name_placeholder')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-blue-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Address */}
            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">
                {t('common.address')}
              </label>
              <Input
                placeholder={t('common.address_placeholder')}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="border-blue-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">
                {t('common.description')}
              </label>
              <Textarea
                placeholder={t('common.description_placeholder')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="border-blue-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-3 pt-6 border-t border-blue-200 dark:border-slate-700">
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveStorage}
              className="gap-2 btn-gradient text-white font-semibold"
            >
              <Save className="w-4 h-4" />
              {editingStorage ? t('common.update_storage') : t('common.create_new_storage')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Storage Products Dialog */}
      <Dialog open={!!viewStorage} onOpenChange={() => setViewStorage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">
                  {viewStorage?.name}
                </DialogTitle>
                <DialogDescription className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  📍 {viewStorage?.address || 'No address specified'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {viewStorage && (
            <div className="space-y-6 pr-6">
              {/* Storage Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.created')}</p>
                  <p className="text-lg font-bold text-foreground">{new Date(viewStorage.created_at).toLocaleDateString()}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.products')}</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{storageProducts.length}</p>
                </div>
              </div>

              {/* Products Table */}
              <div>
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                  {t('common.storage_contents')}
                </h3>

                {storageProducts.length === 0 ? (
                  <div className="text-center py-8 bg-blue-50 dark:bg-slate-700 rounded-lg">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                    <p className="text-muted-foreground">{t('common.no_data')}</p>
                  </div>
                ) : (
                  <div className="border border-blue-200 dark:border-slate-600 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-700 dark:to-slate-800 border-b border-blue-200 dark:border-slate-600">
                          <th className="p-4 text-left font-bold text-blue-950 dark:text-blue-100">Product Name</th>
                          <th className="p-4 text-left font-bold text-blue-950 dark:text-blue-100">Category</th>
                          <th className="p-4 text-center font-bold text-blue-950 dark:text-blue-100">Quantity</th>
                          <th className="p-4 text-right font-bold text-blue-950 dark:text-blue-100">Unit Price</th>
                          <th className="p-4 text-right font-bold text-blue-950 dark:text-blue-100">Total Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storageProducts.map((product, idx) => (
                          <tr
                            key={product.id}
                            className={`border-b border-blue-100 dark:border-slate-700 transition-colors ${
                              idx % 2 === 0
                                ? 'bg-white dark:bg-slate-800'
                                : 'bg-blue-50 dark:bg-slate-700'
                            } hover:bg-blue-100 dark:hover:bg-slate-600`}
                          >
                            <td className="p-4">
                              <p className="font-bold text-blue-900 dark:text-blue-100">{product.name}</p>
                            </td>
                            <td className="p-4 text-sm">{product.categories?.name || '-'}</td>
                            <td className="p-4 text-center">
                              <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-slate-600 text-blue-700 dark:text-blue-300 rounded-full font-semibold text-sm">
                                {product.quantity} {product.unities?.name || ''}
                              </span>
                            </td>
                            <td className="p-4 text-right font-semibold text-foreground">
                              DZD{product.unit_price.toFixed(2)}
                            </td>
                            <td className="p-4 text-right font-bold text-blue-600 dark:text-blue-400">
                              DZD{product.total_price.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.storage_delete_warning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStorage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
