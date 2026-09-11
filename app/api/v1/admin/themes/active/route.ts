import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { searchParams } = new URL(request.url);
    const scopeType = searchParams.get("scope_type");
    const scopeId = searchParams.get("scope_id");

    const now = new Date().toISOString();

    // 1. ถ้าส่ง scope_type และ scope_id มา ให้หาธีมของ Scope นั้นก่อน
    if (scopeType && scopeId) {
      const { data: scopeTheme } = await supabase
        .from("brand_themes")
        .select("*")
        .eq("is_active", true)
        .eq("scope_type", scopeType)
        .eq("scope_id", scopeId)
        .lte("active_from", now)
        .or(`active_until.is.null,active_until.gte.${now}`)
        .order("priority", { ascending: false })
        .order("active_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (scopeTheme) {
        return NextResponse.json({ success: true, data: scopeTheme });
      }
    }

    // 2. Fallback: หา Active GLOBAL Theme (Seasonal ปัจจุบัน หรือ Default)
    const { data: globalTheme, error } = await supabase
      .from("brand_themes")
      .select("*")
      .eq("is_active", true)
      .eq("scope_type", "GLOBAL")
      .lte("active_from", now)
      .or(`active_until.is.null,active_until.gte.${now}`)
      .order("priority", { ascending: false })
      .order("active_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: globalTheme });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
