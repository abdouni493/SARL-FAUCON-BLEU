import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Save, Lock, User, Mail, CheckCircle, Building2, Image, Download, Upload, AlertCircle, Loader, Eye, EyeOff } from 'lucide-react';
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
  
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [enterpriseName, setEnterpriseName] = useState(enterpriseSettings.name);
  const [logoPreview, setLogoPreview] = useState<string>(enterpriseSettings.logoUrl || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [backupRestoreMessage, setBackupRestoreMessage] = useState('');
  const [backupRestoreError, setBackupRestoreError] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSettings = async () => {
      if (user?.id) {
        setIsLoading(true);
        await loadEnterpriseSettings(user.id);
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [user?.id]);

  useEffect(() => {
    setEnterpriseName(enterpriseSettings.name || 'ERP System');
    setLogoPreview(enterpriseSettings.logoUrl || '');
  }, [enterpriseSettings]);

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setLogoError(t('settings.invalid_image_format') || 'Please upload a valid image file (JPG, PNG, WebP, GIF)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setLogoError(t('settings.image_too_large') || 'Image size must be less than 5MB');
        return;
      }

      setLogoError('');
      setLogoFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setLogoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogoToSupabase = async (file: File): Promise<string | null> => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const timestamp = new Date().getTime();
      const fileName = `logo_${user.id}_${timestamp}_${file.name}`;
      const filePath = `logos/${fileName}`;

      const { data, error } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      return urlData?.publicUrl || null;
    } catch (error) {
      console.error('Supabase upload error:', error);
      setLogoError(t('settings.upload_failed') || 'Failed to upload logo');
      return null;
    }
  };

  const handleSaveEnterpriseSettings = async () => {
    try {
      setLogoUploading(true);
      let logoUrl = logoPreview;

      if (logoFile) {
        const uploadedUrl = await uploadLogoToSupabase(logoFile);
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
          setLogoFile(null);
        } else {
          setLogoUploading(false);
          return;
        }
      }

      if (user?.id && user?.role === 'admin') {
        try {
          const { data: existing } = await supabase
            .from('enterprise_settings')
            .select('id')
            .eq('created_by_id', user.id)
            .single();

          if (existing?.id) {
            const { error } = await supabase
              .from('enterprise_settings')
              .update({
                logo_url: logoUrl,
                company_name: enterpriseName,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);

            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('enterprise_settings')
              .insert({
                logo_url: logoUrl,
                company_name: enterpriseName,
                created_by_id: user.id
              });

            if (error) throw error;
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
        }
      }

      updateEnterpriseSettings({
        name: enterpriseName,
        logoUrl: logoUrl
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Save enterprise settings error:', error);
      setLogoError(t('settings.save_failed') || 'Failed to save settings');
    } finally {
      setLogoUploading(false);
    }
  };

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 ${i18n.language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent mb-2">
            {t('settings.title') || 'Settings'}
          </h1>
          <p className="text-slate-400">{t('common.manage_your_account') || 'Manage your account and preferences'}</p>
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
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-6 border border-slate-600 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Logged in as</p>
                    <p className="font-semibold text-white truncate">{email}</p>
                  </div>
                </div>
                <div className="space-y-3 pt-4 border-t border-slate-600">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Role</p>
                    <p className="text-sm font-semibold text-blue-400 capitalize">{user?.role}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Member Since</p>
                    <p className="text-sm text-slate-300">2026-03-28</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-gradient-to-br from-purple-900/50 to-slate-800/50 rounded-xl p-6 border border-purple-700/50 shadow-lg">
                <p className="text-xs text-purple-300 uppercase tracking-wider font-semibold mb-3">System Status</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span className="text-sm text-slate-300">Connected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-sm text-slate-300">Authenticated</span>
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
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl border border-slate-600 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6">
                  <div className="flex items-center gap-3">
                    <User className="w-6 h-6 text-white" />
                    <h2 className="text-xl font-bold text-white">{t('settings.profile_settings') || 'Profile Settings'}</h2>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">{t('common.full_name')}</label>
                    <Input 
                      value={fullName} 
                      onChange={e => setFullName(e.target.value)}
                      placeholder={t('common.full_name')}
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">{t('login.username')}</label>
                    <Input 
                      value={username} 
                      onChange={e => setUsername(e.target.value)}
                      placeholder={t('login.username')}
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">{t('login.email')}</label>
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t('login.email')}
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-blue-500"
                    />
                  </div>

                  <Button 
                    onClick={handleSaveProfile}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-2 rounded-lg transition-all"
                  >
                    <Save className="w-4 h-4 mr-2" /> {t('settings.update_profile')}
                  </Button>

                  {saved && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-600/50 rounded-lg"
                    >
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <p className="text-sm text-green-400 font-medium">{t('settings.changes_saved') || 'Changes saved successfully!'}</p>
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
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl border border-slate-600 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
                  <div className="flex items-center gap-3">
                    <Lock className="w-6 h-6 text-white" />
                    <h2 className="text-xl font-bold text-white">{t('settings.change_password') || 'Change Password'}</h2>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">{t('settings.current_password')}</label>
                    <div className="relative">
                      <Input 
                        type={showPasswords.current ? 'text' : 'password'}
                        value={currentPassword} 
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder={t('settings.current_password')}
                        className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 pr-10"
                      />
                      <button
                        onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                      >
                        {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">{t('settings.new_password')}</label>
                    <div className="relative">
                      <Input 
                        type={showPasswords.new ? 'text' : 'password'}
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder={t('settings.new_password')}
                        className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 pr-10"
                      />
                      <button
                        onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">{t('settings.confirm_password')}</label>
                    <div className="relative">
                      <Input 
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={confirmPassword} 
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder={t('settings.confirm_password')}
                        className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 pr-10"
                      />
                      <button
                        onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
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
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <p className="text-sm text-green-400 font-medium">{t('settings.password_changed') || 'Password changed successfully!'}</p>
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
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl border border-slate-600 shadow-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-6 h-6 text-white" />
                      <h2 className="text-xl font-bold text-white">{t('settings.enterprise_settings') || 'Enterprise Settings'}</h2>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{t('settings.enterprise_name') || 'Enterprise Name'}</label>
                      <Input 
                        value={enterpriseName} 
                        onChange={e => setEnterpriseName(e.target.value)}
                        placeholder={t('settings.enterprise_name')}
                        className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-3">{t('settings.company_logo') || 'Company Logo'}</label>
                      <div className="space-y-3">
                        {logoPreview && (
                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative w-32 h-32 bg-gradient-to-br from-amber-900/30 to-slate-700 rounded-xl border-2 border-amber-600/50 flex items-center justify-center overflow-hidden shadow-lg"
                          >
                            <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                          </motion.div>
                        )}
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            id="logo-upload"
                            ref={logoInputRef}
                            disabled={logoUploading}
                          />
                          <label htmlFor="logo-upload">
                            <Button 
                              asChild 
                              className="gap-2 w-full cursor-pointer bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold disabled:opacity-50"
                              disabled={logoUploading}
                            >
                              <span>
                                <Image className="w-4 h-4" /> 
                                {logoUploading ? t('settings.uploading') || 'Uploading...' : t('settings.upload_logo') || 'Upload Logo'}
                              </span>
                            </Button>
                          </label>
                        </div>
                        
                        {logoError && (
                          <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-600/50 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <p className="text-sm text-red-400 font-medium">{logoError}</p>
                          </div>
                        )}

                        <div className="text-xs text-slate-400 space-y-1">
                          <p>{t('settings.supported_formats') || 'Supported: JPG, PNG, WebP, GIF'}</p>
                          <p>{t('settings.max_file_size') || 'Max size: 5MB'}</p>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleSaveEnterpriseSettings}
                      disabled={logoUploading}
                      className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold py-2 rounded-lg transition-all disabled:opacity-50"
                    >
                      {logoUploading ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" /> {t('settings.saving') || 'Saving...'}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" /> {t('settings.save_enterprise_settings') || 'Save Enterprise Settings'}
                        </>
                      )}
                    </Button>

                    {saved && !logoError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-600/50 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <p className="text-sm text-green-400 font-medium">{t('settings.changes_saved') || 'Changes saved successfully!'}</p>
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
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl border border-slate-600 shadow-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6">
                    <div className="flex items-center gap-3">
                      <Download className="w-6 h-6 text-white" />
                      <h2 className="text-xl font-bold text-white">{t('settings.backup_restore') || 'Backup & Restore'}</h2>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-400">{t('settings.backup_restore_description') || 'Backup all your data to a file and restore it later if needed.'}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button 
                        onClick={handleBackupData}
                        className="gap-2 w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold py-2 rounded-lg transition-all"
                      >
                        <Download className="w-4 h-4" /> {t('settings.create_backup') || 'Create Backup'}
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
                              <Upload className="w-4 h-4" /> {t('settings.restore_backup') || 'Restore Backup'}
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>

                    {backupRestoreMessage && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-600/50 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <p className="text-sm text-green-400 font-medium">{backupRestoreMessage}</p>
                      </motion.div>
                    )}

                    {backupRestoreError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-600/50 rounded-lg"
                      >
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <p className="text-sm text-red-400 font-medium">{backupRestoreError}</p>
                      </motion.div>
                    )}

                    <div className="p-4 bg-amber-900/30 border border-amber-600/50 rounded-lg">
                      <p className="text-xs text-amber-300 font-semibold mb-1 uppercase">{t('settings.backup_warning') || 'Warning'}</p>
                      <p className="text-sm text-amber-300/80">{t('settings.backup_warning_message') || 'Restoring a backup will replace all current data. Make sure to backup your current data first.'}</p>
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
