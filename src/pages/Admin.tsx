import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Menu, Smartphone, Monitor } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import { MobileAdminHeader } from "@/components/mobile/MobileAdminHeader";
// ... keep existing imports
import ProductForm from "@/components/admin/ProductForm";
import ProductList from "@/components/admin/ProductList";
import OrderList from "@/components/admin/OrderList";
import StockControl from "@/components/admin/StockControl";
import PointOfSale from "@/components/admin/PointOfSaleRefactored";
import { MobilePOS } from "@/components/mobile/MobilePOS";
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
import { FiscalModule } from "@/components/admin/fiscal/FiscalModule";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

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

import RoleProtectedRoute from "@/components/auth/RoleProtectedRoute";

const Admin = () => {
  const navigate = useNavigate();
  const { signOut, isAdmin, isManager, isSalesperson } = useAuth();
  const { isMobile } = useMobileDetection();
  const [showForm, setShowForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [useMobilePOS, setUseMobilePOS] = useState(isMobile);

  useEffect(() => {
    document.title = "Admin | Nutri & Fit Suplemento Nutricional";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Administre produtos e pedidos da loja Nutri & Fit.");
  }, []);

  useEffect(() => {
    // Redirect users to allowed tabs if they try to access restricted tabs
    if (!isAdmin() && !isSalesperson()) {
      // Clientes (users) não têm acesso ao painel admin
      // Redirecionar para a página principal seria mais apropriado
      return;
    }
    
    if (isSalesperson()) {
      const salesPersonSections = ['dashboard', 'pdv', 'orcamentos', 'comissoes', 'clientes'];
      if (!salesPersonSections.includes(activeSection)) {
        setActiveSection('dashboard');
      }
    } else if (!isAdmin()) {
      // Fallback para outros casos
      setActiveSection('dashboard');
    }
  }, [isAdmin, isManager, isSalesperson, activeSection]);

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

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <AdminDashboard />
      case "pdv":
        return (
          <div className="space-y-4">
            {/* Seletor de Versão PDV */}
            <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Versão do PDV:</span>
              <div className="flex items-center gap-2">
                <Button
                  variant={!useMobilePOS ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseMobilePOS(false)}
                  className="flex items-center gap-2"
                >
                  <Monitor className="w-4 h-4" />
                  Desktop
                </Button>
                <Button
                  variant={useMobilePOS ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseMobilePOS(true)}
                  className="flex items-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  Mobile
                </Button>
              </div>
            </div>
            
            {/* Renderização do PDV */}
            {useMobilePOS ? <MobilePOS /> : <PointOfSale />}
          </div>
        )
      case "orcamentos":
        return <QuotesList />
      case "comissoes":
        return <CommissionManagement />
      case "financeiro":
        return (
          <div className="space-y-6">
            <FinancialDashboard />
            <CashPosition />
          </div>
        )
      case "contabilidade":
        return <AccountingModule />
      case "fiscal":
        return <FiscalModule />
      case "clientes":
        return (
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
        )
      case "produtos":
        return (
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
        )
      case "fornecedores":
        return <SupplierManagement />
      case "estoque":
        return <StockControl onSuccess={() => setRefreshTrigger(prev => prev + 1)} />
      case "pedidos":
        return <OrderList />
      case "usuarios":
        return <UserManagement />
      case "sistema":
        return (
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
        )
      case "whatsapp":
        return <WhatsAppTemplates />
      default:
        return <AdminDashboard />
    }
  }

  const getSectionTitle = () => {
    switch (activeSection) {
      case "dashboard": return "Dashboard";
      case "pdv": return "PDV";
      case "orcamentos": return "Orçamentos";
      case "comissoes": return "Comissões";
      case "financeiro": return "Financeiro";
      case "contabilidade": return "Contabilidade";
      case "fiscal": return "Módulo Fiscal";
      case "clientes": return "Clientes";
      case "produtos": return "Produtos";
      case "fornecedores": return "Fornecedores";
      case "estoque": return "Estoque";
      case "pedidos": return "Pedidos";
      case "usuarios": return "Usuários";
      case "sistema": return "Sistema";
      case "whatsapp": return "WhatsApp";
      default: return "Dashboard";
    }
  };

  return (
    <RoleProtectedRoute allowedRoles={['admin', 'manager', 'salesperson']}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar 
            activeSection={activeSection} 
            onSectionChange={setActiveSection} 
          />
          
          <SidebarInset className="flex-1">
            {isMobile ? (
              <MobileAdminHeader title={getSectionTitle()} />
            ) : (
              <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <div className="flex-1">
                  <h1 className="font-display text-xl">Painel Administrativo</h1>
                </div>
                <div className="flex items-center gap-2">
                  {!showForm && !showCustomerForm && activeSection === "produtos" && (isAdmin() || isManager()) && (
                    <Button onClick={() => setShowForm(true)} size="sm">
                      Novo Produto
                    </Button>
                  )}
                  {!showForm && !showCustomerForm && activeSection === "clientes" && (isAdmin() || isManager() || isSalesperson()) && (
                    <Button onClick={() => setShowCustomerForm(true)} size="sm">
                      Novo Cliente
                    </Button>
                  )}
                </div>
              </header>
            )}
            
            <main className={`flex-1 ${isMobile ? 'p-4' : 'p-6'}`}>
              {/* Mobile floating action buttons */}
              {isMobile && (
                <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-2">
                  {!showForm && !showCustomerForm && activeSection === "produtos" && (isAdmin() || isManager()) && (
                    <Button onClick={() => setShowForm(true)} size="sm" className="shadow-lg">
                      + Produto
                    </Button>
                  )}
                  {!showForm && !showCustomerForm && activeSection === "clientes" && (isAdmin() || isManager() || isSalesperson()) && (
                    <Button onClick={() => setShowCustomerForm(true)} size="sm" className="shadow-lg">
                      + Cliente
                    </Button>
                  )}
                </div>
              )}
              {renderContent()}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </RoleProtectedRoute>
  );
};

export default Admin;
