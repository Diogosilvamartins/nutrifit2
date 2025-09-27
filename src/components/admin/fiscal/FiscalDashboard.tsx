import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Upload, 
  Search, 
  Calendar,
  Building2,
  User,
  TrendingUp,
  Eye,
  Trash2
} from 'lucide-react';
import { useFiscal } from '@/hooks/useFiscal';
import { XMLImportDialog } from './XMLImportDialog';
import { InvoiceDetailsDialog } from './InvoiceDetailsDialog';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function FiscalDashboard() {
  const { 
    invoices, 
    loading, 
    searchTerm, 
    setSearchTerm, 
    deleteInvoice 
  } = useFiscal();
  
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

  const filteredInvoices = invoices.filter(invoice => 
    invoice.numero_nfe.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.emit_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.dest_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.chave_nfe.includes(searchTerm)
  );

  const totalInvoices = invoices.length;
  const totalValue = invoices.reduce((sum, inv) => sum + inv.valor_total, 0);
  const entradas = invoices.filter(inv => inv.tipo_nf === 0).length;
  const saidas = invoices.filter(inv => inv.tipo_nf === 1).length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Módulo Fiscal</h1>
          <p className="text-muted-foreground">
            Gerencie notas fiscais eletrônicas (NFe)
          </p>
        </div>
        <Button onClick={() => setShowImportDialog(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Importar XML
        </Button>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de NFes
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              notas importadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valor Total
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              em notas fiscais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              NFes de Entrada
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entradas}</div>
            <p className="text-xs text-muted-foreground">
              compras/entradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              NFes de Saída
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{saidas}</div>
            <p className="text-xs text-muted-foreground">
              vendas/saídas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, empresa ou chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Lista de NFes */}
      <Card>
        <CardHeader>
          <CardTitle>Notas Fiscais Importadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando notas fiscais...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhuma nota fiscal encontrada' : 'Nenhuma nota fiscal importada'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">NFe {invoice.numero_nfe}</span>
                      <Badge variant={invoice.tipo_nf === 0 ? "secondary" : "outline"}>
                        {invoice.tipo_nf === 0 ? 'Entrada' : 'Saída'}
                      </Badge>
                      <Badge variant={invoice.situacao === 'autorizada' ? "default" : "secondary"}>
                        {invoice.situacao}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {invoice.emit_nome}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {invoice.dest_nome}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(invoice.dhemi), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(invoice.valor_total)}</div>
                      <div className="text-xs text-muted-foreground">
                        {invoice.items?.length || 0} itens
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedInvoice(invoice.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteInvoice(invoice.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <XMLImportDialog 
        open={showImportDialog} 
        onOpenChange={setShowImportDialog} 
      />
      
      {selectedInvoice && (
        <InvoiceDetailsDialog
          invoiceId={selectedInvoice}
          open={!!selectedInvoice}
          onOpenChange={(open) => !open && setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}