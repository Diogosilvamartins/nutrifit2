import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateCPF, formatCPF, formatPhone, formatCEP, validateCEP } from "@/lib/validators";
import { fetchAddressByCEP } from "@/lib/cep-service";
import { Search, User, MapPin, Phone, Mail, FileText } from "lucide-react";

interface Customer {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  gender?: string;
  zipcode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  lead_source?: string;
  lead_status?: string;
  notes?: string;
}

interface CustomerFormProps {
  customer?: Customer;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CustomerForm({ customer, onSuccess, onCancel }: CustomerFormProps) {
  const [formData, setFormData] = useState<Customer>({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    cpf: customer?.cpf || '',
    birth_date: customer?.birth_date || '',
    gender: customer?.gender || '',
    zipcode: customer?.zipcode || '',
    street: customer?.street || '',
    number: customer?.number || '',
    complement: customer?.complement || '',
    neighborhood: customer?.neighborhood || '',
    city: customer?.city || '',
    state: customer?.state || '',
    lead_source: customer?.lead_source || 'manual',
    lead_status: customer?.lead_status || 'new',
    notes: customer?.notes || '',
  });
  
  const [loading, setLoading] = useState(false);
  const [searchingCEP, setSearchingCEP] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const { toast } = useToast();

  const handleInputChange = (field: keyof Customer, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear CPF error when user types
    if (field === 'cpf') {
      setCpfError('');
    }
  };

  const handleCPFBlur = () => {
    if (formData.cpf && !validateCPF(formData.cpf)) {
      setCpfError('CPF inválido');
    } else {
      setCpfError('');
      if (formData.cpf) {
        setFormData(prev => ({ ...prev, cpf: formatCPF(prev.cpf || '') }));
      }
    }
  };

  const handlePhoneBlur = () => {
    if (formData.phone) {
      setFormData(prev => ({ ...prev, phone: formatPhone(prev.phone || '') }));
    }
  };

  const handleCEPSearch = async () => {
    if (!formData.zipcode || !validateCEP(formData.zipcode)) {
      toast({
        title: "CEP inválido",
        description: "Por favor, insira um CEP válido com 8 dígitos.",
        variant: "destructive"
      });
      return;
    }

    setSearchingCEP(true);
    try {
      const addressData = await fetchAddressByCEP(formData.zipcode);
      
      if (addressData) {
        setFormData(prev => ({
          ...prev,
          zipcode: formatCEP(addressData.cep),
          street: addressData.logradouro,
          neighborhood: addressData.bairro,
          city: addressData.localidade,
          state: addressData.uf,
        }));
        
        toast({
          title: "Endereço encontrado!",
          description: "Dados do endereço preenchidos automaticamente."
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP e tente novamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    } finally {
      setSearchingCEP(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, preencha o nome do cliente.",
        variant: "destructive"
      });
      return;
    }

    if (formData.cpf && !validateCPF(formData.cpf)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, insira um CPF válido.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const customerData = {
        ...formData,
        cpf: formData.cpf ? formData.cpf.replace(/\D/g, '') : null,
        phone: formData.phone ? formData.phone.replace(/\D/g, '') : null,
        zipcode: formData.zipcode ? formData.zipcode.replace(/\D/g, '') : null,
        birth_date: formData.birth_date || null,
      };

      if (customer?.id) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', customer.id);

        if (error) throw error;

        toast({
          title: "Cliente atualizado!",
          description: "Dados do cliente foram atualizados com sucesso."
        });
      } else {
        // Create new customer
        const { error } = await supabase
          .from('customers')
          .insert(customerData);

        if (error) throw error;

        toast({
          title: "Cliente cadastrado!",
          description: "Novo cliente foi adicionado com sucesso."
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving customer:", error);
      toast({
        title: "Erro ao salvar cliente",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getLeadStatusBadge = (status: string) => {
    const statusConfig = {
      new: { label: "Novo", variant: "default" as const },
      contacted: { label: "Contactado", variant: "secondary" as const },
      qualified: { label: "Qualificado", variant: "default" as const },
      converted: { label: "Convertido", variant: "default" as const },
      lost: { label: "Perdido", variant: "destructive" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: "secondary" as const };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          {customer ? 'Editar Cliente' : 'Novo Cliente'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Dados Pessoais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Nome completo do cliente"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => handleInputChange('cpf', e.target.value)}
                  onBlur={handleCPFBlur}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                {cpfError && <p className="text-sm text-red-600 mt-1">{cpfError}</p>}
              </div>
              
              <div>
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => handleInputChange('birth_date', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="gender">Gênero</Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                    <SelectItem value="nao_informar">Prefiro não informar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contato
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  onBlur={handlePhoneBlur}
                  placeholder="(00) 00000-0000"
                />
              </div>
              
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="cliente@email.com"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Endereço
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="zipcode">CEP</Label>
                  <Input
                    id="zipcode"
                    value={formData.zipcode}
                    onChange={(e) => handleInputChange('zipcode', e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCEPSearch}
                    disabled={searchingCEP}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="street">Logradouro</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  placeholder="Rua, Avenida, etc."
                />
              </div>
              
              <div>
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  value={formData.number}
                  onChange={(e) => handleInputChange('number', e.target.value)}
                  placeholder="123"
                />
              </div>
              
              <div>
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={formData.complement}
                  onChange={(e) => handleInputChange('complement', e.target.value)}
                  placeholder="Apto, Casa, etc."
                />
              </div>
              
              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                  placeholder="Bairro"
                />
              </div>
              
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Cidade"
                />
              </div>
              
              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          {/* Lead Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Informações de Lead
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lead_source">Origem do Lead</Label>
                <Select value={formData.lead_source} onValueChange={(value) => handleInputChange('lead_source', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="website">Site</SelectItem>
                    <SelectItem value="social_media">Redes Sociais</SelectItem>
                    <SelectItem value="referral">Indicação</SelectItem>
                    <SelectItem value="advertising">Publicidade</SelectItem>
                    <SelectItem value="walk_in">Visita à loja</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="lead_status">Status do Lead</Label>
                <Select value={formData.lead_status} onValueChange={(value) => handleInputChange('lead_status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Novo</SelectItem>
                    <SelectItem value="contacted">Contactado</SelectItem>
                    <SelectItem value="qualified">Qualificado</SelectItem>
                    <SelectItem value="converted">Convertido</SelectItem>
                    <SelectItem value="lost">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Observações sobre o cliente..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : customer ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
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