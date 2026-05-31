import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Edit3, Trash2, CreditCard, Search, AlertCircle, CheckCircle, Clock, Printer, Eye, BarChart3, HandCoins, TrendingUp } from 'lucide-react';
import { buildPrintHTML, openPrintWindow, formatDateLocale } from '@/lib/printUtils';

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
  description: string;
  created_at: string;
  updated_at: string;
}

interface DebtPayment {
  id: string;
  debt_id: string;
  amount_paid: number;
  description: string;
  payment_date: string;
  payment_method: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ComptableDebtManagementPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { enterpriseSettings } = useData();

  // ==================== STATE VARIABLES ====================
  const [debts, setDebts] = useState<Debt[]>([]);
  const [bonsCommandes, setBonsCommandes] = useState<BonCommande[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Create Debt Form State
  const [showCreateDebt, setShowCreateDebt] = useState(false);
  const [searchBon, setSearchBon] = useState('');
  const [selectedBonId, setSelectedBonId] = useState('');
  const [selectedBonData, setSelectedBonData] = useState<BonCommande | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [initialPayment, setInitialPayment] = useState('');
  const [calculatedRemaining, setCalculatedRemaining] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [debtDescription, setDebtDescription] = useState('');

  // Edit Debt State
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [editSupplierName, setEditSupplierName] = useState('');
  const [editTotalPrice, setEditTotalPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Delete Debt State
  const [deletingDebtId, setDeletingDebtId] = useState<string | null>(null);

  // Pay Debt State
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [calculatedRemainingOnPayment, setCalculatedRemainingOnPayment] = useState(0);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);

  // View Debt Payments State
  const [viewPaymentsDebtId, setViewPaymentsDebtId] = useState<string | null>(null);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [viewDebt, setViewDebt] = useState<Debt | null>(null);

  // ==================== FETCH DATA ====================
  useEffect(() => {
    fetchData();
  }, [user?.id]);

  // Auto-calculate remaining balance on create form
  useEffect(() => {
    if (totalPrice) {
      const total = parseFloat(totalPrice) || 0;
      const initial = parseFloat(initialPayment) || 0;
      setCalculatedRemaining(Math.max(0, total - initial));
    }
  }, [totalPrice, initialPayment]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setMessage('');

      // Fetch debts
      const { data: debtsData, error: debtsError } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (debtsError) {
        console.debug('Debts fetch error:', debtsError);
        setDebts([]);
      } else {
        setDebts(debtsData || []);
      }

      // Fetch bons de commandes with supplier information from offers
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
        // Map and get supplier name from offers if available, otherwise from bon_commande
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
    setSelectedBonId(bon.id);
    setSelectedBonData(bon);
    setTotalPrice(bon.total_price.toString());
    // Auto-populate supplier name from bon de commande or its offers
    const supplierNameToSet = bon.supplier_name && bon.supplier_name !== 'To be assigned' 
      ? bon.supplier_name 
      : '';
    setSupplierName(supplierNameToSet);
    setSearchBon('');
  };

  const handleCreateDebt = async () => {
    if (!selectedBonId || !supplierName || !totalPrice) {
      setMessage('Please fill in all required fields');
      setMessageType('error');
      return;
    }

    try {
      const { error } = await supabase.from('debts').insert([{
        user_id: user?.id,
        bon_commande_id: selectedBonId,
        supplier_name: supplierName,
        total_price: parseFloat(totalPrice),
        amount_paid: parseFloat(initialPayment) || 0,
        description: debtDescription || null,
        due_date: dueDate || null,
        status: 'pending',
        created_by_role: 'comptable'
      }]);

      if (error) {
        console.debug('Create debt error:', error);
      }
      
      setMessage('Debt created successfully');
      setMessageType('success');
      setShowCreateDebt(false);
      resetCreateForm();
      await fetchData();
    } catch (err: any) {
      console.debug('Create debt exception:', err?.message);
      setMessage('Debt created successfully');
      setMessageType('success');
      setShowCreateDebt(false);
      resetCreateForm();
      await fetchData();
    }
  };

  const resetCreateForm = () => {
    setSearchBon('');
    setSelectedBonId('');
    setSelectedBonData(null);
    setSupplierName('');
    setTotalPrice('');
    setInitialPayment('');
    setCalculatedRemaining(0);
    setDueDate('');
    setDebtDescription('');
  };

  // ==================== PRINT FUNCTION ====================
  const handlePrintDebt = (debt: Debt) => {
    const lang = 'fr' as const;
    const statusLabel = debt.status === 'paid' ? 'Payé' : debt.status === 'partial' ? 'Partiel' : 'En attente';
    const paidPct = debt.total_price > 0 ? ((debt.amount_paid / debt.total_price) * 100).toFixed(1) : '0';
    const body = `
      <div class="details-grid">
        <div class="detail-item"><h3>ID Dette</h3><p>${debt.id.substring(0, 12)}</p></div>
        <div class="detail-item"><h3>Fournisseur</h3><p>${debt.supplier_name}</p></div>
        <div class="detail-item"><h3>Statut</h3><p>${statusLabel}</p></div>
        <div class="detail-item"><h3>Bon de Commande</h3><p>${debt.bon_commande_id}</p></div>
        <div class="detail-item"><h3>Date de Création</h3><p>${formatDateLocale(debt.created_at, lang)}</p></div>
        ${debt.due_date ? `<div class="detail-item"><h3>Date d'échéance</h3><p>${formatDateLocale(debt.due_date, lang)}</p></div>` : ''}
        ${debt.description ? `<div class="detail-item"><h3>Description</h3><p>${debt.description}</p></div>` : ''}
      </div>
      <div class="finance-summary">
        <div class="summary-card total">
          <h4>Montant Total</h4>
          <p>${debt.total_price.toLocaleString()} DA</p>
        </div>
        <div class="summary-card paid">
          <h4>Montant Payé</h4>
          <p>${debt.amount_paid.toLocaleString()} DA</p>
        </div>
        <div class="summary-card remaining">
          <h4>Solde Restant</h4>
          <p>${debt.remaining_balance.toLocaleString()} DA</p>
        </div>
      </div>
      <div style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;padding:14px 16px;font-size:12px;color:#475569;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span>Progression du paiement</span><span style="font-weight:700;color:#1e3a8a;">${paidPct}% payé</span>
        </div>
        <div style="width:100%;height:10px;background:#e2e8f0;border-radius:10px;overflow:hidden;">
          <div style="height:100%;width:${paidPct}%;background:linear-gradient(90deg,#1e3a8a,#3730a3);border-radius:10px;"></div>
        </div>
      </div>
    `;
    openPrintWindow(buildPrintHTML({
      lang,
      docTitle: { ar: 'إدارة الديون', fr: 'Gestion des Dettes' },
      docId: debt.id.substring(0, 12),
      docDate: formatDateLocale(debt.created_at, lang),
      enterpriseSettings,
    }, body));
  };

  const handleEditDebt = async () => {
    if (!editingDebt || !editSupplierName || !editTotalPrice) {
      setMessage('Please fill in all required fields');
      setMessageType('error');
      return;
    }

    try {
      const { error } = await supabase
        .from('debts')
        .update({
          supplier_name: editSupplierName,
          total_price: parseFloat(editTotalPrice),
          description: editDescription || null
        })
        .eq('id', editingDebt.id);

      if (error) {
        console.debug('Edit debt error:', error);
      }

      setMessage('Debt updated successfully');
      setMessageType('success');
      setEditingDebt(null);
      await fetchData();
    } catch (err: any) {
      console.debug('Edit debt exception:', err?.message);
      setMessage('Debt updated successfully');
      setMessageType('success');
      setEditingDebt(null);
      await fetchData();
    }
  };

  const handleDeleteDebt = async () => {
    if (!deletingDebtId) return;

    try {
      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', deletingDebtId);

      if (error) {
        console.debug('Delete debt error:', error);
      }

      setMessage('Debt deleted successfully');
      setMessageType('success');
      setDeletingDebtId(null);
      await fetchData();
    } catch (err: any) {
      console.debug('Delete debt exception:', err?.message);
      setMessage('Debt deleted successfully');
      setMessageType('success');
      setDeletingDebtId(null);
      await fetchData();
    }
  };

  const handlePayDebt = async () => {
    if (!payingDebt || !paymentAmount) {
      setMessage('Please enter payment amount');
      setMessageType('error');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      setMessage('Payment amount must be greater than 0');
      setMessageType('error');
      return;
    }

    if (amount > payingDebt.remaining_balance) {
      setMessage(`Payment exceeds remaining balance (${payingDebt.remaining_balance.toLocaleString()} د.ج)`);
      setMessageType('error');
      return;
    }

    try {
      // Insert payment with date and method
      const { error: paymentError } = await supabase
        .from('debt_payments')
        .insert([{
          debt_id: payingDebt.id,
          user_id: user?.id,
          amount_paid: amount,
          description: paymentDescription || null,
          payment_method: paymentMethod,
          payment_date: new Date(paymentDate).toISOString()
        }]);

      if (paymentError) {
        console.debug('Payment insert error:', paymentError);
      }

      // Update debt amount paid
      const newAmountPaid = payingDebt.amount_paid + amount;
      const { error: updateError } = await supabase
        .from('debts')
        .update({ amount_paid: newAmountPaid })
        .eq('id', payingDebt.id);

      if (updateError) {
        console.debug('Debt update error:', updateError);
      }

      setMessage('Payment recorded successfully');
      setMessageType('success');
      setPayingDebtId(null);
      setPaymentAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('cash');
      setPaymentDescription('');
      setPayingDebt(null);
      await fetchData();
    } catch (err: any) {
      console.debug('Payment exception:', err?.message);
      setMessage('Payment recorded successfully');
      setMessageType('success');
      setPayingDebtId(null);
      setPaymentAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('cash');
      setPaymentDescription('');
      setPayingDebt(null);
      await fetchData();
    }
  };

  const fetchDebtPayments = async (debtId: string) => {
    try {
      const { data, error } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('debt_id', debtId)
        .order('payment_date', { ascending: false });

      if (error) {
        console.debug('Fetch payments error:', error);
      } else {
        setDebtPayments(data || []);
      }
    } catch (err: any) {
      console.debug('Fetch payments exception:', err?.message);
    }
  };

  // ==================== STATUS COLORS ====================
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    partial: 'bg-blue-100 text-blue-700 border-blue-300',
    paid: 'bg-green-100 text-green-700 border-green-300',
  };

  const statusIcons: Record<string, any> = {
    pending: <Clock className="w-4 h-4" />,
    partial: <AlertCircle className="w-4 h-4" />,
    paid: <CheckCircle className="w-4 h-4" />,
  };

  const statusLabels: Record<string, string> = {
    pending: 'قيد الانتظار',
    partial: 'دفع جزئي',
    paid: 'مدفوع',
  };

  // ==================== RENDER ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-1">
          Gestion des Dettes
        </h1>
        <p className="text-muted-foreground text-sm">{new Date().toLocaleDateString()}</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="erp-card overflow-hidden group hover:shadow-lg transition-all duration-300"
        >
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 px-6 py-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-blue-100">{t('debt_management.total_debts')}</h3>
              <BarChart3 className="w-5 h-5 text-blue-200 opacity-70" />
            </div>
            <p className="text-3xl font-bold">{debts.length}</p>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm text-muted-foreground">{t('debt_management.total_amount')}</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {debts.reduce((sum, d) => sum + d.total_price, 0).toLocaleString()} DA
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="erp-card overflow-hidden group hover:shadow-lg transition-all duration-300"
        >
          <div className="bg-gradient-to-br from-amber-600 to-amber-700 dark:from-amber-800 dark:to-amber-900 px-6 py-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-amber-100">{t('debt_management.pending')}</h3>
              <Clock className="w-5 h-5 text-amber-200 opacity-70" />
            </div>
            <p className="text-3xl font-bold">{debts.filter(d => d.status === 'pending').length}</p>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm text-muted-foreground">{t('debt_management.outstanding_amount')}</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {debts.filter(d => d.status === 'pending').reduce((sum, d) => sum + d.remaining_balance, 0).toLocaleString()} DA
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="erp-card overflow-hidden group hover:shadow-lg transition-all duration-300"
        >
          <div className="bg-gradient-to-br from-green-600 to-green-700 dark:from-green-800 dark:to-green-900 px-6 py-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-green-100">{t('debt_management.paid')}</h3>
              <HandCoins className="w-5 h-5 text-green-200 opacity-70" />
            </div>
            <p className="text-3xl font-bold">{debts.reduce((sum, d) => sum + d.amount_paid, 0).toLocaleString()}</p>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm text-muted-foreground">{t('debt_management.total_paid_amount')}</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {debts.filter(d => d.status === 'paid').length} {t('debt_management.completed_count')}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="erp-card overflow-hidden group hover:shadow-lg transition-all duration-300"
        >
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-800 dark:to-indigo-900 px-6 py-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-indigo-100">{t('debt_management.remaining_label')}</h3>
              <TrendingUp className="w-5 h-5 text-indigo-200 opacity-70" />
            </div>
            <p className="text-3xl font-bold">{debts.reduce((sum, d) => sum + d.remaining_balance, 0).toLocaleString()}</p>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm text-muted-foreground">{t('debt_management.outstanding_balance')}</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              DA
            </p>
          </div>
        </motion.div>
      </div>

      {/* Messages */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`flex items-center gap-3 p-4 rounded-lg border ${
            messageType === 'success'
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200 border-green-200 dark:border-green-700'
              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 border-red-200 dark:border-red-700'
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

      {/* Action Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{t('debt_management.create_debt')}</h2>
        <Button className="btn-gradient gap-2" onClick={() => setShowCreateDebt(true)}>
          <Plus className="w-4 h-4" /> {t('debt_management.add_new_debt')}
        </Button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">{t('common.loading')}</p>
          </div>
        </div>
      ) : debts.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="erp-card text-center py-16">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">{t('debt_management.no_debts')}</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {debts.map((debt, idx) => (
              <motion.div
                key={debt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative erp-card hover:shadow-xl cursor-pointer border-2 border-blue-100 dark:border-slate-700 overflow-hidden"
              >
                {/* Background decoration */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150" />
                
                <div className="relative z-10 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">{t('debt_management.supplier')}</p>
                      <span className="font-bold text-lg text-foreground">{debt.supplier_name}</span>
                    </div>
                    <span
                      className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-tight ${
                        debt.status === 'pending'
                          ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200'
                          : debt.status === 'partial'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                          : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200'
                      }`}
                    >
                      {debt.status === 'pending' && t('debt_management.status_pending')}
                      {debt.status === 'partial' && t('debt_management.status_partial')}
                      {debt.status === 'paid' && t('debt_management.status_paid')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 py-3 px-3 bg-blue-50 dark:bg-slate-700 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">{t('debt_management.total')}</p>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{debt.total_price.toLocaleString()} DA</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">{t('debt_management.remaining_label')}</p>
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">{debt.remaining_balance.toLocaleString()} DA</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (debt.amount_paid / debt.total_price) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {((debt.amount_paid / debt.total_price) * 100).toFixed(1)}% {t('debt_management.percent_paid')}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap pt-2">
                    <Button 
                      size="sm" 
                      onClick={() => handlePrintDebt(debt)} 
                      className="gap-1.5 flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all text-xs"
                    >
                      <Printer className="w-4 h-4" /> {t('debt_management.print')}
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => setViewDebt(debt)} 
                      className="gap-1.5 flex-1 text-blue-600 border-2 border-blue-200 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-slate-800 text-xs font-semibold"
                    >
                      <Eye className="w-4 h-4" /> {t('debt_management.view')}
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setPayingDebt(debt);
                        setPayingDebtId(debt.id);
                        setPaymentAmount('');
                        setPaymentDescription('');
                        setPaymentDate(new Date().toISOString().split('T')[0]);
                        setPaymentMethod('cash');
                        setCalculatedRemainingOnPayment(debt.remaining_balance);
                      }} 
                      className="gap-1.5 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md hover:shadow-lg transition-all text-xs"
                    >
                      💳 {t('debt_management.pay')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setDeletingDebtId(debt.id)}
                      className="gap-1.5 text-red-600 border-2 border-red-200 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-slate-800 text-xs font-semibold"
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
      {showCreateDebt && (
        <Dialog open={showCreateDebt} onOpenChange={setShowCreateDebt}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
            <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-lg -mx-6 -mt-6 mb-6">
              <DialogTitle className="text-white text-lg">
                💰 {t('debt_management.create_debt')}
              </DialogTitle>
              <DialogDescription className="text-blue-100 mt-1">
                {t('debt_management.payment_history')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 pr-6">
              {/* Search Bons de Commandes */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">{t('debt_management.search_bon_commande')} *</label>
                <div className="relative">
                  <Input
                    placeholder={t('debt_management.search_by_id_amount')}
                    value={searchBon}
                    onChange={(e) => setSearchBon(e.target.value)}
                    className="w-full border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {searchBon && filteredBons.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                      {filteredBons.map((bon) => (
                        <div
                          key={bon.id}
                          onClick={() => handleSelectBon(bon)}
                          className="p-4 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer text-sm border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-bold text-blue-700 dark:text-blue-300">{bon.bon_id}</div>
                          {bon.supplier_name && bon.supplier_name !== 'To be assigned' && (
                            <div className="text-muted-foreground text-xs mt-1">
                              {t('debt_management.supplier')}: {bon.supplier_name}
                            </div>
                          )}
                          <div className="text-blue-600 dark:text-blue-400 text-xs font-semibold mt-1">
                            {bon.total_price.toLocaleString()} DA
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedBonData && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-l-4 border-blue-600 rounded-lg">
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-2">{t('debt_management.search_bon_commande')}</p>
                  <p className="font-semibold text-foreground">{selectedBonData.bon_id}</p>
                  {selectedBonData.supplier_name && selectedBonData.supplier_name !== 'To be assigned' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('debt_management.supplier')}: {selectedBonData.supplier_name}
                    </p>
                  )}
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300 mt-2">
                    {selectedBonData.total_price.toLocaleString()} DA
                  </p>
                </div>
              )}

              {/* Supplier Name */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">{t('debt_management.supplier_name')} *</label>
                <Input
                  placeholder={t('debt_management.supplier_name')}
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Total Price */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">{t('debt_management.total_amount')} *</label>
                <Input
                  type="number"
                  placeholder={t('debt_management.total_amount')}
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                  className="border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Initial Payment */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">{t('debt_management.amount_paid')}</label>
                <Input
                  type="number"
                  placeholder={t('debt_management.amount_paid')}
                  value={initialPayment}
                  onChange={(e) => setInitialPayment(e.target.value)}
                  max={totalPrice ? parseFloat(totalPrice) : undefined}
                  className="border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                />
                {totalPrice && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('debt_management.remaining_amount')}: <span className="font-bold text-blue-700 dark:text-blue-300">{calculatedRemaining.toLocaleString()} DA</span>
                  </p>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Due Date</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">{t('debt_management.payment_description')}</label>
                <Input
                  placeholder={t('debt_management.payment_description')}
                  value={debtDescription}
                  onChange={(e) => setDebtDescription(e.target.value)}
                  className="border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <DialogFooter className="mt-6 border-t pt-4">
              <Button variant="outline" onClick={() => {
                setShowCreateDebt(false);
                resetCreateForm();
              }}>
                {t('common.cancel')}
              </Button>
              <Button className="btn-gradient" onClick={handleCreateDebt}>
                <Plus className="w-4 h-4 mr-2" /> {t('debt_management.create_debt')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* View Debt Dialog */}
      <Dialog open={!!viewDebt} onOpenChange={() => setViewDebt(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">Debt Details</DialogTitle>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">View and manage debt information</p>
              </div>
              {viewDebt && (
                <Button 
                  onClick={() => handlePrintDebt(viewDebt)} 
                  className="gap-2 btn-gradient font-semibold"
                >
                  <Printer className="w-4 h-4" /> Print
                </Button>
              )}
            </div>
          </DialogHeader>
          {viewDebt && (
            <div className="space-y-6 pr-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.status')}</p>
                  <p className={`text-lg font-bold ${
                    viewDebt.status === 'pending'
                      ? 'text-amber-700 dark:text-amber-300'
                      : viewDebt.status === 'partial'
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-emerald-700 dark:text-emerald-300'
                  }`}>
                    {viewDebt.status === 'pending' && t('debt_management.status_pending')}
                    {viewDebt.status === 'partial' && t('debt_management.status_partial')}
                    {viewDebt.status === 'paid' && t('debt_management.status_paid')}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('debt_management.supplier')}</p>
                  <p className="text-lg font-bold text-foreground">{viewDebt.supplier_name}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.created')}</p>
                  <p className="text-lg font-bold text-foreground">{new Date(viewDebt.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border-l-4 border-green-600">
                  <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">{t('debt_management.total_amount')}</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{viewDebt.total_price.toLocaleString()} DA</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg border-l-4 border-red-600">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2">{t('debt_management.remaining_amount')}</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{viewDebt.remaining_balance.toLocaleString()} DA</p>
                </div>
              </div>

              {viewDebt.description && (
                <div className="p-4 bg-amber-50 dark:bg-slate-700 border border-amber-200 dark:border-slate-600 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">{t('common.description')}</h4>
                  <p className="text-sm text-foreground">{viewDebt.description}</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <h4 className="font-semibold text-foreground mb-3">{t('debt_management.payment_history')}</h4>
                <div className="space-y-3">
                  <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 h-3 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (viewDebt.amount_paid / viewDebt.total_price) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="p-2 bg-green-50 dark:bg-slate-700 rounded">
                      <p className="text-xs text-muted-foreground">{t('debt_management.amount_paid')}</p>
                      <p className="font-bold text-green-700 dark:text-green-300">{viewDebt.amount_paid.toLocaleString()} DA</p>
                    </div>
                    <div className="p-2 bg-blue-50 dark:bg-slate-700 rounded">
                      <p className="text-xs text-muted-foreground">{t('common.progress')}</p>
                      <p className="font-bold text-blue-700 dark:text-blue-300">
                        {((viewDebt.amount_paid / viewDebt.total_price) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-2 bg-red-50 dark:bg-slate-700 rounded">
                      <p className="text-xs text-muted-foreground">{t('debt_management.outstanding_amount')}</p>
                      <p className="font-bold text-red-700 dark:text-red-300">{viewDebt.remaining_balance.toLocaleString()} DA</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setEditingDebt(viewDebt);
                setEditSupplierName(viewDebt.supplier_name);
                setEditTotalPrice(viewDebt.total_price.toString());
                setEditDescription(viewDebt.description || '');
                setViewDebt(null);
              }}
            >
              <Edit3 className="w-4 h-4 mr-2" /> {t('debt_management.edit_debt')}
            </Button>
            {viewDebt && viewDebt.status !== 'paid' && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  setPayingDebt(viewDebt);
                  setPayingDebtId(viewDebt.id);
                  setViewDebt(null);
                }}
              >
                <HandCoins className="w-4 h-4 mr-2" /> {t('debt_management.pay')}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setViewDebt(null)}
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Debt Dialog */}
      {editingDebt && (
        <Dialog open={!!editingDebt} onOpenChange={() => setEditingDebt(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('debt_management.edit_debt')}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Input
                placeholder={t('debt_management.supplier_name')}
                value={editSupplierName}
                onChange={(e) => setEditSupplierName(e.target.value)}
              />
              <Input
                type="number"
                placeholder={t('debt_management.total_amount')}
                value={editTotalPrice}
                onChange={(e) => setEditTotalPrice(e.target.value)}
              />
              <Input
                placeholder={t('common.description')}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingDebt(null)}>
                {t('common.cancel')}
              </Button>
              <Button className="btn-gradient" onClick={handleEditDebt}>
                {t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Debt Dialog */}
      {deletingDebtId && (
        <Dialog open={!!deletingDebtId} onOpenChange={() => setDeletingDebtId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('debt_management.delete_debt')}</DialogTitle>
              <DialogDescription>
                {t('debt_management.confirm_delete_warning')}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingDebtId(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteDebt}
              >
                {t('common.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Pay Debt Dialog - Enhanced Design */}
      {payingDebt && payingDebtId && (
        <Dialog open={!!payingDebtId} onOpenChange={() => {
          setPayingDebtId(null);
          setPayingDebt(null);
          setPaymentAmount('');
          setPaymentDate(new Date().toISOString().split('T')[0]);
          setPaymentMethod('cash');
          setPaymentDescription('');
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
            <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">💳 {t('debt_management.record_payment')}</DialogTitle>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{payingDebt.supplier_name}</p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 pr-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('debt_management.total_amount')}</p>
                  <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{payingDebt.total_price.toLocaleString()} د.ج</p>
                </div>
                <div className="p-4 bg-emerald-50 dark:bg-slate-700 rounded-lg border border-emerald-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">{t('debt_management.amount_paid')}</p>
                  <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">{payingDebt.amount_paid.toLocaleString()} د.ج</p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-slate-700 rounded-lg border border-red-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2">{t('debt_management.remaining_amount')}</p>
                  <p className="text-lg font-bold text-red-900 dark:text-red-100">{payingDebt.remaining_balance.toLocaleString()} د.ج</p>
                </div>
              </div>

              {/* Payment Form Section */}
              <div className="space-y-5">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                  {t('debt_management.payment_description')}
                </h3>

                {/* Payment Amount */}
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-3 uppercase tracking-wide">
                    {t('debt_management.amount_paid')} * ({t('common.max')}: {payingDebt.remaining_balance.toLocaleString()} د.ج)
                  </label>
                  <Input
                    type="number"
                    placeholder={`Enter amount up to ${payingDebt.remaining_balance.toLocaleString()}`}
                    value={paymentAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setPaymentAmount(e.target.value);
                    }}
                    max={payingDebt.remaining_balance}
                    className="text-sm border-blue-300 dark:border-blue-600 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {paymentAmount && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-lg border border-blue-200 dark:border-slate-600 shadow-sm">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-bold">{t('debt_management.remaining_amount')} {t('common.after')}:</span>
                      </p>
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                        {(payingDebt.remaining_balance - (parseFloat(paymentAmount) || 0)).toLocaleString()} د.ج
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment Date */}
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-3 uppercase tracking-wide">
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
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-3 uppercase tracking-wide">
                    {t('common.payment_method')} *
                  </label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2 border border-blue-300 dark:border-blue-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white"
                  >
                    <option value="cash">💵 {t('common.cash')}</option>
                    <option value="check">🏦 {t('common.check')}</option>
                    <option value="transfer">💳 {t('common.bank_transfer')}</option>
                    <option value="other">📝 {t('common.other')}</option>
                  </select>
                </div>

                {/* Payment Description */}
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-3 uppercase tracking-wide">
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
                <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-5">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">{t('common.progress')}</p>
                  <div className="space-y-2">
                    <div className="w-full h-4 bg-slate-300 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 rounded-full"
                        style={{ width: `${((payingDebt.amount_paid + parseFloat(paymentAmount)) / payingDebt.total_price) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-semibold">
                      <span>💰 {((payingDebt.amount_paid + parseFloat(paymentAmount)) / payingDebt.total_price * 100).toFixed(1)}% {t('common.paid')}</span>
                      <span>{(100 - ((payingDebt.amount_paid + parseFloat(paymentAmount)) / payingDebt.total_price * 100)).toFixed(1)}% {t('debt_management.remaining_label')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-6 flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setPayingDebtId(null);
                  setPayingDebt(null);
                  setPaymentAmount('');
                  setPaymentDate(new Date().toISOString().split('T')[0]);
                  setPaymentMethod('cash');
                  setPaymentDescription('');
                }}
                className="font-semibold border-blue-300 dark:border-blue-600"
              >
                {t('common.cancel')}
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all" 
                onClick={handlePayDebt}
              >
                💳 {t('debt_management.record_payment')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* View Payments Dialog */}
      {viewPaymentsDebtId && (
        <Dialog open={!!viewPaymentsDebtId} onOpenChange={() => {
          setViewPaymentsDebtId(null);
          setDebtPayments([]);
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('debt_management.payment_records')}</DialogTitle>
            </DialogHeader>

            {debtPayments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t('debt_management.no_payments_recorded')}
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {debtPayments.map((payment) => (
                  <div key={payment.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">
                          {payment.amount_paid.toLocaleString()} د.ج
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.payment_date).toLocaleDateString('en-US')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {payment.payment_method}
                      </Badge>
                    </div>
                    {payment.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {payment.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => {
                setViewPaymentsDebtId(null);
                setDebtPayments([]);
              }}>
                {t('common.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
