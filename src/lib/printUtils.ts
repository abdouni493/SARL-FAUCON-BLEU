/**
 * Shared bilingual print utility for all ERP pages.
 * Layout: title → line → company/logo/creator info → line → body content → signatures → footer
 */

export interface PrintConfig {
  lang: 'ar' | 'fr';
  docTitle: { ar: string; fr: string };
  createdBy?: string;
  docId?: string;
  docDate?: string;
  /** Pass custom HTML to override the default 3-box signature section */
  signaturesHTML?: string;
  enterpriseSettings?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
    nis?: string;
    nif?: string;
    rc?: string;
    article?: string;
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
    docNumber: isAr ? 'رقم الوثيقة' : 'N° Document',
    printedOn: isAr ? 'طُبع بتاريخ' : 'Imprimé le',
    legalIdentifiers: isAr ? 'الهويات القانونية' : 'Identifiants Légaux',
    nis: isAr ? 'رقم NIS' : 'NIS',
    nif: isAr ? 'رقم NIF' : 'NIF',
    rc: isAr ? 'رقم RC' : 'RC',
    article: isAr ? 'مادة الخضوع للضريبة' : 'Article d\'imposition',
    email: isAr ? 'البريد الإلكتروني' : 'Email',
  };
}

export function getPrintStyles(lang: 'ar' | 'fr') {
  const { isAr, dir, fontFamily } = getPrintLabels(lang);
  const side = isAr ? 'right' : 'left';
  return `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:${fontFamily}; background:#fff; color:#1e293b; padding:24px 32px; direction:${dir}; font-size:13px; line-height:1.5; }

    /* ── DOCUMENT TITLE BAR WITH LOGO ──────────────────────── */
    .title-bar {
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:16px;
      padding-bottom:12px;
      border-bottom:3px solid #1e3a8a;
    }
    .title-bar h1 {
      font-size:28px; font-weight:900; color:#1e3a8a;
      letter-spacing:2px; text-transform:uppercase; margin:0;
      flex:1; text-align:center;
    }
    .title-logo {
      width:100px; height:100px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
    }
    .title-logo img {
      width:100%; height:100%; object-fit:contain;
      border-radius:6px;
    }
    .title-logo .no-logo {
      width:100%; height:100%; background:#eff6ff;
      border-radius:6px; border:2px dashed #93c5fd;
      display:flex; align-items:center; justify-content:center;
      font-size:11px; color:#60a5fa; font-weight:700;
    }

    /* ── DIVIDERS ────────────────────────────────────────────── */
    .header-divider {
      border:none; border-top:1.5px solid #cbd5e1; margin:14px 0 18px;
    }

    /* ── HEADER SECTION (company info + doc meta) ──────────── */
    .header {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:32px;
      margin-bottom:6px;
    }

    /* ── COMPANY INFO SECTION ──────────────────────────────── */
    .company-info {
      text-align:${isAr ? 'right' : 'left'};
    }
    .company-info h2 {
      font-size:16px; font-weight:800; color:#1e3a8a;
      margin-bottom:10px; border-bottom:2px solid #1e3a8a;
      padding-bottom:8px;
    }
    .company-contact {
      margin-bottom:14px;
      background:#f8fafc;
      padding:10px 12px;
      border-radius:6px;
      border-${side}:3px solid #e0e7ff;
    }
    .company-contact .contact-row {
      display:flex;
      justify-content:flex-start;
      margin-bottom:5px;
      font-size:11px;
      line-height:1.4;
    }
    .company-contact .contact-row:last-child {
      margin-bottom:0;
    }
    .company-contact .contact-label {
      color:#1e3a8a;
      font-weight:700;
      width:90px;
      flex-shrink:0;
    }
    .company-contact .contact-value {
      color:#64748b;
      flex:1;
    }

    /* ── LEGAL IDENTIFIERS SECTION ────────────────────────── */
    .company-legal {
      background:linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
      border:2px solid #1e3a8a;
      border-radius:8px;
      padding:12px 14px;
    }
    .legal-title {
      font-size:12px;
      font-weight:800;
      color:#1e3a8a;
      text-transform:uppercase;
      letter-spacing:0.8px;
      margin-bottom:10px;
      display:flex;
      align-items:center;
      gap:6px;
    }
    .legal-title::before {
      content:'';
      display:inline-block;
      width:4px;
      height:12px;
      background:#1e3a8a;
      border-radius:2px;
    }
    .legal-items {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:8px 12px;
    }
    .legal-item {
      font-size:10px;
    }
    .legal-item .legal-label {
      color:#1e3a8a;
      font-weight:700;
      display:block;
      margin-bottom:2px;
    }
    .legal-item .legal-value {
      color:#64748b;
      font-weight:600;
      display:block;
    }

    /* ── DOCUMENT METADATA SECTION ────────────────────────── */
    .doc-meta {
      font-size:11px;
      background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding:14px 16px;
      border-radius:8px;
      border:1.5px solid #cbd5e1;
      border-${side}:4px solid #1e3a8a;
    }
    .doc-meta .doc-meta-row {
      display:flex;
      justify-content:space-between;
      margin-bottom:8px;
      padding-bottom:8px;
      border-bottom:1px solid #e2e8f0;
    }
    .doc-meta .doc-meta-row:last-child {
      margin-bottom:0;
      padding-bottom:0;
      border-bottom:none;
    }
    .doc-meta .doc-meta-row .label {
      color:#64748b;
      font-weight:600;
    }
    .doc-meta .doc-meta-row .value {
      font-weight:700;
      color:#1e3a8a;
    }

    /* ── DETAILS GRID ────────────────────────────────────────── */
    .details-grid {
      display:grid; grid-template-columns:repeat(3,1fr); gap:12px;
      margin-bottom:18px; padding:14px 16px;
      background:#f8fafc; border-radius:8px;
      border:1px solid #e2e8f0; border-${side}:4px solid #1e3a8a;
    }
    .details-grid-2 {
      display:grid; grid-template-columns:repeat(2,1fr); gap:12px;
      margin-bottom:18px; padding:14px 16px;
      background:#f8fafc; border-radius:8px;
      border:1px solid #e2e8f0; border-${side}:4px solid #1e3a8a;
    }
    .detail-item h3 {
      font-size:9px; color:#94a3b8; font-weight:700;
      margin-bottom:4px; text-transform:uppercase; letter-spacing:0.6px;
    }
    .detail-item p { font-size:14px; font-weight:700; color:#1e3a8a; }

    /* ── SECTION TITLE ───────────────────────────────────────── */
    .section-title {
      display:flex; align-items:center; gap:10px;
      color:#1e3a8a; margin:18px 0 10px;
      font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.6px;
    }
    .section-title::after {
      content:''; flex:1; height:2px;
      background:linear-gradient(to ${isAr ? 'left' : 'right'}, #1e3a8a 0%, #e0e7ff 100%);
    }

    /* ── TABLE ───────────────────────────────────────────────── */
    table {
      width:100%; border-collapse:collapse;
      margin-bottom:16px;
      border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;
    }
    thead tr { background:linear-gradient(135deg,#1e3a8a 0%,#3730a3 100%); }
    th {
      color:#fff; padding:10px 12px;
      text-align:${isAr ? 'right' : 'left'};
      font-weight:700; font-size:11px;
      text-transform:uppercase; letter-spacing:0.5px; border:none;
    }
    td {
      padding:9px 12px; border-bottom:1px solid #f1f5f9;
      font-size:12px; color:#334155;
    }
    tbody tr:last-child td { border-bottom:none; }
    tbody tr:nth-child(even) { background:#f8fafc; }
    .product-name { font-weight:700; color:#1e3a8a; }
    .amount { font-weight:700; color:#1e3a8a; }
    .total-row { background:#eff6ff !important; }
    .total-row td {
      border-top:2px solid #1e3a8a !important;
      color:#1e3a8a; font-weight:800; font-size:13px;
    }

    /* ── NOTES BOX ───────────────────────────────────────────── */
    .notes-box {
      padding:12px 16px; background:#fffbeb; border-radius:8px;
      border:1px solid #fcd34d; border-${side}:4px solid #f59e0b;
      margin-top:14px; font-size:12px; color:#78350f;
    }

    /* ── FINANCIAL SUMMARY ───────────────────────────────────── */
    .finance-summary { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:18px; }
    .summary-card { padding:14px; border-radius:8px; border:1.5px solid #e2e8f0; text-align:center; }
    .summary-card.total { background:#eff6ff; border-color:#1e3a8a; }
    .summary-card.total p { color:#1e3a8a; }
    .summary-card.paid { background:#f0fdf4; border-color:#16a34a; }
    .summary-card.paid p { color:#16a34a; }
    .summary-card.remaining { background:#fef3c7; border-color:#f59e0b; }
    .summary-card.remaining p { color:#d97706; }
    .summary-card h4 { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; }
    .summary-card p { font-size:20px; font-weight:800; }

    /* ── SIGNATURES ──────────────────────────────────────────── */
    .signatures-section {
      display:grid; grid-template-columns:repeat(3,1fr); gap:20px;
      margin-top:48px; padding-top:16px; border-top:1.5px solid #e2e8f0;
    }
    .signature-box {
      text-align:center; padding:14px;
      border:1.5px dashed #cbd5e1; border-radius:8px;
      min-height:110px; display:flex; flex-direction:column;
    }
    .signature-box h4 {
      font-size:12px; color:#1e3a8a; font-weight:700;
      margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid #e2e8f0;
    }
    .sign-area { flex:1; min-height:55px; }
    .sign-label {
      font-size:9px; color:#94a3b8;
      margin-top:6px; padding-top:6px; border-top:1px solid #f1f5f9;
      text-transform:uppercase; letter-spacing:0.5px;
    }

    /* ── FOOTER ──────────────────────────────────────────────── */
    .footer {
      margin-top:32px; padding-top:12px;
      border-top:1px solid #e2e8f0;
      text-align:center; color:#94a3b8; font-size:10px; line-height:2;
    }

    /* ── PRINT MEDIA ─────────────────────────────────────────── */
    @media print {
      body { padding:10px 16px; }
      .signatures-section { page-break-inside:avoid; }
      table { page-break-inside:auto; }
      tr { page-break-inside:avoid; }
      thead { display:table-header-group; }
    }
  `;
}

