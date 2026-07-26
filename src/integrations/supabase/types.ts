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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      adapter_requests: {
        Row: {
          county: string | null
          created_at: string
          id: string
          record_type: string | null
          workspace_id: string
        }
        Insert: {
          county?: string | null
          created_at?: string
          id?: string
          record_type?: string | null
          workspace_id: string
        }
        Update: {
          county?: string | null
          created_at?: string
          id?: string
          record_type?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adapter_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_steps: {
        Row: {
          active: boolean | null
          campaign_id: string
          delay_minutes: number
          id: string
          message_variants: string[]
          step_order: number
        }
        Insert: {
          active?: boolean | null
          campaign_id: string
          delay_minutes: number
          id?: string
          message_variants: string[]
          step_order: number
        }
        Update: {
          active?: boolean | null
          campaign_id?: string
          delay_minutes?: number
          id?: string
          message_variants?: string[]
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          daily_cap: number | null
          id: string
          list_job_id: string | null
          name: string
          send_window: Json | null
          status: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          daily_cap?: number | null
          id?: string
          list_job_id?: string | null
          name: string
          send_window?: Json | null
          status?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          daily_cap?: number | null
          id?: string
          list_job_id?: string | null
          name?: string
          send_window?: Json | null
          status?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_list_job_id_fkey"
            columns: ["list_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_balances: {
        Row: {
          balance: number
          kind: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          balance?: number
          kind: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          balance?: number
          kind?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_balances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          job_id: string | null
          kind: string
          reason: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          job_id?: string | null
          kind: string
          reason?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          job_id?: string | null
          kind?: string
          reason?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          params: Json
          rows_deduped: number | null
          rows_enriched: number | null
          rows_in: number | null
          rows_skiptraced: number | null
          source_type: string
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          params?: Json
          rows_deduped?: number | null
          rows_enriched?: number | null
          rows_in?: number | null
          rows_skiptraced?: number | null
          source_type: string
          status?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          params?: Json
          rows_deduped?: number | null
          rows_enriched?: number | null
          rows_in?: number | null
          rows_skiptraced?: number | null
          source_type?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          business_name: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          job_id: string
          phone: string | null
          phone_type: string | null
          quality_flags: Json | null
          scrub_status: string | null
          source_meta: Json | null
          state: string | null
          workspace_id: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          job_id: string
          phone?: string | null
          phone_type?: string | null
          quality_flags?: Json | null
          scrub_status?: string | null
          source_meta?: Json | null
          state?: string | null
          workspace_id: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          job_id?: string
          phone?: string | null
          phone_type?: string | null
          quality_flags?: Json | null
          scrub_status?: string | null
          source_meta?: Json | null
          state?: string | null
          workspace_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          campaign_id: string | null
          created_at: string
          direction: string
          id: string
          is_optout: boolean | null
          lead_id: string | null
          sending_number_id: string | null
          status: string | null
          workspace_id: string
        }
        Insert: {
          body?: string | null
          campaign_id?: string | null
          created_at?: string
          direction: string
          id?: string
          is_optout?: boolean | null
          lead_id?: string | null
          sending_number_id?: string | null
          status?: string | null
          workspace_id: string
        }
        Update: {
          body?: string | null
          campaign_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          is_optout?: boolean | null
          lead_id?: string | null
          sending_number_id?: string | null
          status?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sending_number_id_fkey"
            columns: ["sending_number_id"]
            isOneToOne: false
            referencedRelation: "sending_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      municipalities: {
        Row: {
          city: string | null
          county: string
          id: number
          state: string
        }
        Insert: {
          city?: string | null
          county: string
          id?: number
          state: string
        }
        Update: {
          city?: string | null
          county?: string
          id?: number
          state?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          brand_status: string | null
          campaign_status: string | null
          provider_refs: Json | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          brand_status?: string | null
          campaign_status?: string | null
          provider_refs?: Json | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          brand_status?: string | null
          campaign_status?: string | null
          provider_refs?: Json | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scrub_runs: {
        Row: {
          clean_count: number | null
          created_at: string
          dnc_count: number | null
          id: string
          job_id: string | null
          litigator_count: number | null
          proof: Json | null
          provider: string | null
          total: number | null
          workspace_id: string
        }
        Insert: {
          clean_count?: number | null
          created_at?: string
          dnc_count?: number | null
          id?: string
          job_id?: string | null
          litigator_count?: number | null
          proof?: Json | null
          provider?: string | null
          total?: number | null
          workspace_id: string
        }
        Update: {
          clean_count?: number | null
          created_at?: string
          dnc_count?: number | null
          id?: string
          job_id?: string | null
          litigator_count?: number | null
          proof?: Json | null
          provider?: string | null
          total?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrub_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrub_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sending_numbers: {
        Row: {
          area_code: string | null
          created_at: string
          health_score: number | null
          id: string
          optout_rate: number | null
          phone: string
          provider_sid: string | null
          region: string | null
          status: string | null
          workspace_id: string
        }
        Insert: {
          area_code?: string | null
          created_at?: string
          health_score?: number | null
          id?: string
          optout_rate?: number | null
          phone: string
          provider_sid?: string | null
          region?: string | null
          status?: string | null
          workspace_id: string
        }
        Update: {
          area_code?: string | null
          created_at?: string
          health_score?: number | null
          id?: string
          optout_rate?: number | null
          phone?: string
          provider_sid?: string | null
          region?: string | null
          status?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sending_numbers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      suppression: {
        Row: {
          created_at: string
          phone: string
          reason: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          phone: string
          reason?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          phone?: string
          reason?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppression_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          name: string
          plan: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          plan?: string
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          plan?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_workspace_member: { Args: { _workspace_id: string }; Returns: boolean }
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
