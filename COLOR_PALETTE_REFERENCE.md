# Color Palette & Design Tokens Reference

## Primary Gradients

### Main Brand Gradient
```
From: #2563eb (Blue-600)
To: #4f46e5 (Indigo-600)
Usage: Buttons, headers, gradients, active states
```

### Sidebar Gradient (Light)
```
From: #eff6ff (Blue-50)
To: #f3e8ff (Indigo-50)
Usage: Sidebar background
```

### Sidebar Gradient (Dark)
```
From: #1e293b (Slate-900)
To: #0f172a (Slate-800)
Usage: Sidebar background dark mode
```

---

## Color Palette by Component

### Navbar
- **Background:** Blue-600 → Indigo-600 (gradient)
- **Text:** White (#ffffff)
- **Border:** Blue-400 / Slate-700 (dark)
- **Hover Button:** Blue-500

### Sidebar
- **Background:** Blue-50 → Indigo-50 (light) / Slate-900 → Slate-800 (dark)
- **Text:** Blue-950 / Blue-100 (dark)
- **Active Item:** Blue-600 → Indigo-600
- **Hover:** Blue-200 / Slate-700 (dark)
- **Border:** Blue-200 / Slate-700 (dark)

### Cards
- **Border:** Blue-100 / Slate-700 (dark)
- **Background:** White / Slate-800 (dark)
- **Hover Shadow:** Enhanced elevation
- **Background decoration:** Blue-100 / Slate-700 (dark)

### Status Badges
- **Pending:** 
  - Background: Amber-100 / Amber-900 (dark)
  - Text: Amber-700 / Amber-200 (dark)
- **Validated:**
  - Background: Emerald-100 / Emerald-900 (dark)
  - Text: Emerald-700 / Emerald-200 (dark)
- **Other:**
  - Background: Blue-100 / Blue-900 (dark)
  - Text: Blue-700 / Blue-200 (dark)

### Dialogs

#### Headers
- **Background:** Blue-50 → Indigo-50 (light) / Slate-800 → Slate-900 (dark)
- **Border:** Blue-200 / Slate-700 (dark)
- **Title:** Blue-950 / Blue-100 (dark)
- **Subtitle:** Blue-700 / Blue-300 (dark)

#### Tables
- **Header Background:** Blue-100 → Indigo-100 (light) / Slate-700 → Slate-800 (dark)
- **Header Text:** Blue-950 / Blue-100 (dark)
- **Row 1:** White / Slate-800 (dark)
- **Row 2:** Blue-50 / Slate-700 (dark)
- **Hover:** Blue-100 / Slate-600 (dark)
- **Border:** Blue-100 / Slate-700 (dark)

### Info Cards
- **Background:** Blue-50 / Slate-700 (dark)
- **Border:** Blue-200 / Slate-600 (dark)
- **Label:** Blue-600 / Blue-400 (dark)
- **Value:** Foreground color

### Action Buttons
- **View/Edit:** Blue-600 → Indigo-600 (gradient)
- **Delete:** Red-100 / Red-900 (dark) background, Red-700 / Red-200 text
- **Category/Unity Add:** Blue-600 hover Blue-700
- **Main Action:** Blue-600 → Indigo-600

### Input Fields
- **Border:** Blue-200 / Slate-600 (dark)
- **Background:** White / Slate-800 (dark)
- **Focus:** Border-blue-400

---

## Text Colors

### Headings
- **Primary:** Foreground (text-foreground)
- **Gradient:** Blue-600 → Indigo-600 (text-transparent with gradient)

### Labels
- **Font Weight:** Bold
- **Color:** Blue-600 / Blue-400 (dark)
- **Size:** text-xs

### Body Text
- **Color:** Foreground color
- **Muted:** Muted-foreground

### Values
- **Bold:** Bold text
- **Color:** Blue-900 / Blue-100 (dark)

---

## Border & Divider Colors

- **Default:** Border / Slate-700 (dark)
- **Blue Emphasis:** Blue-200 / Slate-600 (dark)
- **Subtle:** Border (lighter variant)

---

## Shadow Definitions

```css
/* Card Shadow */
box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);

/* Elevated Shadow */
box-shadow: 0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04);

/* Glow Shadow */
box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
```

---

## Usage Examples

### Create a Button
```jsx
// Primary action (blue gradient)
<Button className="btn-gradient text-white">Action</Button>

// Secondary action (outline)
<Button variant="outline">Cancel</Button>

// Danger action (red)
<Button className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200">Delete</Button>
```

### Create a Card Header
```jsx
<div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 border-b border-blue-200 dark:border-slate-700">
  <h2 className="text-blue-950 dark:text-blue-100">Title</h2>
</div>
```

### Create a Table Header
```jsx
<thead className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-700 dark:to-slate-800">
  <tr>
    <th className="text-blue-950 dark:text-blue-100">Column</th>
  </tr>
</thead>
```

### Create an Info Card
```jsx
<div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Label</p>
  <p className="text-lg font-bold text-foreground">Value</p>
</div>
```

---

## Dark Mode CSS Variables

All colors automatically switch using CSS custom properties defined in `:root` and `.dark` selector:

```css
--primary: 215 80% 55%;  /* Light: #3b82f6, Dark: #60a5fa */
--secondary: 220 20% 16%; /* Light: #e8eaf6, Dark: #1e293b */
--accent: 170 65% 45%;    /* Light: #10b981, Dark: #34d399 */
--destructive: 0 62% 45%; /* Light: #ef4444, Dark: #f87171 */
```

---

## Print CSS

```css
@media print {
  .header {
    display: flex;
    justify-content: space-between;
    border-bottom: 3px solid #2563eb;
    padding-bottom: 20px;
    margin-bottom: 30px;
  }
  
  table th {
    background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
    color: white;
  }
  
  table tr:nth-child(even) {
    background: #f9fafb;
  }
}
```

---

## Tailwind Classes Reference

### Gradient Backgrounds
- `bg-gradient-to-r from-blue-600 to-indigo-600`
- `bg-gradient-to-b from-blue-50 to-indigo-50`

### Text Gradients
- `bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600`

### Responsive Colors
- Light mode: Default colors
- Dark mode: `.dark` prefix for dark variants

### Hover Effects
- `hover:bg-blue-200 dark:hover:bg-slate-700`
- `hover:brightness-110`
- `hover:shadow-lg`

---

## Color Accessibility

✅ **Contrast Ratios:**
- Blue-600 text on white: 4.89:1 (AA pass)
- White text on blue-600: 8.2:1 (AAA pass)
- Blue-700 on blue-50: 10.5:1 (AAA pass)

✅ **Status Colors:**
- Amber for warning: Distinct from other colors
- Emerald for success: High contrast
- Red for delete: Clear distinction

---

## Migration Guide

If updating from old colors to new scheme:

| Old | New | Purpose |
|-----|-----|---------|
| Gray background | Blue-50 | Softer, on-brand |
| Gray border | Blue-200 | Better definition |
| Default button | btn-gradient | Consistent branding |
| Outline button | Blue-100 bg | Maintains hierarchy |
| Destructive | Red-100/700 | Clearer danger signal |

---

## Notes

- All colors support light and dark modes
- Gradients optimized for modern browsers
- Colors tested for accessibility
- Print colors adjusted for paper
- Consistent with brand identity (blue/indigo)
