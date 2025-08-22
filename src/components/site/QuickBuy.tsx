import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, PhoneCall as Whatsapp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductInfo {
  id: string;
  name: string;
  price: string;
  description?: string;
}

interface QuickBuyProps {
  product: ProductInfo;
  phone: string; // WhatsApp phone (can be BR local, we normalize)
  pixKey: string;
  storeName: string;
}

function normalizeWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, "");
  
  // Validação básica para números brasileiros
  if (digits.length < 10) {
    console.warn(`Número muito curto para WhatsApp: ${digits}`);
    return null;
  }
  
  // Se já tem código do país (55)
  if (digits.startsWith("55")) {
    return digits.length >= 12 ? digits : null;
  }
  
  // Se tem DDD + 9 + 8 dígitos (11 dígitos total)
  if (digits.length === 11) {
    return `55${digits}`;
  }
  
  // Se tem apenas DDD + 8 dígitos (10 dígitos) - adiciona o 9
  if (digits.length === 10) {
    const ddd = digits.substring(0, 2);
    const number = digits.substring(2);
    return `55${ddd}9${number}`;
  }
  
  console.warn(`Formato de número inválido: ${digits}`);
  return null;
}

export default function QuickBuy({ product, phone, pixKey, storeName }: QuickBuyProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const waUrl = useMemo(() => {
    const normalized = normalizeWhatsApp(phone);
    if (!normalized) return null;
    const msg = `Olá! Tenho interesse no produto: ${product.name} (${product.price}).\nLoja: ${storeName}.\nMeu CEP: ____. Pode confirmar disponibilidade e prazo?`;
    const encoded = encodeURIComponent(msg);
    return `whatsapp://send?phone=${normalized}&text=${encoded}`;
  }, [phone, product.name, product.price, storeName]);

  const waFallbackUrl = useMemo(() => {
    const normalized = normalizeWhatsApp(phone);
    if (!normalized) return null;
    const msg = `Olá! Tenho interesse no produto: ${product.name} (${product.price}).\nLoja: ${storeName}.\nMeu CEP: ____. Pode confirmar disponibilidade e prazo?`;
    const encoded = encodeURIComponent(msg);
    return `https://web.whatsapp.com/send?phone=${normalized}&text=${encoded}`;
  }, [phone, product.name, product.price, storeName]);

  const isWhatsAppAvailable = waUrl !== null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      toast({ title: "Chave Pix copiada!", description: "Você pode colar no seu app bancário." });
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast({ title: "Não foi possível copiar", description: "Copie manualmente a chave Pix." });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="hero" size="sm" aria-label={`Comprar ${product.name}`}>Comprar</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar pedido</DialogTitle>
          <DialogDescription>
            Escolha como deseja finalizar o pedido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {storeName}: selecione a forma de contato/pagamento para <span className="font-medium text-foreground">{product.name}</span> — {product.price}
          </p>

          <div className="flex flex-col gap-3">
            {isWhatsAppAvailable ? (
              <Button 
                variant="secondary" 
                size="lg" 
                aria-label="Abrir WhatsApp com mensagem do pedido"
                className="w-full"
                onClick={() => {
                  // Tenta abrir o app do WhatsApp
                  window.location.href = waUrl!;
                  // Fallback para web após 2 segundos se o app não abrir
                  setTimeout(() => {
                    window.open(waFallbackUrl!, '_blank', 'noopener,noreferrer');
                  }, 2000);
                }}
              >
                <Whatsapp className="mr-2" /> Pedir pelo WhatsApp
              </Button>
            ) : (
              <div className="space-y-2">
                <Button variant="outline" size="lg" disabled className="w-full">
                  <Whatsapp className="mr-2" /> WhatsApp indisponível
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Número de telefone inválido. Entre em contato por outros meios.
                </p>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="pix-key">Pagamento via Pix (manual)</Label>
              <div className="flex items-center gap-2">
                <Input id="pix-key" readOnly value={pixKey} className="font-mono" aria-label="Chave Pix" />
                <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copiar chave Pix">
                  {copied ? <Check /> : <Copy />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Envie o comprovante pelo WhatsApp após o pagamento para agilizar o envio.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
