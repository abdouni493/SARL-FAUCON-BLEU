import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PrintLanguageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrintArabic: () => void;
  onPrintFrench: () => void;
  title?: string;
}

export function PrintLanguageDialog({
  open,
  onOpenChange,
  onPrintArabic,
  onPrintFrench,
  title,
}: PrintLanguageDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg border-b border-blue-200 dark:border-slate-700">
          <DialogTitle className="text-xl font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" /> {title || t('common.choose_print_language')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 px-2 pb-2">
          <Button
            onClick={onPrintArabic}
            className="h-24 flex flex-col gap-2 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-lg rounded-xl shadow-lg"
          >
            <span className="text-2xl">🇩🇿</span> {t('common.print_in_arabic')}
          </Button>
          <Button
            onClick={onPrintFrench}
            className="h-24 flex flex-col gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-xl shadow-lg"
          >
            <span className="text-2xl">🇫🇷</span> {t('common.print_in_french')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
