import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/hooks/useOrganization";
import { AlertTriangle, Crown } from "lucide-react";

interface PlanLimitAlertProps {
  limitType: 'users' | 'products' | 'monthly_sales';
  className?: string;
}

export const PlanLimitAlert = ({ limitType, className }: PlanLimitAlertProps) => {
  const { checkLimit, getLimitUsage, organization } = useOrganization();
  
  const canAdd = checkLimit(limitType);
  const { current, limit, percentage } = getLimitUsage(limitType);

  if (canAdd && percentage < 80) {
    return null; // Não mostrar alerta se ainda pode adicionar e não está próximo do limite
  }

  const limitText = {
    users: 'usuários',
    products: 'produtos',
    monthly_sales: 'vendas mensais'
  };

  const isAtLimit = !canAdd;
  const isNearLimit = percentage >= 80;

  return (
    <Alert className={className} variant={isAtLimit ? "destructive" : "default"}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {isAtLimit ? `Limite de ${limitText[limitType]} atingido` : `Próximo do limite`}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          {isAtLimit 
            ? `Você atingiu o limite de ${current}/${limit} ${limitText[limitType]} do seu plano ${organization?.subscription_plan}.`
            : `Você está usando ${current}/${limit} ${limitText[limitType]} (${percentage.toFixed(0)}% do limite).`
          }
        </p>
        <Button size="sm" variant="outline">
          <Crown className="w-4 h-4 mr-2" />
          Fazer Upgrade do Plano
        </Button>
      </AlertDescription>
    </Alert>
  );
};