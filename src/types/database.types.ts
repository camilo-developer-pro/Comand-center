export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            workspaces: {
                Row: {
                    id: string
                    created_at: string
                    name: string
                    slug: string
                    owner_id: string
                }
                Insert: {
                    id?: string
                    created_at?: string
                    name: string
                    slug: string
                    owner_id: string
                }
                Update: {
                    id?: string
                    created_at?: string
                    name?: string
                    slug?: string
                    owner_id?: string
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    id: string
                    updated_at: string | null
                    full_name: string | null
                    avatar_url: string | null
                    email: string | null
                }
                Insert: {
                    id: string
                    updated_at?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    email?: string | null
                }
                Update: {
                    id?: string
                    updated_at?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    email?: string | null
                }
                Relationships: []
            }
            documents: {
                Row: {
                    id: string
                    created_at: string
                    updated_at: string
                    title: string
                    content: Json | null
                    workspace_id: string
                    created_by: string
                }
                Insert: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    title: string
                    content?: Json | null
                    workspace_id: string
                    created_by?: string
                }
                Update: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    title?: string
                    content?: Json | null
                    workspace_id?: string
                    created_by?: string
                }
                Relationships: []
            }
            workspace_members: {
                Row: {
                    id: string
                    created_at: string
                    workspace_id: string
                    user_id: string
                    role: string
                }
                Insert: {
                    id?: string
                    created_at?: string
                    workspace_id: string
                    user_id: string
                    role: string
                }
                Update: {
                    id?: string
                    created_at?: string
                    workspace_id?: string
                    user_id?: string
                    role?: string
                }
                Relationships: []
            }
            crm_leads: {
                Row: {
                    id: string
                    created_at: string
                    first_name: string | null
                    last_name: string | null
                    email: string | null
                    phone: string | null
                    status: string
                    workspace_id: string
                }
                Insert: {
                    id?: string
                    created_at?: string
                    first_name?: string | null
                    last_name?: string | null
                    email?: string | null
                    phone?: string | null
                    status: string
                    workspace_id: string
                }
                Update: {
                    id?: string
                    created_at?: string
                    first_name?: string | null
                    last_name?: string | null
                    email?: string | null
                    phone?: string | null
                    status?: string
                    workspace_id?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            workspace_role: 'ADMIN' | 'MEMBER' | 'VIEWER'
            lead_status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'LOST' | 'WON'
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
