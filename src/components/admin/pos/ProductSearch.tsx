import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Product, ProductSearchProps } from "@/types";

export const ProductSearch = ({ onAddToCart }: ProductSearchProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('stock_quantity', 0)
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Erro ao carregar produtos",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos</CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto">
        <div className="grid gap-2">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => onAddToCart(product)}
            >
              <div className="flex-1">
                <h4 className="font-medium">{product.name}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-primary font-semibold">
                    {formatCurrency(product.price)}
                  </span>
                  <Badge 
                    variant={
                      (product.stock_quantity || 0) <= (product.min_stock_alert || 5) 
                        ? "destructive" 
                        : "default"
                    }
                  >
                    Estoque: {product.stock_quantity}
                  </Badge>
                </div>
              </div>
              <Button size="sm">Adicionar</Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};