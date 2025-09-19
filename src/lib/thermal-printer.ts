interface ThermalPrintData {
  type: 'quote' | 'sale';
  number: string;
  saleDate?: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
    cpf?: string;
    zipcode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod?: string;
  validUntil?: string;
  notes?: string;
}

// Comandos ESC/POS para impressora térmica
const ESC = '\x1B';
const GS = '\x1D';

// Função para formatar telefone com DDD entre parênteses
const formatPhone = (phone: string): string => {
  if (!phone) return '';
  
  // Remove todos os caracteres não numéricos
  const numericPhone = phone.replace(/\D/g, '');
  
  // Se tem 11 dígitos (celular com DDD)
  if (numericPhone.length === 11) {
    return `(${numericPhone.slice(0, 2)}) ${numericPhone.slice(2, 7)}-${numericPhone.slice(7)}`;
  }
  
  // Se tem 10 dígitos (fixo com DDD)
  if (numericPhone.length === 10) {
    return `(${numericPhone.slice(0, 2)}) ${numericPhone.slice(2, 6)}-${numericPhone.slice(6)}`;
  }
  
  // Retorna o número original se não corresponder aos padrões
  return phone;
};

const commands = {
  // Configurações básicas
  initialize: ESC + '@',
  
  // Alinhamento
  alignLeft: ESC + 'a' + '\x00',
  alignCenter: ESC + 'a' + '\x01',
  alignRight: ESC + 'a' + '\x02',
  
  // Formatação de texto
  bold: ESC + 'E' + '\x01',
  boldOff: ESC + 'E' + '\x00',
  underline: ESC + '-' + '\x01',
  underlineOff: ESC + '-' + '\x00',
  
  // Tamanho da fonte
  fontNormal: ESC + '!' + '\x00',
  fontLarge: ESC + '!' + '\x10',
  fontDouble: ESC + '!' + '\x20',
  
  // Quebras e separadores
  newLine: '\n',
  lineSeparator: '------------------------------------------------\n',
  
  // Corte de papel
  cutPaper: GS + 'V' + '\x00',
  
  // Gaveta de dinheiro (se aplicável)
  openDrawer: ESC + 'p' + '\x00' + '\x19' + '\xfa'
};

