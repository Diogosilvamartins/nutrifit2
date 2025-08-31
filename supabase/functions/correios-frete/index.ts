import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CorreiosRequest {
  cepOrigem: string;
  cepDestino: string;
  peso: number;
  comprimento?: number;
  altura?: number;
  largura?: number;
  servico?: string;
}

interface CorreiosResponse {
  valor: number;
  prazo: number;
  erro?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { cepOrigem, cepDestino, peso, comprimento = 16, altura = 2, largura = 11, servico = '04014' } = await req.json() as CorreiosRequest;

    // Validar CEPs
    if (!cepOrigem || !cepDestino || !peso) {
      return new Response(
        JSON.stringify({ erro: 'CEP de origem, destino e peso são obrigatórios' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Simular integração com Correios (implementação real requer contrato com os Correios)
    // Por enquanto, vamos usar uma lógica baseada na distância estimada por CEP
    const frete = await calcularFreteSimulado(cepOrigem, cepDestino, peso, servico);

    // Log da consulta para auditoria usando service role para segurança
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    await serviceSupabase
      .from('audit_logs')
      .insert({
        table_name: 'shipping',
        operation: 'CALCULATE',
        new_values: {
          cep_origem: cepOrigem,
          cep_destino: cepDestino,
          peso,
          valor_frete: frete.valor,
          prazo: frete.prazo,
          servico
        }
      });

    return new Response(
      JSON.stringify(frete),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro no cálculo do frete:', error);
    return new Response(
      JSON.stringify({ erro: 'Erro interno do servidor' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function calcularFreteSimulado(cepOrigem: string, cepDestino: string, peso: number, servico: string): Promise<CorreiosResponse> {
  // Limpar CEPs
  const origem = cepOrigem.replace(/\D/g, '');
  const destino = cepDestino.replace(/\D/g, '');
  
  // Validar formato dos CEPs
  if (origem.length !== 8 || destino.length !== 8) {
    throw new Error('CEP deve ter 8 dígitos');
  }

  // Simular cálculo baseado na região (primeiros dígitos do CEP)
  const regiaoOrigem = parseInt(origem.substring(0, 2));
  const regiaoDestino = parseInt(destino.substring(0, 2));
  
  // Calcular distância estimada baseada nas regiões
  const distanciaEstimada = Math.abs(regiaoOrigem - regiaoDestino);
  
  // Valores base por tipo de serviço
  const servicosBase = {
    '04014': { nome: 'SEDEX', valorBase: 15.00, prazoBase: 1 }, // SEDEX
    '04510': { nome: 'PAC', valorBase: 8.00, prazoBase: 5 },   // PAC
    '03220': { nome: 'SEDEX 10', valorBase: 25.00, prazoBase: 1 }, // SEDEX 10
  };

  const servicoInfo = servicosBase[servico as keyof typeof servicosBase] || servicosBase['04510'];
  
  // Calcular valor
  let valor = servicoInfo.valorBase;
  valor += (peso * 2.5); // R$ 2,50 por kg adicional
  valor += (distanciaEstimada * 0.5); // R$ 0,50 por "unidade de distância"
  
  // Calcular prazo
  let prazo = servicoInfo.prazoBase;
  if (distanciaEstimada > 10) prazo += 2;
  if (distanciaEstimada > 20) prazo += 3;
  
  // Adicionar variação de peso no prazo
  if (peso > 5) prazo += 1;
  if (peso > 10) prazo += 2;

  return {
    valor: Math.round(valor * 100) / 100, // Arredondar para 2 casas decimais
    prazo
  };
}

/* 
INTEGRAÇÃO REAL COM CORREIOS:
Para implementar a integração real, seria necessário:

1. Contratar o serviço de webservice dos Correios
2. Obter usuário e senha para autenticação
3. Usar a URL: https://apps.correios.com.br/SigepMasterJPA/AtendeClienteService/AtendeCliente
4. Implementar SOAP client ou usar API REST se disponível

Exemplo de payload SOAP real:
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <calcPrecoPrazo>
      <nCdEmpresa></nCdEmpresa>
      <sDsSenha></sDsSenha>
      <nCdServico>04014</nCdServico>
      <sCepOrigem>01310-100</sCepOrigem>
      <sCepDestino>20040-020</sCepDestino>
      <nVlPeso>1</nVlPeso>
      <nCdFormato>1</nCdFormato>
      <nVlComprimento>16</nVlComprimento>
      <nVlAltura>2</nVlAltura>
      <nVlLargura>11</nVlLargura>
      <nVlDiametro>0</nVlDiametro>
      <sCdMaoPropria>N</sCdMaoPropria>
      <nVlValorDeclarado>0</nVlValorDeclarado>
      <sCdAvisoRecebimento>N</sCdAvisoRecebimento>
    </calcPrecoPrazo>
  </soap:Body>
</soap:Envelope>
*/