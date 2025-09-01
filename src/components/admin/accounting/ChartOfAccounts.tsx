import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAccounting } from '@/hooks/useAccounting';

export const ChartOfAccounts = () => {
  const { accounts } = useAccounting();

  const getAccountTypeBadge = (type: string) => {
    const colors = {
      ativo: 'bg-blue-100 text-blue-800',
      passivo: 'bg-red-100 text-red-800',
      patrimonio_liquido: 'bg-green-100 text-green-800',
      receita: 'bg-emerald-100 text-emerald-800',
      despesa: 'bg-orange-100 text-orange-800',
      custo: 'bg-purple-100 text-purple-800',
    };
    
    const labels = {
      ativo: 'Ativo',
      passivo: 'Passivo',
      patrimonio_liquido: 'Patrimônio Líquido',
      receita: 'Receita',
      despesa: 'Despesa',
      custo: 'Custo',
    };

    return (
      <Badge className={colors[type as keyof typeof colors]}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
  };

  const getAccountSubtypeBadge = (subtype: string) => {
    const labels = {
      ativo_circulante: 'Circulante',
      ativo_nao_circulante: 'Não Circulante',
      passivo_circulante: 'Circulante',
      passivo_nao_circulante: 'Não Circulante',
      patrimonio_liquido: 'Patrimônio Líquido',
      receita_operacional: 'Operacional',
      receita_nao_operacional: 'Não Operacional',
      despesa_operacional: 'Operacional',
      despesa_nao_operacional: 'Não Operacional',
      custo_fixo: 'Fixo',
      custo_variavel: 'Variável',
    };

    return (
      <Badge variant="outline">
        {labels[subtype as keyof typeof labels] || subtype}
      </Badge>
    );
  };

  // Group accounts by type for better organization
  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = [];
    }
    acc[account.account_type].push(account);
    return acc;
  }, {} as Record<string, typeof accounts>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getAccountTypeBadge(type)}
              <span>{typeAccounts.length} contas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Subtipo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typeAccounts
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono font-medium">
                        {account.code}
                      </TableCell>
                      <TableCell>{account.name}</TableCell>
                      <TableCell>{getAccountSubtypeBadge(account.account_subtype)}</TableCell>
                      <TableCell>
                        <Badge variant={account.is_active ? 'default' : 'secondary'}>
                          {account.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {accounts.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Nenhuma conta encontrada</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};