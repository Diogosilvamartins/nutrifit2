import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Scan, Package, AlertCircle, CheckCircle, Minus } from "lucide-react";
import { MobileScanner } from "@/components/mobile/MobileScanner";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  barcode?: string;
}

interface InventoryRecord {
  id: string;
  product_id: string;
  system_quantity: number;
  physical_quantity: number;
  difference: number;
  status: 'counted' | 'processed';
  notes?: string;
  created_at: string;
  products?: {
    name: string;
  };
}

interface InventoryCheckProps {
  onSuccess: () => void;
}

export default function InventoryCheck({ onSuccess }: InventoryCheckProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [physicalQuantity, setPhysicalQuantity] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [recentInventory, setRecentInventory] = useState<InventoryRecord[]>([]);
  const { toast } = useToast();

  const handleBarcodeScanned = async (barcode: string) => {
    console.log('Código escaneado no inventário:', barcode);
    setScannedCode(barcode);
    await findProductByBarcode(barcode);
  };

  // Hook do scanner de teclado
  useBarcodeScanner({
    onBarcodeScanned: handleBarcodeScanned,
    minLength: 6,
    timeout: 100
  });

  useEffect(() => {
    fetchRecentInventory();
  }, []);

  const findProductByBarcode = async (barcode: string) => {
    if (!barcode.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock_quantity, barcode')
        .eq('barcode', barcode.trim())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProduct(data);
        setPhysicalQuantity(0); // Reset para nova contagem
        setNotes("");
        toast({
          title: "Produto encontrado!",
          description: `${data.name} - Estoque atual: ${data.stock_quantity}`
        });
      } else {
        toast({
          title: "Produto não encontrado",
          description: "Código de barras não cadastrado no sistema.",
          variant: "destructive"
        });
        setProduct(null);
      }
    } catch (error) {
      console.error("Error finding product:", error);
      toast({
        title: "Erro ao buscar produto",
        description: "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          id,
          product_id,
          quantity,
          notes,
          created_at,
          products:product_id (name)
        `)
        .eq('reference_type', 'inventory')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Transformar em formato de inventário
      const inventoryData = (data || []).map(item => ({
        id: item.id,
        product_id: item.product_id,
        system_quantity: 0, // Não temos esse dado histórico
        physical_quantity: 0, // Não temos esse dado histórico  
        difference: Math.abs(item.quantity),
        status: 'processed' as const,
        notes: item.notes,
        created_at: item.created_at,
        products: item.products
      }));
      
      setRecentInventory(inventoryData);
    } catch (error) {
      console.error("Error fetching recent inventory:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) {
      toast({
        title: "Nenhum produto selecionado",
        description: "Escaneie um código de barras primeiro.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const systemQuantity = product.stock_quantity;
      const difference = physicalQuantity - systemQuantity;

      // Se há diferença negativa (falta), registrar como saída (prejuízo)
      if (difference < 0) {
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert([{
            product_id: product.id,
            movement_type: 'saida',
            quantity: Math.abs(difference),
            reference_type: 'inventory',
            notes: `Inventário - Prejuízo identificado. Sistema: ${systemQuantity}, Físico: ${physicalQuantity}. ${notes || ''}`.trim(),
            user_id: (await supabase.auth.getUser()).data.user?.id
          }]);

        if (movementError) throw movementError;

        toast({
          title: "⚠️ Prejuízo registrado!",
          description: `Falta de ${Math.abs(difference)} unidades registrada como saída.`,
          variant: "destructive"
        });
      } else if (difference > 0) {
        // Se há diferença positiva (sobra), registrar como entrada
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert([{
            product_id: product.id,
            movement_type: 'entrada',
            quantity: difference,
            reference_type: 'inventory',
            notes: `Inventário - Sobra identificada. Sistema: ${systemQuantity}, Físico: ${physicalQuantity}. ${notes || ''}`.trim(),
            user_id: (await supabase.auth.getUser()).data.user?.id
          }]);

        if (movementError) throw movementError;

        toast({
          title: "✅ Sobra registrada!",
          description: `Excesso de ${difference} unidades registrado como entrada.`
        });
      } else {
        toast({
          title: "✅ Estoque conferido!",
          description: "Quantidade física confere com o sistema."
        });
      }

      // Reset form
      setProduct(null);
      setPhysicalQuantity(0);
      setNotes("");
      setScannedCode("");
      
      fetchRecentInventory();
      onSuccess();
      
    } catch (error) {
      console.error("Error processing inventory:", error);
      toast({
        title: "Erro ao processar inventário",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDifferenceIcon = (difference: number) => {
    if (difference < 0) return <Minus className="h-4 w-4 text-red-600" />;
    if (difference > 0) return <CheckCircle className="h-4 w-4 text-green-600" />;
    return <CheckCircle className="h-4 w-4 text-blue-600" />;
  };

  const getDifferenceColor = (difference: number) => {
    if (difference < 0) return "text-red-600";
    if (difference > 0) return "text-green-600";
    return "text-blue-600";
  };

  return (
    <div className="space-y-6">
      {/* Scanner */}
      <MobileScanner onBarcodeScanned={handleBarcodeScanned} />

      {/* Formulário de Inventário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Conferência de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Código Escaneado */}
            {scannedCode && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm">
                  <strong>Último código escaneado:</strong> {scannedCode}
                </p>
              </div>
            )}

            {/* Produto Encontrado */}
            {product && (
              <div className="p-4 border rounded-lg bg-green-50">
                <h3 className="font-medium text-green-800">{product.name}</h3>
                <p className="text-sm text-green-700">
                  Estoque no Sistema: <strong>{product.stock_quantity} unidades</strong>
                </p>
                {product.barcode && (
                  <p className="text-xs text-green-600">Código: {product.barcode}</p>
                )}
              </div>
            )}

            {/* Input de Quantidade Física */}
            <div>
              <Label htmlFor="physical_quantity">Quantidade Física Contada</Label>
              <Input
                id="physical_quantity"
                type="number"
                min="0"
                value={physicalQuantity}
                onChange={(e) => setPhysicalQuantity(parseInt(e.target.value) || 0)}
                placeholder="Digite a quantidade contada fisicamente"
                disabled={!product}
                required
              />
            </div>

            {/* Diferença */}
            {product && physicalQuantity !== 0 && (
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getDifferenceIcon(physicalQuantity - product.stock_quantity)}
                  <span className={`font-medium ${getDifferenceColor(physicalQuantity - product.stock_quantity)}`}>
                    Diferença: {physicalQuantity - product.stock_quantity > 0 ? '+' : ''}{physicalQuantity - product.stock_quantity} unidades
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {physicalQuantity - product.stock_quantity < 0 && "⚠️ Será registrado como prejuízo (saída)"}
                  {physicalQuantity - product.stock_quantity > 0 && "✅ Será registrado como sobra (entrada)"}
                  {physicalQuantity - product.stock_quantity === 0 && "✅ Estoque confere"}
                </p>
              </div>
            )}

            {/* Observações */}
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Observações sobre a conferência (opcional)"
              />
            </div>

            <Button type="submit" disabled={loading || !product} className="w-full">
              {loading ? "Processando..." : "Registrar Conferência"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Conferências Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Últimas Conferências
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentInventory.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma conferência registrada ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {recentInventory.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="font-medium">{record.products?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Conferência de inventário
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${getDifferenceColor(-record.difference)}`}>
                      {record.difference > 0 ? '-' : '+'}{record.difference} un
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(record.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}