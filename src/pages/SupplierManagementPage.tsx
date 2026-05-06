import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Edit, Trash2, Plus, Save, Loader, History, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Supplier {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  company_name?: string;
  nis?: string;
  nif?: string;
  article?: string;
  commercial_registration?: string;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

interface SupplierDebt {
  id: string;
  supplier_name: string;
  total_price: number;
  amount_paid: number;
  remaining_balance: number;
  status: string;
}

interface SupplierBon {
  id: string;
  bon_id: string;
  supplier_name: string;
  total_with_tva: number;
  total_without_tva?: number;
  status: string;
  created_at: string;
}

export default function SupplierManagementPage() {
  const { t, i18n } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historySupplier, setHistorySupplier] = useState<Supplier | null>(null);
  const [supplierDebts, setSupplierDebts] = useState<SupplierDebt[]>([]);
  const [supplierBons, setSupplierBons] = useState<SupplierBon[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const isRtl = i18n.language === 'ar';

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    company_name: '',
    nis: '',
    nif: '',
    article: '',
    commercial_registration: '',
  });

  // Fetch suppliers from Supabase
  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierHistory = async (supplier: Supplier) => {
    try {
      setHistoryLoading(true);
      setHistorySupplier(supplier);
      
      // Fetch debts for this supplier
      const { data: debtsData, error: debtsError } = await supabase
        .from('debts')
        .select('*')
        .eq('supplier_name', supplier.name);

      // Fetch bons_commandes for this supplier - including all relevant fields
      const { data: bonsData, error: bonsError } = await supabase
        .from('bons_commandes')
        .select('id, bon_id, supplier_name, total_without_tva, total_with_tva, status, created_at')
        .eq('supplier_name', supplier.name)
        .order('created_at', { ascending: false });

      if (debtsError) throw debtsError;
      if (bonsError) throw bonsError;

      setSupplierDebts(debtsData || []);
      setSupplierBons(bonsData || []);
      setShowHistoryDialog(true);
    } catch (error) {
      console.error('Error fetching supplier history:', error);
      setMessage('Error loading supplier history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone || !formData.address) {
      alert(t('common.required_fields'));
      return;
    }

    try {
      if (editingId) {
        // Update existing supplier
        const { error } = await supabase
          .from('suppliers')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Create new supplier
        const { error } = await supabase
          .from('suppliers')
          .insert([
            {
              ...formData,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          ]);

        if (error) throw error;
      }

      // Refresh suppliers list
      await fetchSuppliers();
      resetForm();
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Error saving supplier');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      // Refresh suppliers list
      await fetchSuppliers();
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Error deleting supplier');
    }
  };

  const startEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      address: supplier.address || '',
      company_name: supplier.company_name || '',
      nis: supplier.nis || '',
      nif: supplier.nif || '',
      article: supplier.article || '',
      commercial_registration: supplier.commercial_registration || '',
    });
    setShowCreateDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      address: '',
      company_name: '',
      nis: '',
      nif: '',
      article: '',
      commercial_registration: '',
    });
    setEditingId(null);
    setShowCreateDialog(false);
  };

  return (
    <div className={`space-y-6 ${isRtl ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-1">
          {t('nav.supplier_management')}
        </h1>
        <p className="text-muted-foreground text-sm">{t('common.manage_your_data')}</p>
      </motion.div>

      {/* Create Button */}
      <div className="flex justify-end">
        <Button onClick={() => {
          setEditingId(null);
          resetForm();
          setShowCreateDialog(true);
        }} className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg font-semibold">
          <Plus className="w-4 h-4" /> {t('common.add_supplier')}
        </Button>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border-l-4 font-medium flex items-center gap-2 ${
            message.includes('Error') 
              ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 border-red-400' 
              : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 border-emerald-400'
          }`}
        >
          {message.includes('Error') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {message}
        </motion.div>
      )}

      {/* Search Input */}
      {suppliers.length > 0 && (
        <div className="flex gap-2 items-center">
          <Input
            placeholder={isRtl ? 'ابحث عن المورد...' : 'Rechercher un fournisseur...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          {searchQuery && (
            <Button
              size="sm"
              onClick={() => setSearchQuery('')}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Suppliers Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center p-12 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{t('common.no_data')}</p>
        </div>
      ) : (
        <>
          {(() => {
            const filteredSuppliers = suppliers.filter(supplier =>
              supplier.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            
            if (filteredSuppliers.length === 0 && searchQuery) {
              return (
                <div className="text-center p-12 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">{isRtl ? 'لا توجد نتائج' : 'Aucun résultat'}</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <AnimatePresence>
                  {filteredSuppliers.map((supplier, idx) => (
                    <motion.div
                      key={supplier.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group"
                    >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 px-6 py-4 border-b border-blue-200 dark:border-slate-700">
                  <h3 className="font-bold text-lg text-blue-900 dark:text-blue-100 truncate">{supplier.name}</h3>
                  <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">{supplier.company_name || 'N/A'}</p>
                </div>

                {/* Content */}
                <div className="flex-1 px-6 py-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t('common.phone')}</p>
                    <p className="text-sm font-medium text-foreground">{supplier.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t('common.address')}</p>
                    <p className="text-sm text-foreground line-clamp-2">{supplier.address || '-'}</p>
                  </div>
                  {supplier.nif && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">NIF</p>
                      <p className="text-sm font-mono text-foreground">{supplier.nif}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-6 pb-4 pt-2 mt-auto space-y-2">
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold"
                    onClick={() => fetchSupplierHistory(supplier)}
                  >
                    <History className="w-4 h-4 mr-2" /> {t('common.history') || 'Historique'}
                  </Button>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewSupplier(supplier)}
                      className="text-xs"
                      title={t('common.view')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(supplier)}
                      className="text-xs"
                      title={t('common.edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteId(supplier.id)}
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
            );
          })()}
        </>
      )}

      {/* View Supplier Dialog */}
      <Dialog open={!!viewSupplier} onOpenChange={() => setViewSupplier(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">👤 {viewSupplier?.name}</DialogTitle>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{viewSupplier?.company_name || 'N/A'}</p>
              </div>
            </div>
          </DialogHeader>

          {viewSupplier && (
            <div className="space-y-6 pr-6">
              {/* Main Info Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.phone')}</p>
                  <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{viewSupplier.phone || '-'}</p>
                </div>
                <div className="p-4 bg-indigo-50 dark:bg-slate-700 rounded-lg border border-indigo-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-2">{t('common.company_name')}</p>
                  <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">{viewSupplier.company_name || '-'}</p>
                </div>
              </div>

              {/* Address Section */}
              <div>
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                  {t('common.address')} {t('common.details') || 'Détails'}
                </h3>
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-foreground whitespace-pre-wrap">{viewSupplier.address || '-'}</p>
                </div>
              </div>

              {/* Tax and Registration Info */}
              <div className="grid grid-cols-2 gap-4">
                {viewSupplier.nif && (
                  <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">NIF</p>
                    <p className="text-lg font-mono font-bold text-foreground">{viewSupplier.nif}</p>
                  </div>
                )}
                {viewSupplier.nis && (
                  <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">NIS</p>
                    <p className="text-lg font-mono font-bold text-foreground">{viewSupplier.nis}</p>
                  </div>
                )}
                {viewSupplier.commercial_registration && (
                  <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">📋 {t('common.commercial_registration')}</p>
                    <p className="text-lg font-mono font-bold text-foreground">{viewSupplier.commercial_registration}</p>
                  </div>
                )}
                {viewSupplier.article && (
                  <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">{t('common.article')}</p>
                    <p className="text-lg font-bold text-foreground">{viewSupplier.article}</p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-muted-foreground">
                  📅 {t('common.created')}:{' '}
                  <span className="font-semibold">{new Date(viewSupplier.created_at).toLocaleDateString()}</span>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Supplier Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">
              {editingId ? `✏️ ${t('common.edit_supplier')}` : `➕ ${t('common.add_new_supplier')}`}
            </DialogTitle>
            <DialogDescription className="text-blue-700 dark:text-blue-300 mt-2">
              {editingId ? t('common.update_information') : t('common.manage_your_data')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pr-6">
            {/* Required Fields Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                {t('common.required_fields')} *
              </h3>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-3 uppercase tracking-wide">
                  {t('common.full_name')} *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('common.enter_name')}
                  className="text-sm border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-3 uppercase tracking-wide">
                  {t('common.phone')} *
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+213 555 123 456"
                  className="text-sm border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-3 uppercase tracking-wide">
                  {t('common.address')} *
                </label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t('common.enter_address')}
                  rows={3}
                  className="text-sm border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Optional Fields Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-indigo-600 to-blue-600 rounded" />
                {t('common.optional_fields')}
              </h3>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-3 uppercase tracking-wide">
                  {t('common.company_name')}
                </label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder={t('common.company_name')}
                  className="text-sm border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-3 uppercase tracking-wide">
                    NIF
                  </label>
                  <Input
                    value={formData.nif}
                    onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                    placeholder="NIF"
                    className="text-sm border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-3 uppercase tracking-wide">
                    NIS
                  </label>
                  <Input
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    placeholder="NIS"
                    className="text-sm border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-3 uppercase tracking-wide">
                  {t('common.commercial_registration')}
                </label>
                <Input
                  value={formData.commercial_registration}
                  onChange={(e) => setFormData({ ...formData, commercial_registration: e.target.value })}
                  placeholder="RC123456"
                  className="text-sm border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-3 uppercase tracking-wide">
                  {t('common.article')}
                </label>
                <Input
                  value={formData.article}
                  onChange={(e) => setFormData({ ...formData, article: e.target.value })}
                  placeholder={t('common.article')}
                  className="text-sm border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex gap-3">
            <Button 
              variant="outline" 
              onClick={resetForm}
              className="font-semibold border-blue-300 dark:border-blue-600"
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <Save className="w-4 h-4 mr-2" /> {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.delete_warning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Supplier History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={() => {
        setShowHistoryDialog(false);
        setHistorySupplier(null);
        setSupplierDebts([]);
        setSupplierBons([]);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <div>
              <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">📊 {t('common.history')}: {historySupplier?.name}</DialogTitle>
              <DialogDescription className="text-blue-700 dark:text-blue-300 mt-2">
                {t('common.all_suppliers')} - {t('common.manage_your_data')}
              </DialogDescription>
            </div>
          </DialogHeader>

          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-6 pr-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/30 rounded-lg border-2 border-amber-200 dark:border-amber-700 shadow-sm hover:shadow-md transition-all">
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3">{t('debt_management.total_debts')}</p>
                  <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                    {supplierDebts.reduce((sum, d) => sum + (d.remaining_balance || 0), 0).toLocaleString()} د.ج
                  </p>
                </div>
               
                <div className="p-5 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/30 rounded-lg border-2 border-red-200 dark:border-red-700 shadow-sm hover:shadow-md transition-all">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-3">{t('common.active_debts')}</p>
                  <p className="text-3xl font-bold text-red-900 dark:text-red-100">{supplierDebts.length}</p>
                </div>
              </div>

              {/* Debts Summary */}
              {supplierDebts.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-gradient-to-b from-red-600 to-rose-600 rounded" />
                    {t('common.active_debts')} ({supplierDebts.length})
                  </h3>
                  <div className="border border-red-200 dark:border-slate-600 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-red-100 to-rose-100 dark:from-slate-700 dark:to-slate-800 border-b border-red-200 dark:border-slate-600">
                          <th className="p-4 text-left text-sm font-bold text-red-950 dark:text-red-100">{t('debt_management.total_amount')}</th>
                          <th className="p-4 text-left text-sm font-bold text-red-950 dark:text-red-100">{t('debt_management.amount_paid')}</th>
                          <th className="p-4 text-left text-sm font-bold text-red-950 dark:text-red-100">{t('debt_management.remaining_amount')}</th>
                          <th className="p-4 text-left text-sm font-bold text-red-950 dark:text-red-100">{t('common.status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierDebts.map((debt, idx) => (
                          <tr
                            key={debt.id}
                            className={`border-b border-red-100 dark:border-slate-700 transition-colors ${
                              idx % 2 === 0
                                ? 'bg-white dark:bg-slate-800'
                                : 'bg-red-50 dark:bg-slate-700'
                            } hover:bg-red-100 dark:hover:bg-slate-600`}
                          >
                            <td className="p-4 font-semibold text-foreground">{debt.total_price.toLocaleString()} د.ج</td>
                            <td className="p-4 text-emerald-700 dark:text-emerald-300 font-semibold">{debt.amount_paid.toLocaleString()} د.ج</td>
                            <td className="p-4 text-red-700 dark:text-red-300 font-bold">{debt.remaining_balance.toLocaleString()} د.ج</td>
                            <td className="p-4">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                debt.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  : debt.status === 'partial'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              }`}>
                                {debt.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Total Debts */}
                  <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg border border-red-200 dark:border-red-700">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-red-600 dark:text-red-300 font-semibold mb-1">{t('debt_management.total_debts')}</p>
                        <p className="text-xl font-bold text-red-700 dark:text-red-300">
                          {supplierDebts.reduce((sum, d) => sum + d.total_price, 0).toLocaleString()} د.ج
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-300 font-semibold mb-1">{t('debt_management.amount_paid')}</p>
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                          {supplierDebts.reduce((sum, d) => sum + d.amount_paid, 0).toLocaleString()} د.ج
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-red-600 dark:text-red-300 font-semibold mb-1">{t('debt_management.remaining_amount')}</p>
                        <p className="text-xl font-bold text-red-700 dark:text-red-300">
                          {supplierDebts.reduce((sum, d) => sum + d.remaining_balance, 0).toLocaleString()} د.ج
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bons de Commande */}
              {supplierBons.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                    {t('dashboard.purchase_orders')} ({supplierBons.length})
                  </h3>
                  <div className="border border-blue-200 dark:border-slate-600 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-700 dark:to-slate-800 border-b border-blue-200 dark:border-slate-600">
                          <th className="p-4 text-left text-sm font-bold text-blue-950 dark:text-blue-100">{t('common.bon_id')}</th>
                          <th className="p-4 text-left text-sm font-bold text-blue-950 dark:text-blue-100">{t('common.date')}</th>
                          <th className="p-4 text-left text-sm font-bold text-blue-950 dark:text-blue-100">{t('common.total_amount')}</th>
                          <th className="p-4 text-left text-sm font-bold text-blue-950 dark:text-blue-100">{t('common.status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierBons.map((bon, idx) => (
                          <tr
                            key={bon.id}
                            className={`border-b border-blue-100 dark:border-slate-700 transition-colors ${
                              idx % 2 === 0
                                ? 'bg-white dark:bg-slate-800'
                                : 'bg-blue-50 dark:bg-slate-700'
                            } hover:bg-blue-100 dark:hover:bg-slate-600`}
                          >
                            <td className="p-4 font-semibold text-blue-900 dark:text-blue-100">{bon.bon_id}</td>
                            <td className="p-4 text-foreground">{new Date(bon.created_at).toLocaleDateString()}</td>
                            <td className="p-4 font-bold text-blue-700 dark:text-blue-300">{bon.total_with_tva.toLocaleString()} د.ج</td>
                            <td className="p-4">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                bon.status === 'validated'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  : bon.status === 'pending'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              }`}>
                                {bon.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {supplierDebts.length === 0 && supplierBons.length === 0 && (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">{t('common.no_history')}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
