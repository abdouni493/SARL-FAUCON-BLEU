# Debt Interface - Translation Keys Quick Reference

## Summary Cards Translation Keys

| English | Arabic Key | French Key | Arabic Text | French Text |
|---------|-----------|-----------|-------------|------------|
| Total Debts | `debt_management.total_debts` | `debt_management.total_debts` | إجمالي الديون | Total Dettes |
| Total amount | `debt_management.total_amount` | `debt_management.total_amount` | المبلغ الإجمالي | Montant Total |
| Pending | `debt_management.pending` | `debt_management.pending` | قيد الانتظار | En Attente |
| Outstanding amount | `debt_management.outstanding_amount` | `debt_management.outstanding_amount` | المبلغ المستحق | Montant Dû |
| Paid | `debt_management.paid` | `debt_management.paid` | مدفوع | Payé |
| Total paid amount | `debt_management.total_paid_amount` | `debt_management.total_paid_amount` | إجمالي المبلغ المدفوع | Montant Total Payé |
| Remaining | `debt_management.remaining_label` | `debt_management.remaining_label` | المتبقي | Restant |
| Outstanding balance | `debt_management.outstanding_balance` | `debt_management.outstanding_balance` | الرصيد المستحق | Solde Dû |

## Debt Card Translation Keys

| English | Key | Arabic | French |
|---------|-----|--------|--------|
| Supplier | `debt_management.supplier` | المورد | Fournisseur |
| Total | `debt_management.total` | الإجمالي | Total |
| Remaining | `debt_management.remaining_label` | المتبقي | Restant |
| Print | `debt_management.print` | طباعة | Imprimer |
| View | `debt_management.view` | عرض | Afficher |
| Pay | `debt_management.pay` | دفع | Payer |
| % Paid | `debt_management.percent_paid` | مدفوع | Payé |

## Dialog Form Translation Keys

| English | Key | Arabic | French |
|---------|-----|--------|--------|
| Select Bon de Commande | `debt_management.search_bon_commande` | ابحث عن بون كوماند | Rechercher un bon de commande |
| Search by ID, supplier, or amount | `debt_management.search_by_id_amount` | ابحث برقم أو مبلغ | Rechercher par ID ou montant |
| Supplier Name | `debt_management.supplier_name` | اسم المورد | Nom du Fournisseur |
| Total Amount | `debt_management.total_amount` | المبلغ الإجمالي | Montant Total |
| Amount Paid | `debt_management.amount_paid` | المبلغ المدفوع | Montant Payé |
| Remaining Amount | `debt_management.remaining_amount` | المبلغ المتبقي | Montant Restant |
| Description | `debt_management.payment_description` | وصف الدفع | Description du Paiement |
| Create Debt | `debt_management.create_debt` | إنشاء الدين | Créer une Dette |
| Add New Debt | `debt_management.add_new_debt` | إضافة دين جديد | Ajouter une nouvelle dette |

## Common Translation Keys (Applied)

| English | Key | Arabic | French |
|---------|-----|--------|--------|
| Cancel | `common.cancel` | إلغاء | Annuler |
| Close | `common.close` | إغلاق | Fermer |
| Status | `common.status` | الحالة | Statut |
| Created | `common.created` | تاريخ الإنشاء | Créé |
| Date | `common.date` | التاريخ | Date |
| Description | `common.description` | الوصف | Description |
| Optional | `common.optional` | اختياري | Optionnel |
| Progress | `common.progress` | التقدم | Progrès |
| Paid | `common.paid` | مدفوع | Payé |
| After | `common.after` | بعد | après |
| Max | `common.max` | الحد الأقصى | Max |
| Payment Method | `common.payment_method` | طريقة الدفع | Mode de Paiement |
| Cash | `common.cash` | نقداً | Espèces |
| Check | `common.check` | شيك | Chèque |
| Bank Transfer | `common.bank_transfer` | تحويل بنكي | Virement Bancaire |
| Other | `common.other` | أخرى | Autre |

## Status Translations

| Status | Key | Arabic | French |
|--------|-----|--------|--------|
| Pending | `debt_management.status_pending` | قيد الانتظار | En Attente |
| Partial | `debt_management.status_partial` | مدفوع جزئياً | Partiellement Payé |
| Paid | `debt_management.status_paid` | مدفوع بالكامل | Complètement Payé |

## Implementation Usage

### In ComptableDebtManagementPage.tsx

```tsx
import { useTranslation } from 'react-i18next';

export default function ComptableDebtManagementPage() {
  const { t } = useTranslation();
  
  // Usage examples:
  // t('debt_management.total_debts')      // Get translated "Total Debts"
  // t('debt_management.print')             // Get translated "Print"
  // t('common.payment_method')             // Get translated "Payment Method"
  // t('debt_management.status_pending')    // Get translated "Pending"
}
```

### In Translations Files

**ar.json:**
```json
{
  "debt_management": {
    "total_debts": "إجمالي الديون",
    "print": "طباعة",
    "paid": "مدفوع"
  },
  "common": {
    "payment_method": "طريقة الدفع"
  }
}
```

**fr.json:**
```json
{
  "debt_management": {
    "total_debts": "Total Dettes",
    "print": "Imprimer",
    "paid": "Payé"
  },
  "common": {
    "payment_method": "Mode de Paiement"
  }
}
```

## Language Switching

Users can change language via the language selector in the UI. The application will:
1. Detect the selected language (ar, fr, or en)
2. Load the appropriate translation file
3. Re-render all components with translated text
4. Adjust text direction (RTL for Arabic, LTR for French/English)

## Files Modified

- ✅ `src/pages/ComptableDebtManagementPage.tsx` - 50+ hardcoded strings replaced
- ✅ `src/i18n/ar.json` - 21 new translation keys added
- ✅ `src/i18n/fr.json` - 21 new translation keys added

## Testing

To verify the changes:
1. Open the debt management page
2. Switch language to Arabic - all text should display in Arabic
3. Switch language to French - all text should display in French
4. Switch language to English - all text should display in English
5. Create, edit, view, and pay debts to verify all dialogs display translated text

## Notes

- All translations follow the existing pattern in the codebase
- Status displays use conditional rendering with translated values
- Dynamic content (percentages, amounts) are formatted appropriately
- No backend changes required - all changes are UI/frontend

## Related Documentation

- [DEBT_INTERFACE_LANGUAGE_FIX_COMPLETE.md](DEBT_INTERFACE_LANGUAGE_FIX_COMPLETE.md) - Complete summary
- [DEBT_INTERFACE_LANGUAGE_ANALYSIS.md](DEBT_INTERFACE_LANGUAGE_ANALYSIS.md) - Original analysis
- [DEBT_INTERFACE_TRANSLATION_IMPLEMENTATION.md](DEBT_INTERFACE_TRANSLATION_IMPLEMENTATION.md) - Implementation roadmap
