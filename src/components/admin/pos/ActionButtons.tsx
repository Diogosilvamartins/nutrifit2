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
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 md:static md:z-auto bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border p-2 pb-[calc(env(safe-area-inset-bottom)+12px)] md:p-0">
        <div className="mx-auto max-w-screen-sm px-2">
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
        </div>
      </div>
      {/* Spacer para evitar que o conteúdo fique sob o rodapé fixo no mobile */}
      <div className="h-20 md:hidden" aria-hidden="true" />
    </>
  );
};