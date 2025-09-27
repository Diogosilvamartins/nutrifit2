import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  User, 
  Calendar, 
  FileText, 
  Package,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FiscalInvoice } from '@/types/fiscal';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InvoiceDetailsDialogProps {
  invoiceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDetailsDialog({ 
  invoiceId, 
  open, 
  onOpenChange 
}: InvoiceDetailsDialogProps) {
  const [invoice, setInvoice] = useState<FiscalInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && invoiceId) {
      fetchInvoiceDetails();
    }
  }, [open, invoiceId]);

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fiscal_invoices')
        .select(`
          *,
          items:fiscal_invoice_items(*)
        `)
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      setInvoice(data);
    } catch (error) {
      console.error('Erro ao carregar detalhes da NFe:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
          <div className="flex items-center justify-center py-8">
            Carregando detalhes da NFe...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!invoice) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            NFe não encontrada
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              NFe {invoice.numero_nfe} - Série {invoice.serie}
            </DialogTitle>
            <div className="flex gap-2">
              <Badge variant={invoice.tipo_nf === 0 ? "secondary" : "outline"}>
                {invoice.tipo_nf === 0 ? 'Entrada' : 'Saída'}
              </Badge>
              <Badge variant={invoice.situacao === 'autorizada' ? "default" : "secondary"}>
                {invoice.situacao}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Informações gerais */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">DADOS GERAIS</h3>
                <div className="space-y-1 text-sm">
                  <div>Chave: {invoice.chave_nfe}</div>
                  <div>Natureza: {invoice.natureza_operacao}</div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Emissão: {format(new Date(invoice.dhemi), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </div>
                  {invoice.dhsaient && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Saída: {format(new Date(invoice.dhsaient), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </div>
                  )}
                  {invoice.protocolo && (
                    <div>Protocolo: {invoice.protocolo}</div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">VALORES</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Produtos:</span>
                    <span className="font-medium">{formatCurrency(invoice.valor_produtos)}</span>
                  </div>
                  {(invoice.valor_frete ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Frete:</span>
                      <span>{formatCurrency(invoice.valor_frete!)}</span>
                    </div>
                  )}
                  {(invoice.valor_desconto ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Desconto:</span>
                      <span>-{formatCurrency(invoice.valor_desconto!)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>{formatCurrency(invoice.valor_total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Emitente */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                EMITENTE
              </h3>
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                <div className="font-medium">{invoice.emit_nome}</div>
                {invoice.emit_fantasia && (
                  <div className="text-muted-foreground">Nome fantasia: {invoice.emit_fantasia}</div>
                )}
                {invoice.emit_cnpj && (
                  <div>CNPJ: {invoice.emit_cnpj}</div>
                )}
                {invoice.emit_ie && (
                  <div>IE: {invoice.emit_ie}</div>
                )}
                {invoice.emit_endereco && (
                  <div className="text-muted-foreground">
                    {[
                      invoice.emit_endereco.logradouro,
                      invoice.emit_endereco.numero,
                      invoice.emit_endereco.bairro,
                      invoice.emit_endereco.municipio,
                      invoice.emit_endereco.uf
                    ].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Destinatário */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <User className="h-4 w-4" />
                DESTINATÁRIO
              </h3>
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                <div className="font-medium">{invoice.dest_nome}</div>
                {invoice.dest_cnpj_cpf && (
                  <div>
                    {invoice.dest_cnpj_cpf.length === 11 ? 'CPF' : 'CNPJ'}: {invoice.dest_cnpj_cpf}
                  </div>
                )}
                {invoice.dest_endereco && (
                  <div className="text-muted-foreground">
                    {[
                      invoice.dest_endereco.logradouro,
                      invoice.dest_endereco.numero,
                      invoice.dest_endereco.complemento,
                      invoice.dest_endereco.bairro,
                      invoice.dest_endereco.municipio,
                      invoice.dest_endereco.uf
                    ].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Itens */}
            {invoice.items && invoice.items.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  ITENS ({invoice.items.length})
                </h3>
                <div className="space-y-2">
                  {invoice.items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{item.descricao}</div>
                          <div className="text-sm text-muted-foreground">
                            Código: {item.codigo_produto}
                            {item.ean && ` | EAN: ${item.ean}`}
                            {item.ncm && ` | NCM: ${item.ncm}`}
                            {item.cfop && ` | CFOP: ${item.cfop}`}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-medium">{formatCurrency(item.valor_total)}</div>
                          <div className="text-muted-foreground">
                            {item.quantidade} {item.unidade} × {formatCurrency(item.valor_unitario)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Impostos do item */}
                      {((item.valor_icms ?? 0) > 0 || (item.valor_ipi ?? 0) > 0 || 
                        (item.valor_pis ?? 0) > 0 || (item.valor_cofins ?? 0) > 0) && (
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          {(item.valor_icms ?? 0) > 0 && <span>ICMS: {formatCurrency(item.valor_icms!)}</span>}
                          {(item.valor_ipi ?? 0) > 0 && <span>IPI: {formatCurrency(item.valor_ipi!)}</span>}
                          {(item.valor_pis ?? 0) > 0 && <span>PIS: {formatCurrency(item.valor_pis!)}</span>}
                          {(item.valor_cofins ?? 0) > 0 && <span>COFINS: {formatCurrency(item.valor_cofins!)}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totais de impostos */}
            {((invoice.valor_icms ?? 0) > 0 || (invoice.valor_ipi ?? 0) > 0 || 
              (invoice.valor_pis ?? 0) > 0 || (invoice.valor_cofins ?? 0) > 0) && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  IMPOSTOS TOTAIS
                </h3>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 text-sm">
                  {(invoice.valor_icms ?? 0) > 0 && (
                    <div className="bg-muted p-2 rounded text-center">
                      <div className="text-muted-foreground">ICMS</div>
                      <div className="font-medium">{formatCurrency(invoice.valor_icms!)}</div>
                    </div>
                  )}
                  {(invoice.valor_ipi ?? 0) > 0 && (
                    <div className="bg-muted p-2 rounded text-center">
                      <div className="text-muted-foreground">IPI</div>
                      <div className="font-medium">{formatCurrency(invoice.valor_ipi!)}</div>
                    </div>
                  )}
                  {(invoice.valor_pis ?? 0) > 0 && (
                    <div className="bg-muted p-2 rounded text-center">
                      <div className="text-muted-foreground">PIS</div>
                      <div className="font-medium">{formatCurrency(invoice.valor_pis!)}</div>
                    </div>
                  )}
                  {(invoice.valor_cofins ?? 0) > 0 && (
                    <div className="bg-muted p-2 rounded text-center">
                      <div className="text-muted-foreground">COFINS</div>
                      <div className="font-medium">{formatCurrency(invoice.valor_cofins!)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}