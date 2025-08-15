import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { XCircle, Package, User, MapPin, Phone, Mail, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface OrderDetailsProps {
  order: any;
  onOrderUpdate: () => void;
}

const OrderDetails = ({ order, onOrderUpdate }: OrderDetailsProps) => {
  const [cancellationReason, setCancellationReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleCancelOrder = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('cancel_sale_and_return_stock', {
        sale_id: order.id,
        sale_type: 'order',
        user_id_param: user.id,
        reason: cancellationReason || null
      });

      if (error) throw error;

      toast({
        title: "Pedido cancelado",
        description: "O pedido foi cancelado e os produtos retornaram ao estoque.",
      });

      onOrderUpdate();
      setCancellationReason("");
    } catch (error) {
      console.error('Error canceling order:', error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar o pedido. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Pendente", variant: "secondary" as const },
      processing: { label: "Processando", variant: "default" as const },
      shipped: { label: "Enviado", variant: "default" as const },
      delivered: { label: "Entregue", variant: "default" as const },
      canceled: { label: "Cancelado", variant: "destructive" as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getShippingTypeBadge = (type: string) => {
    const typeMap = {
      local: { label: "Entrega Local", variant: "default" as const },
      correios: { label: "Correios", variant: "secondary" as const },
      pickup: { label: "Retirada", variant: "outline" as const }
    };
    
    const typeInfo = typeMap[type as keyof typeof typeMap] || { label: type, variant: "secondary" as const };
    return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pedido #{order.id?.slice(0, 8)}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge(order.status)}
            {order.status !== 'canceled' && order.status !== 'delivered' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive">
                    <XCircle className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar Pedido</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja cancelar este pedido? Os produtos serão devolvidos ao estoque automaticamente.
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
                      onClick={handleCancelOrder} 
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
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Dados do Cliente
              </h4>
              <div className="text-sm space-y-1">
                <p><strong>Nome:</strong> {order.customer_name}</p>
                {order.customer_phone && (
                  <p className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {order.customer_phone}
                  </p>
                )}
                {order.customer_email && (
                  <p className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {order.customer_email}
                  </p>
                )}
                {order.customer_cpf && (
                  <p><strong>CPF:</strong> {order.customer_cpf}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Entrega
              </h4>
              <div className="text-sm space-y-1">
                <div>{getShippingTypeBadge(order.shipping_type || 'local')}</div>
                {order.shipping_cost && (
                  <p><strong>Taxa:</strong> {formatCurrency(Number(order.shipping_cost))}</p>
                )}
                <p><strong>Endereço:</strong> {order.delivery_address}</p>
                <p>{order.delivery_city} - {order.delivery_state}</p>
                <p><strong>CEP:</strong> {order.delivery_zipcode}</p>
                {order.delivery_complement && (
                  <p><strong>Complemento:</strong> {order.delivery_complement}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Pagamento
            </h4>
            <div className="text-sm">
              <p><strong>Método:</strong> {order.payment_method === 'pix' ? 'PIX' : order.payment_method}</p>
              {order.pix_phone && (
                <p><strong>PIX:</strong> {order.pix_phone}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Produtos</h4>
            <div className="space-y-2">
              {order.products?.map((product: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Qtd: {product.quantity} × {formatCurrency(Number(product.price))}
                    </p>
                  </div>
                  <p className="font-medium">{formatCurrency(Number(product.total))}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(Number(order.total_amount - (order.shipping_cost || 0)))}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxa de Entrega:</span>
                <span>{formatCurrency(Number(order.shipping_cost || 0))}</span>
              </div>
              <div className="flex justify-between font-medium text-base">
                <span>Total:</span>
                <span>{formatCurrency(Number(order.total_amount))}</span>
              </div>
            </div>
          </div>

          {order.canceled_at && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <h5 className="font-medium text-destructive mb-1">Cancelado em:</h5>
              <p className="text-sm">{new Date(order.canceled_at).toLocaleString('pt-BR')}</p>
              {order.cancellation_reason && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Motivo:</p>
                  <p className="text-sm text-muted-foreground">{order.cancellation_reason}</p>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>Criado em: {new Date(order.created_at).toLocaleString('pt-BR')}</p>
            <p>Atualizado em: {new Date(order.updated_at).toLocaleString('pt-BR')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderDetails;