import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Edit, Trash2, Printer, X, Plus, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProductEntry {
  id?: string;
  name: string;
  categoryId?: string;
  categoryName: string;
  unityId?: string;
  unityName: string;
  quantity: number;
  note: string;
}

interface Command {
  id: string;
  command_id: string;
  status: string;
  products: ProductEntry[];
  created_by: string;
  created_at: string;
}

export default function MaterialCommandsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // State Management
  const [commands, setCommands] = useState<Command[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [unities, setUnities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dialog States
  const [viewCmd, setViewCmd] = useState<Command | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCmdId, setEditingCmdId] = useState<string | null>(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [showNewUnity, setShowNewUnity] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [newUnity, setNewUnity] = useState('');
  
  // Form State
  const [products, setProducts] = useState<ProductEntry[]>([{ name: '', categoryId: '', categoryName: '', unityId: '', unityName: '', quantity: 1, note: '' }]);

  // Fetch data on mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCommands(),
        fetchCategories(),
        fetchUnities()
      ]);
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError(t('common.error') || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCommands = async () => {
    const { data, error } = await supabase
      .from('material_commands')
      .select(`
        id,
        command_id,
        status,
        created_by_id,
        created_at,
        command_products (
          id,
          product_name,
          category_id,
          unity_id,
          quantity,
          note,
          categories (id, name),
          unities (id, name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching commands:', error);
      return;
    }

    const formattedCommands: Command[] = (data || []).map(cmd => ({
      id: cmd.id,
      command_id: cmd.command_id,
      status: cmd.status,
      created_by: cmd.created_by_id,
      created_at: cmd.created_at,
      products: cmd.command_products.map((p: any) => ({
        id: p.id,
        name: p.product_name,
        categoryId: p.category_id,
        categoryName: p.categories?.name || '',
        unityId: p.unity_id,
        unityName: p.unities?.name || '',
        quantity: p.quantity,
        note: p.note || ''
      }))
    }));

    setCommands(formattedCommands);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }

    setCategories(data || []);
  };

  const fetchUnities = async () => {
    const { data, error } = await supabase
      .from('unities')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching unities:', error);
      return;
    }

    setUnities(data || []);
  };

  const addCategory = async () => {
    if (!newCat.trim()) {
      setError(t('common.all_fields_required') || 'Category name required');
      return;
    }

    const { error } = await supabase
      .from('categories')
      .insert({ name: newCat });

    if (error) {
      setError(error.message);
      return;
    }

    setMessage({ type: 'success', text: 'Category added successfully!' });
    setNewCat('');
    setShowNewCat(false);
    await fetchCategories();
  };

  const addUnity = async () => {
    if (!newUnity.trim()) {
      setError(t('common.all_fields_required') || 'Unity name required');
      return;
    }

    const { error } = await supabase
      .from('unities')
      .insert({ name: newUnity });

    if (error) {
      setError(error.message);
      return;
    }

    setMessage({ type: 'success', text: 'Unity added successfully!' });
    setNewUnity('');
    setShowNewUnity(false);
    await fetchUnities();
  };

  const updateProduct = (index: number, field: keyof ProductEntry, value: any) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    setProducts(updated);
  };

  const addProductRow = () => {
    setProducts([...products, { name: '', categoryId: '', categoryName: '', unityId: '', unityName: '', quantity: 1, note: '' }]);
  };

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleSaveCommand = async () => {
    if (products.filter(p => p.name).length === 0) {
      setError(t('common.all_fields_required') || 'At least one product is required');
      return;
    }

    try {
      setLoading(true);

      if (editingCmdId) {
        // Update existing command - delete old products first
        await supabase.from('command_products').delete().eq('command_id', editingCmdId);

        // Add updated products
        const productData = products
          .filter(p => p.name)
          .map(p => ({
            command_id: editingCmdId,
            product_name: p.name,
            category_id: p.categoryId,
            unity_id: p.unityId,
            quantity: p.quantity,
            note: p.note
          }));

        const { error: insertError } = await supabase
          .from('command_products')
          .insert(productData);

        if (insertError) {
          setError(insertError.message);
          return;
        }

        setMessage({ type: 'success', text: t('common.updated_successfully') || 'Command updated successfully!' });
        setEditingCmdId(null);
      } else {
        // Create new command
        const { data: cmdData, error: cmdError } = await supabase
          .from('material_commands')
          .insert({
            command_id: `CMD-${Date.now()}`,
            status: 'pending',
            created_by_id: user?.id
          })
          .select();

        if (cmdError || !cmdData) {
          setError(cmdError?.message || 'Failed to create command');
          return;
        }

        // Add products
        const productData = products
          .filter(p => p.name)
          .map(p => ({
            command_id: cmdData[0].id,
            product_name: p.name,
            category_id: p.categoryId,
            unity_id: p.unityId,
            quantity: p.quantity,
            note: p.note
          }));

        const { error: insertError } = await supabase
          .from('command_products')
          .insert(productData);

        if (insertError) {
          setError(insertError.message);
          return;
        }

        setMessage({ type: 'success', text: t('common.saved_successfully') || 'Command created successfully!' });
      }

      // Reset form
      setProducts([{ name: '', categoryId: '', categoryName: '', unityId: '', unityName: '', quantity: 1, note: '' }]);
      setShowCreateDialog(false);
      
      // Refresh commands
      await fetchCommands();

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(t('common.error') || 'An error occurred');
      console.error('Error saving command:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEditCommand = (cmd: Command) => {
    setEditingCmdId(cmd.id);
    setProducts(cmd.products);
    setShowCreateDialog(true);
  };

  const handleDeleteCommand = async () => {
    if (!deleteId) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('material_commands')
        .delete()
        .eq('id', deleteId);

      if (error) {
        setError(error.message);
        return;
      }

      setMessage({ type: 'success', text: t('common.deleted_successfully') || 'Command deleted successfully!' });
      setDeleteId(null);
      await fetchCommands();

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(t('common.error') || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading && commands.length === 0) {
    return <div className="flex items-center justify-center h-screen">{t('login.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('nav.material_commands')}</h1>
        <Button 
          onClick={() => {
            setEditingCmdId(null);
            setProducts([{ name: '', categoryId: '', categoryName: '', unityId: '', unityName: '', quantity: 1, note: '' }]);
            setShowCreateDialog(true);
          }} 
          className="gap-2 erp-gradient-bg border-0 text-primary-foreground"
        >
          <Plus className="w-4 h-4" /> {t('common.create_command')}
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <motion.div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2 items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <p className="text-red-700">{error}</p>
        </motion.div>
      )}

      {message && (
        <motion.div className={`p-4 border rounded-lg flex gap-2 items-start ${message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          )}
          <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>{message.text}</p>
        </motion.div>
      )}

      {/* Commands List */}
      {commands.length === 0 ? (
        <Card className="bg-card/95 backdrop-blur-xl border-border/50">
          <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
            {t('common.no_data')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {commands.map((cmd, i) => (
              <motion.div
                key={cmd.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: i * 0.05 }}
                className="erp-card"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-foreground">{cmd.command_id}</span>
                  <Badge variant={cmd.status === 'pending' ? 'secondary' : 'default'}>
                    {cmd.status}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-1">
                  {t('common.date')}: {new Date(cmd.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  {cmd.products.length} {t('common.add_product')}
                </p>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewCmd(cmd)}
                    className="gap-1 flex-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> {t('common.view')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEditCommand(cmd)}
                    className="gap-1 flex-1"
                  >
                    <Edit className="w-3.5 h-3.5" /> {t('common.edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteId(cmd.id)}
                    className="gap-1 text-red-600 hover:text-red-600 flex-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t('common.delete')}
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCmdId ? t('common.edit') : t('common.create')} {t('nav.material_commands')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Categories & Unities Management */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewCat(true)}
                className="gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {t('common.new_category')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewUnity(true)}
                className="gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {t('common.new_unity')}
              </Button>
            </div>

            {/* Products Table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium">{t('common.name')}</th>
                      <th className="px-3 py-2 text-left text-sm font-medium">{t('common.category')}</th>
                      <th className="px-3 py-2 text-left text-sm font-medium">{t('common.unity')}</th>
                      <th className="px-3 py-2 text-left text-sm font-medium">{t('common.quantity')}</th>
                      <th className="px-3 py-2 text-left text-sm font-medium">{t('common.note')}</th>
                      <th className="px-3 py-2 text-center text-sm font-medium">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, index) => (
                      <tr key={index} className="border-t border-border">
                        <td className="px-3 py-2">
                          <Input
                            placeholder={t('common.name')}
                            value={product.name}
                            onChange={(e) => updateProduct(index, 'name', e.target.value)}
                            className="h-8"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Select value={product.categoryId || ''} onValueChange={(val) => {
                            const cat = categories.find(c => c.id === val);
                            updateProduct(index, 'categoryId', val);
                            updateProduct(index, 'categoryName', cat?.name || '');
                          }}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder={t('common.select')} />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <Select value={product.unityId || ''} onValueChange={(val) => {
                            const u = unities.find(un => un.id === val);
                            updateProduct(index, 'unityId', val);
                            updateProduct(index, 'unityName', u?.name || '');
                          }}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder={t('common.select')} />
                            </SelectTrigger>
                            <SelectContent>
                              {unities.map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="1"
                            value={product.quantity}
                            onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value))}
                            className="h-8"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            placeholder={t('common.note')}
                            value={product.note}
                            onChange={(e) => updateProduct(index, 'note', e.target.value)}
                            className="h-8"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeProduct(index)}
                            className="text-red-600 hover:text-red-600"
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

            {/* Add Product Button */}
            <Button
              onClick={addProductRow}
              variant="outline"
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" /> {t('common.add_product')}
            </Button>

            {/* Save Button */}
            <Button
              onClick={handleSaveCommand}
              className="w-full erp-gradient-bg border-0 text-primary-foreground gap-2"
              disabled={loading}
            >
              <Save className="w-4 h-4" /> {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {viewCmd && (
        <Dialog open={!!viewCmd} onOpenChange={() => setViewCmd(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewCmd.command_id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">{t('common.add_product')}</h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left">{t('common.name')}</th>
                          <th className="px-3 py-2 text-left">{t('common.category')}</th>
                          <th className="px-3 py-2 text-left">{t('common.unity')}</th>
                          <th className="px-3 py-2 text-left">{t('common.quantity')}</th>
                          <th className="px-3 py-2 text-left">{t('common.note')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewCmd.products.map((p, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-2">{p.name}</td>
                            <td className="px-3 py-2">{p.categoryName}</td>
                            <td className="px-3 py-2">{p.unityName}</td>
                            <td className="px-3 py-2">{p.quantity}</td>
                            <td className="px-3 py-2">{p.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Category Dialog */}
      <Dialog open={showNewCat} onOpenChange={setShowNewCat}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.new_category')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={t('common.name')}
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
            />
            <Button
              onClick={addCategory}
              className="w-full erp-gradient-bg border-0 text-primary-foreground"
              disabled={loading}
            >
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Unity Dialog */}
      <Dialog open={showNewUnity} onOpenChange={setShowNewUnity}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.new_unity')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={t('common.name')}
              value={newUnity}
              onChange={(e) => setNewUnity(e.target.value)}
            />
            <Button
              onClick={addUnity}
              className="w-full erp-gradient-bg border-0 text-primary-foreground"
              disabled={loading}
            >
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.confirm_delete') || 'Are you sure you want to delete this command?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCommand}
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
