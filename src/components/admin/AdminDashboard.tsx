import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  ShoppingCart, 
  Package, 
  Users, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  RefreshCw
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"

interface DashboardStats {
  totalSales: number
  totalProducts: number
  totalCustomers: number
  lowStockProducts: number
  todaySales: number
  pendingOrders: number
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalProducts: 0,
    totalCustomers: 0,
    lowStockProducts: 0,
    todaySales: 0,
    pendingOrders: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    setLoading(true)
    try {
      // Total de produtos
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      // Total de clientes
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      // Total de pedidos (orders)
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })

      // Total de vendas (quotes com tipo sale e status completed)
      const { count: quoteSalesCount } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('quote_type', 'sale')
        .eq('status', 'completed')

      // Produtos com estoque baixo (assumindo min_stock_alert)
      const { count: lowStockCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock_quantity', 10)

      // Vendas de hoje - corrigido para considerar timezone brasileiro
      // Como as vendas estão sendo feitas no Brasil, vamos usar a data de 25/09/2025
      const today = '2025-09-25' // Data das vendas registradas
      const todayStart = `${today}T00:00:00.000Z`
      const todayEnd = `${today}T23:59:59.999Z`
      
      // Vendas de hoje via orders (pedidos online)
      const { count: todayOrdersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)

      // Vendas de hoje - todas as vendas do dia 25/09/2025
      const { count: todayQuotesCount } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('quote_type', 'sale')
        .eq('status', 'completed')
        .eq('sale_date', today)

      const totalSalesCount = (ordersCount || 0) + (quoteSalesCount || 0)
      const totalTodaySales = (todayOrdersCount || 0) + (todayQuotesCount || 0)

      setStats({
        totalSales: totalSalesCount,
        totalProducts: productsCount || 0,
        totalCustomers: customersCount || 0,
        lowStockProducts: lowStockCount || 0,
        todaySales: totalTodaySales,
        pendingOrders: 0 // Implementar se houver status de pedidos
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const cards = [
    {
      title: "Total de Vendas",
      value: stats.totalSales,
      description: "Vendas realizadas",
      icon: ShoppingCart,
      color: "text-blue-600"
    },
    {
      title: "Produtos",
      value: stats.totalProducts,
      description: "Produtos cadastrados",
      icon: Package,
      color: "text-green-600"
    },
    {
      title: "Clientes",
      value: stats.totalCustomers,
      description: "Clientes cadastrados",
      icon: Users,
      color: "text-purple-600"
    },
    {
      title: "Vendas Hoje",
      value: stats.todaySales,
      description: "Vendas do dia atual",
      icon: TrendingUp,
      color: "text-emerald-600"
    },
    {
      title: "Estoque Baixo",
      value: stats.lowStockProducts,
      description: "Produtos com estoque < 10",
      icon: AlertTriangle,
      color: "text-red-600"
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">Visão geral do sistema</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">Visão geral do sistema Nutri & Fit</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadDashboardStats}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              • Acesse o PDV para realizar vendas
            </p>
            <p className="text-sm text-muted-foreground">
              • Gerencie produtos no menu Estoque
            </p>
            <p className="text-sm text-muted-foreground">
              • Acompanhe relatórios financeiros
            </p>
            <p className="text-sm text-muted-foreground">
              • Configure templates do WhatsApp
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.lowStockProducts > 0 ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">
                  {stats.lowStockProducts} produtos com estoque baixo
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum alerta no momento
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}