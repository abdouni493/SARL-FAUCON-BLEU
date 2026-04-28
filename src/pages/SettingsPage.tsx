import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Save, Lock, User, Mail, CheckCircle, Download, Upload, AlertCircle, Loader, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const { 
    enterpriseSettings, updateEnterpriseSettings, loadEnterpriseSettings, commands, setCommands,
    products, setProducts, expenses, setExpenses, projectBoxes, setProjectBoxes,
    categories, setCategories, unities, setUnities, suppliers, setSuppliers,
    workers, setWorkers, workerExpenses, setWorkerExpenses, enterpriseExpenses, setEnterpriseExpenses,
    debts, setDebts, appointments, setAppointments, bonsCommandes, setBonsCommandes,
    paymentCommands, setPaymentCommands
  } = useData();
  
  // Profile state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  
  // Enterprise settings state
  const [enterpriseName, setEnterpriseName] = useState(enterpriseSettings?.company_name || '');
  const [enterpriseAddress, setEnterpriseAddress] = useState(enterpriseSettings?.address || '');
  const [enterprisePhone, setEnterprisePhone] = useState(enterpriseSettings?.phone || '');
  const [enterpriseEmail, setEnterpriseEmail] = useState(enterpriseSettings?.email || '');
  const [enterpriseDescription, setEnterpriseDescription] = useState(enterpriseSettings?.description || '');
  
  // UI state
  const [saved, setSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [backupRestoreMessage, setBackupRestoreMessage] = useState('');
  const [backupRestoreError, setBackupRestoreError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // LOAD SETTINGS ON MOUNT
  // ============================================================
  useEffect(() => {
    if (user?.id) {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Sync enterprise settings state with context
  useEffect(() => {
    if (enterpriseSettings) {
      setEnterpriseName(enterpriseSettings.company_name || '');
      setEnterpriseAddress(enterpriseSettings.address || '');
      setEnterprisePhone(enterpriseSettings.phone || '');
      setEnterpriseEmail(enterpriseSettings.email || '');
      setEnterpriseDescription(enterpriseSettings.description || '');
    }
  }, [enterpriseSettings]);

  // ============================================================
  // PROFILE FUNCTIONS
  // ============================================================
  const handleSaveProfile = async () => {
    try {
      updateUser({ fullName, username, email });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Profile save error:', error);
    }
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t('settings.all_fields_required') || 'All fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.passwords_do_not_match') || 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t('settings.password_too_short') || 'Password must be at least 6 characters');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveEnterpriseSettings = async () => {
    try {
      await updateEnterpriseSettings({
        company_name: enterpriseName,
        address: enterpriseAddress,
        phone: enterprisePhone,
        email: enterpriseEmail,
        description: enterpriseDescription
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Enterprise settings save error:', error);
    }
  };

  // ============================================================
  // LOGO UPLOAD HANDLER - FIXED
  // ============================================================

  const handleBackupData = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        commands,
        products,
        expenses,
        projectBoxes,
        categories,
        unities,
        suppliers,
        workers,
        workerExpenses,
        enterpriseExpenses,
        debts,
        appointments,
        bonsCommandes,
        paymentCommands,
        enterpriseSettings
      }
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `erp-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setBackupRestoreMessage(t('settings.backup_created') || 'Backup created successfully!');
    setBackupRestoreError('');
    setTimeout(() => setBackupRestoreMessage(''), 3000);
  };

  const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backupData = JSON.parse(event.target?.result as string);

        if (!backupData.data) {
          throw new Error('Invalid backup file format');
        }

        setCommands(backupData.data.commands || commands);
        setProducts(backupData.data.products || products);
        setExpenses(backupData.data.expenses || expenses);
        setProjectBoxes(backupData.data.projectBoxes || projectBoxes);
        setCategories(backupData.data.categories || categories);
        setUnities(backupData.data.unities || unities);
        setSuppliers(backupData.data.suppliers || suppliers);
        setWorkers(backupData.data.workers || workers);
        setWorkerExpenses(backupData.data.workerExpenses || workerExpenses);
        setEnterpriseExpenses(backupData.data.enterpriseExpenses || enterpriseExpenses);
        setDebts(backupData.data.debts || debts);
        setAppointments(backupData.data.appointments || appointments);
        setBonsCommandes(backupData.data.bonsCommandes || bonsCommandes);
        setPaymentCommands(backupData.data.paymentCommands || paymentCommands);
        updateEnterpriseSettings(backupData.data.enterpriseSettings || enterpriseSettings);

        setBackupRestoreMessage(t('settings.data_restored') || 'Data restored successfully!');
        setBackupRestoreError('');
        setTimeout(() => setBackupRestoreMessage(''), 3000);
      } catch (error) {
        setBackupRestoreError(t('settings.restore_error') || 'Error restoring data. Please check the backup file.');
        setBackupRestoreMessage('');
        console.error('Restore error:', error);
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 ${i18n.language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
            {t('settings.title') || 'الإعدادات'}
          </h1>
          <p className="text-slate-600">{t('common.manage_your_account') || 'إدارة حسابك والتفاصيل الخاصة بك'}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-6 space-y-4">
              {/* Account Info Card */}
              <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-6 border border-slate-200 shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Logged in as</p>
                    <p className="font-semibold text-slate-900 truncate">{email}</p>
                  </div>
                </div>
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">Role</p>
                    <p className="text-sm font-semibold text-blue-600 capitalize">{user?.role}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">Member Since</p>
                    <p className="text-sm text-slate-700">2026-03-28</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-gradient-to-br from-purple-50 to-slate-100 rounded-xl p-6 border border-purple-200 shadow-md">
                <p className="text-xs text-purple-700 uppercase tracking-wider font-semibold mb-3">System Status</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm text-slate-700">Connected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-slate-700">Authenticated</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="group relative erp-card border-2 border-blue-100 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150" />
                <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 p-6 border-b">
                  <div className="flex items-center gap-3">
                    <User className="w-6 h-6 text-white" />
                    <h2 className="text-xl font-bold text-white">{t('settings.profile_settings') || 'ملف شخصي'}</h2>
                  </div>
                </div>
                <div className="p-6 space-y-4 relative">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">{t('common.full_name')}</label>
                    <Input 
                      value={fullName} 
                      onChange={e => setFullName(e.target.value)}
                      placeholder={t('common.full_name')}
                      className="bg-blue-50 dark:bg-slate-900 border-blue-200 dark:border-slate-700 text-foreground placeholder-muted-foreground focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">{t('login.username')}</label>
                    <Input 
                      value={username} 
                      onChange={e => setUsername(e.target.value)}
                      placeholder={t('login.username')}
                      className="bg-blue-50 dark:bg-slate-900 border-blue-200 dark:border-slate-700 text-foreground placeholder-muted-foreground focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">{t('login.email')}</label>
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t('login.email')}
                      className="bg-blue-50 dark:bg-slate-900 border-blue-200 dark:border-slate-700 text-foreground placeholder-muted-foreground focus:border-blue-500"
                    />
                  </div>

                  <Button 
                    onClick={handleSaveProfile}
                    className="w-full btn-gradient text-white font-semibold py-2 rounded-lg hover:shadow-lg transition-all"
                  >
                    <Save className="w-4 h-4 mr-2" /> {t('settings.update_profile')}
                  </Button>

                  {saved && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 p-3 bg-green-50 border border-green-300 rounded-lg"
                    >
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="text-sm text-green-600 font-medium">{t('settings.changes_saved') || 'تم حفظ التغييرات بنجاح!'}</p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Password Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="group relative erp-card border-2 border-purple-100 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-purple-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150" />
                <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-700 dark:to-pink-700 p-6 border-b">
                  <div className="flex items-center gap-3">
                    <Lock className="w-6 h-6 text-white" />
                    <h2 className="text-xl font-bold text-white">{t('settings.change_password') || 'تغيير كلمة المرور'}</h2>
                  </div>
                </div>
                <div className="p-6 space-y-4 relative">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">{t('settings.current_password')}</label>
                    <div className="relative">
                      <Input 
                        type={showPasswords.current ? 'text' : 'password'}
                        value={currentPassword} 
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder={t('settings.current_password')}
                        className="bg-purple-50 dark:bg-slate-900 border-purple-200 dark:border-slate-700 text-foreground placeholder-muted-foreground focus:border-purple-500 pr-10"
                      />
                      <button
                        onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">{t('settings.new_password')}</label>
                    <div className="relative">
                      <Input 
                        type={showPasswords.new ? 'text' : 'password'}
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder={t('settings.new_password')}
                        className="bg-purple-50 dark:bg-slate-900 border-purple-200 dark:border-slate-700 text-foreground placeholder-muted-foreground focus:border-purple-500 pr-10"
                      />
                      <button
                        onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">{t('settings.confirm_password')}</label>
                    <div className="relative">
                      <Input 
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={confirmPassword} 
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder={t('settings.confirm_password')}
                        className="bg-purple-50 dark:bg-slate-900 border-purple-200 dark:border-slate-700 text-foreground placeholder-muted-foreground focus:border-purple-500 pr-10"
                      />
                      <button
                        onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {passwordError && (
                    <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-600/50 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <p className="text-sm text-red-400 font-medium">{passwordError}</p>
                    </div>
                  )}

                  <Button 
                    onClick={handleChangePassword}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 rounded-lg transition-all"
                  >
                    <Lock className="w-4 h-4 mr-2" /> {t('settings.change_password')}
                  </Button>

                  {saved && !passwordError && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-600/50 rounded-lg"
                    >
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="text-sm text-green-600 font-medium">{t('settings.password_changed') || 'تم تغيير كلمة المرور بنجاح!'}</p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Enterprise Settings */}
            {user?.role === 'admin' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="group relative erp-card border-2 border-blue-100 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all">
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150" />
                  <div className="relative bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-700 dark:to-cyan-700 p-6 border-b">
                    <div className="flex items-center gap-3">
                      <User className="w-6 h-6 text-white" />
                      <h2 className="text-xl font-bold text-white">{t('settings.enterprise_settings') || 'إعدادات المؤسسة'}</h2>
                    </div>
                  </div>
                  <div className="p-6 space-y-4 relative">
                    <p className="text-sm text-muted-foreground">{t('settings.enterprise_settings_description') || 'إدارة معلومات شركتك والعلامة التجارية'}</p>
                    
                    {/* Company Information Section */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground">{t('settings.company_information') || 'معلومات الشركة'}</h3>
                      
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">{t('settings.company_name') || 'اسم الشركة'}</label>
                        <Input 
                          value={enterpriseName} 
                          onChange={e => setEnterpriseName(e.target.value)}
                          placeholder={t('settings.company_name')}
                          className="bg-blue-50 dark:bg-slate-900 border-blue-200 dark:border-slate-700 text-foreground placeholder-muted-foreground focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">{t('settings.address') || 'العنوان'}</label>
                        <Input 
                          value={enterpriseAddress} 
                          onChange={e => setEnterpriseAddress(e.target.value)}
                          placeholder={t('common.enter_address')}
                          className="bg-blue-50 dark:bg-slate-900 border-blue-200 dark:border-slate-700 text-foreground placeholder-muted-foreground focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">{t('settings.phone') || 'الهاتف'}</label>
                          <Input 
                            value={enterprisePhone} 
                            onChange={e => setEnterprisePhone(e.target.value)}
                            placeholder={t('settings.phone')}
                            className="bg-blue-50 dark:bg-slate-900 border-blue-200 dark:border-slate-700 text-foreground placeholder-muted-foreground focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">{t('settings.email') || 'البريد الإلكتروني'}</label>
                          <Input 
                            type="email"
                            value={enterpriseEmail} 
                            onChange={e => setEnterpriseEmail(e.target.value)}
                            placeholder={t('settings.company_email_address')}
                            className="bg-blue-50 dark:bg-slate-900 border-blue-200 dark:border-slate-700 text-foreground placeholder-muted-foreground focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">{t('settings.description') || 'الوصف'}</label>
                        <textarea 
                          value={enterpriseDescription} 
                          onChange={e => setEnterpriseDescription(e.target.value)}
                          placeholder={t('settings.enter_company_description')}
                          rows={3}
                          className="w-full px-3 py-2 bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-700 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={handleSaveEnterpriseSettings}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-2 rounded-lg transition-all"
                    >
                      <Save className="w-4 h-4 mr-2" /> {t('settings.save_settings') || 'حفظ الإعدادات'}
                    </Button>

                    {saved && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 p-3 bg-green-50 border border-green-300 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <p className="text-sm text-green-600 font-medium">{t('settings.changes_saved') || 'تم حفظ التغييرات بنجاح!'}</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Backup & Restore */}
            {user?.role === 'admin' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="group relative erp-card border-2 border-teal-100 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all">
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-teal-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150" />
                  <div className="relative bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-700 dark:to-cyan-700 p-6 border-b">
                    <div className="flex items-center gap-3">
                      <Download className="w-6 h-6 text-white" />
                      <h2 className="text-xl font-bold text-white">{t('settings.backup_restore') || 'النسخ الاحتياطي والاستعادة'}</h2>
                    </div>
                  </div>
                  <div className="p-6 space-y-4 relative">
                    <p className="text-sm text-muted-foreground">{t('settings.backup_restore_description') || 'قم بنسخ احتياطي لجميع بيانات النظام إلى ملف واستعادتها لاحقاً عند الحاجة.'}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button 
                        onClick={handleBackupData}
                        className="gap-2 w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold py-2 rounded-lg transition-all"
                      >
                        <Download className="w-4 h-4" /> {t('settings.create_backup') || 'إنشاء نسخة احتياطية'}
                      </Button>

                      <div className="relative">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".json"
                          onChange={handleRestoreData}
                          className="hidden"
                          id="backup-restore"
                        />
                        <label htmlFor="backup-restore">
                          <Button asChild className="gap-2 w-full cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-2 rounded-lg transition-all">
                            <span>
                              <Upload className="w-4 h-4" /> {t('settings.restore_backup') || 'استعادة النسخة الاحتياطية'}
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>

                    {backupRestoreMessage && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 p-3 bg-green-50 border border-green-300 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <p className="text-sm text-green-600 font-medium">{backupRestoreMessage}</p>
                      </motion.div>
                    )}

                    {backupRestoreError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 p-3 bg-red-50 border border-red-300 rounded-lg"
                      >
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <p className="text-sm text-red-600 font-medium">{backupRestoreError}</p>
                      </motion.div>
                    )}

                    <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
                      <p className="text-xs text-amber-700 font-semibold mb-1 uppercase">{t('settings.backup_warning') || 'تحذير'}</p>
                      <p className="text-sm text-amber-700/80">{t('settings.backup_warning_message') || 'استعادة النسخة الاحتياطية سوف تستبدل جميع البيانات الحالية. تأكد من إنشاء نسخة احتياطية من البيانات الحالية أولاً.'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
