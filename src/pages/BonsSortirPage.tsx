import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Edit, Trash2, Plus, Save, Loader, Printer, Package,
  BarChart3, AlertCircle, X, Search, ArrowUpFromLine, FolderOpen,
} from 'lucide-react';
import { getPrintLabels, buildPrintHTML, openPrintWindow, formatDateLocale } from '@/lib/printUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBonsSortir, BonSortir, BonSortirProduct, ProductSearchResult } from '@/hooks/useBonsSortir';

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ProjectBox {
  id: string;
  name: string;
}

function generateBonId(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BSR-${datePart}-${rand}`;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  } catch {
    return dateStr;
  }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({
  icon: Icon,
  label,
  value,
  gradient,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  gradient: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="group relative erp-card hover:shadow-lg transition-all border-2 border-blue-100 dark:border-slate-700 overflow-hidden"
  >
    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150" />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">{label}</p>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${gradient} shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </div>
  </motion.div>
);

// ─── Language picker (shared pattern) ────────────────────────────────────────

function LangPickerDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (lang: 'ar' | 'fr') => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Choisir la langue d'impression</DialogTitle>
          <DialogDescription>Sélectionnez la langue du document imprimé.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-4 justify-center py-4">
          <Button
            size="lg"
            className="flex-1 btn-gradient"
            onClick={() => { onSelect('ar'); onClose(); }}
          >
            🇩🇿 Arabe
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1"
            onClick={() => { onSelect('fr'); onClose(); }}
          >
            🇫🇷 Français
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BonsSortirPage() {
  const { t, i18n } = useTranslation();
  const { enterpriseSettings } = useData();
  const {
    bons,
    loading,
    error,
    fetchBonsSortir,
    createBonSortir,
    updateBonSortir,
    deleteBonSortir,
    searchProducts,
  } = useBonsSortir();

  // Projects
  const [projectBoxes, setProjectBoxes] = useState<ProjectBox[]>([]);

  // UI state
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewBon, setViewBon] = useState<BonSortir | null>(null);
  const [editingBon, setEditingBon] = useState<BonSortir | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [langPickerBon, setLangPickerBon] = useState<BonSortir | null>(null);
  const [savingForm, setSavingForm] = useState(false);

  // Form state
  const [formBonId, setFormBonId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formProducts, setFormProducts] = useState<BonSortirProduct[]>([]);

  // Product search
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<ProductSearchResult[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchBonsSortir();
    fetchProjectBoxes();
  }, [fetchBonsSortir]);

  const fetchProjectBoxes = async () => {
    const { data } = await supabase
      .from('project_boxes')
      .select('id, name')
      .order('name', { ascending: true });
    setProjectBoxes(data || []);
  };

  // ── Product search (debounced 300 ms) ─────────────────────────────────────

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!productQuery.trim()) {
      setProductResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchingProducts(true);
      const results = await searchProducts(productQuery);
      setProductResults(results);
      setSearchingProducts(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [productQuery, searchProducts]);

  // ── Form helpers ──────────────────────────────────────────────────────────

  const openCreateDialog = () => {
    setEditingBon(null);
    setFormBonId(generateBonId());
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormDescription('');
    setFormProjectId('');
    setFormProducts([]);
    setProductQuery('');
    setProductResults([]);
    setShowFormDialog(true);
  };

  const openEditDialog = (bon: BonSortir) => {
    setEditingBon(bon);
    setFormBonId(bon.bon_id);
    setFormDate(bon.exit_date.slice(0, 10));
    setFormDescription(bon.description || '');
    setFormProjectId(bon.project_box_id || '');
    setFormProducts(bon.products.map((p) => ({ ...p })));
    setProductQuery('');
    setProductResults([]);
    setShowFormDialog(true);
  };

  const addProductFromSearch = (p: ProductSearchResult) => {
    setFormProducts((prev) => [
      ...prev,
      {
        product_id: p.id,
        product_name: p.name,
        barcode: p.barcode,
        quantity: 1,
      },
    ]);
    setProductQuery('');
    setProductResults([]);
  };

  const removeFormProduct = (idx: number) => {
    setFormProducts((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateFormProductQty = (idx: number, qty: number) => {
    setFormProducts((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, quantity: Math.max(1, qty) } : p))
    );
  };

  const handleSaveForm = async () => {
    if (!formProjectId) {
      setMessage('❌ Veuillez sélectionner un projet.');
      return;
    }
    if (formProducts.length === 0) {
      setMessage('❌ Veuillez ajouter au moins un produit.');
      return;
    }

    try {
      setSavingForm(true);
      if (editingBon) {
        await updateBonSortir(editingBon.id, {
          bon_id: formBonId,
          exit_date: formDate,
          description: formDescription,
          project_box_id: formProjectId,
          products: formProducts,
        });
        setMessage('✅ Bon de sortir mis à jour avec succès!');
      } else {
        await createBonSortir({
          bon_id: formBonId,
          exit_date: formDate,
          description: formDescription,
          project_box_id: formProjectId,
          products: formProducts,
        });
        setMessage('✅ Bon de sortir créé avec succès!');
      }
      setShowFormDialog(false);
      await fetchBonsSortir();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`❌ Erreur: ${err.message}`);
    } finally {
      setSavingForm(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteBonSortir(deleteId);
      setDeleteId(null);
      setViewBon(null);
      setMessage('✅ Bon de sortir supprimé.');
      await fetchBonsSortir();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`❌ Erreur: ${err.message}`);
    }
  };

  // ── Print ─────────────────────────────────────────────────────────────────

  const handlePrint = (bon: BonSortir, lang: 'ar' | 'fr') => {
    const L = getPrintLabels(lang);
    const projectName =
      projectBoxes.find((p) => p.id === bon.project_box_id)?.name ??
      bon.project_name ??
      '-';

    const body = `
      <div class="details-grid">
        <div class="detail-item">
          <h3>${lang === 'ar' ? 'رقم الوصل' : 'N° Bon de Sortir'}</h3>
          <p>${bon.bon_id}</p>
        </div>
        <div class="detail-item">
          <h3>${L.date}</h3>
          <p>${formatDateLocale(bon.exit_date, lang)}</p>
        </div>
        <div class="detail-item">
          <h3>${L.project}</h3>
          <p>${projectName}</p>
        </div>
      </div>
      ${
        bon.description
          ? `<div class="details-grid-2"><div class="detail-item"><h3>${L.description}</h3><p>${bon.description}</p></div></div>`
          : ''
      }
      <h2 class="section-title">${lang === 'ar' ? 'قائمة المنتجات الخارجة' : 'Liste des Produits Sortis'}</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>${L.productName}</th>
            <th>Barcode</th>
            <th>${L.quantity}</th>
          </tr>
        </thead>
        <tbody>
          ${bon.products
            .map(
              (p, i) => `
            <tr>
              <td>${i + 1}</td>
              <td class="product-name">${p.product_name}</td>
              <td>${p.barcode ?? '-'}</td>
              <td>${p.quantity}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
      <div class="signatures-section">
        <div class="signature-box">
          <h4>${lang === 'ar' ? 'مسؤول المخزن' : 'Responsable Stock'}</h4>
          <div class="sign-area"></div>
          <div class="sign-label">${L.signature} / ${L.cachet}</div>
        </div>
        <div class="signature-box">
          <h4>${lang === 'ar' ? 'مسؤول المشروع' : 'Détecteur de Projet'}</h4>
          <div class="sign-area"></div>
          <div class="sign-label">${L.signature} / ${L.cachet}</div>
        </div>
        <div class="signature-box">
          <h4>${lang === 'ar' ? 'المدير العام' : 'Directeur Général'}</h4>
          <div class="sign-area"></div>
          <div class="sign-label">${L.signature} / ${L.cachet}</div>
        </div>
      </div>
    `;

    openPrintWindow(
      buildPrintHTML(
        {
          lang,
          docTitle: { ar: 'وصل خروج مواد', fr: 'Bon de Sortir Matériel' },
          enterpriseSettings,
        },
        body
      )
    );
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const thisMonth = new Date().toISOString().slice(0, 7);
  const totalDispatchedThisMonth = bons
    .filter((b) => b.exit_date?.startsWith(thisMonth))
    .reduce((sum, b) => sum + b.products.reduce((s, p) => s + p.quantity, 0), 0);
  const distinctProjects = new Set(bons.map((b) => b.project_box_id).filter(Boolean)).size;

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filteredBons = bons.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      b.bon_id.toLowerCase().includes(q) ||
      (b.project_name ?? '').toLowerCase().includes(q) ||
      (b.description ?? '').toLowerCase().includes(q)
    );
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-1">
              {t('nav.bons_sortir') || 'Bons de Sortir'}
            </h1>
            <p className="text-muted-foreground text-sm">{new Date().toLocaleDateString()}</p>
          </div>
          <Button className="btn-gradient gap-2" onClick={openCreateDialog}>
            <Plus className="w-4 h-4" /> Nouveau Bon
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard icon={ArrowUpFromLine} label="Total Bons de Sortir" value={bons.length} gradient="btn-gradient" delay={0.1} />
        <StatCard icon={Package} label="Produits sortis (ce mois)" value={totalDispatchedThisMonth} gradient="btn-gradient-warm" delay={0.15} />
        <StatCard icon={FolderOpen} label="Projets servis" value={distinctProjects} gradient="btn-gradient-success" delay={0.2} />
      </div>

      {/* Search */}
      <div className="relative">
        <Input
          placeholder="Rechercher par ID, Projet, Description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11"
        />
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        {searchQuery && (
          <button className="absolute right-3 top-3" onClick={() => setSearchQuery('')}>
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-blue-50 dark:bg-slate-700 border-l-4 border-blue-600 rounded"
        >
          <p className="text-blue-700 dark:text-blue-200">{message}</p>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Cards grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredBons.length === 0 ? (
        <div className="text-center p-12 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun bon de sortir trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filteredBons.map((bon, idx) => {
              const projectName =
                projectBoxes.find((p) => p.id === bon.project_box_id)?.name ??
                bon.project_name ??
                '-';

              return (
                <motion.div
                  key={bon.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: idx * 0.04 }}
                  className="erp-card hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Card header */}
                  <div className="bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-800 dark:to-emerald-800 -mx-6 -mt-6 px-6 py-5 mb-5 rounded-t-lg border-b-2 border-teal-700">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-white truncate font-mono">{bon.bon_id}</h3>
                        <p className="text-sm text-teal-100 mt-1">📅 {formatDate(bon.exit_date)}</p>
                        {projectName !== '-' && (
                          <p className="text-xs text-teal-200 mt-1 font-semibold truncate">🏗️ {projectName}</p>
                        )}
                      </div>
                      <Badge className="bg-teal-100 text-teal-800 shrink-0">
                        {bon.products.length} produit{bon.products.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="flex-1 space-y-3 px-6">
                    {bon.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {bon.description.length > 60
                          ? bon.description.slice(0, 60) + '…'
                          : bon.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 p-2 bg-teal-50 dark:bg-slate-700 rounded border border-teal-200 dark:border-slate-600">
                      <Package className="w-4 h-4 text-teal-600" />
                      <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">
                        Qté totale: {bon.products.reduce((s, p) => s + p.quantity, 0)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-6 pb-4 pt-3 mt-auto">
                    <div className="grid grid-cols-4 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewBon(bon)}
                        title="Voir Détails"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(bon)}
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLangPickerBon(bon)}
                        title="Imprimer"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteId(bon.id)}
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Create / Edit Dialog ────────────────────────────────────────────── */}
      <Dialog open={showFormDialog} onOpenChange={(v) => !v && setShowFormDialog(false)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBon ? 'Modifier Bon de Sortir' : 'Créer Bon de Sortir'}
            </DialogTitle>
            <DialogDescription>
              {editingBon ? 'Mettre à jour les informations du bon de sortir.' : 'Saisir les informations du nouveau bon de sortir.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">N° Bon</label>
                <Input value={formBonId} onChange={(e) => setFormBonId(e.target.value)} placeholder="BSR-YYYYMMDD-XXXX" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Date de Sortie</label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
            </div>

            {/* Project */}
            <div>
              <label className="block text-sm font-semibold mb-1">Projet <span className="text-red-500">*</span></label>
              <Select value={formProjectId} onValueChange={setFormProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un projet..." />
                </SelectTrigger>
                <SelectContent>
                  {projectBoxes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold mb-1">Description</label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Description facultative..."
                rows={2}
              />
            </div>

            {/* Product search */}
            <div>
              <label className="block text-sm font-semibold mb-1">Rechercher un produit</label>
              <div className="relative">
                <Input
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Nom ou code-barre..."
                  className="pl-9"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                {searchingProducts && (
                  <Loader className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-blue-500" />
                )}
              </div>
              {/* Dropdown results */}
              {productResults.length > 0 && (
                <div className="border rounded-lg mt-1 bg-background shadow-lg max-h-48 overflow-y-auto z-50">
                  {productResults.map((p) => (
                    <button
                      key={p.id}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 text-sm flex items-center justify-between gap-2"
                      onClick={() => addProductFromSearch(p)}
                    >
                      <span className="font-medium">{p.name}</span>
                      {p.barcode && <span className="text-xs text-muted-foreground font-mono">{p.barcode}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Products table */}
            {formProducts.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-teal-50 dark:bg-slate-800 px-4 py-3 border-b">
                  <h3 className="font-semibold text-sm">Produits à sortir ({formProducts.length})</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b">
                      <th className="px-4 py-2 text-left">Produit</th>
                      <th className="px-4 py-2 text-left">Barcode</th>
                      <th className="px-4 py-2 text-center">Quantité</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formProducts.map((p, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="px-4 py-2 font-medium">{p.product_name}</td>
                        <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{p.barcode ?? '-'}</td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            min={1}
                            value={p.quantity}
                            onChange={(e) => updateFormProductQty(idx, parseInt(e.target.value) || 1)}
                            className="w-20 mx-auto text-center text-xs"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFormProduct(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>Annuler</Button>
            <Button className="btn-gradient" onClick={handleSaveForm} disabled={savingForm}>
              {savingForm ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {editingBon ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Details Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!viewBon} onOpenChange={(v) => !v && setViewBon(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewBon && (
            <>
              <DialogHeader>
                <DialogTitle>Bon de Sortir: {viewBon.bon_id}</DialogTitle>
                <DialogDescription>
                  {formatDate(viewBon.exit_date)} — {projectBoxes.find((p) => p.id === viewBon.project_box_id)?.name ?? viewBon.project_name ?? '-'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Info grid */}
                <div className="grid grid-cols-3 gap-4 p-3 bg-teal-50 dark:bg-slate-700 rounded-lg border border-teal-200">
                  <div>
                    <span className="text-xs text-muted-foreground block">N° Bon</span>
                    <span className="font-bold font-mono text-foreground">{viewBon.bon_id}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Date</span>
                    <span className="font-bold text-foreground">{formatDate(viewBon.exit_date)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Projet</span>
                    <span className="font-bold text-teal-700">
                      {projectBoxes.find((p) => p.id === viewBon.project_box_id)?.name ?? viewBon.project_name ?? '-'}
                    </span>
                  </div>
                </div>

                {viewBon.description && (
                  <div className="p-3 bg-amber-50 dark:bg-slate-700 border border-amber-200 rounded-lg">
                    <h4 className="font-semibold mb-1 text-sm">Description</h4>
                    <p className="text-sm">{viewBon.description}</p>
                  </div>
                )}

                {/* Products table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-teal-50 dark:bg-slate-800 px-4 py-3 border-b">
                    <h3 className="font-semibold text-sm">Produits ({viewBon.products.length})</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b">
                        <th className="px-4 py-2 text-left">#</th>
                        <th className="px-4 py-2 text-left">Nom du Produit</th>
                        <th className="px-4 py-2 text-left">Barcode</th>
                        <th className="px-4 py-2 text-center">Quantité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewBon.products.map((p, idx) => (
                        <tr key={idx} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="px-4 py-2 text-center">{idx + 1}</td>
                          <td className="px-4 py-2 font-semibold">{p.product_name}</td>
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{p.barcode ?? '-'}</td>
                          <td className="px-4 py-2 text-center font-bold">{p.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => openEditDialog(viewBon)}>
                  <Edit className="w-4 h-4 mr-2" /> Modifier
                </Button>
                <Button className="btn-gradient" onClick={() => setLangPickerBon(viewBon)}>
                  <Printer className="w-4 h-4 mr-2" /> Imprimer
                </Button>
                <Button variant="outline" onClick={() => setViewBon(null)}>Fermer</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Alert ────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce Bon de Sortir ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le bon de sortir et ses produits seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Language Picker ─────────────────────────────────────────────────── */}
      <LangPickerDialog
        open={!!langPickerBon}
        onClose={() => setLangPickerBon(null)}
        onSelect={(lang) => {
          if (langPickerBon) handlePrint(langPickerBon, lang);
          setLangPickerBon(null);
        }}
      />
    </div>
  );
}
