import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { useAccounting } from '@/hooks/useAccounting';
import type { IncomeStatementData } from '@/types/accounting';

export const IncomeStatement = () => {
  const { getIncomeStatement } = useAccounting();
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIncomeStatement = async () => {
      setLoading(true);
      const data = await getIncomeStatement();
      setIncomeStatement(data);
      setLoading(false);
    };

    loadIncomeStatement();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <p>Carregando demonstração do resultado...</p>
        </CardContent>
      </Card>
    );
  }

  if (!incomeStatement) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Erro ao carregar dados da DRE</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Demonstração do Resultado do Exercício (DRE)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              {/* Receitas */}
              <TableRow className="bg-green-50">
                <TableCell className="font-bold text-green-700" colSpan={2}>
                  RECEITAS
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-6">Receitas Operacionais</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(incomeStatement.receita_operacional)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-6">Outras Receitas</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(incomeStatement.receita_nao_operacional)}
                </TableCell>
              </TableRow>
              <TableRow className="border-b-2">
                <TableCell className="font-semibold">Total de Receitas</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(incomeStatement.total_receitas)}
                </TableCell>
              </TableRow>

              {/* Custos */}
              <TableRow className="bg-purple-50">
                <TableCell className="font-bold text-purple-700" colSpan={2}>
                  CUSTOS
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-6">Custos Fixos</TableCell>
                <TableCell className="text-right">
                  ({formatCurrency(incomeStatement.custo_fixo)})
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-6">Custos Variáveis</TableCell>
                <TableCell className="text-right">
                  ({formatCurrency(incomeStatement.custo_variavel)})
                </TableCell>
              </TableRow>
              <TableRow className="border-b-2">
                <TableCell className="font-semibold">Total de Custos</TableCell>
                <TableCell className="text-right font-semibold">
                  ({formatCurrency(incomeStatement.total_custos)})
                </TableCell>
              </TableRow>

              {/* Resultado Bruto */}
              <TableRow className="bg-blue-50">
                <TableCell className="font-bold text-blue-700">
                  RESULTADO BRUTO
                </TableCell>
                <TableCell className="text-right font-bold text-blue-700">
                  {formatCurrency(incomeStatement.resultado_bruto)}
                </TableCell>
              </TableRow>

              {/* Despesas */}
              <TableRow className="bg-orange-50">
                <TableCell className="font-bold text-orange-700" colSpan={2}>
                  DESPESAS
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-6">Despesas Operacionais</TableCell>
                <TableCell className="text-right">
                  ({formatCurrency(incomeStatement.despesa_operacional)})
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-6">Despesas Financeiras</TableCell>
                <TableCell className="text-right">
                  ({formatCurrency(incomeStatement.despesa_nao_operacional)})
                </TableCell>
              </TableRow>
              <TableRow className="border-b-2">
                <TableCell className="font-semibold">Total de Despesas</TableCell>
                <TableCell className="text-right font-semibold">
                  ({formatCurrency(incomeStatement.total_despesas)})
                </TableCell>
              </TableRow>

              {/* Resultado Líquido */}
              <TableRow className={`bg-${incomeStatement.resultado_liquido >= 0 ? 'green' : 'red'}-100`}>
                <TableCell className={`font-bold text-${incomeStatement.resultado_liquido >= 0 ? 'green' : 'red'}-700`}>
                  RESULTADO LÍQUIDO
                </TableCell>
                <TableCell className={`text-right font-bold text-${incomeStatement.resultado_liquido >= 0 ? 'green' : 'red'}-700`}>
                  {formatCurrency(incomeStatement.resultado_liquido)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Análises */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Margem Bruta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {incomeStatement.total_receitas > 0 
                ? ((incomeStatement.resultado_bruto / incomeStatement.total_receitas) * 100).toFixed(1)
                : '0'
              }%
            </p>
            <p className="text-sm text-muted-foreground">
              Receitas - Custos / Receitas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Margem Líquida</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {incomeStatement.total_receitas > 0 
                ? ((incomeStatement.resultado_liquido / incomeStatement.total_receitas) * 100).toFixed(1)
                : '0'
              }%
            </p>
            <p className="text-sm text-muted-foreground">
              Resultado Líquido / Receitas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Eficiência</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {incomeStatement.total_receitas > 0 
                ? ((incomeStatement.total_despesas / incomeStatement.total_receitas) * 100).toFixed(1)
                : '0'
              }%
            </p>
            <p className="text-sm text-muted-foreground">
              Despesas / Receitas
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};