import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import {
  Save, Building2, Upload, AlertCircle, Loader, CheckCircle,
  X, Camera, Database, Clock, User, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FormData {
  company_name: string;
  logo_url: string;
}

interface DatabaseStatus {
  connected: boolean;
  recordExists: boolean;
  lastUpdated: string;
}

export default function AdminSettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { enterpriseSettings, updateEnterpriseSettings, loadEnterpriseSettings } = useData();

  // Form State
  const [formData, setFormData] = useState<FormData>({
    company_name: '',
    logo_url: ''
  });

  // UI State
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus>({
    connected: false,
    recordExists: false,
    lastUpdated: ''
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // References
  const logoInputRef = useRef<HTMLInputElement>(null);
  const isRtl = i18n.language === 'ar';

  // ============================================================
  // Load from database on mount
  // ============================================================
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('enterprise_settings')
          .select('company_name, logo_url, created_by_id, updated_at')
          .eq('created_by_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Load error:', error);
          setDatabaseStatus({
            connected: false,
            recordExists: false,
            lastUpdated: 'Error loading'
          });
          setErrorMessage('Failed to load settings from database');
          return;
        }

        if (data) {
          setFormData({
            company_name: data.company_name || 'ERP System',
            logo_url: data.logo_url || ''
          });
          setLogoPreview(data.logo_url || '');
          setDatabaseStatus({
            connected: true,
            recordExists: true,
            lastUpdated: new Date(data.updated_at).toLocaleString()
          });
          console.log('✅ Loaded from database:', data);
        } else {
          setFormData({ company_name: 'ERP System', logo_url: '' });
          setDatabaseStatus({
            connected: true,
            recordExists: false,
            lastUpdated: 'New record'
          });
        }
      } catch (error) {
        console.error('❌ Load exception:', error);
        setDatabaseStatus({
          connected: false,
          recordExists: false,
          lastUpdated: 'Connection error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user?.id]);

  // ============================================================
  // Handle logo file selection
  // ============================================================
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size must be less than 5MB');
      return;
    }

    setLogoFile(file);
    setErrorMessage('');

    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ============================================================
  // Upload logo to Supabase Storage
  // ============================================================
  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      setLogoUploading(true);

      if (!user?.id) throw new Error('User not authenticated');

      const fileName = `logo_${user.id}_${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `${user.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      console.log('✅ Logo uploaded:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ Upload error:', error);
      setErrorMessage('Failed to upload logo');
      return null;
    } finally {
      setLogoUploading(false);
    }
  };

  // ============================================================
  // Save to database
  // ============================================================
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      if (!user?.id) {
        setErrorMessage('User not authenticated');
        return;
      }

      if (!formData.company_name.trim()) {
        setErrorMessage('Company name is required');
        return;
      }

      let logoUrl = formData.logo_url;

      if (logoFile) {
        const uploadedUrl = await uploadLogo(logoFile);
        if (!uploadedUrl) return;
        logoUrl = uploadedUrl;
        setLogoFile(null);
      }

      const { data: existing, error: selectError } = await supabase
        .from('enterprise_settings')
        .select('id, updated_at')
        .eq('created_by_id', user.id)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      let saveError;
      let updatedRecord: any = null;

      if (existing?.id) {
        const { data, error } = await supabase
          .from('enterprise_settings')
          .update({
            company_name: formData.company_name.trim(),
            logo_url: logoUrl,
            updated_at: new Date().toISOString()
          })
          .eq('created_by_id', user.id)
          .select('updated_at')
          .single();

        saveError = error;
        updatedRecord = data;
        console.log('✅ Updated database record');
      } else {
        const { data, error } = await supabase
          .from('enterprise_settings')
          .insert({
            company_name: formData.company_name.trim(),
            logo_url: logoUrl,
            created_by_id: user.id
          })
          .select('updated_at')
          .single();

        saveError = error;
        updatedRecord = data;
        console.log('✅ Created new database record');
      }

      if (saveError) {
        console.error('❌ Database error:', saveError);
        throw saveError;
      }

      setFormData(prev => ({ ...prev, logo_url: logoUrl }));
      setLogoPreview(logoUrl);

      await loadEnterpriseSettings(user.id);
      updateEnterpriseSettings({
        name: formData.company_name.trim(),
        logoUrl: logoUrl
      });

      setDatabaseStatus(prev => ({
        ...prev,
        recordExists: true,
        lastUpdated: updatedRecord?.updated_at ? new Date(updatedRecord.updated_at).toLocaleString() : new Date().toLocaleString()
      }));

      setSuccessMessage('✨ Settings saved successfully! Changes applied immediately.');
      setTimeout(() => setSuccessMessage(''), 5000);

    } catch (error) {
      console.error('❌ Save error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================
  // Remove logo
  // ============================================================
  const handleRemoveLogo = async () => {
    try {
      if (!user?.id) return;

      setFormData(prev => ({ ...prev, logo_url: '' }));
      setLogoPreview('');
      setLogoFile(null);

      const { error } = await supabase
        .from('enterprise_settings')
        .update({
          logo_url: '',
          updated_at: new Date().toISOString()
        })
        .eq('created_by_id', user.id);

      if (!error) {
        await loadEnterpriseSettings(user.id);
        updateEnterpriseSettings({ name: formData.company_name, logoUrl: '' });
        setSuccessMessage('Logo removed successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('❌ Error removing logo:', error);
      setErrorMessage('Failed to remove logo');
    }
  };

  // ============================================================
  // Copy to clipboard
  // ============================================================
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="relative w-16 h-16 mx-auto">
            <Loader className="w-16 h-16 animate-spin text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">Loading settings...</p>
            <p className="text-sm text-muted-foreground">Connecting to database</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-6 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t('sidebar.general_administration') || 'General Administration'}
            </h1>
            <p className="text-sm text-muted-foreground">Configure your enterprise identity and branding</p>
          </div>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Settings Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Settings Card */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Enterprise Configuration
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {/* Company Name */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="space-y-2"
              >
                <label className="block text-sm font-semibold text-foreground">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={formData.company_name}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, company_name: e.target.value }));
                      setErrorMessage('');
                    }}
                    placeholder="Enter your company name"
                    className="pl-10 h-11 text-base"
                    disabled={isSaving}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This name appears in the sidebar, header, and navigation
                </p>
              </motion.div>

              {/* Logo Upload */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-3"
              >
                <label className="block text-sm font-semibold text-foreground">
                  Company Logo
                </label>

                <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border-2 border-dashed border-border space-y-4">
                  {/* Logo Preview */}
                  {(logoPreview || formData.logo_url) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative w-full h-48 bg-white dark:bg-slate-950 rounded-lg border border-border flex items-center justify-center overflow-hidden group shadow-sm"
                    >
                      <img
                        src={logoPreview || formData.logo_url}
                        alt="Company logo"
                        className="w-full h-full object-contain p-2"
                        onError={() => setLogoPreview('')}
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                        onClick={handleRemoveLogo}
                        disabled={isSaving}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  )}

                  {/* Upload Area */}
                  <div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoSelect}
                      className="hidden"
                      id="logo-input"
                      disabled={logoUploading || isSaving}
                    />
                    <label htmlFor="logo-input">
                      <Button
                        asChild
                        className="w-full gap-2 cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold h-11"
                        disabled={logoUploading || isSaving}
                      >
                        <span>
                          {logoUploading ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Uploading...
                            </>
                          ) : logoPreview || formData.logo_url ? (
                            <>
                              <Camera className="w-4 h-4" />
                              Change Logo
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Upload Logo
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                  </div>

                  {/* Info */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="flex items-center gap-1">✓ JPG, PNG, GIF, WebP</p>
                    <p className="flex items-center gap-1">✓ Maximum 5MB</p>
                    <p className="flex items-center gap-1">✓ Recommended: Square (500×500px)</p>
                  </div>
                </div>
              </motion.div>

              {/* Messages */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg"
                >
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">{successMessage}</p>
                </motion.div>
              )}

              {/* Save Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  onClick={handleSave}
                  disabled={isSaving || logoUploading}
                  className="w-full h-12 gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column: Status & Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Database Status */}
          <Card className="border-2 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Database Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Connection</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${databaseStatus.connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="font-medium text-foreground">
                    {databaseStatus.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Record</span>
                <span className="font-medium text-foreground">
                  {databaseStatus.recordExists ? 'Exists' : 'New'}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-muted-foreground">Updated</span>
                <div className="text-right">
                  <p className="text-xs font-mono text-foreground">
                    {databaseStatus.lastUpdated}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">User ID</p>
                <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs font-mono break-all">
                  <span>{user?.id?.slice(0, 12)}...</span>
                  <button
                    onClick={() => user?.id && copyToClipboard(user.id, 'userId')}
                    className="ml-auto"
                  >
                    {copiedField === 'userId' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-xs font-semibold text-foreground">{user?.email}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold">
                  {(user as any)?.user_metadata?.role || 'Admin'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
            <CardHeader>
              <CardTitle className="text-sm">💡 Quick Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• Changes save to database immediately</p>
              <p>• Logo displays in sidebar and header</p>
              <p>• All users see the same company name</p>
              <p>• Refresh page to verify persistence</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
