import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ShippingOption {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  service_code: string | null;
  fixed_price: number | null;
  is_active: boolean;
}

interface ShippingCalculation {
  option: ShippingOption;
  valor: number;
  prazo: number;
  loading: boolean;
  error?: string;
}

interface UseShippingReturn {
  shippingOptions: ShippingOption[];
  calculations: Record<string, ShippingCalculation>;
  loading: boolean;
  error: string | null;
  calculateShipping: (cep: string, weight: number) => Promise<void>;
  fetchShippingOptions: () => Promise<void>;
}

export const useShipping = (): UseShippingReturn => {
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [calculations, setCalculations] = useState<Record<string, ShippingCalculation>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShippingOptions = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shipping_options')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setShippingOptions(data || []);
    } catch (err) {
      console.error('Error fetching shipping options:', err);
      setError('Erro ao carregar opções de frete');
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateShipping = useCallback(async (cep: string, weight: number) => {
    if (!cep || weight <= 0) {
      setError('CEP e peso são obrigatórios');
      return;
    }

    setError(null);
    const newCalculations: Record<string, ShippingCalculation> = {};

    // Initialize calculations for all options
    for (const option of shippingOptions) {
      newCalculations[option.code] = {
        option,
        valor: 0,
        prazo: 0,
        loading: true,
      };
    }
    setCalculations(newCalculations);

    // Calculate each shipping option
    for (const option of shippingOptions) {
      try {
        if (option.type === 'local' || option.type === 'pickup') {
          // Fixed price options
          newCalculations[option.code] = {
            option,
            valor: option.fixed_price || 0,
            prazo: option.type === 'pickup' ? 0 : 1,
            loading: false,
          };
        } else if (option.type === 'correios' && option.service_code) {
          // Call Correios API
          const response = await supabase.functions.invoke('correios-frete', {
            body: {
              cepOrigem: '37540000', // Company ZIP code
              cepDestino: cep,
              peso: weight,
              servico: option.service_code,
            },
          });

          if (response.error) {
            throw new Error(response.error.message);
          }

          const result = response.data;
          
          if (result.erro) {
            throw new Error(result.erro);
          }

          newCalculations[option.code] = {
            option,
            valor: result.valor,
            prazo: result.prazo,
            loading: false,
          };

          // Cache the result
          await supabase
            .from('shipping_cache')
            .upsert({
              cep_origem: '37540000',
              cep_destino: cep,
              peso: weight,
              servico: option.service_code,
              valor: result.valor,
              prazo: result.prazo,
            }, {
              onConflict: 'cep_origem,cep_destino,peso,servico'
            });

        }
      } catch (err) {
        console.error(`Error calculating ${option.code}:`, err);
        newCalculations[option.code] = {
          option,
          valor: 0,
          prazo: 0,
          loading: false,
          error: err instanceof Error ? err.message : 'Erro no cálculo',
        };
      }

      // Update state after each calculation
      setCalculations({ ...newCalculations });
    }
  }, [shippingOptions]);

  return {
    shippingOptions,
    calculations,
    loading,
    error,
    calculateShipping,
    fetchShippingOptions,
  };
};