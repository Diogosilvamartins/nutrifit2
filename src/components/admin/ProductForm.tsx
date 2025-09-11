import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scan } from "lucide-react";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";

interface Product {
  id?: string;
  name: string;
  price: number;
  cost_price?: number;
  stock_quantity?: number;
  min_stock_alert?: number;
  description?: string;
  image_url?: string;
  barcode?: string;
  supplier_id?: string;
}

interface Supplier {
  id: string;
  name: string;
  company_name?: string;
}

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState({
    name: product?.name || "",
    price: product?.price || 0,
    cost_price: product?.cost_price || 0,
    stock_quantity: product?.stock_quantity || 0,
    min_stock_alert: product?.min_stock_alert || 5,
    description: product?.description || "",
    image_url: product?.image_url || "",
    barcode: product?.barcode || "",
    supplier_id: product?.supplier_id || "none",
  });
  const { toast } = useToast();

  // Hook para capturar códigos de barras do leitor Wi-Fi
  useBarcodeScanner({
    onBarcodeScanned: (barcode) => {
      setFormData(prev => ({ ...prev, barcode }));
      toast({
        title: "Código de barras capturado!",
        description: `Código: ${barcode}`,
      });
    },
    minLength: 6,
    timeout: 100
  });

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('id, name, company_name')
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        setSuppliers(data || []);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        toast({
          title: "Erro ao carregar fornecedores",
          variant: "destructive"
        });
      }
    };

    fetchSuppliers();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validação básica
      if (!formData.name.trim()) {
        toast({ 
          title: "Nome do produto é obrigatório", 
          variant: "destructive" 
        });
        return;
      }

      if (formData.price <= 0) {
        toast({ 
          title: "Preço deve ser maior que zero", 
          variant: "destructive" 
        });
        return;
      }

      if (product?.id) {
        // Update existing product
        const updateData = { ...formData };
        if (updateData.supplier_id === "none") {
          updateData.supplier_id = null;
        }
        
        console.log("Updating product:", product.id, updateData);
        const { data, error } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', product.id)
          .select();
        
        if (error) {
          console.error("Update error:", error);
          throw error;
        }
        
        console.log("Product updated successfully:", data);
        toast({ title: "Produto atualizado com sucesso!" });
      } else {
        // Create new product
        const insertData = { ...formData };
        if (insertData.supplier_id === "none") {
          insertData.supplier_id = null;
        }
        
        console.log("Creating new product:", insertData);
        const { data, error } = await supabase
          .from('products')
          .insert([insertData])
          .select();
        
        if (error) {
          console.error("Insert error:", error);
          throw error;
        }
        
        console.log("Product created successfully:", data);
        toast({ title: "Produto criado com sucesso!" });
      }
      
      onSuccess();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({ 
        title: "Erro ao salvar produto", 
        description: error?.message || "Tente novamente ou verifique os dados.",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product ? "Editar Produto" : "Novo Produto"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Produto</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full"
            />
          </div>
          
          <div>
            <Label htmlFor="price">Preço (R$)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="cost_price">Preço de Custo (R$)</Label>
            <Input
              id="cost_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.cost_price}
              onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock_quantity">Estoque Inicial</Label>
              <Input
                id="stock_quantity"
                type="number"
                min="0"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="min_stock_alert">Alerta de Estoque Mínimo</Label>
              <Input
                id="min_stock_alert"
                type="number"
                min="0"
                value={formData.min_stock_alert}
                onChange={(e) => setFormData({ ...formData, min_stock_alert: parseInt(e.target.value) || 5 })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="supplier_id">Fornecedor</Label>
            <Select
              value={formData.supplier_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, supplier_id: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum fornecedor</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name} {supplier.company_name && `(${supplier.company_name})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="barcode">Código de Barras</Label>
            <div className="space-y-2">
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Digite ou use o leitor de código de barras"
                className="w-full"
              />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Scan className="h-4 w-4" />
                <span>Leitor de código de barras ativo - escaneie um código</span>
              </div>
            </div>
          </div>
          
          <div>
            <Label htmlFor="image_url">URL da Imagem</Label>
            <Input
              id="image_url"
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            />
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}