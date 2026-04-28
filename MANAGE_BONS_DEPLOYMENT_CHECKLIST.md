# Manage Bons - Implementation Checklist & Deployment Guide

## Pre-Deployment Checklist

### Database Setup
- [ ] **bons_commandes_products table exists** with columns:
  - id (UUID, primary key)
  - bon_commande_id (UUID, foreign key)
  - product_name (VARCHAR)
  - barcode (VARCHAR, nullable)
  - quantity (NUMERIC)
  - unity_price (NUMERIC)
  - tva_rate (INTEGER: 0, 9, 19)
  - subtotal (NUMERIC)
  - tva_amount (NUMERIC)
  - total_with_tva (NUMERIC)
  - is_active (BOOLEAN)
  - created_at (TIMESTAMP)

- [ ] **bons_commandes_offers table exists** with columns:
  - id (UUID, primary key)
  - bon_commande_id (UUID, foreign key)
  - supplier_name (VARCHAR)
  - image_url (VARCHAR, nullable)
  - image_path (VARCHAR, nullable)
  - notes (TEXT, nullable)
  - description (VARCHAR, nullable)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)

- [ ] **suppliers table has data** with:
  - id (UUID)
  - name (VARCHAR)
  - is_active (BOOLEAN)

- [ ] **Supabase storage bucket "offers"** exists
  - Bucket name: `offers`
  - Access: Public (for public URLs)
  - No authentication required for reading

### RLS Policies
- [ ] **RLS policies are PERMISSIVE** on:
  - bons_commandes_products (SELECT, INSERT)
  - bons_commandes_offers (SELECT, INSERT)
  - suppliers (SELECT)

- [ ] **User authentication enabled** in Supabase
  - JWT tokens configured
  - Authenticated users can access resources

### Component Files
- [ ] **BonsCommandesPage.tsx updated** with:
  - All new interfaces (BonOffer, Supplier)
  - Manage button on bon cards
  - All event handlers (handleManageBon, handleSaveProducts, etc.)
  - Manage dialog with Products/Offers tabs
  - Product and offer forms

### UI Components Available
- [ ] **shadcn/ui components installed**:
  - Dialog components
  - Input component
  - Select component
  - Textarea component
  - Button component
  - Badge component

- [ ] **Lucide React icons available**:
  - Settings (manage button)
  - Plus (add rows)
  - Save (save button)
  - Trash2 (remove rows)
  - ImagePlus (image upload)
  - Eye, Edit, Printer, Delete (existing)

### Environment Variables
- [ ] **VITE_SUPABASE_URL** set correctly
- [ ] **VITE_SUPABASE_ANON_KEY** set correctly
- [ ] **Supabase project ID** correct in code

---

## Deployment Steps

### Step 1: Database Schema Setup
```sql
-- Create products table
CREATE TABLE IF NOT EXISTS bons_commandes_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_commande_id UUID NOT NULL REFERENCES bons_commandes(id) ON DELETE CASCADE,
  product_name VARCHAR NOT NULL,
  barcode VARCHAR,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unity_price NUMERIC NOT NULL DEFAULT 0,
  tva_rate INTEGER NOT NULL DEFAULT 19,
  subtotal NUMERIC,
  tva_amount NUMERIC,
  total_with_tva NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create offers table
CREATE TABLE IF NOT EXISTS bons_commandes_offers (
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

-- Create indices for performance
CREATE INDEX idx_products_bon_id ON bons_commandes_products(bon_commande_id);
CREATE INDEX idx_offers_bon_id ON bons_commandes_offers(bon_commande_id);
```

### Step 2: RLS Policies Setup
```sql
-- Enable RLS on tables
ALTER TABLE bons_commandes_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bons_commandes_offers ENABLE ROW LEVEL SECURITY;

-- Products table policies
CREATE POLICY "Allow authenticated users to view all products"
  ON bons_commandes_products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert products"
  ON bons_commandes_products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update products"
  ON bons_commandes_products FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete products"
  ON bons_commandes_products FOR DELETE
  USING (auth.role() = 'authenticated');

-- Offers table policies
CREATE POLICY "Allow authenticated users to view all offers"
  ON bons_commandes_offers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert offers"
  ON bons_commandes_offers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update offers"
  ON bons_commandes_offers FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete offers"
  ON bons_commandes_offers FOR DELETE
  USING (auth.role() = 'authenticated');

-- Suppliers table policy (read-only)
CREATE POLICY "Allow authenticated users to view active suppliers"
  ON suppliers FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);
```

