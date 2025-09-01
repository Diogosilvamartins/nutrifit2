import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAccounting } from '@/hooks/useAccounting';
import type { FinancialRatio } from '@/types/accounting';

export const FinancialRatios = () => {
  const { getFinancialRatios } = useAccounting();
  const [ratios, setRatios] = useState<FinancialRatio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRatios = async () => {
      setLoading(true);
      const data = await getFinancialRatios();
      setRatios(data);
      setLoading(false);
    };

    loadRatios();
  }, []);

  const getRatioIcon = (value: number, name: string) => {
    if (name.includes('Liquidez') && value >= 1) {
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    } else if (name.includes('Margem') && value > 0) {
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    } else if (name.includes('ROE') && value > 0) {
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    } else if (value < 0) {
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    } else {
      return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  const getRatioBadge = (value: number, name: string) => {
    let variant: 'default' | 'destructive' | 'secondary' = 'secondary';
    let label = 'Neutro';

    if (name.includes('Liquidez')) {
      if (value >= 2) {
        variant = 'default';
        label = 'Excelente';
      } else if (value >= 1) {
        variant = 'default';
        label = 'Bom';
      } else {
        variant = 'destructive';
        label = 'Atenção';
      }
    } else if (name.includes('Margem')) {
      if (value > 20) {
        variant = 'default';
        label = 'Excelente';
      } else if (value > 10) {
        variant = 'default';
        label = 'Bom';
      } else if (value > 0) {
        variant = 'secondary';
        label = 'Regular';
      } else {
        variant = 'destructive';
        label = 'Ruim';
      }
    } else if (name.includes('ROE')) {
      if (value > 15) {
        variant = 'default';
        label = 'Excelente';
      } else if (value > 10) {
        variant = 'default';
        label = 'Bom';
      } else if (value > 0) {
        variant = 'secondary';
        label = 'Regular';
      } else {
        variant = 'destructive';
        label = 'Ruim';
      }
    }

    return <Badge variant={variant}>{label}</Badge>;
  };

  const formatValue = (value: number, name: string) => {
    if (name.includes('%')) {
      return `${value.toFixed(2)}%`;
    } else {
      return value.toFixed(2);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <p>Calculando índices financeiros...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Índices Financeiros</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Os índices financeiros ajudam a avaliar a performance e saúde financeira da empresa.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ratios.map((ratio, index) => (
              <Card key={index} className="border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{ratio.name}</CardTitle>
                    {getRatioIcon(ratio.value, ratio.name)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center">
                    <p className="text-3xl font-bold">
                      {formatValue(ratio.value, ratio.name)}
                    </p>
                    <div className="mt-2">
                      {getRatioBadge(ratio.value, ratio.name)}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Fórmula:</p>
                      <p className="text-sm font-mono bg-muted p-2 rounded">
                        {ratio.formula}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Interpretação:</p>
                      <p className="text-sm text-muted-foreground">
                        {ratio.interpretation}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {ratios.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Não há dados suficientes para calcular os índices financeiros.
                Certifique-se de ter lançamentos contábeis registrados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guia de Interpretação */}
      <Card>
        <CardHeader>
          <CardTitle>Guia de Interpretação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Liquidez Corrente</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Maior que 2: Excelente capacidade de pagamento</li>
              <li>Entre 1 e 2: Boa capacidade de pagamento</li>
              <li>Menor que 1: Dificuldades para pagar obrigações</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Margem Líquida</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Maior que 20%: Excelente rentabilidade</li>
              <li>Entre 10% e 20%: Boa rentabilidade</li>
              <li>Entre 0% e 10%: Rentabilidade regular</li>
              <li>Menor que 0%: Prejuízo</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">ROE (Return on Equity)</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Maior que 15%: Excelente retorno sobre o patrimônio</li>
              <li>Entre 10% e 15%: Bom retorno</li>
              <li>Entre 0% e 10%: Retorno regular</li>
              <li>Menor que 0%: Destruição de valor</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};