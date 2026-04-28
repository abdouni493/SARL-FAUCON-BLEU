import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Bold, Type, Palette, Move, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

interface TextElement {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  bold: boolean;
  color: string;
}

interface DesignElement {
  id: string;
  type: 'logo' | 'company_name' | 'text';
  x: number;
  y: number;
}

export default function PrintCustomizationPage() {
  const { t } = useTranslation();
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [textElements, setTextElements] = useState<TextElement[]>([
    { id: 'title', content: 'Commande', x: 50, y: 50, fontSize: 24, bold: true, color: '#000000' },
    { id: 'date', content: 'Date: 28/03/2026', x: 50, y: 100, fontSize: 12, bold: false, color: '#000000' },
  ]);
  const [showPropertyPanel, setShowPropertyPanel] = useState(false);
  const [showAddText, setShowAddText] = useState(false);
  const [newTextContent, setNewTextContent] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  const currentElement = selectedElement ? textElements.find(el => el.id === selectedElement) : null;

  const updateElement = (id: string, updates: Partial<TextElement>) => {
    setTextElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const addNewText = () => {
    if (!newTextContent) return;
    const newElement: TextElement = {
      id: `text-${Date.now()}`,
      content: newTextContent,
      x: 50,
      y: 150 + textElements.length * 30,
      fontSize: 14,
      bold: false,
      color: '#000000',
    };
    setTextElements(prev => [...prev, newElement]);
    setNewTextContent('');
    setShowAddText(false);
  };

  const deleteElement = (id: string) => {
    setTextElements(prev => prev.filter(el => el.id !== id));
    if (selectedElement === id) setSelectedElement(null);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find if clicked on an element
    let clicked = false;
    for (const el of textElements) {
      if (x >= el.x && x <= el.x + 200 && y >= el.y && y <= el.y + 30) {
        setSelectedElement(el.id);
        setShowPropertyPanel(true);
        clicked = true;
        break;
      }
    }
    if (!clicked) setSelectedElement(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t('common.customize_print')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <div 
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="bg-white border-2 border-dashed border-secondary rounded-lg p-8 min-h-[600px] relative cursor-pointer"
            style={{ width: '100%', aspectRatio: '8.5/11' }}
          >
            {/* Logo placeholder */}
            <div className="absolute top-4 left-4 w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
              Logo
            </div>

            {/* Company name placeholder */}
            <div className="absolute top-4 right-4 text-right">
              <p className="text-lg font-bold text-foreground">Company Name</p>
            </div>

            {/* Text elements */}
            {textElements.map((el) => (
              <div
                key={el.id}
                onClick={() => { setSelectedElement(el.id); setShowPropertyPanel(true); }}
                className={`absolute cursor-move select-none p-2 rounded border-2 transition-all ${
                  selectedElement === el.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-transparent hover:border-gray-300 hover:bg-gray-50'
                }`}
                style={{
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  fontSize: `${el.fontSize}px`,
                  fontWeight: el.bold ? 'bold' : 'normal',
                  color: el.color,
                  minWidth: '200px',
                }}
              >
                {el.content}
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowAddText(true)} className="gap-1">
              <Type className="w-4 h-4" /> {t('common.add_text')}
            </Button>
            <Button variant="outline" size="sm" className="gap-1">
              <Eye className="w-4 h-4" /> {t('common.preview')}
            </Button>
            <Button variant="outline" size="sm" className="gap-1">
              <Download className="w-4 h-4" /> {t('common.save_design')}
            </Button>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">{t('common.elements')}</h3>
            <div className="space-y-2">
              {textElements.map((el) => (
                <div
                  key={el.id}
                  onClick={() => { setSelectedElement(el.id); setShowPropertyPanel(true); }}
                  className={`p-2 rounded cursor-pointer text-sm transition-all ${
                    selectedElement === el.id
                      ? 'bg-blue-100 border border-blue-500'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{el.content}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }}
                      className="text-destructive hover:text-destructive text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {currentElement && (
            <Card className="p-4 space-y-4">
              <h3 className="font-semibold">{t('common.properties')}</h3>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">{t('common.content')}</label>
                <Textarea
                  value={currentElement.content}
                  onChange={(e) => updateElement(currentElement.id, { content: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">{t('common.font_size')}</label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min="8"
                    max="72"
                    value={currentElement.fontSize}
                    onChange={(e) => updateElement(currentElement.id, { fontSize: Number(e.target.value) })}
                  />
                  <span className="text-sm text-muted-foreground">px</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">{t('common.color')}</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={currentElement.color}
                    onChange={(e) => updateElement(currentElement.id, { color: e.target.value })}
                    className="w-12 h-10 rounded border border-input cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground mt-2">{currentElement.color}</span>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={currentElement.bold}
                    onChange={(e) => updateElement(currentElement.id, { bold: e.target.checked })}
                  />
                  <Bold className="w-4 h-4" /> {t('common.bold')}
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground block">{t('common.position')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">X</p>
                    <Input
                      type="number"
                      value={currentElement.x}
                      onChange={(e) => updateElement(currentElement.id, { x: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Y</p>
                    <Input
                      type="number"
                      value={currentElement.y}
                      onChange={(e) => updateElement(currentElement.id, { y: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Add Text Dialog */}
      <Dialog open={showAddText} onOpenChange={setShowAddText}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('common.add_text')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">{t('common.text_content')}</label>
              <Textarea
                value={newTextContent}
                onChange={(e) => setNewTextContent(e.target.value)}
                placeholder={t('common.enter_text')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddText(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={addNewText} className="erp-gradient-bg border-0 text-primary-foreground">
              {t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
