export interface FiscalInvoice {
  id: string;
  organization_id?: string;
  
  // Dados da NFe
  chave_nfe: string; // chave de 44 dígitos
  numero_nfe: string;
  serie: string;
  natureza_operacao: string;
  dhemi: string;
  dhsaient?: string;
  tipo_nf: number; // 0=entrada, 1=saida
  
  // Dados do emitente
  emit_cnpj?: string;
  emit_nome: string;
  emit_fantasia?: string;
  emit_endereco?: any;
  emit_ie?: string;
  
  // Dados do destinatário
  dest_cnpj_cpf?: string;
  dest_nome: string;
  dest_endereco?: any;
  
  // Totais
  valor_total: number;
  valor_produtos: number;
  valor_icms?: number;
  valor_ipi?: number;
  valor_pis?: number;
  valor_cofins?: number;
  valor_frete?: number;
  valor_desconto?: number;
  
  // Dados adicionais
  situacao: string;
  protocolo?: string;
  xml_content?: string;
  
  // Controle
  created_at: string;
  updated_at: string;
  created_by?: string;
  imported_at?: string;
  
  // Relacionamentos
  items?: FiscalInvoiceItem[];
}

export interface FiscalInvoiceItem {
  id: string;
  invoice_id: string;
  
  // Dados do produto
  numero_item: number;
  codigo_produto: string;
  ean?: string;
  descricao: string;
  ncm?: string;
  cfop?: string;
  unidade: string;
  
  // Quantidades e valores
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  
  // Impostos
  valor_icms?: number;
  valor_ipi?: number;
  valor_pis?: number;
  valor_cofins?: number;
  
  // Controle
  created_at: string;
}

export interface ParsedNFe {
  // Identificação
  chave: string;
  numero: string;
  serie: string;
  naturezaOperacao: string;
  dataEmissao: string;
  dataSaida?: string;
  tipoNF: number;
  
  // Emitente
  emitente: {
    cnpj?: string;
    nome: string;
    fantasia?: string;
    endereco?: any;
    ie?: string;
  };
  
  // Destinatário
  destinatario: {
    cnpjCpf?: string;
    nome: string;
    endereco?: any;
  };
  
  // Totais
  totais: {
    valorTotal: number;
    valorProdutos: number;
    valorICMS?: number;
    valorIPI?: number;
    valorPIS?: number;
    valorCOFINS?: number;
    valorFrete?: number;
    valorDesconto?: number;
  };
  
  // Itens
  itens: Array<{
    numeroItem: number;
    codigoProduto: string;
    ean?: string;
    descricao: string;
    ncm?: string;
    cfop?: string;
    unidade: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    impostos?: {
      icms?: number;
      ipi?: number;
      pis?: number;
      cofins?: number;
    };
  }>;
  
  // Protocolo
  protocolo?: string;
  situacao: string;
}