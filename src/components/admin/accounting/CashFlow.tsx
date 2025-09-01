import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CashFlowItem {
  date: string;
  description: string;
  type: 'entrada' | 'saida';
  amount: number;
  category: string;
}

export const CashFlow = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [cashFlowData, setCashFlowData] = useState<CashFlowItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCashFlowData = async (date: Date) => {
    try {
      setLoading(true);
      const startDate = startOfMonth(date);
      const endDate = endOfMonth(date);

      const { data, error } = await supabase
        .from('cash_movements')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      const formattedData: CashFlowItem[] = (data || []).map(item => ({
        date: item.date,
        description: item.description,
        type: item.type as 'entrada' | 'saida',
        amount: item.amount,
        category: item.category
      }));

      setCashFlowData(formattedData);
    } catch (error) {
      console.error('Error fetching cash flow data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlowData(selectedDate);
  }, [selectedDate]);

  // Group data by date
  const groupedData = cashFlowData.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = [];
    }
    acc[item.date].push(item);
    return acc;
  }, {} as Record<string, CashFlowItem[]>);

  // Calculate daily balances
  const dailyBalances = Object.entries(groupedData).map(([date, items]) => {
    const entries = items.filter(item => item.type === 'entrada').reduce((sum, item) => sum + item.amount, 0);
    const exits = items.filter(item => item.type === 'saida').reduce((sum, item) => sum + item.amount, 0);
    
    return {
      date,
      entries,
      exits,
      net: entries - exits,
      items
    };
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate accumulated balance
  let accumulatedBalance = 0;
  const balancesWithAccumulated = dailyBalances.map(day => {
    accumulatedBalance += day.net;
    return {
      ...day,
      accumulated: accumulatedBalance
    };
  });

  const totalEntries = dailyBalances.reduce((sum, day) => sum + day.entries, 0);
  const totalExits = dailyBalances.reduce((sum, day) => sum + day.exits, 0);
  const netFlow = totalEntries - totalExits;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Fluxo de Caixa</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(selectedDate, "MMMM yyyy", { locale: { localize: { month: (n) => ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][n] } } })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <p className="text-sm text-muted-foreground">Total Entradas</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalEntries)}
              </p>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <p className="text-sm text-muted-foreground">Total Saídas</p>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalExits)}
              </p>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Fluxo Líquido</p>
              <p className={cn(
                "text-2xl font-bold",
                netFlow >= 0 ? "text-blue-600" : "text-red-600"
              )}>
                {formatCurrency(netFlow)}
              </p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Saldo Final</p>
              <p className={cn(
                "text-2xl font-bold",
                accumulatedBalance >= 0 ? "text-purple-600" : "text-red-600"
              )}>
                {formatCurrency(accumulatedBalance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Cash Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Fluxo Diário</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p>Carregando dados...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Entradas</TableHead>
                  <TableHead>Saídas</TableHead>
                  <TableHead>Líquido</TableHead>
                  <TableHead>Acumulado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balancesWithAccumulated.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell>
                      {new Date(day.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-green-600">
                      {formatCurrency(day.entries)}
                    </TableCell>
                    <TableCell className="text-red-600">
                      {formatCurrency(day.exits)}
                    </TableCell>
                    <TableCell className={day.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(day.net)}
                    </TableCell>
                    <TableCell className={day.accumulated >= 0 ? 'text-blue-600' : 'text-red-600'}>
                      {formatCurrency(day.accumulated)}
                    </TableCell>
                  </TableRow>
                ))}
                {balancesWithAccumulated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum movimento encontrado para este período
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};