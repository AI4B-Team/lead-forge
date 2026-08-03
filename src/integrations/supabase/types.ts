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
      activity_events: {
        Row: {
          actor_id: string | null
          created_at: string
          detail: string | null
          id: string
          ref_id: string | null
          ref_type: string | null
          summary: string
          type: string
          workspace_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          ref_id?: string | null
          ref_type?: string | null
          summary: string
          type: string
          workspace_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          ref_id?: string | null
          ref_type?: string | null
          summary?: string
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      adapter_requests: {
        Row: {
          county: string | null
          created_at: string
          desired_fields: string[]
          frequency: string
          geo: string | null
          id: string
          login_required: string
          notes: string | null
          notified_at: string | null
          outreach_level: string | null
          outreach_note: string | null
          record_type: string | null
          requested_by: string | null
          risk_tier: string
          screening_reason: string | null
          source_label: string | null
          status: string
          target_url: string | null
          template_id: string | null
          type: string
          workspace_id: string
        }
        Insert: {
          county?: string | null
          created_at?: string
          desired_fields?: string[]
          frequency?: string
          geo?: string | null
          id?: string
          login_required?: string
          notes?: string | null
          notified_at?: string | null
          outreach_level?: string | null
          outreach_note?: string | null
          record_type?: string | null
          requested_by?: string | null
          risk_tier?: string
          screening_reason?: string | null
          source_label?: string | null
          status?: string
          target_url?: string | null
          template_id?: string | null
          type?: string
          workspace_id: string
        }
        Update: {
          county?: string | null
          created_at?: string
          desired_fields?: string[]
          frequency?: string
          geo?: string | null
          id?: string
          login_required?: string
          notes?: string | null
          notified_at?: string | null
          outreach_level?: string | null
          outreach_note?: string | null
          record_type?: string | null
          requested_by?: string | null
          risk_tier?: string
          screening_reason?: string | null
          source_label?: string | null
          status?: string
          target_url?: string | null
          template_id?: string | null
          type?: string
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
      approval_requests: {
        Row: {
          amount: number
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          detail: Json
          id: string
          kind: string
          requested_by: string
          status: string
          summary: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          detail?: Json
          id?: string
          kind: string
          requested_by: string
          status?: string
          summary: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          detail?: Json
          id?: string
          kind?: string
          requested_by?: string
          status?: string
          summary?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_knowledge: {
        Row: {
          brand_id: string | null
          campaign_id: string | null
          category: string
          content: string
          created_at: string
          id: string
          source_type: string
          source_url: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          brand_id?: string | null
          campaign_id?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          source_type?: string
          source_url?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          brand_id?: string | null
          campaign_id?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          source_type?: string
          source_url?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_knowledge_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_knowledge_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      campaign_drops: {
        Row: {
          campaign_id: string
          created_at: string
          drop_index: number
          id: string
          scheduled_at: string
          sent_count: number
          size: number
          status: string
          workspace_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          drop_index: number
          id?: string
          scheduled_at: string
          sent_count?: number
          size?: number
          status?: string
          workspace_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          drop_index?: number
          id?: string
          scheduled_at?: string
          sent_count?: number
          size?: number
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_drops_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_drops_workspace_id_fkey"
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
          bot_config: Json
          bot_enabled: boolean
          brand_id: string | null
          created_at: string
          daily_cap: number | null
          drop_size: number
          drop_times: string[]
          duplicate_policy: string
          forward_calls_to: string | null
          id: string
          list_job_id: string | null
          name: string
          regulated_vertical: boolean
          send_window: Json | null
          status: string | null
          tag_id: string | null
          workspace_id: string
        }
        Insert: {
          bot_config?: Json
          bot_enabled?: boolean
          brand_id?: string | null
          created_at?: string
          daily_cap?: number | null
          drop_size?: number
          drop_times?: string[]
          duplicate_policy?: string
          forward_calls_to?: string | null
          id?: string
          list_job_id?: string | null
          name: string
          regulated_vertical?: boolean
          send_window?: Json | null
          status?: string | null
          tag_id?: string | null
          workspace_id: string
        }
        Update: {
          bot_config?: Json
          bot_enabled?: boolean
          brand_id?: string | null
          created_at?: string
          daily_cap?: number | null
          drop_size?: number
          drop_times?: string[]
          duplicate_policy?: string
          forward_calls_to?: string | null
          id?: string
          list_job_id?: string | null
          name?: string
          regulated_vertical?: boolean
          send_window?: Json | null
          status?: string | null
          tag_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_list_job_id_fkey"
            columns: ["list_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
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
      compliance_events: {
        Row: {
          created_at: string
          detail: Json
          id: string
          lead_id: string | null
          path: string
          phone: string | null
          reason: string
          thread_key: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: string
          lead_id?: string | null
          path?: string
          phone?: string | null
          reason: string
          thread_key?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: string
          lead_id?: string | null
          path?: string
          phone?: string | null
          reason?: string
          thread_key?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      county_coverage: {
        Row: {
          county_name: string
          created_at: string
          fips: string | null
          id: string
          notes: string | null
          source_type: string
          state: string
          status: string
          updated_at: string
        }
        Insert: {
          county_name: string
          created_at?: string
          fips?: string | null
          id?: string
          notes?: string | null
          source_type?: string
          state: string
          status?: string
          updated_at?: string
        }
        Update: {
          county_name?: string
          created_at?: string
          fips?: string | null
          id?: string
          notes?: string | null
          source_type?: string
          state?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
          actor_user_id: string | null
          created_at: string
          delta: number
          id: string
          job_id: string | null
          kind: string
          reason: string | null
          workspace_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          delta: number
          id?: string
          job_id?: string | null
          kind: string
          reason?: string | null
          workspace_id: string
        }
        Update: {
          actor_user_id?: string | null
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
      events: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_error: string | null
          id: string
          payload: Json
          type: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_error?: string | null
          id?: string
          payload?: Json
          type: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_error?: string | null
          id?: string
          payload?: Json
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      export_events: {
        Row: {
          actor_user_id: string
          created_at: string
          file_type: string
          id: string
          ref_id: string | null
          row_count: number
          scope: string
          watermark: string | null
          workspace_id: string
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          file_type?: string
          id?: string
          ref_id?: string | null
          row_count?: number
          scope: string
          watermark?: string | null
          workspace_id: string
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          file_type?: string
          id?: string
          ref_id?: string | null
          row_count?: number
          scope?: string
          watermark?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          body: string
          category: string | null
          created_at: string
          id: string
          screenshot_url: string | null
          user_id: string
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string
          id?: string
          screenshot_url?: string | null
          user_id: string
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string
          id?: string
          screenshot_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      industries: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "industries_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
        ]
      }
      job_events: {
        Row: {
          count: number | null
          created_at: string
          id: string
          job_id: string
          message: string
          stage: string
          workspace_id: string
        }
        Insert: {
          count?: number | null
          created_at?: string
          id?: string
          job_id: string
          message: string
          stage: string
          workspace_id: string
        }
        Update: {
          count?: number | null
          created_at?: string
          id?: string
          job_id?: string
          message?: string
          stage?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          auto_launch: boolean
          channel: string
          created_at: string
          created_by: string | null
          custom_interval_minutes: number | null
          error: string | null
          failed_at: string | null
          failed_stage: string | null
          id: string
          idempotency_key: string | null
          last_run_at: string | null
          name: string | null
          net_new_count: number
          next_run_at: string | null
          params: Json
          parent_job_id: string | null
          record_type: string
          rows_deduped: number | null
          rows_enriched: number | null
          rows_in: number | null
          rows_skiptraced: number | null
          schedule: string
          schedule_active: boolean
          source_type: string
          status: string
          workspace_id: string
        }
        Insert: {
          auto_launch?: boolean
          channel?: string
          created_at?: string
          created_by?: string | null
          custom_interval_minutes?: number | null
          error?: string | null
          failed_at?: string | null
          failed_stage?: string | null
          id?: string
          idempotency_key?: string | null
          last_run_at?: string | null
          name?: string | null
          net_new_count?: number
          next_run_at?: string | null
          params?: Json
          parent_job_id?: string | null
          record_type?: string
          rows_deduped?: number | null
          rows_enriched?: number | null
          rows_in?: number | null
          rows_skiptraced?: number | null
          schedule?: string
          schedule_active?: boolean
          source_type: string
          status?: string
          workspace_id: string
        }
        Update: {
          auto_launch?: boolean
          channel?: string
          created_at?: string
          created_by?: string | null
          custom_interval_minutes?: number | null
          error?: string | null
          failed_at?: string | null
          failed_stage?: string | null
          id?: string
          idempotency_key?: string | null
          last_run_at?: string | null
          name?: string | null
          net_new_count?: number
          next_run_at?: string | null
          params?: Json
          parent_job_id?: string | null
          record_type?: string
          rows_deduped?: number | null
          rows_enriched?: number | null
          rows_in?: number | null
          rows_skiptraced?: number | null
          schedule?: string
          schedule_active?: boolean
          source_type?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_parent_job_id_fkey"
            columns: ["parent_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_imports: {
        Row: {
          column_map: Json
          created_at: string
          created_by: string | null
          error: string | null
          filename: string
          id: string
          job_id: string | null
          rows_imported: number
          rows_total: number
          status: string
          workspace_id: string
        }
        Insert: {
          column_map?: Json
          created_at?: string
          created_by?: string | null
          error?: string | null
          filename: string
          id?: string
          job_id?: string | null
          rows_imported?: number
          rows_total?: number
          status?: string
          workspace_id: string
        }
        Update: {
          column_map?: Json
          created_at?: string
          created_by?: string | null
          error?: string | null
          filename?: string
          id?: string
          job_id?: string | null
          rows_imported?: number
          rows_total?: number
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_imports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_imports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_outcomes: {
        Row: {
          id: string
          lead_record_id: string | null
          reason: string | null
          result_id: string | null
          set_by: string
          status: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          id?: string
          lead_record_id?: string | null
          reason?: string | null
          result_id?: string | null
          set_by?: string
          status?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          id?: string
          lead_record_id?: string | null
          reason?: string | null
          result_id?: string | null
          set_by?: string
          status?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_outcomes_lead_record_id_fkey"
            columns: ["lead_record_id"]
            isOneToOne: false
            referencedRelation: "lead_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_outcomes_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "scan_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_outcomes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_records: {
        Row: {
          address: string | null
          business_name: string | null
          city: string | null
          created_at: string
          dedupe_key: string
          disposition: string
          email: string | null
          engagement: string | null
          first_seen_at: string
          first_seen_job_id: string | null
          followers: string | null
          full_name: string | null
          handle: string | null
          id: string
          is_new: boolean
          last_seen_at: string
          last_seen_job_id: string | null
          list_count: number
          phone: string | null
          phone_type: string | null
          platform: string | null
          record_types: string[]
          socials: Json
          source_types: string[]
          state: string | null
          updated_at: string
          website: string | null
          workspace_id: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          dedupe_key: string
          disposition?: string
          email?: string | null
          engagement?: string | null
          first_seen_at?: string
          first_seen_job_id?: string | null
          followers?: string | null
          full_name?: string | null
          handle?: string | null
          id?: string
          is_new?: boolean
          last_seen_at?: string
          last_seen_job_id?: string | null
          list_count?: number
          phone?: string | null
          phone_type?: string | null
          platform?: string | null
          record_types?: string[]
          socials?: Json
          source_types?: string[]
          state?: string | null
          updated_at?: string
          website?: string | null
          workspace_id: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          dedupe_key?: string
          disposition?: string
          email?: string | null
          engagement?: string | null
          first_seen_at?: string
          first_seen_job_id?: string | null
          followers?: string | null
          full_name?: string | null
          handle?: string | null
          id?: string
          is_new?: boolean
          last_seen_at?: string
          last_seen_job_id?: string | null
          list_count?: number
          phone?: string | null
          phone_type?: string | null
          platform?: string | null
          record_types?: string[]
          socials?: Json
          source_types?: string[]
          state?: string | null
          updated_at?: string
          website?: string | null
          workspace_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          tag_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          tag_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          tag_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_workspace_id_fkey"
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
      member_limits: {
        Row: {
          approval_threshold_credits: number | null
          created_at: string
          export_approval_threshold_rows: number | null
          monthly_credit_cap: number | null
          monthly_export_row_cap: number | null
          updated_at: string
          updated_by: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          approval_threshold_credits?: number | null
          created_at?: string
          export_approval_threshold_rows?: number | null
          monthly_credit_cap?: number | null
          monthly_export_row_cap?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          approval_threshold_credits?: number | null
          created_at?: string
          export_approval_threshold_rows?: number | null
          monthly_credit_cap?: number | null
          monthly_export_row_cap?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_limits_workspace_id_fkey"
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
          call_event: string | null
          campaign_id: string | null
          channel: string
          created_at: string
          direction: string
          error_code: string | null
          handoff_reason: string | null
          id: string
          is_bot: boolean
          is_optout: boolean | null
          lead_id: string | null
          provider_sid: string | null
          read_at: string | null
          recording_seconds: number | null
          recording_url: string | null
          sending_number_id: string | null
          status: string | null
          thread_key: string | null
          transcript: string | null
          workspace_id: string
        }
        Insert: {
          body?: string | null
          call_event?: string | null
          campaign_id?: string | null
          channel?: string
          created_at?: string
          direction: string
          error_code?: string | null
          handoff_reason?: string | null
          id?: string
          is_bot?: boolean
          is_optout?: boolean | null
          lead_id?: string | null
          provider_sid?: string | null
          read_at?: string | null
          recording_seconds?: number | null
          recording_url?: string | null
          sending_number_id?: string | null
          status?: string | null
          thread_key?: string | null
          transcript?: string | null
          workspace_id: string
        }
        Update: {
          body?: string | null
          call_event?: string | null
          campaign_id?: string | null
          channel?: string
          created_at?: string
          direction?: string
          error_code?: string | null
          handoff_reason?: string | null
          id?: string
          is_bot?: boolean
          is_optout?: boolean | null
          lead_id?: string | null
          provider_sid?: string | null
          read_at?: string | null
          recording_seconds?: number | null
          recording_url?: string | null
          sending_number_id?: string | null
          status?: string | null
          thread_key?: string | null
          transcript?: string | null
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
      monitor_subscriptions: {
        Row: {
          active: boolean
          alert_on: Json
          cadence: string
          created_at: string
          created_by: string
          id: string
          last_run_at: string | null
          list_id: string | null
          next_run_at: string | null
          scan_job_id: string | null
          vertical: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          alert_on?: Json
          cadence?: string
          created_at?: string
          created_by?: string
          id?: string
          last_run_at?: string | null
          list_id?: string | null
          next_run_at?: string | null
          scan_job_id?: string | null
          vertical?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          alert_on?: Json
          cadence?: string
          created_at?: string
          created_by?: string
          id?: string
          last_run_at?: string | null
          list_id?: string | null
          next_run_at?: string | null
          scan_job_id?: string | null
          vertical?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitor_subscriptions_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitor_subscriptions_scan_job_id_fkey"
            columns: ["scan_job_id"]
            isOneToOne: false
            referencedRelation: "scan_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitor_subscriptions_workspace_id_fkey"
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          job_id: string | null
          kind: string
          read_at: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: string
          read_at?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: string
          read_at?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      parcel_conditions: {
        Row: {
          apn: string
          boolean_detections: Json
          condition_confidence: number | null
          condition_vector: Json
          confidence_vector: Json
          distress_score: number
          fips: string
          id: string
          imagery_date: string
          imagery_source: string
          lat: number | null
          lng: number | null
          model_version: string
          rationale: Json | null
          scored_at: string
        }
        Insert: {
          apn: string
          boolean_detections?: Json
          condition_confidence?: number | null
          condition_vector?: Json
          confidence_vector?: Json
          distress_score?: number
          fips: string
          id?: string
          imagery_date: string
          imagery_source: string
          lat?: number | null
          lng?: number | null
          model_version: string
          rationale?: Json | null
          scored_at?: string
        }
        Update: {
          apn?: string
          boolean_detections?: Json
          condition_confidence?: number | null
          condition_vector?: Json
          confidence_vector?: Json
          distress_score?: number
          fips?: string
          id?: string
          imagery_date?: string
          imagery_source?: string
          lat?: number | null
          lng?: number | null
          model_version?: string
          rationale?: Json | null
          scored_at?: string
        }
        Relationships: []
      }
      provider_alerts: {
        Row: {
          created_at: string
          email: string
          id: string
          notified_at: string | null
          provider_key: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notified_at?: string | null
          provider_key: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notified_at?: string | null
          provider_key?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_status: {
        Row: {
          key: string
          message: string | null
          state: string
          updated_at: string
        }
        Insert: {
          key: string
          message?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          key?: string
          message?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      quick_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
          workspace_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          title: string
          workspace_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      record_types: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
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
      scan_jobs: {
        Row: {
          areas: Json
          buy_box: Json
          completed_at: string | null
          created_at: string
          created_by: string
          credits_charged: number | null
          credits_quoted: number | null
          credits_refunded: number | null
          example_parcels: Json
          failed_reason: string | null
          id: string
          images_per: number
          match_threshold: number
          mode: string
          name: string | null
          parcels_filtered: number | null
          parcels_in_area: number | null
          parcels_matched: number | null
          parcels_scanned: number | null
          prompt: string | null
          source_list_id: string | null
          status: string
          vertical: string
          workspace_id: string
        }
        Insert: {
          areas?: Json
          buy_box?: Json
          completed_at?: string | null
          created_at?: string
          created_by?: string
          credits_charged?: number | null
          credits_quoted?: number | null
          credits_refunded?: number | null
          example_parcels?: Json
          failed_reason?: string | null
          id?: string
          images_per?: number
          match_threshold?: number
          mode?: string
          name?: string | null
          parcels_filtered?: number | null
          parcels_in_area?: number | null
          parcels_matched?: number | null
          parcels_scanned?: number | null
          prompt?: string | null
          source_list_id?: string | null
          status?: string
          vertical?: string
          workspace_id: string
        }
        Update: {
          areas?: Json
          buy_box?: Json
          completed_at?: string | null
          created_at?: string
          created_by?: string
          credits_charged?: number | null
          credits_quoted?: number | null
          credits_refunded?: number | null
          example_parcels?: Json
          failed_reason?: string | null
          id?: string
          images_per?: number
          match_threshold?: number
          mode?: string
          name?: string | null
          parcels_filtered?: number | null
          parcels_in_area?: number | null
          parcels_matched?: number | null
          parcels_scanned?: number | null
          prompt?: string | null
          source_list_id?: string | null
          status?: string
          vertical?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_jobs_source_list_id_fkey"
            columns: ["source_list_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_results: {
        Row: {
          address: string | null
          apn: string | null
          city: string | null
          condition_confidence: number | null
          created_at: string
          distress_score: number | null
          enriched_at: string | null
          id: string
          job_id: string
          match_reason: string | null
          matched: boolean
          parcel_condition_id: string | null
          refunded: boolean
          refusal_code: string | null
          scored_image_date: string | null
          scored_image_src: string | null
          scored_image_url: string | null
          skip_traced_at: string | null
          state: string | null
          sv_heading: number | null
          sv_lat: number | null
          sv_lng: number | null
          sv_pano_id: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          apn?: string | null
          city?: string | null
          condition_confidence?: number | null
          created_at?: string
          distress_score?: number | null
          enriched_at?: string | null
          id?: string
          job_id: string
          match_reason?: string | null
          matched?: boolean
          parcel_condition_id?: string | null
          refunded?: boolean
          refusal_code?: string | null
          scored_image_date?: string | null
          scored_image_src?: string | null
          scored_image_url?: string | null
          skip_traced_at?: string | null
          state?: string | null
          sv_heading?: number | null
          sv_lat?: number | null
          sv_lng?: number | null
          sv_pano_id?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          apn?: string | null
          city?: string | null
          condition_confidence?: number | null
          created_at?: string
          distress_score?: number | null
          enriched_at?: string | null
          id?: string
          job_id?: string
          match_reason?: string | null
          matched?: boolean
          parcel_condition_id?: string | null
          refunded?: boolean
          refusal_code?: string | null
          scored_image_date?: string | null
          scored_image_src?: string | null
          scored_image_url?: string | null
          skip_traced_at?: string | null
          state?: string | null
          sv_heading?: number | null
          sv_lat?: number | null
          sv_lng?: number | null
          sv_pano_id?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scan_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_results_parcel_condition_id_fkey"
            columns: ["parcel_condition_id"]
            isOneToOne: false
            referencedRelation: "parcel_conditions"
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
      seat_revocations: {
        Row: {
          created_at: string
          id: string
          revoked_by: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          revoked_by?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          revoked_by?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_revocations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sending_numbers: {
        Row: {
          activated_at: string
          area_code: string | null
          created_at: string
          forward_calls_to: string | null
          health_score: number | null
          id: string
          optout_rate: number | null
          phone: string
          provider_sid: string | null
          recording_disclosure: boolean
          recording_enabled: boolean
          region: string | null
          status: string | null
          voicemail_greeting: string | null
          workspace_id: string
        }
        Insert: {
          activated_at?: string
          area_code?: string | null
          created_at?: string
          forward_calls_to?: string | null
          health_score?: number | null
          id?: string
          optout_rate?: number | null
          phone: string
          provider_sid?: string | null
          recording_disclosure?: boolean
          recording_enabled?: boolean
          region?: string | null
          status?: string | null
          voicemail_greeting?: string | null
          workspace_id: string
        }
        Update: {
          activated_at?: string
          area_code?: string | null
          created_at?: string
          forward_calls_to?: string | null
          health_score?: number | null
          id?: string
          optout_rate?: number | null
          phone?: string
          provider_sid?: string | null
          recording_disclosure?: boolean
          recording_enabled?: boolean
          region?: string | null
          status?: string | null
          voicemail_greeting?: string | null
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
          note: string | null
          phone: string
          reason: string | null
          source: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          phone: string
          reason?: string | null
          source?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          note?: string | null
          phone?: string
          reason?: string | null
          source?: string | null
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
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_prefs: {
        Row: {
          checklist_collapsed: boolean
          first_run_dismissed: boolean
          real_elite_user_id: string | null
          reviewed_clean_list: boolean
          theme: string
          tour_status: string | null
          updated_at: string
          user_id: string
          welcome_dismissed: boolean
        }
        Insert: {
          checklist_collapsed?: boolean
          first_run_dismissed?: boolean
          real_elite_user_id?: string | null
          reviewed_clean_list?: boolean
          theme?: string
          tour_status?: string | null
          updated_at?: string
          user_id: string
          welcome_dismissed?: boolean
        }
        Update: {
          checklist_collapsed?: boolean
          first_run_dismissed?: boolean
          real_elite_user_id?: string | null
          reviewed_clean_list?: boolean
          theme?: string
          tour_status?: string | null
          updated_at?: string
          user_id?: string
          welcome_dismissed?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_endpoints: {
        Row: {
          active: boolean
          created_at: string
          event_types: string[]
          id: string
          secret: string
          updated_at: string
          url: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          event_types?: string[]
          id?: string
          secret?: string
          updated_at?: string
          url: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          event_types?: string[]
          id?: string
          secret?: string
          updated_at?: string
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
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
          last_visit_at: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          last_visit_at?: string | null
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          last_visit_at?: string | null
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
      workspace_onboarding: {
        Row: {
          created_at: string
          first_run_dismissed: boolean
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          first_run_dismissed?: boolean
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          first_run_dismissed?: boolean
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_onboarding_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          billing_plan: string
          created_at: string
          id: string
          industry: string | null
          monthly_sms_cap: number | null
          name: string
          plan: string
          real_elite_linked_at: string | null
          real_elite_org_id: string | null
        }
        Insert: {
          billing_plan?: string
          created_at?: string
          id?: string
          industry?: string | null
          monthly_sms_cap?: number | null
          name: string
          plan?: string
          real_elite_linked_at?: string | null
          real_elite_org_id?: string | null
        }
        Update: {
          billing_plan?: string
          created_at?: string
          id?: string
          industry?: string | null
          monthly_sms_cap?: number | null
          name?: string
          plan?: string
          real_elite_linked_at?: string | null
          real_elite_org_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adapter_demand: {
        Args: never
        Returns: {
          desired_fields: string[]
          display_label: string
          first_requested_at: string
          frequencies: string[]
          last_requested_at: string
          logins: string[]
          needs_review: number
          queued: number
          requests: number
          sample_url: string
          screened_out: number
          source_key: string
          workspaces: number
        }[]
      }
      adapter_request_notify_list: {
        Args: { _source_key: string }
        Returns: {
          email: string
          frequency: string
          notified_at: string
          request_id: string
          requested_at: string
          workspace_id: string
          workspace_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_workspace_admin: { Args: { _workspace_id: string }; Returns: boolean }
      is_workspace_member: { Args: { _workspace_id: string }; Returns: boolean }
      is_workspace_owner: { Args: { _workspace_id: string }; Returns: boolean }
      workspace_role: { Args: { _workspace_id: string }; Returns: string }
    }
    Enums: {
      app_role: "super_admin" | "owner" | "admin" | "member"
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
      app_role: ["super_admin", "owner", "admin", "member"],
    },
  },
} as const
