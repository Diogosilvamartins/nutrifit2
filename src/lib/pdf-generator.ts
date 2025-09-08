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
  // Create PDF with 80mm width (226.77 points) for thermal printer
  const doc = new jsPDF({
    unit: 'pt',
    format: [226.77, 841.89], // 80mm width, A4 height initially
    orientation: 'portrait'
  });
  
  // Colors for thermal printer (use black only)
  const textColor: [number, number, number] = [0, 0, 0];
  
  let currentY = 15;
  const pageWidth = 226.77;
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);
  
  // Helper function to center text
  const centerText = (text: string, fontSize: number) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    return (pageWidth - textWidth) / 2;
  };
  
  // Header - Store name (centered)
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  const storeName = "Nutri & Fit Suplementos";
  doc.text(storeName, centerText(storeName, 12), currentY);
  currentY += 15;
  
  // Address (centered, smaller font)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const address = 'Av. Rio Doce, 1075 - Ilha dos Araújos';
  doc.text(address, centerText(address, 8), currentY);
  currentY += 12;
  
  // PIX info (centered)
  const pixInfo = 'PIX: 33984043348 - Diogo S. Martins';
  doc.text(pixInfo, centerText(pixInfo, 8), currentY);
  currentY += 20;
  
  // Separator line
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 15;
  
  // Document type and number (centered)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const documentType = data.type === 'quote' ? 'ORÇAMENTO' : 'RECIBO DE VENDA';
  const docTitle = `${documentType} Nº ${data.number}`;
  doc.text(docTitle, centerText(docTitle, 10), currentY);
  currentY += 15;
  
  // Date (centered)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const currentDate = `Data: ${new Date().toLocaleDateString('pt-BR')}`;
  doc.text(currentDate, centerText(currentDate, 8), currentY);
  currentY += 20;
  
  // Customer info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE:', margin, currentY);
  currentY += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.customer.name}`, margin, currentY);
  currentY += 8;
  
  if (data.customer.phone) {
    doc.text(`Tel: ${data.customer.phone}`, margin, currentY);
    currentY += 8;
  }
  
  if (data.customer.cpf) {
    doc.text(`CPF: ${data.customer.cpf}`, margin, currentY);
    currentY += 8;
  }
  
  currentY += 10;
  
  // Separator line
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 15;
  
  // Items header
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ITENS:', margin, currentY);
  currentY += 12;
  
  // Items list
  doc.setFont('helvetica', 'normal');
  data.items.forEach(item => {
    // Check if we need a new page
    if (currentY > 750) {
      doc.addPage();
      currentY = 20;
    }
    
    // Product name (truncated if too long)
    const productName = item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name;
    doc.text(productName, margin, currentY);
    currentY += 10;
    
    // Quantity, price and total in one line
    const qtyPriceTotal = `${item.quantity}x R$ ${item.price.toFixed(2).replace('.', ',')} = R$ ${item.total.toFixed(2).replace('.', ',')}`;
    doc.text(qtyPriceTotal, margin + 5, currentY);
    currentY += 15;
  });
  
  // Separator line
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 12;
  
  // Totals
  doc.setFont('helvetica', 'normal');
  doc.text(`Subtotal: R$ ${data.subtotal.toFixed(2).replace('.', ',')}`, margin, currentY);
  currentY += 10;
  
  if (data.discount > 0) {
    doc.text(`Desconto: R$ ${data.discount.toFixed(2).replace('.', ',')}`, margin, currentY);
    currentY += 10;
  }
  
  // Total (bold and larger)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`TOTAL: R$ ${data.total.toFixed(2).replace('.', ',')}`, margin, currentY);
  currentY += 20;
  
  // Valid until (for quotes)
  if (data.type === 'quote' && data.validUntil) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const validDate = new Date(data.validUntil).toLocaleDateString('pt-BR');
    doc.text(`Válido até: ${validDate}`, margin, currentY);
    currentY += 15;
  }
  
  // Notes
  if (data.notes) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES:', margin, currentY);
    currentY += 10;
    
    doc.setFont('helvetica', 'normal');
    // Split notes to fit width
    const lines = doc.splitTextToSize(data.notes, contentWidth);
    doc.text(lines, margin, currentY);
    currentY += (lines.length * 8) + 15;
  }
  
  // Separator line
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;
  
  // Footer (centered)
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  const footerText = 'Sistema Nutri & Fit';
  doc.text(footerText, centerText(footerText, 6), currentY);
  currentY += 8;
  
  const dateFooter = new Date().toLocaleString('pt-BR');
  doc.text(dateFooter, centerText(dateFooter, 6), currentY);
  
  return doc.output('dataurlstring');
};