export const printThermalReceipt = async (data: ThermalPrintData): Promise<void> => {
  try {
    // Verificar se a API Web Serial está disponível
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API não suportada neste navegador');
    }

    // Solicitar acesso à porta serial
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });

    const writer = port.writable.getWriter();
    
    // Função para enviar texto
    const print = async (text: string) => {
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(text));
    };

    // Inicializar impressora
    await print(commands.initialize);
    
    // CABEÇALHO
    await print(commands.alignCenter);
    await print(commands.bold);
    await print(commands.fontLarge);
    const header = data.type === 'quote' ? 'ORÇAMENTO' : 'PEDIDO';
    await print(`${header} Nº ${data.number}\n`);
    await print(commands.boldOff);
    await print(commands.fontNormal);
    
    // Data - sempre usar saleDate se disponível, senão usar data atual
    const displayDate = data.saleDate ? new Date(data.saleDate) : new Date();
    await print(`${displayDate.toLocaleDateString('pt-BR')}\n`);
    
    // CLIENTE
    await print(commands.alignLeft);
    await print(commands.bold);
    await print('CLIENTE:\n');
    await print(commands.boldOff);
    await print(`${data.customer.name}\n`);
    if (data.customer.phone) {
      await print(`Tel: ${formatPhone(data.customer.phone)}\n`);
    }
    if (data.customer.cpf) {
      await print(`CPF: ${data.customer.cpf}\n`);
    }
    
    // Endereço do cliente (se disponível)
    if (data.customer.street || data.customer.city) {
      if (data.customer.street) {
        let addressLine = data.customer.street;
        if (data.customer.number) {
          addressLine += `, ${data.customer.number}`;
        }
        if (data.customer.complement) {
          addressLine += ` - ${data.customer.complement}`;
        }
        await print(`${addressLine}\n`);
      }
      
      if (data.customer.neighborhood || data.customer.city) {
        let cityLine = '';
        if (data.customer.neighborhood) {
          cityLine = data.customer.neighborhood;
        }
        if (data.customer.city) {
          cityLine += cityLine ? ` - ${data.customer.city}` : data.customer.city;
        }
        if (data.customer.state) {
          cityLine += `/${data.customer.state}`;
        }
        if (data.customer.zipcode) {
          cityLine += ` - CEP: ${data.customer.zipcode}`;
        }
        if (cityLine) {
          await print(`${cityLine}\n`);
        }
      }
    }
    
    // Separador
    await print(commands.lineSeparator);
    
    // PRODUTOS
    await print(commands.bold);
    await print('QTD PRODUTO                      VALOR\n');
    await print(commands.boldOff);
    await print(commands.lineSeparator);
    
    // Lista de produtos
    data.items.forEach(async (item) => {
      // Formatar linha do produto para caber em 48 caracteres
      const qty = item.quantity.toString().padStart(3);
      const productName = item.name.length > 20 ? item.name.substring(0, 17) + '...' : item.name.padEnd(20);
      const price = `R$ ${item.total.toFixed(2).replace('.', ',')}`.padStart(10);
      
      await print(`${qty} ${productName} ${price}\n`);
    });
    
    await print(commands.lineSeparator);
    
    // TOTAL
    await print(commands.alignRight);
    if (data.discount > 0) {
      await print(`Subtotal: R$ ${data.subtotal.toFixed(2).replace('.', ',')}\n`);
      await print(`Desconto: R$ ${data.discount.toFixed(2).replace('.', ',')}\n`);
    }
    
    await print(commands.bold);
    await print(commands.fontLarge);
    await print(`TOTAL: R$ ${data.total.toFixed(2).replace('.', ',')}\n`);
    await print(commands.boldOff);
    await print(commands.fontNormal);
    
    // FORMA DE PAGAMENTO
    if (data.paymentMethod) {
      await print(commands.alignLeft);
      await print(commands.bold);
      await print('PAGAMENTO:\n');
      await print(commands.boldOff);
      await print(`${data.paymentMethod}\n`);
    }
    
    // VALIDADE (para orçamentos)
    if (data.type === 'quote' && data.validUntil) {
      const validDate = new Date(data.validUntil).toLocaleDateString('pt-BR');
      await print(`Válido até: ${validDate}\n`);
    }
    
    // OBSERVAÇÕES
    if (data.notes) {
      await print(commands.bold);
      await print('OBSERVAÇÕES:\n');
      await print(commands.boldOff);
      await print(`${data.notes}\n`);
    }
    
    // Separador
    await print(commands.lineSeparator);
    
    // RODAPÉ
    await print(commands.alignCenter);
    await print(commands.bold);
    await print('Nutri & Fit Suplementos\n');
    await print(commands.boldOff);
    await print('Av. Rio Doce, 1075 - Ilha dos Araújos\n');
    await print('Tel: (33) 98404-3348\nPIX: 33984043348 - Diogo S. Martins\n');
    // Sempre usar saleDate se disponível, senão usar data atual
    const footerDateTime = data.saleDate ? new Date(data.saleDate) : new Date();
    await print(`${footerDateTime.toLocaleString('pt-BR')}`);
    
    // Cortar papel imediatamente após a data/hora (sem quebra de linha extra)
    await print(commands.cutPaper);
    
    // Fechar conexão
    writer.releaseLock();
    await port.close();
    
  } catch (error) {
    console.error('Erro na impressão térmica:', error);
    throw error;
  }
};

