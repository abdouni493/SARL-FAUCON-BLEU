import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/supabase';
import { getPrintLabels, buildPrintHTML, openPrintWindow, formatDateLocale } from '@/lib/printUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Plus, Edit2, Trash2, X, AlertCircle, CheckCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface WorkerExpense {
  id: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  notes: string;
  created_at: string;
  project_id?: string;
  project_name?: string;
}

interface Project {
  id: string;
  name: string;
}

const CATEGORIES = ['Salaire', 'Prime', 'Transport', 'Allocations', 'Bonus', 'Autres'];

export default function WorkersExpensesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { enterpriseSettings } = useData();
  const isRtl = i18n.language === 'ar';
  const [expenses, setExpenses] = useState<WorkerExpense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pendingPrintExpense, setPendingPrintExpense] = useState<WorkerExpense | null>(null);
  const [form, setForm] = useState({
    description: '',
    category: 'Salaire',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
    project_id: ''
  });

  // Fetch projects from database
  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('project_boxes')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
    }
  };

  // Fetch expenses from database
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('worker_expenses')
        .select(`
          *,
          project_boxes(name)
        `)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      
      const enrichedExpenses = (data || []).map((exp: any) => ({
        ...exp,
        project_name: exp.project_boxes?.name || null
      }));
      
      setExpenses(enrichedExpenses);
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      setMessage(err.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchProjects();
  }, []);

  const handleSave = async () => {
    if (!form.description || !form.amount) {
      setMessage('Please fill in all required fields');
      return;
    }

    try {
      const data = {
        user_id: user?.id,
        description: form.description,
        category: form.category,
        amount: parseFloat(form.amount),
        expense_date: form.expense_date,
        notes: form.notes,
        project_id: form.project_id || null
      };

      if (editId) {
        const { error } = await supabase
          .from('worker_expenses')
          .update(data)
          .eq('id', editId);

        if (error) throw error;
        setMessage('Expense updated successfully');
      } else {
        const { error } = await supabase
          .from('worker_expenses')
          .insert([data]);

        if (error) throw error;
        setMessage('Expense created successfully');
      }

      await fetchExpenses();
      setShowForm(false);
      setEditId(null);
      setForm({
        description: '',
        category: 'Salaire',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        notes: '',
        project_id: ''
      });

      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(err.message || 'Failed to save expense');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('worker_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage('Expense deleted successfully');
      await fetchExpenses();
      setConfirmDelete(null);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(err.message || 'Failed to delete expense');
    }
  };

  const openCreate = () => {
    setForm({
      description: '',
      category: 'Salaire',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      notes: '',
      project_id: ''
    });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (expense: WorkerExpense) => {
    setForm({
      description: expense.description,
      category: expense.category,
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      notes: expense.notes
    });
    setEditId(expense.id);
    setShowForm(true);
  };

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Handle print expense
  const handlePrintExpense = (expense: WorkerExpense, lang: 'ar' | 'fr') => {
    const L = getPrintLabels(lang);
    const body = `
      <div class="details-grid-2">
        <div class="detail-item"><h3>${L.description}</h3><p>${expense.description}</p></div>
        <div class="detail-item"><h3>${L.category}</h3><p>${expense.category}</p></div>
        <div class="detail-item"><h3>${L.date}</h3><p>${formatDateLocale(expense.expense_date, lang)}</p></div>
        <div class="detail-item"><h3>${L.amount}</h3><p>${expense.amount.toLocaleString()} DA</p></div>
        ${expense.project_name ? `<div class="detail-item"><h3>${L.project || 'Project'}</h3><p>${expense.project_name}</p></div>` : ''}
      </div>
      ${expense.notes ? `<div style="padding:15px;background:#f9fafb;border-radius:8px;margin-bottom:15px;"><strong>${L.notes}:</strong><br>${expense.notes}</div>` : ''}`;
    openPrintWindow(buildPrintHTML({ lang, docTitle: { ar: 'وثيقة نفقة عامل', fr: 'Document Dépense Travailleur' }, enterpriseSettings }, body));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('nav.workers_expenses')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('common.manage')} {expenses.length} {t('common.items')}</p>
        </div>
        <Button onClick={openCreate} className="btn-gradient gap-2">
          <Plus className="w-4 h-4" /> {t('common.create')}
        </Button>
      </div>

      {/* Message Alert */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`flex items-center gap-3 p-4 rounded-lg border ${
            message.includes('successfully')
              ? 'bg-green-100 text-green-700 border-green-300'
              : 'bg-red-100 text-red-700 border-red-300'
          }`}
        >
          {message.includes('successfully') ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message}
        </motion.div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <Card className="erp-card text-center py-12">
          <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-muted-foreground">{t('common.no_data')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expenses.map((expense, idx) => (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="erp-card hover:shadow-lg transition-all">
                <CardHeader className="pb-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-t-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{expense.description}</CardTitle>
                    </div>
                    <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs font-semibold">
                      {expense.category}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div>
                    <p className="text-3xl font-bold text-amber-600">{expense.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">DA</p>
                  </div>
                  <div className="border-t pt-2">
                    <p className="text-xs text-gray-600 mb-1">
                      <strong>Date:</strong> {new Date(expense.expense_date).toLocaleDateString('fr-FR')}
                    </p>
                    {expense.project_name && (
                      <p className="text-xs text-gray-600 mb-1">
                        <strong>{t('common.project') || 'Project'}:</strong> {expense.project_name}
                      </p>
                    )}
                    {expense.notes && (
                      <p className="text-xs text-gray-500 line-clamp-2">{expense.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => setPendingPrintExpense(expense)}
                      className="gap-1 flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                      <Printer className="w-3 h-3" /> {t('common.print')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(expense)}
                      className="gap-1 flex-1 text-blue-600"
                    >
                      <Edit2 className="w-3 h-3" /> {t('common.edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmDelete(expense.id)}
                      className="gap-1 flex-1 text-red-600"
                    >
                      <Trash2 className="w-3 h-3" /> {t('common.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Summary Card */}
      {expenses.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-amber-600">{totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">DA</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nombre</p>
                  <p className="text-2xl font-bold text-orange-600">{expenses.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Moyenne</p>
                  <p className="text-2xl font-bold text-amber-700">{Math.round(totalAmount / expenses.length).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">DA</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[95%] sm:w-full max-w-2xl mx-auto my-auto max-h-[90vh] overflow-y-auto p-0 gap-0">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 p-6">
            <div className="h-1 w-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full mb-4"></div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">
                {editId ? t('common.edit') || 'Edit' : t('common.create') || 'Create'} {t('nav.workers_expenses') || 'Worker Expense'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {editId 
                  ? t('common.update_information') || 'Update expense information'
                  : t('common.add_new_expense') || 'Add a new worker expense'}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Form Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-180px)] px-6 py-6 space-y-6">
            {/* Required Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-1 w-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded"></div>
                <h4 className="font-semibold text-foreground">{t('common.required_information') || 'Required Information'}</h4>
              </div>
              
              <div className="space-y-4 ml-2">
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">{t('common.description') || 'Description'} *</label>
                  <Input
                    placeholder="e.g., Salaire hebdomadaire"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    className="px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">{t('common.category') || 'Category'} *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-background focus:border-blue-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">{t('common.project') || 'Project'}</label>
                  <select
                    value={form.project_id}
                    onChange={e => setForm({ ...form, project_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-background focus:border-blue-500"
                  >
                    <option value="">{t('common.select_project') || 'Select a project'}</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">{t('common.amount') || 'Amount'} * (DA)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    step="0.01"
                    className="px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">{t('common.date') || 'Expense Date'} *</label>
                  <Input
                    type="date"
                    value={form.expense_date}
                    onChange={e => setForm({ ...form, expense_date: e.target.value })}
                    className="px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Optional Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-1 w-6 bg-gradient-to-r from-orange-500 to-amber-500 rounded"></div>
                <h4 className="font-semibold text-foreground">{t('common.optional_information') || 'Optional Information'}</h4>
              </div>
              
              <div className="ml-2">
                <label className="text-sm font-semibold text-foreground block mb-2">{t('common.notes') || 'Notes'}</label>
                <Input
                  placeholder="Additional notes..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 z-10 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button 
                onClick={handleSave} 
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg"
              >
                {t('common.save') || 'Save'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-card rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl"
            >
              <p className="text-foreground font-medium">{t('common.confirm_delete')}</p>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleDelete(confirmDelete)}
                  className="btn-gradient-danger flex-1"
                >
                  {t('common.confirm')}
                </Button>
                <Button variant="outline" onClick={() => setConfirmDelete(null)} className="flex-1">
                  {t('common.cancel')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print Language Chooser Dialog */}
      <Dialog open={!!pendingPrintExpense} onOpenChange={() => setPendingPrintExpense(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-xl font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" /> {t('common.choose_print_language')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 px-2 pb-2">
            <Button onClick={() => { if (pendingPrintExpense) handlePrintExpense(pendingPrintExpense, 'ar'); setPendingPrintExpense(null); }} className="h-24 flex flex-col gap-2 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-lg rounded-xl shadow-lg">
              <span className="text-2xl">🇩🇿</span> {t('common.print_in_arabic')}
            </Button>
            <Button onClick={() => { if (pendingPrintExpense) handlePrintExpense(pendingPrintExpense, 'fr'); setPendingPrintExpense(null); }} className="h-24 flex flex-col gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-xl shadow-lg">
              <span className="text-2xl">🇫🇷</span> {t('common.print_in_french')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
