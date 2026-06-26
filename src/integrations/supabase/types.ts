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
      leaderboard_entries: {
        Row: {
          created_at: string
          id: string
          main_event_id: string
          percentile: number
          rank: number
          score: number
          time_taken_seconds: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          main_event_id: string
          percentile: number
          rank: number
          score: number
          time_taken_seconds: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          main_event_id?: string
          percentile?: number
          rank?: number
          score?: number
          time_taken_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_entries_main_event_id_fkey"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "main_test_events"
            referencedColumns: ["id"]
          },
        ]
      }
      main_test_events: {
        Row: {
          closes_at: string
          created_at: string
          duration_minutes: number
          id: string
          new_question_ratio: number
          opens_at: string
          repeat_question_ratio: number
          scheduled_date: string
          status: Database["public"]["Enums"]["main_event_status"]
        }
        Insert: {
          closes_at: string
          created_at?: string
          duration_minutes?: number
          id?: string
          new_question_ratio?: number
          opens_at: string
          repeat_question_ratio?: number
          scheduled_date: string
          status?: Database["public"]["Enums"]["main_event_status"]
        }
        Update: {
          closes_at?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          new_question_ratio?: number
          opens_at?: string
          repeat_question_ratio?: number
          scheduled_date?: string
          status?: Database["public"]["Enums"]["main_event_status"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
          target_exam: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          name?: string | null
          target_exam?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          target_exam?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      question_reports: {
        Row: {
          created_at: string
          id: string
          question_id: string
          reason: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          reason: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          reason?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_option: Database["public"]["Enums"]["option_letter"]
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string | null
          id: string
          is_active: boolean
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          stem: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          correct_option: Database["public"]["Enums"]["option_letter"]
          created_at?: string
          created_by?: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          is_active?: boolean
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          stem: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          correct_option?: Database["public"]["Enums"]["option_letter"]
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          is_active?: boolean
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          stem?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      test_pattern_settings: {
        Row: {
          daily_practice_cap: number
          id: number
          main_test_duration_minutes: number
          main_test_new_ratio: number
          main_test_repeat_ratio: number
          pct_easy: number
          pct_hard: number
          pct_medium: number
          pct_very_hard: number
          unit1_count: number
          unit2_count: number
          updated_at: string
        }
        Insert: {
          daily_practice_cap?: number
          id?: number
          main_test_duration_minutes?: number
          main_test_new_ratio?: number
          main_test_repeat_ratio?: number
          pct_easy?: number
          pct_hard?: number
          pct_medium?: number
          pct_very_hard?: number
          unit1_count?: number
          unit2_count?: number
          updated_at?: string
        }
        Update: {
          daily_practice_cap?: number
          id?: number
          main_test_duration_minutes?: number
          main_test_new_ratio?: number
          main_test_repeat_ratio?: number
          pct_easy?: number
          pct_hard?: number
          pct_medium?: number
          pct_very_hard?: number
          unit1_count?: number
          unit2_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      test_questions: {
        Row: {
          id: string
          is_correct: boolean | null
          position: number
          question_id: string
          selected_option: Database["public"]["Enums"]["option_letter"] | null
          test_id: string
          time_spent_seconds: number | null
        }
        Insert: {
          id?: string
          is_correct?: boolean | null
          position: number
          question_id: string
          selected_option?: Database["public"]["Enums"]["option_letter"] | null
          test_id: string
          time_spent_seconds?: number | null
        }
        Update: {
          id?: string
          is_correct?: boolean | null
          position?: number
          question_id?: string
          selected_option?: Database["public"]["Enums"]["option_letter"] | null
          test_id?: string
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          created_at: string
          id: string
          main_event_id: string | null
          score: number
          started_at: string
          status: Database["public"]["Enums"]["test_status"]
          submitted_at: string | null
          test_type: Database["public"]["Enums"]["test_type"]
          time_limit_seconds: number | null
          total_questions: number
          total_time_seconds: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          main_event_id?: string | null
          score?: number
          started_at?: string
          status?: Database["public"]["Enums"]["test_status"]
          submitted_at?: string | null
          test_type: Database["public"]["Enums"]["test_type"]
          time_limit_seconds?: number | null
          total_questions?: number
          total_time_seconds?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          main_event_id?: string | null
          score?: number
          started_at?: string
          status?: Database["public"]["Enums"]["test_status"]
          submitted_at?: string | null
          test_type?: Database["public"]["Enums"]["test_type"]
          time_limit_seconds?: number | null
          total_questions?: number
          total_time_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_main_event_fk"
            columns: ["main_event_id"]
            isOneToOne: false
            referencedRelation: "main_test_events"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          unit: Database["public"]["Enums"]["test_unit"]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          unit: Database["public"]["Enums"]["test_unit"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          unit?: Database["public"]["Enums"]["test_unit"]
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
      user_seen_questions: {
        Row: {
          first_seen_at: string
          question_id: string
          user_id: string
        }
        Insert: {
          first_seen_at?: string
          question_id: string
          user_id: string
        }
        Update: {
          first_seen_at?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_seen_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      difficulty_level: "easy" | "medium" | "hard" | "very_hard"
      main_event_status: "scheduled" | "open" | "closed" | "scored"
      option_letter: "A" | "B" | "C" | "D"
      test_status: "in_progress" | "submitted" | "expired"
      test_type: "practice" | "main"
      test_unit: "I" | "II"
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
      app_role: ["admin", "user"],
      difficulty_level: ["easy", "medium", "hard", "very_hard"],
      main_event_status: ["scheduled", "open", "closed", "scored"],
      option_letter: ["A", "B", "C", "D"],
      test_status: ["in_progress", "submitted", "expired"],
      test_type: ["practice", "main"],
      test_unit: ["I", "II"],
    },
  },
} as const
