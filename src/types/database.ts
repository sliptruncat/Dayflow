export type ThemeId = "sage" | "griotte" | "seafoam";
export type TaskStatus = "inbox" | "planned" | "in_progress" | "paused" | "completed" | "cancelled";
export type TaskPriority = "none" | "low" | "medium" | "high";
export type MonthCoverSource = "preset" | "uploaded" | "generated";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; avatar_url: string | null; locale: string; timezone: string; created_at: string; updated_at: string };
        Insert: { id: string; display_name?: string | null; avatar_url?: string | null; locale?: string; timezone?: string };
        Update: { display_name?: string | null; avatar_url?: string | null; locale?: string; timezone?: string };
        Relationships: [];
      };
      user_preferences: {
        Row: { id: string; owner_id: string; theme_id: ThemeId; locale: string; timezone: string; week_starts_on: number; time_format: "24h" | "12h"; date_format: string; created_at: string; updated_at: string };
        Insert: { id?: string; owner_id: string; theme_id?: ThemeId; locale?: string; timezone?: string; week_starts_on?: number; time_format?: "24h" | "12h"; date_format?: string };
        Update: { theme_id?: ThemeId; locale?: string; timezone?: string; week_starts_on?: number; time_format?: "24h" | "12h"; date_format?: string };
        Relationships: [];
      };
      categories: {
        Row: { id: string; owner_id: string; name: string; color: string; created_at: string; updated_at: string };
        Insert: { id?: string; owner_id: string; name: string; color: string };
        Update: { name?: string; color?: string };
        Relationships: [];
      };
      tasks: {
        Row: { id: string; owner_id: string; category_id: string | null; title: string; description: string | null; status: TaskStatus; priority: TaskPriority; color_override: string | null; start_at: string | null; deadline_at: string | null; is_all_day: boolean; estimated_minutes: number | null; completed_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; owner_id: string; category_id?: string | null; title: string; description?: string | null; status?: TaskStatus; priority?: TaskPriority; color_override?: string | null; start_at?: string | null; deadline_at?: string | null; is_all_day?: boolean; estimated_minutes?: number | null; completed_at?: string | null };
        Update: { category_id?: string | null; title?: string; description?: string | null; status?: TaskStatus; priority?: TaskPriority; color_override?: string | null; start_at?: string | null; deadline_at?: string | null; is_all_day?: boolean; estimated_minutes?: number | null; completed_at?: string | null };
        Relationships: [];
      };
      task_subtasks: {
        Row: { id: string; owner_id: string; task_id: string; title: string; is_completed: boolean; completed_at: string | null; position: number; created_at: string; updated_at: string };
        Insert: { id?: string; owner_id: string; task_id: string; title: string; is_completed?: boolean; completed_at?: string | null; position?: number };
        Update: { title?: string; is_completed?: boolean; completed_at?: string | null; position?: number };
        Relationships: [];
      };
      inbox_items: {
        Row: { id: string; owner_id: string; title: string; body: string | null; status: "open" | "processed" | "archived"; converted_task_id: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; owner_id: string; title: string; body?: string | null; status?: "open" | "processed" | "archived"; converted_task_id?: string | null };
        Update: { title?: string; body?: string | null; status?: "open" | "processed" | "archived"; converted_task_id?: string | null };
        Relationships: [];
      };
      goals: {
        Row: { id: string; owner_id: string; title: string; description: string | null; status: "active" | "completed" | "paused" | "archived"; target_date: string | null; progress: number; created_at: string; updated_at: string };
        Insert: { id?: string; owner_id: string; title: string; description?: string | null; status?: "active" | "completed" | "paused" | "archived"; target_date?: string | null; progress?: number };
        Update: { title?: string; description?: string | null; status?: "active" | "completed" | "paused" | "archived"; target_date?: string | null; progress?: number };
        Relationships: [];
      };
      task_reminders: {
        Row: { id: string; owner_id: string; task_id: string; remind_at: string; status: "scheduled" | "sent" | "dismissed" | "cancelled"; delivered_at: string | null; created_at: string };
        Insert: { id?: string; owner_id: string; task_id: string; remind_at: string; status?: "scheduled" | "sent" | "dismissed" | "cancelled"; delivered_at?: string | null };
        Update: { remind_at?: string; status?: "scheduled" | "sent" | "dismissed" | "cancelled"; delivered_at?: string | null };
        Relationships: [];
      };
      user_progress: {
        Row: { owner_id: string; xp_total: number; level: number; companion_stage: "egg" | "hatchling" | "juvenile" | "adult"; productive_days: number; current_streak: number; longest_streak: number; last_active_on: string | null; created_at: string; updated_at: string };
        Insert: { owner_id: string; xp_total?: number; level?: number; companion_stage?: "egg" | "hatchling" | "juvenile" | "adult" };
        Update: never; Relationships: [];
      };
      focus_sessions: {
        Row: { id: string; owner_id: string; task_id: string | null; duration_seconds: number; elapsed_seconds: number; status: "running" | "paused" | "completed" | "cancelled"; started_at: string; completed_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; owner_id: string; task_id?: string | null; duration_seconds: number; elapsed_seconds?: number; status?: "running" | "paused" | "completed" | "cancelled"; started_at?: string; completed_at?: string | null };
        Update: { elapsed_seconds?: number; status?: "running" | "paused" | "completed" | "cancelled"; completed_at?: string | null }; Relationships: [];
      };
      user_achievements: {
        Row: { id: string; owner_id: string; code: "first_step" | "ten_tasks" | "focus_friend" | "seven_day_rhythm" | "level_five"; unlocked_at: string };
        Insert: { id?: string; owner_id: string; code: "first_step" | "ten_tasks" | "focus_friend" | "seven_day_rhythm" | "level_five" }; Update: never; Relationships: [];
      };
      calendar_events: {
        Row: { id: string; owner_id: string; category_id: string | null; title: string; description: string | null; color_override: string | null; starts_at: string; ends_at: string; is_all_day: boolean; location: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; owner_id: string; category_id?: string | null; title: string; description?: string | null; color_override?: string | null; starts_at: string; ends_at: string; is_all_day?: boolean; location?: string | null };
        Update: { category_id?: string | null; title?: string; description?: string | null; color_override?: string | null; starts_at?: string; ends_at?: string; is_all_day?: boolean; location?: string | null };
        Relationships: [];
      };
      month_covers: {
        Row: { id: string; owner_id: string; month_start: string; theme_id: ThemeId | null; image_path: string | null; source: MonthCoverSource; created_at: string; updated_at: string };
        Insert: { id?: string; owner_id: string; month_start: string; theme_id?: ThemeId | null; image_path?: string | null; source?: MonthCoverSource };
        Update: { month_start?: string; theme_id?: ThemeId | null; image_path?: string | null; source?: MonthCoverSource };
        Relationships: [];
      };
      finance_categories: {
        Row: { id: string; owner_id: string; name: string; kind: "income" | "expense"; color: string; created_at: string };
        Insert: { id?: string; owner_id: string; name: string; kind: "income" | "expense"; color?: string };
        Update: { name?: string; kind?: "income" | "expense"; color?: string };
        Relationships: [];
      };
      finance_transactions: {
        Row: { id: string; owner_id: string; category_id: string | null; title: string; amount: number; currency: string; kind: "income" | "expense"; occurred_on: string; is_recurring: boolean; recurrence: "weekly" | "monthly" | "yearly" | null; notes: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; owner_id: string; category_id?: string | null; title: string; amount: number; currency?: string; kind: "income" | "expense"; occurred_on?: string; is_recurring?: boolean; recurrence?: "weekly" | "monthly" | "yearly" | null; notes?: string | null };
        Update: { category_id?: string | null; title?: string; amount?: number; currency?: string; kind?: "income" | "expense"; occurred_on?: string; is_recurring?: boolean; recurrence?: "weekly" | "monthly" | "yearly" | null; notes?: string | null };
        Relationships: [];
      };
      finance_budgets: {
        Row: { id: string; owner_id: string; category_id: string | null; name: string; amount: number; currency: string; period: "weekly" | "monthly" | "yearly"; starts_on: string; created_at: string };
        Insert: { id?: string; owner_id: string; category_id?: string | null; name: string; amount: number; currency?: string; period?: "weekly" | "monthly" | "yearly"; starts_on?: string };
        Update: { category_id?: string | null; name?: string; amount?: number; currency?: string; period?: "weekly" | "monthly" | "yearly"; starts_on?: string };
        Relationships: [];
      };
      contacts: {
        Row: { id: string; owner_id: string; full_name: string; company: string | null; role: string | null; email: string | null; phone: string | null; birthday: string | null; notes: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; owner_id: string; full_name: string; company?: string | null; role?: string | null; email?: string | null; phone?: string | null; birthday?: string | null; notes?: string | null };
        Update: { full_name?: string; company?: string | null; role?: string | null; email?: string | null; phone?: string | null; birthday?: string | null; notes?: string | null };
        Relationships: [];
      };
      contact_interactions: {
        Row: { id: string; owner_id: string; contact_id: string; occurred_at: string; channel: "note" | "call" | "meeting" | "email" | "message"; summary: string; created_at: string };
        Insert: { id?: string; owner_id: string; contact_id: string; occurred_at?: string; channel?: "note" | "call" | "meeting" | "email" | "message"; summary: string };
        Update: { occurred_at?: string; channel?: "note" | "call" | "meeting" | "email" | "message"; summary?: string };
        Relationships: [];
      };
      health_entries: {
        Row: { id: string; owner_id: string; entry_date: string; sleep_minutes: number | null; mood: number | null; energy: number | null; notes: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; owner_id: string; entry_date?: string; sleep_minutes?: number | null; mood?: number | null; energy?: number | null; notes?: string | null };
        Update: { entry_date?: string; sleep_minutes?: number | null; mood?: number | null; energy?: number | null; notes?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
