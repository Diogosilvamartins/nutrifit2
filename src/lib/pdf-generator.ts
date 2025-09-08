import jsPDF from 'jspdf';

interface PDFData {
  type: 'quote' | 'sale';
  number: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
    cpf?: string;
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
  validUntil?: string;
  notes?: string;
}

export const generatePDF = async (data: PDFData): Promise<string> => {
  const doc = new jsPDF();
  
  // Colors
  const primaryColor: [number, number, number] = [34, 84, 197]; // Blue
  const textColor: [number, number, number] = [33, 33, 33]; // Dark gray
  
  // Store info
  const storeName = "Nutri & Fit Suplementos";
  const storePhone = "(33) 99979-9138";
  const storeAddress = "Av. Rio Doce, 1075 Ilha - Governador Valadares/MG - CEP 35.020-500";
  
  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 220, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(storeName, 15, 18);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Av. Rio Doce, 1075 - Ilha dos Araújos', 15, 28);
  doc.text('PIX Celular 33984043348 - Diogo da Silva Martins', 15, 38);
  
  // Document type and number
  doc.setTextColor(...primaryColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const documentType = data.type === 'quote' ? 'ORÇAMENTO' : 'RECIBO DE VENDA';
  doc.text(`${documentType} Nº ${data.number}`, 15, 60);
  
  // Date
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const currentDate = new Date().toLocaleDateString('pt-BR');
  doc.text(`Data: ${currentDate}`, 15, 70);
  
  // Customer info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE:', 15, 95);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let yPos = 105;
  doc.text(`Nome: ${data.customer.name}`, 15, yPos);
  
  if (data.customer.phone) {
    yPos += 5;
    doc.text(`Telefone: ${data.customer.phone}`, 15, yPos);
  }
  
  if (data.customer.email) {
    yPos += 5;
    doc.text(`E-mail: ${data.customer.email}`, 15, yPos);
  }
  
  if (data.customer.cpf) {
    yPos += 5;
    doc.text(`CPF: ${data.customer.cpf}`, 15, yPos);
  }
  
  // Items table
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ITENS:', 15, yPos);
  
  // Table header
  yPos += 10;
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPos - 5, 180, 8, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUTO', 20, yPos);
  doc.text('QTD', 120, yPos);
  doc.text('VALOR UNIT.', 140, yPos);
  doc.text('TOTAL', 170, yPos);
  
  // Table items
  doc.setFont('helvetica', 'normal');
  yPos += 5;
  
  data.items.forEach((item, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    // Alternate row colors
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(15, yPos - 3, 180, 7, 'F');
    }
    
    doc.setTextColor(...textColor);
    doc.text(item.name.substring(0, 40), 20, yPos);
    doc.text(item.quantity.toString(), 120, yPos);
    doc.text(`R$ ${item.price.toFixed(2).replace('.', ',')}`, 140, yPos);
    doc.text(`R$ ${item.total.toFixed(2).replace('.', ',')}`, 170, yPos);
    
    yPos += 7;
  });
  
  // Totals
  yPos += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, yPos - 5, 195, yPos - 5);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Subtotal: R$ ${data.subtotal.toFixed(2).replace('.', ',')}`, 120, yPos);
  
  if (data.discount > 0) {
    yPos += 6;
    doc.setTextColor(220, 53, 69); // Red for discount
    doc.text(`Desconto: R$ ${data.discount.toFixed(2).replace('.', ',')}`, 120, yPos);
  }
  
  yPos += 6;
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`TOTAL: R$ ${data.total.toFixed(2).replace('.', ',')}`, 120, yPos);
  
  // Valid until (for quotes)
  if (data.type === 'quote' && data.validUntil) {
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const validDate = new Date(data.validUntil).toLocaleDateString('pt-BR');
    doc.text(`Válido até: ${validDate}`, 15, yPos);
  }
  
  // Notes
  if (data.notes) {
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES:', 15, yPos);
    
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(data.notes, 180);
    doc.text(lines, 15, yPos);
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Gerado automaticamente pelo sistema Nutri & Fit', 15, pageHeight - 15);
  doc.text(`Documento gerado em: ${new Date().toLocaleString('pt-BR')}`, 15, pageHeight - 10);
  
  // Return PDF as data URL
  return doc.output('dataurlstring');
};