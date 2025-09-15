import { useState, useEffect, useRef } from "react";
import { Camera, Scan, X, Upload, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const [showEmbeddedWarning, setShowEmbeddedWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detecta navegadores embutidos (Facebook, Instagram, etc.)
  const isEmbeddedBrowser = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('fban') || // Facebook App
           userAgent.includes('fbav') || // Facebook App
           userAgent.includes('instagram') || // Instagram App
           userAgent.includes('snapchat') || // Snapchat
           userAgent.includes('tiktok') || // TikTok
           userAgent.includes('whatsapp') || // WhatsApp
           userAgent.includes('linkedin') || // LinkedIn
           (userAgent.includes('iphone') && userAgent.includes('version') && !userAgent.includes('crios') && !userAgent.includes('fxios'));
  };

  useEffect(() => {
    if (isEmbeddedBrowser()) {
      setShowEmbeddedWarning(true);
    }
  }, []);

const defaultVideoConstraints: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

const [videoConstraints, setVideoConstraints] = useState<MediaTrackConstraints>(defaultVideoConstraints);
const [facing, setFacing] = useState<'environment' | 'user'>('environment');

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
      description: "Não foi possível acessar a câmera. Verifique permissões.",
      variant: "destructive"
    });
  },
  paused: !isScannerOpen,
  constraints: {
    video: videoConstraints,
  },
  timeBetweenDecodingAttempts: 250,
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

const handleOpenScanner = async () => {
  // Preflight: check https and mediaDevices support
  if (!window.isSecureContext) {
    toast({
      title: "Conexão não segura",
      description: "A câmera só funciona em HTTPS. Use o link seguro ou instale como PWA.",
      variant: "destructive",
    });
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    toast({
      title: "Câmera não suportada",
      description: "Seu navegador não suporta acesso à câmera.",
      variant: "destructive",
    });
    return;
  }

  try {
    // Solicita permissão antecipadamente para garantir o prompt
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });

    // Tenta selecionar explicitamente a câmera traseira
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      const backCam = videoInputs.find((d) => /back|trás|rear|environment/i.test(d.label));
      if (backCam) {
        setVideoConstraints({
          ...defaultVideoConstraints,
          deviceId: { exact: backCam.deviceId },
        });
      } else {
        setVideoConstraints(defaultVideoConstraints);
      }
    } catch (_) {
      // Silenciosamente mantém constraints padrão
      setVideoConstraints(defaultVideoConstraints);
    }

    // Libera imediatamente; o hook assumirá depois
    stream.getTracks().forEach((t) => t.stop());
    setIsScannerOpen(true);
  } catch (err) {
    console.error('Permissão da câmera negada:', err);
    toast({
      title: "Permissão negada",
      description: "Autorize o uso da câmera nas configurações do navegador.",
      variant: "destructive",
    });
  }
};
  const handleCloseScanner = () => {
    setIsScannerOpen(false);
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onPhotoTaken) {
      const photoUrl = URL.createObjectURL(file);
      onPhotoTaken(photoUrl);
      toast({
        title: "Foto carregada!",
        description: "A foto foi adicionada com sucesso."
      });
    }
  };

const openPhotoUpload = () => {
  fileInputRef.current?.click();
};

const toggleFacing = () => {
  const next = facing === 'environment' ? 'user' : 'environment';
  setFacing(next);
  setVideoConstraints({
    ...defaultVideoConstraints,
    facingMode: { exact: next } as any,
  });
};

  return (
    <>
      {showEmbeddedWarning && (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Detectamos que você está usando um navegador embutido (Facebook, Instagram, etc.). 
            A câmera pode não funcionar. Abra no Chrome/Safari ou use a opção de upload abaixo.
          </AlertDescription>
        </Alert>
      )}

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

          <Button 
            onClick={openPhotoUpload}
            variant="secondary" 
            className="w-full"
            size="lg"
          >
            <Upload className="w-4 h-4 mr-2" />
            Carregar Foto da Galeria
          </Button>

<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  capture="environment"
  onChange={handlePhotoUpload}
  className="hidden"
/>
        </CardContent>
      </Card>

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Scanner de Código de Barras
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFacing}
                  className="h-8 w-8 p-0"
                  aria-label="Alternar câmera"
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseScanner}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="relative">
<video
  ref={ref}
  className="w-full h-64 object-cover rounded-lg bg-black"
  playsInline
  autoPlay
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