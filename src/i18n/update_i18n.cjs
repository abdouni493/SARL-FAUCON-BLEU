const fs = require('fs');

const files = ['src/i18n/fr.json', 'src/i18n/ar.json'];

const translations = {
  fr: {
    common: {
      search_storages: "Rechercher des entrepôts...",
      search_products: "Rechercher des produits...",
      all_projects: "Tous les projets"
    },
    workers: {
      search_placeholder: "Rechercher par nom, email ou nom d'utilisateur..."
    },
    commands: {
      search_placeholder: "Rechercher par ID, Projet ou Chef..."
    },
    bons: {
      search_placeholder: "Rechercher par ID, Projet ou Fournisseur..."
    },
    payment_orders: {
      search_placeholder: "Rechercher par ID, Note ou Projet..."
    },
    debt_management: {
      search_placeholder: "Rechercher par Fournisseur, ID ou Description..."
    }
  },
  ar: {
    common: {
      search_storages: "البحث عن المستودعات...",
      search_products: "البحث عن المنتجات...",
      all_projects: "جميع المشاريع"
    },
    workers: {
      search_placeholder: "البحث بالاسم، البريد أو اسم المستخدم..."
    },
    commands: {
      search_placeholder: "البحث بالرقم، المشروع أو الرئيس..."
    },
    bons: {
      search_placeholder: "البحث بالرقم، المشروع أو المورد..."
    },
    payment_orders: {
      search_placeholder: "البحث بالرقم، الملاحظة أو المشروع..."
    },
    debt_management: {
      search_placeholder: "البحث بالمورد، الرقم أو الوصف..."
    }
  }
};

files.forEach(p => {
  const lang = p.includes('fr') ? 'fr' : 'ar';
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const trans = translations[lang];

  // Merge common
  if (!data.common) data.common = {};
  Object.assign(data.common, trans.common);

  // Merge others
  ['workers', 'commands', 'bons', 'payment_orders', 'debt_management'].forEach(k => {
    if (!data[k]) data[k] = {};
    if (typeof data[k] === 'string') data[k] = { label: data[k] }; // Preserve if it was a string
    Object.assign(data[k], trans[k]);
  });

  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated ${p}`);
});
