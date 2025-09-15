import { Button } from "@/components/ui/button";
import { FileText, Receipt, MessageCircle, Printer } from "lucide-react";
import { ActionButtonsProps } from "@/types";

export const ActionButtons = ({
  onSaveQuote,
  onSaveSale,
  onGeneratePDF,
  onSendWhatsApp,
  onPrintThermal,
  loading,
  hasQuoteNumber,
  canSendWhatsApp
}: ActionButtonsProps) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        onClick={onSaveQuote}
        disabled={loading}
        variant="outline"
      >
        <FileText className="w-4 h-4 mr-2" />
        Orçamento
      </Button>
      <Button
        onClick={onSaveSale}
        disabled={loading}
      >
        <Receipt className="w-4 h-4 mr-2" />
        Venda
      </Button>
      
      {hasQuoteNumber && (
        <>
          <Button
            onClick={onGeneratePDF}
            variant="outline"
          >
            PDF
          </Button>
          <Button
            onClick={onPrintThermal}
            variant="outline"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            disabled={!canSendWhatsApp}
            onClick={onSendWhatsApp}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
        </>
      )}
    </div>
  );
};