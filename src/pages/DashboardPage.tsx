import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, PackageCheck, TrendingUp, AlertCircle, BarChart3,
  Users, CreditCard, Zap, Briefcase, Truck, DollarSign, Calendar,
  Package, Warehouse, Target, Home, Loader
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

const StatCard = ({ icon: Icon, label, value, gradient, delay }: { icon: React.ElementType; label: string; value: string | number; gradient: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="group relative erp-card hover:shadow-xl cursor-pointer border-2 border-blue-100 dark:border-slate-700 overflow-hidden"
  >
    {/* Background decoration */}
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
    </div>
  </motion.div>
);

const SectionHeader = ({ title, icon: Icon }: { title: string; icon: React.ElementType }) => (
  <div className="space-y-2 mb-6 mt-8">
    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
      <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
      <Icon className="w-5 h-5" />
      {title}
    </h2>
  </div>
);

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    // Purchase Commands
    totalCommandes: 0,
    pendingCommandes: 0,
    validatedCommandes: 0,
    // Bons de Commande
    bonsCreated: 0,
    totalBonsAmount: 0,
    totalBonsPending: 0,
    totalBonsValidated: 0,
    // Payment Orders
    totalPaymentOrders: 0,
    pendingPaymentOrders: 0,
    validatedPaymentOrders: 0,
    // Stock Management
    totalProducts: 0,
    totalQuantity: 0,
    lowStockProducts: 0,
    // Workers
    totalWorkers: 0,
    activeWorkers: 0,
    // Expenses
    totalWorkerExpenses: 0,
    totalEnterpriseExpenses: 0,
    // Debts
    totalDebts: 0,
    paidDebts: 0,
    pendingDebts: 0,
    // Projects
    totalProjects: 0,
    activeProjects: 0,
    // Appointments
    totalAppointments: 0,
    pendingAppointments: 0,
    // Suppliers
    totalSuppliers: 0,
    // General Finance
    totalCashFlow: 0,
    projectFinanceTotal: 0,
    // Budget
    totalBudget: 0,
  });
  const [loading, setLoading] = useState(true);

  // Load all statistics
  useEffect(() => {
    loadAllStats();
  }, []);

  const safeQuery = async (table: string, select: string = '*') => {
    try {
      const { data: result, error } = await supabase.from(table).select(select).limit(1000);
      if (error) {
        console.warn(`Table "${table}" not found or query failed:`, error.message);
        return [];
      }
      return result || [];
    } catch (err) {
      console.warn(`Error querying table "${table}":`, err);
      return [];
    }
  };

  const loadAllStats = async () => {
    try {
      setLoading(true);
      let newStats = { ...stats };

      // 1. Purchase Commands
      const allCommandes = await safeQuery('purchase_commands', 'id, status');
      newStats.totalCommandes = allCommandes.length || 0;
      newStats.pendingCommandes = allCommandes.filter((c: any) => c.status === 'pending').length || 0;
      newStats.validatedCommandes = allCommandes.filter((c: any) => c.status === 'validated').length || 0;

      // 2. Bons de Commande
      const allBons = await safeQuery('bons_commandes', 'id, status, total_with_tva');
      newStats.bonsCreated = allBons.length || 0;
      newStats.totalBonsAmount = allBons.reduce((sum: number, b: any) => sum + (b.total_with_tva || 0), 0) || 0;
      newStats.totalBonsPending = allBons.filter((b: any) => b.status === 'pending').length || 0;
      newStats.totalBonsValidated = allBons.filter((b: any) => b.status === 'validated').length || 0;

      // 3. Payment Orders
      const paymentOrders = await safeQuery('payment_orders', 'id, status');
      newStats.totalPaymentOrders = paymentOrders.length || 0;
      newStats.pendingPaymentOrders = paymentOrders.filter((o: any) => o.status === 'pending').length || 0;
      newStats.validatedPaymentOrders = paymentOrders.filter((o: any) => o.status === 'validated').length || 0;

      // 4. Products (Stock Management)
      const products = await safeQuery('products', 'id, quantity, unit_price');
      newStats.totalProducts = products.length || 0;
      newStats.totalQuantity = products.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0) || 0;
      newStats.lowStockProducts = products.filter((p: any) => (p.quantity || 0) < 10).length || 0;

      // 5. Workers (from users table)
      const workers = await safeQuery('users', 'id, role');
      newStats.totalWorkers = workers.length || 0;
      newStats.activeWorkers = workers.filter((w: any) => w.role && w.role !== 'admin').length || 0;

      // 6. Worker Expenses
      const workerExpenses = await safeQuery('worker_expenses', 'id, amount');
      newStats.totalWorkerExpenses = workerExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;

      // 7. Enterprise Expenses
      const enterpriseExpenses = await safeQuery('enterprise_expenses', 'id, amount');
      newStats.totalEnterpriseExpenses = enterpriseExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;

      // 8. Debts
      const debts = await safeQuery('debts', 'id, status, total_price, amount_paid');
      newStats.totalDebts = debts.length || 0;
      newStats.pendingDebts = debts.filter((d: any) => d.status === 'pending' || d.status === 'partial').length || 0;
      newStats.paidDebts = debts.filter((d: any) => d.status === 'paid').length || 0;

      // 9. Projects (from project_boxes table)
      const projects = await safeQuery('project_boxes', 'id, status');
      newStats.totalProjects = projects.length || 0;
      newStats.activeProjects = projects.filter((p: any) => p.status === 'pending' || p.status === 'active').length || 0;

      // 10. Appointments
      const appointments = await safeQuery('appointments', 'id, is_active');
      newStats.totalAppointments = appointments.length || 0;
      newStats.pendingAppointments = appointments.filter((a: any) => a.is_active === true).length || 0;

      // 11. Suppliers
      const suppliers = await safeQuery('suppliers', 'id, is_active');
      newStats.totalSuppliers = suppliers.length || 0;

      // 12. Cash Flow (general_cash_box instead of finance_box)
      const cashFlow = await safeQuery('general_cash_box', 'id, amount');
      newStats.totalCashFlow = cashFlow.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0;

      // 13. Project Finance
      const projectFinance = await safeQuery('project_expenses', 'id, price');
      newStats.projectFinanceTotal = projectFinance.reduce((sum: number, e: any) => sum + (e.price || 0), 0) || 0;

      // 14. Budget (using project_boxes total_budget field)
      const projectBoxes = await safeQuery('project_boxes', 'id, total_budget');
      newStats.totalBudget = projectBoxes.reduce((sum: number, b: any) => sum + (b.total_budget || 0), 0) || 0;

      setStats(newStats);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t('login.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${i18n.language === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-1">
          {t('dashboard.welcome')}، {user?.fullName}
        </h1>
        <p className="text-muted-foreground text-sm">{new Date().toLocaleDateString()}</p>
        <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mt-2">{t('dashboard.complete_dashboard')} - {t('roles.admin')}</p>
      </motion.div>

      {/* 1. Stock Management */}
      <SectionHeader title={`📦 ${t('dashboard.stock_management')}`} icon={Warehouse} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={Package} label={t('dashboard.total_products')} value={stats.totalProducts} gradient="bg-gradient-to-br from-blue-500 to-blue-600" delay={0.1} />
        <StatCard icon={BarChart3} label={t('dashboard.total_quantity')} value={stats.totalQuantity} gradient="bg-gradient-to-br from-cyan-500 to-blue-500" delay={0.15} />
        <StatCard icon={AlertCircle} label={t('dashboard.low_stock_alert')} value={stats.lowStockProducts} gradient="bg-gradient-to-br from-amber-500 to-orange-500" delay={0.2} />
      </div>

      {/* 2. Suppliers */}
      <SectionHeader title={`🚚 ${t('dashboard.supplier_management')}`} icon={Truck} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard icon={Truck} label={t('dashboard.total_suppliers')} value={stats.totalSuppliers} gradient="bg-gradient-to-br from-green-500 to-emerald-500" delay={0.25} />
      </div>

      {/* 3. Projects */}
      <SectionHeader title={`🎯 ${t('dashboard.project_management')}`} icon={Briefcase} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={Briefcase} label={t('dashboard.total_projects')} value={stats.totalProjects} gradient="bg-gradient-to-br from-purple-500 to-indigo-500" delay={0.3} />
        <StatCard icon={Zap} label={t('dashboard.active_projects')} value={stats.activeProjects} gradient="bg-gradient-to-br from-pink-500 to-purple-500" delay={0.35} />
      </div>

      {/* 4. General Finance */}
      <SectionHeader title={`💰 ${t('dashboard.general_cash')}`} icon={DollarSign} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard icon={DollarSign} label={t('dashboard.total_cash')} value={`${stats.totalCashFlow.toLocaleString()} DA`} gradient="bg-gradient-to-br from-green-500 to-teal-500" delay={0.4} />
      </div>

      {/* 5. Project Finance */}
      <SectionHeader title={`📊 ${t('dashboard.project_finances')}`} icon={BarChart3} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard icon={TrendingUp} label={t('dashboard.total_expenses')} value={`${stats.projectFinanceTotal.toLocaleString()} DA`} gradient="bg-gradient-to-br from-indigo-500 to-blue-500" delay={0.45} />
      </div>

      {/* 6. Workers */}
      <SectionHeader title={`👥 ${t('dashboard.workers')}`} icon={Users} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={Users} label={t('dashboard.total_workers')} value={stats.totalWorkers} gradient="bg-gradient-to-br from-orange-500 to-red-500" delay={0.5} />
        <StatCard icon={Zap} label={t('dashboard.active_workers')} value={stats.activeWorkers} gradient="bg-gradient-to-br from-red-500 to-pink-500" delay={0.55} />
      </div>

      {/* 7. Worker Expenses */}
      <SectionHeader title={`💳 ${t('dashboard.worker_expenses')}`} icon={CreditCard} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard icon={CreditCard} label={t('dashboard.total_expenses')} value={`${stats.totalWorkerExpenses.toLocaleString()} DA`} gradient="bg-gradient-to-br from-red-500 to-rose-500" delay={0.6} />
      </div>

      {/* 8. Enterprise Expenses */}
      <SectionHeader title={`🏢 ${t('dashboard.enterprise_expenses')}`} icon={Home} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard icon={Home} label={t('dashboard.total_expenses')} value={`${stats.totalEnterpriseExpenses.toLocaleString()} DA`} gradient="bg-gradient-to-br from-yellow-500 to-amber-500" delay={0.65} />
      </div>

      {/* 9. Material Commands */}
      <SectionHeader title={`🛍️ ${t('dashboard.material_commands')}`} icon={ShoppingCart} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={ShoppingCart} label={t('dashboard.total_commands')} value={stats.totalCommandes} gradient="bg-gradient-to-br from-blue-500 to-cyan-500" delay={0.7} />
        <StatCard icon={AlertCircle} label={t('common.pending')} value={stats.pendingCommandes} gradient="bg-gradient-to-br from-yellow-500 to-amber-500" delay={0.75} />
        <StatCard icon={PackageCheck} label={t('common.validated')} value={stats.validatedCommandes} gradient="bg-gradient-to-br from-emerald-500 to-green-500" delay={0.8} />
      </div>

      {/* 10. Purchase Commands */}
      <SectionHeader title={`🛒 ${t('dashboard.purchase_commands')}`} icon={ShoppingCart} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={ShoppingCart} label={t('dashboard.total_commands')} value={stats.totalCommandes} gradient="bg-gradient-to-br from-blue-600 to-blue-500" delay={0.85} />
        <StatCard icon={AlertCircle} label={t('common.pending')} value={stats.pendingCommandes} gradient="bg-gradient-to-br from-orange-500 to-yellow-500" delay={0.9} />
        <StatCard icon={PackageCheck} label={t('common.validated')} value={stats.validatedCommandes} gradient="bg-gradient-to-br from-green-500 to-emerald-500" delay={0.95} />
      </div>

      {/* 11. Purchase Orders (Bons de Commande) */}
      <SectionHeader title={`📦 ${t('dashboard.purchase_orders')}`} icon={Package} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <StatCard icon={Package} label={t('dashboard.total_orders')} value={stats.bonsCreated} gradient="bg-gradient-to-br from-emerald-500 to-teal-500" delay={1.0} />
        <StatCard icon={AlertCircle} label={t('common.pending')} value={stats.totalBonsPending} gradient="bg-gradient-to-br from-amber-500 to-orange-500" delay={1.05} />
        <StatCard icon={PackageCheck} label={t('common.validated')} value={stats.totalBonsValidated} gradient="bg-gradient-to-br from-cyan-500 to-blue-500" delay={1.1} />
        <StatCard icon={Zap} label={t('dashboard.total_cash')} value={`${stats.totalBonsAmount.toLocaleString()} DA`} gradient="bg-gradient-to-br from-violet-500 to-purple-500" delay={1.15} />
      </div>

      {/* 12. Payment Orders */}
      <SectionHeader title={`💵 ${t('dashboard.payment_orders')}`} icon={CreditCard} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={CreditCard} label={t('dashboard.total_orders')} value={stats.totalPaymentOrders} gradient="bg-gradient-to-br from-blue-500 to-indigo-500" delay={1.2} />
        <StatCard icon={AlertCircle} label={t('common.pending')} value={stats.pendingPaymentOrders} gradient="bg-gradient-to-br from-yellow-500 to-amber-500" delay={1.25} />
        <StatCard icon={PackageCheck} label={t('common.validated')} value={stats.validatedPaymentOrders} gradient="bg-gradient-to-br from-emerald-500 to-green-500" delay={1.3} />
      </div>

      {/* 13. Budget */}
      <SectionHeader title={`📈 ${t('dashboard.budgets')}`} icon={BarChart3} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard icon={BarChart3} label={t('dashboard.total_budget')} value={`${stats.totalBudget.toLocaleString()} DA`} gradient="bg-gradient-to-br from-indigo-600 to-blue-500" delay={1.35} />
      </div>

      {/* 14. Debts */}
      <SectionHeader title={`💸 ${t('dashboard.debts_management')}`} icon={AlertCircle} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={AlertCircle} label={t('dashboard.total_debts')} value={stats.totalDebts} gradient="bg-gradient-to-br from-red-500 to-rose-500" delay={1.4} />
        <StatCard icon={AlertCircle} label={t('dashboard.pending_debts')} value={stats.pendingDebts} gradient="bg-gradient-to-br from-orange-500 to-red-500" delay={1.45} />
        <StatCard icon={PackageCheck} label={t('dashboard.paid_debts')} value={stats.paidDebts} gradient="bg-gradient-to-br from-green-500 to-emerald-500" delay={1.5} />
      </div>

      {/* 15. Appointments */}
      <SectionHeader title={`📅 ${t('dashboard.appointments')}`} icon={Calendar} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={Calendar} label={t('dashboard.total_appointments')} value={stats.totalAppointments} gradient="bg-gradient-to-br from-purple-500 to-pink-500" delay={1.55} />
        <StatCard icon={AlertCircle} label={t('common.pending')} value={stats.pendingAppointments} gradient="bg-gradient-to-br from-pink-500 to-rose-500" delay={1.6} />
      </div>
    </div>
  );
}
