import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import QuickBuy from "@/components/site/QuickBuy";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ProductGridSkeleton } from "@/components/ui/product-skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import whey from "@/assets/prod-whey.jpg";
import multi from "@/assets/prod-multivitamin.jpg";
import omega from "@/assets/prod-omega3.jpg";

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
}

// Fallback products for when database is empty
const fallbackProducts = [
  {
    id: "whey",
    name: "Whey Protein Isolado 900g",
    price: 189.90,
    image_url: whey,
    description: "24g de proteína por dose, baixo teor de carboidratos.",
  },
  {
    id: "multi",
    name: "Multivitamínico Diário",
    price: 59.90,
    image_url: multi,
    description: "Complexo completo com 23 vitaminas e minerais.",
  },
  {
    id: "omega",
    name: "Ômega‑3 Ultra 1000mg",
    price: 79.90,
    image_url: omega,
    description: "Alta concentração de EPA e DHA por cápsula.",
  },
];

const ProductGrid = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6);
        
        if (error) throw error;
        
        // Use database products if available, otherwise fallback
        setProducts(data && data.length > 0 ? data : fallbackProducts);
      } catch (error) {
        console.error("Error fetching products:", error);
        // Use fallback products on error
        setProducts(fallbackProducts);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleAddToCart = async (product: Product) => {
    try {
      await addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url
      });
      
      // Enhanced toast notification
      toast({
        title: "✅ Produto adicionado!",
        description: `${product.name} foi adicionado ao carrinho.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao adicionar produto",
        description: error instanceof Error ? error.message : "Produto sem estoque disponível.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <ProductGridSkeleton />;
  }

  return (
    <section id="produtos" className="container py-14 md:py-20">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="font-display text-3xl md:text-4xl">Destaques da semana</h2>
          <p className="mt-2 text-muted-foreground">Qualidade que você sente nos resultados.</p>
        </div>
        <a href="#" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Ver todos</a>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <Card key={p.id} className="group overflow-hidden transition-all hover:translate-y-[-2px] hover:shadow-lg">
            <div className="aspect-square overflow-hidden">
              <img 
                src={p.image_url || whey} 
                alt={p.name} 
                loading="lazy" 
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  // Fallback to default image if URL fails
                  (e.target as HTMLImageElement).src = whey;
                }}
              />
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold leading-tight">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xl font-semibold">{formatCurrency(p.price)}</span>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleAddToCart(p)}
                    size="sm"
                    className="gap-2 transition-all hover:gap-3"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Adicionar
                  </Button>
                  <QuickBuy 
                    product={{ 
                      id: p.id, 
                      name: p.name, 
                      price: formatCurrency(p.price) 
                    }} 
                    phone="33999799138" 
                    pixKey="33999799138" 
                    storeName="Nutri & Fit Suplemento Nutricional" 
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default ProductGrid;
