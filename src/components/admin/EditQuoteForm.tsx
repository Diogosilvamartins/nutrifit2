import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCPF, formatPhone } from "@/lib/validators";

interface Quote {
  id: string;
  quote_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_cpf?: string;
  products: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
  }>;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  quote_type: "quote" | "sale";
  status: string;
  valid_until?: string;
  notes?: string;
  payment_method?: string;
  payment_status?: string;
  shipping_cost?: number;
  created_at: string;
  updated_at: string;
}

interface EditQuoteFormProps {
  quote: Quote;
  onSave: (updatedQuote: Partial<Quote>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export default function EditQuoteForm({ quote, onSave, onCancel, isLoading }: EditQuoteFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    customer_name: quote.customer_name || "",
    customer_phone: quote.customer_phone || "",
    customer_email: quote.customer_email || "",
    customer_cpf: quote.customer_cpf || "",
    discount_amount: quote.discount_amount || 0,
    notes: quote.notes || "",
    valid_until: quote.valid_until || "",
    payment_method: quote.payment_method || ""
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar método de pagamento para vendas
    if (quote.quote_type === "sale" && !formData.payment_method) {
      toast({
        title: "Método de pagamento obrigatório",
        description: "Selecione um método de pagamento para a venda.",
        variant: "destructive"
      });
      return;
    }
    
    const updatedQuote = {
      ...formData,
      customer_cpf: formData.customer_cpf ? formData.customer_cpf.replace(/\D/g, '') : "",
      customer_phone: formData.customer_phone ? formData.customer_phone.replace(/\D/g, '') : ""
    };
    
    onSave(updatedQuote);
  };

  const handlePhoneBlur = () => {
    if (formData.customer_phone) {
      setFormData(prev => ({
        ...prev,
        customer_phone: formatPhone(prev.customer_phone)
      }));
    }
  };

  const handleCPFBlur = () => {
    if (formData.customer_cpf) {
      setFormData(prev => ({
        ...prev,
        customer_cpf: formatCPF(prev.customer_cpf)
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Dados do Cliente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customer_name">Nome do Cliente</Label>
            <Input
              id="customer_name"
              value={formData.customer_name}
              onChange={(e) => handleInputChange('customer_name', e.target.value)}
              placeholder="Nome completo"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="customer_phone">Telefone</Label>
            <Input
              id="customer_phone"
              value={formData.customer_phone}
              onChange={(e) => handleInputChange('customer_phone', e.target.value)}
              onBlur={handlePhoneBlur}
              placeholder="(00) 00000-0000"
            />
          </div>
          
          <div>
            <Label htmlFor="customer_email">E-mail</Label>
            <Input
              id="customer_email"
              type="email"
              value={formData.customer_email}
              onChange={(e) => handleInputChange('customer_email', e.target.value)}
              placeholder="cliente@email.com"
            />
          </div>
          
          <div>
            <Label htmlFor="customer_cpf">CPF</Label>
            <Input
              id="customer_cpf"
              value={formData.customer_cpf}
              onChange={(e) => handleInputChange('customer_cpf', e.target.value)}
              onBlur={handleCPFBlur}
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>
        </div>
      </div>

      {/* Quote Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Detalhes do Orçamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="discount_amount">Desconto (R$)</Label>
            <Input
              id="discount_amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.discount_amount}
              onChange={(e) => handleInputChange('discount_amount', parseFloat(e.target.value) || 0)}
              placeholder="0,00"
            />
          </div>
          
          {quote.quote_type === "quote" && (
            <div>
              <Label htmlFor="valid_until">Válido até</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => handleInputChange('valid_until', e.target.value)}
              />
            </div>
          )}
          
          <div>
            <Label htmlFor="payment_method">
              Método de Pagamento {quote.quote_type === "sale" && "*"}
            </Label>
            <Select 
              value={formData.payment_method} 
              onValueChange={(value) => handleInputChange('payment_method', value)}
            >
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
        </div>
        
        <div>
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Observações sobre o orçamento..."
            rows={3}
          />
        </div>
      </div>

      {/* Products Display (Read-only) */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Produtos</h3>
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="space-y-2">
            {quote.products.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.name} x {item.quantity}</span>
                <span>R$ {item.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>R$ {quote.subtotal.toFixed(2)}</span>
            </div>
            {quote.shipping_cost && quote.shipping_cost > 0 && (
              <div className="flex justify-between text-sm">
                <span>Taxa de Entrega:</span>
                <span>R$ {quote.shipping_cost.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Desconto:</span>
              <span>- R$ {formData.discount_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>R$ {(quote.subtotal + (quote.shipping_cost || 0) - formData.discount_amount).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}