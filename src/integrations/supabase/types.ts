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
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          firm_id: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      case_documents: {
        Row: {
          case_id: string | null
          category: string | null
          client_id: string | null
          created_at: string
          description: string | null
          file_name: string
          firm_id: string
          id: string
          is_client_visible: boolean
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          case_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          firm_id?: string
          id?: string
          is_client_visible?: boolean
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          case_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          firm_id?: string
          id?: string
          is_client_visible?: boolean
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_documents_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      case_notes: {
        Row: {
          author_id: string
          body: string
          case_id: string
          created_at: string
          firm_id: string
          id: string
          is_internal: boolean
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          case_id: string
          created_at?: string
          firm_id?: string
          id?: string
          is_internal?: boolean
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          case_id?: string
          created_at?: string
          firm_id?: string
          id?: string
          is_internal?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_notes_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      case_reports: {
        Row: {
          case_number: string
          created_at: string
          firm_id: string
          id: string
          json_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          case_number: string
          created_at?: string
          firm_id?: string
          id?: string
          json_data: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          case_number?: string
          created_at?: string
          firm_id?: string
          id?: string
          json_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_reports_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      case_timeline: {
        Row: {
          case_id: string
          created_at: string
          description: string | null
          description_ar: string | null
          event_date: string | null
          event_type: string | null
          firm_id: string
          id: string
          level: Database["public"]["Enums"]["court_level"] | null
          sort_order: number
          title: string | null
          title_ar: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          description?: string | null
          description_ar?: string | null
          event_date?: string | null
          event_type?: string | null
          firm_id?: string
          id?: string
          level?: Database["public"]["Enums"]["court_level"] | null
          sort_order?: number
          title?: string | null
          title_ar?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          description?: string | null
          description_ar?: string | null
          event_date?: string | null
          event_type?: string | null
          firm_id?: string
          id?: string
          level?: Database["public"]["Enums"]["court_level"] | null
          sort_order?: number
          title?: string | null
          title_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_timeline_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_timeline_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          case_number: string
          case_type: string | null
          case_type_ar: string | null
          client_id: string | null
          created_at: string
          firm_id: string
          id: string
          overall_status: string
          title: string | null
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          case_number: string
          case_type?: string | null
          case_type_ar?: string | null
          client_id?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          overall_status?: string
          title?: string | null
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          case_number?: string
          case_type?: string | null
          case_type_ar?: string | null
          client_id?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          overall_status?: string
          title?: string | null
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      client_messages: {
        Row: {
          body: string
          client_id: string
          created_at: string
          firm_id: string
          id: string
          sender: string
          updated_at: string
        }
        Insert: {
          body: string
          client_id: string
          created_at?: string
          firm_id?: string
          id?: string
          sender?: string
          updated_at?: string
        }
        Update: {
          body?: string
          client_id?: string
          created_at?: string
          firm_id?: string
          id?: string
          sender?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_messages_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          firm_id: string
          id: string
          name: string
          name_ar: string | null
          national_id: string | null
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          firm_id?: string
          id?: string
          name: string
          name_ar?: string | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          firm_id?: string
          id?: string
          name?: string
          name_ar?: string | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      court_levels: {
        Row: {
          case_id: string
          case_ref: string | null
          court_name: string | null
          created_at: string
          firm_id: string
          id: string
          level: Database["public"]["Enums"]["court_level"]
          registered_date: string | null
          ruling_summary: string | null
          sort_order: number
          status: string | null
        }
        Insert: {
          case_id: string
          case_ref?: string | null
          court_name?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          level: Database["public"]["Enums"]["court_level"]
          registered_date?: string | null
          ruling_summary?: string | null
          sort_order?: number
          status?: string | null
        }
        Update: {
          case_id?: string
          case_ref?: string | null
          court_name?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          level?: Database["public"]["Enums"]["court_level"]
          registered_date?: string | null
          ruling_summary?: string | null
          sort_order?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "court_levels_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_levels_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_procedures: {
        Row: {
          case_id: string
          created_at: string
          file_number: string | null
          firm_id: string
          id: string
          jurisdiction: string | null
          notes: string | null
          opened_date: string | null
          status: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          file_number?: string | null
          firm_id?: string
          id?: string
          jurisdiction?: string | null
          notes?: string | null
          opened_date?: string | null
          status?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          file_number?: string | null
          firm_id?: string
          id?: string
          jurisdiction?: string | null
          notes?: string | null
          opened_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "execution_procedures_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_procedures_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_receipts: {
        Row: {
          amount: number | null
          created_at: string
          description: string | null
          execution_id: string
          firm_id: string
          id: string
          receipt_date: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description?: string | null
          execution_id: string
          firm_id?: string
          id?: string
          receipt_date?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string | null
          execution_id?: string
          firm_id?: string
          id?: string
          receipt_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "execution_receipts_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "execution_procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_receipts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          firm_id: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          firm_id: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          firm_id?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_invitations_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_settings: {
        Row: {
          address: string | null
          address_ar: string | null
          bank_iban: string | null
          bank_name: string | null
          created_at: string
          default_currency: string
          email: string | null
          firm_id: string
          firm_name: string
          firm_name_ar: string
          holidays: Json
          id: string
          invoice_next_seq: number
          invoice_prefix: string
          knet_merchant_link: string | null
          logo_url: string | null
          owner_id: string
          phone: string | null
          updated_at: string
          vat_number: string | null
          working_hours_end: string
          working_hours_start: string
        }
        Insert: {
          address?: string | null
          address_ar?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          created_at?: string
          default_currency?: string
          email?: string | null
          firm_id?: string
          firm_name?: string
          firm_name_ar?: string
          holidays?: Json
          id?: string
          invoice_next_seq?: number
          invoice_prefix?: string
          knet_merchant_link?: string | null
          logo_url?: string | null
          owner_id: string
          phone?: string | null
          updated_at?: string
          vat_number?: string | null
          working_hours_end?: string
          working_hours_start?: string
        }
        Update: {
          address?: string | null
          address_ar?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          created_at?: string
          default_currency?: string
          email?: string | null
          firm_id?: string
          firm_name?: string
          firm_name_ar?: string
          holidays?: Json
          id?: string
          invoice_next_seq?: number
          invoice_prefix?: string
          knet_merchant_link?: string | null
          logo_url?: string | null
          owner_id?: string
          phone?: string | null
          updated_at?: string
          vat_number?: string | null
          working_hours_end?: string
          working_hours_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_settings_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name_ar: string
          name_en: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name_ar: string
          name_en: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name_ar?: string
          name_en?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      generated_reports: {
        Row: {
          case_id: string
          created_at: string
          firm_id: string
          id: string
          report_data: Json | null
          status_headline: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          firm_id?: string
          id?: string
          report_data?: Json | null
          status_headline?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          firm_id?: string
          id?: string
          report_data?: Json | null
          status_headline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      hearings: {
        Row: {
          case_id: string
          created_at: string
          firm_id: string
          id: string
          level: Database["public"]["Enums"]["court_level"] | null
          notes: string | null
          session_date: string | null
          sort_order: number
          status: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          firm_id?: string
          id?: string
          level?: Database["public"]["Enums"]["court_level"] | null
          notes?: string | null
          session_date?: string | null
          sort_order?: number
          status?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          firm_id?: string
          id?: string
          level?: Database["public"]["Enums"]["court_level"] | null
          notes?: string | null
          session_date?: string | null
          sort_order?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hearings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hearings_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          case_id: string | null
          client_id: string | null
          created_at: string
          currency: string
          description: string | null
          description_ar: string | null
          due_date: string | null
          firm_id: string
          id: string
          invoice_number: string
          issue_date: string
          paid_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          description_ar?: string | null
          due_date?: string | null
          firm_id?: string
          id?: string
          invoice_number: string
          issue_date?: string
          paid_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          description_ar?: string | null
          due_date?: string | null
          firm_id?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          paid_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      judgments: {
        Row: {
          amount: number | null
          case_id: string
          created_at: string
          firm_id: string
          id: string
          judgment_date: string | null
          judgment_type: string | null
          level: Database["public"]["Enums"]["court_level"]
          payment_status: string | null
          ruling_text: string | null
          sort_order: number
        }
        Insert: {
          amount?: number | null
          case_id: string
          created_at?: string
          firm_id?: string
          id?: string
          judgment_date?: string | null
          judgment_type?: string | null
          level: Database["public"]["Enums"]["court_level"]
          payment_status?: string | null
          ruling_text?: string | null
          sort_order?: number
        }
        Update: {
          amount?: number | null
          case_id?: string
          created_at?: string
          firm_id?: string
          id?: string
          judgment_date?: string | null
          judgment_type?: string | null
          level?: Database["public"]["Enums"]["court_level"]
          payment_status?: string | null
          ruling_text?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "judgments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judgments_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_knowledge: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          firm_id: string | null
          id: string
          metadata: Json
          scope: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          firm_id?: string | null
          id?: string
          metadata?: Json
          scope?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          firm_id?: string | null
          id?: string
          metadata?: Json
          scope?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_knowledge_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          firm_id: string | null
          href: string | null
          id: string
          kind: string
          metadata: Json | null
          read_at: string | null
          severity: string
          subtitle_ar: string | null
          subtitle_en: string | null
          title_ar: string
          title_en: string
          user_id: string
        }
        Insert: {
          created_at?: string
          firm_id?: string | null
          href?: string | null
          id?: string
          kind: string
          metadata?: Json | null
          read_at?: string | null
          severity?: string
          subtitle_ar?: string | null
          subtitle_en?: string | null
          title_ar: string
          title_en: string
          user_id: string
        }
        Update: {
          created_at?: string
          firm_id?: string | null
          href?: string | null
          id?: string
          kind?: string
          metadata?: Json | null
          read_at?: string | null
          severity?: string
          subtitle_ar?: string | null
          subtitle_en?: string | null
          title_ar?: string
          title_en?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          firm_id: string | null
          full_name: string | null
          full_name_ar: string | null
          id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          firm_id?: string | null
          full_name?: string | null
          full_name_ar?: string | null
          id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          firm_id?: string | null
          full_name?: string | null
          full_name_ar?: string | null
          id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee: string | null
          assignee_ar: string | null
          case_id: string | null
          created_at: string
          description: string | null
          description_ar: string | null
          due_date: string | null
          firm_id: string
          id: string
          priority: string
          sort_order: number
          status: string
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          assignee_ar?: string | null
          case_id?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          due_date?: string | null
          firm_id?: string
          id?: string
          priority?: string
          sort_order?: number
          status?: string
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          assignee_ar?: string | null
          case_id?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          due_date?: string | null
          firm_id?: string
          id?: string
          priority?: string
          sort_order?: number
          status?: string
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          case_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          entry_date: string
          firm_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          entry_date?: string
          firm_id?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          entry_date?: string
          firm_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_ledger: {
        Row: {
          amount: number
          case_id: string | null
          client_id: string
          created_at: string
          currency: string
          description: string | null
          description_ar: string | null
          entry_date: string
          entry_type: string
          firm_id: string
          id: string
          recorded_by: string | null
          reference_number: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          case_id?: string | null
          client_id: string
          created_at?: string
          currency?: string
          description?: string | null
          description_ar?: string | null
          entry_date?: string
          entry_type: string
          firm_id?: string
          id?: string
          recorded_by?: string | null
          reference_number?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          case_id?: string | null
          client_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          description_ar?: string | null
          entry_date?: string
          entry_type?: string
          firm_id?: string
          id?: string
          recorded_by?: string | null
          reference_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_ledger_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_ledger_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_ledger_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_templates: {
        Row: {
          created_at: string
          description: string | null
          description_ar: string | null
          firm_id: string
          id: string
          name: string
          name_ar: string | null
          steps: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          firm_id?: string
          id?: string
          name: string
          name_ar?: string | null
          steps?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          firm_id?: string
          id?: string
          name?: string
          name_ar?: string | null
          steps?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_firm_invitation: { Args: { _token: string }; Returns: string }
      belongs_to_firm: { Args: { _firm_id: string }; Returns: boolean }
      claim_first_admin: { Args: never; Returns: boolean }
      create_firm_for_current_user: {
        Args: { _name_ar: string; _name_en: string }
        Returns: string
      }
      current_firm_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      match_legal_knowledge: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
          title: string
        }[]
      }
    }
    Enums: {
      app_role: "partner" | "associate" | "paralegal" | "admin" | "bot"
      court_level:
        | "first_instance"
        | "appeal"
        | "cassation"
        | "execution"
        | "police_prosecution"
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
      app_role: ["partner", "associate", "paralegal", "admin", "bot"],
      court_level: [
        "first_instance",
        "appeal",
        "cassation",
        "execution",
        "police_prosecution",
      ],
    },
  },
} as const
