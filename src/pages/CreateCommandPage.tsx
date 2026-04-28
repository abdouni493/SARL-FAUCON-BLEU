import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useData, Product } from '@/contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ProductEntry {
  name: string;
  category: string;
  unity: string;
  quantity: number;
  note: string;
}

export default function CreateCommandPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { categories, unities, addCategory, addUnity, addCommand } = useData();
  const navigate = useNavigate();

  const [products, setProducts] = useState<ProductEntry[]>([{ name: '', category: '', unity: '', quantity: 1, note: '' }]);
  const [newCat, setNewCat] = useState('');
  const [newUnity, setNewUnity] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [showNewUnity, setShowNewUnity] = useState(false);

  const updateProduct = (i: number, field: keyof ProductEntry, val: string | number) => {
    const updated = [...products];
    (updated[i] as any)[field] = val;
    setProducts(updated);
  };

  const addProductRow = () => setProducts([...products, { name: '', category: '', unity: '', quantity: 1, note: '' }]);
  const removeProduct = (i: number) => setProducts(products.filter((_, idx) => idx !== i));

  const handleSave = () => {
    const cmdProducts: Product[] = products.filter(p => p.name).map((p, i) => ({
      id: `p-${Date.now()}-${i}`,
      name: p.name,
      category: p.category,
      unity: p.unity,
      quantity: p.quantity,
      price: 0,
      note: p.note,
    }));

    if (cmdProducts.length === 0) return;

    addCommand({
      id: `CMD-${String(Date.now()).slice(-4)}`,
      products: cmdProducts,
      status: 'pending',
      createdBy: user?.fullName || '',
      createdAt: new Date().toISOString().split('T')[0],
    });

    navigate('/material-commands');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground">{t('nav.create_command')}</h1>

      <div className="space-y-4">
        {products.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="erp-card"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-foreground">#{i + 1}</span>
              {products.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeProduct(i)} className="text-destructive">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t('common.name')}</label>
                <Input value={p.name} onChange={e => updateProduct(i, 'name', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t('common.category')}</label>
                <div className="flex gap-2">
                  <Select value={p.category} onValueChange={v => updateProduct(i, 'category', v)}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="outline" onClick={() => setShowNewCat(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t('common.unity')}</label>
                <div className="flex gap-2">
                  <Select value={p.unity} onValueChange={v => updateProduct(i, 'unity', v)}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {unities.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="outline" onClick={() => setShowNewUnity(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t('common.quantity')}</label>
                <Input type="number" min={1} value={p.quantity} onChange={e => updateProduct(i, 'quantity', Number(e.target.value))} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm text-muted-foreground mb-1 block">{t('common.note')}</label>
                <Textarea value={p.note} onChange={e => updateProduct(i, 'note', e.target.value)} rows={2} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={addProductRow} className="gap-2">
          <Plus className="w-4 h-4" /> {t('common.add_product')}
        </Button>
        <Button onClick={handleSave} className="gap-2 erp-gradient-bg border-0 text-primary-foreground">
          <Save className="w-4 h-4" /> {t('common.save')}
        </Button>
      </div>

      {/* New Category Dialog */}
      <Dialog open={showNewCat} onOpenChange={setShowNewCat}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('common.new_category')}</DialogTitle></DialogHeader>
          <Input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder={t('common.name')} />
          <Button onClick={() => { if (newCat) { addCategory(newCat); setNewCat(''); setShowNewCat(false); } }}>{t('common.save')}</Button>
        </DialogContent>
      </Dialog>

      {/* New Unity Dialog */}
      <Dialog open={showNewUnity} onOpenChange={setShowNewUnity}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('common.new_unity')}</DialogTitle></DialogHeader>
          <Input value={newUnity} onChange={e => setNewUnity(e.target.value)} placeholder={t('common.name')} />
          <Button onClick={() => { if (newUnity) { addUnity(newUnity); setNewUnity(''); setShowNewUnity(false); } }}>{t('common.save')}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
