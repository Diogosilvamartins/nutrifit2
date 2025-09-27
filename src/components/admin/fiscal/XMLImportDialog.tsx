import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, X } from 'lucide-react';
import { useFiscal } from '@/hooks/useFiscal';
import { useToast } from '@/hooks/use-toast';

interface XMLImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function XMLImportDialog({ open, onOpenChange }: XMLImportDialogProps) {
  const [xmlContent, setXmlContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importXML } = useFiscal();
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo XML válido",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setXmlContent(content);
      setFileName(file.name);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!xmlContent.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo XML ou cole o conteúdo",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const success = await importXML(xmlContent);
      if (success) {
        handleReset();
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setXmlContent('');
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Importar XML da NFe</DialogTitle>
          <DialogDescription>
            Selecione um arquivo XML de nota fiscal eletrônica ou cole o conteúdo diretamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload de arquivo */}
          <div className="space-y-2">
            <Label htmlFor="xml-file">Arquivo XML</Label>
            <div className="flex items-center gap-2">
              <Input
                id="xml-file"
                ref={fileInputRef}
                type="file"
                accept=".xml"
                onChange={handleFileSelect}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Selecionar
              </Button>
            </div>
            
            {fileName && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1">{fileName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Área de texto para colar XML */}
          <div className="space-y-2">
            <Label htmlFor="xml-content">
              Ou cole o conteúdo XML aqui
            </Label>
            <textarea
              id="xml-content"
              value={xmlContent}
              onChange={(e) => setXmlContent(e.target.value)}
              placeholder="Cole aqui o conteúdo do XML da NFe..."
              className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={loading || !xmlContent.trim()}
            >
              {loading ? 'Importando...' : 'Importar NFe'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}