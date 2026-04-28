// ============================================================================
// ENHANCED DEBT MANAGEMENT PAGE - WITH INITIAL PAYMENT AND AUTOMATIC CALCULATIONS
// Features:
// - Create debt with initial payment amount
// - Automatic calculation of remaining balance
// - Display debts on cards with action buttons
// - Delete debt with confirmation
// - Edit debt details
// - Record payments with automatic balance calculation
// - Payment date and description tracking
// ============================================================================

import { useState, useRef, useEffect, ChangeEvent, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './src/contexts/AuthContext';
import { supabase } from './src/lib/supabase';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './src/components/ui/card';
import { Button } from './src/components/ui/button';
import { Input } from './src/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './src/components/ui/dialog';
import { Badge } from './src/components/ui/badge';
import { FileText, Plus, Edit3, Trash2, CreditCard, Search, AlertCircle, CheckCircle, Clock, Eye } from 'lucide-react';

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

export default function ComptableDebtManagementPage() {
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
        .eq('user_id', user.id)
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
    if (!user?.id || !selectedBonData || !supplierName || !totalPrice) {
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
        user_id: user.id,
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
        user_id: user?.id,
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
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'partial': return <Clock className="w-4 h-4" />;
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          {t('debt_management.add_new_debt')}
        </h1>
        <p className="text-slate-600">{t('debt_management.payment_history')}</p>
      </div>

      {/* Message Alert */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-4 rounded-lg ${
            messageType === 'success'
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}
        >
          {message}
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 mb-8">
        <Button
          onClick={() => setShowCreateDebt(true)}
          className="btn-gradient flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {t('debt_management.add_new_debt')}
        </Button>
      </div>

      {/* Debts Grid */}
      {debts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <p className="text-slate-500">{t('debt_management.no_debts')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {debts.map((debt, index) => (
            <motion.div
              key={debt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{debt.supplier_name}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">{debt.description}</p>
                    </div>
                    <Badge className={`flex items-center gap-1 ${getStatusColor(debt.status)}`}>
                      {getStatusIcon(debt.status)}
                      {debt.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Financial Summary */}
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{t('debt_management.total_amount')}:</span>
                      <span className="font-semibold">{debt.total_price.toLocaleString()} د.ج</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{t('debt_management.amount_paid')}:</span>
                      <span className="font-semibold text-green-600">{debt.amount_paid.toLocaleString()} د.ج</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-600"
                        style={{ width: `${(debt.amount_paid / debt.total_price) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-slate-600">{t('debt_management.remaining_amount')}:</span>
                      <span className={`font-bold ${debt.remaining_balance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {debt.remaining_balance.toLocaleString()} د.ج
                      </span>
                    </div>
                  </div>

                  {/* Due Date */}
                  {debt.due_date && (
                    <div className="text-sm text-slate-600">
                      <strong>{t('common.date')}:</strong> {new Date(debt.due_date).toLocaleDateString('en-US')}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    {debt.remaining_balance > 0 && (
                      <Button
                        onClick={() => openPayDialog(debt)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        <CreditCard className="w-4 h-4 mr-1" />
                        {t('debt_management.pay_debt')}
                      </Button>
                    )}
                    <Button
                      onClick={() => handleViewPayments(debt.id)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => openEditDialog(debt)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setDeletingDebtId(debt.id)}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* ==================== DIALOGS ==================== */}

      {/* Create Debt Dialog */}
      {showCreateDebt && (
        <Dialog open={showCreateDebt} onOpenChange={setShowCreateDebt}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('debt_management.create_debt')}</DialogTitle>
              <DialogDescription>{t('debt_management.search_bon_commande')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Search Bons de Commandes */}
              <div className="relative">
                <Input
                  placeholder={t('debt_management.search_by_id_amount')}
                  value={searchBon}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchBon(e.target.value)}
                  className="w-full"
                />
                {searchBon && filteredBons.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                    {filteredBons.map((bon) => (
                      <div
                        key={bon.id}
                        onClick={() => handleSelectBon(bon)}
                        className="p-3 hover:bg-secondary cursor-pointer text-sm border-b last:border-b-0"
                      >
                        <div className="font-semibold">{bon.bon_id}</div>
                        {bon.supplier_name && bon.supplier_name !== 'To be assigned' && (
                          <div className="text-muted-foreground text-xs">
                            {t('debt_management.supplier_name')}: {bon.supplier_name}
                          </div>
                        )}
                        <div className="text-muted-foreground text-xs">
                          {bon.total_price.toLocaleString()} د.ج
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedBonData && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold">{selectedBonData.bon_id}</p>
                  {selectedBonData.supplier_name && selectedBonData.supplier_name !== 'To be assigned' && (
                    <p className="text-xs text-muted-foreground">
                      {t('debt_management.supplier_name')}: {selectedBonData.supplier_name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {selectedBonData.total_price.toLocaleString()} د.ج
                  </p>
                </div>
              )}

              {/* Supplier Name */}
              <Input
                placeholder={t('debt_management.supplier_name')}
                value={supplierName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSupplierName(e.target.value)}
              />

              {/* Total Price */}
              <div>
                <label className="text-sm font-medium block mb-2">{t('debt_management.total_amount')}</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={totalPrice}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setTotalPrice(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>

              {/* Initial Payment */}
              <div>
                <label className="text-sm font-medium block mb-2">
                  {t('debt_management.amount_paid')} ({t('common.optional')})
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={initialPayment}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setInitialPayment(e.target.value)}
                  step="0.01"
                  min="0"
                  max={totalPrice}
                />
                {initialPayment && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-slate-700">
                      {t('debt_management.remaining_amount')}: <span className="font-bold text-blue-600">
                        {calculatedRemainingOnCreate.toLocaleString()} د.ج
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="text-sm font-medium block mb-2">
                  {t('common.date')} ({t('common.optional')})
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
                />
              </div>

              {/* Description */}
              <Input
                placeholder={t('common.description')}
                value={debtDescription}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDebtDescription(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDebt(false);
                  resetCreateForm();
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button className="btn-gradient" onClick={handleCreateDebt}>
                {t('debt_management.create_debt')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditSupplierName(e.target.value)}
              />
              <Input
                type="number"
                placeholder={t('debt_management.total_amount')}
                value={editTotalPrice}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditTotalPrice(e.target.value)}
                step="0.01"
              />
              <Input
                type="date"
                value={editDueDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditDueDate(e.target.value)}
              />
              <Input
                placeholder={t('common.description')}
                value={editDescription}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditDescription(e.target.value)}
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

      {/* Pay Debt Dialog */}
      {payingDebt && payingDebtId && (
        <Dialog open={!!payingDebtId} onOpenChange={() => {
          setPayingDebtId(null);
          setPayingDebt(null);
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('debt_management.record_payment')}</DialogTitle>
              <DialogDescription>
                {payingDebt.supplier_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Summary */}
              <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('debt_management.total_amount')}:</span>
                  <span className="font-bold">
                    {payingDebt.total_price.toLocaleString()} د.ج
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t('debt_management.amount_paid')}:</span>
                  <span className="font-semibold text-green-600">
                    {payingDebt.amount_paid.toLocaleString()} د.ج
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span>{t('debt_management.remaining_amount')}:</span>
                  <span className="font-bold text-red-600">
                    {payingDebt.remaining_balance.toLocaleString()} د.ج
                  </span>
                </div>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="text-sm font-medium block mb-2">
                  {t('debt_management.amount_paid')}
                </label>
                <Input
                  type="number"
                  placeholder={`${t('common.max')}: ${payingDebt.remaining_balance.toLocaleString()} د.ج`}
                  value={paymentAmount}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPaymentAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  max={payingDebt.remaining_balance}
                />
                {paymentAmount && (
                  <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                    <p className="text-sm text-slate-700">
                      {t('debt_management.remaining_amount')} {t('common.after')}: 
                      <span className="font-bold text-green-600 ml-1">
                        {calculatedRemaining.toLocaleString()} د.ج
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Date */}
              <div>
                <label className="text-sm font-medium block mb-2">{t('common.date')}</label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPaymentDate(e.target.value)}
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-sm font-medium block mb-2">{t('debt_management.payment_description')}</label>
                <select
                  value={paymentMethod}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="cash">نقد / Cash</option>
                  <option value="check">شيك / Check</option>
                  <option value="transfer">تحويل / Transfer</option>
                  <option value="other">أخرى / Other</option>
                </select>
              </div>

              {/* Payment Description */}
              <Input
                placeholder={t('debt_management.payment_description')}
                value={paymentDescription}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPaymentDescription(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setPayingDebtId(null);
                setPayingDebt(null);
                setPaymentAmount('');
                setPaymentDescription('');
              }}>
                {t('common.cancel')}
              </Button>
              <Button className="btn-gradient" onClick={handlePayDebt}>
                {t('debt_management.record_payment')}
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
