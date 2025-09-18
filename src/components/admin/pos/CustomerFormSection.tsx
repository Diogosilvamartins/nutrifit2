import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerFormSectionProps } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin } from "lucide-react";
import { fetchAddressByCEP } from "@/lib/cep-service";

export const CustomerFormSection = ({
  customerData,
  onCustomerChange,
  salespeople,
  selectedSalesperson,
  onSalespersonChange,
  saleDate,
  onSaleDateChange
}: CustomerFormSectionProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchingCEP, setIsSearchingCEP] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [cepTimeout, setCepTimeout] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const searchCustomerByPhone = async (phone: string) => {
    if (!phone || phone.length < 10) return; // Telefone deve ter pelo menos 10 dígitos
    
    setIsSearching(true);
    try {
      const cleanPhone = phone.replace(/\D/g, ''); // Remove caracteres não numéricos
      
      const { data: customer, error } = await supabase
        .from('customers')
        .select('name, email, cpf, phone, zipcode, street, number, complement, neighborhood, city, state')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (error) throw error;

      if (customer) {
        onCustomerChange({
          name: customer.name,
          email: customer.email,
          cpf: customer.cpf,
          phone: customer.phone,
          zipcode: customer.zipcode,
          street: customer.street,
          number: customer.number,
          complement: customer.complement,
          neighborhood: customer.neighborhood,
          city: customer.city,
          state: customer.state
        });
        
        toast({
          title: "Cliente encontrado!",
          description: `Dados de ${customer.name} foram preenchidos automaticamente.`,
        });
      }
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const searchAddressByCEP = async (cep: string) => {
    if (!cep || cep.replace(/\D/g, '').length !== 8) return;
    
    setIsSearchingCEP(true);
    try {
      const addressData = await fetchAddressByCEP(cep);
      
      if (addressData) {
        onCustomerChange({
          street: addressData.logradouro,
          neighborhood: addressData.bairro,
          city: addressData.localidade,
          state: addressData.uf,
          complement: addressData.complemento || customerData.complement
        });
        
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

  const handlePhoneChange = (phone: string) => {
    onCustomerChange({ phone });
    
    // Limpar timeout anterior se existir
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Criar novo timeout para busca
    const timeout = setTimeout(() => {
      searchCustomerByPhone(phone);
    }, 800); // Aguarda 800ms após parar de digitar
    
    setSearchTimeout(timeout);
  };

  const handleCEPChange = (cep: string) => {
    onCustomerChange({ zipcode: cep });
    
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
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      if (cepTimeout) {
        clearTimeout(cepTimeout);
      }
    };
  }, [searchTimeout, cepTimeout]);

  return (
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
              value={customerData.name}
              onChange={(e) => onCustomerChange({ name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="customer_phone">Telefone</Label>
            <div className="relative">
              <Input
                id="customer_phone"
                value={customerData.phone || ''}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="Digite para buscar cliente existente"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Search className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {customerData.phone && customerData.phone.length >= 10 && (
              <p className="text-xs text-muted-foreground mt-1">
                Digite um telefone para buscar cliente automaticamente
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="customer_email">E-mail</Label>
            <Input
              id="customer_email"
              type="email"
              value={customerData.email || ''}
              onChange={(e) => onCustomerChange({ email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="customer_cpf">CPF</Label>
            <Input
              id="customer_cpf"
              value={customerData.cpf || ''}
              onChange={(e) => onCustomerChange({ cpf: e.target.value })}
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
                  value={customerData.zipcode || ''}
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
                value={customerData.street || ''}
                onChange={(e) => onCustomerChange({ street: e.target.value })}
                placeholder="Rua, Avenida, etc."
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="customer_number">Número</Label>
              <Input
                id="customer_number"
                value={customerData.number || ''}
                onChange={(e) => onCustomerChange({ number: e.target.value })}
                placeholder="123"
              />
            </div>
            
            <div>
              <Label htmlFor="customer_complement">Complemento</Label>
              <Input
                id="customer_complement"
                value={customerData.complement || ''}
                onChange={(e) => onCustomerChange({ complement: e.target.value })}
                placeholder="Apto, Bloco, etc."
              />
            </div>
            
            <div>
              <Label htmlFor="customer_neighborhood">Bairro</Label>
              <Input
                id="customer_neighborhood"
                value={customerData.neighborhood || ''}
                onChange={(e) => onCustomerChange({ neighborhood: e.target.value })}
                placeholder="Centro, Vila..."
              />
            </div>
            
            <div>
              <Label htmlFor="customer_city">Cidade</Label>
              <Input
                id="customer_city"
                value={customerData.city || ''}
                onChange={(e) => onCustomerChange({ city: e.target.value })}
                placeholder="São Paulo"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="customer_state">Estado</Label>
              <Input
                id="customer_state"
                value={customerData.state || ''}
                onChange={(e) => onCustomerChange({ state: e.target.value })}
                placeholder="SP"
                maxLength={2}
              />
            </div>
          </div>
        </div>
        
        {/* Vendedor */}
        <div className="space-y-2">
          <Label htmlFor="salesperson">Vendedor</Label>
          <Select value={selectedSalesperson} onValueChange={onSalespersonChange}>
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
            value={saleDate}
            onChange={(e) => onSaleDateChange(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};