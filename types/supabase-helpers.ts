// types/supabase-helpers.ts
import type { Database, Json } from './database.types'

export type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TableInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TableUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// แปลง JSON ให้เข้ากับ type Json ของ Supabase โดยไม่ต้องใช้ any
export function toJson<T>(value: T): Json {
  return value as unknown as Json
}