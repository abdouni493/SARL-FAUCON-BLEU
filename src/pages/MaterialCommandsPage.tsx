import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { motion } from 'framer-motion';
import { Eye, Edit, Trash2, X, Plus, Save, Loader, Printer, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateNextId } from '@/lib/idUtils';
import { getPrintLabels, buildPrintHTML, openPrintWindow, formatDateLocale } from '@/lib/printUtils';

interface CommandProduct {
  id: string;
  product_name: string;
  category_id: string;
  unity_id: string;
  quantity: number;
  note: string;
  categories: { id: string; name: string } | null;
  unities: { id: string; name: string } | null;
}

interface MaterialCommand {
  id: string;
  command_id: string;
  status: string;
  created_by_id: string;
  created_at: string;
  project_id?: string;
  project_name?: string;
  created_by_name?: string;
  command_products: CommandProduct[];
}

interface Category {
  id: string;
  name: string;
}

interface Unity {
  id: string;
  name: string;
}

interface ProductEntry {
  id: string;
  name: string;
  categoryId: string;
  unityId: string;
  quantity: number;
  note: string;
}

export default function MaterialCommandsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { enterpriseSettings } = useData();
  const printRef = useRef<HTMLDivElement>(null);
  const [commands, setCommands] = useState<MaterialCommand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [unities, setUnities] = useState<Unity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewCmd, setViewCmd] = useState<MaterialCommand | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCmdId, setEditingCmdId] = useState<string | null>(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [showNewUnity, setShowNewUnity] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [newUnity, setNewUnity] = useState('');
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleteUnityId, setDeleteUnityId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductEntry[]>([
    { id: '1', name: '', categoryId: '', unityId: '', quantity: 1, note: '' }
  ]);
  const [message, setMessage] = useState('');
  const [pendingPrintCmd, setPendingPrintCmd] = useState<MaterialCommand | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cmdRes, catRes, unityRes] = await Promise.all([
        supabase
          .from('material_commands')
          .select(`
            id, command_id, status, created_by_id, created_at,
            command_products (
              id, product_name, category_id, unity_id, quantity, note
            )
          `)
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*'),
        supabase.from('unities').select('*')
      ]);

      if (cmdRes.error) throw cmdRes.error;
      if (catRes.error) throw catRes.error;
      if (unityRes.error) throw unityRes.error;

      const { data: usersData } = await supabase.from('users').select('id, full_name');
      const userMap = Object.fromEntries((usersData || []).map(u => [u.id, u.full_name]));
      
      const enrichedCommands = (cmdRes.data || []).map((cmd: any) => ({
        ...cmd,
        project_name: 'N/A', // Relationship removed to fix error
        created_by_name: userMap[cmd.created_by_id] || 'System'
      }));

      setCommands(enrichedCommands);
      setCategories(catRes.data || []);
      setUnities(unityRes.data || []);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = (i: number, field: keyof ProductEntry, val: string | number) => {
    const updated = [...products];
    (updated[i] as any)[field] = val;
    setProducts(updated);
  };

  const addProductRow = () =>
    setProducts([...products, { id: Date.now().toString(), name: '', categoryId: '', unityId: '', quantity: 1, note: '' }]);

  const removeProduct = (i: number) => setProducts(products.filter((_, idx) => idx !== i));

  const handleSaveCommand = async () => {
    try {
      const validProducts = products.filter(p => p.name);
      if (validProducts.length === 0) {
        setMessage('Please add at least one product');
        return;
      }

      if (editingCmdId) {
        // Delete old products
        await supabase.from('command_products').delete().eq('command_id', editingCmdId);

        // Insert new products
        const productData = validProducts.map(p => ({
          command_id: editingCmdId,
          product_name: p.name,
          category_id: p.categoryId || null,
          unity_id: p.unityId || null,
          quantity: p.quantity,
          note: p.note || ''
        }));

        const { error } = await supabase.from('command_products').insert(productData);
        if (error) throw error;
        setMessage('Command updated successfully!');
      } else {
        // Create new command
        const nextId = await generateNextId('material_commands', 'cmd');
        const { data: cmdData, error: cmdError } = await supabase
          .from('material_commands')
          .insert({
            command_id: nextId,
            status: 'pending',
            created_by_id: user?.id
          })
          .select();

        if (cmdError) throw cmdError;
        if (!cmdData?.[0]) throw new Error('Failed to create command');

        const productData = validProducts.map(p => ({
          command_id: cmdData[0].id,
          product_name: p.name,
          category_id: p.categoryId || null,
          unity_id: p.unityId || null,
          quantity: p.quantity,
          note: p.note || ''
        }));

        const { error: prodError } = await supabase.from('command_products').insert(productData);
        if (prodError) throw prodError;
        setMessage('Command created successfully!');
      }

      setProducts([{ id: '1', name: '', categoryId: '', unityId: '', quantity: 1, note: '' }]);
      setShowCreateDialog(false);
      setEditingCmdId(null);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const startEditCommand = (cmd: MaterialCommand) => {
    setEditingCmdId(cmd.id);
    setProducts(
      cmd.command_products.map((p, i) => ({
        id: p.id,
        name: p.product_name,
        categoryId: p.category_id,
        unityId: p.unity_id,
        quantity: p.quantity,
        note: p.note || ''
      }))
    );
    setShowCreateDialog(true);
  };

  const handleDeleteCommand = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('material_commands').delete().eq('id', deleteId);
      if (error) throw error;
      setMessage('Command deleted successfully!');
      setDeleteId(null);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleAddCategory = async () => {
    if (!newCat.trim()) return;
    try {
      const { error } = await supabase.from('categories').insert({ name: newCat });
      if (error) throw error;
      setNewCat('');
      setShowNewCat(false);
      setMessage('Category added!');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleAddUnity = async () => {
    if (!newUnity.trim()) return;
    try {
      const { error } = await supabase.from('unities').insert({ name: newUnity });
      if (error) throw error;
      setNewUnity('');
      setShowNewUnity(false);
      setMessage('Unity added!');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', deleteCategoryId);
      if (error) throw error;
      setDeleteCategoryId(null);
      setMessage('Category deleted successfully!');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleDeleteUnity = async () => {
    if (!deleteUnityId) return;
    try {
      const { error } = await supabase.from('unities').delete().eq('id', deleteUnityId);
      if (error) throw error;
      setDeleteUnityId(null);
      setMessage('Unity deleted successfully!');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handlePrintCommand = (cmd: MaterialCommand, lang: 'ar' | 'fr') => {
    const L = getPrintLabels(lang);
    const body = `
      <div class="details-grid">
        <div class="detail-item"><h3>${L.commandId}</h3><p>${cmd.command_id}</p></div>
        <div class="detail-item"><h3>${L.status}</h3><p>${cmd.status.toUpperCase()}</p></div>
        <div class="detail-item"><h3>${L.date}</h3><p>${formatDateLocale(cmd.created_at, lang)}</p></div>
      </div>
      <h2 class="section-title">${L.isAr ? 'قائمة المنتجات' : 'Liste des Produits'}</h2>
      <table>
        <thead>
          <tr>
            <th style="width:5%;">#</th>
            <th style="width:30%;">${L.productName}</th>
            <th style="width:20%;">${L.category}</th>
            <th style="width:15%;">${L.unity}</th>
            <th style="width:15%;">${L.quantity}</th>
            <th style="width:15%;">${L.notes}</th>
          </tr>
        </thead>
        <tbody>
          ${cmd.command_products.map((p, idx) => `
            <tr>
              <td style="text-align:center;font-weight:bold;">${idx + 1}</td>
              <td class="product-name">${p.product_name}</td>
              <td>${p.categories?.name || '-'}</td>
              <td>${p.unities?.name || '-'}</td>
              <td style="text-align:center;font-weight:bold;">${p.quantity}</td>
              <td>${p.note || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    openPrintWindow(buildPrintHTML({
      lang,
      docTitle: { ar: 'أمر المواد', fr: 'Commande Matériel' },
      docId: cmd.command_id,
      docDate: formatDateLocale(cmd.created_at, lang),
      enterpriseSettings,
    }, body));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const filteredCommands = commands.filter(cmd => 
    cmd.command_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cmd.project_name && cmd.project_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (cmd.created_by_name && cmd.created_by_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`p-4 rounded-lg ${
            message.includes('Error')
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {message}
        </motion.div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">{t('nav.material_commands')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('common.manage_material_commands')}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2 btn-gradient text-white shadow-lg font-semibold">
          <Plus className="w-5 h-5" /> {t('common.create_command')}
        </Button>
      </div>

      <div className="relative mb-6">
        <Input
          placeholder={t('commands.search_placeholder') || 'Rechercher par ID, Projet ou Chef...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11"
        />
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-3 hover:text-foreground"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {filteredCommands.length === 0 ? (
        <div className="erp-card text-center py-16 text-muted-foreground">
          <p className="text-lg">{t('common.no_data')}</p>
          {searchQuery && <p className="text-sm mt-2">{t('common.no_results_found')}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCommands.map((cmd, i) => (
            <motion.div
              key={cmd.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative erp-card hover:shadow-xl cursor-pointer border-2 border-blue-100 dark:border-slate-700 overflow-hidden"
            >
              {/* Background decoration */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150" />
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Command ID</p>
                    <span className="font-bold text-lg text-foreground">{cmd.command_id}</span>
                  </div>
                  <span
                    className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-tight ${
                      cmd.status === 'pending'
                        ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200'
                        : cmd.status === 'validated'
                        ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200'
                        : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                    }`}
                  >
                    {t(`common.${cmd.status}`)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 py-3 px-3 bg-blue-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">{t('common.date')}</p>
                    <p className="text-sm font-medium text-foreground">{new Date(cmd.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Products</p>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{cmd.command_products.length}</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap pt-2">
                  <Button 
                    size="sm" 
                    onClick={() => setPendingPrintCmd(cmd)} 
                    className="gap-1.5 btn-gradient text-xs font-semibold"
                  >
                    <Printer className="w-4 h-4" /> {t('common.print')}
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setViewCmd(cmd)} 
                    className="gap-1.5 btn-gradient text-xs font-semibold flex-1"
                  >
                    <Eye className="w-4 h-4" /> {t('common.view')}
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => startEditCommand(cmd)} 
                    className="gap-1.5 btn-gradient text-xs font-semibold flex-1"
                  >
                    <Edit className="w-4 h-4" /> {t('common.edit')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setDeleteId(cmd.id)}
                    className="gap-1.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 text-xs font-semibold"
                  >
                    <Trash2 className="w-4 h-4" /> {t('common.delete')}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewCmd} onOpenChange={() => setViewCmd(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">{viewCmd?.command_id}</DialogTitle>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{t('common.view_command_details')}</p>
              </div>
              {viewCmd && (
                <Button 
                  onClick={() => setPendingPrintCmd(viewCmd)} 
                  className="gap-2 btn-gradient font-semibold"
                >
                  <Printer className="w-4 h-4" /> {t('common.print')}
                </Button>
              )}
            </div>
          </DialogHeader>
          {viewCmd && (
            <div className="space-y-6 pr-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.status')}</p>
                  <p className={`text-lg font-bold ${
                    viewCmd.status === 'pending'
                      ? 'text-amber-700 dark:text-amber-300'
                      : viewCmd.status === 'validated'
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-blue-700 dark:text-blue-300'
                  }`}>
                    {viewCmd.status.charAt(0).toUpperCase() + viewCmd.status.slice(1)}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.date')}</p>
                  <p className="text-lg font-bold text-foreground">{new Date(viewCmd.created_at).toLocaleDateString()}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">Products</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{viewCmd.command_products.length}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                  {t('common.add_product')}
                </h3>
                <div className="border border-blue-200 dark:border-slate-600 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-700 dark:to-slate-800 border-b border-blue-200 dark:border-slate-600">
                        <th className="p-4 text-left text-sm font-bold text-blue-950 dark:text-blue-100">{t('common.product_name')}</th>
                        <th className="p-4 text-left text-sm font-bold text-blue-950 dark:text-blue-100">{t('common.category')}</th>
                        <th className="p-4 text-left text-sm font-bold text-blue-950 dark:text-blue-100">{t('common.unity')}</th>
                        <th className="p-4 text-center text-sm font-bold text-blue-950 dark:text-blue-100">{t('common.quantity')}</th>
                        <th className="p-4 text-left text-sm font-bold text-blue-950 dark:text-blue-100">{t('common.note')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewCmd.command_products.map((p, idx) => (
                        <tr 
                          key={p.id} 
                          className={`border-b border-blue-100 dark:border-slate-700 transition-colors ${
                            idx % 2 === 0 
                              ? 'bg-white dark:bg-slate-800' 
                              : 'bg-blue-50 dark:bg-slate-700'
                          } hover:bg-blue-100 dark:hover:bg-slate-600`}
                        >
                          <td className="p-4">
                            <p className="font-bold text-blue-900 dark:text-blue-100">{p.product_name}</p>
                          </td>
                          <td className="p-4 text-sm">{p.categories?.name || <span className="text-muted-foreground">-</span>}</td>
                          <td className="p-4 text-sm">{p.unities?.name || <span className="text-muted-foreground">-</span>}</td>
                          <td className="p-4 text-center">
                            <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-slate-600 text-blue-700 dark:text-blue-300 rounded-full font-semibold text-sm">
                              {p.quantity}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground italic">{p.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The command will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCommand} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">
              {editingCmdId ? t('common.edit_command') : t('common.create_command')}
            </DialogTitle>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{t('common.manage_command_products')}</p>
          </DialogHeader>

          <div className="space-y-6 pr-6">
            {/* Products Table */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                  {t('common.add_product')}
                </h3>
                <Button size="sm" onClick={addProductRow} className="gap-2 btn-gradient text-white font-semibold">
                  <Plus className="w-4 h-4" /> {t('common.add_product')}
                </Button>
              </div>

              <div className="overflow-x-auto border border-blue-200 dark:border-slate-600 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-700 dark:to-slate-800 border-b border-blue-200 dark:border-slate-600">
                    <tr>
                      <th className="p-4 text-left font-bold text-blue-950 dark:text-blue-100">{t('common.product_name')}</th>
                      <th className="p-4 text-left font-bold text-blue-950 dark:text-blue-100">
                        {t('common.category')}
                        <Button
                          size="sm"
                          className="ml-2 h-6 px-2 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                          onClick={() => setShowNewCat(true)}
                        >
                          +
                        </Button>
                      </th>
                      <th className="p-4 text-left font-bold text-blue-950 dark:text-blue-100">
                        {t('common.unity')}
                        <Button
                          size="sm"
                          className="ml-2 h-6 px-2 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                          onClick={() => setShowNewUnity(true)}
                        >
                          +
                        </Button>
                      </th>
                      <th className="p-4 text-center font-bold text-blue-950 dark:text-blue-100">{t('common.quantity')}</th>
                      <th className="p-4 text-left font-bold text-blue-950 dark:text-blue-100">{t('common.note')}</th>
                      <th className="p-4 text-center font-bold text-blue-950 dark:text-blue-100">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={p.id} className={`border-b border-blue-100 dark:border-slate-700 ${
                        i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-blue-50 dark:bg-slate-700'
                      } hover:bg-blue-100 dark:hover:bg-slate-600 transition-colors`}>
                        <td className="p-4">
                          <Input
                            value={p.name}
                            onChange={(e) => updateProduct(i, 'name', e.target.value)}
                            placeholder={t('common.product_name')}
                            className="h-9 bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600"
                          />
                        </td>
                        <td className="p-4">
                          <Select value={p.categoryId} onValueChange={(val) => updateProduct(i, 'categoryId', val)}>
                            <SelectTrigger className="h-9 bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4">
                          <Select value={p.unityId} onValueChange={(val) => updateProduct(i, 'unityId', val)}>
                            <SelectTrigger className="h-9 bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {unities.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4">
                          <Input
                            type="number"
                            value={p.quantity}
                            min="1"
                            onChange={(e) => updateProduct(i, 'quantity', parseInt(e.target.value) || 1)}
                            className="h-9 bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600 text-center font-semibold"
                          />
                        </td>
                        <td className="p-4">
                          <Input
                            value={p.note}
                            onChange={(e) => updateProduct(i, 'note', e.target.value)}
                            placeholder="Add note..."
                            className="h-9 bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <Button 
                            size="sm" 
                            onClick={() => removeProduct(i)} 
                            className="h-8 px-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 gap-1"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-blue-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="font-semibold">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveCommand} className="btn-gradient text-white font-semibold gap-2">
              <Save className="w-4 h-4" /> {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showNewCat} onOpenChange={setShowNewCat}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-xl font-bold text-blue-950 dark:text-blue-100">{t('common.manage_categories')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-foreground block mb-2">{t('common.category')}</label>
              <div className="flex gap-2">
                <Input
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder="Enter category name..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  className="border-blue-200 dark:border-slate-600"
                />
                <Button onClick={handleAddCategory} className="btn-gradient text-white font-semibold gap-1">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>
            </div>

            {categories.length > 0 && (
              <div className="border-t border-blue-200 dark:border-slate-700 pt-4">
                <label className="text-sm font-bold text-foreground block mb-3">{t('common.existing')}</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600 hover:bg-blue-100 dark:hover:bg-slate-600 transition">
                      <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      <Button
                        size="sm"
                        onClick={() => setDeleteCategoryId(cat.id)}
                        className="h-6 px-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-blue-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setShowNewCat(false)} className="font-semibold">
              {t('common.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Unity Dialog */}
      <Dialog open={showNewUnity} onOpenChange={setShowNewUnity}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-xl font-bold text-blue-950 dark:text-blue-100">{t('common.manage_unities')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-foreground block mb-2">{t('common.unity')}</label>
              <div className="flex gap-2">
                <Input
                  value={newUnity}
                  onChange={(e) => setNewUnity(e.target.value)}
                  placeholder="e.g., KG, Meter, Piece..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddUnity()}
                  className="border-blue-200 dark:border-slate-600"
                />
                <Button onClick={handleAddUnity} className="btn-gradient text-white font-semibold gap-1">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>
            </div>

            {unities.length > 0 && (
              <div className="border-t border-blue-200 dark:border-slate-700 pt-4">
                <label className="text-sm font-bold text-foreground block mb-3">{t('common.existing')}</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {unities.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600 hover:bg-blue-100 dark:hover:bg-slate-600 transition">
                      <span className="text-sm font-medium text-foreground">{u.name}</span>
                      <Button
                        size="sm"
                        onClick={() => setDeleteUnityId(u.id)}
                        className="h-6 px-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-blue-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setShowNewUnity(false)} className="font-semibold">
              {t('common.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.delete_category_confirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Unity Confirmation Dialog */}
      <AlertDialog open={!!deleteUnityId} onOpenChange={() => setDeleteUnityId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.delete_unity_confirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUnity} className="bg-destructive hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Language Chooser Dialog */}
      <Dialog open={!!pendingPrintCmd} onOpenChange={() => setPendingPrintCmd(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-xl font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" /> {t('common.choose_print_language')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 px-2 pb-2">
            <Button
              onClick={() => {
                if (pendingPrintCmd) handlePrintCommand(pendingPrintCmd, 'ar');
                setPendingPrintCmd(null);
              }}
              className="h-24 flex flex-col gap-2 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-lg rounded-xl shadow-lg"
            >
              <span className="text-2xl">🇩🇿</span>
              {t('common.print_in_arabic')}
            </Button>
            <Button
              onClick={() => {
                if (pendingPrintCmd) handlePrintCommand(pendingPrintCmd, 'fr');
                setPendingPrintCmd(null);
              }}
              className="h-24 flex flex-col gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-xl shadow-lg"
            >
              <span className="text-2xl">🇫🇷</span>
              {t('common.print_in_french')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
