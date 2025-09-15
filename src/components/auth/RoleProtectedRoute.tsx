import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, User, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles: ('admin' | 'manager' | 'salesperson' | 'user')[];
  fallbackMessage?: string;
}

const RoleProtectedRoute = ({ 
  children, 
  allowedRoles, 
  fallbackMessage 
}: RoleProtectedRouteProps) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return (
      <div className="container py-10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-6">
            {profile?.role === 'user' ? (
              <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            ) : profile?.role === 'salesperson' ? (
              <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            ) : profile?.role === 'manager' ? (
              <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            ) : (
              <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            )}
          </div>
          
          <Alert>
            <AlertDescription className="text-base">
              {fallbackMessage || getDefaultMessage(profile?.role)}
            </AlertDescription>
          </Alert>

          <div className="mt-6 space-x-4">
            <Link to="/">
              <Button variant="outline">
                Voltar à Loja
              </Button>
            </Link>
            
            {profile?.role === 'user' && (
              <Link to="/checkout">
                <Button>
                  Fazer Pedido
                </Button>
              </Link>
            )}
          </div>

          {profile?.role === 'user' && (
            <div className="mt-8 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Área do Cliente</h3>
              <p className="text-sm text-muted-foreground">
                Como cliente, você pode navegar pelos produtos, fazer pedidos e acompanhar suas compras.
                Para acessar funcionalidades administrativas, é necessário ter permissões específicas.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const getDefaultMessage = (role?: string) => {
  switch (role) {
    case 'user':
      return 'Esta é uma área administrativa. Como cliente, você pode fazer pedidos através da loja.';
    case 'salesperson':
      return 'Você tem acesso limitado ao painel. Use as abas disponíveis para gerenciar vendas e orçamentos.';
    case 'manager':
      return 'Como gerente, você tem acesso a todas funcionalidades exceto gerenciamento de usuários.';
    default:
      return 'Você não tem permissão para acessar esta área.';
  }
};

export default RoleProtectedRoute;