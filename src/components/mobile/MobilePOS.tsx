import { useState, useEffect } from "react";
import { MobileHeader } from "./MobileHeader";
import { OfflineIndicator } from "./OfflineIndicator";
import { MobileScanner } from "./MobileScanner";
import { ProductSearch } from "../admin/pos/ProductSearch";
import { CartSection } from "../admin/pos/CartSection";
import { QuoteFormSection } from "../admin/pos/QuoteFormSection";
import { CustomerFormSection } from "../admin/pos/CustomerFormSection";
import { ActionButtons } from "../admin/pos/ActionButtons";
import { useQuote } from "@/hooks/useQuote";
import { Product, Profile } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";

export const MobilePOS = () => {
  const [cart, setCart] = useState<any[]>([]);
  const [salespeople, setSalespeople] = useState<Profile[]>([]);
  const { quote, updateQuote, resetQuote, saveQuote, loading } = useQuote();
  const { toast } = useToast();

  // Buscar vendedores
  useEffect(() => {
    const fetchSalespeople = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'manager', 'salesperson', 'user'])
        .order('full_name');

      if (error) {
        console.error('Erro ao buscar vendedores:', error);
        return;
      }

      setSalespeople(data as Profile[] || []);
    };

    fetchSalespeople();
  }, []);

  // Scanner de código de barras mobile
  const handleBarcodeScanned = async (barcode: string) => {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .gt('stock_quantity', 0)
        .single();

      if (error || !product) {
        toast({
          title: `Produto não encontrado: ${barcode}`,
          description: "Verifique se o código de barras está cadastrado",
          variant: "destructive"
        });
        return;
      }

      await handleAddToCart(product);
      toast({
        title: "Produto adicionado!",
        description: `${product.name} foi adicionado ao carrinho`
      });
    } catch (error) {
      console.error("Erro ao buscar produto por código de barras:", error);
      toast({
        title: "Erro ao processar código de barras",
        variant: "destructive"
      });
    }
  };

  useBarcodeScanner({
    onBarcodeScanned: handleBarcodeScanned,
    minLength: 8,
    timeout: 150
  });

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

  const handlePrintThermal = async () => {
    try {
      const printData = {
        type: quote.quote_type as 'quote' | 'sale',
        number: quote.quote_number || '',
        saleDate: quote.sale_date,
        quoteDate: quote.created_at,
        customer: {
          name: quote.customer_name,
          phone: quote.customer_phone,
          email: quote.customer_email,
          cpf: quote.customer_cpf
        },
        items: quote.products,
        subtotal: quote.subtotal,
        discount: quote.discount_amount,
        total: quote.total_amount,
        paymentMethod: quote.payment_method,
        validUntil: quote.valid_until,
        notes: quote.notes
      };

      // Importar dinamicamente as funções de impressão
      const { printThermalReceiptSystem } = await import('@/lib/thermal-printer');
      printThermalReceiptSystem(printData);
      
      toast({
        title: "Documento enviado para impressão",
        description: "Verifique sua impressora térmica"
      });
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast({
        title: "Erro na impressão",
        description: "Verifique se a impressora está conectada",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Ponto de Venda" />
      <OfflineIndicator />
      
      <div className="p-4 space-y-4 pb-28">
        {/* Scanner Mobile */}
        <MobileScanner onBarcodeScanned={handleBarcodeScanned} />
        
        {/* Busca de Produtos */}
        <ProductSearch 
          onAddToCart={handleAddToCart} 
          onBarcodeSearch={handleBarcodeScanned}
        />

        {/* Formulário do Cliente */}
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
        
        {/* Carrinho */}
        {cart.length > 0 && (
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
        )}
        
        {/* Formulário de Pagamento */}
        {cart.length > 0 && (
          <>
            <QuoteFormSection
              validUntil={quote.valid_until || ''}
              onValidUntilChange={(date) => updateQuote({ valid_until: date })}
              paymentMethod={quote.payment_method || ''}
              onPaymentMethodChange={(method) => updateQuote({ payment_method: method })}
              notes={quote.notes || ''}
              onNotesChange={(notes) => updateQuote({ notes })}
              totalAmount={quote.total_amount}
              paymentSplits={quote.payment_splits || []}
              onPaymentSplitsChange={(splits) => updateQuote({ payment_splits: splits })}
              hasPartialPayment={quote.has_partial_payment || false}
              onPartialPaymentToggle={(enabled) => updateQuote({ has_partial_payment: enabled })}
            />

            <div className="hidden">
              <ActionButtons
                onSaveQuote={handleSaveQuote}
                onSaveSale={handleSaveSale}
                onGeneratePDF={() => {}}
                onPrintThermal={handlePrintThermal}
                onSendWhatsApp={() => {}}
                loading={loading}
                hasQuoteNumber={!!quote.quote_number}
                canSendWhatsApp={!!quote.customer_phone}
              />
            </div>
          </>
        )}
      </div>
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-screen-sm mx-auto p-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
            <ActionButtons
              onSaveQuote={handleSaveQuote}
              onSaveSale={handleSaveSale}
              onGeneratePDF={() => {}}
              onPrintThermal={handlePrintThermal}
              onSendWhatsApp={() => {}}
              loading={loading}
              hasQuoteNumber={!!quote.quote_number}
              canSendWhatsApp={!!quote.customer_phone}
            />
          </div>
        </div>
      )}
    </div>
  );
};