/**
 * Supabase Auto-Generated Types
 *
 * This file contains TypeScript types for all Supabase database tables and RPC functions.
 * Generated from code analysis of database operations across the application.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          owner_user_id: string
          name: string
          afm: string
          industry: string | null
          currency: string
          settings: Record<string, unknown> | null
          email: string | null
          phone: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          name: string
          afm: string
          industry?: string | null
          currency?: string
          settings?: Record<string, unknown> | null
          email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_user_id?: string
          name?: string
          afm?: string
          industry?: string | null
          currency?: string
          settings?: Record<string, unknown> | null
          email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          avatar_url: string | null
          preferences: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
          avatar_url?: string | null
          preferences?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string | null
          avatar_url?: string | null
          preferences?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          id: string
          company_id: string
          name: string
          afm: string | null
          email: string | null
          phone: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          afm?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          afm?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          company_id: string
          supplier_id: string | null
          file_id: string | null
          invoice_number: string | null
          invoice_date: string | null
          due_date: string | null
          paid_date: string | null
          status: string
          subtotal: number | null
          vat_amount: number | null
          total_amount: number | null
          notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          supplier_id?: string | null
          file_id?: string | null
          invoice_number?: string | null
          invoice_date?: string | null
          due_date?: string | null
          paid_date?: string | null
          status?: string
          subtotal?: number | null
          vat_amount?: number | null
          total_amount?: number | null
          notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          supplier_id?: string | null
          file_id?: string | null
          invoice_number?: string | null
          invoice_date?: string | null
          due_date?: string | null
          paid_date?: string | null
          status?: string
          subtotal?: number | null
          vat_amount?: number | null
          total_amount?: number | null
          notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          id: string
          invoice_id: string
          company_id: string
          description: string | null
          quantity: number | null
          unit_price: number | null
          tax_rate: number | null
          line_total: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          company_id: string
          description?: string | null
          quantity?: number | null
          unit_price?: number | null
          tax_rate?: number | null
          line_total?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          company_id?: string
          description?: string | null
          quantity?: number | null
          unit_price?: number | null
          tax_rate?: number | null
          line_total?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          id: string
          company_id: string
          storage_path: string
          original_filename: string
          file_type: string
          file_size_bytes: number | null
          source_channel: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          storage_path: string
          original_filename: string
          file_type: string
          file_size_bytes?: number | null
          source_channel?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          storage_path?: string
          original_filename?: string
          file_type?: string
          file_size_bytes?: number | null
          source_channel?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      revenue_entries: {
        Row: {
          id: string
          company_id: string
          amount: number
          description: string | null
          entry_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          amount: number
          description?: string | null
          entry_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          amount?: number
          description?: string | null
          entry_date?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_alert_rules: {
        Row: {
          id: string
          company_id: string
          category: string
          alert_type: string
          enabled: boolean
          severity: string
          threshold_value: number | null
          threshold_unit: string | null
          comparison_period: string | null
          notes: string | null
          config: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          category: string
          alert_type: string
          enabled?: boolean
          severity?: string
          threshold_value?: number | null
          threshold_unit?: string | null
          comparison_period?: string | null
          notes?: string | null
          config?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          category?: string
          alert_type?: string
          enabled?: boolean
          severity?: string
          threshold_value?: number | null
          threshold_unit?: string | null
          comparison_period?: string | null
          notes?: string | null
          config?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      fixed_costs: {
        Row: {
          id: string
          company_id: string
          category: string
          amount: number
          month: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          category: string
          amount: number
          month: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          category?: string
          amount?: number
          month?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          id: string
          company_id: string
          name: string
          category: string
          unit: string
          price_per_unit: number
          supplier_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          category?: string
          unit?: string
          price_per_unit?: number
          supplier_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          category?: string
          unit?: string
          price_per_unit?: number
          supplier_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          company_id: string
          name: string
          category: string
          type: string
          selling_price_dinein: number | null
          selling_price_delivery: number | null
          linked_ingredient_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          category?: string
          type?: string
          selling_price_dinein?: number | null
          selling_price_delivery?: number | null
          linked_ingredient_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          category?: string
          type?: string
          selling_price_dinein?: number | null
          selling_price_delivery?: number | null
          linked_ingredient_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_ingredients: {
        Row: {
          id: string
          product_id: string
          ingredient_id: string | null
          linked_product_id: string | null
          quantity: number
          unit: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          ingredient_id?: string | null
          linked_product_id?: string | null
          quantity?: number
          unit?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          ingredient_id?: string | null
          linked_product_id?: string | null
          quantity?: number
          unit?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      margin_thresholds: {
        Row: {
          id: string
          company_id: string
          category: string
          green_min: number
          yellow_min: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          category: string
          green_min?: number
          yellow_min?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          category?: string
          green_min?: number
          yellow_min?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_lists: {
        Row: {
          id: string
          company_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_entries: {
        Row: {
          id: string
          company_id: string
          amount: number
          description: string | null
          entry_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          amount: number
          description?: string | null
          entry_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          amount?: number
          description?: string | null
          entry_date?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cash_positions: {
        Row: {
          id: string
          company_id: string
          recorded_date: string
          cash_on_hand: number
          bank_balance: number
          total_cash: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          recorded_date: string
          cash_on_hand: number
          bank_balance: number
          total_cash: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          recorded_date?: string
          cash_on_hand?: number
          bank_balance?: number
          total_cash?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_payments: {
        Row: {
          id: string
          company_id: string
          supplier_id: string | null
          invoice_id: string | null
          amount: number
          due_date: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          supplier_id?: string | null
          invoice_id?: string | null
          amount: number
          due_date?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          supplier_id?: string | null
          invoice_id?: string | null
          amount?: number
          due_date?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          id: string
          company_id: string
          alert_type: string
          severity: string
          title: string
          description: string
          recommended_action: string | null
          status: string
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          alert_type: string
          severity: string
          title: string
          description: string
          recommended_action?: string | null
          status?: string
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          alert_type?: string
          severity?: string
          title?: string
          description?: string
          recommended_action?: string | null
          status?: string
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Functions: {
      get_daily_kpis: {
        Args: {
          p_company_id: string
        }
        Returns: {
          cash_position: number
          pending_outgoing: number
          mtd_profit: number
          overdue_amount: number
          cash_position_trend?: number
          pending_outgoing_trend?: number
          mtd_profit_trend?: number
          overdue_trend?: number
        }
      }
      get_weekly_kpis: {
        Args: {
          p_company_id: string
        }
        Returns: {
          this_week_revenue: number
          this_week_expenses: number
          this_week_profit: number
          last_week_revenue: number
          last_week_expenses: number
          last_week_profit: number
          revenue_change_pct: number
          expenses_change_pct: number
          profit_change_pct: number
          revenue?: number
          expenses?: number
          profit?: number
          prev_revenue?: number
          prev_expenses?: number
          prev_profit?: number
        }
      }
      get_monthly_kpis: {
        Args: {
          p_company_id: string
        }
        Returns: {
          net_profit: number
          margin_pct: number
          revenue_total: number
          expenses_total: number
          revenue_growth_rate: number
          expense_growth_rate: number
        }
      }
      get_cash_flow: {
        Args: {
          p_company_id: string
        }
        Returns: Array<{
          month: string
          revenue: number
          expenses: number
          net_flow: number
        }>
      }
      get_expense_category_breakdown: {
        Args: {
          p_company_id: string
          p_from_date: string
          p_to_date: string
        }
        Returns: Array<{
          category: string
          total: number
          percentage: number
        }>
      }
      get_profit_pressure: {
        Args: {
          p_company_id: string
        }
        Returns: {
          pressure_level: string
          current_margin: number
          previous_margin: number
          top_sources: Array<{
            source: string
            impact: number
          }>
        }
      }
      get_executive_summary: {
        Args: {
          p_company_id: string
        }
        Returns: {
          total_invoices: number
          total_spend: number
          current_quarter_spend?: number
          avg_invoice: number
          avg_invoice_amount?: number
          unique_suppliers: number
          total_suppliers?: number
          invoices_this_month: number
          spend_this_month: number
          current_month_spend?: number
        }
      }
      get_supplier_performance: {
        Args: {
          p_company_id: string
        }
        Returns: Array<{
          supplier_name: string
          total_spend: number
          invoice_count: number
          avg_invoice: number
          avg_invoice_amount?: number
          dependency_pct: number
          dependency_percentage?: number
          risk_level: string
          dependency_risk?: string
        }>
      }
      get_cost_analytics: {
        Args: {
          p_company_id: string
        }
        Returns: {
          by_category: Array<{
            category: string
            total: number
          }>
          monthly_trends: Array<{
            month: string
            total: number
            invoice_count?: number
          }>
          total_spend?: number
          avg_invoice_amount?: number
        }
      }
      get_price_volatility: {
        Args: {
          p_company_id: string
        }
        Returns: Array<{
          product_name: string
          supplier_name: string
          avg_price: number
          min_price: number
          max_price: number
          latest_price: number
          volatility: number
          volatility_score?: number
          level: string
          volatility_level?: string
        }>
      }
    }
    Enums: {
      alert_severity: "critical" | "high" | "medium" | "low"
      alert_status: "active" | "resolved" | "acknowledged"
      invoice_status: "uploaded" | "processing" | "extracted" | "approved" | "flagged" | "rejected" | "paid"
      payment_status: "pending" | "completed" | "overdue" | "cancelled"
    }
    CompositeTypes: {}
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] & {
      Schema: PublicTableNameOrOptions["schema"]
    }
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] & {
      Schema: "public"
    }
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName]["Insert"]
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions]["Insert"]
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName]["Update"]
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions]["Update"]
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof Database["public"]["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof Database["public"]["CompositeTypes"]
  ? Database["public"]["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
