export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  account_type: 'ativo' | 'passivo' | 'patrimonio_liquido' | 'receita' | 'despesa' | 'custo';
  account_subtype: 'ativo_circulante' | 'ativo_nao_circulante' | 'passivo_circulante' | 'passivo_nao_circulante' | 'patrimonio_liquido' | 'receita_operacional' | 'receita_nao_operacional' | 'despesa_operacional' | 'despesa_nao_operacional' | 'custo_fixo' | 'custo_variavel';
  parent_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface AccountingEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  total_amount: number;
  status: 'draft' | 'posted' | 'canceled';
  entry_type: 'manual' | 'automatic' | 'adjustment';
  reference_type?: string;
  reference_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  items?: AccountingEntryItem[];
}

export interface AccountingEntryItem {
  id: string;
  entry_id: string;
  account_id: string;
  account?: ChartOfAccount;
  debit_amount: number;
  credit_amount: number;
  description?: string;
  created_at: string;
}

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Budget {
  id: string;
  budget_year: number;
  budget_month?: number;
  account_id: string;
  account?: ChartOfAccount;
  cost_center_id?: string;
  cost_center?: CostCenter;
  budgeted_amount: number;
  actual_amount: number;
  variance_amount: number;
  variance_percentage?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface AccountingFormData {
  entry_date: Date;
  description: string;
  items: {
    account_id: string;
    debit_amount: number;
    credit_amount: number;
    description?: string;
  }[];
}

export interface BalanceSheetData {
  ativo_circulante: number;
  ativo_nao_circulante: number;
  total_ativo: number;
  passivo_circulante: number;
  passivo_nao_circulante: number;
  patrimonio_liquido: number;
  total_passivo_patrimonio: number;
}

export interface IncomeStatementData {
  receita_operacional: number;
  receita_nao_operacional: number;
  total_receitas: number;
  custo_fixo: number;
  custo_variavel: number;
  total_custos: number;
  despesa_operacional: number;
  despesa_nao_operacional: number;
  total_despesas: number;
  resultado_bruto: number;
  resultado_liquido: number;
}

export interface CashFlowData {
  date: string;
  opening_balance: number;
  receipts: number;
  payments: number;
  closing_balance: number;
}

export interface FinancialRatio {
  name: string;
  value: number;
  formula: string;
  interpretation: string;
}