// ===== TIPOS GLOBAIS CENTRALIZADOS =====
// Evita duplicação e garante consistência entre componentes

export interface Product {
  id: string;
  name: string;
  price: number;
  cost_price?: number;
  stock_quantity?: number;
  min_stock_alert?: number;
  description?: string;
  image_url?: string;
  barcode?: string;
  created_at: string;
  updated_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Customer {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  address?: string;
  neighborhood?: string;
  complement?: string;
  number?: string;
  birth_date?: string;
  gender?: string;
  lead_status?: string;
  lead_source?: string;
  notes?: string;
  last_contact?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface Profile {
  id?: string;
  user_id: string;
  full_name: string;
  role: 'admin' | 'manager' | 'salesperson' | 'user';
  permissions?: Record<string, boolean>;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentSplit {
  id?: string;
  payment_method: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito';
  amount: number;
}

export interface Quote {
  id?: string;
  quote_number?: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_cpf?: string;
  salesperson_id?: string;
  products: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
  }>;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  shipping_cost: number;
  quote_type: 'quote' | 'sale';
  status: string;
  valid_until?: string;
  sale_date?: string;
  notes?: string;
  payment_method?: string;
  payment_status?: 'pending' | 'paid' | 'failed';
  payment_splits?: PaymentSplit[];
  has_partial_payment?: boolean;
  shipping_type?: string;
  include_shipping: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  canceled_at?: string;
  canceled_by?: string;
  cancellation_reason?: string;
}

export interface Order {
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_cpf: string;
  delivery_address: string;
  delivery_city: string;
  delivery_state: string;
  delivery_zipcode: string;
  delivery_complement?: string;
  products: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
  }>;
  total_amount: number;
  shipping_cost?: number;
  shipping_type?: string;
  payment_method?: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'canceled';
  salesperson_id?: string;
  user_id?: string;
  pix_phone?: string;
  created_at: string;
  updated_at: string;
  canceled_at?: string;
  canceled_by?: string;
  cancellation_reason?: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: 'entrada' | 'saida';
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  user_id?: string;
  notes?: string;
  batch_number?: string;
  expiry_date?: string;
  unit_cost?: number;
  supplier_id?: string;
  supplier_name?: string;
  remaining_quantity?: number;
  created_at: string;
  updated_at: string;
}

export interface CashMovement {
  id: string;
  date: string;
  type: 'entrada' | 'saida' | 'ajuste';
  amount: number;
  description: string;
  category: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'saldo_caixa' | 'saldo_banco';
  reference_type?: string;
  reference_id?: string;
  created_by?: string;
  created_at: string;
}

// Tipos de resposta da API
export type ApiResponse<T> = {
  data: T | null;
  error: Error | null;
}

// Tipos de formulário
export interface QuoteFormData {
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_cpf?: string;
  salesperson_id?: string;
  discount_amount: number;
  valid_until?: string;
  sale_date?: string;
  notes?: string;
  payment_method?: string;
  include_shipping: boolean;
  shipping_cost: number;
}

// Tipos de hook
export interface UseQuoteHook {
  quote: Quote;
  updateQuote: (updates: Partial<Quote>) => void;
  resetQuote: () => void;
  saveQuote: (type: 'quote' | 'sale') => Promise<Quote | null>;
  loading: boolean;
}

export interface UseCartHook {
  cart: CartItem[];
  addToCart: (product: Product) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  calculateTotals: () => { subtotal: number; total: number };
}

// Tipos para componentes
export interface PointOfSaleProps {
  onQuoteSaved?: (quote: Quote) => void;
}

export interface ProductSearchProps {
  onAddToCart: (product: Product) => void;
}

export interface CartSectionProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  subtotal: number;
  total: number;
  discount: number;
  onDiscountChange: (discount: number) => void;
  includeShipping: boolean;
  shippingCost: number;
  onShippingChange: (include: boolean, cost: number) => void;
}

export interface CustomerFormSectionProps {
  customerData: {
    name: string;
    phone?: string;
    email?: string;
    cpf?: string;
    zipcode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  onCustomerChange: (data: Partial<CustomerFormSectionProps['customerData']>) => void;
  salespeople: Profile[];
  selectedSalesperson?: string;
  onSalespersonChange: (salespersonId: string) => void;
  saleDate?: string;
  onSaleDateChange: (date: string) => void;
}

export interface QuoteFormSectionProps {
  validUntil?: string;
  onValidUntilChange: (date: string) => void;
  paymentMethod?: string;
  onPaymentMethodChange: (method: string) => void;
  notes?: string;
  onNotesChange: (notes: string) => void;
  totalAmount: number;
  paymentSplits: PaymentSplit[];
  onPaymentSplitsChange: (splits: PaymentSplit[]) => void;
  hasPartialPayment: boolean;
  onPartialPaymentToggle: (enabled: boolean) => void;
}

export interface ActionButtonsProps {
  onSaveQuote: () => void;
  onSaveSale: () => void;
  onGeneratePDF: () => void;
  onSendWhatsApp: () => void;
  onPrintThermal: () => void;
  loading: boolean;
  hasQuoteNumber: boolean;
  canSendWhatsApp: boolean;
}