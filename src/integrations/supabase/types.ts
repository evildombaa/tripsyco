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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      itineraries: {
        Row: {
          budget: number | null
          created_at: string
          id: string
          trip_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          id?: string
          trip_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          id?: string
          trip_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      itinerary_day_items: {
        Row: {
          activity: string
          created_at: string
          day_id: string
          description: string | null
          estimated_cost: number | null
          id: string
          image_url: string | null
          location: string
          place_id: string | null
          rating: number | null
          sort_order: number
          status: string | null
          time_slot: string
        }
        Insert: {
          activity?: string
          created_at?: string
          day_id: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          image_url?: string | null
          location?: string
          place_id?: string | null
          rating?: number | null
          sort_order?: number
          status?: string | null
          time_slot?: string
        }
        Update: {
          activity?: string
          created_at?: string
          day_id?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          image_url?: string | null
          location?: string
          place_id?: string | null
          rating?: number | null
          sort_order?: number
          status?: string | null
          time_slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_day_items_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "itinerary_days"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_days: {
        Row: {
          created_at: string
          id: string
          itinerary_id: string
          location: string | null
          sort_order: number
          trip_date: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          itinerary_id: string
          location?: string | null
          sort_order?: number
          trip_date?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          itinerary_id?: string
          location?: string | null
          sort_order?: number
          trip_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_days_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_feedback: {
        Row: {
          created_at: string
          feedback_text: string
          id: string
          itinerary_id: string
          rating: number
          suggestions: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_text?: string
          id?: string
          itinerary_id: string
          rating: number
          suggestions?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_text?: string
          id?: string
          itinerary_id?: string
          rating?: number
          suggestions?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_feedback_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_preferences: {
        Row: {
          budget: string
          budget_tier: string | null
          created_at: string
          daily_hours_end: string | null
          daily_hours_start: string | null
          destination: string
          duration: string
          duration_other: string | null
          id: string
          itinerary_id: string
          travel_companion: string
          travel_companion_other: string | null
          travel_purpose: string
          travel_purpose_other: string | null
          travel_purposes: string[] | null
          travel_style: string
          travel_style_other: string | null
        }
        Insert: {
          budget?: string
          budget_tier?: string | null
          created_at?: string
          daily_hours_end?: string | null
          daily_hours_start?: string | null
          destination?: string
          duration?: string
          duration_other?: string | null
          id?: string
          itinerary_id: string
          travel_companion?: string
          travel_companion_other?: string | null
          travel_purpose?: string
          travel_purpose_other?: string | null
          travel_purposes?: string[] | null
          travel_style?: string
          travel_style_other?: string | null
        }
        Update: {
          budget?: string
          budget_tier?: string | null
          created_at?: string
          daily_hours_end?: string | null
          daily_hours_start?: string | null
          destination?: string
          duration?: string
          duration_other?: string | null
          id?: string
          itinerary_id?: string
          travel_companion?: string
          travel_companion_other?: string | null
          travel_purpose?: string
          travel_purpose_other?: string | null
          travel_purposes?: string[] | null
          travel_style?: string
          travel_style_other?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_preferences_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: true
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_owns_day: { Args: { _day_id: string }; Returns: boolean }
      user_owns_itinerary: { Args: { _itinerary_id: string }; Returns: boolean }
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
