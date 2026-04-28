import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Plus, Trash2, X, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Appointment {
  id: string;
  user_id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  created_at: string;
}

export default function AppointmentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', date: '', time: '' });

  // Fetch appointments from database
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      setMessage(err.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleSave = async () => {
    if (!form.title || !form.date) {
      setMessage('Please fill in required fields');
      return;
    }

    try {
      const data = {
        user_id: user?.id,
        title: form.title,
        description: form.description,
        date: form.date,
        time: form.time
      };

      if (editId) {
        const { error } = await supabase
          .from('appointments')
          .update(data)
          .eq('id', editId);

        if (error) throw error;
        setMessage('Appointment updated successfully');
        setEditId(null);
      } else {
        const { error } = await supabase
          .from('appointments')
          .insert([data]);

        if (error) throw error;
        setMessage('Appointment created successfully');
      }

      setForm({ title: '', description: '', date: '', time: '' });
      setShowForm(false);
      await fetchAppointments();
    } catch (err: any) {
      setMessage(err.message || 'Failed to save appointment');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', confirmDelete);

      if (error) throw error;
      setMessage('Appointment deleted successfully');
      setConfirmDelete(null);
      await fetchAppointments();
    } catch (err: any) {
      setMessage(err.message || 'Failed to delete appointment');
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ title: '', description: '', date: '', time: '' });
    setShowForm(true);
  };

  const openEdit = (apt: Appointment) => {
    setForm({
      title: apt.title,
      description: apt.description,
      date: apt.date,
      time: apt.time
    });
    setEditId(apt.id);
    setShowForm(true);
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = appointments
    .filter(a => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = appointments
    .filter(a => a.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex items-center gap-3 p-4 rounded-lg bg-green-50 text-green-700 border border-green-200"
        >
          <CheckCircle className="w-5 h-5" />
          {message}
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="w-7 h-7" />
          {t('nav.appointments')}
        </h1>
        <Button onClick={openCreate} className="btn-gradient gap-2">
          <Plus className="w-4 h-4" /> {t('common.create')}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading appointments...</div>
      ) : upcoming.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">المواعيد القادمة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((apt, idx) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="erp-card border-l-4 border-l-primary bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <CalendarDays className="w-5 h-5 text-white" />
                      </div>
                      <CardTitle className="text-base">{apt.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {apt.description && <p className="text-sm text-muted-foreground">{apt.description}</p>}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="w-3 h-3" /> {new Date(apt.date).toLocaleDateString('fr-FR')}
                      {apt.time && (
                        <>
                          <Clock className="w-3 h-3 ml-2" /> {apt.time}
                        </>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(apt)}
                        className="flex-1 gap-1"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmDelete(apt.id)}
                        className="gap-1 text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      ) : null}

      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">المواعيد السابقة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {past.map((apt, idx) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="erp-card opacity-70">
                  <CardContent className="pt-4 space-y-1">
                    <p className="font-medium text-foreground">{apt.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(apt.date).toLocaleDateString('fr-FR')} {apt.time}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {!loading && upcoming.length === 0 && past.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="erp-card text-center py-12"
        >
          <CalendarDays className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground text-lg">{t('common.no_data')}</p>
        </motion.div>
      )}

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
              className="bg-card rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  {editId ? 'تعديل الموعد' : 'موعد جديد'}
                </h3>
                <button onClick={() => setShowForm(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1">العنوان *</label>
                  <Input
                    placeholder="e.g., Meeting with client"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">الوصف</label>
                  <Input
                    placeholder={t('common.description')}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">التاريخ *</label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">الوقت</label>
                  <Input
                    type="time"
                    value={form.time}
                    onChange={e => setForm({ ...form, time: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="btn-gradient flex-1">
                  {t('common.save')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  onClick={handleDelete}
                  className="btn-gradient-danger flex-1"
                >
                  {t('common.confirm')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1"
                >
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
