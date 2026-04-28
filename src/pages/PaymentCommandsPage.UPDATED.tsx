import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Eye, Edit3, Trash2, CheckCircle, Printer, PlusCircle, Search, FileText } from 'lucide-react';

interface BonCommande {
  id: string;
  reference: string;
  total_amount: number;
}

interface PaymentOrder {
  id: string;
  user_id: string;
  bon_commande_id: string;
  total_price: number;
  note: string;
  status: 'pending' | 'validated';
  created_at: string;
}

export default function PaymentCommandsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([]);
  const [bonsCommandes, setBonsCommandes] = useState<BonCommande[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewCmd, setViewCmd] = useState<PaymentOrder | null>(null);
  const [editCmd, setEditCmd] = useState<PaymentOrder | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [validateId, setValidateId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPrint, setShowPrint] = useState<PaymentOrder | null>(null);
  const [printMode, setPrintMode] = useState<'standard' | 'custom' | null>(null);
  const [message, setMessage] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  // Create form
  const [searchBon, setSearchBon] = useState('');
  const [selectedBonId, setSelectedBonId] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [note, setNote] = useState('');

  // Edit form
  const [editPrice, setEditPrice] = useState('');
  const [editNote, setEditNote] = useState('');

  // Print customization
  const [printFontSize, setPrintFontSize] = useState(14);
  const [printBold, setPrintBold] = useState(false);
  const [printColor, setPrintColor] = useState('#1a1a2e');

  // Fetch payment orders and bons commandes
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch payment orders
      const { data: orders, error: ordersError } = await supabase
        .from('payment_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setPaymentOrders(orders || []);

      // Fetch bons commandes
      const { data: bons, error: bonsError } = await supabase
        .from('bons_commandes')
        .select('id, reference, total_amount');

      if (bonsError) throw bonsError;
      setBonsCommandes(bons || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setMessage(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredBons = bonsCommandes.filter(b =>
    b.id.toLowerCase().includes(searchBon.toLowerCase()) ||
    b.reference.toLowerCase().includes(searchBon.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    validated: 'bg-green-100 text-green-700 border-green-300',
  };

  const handleCreate = async () => {
    if (!selectedBonId || !totalPrice) {
      setMessage('Please fill in required fields');
      return;
    }

    try {
      const { error } = await supabase.from('payment_orders').insert([{
        user_id: user?.id,
        bon_commande_id: selectedBonId,
        total_price: parseFloat(totalPrice),
        note: note || null,
        status: 'pending'
      }]);

      if (error) throw error;
      setMessage('Payment order created successfully');
      setShowCreate(false);
      setSearchBon('');
      setSelectedBonId('');
      setTotalPrice('');
      setNote('');
      await fetchData();
    } catch (err: any) {
      setMessage(err.message || 'Failed to create payment order');
    }
  };

  const handleEdit = async () => {
    if (!editCmd) return;

    try {
      const { error } = await supabase
        .from('payment_orders')
        .update({
          total_price: parseFloat(editPrice),
          note: editNote || null
        })
        .eq('id', editCmd.id);

      if (error) throw error;
      setMessage('Payment order updated successfully');
      setEditCmd(null);
      await fetchData();
    } catch (err: any) {
      setMessage(err.message || 'Failed to update payment order');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('payment_orders')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      setMessage('Payment order deleted successfully');
      setDeleteId(null);
      await fetchData();
    } catch (err: any) {
      setMessage(err.message || 'Failed to delete payment order');
    }
  };

  const handleValidate = async () => {
    if (!validateId) return;

    try {
      const { error } = await supabase
        .from('payment_orders')
        .update({ status: 'validated' })
        .eq('id', validateId);

      if (error) throw error;
      setMessage('Payment order validated successfully');
      setValidateId(null);
      await fetchData();
    } catch (err: any) {
      setMessage(err.message || 'Failed to validate payment order');
    }
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html dir="rtl"><head><title>طباعة أمر الدفع</title>
          <style>body{font-family:Cairo,sans-serif;padding:40px;color:${printColor};font-size:${printFontSize}px;${printBold ? 'font-weight:bold;' : ''}}
          .header{text-align:center;margin-bottom:30px;border-bottom:2px solid #ddd;padding-bottom:20px}
          .field{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}
          </style></head><body>${printRef.current.innerHTML}</body></html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

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
        <h1 className="text-2xl font-bold erp-gradient-text flex items-center gap-2">
          <CreditCard className="w-7 h-7" />
          {t('nav.payment_commands')} / أوامر الدفع
        </h1>
        <Button className="btn-gradient gap-2" onClick={() => setShowCreate(true)}>
          <PlusCircle className="w-4 h-4" /> إنشاء أمر دفع جديد / Create Payment Order
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
      ) : paymentOrders.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="erp-card text-center py-12">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">{t('common.no_data')}</p>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paymentOrders.map((cmd, idx) => (
            <motion.div
              key={cmd.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <Card className="erp-card group">
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">{cmd.id}</CardTitle>
                    <Badge className={`${statusColors[cmd.status]} border text-xs`}>
                      {cmd.status === 'pending' ? 'قيد الانتظار' : 'تم التأكيد'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">سند الطلب:</span>
                    <span className="font-semibold">{cmd.bon_commande_id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">المبلغ:</span>
                    <span className="font-bold erp-gradient-text">{cmd.total_price.toLocaleString()} د.ج</span>
                  </div>
                  {cmd.note && (
                    <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded-lg">{cmd.note}</p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {new Date(cmd.created_at).toLocaleDateString('fr-FR')}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => setViewCmd(cmd)}
                    >
                      <Eye className="w-3.5 h-3.5" /> عرض
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => {
                        setEditCmd(cmd);
                        setEditPrice(String(cmd.total_price));
                        setEditNote(cmd.note || '');
                      }}
                    >
                      <Edit3 className="w-3.5 h-3.5" /> تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(cmd.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> حذف
                    </Button>
                    {cmd.status === 'pending' && (
                      <Button
                        size="sm"
                        className="gap-1 btn-gradient-success"
                        onClick={() => setValidateId(cmd.id)}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> تأكيد
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 col-span-2"
                      onClick={() => {
                        setShowPrint(cmd);
                        setPrintMode(null);
                      }}
                    >
                      <Printer className="w-3.5 h-3.5" /> طباعة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={!!viewCmd} onOpenChange={() => setViewCmd(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="erp-gradient-text">{viewCmd?.id} - تفاصيل</DialogTitle>
          </DialogHeader>
          {viewCmd && (
            <div className="space-y-3">
              <div className="erp-card !p-3 flex justify-between">
                <span className="text-muted-foreground">سند الطلب:</span>
                <span className="font-bold">{viewCmd.bon_commande_id}</span>
              </div>
              <div className="erp-card !p-3 flex justify-between">
                <span className="text-muted-foreground">المبلغ:</span>
                <span className="font-bold">{viewCmd.total_price.toLocaleString()} د.ج</span>
              </div>
              <div className="erp-card !p-3 flex justify-between">
                <span className="text-muted-foreground">الحالة:</span>
                <Badge className={`${statusColors[viewCmd.status]} border`}>
                  {viewCmd.status === 'pending' ? 'قيد الانتظار' : 'تم التأكيد'}
                </Badge>
              </div>
              <div className="erp-card !p-3 flex justify-between">
                <span className="text-muted-foreground">التاريخ:</span>
                <span>{new Date(viewCmd.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              {viewCmd.note && (
                <div className="erp-card !p-3">
                  <span className="text-muted-foreground">ملاحظة:</span>
                  <p className="mt-1">{viewCmd.note}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCmd} onOpenChange={() => setEditCmd(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل أمر الدفع</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1">المبلغ الإجمالي *</label>
              <Input
                type="number"
                value={editPrice}
                onChange={e => setEditPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">ملاحظة</label>
              <Input
                value={editNote}
                onChange={e => setEditNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCmd(null)}>
              {t('common.cancel')}
            </Button>
            <Button className="btn-gradient" onClick={handleEdit}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>{t('common.confirm_delete')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t('common.cancel')}
            </Button>
            <Button className="btn-gradient-danger" onClick={handleDelete}>
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validate Confirm Dialog */}
      <Dialog open={!!validateId} onOpenChange={() => setValidateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد التحقق</DialogTitle>
            <DialogDescription>هل تريد تأكيد أمر الدفع هذا؟</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidateId(null)}>
              {t('common.cancel')}
            </Button>
            <Button className="btn-gradient-success" onClick={handleValidate}>
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="erp-gradient-text">
              إنشاء أمر دفع جديد / Create New Payment Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">
                البحث عن سند الطلب / Search Purchase Order
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute top-3 start-3 text-muted-foreground" />
                <Input
                  placeholder="ابحث برقم أو مرجع... / Search by ID or reference..."
                  value={searchBon}
                  onChange={e => setSearchBon(e.target.value)}
                  className="ps-9"
                />
              </div>
              {searchBon && filteredBons.length > 0 && (
                <div className="mt-2 border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {filteredBons.map(b => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setSelectedBonId(b.id);
                        setSearchBon(b.id);
                        setTotalPrice(String(b.total_amount));
                      }}
                      className={`w-full text-start p-3 hover:bg-secondary/50 transition-colors flex justify-between items-center ${
                        selectedBonId === b.id ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div>
                        <span className="font-semibold block">{b.id}</span>
                        <span className="text-xs text-muted-foreground">{b.reference}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {b.total_amount.toLocaleString()} د.ج
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {selectedBonId && (
                <Badge className="mt-2 bg-primary/10 text-primary border-primary/30">
                  تم اختيار: {selectedBonId}
                </Badge>
              )}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">
                المبلغ الإجمالي النهائي / Final Total Amount *
              </label>
              <Input
                type="number"
                value={totalPrice}
                onChange={e => setTotalPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">
                ملاحظة / Note (اختياري / Optional)
              </label>
              <Input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="ملاحظات إضافية..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              className="btn-gradient"
              onClick={handleCreate}
              disabled={!selectedBonId || !totalPrice}
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={!!showPrint} onOpenChange={() => setShowPrint(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>طباعة أمر الدفع / Print Payment Order</DialogTitle>
          </DialogHeader>
          {!printMode ? (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPrintMode('standard')}
                className="erp-card !p-6 text-center hover:border-primary transition-colors"
              >
                <Printer className="w-10 h-10 mx-auto mb-2 text-primary" />
                <span className="font-semibold">طباعة عادية</span>
              </button>
              <button
                onClick={() => setPrintMode('custom')}
                className="erp-card !p-6 text-center hover:border-primary transition-colors"
              >
                <Edit3 className="w-10 h-10 mx-auto mb-2 text-accent" />
                <span className="font-semibold">تخصيص</span>
              </button>
            </div>
          ) : printMode === 'custom' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1">حجم الخط</label>
                  <Input
                    type="number"
                    value={printFontSize}
                    onChange={e => setPrintFontSize(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">خط عريض</label>
                  <Button
                    variant={printBold ? 'default' : 'outline'}
                    size="sm"
                    className="w-full mt-0.5"
                    onClick={() => setPrintBold(!printBold)}
                  >
                    {printBold ? 'عريض' : 'عادي'}
                  </Button>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">اللون</label>
                  <input
                    type="color"
                    value={printColor}
                    onChange={e => setPrintColor(e.target.value)}
                    className="w-full h-9 rounded cursor-pointer"
                  />
                </div>
              </div>
              <div
                ref={printRef}
                className="erp-card !p-6"
                style={{
                  fontSize: printFontSize,
                  fontWeight: printBold ? 'bold' : 'normal',
                  color: printColor
                }}
              >
                <div
                  style={{
                    textAlign: 'center',
                    marginBottom: 20,
                    borderBottom: '2px solid #ddd',
                    paddingBottom: 15
                  }}
                >
                  <h2>أمر الدفع</h2>
                  <p style={{ fontSize: '0.8em', opacity: 0.7 }}>{showPrint?.id}</p>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #eee'
                  }}
                >
                  <span>سند الطلب:</span>
                  <span>{showPrint?.bon_commande_id}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #eee'
                  }}
                >
                  <span>المبلغ:</span>
                  <span>{showPrint?.total_price.toLocaleString()} د.ج</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #eee'
                  }}
                >
                  <span>التاريخ:</span>
                  <span>{new Date(showPrint?.created_at || '').toLocaleDateString('fr-FR')}</span>
                </div>
                {showPrint?.note && (
                  <div style={{ padding: '8px 0' }}>
                    <span>ملاحظة:</span> {showPrint.note}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPrintMode(null)}
                >
                  رجوع
                </Button>
                <Button
                  className="flex-1 btn-gradient gap-2"
                  onClick={handlePrint}
                >
                  <Printer className="w-4 h-4" /> طباعة
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div ref={printRef} className="erp-card !p-6">
                <div
                  style={{
                    textAlign: 'center',
                    marginBottom: 20,
                    borderBottom: '2px solid #ddd',
                    paddingBottom: 15
                  }}
                >
                  <h2 className="text-xl font-bold">أمر الدفع</h2>
                  <p className="text-sm text-muted-foreground">{showPrint?.id}</p>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">سند الطلب:</span>
                  <span className="font-bold">{showPrint?.bon_commande_id}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">المبلغ:</span>
                  <span className="font-bold">{showPrint?.total_price.toLocaleString()} د.ج</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">التاريخ:</span>
                  <span>{new Date(showPrint?.created_at || '').toLocaleDateString('fr-FR')}</span>
                </div>
                {showPrint?.note && (
                  <div className="py-2">
                    <span className="text-muted-foreground">ملاحظة:</span> {showPrint.note}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPrintMode(null)}
                >
                  رجوع
                </Button>
                <Button
                  className="flex-1 btn-gradient gap-2"
                  onClick={handlePrint}
                >
                  <Printer className="w-4 h-4" /> طباعة
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
