import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3, TrendingUp, TrendingDown, Wallet, Package, CreditCard,
  FileText, Building2, Users, HandCoins, CalendarDays, CheckCircle, XCircle,
  Printer, Download, Loader, AlertCircle, Eye, Package2, Truck, Home, Briefcase,
  DollarSign, Calendar, ShoppingCart, FileJson, X, Filter, RefreshCw, Plus, Search,
  ChevronDown, ArrowRight
} from 'lucide-react';

interface FilterOptions {
  dateRangeType: 'custom' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear';
  startDate: string;
  endDate: string;
  storages: string[];
  projects: string[];
  suppliers: string[];
  workers: string[];
  chefDeProjets: string[];
  statusFilters: {
    materialCommands: string[];
    purchaseCommands: string[];
    bonsCommandes: string[];
    debts: string[];
  };
}

export default function EnhancedFinancialReportPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { enterpriseSettings } = useData();

  // Data lists for filtering
  const [storages, setStorages] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [chefDeProjets, setChefDeProjets] = useState<any[]>([]);

  // Filter states
  const [filters, setFilters] = useState<FilterOptions>({
    dateRangeType: 'thisMonth',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    storages: [],
    projects: [],
    suppliers: [],
    workers: [],
    chefDeProjets: [],
    statusFilters: {
      materialCommands: [],
      purchaseCommands: [],
      bonsCommandes: [],
      debts: [],
    },
  });

  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  // Load initial data
  useEffect(() => {
    loadCompanyInfo();
    loadFilterOptions();
    setDateRange('thisMonth');
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const { data } = await supabase.from('enterprise_settings').select('company_name, logo_url, address, phone, email').limit(1);
      if (data && data.length > 0) {
        setCompanyInfo(data[0]);
      }
    } catch (err) {
      console.warn('Error loading company info:', err);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [storagesData, projectsData, suppliersData, workersData] = await Promise.all([
        safeQuery('storages', 'id, name'),
        safeQuery('project_boxes', 'id, name'),
        safeQuery('suppliers', 'id, name'),
        safeQuery('users', 'id, full_name, role'),
      ]);

      setStorages(storagesData as any[]);
      setProjects(projectsData as any[]);
      setSuppliers(suppliersData as any[]);
      setWorkers((workersData as any[]).filter((w: any) => w.role !== 'admin'));
      setChefDeProjets((workersData as any[]).filter((w: any) => w.role === 'chef_projet'));
    } catch (err) {
      console.warn('Error loading filter options:', err);
    }
  };

  const safeQuery = async (table: string, select: string = '*') => {
    try {
      const { data: result, error } = await supabase.from(table).select(select).limit(1000);
      if (error) {
        console.warn(`Table "${table}" not found:`, error.message);
        return [];
      }
      return result || [];
    } catch (err) {
      console.warn(`Error querying table "${table}":`, err);
      return [];
    }
  };

  const setDateRange = (type: string) => {
    const today = new Date();
    let start, end;

    switch (type) {
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'thisQuarter':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        end = today;
        break;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        end = today;
        break;
      default:
        return;
    }

    setFilters(prev => ({
      ...prev,
      dateRangeType: type as any,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }));
  };

  const generateReport = async () => {
    if (!filters.startDate || !filters.endDate) {
      alert(t('common.select_date_range') || 'Please select date range');
      return;
    }

    setLoading(true);
    try {
      const data: any = {};

      // 1. Stock Management - Filter by storages if selected
      let products = await safeQuery('products', 'id, name, quantity, unit_price, storage_id');
      if (filters.storages.length > 0) {
        products = (products as any[]).filter((p: any) => filters.storages.includes(p.storage_id));
      }

      data.stock = {
        totalProducts: products.length || 0,
        totalQuantity: (products as any[]).reduce((s: number, p: any) => s + (p.quantity || 0), 0) || 0,
        totalValue: (products as any[]).reduce((s: number, p: any) => s + ((p.quantity || 0) * (p.unit_price || 0)), 0) || 0,
        lowStock: (products as any[]).filter((p: any) => (p.quantity || 0) < 10).length || 0,
        details: products,
      };

      // 2. Suppliers - Filter if selected
      let suppliersData = await safeQuery('suppliers', 'id, name, email, phone, contact_person, is_active');
      if (filters.suppliers.length > 0) {
        suppliersData = (suppliersData as any[]).filter((s: any) => filters.suppliers.includes(s.id));
      }

      data.suppliers = {
        total: suppliersData.length || 0,
        active: (suppliersData as any[]).filter((s: any) => s.is_active === true).length || 0,
        details: suppliersData || [],
      };

      // 3. Projects - Filter if selected
      let projectBoxes = await safeQuery('project_boxes', 'id, name, status, total_amount, total_budget, chef_id');
      if (filters.projects.length > 0) {
        projectBoxes = (projectBoxes as any[]).filter((p: any) => filters.projects.includes(p.id));
      }
      if (filters.chefDeProjets.length > 0) {
        projectBoxes = (projectBoxes as any[]).filter((p: any) => filters.chefDeProjets.includes(p.chef_id));
      }

      data.projects = {
        total: projectBoxes.length || 0,
        active: (projectBoxes as any[]).filter((p: any) => p.status === 'pending' || p.status === 'active').length || 0,
        details: projectBoxes || [],
      };

      // 4. General Finance
      const cashFlow = await safeQuery('general_cash_box', 'id, amount, description, transaction_type, transaction_date');
      data.generalFinance = {
        total: (cashFlow as any[]).reduce((s: number, c: any) => s + (c.amount || 0), 0) || 0,
        count: cashFlow.length || 0,
        details: cashFlow || [],
      };

      // 5. Project Finance
      let projectExpenses = await safeQuery('project_expenses', 'id, price, description, category, expense_date, project_id');
      if (filters.projects.length > 0) {
        projectExpenses = (projectExpenses as any[]).filter((e: any) => filters.projects.includes(e.project_id));
      }

      data.projectFinance = {
        total: (projectExpenses as any[]).reduce((s: number, e: any) => s + (e.price || 0), 0) || 0,
        count: projectExpenses.length || 0,
        details: projectExpenses || [],
      };

      // 6. Workers - Filter if selected
      let workersData = await safeQuery('users', 'id, full_name, role, email');
      if (filters.workers.length > 0) {
        workersData = (workersData as any[]).filter((w: any) => filters.workers.includes(w.id));
      }

      data.workers = {
        total: workersData.length || 0,
        active: (workersData as any[]).filter((w: any) => w.role && w.role !== 'admin').length || 0,
        details: workersData || [],
      };

      // 7. Worker Expenses
      let workerExpenses = await safeQuery('worker_expenses', 'id, amount, worker_name, category, expense_date, worker_id');
      if (filters.workers.length > 0) {
        workerExpenses = (workerExpenses as any[]).filter((e: any) => filters.workers.some((w: any) => e.worker_name?.includes(w) || e.worker_id === w));
      }

      data.workerExpenses = {
        total: (workerExpenses as any[]).reduce((s: number, e: any) => s + (e.amount || 0), 0) || 0,
        count: workerExpenses.length || 0,
        details: workerExpenses || [],
      };

      // 8. Enterprise Expenses
      const enterpriseExpenses = await safeQuery('enterprise_expenses', 'id, amount, name, category, expense_date');
      data.enterpriseExpenses = {
        total: (enterpriseExpenses as any[]).reduce((s: number, e: any) => s + (e.amount || 0), 0) || 0,
        count: enterpriseExpenses.length || 0,
        details: enterpriseExpenses || [],
      };

      // 9. Material Commands - Filter by status if selected
      let materialCommands = await safeQuery('material_commands', 'id, status, command_id, created_at');
      if (filters.statusFilters.materialCommands.length > 0) {
        materialCommands = (materialCommands as any[]).filter((c: any) => filters.statusFilters.materialCommands.includes(c.status));
      }

      data.materialCommands = {
        total: materialCommands.length || 0,
        pending: (materialCommands as any[]).filter((c: any) => c.status === 'pending').length || 0,
        validated: (materialCommands as any[]).filter((c: any) => c.status === 'validated').length || 0,
        purchase: (materialCommands as any[]).filter((c: any) => c.status === 'purchase').length || 0,
        details: materialCommands || [],
      };

      // 10. Purchase Commands
      let purchaseCommands = await safeQuery('purchase_commands', 'id, status, command_id, supplier_name, supplier_id, created_at');
      if (filters.suppliers.length > 0) {
        purchaseCommands = (purchaseCommands as any[]).filter((c: any) => filters.suppliers.includes(c.supplier_id));
      }
      if (filters.statusFilters.purchaseCommands.length > 0) {
        purchaseCommands = (purchaseCommands as any[]).filter((c: any) => filters.statusFilters.purchaseCommands.includes(c.status));
      }

      data.purchaseCommands = {
        total: purchaseCommands.length || 0,
        pending: (purchaseCommands as any[]).filter((c: any) => c.status === 'pending').length || 0,
        validated: (purchaseCommands as any[]).filter((c: any) => c.status === 'validated').length || 0,
        details: purchaseCommands || [],
      };

      // 11. Bons de Commande
      let bonsCommandes = await safeQuery('bons_commandes', 'id, status, bon_id, total_with_tva, supplier_id, supplier_name, created_at');
      if (filters.suppliers.length > 0) {
        bonsCommandes = (bonsCommandes as any[]).filter((b: any) => filters.suppliers.includes(b.supplier_id));
      }
      if (filters.statusFilters.bonsCommandes.length > 0) {
        bonsCommandes = (bonsCommandes as any[]).filter((b: any) => filters.statusFilters.bonsCommandes.includes(b.status));
      }

      data.bonsCommandes = {
        total: bonsCommandes.length || 0,
        pending: (bonsCommandes as any[]).filter((b: any) => b.status === 'pending').length || 0,
        validated: (bonsCommandes as any[]).filter((b: any) => b.status === 'validated').length || 0,
        paid: (bonsCommandes as any[]).filter((b: any) => b.status === 'paid').length || 0,
        totalAmount: (bonsCommandes as any[]).reduce((s: number, b: any) => s + (b.total_with_tva || 0), 0) || 0,
        details: bonsCommandes || [],
      };

      // 12. Payment Orders
      const paymentOrders = await safeQuery('payment_orders', 'id, status, total_price, note, created_at');
      data.paymentOrders = {
        total: paymentOrders.length || 0,
        pending: (paymentOrders as any[]).filter((o: any) => o.status === 'pending').length || 0,
        validated: (paymentOrders as any[]).filter((o: any) => o.status === 'validated').length || 0,
        totalAmount: (paymentOrders as any[]).reduce((s: number, o: any) => s + (o.total_price || 0), 0) || 0,
        details: paymentOrders || [],
      };

      // 13. Debts
      let debts = await safeQuery('debts', 'id, status, total_price, amount_paid, supplier_name, supplier_id, remaining_balance, created_at');
      if (filters.suppliers.length > 0) {
        debts = (debts as any[]).filter((d: any) => filters.suppliers.includes(d.supplier_id));
      }
      if (filters.statusFilters.debts.length > 0) {
        debts = (debts as any[]).filter((d: any) => filters.statusFilters.debts.includes(d.status));
      }

      data.debts = {
        total: debts.length || 0,
        pending: (debts as any[]).filter((d: any) => d.status === 'pending').length || 0,
        partial: (debts as any[]).filter((d: any) => d.status === 'partial').length || 0,
        paid: (debts as any[]).filter((d: any) => d.status === 'paid').length || 0,
        totalAmount: (debts as any[]).reduce((s: number, d: any) => s + (d.total_price || 0), 0) || 0,
        paidAmount: (debts as any[]).reduce((s: number, d: any) => s + (d.amount_paid || 0), 0) || 0,
        remaining: (debts as any[]).reduce((s: number, d: any) => s + (d.remaining_balance || 0), 0) || 0,
        details: debts || [],
      };

      // 14. Appointments
      const appointments = await safeQuery('appointments', 'id, is_active, title, date, time');
      data.appointments = {
        total: appointments.length || 0,
        active: (appointments as any[]).filter((a: any) => a.is_active === true).length || 0,
        details: appointments || [],
      };

      // 15. Budget
      const budgetBoxes = await safeQuery('project_boxes', 'id, total_budget, name, total_amount');
      data.budget = {
        total: (budgetBoxes as any[]).reduce((s: number, b: any) => s + (b.total_budget || 0), 0) || 0,
        spent: (budgetBoxes as any[]).reduce((s: number, b: any) => s + (b.total_amount || 0), 0) || 0,
        remaining: (budgetBoxes as any[]).reduce((s: number, b: any) => s + ((b.total_budget || 0) - (b.total_amount || 0)), 0) || 0,
        details: budgetBoxes || [],
      };

      setReportData({ ...data, startDate: filters.startDate, endDate: filters.endDate, generatedAt: new Date().toLocaleString(), companyInfo, filters });
      setShowReport(true);
    } catch (err) {
      console.error('Error generating report:', err);
      alert('Error generating report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const activeFiltersCount = [
    ...filters.storages,
    ...filters.projects,
    ...filters.suppliers,
    ...filters.workers,
    ...filters.chefDeProjets,
    ...Object.values(filters.statusFilters).flat(),
  ].length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              {t('nav.budget')}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t('common.generate_financial_reports')}
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
        </div>
      </motion.div>

      {/* Main Controls */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Card className="border-2 border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
          <CardContent className="pt-6">
            {/* Quick Date Range Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                {t('common.date_range') || 'Date Range'}
              </h3>

              <div className="flex gap-2 mb-4 flex-wrap">
                {['thisMonth', 'lastMonth', 'thisQuarter', 'thisYear', 'custom'].map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      if (type !== 'custom') {
                        setDateRange(type);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      filters.dateRangeType === type
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                        : 'bg-slate-100 dark:bg-slate-700 text-foreground hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {t(`common.date_${type}`) || type}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">{t('common.start_date') || 'Start Date'}</label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="border-blue-200 dark:border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">{t('common.end_date') || 'End Date'}</label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="border-blue-200 dark:border-slate-600"
                  />
                </div>
              </div>

              {/* Advanced Filters Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full px-4 py-3 flex items-center justify-between bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-all border border-slate-200 dark:border-slate-600"
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <span className="font-semibold">{t('common.advanced_filters') || 'Advanced Filters'}</span>
                  {activeFiltersCount > 0 && (
                    <Badge className="bg-blue-100 text-blue-700">{activeFiltersCount}</Badge>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {/* Advanced Filters Panel */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-600"
                  >
                    {/* Storages */}
                    {storages.length > 0 && (
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-2 block">📦 {t('common.storages') || 'Storages'}</label>
                        <div className="flex flex-wrap gap-2">
                          {storages.map(storage => (
                            <button
                              key={storage.id}
                              onClick={() => {
                                setFilters(prev => ({
                                  ...prev,
                                  storages: prev.storages.includes(storage.id)
                                    ? prev.storages.filter(id => id !== storage.id)
                                    : [...prev.storages, storage.id]
                                }));
                              }}
                              className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                                filters.storages.includes(storage.id)
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-foreground hover:bg-slate-300'
                              }`}
                            >
                              {storage.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Projects */}
                    {projects.length > 0 && (
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-2 block">🎯 {t('common.projects') || 'Projects'}</label>
                        <div className="flex flex-wrap gap-2">
                          {projects.map(project => (
                            <button
                              key={project.id}
                              onClick={() => {
                                setFilters(prev => ({
                                  ...prev,
                                  projects: prev.projects.includes(project.id)
                                    ? prev.projects.filter(id => id !== project.id)
                                    : [...prev.projects, project.id]
                                }));
                              }}
                              className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                                filters.projects.includes(project.id)
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-foreground hover:bg-slate-300'
                              }`}
                            >
                              {project.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suppliers */}
                    {suppliers.length > 0 && (
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-2 block">🚚 {t('common.supplier') || 'Suppliers'}</label>
                        <div className="flex flex-wrap gap-2">
                          {suppliers.map(supplier => (
                            <button
                              key={supplier.id}
                              onClick={() => {
                                setFilters(prev => ({
                                  ...prev,
                                  suppliers: prev.suppliers.includes(supplier.id)
                                    ? prev.suppliers.filter(id => id !== supplier.id)
                                    : [...prev.suppliers, supplier.id]
                                }));
                              }}
                              className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                                filters.suppliers.includes(supplier.id)
                                  ? 'bg-green-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-foreground hover:bg-slate-300'
                              }`}
                            >
                              {supplier.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Workers */}
                    {workers.length > 0 && (
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-2 block">👥 {t('common.workers') || 'Workers'}</label>
                        <div className="flex flex-wrap gap-2">
                          {workers.map(worker => (
                            <button
                              key={worker.id}
                              onClick={() => {
                                setFilters(prev => ({
                                  ...prev,
                                  workers: prev.workers.includes(worker.id)
                                    ? prev.workers.filter(id => id !== worker.id)
                                    : [...prev.workers, worker.id]
                                }));
                              }}
                              className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                                filters.workers.includes(worker.id)
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-foreground hover:bg-slate-300'
                              }`}
                            >
                              {worker.full_name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Chef de Projets */}
                    {chefDeProjets.length > 0 && (
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-2 block">👔 {t('common.chef_de_projet') || 'Chef de Projet'}</label>
                        <div className="flex flex-wrap gap-2">
                          {chefDeProjets.map(chef => (
                            <button
                              key={chef.id}
                              onClick={() => {
                                setFilters(prev => ({
                                  ...prev,
                                  chefDeProjets: prev.chefDeProjets.includes(chef.id)
                                    ? prev.chefDeProjets.filter(id => id !== chef.id)
                                    : [...prev.chefDeProjets, chef.id]
                                }));
                              }}
                              className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                                filters.chefDeProjets.includes(chef.id)
                                  ? 'bg-red-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-foreground hover:bg-slate-300'
                              }`}
                            >
                              {chef.full_name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Status Filters */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-2 block">🛍️ {t('common.material_commands') || 'Material Commands'}</label>
                        <div className="space-y-1">
                          {['pending', 'validated', 'purchase'].map(status => (
                            <label key={status} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={filters.statusFilters.materialCommands.includes(status)}
                                onChange={e => {
                                  setFilters(prev => ({
                                    ...prev,
                                    statusFilters: {
                                      ...prev.statusFilters,
                                      materialCommands: e.target.checked
                                        ? [...prev.statusFilters.materialCommands, status]
                                        : prev.statusFilters.materialCommands.filter(s => s !== status)
                                    }
                                  }));
                                }}
                                className="rounded"
                              />
                              <span className="text-sm">{t(`common.status_${status}`) || status}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-foreground mb-2 block">💸 {t('common.debts') || 'Debts'}</label>
                        <div className="space-y-1">
                          {['pending', 'partial', 'paid'].map(status => (
                            <label key={status} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={filters.statusFilters.debts.includes(status)}
                                onChange={e => {
                                  setFilters(prev => ({
                                    ...prev,
                                    statusFilters: {
                                      ...prev.statusFilters,
                                      debts: e.target.checked
                                        ? [...prev.statusFilters.debts, status]
                                        : prev.statusFilters.debts.filter(s => s !== status)
                                    }
                                  }));
                                }}
                                className="rounded"
                              />
                              <span className="text-sm">{t(`common.status_${status}`) || status}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Clear Filters Button */}
                    <button
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          storages: [],
                          projects: [],
                          suppliers: [],
                          workers: [],
                          chefDeProjets: [],
                          statusFilters: {
                            materialCommands: [],
                            purchaseCommands: [],
                            bonsCommandes: [],
                            debts: [],
                          }
                        }));
                      }}
                      className="w-full px-4 py-2 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-300 rounded-lg transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {t('common.clear_filters') || 'Clear Filters'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Generate Button */}
              <Button
                onClick={generateReport}
                disabled={loading}
                className="w-full btn-gradient text-white font-semibold gap-2 h-12 text-base"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {t('common.generating') || 'Generating...'}
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    {t('common.generate_report') || 'Generate Report'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Report Display */}
      {reportData && showReport && (
        <EnhancedReportDisplay
          data={reportData}
          onClose={() => setShowReport(false)}
          t={t}
        />
      )}
    </div>
  );
}

// Enhanced Report Display Component
function EnhancedReportDisplay({ data, onClose, t }: any) {
  const handlePrintReport = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const csvContent = generateCSVContent(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Financial_Report_${data.startDate}_to_${data.endDate}.csv`;
    link.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Report Header */}
      <Card className="border-2 border-blue-100 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 shadow-lg overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {data.companyInfo?.logo_url && (
                <img src={data.companyInfo.logo_url} alt="Logo" className="h-16 w-16 object-contain" />
              )}
              <div>
                <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {data.companyInfo?.company_name || 'Company Report'}
                </h2>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {t('common.financial_report')} | {data.startDate} to {data.endDate}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {t('common.generated')}: {data.generatedAt}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="no-print p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition"
            >
              <X className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Report Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Management */}
        <ReportCard
          icon={Package}
          title="📦 Stock Management"
          color="from-blue-500 to-blue-600"
        >
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Total Products" value={data.stock.totalProducts} />
            <StatBox label="Total Quantity" value={data.stock.totalQuantity} />
            <StatBox label="Low Stock" value={data.stock.lowStock} />
            <StatBox label="Total Value" value={`${(data.stock.totalValue / 1000).toFixed(1)}K DA`} />
          </div>
        </ReportCard>

        {/* Suppliers */}
        <ReportCard
          icon={Truck}
          title="🚚 Suppliers"
          color="from-green-500 to-emerald-500"
        >
          <div className="space-y-2">
            <StatBox label="Total Suppliers" value={data.suppliers.total} />
            <StatBox label="Active" value={data.suppliers.active} />
          </div>
        </ReportCard>

        {/* Projects */}
        <ReportCard
          icon={Briefcase}
          title="🎯 Projects"
          color="from-purple-500 to-indigo-500"
        >
          <div className="space-y-2">
            <StatBox label="Total Projects" value={data.projects.total} />
            <StatBox label="Active" value={data.projects.active} />
          </div>
        </ReportCard>

        {/* General Finance */}
        <ReportCard
          icon={DollarSign}
          title="💰 Cash Flow"
          color="from-green-500 to-teal-500"
        >
          <StatBox
            label="Total Cash"
            value={`${(data.generalFinance.total / 1000000).toFixed(1)}M DA`}
          />
        </ReportCard>

        {/* Material Commands */}
        <ReportCard
          icon={ShoppingCart}
          title="🛍️ Material Commands"
          color="from-blue-500 to-cyan-500"
        >
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Total" value={data.materialCommands.total} />
            <StatBox label="Pending" value={data.materialCommands.pending} />
            <StatBox label="Validated" value={data.materialCommands.validated} />
            <StatBox label="Purchase" value={data.materialCommands.purchase} />
          </div>
        </ReportCard>

        {/* Debts */}
        <ReportCard
          icon={AlertCircle}
          title="💸 Debts"
          color="from-red-500 to-rose-500"
        >
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Total" value={data.debts.total} />
            <StatBox label="Pending" value={data.debts.pending} />
            <StatBox label="Paid" value={data.debts.paid} />
            <StatBox label="Remaining" value={`${(data.debts.remaining / 1000).toFixed(1)}K DA`} />
          </div>
        </ReportCard>

        {/* Workers */}
        <ReportCard
          icon={Users}
          title="👥 Workers"
          color="from-orange-500 to-red-500"
        >
          <div className="space-y-2">
            <StatBox label="Total Workers" value={data.workers.total} />
            <StatBox label="Active" value={data.workers.active} />
          </div>
        </ReportCard>

        {/* Budget */}
        <ReportCard
          icon={BarChart3}
          title="📈 Budget"
          color="from-indigo-600 to-blue-500"
        >
          <div className="space-y-2">
            <StatBox label="Total Budget" value={`${(data.budget.total / 1000).toFixed(1)}K DA`} />
            <StatBox label="Remaining" value={`${(data.budget.remaining / 1000).toFixed(1)}K DA`} />
          </div>
        </ReportCard>
      </div>

      {/* Footer Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="no-print sticky bottom-0 bg-white dark:bg-slate-900 border-t border-blue-200 dark:border-slate-700 p-4 rounded-t-lg shadow-lg flex gap-2 justify-end flex-wrap"
      >
        <Button variant="outline" onClick={onClose}>
          {t('common.close_report') || 'Close'}
        </Button>
        <Button className="btn-gradient gap-2" onClick={handlePrintReport}>
          <Printer className="w-4 h-4" /> {t('common.print') || 'Print'}
        </Button>
        <Button className="btn-gradient gap-2" onClick={handleExportExcel}>
          <Download className="w-4 h-4" /> {t('common.export_excel') || 'Export'}
        </Button>
      </motion.div>
    </motion.div>
  );
}

// Report Card Component
function ReportCard({ icon: Icon, title, color, children }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="erp-card border-2 border-slate-100 dark:border-slate-700 hover:shadow-lg transition-all"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h3 className="font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

// Stat Box Component
function StatBox({ label, value }: any) {
  return (
    <div className="p-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
        {value}
      </p>
    </div>
  );
}

// Generate CSV Content
function generateCSVContent(data: any) {
  let csv = 'Financial Report\n';
  csv += `Company: ${data.companyInfo?.company_name || 'Company Name'}\n`;
  csv += `Period: ${data.startDate} to ${data.endDate}\n`;
  csv += `Generated: ${data.generatedAt}\n\n`;

  csv += 'Stock Management\n';
  csv += `Total Products,${data.stock.totalProducts}\n`;
  csv += `Total Quantity,${data.stock.totalQuantity}\n`;
  csv += `Total Value,${data.stock.totalValue}\n\n`;

  csv += 'Financial Summary\n';
  csv += `Cash Flow,${data.generalFinance.total}\n`;
  csv += `Worker Expenses,${data.workerExpenses.total}\n`;
  csv += `Enterprise Expenses,${data.enterpriseExpenses.total}\n\n`;

  csv += 'Commands & Orders\n';
  csv += `Material Commands,${data.materialCommands.total}\n`;
  csv += `Bons de Commande,${data.bonsCommandes.total}\n`;
  csv += `Debts,${data.debts.total}\n`;

  return csv;
}
