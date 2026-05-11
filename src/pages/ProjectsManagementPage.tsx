import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { getPrintLabels, buildPrintHTML, openPrintWindow, formatDateLocale } from '@/lib/printUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Edit, Trash2, History, DollarSign, TrendingDown, Loader, X, Search, Printer } from 'lucide-react';

interface Project {
  id: string;
  project_id: string;
  name: string;
  address: string;
  description: string;
  chef_id: string;
  chef_de_projet_email?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  total_amount: number;
  created_at: string;
  updated_at: string;
}

interface ProjectExpense {
  id: string;
  project_box_id: string;
  description: string;
  amount: number;
  expense_date: string;
  created_at: string;
}

interface ProjectVersement {
  id: string;
  project_box_id: string;
  amount: number;
  date: string;
  description: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  'pending': { label: 'En attente', className: 'bg-yellow-100 text-yellow-700' },
  'active': { label: 'Actif', className: 'bg-green-100 text-green-700' },
  'completed': { label: 'Terminé', className: 'bg-blue-100 text-blue-700' },
  'cancelled': { label: 'Annulé', className: 'bg-red-100 text-red-700' }
};

export default function ProjectsManagementPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { enterpriseSettings } = useData();
  const isRtl = i18n.language === 'ar';

  // State management
  const [projects, setProjects] = useState<Project[]>([]);
  const [chefs, setChefs] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<'name' | 'chef'>('name');
  const [filterMonth, setFilterMonth] = useState('');

  // Dialog states
  const [showForm, setShowForm] = useState(false);
  const [viewProject, setViewProject] = useState<Project | null>(null);
  const [historyProject, setHistoryProject] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingMoney, setAddingMoney] = useState<Project | null>(null);
  const [pendingPrintPayment, setPendingPrintPayment] = useState<{ payment: any; project: Project; type: 'versement' | 'expense' } | null>(null);

  // History data
  const [projectExpenses, setProjectExpenses] = useState<ProjectExpense[]>([]);
  const [projectVersements, setProjectVersements] = useState<ProjectVersement[]>([]);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    address: string;
    description: string;
    chef_id: string;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    total_amount: number;
  }>({
    name: '',
    address: '',
    description: '',
    chef_id: '',
    status: 'pending',
    total_amount: 0
  });

  const [moneyForm, setMoneyForm] = useState({
    amount: 0,
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'versement' as 'versement' | 'expense'
  });

  // Fetch projects from database
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_boxes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setMessage(isRtl ? 'خطأ في تحميل المشاريع' : 'Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  };

  // Fetch chefs from database - only users with chef_projet role
  const fetchChefs = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'chef_projet')
        .order('full_name');

      if (error) throw error;
      setChefs(data || []);
    } catch (error) {
      console.error('Error fetching chefs:', error);
    }
  };

  // Fetch all project history (versements and expenses)
  const fetchAllProjectHistory = async () => {
    try {
      const [expensesRes, versementsRes] = await Promise.all([
        supabase
          .from('project_expenses')
          .select('*')
          .order('expense_date', { ascending: false }),
        supabase
          .from('project_versements')
          .select('*')
          .order('date', { ascending: false })
      ]);

      if (expensesRes.error) throw expensesRes.error;
      if (versementsRes.error) throw versementsRes.error;

      setProjectExpenses(expensesRes.data || []);
      setProjectVersements(versementsRes.data || []);
    } catch (error) {
      console.error('Error fetching all history:', error);
    }
  };

  // Fetch project history for specific project (used in dialog)
  const fetchProjectHistory = async (projectId: string) => {
    try {
      const [expensesRes, versementsRes] = await Promise.all([
        supabase
          .from('project_expenses')
          .select('*')
          .eq('project_box_id', projectId)
          .order('expense_date', { ascending: false }),
        supabase
          .from('project_versements')
          .select('*')
          .eq('project_box_id', projectId)
          .order('date', { ascending: false })
      ]);

      if (expensesRes.error) throw expensesRes.error;
      if (versementsRes.error) throw versementsRes.error;

      setProjectExpenses(expensesRes.data || []);
      setProjectVersements(versementsRes.data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchChefs();
    fetchAllProjectHistory();
  }, []);

  // Handle save project
  const handleSaveProject = async () => {
    if (!form.name || !form.chef_id) {
      setMessage(isRtl ? 'يرجى ملء جميع الحقول المطلوبة' : 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const chef = chefs.find(c => c.id === form.chef_id);
      
      if (editingId) {
        const { error } = await supabase
          .from('project_boxes')
          .update({
            name: form.name,
            address: form.address,
            description: form.description,
            chef_id: form.chef_id,
            chef_de_projet_email: chef?.email,
            status: form.status,
            total_amount: form.total_amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
        setMessage(isRtl ? 'تم تحديث المشروع' : 'Projet modifié avec succès');
      } else {
        const { error } = await supabase
          .from('project_boxes')
          .insert({
            project_id: `PROJ${Date.now()}`,
            name: form.name,
            address: form.address,
            description: form.description,
            chef_id: form.chef_id,
            chef_de_projet_email: chef?.email,
            status: form.status,
            total_amount: form.total_amount,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
        setMessage(isRtl ? 'تم إنشاء المشروع' : 'Projet créé avec succès');
      }

      resetForm();
      setShowForm(false);
      await fetchProjects();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving project:', error);
      setMessage(isRtl ? 'خطأ في الحفظ' : 'Erreur lors de la sauvegarde');
    }
  };

  // Handle add money
  const handleAddMoney = async () => {
    if (!addingMoney || !moneyForm.amount || !moneyForm.description) {
      setMessage(isRtl ? 'يرجى ملء جميع الحقول' : 'Veuillez remplir tous les champs');
      return;
    }

    try {
      if (moneyForm.type === 'versement') {
        const { error } = await supabase
          .from('project_versements')
          .insert({
            project_box_id: addingMoney.id,
            amount: moneyForm.amount,
            date: moneyForm.transaction_date,
            description: moneyForm.description,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_expenses')
          .insert({
            project_box_id: addingMoney.id,
            description: moneyForm.description,
            amount: moneyForm.amount,
            expense_date: moneyForm.transaction_date,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      resetMoneyForm();
      setAddingMoney(null);
      setMessage(isRtl ? 'تمت إضافة المعاملة' : 'Transaction ajoutée');
      await fetchProjects();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error adding money:', error);
      setMessage(isRtl ? 'خطأ في الإضافة' : 'Erreur lors de l\'ajout');
    }
  };

  // Handle delete project
  const handleDeleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_boxes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage(isRtl ? 'تم حذف المشروع' : 'Projet supprimé');
      setDeletingId(null);
      await fetchProjects();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting:', error);
      setMessage(isRtl ? 'خطأ في الحذف' : 'Erreur lors de la suppression');
    }
  };

  // Calculations
  const getTotalExpenses = (projectId: string) => {
    return projectExpenses
      .filter(e => e.project_box_id === projectId)
      .reduce((sum, e) => sum + (typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount), 0);
  };

  const getTotalVersements = (projectId: string) => {
    return projectVersements
      .filter(v => v.project_box_id === projectId)
      .reduce((sum, v) => sum + (typeof v.amount === 'string' ? parseFloat(v.amount) : v.amount), 0);
  };

  const openEdit = (project: Project) => {
    setForm({
      name: project.name,
      address: project.address,
      description: project.description,
      chef_id: project.chef_id,
      status: project.status,
      total_amount: project.total_amount
    });
    setEditingId(project.id);
    setShowForm(true);
  };

  const openHistory = async (project: Project) => {
    setHistoryProject(project);
    await fetchProjectHistory(project.id);
  };

  const resetForm = () => {
    setForm({
      name: '',
      address: '',
      description: '',
      chef_id: '',
      status: 'pending',
      total_amount: 0
    });
    setEditingId(null);
  };

  const resetMoneyForm = () => {
    setMoneyForm({
      amount: 0,
      description: '',
      transaction_date: new Date().toISOString().split('T')[0],
      type: 'versement'
    });
  };

  // Handle print payment/expense
  const handlePrintPayment = (payment: any, project: Project, type: 'versement' | 'expense', lang: 'ar' | 'fr') => {
    const L = getPrintLabels(lang);
    const date = type === 'versement' ? payment.date : payment.expense_date;
    const amount = payment.amount || 0;
    const description = payment.description;
    const typeLabel = type === 'versement' ? (L.isAr ? 'مدفوعات' : 'Versement') : (L.isAr ? 'نفقات' : 'Dépense');
    const body = `
      <div class="details-grid-2">
        <div class="detail-item"><h3>${L.isAr ? 'المشروع' : 'Projet'}</h3><p>${project.name}</p></div>
        <div class="detail-item"><h3>${L.date}</h3><p>${formatDateLocale(date, lang)}</p></div>
        <div class="detail-item"><h3>${L.description}</h3><p>${description}</p></div>
        <div class="detail-item"><h3>${L.isAr ? 'النوع' : 'Type'}</h3><p>${typeLabel}</p></div>
        <div class="detail-item"><h3>${L.amount}</h3><p>${amount.toLocaleString()} DA</p></div>
      </div>`;
    openPrintWindow(buildPrintHTML({ lang, docTitle: { ar: type === 'versement' ? 'وثيقة تحويل مالي' : 'وثيقة نفقة', fr: type === 'versement' ? 'Document Versement' : 'Document Dépense' }, enterpriseSettings }, body));
  };

  // Filter projects
  const filteredProjects = projects.filter(p => {
    // Apply search filter
    let matchesSearch = true;
    if (searchField === 'name') {
      matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    } else {
      matchesSearch = (p.chef_de_projet_email || '').toLowerCase().includes(searchQuery.toLowerCase());
    }

    // Apply month filter
    let matchesMonth = true;
    if (filterMonth) {
      const projectMonth = p.created_at.substring(0, 7); // Extract YYYY-MM from created_at
      matchesMonth = projectMonth === filterMonth;
    }

    return matchesSearch && matchesMonth;
  });

  return (
    <div className={`min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-6 ${isRtl ? 'rtl' : 'ltr'}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">{t('nav.projects_management')}</h1>
          </div>
          <p className="text-gray-600">{isRtl ? 'إدارة المشاريع والمالية' : 'Gérer les projets et leurs finances'}</p>
        </div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="mb-6 flex gap-4 flex-col md:flex-row items-end">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              placeholder={isRtl ? 'ابحث بالاسم أو البريد...' : 'Rechercher par nom ou email...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as 'name' | 'chef')}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="name">{isRtl ? 'اسم المشروع' : 'Nom du projet'}</option>
            <option value="chef">{isRtl ? 'البريد الإلكتروني' : 'Email du chef'}</option>
          </select>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
            title={isRtl ? 'تصفية حسب الشهر' : 'Filtrer par mois'}
          />
          {filterMonth && (
            <Button
              onClick={() => setFilterMonth('')}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isRtl ? 'مسح' : 'Effacer'}
            </Button>
          )}
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {isRtl ? 'مشروع جديد' : 'Nouveau Projet'}
          </Button>
        </div>

        {/* Projects Grid */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{isRtl ? 'لا توجد مشاريع' : 'Aucun projet trouvé'}</p>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
            >
              {filteredProjects.map((project, index) => {
                const totalIn = getTotalVersements(project.id);
                const totalOut = getTotalExpenses(project.id);
                const balance = totalIn - totalOut;

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                      <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-t-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">{project.name}</h3>
                            <p className="text-sm opacity-90">{project.address}</p>
                          </div>
                          <Badge className={STATUS_BADGES[project.status].className}>
                            {STATUS_BADGES[project.status].label}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4">
                        <p className="text-gray-600 text-sm mb-3">{project.description}</p>

                        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                          <div className="bg-red-50 p-2 rounded">
                            <p className="text-xs text-gray-600">{isRtl ? 'المصاريف' : 'Dépenses'}</p>
                            <p className="text-sm font-bold text-red-700">{totalOut.toLocaleString()}</p>
                          </div>
                          <div className="bg-yellow-50 p-2 rounded">
                            <p className="text-xs text-gray-600">{isRtl ? 'التكاليف' : 'Coûts total'}</p>
                            <p className="text-sm font-bold text-yellow-700">{(totalOut).toLocaleString()}</p>
                          </div>
                          <div className="bg-green-50 p-2 rounded">
                            <p className="text-xs text-gray-600">{isRtl ? 'إجمالي المدفوعات' : 'Total Versement'}</p>
                            <p className="text-sm font-bold text-green-700">{totalIn.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <Button
                            onClick={() => openHistory(project)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                          >
                            <History className="w-3 h-3 mr-1" />
                            {isRtl ? 'السجل' : 'Historique'}
                          </Button>
                          <Button
                            onClick={() => {
                              setAddingMoney(project);
                              resetMoneyForm();
                            }}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
                          >
                            <DollarSign className="w-3 h-3 mr-1" />
                            {isRtl ? 'إضافة' : 'Ajouter'}
                          </Button>
                          <Button
                            onClick={() => openEdit(project)}
                            variant="outline"
                            className="flex-1 text-xs"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => setDeletingId(project.id)}
                            variant="outline"
                            className="flex-1 text-red-600 hover:bg-red-50 text-xs"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[95%] sm:w-full max-w-2xl mx-auto my-auto max-h-[90vh] overflow-y-auto p-0 gap-0">
          {/* Dialog Header with Gradient */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 px-6 py-5 border-b border-blue-100 dark:border-slate-600 sticky top-0 z-10">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {editingId ? (isRtl ? 'تعديل المشروع' : 'Modifier le projet') : (isRtl ? 'مشروع جديد' : 'Nouveau projet')}
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                {editingId ? (isRtl ? 'تحديث بيانات المشروع' : 'Mettre à jour les détails du projet') : (isRtl ? 'أنشئ مشروع جديد في النظام' : 'Créer un nouveau projet dans le système')}
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

              {/* Name Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {isRtl ? 'الاسم' : 'Nom'} <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={isRtl ? 'اسم المشروع' : 'Nom du projet'}
                  className="px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Chef de Projet Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {isRtl ? 'رئيس المشروع' : 'Chef de Projet'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.chef_id}
                  onChange={(e) => setForm({ ...form, chef_id: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">{isRtl ? '-- اختر رئيس --' : '-- Sélectionner --'}</option>
                  {chefs.map(chef => (
                    <option key={chef.id} value={chef.id}>
                      {chef.full_name || chef.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {isRtl ? 'الحالة' : 'Statut'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="pending">{isRtl ? 'قيد الانتظار' : 'En attente'}</option>
                  <option value="active">{isRtl ? 'نشط' : 'Actif'}</option>
                  <option value="completed">{isRtl ? 'مكتمل' : 'Terminé'}</option>
                  <option value="cancelled">{isRtl ? 'ملغي' : 'Annulé'}</option>
                </select>
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

              {/* Address Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {isRtl ? 'العنوان' : 'Adresse'}
                </label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder={isRtl ? 'العنوان' : 'Adresse'}
                  className="px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {isRtl ? 'الوصف' : 'Description'}
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={isRtl ? 'الوصف' : 'Description'}
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
              onClick={handleSaveProject} 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              {editingId ? (isRtl ? 'تحديث' : 'Modifier') : (isRtl ? 'إنشاء' : 'Créer')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      {historyProject && (
        <Dialog open={!!historyProject} onOpenChange={() => setHistoryProject(null)}>
          <DialogContent className="w-[95%] sm:w-full max-w-4xl mx-auto my-auto max-h-[90vh] overflow-y-auto p-0 gap-0">
            {/* Dialog Header with Gradient */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 px-6 py-5 border-b border-blue-100 dark:border-slate-600 sticky top-0 z-10">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                  {historyProject.name} - {isRtl ? 'السجل المالي' : 'Historique Financier'}
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400">
                  {isRtl ? 'جميع المدفوعات والمصاريف للمشروع' : 'Tous les versements et dépenses du projet'}
                </DialogDescription>
              </div>
            </div>

            {/* Gradient Accent Bar */}
            <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

            {/* Content */}
            <div className="px-4 sm:px-6 py-6 space-y-6">
              {/* Versements Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b-2 border-emerald-600">
                  <div className="h-1 w-6 bg-gradient-to-r from-emerald-600 to-green-600 rounded" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                    {isRtl ? 'المدفوعات' : 'Versements'}
                  </h3>
                </div>
                {projectVersements.filter(v => v.project_box_id === historyProject.id).length === 0 ? (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">{isRtl ? 'لا توجد مدفوعات' : 'Aucun versement'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectVersements
                      .filter(v => v.project_box_id === historyProject.id)
                      .map(v => (
                        <div key={v.id} className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:shadow-md transition-all">
                          <div className="flex justify-between items-start gap-4 flex-col sm:flex-row">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{v.description}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                {new Date(v.date).toLocaleDateString(isRtl ? 'ar-SA' : 'fr-FR')}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 flex-col sm:flex-row">
                              <span className="font-bold text-emerald-700 dark:text-emerald-300 text-lg">{v.amount.toLocaleString()} DA</span>
                              <button
                                onClick={() => setPendingPrintPayment({ payment: v, project: historyProject, type: 'versement' })}
                                className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all text-sm flex items-center gap-1"
                              >
                                <span>🖨️</span> {isRtl ? 'طباعة' : 'Imprimer'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Dépenses Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b-2 border-red-600">
                  <div className="h-1 w-6 bg-gradient-to-r from-red-600 to-rose-600 rounded" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                    {isRtl ? 'النفقات' : 'Dépenses'}
                  </h3>
                </div>
                {projectExpenses.filter(e => e.project_box_id === historyProject.id).length === 0 ? (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-300">{isRtl ? 'لا توجد نفقات' : 'Aucune dépense'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectExpenses
                      .filter(e => e.project_box_id === historyProject.id)
                      .map(e => (
                        <div key={e.id} className="p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg border border-red-200 dark:border-red-800 hover:shadow-md transition-all">
                          <div className="flex justify-between items-start gap-4 flex-col sm:flex-row">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{e.description}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                {new Date(e.expense_date).toLocaleDateString(isRtl ? 'ar-SA' : 'fr-FR')}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 flex-col sm:flex-row">
                              <span className="font-bold text-red-700 dark:text-red-300 text-lg">{(e.amount || 0).toLocaleString()} DA</span>
                              <button
                                onClick={() => setPendingPrintPayment({ payment: e, project: historyProject, type: 'expense' })}
                                className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all text-sm flex items-center gap-1"
                              >
                                <span>🖨️</span> {isRtl ? 'طباعة' : 'Imprimer'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="px-4 sm:px-6 py-4 bg-slate-50 dark:bg-slate-700/20 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 z-10 flex justify-end">
              <Button 
                onClick={() => setHistoryProject(null)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {isRtl ? 'إغلاق' : 'Fermer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Money Dialog */}
      {addingMoney && (
        <Dialog open={!!addingMoney} onOpenChange={() => setAddingMoney(null)}>
          <DialogContent className="max-w-2xl">
            {/* Dialog Header with Gradient */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 -mx-6 -mt-6 px-6 py-5 border-b border-blue-100 dark:border-slate-600 rounded-t-lg">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                  {isRtl ? 'إضافة معاملة مالية' : 'Ajouter une transaction'}
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400">
                  {isRtl ? 'سجل مدفوعة جديدة أو مصروف' : 'Enregistrer un nouveau versement ou dépense'}
                </DialogDescription>
              </div>
            </div>

            {/* Gradient Accent Bar */}
            <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

            {/* Form Content */}
            <div className="px-6 py-6 space-y-6 max-h-96 overflow-y-auto">
              {/* Required Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b-2 border-b-gradient-to-r border-gradient-to-r from-blue-600 to-indigo-600">
                  <div className="h-1 w-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded" />
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {isRtl ? 'المعلومات المطلوبة' : 'Informations Requises'}
                  </h3>
                </div>

                {/* Type Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {isRtl ? 'النوع' : 'Type'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={moneyForm.type}
                    onChange={(e) => setMoneyForm({ ...moneyForm, type: e.target.value as any })}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="versement">{isRtl ? 'مدفوعات' : 'Versement'}</option>
                    <option value="expense">{isRtl ? 'نفقات' : 'Dépense'}</option>
                  </select>
                </div>

                {/* Amount Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {isRtl ? 'المبلغ' : 'Montant'} <span className="text-red-500">*</span> (DA)
                  </label>
                  <Input
                    type="number"
                    value={moneyForm.amount}
                    onChange={(e) => setMoneyForm({ ...moneyForm, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    step="0.01"
                    className="px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Date Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {isRtl ? 'التاريخ' : 'Date'} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={moneyForm.transaction_date}
                    onChange={(e) => setMoneyForm({ ...moneyForm, transaction_date: e.target.value })}
                    className="px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Optional Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b-2 border-b-gradient-to-r">
                  <div className="h-1 w-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded" />
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {isRtl ? 'المعلومات الإضافية' : 'Informations Supplémentaires'}
                  </h3>
                </div>

                {/* Description Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {isRtl ? 'الوصف' : 'Description'}
                  </label>
                  <Input
                    value={moneyForm.description}
                    onChange={(e) => setMoneyForm({ ...moneyForm, description: e.target.value })}
                    placeholder={isRtl ? 'الوصف' : 'Description'}
                    className="px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/20 border-t border-slate-200 dark:border-slate-700 rounded-b-lg flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setAddingMoney(null)}
                className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold"
              >
                {isRtl ? 'إلغاء' : 'Annuler'}
              </Button>
              <Button 
                onClick={handleAddMoney} 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
              >
                {isRtl ? 'إضافة' : 'Ajouter'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRtl ? 'حذف المشروع' : 'Supprimer le projet'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRtl ? 'هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.' : 'Êtes-vous sûr? Cette action est irréversible.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {isRtl ? 'إلغاء' : 'Annuler'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDeleteProject(deletingId)}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRtl ? 'حذف' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Language Chooser Dialog */}
      <Dialog open={!!pendingPrintPayment} onOpenChange={() => setPendingPrintPayment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-xl font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" /> {isRtl ? '\u0627\u062e\u062a\u0631 \u0644\u063a\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629' : 'Choisir la langue d\'impression'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 px-2 pb-2">
            <Button onClick={() => { if (pendingPrintPayment) handlePrintPayment(pendingPrintPayment.payment, pendingPrintPayment.project, pendingPrintPayment.type, 'ar'); setPendingPrintPayment(null); }} className="h-24 flex flex-col gap-2 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-lg rounded-xl shadow-lg">
              <span className="text-2xl">{'\ud83c\udde9\ud83c\uddff'}</span> {isRtl ? '\u0637\u0628\u0627\u0639\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629' : 'Imprimer en Arabe'}
            </Button>
            <Button onClick={() => { if (pendingPrintPayment) handlePrintPayment(pendingPrintPayment.payment, pendingPrintPayment.project, pendingPrintPayment.type, 'fr'); setPendingPrintPayment(null); }} className="h-24 flex flex-col gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-xl shadow-lg">
              <span className="text-2xl">{'\ud83c\uddeb\ud83c\uddf7'}</span> {isRtl ? '\u0637\u0628\u0627\u0639\u0629 \u0628\u0627\u0644\u0641\u0631\u0646\u0633\u064a\u0629' : 'Imprimer en Fran\u00e7ais'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
