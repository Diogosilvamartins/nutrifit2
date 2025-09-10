export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      accounting_entries: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          entry_number: string
          entry_type: string
          id: string
          reference_id: string | null
          reference_type: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          entry_date: string
          entry_number: string
          entry_type: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_number?: string
          entry_type?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      accounting_entry_items: {
        Row: {
          account_id: string
          created_at: string
          credit_amount: number
          debit_amount: number
          description: string | null
          entry_id: string
          id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          description?: string | null
          entry_id: string
          id?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          description?: string | null
          entry_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entry_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entry_items_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          operation: string
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          account_id: string
          actual_amount: number
          budget_month: number | null
          budget_year: number
          budgeted_amount: number
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
          variance_amount: number | null
          variance_percentage: number | null
        }
        Insert: {
          account_id: string
          actual_amount?: number
          budget_month?: number | null
          budget_year: number
          budgeted_amount?: number
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          variance_amount?: number | null
          variance_percentage?: number | null
        }
        Update: {
          account_id?: string
          actual_amount?: number
          budget_month?: number | null
          budget_year?: number
          budgeted_amount?: number
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          variance_amount?: number | null
          variance_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          reference_id: string | null
          reference_type: string | null
          type: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          date: string
          description: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: string
        }
        Relationships: []
      }
      chart_of_accounts: {
        Row: {
          account_subtype: string
          account_type: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          account_subtype: string
          account_type: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          account_subtype?: string
          account_type?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_records: {
        Row: {
          commission_amount: number
          commission_percentage: number
          created_at: string
          created_by: string | null
          id: string
          paid_at: string | null
          payment_status: string
          sale_amount: number
          sale_id: string
          sale_type: string
          salesperson_id: string
        }
        Insert: {
          commission_amount: number
          commission_percentage: number
          created_at?: string
          created_by?: string | null
          id?: string
          paid_at?: string | null
          payment_status?: string
          sale_amount: number
          sale_id: string
          sale_type: string
          salesperson_id: string
        }
        Update: {
          commission_amount?: number
          commission_percentage?: number
          created_at?: string
          created_by?: string | null
          id?: string
          paid_at?: string | null
          payment_status?: string
          sale_amount?: number
          sale_id?: string
          sale_type?: string
          salesperson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "commission_records_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      commissions: {
        Row: {
          commission_percentage: number
          commission_type: string
          created_at: string
          created_by: string | null
          fixed_amount: number | null
          id: string
          is_active: boolean
          product_category: string | null
          salesperson_id: string
          updated_at: string
        }
        Insert: {
          commission_percentage?: number
          commission_type?: string
          created_at?: string
          created_by?: string | null
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          product_category?: string | null
          salesperson_id: string
          updated_at?: string
        }
        Update: {
          commission_percentage?: number
          commission_type?: string
          created_at?: string
          created_by?: string | null
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          product_category?: string | null
          salesperson_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "commissions_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          birth_date: string | null
          city: string | null
          complement: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          email: string | null
          gender: string | null
          id: string
          last_contact: string | null
          lead_source: string | null
          lead_status: string | null
          name: string
          neighborhood: string | null
          notes: string | null
          number: string | null
          phone: string | null
          state: string | null
          street: string | null
          updated_at: string
          zipcode: string | null
        }
        Insert: {
          birth_date?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          last_contact?: string | null
          lead_source?: string | null
          lead_status?: string | null
          name: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zipcode?: string | null
        }
        Update: {
          birth_date?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          last_contact?: string | null
          lead_source?: string | null
          lead_status?: string | null
          name?: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zipcode?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          canceled_at: string | null
          canceled_by: string | null
          cancellation_reason: string | null
          created_at: string
          customer_cpf: string
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          delivery_address: string
          delivery_city: string
          delivery_complement: string | null
          delivery_state: string
          delivery_zipcode: string
          id: string
          payment_method: string | null
          pix_phone: string | null
          products: Json
          public_access_token: string
          salesperson_id: string | null
          shipping_cost: number | null
          shipping_type: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          canceled_at?: string | null
          canceled_by?: string | null
          cancellation_reason?: string | null
          created_at?: string
          customer_cpf: string
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          delivery_address: string
          delivery_city: string
          delivery_complement?: string | null
          delivery_state: string
          delivery_zipcode: string
          id?: string
          payment_method?: string | null
          pix_phone?: string | null
          products: Json
          public_access_token?: string
          salesperson_id?: string | null
          shipping_cost?: number | null
          shipping_type?: string | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          canceled_at?: string | null
          canceled_by?: string | null
          cancellation_reason?: string | null
          created_at?: string
          customer_cpf?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_address?: string
          delivery_city?: string
          delivery_complement?: string | null
          delivery_state?: string
          delivery_zipcode?: string
          id?: string
          payment_method?: string | null
          pix_phone?: string | null
          products?: Json
          public_access_token?: string
          salesperson_id?: string | null
          shipping_cost?: number | null
          shipping_type?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          min_stock_alert: number | null
          name: string
          price: number
          stock_quantity: number | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          min_stock_alert?: number | null
          name: string
          price: number
          stock_quantity?: number | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          min_stock_alert?: number | null
          name?: string
          price?: number
          stock_quantity?: number | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          permissions: Json | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          canceled_at: string | null
          canceled_by: string | null
          cancellation_reason: string | null
          created_at: string
          created_by: string | null
          customer_cpf: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          discount_amount: number
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          products: Json
          quote_number: string
          quote_type: string
          sale_date: string | null
          salesperson_id: string | null
          shipping_cost: number | null
          shipping_type: string | null
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          canceled_at?: string | null
          canceled_by?: string | null
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_cpf?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          products?: Json
          quote_number: string
          quote_type?: string
          sale_date?: string | null
          salesperson_id?: string | null
          shipping_cost?: number | null
          shipping_type?: string | null
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          canceled_at?: string | null
          canceled_by?: string | null
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_cpf?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          products?: Json
          quote_number?: string
          quote_type?: string
          sale_date?: string | null
          salesperson_id?: string | null
          shipping_cost?: number | null
          shipping_type?: string | null
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      shipping_cache: {
        Row: {
          cep_destino: string
          cep_origem: string
          created_at: string
          id: string
          peso: number
          prazo: number
          servico: string
          valor: number
        }
        Insert: {
          cep_destino: string
          cep_origem: string
          created_at?: string
          id?: string
          peso: number
          prazo: number
          servico: string
          valor: number
        }
        Update: {
          cep_destino?: string
          cep_origem?: string
          created_at?: string
          id?: string
          peso?: number
          prazo?: number
          servico?: string
          valor?: number
        }
        Relationships: []
      }
      shipping_options: {
        Row: {
          code: string
          created_at: string
          description: string | null
          fixed_price: number | null
          id: string
          is_active: boolean
          name: string
          service_code: string | null
          type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          fixed_price?: number | null
          id?: string
          is_active?: boolean
          name: string
          service_code?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          fixed_price?: number | null
          id?: string
          is_active?: boolean
          name?: string
          service_code?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          batch_number: string | null
          created_at: string
          expiry_date: string | null
          id: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          remaining_quantity: number | null
          supplier_id: string | null
          supplier_name: string | null
          unit_cost: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          remaining_quantity?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          unit_cost?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          remaining_quantity?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          unit_cost?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          company_name: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          zipcode: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zipcode?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zipcode?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          message: string
          name: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message: string
          name: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message?: string
          name?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_cash_balance: {
        Args: { bank_amount: number; cash_amount: number; target_date: string }
        Returns: undefined
      }
      calculate_commission: {
        Args: { sale_amount: number; salesperson_id_param: string }
        Returns: number
      }
      calculate_shipping_cost: {
        Args: {
          customer_zipcode?: string
          shipping_type_param: string
          total_weight?: number
        }
        Returns: number
      }
      cancel_sale_and_return_stock: {
        Args: {
          reason?: string
          sale_id: string
          sale_type: string
          user_id_param: string
        }
        Returns: boolean
      }
      check_available_stock: {
        Args: { product_uuid: string; required_quantity: number }
        Returns: boolean
      }
      check_user_permission: {
        Args: { permission_name: string }
        Returns: boolean
      }
      convert_to_brazil_timezone: {
        Args: { input_timestamp: string }
        Returns: string
      }
      create_data_backup: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      fix_pix_sales_to_bank: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      fix_sales_position: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      format_cpf: {
        Args: { cpf_input: string }
        Returns: string
      }
      generate_entry_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_quote_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_unique_quote_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_accumulated_cash_summary: {
        Args: { end_date: string; start_date: string }
        Returns: {
          accumulated_bank_balance: number
          accumulated_cash_balance: number
          period_end: string
          period_start: string
          total_bank_entries: number
          total_bank_exits: number
          total_cash_entries: number
          total_cash_exits: number
          total_expenses: number
          total_sales: number
        }[]
      }
      get_cash_summary_for_date: {
        Args: { target_date: string }
        Returns: {
          bank_balance: number
          current_balance: number
          expenses: number
          opening_balance: number
          sales_cash: number
          sales_pix: number
          total_entries: number
          total_exits: number
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_or_create_customer: {
        Args: {
          customer_cpf_param?: string
          customer_email_param?: string
          customer_name_param: string
          customer_phone_param?: string
        }
        Returns: string
      }
      get_order_by_public_token: {
        Args: { token: string }
        Returns: {
          created_at: string
          customer_cpf: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address: string
          delivery_city: string
          delivery_complement: string
          delivery_state: string
          delivery_zipcode: string
          id: string
          payment_method: string
          pix_phone: string
          products: Json
          shipping_cost: number
          shipping_type: string
          status: string
          total_amount: number
        }[]
      }
      get_public_products: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          description: string
          id: string
          image_url: string
          name: string
          price: number
          updated_at: string
        }[]
      }
      get_system_health: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_customer: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_salesperson: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          new_values_param?: Json
          old_values_param?: Json
          operation_param: string
          record_id_param?: string
          table_name_param: string
        }
        Returns: undefined
      }
      validate_cpf: {
        Args: { cpf_input: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
