import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus } from "lucide-react";
import QuickBuy from "@/components/site/QuickBuy";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ProductGridSkeleton } from "@/components/ui/product-skeleton";
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

const fallbackProducts = [
  {
    id: "whey",
    name: "Whey Protein Isolado",
    price: 189.90,
    image_url: whey,
    description: "24g de proteína por dose",
  },
  {
    id: "multi",
    name: "Multivitamínico Diário",
    price: 59.90,
    image_url: multi,
    description: "23 vitaminas e minerais",
  },
  {
    id: "omega",
    name: "Ômega‑3 Ultra",
    price: 79.90,
    image_url: omega,
    description: "Alta concentração EPA/DHA",
  },
];

export const MobileProductGrid = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_public_products')
          .order('created_at', { ascending: false })
          .limit(6);
        
        if (error) throw error;
        setProducts(data && data.length > 0 ? data : fallbackProducts);
      } catch (error) {
        console.error("Error fetching products:", error);
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
        image_url: product.image_url || "",
        created_at: new Date().toISOString()
      } as any);
      
      toast({
        title: "✅ Adicionado!",
        description: `${product.name} foi adicionado ao carrinho.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao adicionar",
        description: "Produto sem estoque disponível.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <ProductGridSkeleton />;
  }

  return (
    <section id="produtos" className="px-4 py-8">
      <div className="mb-6">
        <h2 className="font-display text-2xl mb-2">Destaques da semana</h2>
        <p className="text-muted-foreground text-sm">Qualidade que você sente nos resultados.</p>
      </div>
      
      <div className="grid gap-4 pb-20">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden shadow-sm">
            <div className="flex gap-3 p-3">
              <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                <img 
                  src={product.image_url || whey} 
                  alt={product.name} 
                  loading="lazy" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = whey;
                  }}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm leading-tight mb-1 truncate">
                  {product.name}
                </h3>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary text-lg">
                    {formatCurrency(product.price)}
                  </span>
                  <div className="flex gap-1">
                    <Button 
                      onClick={() => handleAddToCart(product)}
                      size="sm"
                      className="h-8 px-3 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar
                    </Button>
                    <QuickBuy 
                      product={{ 
                        id: product.id, 
                        name: product.name, 
                        price: formatCurrency(product.price) 
                      }} 
                      phone="33999799138" 
                      pixKey="33999799138" 
                      storeName="Nutri & Fit" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      <div className="text-center mt-6">
        <Button variant="outline" className="w-full">
          Ver todos os produtos
        </Button>
      </div>
    </section>
  );
};