# Manage Bons de Commandes - Complete Implementation Guide

## Overview
This guide documents the complete implementation of the Manage button functionality for bons de commandes, allowing users to add products and supplier offers with image uploads to Supabase storage.

## Features Implemented

### 1. **Manage Button**
- **Location**: Each bon de commandes card in the grid view
- **Icon**: Settings icon (Settings component from lucide-react)
- **Functionality**: Opens the manage dialog with tabs for products and offers
- **Position**: Added as the first action button before View, Edit, Print, Delete

### 2. **Product Management Tab**
- **Tab Name**: "Products"
- **Display Mode**: Shows existing products in read-only table format
- **Product Fields**:
  - Product Name (required, text input)
  - Barcode (optional, text input)
  - Quantity (number input, min 1)
  - Unit Price (number input, in DA currency)
  - TVA % (dropdown: 0%, 9%, 19%)
  - Total DA (auto-calculated, read-only display)

**Auto-Calculation Logic**:
```
subtotal = quantity × unity_price
tva_amount = subtotal × (tva_rate / 100)
total_with_tva = subtotal + tva_amount
```

**Features**:
- Add multiple product rows with "Add Product" button
- Remove individual product rows with trash icon
- Auto-calculation on every field change
- Save all products to `bons_commandes_products` table with "Save Products" button
- Existing products displayed above form for reference

**Database Table**: `bons_commandes_products`
- Columns: id, bon_commande_id, product_name, barcode, quantity, unity_price, tva_rate, subtotal, tva_amount, total_with_tva, is_active

### 3. **Offer Management Tab**
- **Tab Name**: "Offers"
- **Display Mode**: Shows existing offers in card layout with images
- **Offer Fields**:
  - Supplier Name (required, dropdown selection from suppliers table)
  - Description (optional, text input)
  - Notes (optional, textarea)
  - Image Upload (optional, drag-and-drop or click to upload)

**Features**:
- Supplier dropdown populated from active suppliers in database
- Image upload to Supabase "offers" bucket with automatic storage path: `offers/bon-{bon_id}-{timestamp}.{extension}`
- Image preview after upload
- Auto-generates public URL from Supabase
- Remove offer rows with trash icon
- Add multiple offers with "Add Offer" button
- Save all offers to `bons_commandes_offers` table with "Save Offers" button
- Existing offers displayed above form with supplier name, notes, and image preview

**Database Table**: `bons_commandes_offers`
- Columns: id, bon_commande_id, supplier_name, image_url, image_path, notes, description, created_at, updated_at

## State Management

### New State Variables Added
```typescript
// Bon Being Managed
const [manageBon, setManageBon] = useState<BonCommande | null>(null);

// Active Tab in Manage Dialog
const [activeTab, setActiveTab] = useState<'products' | 'offers'>('products');

// Suppliers List
const [suppliers, setSuppliers] = useState<Supplier[]>([]);

// Products in Current Bon
const [bonProducts, setBonProducts] = useState<BonProduct[]>([]);

// Offers in Current Bon
const [bonOffers, setBonOffers] = useState<BonOffer[]>([]);

// Form States for Adding Products
const [products, setProducts] = useState<BonProductForm[]>([
  { product_name: '', quantity: 1, unity_price: 0, tva_rate: 19 }
]);

// Form States for Adding Offers
const [newOffers, setNewOffers] = useState<BonOffer[]>([
  { supplier_name: '', description: '', notes: '' }
]);

// Image Upload Status
const [uploadingImage, setUploadingImage] = useState<number | null>(null);
```

### New Interfaces Added
```typescript
interface BonProductForm {
  id?: string;
  product_name: string;
  quantity: number;
  unity_price: number;
  tva_rate: number;
  barcode?: string;
}

interface BonOffer {
  id?: string;
  supplier_name: string;
  description?: string;
  image_url?: string;
  notes?: string;
}

interface Supplier {
  id: string;
  name: string;
}
```

## Event Handlers Implemented

### 1. **handleManageBon(bon: BonCommande)**
- Opens manage dialog for selected bon
- Resets form states to defaults
- Fetches existing products and offers
- Sets active tab to 'products'

