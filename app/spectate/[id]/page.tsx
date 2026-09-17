'use client';

import React, { useEffect, useState, use } from 'react';
import { createClient } from '@supabase/supabase-js';

type MatchStatus =
  | 'SCHEDULED'
  | 'READY_CHECK'
  | 'VETO'
  | 'LIVE'
  | 'PAUSED'
  | 'AWAITING_RESULT'
  | 'DISPUTED'
  | 'COMPLETED'
  | 'FORFEITED'
  | 'WALKOVER'
  | 'BYE'
  | 'CANCELLED';

interface TeamMetadata {
  id: string;
  name: string;
  tag: string | null;
  logo_url: string | null;
}

interface MatchData {
  id: string;
  tournament_id: string;
  status: MatchStatus;
  best_of: number;
  score_a: number;
  score_b: number;
  rounds_won_a: number;
  rounds_won_b: number;
  team_a_id: string | null;
  team_b_id: string | null;
  scheduled_at: string | null;
  ended_at: string | null;
  format_config?: {
    stream_url?: string;
    [key: string]: unknown;
  };
  team_a?: TeamMetadata | null;
  team_b?: TeamMetadata | null;
}

interface MatchReplay {
  id: string;
  match_id: string;
  title: string;
  clip_url: string;
  thumbnail_url: string | null;
  start_time_seconds: number;
  duration_seconds: number;
  is_official: boolean;
  tags: string[] | null;
  created_by: string | null;
  player_id: string | null;
  created_at: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function parseStreamEmbedUrl(
  rawUrl: string | null | undefined
): { embedUrl: string | null; platform: string } {
  if (!rawUrl) return { embedUrl: null, platform: 'NONE' };
  const trimmed = rawUrl.trim();

  // YouTube: Direct Video ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return {
      embedUrl: `https://www.youtube-nocookie.com/embed/${trimmed}?autoplay=1&mute=0`,
      platform: 'YOUTUBE',
    };
  }

  // YouTube: Full URL
  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/|watch\?.+&v=))([\w-]{11})/
  );
  if (ytMatch && ytMatch[1]) {
    return {
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&mute=0`,
      platform: 'YOUTUBE',
    };
  }

  // Twitch
  const twitchMatch = trimmed.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  if (twitchMatch && twitchMatch[1]) {
    const parentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return {
      embedUrl: `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${parentDomain}&autoplay=true`,
      platform: 'TWITCH',
    };
  }

  // Kick
  const kickMatch = trimmed.match(/kick\.com\/([a-zA-Z0-9_]+)/);
  if (kickMatch && kickMatch[1]) {
    return {
      embedUrl: `https://player.kick.com/${kickMatch[1]}?autoplay=true`,
      platform: 'KICK',
    };
  }

  return { embedUrl: trimmed, platform: 'CUSTOM' };
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function SpectateMatchPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = 'then' in params ? use(params) : params;
  const matchId = resolvedParams.id;

  const [match, setMatch] = useState<MatchData | null>(null);
  const [replays, setReplays] = useState<MatchReplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        // Fetch match details (public access via anon key)
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select(
            `
            id, tournament_id, status, best_of, score_a, score_b,
            rounds_won_a, rounds_won_b, team_a_id, team_b_id,
            scheduled_at, ended_at, format_config,
            team_a:team_a_id ( id, name, tag, logo_url ),
            team_b:team_b_id ( id, name, tag, logo_url )
          `
          )
          .eq('id', matchId)
          .single();

        if (matchError || !matchData) {
          throw new Error(matchError?.message || 'ไม่พบข้อมูลแมตช์');
        }

        if (isMounted) {
          const teamAData = Array.isArray(matchData.team_a) ? matchData.team_a[0] : matchData.team_a;
          const teamBData = Array.isArray(matchData.team_b) ? matchData.team_b[0] : matchData.team_b;
          setMatch({
            id: matchData.id,
            tournament_id: matchData.tournament_id,
            status: matchData.status as MatchStatus,
            best_of: matchData.best_of,
            score_a: matchData.score_a,
            score_b: matchData.score_b,
            rounds_won_a: matchData.rounds_won_a,
            rounds_won_b: matchData.rounds_won_b,
            team_a_id: matchData.team_a_id,
            team_b_id: matchData.team_b_id,
            scheduled_at: matchData.scheduled_at,
            ended_at: matchData.ended_at,
            format_config: matchData.format_config,
            team_a: teamAData,
            team_b: teamBData,
          } as MatchData);
        }

        // Fetch replays (public access)
        const replayRes = await fetch(`/api/v1/matches/${matchId}/replays`);
        if (replayRes.ok) {
          const replayData = await replayRes.json();
          if (isMounted && replayData.replays) {
            setReplays(replayData.replays);
          }
        }

        if (isMounted) setError(null);
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'ระบบขัดข้อง';
          setError(msg);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [matchId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00D4FF] border-t-transparent" />
          <span className="text-[#00D4FF] text-sm">กำลังโหลด...</span>
        </div>
      </main>
    );
  }

  if (error || !match) {
    return (
      <main className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center font-mono p-4">
        <div className="border border-rose-500/40 bg-rose-500/10 rounded-lg p-6 max-w-md text-center">
          <p className="text-rose-400 text-sm font-bold uppercase tracking-widest mb-2">เกิดข้อผิดพลาด</p>
          <p className="text-zinc-300 text-xs">{error || 'ไม่พบแมตช์ที่ระบุ'}</p>
        </div>
      </main>
    );
  }

  const streamConfig = parseStreamEmbedUrl(
    match.format_config?.stream_url as string | undefined
  );
  const showLiveStream = streamConfig.embedUrl !== null;

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white font-mono p-4 lg:p-6">
      {/* HEADER: Match Info */}
      <header className="mb-6 border border-[#C9A84C]/40 bg-[#12121A]/80 backdrop-blur-md rounded-xl px-4 py-4 lg:px-6 lg:py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] text-zinc-400 uppercase tracking-widest">Match ID</span>
            <span className="text-[#C9A84C] font-bold text-lg tracking-wider">
              {match.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          <div className="flex flex-col items-start lg:items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
              match.status === 'LIVE' || match.status === 'PAUSED'
                ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10'
                : match.status === 'COMPLETED'
                ? 'border-zinc-600 text-zinc-400 bg-zinc-600/10'
                : 'border-amber-500/50 text-amber-300 bg-amber-500/10'
            }`}>
              {match.status}
            </span>
            <span className="text-xs text-zinc-400">
              {match.scheduled_at
                ? new Date(match.scheduled_at).toLocaleString('th-TH')
                : match.ended_at
                ? `เสร็จเมื่อ ${new Date(match.ended_at).toLocaleString('th-TH')}`
                : 'ไม่ระบุเวลา'}
            </span>
          </div>
        </div>
      </header>

      {/* SCORE CARD: Teams + Score */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Team A */}
        <div className="border border-emerald-500/30 bg-[#12121A]/80 backdrop-blur-md rounded-xl p-4 lg:p-6">
          <div className="flex items-center gap-3 mb-3">
            {match.team_a?.logo_url && (
              <img
                src={match.team_a.logo_url}
                alt={match.team_a.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div>
              <h3 className="text-emerald-400 font-black uppercase tracking-wider">
                {match.team_a?.name}
                {match.team_a?.tag && ` [${match.team_a.tag}]`}
              </h3>
            </div>
          </div>
          <div className="text-center py-4 border border-emerald-500/20 bg-emerald-500/5 rounded-lg">
            <div className="text-4xl font-black text-emerald-300">{match.score_a}</div>
            <div className="text-xs text-emerald-500/60 uppercase tracking-widest mt-1">Rounds Won</div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">{match.rounds_won_a}</div>
          </div>
        </div>

        {/* Team B */}
        <div className="border border-rose-500/30 bg-[#12121A]/80 backdrop-blur-md rounded-xl p-4 lg:p-6">
          <div className="flex items-center gap-3 mb-3">
            {match.team_b?.logo_url && (
              <img
                src={match.team_b.logo_url}
                alt={match.team_b.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div>
              <h3 className="text-rose-400 font-black uppercase tracking-wider">
                {match.team_b?.name}
                {match.team_b?.tag && ` [${match.team_b.tag}]`}
              </h3>
            </div>
          </div>
          <div className="text-center py-4 border border-rose-500/20 bg-rose-500/5 rounded-lg">
            <div className="text-4xl font-black text-rose-300">{match.score_b}</div>
            <div className="text-xs text-rose-500/60 uppercase tracking-widest mt-1">Rounds Won</div>
            <div className="text-2xl font-bold text-rose-400 mt-2">{match.rounds_won_b}</div>
          </div>
        </div>
      </div>

      {/* LIVE STREAM EMBED */}
      {showLiveStream && (
        <section className="mb-6 border border-[#00D4FF]/30 bg-[#12121A]/80 backdrop-blur-md rounded-xl overflow-hidden">
          <div className="px-4 py-3 lg:px-6 bg-[#0A0A0F]/60 border-b border-[#00D4FF]/20">
            <h2 className="text-[#00D4FF] font-black uppercase tracking-widest text-sm">
              🎥 Live Stream — {streamConfig.platform}
            </h2>
          </div>
          <div className="relative w-full bg-black" style={{ aspectRatio: '16/9' }}>
            <iframe
              src={streamConfig.embedUrl ?? undefined}
              title="Live Stream"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </section>
      )}

      {/* REPLAYS SECTION */}
      {replays.length > 0 && (
        <section className="border border-purple-500/30 bg-[#12121A]/80 backdrop-blur-md rounded-xl overflow-hidden">
          <div className="px-4 py-3 lg:px-6 bg-[#0A0A0F]/60 border-b border-purple-500/20">
            <h2 className="text-purple-300 font-black uppercase tracking-widest text-sm">
              📼 Replays & Highlights ({replays.length})
            </h2>
          </div>
          <div className="p-4 lg:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {replays.map((replay) => (
                <a
                  key={replay.id}
                  href={replay.clip_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group border border-purple-500/20 bg-purple-500/5 rounded-lg overflow-hidden hover:border-purple-500/50 hover:bg-purple-500/10 transition-all"
                >
                  <div className="relative w-full bg-black" style={{ aspectRatio: '16/9' }}>
                    {replay.thumbnail_url ? (
                      <img
                        src={replay.thumbnail_url}
                        alt={replay.title}
                        className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-purple-500/10">
                        <span className="text-purple-500/40 text-xs">No Thumbnail</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-[10px] text-white font-bold">
                      {formatDuration(replay.duration_seconds)}
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-purple-300 font-bold text-sm line-clamp-2 mb-1 group-hover:text-purple-200">
                      {replay.title}
                    </h3>
                    <p className="text-zinc-500 text-xs flex flex-wrap gap-2 mb-2">
                      {replay.tags?.slice(0, 2).map((tag) => (
                        <span key={tag} className="bg-purple-500/20 px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </p>
                    <p className="text-[10px] text-zinc-600">
                      {new Date(replay.created_at).toLocaleString('th-TH')}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* NO REPLAYS STATE */}
      {replays.length === 0 && (
        <section className="border border-zinc-700/40 bg-zinc-900/20 backdrop-blur-md rounded-xl p-6 text-center">
          <p className="text-zinc-500 text-sm">ยังไม่มีคลิปย้อนหลัง</p>
        </section>
      )}
    </main>
  );
}
