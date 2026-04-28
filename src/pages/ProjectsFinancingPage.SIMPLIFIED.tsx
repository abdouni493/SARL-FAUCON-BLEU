import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, Search, Loader } from 'lucide-react';

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
          date: form.date,
          versement_type: 'finance_allocation'
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

  // Group versements by project
  const groupedByProject = versements.reduce((acc: any, v) => {
    if (!acc[v.project_box_id]) {
      acc[v.project_box_id] = {
        project_name: v.project_name,
        total: 0,
        versements: []
      };
    }
    acc[v.project_box_id].total += v.amount;
    acc[v.project_box_id].versements.push(v);
    return acc;
  }, {});

  const filteredProjects = Object.entries(groupedByProject).filter(([_, data]: any) =>
    data.project_name.toLowerCase().includes(searchQuery.toLowerCase())
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
            {t('project_financing.new_versement') || 'Nouveau Versement'}
          </Button>
        </div>

        {/* Projects with Versements */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">Aucun versement trouvé</p>
              </CardContent>
            </Card>
          ) : (
            filteredProjects.map(([projectId, projectData]: any, index) => (
              <motion.div
                key={projectId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{projectData.project_name}</h3>
                        <p className="text-sm opacity-90">{projectData.versements.length} versement(s)</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{projectData.total.toLocaleString()}</p>
                        <p className="text-xs opacity-80">Total</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4">
                    {/* Versements List */}
                    <div className="space-y-2 mb-4">
                      {projectData.versements.map((v: any) => (
                        <div key={v.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{v.description}</p>
                            <p className="text-xs text-gray-600">{v.date}</p>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <p className="text-sm font-bold text-purple-700 min-w-24">{v.amount.toLocaleString()}</p>
                            <Button
                              onClick={() => setDeletingId(v.id)}
                              variant="outline"
                              className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Add Versement Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau Versement</DialogTitle>
            <DialogDescription>Créer un nouveau versement pour un projet</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('common.project') || 'Projet'} *
              </label>
              <select
                value={form.project_box_id}
                onChange={(e) => setForm({ ...form, project_box_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Sélectionner un projet</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('common.amount') || 'Montant'} * (DA)
              </label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('common.date') || 'Date'} *
              </label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('common.description') || 'Description'} *
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description du versement"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSaveVersement} className="bg-purple-600 hover:bg-purple-700">
              Créer
            </Button>
          </DialogFooter>
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
    </div>
  );
}
