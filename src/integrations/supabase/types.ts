export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      case_reports: {
        Row: {
          case_number: string;
          created_at: string;
          id: string;
          json_data: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          case_number: string;
          created_at?: string;
          id?: string;
          json_data: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          case_number?: string;
          created_at?: string;
          id?: string;
          json_data?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      case_timeline: {
        Row: {
          case_id: string;
          created_at: string;
          description: string | null;
          description_ar: string | null;
          event_date: string | null;
          event_type: string | null;
          id: string;
          level: Database["public"]["Enums"]["court_level"] | null;
          sort_order: number;
          title: string | null;
          title_ar: string | null;
        };
        Insert: {
          case_id: string;
          created_at?: string;
          description?: string | null;
          description_ar?: string | null;
          event_date?: string | null;
          event_type?: string | null;
          id?: string;
          level?: Database["public"]["Enums"]["court_level"] | null;
          sort_order?: number;
          title?: string | null;
          title_ar?: string | null;
        };
        Update: {
          case_id?: string;
          created_at?: string;
          description?: string | null;
          description_ar?: string | null;
          event_date?: string | null;
          event_type?: string | null;
          id?: string;
          level?: Database["public"]["Enums"]["court_level"] | null;
          sort_order?: number;
          title?: string | null;
          title_ar?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "case_timeline_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      cases: {
        Row: {
          case_number: string;
          case_type: string | null;
          case_type_ar: string | null;
          client_id: string | null;
          created_at: string;
          id: string;
          overall_status: string;
          title: string | null;
          title_ar: string | null;
          updated_at: string;
        };
        Insert: {
          case_number: string;
          case_type?: string | null;
          case_type_ar?: string | null;
          client_id?: string | null;
          created_at?: string;
          id?: string;
          overall_status?: string;
          title?: string | null;
          title_ar?: string | null;
          updated_at?: string;
        };
        Update: {
          case_number?: string;
          case_type?: string | null;
          case_type_ar?: string | null;
          client_id?: string | null;
          created_at?: string;
          id?: string;
          overall_status?: string;
          title?: string | null;
          title_ar?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cases_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      client_messages: {
        Row: {
          body: string;
          client_id: string;
          created_at: string;
          id: string;
          sender: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          client_id: string;
          created_at?: string;
          id?: string;
          sender?: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          client_id?: string;
          created_at?: string;
          id?: string;
          sender?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_messages_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          name_ar: string | null;
          national_id: string | null;
          notes: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          name_ar?: string | null;
          national_id?: string | null;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          name_ar?: string | null;
          national_id?: string | null;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      court_levels: {
        Row: {
          case_id: string;
          case_ref: string | null;
          court_name: string | null;
          created_at: string;
          id: string;
          level: Database["public"]["Enums"]["court_level"];
          registered_date: string | null;
          ruling_summary: string | null;
          sort_order: number;
          status: string | null;
        };
        Insert: {
          case_id: string;
          case_ref?: string | null;
          court_name?: string | null;
          created_at?: string;
          id?: string;
          level: Database["public"]["Enums"]["court_level"];
          registered_date?: string | null;
          ruling_summary?: string | null;
          sort_order?: number;
          status?: string | null;
        };
        Update: {
          case_id?: string;
          case_ref?: string | null;
          court_name?: string | null;
          created_at?: string;
          id?: string;
          level?: Database["public"]["Enums"]["court_level"];
          registered_date?: string | null;
          ruling_summary?: string | null;
          sort_order?: number;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "court_levels_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      execution_procedures: {
        Row: {
          case_id: string;
          created_at: string;
          file_number: string | null;
          id: string;
          jurisdiction: string | null;
          notes: string | null;
          opened_date: string | null;
          status: string | null;
        };
        Insert: {
          case_id: string;
          created_at?: string;
          file_number?: string | null;
          id?: string;
          jurisdiction?: string | null;
          notes?: string | null;
          opened_date?: string | null;
          status?: string | null;
        };
        Update: {
          case_id?: string;
          created_at?: string;
          file_number?: string | null;
          id?: string;
          jurisdiction?: string | null;
          notes?: string | null;
          opened_date?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "execution_procedures_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      execution_receipts: {
        Row: {
          amount: number | null;
          created_at: string;
          description: string | null;
          execution_id: string;
          id: string;
          receipt_date: string | null;
        };
        Insert: {
          amount?: number | null;
          created_at?: string;
          description?: string | null;
          execution_id: string;
          id?: string;
          receipt_date?: string | null;
        };
        Update: {
          amount?: number | null;
          created_at?: string;
          description?: string | null;
          execution_id?: string;
          id?: string;
          receipt_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "execution_receipts_execution_id_fkey";
            columns: ["execution_id"];
            isOneToOne: false;
            referencedRelation: "execution_procedures";
            referencedColumns: ["id"];
          },
        ];
      };
      generated_reports: {
        Row: {
          case_id: string;
          created_at: string;
          id: string;
          report_data: Json | null;
          status_headline: string | null;
        };
        Insert: {
          case_id: string;
          created_at?: string;
          id?: string;
          report_data?: Json | null;
          status_headline?: string | null;
        };
        Update: {
          case_id?: string;
          created_at?: string;
          id?: string;
          report_data?: Json | null;
          status_headline?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "generated_reports_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      hearings: {
        Row: {
          case_id: string;
          created_at: string;
          id: string;
          level: Database["public"]["Enums"]["court_level"] | null;
          notes: string | null;
          session_date: string | null;
          sort_order: number;
          status: string | null;
        };
        Insert: {
          case_id: string;
          created_at?: string;
          id?: string;
          level?: Database["public"]["Enums"]["court_level"] | null;
          notes?: string | null;
          session_date?: string | null;
          sort_order?: number;
          status?: string | null;
        };
        Update: {
          case_id?: string;
          created_at?: string;
          id?: string;
          level?: Database["public"]["Enums"]["court_level"] | null;
          notes?: string | null;
          session_date?: string | null;
          sort_order?: number;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hearings_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          amount: number;
          case_id: string | null;
          client_id: string | null;
          created_at: string;
          currency: string;
          description: string | null;
          description_ar: string | null;
          due_date: string | null;
          id: string;
          invoice_number: string;
          issue_date: string;
          paid_date: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount?: number;
          case_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          description_ar?: string | null;
          due_date?: string | null;
          id?: string;
          invoice_number: string;
          issue_date?: string;
          paid_date?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          case_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          description_ar?: string | null;
          due_date?: string | null;
          id?: string;
          invoice_number?: string;
          issue_date?: string;
          paid_date?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      judgments: {
        Row: {
          amount: number | null;
          case_id: string;
          created_at: string;
          id: string;
          judgment_date: string | null;
          judgment_type: string | null;
          level: Database["public"]["Enums"]["court_level"];
          payment_status: string | null;
          ruling_text: string | null;
          sort_order: number;
        };
        Insert: {
          amount?: number | null;
          case_id: string;
          created_at?: string;
          id?: string;
          judgment_date?: string | null;
          judgment_type?: string | null;
          level: Database["public"]["Enums"]["court_level"];
          payment_status?: string | null;
          ruling_text?: string | null;
          sort_order?: number;
        };
        Update: {
          amount?: number | null;
          case_id?: string;
          created_at?: string;
          id?: string;
          judgment_date?: string | null;
          judgment_type?: string | null;
          level?: Database["public"]["Enums"]["court_level"];
          payment_status?: string | null;
          ruling_text?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "judgments_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      legal_knowledge: {
        Row: {
          content: string;
          created_at: string;
          embedding: string | null;
          id: string;
          metadata: Json;
          title: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          metadata?: Json;
          title: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          metadata?: Json;
          title?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          full_name_ar: string | null;
          id: string;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          full_name_ar?: string | null;
          id: string;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          full_name_ar?: string | null;
          id?: string;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          assignee: string | null;
          assignee_ar: string | null;
          case_id: string | null;
          created_at: string;
          description: string | null;
          description_ar: string | null;
          due_date: string | null;
          id: string;
          priority: string;
          sort_order: number;
          status: string;
          title: string;
          title_ar: string | null;
          updated_at: string;
        };
        Insert: {
          assignee?: string | null;
          assignee_ar?: string | null;
          case_id?: string | null;
          created_at?: string;
          description?: string | null;
          description_ar?: string | null;
          due_date?: string | null;
          id?: string;
          priority?: string;
          sort_order?: number;
          status?: string;
          title: string;
          title_ar?: string | null;
          updated_at?: string;
        };
        Update: {
          assignee?: string | null;
          assignee_ar?: string | null;
          case_id?: string | null;
          created_at?: string;
          description?: string | null;
          description_ar?: string | null;
          due_date?: string | null;
          id?: string;
          priority?: string;
          sort_order?: number;
          status?: string;
          title?: string;
          title_ar?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      time_entries: {
        Row: {
          case_id: string | null;
          created_at: string;
          description: string | null;
          duration_minutes: number;
          entry_date: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          case_id?: string | null;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number;
          entry_date?: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          case_id?: string | null;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number;
          entry_date?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_entries_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      workflow_templates: {
        Row: {
          created_at: string;
          description: string | null;
          description_ar: string | null;
          id: string;
          name: string;
          name_ar: string | null;
          steps: Json;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          description_ar?: string | null;
          id?: string;
          name: string;
          name_ar?: string | null;
          steps?: Json;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          description_ar?: string | null;
          id?: string;
          name?: string;
          name_ar?: string | null;
          steps?: Json;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_first_admin: { Args: never; Returns: boolean };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      match_legal_knowledge: {
        Args: { match_count?: number; query_embedding: string };
        Returns: {
          content: string;
          id: string;
          similarity: number;
          title: string;
        }[];
      };
    };
    Enums: {
      app_role: "partner" | "associate" | "paralegal" | "admin" | "bot";
      court_level: "first_instance" | "appeal" | "cassation" | "execution" | "police_prosecution";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["partner", "associate", "paralegal", "admin", "bot"],
      court_level: ["first_instance", "appeal", "cassation", "execution", "police_prosecution"],
    },
  },
} as const;
