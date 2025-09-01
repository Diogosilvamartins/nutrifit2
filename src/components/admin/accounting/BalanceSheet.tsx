import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { useAccounting } from '@/hooks/useAccounting';
import type { BalanceSheetData } from '@/types/accounting';

export const BalanceSheet = () => {
  const { getBalanceSheet } = useAccounting();
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBalanceSheet = async () => {
      setLoading(true);
      const data = await getBalanceSheet();
      setBalanceSheet(data);
      setLoading(false);
    };

    loadBalanceSheet();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <p>Carregando balanço patrimonial...</p>
        </CardContent>
      </Card>
    );
  }

  if (!balanceSheet) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Erro ao carregar dados do balanço</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Ativo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-600">ATIVO</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold">Ativo Circulante</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(balanceSheet.ativo_circulante)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Ativo Não Circulante</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(balanceSheet.ativo_nao_circulante)}
                </TableCell>
              </TableRow>
              <TableRow className="border-t-2">
                <TableCell className="font-bold">TOTAL DO ATIVO</TableCell>
                <TableCell className="text-right font-bold">
                  {formatCurrency(balanceSheet.total_ativo)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Passivo e Patrimônio Líquido */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">PASSIVO + PATRIMÔNIO LÍQUIDO</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold">Passivo Circulante</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(balanceSheet.passivo_circulante)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Passivo Não Circulante</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(balanceSheet.passivo_nao_circulante)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Patrimônio Líquido</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(balanceSheet.patrimonio_liquido)}
                </TableCell>
              </TableRow>
              <TableRow className="border-t-2">
                <TableCell className="font-bold">TOTAL</TableCell>
                <TableCell className="text-right font-bold">
                  {formatCurrency(balanceSheet.total_passivo_patrimonio)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Análise do Balanço</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total de Ativos</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(balanceSheet.total_ativo)}
              </p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Patrimônio Líquido</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(balanceSheet.patrimonio_liquido)}
              </p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Liquidez Corrente</p>
              <p className="text-2xl font-bold text-purple-600">
                {balanceSheet.passivo_circulante > 0 
                  ? (balanceSheet.ativo_circulante / balanceSheet.passivo_circulante).toFixed(2)
                  : '∞'
                }
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Liquidez Corrente:</strong> Mede a capacidade da empresa de pagar suas obrigações de curto prazo.
              Um valor maior que 1 indica que a empresa tem ativos suficientes para cobrir suas dívidas de curto prazo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};