import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Edit, Trash2, Plus, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ProjectBox {
  id: string;
  name: string;
  chef_id: string;
}

interface ProjectExpense {
  id: string;
  expense_id: string;
  project_box_id: string;
  description: string;
  amount: number;
  expense_date: string;
  created_by_id?: string;
  chef_de_projet_id?: string;
  category?: string;
}

export default function ProjectExpensesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ProjectExpense[]>([]);
  const [projects, setProjects] = useState<ProjectBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [message, setMessage] = useState('');
  const [lastSelectedProjectId, setLastSelectedProjectId] = useState<string>('');
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    projectBoxId: '',
    category: 'autre',
  });

  useEffect(() => {
    fetchData();
    loadLastSelectedProject();
  }, []);

  // Load last selected project from localStorage
  const loadLastSelectedProject = () => {
    const savedProjectId = localStorage.getItem('lastSelectedProjectId');
    if (savedProjectId) {
      setLastSelectedProjectId(savedProjectId);
      setFormData(prev => ({ ...prev, projectBoxId: savedProjectId }));
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch projects for the current chef_de_projet
      const { data: projectsData, error: projectsError } = await supabase
        .from('project_boxes')
        .select('id, name, chef_id')
        .eq('chef_id', user?.id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('project_expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (expensesError) throw expensesError;
      setExpenses(expensesData || []);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (expense: ProjectExpense) => {
    setEditingId(expense.id);
    setFormData({
      description: expense.description,
      amount: (expense.amount || expense.price).toString(),
      date: expense.expense_date,
      projectBoxId: expense.project_box_id,
      category: expense.category || 'autre',
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.description || !formData.amount || !formData.projectBoxId) {
        setMessage('Please fill in all required fields');
        return;
      }

      // Save selected project to localStorage
      localStorage.setItem('lastSelectedProjectId', formData.projectBoxId);

      if (editingId) {
        const { error } = await supabase
          .from('project_expenses')
          .update({
            description: formData.description,
            price: Number(formData.amount),
            expense_date: formData.date,
            project_box_id: formData.projectBoxId,
            category: formData.category,
            created_by_id: user?.id,
            chef_de_projet_id: user?.id,
          })
          .eq('id', editingId);
        if (error) throw error;
        setMessage('Expense updated successfully!');
      } else {
        const { error } = await supabase
          .from('project_expenses')
          .insert({
            expense_id: `EXP-${Date.now()}`,
            project_box_id: formData.projectBoxId,
            description: formData.description,
            price: Number(formData.amount),
            expense_date: formData.date,
            category: formData.category,
            created_by_id: user?.id,
            chef_de_projet_id: user?.id,
          });
        if (error) throw error;
        setMessage('Expense created successfully!');
      }

      resetForm();
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from('project_expenses')
        .delete()
        .eq('id', deleteId);
      if (error) throw error;
      setMessage('Expense deleted successfully!');
      setDeleteId(null);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      projectBoxId: lastSelectedProjectId,
      category: 'autre',
    });
    setEditingId(null);
    setShowCreateDialog(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            message.includes('Error')
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {message}
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">{t('nav.project_expenses')}</h1>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2 btn-gradient text-white font-semibold border-0">
          <Plus className="w-4 h-4" /> {t('common.create_expense')}
        </Button>
      </div>
      {expenses.length === 0 ? (
        <div className="erp-card text-center py-12 text-muted-foreground">{t('common.no_data')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {expenses.map((exp, i) => (
            <motion.div 
              key={exp.id} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.05 }} 
              className="group relative erp-card border-2 border-blue-100 dark:border-slate-700 hover:shadow-xl transition-all overflow-hidden"
            >
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150" />
              <div className="relative">
                <h3 className="font-bold text-lg text-foreground mb-3">{exp.description}</h3>
                <p className="text-sm text-muted-foreground">{t('common.price')}: <span className="font-bold text-blue-600 dark:text-blue-400">{(exp.amount || exp.price).toLocaleString()} DA</span></p>
                <p className="text-sm text-muted-foreground mb-4">{t('common.date')}: <span className="font-semibold text-foreground">{exp.expense_date}</span></p>
                <div className="flex gap-1.5">
                  <Button 
                    size="sm" 
                    onClick={() => startEdit(exp)} 
                    className="gap-1 flex-1 btn-gradient text-white font-semibold px-2 h-8 text-xs"
                  >
                    <Edit className="w-3 h-3" /> {t('common.edit')}
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setDeleteId(exp.id)} 
                    className="gap-1 flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold px-2 h-8 text-xs"
                  >
                    <Trash2 className="w-3 h-3" /> {t('common.delete')}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit/Create Expense Dialog */}
      <Dialog open={showCreateDialog || !!editingId} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">{editingId ? t('common.edit_expense') : t('common.create_expense')}</DialogTitle>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{editingId ? 'Update expense details' : 'Add new project expense'}</p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Projet * </label>
              <select
                value={formData.projectBoxId}
                onChange={(e) => setFormData({ ...formData, projectBoxId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Sélectionner un projet</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">{t('common.description')}</label>
              <Textarea 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('common.enter_description')}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">{t('common.price')}</label>
              <Input 
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                min="0"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Catégorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="autre">Autre</option>
                <option value="materiel">Matériel</option>
                <option value="main_oeuvre">Main d'œuvre</option>
                <option value="transport">Transport</option>
                <option value="frais_generaux">Frais Généraux</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">{t('common.date')}</label>
              <Input 
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} className="erp-gradient-bg border-0 text-primary-foreground">
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm_delete')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
