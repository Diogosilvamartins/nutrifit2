import { useState } from "react"
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  FileText, 
  DollarSign, 
  Settings,
  CreditCard,
  Calculator,
  Warehouse,
  Truck,
  BarChart3,
  MessageSquare,
  UserCheck,
  Home,
  LogOut,
  Building2
} from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

interface AppSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export function AppSidebar({ activeSection, onSectionChange }: AppSidebarProps) {
  const { state } = useSidebar()
  const { isAdmin, isManager, isSalesperson, signOut } = useAuth()
  const navigate = useNavigate()

  const isCollapsed = state === "collapsed"

  const salesItems = [
    { id: "pdv", title: "PDV", icon: CreditCard },
    { id: "orcamentos", title: "Orçamentos", icon: FileText },
    { id: "comissoes", title: "Comissões", icon: BarChart3 },
  ]

  const stockItems = [
    { id: "produtos", title: "Produtos", icon: Package },
    { id: "fornecedores", title: "Fornecedores", icon: Truck },
    { id: "estoque", title: "Controle", icon: Warehouse },
  ]

  const customerItems = [
    { id: "clientes", title: "Clientes", icon: Users },
  ]

  const orderItems = [
    { id: "pedidos", title: "Pedidos", icon: ShoppingCart },
  ]

  const financeItems = [
    { id: "financeiro", title: "Dashboard", icon: DollarSign },
    { id: "contabilidade", title: "Contabilidade", icon: Calculator },
  ]

  const systemItems = [
    { id: "organizacao", title: "Organização", icon: Building2 },
    { id: "usuarios", title: "Usuários", icon: UserCheck },
    { id: "sistema", title: "Configurações", icon: Settings },
    { id: "whatsapp", title: "WhatsApp", icon: MessageSquare },
  ]

  const isActive = (sectionId: string) => activeSection === sectionId

  const handleSectionClick = (sectionId: string) => {
    onSectionChange(sectionId)
  }

  const renderMenuGroup = (items: any[], groupLabel: string, showGroup: boolean = true) => {
    if (!showGroup) return null

    return (
      <SidebarGroup>
        <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton 
                  onClick={() => handleSectionClick(item.id)}
                  isActive={isActive(item.id)}
                  className="w-full"
                >
                  <item.icon className="h-4 w-4" />
                  {!isCollapsed && <span>{item.title}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <Sidebar
      className={isCollapsed ? "w-16" : "w-64"}
      collapsible="icon"
    >
      <SidebarHeader className="border-b px-4 py-4">
        {!isCollapsed && (
          <div>
            <h2 className="text-lg font-semibold">Nutri & Fit</h2>
            <p className="text-sm text-muted-foreground">Painel Admin</p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {/* Dashboard - disponível para todos */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleSectionClick("dashboard")}
                  isActive={isActive("dashboard")}
                  className="w-full"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {!isCollapsed && <span>Dashboard</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Vendas - disponível para admin, manager e salesperson */}
        {renderMenuGroup(salesItems, "Vendas", isAdmin() || isManager() || isSalesperson())}

        {/* Estoque - admin e manager */}
        {renderMenuGroup(stockItems, "Estoque", isAdmin() || isManager())}

        {/* Clientes - admin, manager e salesperson */}
        {renderMenuGroup(customerItems, "Clientes", isAdmin() || isManager() || isSalesperson())}

        {/* Pedidos - admin e manager */}
        {renderMenuGroup(orderItems, "Pedidos", isAdmin() || isManager())}

        {/* Financeiro - admin e manager */}
        {renderMenuGroup(financeItems, "Financeiro", isAdmin() || isManager())}

        {/* Sistema - apenas admin */}
        {renderMenuGroup(systemItems, "Sistema", isAdmin())}
      </SidebarContent>

      <SidebarFooter className="border-t px-2 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => navigate("/")} className="w-full">
              <Home className="h-4 w-4" />
              {!isCollapsed && <span>Voltar ao Site</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="w-full">
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}