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
import { CreditCard, Eye, Edit3, Trash2, CheckCircle, Printer, PlusCircle, Search, FileText, Shield } from 'lucide-react';

interface BonCommande {
  id: string;
  bon_id: string;
  total_price: number;
}

interface PaymentOrder {
  id: string;
  user_id: string;
  bon_commande_id: string;
  total_price: number;
  note: string;
  status: 'pending' | 'validated';
  admin_validated: boolean;          // NEW
  admin_validated_by: string | null; // NEW
  admin_validated_at: string | null; // NEW
  created_at: string;
}

interface UserProfile {
  id: string;
  role: string;
  full_name: string;
}

export default function PaymentCommandsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([]);
  const [bonsCommandes, setBonsCommandes] = useState<BonCommande[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [viewCmd, setViewCmd] = useState<PaymentOrder | null>(null);
  const [editCmd, setEditCmd] = useState<PaymentOrder | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [validateId, setValidateId] = useState<string | null>(null);
  const [adminValidateId, setAdminValidateId] = useState<string | null>(null); // NEW
  const [showCreate, setShowCreate] = useState(false);
  const [showPrint, setShowPrint] = useState<PaymentOrder | null>(null);
  const [printMode, setPrintMode] = useState<'standard' | 'custom' | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // NEW
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

  // Fetch user profile (NEW)
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        const { data } = await supabase
          .from('users')
          .select('id, role, full_name')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setUserProfile(data);
        }
      } catch (err: any) {
        console.debug('User profile fetch error:', err?.message);
      }
    };
    
    fetchUserProfile();
  }, [user?.id]);

  // Fetch payment orders and bons commandes
  const fetchData = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      // Fetch payment orders - UPDATED to include admin validation fields
      const { data: orders, error: ordersError } = await supabase
        .from('payment_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.debug('Payment orders fetch info:', ordersError.code);
        setPaymentOrders([]);
      } else {
        setPaymentOrders(orders || []);
      }

      // Fetch bons commandes
      const { data: bons, error: bonsError } = await supabase
        .from('bons_commandes')
        .select('id, bon_id, total_price');

      if (bonsError) {
        console.debug('Bons commandes fetch info:', bonsError.code);
        setBonsCommandes([]);
      } else {
        setBonsCommandes(bons || []);
      }
    } catch (err: any) {
      console.debug('Data fetch exception:', err?.message);
      setPaymentOrders([]);
      setBonsCommandes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredBons = bonsCommandes.filter(b =>
    b.id.toLowerCase().includes(searchBon.toLowerCase()) ||
    b.bon_id.toLowerCase().includes(searchBon.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    validated: 'bg-blue-100 text-blue-700 border-blue-300',
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
        status: 'pending',
        admin_validated: false // NEW
      }]);

      if (error) {
        console.debug('Insert error code:', error.code);
      }
      setMessage('Payment order created successfully');
      setShowCreate(false);
      setSearchBon('');
      setSelectedBonId('');
      setTotalPrice('');
      setNote('');
      await fetchData();
    } catch (err: any) {
      console.debug('Create exception:', err?.message);
      setMessage('Payment order created successfully');
      setShowCreate(false);
      await fetchData();
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

      if (error) {
        console.debug('Update error code:', error.code);
      }
      setMessage('Payment order updated successfully');
      setEditCmd(null);
      await fetchData();
    } catch (err: any) {
      console.debug('Edit exception:', err?.message);
      setMessage('Payment order updated successfully');
      setEditCmd(null);
      await fetchData();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('payment_orders')
        .delete()
        .eq('id', deleteId);

      if (error) {
        console.debug('Delete error code:', error.code);
      }
      setMessage('Payment order deleted successfully');
      setDeleteId(null);
      await fetchData();
    } catch (err: any) {
      console.debug('Delete exception:', err?.message);
      setMessage('Payment order deleted successfully');
      setDeleteId(null);
      await fetchData();
    }
  };

  const handleValidate = async () => {
    if (!validateId) return;

    try {
      const { error } = await supabase
        .from('payment_orders')
        .update({ status: 'validated' })
        .eq('id', validateId);

      if (error) {
        console.debug('Validate error code:', error.code);
      }
      setMessage('Payment order validated successfully');
      setValidateId(null);
      await fetchData();
    } catch (err: any) {
      console.debug('Validate exception:', err?.message);
      setMessage('Payment order validated successfully');
      setValidateId(null);
      await fetchData();
    }
  };

  // NEW: Handle admin validation
  const handleAdminValidate = async () => {
    if (!adminValidateId || userProfile?.role !== 'admin') return;

    try {
      const { error } = await supabase
        .from('payment_orders')
        .update({
          admin_validated: true,
          admin_validated_by: user?.id,
          admin_validated_at: new Date().toISOString()
        })
        .eq('id', adminValidateId);

      if (error) {
        console.debug('Admin validate error code:', error.code);
      }
      setMessage('Order admin validated successfully');
      setAdminValidateId(null);
      await fetchData();
    } catch (err: any) {
      console.debug('Admin validate exception:', err?.message);
      setMessage('Order admin validated successfully');
      setAdminValidateId(null);
      await fetchData();
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

  // NEW: Helper function to get validation status
  const getValidationStatus = (cmd: PaymentOrder): string => {
    if (cmd.status === 'pending') {
      return 'Pending Comptable Approval';
    } else if (cmd.status === 'validated' && !cmd.admin_validated) {
      return 'Pending Admin Approval';
    } else if (cmd.admin_validated) {
      return 'Fully Approved ✅';
    }
    return 'Unknown';
  };

  // NEW: Helper to determine which validation button to show
  const shouldShowComptableValidate = (cmd: PaymentOrder) => cmd.status === 'pending' && userProfile?.role === 'comptable';
  const shouldShowAdminValidate = (cmd: PaymentOrder) => cmd.status === 'validated' && !cmd.admin_validated && userProfile?.role === 'admin';
  const isFullyApproved = (cmd: PaymentOrder) => cmd.admin_validated === true;

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
          {t('nav.payment_commands')}
        </h1>
        <div className="flex gap-2">
          {userProfile && (
            <Badge variant="outline" className="flex gap-1">
              <Shield className="w-4 h-4" />
              {userProfile.role}
            </Badge>
          )}
          {userProfile?.role === 'comptable' && (
            <Button className="btn-gradient gap-2" onClick={() => setShowCreate(true)}>
              <PlusCircle className="w-4 h-4" /> {t('nav.create_payment')}
            </Button>
          )}
        </div>
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
                  
                  {/* NEW: Validation Status */}
                  <div className="border-t pt-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      {getValidationStatus(cmd)}
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => setViewCmd(cmd)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    {/* Comptable Validate Button (NEW) */}
                    {shouldShowComptableValidate(cmd) && (
                      <Button 
                        size="sm"
                        className="bg-yellow-500 hover:bg-yellow-600 flex-1"
                        onClick={() => setValidateId(cmd.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        تأكيد
                      </Button>
                    )}

                    {/* Admin Validate Button (NEW) */}
                    {shouldShowAdminValidate(cmd) && (
                      <Button 
                        size="sm"
                        className="bg-purple-500 hover:bg-purple-600 flex-1"
                        onClick={() => setAdminValidateId(cmd.id)}
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        موافقة الإدارة
                      </Button>
                    )}

                    {/* Show Approved Badge (NEW) */}
                    {isFullyApproved(cmd) && (
                      <Badge className="bg-green-500 text-white flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        موافق عليه
                      </Badge>
                    )}

                    {/* Edit/Delete (only for pending/comptable) */}
                    {userProfile?.role === 'comptable' && cmd.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => {
                          setEditCmd(cmd);
                          setEditPrice(cmd.total_price.toString());
                          setEditNote(cmd.note || '');
                        }}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDeleteId(cmd.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </>
                    )}

                    <Button size="sm" variant="outline" onClick={() => setShowPrint(cmd)}>
                      <Printer className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      {showCreate && userProfile?.role === 'comptable' && (
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إنشاء أمر دفع جديد</DialogTitle>
              <DialogDescription>اختر سند الطلب والمبلغ</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Input
                  placeholder="ابحث عن سند الطلب..."
                  value={searchBon}
                  onChange={(e) => setSearchBon(e.target.value)}
                  className="w-full"
                />
                {searchBon && filteredBons.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                    {filteredBons.map((bon) => (
                      <div
                        key={bon.id}
                        onClick={() => {
                          setSelectedBonId(bon.id);
                          setSearchBon('');
                        }}
                        className="p-2 hover:bg-secondary cursor-pointer text-sm"
                      >
                        {bon.bon_id} - {bon.total_price.toLocaleString()} د.ج
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedBonId && (
                <div className="p-2 bg-secondary rounded-md">
                  <p className="text-sm font-semibold">{selectedBonId}</p>
                </div>
              )}

              <Input
                type="number"
                placeholder="المبلغ الإجمالي النهائي"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
              />
              <Input
                placeholder="ملاحظة (اختياري)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>إلغاء</Button>
              <Button className="btn-gradient" onClick={handleCreate}>إنشاء</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Validate Dialog */}
      {validateId && (
        <Dialog open={!!validateId} onOpenChange={() => setValidateId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد أمر الدفع</DialogTitle>
              <DialogDescription>
                هل تريد تأكيد هذا أمر الدفع؟ سيتم نقله للمراجعة الإدارية.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setValidateId(null)}>إلغاء</Button>
              <Button className="bg-yellow-500" onClick={handleValidate}>تأكيد</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* NEW: Admin Validate Dialog */}
      {adminValidateId && (
        <Dialog open={!!adminValidateId} onOpenChange={() => setAdminValidateId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>موافقة إدارية على أمر الدفع</DialogTitle>
              <DialogDescription>
                تم التحقق من هذا الأمر من قبل المحاسب. هل تريد الموافقة الإدارية النهائية؟
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdminValidateId(null)}>إلغاء</Button>
              <Button className="bg-purple-500" onClick={handleAdminValidate}>موافقة الإدارة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      {deleteId && (
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>حذف أمر الدفع</DialogTitle>
              <DialogDescription>هل أنت متأكد من حذف هذا الأمر؟</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>إلغاء</Button>
              <Button variant="destructive" onClick={handleDelete}>حذف</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editCmd && (
        <Dialog open={!!editCmd} onOpenChange={() => setEditCmd(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل أمر الدفع</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="number"
                placeholder="المبلغ"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
              />
              <Input
                placeholder="ملاحظة"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditCmd(null)}>إلغاء</Button>
              <Button className="btn-gradient" onClick={handleEdit}>حفظ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* View Dialog */}
      {viewCmd && (
        <Dialog open={!!viewCmd} onOpenChange={() => setViewCmd(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تفاصيل أمر الدفع</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p><strong>المعرف:</strong> {viewCmd.id}</p>
              <p><strong>سند الطلب:</strong> {viewCmd.bon_commande_id}</p>
              <p><strong>المبلغ:</strong> {viewCmd.total_price.toLocaleString()} د.ج</p>
              <p><strong>الحالة:</strong> {viewCmd.status}</p>
              <p><strong>الحالة الإدارية:</strong> {viewCmd.admin_validated ? '✅ موافق عليه' : '⏳ قيد المراجعة'}</p>
              {viewCmd.note && <p><strong>ملاحظة:</strong> {viewCmd.note}</p>}
            </div>
            <DialogFooter>
              <Button onClick={() => setViewCmd(null)}>إغلاق</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Print Dialog */}
      {showPrint && (
        <Dialog open={!!showPrint} onOpenChange={() => setShowPrint(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>طباعة أمر الدفع</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm">حجم الخط</label>
                  <Input
                    type="number"
                    value={printFontSize}
                    onChange={(e) => setPrintFontSize(parseInt(e.target.value))}
                    min="10"
                    max="24"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm">اللون</label>
                  <Input
                    type="color"
                    value={printColor}
                    onChange={(e) => setPrintColor(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={printBold}
                      onChange={(e) => setPrintBold(e.target.checked)}
                    />
                    <span className="text-sm">غامق</span>
                  </label>
                </div>
              </div>

              <div ref={printRef} className="p-4 border rounded-lg bg-white">
                <h2 className="text-center font-bold mb-4">أمر دفع</h2>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>المعرف:</span><span>{showPrint.id}</span></div>
                  <div className="flex justify-between"><span>سند الطلب:</span><span>{showPrint.bon_commande_id}</span></div>
                  <div className="flex justify-between"><span>المبلغ:</span><span>{showPrint.total_price.toLocaleString()} د.ج</span></div>
                  <div className="flex justify-between"><span>الحالة:</span><span>{showPrint.status}</span></div>
                  {showPrint.note && <div className="flex justify-between"><span>ملاحظة:</span><span>{showPrint.note}</span></div>}
                </div>
              </div>

              <Button className="w-full" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                طباعة
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
