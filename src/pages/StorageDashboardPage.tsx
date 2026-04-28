import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Package, AlertCircle, TrendingUp, Warehouse, CheckCircle, ShoppingCart, FileText, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

export default function StorageDashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { products } = useData();
  const [storageStats, setStorageStats] = useState({
    totalProducts: 0,
    totalQuantity: 0,
    lowStockProducts: 0,
    totalValue: 0,
    commandsManagement: 0,
    purchaseCommands: 0,
    receiveProducts: 0,
    reclamationMessages: 0,
  });

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      // 1. Get Storage Products stats
      const { data: productsData } = await supabase
        .from('products')
        .select('id, quantity, unit_price, total_price');

      const totalProducts = productsData?.length || 0;
      const totalQuantity = productsData?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0;
      const lowStockProducts = productsData?.filter(p => (p.quantity || 0) < 10).length || 0;
      const totalValue = productsData?.reduce((sum, p) => sum + ((p.total_price) || 0), 0) || 0;

      // 2. Get Commands Management stats (material_commands)
      const { data: commandsData } = await supabase
        .from('material_commands')
        .select('id');

      const commandsManagement = commandsData?.length || 0;

      // 3. Get Purchase Commands stats (purchase_commands)
      const { data: purchaseData } = await supabase
        .from('purchase_commands')
        .select('id');

      const purchaseCommands = purchaseData?.length || 0;

      // 4. Get Receive Products stats (reception_products)
      const { data: receiveData } = await supabase
        .from('reception_products')
        .select('id');

      const receiveProducts = receiveData?.length || 0;

      // 5. Get Reclamation Messages stats (reclamations)
      const { data: reclamationsData } = await supabase
        .from('reclamations')
        .select('id');

      const reclamationMessages = reclamationsData?.length || 0;

      setStorageStats({
        totalProducts,
        totalQuantity,
        lowStockProducts,
        totalValue,
        commandsManagement,
        purchaseCommands,
        receiveProducts,
        reclamationMessages,
      });
    } catch (err) {
      console.error('Error loading storage data:', err);
    }
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M DA`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K DA`;
    }
    return `${value.toLocaleString()} DA`;
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-1">
          {t('dashboard.welcome')}، {user?.fullName}
        </h1>
        <p className="text-muted-foreground text-sm">{new Date().toLocaleDateString()}</p>
      </motion.div>

      {/* Dashboard Title */}
      <div className="space-y-2 mb-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
          Storage Management Statistics
        </h2>
      </div>

      {/* Storage Management Statistics - Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={Package} label={t('common.total_products')} value={storageStats.totalProducts} gradient="btn-gradient" delay={0.1} />
        <StatCard icon={Warehouse} label={t('common.total_quantity')} value={storageStats.totalQuantity} gradient="btn-gradient-success" delay={0.15} />
        <StatCard icon={AlertCircle} label={t('common.low_stock_products')} value={storageStats.lowStockProducts} gradient="btn-gradient-danger" delay={0.2} />
        <StatCard icon={TrendingUp} label={t('common.total_value')} value={formatValue(storageStats.totalValue)} gradient="btn-gradient-warm" delay={0.25} />
      </div>

      {/* Interface Statistics - Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={FileText} label={t('nav.commands_management')} value={storageStats.commandsManagement} gradient="btn-gradient" delay={0.3} />
        <StatCard icon={ShoppingCart} label={t('nav.purchase_commands')} value={storageStats.purchaseCommands} gradient="btn-gradient-warm" delay={0.35} />
        <StatCard icon={Package} label={t('nav.receive_products')} value={storageStats.receiveProducts} gradient="btn-gradient-success" delay={0.4} />
        <StatCard icon={MessageSquare} label={t('nav.reclamation_messages')} value={storageStats.reclamationMessages} gradient="btn-gradient-danger" delay={0.45} />
      </div>

      {/* Low Stock Alert */}
      {storageStats.lowStockProducts > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div>
            <span className="font-medium text-amber-900 dark:text-amber-200 text-sm">{t('common.low_stock_alert')}</span>
            <span className="text-xs text-amber-700 dark:text-amber-300 mx-2">•</span>
            <span className="text-xs text-amber-700 dark:text-amber-300">
              {t('common.products_below_minimum_stock', { count: storageStats.lowStockProducts })}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
