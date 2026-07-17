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
      admin_audit_logs: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          metadata: Json
          success: boolean
          target_role: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          metadata?: Json
          success?: boolean
          target_role?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          success?: boolean
          target_role?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_daily_engagement_snapshots: {
        Row: {
          compute_mode: string
          computed_at: string
          computed_by: string | null
          computed_lag_days: number
          eligible_user_count: number
          habit_completion_activity_30d: number
          habit_completion_activity_7d: number
          habit_completion_activity_day: number
          manual_pomodoro_minutes_30d: number
          manual_pomodoro_minutes_7d: number
          manual_pomodoro_minutes_day: number
          manual_pomodoro_sessions_30d: number
          manual_pomodoro_sessions_7d: number
          manual_pomodoro_sessions_day: number
          meaningful_active_30d_count: number
          meaningful_active_7d_count: number
          meaningful_active_day_count: number
          meaningful_streak_3d_count: number
          meaningful_streak_5d_count: number
          meaningful_streak_7d_count: number
          metric_version: string
          presence_active_30d_count: number
          presence_active_7d_count: number
          presence_active_day_count: number
          settings_adoption_proxy_30d_count: number
          settings_adoption_proxy_7d_count: number
          snapshot_date: string
          snapshot_kind: string
          task_completion_activity_30d: number
          task_completion_activity_7d: number
          task_completion_activity_day: number
          timezone: string
          window_model: string
        }
        Insert: {
          compute_mode?: string
          computed_at?: string
          computed_by?: string | null
          computed_lag_days?: number
          eligible_user_count?: number
          habit_completion_activity_30d?: number
          habit_completion_activity_7d?: number
          habit_completion_activity_day?: number
          manual_pomodoro_minutes_30d?: number
          manual_pomodoro_minutes_7d?: number
          manual_pomodoro_minutes_day?: number
          manual_pomodoro_sessions_30d?: number
          manual_pomodoro_sessions_7d?: number
          manual_pomodoro_sessions_day?: number
          meaningful_active_30d_count?: number
          meaningful_active_7d_count?: number
          meaningful_active_day_count?: number
          meaningful_streak_3d_count?: number
          meaningful_streak_5d_count?: number
          meaningful_streak_7d_count?: number
          metric_version?: string
          presence_active_30d_count?: number
          presence_active_7d_count?: number
          presence_active_day_count?: number
          settings_adoption_proxy_30d_count?: number
          settings_adoption_proxy_7d_count?: number
          snapshot_date: string
          snapshot_kind?: string
          task_completion_activity_30d?: number
          task_completion_activity_7d?: number
          task_completion_activity_day?: number
          timezone?: string
          window_model?: string
        }
        Update: {
          compute_mode?: string
          computed_at?: string
          computed_by?: string | null
          computed_lag_days?: number
          eligible_user_count?: number
          habit_completion_activity_30d?: number
          habit_completion_activity_7d?: number
          habit_completion_activity_day?: number
          manual_pomodoro_minutes_30d?: number
          manual_pomodoro_minutes_7d?: number
          manual_pomodoro_minutes_day?: number
          manual_pomodoro_sessions_30d?: number
          manual_pomodoro_sessions_7d?: number
          manual_pomodoro_sessions_day?: number
          meaningful_active_30d_count?: number
          meaningful_active_7d_count?: number
          meaningful_active_day_count?: number
          meaningful_streak_3d_count?: number
          meaningful_streak_5d_count?: number
          meaningful_streak_7d_count?: number
          metric_version?: string
          presence_active_30d_count?: number
          presence_active_7d_count?: number
          presence_active_day_count?: number
          settings_adoption_proxy_30d_count?: number
          settings_adoption_proxy_7d_count?: number
          snapshot_date?: string
          snapshot_kind?: string
          task_completion_activity_30d?: number
          task_completion_activity_7d?: number
          task_completion_activity_day?: number
          timezone?: string
          window_model?: string
        }
        Relationships: []
      }
      admin_release_events: {
        Row: {
          commit_sha: string | null
          created_at: string
          created_by: string | null
          deployed_at: string
          id: string
          pr_numbers: number[]
          release_name: string
          release_type: string
        }
        Insert: {
          commit_sha?: string | null
          created_at?: string
          created_by?: string | null
          deployed_at: string
          id?: string
          pr_numbers?: number[]
          release_name: string
          release_type?: string
        }
        Update: {
          commit_sha?: string | null
          created_at?: string
          created_by?: string | null
          deployed_at?: string
          id?: string
          pr_numbers?: number[]
          release_name?: string
          release_type?: string
        }
        Relationships: []
      }
      admin_role_assignments: {
        Row: {
          active: boolean
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          revoked_at: string | null
          revoked_by: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_features: {
        Row: {
          backend_enforcement_required: boolean
          category: string
          content_risk: string
          created_at: string
          description: string | null
          display_order: number
          feature_key: string
          is_active: boolean
          is_core: boolean
          label: string
          route_path: string | null
          updated_at: string
        }
        Insert: {
          backend_enforcement_required?: boolean
          category: string
          content_risk?: string
          created_at?: string
          description?: string | null
          display_order?: number
          feature_key: string
          is_active?: boolean
          is_core?: boolean
          label: string
          route_path?: string | null
          updated_at?: string
        }
        Update: {
          backend_enforcement_required?: boolean
          category?: string
          content_risk?: string
          created_at?: string
          description?: string | null
          display_order?: number
          feature_key?: string
          is_active?: boolean
          is_core?: boolean
          label?: string
          route_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
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
      membership_feature_access: {
        Row: {
          feature_key: string
          is_enabled: boolean
          membership: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          feature_key: string
          is_enabled?: boolean
          membership: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          feature_key?: string
          is_enabled?: boolean
          membership?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_feature_access_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "app_features"
            referencedColumns: ["feature_key"]
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
          session_started_at: string | null
          started_at: string | null
          timer_mode: string
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
          session_started_at?: string | null
          started_at?: string | null
          timer_mode?: string
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
          session_started_at?: string | null
          started_at?: string | null
          timer_mode?: string
          updated_at?: string
          user_id?: string
          work_duration_seconds?: number
        }
        Relationships: []
      }
      pomodoro_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          normalized_name: string | null
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
          normalized_name?: string | null
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
          normalized_name?: string | null
          position?: number
          stable_export_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          session_source: string
          stable_export_id: string
          started_at: string
          task_id: string | null
          timer_mode: string | null
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
          session_source?: string
          stable_export_id?: string
          started_at: string
          task_id?: string | null
          timer_mode?: string | null
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
          session_source?: string
          stable_export_id?: string
          started_at?: string
          task_id?: string | null
          timer_mode?: string | null
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
      profiles: {
        Row: {
          account_status: string
          created_at: string
          email: string | null
          full_name: string | null
          last_seen_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          last_seen_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          last_seen_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_memberships: {
        Row: {
          membership: string
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          membership?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          membership?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
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
        Relationships: []
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
          preferred_timer_mode: string
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
          preferred_timer_mode?: string
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
          preferred_timer_mode?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          startup_page?: Json
          timezone?: string
          ui_scale?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_default_pomodoro_project_id_fkey"
            columns: ["default_pomodoro_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_archive_member: {
        Args: {
          reason_code: string
          reason_note?: string
          target_user_id: string
        }
        Returns: Json
      }
      admin_change_membership: {
        Args: {
          reason_code?: string
          target_membership: string
          target_user_id: string
        }
        Returns: Json
      }
      admin_create_release_event: {
        Args: {
          commit_sha?: string
          deployed_at?: string
          pr_numbers?: number[]
          release_name: string
          release_type?: string
        }
        Returns: Json
      }
      admin_get_engagement_dashboard: {
        Args: { days_back?: number }
        Returns: Json
      }
      admin_get_feature_access_matrix: { Args: never; Returns: Json }
      admin_get_member_detail: {
        Args: { target_user_id: string }
        Returns: Json
      }
      admin_get_release_engagement_comparison: {
        Args: { release_id: string }
        Returns: Json
      }
      admin_ops_compute_engagement_snapshot: {
        Args: { reason_code: string; target_snapshot_date: string }
        Returns: Json
      }
      admin_restore_member: {
        Args: {
          reason_code: string
          reason_note?: string
          target_user_id: string
        }
        Returns: Json
      }
      admin_search_audit_logs: {
        Args: {
          action_filter?: string
          actor_query?: string
          created_from?: string
          created_to?: string
          limit_count?: number
          offset_count?: number
          success_filter?: boolean
          target_query?: string
        }
        Returns: Json
      }
      admin_search_members: {
        Args: {
          account_status?: string
          limit_count?: number
          membership?: string
          membership_status?: string
          offset_count?: number
          query?: string
          sort_column?: string
          sort_direction?: string
        }
        Returns: Json
      }
      admin_set_user_status: {
        Args: {
          reason_code?: string
          target_account_status: string
          target_user_id: string
        }
        Returns: Json
      }
      can_access_feature: {
        Args: { target_feature_key: string }
        Returns: boolean
      }
      can_export_own_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      can_use_app: { Args: { target_user_id: string }; Returns: boolean }
      claim_push_subscription: {
        Args: {
          p_auth: string
          p_device_label?: string
          p_endpoint: string
          p_p256dh: string
          p_user_agent?: string
        }
        Returns: string
      }
      compute_engagement_snapshot_internal: {
        Args: {
          actor_user_id?: string
          requested_compute_mode?: string
          target_snapshot_date?: string
        }
        Returns: Json
      }
      get_current_account_gate: { Args: never; Returns: Json }
      get_current_admin_context: { Args: never; Returns: Json }
      get_current_feature_access: { Args: never; Returns: Json }
      get_server_time: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_super_manager: { Args: never; Returns: boolean }
      istanbul_day_start_utc: { Args: { value: string }; Returns: string }
      istanbul_local_date: { Args: { value: string }; Returns: string }
      max_true_streak: { Args: { flags: number[] }; Returns: number }
      purge_soft_deleted: { Args: never; Returns: undefined }
      touch_last_seen: { Args: never; Returns: string }
      write_admin_audit_log: {
        Args: {
          action: string
          metadata?: Json
          target_role?: string
          target_user_id?: string
        }
        Returns: string
      }
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
  public: {
    Enums: {
      pomodoro_kind: ["work", "break"],
      priority_level: ["low", "medium", "high"],
      task_status: ["todo", "in_progress", "done"],
      urgency_level: ["someday", "this_week", "today"],
    },
  },
} as const
