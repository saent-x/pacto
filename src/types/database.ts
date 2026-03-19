export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          avatar_url: string | null;
          couple_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name: string;
          avatar_url?: string | null;
          couple_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          avatar_url?: string | null;
          couple_id?: string | null;
          updated_at?: string;
        };
      };
      couples: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          anniversary_date: string | null;
          created_at: string;
          partner_1_id: string;
          partner_2_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code: string;
          anniversary_date?: string | null;
          created_at?: string;
          partner_1_id: string;
          partner_2_id?: string | null;
        };
        Update: {
          name?: string;
          invite_code?: string;
          anniversary_date?: string | null;
          partner_2_id?: string | null;
        };
      };
      reminders: {
        Row: {
          id: string;
          couple_id: string;
          created_by: string;
          assigned_to: string | null;
          title: string;
          description: string | null;
          due_at: string;
          recurrence: string | null;
          is_completed: boolean;
          completed_at: string | null;
          completed_by: string | null;
          priority: number;
          category: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          created_by: string;
          assigned_to?: string | null;
          title: string;
          description?: string | null;
          due_at: string;
          recurrence?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
          completed_by?: string | null;
          priority?: number;
          category?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          title?: string;
          description?: string | null;
          due_at?: string;
          recurrence?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
          completed_by?: string | null;
          priority?: number;
          category?: string | null;
          updated_at?: string;
        };
      };
      task_lists: {
        Row: {
          id: string;
          couple_id: string;
          name: string;
          icon: string;
          color: string;
          sort_order: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          name: string;
          icon?: string;
          color?: string;
          sort_order?: number;
          created_by: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          icon?: string;
          color?: string;
          sort_order?: number;
        };
      };
      tasks: {
        Row: {
          id: string;
          list_id: string;
          couple_id: string;
          title: string;
          notes: string | null;
          is_completed: boolean;
          completed_at: string | null;
          completed_by: string | null;
          assigned_to: string | null;
          due_date: string | null;
          priority: number;
          sort_order: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          couple_id: string;
          title: string;
          notes?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
          completed_by?: string | null;
          assigned_to?: string | null;
          due_date?: string | null;
          priority?: number;
          sort_order?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          notes?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
          completed_by?: string | null;
          assigned_to?: string | null;
          due_date?: string | null;
          priority?: number;
          sort_order?: number;
          updated_at?: string;
        };
      };
      journal_entries: {
        Row: {
          id: string;
          couple_id: string;
          author_id: string;
          title: string | null;
          body: string;
          mood: string | null;
          is_private: boolean;
          media_urls: string[];
          tags: string[];
          entry_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          author_id: string;
          title?: string | null;
          body: string;
          mood?: string | null;
          is_private?: boolean;
          media_urls?: string[];
          tags?: string[];
          entry_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string | null;
          body?: string;
          mood?: string | null;
          is_private?: boolean;
          media_urls?: string[];
          tags?: string[];
          entry_date?: string;
          updated_at?: string;
        };
      };
      wishlists: {
        Row: {
          id: string;
          couple_id: string;
          name: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          name: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          name?: string;
        };
      };
      wishlist_items: {
        Row: {
          id: string;
          wishlist_id: string;
          couple_id: string;
          title: string;
          description: string | null;
          url: string | null;
          price: number | null;
          image_url: string | null;
          is_purchased: boolean;
          purchased_by: string | null;
          priority: number;
          sort_order: number;
          added_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          wishlist_id: string;
          couple_id: string;
          title: string;
          description?: string | null;
          url?: string | null;
          price?: number | null;
          image_url?: string | null;
          is_purchased?: boolean;
          purchased_by?: string | null;
          priority?: number;
          sort_order?: number;
          added_by: string;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          url?: string | null;
          price?: number | null;
          image_url?: string | null;
          is_purchased?: boolean;
          purchased_by?: string | null;
          priority?: number;
          sort_order?: number;
        };
      };
      plans: {
        Row: {
          id: string;
          couple_id: string;
          title: string;
          description: string | null;
          category: string;
          target_date: string | null;
          budget: number | null;
          status: string;
          cover_image_url: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          title: string;
          description?: string | null;
          category?: string;
          target_date?: string | null;
          budget?: number | null;
          status?: string;
          cover_image_url?: string | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          category?: string;
          target_date?: string | null;
          budget?: number | null;
          status?: string;
          cover_image_url?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      checklists: {
        Row: {
          id: string;
          couple_id: string;
          name: string;
          description: string | null;
          is_template: boolean;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          name: string;
          description?: string | null;
          is_template?: boolean;
          created_by: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          is_template?: boolean;
        };
      };
      checklist_items: {
        Row: {
          id: string;
          checklist_id: string;
          couple_id: string;
          title: string;
          is_completed: boolean;
          completed_by: string | null;
          sort_order: number;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          checklist_id: string;
          couple_id: string;
          title: string;
          is_completed?: boolean;
          completed_by?: string | null;
          sort_order?: number;
          parent_id?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          is_completed?: boolean;
          completed_by?: string | null;
          sort_order?: number;
          parent_id?: string | null;
        };
      };
      milestones: {
        Row: {
          id: string;
          couple_id: string;
          title: string;
          date: string;
          description: string | null;
          icon: string;
          photo_url: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          title: string;
          date: string;
          description?: string | null;
          icon?: string;
          photo_url?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          title?: string;
          date?: string;
          description?: string | null;
          icon?: string;
          photo_url?: string | null;
        };
      };
      shared_expenses: {
        Row: {
          id: string;
          couple_id: string;
          title: string;
          amount: number;
          paid_by: string;
          split_type: string;
          split_amount: number | null;
          category: string;
          date: string;
          is_settled: boolean;
          receipt_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          title: string;
          amount: number;
          paid_by: string;
          split_type?: string;
          split_amount?: number | null;
          category?: string;
          date: string;
          is_settled?: boolean;
          receipt_url?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          amount?: number;
          paid_by?: string;
          split_type?: string;
          split_amount?: number | null;
          category?: string;
          date?: string;
          is_settled?: boolean;
          receipt_url?: string | null;
        };
      };
      mood_check_ins: {
        Row: {
          id: string;
          couple_id: string;
          user_id: string;
          mood: number;
          emoji: string;
          note: string | null;
          is_private: boolean;
          check_in_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          user_id: string;
          mood: number;
          emoji: string;
          note?: string | null;
          is_private?: boolean;
          check_in_date: string;
          created_at?: string;
        };
        Update: {
          mood?: number;
          emoji?: string;
          note?: string | null;
          is_private?: boolean;
        };
      };
    };
    Functions: {
      get_my_couple_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      join_couple: {
        Args: { code: string };
        Returns: string;
      };
      create_couple: {
        Args: { couple_name: string; code: string };
        Returns: string;
      };
    };
  };
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Couple = Database['public']['Tables']['couples']['Row'];
export type Reminder = Database['public']['Tables']['reminders']['Row'];
export type TaskList = Database['public']['Tables']['task_lists']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type JournalEntry = Database['public']['Tables']['journal_entries']['Row'];
export type Wishlist = Database['public']['Tables']['wishlists']['Row'];
export type WishlistItem = Database['public']['Tables']['wishlist_items']['Row'];
export type Plan = Database['public']['Tables']['plans']['Row'];
export type Checklist = Database['public']['Tables']['checklists']['Row'];
export type ChecklistItem = Database['public']['Tables']['checklist_items']['Row'];
export type Milestone = Database['public']['Tables']['milestones']['Row'];
export type SharedExpense = Database['public']['Tables']['shared_expenses']['Row'];
export type MoodCheckIn = Database['public']['Tables']['mood_check_ins']['Row'];
