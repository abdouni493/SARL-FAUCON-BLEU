import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Plus, Edit2, Trash2, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EnterpriseExpense {
  id: string;
  name: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  vendor_name: string;
  receipt_number: string;
  notes: string;
  created_at: string;
}

const CATEGORIES = [
  'Immobilier',
  'Utilitaires',
  'Fournitures',
  'IT',
  'Transport',
  'Communication',
  'Assurances',
  'Maintenance',
  'Autres'
];

export default function EnterpriseExpensesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<EnterpriseExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Immobilier',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    receipt_number: '',
    notes: ''
  });

  // Fetch expenses from database
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('enterprise_expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      setMessage(err.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSave = async () => {
    if (!form.name || !form.amount) {
      setMessage('Please fill in all required fields');
      return;
    }

    try {
      const data = {
        user_id: user?.id,
        name: form.name,
        description: form.description,
        category: form.category,
        amount: parseFloat(form.amount),
        expense_date: form.expense_date,
        vendor_name: form.vendor_name,
        receipt_number: form.receipt_number,
        notes: form.notes
      };

      if (editId) {
        const { error } = await supabase
          .from('enterprise_expenses')
          .update(data)
          .eq('id', editId);

        if (error) throw error;
        setMessage('Expense updated successfully');
      } else {
        const { error } = await supabase
          .from('enterprise_expenses')
          .insert([data]);

        if (error) throw error;
        setMessage('Expense created successfully');
      }

      await fetchExpenses();
      setShowForm(false);
      setEditId(null);
      setForm({
        name: '',
        description: '',
        category: 'Immobilier',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        vendor_name: '',
        receipt_number: '',
        notes: ''
      });

      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(err.message || 'Failed to save expense');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('enterprise_expenses')
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
      name: '',
      description: '',
      category: 'Immobilier',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      vendor_name: '',
      receipt_number: '',
      notes: ''
    });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (expense: EnterpriseExpense) => {
    setForm({
      name: expense.name,
      description: expense.description,
      category: expense.category,
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      vendor_name: expense.vendor_name,
      receipt_number: expense.receipt_number,
      notes: expense.notes
    });
    setEditId(expense.id);
    setShowForm(true);
  };

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('nav.enterprise_expenses')}</h1>
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
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{expense.name}</CardTitle>
                      <p className="text-xs opacity-90 mt-1">{expense.vendor_name}</p>
                    </div>
                    <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs font-semibold">
                      {expense.category}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div>
                    <p className="text-3xl font-bold text-blue-600">{expense.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">DA</p>
                  </div>
                  <div className="border-t pt-2">
                    <p className="text-xs text-gray-600 mb-1">
                      <strong>Date:</strong> {new Date(expense.expense_date).toLocaleDateString('fr-FR')}
                    </p>
                    {expense.receipt_number && (
                      <p className="text-xs text-gray-600 mb-1">
                        <strong>Receipt:</strong> {expense.receipt_number}
                      </p>
                    )}
                    {expense.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">{expense.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
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

      {/* Summary Section */}
      {expenses.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 space-y-4">
          {/* Main Summary Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center mb-6">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-blue-600">{totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">DA</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Number</p>
                  <p className="text-2xl font-bold text-indigo-600">{expenses.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average</p>
                  <p className="text-2xl font-bold text-blue-700">{Math.round(totalAmount / expenses.length).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">DA</p>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">By Category</h3>
                <div className="space-y-2">
                  {Object.entries(categoryTotals)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, amount]) => (
                      <div key={category} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{category}</span>
                        <div className="flex items-end gap-2">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                              style={{ width: `${(amount / totalAmount) * 100}%` }}
                            />
                          </div>
                          <span className="font-semibold text-blue-600 min-w-[80px] text-right">
                            {amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-card rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between sticky top-0 bg-card pb-3">
                <h3 className="text-lg font-bold">
                  {editId ? t('common.edit') : t('common.create')}
                </h3>
                <button onClick={() => setShowForm(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Name *</label>
                  <Input
                    placeholder="e.g., Office Rent"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Description</label>
                  <Input
                    placeholder="Details about the expense..."
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Amount * (DA)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Expense Date *</label>
                  <Input
                    type="date"
                    value={form.expense_date}
                    onChange={e => setForm({ ...form, expense_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Vendor Name</label>
                  <Input
                    placeholder="e.g., ABC Corporation"
                    value={form.vendor_name}
                    onChange={e => setForm({ ...form, vendor_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Receipt Number</label>
                  <Input
                    placeholder="e.g., RCP-2026-001"
                    value={form.receipt_number}
                    onChange={e => setForm({ ...form, receipt_number: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Notes</label>
                  <Input
                    placeholder="Additional notes..."
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-card">
                <Button onClick={handleSave} className="btn-gradient flex-1">
                  {t('common.save')}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                  {t('common.cancel')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
  );
}
