import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useOrganization } from "@/hooks/useOrganization";
import { Building2, Users, Package, ShoppingCart, Crown, Calendar, Settings } from "lucide-react";

export const OrganizationSettings = () => {
  const { 
    organization, 
    plans, 
    usage, 
    updateOrganization, 
    getLimitUsage, 
    hasFeature,
    isTrialExpired,
    getTrialDaysLeft
  } = useOrganization();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: organization?.name || '',
    cnpj: organization?.cnpj || '',
    email: organization?.email || '',
    phone: organization?.phone || '',
    address: organization?.address || '',
    city: organization?.city || '',
    state: organization?.state || '',
    zipcode: organization?.zipcode || ''
  });

  const handleSave = async () => {
    const success = await updateOrganization(formData);
    if (success) {
      setIsEditing(false);
    }
  };

  const currentPlan = plans.find(p => p.slug === organization?.subscription_plan);
  const trialDaysLeft = getTrialDaysLeft();

  if (!organization) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Plano Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Plano Atual
          </CardTitle>
          <CardDescription>
            Informações sobre sua assinatura e limites
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{currentPlan?.name}</h3>
              <p className="text-sm text-muted-foreground">{currentPlan?.description}</p>
            </div>
            <div className="text-right">
              <Badge variant={organization.subscription_status === 'active' ? 'default' : 'secondary'}>
                {organization.subscription_status === 'trial' ? 'Período de Teste' : 
                 organization.subscription_status === 'active' ? 'Ativo' : 'Inativo'}
              </Badge>
              {organization.subscription_status === 'trial' && !isTrialExpired() && (
                <p className="text-sm text-muted-foreground mt-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {trialDaysLeft} dias restantes
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Limites de Uso */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Usuários</span>
              </div>
              {(() => {
                const { current, limit, percentage } = getLimitUsage('users');
                return (
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>{current}</span>
                      <span>{limit === -1 ? 'Ilimitado' : `de ${limit}`}</span>
                    </div>
                    {limit !== -1 && <Progress value={percentage} className="mt-1" />}
                  </div>
                );
              })()}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4" />
                <span className="text-sm font-medium">Produtos</span>
              </div>
              {(() => {
                const { current, limit, percentage } = getLimitUsage('products');
                return (
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>{current}</span>
                      <span>{limit === -1 ? 'Ilimitado' : `de ${limit}`}</span>
                    </div>
                    {limit !== -1 && <Progress value={percentage} className="mt-1" />}
                  </div>
                );
              })()}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm font-medium">Vendas/Mês</span>
              </div>
              {(() => {
                const { current, limit, percentage } = getLimitUsage('monthly_sales');
                return (
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>{current}</span>
                      <span>{limit === -1 ? 'Ilimitado' : `de ${limit}`}</span>
                    </div>
                    {limit !== -1 && <Progress value={percentage} className="mt-1" />}
                  </div>
                );
              })()}
            </div>
          </div>

          <Separator />

          {/* Features */}
          <div>
            <h4 className="text-sm font-medium mb-2">Funcionalidades Disponíveis</h4>
            <div className="flex gap-2 flex-wrap">
              {hasFeature('pos') && <Badge variant="outline">PDV</Badge>}
              {hasFeature('inventory') && <Badge variant="outline">Estoque</Badge>}
              {hasFeature('reports') && <Badge variant="outline">Relatórios</Badge>}
              {hasFeature('api') && <Badge variant="outline">API</Badge>}
              {hasFeature('whatsapp') && <Badge variant="outline">WhatsApp</Badge>}
              {hasFeature('accounting') && <Badge variant="outline">Contabilidade</Badge>}
              {hasFeature('multi_store') && <Badge variant="outline">Multi-Loja</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações da Organização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações da Organização
          </CardTitle>
          <CardDescription>
            Informações básicas da sua empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome da Empresa</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="zipcode">CEP</Label>
              <Input
                id="zipcode"
                value={formData.zipcode}
                onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="flex gap-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                Editar Informações
              </Button>
            ) : (
              <>
                <Button onClick={handleSave}>
                  Salvar Alterações
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: organization?.name || '',
                      cnpj: organization?.cnpj || '',
                      email: organization?.email || '',
                      phone: organization?.phone || '',
                      address: organization?.address || '',
                      city: organization?.city || '',
                      state: organization?.state || '',
                      zipcode: organization?.zipcode || ''
                    });
                  }}
                >
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Planos Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle>Planos Disponíveis</CardTitle>
          <CardDescription>
            Escolha o plano ideal para seu negócio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`border rounded-lg p-4 ${
                  plan.slug === organization.subscription_plan 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border'
                }`}
              >
                <div className="space-y-2">
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="text-2xl font-bold">
                    R$ {plan.price_monthly.toFixed(2)}
                    <span className="text-sm font-normal">/mês</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <div className="space-y-1 text-xs">
                    <div>• {plan.max_users === -1 ? 'Usuários ilimitados' : `${plan.max_users} usuários`}</div>
                    <div>• {plan.max_products === -1 ? 'Produtos ilimitados' : `${plan.max_products} produtos`}</div>
                    <div>• {plan.max_monthly_sales === -1 ? 'Vendas ilimitadas' : `${plan.max_monthly_sales} vendas/mês`}</div>
                  </div>
                </div>
                {plan.slug === organization.subscription_plan ? (
                  <Badge className="w-full mt-3" variant="default">Plano Atual</Badge>
                ) : (
                  <Button 
                    className="w-full mt-3" 
                    variant="outline"
                    onClick={() => {
                      // TODO: Implementar upgrade/downgrade
                      console.log('Upgrade to', plan.slug);
                    }}
                  >
                    {plan.price_monthly > (currentPlan?.price_monthly || 0) ? 'Upgrade' : 'Selecionar'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};