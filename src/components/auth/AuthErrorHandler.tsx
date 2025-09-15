import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const AuthErrorHandler = () => {

  useEffect(() => {
    // Clear any corrupted auth tokens on mount
    const clearCorruptedSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('Session error detected, clearing storage:', error);
          localStorage.removeItem('sb-zkxkbghzlfadkpdkctkx-auth-token');
          await supabase.auth.signOut();
        }
      } catch (error) {
        console.warn('Error checking session, clearing storage:', error);
        localStorage.removeItem('sb-zkxkbghzlfadkpdkctkx-auth-token');
        await supabase.auth.signOut();
      }
    };

    clearCorruptedSession();

    // Listen for auth errors
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('Token refresh failed, clearing session');
          localStorage.removeItem('sb-zkxkbghzlfadkpdkctkx-auth-token');
          toast({
            title: "Sessão expirada",
            description: "Por favor, faça login novamente.",
            variant: "destructive",
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return null;
};