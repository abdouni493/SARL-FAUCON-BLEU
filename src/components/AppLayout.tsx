import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Menu, X, ChevronLeft, ChevronRight, Globe, LogOut,
  LayoutDashboard, Package, PlusCircle, ShoppingCart, PackageCheck,
  Wallet, Receipt, Settings, Warehouse, ClipboardList, MessageSquare,
  FileText, CreditCard, BarChart3, Users, Building, CalendarDays, HandCoins, Truck,
  ArrowUpFromLine
} from 'lucide-react';
import { Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CompanyLogo from '@/components/CompanyLogo';

interface MenuItem { label: string; icon: React.ElementType; path: string }

const menusByRole: Record<UserRole, MenuItem[]> = {
  chef_projet: [
    { label: 'nav.dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'nav.material_commands', icon: Package, path: '/material-commands' },
    { label: 'nav.purchase_commands', icon: ShoppingCart, path: '/purchase-commands' },
    { label: 'nav.bons_commandes', icon: FileText, path: '/bons-commandes' },
    { label: 'nav.receive_commands', icon: PackageCheck, path: '/receive-commands' },
    { label: 'nav.project_expenses', icon: Receipt, path: '/project-expenses' },
    { label: 'nav.finance_box', icon: Wallet, path: '/finance-box' },
    { label: 'nav.settings', icon: Settings, path: '/settings' },
  ],
  storage: [
    { label: 'nav.dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'nav.storage_management', icon: Warehouse, path: '/storage-management' },
    { label: 'nav.bons_sortir', icon: ArrowUpFromLine, path: '/bons-sortir' },
    { label: 'nav.commands_management', icon: ClipboardList, path: '/commands-management' },
    { label: 'nav.purchase_commands', icon: ShoppingCart, path: '/purchase-commands' },
    { label: 'nav.receive_products', icon: PackageCheck, path: '/receive-products' },
    { label: 'nav.reclamation_messages', icon: MessageSquare, path: '/reclamation-messages' },
    { label: 'nav.settings', icon: Settings, path: '/settings' },
  ],
  purchase: [
    { label: 'nav.dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'nav.purchase_commands', icon: ShoppingCart, path: '/purchase-commands' },
    { label: 'nav.bons_commandes', icon: FileText, path: '/bons-commandes' },
    { label: 'nav.settings', icon: Settings, path: '/settings' },
  ],
  comptable: [
    { label: 'nav.dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'nav.storages', icon: Warehouse, path: '/storages' },
    { label: 'nav.project_finance', icon: Wallet, path: '/project-finance' },
    { label: 'nav.bons_commandes', icon: FileText, path: '/bons-commandes' },
    { label: 'nav.payment_commands', icon: CreditCard, path: '/payment-commands' },
    { label: 'nav.debt_management', icon: HandCoins, path: '/debt-management' },
    { label: 'nav.budget', icon: BarChart3, path: '/budget' },
    { label: 'nav.settings', icon: Settings, path: '/settings' },
  ],
  admin: [
    { label: 'nav.dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'nav.storages', icon: Warehouse, path: '/storages' },
    { label: 'nav.storage_management', icon: Warehouse, path: '/storage-management' },
    { label: 'nav.supplier_management', icon: Truck, path: '/supplier-management' },
    { label: 'nav.projects_management', icon: Building, path: '/projects-management' },
    { label: 'nav.general_cash_box', icon: Wallet, path: '/general-caisse' },
    { label: 'nav.project_financing', icon: CreditCard, path: '/projects-financing' },
    { label: 'nav.workers_management', icon: Users, path: '/workers-management' },
    { label: 'nav.workers_expenses', icon: Receipt, path: '/workers-expenses' },
    { label: 'nav.administration_expenses', icon: Receipt, path: '/enterprise-expenses' },
    { label: 'nav.material_commands', icon: Package, path: '/material-commands' },
    { label: 'nav.purchase_commands', icon: ShoppingCart, path: '/purchase-commands' },
    { label: 'nav.bons_commandes', icon: FileText, path: '/bons-commandes' },
    { label: 'nav.payment_commands', icon: CreditCard, path: '/payment-commands' },
    { label: 'nav.budget', icon: BarChart3, path: '/budget' },{ label: 'nav.debts', icon: HandCoins, path: '/debts' },
    { label: 'nav.appointments', icon: CalendarDays, path: '/appointments' },
    { label: 'nav.entreprise_settings', icon: Building2, path: '/entreprise-settings' },
    
    { label: 'nav.settings', icon: Settings, path: '/settings' },
  ],
  gestionnaire: [
    { label: 'nav.dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'nav.settings', icon: Settings, path: '/settings' },
  ],
  technique: [
    { label: 'nav.dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'nav.settings', icon: Settings, path: '/settings' },
  ],
  resp_projets: [
    { label: 'nav.dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'nav.settings', icon: Settings, path: '/settings' },
  ],
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { enterpriseSettings } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isRtl = i18n.language === 'ar';

  if (!user) return null;

  const menuItems = menusByRole[user.role] || [];
  const CollapseIcon = isRtl ? (sidebarOpen ? ChevronRight : ChevronLeft) : (sidebarOpen ? ChevronLeft : ChevronRight);

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen flex bg-background">
      {/* Sidebar - Light Mode */}
      <AnimatePresence mode="wait">
        <motion.aside
          initial={false}
          animate={{ width: sidebarOpen ? 280 : 80 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed top-0 h-screen z-40 flex flex-col overflow-hidden bg-gradient-to-b from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-r border-blue-200 dark:border-slate-700"
          style={{ [isRtl ? 'right' : 'left']: 0 }}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-center gap-3 px-4 py-5 border-b border-blue-200 dark:border-slate-700 min-h-[80px] w-full bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-800 dark:to-slate-700">
            <div className="flex items-center justify-center gap-3 w-full">
              <div className="flex-shrink-0 p-2 rounded-lg bg-white dark:bg-slate-700 shadow-sm">
                <CompanyLogo logoUrl={enterpriseSettings?.logoUrl} size="sm" />
              </div>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="font-bold text-blue-950 dark:text-blue-100 text-sm truncate leading-tight">
                    {enterpriseSettings?.name || t('app_name')}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 truncate opacity-75">
                    {user?.fullName}
                  </p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Menu */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
            {menuItems.map((item, idx) => {
              const active = location.pathname === item.path;
              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 group font-medium ${
                      active
                        ? 'btn-gradient shadow-lg'
                        : 'text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-slate-700 hover:text-blue-950 dark:hover:text-white'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : ''}`} />
                    {sidebarOpen && <span className="truncate">{t(item.label)}</span>}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* Collapse button */}
          <div className="p-3 border-t border-blue-200 dark:border-slate-700 bg-blue-50 dark:bg-slate-700">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center p-2.5 rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-slate-600 transition-all duration-200 font-medium"
            >
              <CollapseIcon className="w-5 h-5" />
            </button>
          </div>
        </motion.aside>
      </AnimatePresence>

      {/* Main Content */}
      <div
        className="flex-1 flex flex-col transition-all duration-300"
        style={{ [isRtl ? 'marginRight' : 'marginLeft']: sidebarOpen ? 260 : 64 }}
      >
        {/* Navbar */}
        <header className="sticky top-0 z-30 btn-gradient backdrop-blur-lg border-b border-blue-400 dark:border-slate-700 h-16 flex items-center justify-between px-6 shadow-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-blue-500 dark:hover:bg-slate-700 transition-colors md:hidden text-white"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">{enterpriseSettings?.name || t('app_name')}</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              {enterpriseSettings?.logoUrl ? (
                <CompanyLogo logoUrl={enterpriseSettings.logoUrl} size="sm" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-400 dark:bg-slate-600 border-2 border-white" />
              )}
            </div>
            <span className="text-sm font-semibold text-white hidden sm:inline">{user.fullName}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => i18n.changeLanguage(isRtl ? 'fr' : 'ar')}
              className="gap-2 bg-blue-500 hover:bg-blue-400 dark:bg-slate-700 dark:hover:bg-slate-600 border-0 text-white"
            >
              <Globe className="w-4 h-4" />
              <span className="text-xs font-semibold">{isRtl ? 'FR' : 'AR'}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { logout(); navigate('/'); }}
              className="gap-2 text-white hover:bg-red-500 hover:text-white transition-all"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
