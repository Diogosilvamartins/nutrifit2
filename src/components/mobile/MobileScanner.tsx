import { Camera, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCamera } from "@/hooks/useCamera";
import { useToast } from "@/hooks/use-toast";

interface MobileScannerProps {
  onBarcodeScanned?: (barcode: string) => void;
  onPhotoTaken?: (photoUrl: string) => void;
}

export const MobileScanner = ({ onBarcodeScanned, onPhotoTaken }: MobileScannerProps) => {
  const { takePhoto, isLoading } = useCamera();
  const { toast } = useToast();

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

  const handleScanBarcode = () => {
    // Implementação futura do scanner de código de barras nativo
    toast({
      title: "Scanner em desenvolvimento",
      description: "Use o scanner atual por enquanto."
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="w-5 h-5" />
          Scanner Mobile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleScanBarcode}
          variant="outline" 
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
  );
};