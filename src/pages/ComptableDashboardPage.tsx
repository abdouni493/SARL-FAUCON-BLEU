import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { motion } from 'framer-motion';
import { Wallet, Package, Receipt, BarChart3, DollarSign, TrendingUp, AlertCircle, BoxIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const StatCard = ({ icon: Icon, label, value, gradient, delay }: { icon: React.ElementType; label: string; value: string | number; gradient: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="erp-stat-card"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${gradient}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </motion.div>
);

export default function ComptableDashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { projectBoxes, bonsCommandes, paymentCommands, expenses, debts } = useData();

  // Calculate statistics
  const totalBoxes = projectBoxes.length;
  const totalBons = bonsCommandes.filter(b => b.status === 'validated').length;
  const totalPayments = paymentCommands.length;
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.price || 0), 0);
  const totalVersements = projectBoxes.reduce((sum, box) => sum + box.versements.reduce((s, v) => s + (v.amount || 0), 0), 0);
  const totalDebtsAmount = debts.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const totalDebtsRemaining = debts.reduce((sum, d) => sum + ((d.totalAmount || 0) - (d.paidAmount || 0)), 0);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M DA`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K DA`;
    }
    return `${value.toLocaleString()} DA`;
  };

  return (
    <div className={`space-y-6 ${i18n.language === 'ar' ? 'rtl' : 'ltr'}`}>
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-3xl font-bold text-foreground mb-2"
      >
        {t('dashboard.welcome')}، {user?.fullName}
      </motion.h1>
      <p className="text-muted-foreground">{t('roles.comptable')}</p>

      {/* Primary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label={t('nav.finance_box')} value={totalBoxes} gradient="btn-gradient" delay={0.1} />
        <StatCard icon={BoxIcon} label={t('nav.bons_commandes')} value={totalBons} gradient="btn-gradient-success" delay={0.15} />
        <StatCard icon={Receipt} label={t('nav.payment_commands')} value={totalPayments} gradient="btn-gradient-warm" delay={0.2} />
        <StatCard icon={DollarSign} label={t('common.total_amount')} value={formatCurrency(totalVersements)} gradient="btn-gradient-success" delay={0.25} />
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={TrendingUp} label={t('nav.project_expenses')} value={formatCurrency(totalExpenses)} gradient="btn-gradient-danger" delay={0.3} />
        <StatCard icon={AlertCircle} label={t('nav.debts')} value={formatCurrency(totalDebtsRemaining)} gradient="btn-gradient-danger" delay={0.35} />
        <StatCard icon={BarChart3} label={t('nav.debts') + ' ' + t('common.total')} value={formatCurrency(totalDebtsAmount)} gradient="btn-gradient" delay={0.4} />
      </div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Finance Overview */}
        <Card className="erp-card border-l-4 border-l-blue-500">
          <CardContent className="pt-5">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-600" />
              {t('nav.finance_box')} {t('common.overview')}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                <span className="text-sm text-muted-foreground">{t('nav.project_finance')}</span>
                <span className="font-semibold text-foreground">{formatCurrency(totalVersements)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                <span className="text-sm text-muted-foreground">{t('nav.debts')}</span>
                <span className="font-semibold text-red-600">{formatCurrency(totalDebtsRemaining)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                <span className="text-sm text-muted-foreground">{t('common.total_amount')}</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(totalVersements + totalDebtsRemaining)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Alerts */}
      {totalDebtsRemaining > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900 text-sm">{t('common.alert')}</p>
            <p className="text-red-700 text-sm mt-1">
              {t('comptable.outstanding_debts')}: {formatCurrency(totalDebtsRemaining)}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
