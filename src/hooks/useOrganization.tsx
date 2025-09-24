import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Json } from "@/integrations/supabase/types";

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  subscription_plan: string;
  max_users: number;
  max_products: number;
  max_monthly_sales: number;
  features: Json;
}

export const useOrganization = () => {
  const { profile } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchOrganization();
    } else {
      setLoading(false);
    }
  }, [profile?.organization_id]);

  const fetchOrganization = async () => {
    if (!profile?.organization_id) return;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (error) {
        console.error('Error fetching organization:', error);
        return;
      }

      setOrganization(data);
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrganization = async (updates: Partial<Organization>) => {
    if (!organization) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organization.id);

      if (error) {
        console.error('Error updating organization:', error);
        return false;
      }

      await fetchOrganization();
      return true;
    } catch (error) {
      console.error('Error updating organization:', error);
      return false;
    }
  };

  const checkPlanLimit = async (limitType: 'users' | 'products' | 'monthly_sales') => {
    if (!organization) return false;

    try {
      const { data, error } = await supabase.rpc('check_plan_limits', {
        org_id: organization.id,
        limit_type: limitType
      });

      if (error) {
        console.error('Error checking plan limits:', error);
        return false;
      }

      return data;
    } catch (error) {
      console.error('Error checking plan limits:', error);
      return false;
    }
  };

  return {
    organization,
    loading,
    updateOrganization,
    checkPlanLimit,
    refetch: fetchOrganization
  };
};