import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, ArrowUp, ArrowDown, RotateCcw, Scan, Edit, X } from "lucide-react";
import InventoryCheck from "./InventoryCheck";

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
}

interface Supplier {
  id: string;
  name: string;
  is_active: boolean;
}

interface StockMovement {
  id: string;
  product_id: string;
  movement_type: "entrada" | "saida";
  quantity: number;
  unit_cost?: number;
  batch_number?: string;
  expiry_date?: string;
  remaining_quantity?: number;
  notes?: string;
  reference_type?: string;
  reference_id?: string;
  user_id?: string;
  supplier_id?: string;
  created_at: string;
  updated_at: string;
  products?: {
    name: string;
  };
  suppliers?: {
    name: string;
  };
}

interface StockMovementFormProps {
  onSuccess: () => void;
}

const StockMovementForm = ({ onSuccess }: StockMovementFormProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [formData, setFormData] = useState({
    product_id: "",
    movement_type: "entrada" as "entrada" | "saida",
    quantity: 0,
    unit_cost: 0,
    batch_number: "",
    expiry_date: "",
    reference_type: "compra",
    supplier_id: "",
    notes: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
    fetchMovements();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock_quantity')
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          products:product_id (name),
          suppliers:supplier_id (name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setMovements((data as StockMovement[]) || []);
    } catch (error) {
      console.error("Error fetching movements:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      movement_type: "entrada",
      quantity: 0,
      unit_cost: 0,
      batch_number: "",
      expiry_date: "",
      reference_type: "compra",
      supplier_id: "",
      notes: "",
    });
    setEditingMovement(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || formData.quantity <= 0) {
      toast({
        title: "Dados inválidos",
        description: "Selecione um produto e informe uma quantidade válida.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (editingMovement) {
        // Update existing movement
        const { error } = await supabase
          .from('stock_movements')
          .update({
            quantity: formData.quantity,
            unit_cost: formData.unit_cost,
            batch_number: formData.batch_number,
            expiry_date: formData.expiry_date,
            reference_type: formData.reference_type,
            supplier_id: formData.supplier_id,
            notes: formData.notes,
            remaining_quantity: formData.movement_type === "entrada" ? formData.quantity : 0,
          })
          .eq('id', editingMovement.id);
        
        if (error) throw error;
        
        toast({ 
          title: "✅ Movimentação atualizada!",
          description: "Os dados da movimentação foram atualizados com sucesso."
        });
        
        setEditingMovement(null);
      } else {
        // Check stock availability for saida movements
        if (formData.movement_type === "saida") {
          const { data: stockCheck } = await supabase
            .rpc('check_available_stock', {
              product_uuid: formData.product_id,
              required_quantity: formData.quantity
            });

          if (!stockCheck) {
            toast({
              title: "Estoque insuficiente",
              description: "Não há estoque suficiente para esta movimentação.",
              variant: "destructive"
            });
            setLoading(false);
            return;
          }
        }

        const { error } = await supabase
          .from('stock_movements')
          .insert([{
            ...formData,
            remaining_quantity: formData.movement_type === "entrada" ? formData.quantity : 0,
            user_id: (await supabase.auth.getUser()).data.user?.id
          }]);
        
        if (error) throw error;
        
        toast({ 
          title: "✅ Movimentação registrada!",
          description: `${formData.movement_type === 'entrada' ? 'Entrada' : 'Saída'} de ${formData.quantity} unidades registrada.`
        });
      }
      
      // Reset form
      resetForm();
      
      fetchProducts();
      fetchMovements();
      onSuccess();
    } catch (error) {
      console.error("Error saving movement:", error);
      toast({
        title: editingMovement ? "Erro ao atualizar movimentação" : "Erro ao registrar movimentação",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditMovement = (movement: StockMovement) => {
    setEditingMovement(movement);
    setFormData({
      product_id: movement.product_id,
      movement_type: movement.movement_type,
      quantity: movement.quantity,
      unit_cost: movement.unit_cost || 0,
      batch_number: movement.batch_number || "",
      expiry_date: movement.expiry_date || "",
      reference_type: movement.reference_type || "compra",
      supplier_id: movement.supplier_id || "",
      notes: movement.notes || "",
    });
    
    toast({
      title: "Editando movimentação",
      description: "Os dados da movimentação foram carregados no formulário.",
    });
  };

  const handleCancelEdit = () => {
    resetForm();
    toast({
      title: "Edição cancelada",
      description: "O formulário foi limpo e voltou ao modo de criação.",
    });
  };

  const getMovementIcon = (type: string) => {
    return type === 'entrada' ? (
      <ArrowUp className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-red-600" />
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="movements" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="movements" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Movimentações
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Scan className="h-4 w-4" />
            Conferência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="movements" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {editingMovement ? 'Editar Movimentação' : 'Controle de Estoque'}
              </CardTitle>
              {editingMovement && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar Edição
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product_id">Produto</Label>
                    <Select 
                      value={formData.product_id} 
                      onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                      disabled={editingMovement !== null}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} (Est: {product.stock_quantity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="movement_type">Tipo de Movimentação</Label>
                    <Select 
                      value={formData.movement_type} 
                      onValueChange={(value: "entrada" | "saida") => setFormData({ ...formData, movement_type: value })}
                      disabled={editingMovement !== null}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">Entrada (Compra)</SelectItem>
                        <SelectItem value="saida">Saída (Ajuste)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantidade</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  {formData.movement_type === 'entrada' && (
                    <div>
                      <Label htmlFor="unit_cost">Custo Unitário (R$)</Label>
                      <Input
                        id="unit_cost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.unit_cost}
                        onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                </div>

                {formData.movement_type === "entrada" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="batch_number">Número do Lote</Label>
                      <Input
                        id="batch_number"
                        value={formData.batch_number}
                        onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                        placeholder="Ex: LT2024001"
                      />
                    </div>

                    <div>
                      <Label htmlFor="expiry_date">Data de Validade</Label>
                      <Input
                        id="expiry_date"
                        type="date"
                        value={formData.expiry_date}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reference_type">Referência</Label>
                    <Select value={formData.reference_type} onValueChange={(value) => setFormData({ ...formData, reference_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compra">Compra</SelectItem>
                        <SelectItem value="ajuste">Ajuste</SelectItem>
                        <SelectItem value="devolucao">Devolução</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.movement_type === 'entrada' && (
                    <div>
                      <Label htmlFor="supplier_id">Fornecedor</Label>
                      <Select value={formData.supplier_id} onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um fornecedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    placeholder="Adicione observações sobre esta movimentação..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? 
                      (editingMovement ? "Atualizando..." : "Registrando...") : 
                      (editingMovement ? "Atualizar Movimentação" : "Registrar Movimentação")
                    }
                  </Button>
                  {editingMovement && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Últimas Movimentações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Últimas Movimentações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma movimentação registrada ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {movements.map((movement) => (
                    <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getMovementIcon(movement.movement_type)}
                        <div>
                          <p className="font-medium">{movement.products?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {movement.movement_type === 'entrada' ? 'Entrada' : 'Saída'} - {movement.reference_type}
                          </p>
                          {movement.suppliers?.name && (
                            <p className="text-xs text-muted-foreground">
                              Fornecedor: {movement.suppliers.name}
                            </p>
                          )}
                          {movement.batch_number && (
                            <p className="text-xs text-muted-foreground">
                              Lote: {movement.batch_number}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-medium">{movement.quantity} un</p>
                          {movement.unit_cost && (
                            <p className="text-sm text-muted-foreground">
                              R$ {movement.unit_cost.toFixed(2)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMovement(movement)}
                          className="flex items-center gap-1"
                          disabled={editingMovement !== null}
                        >
                          <Edit className="h-3 w-3" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryCheck onSuccess={() => setRefreshTrigger(prev => prev + 1)} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StockMovementForm;