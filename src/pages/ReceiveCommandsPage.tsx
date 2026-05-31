import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, MessageSquare, Printer, Loader, Eye, X, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPrintLabels, buildPrintHTML, openPrintWindow, formatDateLocale, getSignaturesHTML } from '@/lib/printUtils';

interface CommandProduct {
  id: string;
  product_name: string;
  quantity: number;
}

interface ReclamationItem {
  id: string;
  message: string;
  status: string;
  created_at: string;
  created_by: string;
  reclamation_products?: Array<{ product_name: string; quantity: number }>;
  reclamation_responses?: Array<{ response_message: string; responded_by: string; created_at: string }>;
}

interface ReceiveCommand {
  id: string;
  reception_id: string;
  supplier_name: string;
  status: string;
  created_at: string;
  total_quantity: number;
  total_price: number;
  command_products?: CommandProduct[];
}

export default function ReceiveCommandsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { enterpriseSettings } = useData();
  const isRtl = i18n.language === 'ar';
  
  const [commands, setCommands] = useState<ReceiveCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [reclamationCmd, setReclamationCmd] = useState<ReceiveCommand | null>(null);
  const [reclamationMessage, setReclamationMessage] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [viewingCmd, setViewingCmd] = useState<ReceiveCommand | null>(null);
  const [showReclamationHistory, setShowReclamationHistory] = useState<string | null>(null);
  const [reclamationHistory, setReclamationHistory] = useState<ReclamationItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pendingPrintCmd, setPendingPrintCmd] = useState<ReceiveCommand | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch reception products which are the received commands
      const { data, error } = await supabase
        .from('reception_products')
        .select(`
          id, reception_id, supplier_name, status, created_at, 
          total_quantity, total_price,
          reception_product_items (
            id, product_name, quantity
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to match our interface
      const transformedData = (data as any)?.map((reception: any) => ({
        id: reception.id,
        reception_id: reception.reception_id,
        supplier_name: reception.supplier_name,
        status: reception.status,
        created_at: reception.created_at,
        total_quantity: reception.total_quantity,
        total_price: reception.total_price,
        command_products: reception.reception_product_items || []
      })) || [];
      
      setCommands(transformedData);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (cmdId: string) => {
    try {
      // Update reception status to 'received'
      const { error: updateError } = await supabase
        .from('reception_products')
        .update({ status: 'received' })
        .eq('id', cmdId);
      
      if (updateError) throw updateError;

      // Record validation in command_validations table
      const { error: valError } = await supabase
        .from('command_validations')
        .insert({
          reception_products_id: cmdId,
          validated_by: user?.id,
          status: 'validated'
        });

      if (valError) throw valError;

      setMessage('Command validated successfully!');
      setValidatingId(null);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleReclamation = async () => {
    if (!reclamationCmd || selectedProducts.length === 0) {
      setMessage('Please select at least one product');
      return;
    }

    try {
      // Create reclamation record
      const { data: recData, error: recError } = await supabase
        .from('reclamations')
        .insert({
          reception_products_id: reclamationCmd.id,
          receive_command_id: reclamationCmd.id, // Keep for backward compatibility
          message: reclamationMessage,
          status: 'pending',
          created_by: user?.id
        })
        .select();

      if (recError) throw recError;
      if (!recData?.[0]) throw new Error('Failed to create reclamation');

      // Add selected products to reclamation_products
      const prodData = selectedProducts.map(productId => {
        const product = reclamationCmd.command_products?.find(p => p.id === productId);
        return {
          reclamation_id: recData[0].id,
          product_id: null, // Don't reference product_id - we track by name and quantity
          product_name: product?.product_name,
          quantity: product?.quantity
        };
      });

      const { error: prodError } = await supabase
        .from('reclamation_products')
        .insert(prodData);

      if (prodError) throw prodError;

      setMessage('Reclamation filed successfully!');
      setReclamationCmd(null);
      setReclamationMessage('');
      setSelectedProducts([]);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleProductToggle = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const fetchReclamationHistory = async (receptionProductsId: string) => {
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('reclamations')
        .select(`
          id,
          message,
          status,
          created_at,
          created_by,
          reclamation_products (product_name, quantity),
          reclamation_responses (response_message, responded_by, created_at)
        `)
        .eq('reception_products_id', receptionProductsId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReclamationHistory(data || []);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewReclamationHistory = (receptionProductsId: string) => {
    setShowReclamationHistory(receptionProductsId);
    fetchReclamationHistory(receptionProductsId);
  };

  const handlePrint = (cmd: ReceiveCommand, lang: 'ar' | 'fr') => {
    const L = getPrintLabels(lang);

    const body = `
      <div class="details-grid">
        <div class="detail-item"><h3>${L.isAr ? 'معرف الاستقبال' : 'ID de Réception'}</h3><p>${cmd.reception_id}</p></div>
        <div class="detail-item"><h3>${L.status}</h3><p>${cmd.status.toUpperCase()}</p></div>
        <div class="detail-item"><h3>${L.date}</h3><p>${formatDateLocale(cmd.created_at, lang)}</p></div>
        <div class="detail-item"><h3>${L.supplier}</h3><p>${cmd.supplier_name}</p></div>
        <div class="detail-item"><h3>${L.isAr ? 'الكمية الإجمالية' : 'Quantité Totale'}</h3><p>${cmd.total_quantity}</p></div>
        <div class="detail-item"><h3>${L.totalPrice}</h3><p>${cmd.total_price?.toLocaleString()} DA</p></div>
      </div>
      <h2 class="section-title">${L.isAr ? 'المنتجات المستقبلة' : 'Produits Reçus'}</h2>
      <table>
        <thead>
          <tr>
            <th style="width:10%;">#</th>
            <th style="width:60%;">${L.productName}</th>
            <th style="width:30%;">${L.quantity}</th>
          </tr>
        </thead>
        <tbody>
          ${cmd.command_products?.map((p, idx) => `
            <tr>
              <td style="text-align:center;font-weight:bold;">${idx + 1}</td>
              <td class="product-name">${p.product_name}</td>
              <td style="text-align:center;font-weight:bold;">${p.quantity}</td>
            </tr>
          `).join('') || `<tr><td colspan="3" style="text-align:center;padding:20px;color:#999;">${L.noData}</td></tr>`}
        </tbody>
      </table>
    `;
    openPrintWindow(buildPrintHTML({
      lang,
      docTitle: { ar: 'وثيقة الاستقبال', fr: 'Document de Réception' },
      docId: cmd.reception_id,
      docDate: formatDateLocale(cmd.created_at, lang),
      enterpriseSettings,
      signaturesHTML: getSignaturesHTML(lang, L.receivedBy),
    }, body));
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
          className={`p-4 rounded-lg ${
            message.includes('Error')
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {message}
        </motion.div>
      )}

      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">{t('nav.receive_commands')}</h1>
      {commands.length === 0 ? (
        <div className="erp-card text-center py-12 text-muted-foreground">{t('common.no_data')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {commands.map((cmd, i) => (
            <motion.div 
              key={cmd.id} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.05 }} 
              className="group relative erp-card border-2 border-blue-100 dark:border-slate-700 hover:shadow-xl transition-all overflow-hidden"
            >
              {/* Decoration circle */}
              <div className="absolute -top-8 -right-8 w-16 h-16 bg-gradient-to-br from-blue-200 to-indigo-200 dark:from-slate-700 dark:to-slate-800 rounded-full opacity-0 group-hover:opacity-100 group-hover:scale-150 transition-all duration-300" />
              
              <div className="relative z-10 space-y-4">
                {/* Header with accent bar */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">{t('common.reception_id')}</p>
                      <span className="font-bold text-lg text-foreground">{cmd.reception_id}</span>
                    </div>
                  </div>
                  <Badge 
                    className={`text-white font-semibold capitalize text-xs px-3 py-1 ${
                      cmd.status === 'received' || cmd.status === 'completed'
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                  >
                    {t(`common.${cmd.status}`)}
                  </Badge>
                </div>
                
                {/* Supplier info with accent */}
                <div className="flex items-center gap-2 pl-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-lg border-l-4 border-l-blue-500">
                  <span>📦</span>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">{t('common.supplier')}</p>
                    <p className="text-sm font-medium text-foreground">{cmd.supplier_name}</p>
                  </div>
                </div>

                {/* Info grid with accents */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-lg border border-blue-100 dark:border-slate-600">
                    <p className="text-xs text-muted-foreground font-semibold">{t('common.date')}</p>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">{new Date(cmd.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-lg border border-blue-100 dark:border-slate-600">
                    <p className="text-xs text-muted-foreground font-semibold">{t('common.quantity')}</p>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">{cmd.total_quantity}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-lg border border-blue-100 dark:border-slate-600">
                    <p className="text-xs text-muted-foreground font-semibold">{t('common.total_price')}</p>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">{cmd.total_price} DA</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-lg border border-blue-100 dark:border-slate-600">
                    <p className="text-xs text-muted-foreground font-semibold">{t('common.products')}</p>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">{cmd.command_products?.length || 0}</p>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 flex-wrap pt-2">
                  <Button 
                    size="sm" 
                    onClick={() => setViewingCmd(cmd)} 
                    className="gap-1.5 btn-gradient text-xs font-semibold flex-1"
                  >
                    <Eye className="w-4 h-4" /> {t('common.view')}
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => handleViewReclamationHistory(cmd.id)}
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex-1"
                  >
                    <History className="w-4 h-4" /> {t('common.history')}
                  </Button>
                  {cmd.status !== 'received' && (
                    <Button 
                      size="sm" 
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex-1"
                      onClick={() => setValidatingId(cmd.id)}
                    >
                      <CheckCircle className="w-4 h-4" /> {t('common.validate')}
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    onClick={() => setReclamationCmd(cmd)} 
                    className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setPendingPrintCmd(cmd)} 
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    <Printer className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* View Command Details Dialog */}
      <Dialog open={!!viewingCmd} onOpenChange={() => setViewingCmd(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">{viewingCmd?.reception_id}</DialogTitle>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Supplier: {viewingCmd?.supplier_name}</p>
              </div>
              <Badge className={`text-white font-semibold capitalize text-base px-3 py-1 ${viewingCmd?.status === 'received' ? 'bg-emerald-500' : viewingCmd?.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                {t(`common.${viewingCmd?.status}`)}
              </Badge>
            </div>
          </DialogHeader>

          {viewingCmd && (
            <div className="space-y-6 pr-6">
              {/* Info Grid with Accent Bars */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-lg border-l-4 border-l-blue-500">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.date')}</p>
                  <p className="text-lg font-bold text-foreground">{new Date(viewingCmd.created_at).toLocaleDateString()}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-lg border-l-4 border-l-indigo-500">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.quantity')}</p>
                  <p className="text-lg font-bold text-foreground">{viewingCmd.total_quantity}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-lg border-l-4 border-l-blue-500">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.total_price')}</p>
                  <p className="text-lg font-bold text-foreground">{viewingCmd.total_price} DA</p>
                </div>
              </div>

              {viewingCmd.command_products && viewingCmd.command_products.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                    {t('common.products')} ({viewingCmd.command_products.length})
                  </h3>
                  <div className="border border-blue-200 dark:border-slate-600 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-700 dark:to-slate-800 border-b border-blue-200 dark:border-slate-600">
                        <tr>
                          <th className="p-4 text-left font-bold text-blue-950 dark:text-blue-100">{t('common.product_name')}</th>
                          <th className="p-4 text-center font-bold text-blue-950 dark:text-blue-100">{t('common.quantity')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingCmd.command_products.map((p, idx) => (
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
                            <td className="p-4 text-center">
                              <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-slate-600 text-blue-700 dark:text-blue-300 rounded-full font-semibold text-sm">
                                {p.quantity}
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

          <div className="flex gap-3 justify-end pt-4 border-t border-blue-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setViewingCmd(null)} className="font-semibold">
              {t('common.close')}
            </Button>
            <Button onClick={() => viewingCmd && setPendingPrintCmd(viewingCmd)} className="gap-2 btn-gradient text-white font-semibold">
              <Printer className="w-4 h-4" /> {t('common.print')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Validation Confirmation Dialog */}
      <AlertDialog open={!!validatingId} onOpenChange={() => setValidatingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm_validation')}</AlertDialogTitle>
            <AlertDialogDescription>{validatingId}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (validatingId) { handleValidation(validatingId); } }}>
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reclamation Dialog with Product Selection */}
      <Dialog open={!!reclamationCmd} onOpenChange={() => { setReclamationCmd(null); setReclamationMessage(''); setSelectedProducts([]); }}>
        <DialogContent className="max-w-lg" aria-describedby="reclamation-dialog">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <div className="flex items-center justify-between w-full">
              <div>
                <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">{t('common.reclamation')}</DialogTitle>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">ID: {reclamationCmd?.reception_id}</p>
              </div>
              <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </DialogHeader>
          <div className="space-y-4 pr-6" id="reclamation-dialog">
            <div>
              <label className="text-sm font-semibold mb-3 block text-foreground">{t('common.select_products')}</label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {reclamationCmd?.command_products?.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-lg border border-blue-200 dark:border-slate-600 hover:shadow-md transition-shadow">
                    <Checkbox 
                      id={p.id}
                      checked={selectedProducts.includes(p.id)}
                      onCheckedChange={() => handleProductToggle(p.id)}
                    />
                    <label htmlFor={p.id} className="flex-1 cursor-pointer">
                      <p className="font-semibold text-sm text-foreground">{p.product_name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {p.quantity}</p>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block text-foreground">{t('common.message')}</label>
              <Textarea 
                value={reclamationMessage} 
                onChange={(e) => setReclamationMessage(e.target.value)} 
                placeholder={t('common.enter_message')} 
                rows={4}
                className="border-2 border-blue-200 dark:border-slate-600 focus:border-blue-600 dark:focus:border-blue-400"
              />
            </div>
          </div>
          <DialogFooter className="border-t pt-4 mt-6">
            <Button variant="outline" onClick={() => { setReclamationCmd(null); setReclamationMessage(''); setSelectedProducts([]); }} className="border-blue-200 hover:bg-blue-50 dark:border-slate-600 dark:hover:bg-slate-800">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleReclamation} className="btn-gradient text-white font-semibold border-0">
              {t('common.send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reclamation History Dialog */}
      <Dialog open={!!showReclamationHistory} onOpenChange={() => setShowReclamationHistory(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" aria-describedby="reclamation-history">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <div className="flex items-center justify-between w-full">
              <div>
                <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2">
                  <History className="w-6 h-6 text-blue-600 dark:text-blue-400" /> {t('common.history')} - {t('common.reclamation')}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          {loadingHistory ? (
            <div className="flex items-center justify-center h-40">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : reclamationHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('common.no_data')}
            </div>
          ) : (
            <div className="space-y-3 pr-6" id="reclamation-history">
              {reclamationHistory.map((reclamation, idx) => (
                <motion.div
                  key={reclamation.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="border-2 border-blue-200 dark:border-slate-600 rounded-lg p-4 bg-gradient-to-r from-white to-blue-50 dark:from-slate-700 dark:to-slate-800 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`text-white font-semibold capitalize ${reclamation.status === 'resolved' ? 'bg-emerald-600' : 'bg-amber-500'}`}>
                          {reclamation.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                          {new Date(reclamation.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground font-semibold">
                        {t('common.created_by')}: <span className="text-blue-600 dark:text-blue-400">{reclamation.created_by || 'Unknown'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="mb-3 p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 rounded">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">{t('common.message')}:</p>
                    <p className="text-sm text-foreground">{reclamation.message}</p>
                  </div>

                  {/* Products */}
                  {reclamation.reclamation_products && reclamation.reclamation_products.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-2">{t('common.products')}:</p>
                      <div className="space-y-1.5">
                        {reclamation.reclamation_products.map((prod, pIdx) => (
                          <div key={pIdx} className="flex justify-between text-sm ml-2 p-2 bg-blue-50 dark:bg-slate-700 rounded border border-blue-200 dark:border-slate-600">
                            <span className="font-semibold text-foreground">{prod.product_name}</span>
                            <Badge variant="outline" className="border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400">{prod.quantity} {t('common.unity')}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Responses */}
                  {reclamation.reclamation_responses && reclamation.reclamation_responses.length > 0 && (
                    <div className="border-t border-blue-200 dark:border-slate-600 pt-3">
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-2">{t('common.response')}:</p>
                      <div className="space-y-2">
                        {reclamation.reclamation_responses.map((resp, rIdx) => (
                          <div key={rIdx} className="ml-2 p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/30 rounded border-l-4 border-emerald-600 dark:border-emerald-400">
                            <p className="text-xs text-muted-foreground mb-1 font-semibold">
                              <span className="text-emerald-600 dark:text-emerald-400">{resp.responded_by}</span> • {new Date(resp.created_at).toLocaleString()}
                            </p>
                            <p className="text-sm text-foreground">{resp.response_message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          <DialogFooter className="border-t pt-4 mt-6">
            <Button variant="outline" onClick={() => setShowReclamationHistory(null)} className="border-blue-200 hover:bg-blue-50 dark:border-slate-600 dark:hover:bg-slate-800">
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                if (pendingPrintCmd) handlePrint(pendingPrintCmd, 'ar');
                setPendingPrintCmd(null);
              }}
              className="h-24 flex flex-col gap-2 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-lg rounded-xl shadow-lg"
            >
              <span className="text-2xl">🇩🇿</span>
              {t('common.print_in_arabic')}
            </Button>
            <Button
              onClick={() => {
                if (pendingPrintCmd) handlePrint(pendingPrintCmd, 'fr');
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