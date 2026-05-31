import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { getPrintLabels, buildPrintHTML, openPrintWindow, formatDateLocale } from '@/lib/printUtils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, Search, Loader, Printer } from 'lucide-react';

interface ProjectVersement {
  id: string;
  project_box_id: string;
  project_name?: string;
  amount: number;
  date: string;
  description: string;
  created_at: string;
  versement_type?: string;
}

interface Project {
  id: string;
  name: string;
}

export default function ProjectsFinancingPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { enterpriseSettings } = useData();
  const isRtl = i18n.language === 'ar';

  // State management
  const [versements, setVersements] = useState<ProjectVersement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingPrintVersement, setPendingPrintVersement] = useState<ProjectVersement | null>(null);

  // Form state
  const [form, setForm] = useState({
    project_box_id: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Fetch all versements
  const fetchVersements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_versements')
        .select(`
          *,
          project_boxes(name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      const enriched = (data || []).map((v: any) => ({
        ...v,
        project_name: v.project_boxes?.name || 'Projet inconnu'
      }));

      setVersements(enriched);
    } catch (error) {
      console.error('Error fetching versements:', error);
      setMessage('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Fetch projects for dropdown
  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('project_boxes')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  useEffect(() => {
    fetchVersements();
    fetchProjects();
  }, []);

  // Reset form
  const resetForm = () => {
    setForm({
      project_box_id: '',
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Handle save versement
  const handleSaveVersement = async () => {
    if (!form.project_box_id || !form.amount || !form.description) {
      setMessage('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const { error } = await supabase
        .from('project_versements')
        .insert({
          project_box_id: form.project_box_id,
          amount: form.amount,
          description: form.description,
          date: form.date
        });

      if (error) throw error;

      setMessage('Versement créé avec succès');
      resetForm();
      setShowForm(false);
      await fetchVersements();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving:', error);
      setMessage('Erreur lors de la sauvegarde');
    }
  };

  // Handle delete versement
  const handleDeleteVersement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_versements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDeletingId(null);
      await fetchVersements();
      setMessage('Versement supprimé avec succès');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting:', error);
      setMessage('Erreur lors de la suppression');
    }
  };

  // Handle print versement
  const handlePrintVersement = (versement: ProjectVersement, lang: 'ar' | 'fr') => {
    const L = getPrintLabels(lang);
    const body = `
      <div class="details-grid-2">
        <div class="detail-item"><h3>${L.isAr ? 'المشروع' : 'Projet'}</h3><p>${versement.project_name || 'N/A'}</p></div>
        <div class="detail-item"><h3>${L.date}</h3><p>${formatDateLocale(versement.date, lang)}</p></div>
        <div class="detail-item"><h3>${L.description}</h3><p>${versement.description}</p></div>
        <div class="detail-item"><h3>${L.amount}</h3><p>${versement.amount.toLocaleString()} DA</p></div>
      </div>`;
    openPrintWindow(buildPrintHTML({
      lang,
      docTitle: { ar: 'تحويل مالي', fr: 'Versement Financier' },
      docDate: formatDateLocale(versement.date, lang),
      enterpriseSettings,
    }, body));
  };

  // Filter versements by search query
  const filteredVersements = versements.filter(v =>
    v.project_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6 ${isRtl ? 'rtl' : 'ltr'}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('project_financing.title') || 'Finances Projets'}</h1>
          <p className="text-gray-600">{t('project_financing.description') || 'Gestion des versements et allocations'}</p>
        </div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg font-medium ${
              message.includes('succès') || message.includes('créé')
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {message}
          </motion.div>
        )}

        {/* Search and New Button */}
        <div className="mb-6 flex gap-4 flex-col md:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              placeholder={t('project_financing.search') || 'Rechercher un projet...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('project_financing.new_versement') || 'Nouveau Financement'}
          </Button>
        </div>

        {/* Versements Grid */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : filteredVersements.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">Aucun versement trouvé</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredVersements.map((v, index) => {
                const project = projects.find(p => p.id === v.project_box_id);
                return (
                  <motion.div
                    key={v.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-0 shadow-md hover:shadow-lg transition-all hover:-translate-y-1 h-full flex flex-col">
                      <CardHeader className="bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-t-lg p-3">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold truncate">{project?.name || 'Projet'}</h3>
                          <p className="text-xs opacity-80">{v.date}</p>
                        </div>
                      </CardHeader>

                      <CardContent className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{v.description}</p>
                          <p className="text-2xl font-bold text-purple-700">{v.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">DA</p>
                        </div>

                        <div className="mt-3 pt-3 border-t space-y-2 flex flex-col gap-2">
                          <Button
                            onClick={() => setPendingPrintVersement(v)}
                            className="w-full h-8 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1"
                          >
                            <Printer className="w-3 h-3" /> {t('common.print')}
                          </Button>
                          <Button
                            onClick={() => setDeletingId(v.id)}
                            variant="outline"
                            className="w-full h-8 text-xs text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            {isRtl ? 'حذف' : 'Supprimer'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Add Versement Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[95%] sm:w-full max-w-2xl mx-auto my-auto max-h-[90vh] overflow-y-auto p-0 gap-0">
          {/* Dialog Header with Gradient */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 px-6 py-5 border-b border-blue-100 dark:border-slate-600 sticky top-0 z-10">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('project_financing.new_versement') || 'Nouveau Financement'}
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                {isRtl ? 'إنشاء تمويل جديد لمشروع' : 'Créer un nouveau financement pour un projet'}
              </DialogDescription>
            </div>
          </div>

          {/* Gradient Accent Bar */}
          <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

          {/* Form Content */}
          <div className="px-4 sm:px-6 py-6 space-y-6">
            {/* Required Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b-2 border-blue-600">
                <div className="h-1 w-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {isRtl ? 'المعلومات المطلوبة' : 'Informations Requises'}
                </h3>
              </div>

              {/* Project Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('common.project') || 'Projet'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.project_box_id}
                  onChange={(e) => setForm({ ...form, project_box_id: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">{isRtl ? '-- اختر مشروع --' : 'Sélectionner un projet'}</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>

              {/* Amount Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('common.amount') || 'Montant'} <span className="text-red-500">*</span> (DA)
                </label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  step="0.01"
                  className="px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Date Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('common.date') || 'Date'} <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Optional Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b-2 border-blue-600">
                <div className="h-1 w-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {isRtl ? 'المعلومات الإضافية' : 'Informations Supplémentaires'}
                </h3>
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('common.description') || 'Description'}
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={isRtl ? 'وصف التحويل' : 'Description du versement'}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Dialog Footer */}
          <div className="px-4 sm:px-6 py-4 bg-slate-50 dark:bg-slate-700/20 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 z-10 flex flex-col-reverse sm:flex-row gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowForm(false)}
              className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold w-full sm:w-auto"
            >
              {isRtl ? 'إلغاء' : 'Annuler'}
            </Button>
            <Button 
              onClick={handleSaveVersement}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              {isRtl ? 'إنشاء' : 'Créer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le versement</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera le versement de façon permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingId) {
                  await handleDeleteVersement(deletingId);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Language Chooser Dialog */}
      <Dialog open={!!pendingPrintVersement} onOpenChange={() => setPendingPrintVersement(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-xl font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" /> {t('common.choose_print_language')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 px-2 pb-2">
            <Button onClick={() => { if (pendingPrintVersement) handlePrintVersement(pendingPrintVersement, 'ar'); setPendingPrintVersement(null); }} className="h-24 flex flex-col gap-2 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-lg rounded-xl shadow-lg">
              <span className="text-2xl">🇩🇿</span> {t('common.print_in_arabic')}
            </Button>
            <Button onClick={() => { if (pendingPrintVersement) handlePrintVersement(pendingPrintVersement, 'fr'); setPendingPrintVersement(null); }} className="h-24 flex flex-col gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-xl shadow-lg">
              <span className="text-2xl">🇫🇷</span> {t('common.print_in_french')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
