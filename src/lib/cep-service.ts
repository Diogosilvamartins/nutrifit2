export interface AddressData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ddd: string;
  erro?: boolean;
}

function sanitizeCEP(cep: string) {
  return (cep || '').replace(/\D/g, '').slice(0,8);
}

export async function fetchAddressByCEP(cep: string): Promise<AddressData | null> {
  const clean = sanitizeCEP(cep);
  console.log('[CEP] CEP sanitizado:', clean);
  
  if (clean.length !== 8) {
    console.log('[CEP] CEP inválido - deve ter 8 dígitos:', clean.length);
    return null;
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `https://viacep.com.br/ws/${clean}/json/`;
    console.log('[CEP] Fazendo requisição para:', url);
    
    const resp = await fetch(url, { 
      signal: controller.signal,
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    clearTimeout(id);
    console.log('[CEP] Status da resposta:', resp.status);
    
    if (!resp.ok) {
      throw new Error(`Erro HTTP ${resp.status}: ${resp.statusText}`);
    }
    
    const data: AddressData = await resp.json();
    console.log('[CEP] Dados recebidos:', data);
    
    if (data.erro) {
      console.log('[CEP] API retornou erro para o CEP');
      return null;
    }
    
    return data;
  } catch (e) {
    console.error('[CEP] Erro detalhado:', {
      message: (e as Error).message,
      name: (e as Error).name,
      cep: clean,
      error: e
    });
    return null;
  }
}
