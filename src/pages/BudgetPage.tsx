import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3, TrendingUp, TrendingDown, Wallet, Package, CreditCard,
  FileText, Building2, Users, HandCoins, CalendarDays, CheckCircle, XCircle,
  Printer, Download, Loader, AlertCircle, Eye, Package2, Truck, Home, Briefcase,
  DollarSign, Calendar, ShoppingCart, FileJson, X
} from 'lucide-react';

export default function BudgetPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState('');

  // Load company info on mount
  useEffect(() => {
    loadCompanyInfo();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data } = await supabase.from('categories').select('id, name').order('name');
      if (data) {
        setCategories(data);
      }
    } catch (err) {
      console.warn('Error loading categories:', err);
    }
  };

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

  const generateReport = async () => {
    if (!startDate || !endDate) {
      alert(t('common.select_date_range') || 'Please select date range');
      return;
    }

    setLoading(true);
    try {
      const data: any = {};

      // 1. Stock Management
      const products = await safeQuery('products', 'id, name, quantity, unit_price, category_id');
      const filteredProducts = filterCategory 
        ? products.filter((p: any) => p.category_id === filterCategory)
        : products;
      data.stock = {
        totalProducts: filteredProducts.length || 0,
        totalQuantity: filteredProducts.reduce((s: number, p: any) => s + (p.quantity || 0), 0) || 0,
        totalValue: filteredProducts.reduce((s: number, p: any) => s + ((p.quantity || 0) * (p.unit_price || 0)), 0) || 0,
        lowStock: filteredProducts.filter((p: any) => (p.quantity || 0) < 10).length || 0,
        details: filteredProducts,
      };

      // 2. Suppliers
      const suppliers = await safeQuery('suppliers', 'id, name, email, phone, contact_person, is_active');
      data.suppliers = {
        total: suppliers.length || 0,
        active: suppliers.filter((s: any) => s.is_active === true).length || 0,
        details: suppliers || [],
      };

      // 3. Projects (project_boxes instead of projects)
      const projectBoxes = await safeQuery('project_boxes', 'id, name, status, total_amount, total_budget');
      data.projects = {
        total: projectBoxes.length || 0,
        active: projectBoxes.filter((p: any) => p.status === 'pending' || p.status === 'active').length || 0,
        details: projectBoxes || [],
      };

      // 4. General Finance (general_cash_box)
      const cashFlow = await safeQuery('general_cash_box', 'id, amount, description, transaction_type, transaction_date');
      data.generalFinance = {
        total: cashFlow.reduce((s: number, c: any) => s + (c.amount || 0), 0) || 0,
        count: cashFlow.length || 0,
        details: cashFlow || [],
      };

      // 5. Project Finance (project_expenses)
      const projectExpenses = await safeQuery('project_expenses', 'id, price, description, category, expense_date');
      data.projectFinance = {
        total: projectExpenses.reduce((s: number, e: any) => s + (e.price || 0), 0) || 0,
        count: projectExpenses.length || 0,
        details: projectExpenses || [],
      };

      // 6. Workers (from users table)
      const workers = await safeQuery('users', 'id, full_name, role, email');
      data.workers = {
        total: workers.length || 0,
        active: workers.filter((w: any) => w.role && w.role !== 'admin').length || 0,
        details: workers || [],
      };

      // 7. Worker Expenses
      const workerExpenses = await safeQuery('worker_expenses', 'id, amount, worker_name, category, expense_date');
      data.workerExpenses = {
        total: workerExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0) || 0,
        count: workerExpenses.length || 0,
        details: workerExpenses || [],
      };

      // 8. Enterprise Expenses
      const enterpriseExpenses = await safeQuery('enterprise_expenses', 'id, amount, name, category, expense_date');
      data.enterpriseExpenses = {
        total: enterpriseExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0) || 0,
        count: enterpriseExpenses.length || 0,
        details: enterpriseExpenses || [],
      };

      // 9. Material Commands
      const materialCommands = await safeQuery('material_commands', 'id, status, command_id, created_at');
      data.materialCommands = {
        total: materialCommands.length || 0,
        pending: materialCommands.filter((c: any) => c.status === 'pending').length || 0,
        validated: materialCommands.filter((c: any) => c.status === 'validated').length || 0,
        purchase: materialCommands.filter((c: any) => c.status === 'purchase').length || 0,
        details: materialCommands || [],
      };

      // 10. Purchase Commands
      const purchaseCommands = await safeQuery('purchase_commands', 'id, status, command_id, supplier_name, created_at');
      data.purchaseCommands = {
        total: purchaseCommands.length || 0,
        pending: purchaseCommands.filter((c: any) => c.status === 'pending').length || 0,
        validated: purchaseCommands.filter((c: any) => c.status === 'validated').length || 0,
        details: purchaseCommands || [],
      };

      // 11. Bons de Commande
      const bonsCommandes = await safeQuery('bons_commandes', 'id, status, bon_id, total_with_tva, supplier_name, created_at');
      data.bonsCommandes = {
        total: bonsCommandes.length || 0,
        pending: bonsCommandes.filter((b: any) => b.status === 'pending').length || 0,
        validated: bonsCommandes.filter((b: any) => b.status === 'validated').length || 0,
        paid: bonsCommandes.filter((b: any) => b.status === 'paid').length || 0,
        totalAmount: bonsCommandes.reduce((s: number, b: any) => s + (b.total_with_tva || 0), 0) || 0,
        details: bonsCommandes || [],
      };

      // 12. Payment Orders
      const paymentOrders = await safeQuery('payment_orders', 'id, status, total_price, note, created_at');
      data.paymentOrders = {
        total: paymentOrders.length || 0,
        pending: paymentOrders.filter((o: any) => o.status === 'pending').length || 0,
        validated: paymentOrders.filter((o: any) => o.status === 'validated').length || 0,
        totalAmount: paymentOrders.reduce((s: number, o: any) => s + (o.total_price || 0), 0) || 0,
        details: paymentOrders || [],
      };

      // 13. Debts
      const debts = await safeQuery('debts', 'id, status, total_price, amount_paid, supplier_name, remaining_balance, created_at');
      data.debts = {
        total: debts.length || 0,
        pending: debts.filter((d: any) => d.status === 'pending').length || 0,
        partial: debts.filter((d: any) => d.status === 'partial').length || 0,
        paid: debts.filter((d: any) => d.status === 'paid').length || 0,
        totalAmount: debts.reduce((s: number, d: any) => s + (d.total_price || 0), 0) || 0,
        paidAmount: debts.reduce((s: number, d: any) => s + (d.amount_paid || 0), 0) || 0,
        remaining: debts.reduce((s: number, d: any) => s + (d.remaining_balance || 0), 0) || 0,
        details: debts || [],
      };

      // 14. Appointments
      const appointments = await safeQuery('appointments', 'id, is_active, title, date, time');
      data.appointments = {
        total: appointments.length || 0,
        active: appointments.filter((a: any) => a.is_active === true).length || 0,
        details: appointments || [],
      };

      // 15. Budget (using project_boxes total_budget field)
      const budgetBoxes = await safeQuery('project_boxes', 'id, total_budget, name, total_amount');
      data.budget = {
        total: budgetBoxes.reduce((s: number, b: any) => s + (b.total_budget || 0), 0) || 0,
        spent: budgetBoxes.reduce((s: number, b: any) => s + (b.total_amount || 0), 0) || 0,
        remaining: budgetBoxes.reduce((s: number, b: any) => s + ((b.total_budget || 0) - (b.total_amount || 0)), 0) || 0,
        details: budgetBoxes || [],
      };

      setReportData({ ...data, startDate, endDate, generatedAt: new Date().toLocaleString(), companyInfo });
      setShowReport(true);
    } catch (err) {
      console.error('Error generating report:', err);
      alert('Error generating report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">{t('nav.budget')}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t('common.generate_financial_reports') || 'Generate comprehensive financial reports for your organization'}</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
        </div>
      </motion.div>

      {/* Date Range & Generate Report */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-2 border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                {t('budget.select_report_period')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">{t('budget.start_date')}</label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)}
                    className="border-blue-200 dark:border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">{t('budget.end_date')}</label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)}
                    className="border-blue-200 dark:border-slate-600"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={generateReport}
                    disabled={loading}
                    className="w-full btn-gradient text-white font-semibold gap-2"
                  >
                    {loading ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    {loading ? t('budget.generating') : t('budget.generate')}
                  </Button>
                </div>
              </div>

              {/* Category Filter */}
              {showReport && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-foreground mb-2 block">
                      {t('common.category') || 'Category'}
                    </label>
                    <select
                      value={filterCategory}
                      onChange={(e) => {
                        setFilterCategory(e.target.value);
                        generateReport();
                      }}
                      className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 bg-background"
                    >
                      <option value="">{t('common.all_categories') || 'All Categories'}</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilterCategory('');
                      generateReport();
                    }}
                    className="text-sm"
                  >
                    {t('common.clear') || 'Clear'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Report Display - Inline */}
      {reportData && showReport && (
        <ReportDisplay 
          data={reportData} 
          onClose={() => setShowReport(false)}
          t={t}
        />
      )}
    </div>
  );
}

