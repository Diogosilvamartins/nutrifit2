import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { QuoteFormSectionProps, PaymentSplit } from "@/types";
import { Trash2, Plus } from "lucide-react";

export const QuoteFormSection = ({
  validUntil,
  onValidUntilChange,
  paymentMethod,
  onPaymentMethodChange,
  notes,
  onNotesChange,
  totalAmount,
  paymentSplits,
  onPaymentSplitsChange,
  hasPartialPayment,
  onPartialPaymentToggle
}: QuoteFormSectionProps) => {

  const addPaymentSplit = () => {
    const remainingAmount = totalAmount - paymentSplits.reduce((sum, split) => sum + split.amount, 0);
    const newSplit: PaymentSplit = {
      payment_method: 'dinheiro',
      amount: remainingAmount > 0 ? remainingAmount : 0
    };
    onPaymentSplitsChange([...paymentSplits, newSplit]);
  };

  const updatePaymentSplit = (index: number, field: keyof PaymentSplit, value: any) => {
    const updatedSplits = paymentSplits.map((split, i) => 
      i === index ? { ...split, [field]: value } : split
    );
    onPaymentSplitsChange(updatedSplits);
  };

  const removePaymentSplit = (index: number) => {
    onPaymentSplitsChange(paymentSplits.filter((_, i) => i !== index));
  };

  const getTotalSplits = () => paymentSplits.reduce((sum, split) => sum + split.amount, 0);
  const getRemainingAmount = () => totalAmount - getTotalSplits();

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

      <div className="flex items-center space-x-2">
        <Switch
          id="partial-payment"
          checked={hasPartialPayment}
          onCheckedChange={onPartialPaymentToggle}
        />
        <Label htmlFor="partial-payment">Pagamento Parcial</Label>
      </div>

      {!hasPartialPayment ? (
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Formas de Pagamento
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPaymentSplit}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentSplits.map((split, index) => (
              <div key={index} className="flex items-center space-x-2 p-3 border rounded">
                <Select
                  value={split.payment_method}
                  onValueChange={(value) => updatePaymentSplit(index, 'payment_method', value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                    <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                  </SelectContent>
                </Select>
                
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={totalAmount}
                  placeholder="Valor"
                  value={split.amount || ''}
                  onChange={(e) => updatePaymentSplit(index, 'amount', parseFloat(e.target.value) || 0)}
                  className="w-32"
                />
                
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removePaymentSplit(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {paymentSplits.length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <div className="flex justify-between text-sm">
                  <span>Total dos pagamentos:</span>
                  <span>R$ {getTotalSplits().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total da venda:</span>
                  <span>R$ {totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Restante:</span>
                  <span className={getRemainingAmount() === 0 ? 'text-green-600' : 'text-red-600'}>
                    R$ {getRemainingAmount().toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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