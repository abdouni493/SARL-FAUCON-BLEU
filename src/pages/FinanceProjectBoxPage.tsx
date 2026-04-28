import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { History, Edit3, Trash2, Eye, PlusCircle, Printer, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { formatDate } from '@/utils/dateFormatter';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import i18n from '@/i18n';

interface ProjectVersement {
  id: string;
  project_box_id: string;
  amount: number;
  date: string;
  description?: string;
}

interface ProjectBox {
  id: string;
  name: string;
  address: string;
  chef_id: string;
  total_amount: number;
  created_at: string;
  description?: string;
  project_versements: ProjectVersement[];
}

const FinanceProjectBoxPage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { enterpriseSettings } = useData();
  const [projects, setProjects] = useState<ProjectBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectBox | null>(null);
  const [showFinanceRequest, setShowFinanceRequest] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [financeAmount, setFinanceAmount] = useState('');
  const [financeDate, setFinanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [financeDescription, setFinanceDescription] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingPrintProject, setPendingPrintProject] = useState<ProjectBox | null>(null);

  // Create/Edit form
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formChefId, setFormChefId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTotalAmount, setFormTotalAmount] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_boxes')
        .select(`
          id, name, address, chef_id, description, total_amount, created_at,
          project_versements (id, project_box_id, amount, date, description)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data as ProjectBox[] || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error loading projects' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M DA`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K DA`;
    }
    return `${value.toLocaleString()} DA`;
  };

  const totalBoxesAmount = projects.reduce((sum, p) => sum + p.total_amount, 0);
  const totalVersements = projects.reduce((sum, p) => sum + (p.project_versements?.reduce((s, v) => s + v.amount, 0) || 0), 0);
  const totalRemaining = totalBoxesAmount - totalVersements;

  const handleAddVersement = async (projectId: string) => {
    try {
      if (!financeAmount || !financeDate) {
        setMessage({ type: 'error', text: t('common.fill_required_fields') });
        return;
      }

      const { error } = await supabase
        .from('project_versements')
        .insert({
          project_box_id: projectId,
          amount: parseFloat(financeAmount),
          date: financeDate,
          description: financeDescription || null
        });

      if (error) throw error;
      setMessage({ type: 'success', text: t('common.operation_successful') });
      setShowFinanceRequest(null);
      setFinanceAmount('');
      setFinanceDate(new Date().toISOString().split('T')[0]);
      setFinanceDescription('');
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleCreateProject = async () => {
    try {
      if (!formName || !formAddress || !formChefId || !formTotalAmount) {
        setMessage({ type: 'error', text: t('common.fill_required_fields') });
        return;
      }

      const { error } = await supabase
        .from('project_boxes')
        .insert({
          name: formName,
          address: formAddress,
          chef_id: formChefId,
          description: formDescription || null,
          total_amount: parseFloat(formTotalAmount)
        });

      if (error) throw error;
      setMessage({ type: 'success', text: t('common.created_successfully') });
      setShowCreate(false);
      setFormName('');
      setFormAddress('');
      setFormChefId('');
      setFormDescription('');
      setFormTotalAmount('');
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from('project_boxes')
        .delete()
        .eq('id', deleteId);
      if (error) throw error;
      setMessage({ type: 'success', text: t('common.deleted_successfully') });
      setDeleteId(null);
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleEditProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    setFormName(project.name);
    setFormAddress(project.address);
    setFormChefId(project.chef_id);
    setFormDescription(project.description || '');
    setFormTotalAmount(project.total_amount.toString());
    setEditingId(projectId);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !formName || !formAddress || !formChefId || !formTotalAmount) {
      setMessage({ type: 'error', text: t('common.fill_required_fields') });
      return;
    }
    try {
      const { error } = await supabase
        .from('project_boxes')
        .update({
          name: formName,
          address: formAddress,
          chef_id: formChefId,
          description: formDescription || null,
          total_amount: parseFloat(formTotalAmount)
        })
        .eq('id', editingId);

      if (error) throw error;
      setMessage({ type: 'success', text: t('common.updated_successfully') });
      setEditingId(null);
      setFormName('');
      setFormAddress('');
      setFormChefId('');
      setFormDescription('');
      setFormTotalAmount('');
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handlePrintProject = (project: ProjectBox, lang: 'ar' | 'fr') => {
    const printWindow = window.open('', '', 'height=1000,width=1200');
    if (!printWindow) return;

    const projVersements = project.project_versements?.reduce((sum, v) => sum + v.amount, 0) || 0;
    const projRemaining = project.total_amount - projVersements;
    const isAr = lang === 'ar';
    const dir = isAr ? 'rtl' : 'ltr';
    const fontFamily = isAr ? "'Tajawal', 'Arial', sans-serif" : "'Arial', sans-serif";
    const L = isAr ? {
      docTitle: 'وثيقة تمويل المشروع', address: 'العنوان', phone: 'الهاتف',
      projectAddress: 'عنوان المشروع', chefId: 'رئيس المشروع', projectCreated: 'تاريخ إنشاء المشروع',
      status: 'الحالة', active: 'نشط', completed: 'مكتمل',
      totalAmount: 'المبلغ الإجمالي', totalPaid: 'إجمالي المدفوع', remaining: 'المتبقي',
      description: 'الوصف', versements: 'دفعات التمويل', date: 'التاريخ', amount: 'المبلغ',
      totalPaidLabel: 'إجمالي المدفوع:', cachet: 'الختم', signature: 'التوقيع',
      preparedBy: 'أعدّ من طرف', approvedBy: 'صادق عليه',
      generatedOn: 'تم الإنشاء بتاريخ', allRights: 'جميع الحقوق محفوظة'
    } : {
      docTitle: 'Document de Finance Projet', address: 'Adresse', phone: 'Téléphone',
      projectAddress: 'Adresse du Projet', chefId: 'Chef de Projet', projectCreated: 'Projet Créé le',
      status: 'Statut', active: 'Actif', completed: 'Complété',
      totalAmount: 'Montant Total', totalPaid: 'Total Payé', remaining: 'Restant',
      description: 'Description', versements: 'Versements de Paiement', date: 'Date', amount: 'Montant',
      totalPaidLabel: 'TOTAL PAYÉ:', cachet: 'Cachet', signature: 'Signature',
      preparedBy: 'Préparé par', approvedBy: 'Approuvé par',
      generatedOn: 'Généré le', allRights: 'Tous droits réservés'
    };

    const html = `<!DOCTYPE html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${L.docTitle} - ${project.name}</title>
${isAr ? '<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">' : ''}
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:${fontFamily}; background:#fff; color:#333; padding:30px; direction:${dir}; }
.header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #2563eb; padding-bottom:20px; margin-bottom:10px; }
.company-info h1 { font-size:26px; color:#1e40af; margin-bottom:5px; }
.company-info p { font-size:12px; color:#666; margin:3px 0; }
.doc-title { text-align:center; font-size:20px; font-weight:bold; color:#1e40af; margin:15px 0; padding:8px; background:#f0f9ff; border-radius:6px; border:1px solid #bfdbfe; }
.logo { width:60px; height:60px; border-radius:8px; object-fit:cover; }
.project-title { font-size:20px; color:#1e40af; margin:15px 0 5px; font-weight:bold; }
.project-details { display:grid; grid-template-columns:repeat(2,1fr); gap:20px; margin-bottom:20px; padding:15px; background:#f0f9ff; border-radius:8px; border-${isAr?'right':'left'}:4px solid #2563eb; }
.detail-item h3 { font-size:11px; color:#666; font-weight:bold; margin-bottom:5px; text-transform:uppercase; }
.detail-item p { font-size:14px; font-weight:bold; color:#1e40af; }
.finance-summary { display:grid; grid-template-columns:repeat(3,1fr); gap:15px; margin-bottom:25px; }
.summary-card { padding:15px; border-radius:8px; border:2px solid #e5e7eb; text-align:center; }
.summary-card.total { background:#f0f9ff; border-color:#2563eb; } .summary-card.total p { color:#1e40af; }
.summary-card.paid { background:#f0fdf4; border-color:#16a34a; } .summary-card.paid p { color:#16a34a; }
.summary-card.remaining { background:#fef3c7; border-color:#f59e0b; } .summary-card.remaining p { color:#d97706; }
.summary-card h4 { font-size:11px; color:#666; text-transform:uppercase; margin-bottom:8px; }
.summary-card p { font-size:18px; font-weight:bold; }
table { width:100%; border-collapse:collapse; margin-top:15px; }
th { background:linear-gradient(135deg,#2563eb 0%,#4f46e5 100%); color:#fff; padding:10px 12px; text-align:${isAr?'right':'left'}; font-weight:bold; font-size:12px; }
td { padding:10px 12px; border-bottom:1px solid #e5e7eb; font-size:12px; }
tr:nth-child(even) { background:#f9fafb; }
.amount { text-align:${isAr?'left':'right'}; font-weight:bold; color:#1e40af; }
.signatures-section { display:grid; grid-template-columns:repeat(3,1fr); gap:30px; margin-top:60px; padding-top:20px; }
.signature-box { text-align:center; padding:15px; border:1px dashed #cbd5e1; border-radius:8px; min-height:120px; display:flex; flex-direction:column; justify-content:space-between; }
.signature-box h4 { font-size:13px; color:#1e40af; font-weight:bold; margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid #e2e8f0; }
.signature-box .sign-area { flex:1; min-height:60px; }
.signature-box .sign-label { font-size:10px; color:#94a3b8; margin-top:8px; padding-top:8px; border-top:1px solid #e2e8f0; }
.footer { margin-top:40px; padding-top:15px; border-top:1px solid #e5e7eb; text-align:center; color:#999; font-size:11px; }
@media print { body{padding:15px;} .header{page-break-after:avoid;} .signatures-section{page-break-inside:avoid;} }
</style></head><body>
<div class="header"><div class="company-info"><h1>${enterpriseSettings?.name || 'ERP System'}</h1>
<p><strong>${L.address}:</strong> ${enterpriseSettings?.address || 'N/A'}</p>
<p><strong>${L.phone}:</strong> ${enterpriseSettings?.phone || 'N/A'}</p>
</div>${enterpriseSettings?.logoUrl ? `<img src="${enterpriseSettings.logoUrl}" class="logo" />` : ''}</div>
<div class="doc-title">${L.docTitle}</div>
<h2 class="project-title">${project.name}</h2>
<div class="project-details">
<div class="detail-item"><h3>${L.projectAddress}</h3><p>${project.address}</p></div>
<div class="detail-item"><h3>${L.chefId}</h3><p>${project.chef_id}</p></div>
<div class="detail-item"><h3>${L.projectCreated}</h3><p>${formatDate(project.created_at)}</p></div>
<div class="detail-item"><h3>${L.status}</h3><p>${projRemaining <= 0 ? L.completed : L.active}</p></div>
</div>
<div class="finance-summary">
<div class="summary-card total"><h4>${L.totalAmount}</h4><p>${formatCurrency(project.total_amount)}</p></div>
<div class="summary-card paid"><h4>${L.totalPaid}</h4><p>${formatCurrency(projVersements)}</p></div>
<div class="summary-card remaining"><h4>${L.remaining}</h4><p>${formatCurrency(projRemaining)}</p></div>
</div>
${project.description ? `<div style="padding:15px;background:#f9fafb;border-radius:8px;border-${isAr?'right':'left'}:3px solid #2563eb;margin-bottom:20px;"><p><strong>${L.description}:</strong></p><p>${project.description}</p></div>` : ''}
${project.project_versements && project.project_versements.length > 0 ? `
<h3 style="color:#1e40af;margin-bottom:10px;font-size:16px;">${L.versements}</h3>
<table><thead><tr><th style="width:10%;">#</th><th style="width:30%;">${L.description}</th><th style="width:30%;">${L.date}</th><th style="width:30%;">${L.amount}</th></tr></thead><tbody>
${project.project_versements.map((v, idx) => `<tr><td style="text-align:center;font-weight:bold;">${idx+1}</td><td>${v.description || '-'}</td><td>${v.date}</td><td class="amount">${formatCurrency(v.amount)}</td></tr>`).join('')}
<tr style="background:#f0f9ff;font-weight:bold;"><td colspan="3" style="text-align:${isAr?'left':'right'};">${L.totalPaidLabel}</td><td class="amount">${formatCurrency(projVersements)}</td></tr>
</tbody></table>` : ''}
<div class="signatures-section">
<div class="signature-box"><h4>${L.preparedBy}</h4><div class="sign-area"></div><div class="sign-label">${L.cachet} / ${L.signature}</div></div>
<div class="signature-box"><h4>${L.approvedBy}</h4><div class="sign-area"></div><div class="sign-label">${L.cachet} / ${L.signature}</div></div>
<div class="signature-box"><h4>${L.date}</h4><div class="sign-area"></div><div class="sign-label">${L.cachet} / ${L.signature}</div></div>
</div>
<div class="footer"><p>${L.generatedOn} ${new Date().toLocaleString(isAr ? 'ar-DZ' : 'fr-FR')}</p>
<p>&copy; ${new Date().getFullYear()} ${enterpriseSettings?.name || 'ERP System'}. ${L.allRights}.</p></div>
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
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
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2"
      >
        {t('nav.finance_box')}
      </motion.h1>

      {/* Message Display */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </motion.div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="group relative erp-card border-2 border-blue-100 dark:border-slate-700 overflow-hidden hover:shadow-xl">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150" />
          <div className="relative">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">{t('common.total_amount')}</p>
            <p className="text-3xl font-bold text-foreground mt-2">{formatCurrency(totalBoxesAmount)}</p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="group relative erp-card border-2 border-emerald-100 dark:border-slate-700 overflow-hidden hover:shadow-xl bg-gradient-to-br from-emerald-600 to-emerald-700">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150" />
          <div className="relative">
            <p className="text-xs font-semibold text-emerald-100 uppercase">{t('comptable.versements')}</p>
            <p className="text-3xl font-bold text-white mt-2">{formatCurrency(totalVersements)}</p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="group relative erp-card border-2 border-purple-100 dark:border-slate-700 overflow-hidden hover:shadow-xl bg-gradient-to-br from-purple-600 to-purple-700">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-purple-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150" />
          <div className="relative">
            <p className="text-xs font-semibold text-purple-100 uppercase">{t('nav.finance_box')}</p>
            <p className="text-3xl font-bold text-white mt-2">{projects.length}</p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="group relative erp-card border-2 border-orange-100 dark:border-slate-700 overflow-hidden hover:shadow-xl bg-gradient-to-br from-orange-600 to-orange-700">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-orange-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150" />
          <div className="relative">
            <p className="text-xs font-semibold text-orange-100 uppercase">{t('common.remaining')}</p>
            <p className="text-3xl font-bold text-white mt-2">{formatCurrency(totalRemaining)}</p>
          </div>
        </motion.div>
      </div>

      {/* Project Boxes Grid */}
      {!projects || projects.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="erp-card text-center py-12 text-muted-foreground">
          {t('common.no_data')}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project, i) => {
            const projVersements = project.project_versements?.reduce((sum, v) => sum + v.amount, 0) || 0;
            const projRemaining = project.total_amount - projVersements;
            
            return (
              <motion.div 
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="group relative erp-card border-2 border-blue-100 dark:border-slate-700 hover:shadow-xl transition-all overflow-hidden"
              >
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150" />
                <div className="relative space-y-4">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg text-foreground">{project.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('common.chef_id')}: {project.chef_id}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold">
                        {project.project_versements?.length || 0} {t('comptable.versements')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{project.address}</p>
                  </div>

                  <div className="bg-blue-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-2 border border-blue-100 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">{t('common.total_amount')}</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(project.total_amount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">{t('comptable.versements')}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(projVersements)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-blue-100 dark:border-slate-700">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">{t('common.remaining')}</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400">{formatCurrency(projRemaining)}</span>
                    </div>
                  </div>

                  {project.description && (
                    <p className="text-sm text-muted-foreground italic">{project.description}</p>
                  )}
                </div>

                <div className="flex gap-1.5 flex-wrap mt-4 relative">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedProject(project);
                      setShowDetails(project.id);
                    }}
                    className="gap-1 btn-gradient text-white font-semibold px-3 h-8 text-xs flex-1"
                  >
                    <Eye className="w-3 h-3" /> {t('common.view')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedProject(project);
                      setShowHistory(project.id);
                    }}
                    className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 h-8 text-xs flex-1"
                  >
                    <History className="w-3 h-3" /> {t('common.history')}
                  </Button>
                  {user?.role !== 'chef_projet' && (
                    <Button
                      size="sm"
                      onClick={() => setShowFinanceRequest(project.id)}
                      className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2 h-8 text-xs"
                    >
                      <PlusCircle className="w-3 h-3" />
                    </Button>
                  )}
                  {user?.role !== 'chef_projet' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleEditProject(project.id)}
                      className="gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2 h-8 text-xs"
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                  )}
                  {user?.role !== 'chef_projet' && (
                    <Button 
                      size="sm" 
                      onClick={() => setDeleteId(project.id)}
                      className="gap-1 bg-red-600 hover:bg-red-700 text-white font-semibold px-2 h-8 text-xs"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    onClick={() => setPendingPrintProject(project)}
                    className="gap-1 btn-gradient text-white font-semibold px-2 h-8 text-xs"
                  >
                    <Printer className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Versement Dialog */}
      <Dialog open={!!showFinanceRequest} onOpenChange={() => { setShowFinanceRequest(null); setFinanceAmount(''); setFinanceDate(new Date().toISOString().split('T')[0]); setFinanceDescription(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('comptable.add_versement')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t('common.amount')}</label>
              <Input 
                type="number" 
                value={financeAmount}
                onChange={(e) => setFinanceAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t('common.date')}</label>
              <Input 
                type="date" 
                value={financeDate}
                onChange={(e) => setFinanceDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t('common.description')}</label>
              <Textarea 
                value={financeDescription}
                onChange={(e) => setFinanceDescription(e.target.value)}
                placeholder={t('common.enter_description')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowFinanceRequest(null); setFinanceAmount(''); setFinanceDate(new Date().toISOString().split('T')[0]); setFinanceDescription(''); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => handleAddVersement(showFinanceRequest || '')} className="bg-emerald-600 hover:bg-emerald-700">
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={!!showHistory} onOpenChange={() => { setShowHistory(null); setSelectedProject(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">{t('common.payment_history')}</DialogTitle>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{selectedProject?.name}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pr-6">
            {selectedProject?.project_versements && selectedProject.project_versements.length > 0 ? (
              <>
                {selectedProject.project_versements.map((versement, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-foreground">{versement.description || 'Payment'}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(versement.date)}</p>
                      </div>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(versement.amount)}</p>
                    </div>
                    {versement.description && (
                      <p className="text-sm text-muted-foreground">{versement.description}</p>
                    )}
                  </motion.div>
                ))}
                <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-700">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">
                      {t('common.total_paid')}
                    </p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(
                        selectedProject.project_versements.reduce(
                          (sum, v) => sum + v.amount,
                          0
                        )
                      )}
                    </p>
                  </div>
                </Card>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-12">{t('common.no_data')}</p>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-blue-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => { setShowHistory(null); setSelectedProject(null); }} className="font-semibold">
              {t('common.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!showDetails} onOpenChange={() => { setShowDetails(null); setSelectedProject(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">{selectedProject?.name}</DialogTitle>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Finance Project Details</p>
              </div>
            </div>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-6 pr-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.address')}</p>
                  <p className="text-sm font-semibold text-foreground">{selectedProject.address}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.chef_id')}</p>
                  <p className="text-sm font-semibold text-foreground">{selectedProject.chef_id}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.date')}</p>
                  <p className="text-sm font-semibold text-foreground">{formatDate(selectedProject.created_at)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">{t('common.total_amount')}</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(selectedProject.total_amount)}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('comptable.versements')}</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatCurrency(
                    selectedProject.project_versements?.reduce((sum, v) => sum + v.amount, 0) || 0
                  )}</p>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                  <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-2">{t('common.remaining')}</p>
                  <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{formatCurrency(
                    selectedProject.total_amount - (selectedProject.project_versements?.reduce((sum, v) => sum + v.amount, 0) || 0)
                  )}</p>
                </div>
              </div>

              {selectedProject.description && (
                <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t('common.description')}</p>
                  <p className="text-sm text-foreground">{selectedProject.description}</p>
                </div>
              )}

              {selectedProject.project_versements && selectedProject.project_versements.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
                    {t('comptable.versements')} ({selectedProject.project_versements.length})
                  </h3>
                  <div className="border border-blue-200 dark:border-slate-600 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-700 dark:to-slate-800 border-b border-blue-200 dark:border-slate-600">
                        <tr>
                          <th className="p-4 text-left font-bold text-blue-950 dark:text-blue-100">{t('common.date')}</th>
                          <th className="p-4 text-left font-bold text-blue-950 dark:text-blue-100">{t('common.description')}</th>
                          <th className="p-4 text-right font-bold text-blue-950 dark:text-blue-100">{t('common.amount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProject.project_versements.map((v, idx) => (
                          <tr 
                            key={v.id}
                            className={`border-b border-blue-100 dark:border-slate-700 transition-colors ${
                              idx % 2 === 0 
                                ? 'bg-white dark:bg-slate-800' 
                                : 'bg-blue-50 dark:bg-slate-700'
                            } hover:bg-blue-100 dark:hover:bg-slate-600`}
                          >
                            <td className="p-4 font-semibold text-foreground">{formatDate(v.date)}</td>
                            <td className="p-4 text-foreground">{v.description || '-'}</td>
                            <td className="p-4 text-right">
                              <span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-600 text-emerald-700 dark:text-emerald-100 rounded-full font-semibold text-sm">
                                {formatCurrency(v.amount)}
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
            <Button variant="outline" onClick={() => { setShowDetails(null); setSelectedProject(null); }} className="font-semibold">
              {t('common.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Box Dialog */}
      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('common.edit')} {t('comptable.create_project_box')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t('common.name')}</label>
              <Input 
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('common.name')}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t('common.address')}</label>
              <Input 
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder={t('common.address')}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t('common.chef_id')}</label>
              <Input 
                value={formChefId}
                onChange={(e) => setFormChefId(e.target.value)}
                placeholder={t('common.chef_id')}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t('common.total_amount')}</label>
              <Input 
                type="number" 
                value={formTotalAmount}
                onChange={(e) => setFormTotalAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t('common.description')}</label>
              <Textarea 
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t('common.description')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700">
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project Box Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('comptable.create_project_box')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t('common.name')}</label>
              <Input 
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('common.name')}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t('common.address')}</label>
              <Input 
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder={t('common.address')}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t('common.chef_id')}</label>
              <Input 
                value={formChefId}
                onChange={(e) => setFormChefId(e.target.value)}
                placeholder={t('common.chef_id')}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t('common.total_amount')}</label>
              <Input 
                type="number" 
                value={formTotalAmount}
                onChange={(e) => setFormTotalAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t('common.description')}</label>
              <Textarea 
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t('common.description')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateProject} className="bg-blue-600 hover:bg-blue-700">
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('comptable.delete_project_warning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProject}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Language Chooser Dialog */}
      <Dialog open={!!pendingPrintProject} onOpenChange={() => setPendingPrintProject(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
            <DialogTitle className="text-xl font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" /> {t('common.choose_print_language')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 px-2 pb-2">
            <Button
              onClick={() => {
                if (pendingPrintProject) handlePrintProject(pendingPrintProject, 'ar');
                setPendingPrintProject(null);
              }}
              className="h-24 flex flex-col gap-2 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-lg rounded-xl shadow-lg"
            >
              <span className="text-2xl">🇩🇿</span>
              {t('common.print_in_arabic')}
            </Button>
            <Button
              onClick={() => {
                if (pendingPrintProject) handlePrintProject(pendingPrintProject, 'fr');
                setPendingPrintProject(null);
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
};

export default FinanceProjectBoxPage;
