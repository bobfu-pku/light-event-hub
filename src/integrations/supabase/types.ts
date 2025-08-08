export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      event_organizers: {
        Row: {
          event_id: string
          user_id: string
          role: Database["public"]["Enums"]["organizer_role"]
          added_by: string | null
          created_at: string
        }
        Insert: {
          event_id: string
          user_id: string
          role: Database["public"]["Enums"]["organizer_role"]
          added_by?: string | null
          created_at?: string
        }
        Update: {
          event_id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["organizer_role"]
          added_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_organizers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_organizers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organizer_point_allocations: {
        Row: {
          id: string
          event_id: string
          recipient_user_id: string
          points: number
          allocated_by: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          recipient_user_id: string
          points: number
          allocated_by: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          recipient_user_id?: string
          points?: number
          allocated_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_point_allocations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizer_point_allocations_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organizer_point_allocations_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_points: {
        Row: {
          id: string
          user_id: string
          event_id: string | null
          kind: Database["public"]["Enums"]["point_kind"]
          points: number
          earned_reason: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          event_id?: string | null
          kind: Database["public"]["Enums"]["point_kind"]
          points: number
          earned_reason?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string | null
          kind?: Database["public"]["Enums"]["point_kind"]
          points?: number
          earned_reason?: string | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_points_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_points_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      event_discussions: {
        Row: {
          author_id: string
          content: string
          created_at: string
          event_id: string
          id: string
          is_deleted: boolean | null
          is_pinned: boolean | null
          parent_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          event_id: string
          id?: string
          is_deleted?: boolean | null
          is_pinned?: boolean | null
          parent_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          is_deleted?: boolean | null
          is_pinned?: boolean | null
          parent_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_discussions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_discussions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_discussions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "event_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          additional_info: Json | null
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string
          event_id: string
          id: string
          participant_email: string | null
          participant_name: string
          participant_phone: string
          payment_amount: number | null
          status: Database["public"]["Enums"]["registration_status"] | null
          updated_at: string
          user_id: string
          verification_code: string | null
        }
        Insert: {
          additional_info?: Json | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          event_id: string
          id?: string
          participant_email?: string | null
          participant_name: string
          participant_phone: string
          payment_amount?: number | null
          status?: Database["public"]["Enums"]["registration_status"] | null
          updated_at?: string
          user_id: string
          verification_code?: string | null
        }
        Update: {
          additional_info?: Json | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          event_id?: string
          id?: string
          participant_email?: string | null
          participant_name?: string
          participant_phone?: string
          payment_amount?: number | null
          status?: Database["public"]["Enums"]["registration_status"] | null
          updated_at?: string
          user_id?: string
          verification_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      event_reviews: {
        Row: {
          comment: string | null
          created_at: string
          event_id: string
          id: string
          images: string[] | null
          is_public: boolean | null
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          event_id: string
          id?: string
          images?: string[] | null
          is_public?: boolean | null
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          event_id?: string
          id?: string
          images?: string[] | null
          is_public?: boolean | null
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      events: {
        Row: {
          contact_info: string | null
          cover_image_url: string | null
          created_at: string
          description: string
          detailed_address: string | null
          end_time: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_paid: boolean | null
          location: string
          max_participants: number | null
          organizer_id: string
          price: number | null
          price_description: string | null
          registration_deadline: string | null
          requires_approval: boolean | null
          start_time: string
          status: Database["public"]["Enums"]["event_status"] | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          contact_info?: string | null
          cover_image_url?: string | null
          created_at?: string
          description: string
          detailed_address?: string | null
          end_time: string
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          is_paid?: boolean | null
          location: string
          max_participants?: number | null
          organizer_id: string
          price?: number | null
          price_description?: string | null
          registration_deadline?: string | null
          requires_approval?: boolean | null
          start_time: string
          status?: Database["public"]["Enums"]["event_status"] | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          contact_info?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string
          detailed_address?: string | null
          end_time?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_paid?: boolean | null
          location?: string
          max_participants?: number | null
          organizer_id?: string
          price?: number | null
          price_description?: string | null
          registration_deadline?: string | null
          requires_approval?: boolean | null
          start_time?: string
          status?: Database["public"]["Enums"]["event_status"] | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          related_event_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          related_event_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          related_event_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organizer_applications: {
        Row: {
          admin_notes: string | null
          contact_email: string
          contact_phone: string | null
          created_at: string
          id: string
          organizer_description: string | null
          organizer_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          organizer_description?: string | null
          organizer_name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          organizer_description?: string | null
          organizer_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          nickname: string | null
          organizer_description: string | null
          organizer_name: string | null
          roles: Database["public"]["Enums"]["user_role"][] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          nickname?: string | null
          organizer_description?: string | null
          organizer_name?: string | null
          roles?: Database["public"]["Enums"]["user_role"][] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          nickname?: string | null
          organizer_description?: string | null
          organizer_name?: string | null
          roles?: Database["public"]["Enums"]["user_role"][] | null
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
      allocate_organizer_points: {
        Args: { p_event_id: string; p_allocations: Json }
        Returns: void
      }
      get_my_points_totals: {
        Args: Record<PropertyKey, never>
        Returns: { user_id: string; participation_points: number; organizer_points: number; total_points: number }[]
      }
      admin_get_all_points_totals: {
        Args: Record<PropertyKey, never>
        Returns: { user_id: string; participation_points: number; organizer_points: number; total_points: number }[]
      }
      is_event_leader: {
        Args: { event: string; uid: string }
        Returns: boolean
      }
      checked_in_count: {
        Args: { p_event_id: string }
        Returns: number
      }
      is_admin: {
        Args: { uid: string }
        Returns: boolean
      }
      approve_organizer_application: {
        Args: { application_id: string }
        Returns: boolean
      }
      generate_verification_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: { user_id: string; role_name: string }
        Returns: boolean
      }
      find_user_id_by_email: {
        Args: { p_email: string }
        Returns: string | null
      }
    }
    Enums: {
      event_status:
        | "draft"
        | "published"
        | "registration_open"
        | "registration_closed"
        | "ongoing"
        | "ended"
        | "cancelled"
      event_type:
        | "conference"
        | "training"
        | "social"
        | "sports"
        | "performance"
        | "workshop"
        | "meetup"
        | "other"
      registration_status:
        | "pending"
        | "approved"
        | "rejected"
        | "payment_pending"
        | "paid"
        | "checked_in"
        | "cancelled"
      user_role: "user" | "organizer" | "admin"
      organizer_role: "leader" | "member"
      point_kind: "participation" | "organizer"
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
      event_status: [
        "draft",
        "published",
        "registration_open",
        "registration_closed",
        "ongoing",
        "ended",
        "cancelled",
      ],
      event_type: [
        "conference",
        "training",
        "social",
        "sports",
        "performance",
        "workshop",
        "meetup",
        "other",
      ],
      registration_status: [
        "pending",
        "approved",
        "rejected",
        "payment_pending",
        "paid",
        "checked_in",
        "cancelled",
      ],
      user_role: ["user", "organizer", "admin"],
    },
  },
} as const
