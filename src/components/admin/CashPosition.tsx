import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, Calendar, TrendingUp, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Função para formatar valores em reais
import { formatCurrency } from "@/lib/utils";

interface CashEntry {
  id: string;
  type: 'entrada' | 'saida' | 'ajuste';
  amount: number;
  description: string;
  category: string;
  date: string;
  created_at: string;
}

interface CashSummary {
  opening_balance: number;
  total_entries: number;
  total_exits: number;
  current_balance: number;
  sales_cash: number;
  sales_pix: number;
  expenses: number;
  bank_balance: number;
}

export default function CashPosition() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [summary, setSummary] = useState<CashSummary>({
    opening_balance: 0,
    total_entries: 0,
    total_exits: 0,
    current_balance: 0,
    sales_cash: 0,
    sales_pix: 0,
    expenses: 0,
    bank_balance: 0,
  });
  const [adjustCash, setAdjustCash] = useState(0);
  const [adjustBank, setAdjustBank] = useState(0);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [newEntry, setNewEntry] = useState({
    type: 'entrada' as 'entrada' | 'saida',
    amount: 0,
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'daily' | 'period'>('daily');
  const { toast } = useToast();

  useEffect(() => {
    fetchCashData();
  }, [selectedDate, startDate, endDate, viewMode]);

  const fetchCashData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'daily') {
        // Fetch cash movements from database for a single day
        const { data: movements, error: movementsError } = await supabase
          .from('cash_movements')
          .select('*')
          .eq('date', selectedDate)
          .order('created_at', { ascending: true });

        if (movementsError) throw movementsError;

        // Get summary using database function
        const { data: summaryData, error: summaryError } = await supabase
          .rpc('get_cash_summary_for_date', { target_date: selectedDate });

        if (summaryError) throw summaryError;

        const summary = summaryData?.[0] || {
          opening_balance: 0,
          total_entries: 0,
          total_exits: 0,
          current_balance: 0,
          sales_cash: 0,
          sales_pix: 0,
          expenses: 0,
          bank_balance: 0,
        };

        // Convert database movements to our format
        const cashEntries: CashEntry[] = movements?.map(movement => ({
          id: movement.id,
          type: movement.type as 'entrada' | 'saida' | 'ajuste',
          amount: Number(movement.amount),
          description: movement.description,
          category: movement.category,
          date: movement.date,
          created_at: movement.created_at,
        })) || [];

        // Compute totals from fetched movements and calculate cumulative balances
        const computedTotals = cashEntries.reduce(
          (acc, e) => {
            if (e.type === 'entrada') {
              if (e.category === 'dinheiro') {
                acc.cashEntries += e.amount;
              } else if (['pix', 'cartao_debito', 'cartao_credito'].includes(e.category)) {
                acc.bankEntries += e.amount;
              }
              acc.entries += e.amount;
            }
            if (e.type === 'saida') {
              if (e.category === 'dinheiro' || e.category === 'sangria') {
                acc.cashExits += e.amount;
              } else if (['pix', 'cartao_debito', 'cartao_credito', 'despesa'].includes(e.category)) {
                acc.bankExits += e.amount;
              }
              acc.exits += e.amount;
            }
            if (e.type === 'ajuste') {
              if (e.category === 'saldo_caixa') {
                acc.cashAdjust += e.amount;
              } else if (e.category === 'saldo_banco') {
                acc.bankAdjust += e.amount;
              }
            }
            return acc;
          },
          { entries: 0, exits: 0, cashEntries: 0, cashExits: 0, bankEntries: 0, bankExits: 0, cashAdjust: 0, bankAdjust: 0 }
        );

        // Calculate cumulative balances
        const cashBalance = computedTotals.cashEntries - computedTotals.cashExits + computedTotals.cashAdjust;
        const bankBalance = computedTotals.bankEntries - computedTotals.bankExits + computedTotals.bankAdjust;

        setEntries(cashEntries);
        setSummary({
          opening_balance: Number(summary.opening_balance),
          total_entries: Number(computedTotals.entries),
          total_exits: Number(computedTotals.exits),
          current_balance: cashBalance,
          sales_cash: Number(computedTotals.cashEntries),
          sales_pix: Number(computedTotals.bankEntries),
          expenses: Number(computedTotals.exits),
          bank_balance: bankBalance,
        });
        
      } else {
        // Fetch accumulated data for the period
        const { data: movements, error: movementsError } = await supabase
          .from('cash_movements')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('created_at', { ascending: true });

        if (movementsError) throw movementsError;

        // Get accumulated summary for the period
        const { data: summaryData, error: summaryError } = await supabase
          .rpc('get_accumulated_cash_summary', { 
            start_date: startDate,
            end_date: endDate
          });

        if (summaryError) throw summaryError;

        if (summaryData && summaryData.length > 0) {
          const periodData = summaryData[0];
          
          // Convert database movements to our format
          const cashEntries: CashEntry[] = movements?.map(movement => ({
            id: movement.id,
            type: movement.type as 'entrada' | 'saida' | 'ajuste',
            amount: Number(movement.amount),
            description: movement.description,
            category: movement.category,
            date: movement.date,
            created_at: movement.created_at,
          })) || [];

          // Compute totals from fetched movements and calculate cumulative balances
          const computedTotals = cashEntries.reduce(
            (acc, e) => {
              if (e.type === 'entrada') {
                if (e.category === 'dinheiro') {
                  acc.cashEntries += e.amount;
                } else if (['pix', 'cartao_debito', 'cartao_credito'].includes(e.category)) {
                  acc.bankEntries += e.amount;
                }
                acc.entries += e.amount;
              }
              if (e.type === 'saida') {
                if (e.category === 'dinheiro' || e.category === 'sangria') {
                  acc.cashExits += e.amount;
                } else if (['pix', 'cartao_debito', 'cartao_credito', 'despesa'].includes(e.category)) {
                  acc.bankExits += e.amount;
                }
                acc.exits += e.amount;
              }
              if (e.type === 'ajuste') {
                if (e.category === 'saldo_caixa') {
                  acc.cashAdjust += e.amount;
                } else if (e.category === 'saldo_banco') {
                  acc.bankAdjust += e.amount;
                }
              }
              return acc;
            },
            { entries: 0, exits: 0, cashEntries: 0, cashExits: 0, bankEntries: 0, bankExits: 0, cashAdjust: 0, bankAdjust: 0 }
          );

          // Calculate cumulative balances for the period
          const cashBalance = computedTotals.cashEntries - computedTotals.cashExits + computedTotals.cashAdjust;
          const bankBalance = computedTotals.bankEntries - computedTotals.bankExits + computedTotals.bankAdjust;

          setEntries(cashEntries);
          setSummary({
            opening_balance: 0,
            total_entries: Number(computedTotals.entries),
            total_exits: Number(computedTotals.exits),
            current_balance: cashBalance,
            sales_cash: Number(computedTotals.cashEntries),
            sales_pix: Number(computedTotals.bankEntries),
            expenses: Number(computedTotals.exits),
            bank_balance: bankBalance,
          });
        }
      }

    } catch (error) {
      console.error("Error fetching cash data:", error);
      toast({
        title: "Erro ao carregar dados do caixa",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addCashEntry = async () => {
    if (!newEntry.description || newEntry.amount <= 0) {
      toast({
        title: "Dados inválidos",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('cash_movements')
        .insert({
          date: newEntry.date,
          type: newEntry.type,
          amount: newEntry.amount,
          description: newEntry.description,
          category: newEntry.category,
        });

      if (error) throw error;

      // Reset form
      setNewEntry({
        type: 'entrada',
        amount: 0,
        description: '',
        category: '',
        date: selectedDate,
      });

      // Refresh data
      fetchCashData();

      toast({
        title: "Movimentação registrada!",
        description: `${newEntry.type === 'entrada' ? 'Entrada' : 'Saída'} de ${formatCurrency(newEntry.amount)} registrada.`
      });
    } catch (error) {
      console.error("Error adding cash entry:", error);
      toast({
        title: "Erro ao registrar movimentação",
        variant: "destructive"
      });
    }
  };

  const adjustBalances = async () => {
    try {
      const { error } = await supabase
        .rpc('adjust_cash_balance', {
          target_date: selectedDate,
          cash_amount: adjustCash,
          bank_amount: adjustBank
        });

      if (error) throw error;

      // Reset form and close dialog
      setAdjustCash(0);
      setAdjustBank(0);
      setShowAdjustDialog(false);

      // Refresh data
      fetchCashData();

      toast({
        title: "Saldos ajustados!",
        description: `Saldos ajustados para ${new Date(selectedDate).toLocaleDateString('pt-BR')}.`
      });
    } catch (error) {
      console.error("Error adjusting balances:", error);
      toast({
        title: "Erro ao ajustar saldos",
        variant: "destructive"
      });
    }
  };

  const exportCashReport = () => {
    const csvContent = [
      ['Data', 'Tipo', 'Valor', 'Descrição', 'Categoria'].join(','),
      ...entries.map(entry => [
        entry.date,
        entry.type === 'entrada' ? 'Entrada' : 'Saída',
        `${formatCurrency(entry.amount)}`,
        entry.description,
        entry.category
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-caixa-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Relatório exportado!",
      description: "O arquivo CSV foi baixado com sucesso."
    });
  };

  const getCategoryBadge = (category: string) => {
    const categoryConfig = {
      abertura: { label: "Abertura", variant: "secondary" as const },
      dinheiro: { label: "Dinheiro", variant: "default" as const },
      pix: { label: "PIX", variant: "default" as const },
      cartao_debito: { label: "Cartão Débito", variant: "outline" as const },
      cartao_credito: { label: "Cartão Crédito", variant: "outline" as const },
      despesa: { label: "Despesa", variant: "destructive" as const },
      sangria: { label: "Sangria", variant: "destructive" as const },
      saldo_caixa: { label: "Ajuste Caixa", variant: "secondary" as const },
      saldo_banco: { label: "Ajuste Banco", variant: "secondary" as const },
    };

    const config = categoryConfig[category as keyof typeof categoryConfig] || 
                  { label: category, variant: "secondary" as const };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Carregando posição do caixa...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Posição do Caixa</h2>
            <p className="text-muted-foreground">
              {viewMode === 'daily' ? 'Controle das movimentações diárias do caixa' : 'Saldo acumulado do período'}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Action Buttons */}
            <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Settings className="w-4 h-4 mr-2" />
                  Ajustar Saldos
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background border z-50">
                <DialogHeader>
                  <DialogTitle>
                    Ajustar Saldos - {viewMode === 'daily' 
                      ? new Date(selectedDate).toLocaleDateString('pt-BR')
                      : `${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`
                    }
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="adjust-cash">Saldo em Dinheiro (R$)</Label>
                    <Input
                      id="adjust-cash"
                      type="number"
                      step="0.01"
                      value={adjustCash}
                      onChange={(e) => setAdjustCash(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adjust-bank">Saldo no Banco (R$)</Label>
                    <Input
                      id="adjust-bank"
                      type="number"
                      step="0.01"
                      value={adjustBank}
                      onChange={(e) => setAdjustBank(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                    />
                  </div>
                  <Button onClick={adjustBalances} className="w-full">
                    Ajustar Saldos
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button onClick={exportCashReport} variant="outline" size="sm" className="h-9">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          {/* Mode Selector */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Visualização</Label>
            <div className="flex bg-muted rounded-lg p-1">
              <Button 
                variant={viewMode === 'daily' ? 'default' : 'ghost'}
                onClick={() => setViewMode('daily')}
                size="sm"
                className="h-8 text-sm"
              >
                Diário
              </Button>
              <Button 
                variant={viewMode === 'period' ? 'default' : 'ghost'}
                onClick={() => setViewMode('period')}
                size="sm"
                className="h-8 text-sm"
              >
                Período
              </Button>
            </div>
          </div>
          
          {/* Date Inputs */}
          {viewMode === 'daily' ? (
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Data</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40 h-9"
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">Data Início</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40 h-9"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">Data Fim</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40 h-9"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {viewMode === 'daily' ? 'Saldo Inicial' : 'Período'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {viewMode === 'daily' 
                ? formatCurrency(summary.opening_balance)
                : `${new Date(startDate).toLocaleDateString('pt-BR')} - ${new Date(endDate).toLocaleDateString('pt-BR')}`
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {viewMode === 'daily' ? 'Abertura do caixa' : 'Dados acumulados'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.total_entries)}
            </div>
            <p className="text-xs text-muted-foreground">
              {viewMode === 'daily' 
                ? `Dinheiro: ${formatCurrency(summary.sales_cash)} | PIX: ${formatCurrency(summary.sales_pix)}`
                : 'Total de entradas no período'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saídas</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.total_exits)}
            </div>
            <p className="text-xs text-muted-foreground">
              {viewMode === 'daily' ? 'Despesas e sangrias' : 'Total de saídas'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Caixa</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.current_balance)}
            </div>
            <p className="text-xs text-muted-foreground">Saldo em dinheiro</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Banco</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(summary.bank_balance)}
            </div>
            <p className="text-xs text-muted-foreground">Saldo bancário</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Movement */}
      <Card>
        <CardHeader>
          <CardTitle>Nova Movimentação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select 
                value={newEntry.type} 
                onValueChange={(value: 'entrada' | 'saida') => setNewEntry({ ...newEntry, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={newEntry.amount}
                onChange={(e) => setNewEntry({ ...newEntry, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select 
                value={newEntry.category} 
                onValueChange={(value) => setNewEntry({ ...newEntry, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {newEntry.type === 'entrada' ? (
                    <>
                      <SelectItem value="dinheiro">Dinheiro (Caixa)</SelectItem>
                      <SelectItem value="pix">PIX (Banco)</SelectItem>
                      <SelectItem value="cartao_debito">Cartão Débito (Banco)</SelectItem>
                      <SelectItem value="cartao_credito">Cartão Crédito (Banco)</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="dinheiro">Saída do Caixa</SelectItem>
                      <SelectItem value="sangria">Sangria (Caixa)</SelectItem>
                      <SelectItem value="despesa">Despesa (Banco)</SelectItem>
                      <SelectItem value="pix">Transferência PIX (Banco)</SelectItem>
                      <SelectItem value="cartao_debito">Débito Automático (Banco)</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={newEntry.description}
                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                placeholder="Descrição da movimentação"
              />
            </div>

            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={newEntry.date}
                onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={addCashEntry} className="w-full">
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movements List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {viewMode === 'daily' ? 'Movimentações do Dia' : 'Movimentações do Período'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhuma movimentação registrada {viewMode === 'daily' ? 'para esta data' : 'neste período'}.
            </p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${entry.type === 'entrada' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <h4 className="font-medium">{entry.description}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(entry.created_at).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {getCategoryBadge(entry.category)}
                    <span className={`font-bold ${entry.type === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.type === 'entrada' ? '+' : '-'}{formatCurrency(entry.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}