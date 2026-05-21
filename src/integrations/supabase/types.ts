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
      agent_actions: {
        Row: {
          action_type: string
          connection_id: string | null
          created_at: string
          details: Json
          finding_id: string | null
          id: string
          reasoning: string | null
          status: string
          target: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          connection_id?: string | null
          created_at?: string
          details?: Json
          finding_id?: string | null
          id?: string
          reasoning?: string | null
          status?: string
          target?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          connection_id?: string | null
          created_at?: string
          details?: Json
          finding_id?: string | null
          id?: string
          reasoning?: string | null
          status?: string
          target?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          connection_id: string
          errors: string[]
          finished_at: string | null
          id: string
          started_at: string
          stats: Json
          status: string
          user_id: string
        }
        Insert: {
          connection_id: string
          errors?: string[]
          finished_at?: string | null
          id?: string
          started_at?: string
          stats?: Json
          status?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          errors?: string[]
          finished_at?: string | null
          id?: string
          started_at?: string
          stats?: Json
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      aws_connections: {
        Row: {
          access_key_id: string
          auto_response_enabled: boolean
          aws_account_id: string | null
          aws_arn: string | null
          created_at: string
          encrypted_secret: string | null
          id: string
          label: string
          last_error: string | null
          last_validated_at: string | null
          region: string
          secret_access_key: string
          status: string
          user_id: string
        }
        Insert: {
          access_key_id: string
          auto_response_enabled?: boolean
          aws_account_id?: string | null
          aws_arn?: string | null
          created_at?: string
          encrypted_secret?: string | null
          id?: string
          label?: string
          last_error?: string | null
          last_validated_at?: string | null
          region?: string
          secret_access_key: string
          status?: string
          user_id: string
        }
        Update: {
          access_key_id?: string
          auto_response_enabled?: boolean
          aws_account_id?: string | null
          aws_arn?: string | null
          created_at?: string
          encrypted_secret?: string | null
          id?: string
          label?: string
          last_error?: string | null
          last_validated_at?: string | null
          region?: string
          secret_access_key?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      detection_rules: {
        Row: {
          connection_id: string
          created_at: string
          description: string
          enabled: boolean
          generated_by: string
          id: string
          match_event_names: string[]
          match_keywords: string[]
          mitre_technique: string | null
          name: string
          severity: string
          user_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          description: string
          enabled?: boolean
          generated_by?: string
          id?: string
          match_event_names?: string[]
          match_keywords?: string[]
          mitre_technique?: string | null
          name: string
          severity?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          description?: string
          enabled?: boolean
          generated_by?: string
          id?: string
          match_event_names?: string[]
          match_keywords?: string[]
          mitre_technique?: string | null
          name?: string
          severity?: string
          user_id?: string
        }
        Relationships: []
      }
      findings: {
        Row: {
          ai_analyzed_at: string | null
          ai_category: string | null
          ai_remediation: string | null
          ai_severity: string | null
          ai_summary: string | null
          connection_id: string
          created_at: string
          event_name: string | null
          event_time: string | null
          external_id: string
          id: string
          raw: Json
          region: string | null
          severity: number | null
          source: string
          source_ip: string | null
          title: string | null
          user_agent: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          ai_analyzed_at?: string | null
          ai_category?: string | null
          ai_remediation?: string | null
          ai_severity?: string | null
          ai_summary?: string | null
          connection_id: string
          created_at?: string
          event_name?: string | null
          event_time?: string | null
          external_id: string
          id?: string
          raw: Json
          region?: string | null
          severity?: number | null
          source: string
          source_ip?: string | null
          title?: string | null
          user_agent?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          ai_analyzed_at?: string | null
          ai_category?: string | null
          ai_remediation?: string | null
          ai_severity?: string | null
          ai_summary?: string | null
          connection_id?: string
          created_at?: string
          event_name?: string | null
          event_time?: string | null
          external_id?: string
          id?: string
          raw?: Json
          region?: string | null
          severity?: number | null
          source?: string
          source_ip?: string | null
          title?: string | null
          user_agent?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "findings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "aws_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "aws_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          affected_resources: string[]
          connection_id: string
          created_at: string
          executive_summary: string
          id: string
          mitre_tactics: string[]
          recommendations: string
          related_finding_ids: string[]
          severity: string
          timeline: Json
          title: string
          user_id: string
        }
        Insert: {
          affected_resources?: string[]
          connection_id: string
          created_at?: string
          executive_summary: string
          id?: string
          mitre_tactics?: string[]
          recommendations: string
          related_finding_ids?: string[]
          severity?: string
          timeline?: Json
          title: string
          user_id: string
        }
        Update: {
          affected_resources?: string[]
          connection_id?: string
          created_at?: string
          executive_summary?: string
          id?: string
          mitre_tactics?: string[]
          recommendations?: string
          related_finding_ids?: string[]
          severity?: string
          timeline?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      aws_connections_safe: {
        Row: {
          aws_account_id: string | null
          aws_arn: string | null
          created_at: string | null
          id: string | null
          label: string | null
          last_error: string | null
          last_validated_at: string | null
          region: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          aws_account_id?: string | null
          aws_arn?: string | null
          created_at?: string | null
          id?: string | null
          label?: string | null
          last_error?: string | null
          last_validated_at?: string | null
          region?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          aws_account_id?: string | null
          aws_arn?: string | null
          created_at?: string | null
          id?: string | null
          label?: string | null
          last_error?: string | null
          last_validated_at?: string | null
          region?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
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
