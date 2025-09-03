import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingCart, Calendar, FileText, Package, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';

interface PurchaseEntry {
  id: string;
  product_name: string;
  supplier_name: string | null;
  quantity: number;
  unit_cost: number | null;
  total_cost: number;
  batch_number: string | null;
  expiry_date: string | null;
  created_at: string;
  notes: string | null;
  has_accounting_entry: boolean;
  accounting_entry_number: string | null;
  accounting_entry_status: string | null;
}

export const PurchaseEntries = () => {
  const [entries, setEntries] = useState<PurchaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    supplier: '',
  });

  useEffect(() => {
    fetchPurchaseEntries();
  }, []);

  const fetchPurchaseEntries = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('stock_movements')
        .select(`
          id,
          quantity,
          unit_cost,
          batch_number,
          expiry_date,
          created_at,
          notes,
          products:product_id (name),
          suppliers:supplier_id (name)
        `)
        .eq('movement_type', 'entrada')
        .order('created_at', { ascending: false });

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate + 'T23:59:59');
      }

      const { data: movements, error: movementsError } = await query;
      
      if (movementsError) throw movementsError;

      // Buscar lançamentos contábeis relacionados
      const entriesWithAccounting = await Promise.all(
        (movements || []).map(async (movement: any) => {
          const { data: accountingEntry } = await supabase
            .from('accounting_entries')
            .select('entry_number, status')
            .eq('reference_type', 'compra')
            .eq('reference_id', movement.id)
            .single();

          return {
            id: movement.id,
            product_name: movement.products?.name || 'Produto não encontrado',
            supplier_name: movement.suppliers?.name || null,
            quantity: movement.quantity,
            unit_cost: movement.unit_cost || 0,
            total_cost: (movement.unit_cost || 0) * movement.quantity,
            batch_number: movement.batch_number,
            expiry_date: movement.expiry_date,
            created_at: movement.created_at,
            notes: movement.notes,
            has_accounting_entry: !!accountingEntry,
            accounting_entry_number: accountingEntry?.entry_number || null,
            accounting_entry_status: accountingEntry?.status || null,
          };
        })
      );

      setEntries(entriesWithAccounting);
    } catch (error) {
      console.error('Erro ao buscar entradas de compra:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    fetchPurchaseEntries();
  };

  const getAccountingBadge = (hasEntry: boolean, status: string | null) => {
    if (!hasEntry) {
      return <Badge variant="outline" className="text-yellow-600">Sem Lançamento</Badge>;
    }
    
    switch (status) {
      case 'posted':
        return <Badge variant="default" className="text-green-600">Lançado</Badge>;
      case 'draft':
        return <Badge variant="secondary">Rascunho</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Entradas de Compra (Notas Fiscais)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label htmlFor="start-date">Data Inicial</Label>
              <Input
                id="start-date"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">Data Final</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={applyFilters} className="w-full">
                Aplicar Filtros
              </Button>
            </div>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Entradas</p>
                    <p className="text-2xl font-bold">{entries.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Com Lançamento</p>
                    <p className="text-2xl font-bold text-green-600">
                      {entries.filter(e => e.has_accounting_entry).length}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(entries.reduce((sum, e) => sum + e.total_cost, 0))}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Custo Unit.</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Lançamento Contábil</TableHead>
                <TableHead>Nº Lançamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Carregando entradas de compra...
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Nenhuma entrada de compra encontrada
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{entry.product_name}</TableCell>
                    <TableCell>{entry.supplier_name || 'Não informado'}</TableCell>
                    <TableCell>{entry.quantity} un</TableCell>
                    <TableCell>
                      {entry.unit_cost > 0 ? formatCurrency(entry.unit_cost) : 'N/A'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(entry.total_cost)}
                    </TableCell>
                    <TableCell>{entry.batch_number || 'N/A'}</TableCell>
                    <TableCell>
                      {entry.expiry_date ? 
                        new Date(entry.expiry_date).toLocaleDateString('pt-BR') : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      {getAccountingBadge(entry.has_accounting_entry, entry.accounting_entry_status)}
                    </TableCell>
                    <TableCell>
                      {entry.accounting_entry_number || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};