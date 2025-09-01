import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import type { 
  ChartOfAccount, 
  AccountingEntry, 
  AccountingEntryItem, 
  CostCenter, 
  Budget,
  AccountingFormData,
  BalanceSheetData,
  IncomeStatementData,
  CashFlowData,
  FinancialRatio
} from '@/types/accounting';

export const useAccounting = () => {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch chart of accounts
  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code');
      
      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar plano de contas',
        variant: 'destructive',
      });
    }
  };

  // Fetch accounting entries
  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('accounting_entries')
        .select(`
          *,
          items:accounting_entry_items(
            *,
            account:chart_of_accounts(*)
          )
        `)
        .order('entry_date', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar lançamentos',
        variant: 'destructive',
      });
    }
  };

  // Fetch cost centers
  const fetchCostCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('is_active', true)
        .order('code');
      
      if (error) throw error;
      setCostCenters(data || []);
    } catch (error) {
      console.error('Error fetching cost centers:', error);
    }
  };

  // Fetch budgets
  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          account:chart_of_accounts(*),
          cost_center:cost_centers(*)
        `)
        .order('budget_year', { ascending: false })
        .order('budget_month', { ascending: false });
      
      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  };

  // Create accounting entry
  const createEntry = async (formData: AccountingFormData): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Generate entry number
      const { data: entryNumber } = await supabase.rpc('generate_entry_number');
      
      // Create entry
      const { data: entry, error: entryError } = await supabase
        .from('accounting_entries')
        .insert({
          entry_number: entryNumber,
          entry_date: formData.entry_date.toISOString().split('T')[0],
          description: formData.description,
          entry_type: 'manual',
          status: 'posted'
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create entry items
      const items = formData.items.map(item => ({
        entry_id: entry.id,
        account_id: item.account_id,
        debit_amount: item.debit_amount,
        credit_amount: item.credit_amount,
        description: item.description
      }));

      const { error: itemsError } = await supabase
        .from('accounting_entry_items')
        .insert(items);

      if (itemsError) throw itemsError;

      toast({
        title: 'Sucesso',
        description: 'Lançamento criado com sucesso',
      });

      fetchEntries();
      return true;
    } catch (error) {
      console.error('Error creating entry:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar lançamento',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get balance sheet data
  const getBalanceSheet = async (): Promise<BalanceSheetData | null> => {
    try {
      const { data, error } = await supabase
        .from('accounting_entry_items')
        .select(`
          debit_amount,
          credit_amount,
          account:chart_of_accounts(account_type, account_subtype)
        `);

      if (error) throw error;

      const balances: Record<string, number> = {};
      
      data?.forEach(item => {
        const key = `${item.account.account_type}_${item.account.account_subtype}`;
        if (!balances[key]) balances[key] = 0;
        
        // Assets and expenses increase with debit
        if (item.account.account_type === 'ativo' || item.account.account_type === 'despesa' || item.account.account_type === 'custo') {
          balances[key] += item.debit_amount - item.credit_amount;
        } else {
          // Liabilities, equity and revenues increase with credit
          balances[key] += item.credit_amount - item.debit_amount;
        }
      });

      const ativo_circulante = balances['ativo_ativo_circulante'] || 0;
      const ativo_nao_circulante = balances['ativo_ativo_nao_circulante'] || 0;
      const passivo_circulante = balances['passivo_passivo_circulante'] || 0;
      const passivo_nao_circulante = balances['passivo_passivo_nao_circulante'] || 0;
      const patrimonio_liquido = balances['patrimonio_liquido_patrimonio_liquido'] || 0;

      return {
        ativo_circulante,
        ativo_nao_circulante,
        total_ativo: ativo_circulante + ativo_nao_circulante,
        passivo_circulante,
        passivo_nao_circulante,
        patrimonio_liquido,
        total_passivo_patrimonio: passivo_circulante + passivo_nao_circulante + patrimonio_liquido
      };
    } catch (error) {
      console.error('Error getting balance sheet:', error);
      return null;
    }
  };

  // Get income statement data
  const getIncomeStatement = async (): Promise<IncomeStatementData | null> => {
    try {
      const { data, error } = await supabase
        .from('accounting_entry_items')
        .select(`
          debit_amount,
          credit_amount,
          account:chart_of_accounts(account_type, account_subtype)
        `);

      if (error) throw error;

      const balances: Record<string, number> = {};
      
      data?.forEach(item => {
        const key = `${item.account.account_type}_${item.account.account_subtype}`;
        if (!balances[key]) balances[key] = 0;
        
        // Revenues increase with credit (negative for income statement)
        if (item.account.account_type === 'receita') {
          balances[key] += item.credit_amount - item.debit_amount;
        } else if (item.account.account_type === 'despesa' || item.account.account_type === 'custo') {
          // Expenses and costs increase with debit
          balances[key] += item.debit_amount - item.credit_amount;
        }
      });

      const receita_operacional = balances['receita_receita_operacional'] || 0;
      const receita_nao_operacional = balances['receita_receita_nao_operacional'] || 0;
      const total_receitas = receita_operacional + receita_nao_operacional;
      
      const custo_fixo = balances['custo_custo_fixo'] || 0;
      const custo_variavel = balances['custo_custo_variavel'] || 0;
      const total_custos = custo_fixo + custo_variavel;
      
      const despesa_operacional = balances['despesa_despesa_operacional'] || 0;
      const despesa_nao_operacional = balances['despesa_despesa_nao_operacional'] || 0;
      const total_despesas = despesa_operacional + despesa_nao_operacional;

      const resultado_bruto = total_receitas - total_custos;
      const resultado_liquido = resultado_bruto - total_despesas;

      return {
        receita_operacional,
        receita_nao_operacional,
        total_receitas,
        custo_fixo,
        custo_variavel,
        total_custos,
        despesa_operacional,
        despesa_nao_operacional,
        total_despesas,
        resultado_bruto,
        resultado_liquido
      };
    } catch (error) {
      console.error('Error getting income statement:', error);
      return null;
    }
  };

  // Calculate financial ratios
  const getFinancialRatios = async (): Promise<FinancialRatio[]> => {
    try {
      const [balanceSheet, incomeStatement] = await Promise.all([
        getBalanceSheet(),
        getIncomeStatement()
      ]);

      if (!balanceSheet || !incomeStatement) return [];

      const ratios: FinancialRatio[] = [];

      // Liquidez Corrente
      if (balanceSheet.passivo_circulante > 0) {
        ratios.push({
          name: 'Liquidez Corrente',
          value: balanceSheet.ativo_circulante / balanceSheet.passivo_circulante,
          formula: 'Ativo Circulante / Passivo Circulante',
          interpretation: 'Mede a capacidade de pagamento de curto prazo'
        });
      }

      // Margem Líquida
      if (incomeStatement.total_receitas > 0) {
        ratios.push({
          name: 'Margem Líquida (%)',
          value: (incomeStatement.resultado_liquido / incomeStatement.total_receitas) * 100,
          formula: '(Resultado Líquido / Receita Total) × 100',
          interpretation: 'Percentual de lucro sobre as vendas'
        });
      }

      // ROE (Return on Equity)
      if (balanceSheet.patrimonio_liquido > 0) {
        ratios.push({
          name: 'ROE (%)',
          value: (incomeStatement.resultado_liquido / balanceSheet.patrimonio_liquido) * 100,
          formula: '(Resultado Líquido / Patrimônio Líquido) × 100',
          interpretation: 'Retorno sobre o patrimônio líquido'
        });
      }

      return ratios;
    } catch (error) {
      console.error('Error calculating ratios:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchEntries();
    fetchCostCenters();
    fetchBudgets();
  }, []);

  return {
    accounts,
    entries,
    costCenters,
    budgets,
    loading,
    createEntry,
    fetchEntries,
    getBalanceSheet,
    getIncomeStatement,
    getFinancialRatios
  };
};