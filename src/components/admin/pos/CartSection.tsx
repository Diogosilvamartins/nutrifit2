import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CartSectionProps } from "@/types";

export const CartSection = ({
  cart,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  subtotal,
  total,
  discount,
  onDiscountChange,
  includeShipping,
  shippingCost,
  onShippingChange
}: CartSectionProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Carrinho</CardTitle>
        <Button variant="outline" size="sm" onClick={onClearCart}>
          Limpar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {cart.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nenhum produto adicionado
          </p>
        ) : (
          <>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <h5 className="font-medium text-sm">{item.product.name}</h5>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.product.price)} cada
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRemoveFromCart(item.product.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Desconto e Totais */}
            <div className="space-y-2">
              <div>
                <Label htmlFor="discount">Desconto (R$)</Label>
                <Input
                  id="discount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              
              {/* Taxa de Entrega */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_shipping"
                    checked={includeShipping}
                    onCheckedChange={(checked) => 
                      onShippingChange(checked as boolean, shippingCost)
                    }
                  />
                  <Label htmlFor="include_shipping">Taxa de Entrega</Label>
                </div>
                
                {includeShipping && (
                  <div className="flex items-center justify-between">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={shippingCost}
                      onChange={(e) => onShippingChange(true, parseFloat(e.target.value) || 0)}
                      className="w-24"
                    />
                    <span>{formatCurrency(shippingCost)}</span>
                  </div>
                )}
              </div>
              
              {discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Desconto:</span>
                  <span>- {formatCurrency(discount)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};