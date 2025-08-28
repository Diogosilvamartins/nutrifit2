import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuote } from "@/hooks/useQuote";
import { Product, Profile } from "@/types";
import { ProductSearch } from "./pos/ProductSearch";
import { CartSection } from "./pos/CartSection";
import { CustomerFormSection } from "./pos/CustomerFormSection";
import { QuoteFormSection } from "./pos/QuoteFormSection";
import { ActionButtons } from "./pos/ActionButtons";
import { generatePDF } from "@/lib/pdf-generator";
import { formatCurrency } from "@/lib/utils";

export default function PointOfSaleRefactored() {
  const [cart, setCart] = useState<any[]>([]);
  const [salespeople, setSalespeople] = useState<Profile[]>([]);
  const { quote, updateQuote, resetQuote, saveQuote, loading } = useQuote();
  const { toast } = useToast();

  useEffect(() => {
    fetchSalespeople();
  }, []);

  useEffect(() => {
    // Calcular totais quando carrinho ou desconto mudarem
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const shippingCost = quote.include_shipping ? quote.shipping_cost : 0;
    const total = subtotal - quote.discount_amount + shippingCost;
    
    updateQuote({
      products: cart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        total: item.product.price * item.quantity
      })),
      subtotal,
      total_amount: Math.max(0, total)
    });
  }, [cart, quote.discount_amount, quote.include_shipping, quote.shipping_cost]);

  const fetchSalespeople = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .in('role', ['admin', 'manager', 'user'])
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      setSalespeople((data || []).map(item => ({
        ...item,
        role: item.role as 'admin' | 'manager' | 'user'
      })) as Profile[]);
    } catch (error) {
      console.error("Error fetching salespeople:", error);
    }
  };

  const handleAddToCart = async (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
      await handleUpdateQuantity(product.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }

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

    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    resetQuote();
  };

  const handleSaveQuote = async () => {
    const result = await saveQuote("quote");
    if (result) {
      handleClearCart();
    }
  };

  const handleSaveSale = async () => {
    const result = await saveQuote("sale");
    if (result) {
      handleClearCart();
    }
  };

  const handleGeneratePDF = async () => {
    if (!quote.quote_number) {
      toast({
        title: "Salve o orçamento primeiro",
        variant: "destructive"
      });
      return;
    }

    try {
      const pdf = await generatePDF({
        type: quote.quote_type,
        number: quote.quote_number,
        customer: {
          name: quote.customer_name,
          phone: quote.customer_phone,
          email: quote.customer_email,
          cpf: quote.customer_cpf
        },
        items: cart.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          total: item.product.price * item.quantity
        })),
        subtotal: quote.subtotal,
        discount: quote.discount_amount,
        total: quote.total_amount,
        validUntil: quote.valid_until,
        notes: quote.notes
      });

      const link = document.createElement('a');
      link.href = pdf;
      link.download = `${quote.quote_type}-${quote.quote_number}.pdf`;
      link.click();

      toast({
        title: "PDF gerado com sucesso!"
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        variant: "destructive"
      });
    }
  };

  const handleSendWhatsApp = () => {
    // Implementation for WhatsApp
    toast({
      title: "Funcionalidade em desenvolvimento"
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ProductSearch onAddToCart={handleAddToCart} />
      
      <div className="space-y-6">
        <CustomerFormSection
          customerData={{
            name: quote.customer_name,
            phone: quote.customer_phone,
            email: quote.customer_email,
            cpf: quote.customer_cpf
          }}
          onCustomerChange={(data) => updateQuote({
            customer_name: data.name || quote.customer_name,
            customer_phone: data.phone || quote.customer_phone,
            customer_email: data.email || quote.customer_email,
            customer_cpf: data.cpf || quote.customer_cpf
          })}
          salespeople={salespeople}
          selectedSalesperson={quote.salesperson_id}
          onSalespersonChange={(salespersonId) => updateQuote({ salesperson_id: salespersonId })}
          saleDate={quote.sale_date}
          onSaleDateChange={(date) => updateQuote({ sale_date: date })}
        />

        <CartSection
          cart={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveFromCart={handleRemoveFromCart}
          onClearCart={handleClearCart}
          subtotal={quote.subtotal}
          total={quote.total_amount}
          discount={quote.discount_amount}
          onDiscountChange={(discount) => updateQuote({ discount_amount: discount })}
          includeShipping={quote.include_shipping}
          shippingCost={quote.shipping_cost}
          onShippingChange={(include, cost) => updateQuote({ include_shipping: include, shipping_cost: cost })}
        />

        {cart.length > 0 && (
          <>
            <QuoteFormSection
              validUntil={quote.valid_until}
              onValidUntilChange={(date) => updateQuote({ valid_until: date })}
              paymentMethod={quote.payment_method}
              onPaymentMethodChange={(method) => updateQuote({ payment_method: method })}
              notes={quote.notes}
              onNotesChange={(notes) => updateQuote({ notes })}
            />

            <ActionButtons
              onSaveQuote={handleSaveQuote}
              onSaveSale={handleSaveSale}
              onGeneratePDF={handleGeneratePDF}
              onSendWhatsApp={handleSendWhatsApp}
              loading={loading}
              hasQuoteNumber={!!quote.quote_number}
              canSendWhatsApp={!!quote.customer_phone}
            />
          </>
        )}
      </div>
    </div>
  );
}