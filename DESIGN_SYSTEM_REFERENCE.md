# Design System Reference - Commandes Matériel Style

**Complete reference guide for the design patterns applied to Storage interfaces**

---

## 📐 Core Design Components

### 1. PAGE HEADERS

**Pattern Used in:**
- StorageManagementPage
- CreateProductPage

```tsx
// Title with Gradient
<div className="flex items-center justify-between mb-8">
  <div>
    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 
                   dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
      {t('nav.storage_management')}
    </h1>
    <p className="text-muted-foreground text-sm mt-1">
      Manage and track all product inventory
    </p>
  </div>
  <Button onClick={() => setShowCreateDialog(true)} className="gap-2 btn-gradient text-white shadow-lg font-semibold">
    <Plus className="w-5 h-5" /> {t('common.create_product')}
  </Button>
</div>
```

**CSS Classes:**
- Title: `text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent`
- Subtitle: `text-muted-foreground text-sm mt-1`
- Button: `btn-gradient text-white shadow-lg font-semibold`

---

### 2. SECTION TITLES WITH ACCENT BARS

**Pattern Used in:**
- Product view dialog
- Create/Edit dialogs
- Form sections

```tsx
<h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
  <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
  {t('common.add_product')}
</h3>

// For optional sections (uses slate instead of blue)
<h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
  <span className="w-1 h-6 bg-gradient-to-b from-slate-400 to-slate-500 rounded" />
  {t('common.optional')}
</h3>
```

**CSS Classes:**
- Accent bar: `w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded`
- Optional bar: `w-1 h-6 bg-gradient-to-b from-slate-400 to-slate-500 rounded`
- Title: `text-lg font-bold text-foreground`

---

### 3. PRODUCT CARDS

**Pattern Used in:**
- Storage management main view

```tsx
<motion.div
  key={p.id}
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: i * 0.05 }}
  className="group relative erp-card hover:shadow-xl cursor-pointer 
             border-2 border-blue-100 dark:border-slate-700 overflow-hidden"
>
  {/* Background decoration */}
  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 
                  bg-blue-100 dark:bg-slate-700 rounded-full opacity-20 
                  transition-transform duration-300 group-hover:scale-150" />
  
  <div className="relative z-10 space-y-4">
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
          {t('common.product')}
        </p>
        <span className="font-bold text-lg text-foreground">{p.name}</span>
      </div>
      <span className="text-xs px-3 py-1.5 rounded-full font-bold uppercase 
                       tracking-tight bg-blue-100 dark:bg-blue-900 
                       text-blue-700 dark:text-blue-200">
        {p.quantity} {p.unities?.symbol}
      </span>
    </div>
    
    <div className="grid grid-cols-2 gap-3 py-3 px-3 bg-blue-50 dark:bg-slate-700 rounded-lg">
      <div>
        <p className="text-xs text-muted-foreground font-semibold">{t('common.category')}</p>
        <p className="text-sm font-medium text-foreground">{p.categories?.name}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-semibold">{t('common.unit_price')}</p>
        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
          {p.unit_price.toLocaleString()} DA
        </p>
      </div>
    </div>

    <div className="flex gap-2 flex-wrap pt-2">
      <Button size="sm" onClick={() => setViewProduct(p)} 
              className="gap-1.5 btn-gradient text-xs font-semibold flex-1">
        <Eye className="w-4 h-4" /> {t('common.view')}
      </Button>
      <Button size="sm" onClick={() => startEdit(p)} 
              className="gap-1.5 btn-gradient text-xs font-semibold flex-1">
        <Edit className="w-4 h-4" /> {t('common.edit')}
      </Button>
      <Button size="sm" onClick={() => setDeleteId(p.id)} 
              className="gap-1.5 bg-red-100 dark:bg-red-900 text-red-700 
                         dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 
                         text-xs font-semibold">
        <Trash2 className="w-4 h-4" /> {t('common.delete')}
      </Button>
    </div>
  </div>
</motion.div>
```

**CSS Classes:**
- Card: `group relative erp-card hover:shadow-xl border-2 border-blue-100 dark:border-slate-700 overflow-hidden`
- Decoration: `absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-100 dark:bg-slate-700 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-150`
- Label: `text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide`
- Value: `font-bold text-lg text-foreground`
- Badge: `text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-tight bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200`
- Info grid: `grid grid-cols-2 gap-3 py-3 px-3 bg-blue-50 dark:bg-slate-700 rounded-lg`

---

### 4. DIALOG HEADERS

**Pattern Used in:**
- View Product
- Create/Edit Product
- New Category
- New Unity

```tsx
<DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 
                        dark:from-slate-800 dark:to-slate-900 
                        -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg 
                        border-b border-blue-200 dark:border-slate-700">
  <DialogTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">
    {editingCmdId ? t('common.edit_command') : t('common.create_command')}
  </DialogTitle>
  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
    Add or manage products for this command
  </p>
</DialogHeader>
```

**CSS Classes:**
- Header bg: `bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900`
- Positioning: `-mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg`
- Border: `border-b border-blue-200 dark:border-slate-700`
- Title: `text-2xl font-bold text-blue-950 dark:text-blue-100`
- Subtitle: `text-sm text-blue-700 dark:text-blue-300 mt-1`

---

### 5. INFO CARDS (3-Column Layout)

**Pattern Used in:**
- View Product dialog

```tsx
<div className="grid grid-cols-3 gap-4">
  <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg 
                  border border-blue-200 dark:border-slate-600">
    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 
                  uppercase tracking-wide mb-2">
      {t('common.status')}
    </p>
    <p className="text-lg font-bold text-foreground">Completed</p>
  </div>
  {/* Repeat for other cards */}
</div>
```

