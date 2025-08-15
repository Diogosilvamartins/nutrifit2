import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  CalendarIcon, 
  Download, 
  TrendingUp, 
  Package, 
  Users, 
  AlertTriangle,
  DollarSign,
  CreditCard,
  XCircle,
  FileBarChart
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

import { formatCurrency } from "@/lib/utils";

interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

interface SalesReport {
  date: string;
  totalSales: number;
  totalAmount: number;
  averageTicket: number;
}

interface ProductReport {
  id: string;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
  lastSale: string;
}

interface CustomerReport {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalPurchases: number;
  totalSpent: number;
  lastPurchase: string;
}

interface StockAlert {
  id: string;
  name: string;
  currentStock: number;
  minStockAlert: number;
  costPrice: number;
  salePrice: number;
  hasAlert: boolean;
  status: 'low' | 'critical' | 'ok';
}

interface PaymentReport {
  method: string;
  count: number;
  totalAmount: number;
  percentage: number;
}

interface CancellationReport {
  date: string;
  customerName: string;
  totalAmount: number;
  reason?: string;
  canceledBy: string;
}

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [salesReport, setSalesReport] = useState<SalesReport[]>([]);
  const [productReport, setProductReport] = useState<ProductReport[]>([]);
  const [customerReport, setCustomerReport] = useState<CustomerReport[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [paymentReport, setPaymentReport] = useState<PaymentReport[]>([]);
  const [cancellationReport, setCancellationReport] = useState<CancellationReport[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      generateReports();
    }
  }, [dateRange]);

  const generateReports = async () => {
    if (!dateRange.from || !dateRange.to) return;
    
    setLoading(true);
    try {
      await Promise.all([
        generateSalesReport(),
        generateProductReport(),
        generateCustomerReport(),
        generateStockAlerts(),
        generatePaymentReport(),
        generateCancellationReport()
      ]);
      toast({
        title: "Relatórios gerados com sucesso!",
        description: `Período: ${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`,
      });
    } catch (error) {
      console.error("Error generating reports:", error);
      toast({
        title: "Erro ao gerar relatórios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSalesReport = async () => {
    // Buscar movimentos de caixa de vendas primeiro
    const { data: cashMovements, error: cashError } = await supabase
      .from('cash_movements')
      .select('date, amount, reference_id')
      .eq('reference_type', 'venda')
      .gte('date', format(dateRange.from!, 'yyyy-MM-dd'))
      .lte('date', format(dateRange.to!, 'yyyy-MM-dd'));

    if (cashError) throw cashError;

    // Buscar as vendas correspondentes para validar
    const quoteIds = cashMovements?.map(cm => cm.reference_id) || [];
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('id, quote_type, status')
      .eq('quote_type', 'sale')
      .neq('status', 'canceled')
      .in('id', quoteIds);

    if (quotesError) throw quotesError;

    // Filtrar apenas movimentos de vendas válidas
    const validQuoteIds = new Set(quotes?.map(q => q.id) || []);
    const validMovements = cashMovements?.filter(cm => validQuoteIds.has(cm.reference_id)) || [];

    const salesByDate: { [date: string]: { count: number; total: number } } = {};
    
    validMovements.forEach(movement => {
      const date = format(new Date(movement.date), "dd/MM/yyyy");
      if (!salesByDate[date]) {
        salesByDate[date] = { count: 0, total: 0 };
      }
      salesByDate[date].count += 1;
      salesByDate[date].total += Number(movement.amount);
    });

    const report = Object.entries(salesByDate).map(([date, data]) => ({
      date,
      totalSales: data.count,
      totalAmount: data.total,
      averageTicket: data.count > 0 ? data.total / data.count : 0
    })).sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - 
                      new Date(b.date.split('/').reverse().join('-')).getTime());

    setSalesReport(report);
  };

  const generateProductReport = async () => {
    const { data: quotes, error } = await supabase
      .from('quotes')
      .select('products, created_at, quote_type, status')
      .eq('quote_type', 'sale')
      .neq('status', 'canceled')
      .gte('created_at', dateRange.from!.toISOString())
      .lte('created_at', dateRange.to!.toISOString());

    if (error) throw error;

    const productStats: { [id: string]: { name: string; quantity: number; revenue: number; lastSale: string } } = {};

    quotes?.forEach(quote => {
      if (Array.isArray(quote.products)) {
        quote.products.forEach((product: any) => {
          if (!productStats[product.id]) {
            productStats[product.id] = {
              name: product.name,
              quantity: 0,
              revenue: 0,
              lastSale: quote.created_at
            };
          }
          productStats[product.id].quantity += product.quantity;
          productStats[product.id].revenue += product.total;
          productStats[product.id].lastSale = quote.created_at;
        });
      }
    });

    const report = Object.entries(productStats).map(([id, data]) => ({
      id,
      name: data.name,
      totalQuantity: data.quantity,
      totalRevenue: data.revenue,
      lastSale: format(new Date(data.lastSale), "dd/MM/yyyy")
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);

    setProductReport(report);
  };

  const generateCustomerReport = async () => {
    const { data: quotes, error } = await supabase
      .from('quotes')
      .select('customer_name, customer_email, customer_phone, total_amount, created_at, quote_type, status')
      .eq('quote_type', 'sale')
      .neq('status', 'canceled')
      .gte('created_at', dateRange.from!.toISOString())
      .lte('created_at', dateRange.to!.toISOString());

    if (error) throw error;

    const customerStats: { [name: string]: { email?: string; phone?: string; purchases: number; spent: number; lastPurchase: string } } = {};

    quotes?.forEach(quote => {
      const name = quote.customer_name;
      if (!customerStats[name]) {
        customerStats[name] = {
          email: quote.customer_email,
          phone: quote.customer_phone,
          purchases: 0,
          spent: 0,
          lastPurchase: quote.created_at
        };
      }
      customerStats[name].purchases += 1;
      customerStats[name].spent += Number(quote.total_amount);
      customerStats[name].lastPurchase = quote.created_at;
    });

    const report = Object.entries(customerStats).map(([name, data]) => ({
      id: name,
      name,
      email: data.email,
      phone: data.phone,
      totalPurchases: data.purchases,
      totalSpent: data.spent,
      lastPurchase: format(new Date(data.lastPurchase), "dd/MM/yyyy")
    })).sort((a, b) => b.totalSpent - a.totalSpent);

    setCustomerReport(report);
  };

  const generateStockAlerts = async () => {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, stock_quantity, min_stock_alert, cost_price, price')
      .order('name');

    if (error) throw error;

    const alerts = products?.map(product => ({
      id: product.id,
      name: product.name,
      currentStock: product.stock_quantity || 0,
      minStockAlert: product.min_stock_alert || 5,
      costPrice: product.cost_price || 0,
      salePrice: product.price || 0,
      hasAlert: (product.stock_quantity || 0) <= (product.min_stock_alert || 5),
      status: (product.stock_quantity || 0) === 0 ? 'critical' as const : 
              (product.stock_quantity || 0) <= (product.min_stock_alert || 5) ? 'low' as const : 'ok' as const
    })) || [];

    setStockAlerts(alerts);
  };

  const generatePaymentReport = async () => {
    const { data: quotes, error } = await supabase
      .from('quotes')
      .select('payment_method, total_amount, quote_type, status')
      .eq('quote_type', 'sale')
      .neq('status', 'canceled')
      .gte('created_at', dateRange.from!.toISOString())
      .lte('created_at', dateRange.to!.toISOString());

    if (error) throw error;

    const paymentStats: { [method: string]: { count: number; total: number } } = {};
    let grandTotal = 0;

    quotes?.forEach(quote => {
      const method = quote.payment_method || 'Não informado';
      if (!paymentStats[method]) {
        paymentStats[method] = { count: 0, total: 0 };
      }
      paymentStats[method].count += 1;
      paymentStats[method].total += Number(quote.total_amount);
      grandTotal += Number(quote.total_amount);
    });

    const report = Object.entries(paymentStats).map(([method, data]) => ({
      method: method === 'dinheiro' ? 'Dinheiro' :
              method === 'pix' ? 'PIX' :
              method === 'cartao_debito' ? 'Cartão Débito' :
              method === 'cartao_credito' ? 'Cartão Crédito' :
              'Não informado',
      count: data.count,
      totalAmount: data.total,
      percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0
    })).sort((a, b) => b.totalAmount - a.totalAmount);

    setPaymentReport(report);
  };

  const generateCancellationReport = async () => {
    const { data: quotes, error } = await supabase
      .from('quotes')
      .select('customer_name, total_amount, canceled_at, cancellation_reason, quote_type, status')
      .eq('quote_type', 'sale')
      .eq('status', 'canceled')
      .gte('canceled_at', dateRange.from!.toISOString())
      .lte('canceled_at', dateRange.to!.toISOString());

    if (error) throw error;

    const report = quotes?.map(quote => ({
      date: format(new Date(quote.canceled_at), "dd/MM/yyyy"),
      customerName: quote.customer_name,
      totalAmount: Number(quote.total_amount),
      reason: quote.cancellation_reason,
      canceledBy: 'Sistema'
    })) || [];

    setCancellationReport(report);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${format(new Date(), "dd-MM-yyyy")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatórios</h2>
          <p className="text-muted-foreground">Analise o desempenho do seu negócio</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>Período:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-80 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    <span>Selecione o período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={generateReports} disabled={loading}>
            <FileBarChart className="mr-2 h-4 w-4" />
            {loading ? "Gerando..." : "Atualizar"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesReport.reduce((sum, sale) => sum + sale.totalSales, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(salesReport.reduce((sum, sale) => sum + sale.totalAmount, 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Vendidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productReport.reduce((sum, product) => sum + product.totalQuantity, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {productReport.length} produtos diferentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerReport.length}</div>
            <p className="text-xs text-muted-foreground">
               Ticket médio: {customerReport.length > 0 ? 
                 formatCurrency(customerReport.reduce((sum, customer) => sum + customer.totalSpent, 0) / customerReport.length) : 
                 formatCurrency(0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas de Estoque</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stockAlerts.filter(alert => alert.hasAlert).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {stockAlerts.filter(alert => alert.status === 'critical').length} críticos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="stock">Estoque</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="cancellations">Cancelamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Relatório de Vendas por Dia</h3>
            <Button 
              variant="outline" 
              onClick={() => exportToCSV(salesReport, 'relatorio-vendas')}
              disabled={salesReport.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {salesReport.map((sale, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{sale.date}</p>
                      <p className="text-sm text-muted-foreground">{sale.totalSales} vendas</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(sale.totalAmount)}</p>
                      <p className="text-sm text-muted-foreground">
                        Ticket médio: {formatCurrency(sale.averageTicket)}
                      </p>
                    </div>
                  </div>
                ))}
                {salesReport.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma venda encontrada no período selecionado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Produtos Mais Vendidos</h3>
            <Button 
              variant="outline" 
              onClick={() => exportToCSV(productReport, 'relatorio-produtos')}
              disabled={productReport.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {productReport.slice(0, 10).map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{index + 1}º</Badge>
                        <p className="font-medium">{product.name}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {product.totalQuantity} unidades vendidas • Última venda: {product.lastSale}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(product.totalRevenue)}</p>
                    </div>
                  </div>
                ))}
                {productReport.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum produto vendido no período selecionado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Melhores Clientes</h3>
            <Button 
              variant="outline" 
              onClick={() => exportToCSV(customerReport, 'relatorio-clientes')}
              disabled={customerReport.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {customerReport.slice(0, 10).map((customer, index) => (
                  <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{index + 1}º</Badge>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {customer.email} • {customer.phone}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {customer.totalPurchases} compras • Última: {customer.lastPurchase}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(customer.totalSpent)}</p>
                    </div>
                  </div>
                ))}
                {customerReport.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum cliente encontrado no período selecionado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Relatório de Estoque</h3>
            <Button 
              variant="outline" 
              onClick={() => exportToCSV(stockAlerts, 'relatorio-estoque')}
              disabled={stockAlerts.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {stockAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      alert.hasAlert ? 'bg-destructive/5 border-destructive/20' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {alert.hasAlert && (
                          <Badge variant={alert.status === 'critical' ? 'destructive' : 'destructive'}>
                            {alert.status === 'critical' ? 'CRÍTICO' : 'BAIXO'}
                          </Badge>
                        )}
                        <p className={`font-medium ${alert.hasAlert ? 'text-destructive' : ''}`}>
                          {alert.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${alert.hasAlert ? 'text-destructive' : ''}`}>
                        {alert.currentStock} unidades
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Alerta: {alert.minStockAlert} unidades
                      </p>
                      {alert.hasAlert && (
                        <p className="text-sm text-destructive font-medium">
                          {alert.status === 'critical' ? 'Estoque zerado!' : 'Estoque baixo!'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {stockAlerts.length === 0 && (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium">Nenhum produto encontrado</p>
                    <p className="text-muted-foreground">Cadastre produtos para ver o relatório de estoque</p>
                  </div>
                )}
                
                {/* Somatório do Estoque */}
                {stockAlerts.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Total de Unidades */}
                      <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-primary" />
                          <span className="font-semibold">Total de Unidades</span>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {stockAlerts.reduce((total, alert) => total + alert.currentStock, 0)} un
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {stockAlerts.length} produtos
                          </p>
                        </div>
                      </div>
                      
                      {/* Valor Total do Estoque (Custo) */}
                      <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-orange-600" />
                          <span className="font-semibold">Valor de Custo</span>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-orange-600">
                            {formatCurrency(stockAlerts.reduce((total, alert) => total + (alert.currentStock * alert.costPrice), 0))}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Preço de custo
                          </p>
                        </div>
                      </div>
                      
                      {/* Valor Total do Estoque (Venda) */}
                      <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          <span className="font-semibold">Valor de Venda</span>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(stockAlerts.reduce((total, alert) => total + (alert.currentStock * alert.salePrice), 0))}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Preço de venda
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Métodos de Pagamento</h3>
            <Button 
              variant="outline" 
              onClick={() => exportToCSV(paymentReport, 'relatorio-pagamentos')}
              disabled={paymentReport.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {paymentReport.map((payment, index) => (
                  <div key={payment.method} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{payment.method}</p>
                        <p className="text-sm text-muted-foreground">{payment.count} transações</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(payment.totalAmount)}</p>
                      <p className="text-sm text-muted-foreground">{payment.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
                {paymentReport.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum pagamento encontrado no período selecionado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancellations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Vendas Canceladas</h3>
            <Button 
              variant="outline" 
              onClick={() => exportToCSV(cancellationReport, 'vendas-canceladas')}
              disabled={cancellationReport.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {cancellationReport.map((cancellation, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <XCircle className="h-5 w-5 text-destructive" />
                      <div>
                        <p className="font-medium">{cancellation.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {cancellation.date} • {cancellation.reason || 'Sem motivo informado'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-destructive">
                        -{formatCurrency(cancellation.totalAmount)}
                      </p>
                    </div>
                  </div>
                ))}
                {cancellationReport.length === 0 && (
                  <div className="text-center py-8">
                    <XCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-green-600">Excelente!</p>
                    <p className="text-muted-foreground">Nenhuma venda cancelada no período</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}