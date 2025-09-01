import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ProductForm from "@/components/admin/ProductForm";
import ProductList from "@/components/admin/ProductList";
import OrderList from "@/components/admin/OrderList";
import StockControl from "@/components/admin/StockControl";
import PointOfSale from "@/components/admin/PointOfSale";
import QuotesList from "@/components/admin/QuotesList";
import FinancialDashboard from "@/components/admin/FinancialDashboard";
import CashPosition from "@/components/admin/CashPosition";
import CustomerForm from "@/components/admin/CustomerForm";
import CustomerList from "@/components/admin/CustomerList";
import Reports from "@/components/admin/Reports";
import UserManagement from "@/components/admin/UserManagement";
import SystemManagement from "@/components/admin/SystemManagement";
import SupplierManagement from "@/components/admin/SupplierManagement";
import CommissionManagement from "@/components/admin/CommissionManagement";
import SalesReport from "@/components/admin/SalesReport";
import { DownloadImage } from "@/components/ui/download-image";
import { WhatsAppTemplates } from "@/components/templates/WhatsAppTemplates";
import { AccountingModule } from "@/components/admin/accounting/AccountingModule";

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
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  city?: string;
  state?: string;
  lead_status: string;
  lead_source?: string;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("pdv");

  useEffect(() => {
    document.title = "Admin | Nutri & Fit Suplemento Nutricional";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Administre produtos e pedidos da loja Nutri & Fit.");
  }, []);

  const handleFormSuccess = () => {
    setShowForm(false);
    setShowCustomerForm(false);
    setEditingProduct(null);
    setEditingCustomer(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowCustomerForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setShowCustomerForm(false);
    setEditingProduct(null);
    setEditingCustomer(null);
  };

  return (
    <main className="container py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Painel Administrativo</h1>
          <p className="mt-2 text-muted-foreground">
            Gerencie produtos e pedidos da Nutri & Fit.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!showForm && !showCustomerForm && activeTab === "produtos" && (
            <Button onClick={() => setShowForm(true)}>
              Novo Produto
            </Button>
          )}
          {!showForm && !showCustomerForm && activeTab === "clientes" && (
            <Button onClick={() => setShowCustomerForm(true)}>
              Novo Cliente
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Voltar ao Site
          </Button>
          <Button 
            variant="outline" 
            onClick={signOut}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-12">
          <TabsTrigger value="pdv">PDV</TabsTrigger>
          <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="contabilidade">Contabilidade</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="pdv" className="mt-6">
          <PointOfSale />
        </TabsContent>

        <TabsContent value="financeiro" className="mt-6">
          <div className="space-y-6">
            <FinancialDashboard />
            <CashPosition />
          </div>
        </TabsContent>

        <TabsContent value="contabilidade" className="mt-6">
          <AccountingModule />
        </TabsContent>

        <TabsContent value="orcamentos" className="mt-6">
          <QuotesList />
        </TabsContent>

        <TabsContent value="comissoes" className="mt-6">
          <CommissionManagement />
        </TabsContent>
        
        <TabsContent value="clientes" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {showCustomerForm && (
              <div>
                <CustomerForm
                  customer={editingCustomer}
                  onSuccess={handleFormSuccess}
                  onCancel={handleCancel}
                />
              </div>
            )}
            <div className={showCustomerForm ? "" : "lg:col-span-2"}>
              <CustomerList
                onEdit={handleEditCustomer}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="produtos" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {showForm && (
              <div>
                <ProductForm
                  product={editingProduct}
                  onSuccess={handleFormSuccess}
                  onCancel={handleCancel}
                />
              </div>
            )}
            <div className={showForm ? "" : "lg:col-span-2"}>
              <ProductList
                onEdit={handleEdit}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fornecedores" className="mt-6">
          <SupplierManagement />
        </TabsContent>
          
        <TabsContent value="estoque">
          <StockControl onSuccess={() => setRefreshTrigger(prev => prev + 1)} />
        </TabsContent>
        
        <TabsContent value="pedidos" className="mt-6">
          <OrderList />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="sistema" className="mt-6">
          <div className="space-y-6">
            <SystemManagement />
            
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Logo para WhatsApp Business</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Logo otimizada para uso no Meta WhatsApp Business API (1024x1024px, PNG, menos de 5MB)
              </p>
              <DownloadImage 
                src="/src/assets/logo-nutri-fit-oficial.png"
                filename="nutri-fit-logo-1024x1024.png"
                alt="Logo Oficial Nutri & Fit - 1024x1024px"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vendas-relatorio" className="mt-6">
          <SalesReport />
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-6">
          <WhatsAppTemplates />
        </TabsContent>
        
        <TabsContent value="relatorios" className="mt-6">
          <Reports />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Admin;
