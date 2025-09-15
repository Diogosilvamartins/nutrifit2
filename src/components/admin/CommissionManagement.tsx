import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { successToast, errorToast } from '@/components/ui/enhanced-toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Plus, DollarSign, Percent, CheckCircle, Clock } from 'lucide-react'

interface Commission {
  id: string
  salesperson_id: string
  commission_percentage: number
  commission_type: string
  fixed_amount: number
  is_active: boolean
  created_at: string
  salesperson?: {
    full_name: string
    role: string
  }
}

interface CommissionRecord {
  id: string
  salesperson_id: string
  sale_id: string
  sale_type: string
  sale_amount: number
  commission_percentage: number
  commission_amount: number
  payment_status: string
  paid_at: string | null
  created_at: string
  salesperson?: {
    full_name: string
  }
}

interface Profile {
  user_id: string
  full_name: string
  role: string
}

const commissionSchema = z.object({
  salesperson_id: z.string().min(1, 'Vendedor é obrigatório'),
  commission_percentage: z.number().min(0).max(100),
  commission_type: z.string(),
  fixed_amount: z.number().min(0).optional(),
  is_active: z.boolean()
})

type CommissionFormData = z.infer<typeof commissionSchema>

export default function CommissionManagement() {
  const { user } = useAuth()
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [commissionRecords, setCommissionRecords] = useState<CommissionRecord[]>([])
  const [salespeople, setSalespeople] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const form = useForm<CommissionFormData>({
    resolver: zodResolver(commissionSchema),
    defaultValues: {
      commission_percentage: 5,
      commission_type: 'percentage',
      fixed_amount: 0,
      is_active: true
    }
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Buscar vendedores (admin, gerente, vendedor e usuários ativos)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .in('role', ['admin', 'manager', 'salesperson', 'user'])
        .eq('is_active', true)

      setSalespeople(profilesData || [])

      // Buscar comissões
      const { data: commissionsData } = await supabase
        .from('commissions')
        .select(`
          *,
          salesperson:profiles!salesperson_id(full_name, role)
        `)
        .order('created_at', { ascending: false })

      setCommissions(commissionsData || [])

      // Buscar registros de comissões
      const { data: recordsData } = await supabase
        .from('commission_records')
        .select(`
          *,
          salesperson:profiles!salesperson_id(full_name)
        `)
        .order('created_at', { ascending: false })

      setCommissionRecords(recordsData || [])
    } catch (error) {
      errorToast('Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: CommissionFormData) => {
    try {
      const insertData = {
        salesperson_id: data.salesperson_id,
        commission_percentage: data.commission_percentage,
        commission_type: data.commission_type,
        fixed_amount: data.fixed_amount || 0,
        is_active: data.is_active
      }

      const { error } = await supabase
        .from('commissions')
        .insert(insertData)

      if (error) throw error

      successToast('Comissão cadastrada com sucesso')
      setIsDialogOpen(false)
      form.reset()
      fetchData()
    } catch (error) {
      errorToast('Erro ao cadastrar comissão')
    }
  }

  const toggleCommissionStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('commissions')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error

      successToast('Status da comissão atualizado')
      fetchData()
    } catch (error) {
      errorToast('Erro ao atualizar comissão')
    }
  }

  const markCommissionAsPaid = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('commission_records')
        .update({ 
          payment_status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', recordId)

      if (error) throw error

      successToast('Comissão marcada como paga')
      fetchData()
    } catch (error) {
      errorToast('Erro ao atualizar comissão')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  const totalPendingCommissions = commissionRecords
    .filter(record => record.payment_status === 'pending')
    .reduce((sum, record) => sum + record.commission_amount, 0)

  const totalPaidCommissions = commissionRecords
    .filter(record => record.payment_status === 'paid')
    .reduce((sum, record) => sum + record.commission_amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciamento de Comissões</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Comissão
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Comissão</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="salesperson_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendedor</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um vendedor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {salespeople.map((person) => (
                            <SelectItem key={person.user_id} value={person.user_id}>
                              {person.full_name} ({person.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commission_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Comissão</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Porcentagem</SelectItem>
                          <SelectItem value="fixed">Valor Fixo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('commission_type') === 'percentage' ? (
                  <FormField
                    control={form.control}
                    name="commission_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Porcentagem (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="fixed_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Fixo (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Ativa</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  Cadastrar Comissão
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalPendingCommissions.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões Pagas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalPaidCommissions.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendedores Ativos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {commissions.filter(c => c.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="commissions" className="w-full">
        <TabsList>
          <TabsTrigger value="commissions">Configurações</TabsTrigger>
          <TabsTrigger value="records">Registros de Comissões</TabsTrigger>
        </TabsList>

        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Comissão</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {commission.salesperson?.full_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {commission.salesperson?.role}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {commission.commission_type === 'percentage' ? (
                            <><Percent className="w-3 h-3 mr-1" />Porcentagem</>
                          ) : (
                            <><DollarSign className="w-3 h-3 mr-1" />Fixo</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {commission.commission_type === 'percentage' 
                          ? `${commission.commission_percentage}%`
                          : `R$ ${commission.fixed_amount?.toFixed(2)}`
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={commission.is_active ? "default" : "secondary"}>
                          {commission.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(commission.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleCommissionStatus(commission.id, commission.is_active)}
                        >
                          {commission.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle>Registros de Comissões</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Venda</TableHead>
                    <TableHead>Valor da Venda</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissionRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {record.salesperson?.full_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.sale_type}-{record.sale_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        R$ {record.sale_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {record.commission_percentage}%
                      </TableCell>
                      <TableCell className="font-medium">
                        R$ {record.commission_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.payment_status === 'paid' ? "default" : "secondary"}>
                          {record.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(record.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {record.payment_status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markCommissionAsPaid(record.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Marcar como Pago
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}