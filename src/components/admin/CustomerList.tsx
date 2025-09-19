import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF, formatPhone } from "@/lib/validators";
import { Search, Users, Edit, Eye, Phone, Mail, MapPin, UserPlus, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import QuickCustomerForm from "./QuickCustomerForm";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  city?: string;
  state?: string;
  lead_status: string;
  lead_source?: string;
  created_at: string;
  last_contact?: string;
}

interface CustomerListProps {
  onEdit: (customer: Customer) => void;
  refreshTrigger: number;
}

export default function CustomerList({ onEdit, refreshTrigger }: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showQuickForm, setShowQuickForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, [refreshTrigger]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Use secure RPC function instead of direct table access
      const { data, error } = await supabase
        .rpc('get_customers_rpc');

      if (error) throw error;

      // Parse the JSON response from the RPC function and convert to Customer array
      const customersData = (data as any[]) || [];
      setCustomers(customersData as Customer[]);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Erro ao carregar clientes",
        description: "Você pode não ter permissão para visualizar clientes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCustomer = async (customerId: string, customerName: string) => {
    try {
      // Primeiro, verificar se o cliente tem orçamentos ou pedidos relacionados
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('id')
        .eq('customer_id', customerId);

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', customerId);

      if (quotesError || ordersError) {
        throw new Error('Erro ao verificar dependências do cliente');
      }

      const hasQuotes = quotes && quotes.length > 0;
      const hasOrders = orders && orders.length > 0;

      if (hasQuotes || hasOrders) {
        // Se tem dependências, oferecer opção de mesclar com outro cliente
        const duplicateCustomers = customers.filter(c => 
          c.name.toLowerCase() === customerName.toLowerCase() && c.id !== customerId
        );
        
        if (duplicateCustomers.length > 0) {
          toast({
            title: "Cliente possui dados relacionados",
            description: `${customerName} possui ${hasQuotes ? 'orçamentos' : ''} ${hasQuotes && hasOrders ? 'e' : ''} ${hasOrders ? 'pedidos' : ''} relacionados. Use a opção "Mesclar" se for um duplicado.`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Não é possível excluir",
            description: `${customerName} possui ${hasQuotes ? 'orçamentos' : ''} ${hasQuotes && hasOrders ? 'e' : ''} ${hasOrders ? 'pedidos' : ''} relacionados. Remova-os primeiro.`,
            variant: "destructive"
          });
        }
        return;
      }

      // Se não tem dependências, pode excluir
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;

      toast({
        title: "Cliente excluído",
        description: `${customerName} foi removido com sucesso.`
      });

      fetchCustomers();
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      toast({
        title: "Erro ao excluir cliente",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    }
  };

  const mergeCustomers = async (primaryId: string, duplicateId: string, customerName: string) => {
    try {
      // Transferir todos os orçamentos do duplicado para o principal
      const { error: quotesError } = await supabase
        .from('quotes')
        .update({ customer_id: primaryId })
        .eq('customer_id', duplicateId);

      // Transferir todos os pedidos do duplicado para o principal  
      const { error: ordersError } = await supabase
        .from('orders')
        .update({ customer_id: primaryId })
        .eq('customer_id', duplicateId);

      if (quotesError || ordersError) {
        throw new Error('Erro ao transferir dados relacionados');
      }

      // Agora pode excluir o cliente duplicado
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', duplicateId);

      if (error) throw error;

      toast({
        title: "Cliente duplicado removido",
        description: `${customerName} duplicado foi mesclado com sucesso.`
      });

      fetchCustomers();
    } catch (error: any) {
      console.error("Error merging customers:", error);
      toast({
        title: "Erro ao mesclar cliente",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
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

  const getSourceLabel = (source?: string) => {
    const sources = {
      manual: "Manual",
      website: "Site",
      social_media: "Redes Sociais",
      referral: "Indicação",
      advertising: "Publicidade",
      walk_in: "Visita à loja",
      phone: "Telefone",
      other: "Outro"
    };
    
    return sources[source as keyof typeof sources] || source || "Não informado";
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone?.includes(searchTerm) ||
                         customer.cpf?.includes(searchTerm.replace(/\D/g, ''));
    
    const matchesStatus = statusFilter === 'all' || customer.lead_status === statusFilter;
    const matchesSource = sourceFilter === 'all' || customer.lead_source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  });

  // Detectar clientes duplicados
  const duplicateGroups = customers.reduce((groups, customer) => {
    const key = customer.name.toLowerCase().trim();
    if (!groups[key]) groups[key] = [];
    groups[key].push(customer);
    return groups;
  }, {} as Record<string, Customer[]>);

  const hasDuplicates = Object.values(duplicateGroups).some(group => group.length > 1);

  if (loading) {
    return <div className="flex items-center justify-center py-8">Carregando clientes...</div>;
  }

  return (
    <div className="space-y-4">
      {showQuickForm && (
        <QuickCustomerForm 
          onSuccess={() => {
            setShowQuickForm(false);
            fetchCustomers();
          }}
          onCancel={() => setShowQuickForm(false)}
        />
      )}
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Clientes ({filteredCustomers.length})
              {hasDuplicates && (
                <Badge variant="destructive" className="text-xs">
                  Duplicados encontrados
                </Badge>
              )}
            </CardTitle>
            <Button 
              onClick={() => setShowQuickForm(true)}
              size="sm"
              className="flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Cadastro Rápido
            </Button>
          </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nome, email, telefone ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="new">Novo</SelectItem>
              <SelectItem value="contacted">Contactado</SelectItem>
              <SelectItem value="qualified">Qualificado</SelectItem>
              <SelectItem value="converted">Convertido</SelectItem>
              <SelectItem value="lost">Perdido</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Origens</SelectItem>
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
      </CardHeader>
      
      <CardContent>
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || statusFilter !== 'all' || sourceFilter !== 'all' 
              ? 'Nenhum cliente encontrado com os filtros aplicados.'
              : 'Nenhum cliente cadastrado ainda.'
            }
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                     <div className="flex items-center gap-4 mb-2">
                       <h3 className="font-medium">{customer.name}</h3>
                       {getLeadStatusBadge(customer.lead_status)}
                       <Badge variant="outline">{getSourceLabel(customer.lead_source)}</Badge>
                       {duplicateGroups[customer.name.toLowerCase().trim()]?.length > 1 && (
                         <Badge variant="destructive" className="text-xs">
                           Duplicado
                         </Badge>
                       )}
                     </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {customer.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {formatPhone(customer.phone)}
                        </div>
                      )}
                      {customer.cpf && (
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {formatCPF(customer.cpf)}
                        </div>
                      )}
                      {(customer.city || customer.state) && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {[customer.city, customer.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                      <span>Cadastrado: {new Date(customer.created_at).toLocaleDateString('pt-BR')}</span>
                      {customer.last_contact && (
                        <span>Último contato: {new Date(customer.last_contact).toLocaleDateString('pt-BR')}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(customer)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o cliente <strong>{customer.name}</strong>? 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCustomer(customer.id, customer.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                     </AlertDialog>
                     
                     {/* Botão de mesclar se for duplicado */}
                     {duplicateGroups[customer.name.toLowerCase().trim()]?.length > 1 && (
                       <AlertDialog>
                         <AlertDialogTrigger asChild>
                           <Button
                             variant="outline"
                             size="sm"
                             className="text-orange-600 hover:text-orange-600"
                           >
                             Mesclar
                           </Button>
                         </AlertDialogTrigger>
                         <AlertDialogContent>
                           <AlertDialogHeader>
                             <AlertDialogTitle>Mesclar Cliente Duplicado</AlertDialogTitle>
                             <AlertDialogDescription>
                               Deseja mesclar este <strong>{customer.name}</strong> com outro registro do mesmo nome? 
                               Todos os orçamentos e pedidos serão transferidos para o registro principal.
                             </AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                             <AlertDialogCancel>Cancelar</AlertDialogCancel>
                             <AlertDialogAction
                               onClick={() => {
                                 const duplicates = duplicateGroups[customer.name.toLowerCase().trim()];
                                 const primary = duplicates.find(c => c.id !== customer.id);
                                 if (primary) {
                                   mergeCustomers(primary.id, customer.id, customer.name);
                                 }
                               }}
                               className="bg-orange-600 text-white hover:bg-orange-700"
                             >
                               Mesclar
                             </AlertDialogAction>
                           </AlertDialogFooter>
                         </AlertDialogContent>
                       </AlertDialog>
                     )}
                   </div>
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