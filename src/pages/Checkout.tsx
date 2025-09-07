import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useShipping } from "@/hooks/useShipping";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Truck, Clock, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const Checkout = () => {
  const { items, getTotalPrice, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const { shippingOptions, calculations, calculateShipping, fetchShippingOptions } = useShipping();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [zipCodeLoading, setZipCodeLoading] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState("");

  // Redirect to auth if user is not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para finalizar uma compra.",
        variant: "destructive"
      });
      navigate("/auth");
    }
  }, [user, authLoading, navigate, toast]);

  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: user?.email || "",
    customer_cpf: "",
    customer_phone: "",
    delivery_address: "",
    delivery_city: "",
    delivery_state: "",
    delivery_zipcode: "",
    delivery_complement: ""
  });

  // Buscar endereço por CEP usando ViaCEP
  const fetchAddressByZipCode = async (zipcode: string) => {
    const cleanZipCode = zipcode.replace(/\D/g, '');
    
    if (cleanZipCode.length !== 8) return;

    setZipCodeLoading(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanZipCode}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique se o CEP está correto.",
          variant: "destructive"
        });
        return;
      }

      // Atualizar os campos de endereço automaticamente
      setFormData(prev => ({
        ...prev,
        delivery_address: data.logradouro || "",
        delivery_city: data.localidade || "",
        delivery_state: data.uf || "",
        delivery_complement: prev.delivery_complement // Manter o complemento que já estava preenchido
      }));

      toast({
        title: "Endereço encontrado!",
        description: "Agora adicione apenas o número da residência no campo 'Endereço'."
      });

    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast({
        title: "Erro ao buscar CEP",
        description: "Tente novamente ou preencha o endereço manualmente.",
        variant: "destructive"
      });
    } finally {
      setZipCodeLoading(false);
    }
  };

  useEffect(() => {
    fetchShippingOptions();
  }, [fetchShippingOptions]);

  // Calculate shipping and fetch address when ZIP code changes
  useEffect(() => {
    if (formData.delivery_zipcode.replace(/\D/g, '').length === 8) {
      const totalWeight = items.reduce((sum, item) => sum + 1 * item.quantity, 0); // 1kg per item as default
      calculateShipping(formData.delivery_zipcode, Math.max(totalWeight, 1));
      
      // Buscar endereço automaticamente
      fetchAddressByZipCode(formData.delivery_zipcode);
    }
  }, [formData.delivery_zipcode, items, calculateShipping]);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  };

  const formatZipcode = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d{5})(\d{3})/, "$1-$2");
  };

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;
    
    if (field === "customer_cpf") {
      formattedValue = formatCPF(value);
    } else if (field === "customer_phone") {
      formattedValue = formatPhone(value);
    } else if (field === "delivery_zipcode") {
      formattedValue = formatZipcode(value);
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }));
  };

  const validateForm = () => {
    const required = [
      "customer_name", "customer_email", "customer_cpf", 
      "delivery_address", "delivery_city", "delivery_state", "delivery_zipcode"
    ];
    
    return required.every(field => formData[field as keyof typeof formData].trim() !== "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione produtos ao carrinho antes de finalizar.",
        variant: "destructive"
      });
      return;
    }

    const selectedShippingCost = selectedShipping && calculations[selectedShipping] 
      ? calculations[selectedShipping].valor 
      : 0;

    setLoading(true);

    try {
      const orderData = {
        user_id: user!.id, // Now we know user is authenticated
        ...formData,
        products: items as any,
        total_amount: getTotalPrice() + selectedShippingCost,
        shipping_cost: selectedShippingCost,
        shipping_type: selectedShipping || 'local',
        status: "pending"
      };

      const { data: order, error } = await supabase
        .from("orders")
        .insert(orderData)
        .select('id, public_access_token')
        .single();

      if (error) throw error;

      clearCart();
      navigate(`/order-success/${order.public_access_token}`);
      
      toast({
        title: "Pedido criado com sucesso!",
        description: "Você será redirecionado para as instruções de pagamento."
      });

    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      toast({
        title: "Erro ao processar pedido",
        description: "Tente novamente ou entre em contato conosco.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Verificando autenticação...</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Carrinho Vazio</h2>
            <p className="text-muted-foreground mb-6">
              Adicione produtos ao carrinho antes de finalizar a compra.
            </p>
            <Button onClick={() => navigate("/")}>
              Continuar Comprando
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Finalizar Compra</h1>
      
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle>Dados para Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_name">Nome Completo *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => handleInputChange("customer_name", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customer_email">E-mail *</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => handleInputChange("customer_email", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_cpf">CPF *</Label>
                  <Input
                    id="customer_cpf"
                    value={formData.customer_cpf}
                    onChange={(e) => handleInputChange("customer_cpf", e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customer_phone">Telefone</Label>
                  <Input
                    id="customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => handleInputChange("customer_phone", e.target.value)}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="delivery_zipcode">CEP *</Label>
                  <div className="relative">
                    <Input
                      id="delivery_zipcode"
                      value={formData.delivery_zipcode}
                      onChange={(e) => handleInputChange("delivery_zipcode", e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                      required
                    />
                    {zipCodeLoading && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Digite o CEP para buscar o endereço automaticamente
                  </p>
                </div>
                <div>
                  <Label htmlFor="delivery_city">Cidade *</Label>
                  <Input
                    id="delivery_city"
                    value={formData.delivery_city}
                    onChange={(e) => handleInputChange("delivery_city", e.target.value)}
                    required
                    className={formData.delivery_city ? "bg-muted" : ""}
                    readOnly={!!formData.delivery_city}
                  />
                </div>
                <div>
                  <Label htmlFor="delivery_state">Estado *</Label>
                  <Input
                    id="delivery_state"
                    value={formData.delivery_state}
                    onChange={(e) => handleInputChange("delivery_state", e.target.value)}
                    placeholder="MG"
                    maxLength={2}
                    required
                    className={formData.delivery_state ? "bg-muted" : ""}
                    readOnly={!!formData.delivery_state}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="delivery_address">Endereço completo (com número) *</Label>
                <Input
                  id="delivery_address"
                  value={formData.delivery_address}
                  onChange={(e) => handleInputChange("delivery_address", e.target.value)}
                  placeholder={formData.delivery_address ? 
                    `${formData.delivery_address}, [número]` : 
                    "Rua/Avenida, número"
                  }
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Após preencher o CEP, adicione apenas o número da residência
                </p>
              </div>

              <div>
                <Label htmlFor="delivery_complement">Complemento</Label>
                <Input
                  id="delivery_complement"
                  value={formData.delivery_complement}
                  onChange={(e) => handleInputChange("delivery_complement", e.target.value)}
                  placeholder="Apartamento, bloco, referência..."
                />
              </div>

              {/* Shipping Options */}
              {Object.keys(calculations).length > 0 && (
                <div className="space-y-3">
                  <Label>Opções de Frete</Label>
                  <RadioGroup value={selectedShipping} onValueChange={setSelectedShipping}>
                    {Object.entries(calculations).map(([code, calc]) => (
                      <div key={code} className="flex items-center space-x-2 p-3 border rounded-lg">
                        <RadioGroupItem value={code} id={code} />
                        <div className="flex-1">
                          <label htmlFor={code} className="cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {calc.option.type === 'pickup' ? (
                                  <MapPin className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <Truck className="h-4 w-4 text-green-500" />
                                )}
                                <div>
                                  <p className="font-medium">{calc.option.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {calc.option.description}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {calc.loading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : calc.error ? (
                                  <Badge variant="destructive">Erro</Badge>
                                ) : (
                                  <div>
                                    <p className="font-semibold">
                                      {formatCurrency(calc.valor)}
                                    </p>
                                    {calc.prazo > 0 && (
                                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {calc.prazo} dia{calc.prazo > 1 ? 's' : ''}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !selectedShipping}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Finalizar Pedido"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Resumo do Pedido */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item) => (
                 <div key={item.product.id} className="flex justify-between items-center">
                   <div>
                     <p className="font-medium">{item.product.name}</p>
                     <p className="text-sm text-muted-foreground">
                       Qtd: {item.quantity} x {formatCurrency(item.product.price)}
                     </p>
                   </div>
                   <p className="font-semibold">
                     {formatCurrency(item.product.price * item.quantity)}
                   </p>
                 </div>
              ))}
              
              <Separator />

              {/* Shipping Cost */}
              {selectedShipping && calculations[selectedShipping] && (
                <div className="flex justify-between items-center">
                  <span>Frete ({calculations[selectedShipping].option.name}):</span>
                  <span>{formatCurrency(calculations[selectedShipping].valor)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span className="text-primary">
                  {formatCurrency(getTotalPrice() + (selectedShipping && calculations[selectedShipping] ? calculations[selectedShipping].valor : 0))}
                </span>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Pagamento via PIX</h4>
                <p className="text-sm text-muted-foreground">
                  Após finalizar o pedido, você receberá as instruções para pagamento via PIX.
                  O pagamento deve ser feito para o número: <strong>(33) 99979-9138</strong>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Checkout;