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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      backlog_tasks: {
        Row: {
          color: string
          created_at: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: Database["public"]["Enums"]["priority_level"]
          stable_export_id: string
          title: string
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency_level"]
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["priority_level"]
          stable_export_id?: string
          title: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["priority_level"]
          stable_export_id?: string
          title?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
          user_id?: string
        }
        Relationships: []
      }
      habit_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          position: number
          stable_export_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          position?: number
          stable_export_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          stable_export_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_completions: {
        Row: {
          completed_at: string
          completion_date: string
          habit_id: string
          id: string
          stable_export_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          completion_date: string
          habit_id: string
          id?: string
          stable_export_id?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          completion_date?: string
          habit_id?: string
          id?: string
          stable_export_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          category_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          frequency_days: number[]
          frequency_type: string
          hidden: boolean
          icon: string
          id: string
          position: number
          project_id: string | null
          stable_export_id: string
          time_of_day: string
          title: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          frequency_days?: number[]
          frequency_type?: string
          hidden?: boolean
          icon?: string
          id?: string
          position?: number
          project_id?: string | null
          stable_export_id?: string
          time_of_day?: string
          title: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          frequency_days?: number[]
          frequency_type?: string
          hidden?: boolean
          icon?: string
          id?: string
          position?: number
          project_id?: string | null
          stable_export_id?: string
          time_of_day?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "habit_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          entry_date: string
          id: string
          stable_export_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          entry_date: string
          id?: string
          stable_export_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          entry_date?: string
          id?: string
          stable_export_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_off_days: {
        Row: {
          created_at: string
          day: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_off_days_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notebook_notes: {
        Row: {
          color: string
          content: Json
          created_at: string
          deleted_at: string | null
          id: string
          notebook_id: string
          parent_note_id: string | null
          pinned: boolean
          position: number
          stable_export_id: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          content?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          notebook_id: string
          parent_note_id?: string | null
          pinned?: boolean
          position?: number
          stable_export_id?: string
          title?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          content?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          notebook_id?: string
          parent_note_id?: string | null
          pinned?: boolean
          position?: number
          stable_export_id?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_notes_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notebook_notes_parent_note_id_fkey"
            columns: ["parent_note_id"]
            isOneToOne: false
            referencedRelation: "notebook_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notebooks: {
        Row: {
          created_at: string
          deleted_at: string | null
          icon: string | null
          icon_color: string | null
          id: string
          name: string
          parent_id: string | null
          position: number
          stable_export_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          icon?: string | null
          icon_color?: string | null
          id?: string
          name: string
          parent_id?: string | null
          position?: number
          stable_export_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          icon?: string | null
          icon_color?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          position?: number
          stable_export_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebooks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          project_id: string
          stable_export_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          project_id: string
          stable_export_id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          project_id?: string
          stable_export_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pomodoro_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          position: number
          normalized_name: string
          stable_export_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          position?: number
          normalized_name?: never
          stable_export_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          normalized_name?: never
          stable_export_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pomodoro_active_state: {
        Row: {
          accumulated_elapsed_seconds: number
          active_session_token: string | null
          break_duration_seconds: number
          duration_seconds: number
          ends_at: string | null
          kind: Database["public"]["Enums"]["pomodoro_kind"]
          paused_remaining_seconds: number | null
          phase: string
          started_at: string | null
          updated_at: string
          user_id: string
          work_duration_seconds: number
        }
        Insert: {
          accumulated_elapsed_seconds?: number
          active_session_token?: string | null
          break_duration_seconds?: number
          duration_seconds?: number
          ends_at?: string | null
          kind?: Database["public"]["Enums"]["pomodoro_kind"]
          paused_remaining_seconds?: number | null
          phase?: string
          started_at?: string | null
          updated_at?: string
          user_id: string
          work_duration_seconds?: number
        }
        Update: {
          accumulated_elapsed_seconds?: number
          active_session_token?: string | null
          break_duration_seconds?: number
          duration_seconds?: number
          ends_at?: string | null
          kind?: Database["public"]["Enums"]["pomodoro_kind"]
          paused_remaining_seconds?: number | null
          phase?: string
          started_at?: string | null
          updated_at?: string
          user_id?: string
          work_duration_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "pomodoro_active_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pomodoro_sessions: {
        Row: {
          active_session_token: string | null
          category_id: string | null
          created_at: string
          deleted_at: string | null
          duration_seconds: number
          ended_at: string
          id: string
          kind: Database["public"]["Enums"]["pomodoro_kind"]
          note: string | null
          stable_export_id: string
          started_at: string
          task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_session_token?: string | null
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_seconds: number
          ended_at: string
          id?: string
          kind?: Database["public"]["Enums"]["pomodoro_kind"]
          note?: string | null
          stable_export_id?: string
          started_at: string
          task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_session_token?: string | null
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number
          ended_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["pomodoro_kind"]
          note?: string | null
          stable_export_id?: string
          started_at?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pomodoro_sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "pomodoro_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pomodoro_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          deleted_at: string | null
          emoji: string
          enabled_views: Json
          icon: string | null
          icon_color: string | null
          id: string
          is_default: boolean
          kind: string
          name: string
          parent_id: string | null
          stable_export_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          emoji?: string
          enabled_views?: Json
          icon?: string | null
          icon_color?: string | null
          id?: string
          is_default?: boolean
          kind?: string
          name: string
          parent_id?: string | null
          stable_export_id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          emoji?: string
          enabled_views?: Json
          icon?: string | null
          icon_color?: string | null
          id?: string
          is_default?: boolean
          kind?: string
          name?: string
          parent_id?: string | null
          stable_export_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_label: string | null
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_label?: string | null
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_label?: string | null
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quick_notes: {
        Row: {
          color: string
          content: string
          created_at: string
          id: string
          pinned: boolean
          position: number
          stable_export_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          position?: number
          stable_export_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          position?: number
          stable_export_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          absolute_time: string | null
          body: string | null
          created_at: string
          days_of_week: number[]
          enabled: boolean
          id: string
          last_sent_at: string | null
          last_sent_for_date: string | null
          offset_minutes: number
          slot_key: string | null
          target_id: string | null
          target_key: string | null
          target_type: string
          title: string | null
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          absolute_time?: string | null
          body?: string | null
          created_at?: string
          days_of_week?: number[]
          enabled?: boolean
          id?: string
          last_sent_at?: string | null
          last_sent_for_date?: string | null
          offset_minutes?: number
          slot_key?: string | null
          target_id?: string | null
          target_key?: string | null
          target_type: string
          title?: string | null
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          absolute_time?: string | null
          body?: string | null
          created_at?: string
          days_of_week?: number[]
          enabled?: boolean
          id?: string
          last_sent_at?: string | null
          last_sent_for_date?: string | null
          offset_minutes?: number
          slot_key?: string | null
          target_id?: string | null
          target_key?: string | null
          target_type?: string
          title?: string | null
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category_id: string | null
          color: string
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          deleted_by_parent_id: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          hidden: boolean
          id: string
          importance: string | null
          kind: string
          parent_block_id: string | null
          position: number
          project_id: string
          reminder_minutes_before: number | null
          stable_export_id: string
          start_date: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          urgency: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          color?: string
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by_parent_id?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          hidden?: boolean
          id?: string
          importance?: string | null
          kind?: string
          parent_block_id?: string | null
          position?: number
          project_id: string
          reminder_minutes_before?: number | null
          stable_export_id?: string
          start_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          urgency?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          color?: string
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by_parent_id?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          hidden?: boolean
          id?: string
          importance?: string | null
          kind?: string
          parent_block_id?: string | null
          position?: number
          project_id?: string
          reminder_minutes_before?: number | null
          stable_export_id?: string
          start_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          urgency?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "pomodoro_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deleted_by_parent_id_fkey"
            columns: ["deleted_by_parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_block_id_fkey"
            columns: ["parent_block_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          auto_prayer_times: boolean
          calculation_method: number
          city: string | null
          country: string
          created_at: string
          default_pomodoro_break_minutes: number
          default_pomodoro_project_id: string | null
          default_pomodoro_work_minutes: number
          home_focus_options: Json
          home_task_project_ids: string[] | null
          latitude: number | null
          location_permission: boolean
          longitude: number | null
          module_labels: Json
          notify_habits: boolean
          notify_pomodoro: boolean
          notify_tasks: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          startup_page: Json
          timezone: string
          ui_scale: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_prayer_times?: boolean
          calculation_method?: number
          city?: string | null
          country?: string
          created_at?: string
          default_pomodoro_break_minutes?: number
          default_pomodoro_project_id?: string | null
          default_pomodoro_work_minutes?: number
          home_focus_options?: Json
          home_task_project_ids?: string[] | null
          latitude?: number | null
          location_permission?: boolean
          longitude?: number | null
          module_labels?: Json
          notify_habits?: boolean
          notify_pomodoro?: boolean
          notify_tasks?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          startup_page?: Json
          timezone?: string
          ui_scale?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_prayer_times?: boolean
          calculation_method?: number
          city?: string | null
          country?: string
          created_at?: string
          default_pomodoro_break_minutes?: number
          default_pomodoro_project_id?: string | null
          default_pomodoro_work_minutes?: number
          home_focus_options?: Json
          home_task_project_ids?: string[] | null
          latitude?: number | null
          location_permission?: boolean
          longitude?: number | null
          module_labels?: Json
          notify_habits?: boolean
          notify_pomodoro?: boolean
          notify_tasks?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          startup_page?: Json
          timezone?: string
          ui_scale?: string
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
      get_server_time: { Args: never; Returns: string }
      purge_soft_deleted: { Args: never; Returns: undefined }
    }
    Enums: {
      pomodoro_kind: "work" | "break"
      priority_level: "low" | "medium" | "high"
      task_status: "todo" | "in_progress" | "done"
      urgency_level: "someday" | "this_week" | "today"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      pomodoro_kind: ["work", "break"],
      priority_level: ["low", "medium", "high"],
      task_status: ["todo", "in_progress", "done"],
      urgency_level: ["someday", "this_week", "today"],
    },
  },
} as const
