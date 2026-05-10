/**
 * Shared bilingual print utility for all ERP pages.
 * Generates professional print templates with Arabic RTL / French LTR support,
 * company branding, and cachet/signature sections.
 */

export interface PrintConfig {
  lang: 'ar' | 'fr';
  docTitle: { ar: string; fr: string };
  enterpriseSettings?: {
    name?: string;
    address?: string;
    phone?: string;
    logoUrl?: string;
  };
}

export function getPrintLabels(lang: 'ar' | 'fr') {
  const isAr = lang === 'ar';
  return {
    isAr,
    dir: isAr ? 'rtl' as const : 'ltr' as const,
    fontFamily: isAr ? "'Tajawal', 'Arial', sans-serif" : "'Arial', sans-serif",
    address: isAr ? 'العنوان' : 'Adresse',
    phone: isAr ? 'الهاتف' : 'Téléphone',
    cachet: isAr ? 'الختم' : 'Cachet',
    signature: isAr ? 'التوقيع' : 'Signature',
    preparedBy: isAr ? 'أعدّ من طرف' : 'Préparé par',
    approvedBy: isAr ? 'صادق عليه' : 'Approuvé par',
    receivedBy: isAr ? 'استلمه' : 'Reçu par',
    generatedOn: isAr ? 'تم الإنشاء بتاريخ' : 'Généré le',
    allRights: isAr ? 'جميع الحقوق محفوظة' : 'Tous droits réservés',
    date: isAr ? 'التاريخ' : 'Date',
    status: isAr ? 'الحالة' : 'Statut',
    commandId: isAr ? 'رقم الأمر' : 'ID Commande',
    productName: isAr ? 'اسم المنتج' : 'Nom du Produit',
    quantity: isAr ? 'الكمية' : 'Quantité',
    price: isAr ? 'السعر' : 'Prix',
    unitPrice: isAr ? 'سعر الوحدة' : 'Prix Unitaire',
    totalPrice: isAr ? 'السعر الإجمالي' : 'Prix Total',
    notes: isAr ? 'ملاحظات' : 'Notes',
    description: isAr ? 'الوصف' : 'Description',
    amount: isAr ? 'المبلغ' : 'Montant',
    total: isAr ? 'المجموع' : 'Total',
    category: isAr ? 'الفئة' : 'Catégorie',
    unity: isAr ? 'الوحدة' : 'Unité',
    supplier: isAr ? 'المورد' : 'Fournisseur',
    createdBy: isAr ? 'أنشأه' : 'Créé par',
    project: isAr ? 'المشروع' : 'Projet',
    noData: isAr ? 'لا توجد بيانات' : 'Aucune donnée',
  };
}

