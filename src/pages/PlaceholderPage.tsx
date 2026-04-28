import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Construction } from 'lucide-react';

export default function PlaceholderPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const pageName = location.pathname.replace('/', '').replace(/-/g, '_');

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="erp-card text-center max-w-md"
      >
        <Construction className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">
          {t(`nav.${pageName}`, pageName.replace(/_/g, ' '))}
        </h2>
        <p className="text-muted-foreground">قيد التطوير • En cours de développement</p>
      </motion.div>
    </div>
  );
}
