import { Home, Package, Phone, ShoppingCart, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import CartButton from "@/components/cart/CartButton";
import { Link } from "react-router-dom";

export const MobileBottomNav = () => {
  const { user } = useAuth();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 border-t">
      <nav className="flex items-center justify-around py-2 px-4">
        <a 
          href="#" 
          className="flex flex-col items-center gap-1 p-2 text-xs"
        >
          <Home className="h-5 w-5" />
          <span>Início</span>
        </a>
        
        <a 
          href="#produtos" 
          className="flex flex-col items-center gap-1 p-2 text-xs"
        >
          <Package className="h-5 w-5" />
          <span>Produtos</span>
        </a>
        
        <div className="flex flex-col items-center gap-1 p-2">
          <CartButton />
        </div>
        
        <a 
          href="#contato" 
          className="flex flex-col items-center gap-1 p-2 text-xs"
        >
          <Phone className="h-5 w-5" />
          <span>Contato</span>
        </a>
        
        {user ? (
          <Link 
            to="/admin"
            className="flex flex-col items-center gap-1 p-2 text-xs"
          >
            <Settings className="h-5 w-5" />
            <span>Admin</span>
          </Link>
        ) : (
          <Link 
            to="/auth"
            className="flex flex-col items-center gap-1 p-2 text-xs"
          >
            <User className="h-5 w-5" />
            <span>Entrar</span>
          </Link>
        )}
      </nav>
    </div>
  );
};