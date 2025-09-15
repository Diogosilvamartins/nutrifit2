import { Menu, LogOut, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

interface MobileAdminHeaderProps {
  title: string;
}

export const MobileAdminHeader = ({ title }: MobileAdminHeaderProps) => {
  const { user, profile, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <div>
            <h1 className="font-semibold text-lg">{title}</h1>
            <p className="text-xs text-muted-foreground">Painel Admin</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {profile && (
            <div className="flex items-center gap-2">
              {profile.role === 'admin' ? (
                <Shield className="h-4 w-4 text-red-500" />
              ) : (
                <User className="h-4 w-4 text-primary" />
              )}
              <Badge 
                variant={profile.role === 'admin' ? 'destructive' : 
                         profile.role === 'manager' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {profile.role === 'admin' ? 'Admin' : 
                 profile.role === 'manager' ? 'Gerente' :
                 profile.role === 'salesperson' ? 'Vendedor' : 'Cliente'}
              </Badge>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={signOut} className="p-2">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};