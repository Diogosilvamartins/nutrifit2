# Sistema de Permissões - Nutri & Fit

## Tipos de Usuários

### 1. **Admin** (Administrador)
**Role:** `admin`
**Permissões:** Acesso completo ao sistema

#### Funcionalidades:
- ✅ Painel de Vendas (PDV)
- ✅ Gerenciar Orçamentos
- ✅ Ver/Gerenciar Comissões
- ✅ Dashboard Financeiro
- ✅ Módulo de Contabilidade
- ✅ Gerenciar Clientes
- ✅ Gerenciar Produtos (incluindo custos e estoque)
- ✅ Gerenciar Fornecedores
- ✅ Controle de Estoque
- ✅ Visualizar Todos os Pedidos
- ✅ Gerenciar Usuários do Sistema
- ✅ Configurações do Sistema
- ✅ Templates WhatsApp
- ✅ Relatórios Financeiros
- ✅ Movimentações de Caixa
- ✅ Backup e Auditoria

---

### 2. **Vendedor** (Salesperson)
**Role:** `salesperson`
**Permissões:** Focado em vendas e atendimento

#### Funcionalidades:
- ✅ Painel de Vendas (PDV)
- ✅ Criar/Gerenciar Orçamentos Próprios
- ✅ Ver Próprias Comissões
- ✅ Ver/Criar/Editar Clientes
- ✅ Visualizar Produtos (sem informações de custo)
- ❌ Gerenciar Estoque
- ❌ Configurações Financeiras
- ❌ Gerenciar Fornecedores
- ❌ Relatórios Administrativos
- ❌ Configurações do Sistema

#### Políticas RLS:
- Pode ver apenas produtos básicos (sem cost_price)
- Pode criar orçamentos apenas como salesperson próprio
- Pode ver apenas orçamentos onde é o vendedor
- Pode ver apenas suas próprias comissões

---

### 3. **Cliente** (Customer)
**Role:** `user`
**Permissões:** Compras e visualização básica

#### Funcionalidades:
- ✅ Navegar pela Loja
- ✅ Fazer Pedidos (Checkout)
- ✅ Ver Próprios Pedidos
- ❌ Acessar Painel Administrativo
- ❌ Ver Informações de Outros Clientes
- ❌ Criar Orçamentos

#### Políticas RLS:
- Pode criar pedidos (orders)
- Pode ver apenas próprios pedidos
- Não tem acesso ao painel administrativo

---

## Fluxo de Acesso

### Painel Administrativo (`/admin`)
1. **Clientes (user):** Redirecionados para a loja com mensagem explicativa
2. **Vendedores (salesperson):** Acesso limitado (PDV, Orçamentos, Comissões)
3. **Admin:** Acesso completo a todas as funcionalidades

### Funcionalidades por Tab

| Funcionalidade | Admin | Vendedor | Cliente |
|----------------|--------|----------|---------|
| PDV | ✅ | ✅ | ❌ |
| Orçamentos | ✅ | ✅ (próprios) | ❌ |
| Comissões | ✅ | ✅ (próprias) | ❌ |
| Financeiro | ✅ | ❌ | ❌ |
| Contabilidade | ✅ | ❌ | ❌ |
| Clientes | ✅ | ✅ | ❌ |
| Produtos | ✅ | ✅ (limitado) | ❌ |
| Fornecedores | ✅ | ❌ | ❌ |
| Estoque | ✅ | ❌ | ❌ |
| Pedidos | ✅ | ❌ | ❌ |
| Usuários | ✅ | ❌ | ❌ |
| Sistema | ✅ | ❌ | ❌ |
| WhatsApp | ✅ | ❌ | ❌ |

---

## Implementação Técnica

### Hooks de Auth
```typescript
const { isAdmin, isSalesperson, isCustomer } = useAuth();
```

### Proteção de Rotas
```typescript
<RoleProtectedRoute allowedRoles={['admin', 'salesperson']}>
  {/* Conteúdo protegido */}
</RoleProtectedRoute>
```

### Funções RLS no Banco
- `public.is_admin()` - Verifica se é admin
- `public.is_salesperson()` - Verifica se é vendedor  
- `public.is_customer()` - Verifica se é cliente

---

## Migração de Roles

**Antiga estrutura:**
- `admin` → Mantido como `admin`
- `manager` → Alterado para `salesperson`
- `user` → Mantido como `user`

**Nova estrutura clarifica as responsabilidades:**
- Admins: Gestão completa
- Vendedores: Foco em vendas
- Clientes: Foco em compras