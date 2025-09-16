import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Trash2, Search, Printer } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { printThermalReceiptSystem } from "@/lib/thermal-printer";

interface Product {
  id: string;
  name: string;
  price: number;
  cost_price?: number;
  stock_quantity?: number;
  min_stock_alert?: number;
  description?: string;
  image_url?: string;
  created_at: string;
  supplier_id?: string;
  suppliers?: {
    name: string;
    company_name?: string;
  };
}

interface ProductListProps {
  onEdit: (product: Product) => void;
  refreshTrigger: number;
}

export default function ProductList({ onEdit, refreshTrigger }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          suppliers (
            name,
            company_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({ 
        title: "Erro ao carregar produtos", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [refreshTrigger]);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${name}"?`)) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({ title: "Produto excluído com sucesso!" });
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({ 
        title: "Erro ao excluir produto", 
        variant: "destructive" 
      });
    }
  };

  const handlePrintProductList = () => {
    if (filteredProducts.length === 0) {
      toast({ 
        title: "Nenhum produto para imprimir", 
        variant: "destructive" 
      });
      return;
    }

    try {
      // Criar dados formatados para impressão
      const printData = {
        type: 'sale' as const,
        number: `LISTA-${new Date().toISOString().slice(0, 10)}`,
        customer: {
          name: 'LISTA DE PRODUTOS',
          phone: '',
          email: '',
          cpf: ''
        },
        items: filteredProducts.map(product => ({
          name: product.name,
          quantity: 1,
          price: product.cost_price || 0,
          total: product.price
        })),
        subtotal: 0,
        discount: 0,
        total: 0,
        paymentMethod: '',
        notes: `Total de produtos: ${filteredProducts.length}`
      };

      // Usar a função de impressão personalizada para lista de produtos
      printProductListThermal(filteredProducts);
      
      toast({ title: "Lista de produtos enviada para impressão!" });
    } catch (error) {
      console.error("Erro ao imprimir lista:", error);
      toast({ 
        title: "Erro ao imprimir lista", 
        variant: "destructive" 
      });
    }
  };

  const printProductListThermal = (products: Product[]): void => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Pop-up bloqueado! Permita pop-ups para impressão.');
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Lista de Produtos</title>
          <style>
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              html, body {
                margin: 0;
                padding: 0;
                height: auto;
                font-family: monospace;
                font-size: 11px;
                line-height: 1.1;
              }
              .receipt {
                padding: 2mm 2mm 5mm;
                width: 100%;
                box-sizing: border-box;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .large { font-size: 14px; }
              .separator { border-top: 1px dashed #000; margin: 2px 0; }
              .product-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 1px;
                font-size: 10px;
              }
              .product-name { 
                flex: 1; 
                padding-right: 2px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .price-col { 
                width: 50px; 
                text-align: right;
                padding-left: 2px;
              }
              .header-row {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                margin-bottom: 2px;
                font-size: 10px;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center bold large">LISTA DE PRODUTOS</div>
            <div class="center">${new Date().toLocaleDateString('pt-BR')}</div>
            
            <div class="separator"></div>
            <div class="header-row">
              <div class="product-name">SUPLEMENTO</div>
              <div class="price-col">CUSTO</div>
              <div class="price-col">VENDA</div>
            </div>
            <div class="separator"></div>
            
            ${products.map(product => {
              const productName = product.name.length > 25 ? product.name.substring(0, 22) + '...' : product.name;
              const costPrice = (product.cost_price || 0).toFixed(2).replace('.', ',');
              const salePrice = product.price.toFixed(2).replace('.', ',');
              
              return `
                <div class="product-row">
                  <div class="product-name">${productName}</div>
                  <div class="price-col">${costPrice}</div>
                  <div class="price-col">${salePrice}</div>
                </div>
              `;
            }).join('')}
            
            <div class="separator"></div>
            <div class="center">Total: ${products.length} produtos</div>
            <div class="separator"></div>
            <div class="center bold">Nutri & Fit Suplementos</div>
            <div class="center">${new Date().toLocaleString('pt-BR')}</div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    }, 500);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Carregando produtos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {isAdmin() && (
          <Button
            onClick={handlePrintProductList}
            variant="outline"
            size="default"
            disabled={filteredProducts.length === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Lista
          </Button>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {searchTerm ? "Nenhum produto encontrado." : "Nenhum produto cadastrado ainda."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      {product.image_url && (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <div className="flex items-center gap-4 mt-1">
                           <p className="text-lg font-bold text-primary">{formatCurrency(product.price)}</p>
                           {product.cost_price && (
                             <div className="text-sm">
                               <span className="text-muted-foreground">Custo: {formatCurrency(product.cost_price)}</span>
                               <span className="ml-2 text-green-600 font-medium">
                                 Margem: {((product.price / product.cost_price - 1) * 100).toFixed(1)}%
                               </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className={`text-sm font-medium ${
                            (product.stock_quantity || 0) <= (product.min_stock_alert || 5) 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}>
                            Estoque: {product.stock_quantity || 0}
                          </span>
                          {(product.stock_quantity || 0) <= (product.min_stock_alert || 5) && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              Estoque baixo!
                            </span>
                          )}
                        </div>
                        {product.suppliers && (
                          <div className="text-sm text-muted-foreground mt-1">
                            <span>Fornecedor: {product.suppliers.name}</span>
                            {product.suppliers.company_name && (
                              <span> ({product.suppliers.company_name})</span>
                            )}
                          </div>
                        )}
                        {product.description && (
                          <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(product)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(product.id, product.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}