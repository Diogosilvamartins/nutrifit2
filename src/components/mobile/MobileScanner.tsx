import { useState } from "react";
import { Camera, Scan, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCamera } from "@/hooks/useCamera";
import { useToast } from "@/hooks/use-toast";
import { useZxing } from "react-zxing";

interface MobileScannerProps {
  onBarcodeScanned?: (barcode: string) => void;
  onPhotoTaken?: (photoUrl: string) => void;
}

export const MobileScanner = ({ onBarcodeScanned, onPhotoTaken }: MobileScannerProps) => {
  const { takePhoto, isLoading } = useCamera();
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const { ref } = useZxing({
    onDecodeResult(result) {
      const scannedCode = result.getText();
      if (scannedCode && onBarcodeScanned) {
        onBarcodeScanned(scannedCode);
        setIsScannerOpen(false);
        toast({
          title: "Código escaneado!",
          description: `Código: ${scannedCode}`,
        });
      }
    },
    onError(error) {
      console.error('Scanner error:', error);
      toast({
        title: "Erro no scanner",
        description: "Verifique as permissões da câmera.",
        variant: "destructive"
      });
    }
  });

  const handleTakePhoto = async () => {
    try {
      const photoUrl = await takePhoto();
      if (photoUrl && onPhotoTaken) {
        onPhotoTaken(photoUrl);
        toast({
          title: "Foto capturada!",
          description: "A foto foi adicionada com sucesso."
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao tirar foto",
        description: "Verifique as permissões da câmera.",
        variant: "destructive"
      });
    }
  };

  const handleOpenScanner = () => {
    setIsScannerOpen(true);
  };

  const handleCloseScanner = () => {
    setIsScannerOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Scanner Mobile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleOpenScanner}
            variant="default" 
            className="w-full"
            size="lg"
          >
            <Scan className="w-4 h-4 mr-2" />
            Escanear Código de Barras
          </Button>
          
          <Button 
            onClick={handleTakePhoto}
            variant="outline" 
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            <Camera className="w-4 h-4 mr-2" />
            {isLoading ? "Tirando foto..." : "Tirar Foto do Produto"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Scanner de Código de Barras
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseScanner}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="relative">
            <video
              ref={ref}
              className="w-full h-64 object-cover rounded-lg bg-black"
              playsInline
              muted
            />
            <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-48 h-32 border-2 border-primary border-dashed rounded-lg flex items-center justify-center">
                  <p className="text-xs text-primary text-center">
                    Posicione o código<br />dentro desta área
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Aponte a câmera para o código de barras
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};