export function getHeaderHTML(config: PrintConfig) {
  const L = getPrintLabels(config.lang);
  const es = config.enterpriseSettings;
  const now = new Date();
  const dateStr = now.toLocaleDateString(L.isAr ? 'ar-DZ' : 'fr-FR');
  const timeStr = now.toLocaleTimeString(L.isAr ? 'ar-DZ' : 'fr-FR', { hour: '2-digit', minute: '2-digit' });

  return `
    <!-- ─── TITLE BAR WITH LOGO ─────────────────────────────── -->
    <div class="title-bar">
      <h1>${config.docTitle[config.lang]}</h1>
      <div class="title-logo">
        ${es?.logoUrl
          ? `<img src="${es.logoUrl}" alt="Logo" />`
          : `<div class="no-logo">LOGO</div>`}
      </div>
    </div>

    <!-- ─── HEADER: company info (left) | doc meta (right) ─────── -->
    <div class="header">
      <div class="company-info">
        <h2>${es?.name || 'ERP System'}</h2>
        
        <div class="company-contact">
          ${es?.address ? `<div class="contact-row"><span class="contact-label">${L.address}:</span><span class="contact-value">${es.address}</span></div>` : ''}
          ${es?.phone ? `<div class="contact-row"><span class="contact-label">${L.phone}:</span><span class="contact-value">${es.phone}</span></div>` : ''}
          ${es?.email ? `<div class="contact-row"><span class="contact-label">${L.email}:</span><span class="contact-value">${es.email}</span></div>` : ''}
        </div>

        <div class="company-legal">
          <div class="legal-title">${L.legalIdentifiers}</div>
          <div class="legal-items">
            ${es?.nis ? `<div class="legal-item"><span class="legal-label">${L.nis}</span><span class="legal-value">${es.nis}</span></div>` : ''}
            ${es?.nif ? `<div class="legal-item"><span class="legal-label">${L.nif}</span><span class="legal-value">${es.nif}</span></div>` : ''}
            ${es?.rc ? `<div class="legal-item"><span class="legal-label">${L.rc}</span><span class="legal-value">${es.rc}</span></div>` : ''}
            ${es?.article ? `<div class="legal-item"><span class="legal-label">${L.article}</span><span class="legal-value">${es.article}</span></div>` : ''}
          </div>
        </div>
      </div>

      <div class="doc-meta">
        ${config.docId ? `<div class="doc-meta-row"><span class="label">${L.docNumber}:</span><span class="value">${config.docId}</span></div>` : ''}
        ${config.docDate ? `<div class="doc-meta-row"><span class="label">${L.date}:</span><span class="value">${config.docDate}</span></div>` : ''}
        ${config.createdBy ? `<div class="doc-meta-row"><span class="label">${L.createdBy}:</span><span class="value">${config.createdBy}</span></div>` : ''}
        <div class="doc-meta-row"><span class="label">${L.printedOn}:</span><span class="value">${dateStr} ${timeStr}</span></div>
      </div>
    </div>
    <hr class="header-divider" />
  `;
}

