import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader, Save, Upload, Building2, AlertCircle, CheckCircle } from 'lucide-react';

interface FormData {
  logo: File | null;
  logoUrl: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  nis: string;
  nif: string;
  rc: string;
  article: string;
}

export default function EntrepriseSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { enterpriseSettings, loadEnterpriseSettings, updateEnterpriseSettings } = useData();
  const [formData, setFormData] = useState<FormData>({
    logo: null,
    logoUrl: enterpriseSettings.logoUrl || '',
    name: enterpriseSettings.name || '',
    address: enterpriseSettings.address || '',
    phone: enterpriseSettings.phone || '',
    email: enterpriseSettings.email || '',
    description: enterpriseSettings.description || '',
    nis: enterpriseSettings.nis || '',
    nif: enterpriseSettings.nif || '',
    rc: enterpriseSettings.rc || '',
    article: enterpriseSettings.article || '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Load entreprise info from DB
  useEffect(() => {
    const loadEntreprise = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('enterprise_settings')
          .select('company_name, logo_url, address, phone, email, description, nis, nif, rc, article')
          .eq('created_by_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Failed to load entreprise settings:', error);
          setFormData({
            logo: null,
            logoUrl: '',
            name: 'ERP System',
            address: '',
            phone: '',
            email: '',
            description: '',
            nis: '',
            nif: '',
            rc: '',
            article: '',
          });
        } else if (data) {
          setFormData({
            logo: null,
            logoUrl: data.logo_url || '',
            name: data.company_name || 'ERP System',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            description: (data as any).description || '',
            nis: (data as any).nis || '',
            nif: (data as any).nif || '',
            rc: (data as any).rc || '',
            article: (data as any).article || '',
          });
          updateEnterpriseSettings({
            name: data.company_name || 'ERP System',
            logoUrl: data.logo_url || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            description: (data as any).description || '',
            nis: (data as any).nis || '',
            nif: (data as any).nif || '',
            rc: (data as any).rc || '',
            article: (data as any).article || ''
          });
        } else {
          setFormData({
            logo: null,
            logoUrl: '',
            name: 'ERP System',
            address: '',
            phone: '',
            email: '',
            description: '',
            nis: '',
            nif: '',
            rc: '',
            article: '',
          });
        }
      } catch (err) {
        console.error('Exception loading entreprise settings:', err);
        setFormData({
          logo: null,
          logoUrl: '',
          name: 'ERP System',
          address: '',
          phone: '',
          email: '',
          description: '',
          nis: '',
          nif: '',
          rc: '',
          article: '',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadEntreprise();
  }, [user?.id]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormData((prev) => ({ ...prev, logo: file, logoUrl: URL.createObjectURL(file) }));
  };

  const handleSave = async () => {
    if (!user?.id) {
      setErrorMessage('User must be logged in to save settings.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    const saveValues = async (logoValue: string) => {
      const { error } = await supabase
        .from('enterprise_settings')
        .upsert({
          created_by_id: user.id,
          company_name: formData.name,
          logo_url: logoValue,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          description: formData.description,
          nis: formData.nis,
          nif: formData.nif,
          rc: formData.rc,
          article: formData.article,
        }, { onConflict: 'created_by_id' });

      if (error) {
        setErrorMessage('Failed to save: ' + error.message);
        setIsSaving(false);
      } else {
        updateEnterpriseSettings({
          name: formData.name,
          logoUrl: logoValue,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          description: formData.description,
          nis: formData.nis,
          nif: formData.nif,
          rc: formData.rc,
          article: formData.article,
        });
        
        await loadEnterpriseSettings(user.id);
        
        setSuccessMessage('Settings saved successfully!');
        
        setTimeout(() => setSuccessMessage(''), 3000);
        setIsSaving(false);
      }
    };

    if (formData.logo) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await saveValues(base64);
      };
      reader.readAsDataURL(formData.logo);
      return;
    }

    await saveValues(formData.logoUrl);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex justify-center items-center">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto"
          />
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading enterprise settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header Section with Gradient Background */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 border-b border-blue-100 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {t('settings.enterprise_settings') || 'Enterprise Settings'}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {t('settings.enterprise_settings_description') || 'Manage your company information and branding'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
          {/* Card Accent Bar */}
          <div className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
          
          <CardContent className="space-y-6 pt-6">
            {/* Logo Section */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                Company Logo
              </h3>
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-slate-700 dark:to-slate-600 border-2 border-dashed border-blue-300 dark:border-slate-600 flex items-center justify-center">
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Building2 className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" id="logo-upload" />
                <label htmlFor="logo-upload">
                  <Button asChild variant="outline" size="sm" className="border-blue-200 dark:border-slate-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700">
                    <span><Upload className="w-4 h-4 mr-2" />Upload Logo</span>
                  </Button>
                </label>
              </div>
            </div>

            {/* Information Section */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                Company Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Company Name</label>
                  <Input 
                    placeholder="Your company name" 
                    value={formData.name} 
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Address</label>
                  <Input 
                    placeholder="Company address" 
                    value={formData.address} 
                    onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Phone</label>
                    <Input 
                      placeholder="Company phone number" 
                      value={formData.phone} 
                      onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Email</label>
                    <Input 
                      type="email"
                      placeholder="Company email address" 
                      value={formData.email} 
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Identifiers Section */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                {t('settings.legal_identifiers') || 'Legal Identifiers'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">{t('settings.nis') || 'NIS'}</label>
                  <Input 
                    placeholder="NIS number" 
                    value={formData.nis} 
                    onChange={e => setFormData(prev => ({ ...prev, nis: e.target.value }))}
                    className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">{t('settings.nif') || 'NIF'}</label>
                  <Input 
                    placeholder="NIF number" 
                    value={formData.nif} 
                    onChange={e => setFormData(prev => ({ ...prev, nif: e.target.value }))}
                    className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">{t('settings.rc') || 'RC'}</label>
                  <Input 
                    placeholder="RC number" 
                    value={formData.rc} 
                    onChange={e => setFormData(prev => ({ ...prev, rc: e.target.value }))}
                    className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">{t('settings.article') || 'Article'}</label>
                  <Input 
                    placeholder="Article number" 
                    value={formData.article} 
                    onChange={e => setFormData(prev => ({ ...prev, article: e.target.value }))}
                    className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                Description
              </h3>
              <Textarea 
                placeholder="Enter your company description..."
                value={formData.description} 
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="resize-none border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>

            {/* Messages */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 p-4 rounded-lg border bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700"
              >
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
              </motion.div>
            )}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 p-4 rounded-lg border bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700"
              >
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">{successMessage}</p>
              </motion.div>
            )}

            {/* Save Button */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <Button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium transition-all duration-200"
              >
                {isSaving ? (
                  <>
                    <Loader className="animate-spin w-4 h-4 mr-2" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Save Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
