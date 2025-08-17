import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, Download } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface SaleReport {
  id: string
  date: string
  customer_name: string
  products: any[]
  salesperson_name: string
  total_amount: number
  commission_amount: number
  payment_method: string
  quote_number: string
}

export default function SalesReport() {
  const [sales, setSales] = useState<SaleReport[]>([])
  const [filteredSales, setFilteredSales] = useState<SaleReport[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const { toast } = useToast()

  const fetchSalesReport = async () => {
    try {
      setLoading(true)
      
      // Buscar vendas com dados de comissão e vendedor
      const { data: salesData, error } = await supabase
        .from('quotes')
        .select(`
          id,
          created_at,
          customer_name,
          products,
          total_amount,
          payment_method,
          quote_number,
          salesperson_id,
          profiles!quotes_salesperson_id_fkey (
            full_name
          ),
          commission_records (
            commission_amount
          )
        `)
        .eq('quote_type', 'sale')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedSales: SaleReport[] = salesData?.map(sale => ({
        id: sale.id,
        date: format(new Date(sale.created_at), 'dd/MM/yyyy', { locale: ptBR }),
        customer_name: sale.customer_name,
        products: Array.isArray(sale.products) ? sale.products : [],
        salesperson_name: sale.profiles?.full_name || 'Sem vendedor',
        total_amount: sale.total_amount,
        commission_amount: Array.isArray(sale.commission_records) ? sale.commission_records[0]?.commission_amount || 0 : 0,
        payment_method: sale.payment_method || '',
        quote_number: sale.quote_number
      })) || []

      setSales(formattedSales)
      setFilteredSales(formattedSales)
    } catch (error) {
      console.error('Erro ao buscar relatório:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar o relatório de vendas",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filterSales = () => {
    let filtered = sales

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(sale =>
        sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.salesperson_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.quote_number.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro por data
    if (startDate && endDate) {
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.date.split('/').reverse().join('-'))
        return saleDate >= startDate && saleDate <= endDate
      })
    }

    setFilteredSales(filtered)
  }

  const getPaymentMethodBadge = (method: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'dinheiro': 'default',
      'pix': 'secondary',
      'cartao_debito': 'outline',
      'cartao_credito': 'destructive'
    }

    const labels: Record<string, string> = {
      'dinheiro': 'Dinheiro',
      'pix': 'PIX',
      'cartao_debito': 'Cartão Débito',
      'cartao_credito': 'Cartão Crédito'
    }

    return (
      <Badge variant={variants[method] || 'outline'}>
        {labels[method] || method}
      </Badge>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getTotalSales = () => {
    return filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0)
  }

  const getTotalCommissions = () => {
    return filteredSales.reduce((sum, sale) => sum + sale.commission_amount, 0)
  }

  useEffect(() => {
    fetchSalesReport()
  }, [])

  useEffect(() => {
    filterSales()
  }, [searchTerm, startDate, endDate, sales])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando relatório...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Vendas</CardTitle>
          <CardDescription>
            Relatório detalhado de todas as vendas realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Buscar por cliente, vendedor ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Data inicial"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Data final"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{filteredSales.length}</div>
                <p className="text-xs text-muted-foreground">Total de Vendas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{formatCurrency(getTotalSales())}</div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{formatCurrency(getTotalCommissions())}</div>
                <p className="text-xs text-muted-foreground">Total Comissões</p>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produtos</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Método de Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.date}</TableCell>
                    <TableCell>{sale.customer_name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {sale.products.map((product: any, index: number) => (
                          <div key={index} className="text-sm">
                            {product.name} (x{product.quantity})
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{sale.salesperson_name}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(sale.total_amount)}
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {formatCurrency(sale.commission_amount)}
                    </TableCell>
                    <TableCell>
                      {getPaymentMethodBadge(sale.payment_method)}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma venda encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}