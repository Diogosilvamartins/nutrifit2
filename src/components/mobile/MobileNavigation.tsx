import { useState } from "react";
import { Menu, X, Home, Package, Phone, ShoppingCart, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import CartButton from "@/components/cart/CartButton";

export const MobileNavigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, signOut } = useAuth();

  const closeMenu = () => setIsOpen(false);

  return (
    <div className="md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="p-2">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[280px]">
          <SheetHeader>
            <SheetTitle className="text-left font-display">Nutri & Fit</SheetTitle>
          </SheetHeader>
          
          <nav className="mt-6 flex flex-col space-y-1">
            <a 
              href="#" 
              onClick={closeMenu}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent"
            >
              <Home className="h-4 w-4" />
              Início
            </a>
            <a 
              href="#produtos" 
              onClick={closeMenu}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent"
            >
              <Package className="h-4 w-4" />
              Produtos
            </a>
            <a 
              href="#ofertas" 
              onClick={closeMenu}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent"
            >
              <ShoppingCart className="h-4 w-4" />
              Ofertas
            </a>
            <a 
              href="#contato" 
              onClick={closeMenu}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent"
            >
              <Phone className="h-4 w-4" />
              Contato
            </a>
          </nav>

          <div className="mt-6 border-t pt-6">
            {user ? (
              <div className="space-y-3">
                {profile && (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <User className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {profile.full_name || user.email}
                      </p>
                      <Badge 
                        variant={profile.role === 'admin' ? 'destructive' : 
                                 profile.role === 'salesperson' ? 'secondary' : 'outline'}
                        className="text-xs mt-1"
                      >
                        {profile.role === 'admin' ? 'Admin' : 
                         profile.role === 'salesperson' ? 'Vendedor' : 'Cliente'}
                      </Badge>
                    </div>
                  </div>
                )}
                <Link to="/admin" onClick={closeMenu}>
                  <Button variant="outline" className="w-full justify-start">
                    Admin
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => {
                    signOut();
                    closeMenu();
                  }}
                >
                  Sair
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link to="/auth" onClick={closeMenu}>
                  <Button variant="outline" className="w-full justify-start">
                    <LogIn className="h-4 w-4 mr-2" />
                    Entrar
                  </Button>
                </Link>
                <Button variant="hero" className="w-full">
                  Criar conta
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};