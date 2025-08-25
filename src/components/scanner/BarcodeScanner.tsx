import { useState, useCallback } from "react";
import { useZxing } from "react-zxing";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodeScanner = ({ onScan, isOpen, onClose }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);

  const { ref } = useZxing({
    onDecodeResult(result) {
      const code = result.getText();
      onScan(code);
      setIsScanning(false);
      onClose();
    },
    onError(error) {
      console.error("Scanner error:", error);
    },
  });

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
          {!isScanning ? (
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
                  className="w-full h-64 object-cover rounded-lg border"
                  autoPlay
                  playsInline
                />
                <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32 border-2 border-primary bg-transparent"></div>
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
              
              <p className="text-xs text-muted-foreground text-center">
                Posicione o código de barras dentro do quadro
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};