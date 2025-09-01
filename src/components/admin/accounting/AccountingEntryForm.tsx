import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAccounting } from '@/hooks/useAccounting';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const entrySchema = z.object({
  entry_date: z.date(),
  description: z.string().min(1, 'Descrição é obrigatória'),
});

type EntryItem = {
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  description?: string;
};

interface AccountingEntryFormProps {
  onSuccess: () => void;
}

export const AccountingEntryForm = ({ onSuccess }: AccountingEntryFormProps) => {
  const { accounts, createEntry, loading } = useAccounting();
  const [items, setItems] = useState<EntryItem[]>([]);
  const [newItem, setNewItem] = useState<EntryItem>({
    account_id: '',
    debit_amount: 0,
    credit_amount: 0,
    description: ''
  });

  const form = useForm<z.infer<typeof entrySchema>>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      entry_date: new Date(),
      description: '',
    },
  });

  const addItem = () => {
    if (!newItem.account_id || (newItem.debit_amount === 0 && newItem.credit_amount === 0)) {
      return;
    }
    
    setItems([...items, newItem]);
    setNewItem({
      account_id: '',
      debit_amount: 0,
      credit_amount: 0,
      description: ''
    });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const getTotalDebits = () => items.reduce((sum, item) => sum + item.debit_amount, 0);
  const getTotalCredits = () => items.reduce((sum, item) => sum + item.credit_amount, 0);
  const isBalanced = () => Math.abs(getTotalDebits() - getTotalCredits()) < 0.01;

  const onSubmit = async (data: z.infer<typeof entrySchema>) => {
    if (!isBalanced()) {
      alert('Os débitos devem ser iguais aos créditos');
      return;
    }

    if (items.length === 0) {
      alert('Adicione pelo menos um item ao lançamento');
      return;
    }

    const success = await createEntry({
      entry_date: data.entry_date,
      description: data.description,
      items
    });

    if (success) {
      form.reset();
      setItems([]);
      onSuccess();
    }
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? `${account.code} - ${account.name}` : '';
  };

  return (
    <div className="space-y-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Header */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="entry_date">Data do Lançamento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !form.watch('entry_date') && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch('entry_date') ? 
                    format(form.watch('entry_date'), "dd/MM/yyyy") : 
                    <span>Selecione uma data</span>
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={form.watch('entry_date')}
                  onSelect={(date) => form.setValue('entry_date', date || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              {...form.register('description')}
              placeholder="Descrição do lançamento"
            />
          </div>
        </div>

        {/* Add Item Form */}
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Conta</Label>
                <Select 
                  value={newItem.account_id} 
                  onValueChange={(value) => setNewItem({...newItem, account_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Débito</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.debit_amount}
                  onChange={(e) => setNewItem({...newItem, debit_amount: parseFloat(e.target.value) || 0})}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label>Crédito</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.credit_amount}
                  onChange={(e) => setNewItem({...newItem, credit_amount: parseFloat(e.target.value) || 0})}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  placeholder="Descrição do item"
                />
              </div>
            </div>

            <Button type="button" onClick={addItem} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Item
            </Button>
          </CardContent>
        </Card>

        {/* Items Table */}
        {items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Itens do Lançamento</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead>Débito</TableHead>
                    <TableHead>Crédito</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{getAccountName(item.account_id)}</TableCell>
                      <TableCell>{formatCurrency(item.debit_amount)}</TableCell>
                      <TableCell>{formatCurrency(item.credit_amount)}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => removeItem(index)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="space-x-4">
                    <span>Total Débitos: {formatCurrency(getTotalDebits())}</span>
                    <span>Total Créditos: {formatCurrency(getTotalCredits())}</span>
                  </div>
                  <div className={cn(
                    "font-semibold",
                    isBalanced() ? "text-green-600" : "text-red-600"
                  )}>
                    {isBalanced() ? "✓ Balanceado" : "✗ Não Balanceado"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={loading || !isBalanced() || items.length === 0}
          >
            {loading ? 'Salvando...' : 'Salvar Lançamento'}
          </Button>
        </div>
      </form>
    </div>
  );
};