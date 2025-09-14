import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings, Shield, User, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import CartButton from "@/components/cart/CartButton";
import logo from "@/assets/logo-nutri-fit-oficial.png";
import { usePWA } from "@/hooks/usePWA";
import { MobileNavigation } from "@/components/mobile/MobileNavigation";
import { useMobileDetection } from "@/hooks/useMobileDetection";

const Header = () => {
  const { user, profile, signOut } = useAuth();
  const { isInstallable, installApp } = usePWA();
  const { isMobile } = useMobileDetection();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2" aria-label="Nutri & Fit Suplemento Nutricional - página inicial">
          <span className="font-display text-2xl tracking-tight">Nutri & Fit</span>
          <span className="sr-only">Nutri & Fit Suplemento Nutricional</span>
        </Link>
        <nav className="hidden gap-6 md:flex" aria-label="Navegação principal">
          <a href="#produtos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Produtos</a>
          <a href="#ofertas" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Ofertas</a>
          <a href="#contato" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contato</a>
        </nav>
        <div className="flex items-center gap-2">
          <CartButton />
          
          {isMobile ? (
            <MobileNavigation />
          ) : (
            <>
              {isInstallable && (
                <Button 
                  onClick={installApp}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Instalar App</span>
                </Button>
              )}
              
              {user ? (
                <div className="flex items-center gap-2">
                  {profile && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {profile.role === 'admin' ? (
                          <Shield className="h-4 w-4 text-red-500" />
                        ) : (
                          <User className="h-4 w-4 text-primary" />
                        )}
                        <span className="text-sm font-medium hidden sm:inline">
                          {profile.full_name || user.email}
                        </span>
                      </div>
                      <Badge 
                        variant={profile.role === 'admin' ? 'destructive' : 
                                 profile.role === 'salesperson' ? 'secondary' : 'outline'}
                        className="text-xs hidden sm:inline-flex"
                      >
                        {profile.role === 'admin' ? 'Admin' : 
                         profile.role === 'salesperson' ? 'Vendedor' : 'Cliente'}
                      </Badge>
                    </div>
                  )}
                  <Link to="/admin">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </Button>
                </div>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="outline" size="sm" aria-label="Entrar">Entrar</Button>
                  </Link>
                  <Button variant="hero" size="sm" aria-label="Criar conta">Criar conta</Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
