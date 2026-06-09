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
      cofounder_requests: {
        Row: {
          created_at: string
          from_user: string
          id: string
          message: string | null
          status: Database["public"]["Enums"]["request_status"]
          to_user: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_user: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          to_user: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_user?: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          to_user?: string
          updated_at?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          attachment_url: string | null
          body: string | null
          created_at: string
          from_user: string
          id: string
          to_user: string
        }
        Insert: {
          attachment_url?: string | null
          body?: string | null
          created_at?: string
          from_user: string
          id?: string
          to_user: string
        }
        Update: {
          attachment_url?: string | null
          body?: string | null
          created_at?: string
          from_user?: string
          id?: string
          to_user?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          body: string | null
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      hall_of_fame: {
        Row: {
          built_thing: string
          challenge: string
          created_at: string
          id: string
          image_url: string | null
          link: string | null
          winner_name: string
          winner_user_id: string | null
          year: number | null
        }
        Insert: {
          built_thing: string
          challenge: string
          created_at?: string
          id?: string
          image_url?: string | null
          link?: string | null
          winner_name: string
          winner_user_id?: string | null
          year?: number | null
        }
        Update: {
          built_thing?: string
          challenge?: string
          created_at?: string
          id?: string
          image_url?: string | null
          link?: string | null
          winner_name?: string
          winner_user_id?: string | null
          year?: number | null
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_votes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          body: string
          comments_count: number
          created_at: string
          id: string
          media_urls: string[]
          tags: string[]
          title: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
          user_id: string
          validation_report: Json | null
          validation_score: number | null
          votes_count: number
        }
        Insert: {
          body: string
          comments_count?: number
          created_at?: string
          id?: string
          media_urls?: string[]
          tags?: string[]
          title?: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          user_id: string
          validation_report?: Json | null
          validation_score?: number | null
          votes_count?: number
        }
        Update: {
          body?: string
          comments_count?: number
          created_at?: string
          id?: string
          media_urls?: string[]
          tags?: string[]
          title?: string | null
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          user_id?: string
          validation_report?: Json | null
          validation_score?: number | null
          votes_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          creator_enabled: boolean
          creator_platforms: Json
          date_of_birth: string | null
          display_name: string
          handle: string | null
          id: string
          interests: string[]
          links: Json
          location: string | null
          looking_for: string[]
          onboarded: boolean
          roles: string[]
          skills: string[]
          startup_name: string | null
          streak_days: number
          updated_at: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          creator_enabled?: boolean
          creator_platforms?: Json
          date_of_birth?: string | null
          display_name?: string
          handle?: string | null
          id: string
          interests?: string[]
          links?: Json
          location?: string | null
          looking_for?: string[]
          onboarded?: boolean
          roles?: string[]
          skills?: string[]
          startup_name?: string | null
          streak_days?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          creator_enabled?: boolean
          creator_platforms?: Json
          date_of_birth?: string | null
          display_name?: string
          handle?: string | null
          id?: string
          interests?: string[]
          links?: Json
          location?: string | null
          looking_for?: string[]
          onboarded?: boolean
          roles?: string[]
          skills?: string[]
          startup_name?: string | null
          streak_days?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      resources: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          is_official: boolean
          posted_by: string
          title: string
          url: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          is_official?: boolean
          posted_by: string
          title: string
          url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          is_official?: boolean
          posted_by?: string
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      streaks: {
        Row: {
          current_streak: number
          last_post_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_post_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_post_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
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
      app_role: "admin" | "member"
      post_type: "showcase" | "idea" | "streak" | "creator"
      request_status: "pending" | "accepted" | "declined"
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
      app_role: ["admin", "member"],
      post_type: ["showcase", "idea", "streak", "creator"],
      request_status: ["pending", "accepted", "declined"],
    },
  },
} as const
