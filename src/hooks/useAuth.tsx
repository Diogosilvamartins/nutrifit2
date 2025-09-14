import React, { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  role: 'admin' | 'salesperson' | 'user';
  permissions: Record<string, boolean>;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
  isSalesperson: () => boolean;
  isCustomer: () => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Verify React is available before using hooks
  if (typeof React === 'undefined' || !React.useState) {
    console.error('React is not properly loaded');
    return <div>Loading...</div>;
  }
  
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        // Clear invalid session if profile fetch fails
        if (error.code === 'PGRST301' || error.message.includes('JWT')) {
          await supabase.auth.signOut();
        }
        return;
      }

      if (data) {
        setProfile({
          ...data,
          role: data.role as 'admin' | 'salesperson' | 'user',
          permissions: (data.permissions as Record<string, boolean>) || {}
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Clear invalid session on critical errors
      await supabase.auth.signOut();
    }
  };

  React.useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetch to avoid potential auth deadlock
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!profile) return false;
    
    // Admin has all permissions
    if (profile.role === 'admin') return true;
    
    // Check specific permission
    if (profile.permissions[permission]) return true;
    
    // Default permissions by role
    switch (profile.role) {
      case 'salesperson':
        return ['view_sales', 'create_quotes', 'view_customers', 'manage_customers', 'view_products'].includes(permission);
      case 'user':
        return ['create_orders', 'view_own_orders'].includes(permission);
      default:
        return false;
    }
  };

  const isAdmin = (): boolean => profile?.role === 'admin';
  const isSalesperson = (): boolean => profile?.role === 'salesperson';
  const isCustomer = (): boolean => profile?.role === 'user';

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      hasPermission, 
      isAdmin, 
      isSalesperson, 
      isCustomer,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};