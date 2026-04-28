import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Edit3, Trash2, CreditCard, Eye, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ============================================================================
// INTERFACES
// ============================================================================

interface BonCommande {
  id: string;
  bon_id: string;
  total_price: number;
  supplier_name?: string;
}

interface Debt {
  id: string;
  user_id: string;
  bon_commande_id: string;
  supplier_name: string;
  total_price: number;
  amount_paid: number;
  remaining_balance: number;
  status: 'pending' | 'partial' | 'paid';
  description?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

interface DebtPayment {
  id: string;
  debt_id: string;
  amount_paid: number;
  description?: string;
  payment_date: string;
  payment_method: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DebtsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // ==================== STATE VARIABLES ====================
  const [debts, setDebts] = useState<Debt[]>([]);
  const [bonsCommandes, setBonsCommandes] = useState<BonCommande[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Create Debt Form State
  const [showCreateDebt, setShowCreateDebt] = useState(false);
  const [searchBon, setSearchBon] = useState('');
  const [selectedBonData, setSelectedBonData] = useState<BonCommande | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [initialPayment, setInitialPayment] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [debtDescription, setDebtDescription] = useState('');
  const [calculatedRemainingOnCreate, setCalculatedRemainingOnCreate] = useState(0);

  // Edit Debt State
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [editSupplierName, setEditSupplierName] = useState('');
  const [editTotalPrice, setEditTotalPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  // Delete Debt State
  const [deletingDebtId, setDeletingDebtId] = useState<string | null>(null);

  // Pay Debt State
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [calculatedRemaining, setCalculatedRemaining] = useState(0);

  // View Debt Payments State
  const [viewPaymentsDebtId, setViewPaymentsDebtId] = useState<string | null>(null);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);

  // ==================== FETCH DATA ====================
  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setMessage('');

      // Fetch debts
      const { data: debtsData, error: debtsError } = await supabase
        .from('debts')
        .select('*')
        .order('created_at', { ascending: false });

      if (debtsError) {
        console.debug('Debts fetch error:', debtsError);
        setDebts([]);
      } else {
        setDebts(debtsData || []);
      }

      // Fetch bons de commandes with supplier information
      const { data: bonsData, error: bonsError } = await supabase
        .from('bons_commandes')
        .select(`
          id, 
          bon_id, 
          total_price,
          supplier_name,
          bons_commandes_offers (
            supplier_name
          )
        `)
        .order('created_at', { ascending: false });

      if (bonsError) {
        console.debug('Bons commandes fetch error:', bonsError);
        setBonsCommandes([]);
      } else {
        const mappedBons = (bonsData || []).map((bon: any) => ({
          ...bon,
          supplier_name: bon.bons_commandes_offers?.[0]?.supplier_name || bon.supplier_name || 'To be assigned'
        }));
        setBonsCommandes(mappedBons);
      }
    } catch (err: any) {
      console.debug('Data fetch exception:', err?.message);
      setDebts([]);
      setBonsCommandes([]);
    } finally {
      setLoading(false);
    }
  };

  // ==================== FILTERED BONS COMMANDES ====================
  const filteredBons = bonsCommandes.filter(b =>
    b.id.toLowerCase().includes(searchBon.toLowerCase()) ||
    b.bon_id.toLowerCase().includes(searchBon.toLowerCase()) ||
    b.total_price.toString().includes(searchBon) ||
    (b.supplier_name && b.supplier_name.toLowerCase().includes(searchBon.toLowerCase()))
  );

  // ==================== HANDLERS ====================

  const handleSelectBon = (bon: BonCommande) => {
    setSelectedBonData(bon);
    setTotalPrice(bon.total_price.toString());
    const supplierNameToSet = bon.supplier_name && bon.supplier_name !== 'To be assigned' 
      ? bon.supplier_name 
      : '';
    setSupplierName(supplierNameToSet);
    setSearchBon('');
  };

  // Calculate remaining balance when initial payment changes
  useEffect(() => {
    if (totalPrice) {
      const total = parseFloat(totalPrice) || 0;
      const initial = parseFloat(initialPayment) || 0;
      setCalculatedRemainingOnCreate(Math.max(0, total - initial));
    }
  }, [totalPrice, initialPayment]);

