import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Edit, Trash2, Eye, Search, History, DollarSign, TrendingDown, Loader, X } from 'lucide-react';

interface Project {
  id: string;
  project_id: string;
  name: string;
  address: string;
  description: string;
  chef_de_projet_id: string;
  chef_de_projet_email: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  total_budget: number;
  created_at: string;
  updated_at: string;
}

interface ProjectExpense {
  id: string;
  project_id: string;
  description: string;
  amount: number;
  expense_date: string;
  category: string;
  created_at: string;
}

interface ProjectVersement {
  id: string;
  project_id: string;
  amount: number;
  versement_date: string;
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
  const isRtl = i18n.language === 'ar';

  // State management
  const [projects, setProjects] = useState<Project[]>([]);
  const [chefs, setChefs] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<'name' | 'chef'>('name');

  // Dialog states
  const [showForm, setShowForm] = useState(false);
  const [viewProject, setViewProject] = useState<Project | null>(null);
  const [historyProject, setHistoryProject] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingMoney, setAddingMoney] = useState<Project | null>(null);

  // History data
  const [projectExpenses, setProjectExpenses] = useState<ProjectExpense[]>([]);
  const [projectVersements, setProjectVersements] = useState<ProjectVersement[]>([]);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    address: string;
    description: string;
    chef_de_projet_id: string;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    total_budget: number;
  }>({
    name: '',
    address: '',
    description: '',
    chef_de_projet_id: '',
    status: 'pending',
    total_budget: 0
  });
  const [moneyForm, setMoneyForm] = useState({
    amount: 0,
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'versement' as 'versement' | 'expense'
  });

  // Fetch data on mount
  useEffect(() => {
    fetchProjects();
    fetchChefs();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchChefs = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'chef_projet')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setChefs(data || []);
    } catch (err: any) {
      console.error('Error fetching chefs:', err);
    }
  };

  const fetchProjectHistory = async (projectId: string) => {
    try {
      const [expensesRes, versementsRes] = await Promise.all([
        supabase
          .from('project_expenses')
          .select('*')
          .eq('project_id', projectId)
          .order('expense_date', { ascending: false }),
        supabase
          .from('project_versements')
          .select('*')
          .eq('project_id', projectId)
          .order('versement_date', { ascending: false })
      ]);

      if (expensesRes.error) throw expensesRes.error;
      if (versementsRes.error) throw versementsRes.error;

      setProjectExpenses(expensesRes.data || []);
      setProjectVersements(versementsRes.data || []);
    } catch (err: any) {
      setMessage(`Error loading history: ${err.message}`);
    }
  };

  const handleSaveProject = async () => {
    try {
      if (!form.name || !form.chef_de_projet_id) {
        setMessage('Please fill in all required fields');
        return;
      }

      const projectId = `PROJ${Date.now()}`;

      if (editingId) {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update({
            ...form,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
        setMessage('Project updated successfully!');
      } else {
        // Create new project
        const chef = chefs.find(c => c.id === form.chef_de_projet_id);
        const { error } = await supabase
          .from('projects')
          .insert([{
            ...form,
            project_id: projectId,
            chef_de_projet_email: chef?.email || '',
            created_by_id: user?.id
          }]);

        if (error) throw error;
        setMessage('Project created successfully!');
      }

      setTimeout(() => setMessage(''), 3000);
      setShowForm(false);
      resetForm();
      fetchProjects();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleAddMoney = async () => {
    try {
      if (!addingMoney || !moneyForm.amount || !moneyForm.description) {
        setMessage('Please fill in all fields');
        return;
      }

      if (moneyForm.type === 'versement') {
        const { error } = await supabase
          .from('project_versements')
          .insert([{
            project_id: addingMoney.id,
            amount: moneyForm.amount,
            versement_date: moneyForm.transaction_date,
            description: moneyForm.description,
            created_by_id: user?.id
          }]);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_expenses')
          .insert([{
            project_id: addingMoney.id,
            amount: moneyForm.amount,
            expense_date: moneyForm.transaction_date,
            description: moneyForm.description,
            category: 'autre',
            created_by_id: user?.id
          }]);

        if (error) throw error;
      }

      setMessage(`${moneyForm.type === 'versement' ? 'Versement' : 'Expense'} added successfully!`);
      setTimeout(() => setMessage(''), 3000);
      setAddingMoney(null);
      resetMoneyForm();
      fetchProjectHistory(addingMoney.id);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingId) return;
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', deletingId);

      if (error) throw error;
      setMessage('Project deleted successfully!');
      setTimeout(() => setMessage(''), 3000);
      setDeletingId(null);
      fetchProjects();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const openEdit = (project: Project) => {
    setForm({
      name: project.name,
      address: project.address,
      description: project.description,
      chef_de_projet_id: project.chef_de_projet_id,
      status: project.status,
      total_budget: project.total_budget
    });
    setEditingId(project.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      name: '',
      address: '',
      description: '',
      chef_de_projet_id: '',
      status: 'pending',
      total_budget: 0
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

  const filteredProjects = projects.filter(p => {
    if (!searchQuery) return true;
    if (searchField === 'name') {
      return p.name.toLowerCase().includes(searchQuery.toLowerCase());
    } else {
      return p.chef_de_projet_email.toLowerCase().includes(searchQuery.toLowerCase());
    }
  });

  const getTotalExpenses = (projectId: string) => {
    return projectExpenses
      .filter(e => e.project_id === projectId)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const getTotalVersements = (projectId: string) => {
    return projectVersements
      .filter(v => v.project_id === projectId)
      .reduce((sum, v) => sum + v.amount, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRtl ? 'rtl' : 'ltr'}`}>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
        >
          {message}
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-foreground">{t('nav.projects_management')}</h1>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="btn-gradient gap-2">
          <Plus className="w-4 h-4" /> {t('common.create')}
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-xs">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={searchField === 'name' ? 'Search by project name...' : 'Search by chef email...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as 'name' | 'chef')}
          className="px-3 py-2 rounded-lg border border-input bg-background"
        >
          <option value="name">Project Name</option>
          <option value="chef">Chef de Projet</option>
        </select>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? 'No projects found matching your search' : 'No projects yet'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project, idx) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="erp-card hover:shadow-lg transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">{project.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">{project.project_id}</p>
                      </div>
                    </div>
                    <Badge className={STATUS_BADGES[project.status].className}>
                      {STATUS_BADGES[project.status].label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Location</p>
                      <p className="font-medium line-clamp-1">{project.address || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Budget</p>
                      <p className="font-semibold text-green-600">{project.total_budget.toLocaleString()} DA</p>
                    </div>
                  </div>

                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setViewProject(project);
                        fetchProjectHistory(project.id);
                      }}
                      className="gap-1 flex-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> {t('common.view')}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        setHistoryProject(project);
                        fetchProjectHistory(project.id);
                      }}
                    >
                      <History className="w-3.5 h-3.5" /> History
                    </Button>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      className="gap-1 flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        setAddingMoney(project);
                        resetMoneyForm();
                      }}
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Add Money
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(project)}
                      className="gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" /> {t('common.edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeletingId(project.id)}
                      className="gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {t('common.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Project Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Project' : 'Create New Project'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">{t('common.name')} *</label>
              <Input
                placeholder="Project name"
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Chef de Projet *</label>
              <select
                value={form.chef_de_projet_id}
                onChange={(e) => setForm({...form, chef_de_projet_id: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                <option value="">Select Chef de Projet</option>
                {chefs.map(chef => (
                  <option key={chef.id} value={chef.id}>
                    {chef.full_name || chef.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Address</label>
              <Input
                placeholder="Project address"
                value={form.address}
                onChange={(e) => setForm({...form, address: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Description</label>
              <Input
                placeholder="Project description"
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-2 block">Budget</label>
                <Input
                  type="number"
                  placeholder="Total budget"
                  value={form.total_budget}
                  onChange={(e) => setForm({...form, total_budget: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({...form, status: e.target.value as any})}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveProject} className="btn-gradient">
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Project Details Dialog */}
      <Dialog open={!!viewProject} onOpenChange={() => setViewProject(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewProject?.name}</DialogTitle>
          </DialogHeader>

          {viewProject && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Project ID</p>
                  <p className="font-semibold">{viewProject.project_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={STATUS_BADGES[viewProject.status].className}>
                    {STATUS_BADGES[viewProject.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chef de Projet</p>
                  <p className="font-semibold">{viewProject.chef_de_projet_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="font-semibold text-green-600">{viewProject.total_budget.toLocaleString()} DA</p>
                </div>
              </div>

              {viewProject.address && (
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p>{viewProject.address}</p>
                </div>
              )}

              {viewProject.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p>{viewProject.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Versements</p>
                  <p className="text-2xl font-bold text-green-600">{getTotalVersements(viewProject.id).toLocaleString()} DA</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">{getTotalExpenses(viewProject.id).toLocaleString()} DA</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyProject} onOpenChange={() => setHistoryProject(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>History - {historyProject?.name}</DialogTitle>
          </DialogHeader>

          {historyProject && (
            <div className="space-y-6">
              {/* Versements */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" /> Versements
                </h3>
                {projectVersements.filter(v => v.project_id === historyProject.id).length === 0 ? (
                  <p className="text-muted-foreground">No versements recorded</p>
                ) : (
                  <div className="space-y-2">
                    {projectVersements.filter(v => v.project_id === historyProject.id).map(v => (
                      <Card key={v.id} className="p-3 bg-green-50 border-green-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-green-700">{v.description}</p>
                            <p className="text-sm text-muted-foreground">{new Date(v.versement_date).toLocaleDateString()}</p>
                          </div>
                          <p className="text-lg font-bold text-green-600">+{v.amount.toLocaleString()} DA</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Expenses */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" /> Expenses
                </h3>
                {projectExpenses.filter(e => e.project_id === historyProject.id).length === 0 ? (
                  <p className="text-muted-foreground">No expenses recorded</p>
                ) : (
                  <div className="space-y-2">
                    {projectExpenses.filter(e => e.project_id === historyProject.id).map(e => (
                      <Card key={e.id} className="p-3 bg-red-50 border-red-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-red-700">{e.description}</p>
                            <p className="text-sm text-muted-foreground">{new Date(e.expense_date).toLocaleDateString()}</p>
                          </div>
                          <p className="text-lg font-bold text-red-600">-{e.amount.toLocaleString()} DA</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total In</p>
                  <p className="text-2xl font-bold text-green-600">+{getTotalVersements(historyProject.id).toLocaleString()} DA</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Out</p>
                  <p className="text-2xl font-bold text-red-600">-{getTotalExpenses(historyProject.id).toLocaleString()} DA</p>
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className={`text-2xl font-bold ${getTotalVersements(historyProject.id) - getTotalExpenses(historyProject.id) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(getTotalVersements(historyProject.id) - getTotalExpenses(historyProject.id)).toLocaleString()} DA
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Money Dialog */}
      <Dialog open={!!addingMoney} onOpenChange={() => setAddingMoney(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Transaction - {addingMoney?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">Transaction Type</label>
              <select
                value={moneyForm.type}
                onChange={(e) => setMoneyForm({...moneyForm, type: e.target.value as any})}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                <option value="versement">Versement (In)</option>
                <option value="expense">Expense (Out)</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Amount</label>
              <Input
                type="number"
                placeholder="Amount"
                value={moneyForm.amount}
                onChange={(e) => setMoneyForm({...moneyForm, amount: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Description</label>
              <Input
                placeholder="Transaction description"
                value={moneyForm.description}
                onChange={(e) => setMoneyForm({...moneyForm, description: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Date</label>
              <Input
                type="date"
                value={moneyForm.transaction_date}
                onChange={(e) => setMoneyForm({...moneyForm, transaction_date: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingMoney(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddMoney} className="btn-gradient">
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')} Project</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete the project and all its associated data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
