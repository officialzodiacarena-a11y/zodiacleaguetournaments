// app/api/v1/quests/daily/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      return NextResponse.json(
        { success: false, error: 'PLAYER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Fetch Master Active Quests
    const { data: masterQuests, error: questsError } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('is_active', true);

    if (questsError) {
      return NextResponse.json(
        { success: false, error: questsError.message },
        { status: 500 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Fetch Today's Progress
    const { data: userProgress } = await supabase
      .from('player_daily_quests')
      .select('*')
      .eq('player_id', player.id)
      .eq('quest_date', today);

    // Fetch Today's Daily AP Cap Status (shared with Watch-to-Earn V2 via ap_daily_limits)
    const { data: dailyLimit } = await supabase
      .from('ap_daily_limits')
      .select('ap_earned, daily_cap')
      .eq('player_id', player.id)
      .eq('limit_date', today)
      .maybeSingle();

    const progressMap = new Map((userProgress || []).map((p) => [p.quest_id, p]));

    const questsWithProgress = (masterQuests ?? []).map((q) => {
      const prog = progressMap.get(q.id);
      return {
        id: q.id,
        title: q.title,
        description: q.description,
        reward_ap: Number(q.reward_ap),
        quest_type: q.quest_type,
        target_count: q.target_count,
        current_count: prog ? prog.current_count : 0,
        is_completed: prog ? prog.is_completed : false,
        is_claimed: prog ? prog.is_claimed : false,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        daily_ap_progress: {
          earned_today: Number(dailyLimit?.ap_earned || 0),
          max_cap: Number(dailyLimit?.daily_cap || 100),
        },
        quests: questsWithProgress,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
