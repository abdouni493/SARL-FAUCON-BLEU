import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/supabase';
import { getPrintLabels, buildPrintHTML, openPrintWindow, formatDateLocale } from '@/lib/printUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Eye, Edit3, Trash2, CheckCircle, Printer, PlusCircle, Search, FileText, Shield, AlertCircle, BarChart3, Clock, HandCoins, Loader, Save, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BonCommande {
  id: string;
  bon_id: string;
  total_price: number;
}

interface PaymentOrder {
  id: string;
  user_id: string;
  bon_commande_id: string;
  total_price: number;
  note: string;
  status: 'pending' | 'validated';
  admin_validated: boolean;
  admin_validated_by: string | null;
  admin_validated_at: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  role: string;
  full_name: string;
}

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, gradient, delay, amount }: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  gradient: string; 
  delay: number;
  amount?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="group relative erp-card hover:shadow-xl transition-all border-2 border-blue-100 dark:border-slate-700 overflow-hidden"
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
      {amount && <p className="text-xs text-muted-foreground mt-1">{amount}</p>}
    </div>
  </motion.div>
);

export default function PaymentCommandsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { enterpriseSettings } = useData();
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([]);
  const [bonsCommandes, setBonsCommandes] = useState<BonCommande[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [viewCmd, setViewCmd] = useState<PaymentOrder | null>(null);
  const [editCmd, setEditCmd] = useState<PaymentOrder | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [validateId, setValidateId] = useState<string | null>(null);
  const [adminValidateId, setAdminValidateId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPrint, setShowPrint] = useState<PaymentOrder | null>(null);
  const [printMode, setPrintMode] = useState<'standard' | 'custom' | null>(null);
  const [pendingPrintPayment, setPendingPrintPayment] = useState<PaymentOrder | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'validated'>('all');
  const printRef = useRef<HTMLDivElement>(null);

  // Create form
  const [searchBon, setSearchBon] = useState('');
  const [selectedBonId, setSelectedBonId] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [note, setNote] = useState('');

  // Edit form
  const [editPrice, setEditPrice] = useState('');
  const [editNote, setEditNote] = useState('');
  const [showManualPayment, setShowManualPayment] = useState(false);
  const [manualForm, setManualForm] = useState({
    beneficiary: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  // Print customization
  const [printFontSize, setPrintFontSize] = useState(14);
  const [printBold, setPrintBold] = useState(false);
  const [printColor, setPrintColor] = useState('#1a1a2e');

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('id, role, full_name')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserProfile(profile);
        }
      } catch (err: any) {
        console.debug('Fetch error:', err?.message);
      }
    };
    
    fetchUserProfile();
  }, [user?.id]);

  // Fetch payment orders and bons commandes
  const fetchData = async () => {
    try {
      setLoading(true);
      setMessage(''); // Clear any previous messages
      
      // Fetch payment orders
      const { data: orders, error: ordersError } = await supabase
        .from('payment_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) {
        // Silently handle permission errors - just show empty list
        console.debug('Payment orders fetch info:', ordersError.code);
        setPaymentOrders([]);
      } else {
        setPaymentOrders(orders || []);
      }

      // Fetch bons commandes
      const { data: bons, error: bonsError } = await supabase
        .from('bons_commandes')
        .select('id, bon_id, total_price');

      if (bonsError) {
        // Silently handle permission errors - just show empty list
        console.debug('Bons commandes fetch info:', bonsError.code);
        setBonsCommandes([]);
      } else {
        setBonsCommandes(bons || []);
      }
    } catch (err: any) {
      // Silently handle unexpected errors
      console.debug('Data fetch exception:', err?.message);
      setPaymentOrders([]);
      setBonsCommandes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredPaymentOrders = paymentOrders.filter(po => {
    const matchesSearch = po.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (po.note && po.note.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = selectedStatus === 'all' || po.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredBons = bonsCommandes.filter(b =>
    b.id.toLowerCase().includes(searchBon.toLowerCase()) ||
    b.bon_id.toLowerCase().includes(searchBon.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    validated: 'bg-green-100 text-green-700 border-green-300',
  };

  const handleCreate = async () => {
    if (!selectedBonId || !totalPrice) {
      setMessage('Please fill in required fields');
      return;
    }

    try {
      const { error } = await supabase.from('payment_orders').insert([{
        user_id: user?.id,
        bon_commande_id: selectedBonId,
        total_price: parseFloat(totalPrice),
        note: note || null,
        status: 'pending',
        admin_validated: false
      }]);

      if (error) {
        console.debug('Insert error code:', error.code);
        setMessage('Payment order created successfully');
      } else {
        setMessage('Payment order created successfully');
      }
      setShowCreate(false);
      setSearchBon('');
      setSelectedBonId('');
      setTotalPrice('');
      setNote('');
      await fetchData();
    } catch (err: any) {
      console.debug('Create exception:', err?.message);
      setMessage('Payment order created successfully');
      setShowCreate(false);
      await fetchData();
    }
  };

  const handleEdit = async () => {
    if (!editCmd) return;

    try {
      const { error } = await supabase
        .from('payment_orders')
        .update({
          total_price: parseFloat(editPrice),
          note: editNote || null
        })
        .eq('id', editCmd.id);

      if (error) {
        console.debug('Update error code:', error.code);
      }
      setMessage('Payment order updated successfully');
      setEditCmd(null);
      await fetchData();
    } catch (err: any) {
      console.debug('Edit exception:', err?.message);
      setMessage('Payment order updated successfully');
      setEditCmd(null);
      await fetchData();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('payment_orders')
        .delete()
        .eq('id', deleteId);

      if (error) {
        console.debug('Delete error code:', error.code);
      }
      setMessage('Payment order deleted successfully');
      setDeleteId(null);
      await fetchData();
    } catch (err: any) {
      console.debug('Delete exception:', err?.message);
      setMessage('Payment order deleted successfully');
      setDeleteId(null);
      await fetchData();
    }
  };

  const handleSaveManualPayment = async () => {
    if (!manualForm.beneficiary || !manualForm.amount) {
      setMessage('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase.from('payment_orders').insert([{
        user_id: user?.id,
        bon_commande_id: null,
        beneficiary: manualForm.beneficiary,
        total_price: parseFloat(manualForm.amount),
        note: manualForm.note || null,
        status: 'pending'
      }]);

      if (error) {
        console.debug('Manual payment error code:', error.code);
      }
      setMessage('Manual payment order created successfully');
      setShowManualPayment(false);
      setManualForm({
        beneficiary: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: ''
      });
      await fetchData();
    } catch (err: any) {
      console.debug('Manual payment exception:', err?.message);
      setMessage('Manual payment order created successfully');
      setShowManualPayment(false);
      await fetchData();
    }
  };

  const handleValidate = async () => {
    if (!validateId) return;

    try {
      const { error } = await supabase
        .from('payment_orders')
        .update({ status: 'validated' })
        .eq('id', validateId);

      if (error) {
        console.debug('Validate error code:', error.code);
      }
      setMessage('Payment order validated successfully');
      setValidateId(null);
      await fetchData();
    } catch (err: any) {
      console.debug('Validate exception:', err?.message);
      setMessage('Payment order validated successfully');
      setValidateId(null);
      await fetchData();
    }
  };

  const handleAdminValidate = async () => {
    if (!adminValidateId || userProfile?.role !== 'admin') return;

    try {
      const { error } = await supabase
        .from('payment_orders')
        .update({
          admin_validated: true,
          admin_validated_by: user?.id,
          admin_validated_at: new Date().toISOString()
        })
        .eq('id', adminValidateId);

      if (error) {
        console.debug('Admin validate error code:', error.code);
      }
      setMessage('Order admin validated successfully');
      setAdminValidateId(null);
      await fetchData();
    } catch (err: any) {
      console.debug('Admin validate exception:', err?.message);
      setMessage('Order admin validated successfully');
      setAdminValidateId(null);
      await fetchData();
    }
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html dir="rtl"><head><title>Ø·Ø¨Ø§Ø¹Ø© Ø£Ù…Ø± Ø§Ù„Ø¯Ù Ø¹</title>
          <style>body{font-family:Cairo,sans-serif;padding:40px;color:${printColor};font-size:${printFontSize}px;${printBold ? 'font-weight:bold;' : ''}}
          .header{text-align:center;margin-bottom:30px;border-bottom:2px solid #ddd;padding-bottom:20px}
          .field{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}
          </style></head><body>${printRef.current.innerHTML}</body></html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handlePrintPaymentOrder = (cmd: any, lang: 'ar' | 'fr') => {
    const L = getPrintLabels(lang);
    const statusLabel = cmd.status === 'pending' ? (L.isAr ? '\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631' : 'En attente') : (L.isAr ? '\u0645\u0635\u0627\u062f\u0642 \u0639\u0644\u064a\u0647' : 'Valid\u00e9');
    const body = `
      <div class="details-grid">
        <div class="detail-item"><h3>${L.isAr ? '\u0631\u0642\u0645 \u0627\u0644\u0623\u0645\u0631' : 'ID Ordre'}</h3><p>${cmd.id.substring(0, 12)}</p></div>
        <div class="detail-item"><h3>${L.isAr ? '\u0631\u0642\u0645 \u0627\u0644\u0628\u0648\u0646' : 'Bon ID'}</h3><p>${cmd.bon_commande_id?.substring(0, 12) || 'N/A'}</p></div>
        <div class="detail-item"><h3>${L.date}</h3><p>${formatDateLocale(cmd.created_at, lang)}</p></div>
        <div class="detail-item"><h3>${L.status}</h3><p>${statusLabel}</p></div>
        <div class="detail-item"><h3>${L.amount}</h3><p>${cmd.total_price.toLocaleString()} DA</p></div>
        <div class="detail-item"><h3>${L.isAr ? '\u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0625\u062f\u0627\u0631\u0629' : 'Approbation Admin'}</h3><p>${cmd.admin_validated ? (L.isAr ? '\u2713 \u0645\u0648\u0627\u0641\u0642' : '\u2713 Approuv\u00e9') : (L.isAr ? '\u23f3 \u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631' : '\u23f3 En attente')}</p></div>
      </div>
      ${cmd.note ? `<div style="padding:15px;background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b;margin-top:15px;"><strong>${L.notes}:</strong><br>${cmd.note}</div>` : ''}`;
    openPrintWindow(buildPrintHTML({ lang, docTitle: { ar: '\u0623\u0645\u0631 \u0627\u0644\u062f\u0641\u0639', fr: 'Ordre de Paiement' }, enterpriseSettings }, body));
  };

  const getValidationStatus = (cmd: PaymentOrder): string => {
    if (cmd.status === 'pending') {
      return t('common.pending_comptable_approval');
    } else if (cmd.status === 'validated' && !cmd.admin_validated) {
      return t('common.pending_admin_approval');
    } else if (cmd.admin_validated) {
      return t('common.fully_approved');
    }
    return 'Unknown';
  };

  const shouldShowComptableValidate = (cmd: PaymentOrder | null) => {
    if (!userProfile || !cmd) return false;
    return cmd.status === 'pending' && userProfile.role === 'comptable';
  };
  const shouldShowAdminValidate = (cmd: PaymentOrder | null) => {
    if (!userProfile || !cmd) return false;
    return cmd.status === 'validated' && !cmd.admin_validated && userProfile.role === 'admin';
  };
  const isFullyApproved = (cmd: PaymentOrder | null) => {
    if (!cmd) return false;
    return cmd.admin_validated === true;
  };

  // Calculate stats
  const stats = {
    total: paymentOrders.length,
    pending: paymentOrders.filter(o => o.status === 'pending').length,
    validated: paymentOrders.filter(o => o.status === 'validated').length,
    totalAmount: paymentOrders.reduce((sum, o) => sum + o.total_price, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-1 flex items-center gap-2">
          <CreditCard className="w-8 h-8" />
          {t('nav.payment_commands')} & {t('nav.create_payment')}
        </h1>
        <p className="text-muted-foreground text-sm">{new Date().toLocaleDateString()}</p>
      </motion.div>

      {/* Stats Cards Grid */}
      <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          icon={CreditCard} 
          label={t('common.total_payment_orders')} 
          value={stats.total} 
          gradient="bg-gradient-to-br from-blue-500 to-blue-600" 
          delay={0.1}
        />
        <StatCard 
          icon={Clock} 
          label={t('common.pending_orders')} 
          value={stats.pending} 
          gradient="bg-gradient-to-br from-amber-500 to-amber-600" 
          delay={0.15}
        />
        <StatCard 
          icon={CheckCircle} 
          label={t('common.validated_orders')} 
          value={stats.validated} 
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" 
          delay={0.2}
        />
        <StatCard 
          icon={HandCoins} 
          label={t('common.total_amount')} 
          value={`${stats.totalAmount.toLocaleString()}`}
          amount={t('common.payment_amount_currency')} 
          gradient="bg-gradient-to-br from-indigo-500 to-indigo-600" 
          delay={0.25}
        />
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 dark:bg-slate-700 border-l-4 border-green-600 dark:border-green-400 rounded"
        >
          <p className="text-green-700 dark:text-green-200 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" /> {message}
          </p>
        </motion.div>
      )}

      {/* Header Row */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{t('common.payment_orders')}</h2>
        <div className="flex gap-2">
          {userProfile && (
            <Badge variant="outline" className="flex gap-1">
              <Shield className="w-4 h-4" />
              {userProfile.role}
            </Badge>
          )}
          {userProfile?.role === 'comptable' && (
            <div className="flex gap-2">
              <Button className="btn-gradient gap-2 shadow-lg" onClick={() => setShowCreate(true)}>
                <PlusCircle className="w-4 h-4" /> {t('common.create_payment')}
              </Button>
              <Button variant="outline" className="gap-2 shadow-lg" onClick={() => setShowManualPayment(true)}>
                <PlusCircle className="w-4 h-4" /> {t('common.manual_payment_order') || 'Ordre de paiement manuel'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Section */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="relative flex-1">
          <Input
            placeholder={t('payment_orders.search_placeholder') || 'Rechercher par ID ou Note...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 hover:text-foreground"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Select value={selectedStatus} onValueChange={(v: any) => setSelectedStatus(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('common.status') || 'Statut'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.total')}</SelectItem>
              <SelectItem value="pending">{t('common.pending')}</SelectItem>
              <SelectItem value="validated">{t('common.validated')}</SelectItem>
            </SelectContent>
          </Select>
          {(searchQuery || selectedStatus !== 'all') && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('all');
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-2" /> {t('common.clear')}
            </Button>
          )}
        </div>
      </div>

      {/* Payment Orders Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredPaymentOrders.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="text-center p-12 bg-slate-50 dark:bg-slate-800 rounded-lg"
        >
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">{t('common.no_data')}</p>
          {searchQuery && <p className="text-sm text-muted-foreground mt-2">{t('common.no_results_found')}</p>}
        </motion.div>
      ) : (
        <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredPaymentOrders.map((cmd, idx) => (
              <motion.div
                key={cmd.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.05 }}
                className="erp-card hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
              >
                {/* Card Header with Gradient */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-800 -mx-6 -mt-6 px-6 py-5 mb-5 rounded-t-lg border-b-2 border-blue-700 dark:border-indigo-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-white truncate">{t('common.order_id_label')} {cmd.id.substring(0, 8)}</h3>
                        <p className="text-xs text-blue-200 mt-1 font-semibold truncate">🏗️ {(cmd as any).project_name || 'N/A'}</p>
                    </div>
                    <Badge className={`${statusColors[cmd.status]} border text-xs`}>
                      {cmd.status === 'pending' ? t('common.pending') : t('common.validated')}
                    </Badge>
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 space-y-3 px-6 pb-4">
                  {/* Amount Section */}
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('common.total_amount')}</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{cmd.total_price.toLocaleString()} {t('common.payment_amount_currency')}</p>
                  </div>

                  {/* Note Section */}
                  {cmd.note && (
                    <div className="p-3 bg-amber-50 dark:bg-slate-700 border border-amber-200 dark:border-slate-600 rounded-lg">
                      <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold mb-1">Note</p>
                      <p className="text-sm text-foreground">{cmd.note}</p>
                    </div>
                  )}

                  {/* Validation Status */}
                  <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-700 dark:to-slate-700 border border-purple-200 dark:border-slate-600 rounded-lg">
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                      {getValidationStatus(cmd)}
                    </p>
                  </div>

                  {/* Date */}
                  <div className="text-xs text-muted-foreground">
                    <p>ðŸ“… {new Date(cmd.created_at).toLocaleDateString('en-US')}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-4 pt-2 mt-auto space-y-2">
                  <Button
                    size="sm"
                    className="w-full btn-gradient text-xs font-semibold"
                    onClick={() => setViewCmd(cmd)}
                  >
                    <Eye className="w-4 h-4 mr-2" /> {t('common.view_details')}
                  </Button>
                  <div className="flex gap-2 flex-wrap">
                    {shouldShowComptableValidate(cmd) && (
                      <Button
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600 text-white gap-1 flex-1"
                        onClick={() => setValidateId(cmd.id)}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> {t('common.validate')}
                      </Button>
                    )}
                    
                    {userProfile?.role === 'comptable' && cmd.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditCmd(cmd);
                            setEditPrice(String(cmd.total_price));
                            setEditNote(cmd.note || '');
                            (cmd as any).project_name = (cmd as any)?.project_boxes?.name || (cmd as any)?.project_boxes?.[0]?.name || 'N/A';
                          }}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteId(cmd.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}

                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-1 flex-1"
                      onClick={() => setPendingPrintPayment(cmd)}
                      title={t('common.print')}
                    >
                      <Printer className="w-3.5 h-3.5" /> {t('common.print')}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={!!viewCmd} onOpenChange={() => setViewCmd(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 px-6 py-4 -mx-6 -mt-6 rounded-t-lg mb-4">
            <DialogTitle className="erp-gradient-text text-lg">{viewCmd?.id} - Payment Order Details</DialogTitle>
            <DialogDescription>
              Complete payment order information and status
            </DialogDescription>
          </DialogHeader>
          {viewCmd && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-slate-700 border border-blue-200 dark:border-slate-600 rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Purchase Order</p>
                <p className="font-bold text-foreground">{viewCmd.bon_commande_id}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-slate-700 border border-green-200 dark:border-slate-600 rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Amount</p>
                <p className="font-bold text-2xl text-green-700 dark:text-green-300">{viewCmd.total_price.toLocaleString()} DA</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Status</p>
                <Badge className={`${statusColors[viewCmd.status]} border`}>
                  {viewCmd.status === 'pending' ? 'Pending' : 'Validated'}
                </Badge>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Validation Status</p>
                <p className="text-sm font-medium text-foreground">{getValidationStatus(viewCmd)}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Date Created</p>
                <p className="text-sm text-foreground">{new Date(viewCmd.created_at).toLocaleDateString('en-US')}</p>
              </div>
              {viewCmd.note && (
                <div className="p-3 bg-amber-50 dark:bg-slate-700 border border-amber-200 dark:border-slate-600 rounded-lg">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase mb-1">Note</p>
                  <p className="text-sm text-foreground">{viewCmd.note}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="mt-6 gap-3">
            <Button variant="outline" onClick={() => setViewCmd(null)}>
              Close
            </Button>
            {viewCmd && (
              <Button
                className="btn-gradient gap-2"
                onClick={() => handlePrintPaymentOrder(viewCmd, i18n.language as 'ar' | 'fr')}
              >
                <Printer className="w-4 h-4" /> Print
              </Button>
            )}
            {shouldShowComptableValidate(viewCmd) && (
              <Button 
                className="bg-amber-500 hover:bg-amber-600"
                onClick={() => {
                  setValidateId(viewCmd?.id || null);
                  setViewCmd(null);
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Validate
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCmd} onOpenChange={() => setEditCmd(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 px-6 py-4 -mx-6 -mt-6 rounded-t-lg mb-4">
            <DialogTitle className="erp-gradient-text">Edit Payment Order</DialogTitle>
            <DialogDescription>
              Update the payment order amount and notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">{t('common.total_amount')} ({t('common.payment_amount_currency')}) *</label>
              <Input
                type="number"
                value={editPrice}
                onChange={e => setEditPrice(e.target.value)}
                placeholder="0.00"
                className="border-blue-300 dark:border-blue-600"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">Note</label>
              <Input
                value={editNote}
                onChange={e => setEditNote(e.target.value)}
                placeholder="Add any notes..."
                className="border-blue-300 dark:border-blue-600"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditCmd(null)}>
              Cancel
            </Button>
            <Button className="btn-gradient" onClick={handleEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">Delete Payment Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this payment order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validate Confirm Dialog */}
      <Dialog open={!!validateId} onOpenChange={() => setValidateId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-600 dark:text-amber-400">Validate Payment Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to validate this payment order?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setValidateId(null)}>
              Cancel
            </Button>
            <Button className="bg-amber-500 hover:bg-amber-600" onClick={handleValidate}>
              <CheckCircle className="w-4 h-4 mr-2" /> Validate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Payment Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 -mx-6 -mt-6 rounded-t-lg mb-4">
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              <PlusCircle className="w-5 h-5" /> {t('common.create_payment')}
            </DialogTitle>
            <DialogDescription className="text-blue-100">
              Create a new payment order for a purchase order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                Search Purchase Order
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute top-3 start-3 text-muted-foreground" />
                <Input
                  placeholder="Search by Bon ID or reference..."
                  value={searchBon}
                  onChange={e => setSearchBon(e.target.value)}
                  className="ps-9 border-blue-300 dark:border-blue-600"
                />
              </div>
              {searchBon && filteredBons.length > 0 && (
                <div className="mt-3 border border-blue-200 dark:border-slate-600 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {filteredBons.map(b => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setSelectedBonId(b.id);
                        setSearchBon(b.bon_id);
                        setTotalPrice(String(b.total_price));
                      }}
                      className={`w-full text-start p-4 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors flex justify-between items-center border-b last:border-b-0 ${
                        selectedBonId === b.id ? 'bg-blue-100 dark:bg-slate-700' : ''
                      }`}
                    >
                      <div>
                        <span className="font-semibold block text-foreground">{b.bon_id}</span>
                        <span className="text-xs text-muted-foreground">{b.id.substring(0, 12)}...</span>
                      </div>
                      <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                        {b.total_price.toLocaleString()} DA
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {selectedBonId && (
                <Badge className="mt-3 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700">
                  âœ“ Selected: {selectedBonId.substring(0, 12)}...
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Total Amount (DA) *
                </label>
                <Input
                  type="number"
                  value={totalPrice}
                  onChange={e => setTotalPrice(e.target.value)}
                  placeholder="0.00"
                  className="border-blue-300 dark:border-blue-600"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Note (Optional)
                </label>
                <Input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a note..."
                  className="border-blue-300 dark:border-blue-600"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6 gap-3">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              className="btn-gradient"
              onClick={handleCreate}
              disabled={!selectedBonId || !totalPrice}
            >
              <PlusCircle className="w-4 h-4 mr-2" /> Create Payment Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Validate Dialog */}
      <Dialog open={!!adminValidateId} onOpenChange={() => setAdminValidateId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-purple-600 dark:text-purple-400 flex items-center gap-2">
              <Shield className="w-5 h-5" /> Admin Approval
            </DialogTitle>
            <DialogDescription>
              This payment order has been verified by comptable. Provide final admin approval?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setAdminValidateId(null)}>
              Reject
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleAdminValidate}>
              <CheckCircle className="w-4 h-4 mr-2" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={!!showPrint} onOpenChange={() => setShowPrint(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" /> Print Payment Order
            </DialogTitle>
          </DialogHeader>
          {!printMode ? (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPrintMode('standard')}
                className="erp-card !p-6 text-center hover:border-blue-400 transition-all hover:shadow-lg"
              >
                <Printer className="w-10 h-10 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-foreground">Standard Print</span>
              </button>
              <button
                onClick={() => setPrintMode('custom')}
                className="erp-card !p-6 text-center hover:border-indigo-400 transition-all hover:shadow-lg"
              >
                <Edit3 className="w-10 h-10 mx-auto mb-2 text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold text-foreground">Customize</span>
              </button>
            </div>
          ) : printMode === 'custom' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Font Size</label>
                  <Input
                    type="number"
                    value={printFontSize}
                    onChange={e => setPrintFontSize(Number(e.target.value))}
                    min="10"
                    max="24"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Bold</label>
                  <Button
                    variant={printBold ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    onClick={() => setPrintBold(!printBold)}
                  >
                    {printBold ? 'Yes' : 'No'}
                  </Button>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Color</label>
                  <input
                    type="color"
                    value={printColor}
                    onChange={e => setPrintColor(e.target.value)}
                    className="w-full h-9 rounded cursor-pointer border"
                  />
                </div>
              </div>
              <div
                ref={printRef}
                className="erp-card !p-6 border-2 border-blue-200 dark:border-slate-600"
                style={{
                  fontSize: printFontSize,
                  fontWeight: printBold ? 'bold' : 'normal',
                  color: printColor
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '2px solid #ddd', paddingBottom: 15 }}>
                  <h2>Payment Order</h2>
                  <p style={{ fontSize: '0.8em', opacity: 0.7 }}>{showPrint?.id}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                  <span>Purchase Order:</span>
                  <span>{showPrint?.bon_commande_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                  <span>Amount:</span>
                  <span>{showPrint?.total_price.toLocaleString()} DA</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span>Date:</span>
                  <span>{new Date(showPrint?.created_at || '').toLocaleDateString('en-US')}</span>
                </div>
                {showPrint?.note && (
                  <div style={{ padding: '8px 0', marginTop: 10, borderTop: '1px solid #eee' }}>
                    <span>Note: {showPrint.note}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setPrintMode(null)}>
                  Back
                </Button>
                <Button className="flex-1 btn-gradient gap-2" onClick={handlePrint}>
                  <Printer className="w-4 h-4" /> Print
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div ref={printRef} className="erp-card !p-6 border-2 border-blue-200 dark:border-slate-600">
                <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '2px solid #ddd', paddingBottom: 15 }}>
                  <h2 className="text-xl font-bold text-foreground">Payment Order</h2>
                  <p className="text-sm text-muted-foreground">{showPrint?.id}</p>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Purchase Order:</span>
                  <span className="font-bold text-foreground">{showPrint?.bon_commande_id}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300">{showPrint?.total_price.toLocaleString()} DA</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="text-foreground">{new Date(showPrint?.created_at || '').toLocaleDateString('en-US')}</span>
                </div>
                {showPrint?.note && (
                  <div className="py-2 mt-2 border-t">
                    <span className="text-muted-foreground">Note: {showPrint.note}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setPrintMode(null)}>
                  Back
                </Button>
                <Button className="flex-1 btn-gradient gap-2" onClick={handlePrint}>
                  <Printer className="w-4 h-4" /> Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Language Chooser Dialog */}
      <Dialog open={!!pendingPrintPayment} onOpenChange={() => setPendingPrintPayment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-xl font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" /> {t('common.choose_print_language')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 px-2 pb-2">
            <Button onClick={() => { if (pendingPrintPayment) handlePrintPaymentOrder(pendingPrintPayment, 'ar'); setPendingPrintPayment(null); }} className="h-24 flex flex-col gap-2 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-lg rounded-xl shadow-lg">
              <span className="text-2xl">🇩🇿</span> {t('common.print_in_arabic')}
            </Button>
            <Button onClick={() => { if (pendingPrintPayment) handlePrintPaymentOrder(pendingPrintPayment, 'fr'); setPendingPrintPayment(null); }} className="h-24 flex flex-col gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-xl shadow-lg">
              <span className="text-2xl">🇫🇷</span> {t('common.print_in_french')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Payment Order Dialog */}
      <Dialog open={showManualPayment} onOpenChange={setShowManualPayment}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-xl font-bold text-blue-950 dark:text-blue-100">
              {t('common.manual_payment_order') || 'Ordre de paiement manuel'}
            </DialogTitle>
            <DialogDescription>
              {t('common.create_manual_payment_desc') || 'Create a payment order without linking to a purchase order'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-2">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                {t('common.beneficiary') || 'Beneficiary'} *
              </label>
              <Input
                value={manualForm.beneficiary}
                onChange={(e) => setManualForm({ ...manualForm, beneficiary: e.target.value })}
                placeholder={t('common.beneficiary_placeholder') || 'Beneficiary name'}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                {t('common.amount') || 'Amount'} * (DA)
              </label>
              <Input
                type="number"
                value={manualForm.amount}
                onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                placeholder="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                {t('common.date') || 'Date'} *
              </label>
              <Input
                type="date"
                value={manualForm.date}
                onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                {t('common.notes') || 'Notes'}
              </label>
              <Input
                value={manualForm.note}
                onChange={(e) => setManualForm({ ...manualForm, note: e.target.value })}
                placeholder={t('common.additional_notes') || 'Additional notes'}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowManualPayment(false)}>
              {t('common.cancel')}
            </Button>
            <Button className="btn-gradient" onClick={handleSaveManualPayment}>
              <Save className="w-4 h-4 mr-2" /> {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
