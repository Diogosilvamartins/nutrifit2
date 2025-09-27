import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FiscalInvoice, FiscalInvoiceItem, ParsedNFe } from '@/types/fiscal';
import { useToast } from '@/hooks/use-toast';

interface FiscalContextType {
  invoices: FiscalInvoice[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  importXML: (xmlContent: string) => Promise<boolean>;
  deleteInvoice: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const FiscalContext = createContext<FiscalContextType | undefined>(undefined);

export function FiscalProvider({ children }: { children: React.ReactNode }) {
  const [invoices, setInvoices] = useState<FiscalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fiscal_invoices')
        .select(`
          *,
          items:fiscal_invoice_items(*)
        `)
        .order('dhemi', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Erro ao carregar notas fiscais:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as notas fiscais",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const parseNFeXML = (xmlContent: string): ParsedNFe | null => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      // Verificar se há erros no parsing
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Erro ao fazer parsing do XML');
      }

      // Extrair dados da NFe
      const infNFe = xmlDoc.querySelector('infNFe');
      const ide = xmlDoc.querySelector('ide');
      const emit = xmlDoc.querySelector('emit');
      const dest = xmlDoc.querySelector('dest');
      const total = xmlDoc.querySelector('total ICMSTot');
      const detItems = xmlDoc.querySelectorAll('det');
      const protNFe = xmlDoc.querySelector('protNFe');

      if (!infNFe || !ide || !emit || !dest) {
        throw new Error('XML inválido: estrutura NFe não encontrada');
      }

      // Extrair chave NFe
      const chaveNFe = infNFe.getAttribute('Id')?.replace('NFe', '') || '';
      
      // Dados principais
      const numeroNF = ide.querySelector('nNF')?.textContent || '';
      const serie = ide.querySelector('serie')?.textContent || '';
      const naturezaOperacao = ide.querySelector('natOp')?.textContent || '';
      const dataEmissao = ide.querySelector('dhEmi')?.textContent || '';
      const dataSaida = ide.querySelector('dhSaiEnt')?.textContent || '';
      const tipoNF = parseInt(ide.querySelector('tpNF')?.textContent || '1');

      // Dados do emitente
      const emitente = {
        cnpj: emit.querySelector('CNPJ')?.textContent,
        nome: emit.querySelector('xNome')?.textContent || '',
        fantasia: emit.querySelector('xFant')?.textContent,
        ie: emit.querySelector('IE')?.textContent,
        endereco: {
          logradouro: emit.querySelector('enderEmit xLgr')?.textContent,
          numero: emit.querySelector('enderEmit nro')?.textContent,
          bairro: emit.querySelector('enderEmit xBairro')?.textContent,
          municipio: emit.querySelector('enderEmit xMun')?.textContent,
          uf: emit.querySelector('enderEmit UF')?.textContent,
          cep: emit.querySelector('enderEmit CEP')?.textContent,
        }
      };

      // Dados do destinatário
      const destinatario = {
        cnpjCpf: dest.querySelector('CNPJ')?.textContent || dest.querySelector('CPF')?.textContent,
        nome: dest.querySelector('xNome')?.textContent || '',
        endereco: {
          logradouro: dest.querySelector('enderDest xLgr')?.textContent,
          numero: dest.querySelector('enderDest nro')?.textContent,
          complemento: dest.querySelector('enderDest xCpl')?.textContent,
          bairro: dest.querySelector('enderDest xBairro')?.textContent,
          municipio: dest.querySelector('enderDest xMun')?.textContent,
          uf: dest.querySelector('enderDest UF')?.textContent,
          cep: dest.querySelector('enderDest CEP')?.textContent,
        }
      };

      // Totais
      const totais = {
        valorTotal: parseFloat(total?.querySelector('vNF')?.textContent || '0'),
        valorProdutos: parseFloat(total?.querySelector('vProd')?.textContent || '0'),
        valorICMS: parseFloat(total?.querySelector('vICMS')?.textContent || '0'),
        valorIPI: parseFloat(total?.querySelector('vIPI')?.textContent || '0'),
        valorPIS: parseFloat(total?.querySelector('vPIS')?.textContent || '0'),
        valorCOFINS: parseFloat(total?.querySelector('vCOFINS')?.textContent || '0'),
        valorFrete: parseFloat(total?.querySelector('vFrete')?.textContent || '0'),
        valorDesconto: parseFloat(total?.querySelector('vDesc')?.textContent || '0'),
      };

      // Itens
      const itens = Array.from(detItems).map((det, index) => {
        const prod = det.querySelector('prod');
        const imposto = det.querySelector('imposto');
        
        return {
          numeroItem: index + 1,
          codigoProduto: prod?.querySelector('cProd')?.textContent || '',
          ean: prod?.querySelector('cEAN')?.textContent,
          descricao: prod?.querySelector('xProd')?.textContent || '',
          ncm: prod?.querySelector('NCM')?.textContent,
          cfop: prod?.querySelector('CFOP')?.textContent,
          unidade: prod?.querySelector('uCom')?.textContent || '',
          quantidade: parseFloat(prod?.querySelector('qCom')?.textContent || '0'),
          valorUnitario: parseFloat(prod?.querySelector('vUnCom')?.textContent || '0'),
          valorTotal: parseFloat(prod?.querySelector('vProd')?.textContent || '0'),
          impostos: {
            icms: parseFloat(imposto?.querySelector('ICMS vICMS')?.textContent || '0'),
            ipi: parseFloat(imposto?.querySelector('IPI vIPI')?.textContent || '0'),
            pis: parseFloat(imposto?.querySelector('PIS vPIS')?.textContent || '0'),
            cofins: parseFloat(imposto?.querySelector('COFINS vCOFINS')?.textContent || '0'),
          }
        };
      });

      // Protocolo
      const protocolo = protNFe?.querySelector('nProt')?.textContent;
      const situacao = protNFe?.querySelector('xMotivo')?.textContent?.includes('Autorizado') ? 'autorizada' : 'pendente';

      return {
        chave: chaveNFe,
        numero: numeroNF,
        serie,
        naturezaOperacao,
        dataEmissao,
        dataSaida,
        tipoNF,
        emitente,
        destinatario,
        totais,
        itens,
        protocolo,
        situacao
      };

    } catch (error) {
      console.error('Erro ao fazer parsing do XML:', error);
      return null;
    }
  };

