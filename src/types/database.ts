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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