// Comprehensive Report Display Component (Inline)
function ReportDisplay({ data, onClose, t }: any) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const activeLabel = t('budget.active_label');
  const inactiveLabel = t('budget.inactive_label');
  const statusLabel = t('budget.status');
  const amountLabel = t('budget.amount');
  const handlePrintReport = () => {
    const printHTML = `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${i18n.language}">
      <head>
        <meta charset="UTF-8">
        <title>${t('budget.financial_report')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: ${isRTL ? "'Noto Sans Arabic', " : ""}'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; }
          .print-container { padding: 40px; background: white; max-width: 1200px; margin: 0 auto; }
          
          /* Header */
          .report-header {
            display: flex;
            align-items: center;
            gap: 30px;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 3px solid #1e40af;
          }
          .logo-container {
            flex-shrink: 0;
          }
          .logo-container img {
            max-width: 120px;
            max-height: 120px;
            object-fit: contain;
          }
          .header-content {
            flex: 1;
          }
          .company-name {
            font-size: 32px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
          }
          .report-title {
            font-size: 18px;
            color: #555;
            margin-bottom: 5px;
          }
          .report-meta {
            font-size: 13px;
            color: #777;
          }
          
          /* Sections */
          .sections-container {
            margin-top: 30px;
          }
          .report-section {
            margin-bottom: 35px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: white;
            background: linear-gradient(135deg, #1e40af, #3b82f6);
            padding: 12px 16px;
            margin-bottom: 15px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          /* Stats Grid */
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 15px;
          }
          .stats-grid.grid-2 { grid-template-columns: repeat(2, 1fr); }
          .stats-grid.grid-3 { grid-template-columns: repeat(3, 1fr); }
          
          .stat-item {
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: #f9fafb;
          }
          .stat-label {
            font-size: 12px;
            color: #666;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
          }
          
          /* Details List */
          .details-list {
            margin-top: 12px;
          }
          .detail-item {
            padding: 10px;
            border-bottom: 1px solid #eee;
            font-size: 13px;
          }
          .detail-item:last-child {
            border-bottom: none;
          }
          
          /* Footer */
          .report-footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #1e40af;
            text-align: center;
            font-size: 12px;
            color: #777;
          }
          
          @media print {
            body { margin: 0; padding: 0; }
            .print-container { max-width: 100%; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <!-- Header -->
          <div class="report-header">
            ${data.companyInfo?.logo_url ? `
              <div class="logo-container">
                <img src="${data.companyInfo.logo_url}" alt="Company Logo">
              </div>
            ` : ''}
            <div class="header-content">
              <div class="company-name">${data.companyInfo?.company_name || 'COMPANY NAME'}</div>
              <div class="report-title">📊 ${t('budget.financial_report')}</div>
              <div class="report-meta">${t('budget.period')}: ${data.startDate} ${t('budget.to')} ${data.endDate}</div>
              <div class="report-meta">${t('budget.generated_at')}: ${data.generatedAt}</div>
            </div>
          </div>

          <!-- Sections -->
          <div class="sections-container">
            <!-- 1. Stock Management -->
            <div class="report-section">
              <div class="section-title">📦 ${t('budget.stock_management')}</div>
              <div class="stats-grid grid-4">
                <div class="stat-item">
                  <div class="stat-label">${t('budget.total_products')}</div>
                  <div class="stat-value">${data.stock.totalProducts}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.total_quantity')}</div>
                  <div class="stat-value">${data.stock.totalQuantity}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.low_stock_items')}</div>
                  <div class="stat-value">${data.stock.lowStock}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.total_value')}</div>
                  <div class="stat-value">${data.stock.totalValue.toLocaleString()} DA</div>
                </div>
              </div>
            </div>

            <!-- 2. Suppliers -->
            <div class="report-section">
              <div class="section-title">🚚 ${t('budget.suppliers_management')}</div>
              <div class="stats-grid grid-2">
                <div class="stat-item">
                  <div class="stat-label">${t('budget.total_suppliers')}</div>
                  <div class="stat-value">${data.suppliers.total}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.active_suppliers')}</div>
                  <div class="stat-value">${data.suppliers.active}</div>
                </div>
              </div>
              ${data.suppliers.details.slice(0, 3).map((s: any) => `
                <div class="details-list">
                  <div class="detail-item"><strong>${s.name}</strong> ${s.is_active ? `✓ ${activeLabel}` : `✗ ${inactiveLabel}`}</div>
                </div>
              `).join('')}
            </div>

            <!-- 3. Projects -->
            <div class="report-section">
              <div class="section-title">🎯 ${t('budget.projects_management')}</div>
              <div class="stats-grid grid-2">
                <div class="stat-item">
                  <div class="stat-label">${t('budget.total_projects')}</div>
                  <div class="stat-value">${data.projects.total}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.active_projects')}</div>
                  <div class="stat-value">${data.projects.active}</div>
                </div>
              </div>
              ${data.projects.details.slice(0, 3).map((p: any) => `
                <div class="details-list">
                  <div class="detail-item"><strong>${p.name}</strong> | ${statusLabel}: ${p.status} | ${amountLabel}: ${p.total_amount?.toLocaleString()} DA</div>
                </div>
              `).join('')}
            </div>

            <!-- 4. General Finance -->
            <div class="report-section">
              <div class="section-title">💰 ${t('budget.general_cash_box')}</div>
              <div class="stats-grid grid-2">
                <div class="stat-item">
                  <div class="stat-label">${t('budget.total_cash_flow')}</div>
                  <div class="stat-value">${data.generalFinance.total.toLocaleString()} DA</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.transactions')}</div>
                  <div class="stat-value">${data.generalFinance.count}</div>
                </div>
              </div>
              ${data.generalFinance.details.slice(0, 3).map((item: any) => `
                <div class="details-list">
                  <div class="detail-item">${item.amount?.toLocaleString()} DA - ${item.description}</div>
                </div>
              `).join('')}
            </div>

            <!-- 5. Project Finance -->
            <div class="report-section">
              <div class="section-title">📊 ${t('budget.project_finances')}</div>
              <div class="stats-grid grid-2">
                <div class="stat-item">
                  <div class="stat-label">${t('budget.total_expenses')}</div>
                  <div class="stat-value">${data.projectFinance.total.toLocaleString()} DA</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.count')}</div>
                  <div class="stat-value">${data.projectFinance.count}</div>
                </div>
              </div>
            </div>

            <!-- 6. Workers -->
            <div class="report-section">
              <div class="section-title">👥 ${t('budget.workers_management')}</div>
              <div class="stats-grid grid-2">
                <div class="stat-item">
                  <div class="stat-label">${t('budget.total_workers')}</div>
                  <div class="stat-value">${data.workers.total}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.active_workers')}</div>
                  <div class="stat-value">${data.workers.active}</div>
                </div>
              </div>
            </div>

            <!-- 7. Worker Expenses -->
            <div class="report-section">
              <div class="section-title">💳 ${t('budget.worker_expenses')}</div>
              <div class="stats-grid grid-2">
                <div class="stat-item">
                  <div class="stat-label">Total Expenses</div>
                  <div class="stat-value">${data.workerExpenses.total.toLocaleString()} DA</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.count')}</div>
                  <div class="stat-value">${data.workerExpenses.count}</div>
                </div>
              </div>
            </div>

            <!-- 8. Enterprise Expenses -->
            <div class="report-section">
              <div class="section-title">🏢 ${t('budget.enterprise_expenses')}</div>
              <div class="stats-grid grid-2">
                <div class="stat-item">
                  <div class="stat-label">Total Expenses</div>
                  <div class="stat-value">${data.enterpriseExpenses.total.toLocaleString()} DA</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.count')}</div>
                  <div class="stat-value">${data.enterpriseExpenses.count}</div>
                </div>
              </div>
            </div>

            <!-- 9. Material Commands -->
            <div class="report-section">
              <div class="section-title">🛍️ ${t('budget.material_commands')}</div>
              <div class="stats-grid grid-4">
                <div class="stat-item">
                  <div class="stat-label">${t('budget.total')}</div>
                  <div class="stat-value">${data.materialCommands.total}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.pending')}</div>
                  <div class="stat-value">${data.materialCommands.pending}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.validated')}</div>
                  <div class="stat-value">${data.materialCommands.validated}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.purchase')}</div>
                  <div class="stat-value">${data.materialCommands.purchase}</div>
                </div>
              </div>
            </div>

            <!-- 10. Purchase Commands -->
            <div class="report-section">
              <div class="section-title">🛒 ${t('budget.purchase_commands')}</div>
              <div class="stats-grid grid-3">
                <div class="stat-item">
                  <div class="stat-label">${t('budget.total')}</div>
                  <div class="stat-value">${data.purchaseCommands.total}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.pending')}</div>
                  <div class="stat-value">${data.purchaseCommands.pending}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.validated')}</div>
                  <div class="stat-value">${data.purchaseCommands.validated}</div>
                </div>
              </div>
            </div>

            <!-- 11. Bons de Commande -->
            <div class="report-section">
              <div class="section-title">📦 ${t('budget.purchase_orders_bons')}</div>
              <div class="stats-grid grid-4">
                <div class="stat-item">
                  <div class="stat-label">${t('budget.total')}</div>
                  <div class="stat-value">${data.bonsCommandes.total}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.pending')}</div>
                  <div class="stat-value">${data.bonsCommandes.pending}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.validated')}</div>
                  <div class="stat-value">${data.bonsCommandes.validated}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.amount')}</div>
                  <div class="stat-value">${data.bonsCommandes.totalAmount.toLocaleString()} DA</div>
                </div>
              </div>
            </div>

            <!-- 12. Payment Orders -->
            <div class="report-section">
              <div class="section-title">💵 ${t('budget.payment_orders')}</div>
              <div class="stats-grid grid-4">
                <div class="stat-item">
                  <div class="stat-label">${t('budget.total')}</div>
                  <div class="stat-value">${data.paymentOrders.total}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.pending')}</div>
                  <div class="stat-value">${data.paymentOrders.pending}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.validated')}</div>
                  <div class="stat-value">${data.paymentOrders.validated}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.amount')}</div>
                  <div class="stat-value">${data.paymentOrders.totalAmount.toLocaleString()} DA</div>
                </div>
              </div>
            </div>

            <!-- 13. Debts -->
            <div class="report-section">
              <div class="section-title">💸 ${t('budget.debts')}</div>
              <div class="stats-grid grid-4">
                <div class="stat-item">
                  <div class="stat-label">${t('budget.total')}</div>
                  <div class="stat-value">${data.debts.total}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.pending')}</div>
                  <div class="stat-value">${data.debts.pending}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.paid')}</div>
                  <div class="stat-value">${data.debts.paid}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.remaining')}</div>
                  <div class="stat-value">${data.debts.remaining.toLocaleString()} DA</div>
                </div>
              </div>
            </div>

            <!-- 14. Appointments -->
            <div class="report-section">
              <div class="section-title">📅 ${t('budget.appointments')}</div>
              <div class="stats-grid grid-2">
                <div class="stat-item">
                  <div class="stat-label">${t('budget.total')}</div>
                  <div class="stat-value">${data.appointments.total}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.active')}</div>
                  <div class="stat-value">${data.appointments.active}</div>
                </div>
              </div>
            </div>

            <!-- 15. Budget Summary -->
            <div class="report-section">
              <div class="section-title">📈 ${t('budget.budget_summary')}</div>
              <div class="stats-grid grid-3">
                <div class="stat-item">
                  <div class="stat-label">${t('budget.total_budget')}</div>
                  <div class="stat-value">${data.budget.total.toLocaleString()} DA</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.spent')}</div>
                  <div class="stat-value">${data.budget.spent.toLocaleString()} DA</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">${t('budget.remaining_budget')}</div>
                  <div class="stat-value">${data.budget.remaining.toLocaleString()} DA</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="report-footer">
            <p>${t('budget.automatic_report')}</p>
            <p>© ${new Date().getFullYear()} ${data.companyInfo?.company_name || 'Company'}. ${t('budget.all_rights_reserved')}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 250);
    }
  };

  const handleExportPDF = () => {
    alert(t('budget.pdf_coming_soon'));
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
      id="report-display-content"
    >
      {/* Report Header */}
      <Card className="border-2 border-blue-100 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 shadow-lg overflow-hidden mb-6">
        <CardContent className="pt-6">
          <div className="report-header flex items-center justify-between">
            <div className="flex items-center gap-4">
              {data.companyInfo?.logo_url && (
                <img src={data.companyInfo.logo_url} alt="Logo" className="h-16 w-16 object-contain" />
              )}
              <div>
                <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100">{data.companyInfo?.company_name || 'Company Report'}</h2>
                <p className="text-sm text-blue-700 dark:text-blue-300">{t('budget.financial_report')} | {data.startDate} {t('budget.to')} {data.endDate}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">{t('budget.generated_at')}: {data.generatedAt}</p>
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

      {/* Report Sections */}
      <div className="space-y-6 pb-6">
        {/* 1. Stock Management */}
        <ReportSection 
          icon={Package}
          title={`📦 ${t('budget.stock_management')}`}
          color="from-blue-500 to-blue-600"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label={t('budget.total_products')} value={data.stock.totalProducts} />
            <StatBox label={t('budget.total_quantity')} value={data.stock.totalQuantity} />
            <StatBox label={t('budget.low_stock_items')} value={data.stock.lowStock} />
            <StatBox label={t('budget.total_value')} value={`${data.stock.totalValue.toLocaleString()} DA`} />
          </div>
        </ReportSection>

        {/* 2. Suppliers */}
        <ReportSection 
          icon={Truck}
          title={`🚚 ${t('budget.suppliers_management')}`}
          color="from-green-500 to-emerald-500"
        >
          <div className="space-y-2">
            <StatBox label={t('budget.total_suppliers')} value={data.suppliers.total} />
            {data.suppliers.details.slice(0, 5).map((supplier: any, idx: number) => (
              <div key={idx} className="p-3 bg-green-50 dark:bg-slate-700 rounded-lg border border-green-200 dark:border-slate-600">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-foreground">{supplier.name}</p>
                    <p className="text-xs text-muted-foreground">{supplier.contact_person || supplier.email}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">{supplier.is_active ? t('budget.active_label') : t('budget.inactive_label')}</Badge>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* 3. Projects */}
        <ReportSection 
          icon={Briefcase}
          title={`🎯 ${t('budget.projects_management')}`}
          color="from-purple-500 to-indigo-500"
        >
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <StatBox label={t('budget.total_projects')} value={data.projects.total} />
              <StatBox label={t('budget.active_projects')} value={data.projects.active} />
            </div>
            {data.projects.details.slice(0, 5).map((project: any, idx: number) => (
              <div key={idx} className="p-3 bg-purple-50 dark:bg-slate-700 rounded-lg border border-purple-200 dark:border-slate-600">
                <p className="font-semibold text-foreground">{project.name}</p>
                <p className="text-xs text-muted-foreground">{t('budget.status')}: {project.status} | {t('budget.amount')}: {project.total_amount?.toLocaleString()} DA</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* 4. General Finance */}
        <ReportSection 
          icon={DollarSign}
          title={`💰 ${t('budget.general_cash_box')}`}
          color="from-green-500 to-teal-500"
        >
          <div className="space-y-2">
            <StatBox label={t('budget.total_cash_flow')} value={`${data.generalFinance.total.toLocaleString()} DA`} />
            {data.generalFinance.details.slice(0, 5).map((item: any, idx: number) => (
              <div key={idx} className="p-2 bg-green-50 dark:bg-slate-700 rounded text-sm">
                <span className="font-semibold">{item.amount?.toLocaleString()} DA</span> - {item.description}
              </div>
            ))}
          </div>
        </ReportSection>

        {/* 5. Project Finance */}
        <ReportSection 
          icon={BarChart3}
          title={`📊 ${t('budget.project_finances')}`}
          color="from-indigo-500 to-blue-500"
        >
          <StatBox label={t('budget.total_project_expenses')} value={`${data.projectFinance.total.toLocaleString()} DA`} />
        </ReportSection>

        {/* 6. Workers */}
        <ReportSection 
          icon={Users}
          title={`👥 ${t('budget.workers_management')}`}
          color="from-orange-500 to-red-500"
        >
          <div className="grid grid-cols-2 gap-3">
            <StatBox label={t('budget.total_workers')} value={data.workers.total} />
            <StatBox label={t('budget.active_workers')} value={data.workers.active} />
          </div>
        </ReportSection>

        {/* 7. Worker Expenses */}
        <ReportSection 
          icon={CreditCard}
          title={`💳 ${t('budget.worker_expenses')}`}
          color="from-red-500 to-rose-500"
        >
          <div className="grid grid-cols-2 gap-3">
            <StatBox label={t('budget.total_expenses')} value={`${data.workerExpenses.total.toLocaleString()} DA`} />
            <StatBox label={t('budget.count')} value={data.workerExpenses.count} />
          </div>
        </ReportSection>

        {/* 8. Enterprise Expenses */}
        <ReportSection 
          icon={Home}
          title={`🏢 ${t('budget.enterprise_expenses')}`}
          color="from-yellow-500 to-amber-500"
        >
          <div className="grid grid-cols-2 gap-3">
            <StatBox label={t('budget.total_expenses')} value={`${data.enterpriseExpenses.total.toLocaleString()} DA`} />
            <StatBox label={t('budget.count')} value={data.enterpriseExpenses.count} />
          </div>
        </ReportSection>

        {/* 9. Material Commands */}
        <ReportSection 
          icon={ShoppingCart}
          title={`🛍️ ${t('budget.material_commands')}`}
          color="from-blue-500 to-cyan-500"
        >
          <div className="grid grid-cols-4 gap-3">
            <StatBox label={t('budget.total')} value={data.materialCommands.total} />
            <StatBox label={t('budget.pending')} value={data.materialCommands.pending} />
            <StatBox label={t('budget.validated')} value={data.materialCommands.validated} />
            <StatBox label={t('budget.purchase')} value={data.materialCommands.purchase} />
          </div>
        </ReportSection>

        {/* 10. Purchase Commands */}
        <ReportSection 
          icon={Package2}
          title={`🛒 ${t('budget.purchase_commands')}`}
          color="from-blue-600 to-blue-500"
        >
          <div className="grid grid-cols-3 gap-3">
            <StatBox label={t('budget.total')} value={data.purchaseCommands.total} />
            <StatBox label={t('budget.pending')} value={data.purchaseCommands.pending} />
            <StatBox label={t('budget.validated')} value={data.purchaseCommands.validated} />
          </div>
        </ReportSection>

        {/* 11. Bons de Commande */}
        <ReportSection 
          icon={FileText}
          title={`📦 ${t('budget.purchase_orders_bons')}`}
          color="from-emerald-500 to-teal-500"
        >
          <div className="grid grid-cols-4 gap-3">
            <StatBox label={t('budget.total')} value={data.bonsCommandes.total} />
            <StatBox label={t('budget.pending')} value={data.bonsCommandes.pending} />
            <StatBox label={t('budget.validated')} value={data.bonsCommandes.validated} />
            <StatBox label={t('budget.amount')} value={`${data.bonsCommandes.totalAmount.toLocaleString()} DA`} />
          </div>
        </ReportSection>

        {/* 12. Payment Orders */}
        <ReportSection 
          icon={CreditCard}
          title={`💵 ${t('budget.payment_orders')}`}
          color="from-blue-500 to-indigo-500"
        >
          <div className="grid grid-cols-4 gap-3">
            <StatBox label={t('budget.total')} value={data.paymentOrders.total} />
            <StatBox label={t('budget.pending')} value={data.paymentOrders.pending} />
            <StatBox label={t('budget.validated')} value={data.paymentOrders.validated} />
            <StatBox label={t('budget.amount')} value={`${data.paymentOrders.totalAmount.toLocaleString()} DA`} />
          </div>
        </ReportSection>

        {/* 13. Debts */}
        <ReportSection 
          icon={AlertCircle}
          title={`💸 ${t('budget.debts')}`}
          color="from-red-500 to-rose-500"
        >
          <div className="grid grid-cols-4 gap-3">
            <StatBox label={t('budget.total')} value={data.debts.total} />
            <StatBox label={t('budget.pending')} value={data.debts.pending} />
            <StatBox label={t('budget.paid')} value={data.debts.paid} />
            <StatBox label={t('budget.remaining')} value={`${data.debts.remaining.toLocaleString()} DA`} />
          </div>
        </ReportSection>

        {/* 14. Appointments */}
        <ReportSection 
          icon={Calendar}
          title={`📅 ${t('budget.appointments')}`}
          color="from-purple-500 to-pink-500"
        >
          <div className="grid grid-cols-2 gap-3">
            <StatBox label={t('budget.total')} value={data.appointments.total} />
            <StatBox label={t('budget.active')} value={data.appointments.active} />
          </div>
        </ReportSection>

        {/* 15. Budget Summary */}
        <ReportSection 
          icon={BarChart3}
          title={`📈 ${t('budget.budget_summary')}`}
          color="from-indigo-600 to-blue-500"
        >
          <div className="grid grid-cols-3 gap-3">
            <StatBox label={t('budget.total_budget')} value={`${data.budget.total.toLocaleString()} DA`} />
            <StatBox label={t('budget.spent')} value={`${data.budget.spent.toLocaleString()} DA`} />
            <StatBox label={t('budget.remaining_budget')} value={`${data.budget.remaining.toLocaleString()} DA`} />
          </div>
        </ReportSection>
      </div>

      {/* Footer Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="no-print sticky bottom-0 bg-white dark:bg-slate-900 border-t border-blue-200 dark:border-slate-700 p-4 rounded-t-lg shadow-lg flex gap-2 justify-end flex-wrap"
      >
        <Button variant="outline" onClick={onClose}>{t('budget.close_report')}</Button>
        <Button className="btn-gradient gap-2" onClick={handlePrintReport}>
          <Printer className="w-4 h-4" /> {t('budget.print_report')}
        </Button>
        <Button className="btn-gradient gap-2" onClick={handleExportPDF}>
          <Download className="w-4 h-4" /> {t('budget.export_pdf')}
        </Button>
        <Button className="btn-gradient gap-2" onClick={handleExportExcel}>
          <FileJson className="w-4 h-4" /> {t('budget.export_excel')}
        </Button>
      </motion.div>
    </motion.div>
  );
}

// Report Section Component
function ReportSection({ icon: Icon, title, color, children }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {title}
        </h3>
        {children}
      </div>
    </motion.div>
  );
}

// Stat Box Component
function StatBox({ label, value }: any) {
  return (
    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">{value}</p>
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
  csv += `Low Stock Items,${data.stock.lowStock}\n`;
  csv += `Total Value,${data.stock.totalValue}\n\n`;

  csv += 'Suppliers\n';
  csv += `Total Suppliers,${data.suppliers.total}\n`;
  csv += `Active Suppliers,${data.suppliers.active}\n\n`;

  csv += 'Financial Summary\n';
  csv += `General Cash Flow,${data.generalFinance.total}\n`;
  csv += `Project Expenses,${data.projectFinance.total}\n`;
  csv += `Worker Expenses,${data.workerExpenses.total}\n`;
  csv += `Enterprise Expenses,${data.enterpriseExpenses.total}\n\n`;

  csv += 'Commands & Orders\n';
  csv += `Material Commands,${data.materialCommands.total}\n`;
  csv += `Purchase Orders,${data.purchaseCommands.total}\n`;
  csv += `Bons de Commande,${data.bonsCommandes.total}\n`;
  csv += `Payment Orders,${data.paymentOrders.total}\n\n`;

  csv += 'Debts\n';
  csv += `Total Debts,${data.debts.total}\n`;
  csv += `Total Amount,${data.debts.totalAmount}\n`;
  csv += `Paid Amount,${data.debts.paidAmount}\n`;
  csv += `Remaining Balance,${data.debts.remaining}\n\n`;

  csv += 'Budget\n';
  csv += `Total Budget,${data.budget.total}\n`;
  csv += `Spent,${data.budget.spent}\n`;
  csv += `Remaining,${data.budget.remaining}\n`;

  return csv;
}
