import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Quote, CartItem, UseQuoteHook } from '@/types';
import { format, addDays } from 'date-fns';

const initialQuoteState: Quote = {
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  customer_cpf: "",
  products: [],
  subtotal: 0,
  discount_amount: 0,
  total_amount: 0,
  quote_type: "quote",
  status: "pending",
  valid_until: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  sale_date: format(new Date(), 'yyyy-MM-dd'),
  notes: "",
  payment_method: "",
  payment_status: "pending",
  include_shipping: false,
  shipping_cost: 0,
};

export const useQuote = (): UseQuoteHook => {
  const [quote, setQuote] = useState<Quote>(initialQuoteState);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateQuote = useCallback((updates: Partial<Quote>) => {
    setQuote(prev => ({ ...prev, ...updates }));
  }, []);

  const resetQuote = useCallback(() => {
    setQuote(initialQuoteState);
  }, []);

  const saveQuote = useCallback(async (type: 'quote' | 'sale'): Promise<Quote | null> => {
    if (!quote.customer_name || quote.products.length === 0) {
      toast({
        title: "Dados obrigatórios",
        description: "Informe o nome do cliente e adicione produtos.",
        variant: "destructive"
      });
      return null;
    }

    if (type === "sale" && !quote.payment_method) {
      toast({
        title: "Método de pagamento obrigatório",
        description: "Selecione um método de pagamento para realizar a venda.",
        variant: "destructive"
      });
      return null;
    }

    setLoading(true);
    
    try {
      // Criar ou buscar cliente
      let customerId = null;
      if (quote.customer_name) {
        const { data: customerIdResult, error: customerError } = await supabase
          .rpc('get_or_create_customer', {
            customer_name_param: quote.customer_name,
            customer_email_param: quote.customer_email || null,
            customer_phone_param: quote.customer_phone || null,
            customer_cpf_param: quote.customer_cpf || null
          });
        
        if (customerError) {
          console.error("Error creating/getting customer:", customerError);
        } else {
          customerId = customerIdResult;
        }
      }

      const { data: quoteNumber } = await supabase.rpc('generate_unique_quote_number');
      
      const quoteData = {
        quote_number: quoteNumber,
        customer_id: customerId,
        customer_name: quote.customer_name,
        customer_phone: quote.customer_phone,
        customer_email: quote.customer_email,
        customer_cpf: quote.customer_cpf,
        products: quote.products,
        shipping_type: quote.include_shipping ? 'local' : 'none',
        shipping_cost: quote.include_shipping ? quote.shipping_cost : 0,
        subtotal: quote.subtotal,
        discount_amount: quote.discount_amount,
        total_amount: quote.total_amount,
        quote_type: type,
        status: type === "sale" ? "completed" : "pending",
        valid_until: quote.valid_until,
        notes: quote.notes,
        payment_method: quote.payment_method,
        payment_status: type === "sale" ? "paid" : "pending",
        salesperson_id: quote.salesperson_id,
        sale_date: quote.sale_date,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { data, error } = await supabase
        .from('quotes')
        .insert([quoteData])
        .select()
        .single();

      if (error) throw error;

      // Se for venda, atualizar estoque
      if (type === "sale") {
        for (const item of quote.products) {
          await supabase
            .from('stock_movements')
            .insert([{
              product_id: item.id,
              movement_type: 'saida',
              quantity: item.quantity,
              reference_type: 'venda',
              reference_id: data.id,
              notes: `Venda ${quoteNumber}`,
              user_id: (await supabase.auth.getUser()).data.user?.id
            }]);
        }
      }

      toast({
        title: `${type === "sale" ? "Venda" : "Orçamento"} criado!`,
        description: `Número: ${quoteNumber}`
      });

      // Atualizar o quote com os dados salvos, preservando as propriedades locais
      const updatedQuote: Quote = {
        ...quote,
        id: data.id,
        quote_number: data.quote_number,
        status: data.status,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      setQuote(updatedQuote);
      
      return updatedQuote;
    } catch (error) {
      console.error("Error saving quote:", error);
      toast({
        title: "Erro ao salvar",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [quote, toast]);

  return {
    quote,
    updateQuote,
    resetQuote,
    saveQuote,
    loading
  };
};