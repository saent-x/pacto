/**
 * Adapter-layer types used by frontend hooks to bridge Convex camelCase
 * documents to the snake_case row format expected by UI components.
 *
 * These are NOT Supabase types — they are standalone type definitions
 * matching the shape that hooks produce after converting from Convex.
 */

export type TaskList = {
  id: string;
  couple_id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  created_by: string;
  created_at: string;
};

export type Task = {
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

export type Reminder = {
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

export type JournalEntry = {
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

/**
 * Minimal Database type for the TaskUpdateInput pattern used in useTasks.
 */
export type Database = {
  public: {
    Tables: {
      tasks: {
        Update: Partial<Omit<Task, 'id'>>;
      };
    };
  };
};
