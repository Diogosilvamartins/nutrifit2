import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, Eye, FileText, MessageCircle, Calendar, XCircle, ShoppingCart, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { generatePDF } from "@/lib/pdf-generator";
import { formatCurrency } from "@/lib/utils";
import EditQuoteForm from "./EditQuoteForm";

interface Quote {
  id: string;
  quote_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_cpf?: string;
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
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchQuotes();
  }, [statusFilter]); // Refaz a busca quando o filtro de status mudar

  useEffect(() => {
    filterQuotes();
  }, [searchTerm, statusFilter, typeFilter, quotes]);

  const fetchQuotes = async () => {
    try {
      let query = supabase
        .from('quotes')
        .select('*');
      
      // Se o filtro de status for "canceled", busca apenas cancelados
      // Caso contrário, exclui os cancelados por padrão
      if (statusFilter === 'canceled') {
        query = query.eq('status', 'canceled');
      } else {
        query = query.neq('status', 'canceled');
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Cast the products JSON to proper type
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

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(quote =>
        quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customer_phone?.includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(quote => quote.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(quote => quote.quote_type === typeFilter);
    }

    setFilteredQuotes(filtered);
  };

  const handleCancelQuote = async (quoteId: string) => {
    if (!user) {
      console.log('No user found');
      return;
    }
    
    console.log('Starting cancellation for quote:', quoteId);
    
    // Find the quote to get its type
    const quoteToCancel = quotes.find(q => q.id === quoteId);
    if (!quoteToCancel) {
      console.error('Quote not found:', quoteId);
      toast({
        title: "Erro",
        description: "Orçamento não encontrado.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Calling cancel_sale_and_return_stock RPC with:', {
        sale_id: quoteId,
        sale_type: quoteToCancel.quote_type === 'sale' ? 'sale' : 'quote',
        user_id_param: user.id,
        reason: cancellationReason || null
      });

      const { data, error } = await supabase.rpc('cancel_sale_and_return_stock', {
        sale_id: quoteId,
        sale_type: quoteToCancel.quote_type === 'sale' ? 'sale' : 'quote',
        user_id_param: user.id,
        reason: cancellationReason || null
      });

      console.log('RPC result:', { data, error });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      console.log('Cancellation successful, refreshing quotes...');

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

  const handleConvertToSale = async (quoteId: string, paymentMethod: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get the quote data
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

      // Check stock availability for all products
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

      // Update quote to sale
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          quote_type: 'sale',
          status: 'completed',
          payment_status: 'paid',
          payment_method: paymentMethod
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      // Create stock movements for sale
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
        customer: {
          name: quote.customer_name,
          phone: quote.customer_phone,
          email: quote.customer_email,
          cpf: quote.customer_cpf
        },
        items: quote.products,
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

  const getWhatsAppUrl = (quote: Quote): string | null => {
    if (!quote.customer_phone) {
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

    const message = `Olá ${quote.customer_name}! \n\n${quote.quote_type === "sale" ? "Recibo de Compra" : "Orçamento"} Nº: ${quote.quote_number}\n\n${quote.products.map((item: any) => `• ${item.name} - Qtd: ${item.quantity} - ${formatCurrency(item.total)}`).join('\n')}\n\nSubtotal: ${formatCurrency(quote.subtotal)}\n${quote.discount_amount > 0 ? `Desconto: ${formatCurrency(quote.discount_amount)}` : ''}\nTotal: ${formatCurrency(quote.total_amount)}\n\n${quote.quote_type === "quote" && quote.valid_until ? `Válido até: ${new Date(quote.valid_until).toLocaleDateString('pt-BR')}` : ''}\n\nNutri & Fit Suplementos`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    return whatsappUrl;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Carregando orçamentos...</div>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Filters */}
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
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="quote">Orçamentos</SelectItem>
                  <SelectItem value="sale">Vendas</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="canceled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={fetchQuotes}>
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quotes List */}
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
                        <Dialog>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Visualizar detalhes</p>
                            </TooltipContent>
                          </Tooltip>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>
                                {quote.quote_type === "sale" ? "Venda" : "Orçamento"} {quote.quote_number}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <strong>Cliente:</strong> {quote.customer_name}
                                </div>
                                <div>
                                  <strong>Telefone:</strong> {quote.customer_phone || "-"}
                                </div>
                                <div>
                                  <strong>E-mail:</strong> {quote.customer_email || "-"}
                                </div>
                                <div>
                                  <strong>CPF:</strong> {quote.customer_cpf || "-"}
                                </div>
                                {quote.payment_method && (
                                  <div>
                                    <strong>Método de Pagamento:</strong> {
                                      quote.payment_method === 'dinheiro' ? 'Dinheiro' :
                                      quote.payment_method === 'pix' ? 'PIX' :
                                      quote.payment_method === 'cartao_debito' ? 'Cartão de Débito' :
                                      quote.payment_method === 'cartao_credito' ? 'Cartão de Crédito' :
                                      quote.payment_method
                                    }
                                  </div>
                                )}
                              </div>
                              
                              <div>
                                <strong>Produtos:</strong>
                                <div className="mt-2 space-y-1">
                                  {quote.products.map((item: any, index: number) => (
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
                                   <span>{formatCurrency(quote.subtotal)}</span>
                                 </div>
                                 {quote.shipping_cost && quote.shipping_cost > 0 && (
                                   <div className="flex justify-between">
                                     <span>Taxa de Entrega:</span>
                                     <span>{formatCurrency(quote.shipping_cost)}</span>
                                   </div>
                                 )}
                                {quote.discount_amount > 0 && (
                                  <div className="flex justify-between text-red-600">
                                    <span>Desconto:</span>
                                    <span>- {formatCurrency(quote.discount_amount)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-bold">
                                  <span>Total:</span>
                                  <span>{formatCurrency(quote.total_amount)}</span>
                                </div>
                              </div>
                              
                              {quote.notes && (
                                <div>
                                  <strong>Observações:</strong>
                                  <p className="text-sm text-muted-foreground mt-1">{quote.notes}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        
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
                        
                        {quote.customer_phone && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                disabled={!getWhatsAppUrl(quote)}
                              >
                                <a 
                                  href={getWhatsAppUrl(quote) || "#"} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    if (!getWhatsAppUrl(quote)) {
                                      e.preventDefault();
                                      toast({
                                        title: "Telefone não informado",
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Enviar WhatsApp</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        
                        {quote.quote_type === 'quote' && quote.status === 'pending' && (
                          <Dialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    disabled={isLoading}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <ShoppingCart className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Converter em venda</p>
                              </TooltipContent>
                            </Tooltip>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Converter Orçamento em Venda</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p>Selecione o método de pagamento para converter este orçamento em venda:</p>
                                <Select
                                   onValueChange={async (value) => {
                                     await handleConvertToSale(quote.id, value);
                                     // Close dialog after successful conversion
                                     const closeButton = document.querySelector('[data-radix-dialog-close]') as HTMLButtonElement;
                                     if (closeButton) closeButton.click();
                                   }}
                                 >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o método de pagamento" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                    <SelectItem value="pix">PIX</SelectItem>
                                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </DialogContent>
                          </Dialog>
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
                                      console.log('AlertDialogAction clicked for quote:', quote.id);
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

      {/* Edit Quote Modal */}
      {editingQuote && (
        <Dialog open={!!editingQuote} onOpenChange={() => setEditingQuote(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Editar {editingQuote.quote_type === "sale" ? "Venda" : "Orçamento"} {editingQuote.quote_number}
              </DialogTitle>
            </DialogHeader>
            <EditQuoteForm 
              quote={editingQuote}
              onSave={handleUpdateQuote}
              onCancel={() => setEditingQuote(null)}
              isLoading={isLoading}
            />
          </DialogContent>
        </Dialog>
      )}
    </TooltipProvider>
  );
}