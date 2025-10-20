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
      bank_accounts: {
        Row: {
          account_number: string
          bank_name: string
          company_id: string
          created_at: string
          current_balance: number
          id: string
          initial_balance: number
          updated_at: string
        }
        Insert: {
          account_number: string
          bank_name: string
          company_id: string
          created_at?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          updated_at?: string
        }
        Update: {
          account_number?: string
          bank_name?: string
          company_id?: string
          created_at?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      billings: {
        Row: {
          billing_amount: number
          billing_date: string
          billing_number: string | null
          billing_type: string
          created_at: string
          created_by: string | null
          customer_id: string
          expected_payment_date: string
          id: string
          invoice_status: string
          notes: string | null
          order_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          billing_amount: number
          billing_date: string
          billing_number?: string | null
          billing_type: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          expected_payment_date: string
          id?: string
          invoice_status?: string
          notes?: string | null
          order_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          billing_amount?: number
          billing_date?: string
          billing_number?: string | null
          billing_type?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          expected_payment_date?: string
          id?: string
          invoice_status?: string
          notes?: string | null
          order_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          business_number: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          business_number?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          business_number?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          business_number: string | null
          created_at: string | null
          customer_type: string
          email: string | null
          id: string
          manager_name: string | null
          name: string
          notes: string | null
          phone: string | null
          representative_name: string | null
          sort_order: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          business_number?: string | null
          created_at?: string | null
          customer_type: string
          email?: string | null
          id?: string
          manager_name?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          representative_name?: string | null
          sort_order?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          business_number?: string | null
          created_at?: string | null
          customer_type?: string
          email?: string | null
          id?: string
          manager_name?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          representative_name?: string | null
          sort_order?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      methods: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      module_pages: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          href: string
          icon: string | null
          id: string
          is_active: boolean | null
          module_id: string
          name: string
          parent_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          href: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          module_id: string
          name: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          href?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_pages_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_pages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "module_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          href: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          href: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          href?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      order_methods: {
        Row: {
          created_at: string
          id: string
          method_id: string
          order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          method_id: string
          order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          method_id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_methods_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_methods_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_pollutants: {
        Row: {
          concentration: number
          created_at: string
          group_name: string | null
          id: string
          order_id: string
          pollutant_id: string
        }
        Insert: {
          concentration: number
          created_at?: string
          group_name?: string | null
          id?: string
          order_id: string
          pollutant_id: string
        }
        Update: {
          concentration?: number
          created_at?: string
          group_name?: string | null
          id?: string
          order_id?: string
          pollutant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_pollutants_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_pollutants_pollutant_id_fkey"
            columns: ["pollutant_id"]
            isOneToOne: false
            referencedRelation: "pollutants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          attachments: Json | null
          business_type: string
          contract_amount: number
          contract_date: string
          contract_name: string
          contract_status: string
          contract_type: string
          contract_unit: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          export_type: string
          id: string
          manager_id: string | null
          notes: string | null
          order_number: string
          parent_order_id: string | null
          pricing_type: string
          updated_at: string
          updated_by: string | null
          verification_company_id: string | null
        }
        Insert: {
          attachments?: Json | null
          business_type?: string
          contract_amount?: number
          contract_date: string
          contract_name: string
          contract_status?: string
          contract_type?: string
          contract_unit?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          export_type?: string
          id?: string
          manager_id?: string | null
          notes?: string | null
          order_number: string
          parent_order_id?: string | null
          pricing_type?: string
          updated_at?: string
          updated_by?: string | null
          verification_company_id?: string | null
        }
        Update: {
          attachments?: Json | null
          business_type?: string
          contract_amount?: number
          contract_date?: string
          contract_name?: string
          contract_status?: string
          contract_type?: string
          contract_unit?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          export_type?: string
          id?: string
          manager_id?: string | null
          notes?: string | null
          order_number?: string
          parent_order_id?: string | null
          pricing_type?: string
          updated_at?: string
          updated_by?: string | null
          verification_company_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_parent_order_id_fkey"
            columns: ["parent_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_verification_company_id_fkey"
            columns: ["verification_company_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      performances: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          manager_id: string | null
          notes: string | null
          order_id: string
          performance_amount: number
          performance_date: string
          performance_type: string
          quantity: number
          unit: string
          unit_price: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          manager_id?: string | null
          notes?: string | null
          order_id: string
          performance_amount: number
          performance_date: string
          performance_type: string
          quantity: number
          unit: string
          unit_price: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          manager_id?: string | null
          notes?: string | null
          order_id?: string
          performance_amount?: number
          performance_date?: string
          performance_type?: string
          quantity?: number
          unit?: string
          unit_price?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performances_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performances_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performances_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performances_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pollutants: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          region_1_standard: number | null
          region_2_standard: number | null
          region_3_standard: number | null
          sort_order: number
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          region_1_standard?: number | null
          region_2_standard?: number | null
          region_3_standard?: number | null
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          region_1_standard?: number | null
          region_2_standard?: number | null
          region_3_standard?: number | null
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_module_access: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          module_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          module_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          module_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_access_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_page_access: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          page_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          page_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          page_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_page_access_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "module_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          company_id: string
          created_at: string
          department_id: string | null
          email: string
          employee_number: string
          employment_status: Database["public"]["Enums"]["employment_status"]
          hire_date: string
          id: string
          name: string
          position_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          department_id?: string | null
          email: string
          employee_number: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          hire_date?: string
          id: string
          name: string
          position_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          department_id?: string | null
          email?: string
          employee_number?: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          hire_date?: string
          id?: string
          name?: string
          position_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_user: {
        Args: {
          p_department_id?: string
          p_hire_date?: string
          p_name: string
          p_password: string
          p_position_id?: string
          p_role?: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: Json
      }
      generate_employee_number_with_date: {
        Args: { p_hire_date: string }
        Returns: string
      }
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_module_access: {
        Args: { module_code: string }
        Returns: boolean
      }
      has_page_access: {
        Args: { module_code?: string; page_code: string }
        Returns: boolean
      }
      validate_inkwang_email: {
        Args: { email: string }
        Returns: boolean
      }
    }
    Enums: {
      employment_status: "active" | "inactive"
      user_role: "admin" | "user"
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
    Enums: {
      employment_status: ["active", "inactive"],
      user_role: ["admin", "user"],
    },
  },
} as const
