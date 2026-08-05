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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          id: number
          name: string
          supplier_id: string | null
        }
        Insert: {
          id?: number
          name: string
          supplier_id?: string | null
        }
        Update: {
          id?: number
          name?: string
          supplier_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          customer_type: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          customer_type: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          customer_type?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_pending: number
          created_at: string
          customer_id: string
          id: string
          payment_method: string | null
          status: string
        }
        Insert: {
          amount_pending?: number
          created_at?: string
          customer_id: string
          id?: string
          payment_method?: string | null
          status?: string
        }
        Update: {
          amount_pending?: number
          created_at?: string
          customer_id?: string
          id?: string
          payment_method?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          amount: number
          comment: string | null
          created_at: string
          customer_id: string
          id: number
          type: string
          payment_method: string | null
        }
        Insert: {
          amount: number
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: number
          type: string
          payment_method?: string | null
        }
        Update: {
          amount?: number
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: number
          type?: string
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          brand_id: number | null
          category_id: number | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          price_mayorista: number
          price_minorista: number
          sku: string
          stock: number
          stock_minimo: number | null
          cost_price: number | null
        }
        Insert: {
          brand_id?: number | null
          category_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          price_mayorista: number
          price_minorista: number
          sku: string
          stock?: number
          stock_minimo?: number | null
          cost_price?: number | null
        }
        Update: {
          brand_id?: number | null
          category_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          price_mayorista?: number
          price_minorista?: number
          sku?: string
          stock?: number
          stock_minimo?: number | null
          cost_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          full_name: string | null
          id: string
          role: string
          username: string | null
        }
        Insert: {
          full_name?: string | null
          id: string
          role: string
          username?: string | null
        }
        Update: {
          full_name?: string | null
          id?: string
          role?: string
          username?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          id: number
          price: number
          product_id: string
          quantity: number
          sale_id: string
        }
        Insert: {
          id?: number
          price: number
          product_id: string
          quantity: number
          sale_id: string
        }
        Update: {
          id?: number
          price?: number
          product_id?: string
          quantity?: number
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          payment_method: string | null
          profile_id: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          payment_method?: string | null
          profile_id?: string | null
          total_amount: number
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          payment_method?: string | null
          profile_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          id: string
          user_id: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date?: string
          description: string
          id?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          debt: number
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          debt?: number
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          debt?: number
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      supplier_payments: {
        Row: {
          amount: number
          created_at: string
          id: number
          notes: string | null
          payment_method: string
          supplier_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: number
          notes?: string | null
          payment_method: string
          supplier_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: number
          notes?: string | null
          payment_method?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          }
        ]
      }
      purchases: {
        Row: {
          amount_paid: number
          created_at: string
          id: string
          invoice_number: string | null
          profile_id: string
          supplier_id: string
          total_amount: number
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          id?: string
          invoice_number?: string | null
          profile_id: string
          supplier_id: string
          total_amount: number
        }
        Update: {
          amount_paid?: number
          created_at?: string
          id?: string
          invoice_number?: string | null
          profile_id?: string
          supplier_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          }
        ]
      }
      purchase_items: {
        Row: {
          cost_price: number
          id: number
          product_id: string
          purchase_id: string
          quantity: number
        }
        Insert: {
          cost_price: number
          id?: number
          product_id: string
          purchase_id: string
          quantity: number
        }
        Update: {
          cost_price?: number
          id?: number
          product_id?: string
          purchase_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_customer_payment_transaction: {
        Args: {
          p_payment_id: number
        }
        Returns: Json
      }
      finalize_sale_transaction: {
        Args: {
          p_customer_id: string
          p_profile_id: string
          p_total_amount: number
          p_payment_method: string
          p_amount_paid: number
          p_created_at: string
          p_items: Json
          p_use_mixed_payment?: boolean
          p_payment_methods?: Json
          p_pay_to_supplier?: boolean
          p_selected_supplier_id?: string | null
          p_customer_full_name?: string | null
        }
        Returns: Json
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      register_customer_payment_transaction: {
        Args: {
          p_customer_id: string
          p_total_amount: number
          p_created_at: string
          p_comment?: string | null
          p_methods?: Json
          p_mode?: string
          p_allocations?: Json
        }
        Returns: Json
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
