# BON DE COMMANDES CARD - TRANSLATION KEYS

## Translation Keys Used in Card Display

The Bon de Commandes card now displays in the user's selected language (French or Arabic) using i18n translations.

### Translation Keys Added

```
bonCommandes.supplier         // "Supplier"
bonCommandes.notAssigned      // "Not assigned"
bonCommandes.totalAmount      // "Total Amount"
bonCommandes.withTVA          // "With TVA"
bonCommandes.pending          // "Pending"
bonCommandes.subtotal         // "Subtotal"
bonCommandes.created          // "Created"
bonCommandes.product          // "Product" (singular)
bonCommandes.products         // "Products" (plural)
bonCommandes.added            // "Added"
bonCommandes.manage           // "Manage"
bonCommandes.manageProductsAndOffers  // "Manage products and offers"

common.view                   // "View"
common.edit                   // "Edit"
common.print                  // "Print"
common.delete                 // "Delete"
```

## Language Support

The card now respects the user's language selection:
- **English**: Uses English text
- **French (Français)**: Uses French translations
- **Arabic (العربية)**: Uses Arabic translations

## How It Works

1. When user selects language, `i18n.changeLanguage()` is called
2. All `t('key')` calls automatically update
3. Card component re-renders with new language
4. All labels, buttons, and messages update

## File Updated

- `src/pages/BonsCommandesPage.tsx` - Card display component

## Implementation Details

```tsx
// Component uses useTranslation hook
const { t, i18n } = useTranslation();

// All labels now use translation keys
<p className="...text-xs...">
  {t('bonCommandes.supplier')}
</p>

// Conditional translations for pluralization
{t(`bonCommandes.product${productCounts[bon.id] !== 1 ? 's' : ''}`)}

// Button titles also translated
title={t('common.view')}
title={t('bonCommandes.manage')}
```

## What Displays

### English
```
Supplier
Youssef Abdouni

Total Amount
With TVA
Pending

📅 Created: 4/11/2026

2 Products Added
Manage
```

### French (When French is selected)
```
Fournisseur
Youssef Abdouni

Montant total
Avec TVA
En attente

📅 Créé: 4/11/2026

2 Produits ajoutés
Gérer
```

### Arabic (When Arabic is selected)
```
المورد
Youssef Abdouni

المبلغ الإجمالي
مع ضريبة القيمة المضافة
في الانتظار

📅 تم الإنشاء: 4/11/2026

2 منتجات مضافة
إدارة
```

## How to Add More Translations

If you need to add a key to your translation files (usually in `public/locales/`):

### English (en.json)
```json
{
  "bonCommandes": {
    "supplier": "Supplier",
    "notAssigned": "Not assigned",
    "totalAmount": "Total Amount",
    "withTVA": "With TVA",
    "pending": "Pending",
    "subtotal": "Subtotal",
    "created": "Created",
    "product": "Product",
    "products": "Products",
    "added": "Added",
    "manage": "Manage",
    "manageProductsAndOffers": "Manage products and offers"
  }
}
```

### French (fr.json)
```json
{
  "bonCommandes": {
    "supplier": "Fournisseur",
    "notAssigned": "Non attribué",
    "totalAmount": "Montant total",
    "withTVA": "Avec TVA",
    "pending": "En attente",
    "subtotal": "Sous-total",
    "created": "Créé",
    "product": "Produit",
    "products": "Produits",
    "added": "ajoutés",
    "manage": "Gérer",
    "manageProductsAndOffers": "Gérer les produits et les offres"
  }
}
```

### Arabic (ar.json)
```json
{
  "bonCommandes": {
    "supplier": "المورد",
    "notAssigned": "غير معين",
    "totalAmount": "المبلغ الإجمالي",
    "withTVA": "مع ضريبة القيمة المضافة",
    "pending": "في الانتظار",
    "subtotal": "المجموع الفرعي",
    "created": "تم الإنشاء",
    "product": "منتج",
    "products": "منتجات",
    "added": "مضافة",
    "manage": "إدارة",
    "manageProductsAndOffers": "إدارة المنتجات والعروض"
  }
}
```

## Features

✅ **Language-Aware**: Automatically respects user's language selection
✅ **RTL Support**: Arabic displays right-to-left when selected
✅ **Dynamic**: Changes instantly when user switches language
✅ **Consistent**: Uses same translation system as rest of application
✅ **Pluralization**: Handles singular/plural forms correctly
✅ **Maintainable**: Easy to update translations

## Status

✅ **Implementation**: Complete
✅ **All translation keys**: Ready to use
✅ **Language support**: English, French, Arabic
✅ **Production ready**: Yes