### Step 3: Storage Setup
```
1. Go to Supabase Console → Storage
2. Create bucket named "offers" (if not exists)
3. Set bucket to Public (uncheck "Private bucket")
4. No additional policies needed for public read access
```

### Step 4: Deploy Component
1. Update src/pages/BonsCommandesPage.tsx with new code
2. Run type checking: `npm run type-check`
3. Build project: `npm run build`
4. Deploy to production

### Step 5: Populate Suppliers (if not exists)
```sql
-- Example suppliers
INSERT INTO suppliers (name, is_active) VALUES
('ACME Suppliers', true),
('Global Tech LLC', true),
('Local Distributor', true),
('International Partners', true)
ON CONFLICT DO NOTHING;
```

---

## Testing Checklist

### UI Testing
- [ ] Manage button visible on all bon cards
- [ ] Manage button has Settings icon
- [ ] Clicking manage button opens dialog
- [ ] Dialog shows "Products" and "Offers" tabs
- [ ] Can switch between tabs
- [ ] Dialog closes when clicking outside
- [ ] Dialog closes when clicking X button

### Products Tab Testing
- [ ] Existing products display in table format
- [ ] Product table shows all columns: Name, Barcode, Qty, Unit Price, TVA, Total
- [ ] "Add Product" button works
- [ ] New product rows appear when clicking "Add Product"
- [ ] Remove button (trash icon) works
- [ ] Product form fields are editable
- [ ] TVA % dropdown shows 0%, 9%, 19% options
- [ ] Total DA auto-calculates correctly:
  - Test 0% TVA: Total = Qty × Price
  - Test 9% TVA: Total = Qty × Price × 1.09
  - Test 19% TVA: Total = Qty × Price × 1.19
- [ ] "Save Products" button saves to database
- [ ] Success message appears after save
- [ ] Products table refreshes with new data
- [ ] Error handling if save fails

### Offers Tab Testing
- [ ] Existing offers display as cards
- [ ] Offer cards show supplier name, notes, image
- [ ] Supplier dropdown populated with active suppliers
- [ ] Dropdown filtering works (can type to search)
- [ ] Description field accepts text
- [ ] Notes textarea accepts multi-line text
- [ ] Image upload area visible
- [ ] Can click image upload area
- [ ] Can drag-drop images
- [ ] Image preview shows after upload
- [ ] "Add Offer" button works
- [ ] New offer rows appear
- [ ] Remove button works
- [ ] "Save Offers" button saves to database
- [ ] Success message appears after save
- [ ] Images stored in "offers" bucket
- [ ] Images accessible via public URL
- [ ] Error handling if upload fails

### Database Testing
- [ ] Products inserted into bons_commandes_products
- [ ] Offers inserted into bons_commandes_offers
- [ ] All calculated fields populated (subtotal, tva_amount, total_with_tva)
- [ ] Foreign key bon_commande_id is correct
- [ ] Timestamps are accurate
- [ ] is_active flag set to true for products
- [ ] Images stored with correct path format

### Edge Case Testing
- [ ] Empty product form: Save fails with message
- [ ] Empty offer form: Save fails with message
- [ ] Large file upload: Handled gracefully
- [ ] Network timeout: Error shown to user
- [ ] Multiple products saved correctly
- [ ] Multiple offers saved correctly
- [ ] Duplicate products allowed (business logic)
- [ ] Same supplier multiple times allowed
- [ ] Delete bon with products/offers: Cascade delete works
- [ ] Update existing bon: Manage still works
- [ ] Concurrent edits: Last save wins

### Performance Testing
- [ ] Products tab loads quickly (<1 second)
- [ ] Offers tab loads quickly (<1 second)
- [ ] Image upload progress tracked
- [ ] No page freeze during save
- [ ] Multiple bons can be managed sequentially
- [ ] No memory leaks when opening/closing dialog

### Cross-browser Testing
- [ ] Chrome: All features work
- [ ] Firefox: All features work
- [ ] Safari: All features work
- [ ] Edge: All features work
- [ ] Mobile (responsive design): All features accessible

---

## Post-Deployment Verification

