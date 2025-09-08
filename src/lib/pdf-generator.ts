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
  
  let yPos = 15;
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
  doc.text(storeName, centerText(storeName, 12), yPos);
  yPos += 15;
  
  // Address (centered, smaller font)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const address = 'Av. Rio Doce, 1075 - Ilha dos Araújos';
  doc.text(address, centerText(address, 8), yPos);
  yPos += 12;
  
  // PIX info (centered)
  const pixInfo = 'PIX: 33984043348 - Diogo S. Martins';
  doc.text(pixInfo, centerText(pixInfo, 8), yPos);
  yPos += 20;
  
  // Separator line
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;
  
  // Document type and number (centered)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const documentType = data.type === 'quote' ? 'ORÇAMENTO' : 'RECIBO DE VENDA';
  const docTitle = `${documentType} Nº ${data.number}`;
  doc.text(docTitle, centerText(docTitle, 10), yPos);
  yPos += 15;
  
  // Date (centered)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const currentDate = `Data: ${new Date().toLocaleDateString('pt-BR')}`;
  doc.text(currentDate, centerText(currentDate, 8), yPos);
  yPos += 20;
  
  // Customer info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE:', margin, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.customer.name}`, margin, yPos);
  yPos += 8;
  
  if (data.customer.phone) {
    doc.text(`Tel: ${data.customer.phone}`, margin, yPos);
    yPos += 8;
  }
  
  if (data.customer.cpf) {
    doc.text(`CPF: ${data.customer.cpf}`, margin, yPos);
    yPos += 8;
  }
  
  yPos += 10;
  
  // Separator line
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;
  
  // Items header
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ITENS:', margin, yPos);
  yPos += 12;
  
  // Items list
  doc.setFont('helvetica', 'normal');
  data.items.forEach(item => {
    // Check if we need a new page
    if (yPos > 750) {
      doc.addPage();
      yPos = 20;
    }
    
    // Product name (truncated if too long)
    const productName = item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name;
    doc.text(productName, margin, yPos);
    yPos += 10;
    
    // Quantity, price and total in one line
    const qtyPriceTotal = `${item.quantity}x R$ ${item.price.toFixed(2).replace('.', ',')} = R$ ${item.total.toFixed(2).replace('.', ',')}`;
    doc.text(qtyPriceTotal, margin + 5, yPos);
    yPos += 15;
  });
  
  // Separator line
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 12;
  
  // Totals
  doc.setFont('helvetica', 'normal');
  doc.text(`Subtotal: R$ ${data.subtotal.toFixed(2).replace('.', ',')}`, margin, yPos);
  yPos += 10;
  
  if (data.discount > 0) {
    doc.text(`Desconto: R$ ${data.discount.toFixed(2).replace('.', ',')}`, margin, yPos);
    yPos += 10;
  }
  
  // Total (bold and larger)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`TOTAL: R$ ${data.total.toFixed(2).replace('.', ',')}`, margin, yPos);
  yPos += 20;
  
  // Valid until (for quotes)
  if (data.type === 'quote' && data.validUntil) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const validDate = new Date(data.validUntil).toLocaleDateString('pt-BR');
    doc.text(`Válido até: ${validDate}`, margin, yPos);
    yPos += 15;
  }
  
  // Notes
  if (data.notes) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES:', margin, yPos);
    yPos += 10;
    
    doc.setFont('helvetica', 'normal');
    // Split notes to fit width
    const lines = doc.splitTextToSize(data.notes, contentWidth);
    doc.text(lines, margin, yPos);
    yPos += (lines.length * 8) + 15;
  }
  
  // Separator line
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;
  
  // Footer (centered)
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  const footerText = 'Sistema Nutri & Fit';
  doc.text(footerText, centerText(footerText, 6), yPos);
  yPos += 8;
  
  const dateFooter = new Date().toLocaleString('pt-BR');
  doc.text(dateFooter, centerText(dateFooter, 6), yPos);
  
  // Set final page height to fit content
  const finalHeight = yPos + 30;
  if (finalHeight < 841.89) {
    // Create new PDF with exact height needed
    const finalDoc = new jsPDF({
      unit: 'pt',
      format: [226.77, finalHeight],
      orientation: 'portrait'
    });
    
    // Copy content to new PDF with exact size
    const pdfData = doc.output('arraybuffer');
    finalDoc.addPage();
    // Return the original for now (jsPDF doesn't easily support dynamic height)
  }
  
  return doc.output('dataurlstring');
};