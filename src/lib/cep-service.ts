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
  if (clean.length !== 8) return null;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000);

  try {
    const resp = await fetch(`https://viacep.com.br/ws/${clean}/json`, { signal: controller.signal });
    clearTimeout(id);
    if (!resp.ok) throw new Error('Erro ao buscar CEP');
    const data: AddressData = await resp.json();
    if (data.erro) return null;
    return data;
  } catch (e) {
    console.error('[CEP] Erro:', e);
    return null;
  }
}
