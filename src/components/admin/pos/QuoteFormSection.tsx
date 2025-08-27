import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuoteFormSectionProps } from "@/types";

export const QuoteFormSection = ({
  validUntil,
  onValidUntilChange,
  paymentMethod,
  onPaymentMethodChange,
  notes,
  onNotesChange
}: QuoteFormSectionProps) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="valid_until">Válido até</Label>
        <Input
          id="valid_until"
          type="date"
          value={validUntil}
          onChange={(e) => onValidUntilChange(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="payment_method">Método de Pagamento *</Label>
        <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dinheiro">Dinheiro</SelectItem>
            <SelectItem value="pix">PIX</SelectItem>
            <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
            <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
};