**CSS Classes:**
- Grid: `grid grid-cols-3 gap-4`
- Card: `p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600`
- Label: `text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2`
- Value: `text-lg font-bold text-foreground`

---

### 6. PRICING SUMMARY BOX

**Pattern Used in:**
- View Product dialog
- Create Product page

```tsx
<div className="bg-gradient-to-r from-amber-50 to-amber-100 
                dark:from-amber-900/30 dark:to-amber-800/30 
                rounded-lg p-4 border-2 border-amber-200 dark:border-amber-700">
  <p className="text-sm text-muted-foreground font-semibold mb-2">
    {t('common.total_price')} (Auto-Calculated)
  </p>
  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
    {formData.quantity} × {formData.unit_price.toLocaleString()} = {formData.total_price.toLocaleString()} DA
  </p>
</div>
```

**CSS Classes:**
- Container: `bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 rounded-lg p-4 border-2 border-amber-200 dark:border-amber-700`
- Label: `text-sm text-muted-foreground font-semibold mb-2`
- Total: `text-2xl font-bold text-amber-700 dark:text-amber-300`

---

### 7. FORM SECTIONS

**Pattern Used in:**
- Create Product (Required section)
- Create Product (Optional section)

```tsx
{/* Required Fields Section */}
<div>
  <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
    <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded" />
    {t('common.required_fields')}
  </h3>
  <div className="erp-card p-6 border-2 border-blue-100 dark:border-slate-700 
                  bg-blue-50/50 dark:bg-slate-800/50 space-y-4">
    {/* Form fields */}
  </div>
</div>

{/* Optional Fields Section */}
<div>
  <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
    <span className="w-1 h-6 bg-gradient-to-b from-slate-400 to-slate-500 rounded" />
    {t('common.optional')}
  </h3>
  <div className="erp-card p-6 border-2 border-slate-200 dark:border-slate-700 
                  bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
    {/* Form fields */}
  </div>
</div>
```

**CSS Classes:**
- Required card: `erp-card p-6 border-2 border-blue-100 dark:border-slate-700 bg-blue-50/50 dark:bg-slate-800/50 space-y-4`
- Optional card: `erp-card p-6 border-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-4`

---

### 8. BUTTONS

**Pattern Used Throughout:**

```tsx
// Primary Action
<Button className="btn-gradient text-white font-semibold">
  <Save className="w-4 h-4" /> Save
</Button>

// Secondary Action
<Button variant="outline" className="font-semibold">
  Cancel
</Button>

// Danger Action
<Button className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 
                   hover:bg-red-200 dark:hover:bg-red-800 font-semibold">
  <Trash2 className="w-4 h-4" /> Delete
</Button>

// Add/Plus Button (compact)
<Button type="button" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
  <Plus className="w-4 h-4" />
</Button>
```

**CSS Classes:**
- Primary: `btn-gradient text-white font-semibold`
- Secondary: `variant="outline" font-semibold`
- Danger: `bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800`
- Add: `bg-blue-600 hover:bg-blue-700 text-white`

---

### 9. INPUTS & SELECTS

**Pattern Used in:**
- All form sections

```tsx
// Standard Input
<Input
  value={formData.name}
  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
  placeholder={t('common.enter_name')}
  className="text-base border-blue-200 dark:border-slate-600"
/>

// Select
<Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
  <SelectTrigger className="flex-1 border-blue-200 dark:border-slate-600">
    <SelectValue placeholder={t('common.select') || 'Select'} />
  </SelectTrigger>
  <SelectContent>
    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
  </SelectContent>
</Select>
```

**CSS Classes:**
- Input: `text-base border-blue-200 dark:border-slate-600`
- Select trigger: `flex-1 border-blue-200 dark:border-slate-600`

---

### 10. ANIMATIONS

**Pattern Used Throughout:**

```tsx
// Page entrance
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  className="..."
>
  {/* Content */}
</motion.div>

// Card stagger animation
{items.map((item, i) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.05 }}
    className="..."
  >
    {/* Card content */}
  </motion.div>
))}

// Hover scale effect
<div className="transition-transform duration-300 group-hover:scale-150">
  {/* Element */}
</div>
```

**Animation Properties:**
- Initial: `opacity: 0, y: 20`
- Animate: `opacity: 1, y: 0`
- Stagger delay: `i * 0.05`
- Transitions: `duration-300`

---

## 🎯 Color Reference

### Primary Gradient
```tsx
from-blue-600 to-indigo-600      // Light mode
from-blue-400 to-indigo-400      // Dark mode
```

### Borders
```tsx
border-blue-200                   // Light mode
border-slate-600/700              // Dark mode
```

### Backgrounds
```tsx
bg-blue-50/100                    // Light section background
bg-slate-700/800                  // Dark section background
```

### Text
```tsx
text-blue-600 / text-blue-400     // Primary text (light/dark)
text-blue-950 / text-blue-100     // Title text (light/dark)
text-muted-foreground             // Secondary text
```

---

## 📱 Responsive Utilities

```tsx
// Grid layouts
grid-cols-1               // Mobile
sm:grid-cols-2            // Tablet
lg:grid-cols-3            // Desktop

// Sizing
w-full / max-w-2xl / max-w-3xl

// Spacing
gap-3 / gap-4 / gap-5

// Display
flex / block / hidden
```

---

**This design system ensures consistency across all Storage interfaces and matches the professional standard of Commandes Matériel.**
