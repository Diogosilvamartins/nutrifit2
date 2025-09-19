import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, TrendingUp, TrendingDown, DollarSign, ShoppingCart, CreditCard, Banknote, XCircle, Minus, TrendingDown as ProfitIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Função para formatar valores em reais
import { formatCurrency } from "@/lib/utils";

interface DailySales {
  date: string;
  sales: number;
  orders: number;
  canceled: number;
  total: number;
}

interface ProductSales {
  name: string;
  quantity: number;
  revenue: number;
}

interface PaymentMethodStats {
  method: string;
  amount: number;
  count: number;
}

interface FinancialSummary {
  totalSales: number;
  totalOrders: number;
  canceledSales: number;
  canceledAmount: number;
  totalCost: number;
  totalProfit: number;
  averageTicket: number;
  dailyGrowth: number;
  monthlyGrowth: number;
  cashPosition: number;
  bankPosition: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function FinancialDashboard() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("today");
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [productSales, setProductSales] = useState<ProductSales[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodStats[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalSales: 0,
    totalOrders: 0,
    canceledSales: 0,
    canceledAmount: 0,
    totalCost: 0,
    totalProfit: 0,
    averageTicket: 0,
    dailyGrowth: 0,
    monthlyGrowth: 0,
    cashPosition: 0,
    bankPosition: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchFinancialData();
  }, [period]);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDailySales(),
        fetchProductSales(),
        fetchPaymentMethods(),
        fetchSummary()
      ]);
    } catch (error) {
      console.error("Error fetching financial data:", error);
      toast({
        title: "Erro ao carregar dados financeiros",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDailySales = async () => {
    const today = new Date();
    let startDate = new Date();
    let daysBack = 30;

    switch (period) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        daysBack = 1;
        break;
      case "week":
        startDate.setDate(today.getDate() - 7);
        daysBack = 7;
        break;
      case "month":
        startDate.setDate(today.getDate() - 30);
        daysBack = 30;
        break;
      case "year":
        startDate.setFullYear(today.getFullYear() - 1);
        daysBack = 365;
        break;
      default:
        startDate.setDate(today.getDate() - 30);
        daysBack = 30;
    }

    const todayString = today.toISOString().split('T')[0];

    // Fetch from quotes (in-store sales) - considerar tanto created_at quanto sale_date
    let quotes: any[] = [];
    let quotesError: any = null;

    if (period === "today") {
      // Para hoje, buscar por sale_date = hoje OU created_at >= hoje
      const { data: quotesBySaleDate, error: err1 } = await supabase
        .from('quotes')
        .select('id, created_at, sale_date, total_amount, quote_type, status')
        .eq('quote_type', 'sale')
        .eq('status', 'completed')
        .eq('sale_date', todayString);
        
      const { data: quotesByCreatedAt, error: err2 } = await supabase
        .from('quotes')
        .select('id, created_at, sale_date, total_amount, quote_type, status')
        .eq('quote_type', 'sale')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString());
      
      quotesError = err1 || err2;
      
      if (!quotesError) {
        // Combinar e remover duplicatas
        const allQuotes = [...(quotesBySaleDate || []), ...(quotesByCreatedAt || [])];
        quotes = allQuotes.filter((quote, index, self) => 
          index === self.findIndex(q => q.id === quote.id)
        );
      }
    } else {
      const { data: quotesData, error } = await supabase
        .from('quotes')
        .select('id, created_at, sale_date, total_amount, quote_type, status')
        .eq('quote_type', 'sale')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString());
      
      quotes = quotesData || [];
      quotesError = error;
    }

    // Fetch from orders (online sales)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('created_at, total_amount, status')
      .gte('created_at', startDate.toISOString());

    // Fetch canceled sales
    const { data: canceledQuotes, error: canceledError } = await supabase
      .from('quotes')
      .select('canceled_at, total_amount, quote_type')
      .eq('quote_type', 'sale')
      .eq('status', 'canceled')
      .gte('canceled_at', startDate.toISOString());

    if (quotesError || ordersError || canceledError) throw quotesError || ordersError || canceledError;

    // Group by date
    const salesByDate: { [date: string]: { sales: number; orders: number; canceled: number; total: number } } = {};

    // Process quotes (non-canceled)
    quotes?.filter(quote => quote.status !== 'canceled').forEach(quote => {
      const date = new Date(quote.created_at).toLocaleDateString('pt-BR');
      if (!salesByDate[date]) {
        salesByDate[date] = { sales: 0, orders: 0, canceled: 0, total: 0 };
      }
      salesByDate[date].sales += 1;
      salesByDate[date].total += Number(quote.total_amount);
    });

    // Process orders (non-canceled)
    orders?.filter(order => order.status !== 'canceled').forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString('pt-BR');
      if (!salesByDate[date]) {
        salesByDate[date] = { sales: 0, orders: 0, canceled: 0, total: 0 };
      }
      salesByDate[date].orders += 1;
      salesByDate[date].total += Number(order.total_amount);
    });

    // Process canceled sales
    canceledQuotes?.forEach(quote => {
      const date = new Date(quote.canceled_at).toLocaleDateString('pt-BR');
      if (!salesByDate[date]) {
        salesByDate[date] = { sales: 0, orders: 0, canceled: 0, total: 0 };
      }
      salesByDate[date].canceled += 1;
    });

    const chartData = Object.entries(salesByDate)
      .map(([date, data]) => ({
        date,
        sales: data.sales,
        orders: data.orders,
        canceled: data.canceled,
        total: data.total
      }))
      .sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - 
                     new Date(b.date.split('/').reverse().join('-')).getTime());

    setDailySales(chartData);
  };

  const fetchProductSales = async () => {
    const today = new Date();
    let startDate = new Date();

    switch (period) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(today.getDate() - 7);
        break;
      case "month":
        startDate.setDate(today.getDate() - 30);
        break;
      case "year":
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate.setDate(today.getDate() - 30);
    }

    const todayString = today.toISOString().split('T')[0];

    // Fetch from quotes - considerar tanto created_at quanto sale_date
    let quotes: any[] = [];
    let error: any = null;

    if (period === "today") {
      // Para hoje, buscar por sale_date = hoje OU created_at >= hoje
      const { data: quotesBySaleDate, error: err1 } = await supabase
        .from('quotes')
        .select('id, products, quote_type')
        .eq('quote_type', 'sale')
        .eq('status', 'completed')
        .eq('sale_date', todayString);
        
      const { data: quotesByCreatedAt, error: err2 } = await supabase
        .from('quotes')
        .select('id, products, quote_type')
        .eq('quote_type', 'sale')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString());
      
      error = err1 || err2;
      
      if (!error) {
        // Combinar e remover duplicatas
        const allQuotes = [...(quotesBySaleDate || []), ...(quotesByCreatedAt || [])];
        quotes = allQuotes.filter((quote, index, self) => 
          index === self.findIndex(q => q.id === quote.id)
        );
      }
    } else {
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('products, quote_type')
        .eq('quote_type', 'sale')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString());
      
      quotes = quotesData || [];
      error = quotesError;
    }

    if (error) throw error;

    const productStats: { [name: string]: { quantity: number; revenue: number } } = {};

    quotes?.forEach(quote => {
      if (Array.isArray(quote.products)) {
        quote.products.forEach((product: any) => {
          if (!productStats[product.name]) {
            productStats[product.name] = { quantity: 0, revenue: 0 };
          }
          productStats[product.name].quantity += product.quantity;
          productStats[product.name].revenue += product.total;
        });
      }
    });

    const chartData = Object.entries(productStats)
      .map(([name, stats]) => ({
        name,
        quantity: stats.quantity,
        revenue: stats.revenue
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    setProductSales(chartData);
  };

  const fetchPaymentMethods = async () => {
    const today = new Date();
    let startDate = new Date();

    switch (period) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(today.getDate() - 7);
        break;
      case "month":
        startDate.setDate(today.getDate() - 30);
        break;
      case "year":
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate.setDate(today.getDate() - 30);
    }

    const todayString = today.toISOString().split('T')[0];

    // Fetch from quotes - considerar tanto created_at quanto sale_date
    let quotes: any[] = [];
    let error: any = null;

    if (period === "today") {
      // Para hoje, buscar por sale_date = hoje OU created_at >= hoje
      const { data: quotesBySaleDate, error: err1 } = await supabase
        .from('quotes')
        .select('id, payment_method, total_amount, quote_type')
        .eq('quote_type', 'sale')
        .eq('status', 'completed')
        .eq('sale_date', todayString);
        
      const { data: quotesByCreatedAt, error: err2 } = await supabase
        .from('quotes')
        .select('id, payment_method, total_amount, quote_type')
        .eq('quote_type', 'sale')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString());
      
      error = err1 || err2;
      
      if (!error) {
        // Combinar e remover duplicatas
        const allQuotes = [...(quotesBySaleDate || []), ...(quotesByCreatedAt || [])];
        quotes = allQuotes.filter((quote, index, self) => 
          index === self.findIndex(q => q.id === quote.id)
        );
      }
    } else {
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('payment_method, total_amount, quote_type')
        .eq('quote_type', 'sale')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString());
      
      quotes = quotesData || [];
      error = quotesError;
    }

    if (error) throw error;

    const methodStats: { [method: string]: { amount: number; count: number } } = {};

    quotes?.forEach(quote => {
      const method = quote.payment_method || 'Não informado';
      if (!methodStats[method]) {
        methodStats[method] = { amount: 0, count: 0 };
      }
      methodStats[method].amount += Number(quote.total_amount);
      methodStats[method].count += 1;
    });

    const chartData = Object.entries(methodStats).map(([method, stats]) => ({
      method: method === 'dinheiro' ? 'Dinheiro' :
              method === 'pix' ? 'PIX' :
              method === 'cartao_debito' ? 'Cartão Débito' :
              method === 'cartao_credito' ? 'Cartão Crédito' :
              'Não informado',
      amount: stats.amount,
      count: stats.count
    }));

    setPaymentMethods(chartData);
  };

  const fetchSummary = async () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    let startDate = new Date();
    let prevStartDate = new Date();
    let prevEndDate = new Date();

    switch (period) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        prevStartDate.setDate(today.getDate() - 1);
        prevStartDate.setHours(0, 0, 0, 0);
        prevEndDate.setDate(today.getDate() - 1);
        prevEndDate.setHours(23, 59, 59, 999);
        break;
      case "week":
        startDate.setDate(today.getDate() - 7);
        prevStartDate.setDate(today.getDate() - 14);
        prevEndDate.setDate(today.getDate() - 8);
        break;
      case "month":
        startDate.setDate(today.getDate() - 30);
        prevStartDate.setDate(today.getDate() - 60);
        prevEndDate.setDate(today.getDate() - 31);
        break;
      case "year":
        startDate.setFullYear(today.getFullYear() - 1);
        prevStartDate.setFullYear(today.getFullYear() - 2);
        prevEndDate.setFullYear(today.getFullYear() - 1);
        prevEndDate.setDate(today.getDate() - 1);
        break;
      default:
        startDate.setDate(today.getDate() - 30);
        prevStartDate.setDate(today.getDate() - 60);
        prevEndDate.setDate(today.getDate() - 31);
    }

    // Current period data with products details
    let currentQuotes: any[] = [];
    let currentError: any = null;

    if (period === "today") {
      // Para hoje, buscar por sale_date = hoje OU created_at >= hoje
      const { data: quotesBySaleDate, error: err1 } = await supabase
        .from('quotes')
        .select('id, total_amount, quote_type, status, products, sale_date')
        .eq('quote_type', 'sale')
        .eq('status', 'completed')
        .eq('sale_date', todayString);
        
      const { data: quotesByCreatedAt, error: err2 } = await supabase
        .from('quotes')
        .select('id, total_amount, quote_type, status, products, sale_date')
        .eq('quote_type', 'sale')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString());
      
      currentError = err1 || err2;
      
      if (!currentError) {
        // Combinar e remover duplicatas
        const allQuotes = [...(quotesBySaleDate || []), ...(quotesByCreatedAt || [])];
        currentQuotes = allQuotes.filter((quote, index, self) => 
          index === self.findIndex(q => q.id === quote.id)
        );
      }
    } else {
      const { data: quotesData, error } = await supabase
        .from('quotes')
        .select('total_amount, quote_type, status, products')
        .eq('quote_type', 'sale')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString());
      
      currentQuotes = quotesData || [];
      currentError = error;
    }

    const { data: currentOrders, error: ordersError } = await supabase
      .from('orders')
      .select('total_amount, products')
      .gte('created_at', startDate.toISOString());

    // Previous period data  
    const { data: prevQuotes, error: lastError } = await supabase
      .from('quotes')
      .select('total_amount, quote_type')
      .eq('quote_type', 'sale')
      .gte('created_at', prevStartDate.toISOString())
      .lte('created_at', prevEndDate.toISOString());

    // Canceled sales in current period
    const { data: canceledQuotes, error: canceledError } = await supabase
      .from('quotes')
      .select('total_amount, quote_type, status')
      .eq('quote_type', 'sale')
      .eq('status', 'canceled')
      .gte('created_at', startDate.toISOString());

    // Get cash position for today
    const { data: cashData, error: cashError } = await supabase
      .rpc('get_cash_summary_for_date', { target_date: todayString });

    if (currentError || lastError || ordersError || canceledError) {
      throw currentError || lastError || ordersError || canceledError;
    }

    if (cashError) {
      console.error("Error fetching cash data:", cashError);
    }

    const currentSales = (currentQuotes?.filter(q => q.status !== 'canceled').reduce((sum, quote) => sum + Number(quote.total_amount), 0) || 0) +
                        (currentOrders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0);
    
    const prevSales = prevQuotes?.reduce((sum, quote) => sum + Number(quote.total_amount), 0) || 0;
    
    const totalOrders = (currentQuotes?.filter(q => q.status !== 'canceled').length || 0) + (currentOrders?.length || 0);
    const averageTicket = totalOrders > 0 ? currentSales / totalOrders : 0;
    const periodGrowth = prevSales > 0 ? ((currentSales - prevSales) / prevSales) * 100 : 0;

    // Calculate total cost from products sold
    let totalCost = 0;
    
    // Get all unique product IDs from quotes and orders to fetch current cost prices
    const productIds = new Set<string>();
    
    currentQuotes?.filter(q => q.status !== 'canceled').forEach(quote => {
      if (Array.isArray(quote.products)) {
        quote.products.forEach((product: any) => {
          if (product.id) {
            productIds.add(product.id);
          }
        });
      }
    });
    
    currentOrders?.forEach(order => {
      if (Array.isArray(order.products)) {
        order.products.forEach((product: any) => {
          if (product.id) {
            productIds.add(product.id);
          }
        });
      }
    });

    // Fetch current cost prices from products table
    let productCosts: Record<string, number> = {};
    if (productIds.size > 0) {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, cost_price')
        .in('id', Array.from(productIds));
      
      if (!productsError && products) {
        products.forEach(product => {
          productCosts[product.id] = product.cost_price || 0;
        });
      }
    }
    
    // Calculate cost from quotes
    currentQuotes?.filter(q => q.status !== 'canceled').forEach(quote => {
      if (Array.isArray(quote.products)) {
        quote.products.forEach((product: any) => {
          const quantity = product.quantity || 0;
          const costPrice = product.cost_price || productCosts[product.id] || 0;
          totalCost += quantity * costPrice;
        });
      }
    });
    
    // Calculate cost from orders
    currentOrders?.forEach(order => {
      if (Array.isArray(order.products)) {
        order.products.forEach((product: any) => {
          const quantity = product.quantity || 0;
          const costPrice = product.cost_price || productCosts[product.id] || 0;
          totalCost += quantity * costPrice;
        });
      }
    });

    const totalProfit = currentSales - totalCost;

    // Canceled sales stats
    const canceledSales = canceledQuotes?.length || 0;
    const canceledAmount = canceledQuotes?.reduce((sum, quote) => sum + Number(quote.total_amount), 0) || 0;

    // Calculate bank position from PIX and card sales
    let bankPosition = 0;
    
    // Para hoje, buscar vendas não-dinheiro por sale_date = hoje OU created_at >= hoje
    if (period === "today") {
      const { data: bankSalesBySaleDate } = await supabase
        .from('quotes')
        .select('id, total_amount, payment_method')
        .eq('quote_type', 'sale')
        .eq('status', 'completed')
        .eq('sale_date', todayString)
        .in('payment_method', ['pix', 'cartao_debito', 'cartao_credito']);
        
      const { data: bankSalesByCreatedAt } = await supabase
        .from('quotes')
        .select('id, total_amount, payment_method')
        .eq('quote_type', 'sale')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .in('payment_method', ['pix', 'cartao_debito', 'cartao_credito']);
      
      // Combinar e remover duplicatas
      const allBankSales = [...(bankSalesBySaleDate || []), ...(bankSalesByCreatedAt || [])];
      const uniqueBankSales = allBankSales.filter((sale, index, self) => 
        index === self.findIndex(s => s.id === sale.id)
      );
      
      bankPosition = uniqueBankSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
    } else {
      const { data: bankSales } = await supabase
        .from('quotes')
        .select('total_amount, payment_method')
        .eq('quote_type', 'sale')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .in('payment_method', ['pix', 'cartao_debito', 'cartao_credito']);
      
      bankPosition = bankSales?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
    }

    // Use real cash data if available, otherwise fallback to 0
    const cashPosition = cashData && cashData.length > 0 ? Number(cashData[0].current_balance) : 0;

    setSummary({
      totalSales: currentSales,
      totalOrders: totalOrders,
      canceledSales,
      canceledAmount,
      totalCost,
      totalProfit,
      averageTicket,
      dailyGrowth: 2.5, // Mock data
      monthlyGrowth: periodGrowth,
      cashPosition,
      bankPosition,
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Carregando dados financeiros...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Financeiro</h2>
          <p className="text-muted-foreground">Acompanhe o desempenho das vendas e posição financeira</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">No Dia</SelectItem>
            <SelectItem value="week">Na Semana</SelectItem>
            <SelectItem value="month">No Mês</SelectItem>
            <SelectItem value="year">No Ano</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* First Row - Posição Banco, Pedidos, Ticket Médio e Posição Caixa */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posição Banco</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.bankPosition)}</div>
            <p className="text-xs text-muted-foreground">PIX + Cartões</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{summary.dailyGrowth}% vs ontem
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.averageTicket)}</div>
            <p className="text-xs text-muted-foreground">Por pedido no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posição Caixa</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.cashPosition)}</div>
            <p className="text-xs text-muted-foreground">Dinheiro físico</p>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - Vendas Totais, Custo, Lucro e Vendas Canceladas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Totais</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalSales)}</div>
            <div className="flex text-xs">
              {summary.monthlyGrowth > 0 ? (
                <span className="text-green-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{summary.monthlyGrowth.toFixed(1)}% vs período anterior
                </span>
              ) : (
                <span className="text-red-600 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {summary.monthlyGrowth.toFixed(1)}% vs período anterior
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
            <Minus className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary.totalCost)}</div>
            <p className="text-xs text-muted-foreground">Custo dos produtos vendidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro</CardTitle>
            <ProfitIcon className={`h-4 w-4 ${summary.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Vendas - Custo ({summary.totalSales > 0 ? ((summary.totalProfit / summary.totalSales) * 100).toFixed(1) : '0'}% margem)
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Canceladas</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.canceledSales}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.canceledAmount)} cancelado no período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList>
          <TabsTrigger value="sales">Vendas por Dia</TabsTrigger>
          <TabsTrigger value="products">Produtos Mais Vendidos</TabsTrigger>
          <TabsTrigger value="payments">Métodos de Pagamento</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Vendas Diárias</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'total' ? formatCurrency(value) : value,
                      name === 'sales' ? 'Vendas Presenciais' : 
                      name === 'orders' ? 'Pedidos Online' : 
                      name === 'canceled' ? 'Vendas Canceladas' : 'Total (R$)'
                    ]}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#8884d8" name="sales" />
                  <Line type="monotone" dataKey="orders" stroke="#82ca9d" name="orders" />
                  <Line type="monotone" dataKey="canceled" stroke="#ff6b6b" name="canceled" />
                  <Line type="monotone" dataKey="total" stroke="#ffc658" name="total" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Produtos Mais Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productSales} margin={{ bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    interval={0}
                    fontSize={11}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'revenue' ? formatCurrency(value) : value,
                      name === 'quantity' ? 'Quantidade' : 'Receita (R$)'
                    ]}
                    labelFormatter={(label) => `Produto: ${label}`}
                  />
                  <Bar dataKey="quantity" fill="#8884d8" name="quantity" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Método de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ method, amount }) => `${method}: ${formatCurrency(amount)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Valor']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}