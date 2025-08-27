import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Product, CartItem } from '@/types';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const { toast } = useToast();

  const addToCart = useCallback(async (product: Product): Promise<void> => {
    // Verificar estoque
    const { data: stockCheck } = await supabase
      .rpc('check_available_stock', {
        product_uuid: product.id,
        required_quantity: 1
      });

    if (!stockCheck) {
      toast({
        title: "Estoque insuficiente",
        variant: "destructive"
      });
      return;
    }

    const existingItem = items.find(item => item.product.id === product.id);
    if (existingItem) {
      await updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      setItems(prev => [...prev, { product, quantity: 1 }]);
    }
  }, [items, toast]);

  const updateQuantity = useCallback(async (productId: string, newQuantity: number): Promise<void> => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    // Verificar estoque
    const { data: stockCheck } = await supabase
      .rpc('check_available_stock', {
        product_uuid: productId,
        required_quantity: newQuantity
      });

    if (!stockCheck) {
      toast({
        title: "Estoque insuficiente",
        variant: "destructive"
      });
      return;
    }

    setItems(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  }, [toast]);

  const removeFromCart = useCallback((productId: string): void => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const clearCart = useCallback((): void => {
    setItems([]);
  }, []);

  const getTotalItems = useCallback((): number => {
    return items.reduce((total, item) => total + item.quantity, 0);
  }, [items]);

  const getTotalPrice = useCallback((): number => {
    return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  }, [items]);

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      getTotalItems,
      getTotalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
};