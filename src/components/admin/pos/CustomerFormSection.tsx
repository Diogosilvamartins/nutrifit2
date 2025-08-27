import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerFormSectionProps } from "@/types";

export const CustomerFormSection = ({
  customerData,
  onCustomerChange,
  salespeople,
  selectedSalesperson,
  onSalespersonChange,
  saleDate,
  onSaleDateChange
}: CustomerFormSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados do Cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customer_name">Nome *</Label>
            <Input
              id="customer_name"
              value={customerData.name}
              onChange={(e) => onCustomerChange({ name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="customer_phone">Telefone</Label>
            <Input
              id="customer_phone"
              value={customerData.phone || ''}
              onChange={(e) => onCustomerChange({ phone: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="customer_email">E-mail</Label>
            <Input
              id="customer_email"
              type="email"
              value={customerData.email || ''}
              onChange={(e) => onCustomerChange({ email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="customer_cpf">CPF</Label>
            <Input
              id="customer_cpf"
              value={customerData.cpf || ''}
              onChange={(e) => onCustomerChange({ cpf: e.target.value })}
            />
          </div>
        </div>
        
        {/* Vendedor */}
        <div className="space-y-2">
          <Label htmlFor="salesperson">Vendedor</Label>
          <Select value={selectedSalesperson} onValueChange={onSalespersonChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o vendedor..." />
            </SelectTrigger>
            <SelectContent>
              {salespeople.map((person) => (
                <SelectItem key={person.user_id} value={person.user_id}>
                  {person.full_name} ({person.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Data da Venda */}
        <div className="space-y-2">
          <Label htmlFor="sale_date">Data da Venda</Label>
          <Input
            id="sale_date"
            type="date"
            value={saleDate}
            onChange={(e) => onSaleDateChange(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};