### 2. **handleProductChange(index: number, field: keyof BonProductForm, value: any)**
- Updates product form row on field change
- Auto-calculation happens automatically on value changes
- Supports all product fields: product_name, quantity, unity_price, tva_rate, barcode

### 3. **handleAddProductRow()**
- Adds new empty product row to form
- Initializes with default values: quantity=1, tva_rate=19%

### 4. **handleRemoveProductRow(index: number)**
- Removes product row from form
- Does not affect existing products in database until save

### 5. **handleSaveProducts()**
- Validates all products are non-empty
- Calculates subtotal, TVA amount, and total for each product
- Deletes existing products from bon (to replace with new ones)
- Inserts new products into `bons_commandes_products` table
- Refreshes product list display
- Shows success/error message

### 6. **handleOfferChange(index: number, field: keyof BonOffer, value: any)**
- Updates offer form row on field change
- Supports fields: supplier_name, description, notes, image_url

### 7. **handleAddOfferRow()**
- Adds new empty offer row to form
- Initializes with default empty values

### 8. **handleRemoveOfferRow(index: number)**
- Removes offer row from form
- Does not affect existing offers in database until save

### 9. **handleImageUpload(file: File, offerIndex: number)**
- Uploads image file to Supabase "offers" bucket
- Storage path format: `offers/bon-{bon_id}-{timestamp}.{extension}`
- Generates public URL automatically
- Updates offer form with image_url
- Shows loading state during upload
- Displays error message if upload fails

### 10. **handleSaveOffers()**
- Validates all offers are non-empty
- Inserts new offers into `bons_commandes_offers` table
- Associates offers with bon_commande_id
- Refreshes offer list display
- Shows success/error message

### 11. **fetchSuppliers()**
- Called on component mount
- Fetches active suppliers from database
- Sorted alphabetically by name
- Used to populate dropdown in offers form

### 12. **fetchBonProducts(bonId: string)**
- Called when manage dialog opens
- Fetches all products associated with bon
- Used to display existing products

### 13. **fetchBonOffers(bonId: string)**
- Called when manage dialog opens
- Fetches all offers associated with bon
- Used to display existing offers

## Database Requirements

### Prerequisites
Ensure these tables and columns exist in Supabase:

#### 1. `bons_commandes_products` Table
```sql
CREATE TABLE bons_commandes_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_commande_id UUID NOT NULL REFERENCES bons_commandes(id) ON DELETE CASCADE,
  product_name VARCHAR NOT NULL,
  barcode VARCHAR,
  quantity NUMERIC NOT NULL,
  unity_price NUMERIC NOT NULL,
  tva_rate INTEGER NOT NULL,
  subtotal NUMERIC,
  tva_amount NUMERIC,
  total_with_tva NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `bons_commandes_offers` Table
```sql
CREATE TABLE bons_commandes_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_commande_id UUID NOT NULL REFERENCES bons_commandes(id) ON DELETE CASCADE,
  supplier_name VARCHAR NOT NULL,
  image_url VARCHAR,
  image_path VARCHAR,
  notes TEXT,
  description VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `suppliers` Table (must be active)
Ensure suppliers table has:
- id (UUID)
- name (VARCHAR)
- is_active (BOOLEAN)

### Storage Bucket
- **Bucket Name**: "offers"
- **Access Level**: Public (to generate public URLs)
- **Path Format**: `offers/bon-{bon_id}-{timestamp}.{extension}`

### Row-Level Security (RLS)
Ensure RLS policies allow:
- SELECT on bons_commandes_products
- INSERT on bons_commandes_products
- SELECT on bons_commandes_offers
- INSERT on bons_commandes_offers
- SELECT on suppliers

See [FIX_403_FORBIDDEN_BONS_COMMANDES.sql](FIX_403_FORBIDDEN_BONS_COMMANDES.sql) for RLS policy setup.

## UI Components Used

1. **Dialog/DialogContent/DialogHeader/DialogTitle/DialogDescription/DialogFooter**
   - From @/components/ui/dialog
   - Main container for manage interface

