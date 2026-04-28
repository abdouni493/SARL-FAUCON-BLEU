import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '@/contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

export default function CreateExpensePage() {
  const { t } = useTranslation();
  const { addExpense } = useData();
  const navigate = useNavigate();
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');

  const handleSave = () => {
    if (!price || !description) {
      setMessage('Please fill all required fields');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    addExpense({ id: `EXP-${Date.now()}`, price: Number(price), date, description });
    setMessage('Expense created successfully!');
    setTimeout(() => {
      navigate('/project-expenses');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`p-4 rounded-lg flex items-center justify-between ${
            message.includes('Error') || message.includes('fill')
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {message.includes('Error') || message.includes('fill') ? (
              <AlertCircle className="w-5 h-5 shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 shrink-0" />
            )}
            <p>{message}</p>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-2xl"
      >
        <Card className="border-2 border-blue-100 dark:border-slate-700 shadow-lg">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 px-6 py-6 border-b border-blue-200 dark:border-slate-700 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-blue-950 dark:text-blue-100">{t('common.create_expense')}</h1>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Add a new project expense</p>
              </div>
              <button
                onClick={() => navigate('/project-expenses')}
                className="p-2 hover:bg-blue-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          </div>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Header Section */}
              <div className="pb-6 border-b border-blue-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                  {t('common.expense_details')}
                </h2>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block uppercase tracking-wide">{t('common.price')}</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="h-9 border-blue-200 dark:border-slate-600 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block uppercase tracking-wide">{t('common.date')}</label>
                  <Input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="h-9 border-blue-200 dark:border-slate-600 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block uppercase tracking-wide">{t('common.description')}</label>
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Enter expense description..."
                    className="border-blue-200 dark:border-slate-600 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-blue-200 dark:border-slate-700">
                <Button
                  variant="outline"
                  onClick={() => navigate('/project-expenses')}
                  className="font-semibold"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleSave}
                  className="gap-2 btn-gradient text-white font-semibold"
                >
                  <Save className="w-4 h-4" /> {t('common.save')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
