import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  subscription_status: string;
  subscription_plan: string;
  trial_ends_at: string | null;
  max_users: number;
  max_products: number;
  max_monthly_sales: number;
  features: Record<string, boolean>;
  settings: Record<string, any>;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_users: number;
  max_products: number;
  max_monthly_sales: number;
  features: Record<string, boolean>;
}

export const useOrganization = () => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState({
    users: 0,
    products: 0,
    monthly_sales: 0
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchOrganization = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.organization_id) return;

      // Buscar organização
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) throw orgError;

      // Buscar dados do plano
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('max_users, max_products, max_monthly_sales, features')
        .eq('slug', org.subscription_plan)
        .single();

      if (planError) throw planError;

      setOrganization({
        ...org,
        settings: (org.settings as Record<string, any>) || {},
        max_users: plan.max_users,
        max_products: plan.max_products,
        max_monthly_sales: plan.max_monthly_sales,
        features: (plan.features as Record<string, boolean>) || {}
      });

      // Buscar usage atual
      await fetchUsage(profile.organization_id);
    } catch (error) {
      console.error('Error fetching organization:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar dados da organização",
        variant: "destructive",
      });
    }
  };

  const fetchUsage = async (orgId: string) => {
    try {
      // Usuários
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);

      // Produtos
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);

      // Vendas do mês
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: salesCount } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('quote_type', 'sale')
        .gte('created_at', startOfMonth.toISOString());

      setUsage({
        users: usersCount || 0,
        products: productsCount || 0,
        monthly_sales: salesCount || 0
      });
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly');

      if (error) throw error;
      
      const transformedPlans = (data || []).map(plan => ({
        ...plan,
        features: (plan.features as Record<string, boolean>) || {}
      }));
      
      setPlans(transformedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const updateOrganization = async (updates: Partial<Organization>) => {
    if (!organization) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organization.id);

      if (error) throw error;

      setOrganization({ ...organization, ...updates });
      
      toast({
        title: "Sucesso",
        description: "Organização atualizada com sucesso",
      });

      return true;
    } catch (error) {
      console.error('Error updating organization:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a organização",
        variant: "destructive",
      });
      return false;
    }
  };

  const checkLimit = (limitType: 'users' | 'products' | 'monthly_sales'): boolean => {
    if (!organization) return false;
    
    const limit = organization[`max_${limitType}`];
    const current = usage[limitType];
    
    // -1 significa ilimitado
    return limit === -1 || current < limit;
  };

  const getLimitUsage = (limitType: 'users' | 'products' | 'monthly_sales') => {
    if (!organization) return { current: 0, limit: 0, percentage: 0 };
    
    const limit = organization[`max_${limitType}`];
    const current = usage[limitType];
    
    if (limit === -1) {
      return { current, limit: -1, percentage: 0 };
    }
    
    const percentage = limit > 0 ? (current / limit) * 100 : 0;
    
    return { current, limit, percentage };
  };

  const hasFeature = (feature: string): boolean => {
    return organization?.features?.[feature] === true;
  };

  const isTrialExpired = (): boolean => {
    if (!organization?.trial_ends_at) return false;
    return new Date() > new Date(organization.trial_ends_at);
  };

  const getTrialDaysLeft = (): number => {
    if (!organization?.trial_ends_at) return 0;
    const trialEnd = new Date(organization.trial_ends_at);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  useEffect(() => {
    fetchOrganization();
    fetchPlans();
  }, [user]);

  useEffect(() => {
    if (organization) {
      fetchUsage(organization.id);
    }
  }, [organization?.id]);

  return {
    organization,
    plans,
    usage,
    loading,
    updateOrganization,
    checkLimit,
    getLimitUsage,
    hasFeature,
    isTrialExpired,
    getTrialDaysLeft,
    refreshData: fetchOrganization
  };
};