import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/supabase';
import { getPrintLabels, buildPrintHTML, openPrintWindow, formatDateLocale } from '@/lib/printUtils';
import { motion } from 'framer-motion';
import { Eye, CheckCircle, Search, Check, X, AlertCircle, Loader, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SupabaseCommand {
  id: string;
  command_id: string;
  status: 'pending' | 'validated' | 'purchase' | 'bon_commande' | 'payment' | 'finalized';
  created_by_id: string;
  created_at: string;
  command_products?: CommandProduct[];
  users?: { full_name: string; email: string } | null;
}

interface CommandProduct {
  id: string;
  command_id: string;
  product_name: string;
  quantity: number;
  price: number;
  note?: string;
}

interface ProductVerification {
  commandProductId: string;
  productName: string;
  quantity: number;
  exists: boolean | null; // null = not verified, true = exists, false = not found
  selectedInventoryProduct?: any;
  deductQuantity?: number; // User input for quantity to deduct
}

interface SupabaseProduct {
  id: string;
  name: string;
  category_id?: string;
  unity_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  supplier_id?: string;
  note?: string;
  categories?: { name: string } | null;
  unities?: { name: string; symbol: string } | null;
}

export default function CommandsManagementPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { enterpriseSettings } = useData();
  const [viewCmd, setViewCmd] = useState<SupabaseCommand | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [productVerifications, setProductVerifications] = useState<ProductVerification[]>([]);
  const [searchingProductId, setSearchingProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConvertDialog, setShowConvertDialog] = useState<string | null>(null);
  const [supabaseProducts, setSupabaseProducts] = useState<SupabaseProduct[]>([]);
  const [supabaseCommands, setSupabaseCommands] = useState<SupabaseCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertMessage, setConvertMessage] = useState('');
  const [pendingPrintCmd, setPendingPrintCmd] = useState<SupabaseCommand | null>(null);

  useEffect(() => {
    fetchCommandsFromDatabase();
    fetchProductsFromDatabase();
  }, [user?.id]);

  const fetchCommandsFromDatabase = async () => {
    try {
      if (!user?.id) return;

      let query = supabase
        .from('material_commands')
        .select(`
          id,
          command_id,
          status,
          created_by_id,
          created_at,
          command_products(
            id,
            command_id,
            product_name,
            quantity,
            price,
            note
          )
        `);

      // Chef de projet only sees their own commands
      // Storage and other roles see all commands
      if (user.role === 'chef_projet') {
        query = query.eq('created_by_id', user.id);
      }

      const { data, error } = await query.in('status', ['pending', 'validated']);

      if (error) throw error;
      
      // Map data to include user info from context
      const commandsWithUserInfo = (data as unknown as SupabaseCommand[]) || [];
      commandsWithUserInfo.forEach(cmd => {
        cmd.users = {
          full_name: user.fullName || 'N/A',
          email: user.email || 'N/A'
        };
      });
      
      setSupabaseCommands(commandsWithUserInfo);
    } catch (error) {
      console.error('Error fetching commands:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsFromDatabase = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          category_id,
          unity_id,
          quantity,
          unit_price,
          total_price,
          supplier_id,
          categories(name),
          unities(name, symbol)
        `);

      if (error) throw error;
      setSupabaseProducts((data as unknown as SupabaseProduct[]) || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search functionality for inventory
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return supabaseProducts.filter(p => {
      const nameMatch = p.name?.toLowerCase().includes(query) || false;
      const categoryMatch = p.categories?.name?.toLowerCase().includes(query) || false;
      return nameMatch || categoryMatch;
    });
  }, [searchQuery, supabaseProducts]);

  const startVerify = (cmd: SupabaseCommand) => {
    setVerifyingId(cmd.id);
    setSearchingProductId(null);
    setSearchQuery('');
    const initialVerifications: ProductVerification[] = (cmd.command_products || []).map(p => ({
      commandProductId: p.id,
      productName: p.product_name,
      quantity: p.quantity,
      exists: null,
      selectedInventoryProduct: undefined,
      deductQuantity: p.quantity,
    }));
    setProductVerifications(initialVerifications);
  };

  const setProductExists = (commandProductId: string, exists: boolean) => {
    setProductVerifications(prev =>
      prev.map(pv =>
        pv.commandProductId === commandProductId
          ? { ...pv, exists, selectedInventoryProduct: exists ? pv.selectedInventoryProduct : undefined }
          : pv
      )
    );
    if (exists) {
      setSearchingProductId(commandProductId);
      setSearchQuery('');
    } else {
      setSearchingProductId(null);
      setSearchQuery('');
    }
  };

  const selectInventoryProduct = (commandProductId: string, inventoryProduct: SupabaseProduct) => {
    setProductVerifications(prev =>
      prev.map(pv =>
        pv.commandProductId === commandProductId
          ? { ...pv, selectedInventoryProduct: inventoryProduct }
          : pv
      )
    );
    setSearchQuery('');
    setSearchingProductId(null);
  };

  const handleConvertAndDeduct = async () => {
    const cmdId = verifyingId;
    if (!cmdId) return;

    const cmd = supabaseCommands.find(c => c.id === cmdId);
    if (!cmd) return;

    try {
      // Check if there are any products not found
      const hasMissingProducts = productVerifications.some(pv => pv.exists === false);

      // Deduct existing products from inventory in Supabase using user-input quantities
      for (const pv of productVerifications) {
        if (pv.exists === true && pv.selectedInventoryProduct) {
          const quantityToDeduct = pv.deductQuantity || pv.quantity; // Use user-input quantity
          const newQuantity = Math.max(0, pv.selectedInventoryProduct.quantity - quantityToDeduct);
          
          const { error } = await supabase
            .from('products')
            .update({ quantity: newQuantity })
            .eq('id', pv.selectedInventoryProduct.id);

          if (error) throw error;
        }
      }

      // Refresh products after deduction
      await fetchProductsFromDatabase();

      // Update material command status
      let newStatus: 'purchase' | 'finalized' = 'finalized';
      
      if (hasMissingProducts) {
        const missingProducts = productVerifications.filter(pv => pv.exists === false);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        // Create purchase command in Supabase
        const purchaseCommandId = `PC-${Date.now()}`;
        
        const { data: purchaseCmd, error: purchaseError } = await supabase
          .from('purchase_commands')
          .insert([{
            command_id: purchaseCommandId,
            material_command_id: cmd.command_id,
            status: 'pending',
            supplier_id: null,
            supplier_name: null,
            created_by_id: user?.id || null
          }])
          .select()
          .single();

        if (purchaseError) {
          console.error('Error creating purchase command:', purchaseError);
          throw purchaseError;
        }

        // Insert ONLY missing products into purchase_command_products
        const productsToInsert = missingProducts.map(mp => {
          const cmdProduct = cmd.command_products?.find(p => p.id === mp.commandProductId);
          return {
            purchase_command_id: purchaseCmd.id,
            product_name: mp.productName,
            quantity: cmdProduct?.quantity || mp.quantity,
            price: cmdProduct?.price || 0,
            note: cmdProduct?.note || ''
          };
        });

        if (productsToInsert.length > 0) {
          const { error: productsError } = await supabase
            .from('purchase_command_products')
            .insert(productsToInsert);

          if (productsError) {
            console.error('Error inserting missing products:', productsError);
            throw productsError;
          }
        }
        
        newStatus = 'purchase';
      }

      // Update material command status in database
      const { error: updateError } = await supabase
        .from('material_commands')
        .update({ status: newStatus })
        .eq('id', cmdId);

      if (updateError) throw updateError;

      // Refresh commands
      await fetchCommandsFromDatabase();

      const verifiedCount = productVerifications.filter(pv => pv.exists === true && pv.selectedInventoryProduct).length;
      const notFoundCount = productVerifications.filter(pv => pv.exists === false).length;

      if (hasMissingProducts) {
        setConvertMessage(`${verifiedCount} product(s) verified and deducted. ${notFoundCount} product(s) not found - new Purchase Order created and visible in Commandes d'Achat.`);
      } else {
        setConvertMessage(`All ${verifiedCount} product(s) verified and deducted from inventory.`);
      }

      setShowConvertDialog(cmdId);
      setVerifyingId(null);
    } catch (error) {
      console.error('Error deducting products:', error);
      alert('Error deducting products from inventory');
    }
  };

  const verifyingCommand = supabaseCommands.find(c => c.id === verifyingId);
  const handlePrintCommand = (cmd: SupabaseCommand, lang: 'ar' | 'fr') => {
    const L = getPrintLabels(lang);
    const body = `
      <div class="details-grid">
        <div class="detail-item"><h3>${L.commandId}</h3><p>${cmd.command_id}</p></div>
        <div class="detail-item"><h3>${L.status}</h3><p>${cmd.status.toUpperCase()}</p></div>
        <div class="detail-item"><h3>${L.date}</h3><p>${formatDateLocale(cmd.created_at, lang)}</p></div>
      </div>
      <h2 class="section-title">${L.isAr ? 'قائمة المنتجات' : 'Liste des Produits'}</h2>
      <table><thead><tr><th style="width:5%;">#</th><th style="width:35%;">${L.productName}</th><th style="width:20%;">${L.quantity}</th><th style="width:20%;">${L.price}</th><th style="width:20%;">${L.notes}</th></tr></thead><tbody>
      ${cmd.command_products?.map((p, idx) => `<tr><td style="text-align:center;font-weight:bold;">${idx+1}</td><td class="product-name">${p.product_name}</td><td style="text-align:center;font-weight:bold;">${p.quantity}</td><td>${p.price} DA</td><td>${p.note || '-'}</td></tr>`).join('') || ''}
      </tbody></table>`;
    openPrintWindow(buildPrintHTML({ lang, docTitle: { ar: 'وثيقة أمر المواد', fr: 'Document de Commande Matériel' }, enterpriseSettings }, body));
  };

  const verifiedCount = productVerifications.filter(pv => pv.exists === true && pv.selectedInventoryProduct).length;
  const notFoundCount = productVerifications.filter(pv => pv.exists === false).length;
  const pendingCount = productVerifications.filter(pv => pv.exists === null).length;

  return (
    <div className={`space-y-6 ${i18n.language === 'ar' ? 'rtl' : 'ltr'}`}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{t('nav.commands_management')}</h1>
            <p className="text-muted-foreground">{t('common.select_available_products')}</p>
          </div>
          {loading && <Loader className="w-5 h-5 animate-spin text-primary" />}
        </div>
      </motion.div>

      {supabaseCommands.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="erp-card text-center py-12 text-muted-foreground">
          {t('common.no_data')}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {supabaseCommands.map((cmd, i) => (
            <motion.div 
              key={cmd.id} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.05 }} 
              className="relative group overflow-hidden rounded-xl border-2 border-blue-200 dark:border-slate-700 bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-slate-700 hover:shadow-2xl hover:border-blue-400 dark:hover:border-indigo-500 transition-all duration-300"
            >
              {/* Decoration circle */}
              <div className="absolute -top-8 -right-8 w-20 h-20 bg-gradient-to-br from-blue-300 to-indigo-300 dark:from-slate-600 dark:to-slate-500 rounded-full opacity-0 group-hover:opacity-20 group-hover:scale-150 transition-all duration-300" />

              <div className="relative p-5 space-y-4">
                {/* Header with accent bar */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="w-1.5 h-8 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full" />
                    <div className="flex-1">
                      <span className="font-bold text-lg text-blue-950 dark:text-blue-100">{cmd.command_id}</span>
                      <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">{t('common.created_by')}: {cmd.users?.full_name || 'N/A'}</p>
                    </div>
                  </div>
                  <Badge variant={cmd.status === 'pending' ? 'default' : 'secondary'} className={`capitalize text-xs font-bold px-3 py-1 ${cmd.status === 'pending' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'}`}>
                    {t(`common.${cmd.status}`)}
                  </Badge>
                </div>

                {/* Info section with better styling */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-lg border-l-4 border-l-blue-500 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">{t('common.date')}</p>
                    <p className="text-sm font-bold text-blue-950 dark:text-blue-100">{new Date(cmd.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-blue-200 dark:border-slate-600">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">{t('common.add_product')}</p>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold">
                      {cmd.command_products?.length || 0}
                    </span>
                  </div>
                </div>

                {/* Buttons with enhanced styling */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setViewCmd(cmd)} 
                    className="gap-1.5 flex-1 text-blue-600 hover:text-blue-700 border-blue-300 hover:bg-blue-50 dark:border-slate-600 dark:hover:bg-slate-700 dark:text-blue-300 font-semibold transition-all"
                  >
                    <Eye className="w-4 h-4" /> {t('common.view')}
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => startVerify(cmd)} 
                    className="gap-1.5 flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold transition-all"
                  >
                    <CheckCircle className="w-4 h-4" /> {t('common.verify')}
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setPendingPrintCmd(cmd)} 
                    className="gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold transition-all"
                    title={t('common.print') || 'Print'}
                  >
                    <Printer className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={!!viewCmd} onOpenChange={() => setViewCmd(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-600">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2">
                  <span className="w-1.5 h-8 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full" />
                  {viewCmd?.command_id}
                </DialogTitle>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">{t('common.view')} {t('common.verify_and_convert')}</p>
              </div>
              <Badge className={`text-xs font-bold px-3 py-2 capitalize ${viewCmd?.status === 'pending' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'}`}>
                {t(`common.${viewCmd?.status}`)}
              </Badge>
            </div>
          </DialogHeader>
          {viewCmd && (
            <div className="space-y-6 pr-6">
              {/* Command Info Grid */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-lg border-l-4 border-l-blue-600 space-y-0">
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-8 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full" />
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wide">{t('common.date')}</p>
                    <p className="font-bold text-blue-950 dark:text-blue-100">{new Date(viewCmd.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-8 bg-gradient-to-b from-indigo-600 to-blue-600 rounded-full" />
                  <div>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wide">{t('common.created_by')}</p>
                    <p className="font-semibold text-foreground">{viewCmd.users?.full_name || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-1 h-8 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase">{t('common.products')}</p>
                    <p className="font-semibold text-foreground">{viewCmd.command_products?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Products Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                  <h3 className="text-lg font-bold text-foreground">{t('common.products')}</h3>
                </div>
                <div className="space-y-2">
                  {(viewCmd.command_products || []).map((p, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: -20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: i * 0.05 }}
                      className="p-4 border-l-4 border-l-blue-500 bg-gradient-to-r from-white to-blue-50 dark:from-slate-800 dark:to-slate-700 hover:shadow-md transition-all rounded-r-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{p.product_name}</p>
                          <div className="text-xs text-muted-foreground mt-2 space-y-1">
                            <p>Qty: <span className="font-semibold text-blue-600 dark:text-blue-300">{p.quantity}</span></p>
                            {p.note && <p>Note: {p.note}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-blue-600 dark:text-blue-300">{p.price} DA</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verify Products Dialog */}
      <Dialog open={!!verifyingId} onOpenChange={() => { setVerifyingId(null); setProductVerifications([]); setSearchQuery(''); setSearchingProductId(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">{t('common.verify_products')}</DialogTitle>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Command ID: {verifyingId}</p>
              </div>
              <div className="text-xs font-semibold text-white flex gap-2">
                <span className="flex items-center gap-2 bg-emerald-600 px-3 py-2 rounded-lg">
                  <Check className="w-4 h-4" /> {verifiedCount}
                </span>
                <span className="flex items-center gap-2 bg-red-600 px-3 py-2 rounded-lg">
                  <X className="w-4 h-4" /> {notFoundCount}
                </span>
                <span className="flex items-center gap-2 bg-amber-600 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" /> {pendingCount}
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pr-6">
            {/* Products Verification List */}
            <div className="space-y-3">
              {verifyingCommand?.command_products?.map((cmdProduct, idx) => {
                const pv = productVerifications.find(p => p.commandProductId === cmdProduct.id);
                if (!pv) return null;

                return (
                  <motion.div 
                    key={cmdProduct.id} 
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: idx * 0.05 }}
                    className="border-l-4 border-l-blue-500 rounded-r-lg p-4 bg-gradient-to-r from-white to-blue-50 dark:from-slate-800 dark:to-slate-700 hover:shadow-lg transition-all"
                  >
                    {/* Product Info Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-foreground">{cmdProduct.product_name}</h4>
                        <p className="text-sm text-muted-foreground mt-2 flex gap-4">
                          <span className="flex items-center gap-1"><span className="font-bold text-blue-600">Qty:</span> {cmdProduct.quantity}</span>
                          <span className="flex items-center gap-1"><span className="font-bold text-blue-600">Price:</span> {cmdProduct.price} DA</span>
                        </p>
                      </div>
                      {pv.exists === true && (
                        <Badge className="bg-emerald-600 text-white font-bold px-3 py-2 text-sm">{t('common.in_stock')}</Badge>
                      )}
                      {pv.exists === false && (
                        <Badge className="bg-red-600 text-white font-bold px-3 py-2 text-sm">{t('common.out_of_stock')}</Badge>
                      )}
                      {pv.exists === null && (
                        <Badge className="bg-amber-600 text-white font-bold px-3 py-2 text-sm">Pending</Badge>
                      )}
                    </div>

                    {/* Verification Buttons */}
                    <div className="grid grid-cols-2 gap-3 mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-lg border border-blue-100 dark:border-slate-600">
                      <Button
                        size="sm"
                        className={`gap-2 font-semibold transition-all ${
                          pv.exists === true 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300' 
                            : 'bg-slate-200 hover:bg-slate-300 text-foreground dark:bg-slate-600 dark:hover:bg-slate-500'
                        }`}
                        onClick={() => setProductExists(cmdProduct.id, true)}
                      >
                        <Check className="w-4 h-4" /> {t('common.product_exists')}
                      </Button>
                      <Button
                        size="sm"
                        className={`gap-2 font-semibold transition-all ${
                          pv.exists === false 
                            ? 'bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-300' 
                            : 'bg-slate-200 hover:bg-slate-300 text-foreground dark:bg-slate-600 dark:hover:bg-slate-500'
                        }`}
                        onClick={() => setProductExists(cmdProduct.id, false)}
                      >
                        <X className="w-4 h-4" /> {t('common.product_not_found')}
                      </Button>
                    </div>

                    {/* Search Field - Only show when product is marked as exists and no product selected yet */}
                    {pv.exists === true && !pv.selectedInventoryProduct && searchingProductId === cmdProduct.id && (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder={`${t('common.search_inventory')} - ${cmdProduct.product_name}`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                            autoFocus
                          />
                        </div>

                        {/* Search Results Dropdown */}
                        {searchQuery && filteredProducts.length > 0 && (
                          <div className="bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                            {filteredProducts.map(p => (
                              <button
                                key={p.id}
                                className="w-full text-left p-3 hover:bg-secondary/50 border-b last:border-b-0 transition-colors"
                                onClick={() => selectInventoryProduct(cmdProduct.id, p)}
                              >
                                <div className="font-medium text-sm text-foreground">{p.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {p.quantity} {p.unities?.symbol || p.unities?.name} • {p.unit_price} DA • {p.categories?.name}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {searchQuery && filteredProducts.length === 0 && (
                          <div className="p-3 text-center text-sm text-muted-foreground bg-secondary/50 rounded-lg">
                            {t('common.no_results')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Selected Product Display with Quantity Input */}
                    {pv.exists === true && pv.selectedInventoryProduct && (
                      <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-2 border-emerald-300 dark:border-emerald-700 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-emerald-900">{pv.selectedInventoryProduct.name}</p>
                            <p className="text-xs text-emerald-700 mt-1">
                              {t('common.available')}: {pv.selectedInventoryProduct.quantity} {pv.selectedInventoryProduct.unities?.symbol || pv.selectedInventoryProduct.unities?.name}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Check className="w-5 h-5 text-emerald-600" />
                            <button
                              onClick={() => {
                                setProductVerifications(prev =>
                                  prev.map(p => 
                                    p.commandProductId === cmdProduct.id 
                                      ? { ...p, selectedInventoryProduct: undefined, exists: null }
                                      : p
                                  )
                                );
                                setSearchQuery('');
                              }}
                              className="text-emerald-600 hover:text-emerald-800 font-medium text-xs"
                            >
                              ✕ {t('common.change')}
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-emerald-900">
                            {t('common.quantity')} {t('common.to_deduct')}
                          </label>
                          <Input
                            type="number"
                            min="1"
                            max={Math.min(pv.quantity, pv.selectedInventoryProduct.quantity)}
                            value={pv.deductQuantity || pv.quantity}
                            onChange={(e) => {
                              const newQty = Math.min(parseInt(e.target.value) || 0, pv.selectedInventoryProduct.quantity);
                              setProductVerifications(prev =>
                                prev.map(p => 
                                  p.commandProductId === cmdProduct.id 
                                    ? { ...p, deductQuantity: newQty }
                                    : p
                                )
                              );
                            }}
                            className="h-8 text-xs"
                          />
                          <p className="text-xs text-emerald-600">
                            ✓ {t('common.will_deduct')} {pv.deductQuantity || pv.quantity} {t('common.from_inventory')}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Not Found Info */}
                    {pv.exists === false && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-700">
                          ⚠ {t('common.will_convert_to_purchase_order')}
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Info Box with Enhanced Design */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 border-l-4 border-l-blue-600 rounded-r-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-950 dark:text-blue-100 mb-2">{t('common.verify_and_convert')}</p>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1.5">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> {t('common.products_will_be_deducted')}</li>
                    <li className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-600" /> {t('common.products_will_be_purchase_order')}</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-600" /> {t('common.if_all_exist')}</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-600" /> {t('common.if_any_missing')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-6 border-t border-blue-200 dark:border-slate-600">
            <Button 
              variant="outline" 
              onClick={() => { setVerifyingId(null); setProductVerifications([]); setSearchQuery(''); setSearchingProductId(null); }}
              className="border-blue-200 hover:bg-blue-50 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleConvertAndDeduct}
              disabled={pendingCount > 0}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white gap-2 transition-all ring-2 ring-emerald-200 dark:ring-emerald-900"
              title={pendingCount > 0 ? 'Please verify all products' : ''}
            >
              <CheckCircle className="w-4 h-4" />
              {t('common.convert_purchase_command')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Confirmation Dialog */}
      <AlertDialog open={!!showConvertDialog} onOpenChange={() => setShowConvertDialog(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700">
          <AlertDialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 -mx-6 -mt-6 px-6 py-4 rounded-t-lg border-b border-blue-200 dark:border-slate-600">
            <AlertDialogTitle className="text-xl font-bold text-blue-950 dark:text-blue-100">{t('common.verify_and_convert')}</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            {verifiedCount > 0 && (
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-l-4 border-l-emerald-600 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                    {verifiedCount} product(s) verified and deducted from inventory
                  </p>
                </div>
              </div>
            )}
            {notFoundCount > 0 && (
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-800/20 border-l-4 border-l-amber-600 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    {notFoundCount} product(s) not found and will be converted to Purchase Order
                  </p>
                </div>
              </div>
            )}
          </div>
          <AlertDialogFooter className="gap-2 border-t border-blue-200 dark:border-slate-600 pt-4">
            <AlertDialogCancel className="border-blue-200 hover:bg-blue-50 dark:border-slate-600 dark:hover:bg-slate-700">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white transition-all gap-2">
              <CheckCircle className="w-4 h-4" />
              {t('common.confirm')}
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
            <Button onClick={() => { if (pendingPrintCmd) handlePrintCommand(pendingPrintCmd, 'ar'); setPendingPrintCmd(null); }} className="h-24 flex flex-col gap-2 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-lg rounded-xl shadow-lg">
              <span className="text-2xl">🇩🇿</span> {t('common.print_in_arabic')}
            </Button>
            <Button onClick={() => { if (pendingPrintCmd) handlePrintCommand(pendingPrintCmd, 'fr'); setPendingPrintCmd(null); }} className="h-24 flex flex-col gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-xl shadow-lg">
              <span className="text-2xl">🇫🇷</span> {t('common.print_in_french')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
