import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Save, Building2, Image, Download, Upload, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminSettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { 
    enterpriseSettings, 
    updateEnterpriseSettings, 
    loadEnterpriseSettings,
    commands, setCommands,
    products, setProducts, 
    expenses, setExpenses, 
    projectBoxes, setProjectBoxes,
    categories, setCategories, 
    unities, setUnities, 
    suppliers, setSuppliers,
    workers, setWorkers, 
    workerExpenses, setWorkerExpenses, 
    enterpriseExpenses, setEnterpriseExpenses,
    debts, setDebts, 
    appointments, setAppointments, 
    bonsCommandes, setBonsCommandes,
    paymentCommands, setPaymentCommands
  } = useData();
  
  // Form state - initialize as empty
  const [enterpriseName, setEnterpriseName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);
  const [backupRestoreMessage, setBackupRestoreMessage] = useState('');
  const [backupRestoreError, setBackupRestoreError] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // CRITICAL: Load enterprise settings from database on mount
  // ============================================================
  useEffect(() => {
    const loadSettings = async () => {
      if (user?.id) {
        setIsLoading(true);
        try {
          // Call the context function that loads from Supabase
          await loadEnterpriseSettings(user.id);
        } catch (error) {
          console.error('Error loading settings:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadSettings();
  }, [user?.id, loadEnterpriseSettings]);

  // ============================================================
  // CRITICAL: Sync form state when context changes
  // ============================================================
  useEffect(() => {
    // When enterpriseSettings changes in context, update form
    setEnterpriseName(enterpriseSettings.name || '');
    setLogoPreview(enterpriseSettings.logoUrl || '');
  }, [enterpriseSettings]);

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
      const fileName = `enterprise_logo_${user.id}_${timestamp}_${file.name}`;
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

      // If there's a new logo file to upload
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

      // ============================================================
      // Save to database - critical!
      // ============================================================
      if (user?.id) {
        try {
          // Check if settings already exist
          const { data: existing, error: selectError } = await supabase
            .from('enterprise_settings')
            .select('id')
            .eq('created_by_id', user.id)
            .single();

          // Note: error code 'PGRST116' means no rows found (not an error)
          if (selectError && selectError.code !== 'PGRST116') {
            throw selectError;
          }

          if (existing?.id) {
            // Update existing record
            const { error: updateError } = await supabase
              .from('enterprise_settings')
              .update({
                logo_url: logoUrl,
                company_name: enterpriseName,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);

            if (updateError) throw updateError;
            console.log('Enterprise settings updated successfully');
          } else {
            // Create new record
            const { error: insertError } = await supabase
              .from('enterprise_settings')
              .insert({
                logo_url: logoUrl,
                company_name: enterpriseName,
                created_by_id: user.id
              });

            if (insertError) throw insertError;
            console.log('Enterprise settings created successfully');
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
          throw dbError;
        }
      }

      // Update context to trigger form sync
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

  // Show loading state while fetching
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 max-w-2xl ${i18n.language === 'ar' ? 'rtl' : 'ltr'}`}>
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-3xl font-bold text-foreground mb-2"
      >
        {t('settings.title')} - {t('sidebar.general_administration')}
      </motion.h1>

      {/* Enterprise Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="erp-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Building2 className="w-5 h-5" />
              {t('settings.enterprise_settings') || 'Enterprise Settings'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">{t('settings.enterprise_name') || 'Enterprise Name'}</label>
              <Input 
                value={enterpriseName} 
                onChange={e => setEnterpriseName(e.target.value)}
                placeholder={t('settings.enterprise_name')}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">{t('settings.company_logo') || 'Company Logo'}</label>
              <div className="space-y-3">
                {logoPreview && (
                  <div className="relative w-32 h-32 bg-secondary/30 rounded-lg border border-border flex items-center justify-center overflow-hidden">
                    <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload-admin"
                    ref={logoInputRef}
                    disabled={logoUploading}
                  />
                  <label htmlFor="logo-upload-admin">
                    <Button 
                      asChild 
                      className="gap-2 w-full cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
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
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-red-700 font-medium">{logoError}</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  <p>{t('settings.supported_formats') || 'Supported: JPG, PNG, WebP, GIF'}</p>
                  <p>{t('settings.max_file_size') || 'Max size: 5MB'}</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSaveEnterpriseSettings}
              disabled={logoUploading}
              className="gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
            >
              {logoUploading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" /> {t('settings.saving') || 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> {t('settings.save_enterprise_settings') || 'Save Enterprise Settings'}
                </>
              )}
            </Button>

            {saved && !logoError && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <p className="text-sm text-emerald-700 font-medium">{t('settings.changes_saved') || 'Changes saved successfully!'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Backup & Restore */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="erp-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Download className="w-5 h-5" />
              {t('settings.backup_restore') || 'Backup & Restore'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('settings.backup_restore_description') || 'Backup all your data to a file and restore it later if needed.'}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={handleBackupData}
                className="gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white"
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
                  id="backup-restore-admin"
                />
                <label htmlFor="backup-restore-admin">
                  <Button asChild className="gap-2 w-full cursor-pointer bg-purple-600 hover:bg-purple-700 text-white">
                    <span>
                      <Upload className="w-4 h-4" /> {t('settings.restore_backup') || 'Restore Backup'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            {backupRestoreMessage && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <p className="text-sm text-emerald-700 font-medium">{backupRestoreMessage}</p>
              </div>
            )}

            {backupRestoreError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-700 font-medium">{backupRestoreError}</p>
              </div>
            )}

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800 font-semibold mb-1">{t('settings.backup_warning') || 'Warning'}</p>
              <p className="text-sm text-yellow-800">{t('settings.backup_warning_message') || 'Restoring a backup will replace all current data. Make sure to backup your current data first.'}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
