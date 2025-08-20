import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatCPF, formatPhone } from "@/lib/validators";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Minus, Plus, Trash2, Search } from "lucide-react";
import { format } from "date-fns";

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity?: number;
}

interface QuoteItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface Quote {
  id: string;
  quote_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_cpf?: string;
  products: QuoteItem[];
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  quote_type: "quote" | "sale";
  status: string;
  valid_until?: string;
  notes?: string;
  payment_method?: string;
  payment_status?: string;
  shipping_cost?: number;
  sale_date?: string;
  created_at: string;
  updated_at: string;
}

interface EditQuoteFormProps {
  quote: Quote;
  onSave: (updatedQuote: Partial<Quote>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export default function EditQuoteForm({ quote, onSave, onCancel, isLoading }: EditQuoteFormProps) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [quoteProducts, setQuoteProducts] = useState<QuoteItem[]>(quote.products || []);
  
  const [formData, setFormData] = useState({
    customer_name: quote.customer_name || "",
    customer_phone: quote.customer_phone || "",
    customer_email: quote.customer_email || "",
    customer_cpf: quote.customer_cpf || "",
    discount_amount: quote.discount_amount || 0,
    notes: quote.notes || "",
    valid_until: quote.valid_until || "",
    payment_method: quote.payment_method || "",
    sale_date: quote.sale_date || format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  useEffect(() => {
    calculateTotals();
  }, [quoteProducts, formData.discount_amount]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('stock_quantity', 0)
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const calculateTotals = () => {
    const subtotal = quoteProducts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal - formData.discount_amount + (quote.shipping_cost || 0);
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      total_amount: Math.max(0, total)
    }));
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addProductToQuote = (product: Product) => {
    const existingItem = quoteProducts.find(item => item.id === product.id);
    if (existingItem) {
      updateProductQuantity(product.id, existingItem.quantity + 1);
    } else {
      const newItem: QuoteItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        total: product.price
      };
      setQuoteProducts([...quoteProducts, newItem]);
    }
  };

  const updateProductQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeProductFromQuote(productId);
      return;
    }

    setQuoteProducts(prev => prev.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity, total: item.price * newQuantity }
        : item
    ));
  };

  const removeProductFromQuote = (productId: string) => {
    setQuoteProducts(prev => prev.filter(item => item.id !== productId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (quoteProducts.length === 0) {
      toast({
        title: "Produtos obrigatórios",
        description: "Adicione pelo menos um produto ao orçamento.",
        variant: "destructive"
      });
      return;
    }
    
    // Validar método de pagamento para vendas
    if (quote.quote_type === "sale" && !formData.payment_method) {
      toast({
        title: "Método de pagamento obrigatório",
        description: "Selecione um método de pagamento para a venda.",
        variant: "destructive"
      });
      return;
    }
    
    const subtotal = quoteProducts.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal - formData.discount_amount + (quote.shipping_cost || 0);
    
    const updatedQuote = {
      ...formData,
      products: quoteProducts,
      subtotal,
      total_amount: Math.max(0, total),
      customer_cpf: formData.customer_cpf ? formData.customer_cpf.replace(/\D/g, '') : "",
      customer_phone: formData.customer_phone ? formData.customer_phone.replace(/\D/g, '') : ""
    };
    
    onSave(updatedQuote);
  };

  const handlePhoneBlur = () => {
    if (formData.customer_phone) {
      setFormData(prev => ({
        ...prev,
        customer_phone: formatPhone(prev.customer_phone)
      }));
    }
  };

  const handleCPFBlur = () => {
    if (formData.customer_cpf) {
      setFormData(prev => ({
        ...prev,
        customer_cpf: formatCPF(prev.customer_cpf)
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Dados do Cliente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customer_name">Nome do Cliente</Label>
            <Input
              id="customer_name"
              value={formData.customer_name}
              onChange={(e) => handleInputChange('customer_name', e.target.value)}
              placeholder="Nome completo"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="customer_phone">Telefone</Label>
            <Input
              id="customer_phone"
              value={formData.customer_phone}
              onChange={(e) => handleInputChange('customer_phone', e.target.value)}
              onBlur={handlePhoneBlur}
              placeholder="(00) 00000-0000"
            />
          </div>
          
          <div>
            <Label htmlFor="customer_email">E-mail</Label>
            <Input
              id="customer_email"
              type="email"
              value={formData.customer_email}
              onChange={(e) => handleInputChange('customer_email', e.target.value)}
              placeholder="cliente@email.com"
            />
          </div>
          
          <div>
            <Label htmlFor="customer_cpf">CPF</Label>
            <Input
              id="customer_cpf"
              value={formData.customer_cpf}
              onChange={(e) => handleInputChange('customer_cpf', e.target.value)}
              onBlur={handleCPFBlur}
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>
        </div>
      </div>

      {/* Quote Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Detalhes do {quote.quote_type === "sale" ? "Venda" : "Orçamento"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sale_date">Data da {quote.quote_type === "sale" ? "Venda" : "Orçamento"}</Label>
            <Input
              id="sale_date"
              type="date"
              value={formData.sale_date}
              onChange={(e) => handleInputChange('sale_date', e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="discount_amount">Desconto (R$)</Label>
            <Input
              id="discount_amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.discount_amount}
              onChange={(e) => handleInputChange('discount_amount', parseFloat(e.target.value) || 0)}
              placeholder="0,00"
            />
          </div>
          
          {quote.quote_type === "quote" && (
            <div>
              <Label htmlFor="valid_until">Válido até</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => handleInputChange('valid_until', e.target.value)}
              />
            </div>
          )}
          
          <div>
            <Label htmlFor="payment_method">
              Método de Pagamento {quote.quote_type === "sale" && "*"}
            </Label>
            <Select 
              value={formData.payment_method} 
              onValueChange={(value) => handleInputChange('payment_method', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div>
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Observações sobre o orçamento..."
            rows={3}
          />
        </div>
      </div>

      {/* Products Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Produtos</h3>
        
        {/* Add Products */}
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Produtos</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-48 overflow-y-auto">
            <div className="grid gap-2">
              {filteredProducts.slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => addProductToQuote(product)}
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{product.name}</h4>
                    <span className="text-primary font-semibold text-sm">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                  <Button size="sm" variant="outline">Adicionar</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Products */}
        <div className="space-y-2">
          <h4 className="font-medium">Produtos no Orçamento</h4>
          {quoteProducts.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum produto adicionado</p>
          ) : (
            <div className="space-y-2">
              {quoteProducts.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <span className="text-primary font-semibold">
                      {formatCurrency(item.price)} cada
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateProductQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="mx-2 min-w-8 text-center">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateProductQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeProductFromQuote(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="ml-4 text-right">
                    <span className="font-semibold">{formatCurrency(item.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        {quoteProducts.length > 0 && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(quoteProducts.reduce((sum, item) => sum + item.total, 0))}</span>
              </div>
              {quote.shipping_cost && quote.shipping_cost > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Taxa de Entrega:</span>
                  <span>{formatCurrency(quote.shipping_cost)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Desconto:</span>
                <span>- {formatCurrency(formData.discount_amount)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(
                  quoteProducts.reduce((sum, item) => sum + item.total, 0) + 
                  (quote.shipping_cost || 0) - 
                  formData.discount_amount
                )}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}