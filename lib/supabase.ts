import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          role: "user" | "admin"
          preferences: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: "user" | "admin"
          preferences?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: "user" | "admin"
          preferences?: any
          created_at?: string
          updated_at?: string
        }
      }
      lessons: {
        Row: {
          id: number
          title: string
          description: string
          difficulty: "Începător" | "Intermediar" | "Avansat"
          duration: number
          image_url: string | null
          order_index: number
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          title: string
          description: string
          difficulty: "Începător" | "Intermediar" | "Avansat"
          duration: number
          image_url?: string | null
          order_index?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          title?: string
          description?: string
          difficulty?: "Începător" | "Intermediar" | "Avansat"
          duration?: number
          image_url?: string | null
          order_index?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      lesson_steps: {
        Row: {
          id: number
          lesson_id: number
          title: string
          description: string
          content: string
          image_url: string | null
          duration: number
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          lesson_id: number
          title: string
          description: string
          content: string
          image_url?: string | null
          duration: number
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          lesson_id?: number
          title?: string
          description?: string
          content?: string
          image_url?: string | null
          duration?: number
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_progress: {
        Row: {
          id: number
          user_id: string
          lesson_id: number
          completed_steps: number[]
          progress_percentage: number
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          lesson_id: number
          completed_steps?: number[]
          progress_percentage?: number
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          lesson_id?: number
          completed_steps?: number[]
          progress_percentage?: number
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