export function getSignaturesHTML(lang: 'ar' | 'fr', thirdLabel?: string) {
  const L = getPrintLabels(lang);
  const third = thirdLabel || L.receivedBy;
  return `
    <div class="signatures-section">
      <div class="signature-box">
        <h4>${L.preparedBy}</h4>
        <div class="sign-area"></div>
        <div class="sign-label">${L.cachet} / ${L.signature}</div>
      </div>
      <div class="signature-box">
        <h4>${L.approvedBy}</h4>
        <div class="sign-area"></div>
        <div class="sign-label">${L.cachet} / ${L.signature}</div>
      </div>
      <div class="signature-box">
        <h4>${third}</h4>
        <div class="sign-area"></div>
        <div class="sign-label">${L.cachet} / ${L.signature}</div>
      </div>
    </div>
  `;
}

export function getFooterHTML(lang: 'ar' | 'fr', companyName?: string) {
  const L = getPrintLabels(lang);
  return `
    <div class="footer">
      <div>${L.generatedOn}: ${new Date().toLocaleString(L.isAr ? 'ar-DZ' : 'fr-FR')}</div>
      <div>&copy; ${new Date().getFullYear()} ${companyName || 'ERP System'} &mdash; ${L.allRights}</div>
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
  const signatures = config.signaturesHTML !== undefined
    ? config.signaturesHTML
    : getSignaturesHTML(config.lang);
  return `<!DOCTYPE html><html dir="${L.dir}" lang="${config.lang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${config.docTitle[config.lang]}</title>
${L.isAr ? '<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">' : ''}
<style>${getPrintStyles(config.lang)}</style>
</head><body>
${getHeaderHTML(config)}
${bodyContent}
${signatures}
${getFooterHTML(config.lang, config.enterpriseSettings?.name)}
</body></html>`;
}

export function formatDateLocale(dateStr: string, lang: 'ar' | 'fr') {
  return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-FR');
}
