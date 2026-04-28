import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye, PlusCircle, ImagePlus, Package, Trash2, BarChart3, CheckCircle2, X, Camera, Loader } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface BonCommande {
  id: string;
  bon_id: string;
  purchase_command_id: string;
  supplier_id?: string;
  supplier_name: string;
  status: 'pending' | 'validated' | 'paid' | 'finalized';
  total_price: number;
  total_without_tva: number;
  total_with_tva: number;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  notes?: string;
}

interface BonProduct {
  id: string;
  bon_commande_id: string;
  product_name: string;
  quantity: number;
  unity_price: number;
  is_active: boolean;
  tva_rate: number;
  subtotal: number;
  tva_amount: number;
  total_with_tva: number;
}

interface BonProductForm {
  product_name?: string;
  quantity?: number;
  unity_price?: number;
  is_active?: boolean;
  tva_rate?: number;
  subtotal?: number;
  tva_amount?: number;
  total_with_tva?: number;
}

interface BonOffer {
  id: string;
  bon_commande_id: string;
  supplier_id?: string;
  supplier_name: string;
  offer_date: string;
  image_path?: string;
  image_url?: string;
  notes?: string;
}

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  is_active: boolean;
}

const StatCard = ({ icon: Icon, label, value, gradient, delay }: { icon: React.ElementType; label: string; value: string | number; gradient: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="erp-stat-card"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${gradient}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </motion.div>
);

export default function BonsCommandesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  
  // State management
  const [bonsCommandes, setBonsCommandes] = useState<BonCommande[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  // Dialog states
  const [viewBon, setViewBon] = useState<BonCommande | null>(null);
  const [offerBon, setOfferBon] = useState<BonCommande | null>(null);
  const [bonProducts, setBonProducts] = useState<BonProduct[]>([]);
  const [bonOffers, setBonOffers] = useState<BonOffer[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'offers'>('products');
  
  // Form states for products
  const [newProducts, setNewProducts] = useState<BonProductForm[]>([
    { quantity: 1, unity_price: 0, is_active: false, tva_rate: 19 }
  ]);
  
  // Form states for offers
  const [newOffers, setNewOffers] = useState<Partial<BonOffer>[]>([
    { supplier_name: '', image_url: '', notes: '' }
  ]);
  
  // Upload state
  const [uploadingImageIdx, setUploadingImageIdx] = useState<number | null>(null);
  const [deletingOfferId, setDeletingOfferId] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch bons commandes
      const { data: bonsData, error: bonsError } = await supabase
        .from('bons_commandes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (bonsError) throw bonsError;
      setBonsCommandes(bonsData || []);

      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true);
      
      if (suppliersError) throw suppliersError;
      setSuppliers(suppliersData || []);
    } catch (err: any) {
      setMessage(`Error loading data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchBonDetails = async (bonId: string) => {
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('bons_commandes_products')
        .select('*')
        .eq('bon_commande_id', bonId)
        .order('created_at', { ascending: false });
      
      if (productsError) throw productsError;
      setBonProducts(productsData || []);

      // Fetch offers
      const { data: offersData, error: offersError } = await supabase
        .from('bons_commandes_offers')
        .select('*')
        .eq('bon_commande_id', bonId)
        .order('offer_date', { ascending: false });
      
      if (offersError) throw offersError;
      setBonOffers(offersData || []);
    } catch (err: any) {
      setMessage(`Error loading details: ${err.message}`);
    }
  };

  const handleProductChange = (idx: number, field: string, value: any) => {
    setNewProducts(prev => {
      const updated = [...prev];
      const product: BonProductForm = { ...updated[idx] };
      
      if (field === 'unity_price' || field === 'quantity') {
        const numValue = parseFloat(value) || 0;
        if (field === 'unity_price') {
          product.unity_price = numValue;
        } else {
          product.quantity = numValue;
        }
        if (product.unity_price && product.quantity) {
          product.subtotal = (product.unity_price * product.quantity) || 0;
          const tvaRate = product.tva_rate || 0;
          product.tva_amount = (product.subtotal * tvaRate) / 100;
          product.total_with_tva = product.subtotal + product.tva_amount;
        }
      } else if (field === 'tva_rate') {
        product.tva_rate = parseFloat(value) || 0;
        if (product.subtotal) {
          product.tva_amount = (product.subtotal * product.tva_rate) / 100;
          product.total_with_tva = product.subtotal + product.tva_amount;
        }
      } else if (field === 'is_active') {
        product.is_active = value;
      } else if (field === 'product_name') {
        product.product_name = value;
      }
      
      updated[idx] = product;
      return updated;
    });
  };

  const handleAddProductRow = () => {
    setNewProducts(prev => [...prev, { quantity: 1, unity_price: 0, is_active: false, tva_rate: 19, subtotal: 0, tva_amount: 0, total_with_tva: 0 }]);
  };

  const handleRemoveProductRow = (idx: number) => {
    setNewProducts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddOfferRow = () => {
    setNewOffers(prev => [...prev, { supplier_name: '', image_url: '', notes: '' }]);
  };

  const handleRemoveOfferRow = (idx: number) => {
    setNewOffers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleOfferChange = (idx: number, field: string, value: string) => {
    setNewOffers(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
  };

  const handleImageUpload = async (idx: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file && offerBon) {
        try {
          setUploadingImageIdx(idx);
          
          // Upload image to Supabase storage
          const fileName = `${offerBon.bon_id}_offer_${idx}_${Date.now()}`;
          const { data, error } = await supabase.storage
            .from('offers')
            .upload(fileName, file);
          
          if (error) throw error;
          
          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('offers')
            .getPublicUrl(fileName);
          
          handleOfferChange(idx, 'image_url', publicUrlData.publicUrl);
          setMessage('Image uploaded successfully!');
          setTimeout(() => setMessage(''), 2000);
        } catch (err: any) {
          setMessage(`Error uploading image: ${err.message}`);
        } finally {
          setUploadingImageIdx(null);
        }
      }
    };
    input.click();
  };

  const handleScanOffer = (idx: number) => {
    // Use camera to scan offer
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file && offerBon) {
        try {
          setUploadingImageIdx(idx);
          const fileName = `${offerBon.bon_id}_scan_${idx}_${Date.now()}`;
          const { data, error } = await supabase.storage
            .from('offers')
            .upload(fileName, file);
          
          if (error) throw error;
          const { data: publicUrlData } = supabase.storage
            .from('offers')
            .getPublicUrl(fileName);
          
          handleOfferChange(idx, 'image_url', publicUrlData.publicUrl);
          setMessage('Offer scanned successfully!');
          setTimeout(() => setMessage(''), 2000);
        } catch (err: any) {
          setMessage(`Error scanning offer: ${err.message}`);
        } finally {
          setUploadingImageIdx(null);
        }
      }
    };
    input.click();
  };

  const handleSaveProducts = async () => {
    if (!offerBon) return;
    
    try {
      const validProducts = newProducts.filter(p => p.product_name && p.quantity);
      
      if (validProducts.length === 0) {
        setMessage('Please add at least one product');
        return;
      }

      const productsToInsert = validProducts.map((p) => ({
        bon_commande_id: offerBon.id,
        product_name: p.product_name!,
        quantity: p.quantity || 1,
        unity_price: p.unity_price || 0,
        is_active: p.is_active || false,
        tva_rate: p.tva_rate || 19,
        subtotal: p.subtotal || 0,
        tva_amount: p.tva_amount || 0,
        total_with_tva: p.total_with_tva || 0
      }));

      const { error } = await supabase
        .from('bons_commandes_products')
        .insert(productsToInsert);
      
      if (error) throw error;

      // Recalculate totals
      const allProducts = [...bonProducts, ...productsToInsert];
      const totalWithoutTVA = allProducts
        .filter(p => p.is_active)
        .reduce((sum, p) => sum + (p.subtotal || 0), 0);
      const totalWithTVA = allProducts
        .filter(p => p.is_active)
        .reduce((sum, p) => sum + (p.total_with_tva || 0), 0);

      const { error: updateError } = await supabase
        .from('bons_commandes')
        .update({
          total_without_tva: totalWithoutTVA,
          total_with_tva: totalWithTVA,
          total_price: totalWithoutTVA
        })
        .eq('id', offerBon.id);

      if (updateError) throw updateError;

      setMessage('Products added successfully!');
      setNewProducts([{ quantity: 1, unity_price: 0, is_active: false, tva_rate: 19 }]);
      await fetchBonDetails(offerBon.id);
      await fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleSaveOffers = async () => {
    if (!offerBon) return;
    
    try {
      const validOffers = newOffers.filter(o => o.supplier_name);
      
      if (validOffers.length === 0) {
        setMessage('Please add at least one offer');
        return;
      }

      const offersToInsert = validOffers.map((o) => ({
        bon_commande_id: offerBon.id,
        supplier_name: o.supplier_name!,
        supplier_id: null,
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
      await fetchBonDetails(offerBon.id);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('bons_commandes_offers')
        .delete()
        .eq('id', offerId);
      
      if (error) throw error;
      
      setMessage('Offer deleted successfully!');
      setDeletingOfferId(null);
      await fetchBonDetails(offerBon?.id || '');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const totalBons = bonsCommandes.length;
  const totalOffers = bonOffers.length;
  const totalAmount = bonsCommandes.reduce((sum, bon) => sum + (bon.total_with_tva || 0), 0);

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
        {t('nav.bons_commandes')}
      </motion.h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Package} label={t('nav.bons_commandes')} value={totalBons} gradient="btn-gradient" delay={0.1} />
        <StatCard icon={PlusCircle} label={t('common.offers')} value={totalOffers} gradient="btn-gradient-success" delay={0.15} />
        <StatCard icon={BarChart3} label={t('common.total_amount')} value={totalAmount.toLocaleString() + ' DA'} gradient="btn-gradient-warm" delay={0.2} />
      </div>

      {bonsCommandes.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="erp-card text-center py-12">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
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
            {bonsCommandes.map((bon, idx) => (
              <motion.div
                key={bon.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + idx * 0.05 }}
                className="erp-card hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-foreground">{bon.bon_id}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('common.supplier')}: {bon.supplier_name}</p>
                  </div>
                  <Badge className={`capitalize ${
                    bon.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    bon.status === 'validated' ? 'bg-blue-100 text-blue-700' :
                    bon.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{bon.status}</Badge>
                </div>

                <div className="space-y-2 mb-4 p-3 bg-secondary/50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('common.products')}:</span>
                    <span className="font-semibold text-foreground">0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('common.offers')}:</span>
                    <span className="font-semibold text-primary">0</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-muted-foreground">{t('common.total')}:</span>
                    <span className="text-foreground">{bon.total_with_tva.toLocaleString()} DA</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mb-4">{new Date(bon.created_at).toLocaleDateString()}</p>

                <div className="flex gap-2 flex-col">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-1 w-full"
                    onClick={() => {
                      setViewBon(bon);
                      fetchBonDetails(bon.id);
                      setActiveTab('products');
                    }}
                  >
                    <Eye className="w-3.5 h-3.5" /> {t('common.view_details')}
                  </Button>
                  <Button 
                    size="sm" 
                    className="gap-1 w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => { 
                      setOfferBon(bon);
                      setActiveTab('products');
                      fetchBonDetails(bon.id);
                      setNewProducts([{ quantity: 1, unity_price: 0, is_active: false, tva_rate: 19 }]);
                      setNewOffers([{ supplier_name: '', image_url: '', notes: '' }]);
                    }}
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> {t('common.add_offer')}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* View Details Dialog */}
      <Dialog open={!!viewBon} onOpenChange={() => setViewBon(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewBon?.bon_id}</DialogTitle>
          </DialogHeader>
          
          {viewBon && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground font-semibold">{t('common.supplier')}</p>
                  <p className="text-sm font-medium text-foreground mt-1">{viewBon.supplier_name}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground font-semibold">{t('common.date')}</p>
                  <p className="text-sm font-medium text-foreground mt-1">{new Date(viewBon.created_at).toLocaleDateString()}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground font-semibold">{t('common.total_without_tva')}</p>
                  <p className="text-sm font-bold text-foreground mt-1">{viewBon.total_without_tva.toLocaleString()} DA</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground font-semibold">{t('common.total_with_tva')}</p>
                  <p className="text-sm font-bold text-foreground mt-1">{viewBon.total_with_tva.toLocaleString()} DA</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === 'products'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('common.products')}
                </button>
                <button
                  onClick={() => setActiveTab('offers')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === 'offers'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('common.offers')}
                </button>
              </div>

              {/* Products Tab */}
              {activeTab === 'products' && (
                <div>
                  {bonProducts.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground bg-secondary/20 rounded-lg">
                      <p>{t('common.no_products')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bonProducts.map(p => (
                        <Card key={p.id} className={`p-4 border-l-4 ${p.is_active ? 'border-l-emerald-500 bg-emerald-50' : 'border-l-gray-300 bg-gray-50'}`}>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                              <p className="text-xs text-muted-foreground font-semibold">{t('common.product')}</p>
                              <p className="text-sm font-medium text-foreground">{p.product_name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground font-semibold">{t('common.quantity')}</p>
                              <p className="text-sm font-medium text-foreground">{p.quantity}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground font-semibold">{t('common.unity_price')}</p>
                              <p className="text-sm font-medium text-foreground">{p.unity_price.toLocaleString()} DA</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground font-semibold">{t('common.total')}</p>
                              <p className="text-sm font-bold text-emerald-600">{p.total_with_tva.toLocaleString()} DA</p>
                            </div>
                          </div>
                          <div className="mt-2 text-xs">
                            <span className="text-muted-foreground">
                              TVA: {p.tva_rate}% | {p.tva_amount.toLocaleString()} DA
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Offers Tab */}
              {activeTab === 'offers' && (
                <div>
                  {bonOffers.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground bg-secondary/20 rounded-lg">
                      <p>{t('common.no_offers')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bonOffers.map(offer => (
                        <Card key={offer.id} className="p-4 border-l-4 border-l-blue-500">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-foreground">{offer.supplier_name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{new Date(offer.offer_date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            {offer.notes && (
                              <p className="text-sm text-muted-foreground">{offer.notes}</p>
                            )}
                            {offer.image_url && (
                              <img src={offer.image_url} alt="offer" className="w-full max-h-48 object-cover rounded-lg" />
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Products/Offers Dialog */}
      <Dialog open={!!offerBon} onOpenChange={() => setOfferBon(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('common.manage')} {offerBon?.bon_id}</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'products'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('common.add_product')}s
            </button>
            <button
              onClick={() => setActiveTab('offers')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'offers'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('common.add_offer')}
            </button>
          </div>

          {/* Add Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <AnimatePresence>
                {newProducts.map((product, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="erp-card space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">{t('common.product')} #{idx + 1}</span>
                      {newProducts.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleRemoveProductRow(idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block text-foreground">{t('common.product_name')} *</label>
                      <Input
                        placeholder={`${t('common.enter')} ${t('common.product_name')}`}
                        value={product.product_name || ''}
                        onChange={e => handleProductChange(idx, 'product_name', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-semibold mb-2 block text-foreground">{t('common.quantity')} *</label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={product.quantity || 1}
                          onChange={e => handleProductChange(idx, 'quantity', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block text-foreground">{t('common.unity_price')} *</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={product.unity_price || 0}
                          onChange={e => handleProductChange(idx, 'unity_price', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-semibold mb-2 block text-foreground">{t('common.tva')}</label>
                        <Select value={String(product.tva_rate || 19)} onValueChange={v => handleProductChange(idx, 'tva_rate', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="9">9%</SelectItem>
                            <SelectItem value="19">19%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block text-foreground">{t('common.status')}</label>
                        <Select value={product.is_active ? 'active' : 'inactive'} onValueChange={v => handleProductChange(idx, 'is_active', v === 'active')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">
                              <CheckCircle2 className="w-4 h-4 inline mr-2 text-emerald-600" />
                              Active
                            </SelectItem>
                            <SelectItem value="inactive">
                              <X className="w-4 h-4 inline mr-2 text-gray-400" />
                              Inactive
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {product.subtotal !== undefined && (
                      <div className="p-3 bg-blue-50 rounded-lg space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('common.subtotal')}:</span>
                          <span className="font-semibold">{product.subtotal.toLocaleString()} DA</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">TVA ({product.tva_rate}%):</span>
                          <span className="font-semibold">{product.tva_amount?.toLocaleString()} DA</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold border-t pt-1">
                          <span>{t('common.total')}:</span>
                          <span className="text-emerald-600">{product.total_with_tva?.toLocaleString()} DA</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              <Button 
                variant="outline" 
                className="w-full gap-2 border-dashed border-2"
                onClick={handleAddProductRow}
              >
                <PlusCircle className="w-4 h-4" /> {t('common.add_another_product')}
              </Button>
            </div>
          )}

          {/* Add Offers Tab */}
          {activeTab === 'offers' && (
            <div className="space-y-4">
              <AnimatePresence>
                {newOffers.map((offer, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="erp-card space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">{t('common.offer')} #{idx + 1}</span>
                      {newOffers.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleRemoveOfferRow(idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block text-foreground">{t('common.supplier')} *</label>
                      <Select value={offer.supplier_name || ''} onValueChange={v => handleOfferChange(idx, 'supplier_name', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder={`${t('common.select')} ${t('common.supplier')}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map(s => (
                            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block text-foreground">{t('common.notes')}</label>
                      <Input
                        placeholder={`${t('common.enter')} ${t('common.notes')}`}
                        value={offer.notes || ''}
                        onChange={e => handleOfferChange(idx, 'notes', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 flex-1"
                          onClick={() => handleImageUpload(idx)}
                          disabled={uploadingImageIdx === idx}
                        >
                          {uploadingImageIdx === idx ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <ImagePlus className="w-4 h-4" />
                              {offer.image_url ? 'Change Image' : 'Upload Image'}
                            </>
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 flex-1"
                          onClick={() => handleScanOffer(idx)}
                          disabled={uploadingImageIdx === idx}
                        >
                          {uploadingImageIdx === idx ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                            </>
                          ) : (
                            <>
                              <Camera className="w-4 h-4" />
                              Scan Offer
                            </>
                          )}
                        </Button>
                      </div>
                      {offer.image_url && (
                        <img src={offer.image_url} alt="offer" className="w-full max-h-40 object-cover rounded-lg" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <Button 
                variant="outline" 
                className="w-full gap-2 border-dashed border-2"
                onClick={handleAddOfferRow}
              >
                <PlusCircle className="w-4 h-4" /> {t('common.add_another_offer')}
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferBon(null)}>
              {t('common.cancel')}
            </Button>
            {activeTab === 'products' ? (
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSaveProducts}
              >
                {t('common.save_products')}
              </Button>
            ) : (
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSaveOffers}
              >
                {t('common.save_offers')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Offer Confirmation */}
      <AlertDialog open={!!deletingOfferId} onOpenChange={() => setDeletingOfferId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')} {t('common.offer')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.confirm_delete_message')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { if (deletingOfferId) handleDeleteOffer(deletingOfferId); }}
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