### Live Site Testing
- [ ] Access production environment
- [ ] Navigate to Bons de Commandes page
- [ ] Verify manage button appears
- [ ] Add test product: name="Test Product", qty=2, price=5000, tva=19%
- [ ] Verify total calculated correctly: 11,900 DA
- [ ] Save and verify in database
- [ ] Add test offer with image upload
- [ ] Verify image stored in bucket
- [ ] Verify offer saved in database

### User Acceptance Testing
- [ ] Share with business users
- [ ] Request feedback on UX
- [ ] Verify workflow matches requirements:
  - ✓ Can manage products
  - ✓ Can manage offers
  - ✓ Can upload images
  - ✓ Auto-calculation works
  - ✓ Supplier selection works
- [ ] Address any feedback

### Monitoring
- [ ] Monitor error logs for issues
- [ ] Check Supabase dashboard for:
  - Database queries performance
  - Storage bucket usage
  - Row count in tables
- [ ] Set up alerts for:
  - High error rate
  - Database connection issues
  - Storage quota warnings

---

## Rollback Plan

If issues occur in production:

### Step 1: Immediate Rollback
```bash
# Revert to previous component version
git revert HEAD
npm run build
# Deploy previous version
```

### Step 2: Disable Manage Button
```typescript
// Temporarily disable in code:
const handleManageBon = () => {
  setMessage('Manage feature temporarily disabled. Please try again later.');
};
```

### Step 3: Clear Cache
- Clear browser cache
- Clear CDN cache
- Rebuild if needed

### Step 4: Investigate
- Check error logs
- Review database for issues
- Test locally to reproduce

### Step 5: Fix and Redeploy
- Apply fix
- Test thoroughly
- Redeploy with fixed code

---

## Maintenance

### Regular Tasks
- [ ] Monitor storage bucket usage (offers)
- [ ] Review database query performance
- [ ] Check for orphaned records (offers without bons)
- [ ] Backup database regularly
- [ ] Clean up old unused images (optional)

### Monthly Review
- [ ] Check user feedback
- [ ] Review error logs
- [ ] Analyze usage statistics
- [ ] Update documentation if needed

### Quarterly Review
- [ ] Performance audit
- [ ] Security audit
- [ ] User experience review
- [ ] Plan improvements

---

## Success Metrics

After deployment, track these metrics:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Manage button visibility | 100% of bons | Visual inspection |
| Products saved per bon | 1-50 average | Database query |
| Offers saved per bon | 0-10 average | Database query |
| Image upload success rate | >95% | Error log review |
| Average dialog load time | <1 second | Performance monitoring |
| User satisfaction | >4/5 | User feedback survey |
| Error rate | <0.1% | Error log analysis |

---

## Troubleshooting Guide

### Issue: Manage button not visible
**Cause**: CSS not applied or button hidden  
**Solution**: Check imports, verify Button component, inspect element

### Issue: Products not saving
**Cause**: RLS policy issue or network error  
**Solution**: Check RLS policies, verify database connection, check browser console

### Issue: Images not uploading
**Cause**: Bucket permissions, file size, or format  
**Solution**: Check bucket is public, verify file format, check file size

### Issue: Supplier dropdown empty
**Cause**: No suppliers in database or all marked inactive  
**Solution**: Add suppliers, verify is_active=true, refresh page

### Issue: Auto-calculation incorrect
**Cause**: Logic error in calculation  
**Solution**: Verify formula, check TVA rate selected, test with known values

### Issue: Dialog won't close
**Cause**: State not updating properly  
**Solution**: Check onOpenChange handler, verify setManageBon(null) called

---

## Support & Documentation

For more information, see:
- [MANAGE_BONS_IMPLEMENTATION_GUIDE.md](MANAGE_BONS_IMPLEMENTATION_GUIDE.md)
- [MANAGE_BONS_QUICK_REFERENCE.md](MANAGE_BONS_QUICK_REFERENCE.md)
- [FIX_403_FORBIDDEN_BONS_COMMANDES.sql](FIX_403_FORBIDDEN_BONS_COMMANDES.sql)

For issues:
1. Check documentation
2. Review error messages
3. Check browser console (F12)
4. Check Supabase dashboard logs
5. Contact development team if needed

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024 | Initial implementation with Products & Offers tabs |
| | | - Manage button on bon cards |
| | | - Product form with auto-calculation |
| | | - Offer form with image upload |
| | | - Supplier selection from database |
| | | - Images stored in Supabase bucket |

---

**Last Updated**: 2024  
**Status**: Ready for Deployment ✓
