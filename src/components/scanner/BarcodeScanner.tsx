import { useState, useCallback, useEffect } from "react";
import { useZxing } from "react-zxing";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodeScanner = ({ onScan, isOpen, onClose }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const { ref } = useZxing({
    onDecodeResult(result) {
      const code = result.getText();
      console.log("Código escaneado:", code);
      onScan(code);
      setIsScanning(false);
      onClose();
      toast({
        title: "Código escaneado com sucesso!",
        description: `Código: ${code}`
      });
    },
    onError(error) {
      console.error("Scanner error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Erro no scanner: ${errorMessage}`);
      toast({
        title: "Erro no scanner",
        description: "Verifique se a câmera está disponível e dê permissão",
        variant: "destructive"
      });
    },
    constraints: {
      video: {
        facingMode: 'environment' // Prefer back camera, but allow front camera as fallback
      }
    },
    timeBetweenDecodingAttempts: 300
  });

  // Ativar o scanner automaticamente quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsScanning(true);
      console.log("Scanner ativado automaticamente");
    } else {
      setIsScanning(false);
    }
  }, [isOpen]);

  const handleStartScan = useCallback(() => {
    setIsScanning(true);
  }, []);

  const handleStopScan = useCallback(() => {
    setIsScanning(false);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scanner de Código de Barras
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">{error}</p>
              </div>
              <Button onClick={() => {setError(null); handleStartScan();}} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          ) : !isScanning ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Clique em iniciar para escanear um código de barras
              </p>
              <Button onClick={handleStartScan} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Iniciar Scanner
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <video
                  ref={ref}
                  className="w-full h-64 object-cover rounded-lg border bg-black"
                  autoPlay
                  playsInline
                  muted
                />
                <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32 border-2 border-primary bg-transparent animate-pulse"></div>
                </div>
              </div>
              
              <Button 
                onClick={handleStopScan} 
                variant="outline" 
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Parar Scanner
              </Button>
              
              <div className="text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  Posicione o código de barras dentro do quadro
                </p>
                <p className="text-xs text-green-600 font-medium">
                  📱 Scanner ativo - aguardando código de barras
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};