// Função alternativa usando window.print() para impressoras configuradas no sistema
export const printThermalReceiptSystem = (data: ThermalPrintData): void => {
  console.log('Iniciando impressão térmica...', data);
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Pop-up bloqueado! Permita pop-ups para impressão.');
    throw new Error('Pop-up bloqueado! Permita pop-ups para impressão.');
  }

  const header = data.type === 'quote' ? 'ORÇAMENTO' : 'PEDIDO';
  
  printWindow.document.write(`
    <html>
      <head>
        <title>${header} ${data.number}</title>
        <style>
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              height: auto;
              font-family: monospace;
              font-size: 12px;
              line-height: 1.2;
            }
            .receipt {
              padding: 2mm 2mm 5mm; /* 5mm bottom after last line */
              width: 100%;
              box-sizing: border-box;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .large { font-size: 16px; }
            .separator { border-top: 1px dashed #000; margin: 2px 0; }
            .right { text-align: right; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="center bold large">${header} Nº ${data.number}</div>
          <div class="center">${data.saleDate ? new Date(data.saleDate).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</div>
          
          <div class="bold">CLIENTE:</div>
          <div>${data.customer.name}</div>
          ${data.customer.phone ? `<div>Tel: ${formatPhone(data.customer.phone)}</div>` : ''}
          ${data.customer.cpf ? `<div>CPF: ${data.customer.cpf}</div>` : ''}
          
          ${data.customer.street || data.customer.city ? `
            ${data.customer.street ? `
              <div>${data.customer.street}${data.customer.number ? ', ' + data.customer.number : ''}${data.customer.complement ? ' - ' + data.customer.complement : ''}</div>
            ` : ''}
            ${data.customer.neighborhood || data.customer.city ? `
              <div>${data.customer.neighborhood ? data.customer.neighborhood : ''}${data.customer.neighborhood && data.customer.city ? ' - ' : ''}${data.customer.city || ''}${data.customer.state ? '/' + data.customer.state : ''}${data.customer.zipcode ? ' - CEP: ' + data.customer.zipcode : ''}</div>
            ` : ''}
          ` : ''}
          
          <div class="separator"></div>
          <div class="bold">QTD PRODUTO                      VALOR</div>
          <div class="separator"></div>
          
          ${data.items.map(item => {
            const productName = item.name.length > 20 ? item.name.substring(0, 17) + '...' : item.name;
            return `<div>${item.quantity.toString().padStart(3)} ${productName.padEnd(20)} R$ ${item.total.toFixed(2).replace('.', ',').padStart(8)}</div>`;
          }).join('')}
          
          <div class="separator"></div>
          <div class="right">
            ${data.discount > 0 ? `<div>Subtotal: R$ ${data.subtotal.toFixed(2).replace('.', ',')}</div>` : ''}
            ${data.discount > 0 ? `<div>Desconto: R$ ${data.discount.toFixed(2).replace('.', ',')}</div>` : ''}
            <div class="bold large">TOTAL: R$ ${data.total.toFixed(2).replace('.', ',')}</div>
          </div>
          
          ${data.paymentMethod ? `
            <div class="bold">PAGAMENTO:</div>
            <div>${data.paymentMethod}</div>
          ` : ''}
          
          ${data.type === 'quote' && data.validUntil ? `
            <div>Válido até: ${new Date(data.validUntil).toLocaleDateString('pt-BR')}</div>
          ` : ''}
          
          ${data.notes ? `
            <div class="bold">OBSERVAÇÕES:</div>
            <div>${data.notes}</div>
          ` : ''}
          
          <div class="separator"></div>
          <div class="center bold">Nutri & Fit Suplementos</div>
          <div class="center">Av. Rio Doce, 1075 - Ilha dos Araújos</div>
          <div class="center">Tel: (33) 98404-3348</div>
          <div class="center">PIX: 33984043348 - Diogo S. Martins</div>
          <div class="center">${data.saleDate ? new Date(data.saleDate).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}</div>
        </div>
      </body>
    </html>
  `);
  
  console.log('Documento HTML criado, fechando e iniciando print...');
  printWindow.document.close();
  
  // Aguardar um momento para o documento ser processado
  setTimeout(() => {
    console.log('Chamando window.print()...');
    printWindow.print();
    setTimeout(() => {
      console.log('Fechando janela de impressão...');
      printWindow.close();
    }, 1000);
  }, 500);
};