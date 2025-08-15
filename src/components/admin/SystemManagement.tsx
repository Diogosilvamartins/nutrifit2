import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Shield, 
  Download, 
  Activity, 
  AlertTriangle, 
  Database,
  Clock,
  Users,
  Package,
  TrendingUp,
  FileText
} from "lucide-react";

interface AuditLog {
  id: string;
  table_name: string;
  operation: string;
  record_id: string | null;
  old_values: any;
  new_values: any;
  created_at: string;
  user_id: string | null;
}

interface SystemHealth {
  timestamp: string;
  database_size: string;
  low_stock_products: number;
  total_products: number;
  active_users: number;
  recent_sales_7d: number;
  last_backup: string | null;
}

const SystemManagement = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  // Check if user has permission
  if (!isAdmin()) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Você não tem permissão para acessar esta funcionalidade.</p>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch audit logs
      const { data: logs, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;
      setAuditLogs(logs || []);

      // Fetch system health
      const { data: health, error: healthError } = await supabase
        .rpc('get_system_health');

      if (healthError) throw healthError;
      setSystemHealth(health as unknown as SystemHealth);

    } catch (error) {
      console.error('Error fetching system data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do sistema",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setBackupLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('create_data_backup');

      if (error) throw error;

      // Convert to downloadable file
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nutrifit-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup criado!",
        description: "Backup foi baixado com sucesso",
      });

      fetchData(); // Refresh data to show new backup in health
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar backup",
        variant: "destructive",
      });
    } finally {
      setBackupLoading(false);
    }
  };

  const getOperationBadge = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return <Badge variant="default">Criação</Badge>;
      case 'UPDATE':
        return <Badge variant="secondary">Atualização</Badge>;
      case 'DELETE':
        return <Badge variant="destructive">Exclusão</Badge>;
      case 'BACKUP':
        return <Badge variant="outline">Backup</Badge>;
      default:
        return <Badge variant="outline">{operation}</Badge>;
    }
  };

  const getTableDisplayName = (tableName: string) => {
    const names: Record<string, string> = {
      'products': 'Produtos',
      'customers': 'Clientes',
      'quotes': 'Orçamentos',
      'orders': 'Pedidos',
      'profiles': 'Usuários',
      'stock_movements': 'Estoque',
      'cash_movements': 'Financeiro',
      'system': 'Sistema'
    };
    return names[tableName] || tableName;
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Gerenciamento do Sistema
              </CardTitle>
              <CardDescription>
                Monitoramento, auditoria e configurações de segurança
              </CardDescription>
            </div>
            <Button 
              onClick={createBackup} 
              disabled={backupLoading}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {backupLoading ? 'Criando...' : 'Criar Backup'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="health" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="health">Saúde do Sistema</TabsTrigger>
          <TabsTrigger value="audit">Logs de Auditoria</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          {systemHealth && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Produtos em Estoque Baixo</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">
                    {systemHealth.low_stock_products}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    de {systemHealth.total_products} produtos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-500">
                    {systemHealth.active_users}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    usuários cadastrados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vendas (7 dias)</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {systemHealth.recent_sales_7d}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    vendas na última semana
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tamanho do Banco</CardTitle>
                  <Database className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-500">
                    {systemHealth.database_size}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    espaço utilizado
                  </p>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 lg:col-span-4">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Status do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    <div className="flex justify-between">
                      <span>Último Backup:</span>
                      <span className="text-muted-foreground">
                        {systemHealth.last_backup 
                          ? new Date(systemHealth.last_backup).toLocaleString('pt-BR')
                          : 'Nenhum backup encontrado'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sistema:</span>
                      <Badge variant="default">Online</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Última Atualização:</span>
                      <span className="text-muted-foreground">
                        {new Date(systemHealth.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Logs de Auditoria
              </CardTitle>
              <CardDescription>
                Histórico de todas as ações realizadas no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Operação</TableHead>
                    <TableHead>Usuário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>{getTableDisplayName(log.table_name)}</TableCell>
                      <TableCell>{getOperationBadge(log.operation)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.user_id ? 'Usuário autenticado' : 'Sistema'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Segurança</CardTitle>
              <CardDescription>
                Configure parâmetros de segurança e funcionamento do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Configurações Atuais</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Backup Automático:</span>
                      <Badge variant="default">Habilitado</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Alertas de Estoque:</span>
                      <Badge variant="default">Habilitado</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Retenção de Logs:</span>
                      <span>365 dias</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Timeout de Sessão:</span>
                      <span>8 horas</span>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 bg-orange-50 border-orange-200">
                  <h4 className="font-medium mb-2 text-orange-800">Alertas de Segurança</h4>
                  <div className="space-y-2 text-sm text-orange-700">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Configuração de OTP precisa ser ajustada</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Proteção contra senhas vazadas desabilitada</span>
                    </div>
                    <p className="mt-2 text-xs">
                      Essas configurações devem ser ajustadas no painel do Supabase para melhor segurança.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemManagement;