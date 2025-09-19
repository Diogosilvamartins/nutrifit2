import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Using native select to avoid runtime issues with Radix Select
// Removed Radix Dialog import to avoid runtime hook errors

import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { generatePDF } from "@/lib/pdf-generator";
import { printThermalReceipt, printThermalReceiptSystem } from "@/lib/thermal-printer";
import { FileText, MessageCircle, Edit, ShoppingCart, RotateCcw, XCircle, CalendarIcon, Search, Eye, Copy, Printer } from "lucide-react";
import EditQuoteForm from "./EditQuoteForm";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  products: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
  }>;
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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export default function QuotesList() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [convertQuoteId, setConvertQuoteId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchQuotes();
  }, [statusFilter]);

  useEffect(() => {
    filterQuotes();
  }, [searchTerm, statusFilter, typeFilter, quotes]);

  const fetchQuotes = async () => {
    try {
      let query = supabase
        .from('quotes')
        .select('*');
      
      if (statusFilter === 'canceled') {
        query = query.eq('status', 'canceled');
      } else {
        query = query.neq('status', 'canceled');
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const quotesWithTypedProducts = (data || []).map(quote => ({
        ...quote,
        customer_name: quote.customer_name || '',
        customer_phone: quote.customer_phone || undefined,
        customer_email: quote.customer_email || undefined,
        customer_cpf: quote.customer_cpf || undefined,
        valid_until: quote.valid_until || undefined,
        notes: quote.notes || undefined,
        payment_method: quote.payment_method || undefined,
        payment_status: quote.payment_status || undefined,
        shipping_cost: quote.shipping_cost || 0,
        products: Array.isArray(quote.products) ? quote.products as Array<{
          id: string;
          name: string;
          price: number;
          quantity: number;
          total: number;
        }> : []
      })) as Quote[];
      
      setQuotes(quotesWithTypedProducts);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      toast({
        title: "Erro ao carregar orçamentos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterQuotes = () => {
    let filtered = quotes;

    if (searchTerm) {
      filtered = filtered.filter(quote =>
        quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customer_phone?.includes(searchTerm)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(quote => quote.status === statusFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(quote => quote.quote_type === typeFilter);
    }

    setFilteredQuotes(filtered);
  };

  const handleCancelQuote = async (quoteId: string) => {
    if (!user) return;
    
    const quoteToCancel = quotes.find(q => q.id === quoteId);
    if (!quoteToCancel) {
      toast({
        title: "Erro",
        description: "Orçamento não encontrado.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('cancel_sale_and_return_stock', {
        sale_id: quoteId,
        sale_type: quoteToCancel.quote_type === 'sale' ? 'sale' : 'quote',
        user_id_param: user.id,
        reason: cancellationReason || null
      });

      if (error) throw error;

      toast({
        title: `${quoteToCancel.quote_type === 'sale' ? 'Venda' : 'Orçamento'} cancelado`,
        description: `O ${quoteToCancel.quote_type === 'sale' ? 'venda' : 'orçamento'} foi cancelado e os produtos retornaram ao estoque.`,
      });

      await fetchQuotes();
      setCancellationReason("");
    } catch (error) {
      console.error('Error canceling quote:', error);
      toast({
        title: "Erro",
        description: `Erro ao cancelar o ${quoteToCancel.quote_type === 'sale' ? 'venda' : 'orçamento'}. Tente novamente.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertToSale = async (quoteId: string, paymentMethod: string, saleDate: Date) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data: quoteData, error: fetchError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (fetchError) throw fetchError;

      if (quoteData.quote_type === 'sale') {
        toast({
          title: "Erro",
          description: "Este orçamento já foi convertido em venda.",
          variant: "destructive",
        });
        return;
      }

      const products = Array.isArray(quoteData.products) ? quoteData.products as Array<{
        id: string;
        name: string;
        price: number;
        quantity: number;
        total: number;
      }> : [];

      for (const product of products) {
        const { data: stockCheck } = await supabase.rpc('check_available_stock', {
          product_uuid: product.id,
          required_quantity: product.quantity
        });

        if (!stockCheck) {
          toast({
            title: "Estoque insuficiente",
            description: `Produto ${product.name} não tem estoque suficiente.`,
            variant: "destructive",
          });
          return;
        }
      }

      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          quote_type: 'sale',
          status: 'completed',
          payment_status: 'paid',
          payment_method: paymentMethod,
          sale_date: format(saleDate, 'yyyy-MM-dd')
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      for (const product of products) {
        await supabase
          .from('stock_movements')
          .insert({
            product_id: product.id,
            movement_type: 'saida',
            quantity: product.quantity,
            reference_type: 'venda',
            reference_id: quoteId,
            notes: `Venda ${quoteData.quote_number} (convertido de orçamento)`,
            user_id: user.id
          });
      }

      toast({
        title: "Venda efetivada!",
        description: `Orçamento ${quoteData.quote_number} foi convertido em venda com sucesso.`,
      });

      fetchQuotes();
    } catch (error) {
      console.error('Error converting quote to sale:', error);
      toast({
        title: "Erro",
        description: "Erro ao converter orçamento em venda. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateQuote = async (updatedQuote: Partial<Quote>) => {
    if (!editingQuote) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('quotes')
        .update({
          customer_name: updatedQuote.customer_name,
          customer_phone: updatedQuote.customer_phone,
          customer_email: updatedQuote.customer_email,
          customer_cpf: updatedQuote.customer_cpf,
          discount_amount: updatedQuote.discount_amount || 0,
          subtotal: updatedQuote.subtotal,
          total_amount: updatedQuote.total_amount,
          products: updatedQuote.products,
          notes: updatedQuote.notes,
          valid_until: updatedQuote.valid_until,
          payment_method: updatedQuote.payment_method,
          sale_date: updatedQuote.sale_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingQuote.id);

      if (error) throw error;

      toast({
        title: "Orçamento atualizado!",
        description: `${editingQuote.quote_type === 'sale' ? 'Venda' : 'Orçamento'} ${editingQuote.quote_number} foi atualizado com sucesso.`,
      });

      setEditingQuote(null);
      fetchQuotes();
    } catch (error) {
      console.error('Error updating quote:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar orçamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", variant: "secondary" as const },
      approved: { label: "Aprovado", variant: "default" as const },
      canceled: { label: "Cancelado", variant: "destructive" as const },
      rejected: { label: "Rejeitado", variant: "destructive" as const },
      converted: { label: "Convertido", variant: "default" as const },
      completed: { label: "Concluído", variant: "default" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    return (
      <Badge variant={type === "sale" ? "default" : "outline"}>
        {type === "sale" ? "Venda" : "Orçamento"}
      </Badge>
    );
  };

  const generateQuotePDF = async (quote: Quote) => {
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
        items: quote.products,
        subtotal: quote.subtotal,
        discount: quote.discount_amount,
        total: quote.total_amount,
        validUntil: quote.valid_until,
        notes: quote.notes
      });

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

  const getWhatsAppUrl = (quote: Quote): string | null => {
    if (!quote.customer_phone) return null;

    const cleanPhone = quote.customer_phone.replace(/\D/g, "");
    let phone = cleanPhone;
    
    if (!phone.startsWith('55') && phone.length >= 10) {
      phone = `55${phone}`;
    }
    
    if (phone.length < 12) return null;

    const message = `Olá ${quote.customer_name}! \n\n${quote.quote_type === "sale" ? "Recibo de Compra" : "Orçamento"} Nº: ${quote.quote_number}\n\n${quote.products.map((item: any) => `• ${item.name} - Qtd: ${item.quantity} - ${formatCurrency(item.total)}`).join('\n')}\n\nSubtotal: ${formatCurrency(quote.subtotal)}\n${quote.discount_amount > 0 ? `Desconto: ${formatCurrency(quote.discount_amount)}` : ''}\nTotal: ${formatCurrency(quote.total_amount)}\n\n${quote.quote_type === "quote" && quote.valid_until ? `Válido até: ${new Date(quote.valid_until).toLocaleDateString('pt-BR')}` : ''}\n\nNutri & Fit Suplementos\nAv. Rio Doce, 1075 - Ilha dos Araújos`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodedMessage}`;
    return whatsappUrl;
  };

  const getWhatsAppFallbackUrl = (quote: Quote): string | null => {
    if (!quote.customer_phone) return null;

    const cleanPhone = quote.customer_phone.replace(/\D/g, "");
    let phone = cleanPhone;
    
    if (!phone.startsWith('55') && phone.length >= 10) {
      phone = `55${phone}`;
    }
    
    if (phone.length < 12) return null;

    const message = `Olá ${quote.customer_name}! \n\n${quote.quote_type === "sale" ? "Recibo de Compra" : "Orçamento"} Nº: ${quote.quote_number}\n\n${quote.products.map((item: any) => `• ${item.name} - Qtd: ${item.quantity} - ${formatCurrency(item.total)}`).join('\n')}\n\nSubtotal: ${formatCurrency(quote.subtotal)}\n${quote.discount_amount > 0 ? `Desconto: ${formatCurrency(quote.discount_amount)}` : ''}\nTotal: ${formatCurrency(quote.total_amount)}\n\n${quote.quote_type === "quote" && quote.valid_until ? `Válido até: ${new Date(quote.valid_until).toLocaleDateString('pt-BR')}` : ''}\n\nNutri & Fit Suplementos\nAv. Rio Doce, 1075 - Ilha dos Araújos`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
    return whatsappUrl;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Carregando orçamentos...</div>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Orçamentos e Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por número ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div>
                <label className="sr-only" htmlFor="filter-type">Tipo</label>
                <select
                  id="filter-type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  aria-label="Filtrar por tipo"
                >
                  <option value="all">Todos</option>
                  <option value="quote">Orçamentos</option>
                  <option value="sale">Vendas</option>
                </select>
              </div>
              
              <div>
                <label className="sr-only" htmlFor="filter-status">Status</label>
                <select
                  id="filter-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  aria-label="Filtrar por status"
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendente</option>
                  <option value="approved">Aprovado</option>
                  <option value="completed">Concluído</option>
                  <option value="canceled">Cancelados</option>
                </select>
              </div>
              
              <Button onClick={fetchQuotes}>
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {filteredQuotes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {searchTerm || statusFilter !== "all" || typeFilter !== "all" 
                ? "Nenhum registro encontrado com os filtros aplicados." 
                : "Nenhum orçamento ou venda cadastrado ainda."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredQuotes.map((quote) => (
              <Card key={quote.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{quote.quote_number}</h3>
                        {getTypeBadge(quote.quote_type)}
                        {getStatusBadge(quote.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Cliente:</span>
                          <p className="font-medium">{quote.customer_name}</p>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <p className="font-bold text-primary">
                            {formatCurrency(quote.total_amount)}
                          </p>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground">Data:</span>
                          <p>{new Date(quote.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        
                        {quote.valid_until && (
                          <div>
                            <span className="text-muted-foreground">Válido até:</span>
                            <p>{new Date(quote.valid_until).toLocaleDateString('pt-BR')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                     <div className="flex gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPreviewQuote(quote)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Visualizar detalhes</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateQuotePDF(quote)}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Gerar PDF</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                console.log('Botão de impressão clicado');
                                try {
                                   const printData = {
                                     type: quote.quote_type,
                                     number: quote.quote_number,
                                     saleDate: quote.sale_date,
                                     quoteDate: quote.created_at,
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
                                    items: quote.products,
                                    subtotal: quote.subtotal,
                                    discount: quote.discount_amount,
                                    total: quote.total_amount,
                                    paymentMethod: quote.payment_method,
                                    validUntil: quote.valid_until,
                                    notes: quote.notes
                                  };
                                  
                                  console.log('Dados para impressão:', printData);
                                  printThermalReceiptSystem(printData);
                                  
                                  toast({
                                    title: "Impressão iniciada",
                                    description: "Aguarde a janela de impressão abrir..."
                                  });
                                } catch (error) {
                                  console.error('Erro na impressão:', error);
                                  toast({
                                    title: "Erro na impressão",
                                    description: error.message || "Verifique se o navegador permite pop-ups.",
                                    variant: "destructive"
                                  });
                                }
                              }}
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Imprimir</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        {quote.customer_phone && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!getWhatsAppUrl(quote)}
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const appUrl = getWhatsAppUrl(quote);
                                      if (appUrl) {
                                        try {
                                          window.location.href = appUrl;
                                          setTimeout(() => {
                                            toast({
                                              title: "WhatsApp aberto",
                                              description: "Se não abriu automaticamente, use WhatsApp Web."
                                            });
                                          }, 1000);
                                        } catch (error) {
                                          toast({
                                            title: "Erro ao abrir WhatsApp",
                                            description: "Tente copiar a mensagem manualmente.",
                                            variant: "destructive"
                                          });
                                        }
                                      }
                                    }}
                                  >
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    Abrir WhatsApp App
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const fallbackUrl = getWhatsAppFallbackUrl(quote);
                                      if (fallbackUrl) {
                                        try {
                                          const newWindow = window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
                                          if (!newWindow) {
                                            toast({
                                              title: "Popup bloqueado",
                                              description: "Permita popups para este site ou copie a mensagem.",
                                              variant: "destructive"
                                            });
                                          }
                                        } catch (error) {
                                          toast({
                                            title: "WhatsApp Web bloqueado",
                                            description: "Seu navegador/rede está bloqueando. Use a opção de copiar mensagem.",
                                            variant: "destructive"
                                          });
                                        }
                                      }
                                    }}
                                  >
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    Abrir WhatsApp Web
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const message = `Olá ${quote.customer_name}! \n\n${quote.quote_type === "sale" ? "Recibo de Compra" : "Orçamento"} Nº: ${quote.quote_number}\n\n${quote.products.map((item: any) => `• ${item.name} - Qtd: ${item.quantity} - ${formatCurrency(item.total)}`).join('\n')}\n\nSubtotal: ${formatCurrency(quote.subtotal)}\n${quote.discount_amount > 0 ? `Desconto: ${formatCurrency(quote.discount_amount)}` : ''}\nTotal: ${formatCurrency(quote.total_amount)}\n\n${quote.quote_type === "quote" && quote.valid_until ? `Válido até: ${new Date(quote.valid_until).toLocaleDateString('pt-BR')}` : ''}\n\nNutri & Fit Suplementos\nAv. Rio Doce, 1075 - Ilha dos Araújos`;
                                      
                                      navigator.clipboard.writeText(message).then(() => {
                                        toast({
                                          title: "Mensagem copiada!",
                                          description: `Telefone: ${quote.customer_phone}. Cole a mensagem no WhatsApp.`
                                        });
                                      }).catch(() => {
                                        toast({
                                          title: "Erro ao copiar",
                                          description: "Selecione e copie a mensagem manualmente.",
                                          variant: "destructive"
                                        });
                                      });
                                    }}
                                  >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copiar Mensagem
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Enviar WhatsApp</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        
                        {quote.quote_type === 'quote' && quote.status === 'pending' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                disabled={isLoading}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => setConvertQuoteId(quote.id)}
                              >
                                <ShoppingCart className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Converter em venda</p>
                            </TooltipContent>
                          </Tooltip>
                         )}
                          
                          {quote.status !== 'canceled' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingQuote(quote)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Editar {quote.quote_type === 'sale' ? 'venda' : 'orçamento'}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        
                          {quote.status !== 'canceled' && (
                           <AlertDialog>
                             <Tooltip>
                               <AlertDialogTrigger asChild>
                                 <TooltipTrigger asChild>
                                   <Button 
                                     variant="outline" 
                                     size="sm" 
                                     className="text-destructive h-8 w-8 p-0"
                                   >
                                     <XCircle className="h-4 w-4" />
                                   </Button>
                                 </TooltipTrigger>
                               </AlertDialogTrigger>
                               <TooltipContent>
                                 <p>Cancelar</p>
                               </TooltipContent>
                             </Tooltip>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>Cancelar {quote.quote_type === 'sale' ? 'Venda' : 'Orçamento'}</AlertDialogTitle>
                                 <AlertDialogDescription>
                                   Tem certeza que deseja cancelar este {quote.quote_type === 'sale' ? 'venda' : 'orçamento'}? Os produtos serão devolvidos ao estoque automaticamente.
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <div className="my-4">
                                 <label htmlFor="reason" className="text-sm font-medium">
                                   Motivo do cancelamento (opcional):
                                 </label>
                                 <Textarea
                                   id="reason"
                                   value={cancellationReason}
                                   onChange={(e) => setCancellationReason(e.target.value)}
                                   placeholder="Digite o motivo do cancelamento..."
                                   className="mt-2"
                                 />
                               </div>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Voltar</AlertDialogCancel>
                                 <AlertDialogAction 
                                    onClick={(e) => {
                                      handleCancelQuote(quote.id);
                                    }} 
                                    disabled={isLoading}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                   {isLoading ? "Cancelando..." : "Confirmar Cancelamento"}
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                          )}
                      </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {previewQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setPreviewQuote(null)}>
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">
                {previewQuote.quote_type === "sale" ? "Venda" : "Orçamento"} {previewQuote.quote_number}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setPreviewQuote(null)}>
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Cliente:</strong> {previewQuote.customer_name}
                </div>
                <div>
                  <strong>Telefone:</strong> {previewQuote.customer_phone || "-"}
                </div>
                <div>
                  <strong>E-mail:</strong> {previewQuote.customer_email || "-"}
                </div>
                <div>
                  <strong>CPF:</strong> {previewQuote.customer_cpf || "-"}
                </div>
                {previewQuote.payment_method && (
                  <div>
                    <strong>Método de Pagamento:</strong> {
                      previewQuote.payment_method === 'dinheiro' ? 'Dinheiro' :
                      previewQuote.payment_method === 'pix' ? 'PIX' :
                      previewQuote.payment_method === 'cartao_debito' ? 'Cartão de Débito' :
                      previewQuote.payment_method === 'cartao_credito' ? 'Cartão de Crédito' :
                      previewQuote.payment_method
                    }
                  </div>
                )}
              </div>
              
              <div>
                <strong>Produtos:</strong>
                <div className="mt-2 space-y-1">
                  {previewQuote.products.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.name} x {item.quantity}</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(previewQuote.subtotal)}</span>
                </div>
                {previewQuote.shipping_cost && previewQuote.shipping_cost > 0 && (
                  <div className="flex justify-between">
                    <span>Taxa de Entrega:</span>
                    <span>{formatCurrency(previewQuote.shipping_cost)}</span>
                  </div>
                )}
                {previewQuote.discount_amount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Desconto:</span>
                    <span>- {formatCurrency(previewQuote.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(previewQuote.total_amount)}</span>
                </div>
              </div>
              
              {previewQuote.notes && (
                <div>
                  <strong>Observações:</strong>
                  <p className="text-sm text-muted-foreground mt-1">{previewQuote.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {convertQuoteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setConvertQuoteId(null)}>
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Converter Orçamento em Venda</h2>
              <Button variant="ghost" size="sm" onClick={() => setConvertQuoteId(null)}>
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data da venda:</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !saleDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {saleDate ? format(saleDate, "dd/MM/yyyy") : <span>Selecionar data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={saleDate}
                      onSelect={(date) => date && setSaleDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Método de pagamento:</label>
                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  aria-label="Método de pagamento"
                >
                  <option value="" disabled>Selecione o método de pagamento</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">PIX</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                </select>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedPaymentMethod("");
                    setSaleDate(new Date());
                    setConvertQuoteId(null);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedPaymentMethod) {
                      toast({
                        title: "Erro",
                        description: "Selecione um método de pagamento",
                        variant: "destructive"
                      });
                      return;
                    }
                    await handleConvertToSale(convertQuoteId!, selectedPaymentMethod, saleDate);
                    setSelectedPaymentMethod("");
                    setSaleDate(new Date());
                    setConvertQuoteId(null);
                  }}
                  disabled={isLoading || !selectedPaymentMethod}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? "Convertendo..." : "Converter em Venda"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setEditingQuote(null)}>
          <div className="bg-background rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-lg font-bold">
                Editar {editingQuote.quote_type === "sale" ? "Venda" : "Orçamento"} {editingQuote.quote_number}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setEditingQuote(null)}>
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-1">
              <EditQuoteForm 
                quote={editingQuote}
                onSave={handleUpdateQuote}
                onCancel={() => setEditingQuote(null)}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
