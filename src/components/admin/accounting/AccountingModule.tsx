import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, FileText, TrendingUp, DollarSign, PieChart, BarChart3 } from 'lucide-react';
import { AccountingEntries } from './AccountingEntries';
import { ChartOfAccounts } from './ChartOfAccounts';
import { BalanceSheet } from './BalanceSheet';
import { IncomeStatement } from './IncomeStatement';
import { CashFlow } from './CashFlow';
import { FinancialRatios } from './FinancialRatios';
import { PurchaseEntries } from '../PurchaseEntries';

export const AccountingModule = () => {
  const [activeTab, setActiveTab] = useState('entries');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Módulo Contábil</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="entries" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Lançamentos
          </TabsTrigger>
          <TabsTrigger value="purchases" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Compras
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Plano de Contas
          </TabsTrigger>
          <TabsTrigger value="balance" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Balanço
          </TabsTrigger>
          <TabsTrigger value="income" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            DRE
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Fluxo de Caixa
          </TabsTrigger>
          <TabsTrigger value="ratios" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Índices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-4">
          <AccountingEntries />
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          <PurchaseEntries />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <ChartOfAccounts />
        </TabsContent>

        <TabsContent value="balance" className="space-y-4">
          <BalanceSheet />
        </TabsContent>

        <TabsContent value="income" className="space-y-4">
          <IncomeStatement />
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <CashFlow />
        </TabsContent>

        <TabsContent value="ratios" className="space-y-4">
          <FinancialRatios />
        </TabsContent>
      </Tabs>
    </div>
  );
};