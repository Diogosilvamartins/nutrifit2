import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CartProduct {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  quantity: number;
}

interface CartContextType {
  items: CartProduct[];
  addToCart: (product: Omit<CartProduct, 'quantity'>) => Promise<void>;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartProduct[]>(() => {
    try { return JSON.parse(localStorage.getItem('nutrifit_cart')||'[]'); } catch { return [] }
  });

  useEffect(() => {
    try { localStorage.setItem('nutrifit_cart', JSON.stringify(items)); } catch {}
  }, [items]);

  const addToCart = async (product: Omit<CartProduct, 'quantity'>) => {
    // Check stock availability before adding to cart
    const { data: stockCheck, error } = await supabase
      .rpc('check_available_stock', {
        product_uuid: product.id,
        required_quantity: 1
      });

    if (error) {
      console.error("Error checking stock:", error);
      throw new Error("Erro ao verificar estoque");
    }

    if (!stockCheck) {
      throw new Error("Estoque insuficiente para este produto");
    }

    setItems(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      if (existingItem) {
        const newQuantity = existingItem.quantity + 1;
        // Check stock for new total quantity
        supabase
          .rpc('check_available_stock', {
            product_uuid: product.id,
            required_quantity: newQuantity
          })
          .then(({ data: newStockCheck }) => {
            if (!newStockCheck) {
              throw new Error("Estoque insuficiente para a quantidade solicitada");
            }
          });
        
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: newQuantity }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    // Check stock availability before updating quantity
    const { data: stockCheck, error } = await supabase
      .rpc('check_available_stock', {
        product_uuid: productId,
        required_quantity: quantity
      });

    if (error) {
      console.error("Error checking stock:", error);
      throw new Error("Erro ao verificar estoque");
    }

    if (!stockCheck) {
      throw new Error("Estoque insuficiente para a quantidade solicitada");
    }

    setItems(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalItems,
      getTotalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};