/**
 * Supabase Database Types for Command Center
 * 
 * This file provides TypeScript types for the Supabase database schema.
 * These types are used by the Supabase client for type-safe database operations.
 * 
 * The types are manually maintained to match the actual database schema.
 * For auto-generated Kysely types, see @/lib/db/generated-types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      blocks_v3: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          parent_id: string | null
          path: string
          type: 'page' | 'text' | 'heading' | 'task' | 'code' | 'quote' | 'divider' | 'image' | 'table'
          sort_order: string
          content: Json
          embedding: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          parent_id?: string | null
          path: string
          type?: 'page' | 'text' | 'heading' | 'task' | 'code' | 'quote' | 'divider' | 'image' | 'table'
          sort_order: string
          content?: Json
          embedding?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          parent_id?: string | null
          path?: string
          type?: 'page' | 'text' | 'heading' | 'task' | 'code' | 'quote' | 'divider' | 'image' | 'table'
          sort_order?: string
          content?: Json
          embedding?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_v3_parent_id_fkey"
            columns: ["parent_id"]
            referencedRelation: "blocks_v3"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_v3_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_v3_workspace_id_fkey"
            columns: ["workspace_id"]
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string
          settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id: string
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_id?: string
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          joined_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          joined_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          system_role: 'super_admin' | 'user'
          default_workspace_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          system_role?: 'super_admin' | 'user'
          default_workspace_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          system_role?: 'super_admin' | 'user'
          default_workspace_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_workspace_id_fkey"
            columns: ["default_workspace_id"]
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      // Add other tables as needed for Supabase client operations
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_workspace_member: {
        Args: {
          workspace_id_param: string
          user_id_param?: string
        }
        Returns: boolean
      }
      fi_generate_key_between: {
        Args: {
          left_key: string
          right_key: string
        }
        Returns: string
      }
    }
    Enums: {
      block_type: 'page' | 'text' | 'heading' | 'task' | 'code' | 'quote' | 'divider' | 'image' | 'table'
      workspace_role: 'owner' | 'admin' | 'member' | 'viewer'
      system_role: 'super_admin' | 'user'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
