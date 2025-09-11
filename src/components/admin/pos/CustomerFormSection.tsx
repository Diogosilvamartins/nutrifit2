import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerFormSectionProps } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";

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
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const searchCustomerByPhone = async (phone: string) => {
    if (!phone || phone.length < 10) return; // Telefone deve ter pelo menos 10 dígitos
    
    setIsSearching(true);
    try {
      const cleanPhone = phone.replace(/\D/g, ''); // Remove caracteres não numéricos
      
      const { data: customer, error } = await supabase
        .from('customers')
        .select('name, email, cpf, phone')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (error) throw error;

      if (customer) {
        onCustomerChange({
          name: customer.name,
          email: customer.email,
          cpf: customer.cpf,
          phone: customer.phone
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

  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

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