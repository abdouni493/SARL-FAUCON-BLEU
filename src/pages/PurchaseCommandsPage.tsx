import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { motion } from 'framer-motion';
import { Eye, CheckCircle, Package, ShoppingCart, Filter, Loader, Trash2, Printer, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  const [commands, setCommands] = useState<PurchaseCommand[]>([]);
  const [bonsCount, setBonsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewCmd, setViewCmd] = useState<PurchaseCommand | null>(null);
  const [missingProducts, setMissingProducts] = useState<MissingProduct[]>([]);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'validated'>('all');
  const [message, setMessage] = useState('');
  const [pendingPrintCmd, setPendingPrintCmd] = useState<PurchaseCommand | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cmdRes, bonsRes] = await Promise.all([
        supabase
          .from('purchase_commands')
          .select(`
            id, command_id, status, created_by_id, created_at,
            material_command_id, supplier_id, supplier_name
          `)
          .order('created_at', { ascending: false }),
        supabase.from('bons_commandes').select('id')
      ]);

      if (cmdRes.error) throw cmdRes.error;
      if (bonsRes.error) throw bonsRes.error;

      // Fetch creator names for each command
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
      // Fetch missing products directly from purchase_command_products table
      const { data: productsData } = await supabase
        .from('purchase_command_products')
        .select('product_name, quantity')
        .eq('purchase_command_id', purchaseCommandId);

      if (productsData && productsData.length > 0) {
        setMissingProducts(productsData);
      } else {
        setMissingProducts([]);
      }
    } catch (err: any) {
      console.error('Error fetching missing products:', err);
      setMissingProducts([]);
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
      // Get the purchase command details
      const purchaseCmd = commands.find(c => c.id === cmdId);
      if (!purchaseCmd) throw new Error('Purchase command not found');

      // Get missing products for this command
      const { data: productsData, error: prodError } = await supabase
        .from('purchase_command_products')
        .select('*')
        .eq('purchase_command_id', cmdId);
      
      if (prodError) throw prodError;

      // Create new bon_commande with proper structure
      const bonId = `BON-${Date.now()}`;
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
          created_by_id: user?.id || '',
          notes: `Converted from Purchase Command: ${purchaseCmd.command_id}`
        })
        .select('id')
        .single();

      if (bonError) throw bonError;
      if (!bonData) throw new Error('Failed to create bon_commande');

      // Update purchase command status to finalized
      const { error: updateError } = await supabase
        .from('purchase_commands')
        .update({ status: 'finalized' })
        .eq('id', cmdId);
      
      if (updateError) throw updateError;

      setMessage('Converted to Bon de Commande successfully!');
      setConvertingId(null);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handlePrintCommand = async (cmd: PurchaseCommand, lang: 'ar' | 'fr') => {
    // Fetch actual products for this purchase command
    const { data: productsData } = await supabase
      .from('purchase_command_products')
      .select('product_name, quantity')
      .eq('purchase_command_id', cmd.id);

    const products = productsData || [];
    const printWindow = window.open('', '', 'height=1000,width=1200');
    if (!printWindow) return;

    const isAr = lang === 'ar';
    const dir = isAr ? 'rtl' : 'ltr';
    const fontFamily = isAr ? "'Tajawal', 'Arial', sans-serif" : "'Arial', sans-serif";
    const labels = isAr ? {
      docTitle: 'وثيقة أمر الشراء',
      commandId: 'رقم أمر الشراء',
      status: 'الحالة',
      date: 'التاريخ',
      address: 'العنوان',
      phone: 'الهاتف',
      supplier: 'المورد',
      materialCmd: 'أمر المواد',
      createdBy: 'أنشأه',
      productsList: 'المنتجات للطلب',
      productName: 'اسم المنتج',
      quantity: 'الكمية',
      noProducts: 'لا توجد منتجات',
      cachet: 'الختم',
      signature: 'التوقيع',
      preparedBy: 'أعدّ من طرف',
      approvedBy: 'صادق عليه',
      generatedOn: 'تم الإنشاء بتاريخ',
      allRights: 'جميع الحقوق محفوظة'
    } : {
      docTitle: "Document de Commande d'Achat",
      commandId: "ID Commande d'Achat",
      status: 'Statut',
      date: 'Date',
      address: 'Adresse',
      phone: 'Téléphone',
      supplier: 'Fournisseur',
      materialCmd: 'Commande Matériel',
      createdBy: 'Créé par',
      productsList: 'Produits à Commander',
      productName: 'Nom du Produit',
      quantity: 'Quantité',
      noProducts: 'Aucun produit',
      cachet: 'Cachet',
      signature: 'Signature',
      preparedBy: 'Préparé par',
      approvedBy: 'Approuvé par',
      generatedOn: 'Généré le',
      allRights: 'Tous droits réservés'
    };

    const html = `
      <!DOCTYPE html>
      <html dir="${dir}" lang="${lang}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${labels.docTitle} - ${cmd.command_id}</title>
        ${isAr ? '<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">' : ''}
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: ${fontFamily}; background: white; color: #333; padding: 30px; direction: ${dir}; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 10px; }
          .company-info h1 { font-size: 26px; color: #1e40af; margin-bottom: 5px; }
          .company-info p { font-size: 12px; color: #666; margin: 3px 0; }
          .doc-title { text-align: center; font-size: 20px; font-weight: bold; color: #1e40af; margin: 15px 0; padding: 8px; background: #f0f9ff; border-radius: 6px; border: 1px solid #bfdbfe; }
          .logo { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; }
          .command-details { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px; border-${isAr ? 'right' : 'left'}: 4px solid #2563eb; }
          .detail-item h3 { font-size: 11px; color: #666; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
          .detail-item p { font-size: 15px; font-weight: bold; color: #1e40af; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 10px 12px; text-align: ${isAr ? 'right' : 'left'}; font-weight: bold; font-size: 12px; }
          td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
          tr:nth-child(even) { background: #f9fafb; }
          .product-name { font-weight: bold; color: #1e40af; }
          .signatures-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 60px; padding-top: 20px; }
          .signature-box { text-align: center; padding: 15px; border: 1px dashed #cbd5e1; border-radius: 8px; min-height: 120px; display: flex; flex-direction: column; justify-content: space-between; }
          .signature-box h4 { font-size: 13px; color: #1e40af; font-weight: bold; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
          .signature-box .sign-area { flex: 1; min-height: 60px; }
          .signature-box .sign-label { font-size: 10px; color: #94a3b8; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
          .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; color: #999; font-size: 11px; }
          @media print { body { padding: 15px; } .header { page-break-after: avoid; } .signatures-section { page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>${enterpriseSettings?.name || 'ERP System'}</h1>
            <p><strong>${labels.address}:</strong> ${enterpriseSettings?.address || 'N/A'}</p>
            <p><strong>${labels.phone}:</strong> ${enterpriseSettings?.phone || 'N/A'}</p>
          </div>
          ${enterpriseSettings?.logoUrl ? `<img src="${enterpriseSettings.logoUrl}" class="logo" />` : ''}
        </div>

        <div class="doc-title">${labels.docTitle}</div>

        <div class="command-details">
          <div class="detail-item">
            <h3>${labels.commandId}</h3>
            <p>${cmd.command_id}</p>
          </div>
          <div class="detail-item">
            <h3>${labels.status}</h3>
            <p>${cmd.status.toUpperCase()}</p>
          </div>
          <div class="detail-item">
            <h3>${labels.date}</h3>
            <p>${new Date(cmd.created_at).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR')}</p>
          </div>
        </div>

        <div class="command-details">
          <div class="detail-item">
            <h3>${labels.supplier}</h3>
            <p>${cmd.supplier_name || 'N/A'}</p>
          </div>
          <div class="detail-item">
            <h3>${labels.materialCmd}</h3>
            <p>${cmd.material_command_id}</p>
          </div>
          <div class="detail-item">
            <h3>${labels.createdBy}</h3>
            <p>${cmd.creator_name || 'Unknown'}</p>
          </div>
        </div>

        <h2 style="color: #1e40af; margin-bottom: 10px; font-size: 16px;">${labels.productsList}</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 10%;">#</th>
              <th style="width: 55%;">${labels.productName}</th>
              <th style="width: 35%;">${labels.quantity}</th>
            </tr>
          </thead>
          <tbody>
            ${products.length > 0 ? products.map((p: any, idx: number) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                <td class="product-name">${p.product_name}</td>
                <td style="text-align: center; font-weight: bold;">${p.quantity}</td>
              </tr>
            `).join('') : `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #999;">${labels.noProducts}</td></tr>`}
          </tbody>
        </table>

        <div class="signatures-section">
          <div class="signature-box">
            <h4>${labels.preparedBy}</h4>
            <div class="sign-area"></div>
            <div class="sign-label">${labels.cachet} / ${labels.signature}</div>
          </div>
          <div class="signature-box">
            <h4>${labels.approvedBy}</h4>
            <div class="sign-area"></div>
            <div class="sign-label">${labels.cachet} / ${labels.signature}</div>
          </div>
          <div class="signature-box">
            <h4>${labels.date}</h4>
            <div class="sign-area"></div>
            <div class="sign-label">${labels.cachet} / ${labels.signature}</div>
          </div>
        </div>

        <div class="footer">
          <p>${labels.generatedOn} ${new Date().toLocaleString(isAr ? 'ar-DZ' : 'fr-FR')}</p>
          <p>&copy; ${new Date().getFullYear()} ${enterpriseSettings?.name || 'ERP System'}. ${labels.allRights}.</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
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
        className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-1"
      >
        {t('nav.purchase_commands')}
      </motion.h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label={t('nav.purchase_commands')} value={commands.length} gradient="btn-gradient" delay={0.1} />
        <StatCard icon={AlertCircle} label={t('common.pending')} value={purchaseCommands.length} gradient="btn-gradient-warm" delay={0.15} />
        <StatCard icon={CheckCircle} label={t('dashboard.validated_commands')} value={validatedCommands.length} gradient="btn-gradient-success" delay={0.2} />
        <StatCard icon={Package} label={t('nav.bons_commandes')} value={bonsCount} gradient="btn-gradient" delay={0.25} />
      </div>

      {/* Filter Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="flex gap-3 flex-wrap items-center"
      >
        <Filter className="w-5 h-5 text-muted-foreground" />
        <Button
          variant={filterStatus === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('all')}
          className={filterStatus === 'all' ? 'btn-gradient text-white font-semibold' : 'border-blue-200 hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800'}
        >
          {t('common.total')}
        </Button>
        <Button
          variant={filterStatus === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('pending')}
          className={filterStatus === 'pending' ? 'bg-amber-600 hover:bg-amber-700 text-white font-semibold' : 'border-amber-200 hover:bg-amber-50 dark:border-slate-700 dark:hover:bg-slate-800'}
        >
          {t('common.pending')}
        </Button>
        <Button
          variant={filterStatus === 'validated' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('validated')}
          className={filterStatus === 'validated' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold' : 'border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:hover:bg-slate-800'}
        >
          {t('common.validated')}
        </Button>
      </motion.div>

      {filteredCommands.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="erp-card text-center py-12 text-muted-foreground">
          {t('common.no_data')}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
              {filterStatus === 'pending' && (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  <span className="text-amber-700">{t('common.pending')} {t('nav.purchase_commands')} ({purchaseCommands.length})</span>
                </>
              )}
              {filterStatus === 'validated' && (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-emerald-700">{t('common.validated')} {t('nav.purchase_commands')} ({validatedCommands.length})</span>
                </>
              )}
              {filterStatus === 'all' && (
                <>
                  <Package className="w-5 h-5" />
                  <span className="text-blue-700">{t('nav.purchase_commands')} ({filteredCommands.length})</span>
                </>
              )}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCommands.map((cmd, i) => (
              <motion.div 
                key={cmd.id} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.3 + i * 0.05 }} 
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
                      onClick={() => setPendingPrintCmd(cmd)}
                      className="gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2 h-8 text-xs"
                      title={t('common.print') || 'Print'}
                    >
                      <Printer className="w-3 h-3" />
                    </Button>
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
                {t(`common.${viewCmd?.status}`)}
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

              {/* Creator Info */}
              <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">👤 {t('common.created_by') || 'Created By'}</p>
                <p className="text-sm font-semibold text-foreground">{viewCmd.creator_name || 'Unknown'}</p>
              </div>

              {/* Missing Products Section */}
              {missingProducts.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                    {t('common.missing_products') || 'Products to Order'} ({missingProducts.length})
                  </h3>
                  <div className="border border-blue-200 dark:border-slate-600 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-700 dark:to-slate-800 border-b border-blue-200 dark:border-slate-600">
                        <tr>
                          <th className="p-4 text-left font-bold text-blue-950 dark:text-blue-100">Product Name</th>
                          <th className="p-4 text-center font-bold text-blue-950 dark:text-blue-100">{t('common.quantity')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {missingProducts.map((product, idx) => (
                          <tr 
                            key={idx}
                            className={`border-b border-blue-100 dark:border-slate-700 transition-colors ${
                              idx % 2 === 0 
                                ? 'bg-white dark:bg-slate-800' 
                                : 'bg-blue-50 dark:bg-slate-700'
                            } hover:bg-blue-100 dark:hover:bg-slate-600`}
                          >
                            <td className="p-4">
                              <p className="font-bold text-blue-900 dark:text-blue-100">{product.product_name}</p>
                            </td>
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

          <div className="flex gap-3 justify-end pt-4 border-t border-blue-200 dark:border-slate-700">
            {viewCmd && (
              <Button 
                onClick={() => setPendingPrintCmd(viewCmd)}
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold"
              >
                <Printer className="w-4 h-4" /> {t('common.print') || 'Print'}
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewCmd(null)} className="font-semibold">
              {t('common.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Validation Confirmation Dialog */}
      <AlertDialog open={!!validatingId} onOpenChange={() => setValidatingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm_validation')}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to validate command {validatingId}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { if (validatingId) handleValidation(validatingId); }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert to Bons de Commande Dialog */}
      <AlertDialog open={!!convertingId} onOpenChange={() => setConvertingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.convert')} {t('nav.bons_commandes')}</AlertDialogTitle>
            <AlertDialogDescription>
              Convert command {convertingId} to Bon de Commande?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { if (convertingId) handleConvertToBons(convertingId); }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')} {t('nav.purchase_commands')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.confirm_delete') || 'Are you sure you want to delete this purchase command? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { if (deletingId) handleDelete(deletingId); }}
              className="bg-red-600 hover:bg-red-700"
            >
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
