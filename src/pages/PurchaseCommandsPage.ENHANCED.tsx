import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { motion } from 'framer-motion';
import { Eye, CheckCircle, Package, ShoppingCart, Filter, Loader, Trash2, Printer, Plus, ImagePlus, Save, X, BarChart3, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { generateNextId } from '@/lib/idUtils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface PurchaseCommand {
  id: string;
  command_id: string;
  status: string;
  created_by_id: string;
  created_at: string;
  material_command_id: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  creator_name?: string;
}

interface MissingProduct {
  product_name: string;
  quantity: number;
}

interface BonCommande {
  id: string;
  bon_id: string;
  purchase_command_id: string;
  supplier_id?: string;
  supplier_name: string;
  status: string;
  total_price: number;
  total_without_tva: number;
  total_with_tva: number;
  created_by_id: string;
  created_at: string;
}

interface BonProduct {
  id: string;
  product_name: string;
  barcode?: string;
  quantity: number;
  unity_price: number;
  tva_rate: number;
  subtotal: number;
  tva_amount: number;
  total_with_tva: number;
}

interface BonOffer {
  id: string;
  supplier_name: string;
  image_url?: string;
  notes?: string;
  offer_date: string;
}

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

const StatCard = ({ icon: Icon, label, value, gradient, delay }: { icon: React.ElementType; label: string; value: string | number; gradient: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="group relative erp-card hover:shadow-xl cursor-pointer border-2 border-blue-100 dark:border-slate-700 overflow-hidden"
  >
    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150" />
    <div className="relative flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">{label}</p>
        <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
      </div>
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg ${gradient}`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
    </div>
  </motion.div>
);

export default function PurchaseCommandsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { enterpriseSettings } = useData();

  // State
  const [commands, setCommands] = useState<PurchaseCommand[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bonsCount, setBonsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Dialog states
  const [viewCmd, setViewCmd] = useState<PurchaseCommand | null>(null);
  const [manageBon, setManageBon] = useState<BonCommande | null>(null);
  const [missingProducts, setMissingProducts] = useState<MissingProduct[]>([]);
  const [bonProducts, setBonProducts] = useState<BonProduct[]>([]);
  const [bonOffers, setBonOffers] = useState<BonOffer[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'offers' | 'purchase_products'>('products');

  // Form states
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'validated'>('all');

  // Product form state
  const [newProducts, setNewProducts] = useState<BonProduct[]>([
    { id: '', product_name: '', quantity: 1, unity_price: 0, tva_rate: 19, subtotal: 0, tva_amount: 0, total_with_tva: 0 }
  ]);

  // Offer form state
  const [newOffers, setNewOffers] = useState<Partial<BonOffer>[]>([
    { supplier_name: '', image_url: '', notes: '' }
  ]);

  const [selectedSupplierForOffer, setSelectedSupplierForOffer] = useState<string>('');
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [purchaseCommandProducts, setPurchaseCommandProducts] = useState<any[]>([]);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cmdRes, suppliersRes, bonsRes] = await Promise.all([
        supabase
          .from('purchase_commands')
          .select(`
            id, command_id, status, created_by_id, created_at,
            material_command_id, supplier_id, supplier_name
          `)
          .order('created_at', { ascending: false }),
        supabase.from('suppliers').select('*').eq('is_active', true),
        supabase.from('bons_commandes').select('id')
      ]);

      if (cmdRes.error) throw cmdRes.error;
      if (bonsRes.error) throw bonsRes.error;

      const commandsWithCreators = await Promise.all(
        (cmdRes.data || []).map(async (cmd) => {
          const { data: userData } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', cmd.created_by_id)
            .single();
          return {
            ...cmd,
            creator_name: userData?.full_name || 'Unknown'
          };
        })
      );

      setCommands(commandsWithCreators);
      setSuppliers(suppliersRes.data || []);
      setBonsCount(bonsRes.data?.length || 0);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const purchaseCommands = commands.filter(c => c.status === 'pending');
  const validatedCommands = commands.filter(c => c.status === 'validated');
  const filteredCommands =
    filterStatus === 'pending' ? purchaseCommands
      : filterStatus === 'validated' ? validatedCommands
        : commands;

  const fetchMissingProducts = async (purchaseCommandId: string) => {
    try {
      const { data } = await supabase
        .from('purchase_command_products')
        .select('product_name, quantity')
        .eq('purchase_command_id', purchaseCommandId);
      setMissingProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching missing products:', err);
    }
  };

  const fetchPurchaseCommandProducts = async (purchaseCommandId: string) => {
    try {
      const { data } = await supabase
        .from('purchase_command_products')
        .select('*')
        .eq('purchase_command_id', purchaseCommandId);
      setPurchaseCommandProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching purchase command products:', err);
    }
  };

  const fetchBonDetails = async (bonId: string, purchaseCommandId: string) => {
    try {
      const [productsRes, offersRes] = await Promise.all([
        supabase
          .from('bons_commandes_products')
          .select('*')
          .eq('bon_commande_id', bonId),
        supabase
          .from('bons_commandes_offers')
          .select('*')
          .eq('bon_commande_id', bonId)
      ]);

      setBonProducts(productsRes.data || []);
      setBonOffers(offersRes.data || []);
      await fetchPurchaseCommandProducts(purchaseCommandId);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleValidation = async (cmdId: string) => {
    try {
      const { error } = await supabase
        .from('purchase_commands')
        .update({ status: 'validated' })
        .eq('id', cmdId);
      if (error) throw error;
      setMessage('Command validated!');
      setValidatingId(null);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleConvertToBons = async (cmdId: string) => {
    try {
      const purchaseCmd = commands.find(c => c.id === cmdId);
      if (!purchaseCmd) throw new Error('Purchase command not found');

      const bonId = await generateNextId('bons_commandes', 'bc', 'bon_id');
      const { data: bonData, error: bonError } = await supabase
        .from('bons_commandes')
        .insert({
          bon_id: bonId,
          purchase_command_id: cmdId,
          supplier_name: purchaseCmd.supplier_name || 'To be assigned',
          supplier_id: purchaseCmd.supplier_id || null,
          status: 'pending',
          total_price: 0,
          total_without_tva: 0,
          total_with_tva: 0,
          created_by_id: user?.id || ''
        })
        .select()
        .single();

      if (bonError) throw bonError;
      if (!bonData) throw new Error('Failed to create bon_commande');

      const { error: updateError } = await supabase
        .from('purchase_commands')
        .update({ status: 'finalized' })
        .eq('id', cmdId);

      if (updateError) throw updateError;

      setMessage('Bon de Commande created successfully!');
      setConvertingId(null);
      setManageBon(bonData);
      setActiveTab('products');
      await fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleProductChange = (idx: number, field: string, value: any) => {
    const updated = [...newProducts];
    const product = { ...updated[idx] };

    if (field === 'product_name') product.product_name = value;
    else if (field === 'barcode') product.barcode = value;
    else if (field === 'quantity') product.quantity = parseInt(value) || 1;
    else if (field === 'unity_price') product.unity_price = parseFloat(value) || 0;
    else if (field === 'tva_rate') product.tva_rate = parseFloat(value) || 19;

    // Calculate totals
    if (product.unity_price && product.quantity) {
      product.subtotal = product.unity_price * product.quantity;
      product.tva_amount = (product.subtotal * product.tva_rate) / 100;
      product.total_with_tva = product.subtotal + product.tva_amount;
    }

    updated[idx] = product;
    setNewProducts(updated);
  };

  const handleAddProductRow = () => {
    setNewProducts([...newProducts, { id: '', product_name: '', quantity: 1, unity_price: 0, tva_rate: 19, subtotal: 0, tva_amount: 0, total_with_tva: 0 }]);
  };

  const handleRemoveProductRow = (idx: number) => {
    setNewProducts(newProducts.filter((_, i) => i !== idx));
  };

  const handleSaveProducts = async () => {
    if (!manageBon) return;

    try {
      const validProducts = newProducts.filter(p => p.product_name && p.quantity);
      if (validProducts.length === 0) {
        setMessage('Please add at least one product');
        return;
      }

      const productsToInsert = validProducts.map(p => ({
        bon_commande_id: manageBon.id,
        product_name: p.product_name,
        barcode: p.barcode || null,
        quantity: p.quantity,
        unity_price: p.unity_price,
        tva_rate: p.tva_rate,
        subtotal: p.subtotal,
        tva_amount: p.tva_amount,
        total_with_tva: p.total_with_tva,
        is_active: true
      }));

      const { error } = await supabase
        .from('bons_commandes_products')
        .insert(productsToInsert);

      if (error) throw error;

      // Update bon totals
      const allProducts = [...bonProducts, ...productsToInsert];
      const totalWithoutTVA = allProducts.reduce((sum, p) => sum + (p.subtotal || 0), 0);
      const totalWithTVA = allProducts.reduce((sum, p) => sum + (p.total_with_tva || 0), 0);

      const { error: updateError } = await supabase
        .from('bons_commandes')
        .update({
          total_without_tva: totalWithoutTVA,
          total_with_tva: totalWithTVA,
          total_price: totalWithoutTVA
        })
        .eq('id', manageBon.id);

      if (updateError) throw updateError;

      setMessage('Products added successfully!');
      setNewProducts([{ id: '', product_name: '', quantity: 1, unity_price: 0, tva_rate: 19, subtotal: 0, tva_amount: 0, total_with_tva: 0 }]);
      await fetchBonDetails(manageBon.id, manageBon.purchase_command_id);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleAddOfferRow = () => {
    setNewOffers([...newOffers, { supplier_name: '', image_url: '', notes: '' }]);
  };

  const handleRemoveOfferRow = (idx: number) => {
    setNewOffers(newOffers.filter((_, i) => i !== idx));
  };

  const handleOfferChange = (idx: number, field: string, value: string) => {
    const updated = [...newOffers];
    updated[idx] = { ...updated[idx], [field]: value };
    setNewOffers(updated);
  };

  const handleImageUpload = async (idx: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file && manageBon) {
        try {
          setUploadingIdx(idx);
          const fileName = `${manageBon.bon_id}_offer_${idx}_${Date.now()}`;
          const { data, error } = await supabase.storage
            .from('offers')
            .upload(fileName, file);

          if (error) throw error;

          const { data: publicUrlData } = supabase.storage
            .from('offers')
            .getPublicUrl(fileName);

          handleOfferChange(idx, 'image_url', publicUrlData.publicUrl);
          setMessage('Image uploaded successfully!');
          setTimeout(() => setMessage(''), 2000);
        } catch (err: any) {
          setMessage(`Error uploading image: ${err.message}`);
        } finally {
          setUploadingIdx(null);
        }
      }
    };
    input.click();
  };

  const handleSaveOffers = async () => {
    if (!manageBon) return;

    try {
      const validOffers = newOffers.filter(o => o.supplier_name);
      if (validOffers.length === 0) {
        setMessage('Please add at least one offer');
        return;
      }

      const offersToInsert = validOffers.map(o => ({
        bon_commande_id: manageBon.id,
        supplier_name: o.supplier_name,
        image_url: o.image_url || null,
        image_path: null,
        notes: o.notes || null,
        offer_date: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('bons_commandes_offers')
        .insert(offersToInsert);

      if (error) throw error;

      setMessage('Offers saved successfully!');
      setNewOffers([{ supplier_name: '', image_url: '', notes: '' }]);
      await fetchBonDetails(manageBon.id, manageBon.purchase_command_id);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (cmdId: string) => {
    try {
      const { error } = await supabase
        .from('purchase_commands')
        .delete()
        .eq('id', cmdId);

      if (error) throw error;

      setMessage('Purchase command deleted!');
      setDeletingId(null);
      setCommands(commands.filter(c => c.id !== cmdId));
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${i18n.language === 'ar' ? 'rtl' : 'ltr'}`}>
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

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-3xl font-bold text-foreground mb-2"
      >
        {t('nav.purchase_commands')}
      </motion.h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={ShoppingCart} label={t('nav.purchase_commands')} value={commands.length} gradient="btn-gradient" delay={0.1} />
        <StatCard icon={Package} label={t('nav.bons_commandes')} value={bonsCount} gradient="btn-gradient-success" delay={0.15} />
        <StatCard icon={BarChart3} label={t('common.pending')} value={purchaseCommands.length} gradient="btn-gradient-warm" delay={0.2} />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        <p className="text-sm font-semibold text-foreground">{t('common.filter')}:</p>
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="pending">{t('common.pending')}</SelectItem>
            <SelectItem value="validated">{t('common.validated')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Commands Grid */}
      {filteredCommands.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="erp-card text-center py-12">
          <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">{t('common.no_data')}</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCommands.map((cmd, i) => (
              <motion.div
                key={cmd.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                className="group relative erp-card border-2 border-blue-100 dark:border-slate-700 hover:shadow-xl transition-all overflow-hidden"
              >
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-foreground text-lg">{cmd.command_id}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('common.date')}: {new Date(cmd.created_at).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-semibold">👤 {cmd.creator_name}</p>
                    </div>
                    <Badge className={cmd.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold'}>
                      {cmd.status === 'pending' ? t('common.pending') : t('common.validated')}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3">{t('common.material_command')}: {cmd.material_command_id}</p>
                  <div className="flex gap-1 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => {
                        setViewCmd(cmd);
                        fetchMissingProducts(cmd.id);
                      }}
                      className="gap-1 btn-gradient text-white font-semibold px-2 h-8 text-xs"
                    >
                      <Eye className="w-3 h-3" /> {t('common.view')}
                    </Button>
                    {cmd.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setValidatingId(cmd.id)}
                          className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2 h-8 text-xs"
                        >
                          <CheckCircle className="w-3 h-3" /> {t('common.validate')}
                        </Button>
                        {user?.role === 'purchase' && (
                          <Button
                            size="sm"
                            onClick={() => setConvertingId(cmd.id)}
                            className="gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2 h-8 text-xs"
                          >
                            <Package className="w-3 h-3" /> {t('common.convert')}
                          </Button>
                        )}
                      </>
                    )}
                    {cmd.status === 'validated' && user?.role === 'purchase' && (
                      <Button
                        size="sm"
                        onClick={() => setConvertingId(cmd.id)}
                        className="gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2 h-8 text-xs"
                      >
                        <Package className="w-3 h-3" /> {t('common.convert')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => setDeletingId(cmd.id)}
                      className="gap-1 bg-red-600 hover:bg-red-700 text-white font-semibold px-2 h-8 text-xs"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* View Details Dialog */}
      <Dialog open={!!viewCmd} onOpenChange={() => setViewCmd(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">{viewCmd?.command_id}</DialogTitle>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Supplier: {viewCmd?.supplier_name || 'N/A'}</p>
              </div>
              <Badge className={`text-white font-semibold text-base px-3 py-1 ${viewCmd?.status === 'validated' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                {viewCmd?.status.toUpperCase()}
              </Badge>
            </div>
          </DialogHeader>

          {viewCmd && (
            <div className="space-y-6 pr-6">
              {/* Info Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.date')}</p>
                  <p className="text-lg font-bold text-foreground">{new Date(viewCmd.created_at).toLocaleDateString()}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.supplier')}</p>
                  <p className="text-lg font-bold text-foreground">{viewCmd.supplier_name || 'N/A'}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">Material Command</p>
                  <p className="text-lg font-bold text-foreground">{viewCmd.material_command_id}</p>
                </div>
              </div>

              {/* Missing Products */}
              {missingProducts.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4">{t('common.missing_products')} ({missingProducts.length})</h3>
                  <div className="border border-blue-200 dark:border-slate-600 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-700 dark:to-slate-800">
                        <tr>
                          <th className="p-4 text-left font-bold">Product Name</th>
                          <th className="p-4 text-center font-bold">{t('common.quantity')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {missingProducts.map((product, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-blue-50 dark:bg-slate-700'}>
                            <td className="p-4 font-bold">{product.product_name}</td>
                            <td className="p-4 text-center">
                              <span className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-600 text-amber-700 dark:text-amber-100 rounded-full font-semibold text-xs">
                                {product.quantity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setViewCmd(null)}>
              {t('common.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Bon de Commande Dialog */}
      <Dialog open={!!manageBon} onOpenChange={() => setManageBon(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">{manageBon?.bon_id} - Manage Bon de Commande</DialogTitle>
          </DialogHeader>

          {manageBon && (
            <div className="space-y-6 pr-6">
              {/* Tabs */}
              <div className="flex gap-2 border-b border-blue-200 dark:border-slate-700">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`px-4 py-2 font-semibold transition-all ${
                    activeTab === 'products'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  📦 Products ({bonProducts.length})
                </button>
                <button
                  onClick={() => setActiveTab('offers')}
                  className={`px-4 py-2 font-semibold transition-all ${
                    activeTab === 'offers'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🎁 Offers ({bonOffers.length})
                </button>
                <button
                  onClick={() => setActiveTab('purchase_products')}
                  className={`px-4 py-2 font-semibold transition-all ${
                    activeTab === 'purchase_products'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  📋 Purchase Products ({purchaseCommandProducts.length})
                </button>
              </div>

              {/* Products Tab */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-foreground">Add Products</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-700 dark:to-slate-800">
                        <tr>
                          <th className="p-3 text-left font-bold">Product Name</th>
                          <th className="p-3 text-left font-bold">Barcode</th>
                          <th className="p-3 text-center font-bold">Qty</th>
                          <th className="p-3 text-right font-bold">Unit Price</th>
                          <th className="p-3 text-center font-bold">TVA %</th>
                          <th className="p-3 text-right font-bold">Total</th>
                          <th className="p-3 text-center font-bold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newProducts.map((product, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-blue-50 dark:bg-slate-700'}>
                            <td className="p-3">
                              <Input
                                value={product.product_name}
                                onChange={(e) => handleProductChange(idx, 'product_name', e.target.value)}
                                placeholder="Product name"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                value={product.barcode || ''}
                                onChange={(e) => handleProductChange(idx, 'barcode', e.target.value)}
                                placeholder="Barcode"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                value={product.quantity}
                                onChange={(e) => handleProductChange(idx, 'quantity', e.target.value)}
                                className="h-8 text-xs text-center"
                                min="1"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                value={product.unity_price}
                                onChange={(e) => handleProductChange(idx, 'unity_price', e.target.value)}
                                className="h-8 text-xs text-right"
                                placeholder="0"
                              />
                            </td>
                            <td className="p-3">
                              <Select value={product.tva_rate.toString()} onValueChange={(val) => handleProductChange(idx, 'tva_rate', val)}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">0%</SelectItem>
                                  <SelectItem value="9">9%</SelectItem>
                                  <SelectItem value="19">19%</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">
                              {product.total_with_tva.toLocaleString()} DA
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                size="sm"
                                onClick={() => handleRemoveProductRow(idx)}
                                className="h-7 w-7 p-0 bg-red-600 hover:bg-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddProductRow} className="gap-2" size="sm">
                      <Plus className="w-4 h-4" /> Add Product
                    </Button>
                    <Button onClick={handleSaveProducts} className="gap-2 bg-emerald-600 hover:bg-emerald-700" size="sm">
                      <Save className="w-4 h-4" /> Save Products
                    </Button>
                  </div>

                  {/* Saved Products */}
                  {bonProducts.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-bold text-foreground mb-4">Saved Products</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border border-blue-200 dark:border-slate-600 rounded-lg overflow-hidden">
                          <thead className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-700 dark:to-slate-800">
                            <tr>
                              <th className="p-3 text-left font-bold">Product Name</th>
                              <th className="p-3 text-center font-bold">Qty</th>
                              <th className="p-3 text-right font-bold">Unit Price</th>
                              <th className="p-3 text-center font-bold">TVA %</th>
                              <th className="p-3 text-right font-bold">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bonProducts.map((product, idx) => (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-blue-50 dark:bg-slate-700'}>
                                <td className="p-3 font-semibold">{product.product_name}</td>
                                <td className="p-3 text-center">{product.quantity}</td>
                                <td className="p-3 text-right">{product.unity_price.toLocaleString()} DA</td>
                                <td className="p-3 text-center">{product.tva_rate}%</td>
                                <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">
                                  {product.total_with_tva.toLocaleString()} DA
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Offers Tab */}
              {activeTab === 'offers' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-foreground">Add Offers</h3>
                  <div className="space-y-4">
                    {newOffers.map((offer, idx) => (
                      <div key={idx} className="p-4 border border-blue-200 dark:border-slate-600 rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Select value={offer.supplier_name || ''} onValueChange={(val) => handleOfferChange(idx, 'supplier_name', val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers.map(s => (
                                <SelectItem key={s.id} value={s.name || s.id}>{s.name || "Unnamed Supplier"}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={offer.notes || ''}
                            onChange={(e) => handleOfferChange(idx, 'notes', e.target.value)}
                            placeholder="Notes"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleImageUpload(idx)}
                            disabled={uploadingIdx === idx}
                            className="gap-2"
                          >
                            {uploadingIdx === idx ? <Loader className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                            Upload Image
                          </Button>
                          {offer.image_url && (
                            <div className="flex items-center gap-2">
                              <img src={offer.image_url} alt="offer" className="w-16 h-16 object-cover rounded" />
                              <span className="text-xs text-green-600">✓ Uploaded</span>
                            </div>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleRemoveOfferRow(idx)}
                            className="h-9 w-9 p-0 bg-red-600 hover:bg-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddOfferRow} className="gap-2" size="sm">
                      <Plus className="w-4 h-4" /> Add Offer
                    </Button>
                    <Button onClick={handleSaveOffers} className="gap-2 bg-emerald-600 hover:bg-emerald-700" size="sm">
                      <Save className="w-4 h-4" /> Save Offers
                    </Button>
                  </div>

                  {/* Saved Offers */}
                  {bonOffers.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-bold text-foreground mb-4">Saved Offers</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {bonOffers.map(offer => (
                          <div key={offer.id} className="p-4 border border-blue-200 dark:border-slate-600 rounded-lg">
                            {offer.image_url && (
                              <img src={offer.image_url} alt="offer" className="w-full h-40 object-cover rounded mb-3" />
                            )}
                            <p className="font-bold text-foreground">{offer.supplier_name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(offer.offer_date).toLocaleDateString()}
                            </p>
                            {offer.notes && (
                              <p className="text-sm text-foreground mt-2">{offer.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Purchase Command Products Tab */}
              {activeTab === 'purchase_products' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-foreground">Products from Purchase Command</h3>
                  {purchaseCommandProducts.length === 0 ? (
                    <p className="text-muted-foreground">No products found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border border-blue-200 dark:border-slate-600 rounded-lg overflow-hidden">
                        <thead className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-700 dark:to-slate-800">
                          <tr>
                            <th className="p-3 text-left font-bold">Product Name</th>
                            <th className="p-3 text-center font-bold">Quantity</th>
                            <th className="p-3 text-right font-bold">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchaseCommandProducts.map((product, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-blue-50 dark:bg-slate-700'}>
                              <td className="p-3 font-semibold">{product.product_name}</td>
                              <td className="p-3 text-center">{product.quantity}</td>
                              <td className="p-3 text-right">{product.price ? product.price.toLocaleString() + ' DA' : 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setManageBon(null)}>
              {t('common.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Validation Dialog */}
      <AlertDialog open={!!validatingId} onOpenChange={() => setValidatingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm_validation')}</AlertDialogTitle>
            <AlertDialogDescription>
              Validate command {validatingId}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (validatingId) handleValidation(validatingId);
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert Dialog */}
      <AlertDialog open={!!convertingId} onOpenChange={() => setConvertingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Bon de Commande</AlertDialogTitle>
            <AlertDialogDescription>
              Create new Bon de Commande from this purchase command?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (convertingId) handleConvertToBons(convertingId);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Command</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingId) handleDelete(deletingId);
              }}
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
