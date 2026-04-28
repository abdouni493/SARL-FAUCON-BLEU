import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Edit2, Trash2, X, AlertCircle, CheckCircle, Mail, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AVAILABLE_ROLES = [
  'admin',
  'chef_projet',
  'storage',
  'purchase',
  'gestionnaire',
  'technique',
  'comptable',
  'resp_projets'
];

const roleTranslations: Record<string, string> = {
  'admin': 'Administration Générale',
  'chef_projet': 'Chef de Projet',
  'storage': 'Stockage',
  'purchase': 'Achats',
  'gestionnaire': 'Gestionnaire',
  'technique': 'Département Technique',
  'comptable': 'Comptable',
  'resp_projets': 'Responsable des Projets'
};

export default function WorkersManagementPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { workers, addWorker, deleteWorker } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ id: '', fullName: '', username: '', email: '', password: '', confirmPassword: '', role: '' });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [dbWorkers, setDbWorkers] = useState<any[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  // Fetch workers from Supabase on component mount
  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      setLoadingWorkers(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching workers:', error);
        return;
      }

      if (data) {
        setDbWorkers(data);
      }
    } catch (err) {
      console.error('Exception fetching workers:', err);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const handleSave = async () => {
    if (!form.fullName || !form.username || !form.email || !form.role) {
      setMessage({ type: 'error', text: t('common.all_fields_required') || 'All fields are required' });
      return;
    }

    if (!editingId && (!form.password || !form.confirmPassword)) {
      setMessage({ type: 'error', text: t('workers.password_required') });
      return;
    }

    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      setMessage({ type: 'error', text: t('login.passwords_do_not_match') || 'Passwords do not match' });
      return;
    }

    if (form.password && form.password.length < 6) {
      setMessage({ type: 'error', text: t('login.password_too_short') || 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        // Update existing worker
        const { error } = await supabase
          .from('users')
          .update({
            full_name: form.fullName,
            username: form.username,
            email: form.email,
            role: form.role,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) {
          setMessage({ type: 'error', text: error.message });
          setLoading(false);
          return;
        }

        setMessage({ type: 'success', text: t('common.updated_successfully') || 'Worker updated successfully!' });
      } else {
        // Create new worker
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              fullName: form.fullName,
              username: form.username,
              role: form.role
            }
          }
        });

        if (error) {
          setMessage({ type: 'error', text: error.message });
          setLoading(false);
          return;
        }

        // Update the user record with the correct role
        if (data.user?.id) {
          const { error: updateError } = await supabase
            .from('users')
            .update({
              full_name: form.fullName,
              username: form.username,
              role: form.role,
              updated_at: new Date().toISOString()
            })
            .eq('id', data.user.id);

          if (updateError) {
            console.error('Error updating user role:', updateError);
          }
        }

        setMessage({ type: 'success', text: t('common.saved_successfully') || 'Worker created successfully!' });
      }

      // Refresh workers list
      await fetchWorkers();
      setForm({ id: '', fullName: '', username: '', email: '', password: '', confirmPassword: '', role: '' });
      setEditingId(null);
      setTimeout(() => {
        setShowForm(false);
        setMessage(null);
      }, 2000);
    } catch (err) {
      setMessage({ type: 'error', text: t('common.error') || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (worker: any) => {
    setEditingId(worker.id);
    setForm({
      id: worker.id,
      fullName: worker.full_name,
      username: worker.username,
      email: worker.email,
      password: '',
      confirmPassword: '',
      role: worker.role
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    setLoading(true);
    try {
      // Delete user from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(confirmDelete);
      
      if (authError) {
        // If admin deletion fails, try to delete from users table
        const { error: dbError } = await supabase
          .from('users')
          .delete()
          .eq('id', confirmDelete);

        if (dbError) {
          setMessage({ type: 'error', text: dbError.message });
          setLoading(false);
          setConfirmDelete(null);
          return;
        }
      }

      // Refresh workers list
      await fetchWorkers();
      deleteWorker(confirmDelete);
      setMessage({ type: 'success', text: t('common.deleted_successfully') || 'Worker deleted successfully!' });
      setTimeout(() => setMessage(null), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: t('common.error') || 'An error occurred' });
    } finally {
      setLoading(false);
      setConfirmDelete(null);
    }
  };

  // Only admins can manage workers
  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
        <p className="text-foreground font-medium">{t('common.access_denied') || 'Only administrators can manage workers'}</p>
      </div>
    );
  }

  return (
    <div className={`${i18n.language === 'ar' ? 'rtl' : 'ltr'} min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800`}>
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 border-b border-blue-100 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('nav.workers_management')}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t('common.manage_team_members')}</p>
              </div>
            </div>
            <Button 
              onClick={() => { 
                setEditingId(null); 
                setForm({ id: '', fullName: '', username: '', email: '', password: '', confirmPassword: '', role: '' }); 
                setShowForm(true); 
              }} 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" /> {t('common.add')}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 p-4 rounded-lg border flex gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700'
                : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            )}
            <p className={`text-sm font-medium ${
              message.type === 'success'
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-red-700 dark:text-red-300'
            }`}>{message.text}</p>
          </motion.div>
        )}

        {loadingWorkers ? (
          <div className="text-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"
            />
            <p className="text-slate-600 dark:text-slate-400">{t('login.loading')}</p>
          </div>
        ) : dbWorkers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">{t('common.no_data') || 'No workers found'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dbWorkers.map((worker, idx) => (
              <motion.div
                key={worker.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="h-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                  {/* Card Accent Bar */}
                  <div className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
                  
                  {/* Card Header with Gradient Background */}
                  <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700/50 dark:to-slate-800/50 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white truncate">{worker.full_name}</CardTitle>
                          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-1">{roleTranslations[worker.role] || worker.role}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Card Content */}
                  <CardContent className="space-y-3 pt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <p className="text-slate-600 dark:text-slate-300 truncate">{worker.email}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <p className="text-slate-600 dark:text-slate-300">@{worker.username}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        {roleTranslations[worker.role] || worker.role}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleEdit(worker)}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> {t('common.edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmDelete(worker.id)}
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
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
      </div>

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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Dialog Header with Gradient */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 px-6 py-4 border-b border-blue-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {editingId ? t('common.edit_worker') : t('workers.add_new_worker')}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {editingId ? t('workers.update_worker_info') : t('workers.create_team_member')}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Dialog Content */}
              <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                {/* Required Fields Section */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                    {t('workers.required_information')}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                        {t('common.full_name')}
                      </label>
                      <Input
                        placeholder={t('workers.enter_full_name')}
                        value={form.fullName}
                        onChange={e => setForm({ ...form, fullName: e.target.value })}
                        disabled={loading}
                        className="border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                        {t('login.username')}
                      </label>
                      <Input
                        placeholder={t('workers.enter_username')}
                        value={form.username}
                        onChange={e => setForm({ ...form, username: e.target.value })}
                        disabled={loading}
                        className="border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                        {t('workers.email_address')}
                      </label>
                      <Input
                        type="email"
                        placeholder={t('workers.enter_email')}
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        disabled={loading || !!editingId}
                        className="border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                        {t('common.role')}
                      </label>
                      <select
                        className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none disabled:opacity-50"
                        value={form.role}
                        onChange={e => setForm({ ...form, role: e.target.value })}
                        disabled={loading}
                      >
                        <option value="">{t('common.select')}</option>
                        {AVAILABLE_ROLES.map(r => (
                          <option key={r} value={r}>{roleTranslations[r]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Password Section (Only for New Workers) */}
                {!editingId && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                      {t('workers.security')}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                          {t('login.password')}
                        </label>
                        <Input
                          type="password"
                          placeholder={t('workers.enter_password')}
                          value={form.password}
                          onChange={e => setForm({ ...form, password: e.target.value })}
                          disabled={loading}
                          className="border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                          {t('login.confirm_password')}
                        </label>
                        <Input
                          type="password"
                          placeholder={t('workers.confirm_password_placeholder')}
                          value={form.confirmPassword}
                          onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                          disabled={loading}
                          className="border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Message Alert */}
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 p-3 rounded-lg border ${
                      message.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700'
                        : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                    }`}
                  >
                    {message.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                    )}
                    <p className={`text-sm ${
                      message.type === 'success'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>{message.text}</p>
                  </motion.div>
                )}
              </div>

              {/* Dialog Footer */}
              <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/50 flex gap-2">
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium"
                  disabled={loading}
                >
                  {loading ? t('common.saving') : t('common.save')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setMessage(null);
                  }}
                  className="flex-1 border-slate-200 dark:border-slate-700"
                  disabled={loading}
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              {/* Dialog Header */}
              <div className="bg-gradient-to-r from-red-50 to-red-50 dark:from-slate-700 dark:to-slate-800 px-6 py-4 border-b border-red-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{t('workers.confirm_deletion')}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{t('common.action_cannot_undo')}</p>
                  </div>
                </div>
              </div>

              {/* Dialog Content */}
              <div className="p-6">
                <p className="text-slate-700 dark:text-slate-300 font-medium mb-4">
                  {t('common.confirm_delete') || 'Are you sure you want to delete this worker?'}
                </p>
              </div>

              {/* Dialog Footer */}
              <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/50 flex gap-2">
                <Button
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium"
                  disabled={loading}
                >
                  {loading ? t('common.deleting') : t('common.delete')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 border-slate-200 dark:border-slate-700"
                  disabled={loading}
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
