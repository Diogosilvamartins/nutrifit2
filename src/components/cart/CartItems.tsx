import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const CartItems = () => {
  const { items, updateQuantity, removeFromCart, getTotalPrice } = useCart();
  const navigate = useNavigate();
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-muted-foreground mb-4">Seu carrinho está vazio</p>
        <Button onClick={() => navigate("/")}>Continuar Comprando</Button>
      </div>
    );
  }

  const total = getTotalPrice();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto space-y-4 mt-6">
        {items.map((item) => (
          <Card key={item.product.id}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                {item.product.image_url && (
                  <img 
                    src={item.product.image_url} 
                    alt={item.product.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{item.product.name}</h4>
                  <p className="text-primary font-semibold">
                    {formatCurrency(item.product.price)}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={async () => {
                        try {
                           setUpdatingItem(item.product.id);
                           await updateQuantity(item.product.id, item.quantity - 1);
                        } catch (error) {
                          // Error handling is in useCart hook
                        } finally {
                          setUpdatingItem(null);
                        }
                      }}
                       disabled={updatingItem === item.product.id}
                    >
                      {updatingItem === item.product.id ? <LoadingSpinner size="sm" /> : <Minus className="h-3 w-3" />}
                    </Button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={async () => {
                        try {
                           setUpdatingItem(item.product.id);
                           await updateQuantity(item.product.id, item.quantity + 1);
                        } catch (error) {
                          // Error handling is in useCart hook
                        } finally {
                          setUpdatingItem(null);
                        }
                      }}
                      disabled={updatingItem === item.product.id}
                    >
                      {updatingItem === item.product.id ? <LoadingSpinner size="sm" /> : <Plus className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="border-t pt-4 mt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold">Total:</span>
          <span className="font-bold text-lg text-primary">
            {formatCurrency(total)}
          </span>
        </div>
        <Button 
          className="w-full" 
          onClick={() => navigate("/checkout")}
          disabled={items.length === 0}
        >
          Finalizar Compra
        </Button>
      </div>
    </div>
  );
};

export default CartItems;