  const importXML = async (xmlContent: string): Promise<boolean> => {
    try {
      const parsedData = parseNFeXML(xmlContent);
      if (!parsedData) {
        toast({
          title: "Erro",
          description: "Não foi possível processar o XML da NFe",
          variant: "destructive",
        });
        return false;
      }

      // Verificar se a NFe já existe
      const { data: existing } = await supabase
        .from('fiscal_invoices')
        .select('id')
        .eq('chave_nfe', parsedData.chave)
        .single();

      if (existing) {
        toast({
          title: "Aviso",
          description: "Esta nota fiscal já foi importada",
          variant: "destructive",
        });
        return false;
      }

      // Inserir a nota fiscal
      const { data: invoice, error: invoiceError } = await supabase
        .from('fiscal_invoices')
        .insert({
          chave_nfe: parsedData.chave,
          numero_nfe: parsedData.numero,
          serie: parsedData.serie,
          natureza_operacao: parsedData.naturezaOperacao,
          dhemi: parsedData.dataEmissao,
          dhsaient: parsedData.dataSaida,
          tipo_nf: parsedData.tipoNF,
          emit_cnpj: parsedData.emitente.cnpj,
          emit_nome: parsedData.emitente.nome,
          emit_fantasia: parsedData.emitente.fantasia,
          emit_endereco: parsedData.emitente.endereco,
          emit_ie: parsedData.emitente.ie,
          dest_cnpj_cpf: parsedData.destinatario.cnpjCpf,
          dest_nome: parsedData.destinatario.nome,
          dest_endereco: parsedData.destinatario.endereco,
          valor_total: parsedData.totais.valorTotal,
          valor_produtos: parsedData.totais.valorProdutos,
          valor_icms: parsedData.totais.valorICMS,
          valor_ipi: parsedData.totais.valorIPI,
          valor_pis: parsedData.totais.valorPIS,
          valor_cofins: parsedData.totais.valorCOFINS,
          valor_frete: parsedData.totais.valorFrete,
          valor_desconto: parsedData.totais.valorDesconto,
          situacao: parsedData.situacao,
          protocolo: parsedData.protocolo,
          xml_content: xmlContent,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Inserir os itens
      if (parsedData.itens.length > 0) {
        const items = parsedData.itens.map(item => ({
          invoice_id: invoice.id,
          numero_item: item.numeroItem,
          codigo_produto: item.codigoProduto,
          ean: item.ean,
          descricao: item.descricao,
          ncm: item.ncm,
          cfop: item.cfop,
          unidade: item.unidade,
          quantidade: item.quantidade,
          valor_unitario: item.valorUnitario,
          valor_total: item.valorTotal,
          valor_icms: item.impostos?.icms || 0,
          valor_ipi: item.impostos?.ipi || 0,
          valor_pis: item.impostos?.pis || 0,
          valor_cofins: item.impostos?.cofins || 0,
        }));

        const { error: itemsError } = await supabase
          .from('fiscal_invoice_items')
          .insert(items);

        if (itemsError) throw itemsError;
      }

      toast({
        title: "Sucesso",
        description: `NFe ${parsedData.numero} importada com sucesso`,
      });

      await fetchInvoices();
      return true;

    } catch (error) {
      console.error('Erro ao importar XML:', error);
      toast({
        title: "Erro",
        description: "Erro ao importar a nota fiscal",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteInvoice = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('fiscal_invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Nota fiscal excluída com sucesso",
      });

      await fetchInvoices();
      return true;
    } catch (error) {
      console.error('Erro ao excluir nota fiscal:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir a nota fiscal",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return (
    <FiscalContext.Provider value={{
      invoices,
      loading,
      searchTerm,
      setSearchTerm,
      importXML,
      deleteInvoice,
      refetch: fetchInvoices
    }}>
      {children}
    </FiscalContext.Provider>
  );
}

export function useFiscal() {
  const context = useContext(FiscalContext);
  if (context === undefined) {
    throw new Error('useFiscal must be used within a FiscalProvider');
  }
  return context;
}