import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Minus, Plus, Trash2, Search, FileText, Receipt, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { generatePDF } from "@/lib/pdf-generator";
import { format, addDays } from "date-fns";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity?: number;
  min_stock_alert?: number;
  image_url?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Quote {
  id?: string;
  quote_number?: string;
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
  salesperson_id?: string;
  products: CartItem[];
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  quote_type: "quote" | "sale";
  status: string;
  valid_until?: string;
  notes?: string;
  payment_method?: string;
  payment_status?: string;
  include_shipping: boolean;
  shipping_cost: number;
  sale_date?: string;
}

interface Profile {
  user_id: string;
  full_name: string;
  role: string;
}

export default function PointOfSale() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [salespeople, setSalespeople] = useState<Profile[]>([]);
  const [quote, setQuote] = useState<Quote>({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_cpf: "",
    customer_zipcode: "",
    customer_street: "",
    customer_number: "",
    customer_complement: "",
    customer_neighborhood: "",
    customer_city: "",
    customer_state: "",
    products: [],
    subtotal: 0,
    discount_amount: 0,
    total_amount: 0,
    quote_type: "quote",
    status: "pending",
    valid_until: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
    notes: "",
    payment_method: "",
    payment_status: "pending",
    include_shipping: false,
    shipping_cost: 0,
    sale_date: format(new Date(), 'yyyy-MM-dd'),
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
    fetchSalespeople();
  }, []);

  const fetchSalespeople = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .in('role', ['admin', 'manager', 'salesperson', 'user'])
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      setSalespeople(data || []);
    } catch (error) {
      console.error("Error fetching salespeople:", error);
    }
  };

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  useEffect(() => {
    calculateTotals();
  }, [cart, quote.discount_amount, quote.include_shipping, quote.shipping_cost]);

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
      toast({
        title: "Erro ao carregar produtos",
        variant: "destructive"
      });
    }
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const shippingCost = quote.include_shipping ? quote.shipping_cost : 0;
    const total = subtotal - quote.discount_amount + shippingCost;
    
    setQuote(prev => ({
      ...prev,
      products: cart,
      subtotal,
      total_amount: Math.max(0, total)
    }));
  };

  const addToCart = async (product: Product) => {
    // Check stock
    const { data: stockCheck } = await supabase
      .rpc('check_available_stock', {
        product_uuid: product.id,
        required_quantity: 1
      });

    if (!stockCheck) {
      toast({
        title: "Estoque insuficiente",
        variant: "destructive"
      });
      return;
    }

    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    // Check stock
    const { data: stockCheck } = await supabase
      .rpc('check_available_stock', {
        product_uuid: productId,
        required_quantity: newQuantity
      });

    if (!stockCheck) {
      toast({
        title: "Estoque insuficiente",
        variant: "destructive"
      });
      return;
    }

    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setQuote({
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      customer_cpf: "",
      products: [],
      subtotal: 0,
      discount_amount: 0,
      total_amount: 0,
      quote_type: "quote",
      status: "pending",
      valid_until: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
      sale_date: format(new Date(), 'yyyy-MM-dd'),
      notes: "",
      payment_method: "",
      payment_status: "pending",
      include_shipping: false,
      shipping_cost: 0,
    });
  };

  const saveQuote = async (type: "quote" | "sale") => {
    if (!quote.customer_name || cart.length === 0) {
      toast({
        title: "Dados obrigatórios",
        description: "Informe o nome do cliente e adicione produtos.",
        variant: "destructive"
      });
      return;
    }

    // Validar método de pagamento para vendas
    if (type === "sale" && !quote.payment_method) {
      toast({
        title: "Método de pagamento obrigatório",
        description: "Selecione um método de pagamento para realizar a venda.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Criar ou buscar cliente
      let customerId = null;
      if (quote.customer_name) {
        const { data: customerIdResult, error: customerError } = await supabase
          .rpc('get_or_create_customer', {
            customer_name_param: quote.customer_name,
            customer_email_param: quote.customer_email || null,
            customer_phone_param: quote.customer_phone || null,
            customer_cpf_param: quote.customer_cpf || null
          });
        
        if (customerError) {
          console.error("Error creating/getting customer:", customerError);
          // Continue sem customer_id se houver erro
        } else {
          customerId = customerIdResult;
        }
      }

      const { data: quoteNumber } = await supabase.rpc('generate_unique_quote_number');
      
      const quoteData = {
        quote_number: quoteNumber,
        customer_id: customerId,
        customer_name: quote.customer_name,
        customer_phone: quote.customer_phone,
        customer_email: quote.customer_email,
        customer_cpf: quote.customer_cpf,
        customer_zipcode: quote.customer_zipcode,
        customer_street: quote.customer_street,
        customer_number: quote.customer_number,
        customer_complement: quote.customer_complement,
        customer_neighborhood: quote.customer_neighborhood,
        customer_city: quote.customer_city,
        customer_state: quote.customer_state,
        products: cart.map(item => ({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          total: item.product.price * item.quantity
        })),
        shipping_type: quote.include_shipping ? 'local' : 'none',
        shipping_cost: quote.include_shipping ? quote.shipping_cost : 0,
        subtotal: quote.subtotal,
        discount_amount: quote.discount_amount,
        total_amount: quote.total_amount,
        quote_type: type,
        status: type === "sale" ? "completed" : "pending",
        valid_until: quote.valid_until,
        notes: quote.notes,
        payment_method: quote.payment_method,
        payment_status: type === "sale" ? "paid" : "pending",
        salesperson_id: quote.salesperson_id,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { data, error } = await supabase
        .from('quotes')
        .insert([quoteData])
        .select()
        .single();

      if (error) throw error;

      // If it's a sale, update stock
      if (type === "sale") {
        for (const item of cart) {
          await supabase
            .from('stock_movements')
            .insert([{
              product_id: item.product.id,
              movement_type: 'saida',
              quantity: item.quantity,
              reference_type: 'venda',
              reference_id: data.id,
              notes: `Venda ${quoteNumber}`,
              user_id: (await supabase.auth.getUser()).data.user?.id
            }]);
        }
      }

      toast({
        title: `${type === "sale" ? "Venda" : "Orçamento"} criado!`,
        description: `Número: ${quoteNumber}`
      });

      // Clear the cart and reset form for next quote/sale
      clearCart();

      return data;
    } catch (error) {
      console.error("Error saving quote:", error);
      toast({
        title: "Erro ao salvar",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateQuotePDF = async () => {
    if (!quote.quote_number) {
      toast({
        title: "Salve o orçamento primeiro",
        variant: "destructive"
      });
      return;
    }

    try {
      const pdf = await generatePDF({
        type: quote.quote_type,
        number: quote.quote_number,
        saleDate: quote.sale_date,
        customer: {
          name: quote.customer_name,
          phone: quote.customer_phone,
          email: quote.customer_email,
          cpf: quote.customer_cpf,
          zipcode: quote.customer_zipcode,
          street: quote.customer_street,
          number: quote.customer_number,
          complement: quote.customer_complement,
          neighborhood: quote.customer_neighborhood,
          city: quote.customer_city,
          state: quote.customer_state
        },
        items: cart.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          total: item.product.price * item.quantity
        })),
        subtotal: quote.subtotal,
        discount: quote.discount_amount,
        total: quote.total_amount,
        validUntil: quote.valid_until,
        notes: quote.notes
      });

      // Download PDF
      const link = document.createElement('a');
      link.href = pdf;
      link.download = `${quote.quote_type}-${quote.quote_number}.pdf`;
      link.click();

      toast({
        title: "PDF gerado com sucesso!"
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        variant: "destructive"
      });
    }
  };

  const getWhatsAppUrl = (): string | null => {
    if (!quote.customer_phone || !quote.quote_number) {
      return null;
    }

    // Normalize phone number for WhatsApp
    const cleanPhone = quote.customer_phone.replace(/\D/g, "");
    let phone = cleanPhone;
    
    // Add country code if not present
    if (!phone.startsWith('55') && phone.length >= 10) {
      phone = `55${phone}`;
    }
    
    // Validate phone length
    if (phone.length < 12) {
      return null;
    }

    const message = `Olá ${quote.customer_name}! \n\n${quote.quote_type === "sale" ? "Recibo de Compra" : "Orçamento"} Nº: ${quote.quote_number}\n\n${cart.map(item => `• ${item.product.name} - Qtd: ${item.quantity} - ${formatCurrency(item.product.price * item.quantity)}`).join('\n')}\n\nSubtotal: ${formatCurrency(quote.subtotal)}\n${quote.include_shipping ? `Taxa de Entrega: ${formatCurrency(quote.shipping_cost)}` : ''}\n${quote.discount_amount > 0 ? `Desconto: ${formatCurrency(quote.discount_amount)}` : ''}\nTotal: ${formatCurrency(quote.total_amount)}\n\n${quote.quote_type === "quote" && quote.valid_until ? `Válido até: ${new Date(quote.valid_until).toLocaleDateString('pt-BR')}` : ''}\n\nNutri & Fit Suplementos\nAv. Rio Doce, 1075 - Ilha dos Araújos`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodedMessage}`;
    return whatsappUrl;
  };

  const getWhatsAppFallbackUrl = (): string | null => {
    if (!quote.customer_phone || !quote.quote_number) {
      return null;
    }

    // Normalize phone number for WhatsApp
    const cleanPhone = quote.customer_phone.replace(/\D/g, "");
    let phone = cleanPhone;
    
    // Add country code if not present
    if (!phone.startsWith('55') && phone.length >= 10) {
      phone = `55${phone}`;
    }
    
    // Validate phone length
    if (phone.length < 12) {
      return null;
    }

    const message = `Olá ${quote.customer_name}! \n\n${quote.quote_type === "sale" ? "Recibo de Compra" : "Orçamento"} Nº: ${quote.quote_number}\n\n${cart.map(item => `• ${item.product.name} - Qtd: ${item.quantity} - ${formatCurrency(item.product.price * item.quantity)}`).join('\n')}\n\nSubtotal: ${formatCurrency(quote.subtotal)}\n${quote.include_shipping ? `Taxa de Entrega: ${formatCurrency(quote.shipping_cost)}` : ''}\n${quote.discount_amount > 0 ? `Desconto: ${formatCurrency(quote.discount_amount)}` : ''}\nTotal: ${formatCurrency(quote.total_amount)}\n\n${quote.quote_type === "quote" && quote.valid_until ? `Válido até: ${new Date(quote.valid_until).toLocaleDateString('pt-BR')}` : ''}\n\nNutri & Fit Suplementos\nAv. Rio Doce, 1075 - Ilha dos Araújos`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
    return whatsappUrl;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Products Section */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos</CardTitle>
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
        <CardContent className="max-h-96 overflow-y-auto">
          <div className="grid gap-2">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => addToCart(product)}
              >
                <div className="flex-1">
                  <h4 className="font-medium">{product.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-semibold">
                      {formatCurrency(product.price)}
                    </span>
                    <Badge 
                      variant={
                        (product.stock_quantity || 0) <= (product.min_stock_alert || 5) 
                          ? "destructive" 
                          : "default"
                      }
                    >
                      Estoque: {product.stock_quantity}
                    </Badge>
                  </div>
                </div>
                <Button size="sm">Adicionar</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cart and Customer Section */}
      <div className="space-y-6">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_name">Nome *</Label>
                <Input
                  id="customer_name"
                  value={quote.customer_name}
                  onChange={(e) => setQuote({ ...quote, customer_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customer_phone">Telefone</Label>
                <Input
                  id="customer_phone"
                  value={quote.customer_phone}
                  onChange={(e) => setQuote({ ...quote, customer_phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customer_email">E-mail</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={quote.customer_email}
                  onChange={(e) => setQuote({ ...quote, customer_email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customer_cpf">CPF</Label>
                <Input
                  id="customer_cpf"
                  value={quote.customer_cpf}
                  onChange={(e) => setQuote({ ...quote, customer_cpf: e.target.value })}
                />
              </div>
            </div>
            
            {/* Vendedor */}
            <div className="space-y-2">
              <Label htmlFor="salesperson">Vendedor</Label>
              <Select value={quote.salesperson_id} onValueChange={(value) => setQuote({ ...quote, salesperson_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor..." />
                </SelectTrigger>
                <SelectContent>
                  {salespeople.map((person) => (
                    <SelectItem key={person.user_id} value={person.user_id}>
                      {person.full_name} ({person.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Data da Venda */}
            <div className="space-y-2">
              <Label htmlFor="sale_date">Data da Venda</Label>
              <Input
                id="sale_date"
                type="date"
                value={quote.sale_date}
                onChange={(e) => setQuote({...quote, sale_date: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Cart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Carrinho</CardTitle>
            <Button variant="outline" size="sm" onClick={clearCart}>
              Limpar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum produto adicionado
              </p>
            ) : (
              <>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{item.product.name}</h5>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.product.price)} cada
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Discount and Totals */}
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="discount">Desconto (R$)</Label>
                    <Input
                      id="discount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={quote.discount_amount}
                      onChange={(e) => setQuote({ ...quote, discount_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(quote.subtotal)}</span>
                  </div>
                  
                  {/* Taxa de Entrega com Checkbox */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include_shipping"
                        checked={quote.include_shipping}
                        onCheckedChange={(checked) => 
                          setQuote({ ...quote, include_shipping: checked as boolean })
                        }
                      />
                      <Label htmlFor="include_shipping">Taxa de Entrega</Label>
                    </div>
                    
                    {quote.include_shipping && (
                      <div className="flex items-center justify-between">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          value={quote.shipping_cost}
                          onChange={(e) => setQuote({ ...quote, shipping_cost: parseFloat(e.target.value) || 0 })}
                          className="w-24"
                        />
                        <span>{formatCurrency(quote.shipping_cost)}</span>
                      </div>
                    )}
                  </div>
                  
                  {quote.discount_amount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Desconto:</span>
                      <span>- {formatCurrency(quote.discount_amount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(quote.total_amount)}</span>
                  </div>
                </div>

                {/* Additional Fields */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="valid_until">Válido até</Label>
                    <Input
                      id="valid_until"
                      type="date"
                      value={quote.valid_until}
                      onChange={(e) => setQuote({ ...quote, valid_until: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="payment_method">Método de Pagamento *</Label>
                    <Select value={quote.payment_method} onValueChange={(value) => setQuote({ ...quote, payment_method: value })}>
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

                  <div>
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={quote.notes}
                      onChange={(e) => setQuote({ ...quote, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => saveQuote("quote")}
                    disabled={loading}
                    variant="outline"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Orçamento
                  </Button>
                  <Button
                    onClick={() => saveQuote("sale")}
                    disabled={loading}
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Venda
                  </Button>
                  
                  {quote.quote_number && (
                    <>
                      <Button
                        onClick={generateQuotePDF}
                        variant="outline"
                      >
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!getWhatsAppUrl()}
                        onClick={() => {
                          const appUrl = getWhatsAppUrl();
                          const fallbackUrl = getWhatsAppFallbackUrl();
                          if (appUrl && fallbackUrl) {
                            window.location.href = appUrl;
                            setTimeout(() => {
                              window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
                            }, 2000);
                          } else {
                            toast({
                              title: "Telefone não informado",
                              variant: "destructive"
                            });
                          }
                        }}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}