  const handleCreateDebt = async () => {
    if (!selectedBonData || !supplierName || !totalPrice) {
      setMessage(t('debt_management.fill_all_fields'));
      setMessageType('error');
      return;
    }

    const initial = parseFloat(initialPayment) || 0;
    const total = parseFloat(totalPrice) || 0;

    if (initial > total) {
      setMessage(t('debt_management.payment_amount_validation'));
      setMessageType('error');
      return;
    }

    try {
      const { error } = await supabase.from('debts').insert({
        user_id: user?.id || 'admin',
        bon_commande_id: selectedBonData.id,
        supplier_name: supplierName,
        total_price: total,
        amount_paid: initial,
        description: debtDescription,
        due_date: dueDate || null
      });

      if (error) throw error;

      setMessage(t('debt_management.debt_created'));
      setMessageType('success');
      resetCreateForm();
      setShowCreateDebt(false);
      await fetchData();
    } catch (error: any) {
      setMessage(error.message || t('common.error'));
      setMessageType('error');
    }
  };

  const handleEditDebt = async () => {
    if (!editingDebt || !editSupplierName || !editTotalPrice) {
      setMessage(t('debt_management.fill_all_fields'));
      setMessageType('error');
      return;
    }

    try {
      const { error } = await supabase
        .from('debts')
        .update({
          supplier_name: editSupplierName,
          total_price: parseFloat(editTotalPrice),
          description: editDescription,
          due_date: editDueDate || null
        })
        .eq('id', editingDebt.id);

      if (error) throw error;

      setMessage(t('debt_management.debt_updated'));
      setMessageType('success');
      setEditingDebt(null);
      await fetchData();
    } catch (error: any) {
      setMessage(error.message || t('common.error'));
      setMessageType('error');
    }
  };

  const handleDeleteDebt = async () => {
    if (!deletingDebtId) return;

    try {
      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', deletingDebtId);

      if (error) throw error;

      setMessage(t('debt_management.debt_deleted'));
      setMessageType('success');
      setDeletingDebtId(null);
      await fetchData();
    } catch (error: any) {
      setMessage(error.message || t('common.error'));
      setMessageType('error');
    }
  };

  const openPayDialog = (debt: Debt) => {
    setPayingDebt(debt);
    setPayingDebtId(debt.id);
    setPaymentAmount('');
    setPaymentDescription('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setCalculatedRemaining(debt.remaining_balance);
  };

  // Calculate remaining when payment amount changes
  useEffect(() => {
    if (payingDebt) {
      const payment = parseFloat(paymentAmount) || 0;
      setCalculatedRemaining(Math.max(0, payingDebt.remaining_balance - payment));
    }
  }, [paymentAmount, payingDebt]);

  const handlePayDebt = async () => {
    if (!payingDebt || !payingDebtId || !paymentAmount) {
      setMessage(t('debt_management.fill_all_fields'));
      setMessageType('error');
      return;
    }

    const payment = parseFloat(paymentAmount);

    if (payment <= 0 || payment > payingDebt.remaining_balance) {
      setMessage(t('debt_management.payment_amount_validation'));
      setMessageType('error');
      return;
    }

    try {
      // Insert payment record
      const { error: paymentError } = await supabase.from('debt_payments').insert({
        debt_id: payingDebtId,
        user_id: user?.id || 'admin',
        amount_paid: payment,
        payment_method: paymentMethod,
        description: paymentDescription,
        payment_date: new Date(paymentDate).toISOString()
      });

      if (paymentError) throw paymentError;

      // Update debt amount_paid
      const { error: debtError } = await supabase
        .from('debts')
        .update({
          amount_paid: payingDebt.amount_paid + payment
        })
        .eq('id', payingDebtId);

      if (debtError) throw debtError;

      setMessage(t('debt_management.payment_recorded'));
      setMessageType('success');
      setPayingDebtId(null);
      setPayingDebt(null);
      await fetchData();
    } catch (error: any) {
      setMessage(error.message || t('common.error'));
      setMessageType('error');
    }
  };

  const handleViewPayments = async (debtId: string) => {
    try {
      const { data, error } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('debt_id', debtId)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      setDebtPayments(data || []);
      setViewPaymentsDebtId(debtId);
    } catch (error: any) {
      setMessage(error.message || t('common.error'));
      setMessageType('error');
    }
  };

  const resetCreateForm = () => {
    setSearchBon('');
    setSelectedBonData(null);
    setSupplierName('');
    setTotalPrice('');
    setInitialPayment('');
    setDueDate('');
    setDebtDescription('');
    setCalculatedRemainingOnCreate(0);
  };

  const openEditDialog = (debt: Debt) => {
    setEditingDebt(debt);
    setEditSupplierName(debt.supplier_name);
    setEditTotalPrice(debt.total_price.toString());
    setEditDescription(debt.description || '');
    setEditDueDate(debt.due_date ? debt.due_date.split('T')[0] : '');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-red-100 text-red-800';
      case 'overdue': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return '✓';
      case 'partial': return '⏱';
      case 'pending': return '⚠';
      default: return '📄';
    }
  };

