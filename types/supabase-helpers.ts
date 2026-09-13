// types/supabase-helpers.ts
import type { Database, Json } from './database.types';

export type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// 1. แปลง Data Structure ใดๆ ให้เข้ากับ Json type ของ Supabase
export function toJson<T>(value: T): Json {
  return value as unknown as Json;
}

// 2. Helper ตัด Excess Properties Type Check สำหรับ Update/Insert
export function asUpdate<T extends keyof Database['public']['Tables']>(payload: unknown): TableUpdate<T> {
  return payload as unknown as TableUpdate<T>;
}

export function asInsert<T extends keyof Database['public']['Tables']>(payload: unknown): TableInsert<T> {
  return payload as unknown as TableInsert<T>;
}

// 3. Helper แปลง Dynamic RPC Return Type ให้เข้ากับ Interface
export function asRpcResult<T>(result: unknown): T {
  return result as unknown as T;
}

// 4. Helper กรองค่า string ที่อาจเป็น null/undefined สำหรับ Supabase .in()
export function cleanIds(...ids: (string | null | undefined)[]): string[] {
  return ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
}
