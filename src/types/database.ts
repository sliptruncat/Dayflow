export type ThemeId = "sage" | "griotte" | "seafoam";

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