  const calculateRemainingPercent = (debt: Debt, paymentAmountStr: string) => {
    const payment = parseFloat(paymentAmountStr) || 0;
    const newRemaining = debt.remaining_balance - payment;
    const percent = (newRemaining / debt.total_price) * 100;
    return percent.toFixed(1);
  };

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-1">
          {t('debt_management.add_new_debt') || 'Gestion des Dettes'}
        </h1>
        <p className="text-muted-foreground text-sm">{new Date().toLocaleDateString()}</p>
      </motion.div>

      {/* Message Alert */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border-l-4 flex items-center gap-3 ${
            messageType === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-600 dark:border-emerald-400 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-900/20 border-red-600 dark:border-red-400 text-red-800 dark:text-red-200'
          }`}
        >
          {messageType === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          {message}
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={() => setShowCreateDebt(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {t('debt_management.add_new_debt')}
        </Button>
      </div>

      {/* Debts Grid */}
      {debts.length === 0 ? (
        <div className="text-center p-12 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{t('debt_management.no_debts') || 'No debts found'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {debts.map((debt, index) => (
              <motion.div
                key={debt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="erp-card hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
              >
                {/* Card Header with gradient - Improved styling */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-800 -mx-6 -mt-6 px-6 py-5 mb-5 rounded-t-lg border-b-2 border-blue-700 dark:border-indigo-700">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-white truncate">{debt.supplier_name}</h3>
                      <p className="text-sm text-blue-100 mt-1 truncate">{debt.description || 'No description'}</p>
                    </div>
                    <Badge className={getStatusColor(debt.status)} style={{ minWidth: 'fit-content' }}>
                      {debt.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 space-y-4">
                  {/* Financial Summary */}
                  <div className="px-6">
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-700 rounded-lg border border-blue-200 dark:border-slate-600 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{t('debt_management.total_amount')}:</span>
                        <span className="font-bold text-blue-700 dark:text-blue-300">{debt.total_price.toLocaleString()} DA</span>
                      </div>
                      <div className="h-2 bg-slate-300 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700"
                          style={{ width: `${(debt.amount_paid / debt.total_price) * 100}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-200 dark:border-slate-600">
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1">{t('debt_management.amount_paid')}</p>
                          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{debt.amount_paid.toLocaleString()} DA</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1">{t('debt_management.remaining_amount')}</p>
                          <p className={`text-sm font-bold ${debt.remaining_balance === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                            {debt.remaining_balance.toLocaleString()} DA
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Due Date */}
                  {debt.due_date && (
                    <div className="px-6 text-xs text-muted-foreground">
                      <p>📅 {t('common.date')}: {new Date(debt.due_date).toLocaleDateString()}</p>
                    </div>
                  )}

                  {/* Status Indicator */}
                  <div className="px-6">
                    <div className={`flex items-center gap-2 p-2 rounded border ${
                      debt.status === 'paid'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
                        : debt.status === 'partial'
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                    }`}>
                      <span className={`text-xs font-semibold ${
                        debt.status === 'paid'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : debt.status === 'partial'
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {getStatusIcon(debt.status)} {debt.status === 'pending' ? 'Pending Payment' : debt.status === 'partial' ? 'Partially Paid' : 'Fully Paid'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Improved layout */}
                <div className="px-6 pb-4 pt-2 mt-auto space-y-2">
                  {debt.remaining_balance > 0 && (
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold"
                      onClick={() => openPayDialog(debt)}
                      title={t('debt_management.pay_debt')}
                    >
                      <CreditCard className="w-4 h-4 mr-2" /> {t('debt_management.pay_debt')}
                    </Button>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewPayments(debt.id)}
                      className="text-xs"
                      title={t('debt_management.payment_records')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(debt)}
                      className="text-xs"
                      title={t('common.edit')}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeletingDebtId(debt.id)}
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

      {/* ==================== DIALOGS ==================== */}

      {/* Create Debt Dialog */}
      <Dialog open={showCreateDebt} onOpenChange={setShowCreateDebt}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-lg -mx-6 -mt-6 mb-4">
            <DialogTitle className="text-white text-lg">
              📋 {t('debt_management.create_debt')}
            </DialogTitle>
            <DialogDescription className="text-blue-100">
              {t('debt_management.search_bon_commande')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Search Section */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-5">
              <label className="text-sm font-semibold text-blue-900 dark:text-blue-100 block mb-3">
                🔍 {t('debt_management.search_by_id_amount')}
              </label>
              <div className="relative">
                <Input
                  placeholder={t('debt_management.search_by_id_amount')}
                  value={searchBon}
                  onChange={(e) => setSearchBon(e.target.value)}
                  className="text-sm border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                />
                {searchBon && filteredBons.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto mt-2">
                    {filteredBons.map((bon) => (
                      <div
                        key={bon.id}
                        onClick={() => handleSelectBon(bon)}
                        className="p-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer text-sm border-b last:border-b-0 transition-colors"
                      >
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{bon.bon_id}</div>
                        {bon.supplier_name && bon.supplier_name !== 'To be assigned' && (
                          <div className="text-muted-foreground text-xs">
                            {t('debt_management.supplier_name')}: {bon.supplier_name}
                          </div>
                        )}
                        <div className="text-muted-foreground text-xs font-semibold text-blue-700 dark:text-blue-400">
                          {bon.total_price.toLocaleString()} DA
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedBonData && (
                <div className="mt-4 p-4 bg-white dark:bg-slate-800 border-2 border-emerald-400 dark:border-emerald-600 rounded-lg">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-2">✓ Selected:</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedBonData.bon_id}</p>
                  {selectedBonData.supplier_name && selectedBonData.supplier_name !== 'To be assigned' && (
                    <p className="text-xs text-muted-foreground">
                      {t('debt_management.supplier_name')}: {selectedBonData.supplier_name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Amount: {selectedBonData.total_price.toLocaleString()} DA
                  </p>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    {t('debt_management.supplier_name')} *
                  </label>
                  <Input
                    placeholder={t('debt_management.supplier_name')}
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    {t('debt_management.total_amount')} *
                  </label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    step="0.01"
                    min="0"
                    className="text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    {t('debt_management.amount_paid')} ({t('common.optional')})
                  </label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={initialPayment}
                    onChange={(e) => setInitialPayment(e.target.value)}
                    step="0.01"
                    min="0"
                    max={totalPrice}
                    className="text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    {t('common.date')} ({t('common.optional')})
                  </label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                  {t('common.description')} ({t('common.optional')})
                </label>
                <Input
                  placeholder={t('common.description')}
                  value={debtDescription}
                  onChange={(e) => setDebtDescription(e.target.value)}
                  className="text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {initialPayment && (
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-300 dark:border-emerald-600 rounded-lg">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">{t('debt_management.remaining_amount')}:</span>
                  </p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                    {calculatedRemainingOnCreate.toLocaleString()} DA
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDebt(false);
                resetCreateForm();
              }}
              className="font-semibold"
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
              onClick={handleCreateDebt}
            >
              <Plus className="w-4 h-4 mr-2" /> {t('debt_management.create_debt')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Debt Dialog */}
      <Dialog open={!!editingDebt} onOpenChange={() => setEditingDebt(null)}>
        <DialogContent className="max-w-md bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-lg -mx-6 -mt-6 mb-4">
            <DialogTitle className="text-white text-lg">
              ✏️ {t('debt_management.edit_debt')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                {t('debt_management.supplier_name')}
              </label>
              <Input
                placeholder={t('debt_management.supplier_name')}
                value={editSupplierName}
                onChange={(e) => setEditSupplierName(e.target.value)}
                className="text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                {t('debt_management.total_amount')}
              </label>
              <Input
                type="number"
                placeholder={t('debt_management.total_amount')}
                value={editTotalPrice}
                onChange={(e) => setEditTotalPrice(e.target.value)}
                step="0.01"
                className="text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                {t('common.date')}
              </label>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                {t('common.description')}
              </label>
              <Input
                placeholder={t('common.description')}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setEditingDebt(null)}
              className="font-semibold"
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold"
              onClick={handleEditDebt}
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Debt Dialog */}
      <Dialog open={!!deletingDebtId} onOpenChange={() => setDeletingDebtId(null)}>
        <DialogContent className="max-w-md bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <DialogHeader className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-4 rounded-t-lg -mx-6 -mt-6 mb-4">
            <DialogTitle className="text-white text-lg">
              🗑️ {t('debt_management.delete_debt')}
            </DialogTitle>
            <DialogDescription className="text-red-100">
              {t('debt_management.confirm_delete_warning')}
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-slate-600 dark:text-slate-400 py-4">
            {t('debt_management.confirm_delete_warning')}
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingDebtId(null)}
              className="font-semibold"
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold"
              onClick={handleDeleteDebt}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Debt Dialog - Improved Design */}
      <Dialog open={!!payingDebtId} onOpenChange={() => {
        setPayingDebtId(null);
        setPayingDebt(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <DialogHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 rounded-t-lg -mx-6 -mt-6 mb-4">
            <DialogTitle className="text-white text-lg">
              💳 {t('debt_management.record_payment')}
            </DialogTitle>
            <DialogDescription className="text-emerald-100">
              {payingDebt?.supplier_name}
            </DialogDescription>
          </DialogHeader>

          {payingDebt && (
            <div className="space-y-6">
              {/* Summary Section */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-300 dark:border-emerald-600 rounded-xl p-5">
                <h3 className="font-bold text-lg text-emerald-900 dark:text-emerald-100 mb-4">📊 {t('common.summary')}</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold mb-1">{t('debt_management.total_amount')}</p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{payingDebt.total_price.toLocaleString()} DA</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-teal-200 dark:border-teal-700">
                    <p className="text-xs text-teal-700 dark:text-teal-300 font-semibold mb-1">{t('debt_management.amount_paid')}</p>
                    <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">{payingDebt.amount_paid.toLocaleString()} DA</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-500 to-rose-500 rounded-lg p-4 border border-red-600">
                    <p className="text-xs text-white font-semibold mb-1">{t('debt_management.remaining_amount')}</p>
                    <p className="text-2xl font-bold text-white">{payingDebt.remaining_balance.toLocaleString()} DA</p>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-5 space-y-5">
                <h3 className="font-bold text-lg text-blue-900 dark:text-blue-100 mb-4">💰 {t('debt_management.payment_description')}</h3>

                {/* Payment Amount */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    {t('debt_management.amount_paid')} (Max: {payingDebt.remaining_balance.toLocaleString()} DA) *
                  </label>
                  <Input
                    type="number"
                    placeholder={`Enter amount up to ${payingDebt.remaining_balance.toLocaleString()}`}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    max={payingDebt.remaining_balance}
                    className="text-sm border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {paymentAmount && (
                    <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-700 shadow-sm">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-semibold">{t('debt_management.remaining_amount')} After Payment:</span>
                      </p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                        {calculatedRemaining.toLocaleString()} DA
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment Date */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    {t('common.date')} *
                  </label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="text-sm border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    {t('debt_management.payment_description')} ({t('common.payment_method')}) *
                  </label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v)}>
                    <SelectTrigger className="text-sm border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Select payment method..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">💵 Cash / النقد</SelectItem>
                      <SelectItem value="check">🏦 Check / الشيك</SelectItem>
                      <SelectItem value="transfer">💳 Bank Transfer / التحويل البنكي</SelectItem>
                      <SelectItem value="other">📝 Other / أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Description */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    {t('common.description')} ({t('common.optional')})
                  </label>
                  <Input
                    placeholder="Add any notes or references about this payment..."
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    className="text-sm border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Payment Progress */}
              {paymentAmount && (
                <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-5">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Payment Progress</p>
                  <div className="space-y-2">
                    <div className="w-full h-3 bg-slate-300 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                        style={{ width: `${((payingDebt.amount_paid + parseFloat(paymentAmount)) / payingDebt.total_price) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span>{((payingDebt.amount_paid + parseFloat(paymentAmount)) / payingDebt.total_price * 100).toFixed(1)}% Paid</span>
                      <span>{calculateRemainingPercent(payingDebt, paymentAmount)}% Remaining</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setPayingDebtId(null);
                setPayingDebt(null);
                setPaymentAmount('');
                setPaymentDescription('');
              }}
              className="font-semibold"
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
              onClick={handlePayDebt}
            >
              <CreditCard className="w-4 h-4 mr-2" /> {t('debt_management.record_payment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Payments Dialog */}
      <Dialog open={!!viewPaymentsDebtId} onOpenChange={() => {
        setViewPaymentsDebtId(null);
        setDebtPayments([]);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-lg -mx-6 -mt-6 mb-4">
            <DialogTitle className="text-white text-lg">
              📜 {t('debt_management.payment_records')}
            </DialogTitle>
            <DialogDescription className="text-blue-100">
              Payment history and details
            </DialogDescription>
          </DialogHeader>

          {debtPayments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t('debt_management.no_payments_recorded') || 'No payments recorded'}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {debtPayments.map((payment, index) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="flex-1">
                      <p className="font-bold text-emerald-700 dark:text-emerald-300 text-lg">
                        {payment.amount_paid.toLocaleString()} DA
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        📅 {new Date(payment.payment_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <Badge className="bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 font-semibold">
                      {payment.payment_method}
                    </Badge>
                  </div>
                  {payment.description && (
                    <div className="p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {payment.description}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold"
              onClick={() => {
                setViewPaymentsDebtId(null);
                setDebtPayments([]);
              }}
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