2. **Button**
   - From @/components/ui/button
   - Action buttons: Add Product, Save Products, Add Offer, Save Offers, Remove

3. **Input**
   - From @/components/ui/input
   - Text inputs for product name, barcode, supplier description
   - Number inputs for quantity and unit price

4. **Select/SelectTrigger/SelectValue/SelectContent/SelectItem**
   - From @/components/ui/select
   - TVA % dropdown (0%, 9%, 19%)
   - Supplier selection dropdown

5. **Textarea**
   - From @/components/ui/textarea
   - Notes field for offers

6. **Badge**
   - Status display in view dialog

## Icons Used (lucide-react)

- `Settings` - Manage button on bon card
- `Plus` - Add Product/Offer button
- `Save` - Save Products/Offers button
- `Trash2` - Remove product/offer row
- `ImagePlus` - Image upload area
- `Upload` - Already in imports
- `Eye, Edit, Printer, Delete` - Existing actions

## Styling & Colors

- **Tab Active**: Blue text with blue bottom border
- **Tab Inactive**: Muted foreground color with hover effect
- **Product Form**: Flex layout with auto-calculated total displayed in blue background box
- **Offer Cards**: Border with white/dark background, image thumbnail right-aligned
- **Image Upload Area**: Dashed border, hover effect to blue
- **Messages**: Green background for success, red background for errors
- **Totals Display**: Font-weight bold, right-aligned for currency values

## Data Flow

### Adding Products Flow
1. User clicks Manage button on bon card
2. Manage dialog opens, Products tab active
3. Existing products displayed in table
4. User fills in product form rows
5. System auto-calculates totals on each input change
6. User clicks "Add Product" to add more rows
7. User clicks "Save Products" to persist to database
8. Products table refreshes with new entries

### Adding Offers Flow
1. User clicks Manage button on bon card
2. User switches to Offers tab
3. Existing offers displayed as cards with images
4. User fills in offer form (supplier dropdown, description, notes)
5. User clicks image upload area or drags image
6. Image uploads to Supabase, public URL generated
7. Image preview shown after upload
8. User can add more offers with "Add Offer" button
9. User clicks "Save Offers" to persist to database
10. Offers are displayed with supplier name, notes, and image

### Image Upload Flow
1. User clicks/drags image in upload area
2. `handleImageUpload` triggered with file
3. File uploaded to `supabase.storage.from('offers').upload()`
4. Public URL generated automatically
5. URL stored in offer form state
6. User can see image preview
7. On "Save Offers", URL persisted to database

## Error Handling

- **Empty fields**: Validation prevents save if required fields empty
- **Upload failures**: Error message displayed in dialog
- **Database errors**: Caught and displayed as user-friendly message
- **Network errors**: Generic error message shown

## Performance Considerations

- Suppliers fetched once on component mount
- Products/offers fetched only when manage dialog opens
- Image upload happens asynchronously with loading indicator
- Form state separate from database state (no real-time sync)

## Testing Checklist

- [ ] Manage button appears on each bon card
- [ ] Clicking manage button opens dialog
- [ ] Products tab shows existing products in table format
- [ ] Product form fields calculate total correctly
- [ ] Add Product button adds new row
- [ ] Remove button deletes product row
- [ ] Save Products persists data to database
- [ ] Existing products refresh after save
- [ ] Offers tab shows existing offers
- [ ] Supplier dropdown populated from database
- [ ] Image upload accepts files
- [ ] Image preview shows after upload
- [ ] Add Offer button adds new row
- [ ] Remove button deletes offer row
- [ ] Save Offers persists data to database
- [ ] Existing offers refresh after save
- [ ] Images stored in "offers" bucket
- [ ] Error messages display correctly

## Files Modified

- `src/pages/BonsCommandesPage.tsx` - Main component file with all manage functionality

## Related Documentation

- [FIX_403_FORBIDDEN_BONS_COMMANDES.sql](FIX_403_FORBIDDEN_BONS_COMMANDES.sql) - RLS policy setup
- [ADMIN_VALIDATION_ARCHITECTURE.md](ADMIN_VALIDATION_ARCHITECTURE.md) - Database architecture
