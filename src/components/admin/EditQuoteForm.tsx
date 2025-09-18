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
import { Minus, Plus, Trash2, Search, MapPin } from "lucide-react";
import { fetchAddressByCEP } from "@/lib/cep-service";
import { format } from "date-fns";
import { QuoteFormSection } from "./pos/QuoteFormSection";
import { PaymentSplit } from "@/types";

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
  customer_zipcode?: string;
  customer_street?: string;
  customer_number?: string;
  customer_complement?: string;
  customer_neighborhood?: string;
  customer_city?: string;
  customer_state?: string;
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
  payment_splits?: PaymentSplit[];
  has_partial_payment?: boolean;
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
  const [isSearchingCEP, setIsSearchingCEP] = useState(false);
  const [cepTimeout, setCepTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const [formData, setFormData] = useState({
    customer_name: quote.customer_name || "",
    customer_phone: quote.customer_phone || "",
    customer_email: quote.customer_email || "",
    customer_cpf: quote.customer_cpf || "",
    customer_zipcode: quote.customer_zipcode || "",
    customer_street: quote.customer_street || "",
    customer_number: quote.customer_number || "",
    customer_complement: quote.customer_complement || "",
    customer_neighborhood: quote.customer_neighborhood || "",
    customer_city: quote.customer_city || "",
    customer_state: quote.customer_state || "",
    discount_amount: quote.discount_amount || 0,
    notes: quote.notes || "",
    valid_until: quote.valid_until || "",
    payment_method: quote.payment_method || "",
    sale_date: quote.sale_date || format(new Date(), 'yyyy-MM-dd')
  });

  // Estados para pagamento parcial
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>(quote.payment_splits || []);
  const [hasPartialPayment, setHasPartialPayment] = useState(quote.has_partial_payment || false);

  useEffect(() => {
    fetchProducts();
    if (quote.quote_type === "sale" && quote.id) {
      fetchPaymentSplits();
    }
  }, []);

  const fetchPaymentSplits = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_splits')
        .select('*')
        .eq('quote_id', quote.id);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const mappedSplits: PaymentSplit[] = data.map(split => ({
          payment_method: split.payment_method as "dinheiro" | "pix" | "cartao_debito" | "cartao_credito",
          amount: split.amount
        }));
        setPaymentSplits(mappedSplits);
        setHasPartialPayment(true);
      }
    } catch (error) {
      console.error("Error fetching payment splits:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (cepTimeout) {
        clearTimeout(cepTimeout);
      }
    };
  }, [cepTimeout]);

  const searchAddressByCEP = async (cep: string) => {
    if (!cep || cep.replace(/\D/g, '').length !== 8) return;
    
    setIsSearchingCEP(true);
    try {
      const addressData = await fetchAddressByCEP(cep);
      
      if (addressData) {
        setFormData(prev => ({
          ...prev,
          customer_street: addressData.logradouro,
          customer_neighborhood: addressData.bairro,
          customer_city: addressData.localidade,
          customer_state: addressData.uf,
          customer_complement: addressData.complemento || prev.customer_complement
        }));
        
        toast({
          title: "Endereço encontrado!",
          description: `${addressData.logradouro}, ${addressData.bairro} - ${addressData.localidade}/${addressData.uf}`,
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado e tente novamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast({
        title: "Erro ao buscar CEP",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    } finally {
      setIsSearchingCEP(false);
    }
  };

  const handleCEPChange = (cep: string) => {
    setFormData(prev => ({ ...prev, customer_zipcode: cep }));
    
    // Limpar timeout anterior se existir
    if (cepTimeout) {
      clearTimeout(cepTimeout);
    }
    
    // Criar novo timeout para busca
    const timeout = setTimeout(() => {
      searchAddressByCEP(cep);
    }, 1000); // Aguarda 1s após parar de digitar
    
    setCepTimeout(timeout);
  };

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
    if (quote.quote_type === "sale" && !hasPartialPayment && !formData.payment_method) {
      toast({
        title: "Método de pagamento obrigatório",
        description: "Selecione um método de pagamento para a venda.",
        variant: "destructive"
      });
      return;
    }

    // Validar pagamento parcial para vendas
    if (quote.quote_type === "sale" && hasPartialPayment) {
      if (paymentSplits.length === 0) {
        toast({
          title: "Pagamento parcial obrigatório",
          description: "Configure pelo menos uma forma de pagamento.",
          variant: "destructive"
        });
        return;
      }

      const totalSplits = paymentSplits.reduce((sum, split) => sum + split.amount, 0);
      const subtotal = quoteProducts.reduce((sum, item) => sum + item.total, 0);
      const total = subtotal - formData.discount_amount + (quote.shipping_cost || 0);
      
      if (Math.abs(totalSplits - total) > 0.01) {
        toast({
          title: "Pagamento parcial inválido",
          description: `Total dos pagamentos (R$ ${totalSplits.toFixed(2)}) deve igual ao total da venda (R$ ${total.toFixed(2)}).`,
          variant: "destructive"
        });
        return;
      }
    }
    
    const subtotal = quoteProducts.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal - formData.discount_amount + (quote.shipping_cost || 0);
    
    const updatedQuote = {
      ...formData,
      products: quoteProducts,
      subtotal,
      total_amount: Math.max(0, total),
      customer_cpf: formData.customer_cpf ? formData.customer_cpf.replace(/\D/g, '') : "",
      customer_phone: formData.customer_phone ? formData.customer_phone.replace(/\D/g, '') : "",
      customer_zipcode: formData.customer_zipcode ? formData.customer_zipcode.replace(/\D/g, '') : "",
      customer_street: formData.customer_street || "",
      customer_number: formData.customer_number || "",
      customer_complement: formData.customer_complement || "",
      customer_neighborhood: formData.customer_neighborhood || "",
      customer_city: formData.customer_city || "",
      customer_state: formData.customer_state || "",
      payment_splits: hasPartialPayment ? paymentSplits : [],
      has_partial_payment: hasPartialPayment,
      payment_method: hasPartialPayment ? "partial" : formData.payment_method
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
        
        {/* Endereço */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Endereço</Label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="customer_zipcode">CEP</Label>
              <div className="relative">
                <Input
                  id="customer_zipcode"
                  value={formData.customer_zipcode || ''}
                  onChange={(e) => handleCEPChange(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {isSearchingCEP && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Search className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Digite o CEP para buscar automaticamente
              </p>
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="customer_street">Logradouro</Label>
              <Input
                id="customer_street"
                value={formData.customer_street || ''}
                onChange={(e) => handleInputChange('customer_street', e.target.value)}
                placeholder="Rua, Avenida, etc."
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="customer_number">Número</Label>
              <Input
                id="customer_number"
                value={formData.customer_number || ''}
                onChange={(e) => handleInputChange('customer_number', e.target.value)}
                placeholder="123"
              />
            </div>
            
            <div>
              <Label htmlFor="customer_complement">Complemento</Label>
              <Input
                id="customer_complement"
                value={formData.customer_complement || ''}
                onChange={(e) => handleInputChange('customer_complement', e.target.value)}
                placeholder="Apto, Bloco, etc."
              />
            </div>
            
            <div>
              <Label htmlFor="customer_neighborhood">Bairro</Label>
              <Input
                id="customer_neighborhood"
                value={formData.customer_neighborhood || ''}
                onChange={(e) => handleInputChange('customer_neighborhood', e.target.value)}
                placeholder="Centro, Vila..."
              />
            </div>
            
            <div>
              <Label htmlFor="customer_city">Cidade</Label>
              <Input
                id="customer_city"
                value={formData.customer_city || ''}
                onChange={(e) => handleInputChange('customer_city', e.target.value)}
                placeholder="São Paulo"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="customer_state">Estado</Label>
              <Input
                id="customer_state"
                value={formData.customer_state || ''}
                onChange={(e) => handleInputChange('customer_state', e.target.value)}
                placeholder="SP"
                maxLength={2}
              />
            </div>
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
        </div>
        
        {/* Seção de Pagamento */}
        {quote.quote_type === "sale" && (
          <QuoteFormSection
            validUntil={formData.valid_until}
            onValidUntilChange={(date) => handleInputChange('valid_until', date)}
            paymentMethod={formData.payment_method}
            onPaymentMethodChange={(method) => handleInputChange('payment_method', method)}
            notes={formData.notes}
            onNotesChange={(notes) => handleInputChange('notes', notes)}
            totalAmount={quoteProducts.reduce((sum, item) => sum + item.total, 0) - formData.discount_amount + (quote.shipping_cost || 0)}
            paymentSplits={paymentSplits}
            onPaymentSplitsChange={setPaymentSplits}
            hasPartialPayment={hasPartialPayment}
            onPartialPaymentToggle={setHasPartialPayment}
          />
        )}
        
        {quote.quote_type === "quote" && (
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
        )}
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