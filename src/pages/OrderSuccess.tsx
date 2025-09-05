import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Copy, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_cpf: string;
  delivery_address: string;
  delivery_city: string;
  delivery_state: string;
  delivery_zipcode: string;
  products: any;
  total_amount: number;
  status: string;
  pix_phone: string;
  created_at: string;
}

const OrderSuccess = () => {
  const { orderId: token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!token) return;

      try {
        const { data, error } = await supabase
          .rpc('get_order_by_public_token', { token });

        if (error) throw error;
        
        if (!data || data.length === 0) {
          throw new Error('Order not found');
        }

        const orderData = data[0];
        setOrder({
          ...orderData,
          products: Array.isArray(orderData.products) ? orderData.products : []
        });
      } catch (error) {
        console.error("Erro ao buscar pedido:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do pedido.",
          variant: "destructive"
        });
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [token, navigate, toast]);

  const copyPixData = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Informação copiada para a área de transferência."
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Pedido não encontrado</h2>
            <Button onClick={() => navigate("/")}>
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header de Sucesso */}
        <Card className="mb-8">
          <CardContent className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Pedido Confirmado!</h1>
            <p className="text-muted-foreground mb-4">
              Pedido #{order.id.slice(0, 8)}
            </p>
            <Badge variant="outline" className="text-sm">
              Status: {order.status === 'pending' ? 'Aguardando Pagamento' : order.status}
            </Badge>
          </CardContent>
        </Card>

        {/* Dados do PIX */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Pagamento via PIX
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 mb-2">
                  Faça o PIX para o número abaixo no valor total do pedido:
                </p>
                <div className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <p className="font-semibold text-lg">{order.pix_phone}</p>
                    <p className="text-sm text-muted-foreground">Número do celular para PIX</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyPixData(order.pix_phone)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <span className="font-semibold">Valor a pagar:</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Faça o PIX para o número: <strong>{order.pix_phone}</strong></p>
                <p>• Use como descrição: <strong>Pedido #{order.id.slice(0, 8)}</strong></p>
                <p>• Após o pagamento, seu pedido será processado em até 24h</p>
                <p>• Você receberá atualizações no e-mail: <strong>{order.customer_email}</strong></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo do Pedido */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(Array.isArray(order.products) ? order.products : []).map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                       Qtd: {item.quantity} x {formatCurrency(item.price)}
                     </p>
                   </div>
                   <p className="font-semibold">
                     {formatCurrency(item.price * item.quantity)}
                   </p>
                 </div>
               ))}
               
               <Separator />
               
               <div className="flex justify-between items-center text-lg font-bold">
                 <span>Total:</span>
                 <span className="text-primary">{formatCurrency(order.total_amount)}</span>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados de Entrega */}
        <Card>
          <CardHeader>
            <CardTitle>Dados de Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Nome:</strong> {order.customer_name}</p>
              <p><strong>CPF:</strong> {order.customer_cpf}</p>
              <p><strong>E-mail:</strong> {order.customer_email}</p>
              <p>
                <strong>Endereço:</strong> {order.delivery_address}, {order.delivery_city} - {order.delivery_state}, {order.delivery_zipcode}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Button onClick={() => navigate("/")} variant="outline">
            Continuar Comprando
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;