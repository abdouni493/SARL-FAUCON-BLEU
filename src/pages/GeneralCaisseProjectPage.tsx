import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, Edit, Trash2, Eye, Search, TrendingDown, TrendingUp, Loader, X, Download } from 'lucide-react';
import { formatDate } from '@/utils/dateFormatter';

interface CashTransaction {
  id: string;
  transaction_id: string;
  amount: number;
  transaction_type: 'versement' | 'retrait' | 'dépense';
  description: string;
  transaction_date: string;
  category: string;
  reference_project_box_id?: string;
  created_at: string;
  created_by_id: string;
}

interface Project {
  id: string;
  name: string;
}

export default function GeneralCaisseProjectPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRtl = i18n.language === 'ar';

  // Transaction type configuration with translation keys
  const getTransactionTypes = () => ({
    'versement': { label: t('cashbox.versement'), className: 'bg-green-100 text-green-700', icon: '⬇️' },
    'retrait': { label: t('cashbox.retrait'), className: 'bg-orange-100 text-orange-700', icon: '⬆️' },
    'dépense': { label: t('cashbox.expense'), className: 'bg-red-100 text-red-700', icon: '💰' }
  });

  // Categories with translation keys
  const getCategories = () => [
    { value: 'frais_generaux', label: t('cashbox.general_fees') },
    { value: 'salaires', label: t('cashbox.salaries') },
    { value: 'materiel', label: t('cashbox.equipment') },
    { value: 'transport', label: t('cashbox.transport') },
    { value: 'autre', label: t('common.other') }
  ];

  // State management
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [showForm, setShowForm] = useState(false);
  const [viewTransaction, setViewTransaction] = useState<CashTransaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [form, setForm] = useState({
    amount: 0,
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_type: 'versement' as 'versement' | 'retrait' | 'dépense',
    category: 'frais_generaux',
    reference_project_box_id: ''
  });

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('general_cash_box')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setMessage('Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch projects for dropdown
  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('project_boxes')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchProjects();
  }, []);

  // Handle form submission
  const handleSave = async () => {
    if (!form.amount || !form.description || !form.transaction_date) {
      setMessage('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const transactionId = `GCB${Date.now()}`;

      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('general_cash_box')
          .update({
            amount: form.amount,
            description: form.description,
            transaction_date: form.transaction_date,
            transaction_type: form.transaction_type,
            category: form.category,
            reference_project_box_id: form.reference_project_box_id || null
          })
          .eq('id', editingId);

        if (error) throw error;
        setMessage('Transaction modifiée avec succès');
      } else {
        // Create new
        const { error } = await supabase
          .from('general_cash_box')
          .insert({
            transaction_id: transactionId,
            amount: form.amount,
            description: form.description,
            transaction_date: form.transaction_date,
            transaction_type: form.transaction_type,
            category: form.category,
            reference_project_box_id: form.reference_project_box_id || null,
            created_by_id: user?.id,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        setMessage('Transaction créée avec succès');
      }

      resetForm();
      setShowForm(false);
      await fetchTransactions();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving transaction:', error);
      setMessage('Erreur lors de la sauvegarde');
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('general_cash_box')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage('Transaction supprimée');
      setDeletingId(null);
      await fetchTransactions();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting:', error);
      setMessage('Erreur lors de la suppression');
    }
  };

  const openEdit = (transaction: CashTransaction) => {
    setForm({
      amount: transaction.amount,
      description: transaction.description,
      transaction_date: transaction.transaction_date,
      transaction_type: transaction.transaction_type,
      category: transaction.category,
      reference_project_box_id: transaction.reference_project_box_id || ''
    });
    setEditingId(transaction.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      amount: 0,
      description: '',
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: 'versement',
      category: 'frais_generaux',
      reference_project_box_id: ''
    });
    setEditingId(null);
  };

  // Calculations
  const totalVersements = transactions
    .filter(t => t.transaction_type === 'versement')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRetraits = transactions
    .filter(t => t.transaction_type === 'retrait')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDepenses = transactions
    .filter(t => t.transaction_type === 'dépense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalVersements - totalRetraits - totalDepenses;

  // Filter transactions
  const filteredTransactions = transactions.filter(t =>
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.transaction_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 ${isRtl ? 'rtl' : 'ltr'}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">{t('general_cash_box.title')}</h1>
          </div>
          <p className="text-gray-600">{t('general_cash_box.description')}</p>
        </div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="mb-6 flex gap-4 flex-col md:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              placeholder={t('general_cash_box.search_transaction')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('general_cash_box.new_transaction')}
          </Button>
        </div>

        {/* Transactions List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucune transaction trouvée</p>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
            >
              {filteredTransactions.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow h-full">
                    <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg pb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge className={getTransactionTypes()[transaction.transaction_type].className}>
                            {getTransactionTypes()[transaction.transaction_type].label}
                          </Badge>
                          <p className="text-sm mt-2 opacity-90">{transaction.transaction_id}</p>
                        </div>
                        <span className="text-3xl font-bold">{transaction.amount.toLocaleString()}</span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6">
                      <p className="font-semibold text-lg text-gray-800 mb-3">{transaction.description}</p>
                      <div className="space-y-2 text-sm text-gray-600 mb-6">
                        <p>📅 {formatDate(transaction.transaction_date)}</p>
                        <p>🏷️ {getCategories().find(c => c.value === transaction.category)?.label || transaction.category}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => setViewTransaction(transaction)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => openEdit(transaction)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => setDeletingId(transaction.id)}
                          variant="outline"
                          size="sm"
                          className="flex-1 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t('general_cash_box.edit_transaction') : t('general_cash_box.new_transaction')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('cashbox.transaction_type')} *
              </label>
              <select
                value={form.transaction_type}
                onChange={(e) => setForm({ ...form, transaction_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="versement">{t('cashbox.versement')}</option>
                <option value="retrait">{t('cashbox.retrait')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('common.amount')} * (DA)
              </label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRtl ? 'التاريخ' : 'Date'} *
              </label>
              <Input
                type="date"
                value={form.transaction_date}
                onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRtl ? 'الوصف' : 'Description'} *
              </label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={isRtl ? 'أدخل الوصف' : 'Entrez la description'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              {editingId ? t('common.edit') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {viewTransaction && (
        <Dialog open={!!viewTransaction} onOpenChange={() => setViewTransaction(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
              <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">{t('general_cash_box.transaction_details')}</DialogTitle>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">معلومات المعاملة الكاملة</p>
            </DialogHeader>

            <div className="space-y-6 pr-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2 block">{t('general_cash_box.transaction_type')}</label>
                  <p className="text-lg font-bold text-foreground">{getTransactionTypes()[viewTransaction.transaction_type].label}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2 block">Transaction ID</label>
                  <p className="text-lg font-bold text-foreground">{viewTransaction.transaction_id}</p>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-lg border-2 border-emerald-200 dark:border-emerald-700">
                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2 block">{t('general_cash_box.amount')}</label>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{viewTransaction.amount.toLocaleString()} DA</p>
              </div>

              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-2 block">{t('general_cash_box.description')}</label>
                <p className="text-foreground">{viewTransaction.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 block">{t('common.date')}</label>
                  <p className="text-lg font-bold text-foreground">{formatDate(viewTransaction.transaction_date)}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 block">{t('general_cash_box.category')}</label>
                  <p className="text-lg font-bold text-foreground">
                    {viewTransaction.category === 'frais_generaux' && t('general_cash_box.frais_generaux')}
                    {viewTransaction.category === 'salaires' && t('general_cash_box.salaires')}
                    {viewTransaction.category === 'materiel' && t('general_cash_box.materiel')}
                    {viewTransaction.category === 'transport' && t('general_cash_box.transport')}
                    {viewTransaction.category === 'autre' && t('general_cash_box.autre')}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewTransaction(null)}>{t('common.close')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('general_cash_box.delete_transaction')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('general_cash_box.are_you_sure')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