export function getPrintStyles(lang: 'ar' | 'fr') {
  const { isAr, dir, fontFamily } = getPrintLabels(lang);
  return `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:${fontFamily}; background:#fff; color:#333; padding:30px; direction:${dir}; }
    .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #2563eb; padding-bottom:20px; margin-bottom:10px; }
    .company-info h1 { font-size:26px; color:#1e40af; margin-bottom:5px; }
    .company-info p { font-size:12px; color:#666; margin:3px 0; }
    .doc-title { text-align:center; font-size:20px; font-weight:bold; color:#1e40af; margin:15px 0; padding:8px; background:#f0f9ff; border-radius:6px; border:1px solid #bfdbfe; }
    .logo { width:60px; height:60px; border-radius:8px; object-fit:cover; }
    .details-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-bottom:20px; padding:15px; background:#f0f9ff; border-radius:8px; border-${isAr?'right':'left'}:4px solid #2563eb; }
    .details-grid-2 { display:grid; grid-template-columns:repeat(2,1fr); gap:20px; margin-bottom:20px; padding:15px; background:#f0f9ff; border-radius:8px; border-${isAr?'right':'left'}:4px solid #2563eb; }
    .detail-item h3 { font-size:11px; color:#666; font-weight:bold; margin-bottom:5px; text-transform:uppercase; }
    .detail-item p { font-size:14px; font-weight:bold; color:#1e40af; }
    .section-title { color:#1e40af; margin-bottom:10px; font-size:16px; font-weight:bold; }
    table { width:100%; border-collapse:collapse; margin-top:10px; margin-bottom:15px; }
    th { background:linear-gradient(135deg,#2563eb 0%,#4f46e5 100%); color:#fff; padding:10px 12px; text-align:${isAr?'right':'left'}; font-weight:bold; font-size:12px; }
    td { padding:10px 12px; border-bottom:1px solid #e5e7eb; font-size:12px; }
    tr:nth-child(even) { background:#f9fafb; }
    .product-name { font-weight:bold; color:#1e40af; }
    .amount { font-weight:bold; color:#1e40af; }
    .total-row { background:#f0f9ff !important; font-weight:bold; }
    .signatures-section { display:grid; grid-template-columns:repeat(3,1fr); gap:30px; margin-top:60px; padding-top:20px; }
    .signature-box { text-align:center; padding:15px; border:1px dashed #cbd5e1; border-radius:8px; min-height:120px; display:flex; flex-direction:column; justify-content:space-between; }
    .signature-box h4 { font-size:13px; color:#1e40af; font-weight:bold; margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid #e2e8f0; }
    .signature-box .sign-area { flex:1; min-height:60px; }
    .signature-box .sign-label { font-size:10px; color:#94a3b8; margin-top:8px; padding-top:8px; border-top:1px solid #e2e8f0; }
    .footer { margin-top:40px; padding-top:15px; border-top:1px solid #e5e7eb; text-align:center; color:#999; font-size:11px; }
    .finance-summary { display:grid; grid-template-columns:repeat(3,1fr); gap:15px; margin-bottom:25px; }
    .summary-card { padding:15px; border-radius:8px; border:2px solid #e5e7eb; text-align:center; }
    .summary-card.total { background:#f0f9ff; border-color:#2563eb; } .summary-card.total p { color:#1e40af; }
    .summary-card.paid { background:#f0fdf4; border-color:#16a34a; } .summary-card.paid p { color:#16a34a; }
    .summary-card.remaining { background:#fef3c7; border-color:#f59e0b; } .summary-card.remaining p { color:#d97706; }
    .summary-card h4 { font-size:11px; color:#666; text-transform:uppercase; margin-bottom:8px; }
    .summary-card p { font-size:18px; font-weight:bold; }
    @media print { body{padding:15px;} .header{page-break-after:avoid;} .signatures-section{page-break-inside:avoid;} }
  `;
}

export function getHeaderHTML(config: PrintConfig) {
  const L = getPrintLabels(config.lang);
  const es = config.enterpriseSettings;
  return `
    <div class="header">
      <div class="company-info">
        <h1>${es?.name || 'ERP System'}</h1>
        <p><strong>${L.address}:</strong> ${es?.address || 'N/A'}</p>
        <p><strong>${L.phone}:</strong> ${es?.phone || 'N/A'}</p>
      </div>
      ${es?.logoUrl ? `<img src="${es.logoUrl}" class="logo" />` : ''}
    </div>
    <div class="doc-title">${config.docTitle[config.lang]}</div>
  `;
}

export function getSignaturesHTML(lang: 'ar' | 'fr', thirdLabel?: string) {
  const L = getPrintLabels(lang);
  const third = thirdLabel || L.date;
  return `
    <div class="signatures-section">
      <div class="signature-box"><h4>${L.preparedBy}</h4><div class="sign-area"></div><div class="sign-label">${L.cachet} / ${L.signature}</div></div>
      <div class="signature-box"><h4>${L.approvedBy}</h4><div class="sign-area"></div><div class="sign-label">${L.cachet} / ${L.signature}</div></div>
      <div class="signature-box"><h4>${third}</h4><div class="sign-area"></div><div class="sign-label">${L.cachet} / ${L.signature}</div></div>
    </div>
  `;
}

export function getFooterHTML(lang: 'ar' | 'fr', companyName?: string) {
  const L = getPrintLabels(lang);
  return `
    <div class="footer">
      <p>${L.generatedOn} ${new Date().toLocaleString(L.isAr ? 'ar-DZ' : 'fr-FR')}</p>
      <p>&copy; ${new Date().getFullYear()} ${companyName || 'ERP System'}. ${L.allRights}.</p>
    </div>
  `;
}

export function openPrintWindow(html: string) {
  const printWindow = window.open('', '', 'height=1000,width=1200');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => { printWindow.print(); }, 500);
}

export function buildPrintHTML(config: PrintConfig, bodyContent: string) {
  const L = getPrintLabels(config.lang);
  return `<!DOCTYPE html><html dir="${L.dir}" lang="${config.lang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${config.docTitle[config.lang]}</title>
${L.isAr ? '<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">' : ''}
<style>${getPrintStyles(config.lang)}</style>
</head><body>
${getHeaderHTML(config)}
${bodyContent}
${getSignaturesHTML(config.lang)}
${getFooterHTML(config.lang, config.enterpriseSettings?.name)}
</body></html>`;
}

export function formatDateLocale(dateStr: string, lang: 'ar' | 'fr') {
  return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-FR');
}
