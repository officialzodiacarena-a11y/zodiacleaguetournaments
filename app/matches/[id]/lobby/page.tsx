'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface LobbyMember {
  id: string | null;
  display_name: string;
  role: string;
}

interface LobbyTeam {
  id: string;
  name: string;
  tag: string | null;
  logo_url: string | null;
  ready: boolean;
  ready_at: string | null;
  members: LobbyMember[];
}

interface LobbyMessage {
  id: string;
  sender_id: string | null;
  sender_name: string;
  sender_role: 'TEAM_A' | 'TEAM_B' | 'REFEREE' | 'SYSTEM';
  message: string;
  is_system: boolean;
  created_at: string;
}

interface LobbyData {
  match_id: string;
  status: string;
  scheduled_at: string | null;
  forfeit_deadline_at: string | null;
  lobby_code: string | null;
  team_a: LobbyTeam | null;
  team_b: LobbyTeam | null;
  referee: { player_id: string; display_name: string } | null;
  messages: LobbyMessage[];
  realtime_channel: string;
}

function formatCountdown(deadline: string | null): string {
  if (!deadline) return '--:--';
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs <= 0) return '00:00';
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const ROLE_COLORS: Record<string, string> = {
  TEAM_A: 'text-emerald-400',
  TEAM_B: 'text-rose-400',
  REFEREE: 'text-cyan-300',
  SYSTEM: 'text-amber-400',
};

export default function MatchLobbyPage() {
  const params = useParams<{ id: string }>();
  const matchId = params.id;
  const supabase = createClient();

  const [lobby, setLobby] = useState<LobbyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [readySubmitting, setReadySubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const fetchLobby = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/matches/${matchId}/lobby`);
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'ไม่สามารถโหลดข้อมูลห้องล็อบบี้ได้');
        return;
      }
      setLobby(data);
      setError(null);
    } catch {
      setError('การเชื่อมต่อขัดข้อง กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    fetchLobby();
  }, [fetchLobby]);

  // Countdown ticker
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Realtime: chat messages + match status/ready broadcasts (self-healing resync on reconnect)
  useEffect(() => {
    if (!matchId) return;

    const lobbyChannel = supabase
      .channel(`match-lobby-${matchId}`)
      .on('broadcast', { event: 'lobby_message' }, (payload) => {
        const msg = payload.payload as { id: string; sender_id: string; sender_role: LobbyMessage['sender_role']; message: string; is_system: boolean; created_at: string };
        setLobby((prev) => {
          if (!prev) return prev;
          if (prev.messages.some((m) => m.id === msg.id)) return prev;
          return {
            ...prev,
            messages: [
              ...prev.messages,
              { ...msg, sender_name: msg.sender_role === 'SYSTEM' ? 'SYSTEM' : 'Player' },
            ],
          };
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') fetchLobby();
      });

    const matchChannel = supabase
      .channel(`match-realtime-${matchId}`)
      .on('broadcast', { event: 'team_ready_checkin' }, () => fetchLobby())
      .on('broadcast', { event: 'match_status_changed' }, () => fetchLobby())
      .on('broadcast', { event: 'match_walkover_triggered' }, () => fetchLobby())
      .subscribe();

    return () => {
      supabase.removeChannel(lobbyChannel);
      supabase.removeChannel(matchChannel);
    };
  }, [matchId, supabase, fetchLobby]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lobby?.messages.length]);

  async function handleReady() {
    setReadySubmitting(true);
    try {
      const res = await fetch(`/api/v1/matches/${matchId}/ready`, { method: 'POST' });
      if (res.ok) {
        await fetchLobby();
      } else {
        const data = await res.json();
        setError(data?.error || 'ไม่สามารถกดยืนยันความพร้อมได้');
      }
    } finally {
      setReadySubmitting(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/v1/matches/${matchId}/lobby/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput.trim() }),
      });
      if (res.ok) {
        setChatInput('');
      } else {
        const data = await res.json();
        setError(data?.error?.message || 'ส่งข้อความไม่สำเร็จ');
      }
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center font-mono">
        <span className="text-cyan-300 animate-pulse tracking-widest text-sm">กำลังโหลดห้องล็อบบี้...</span>
      </main>
    );
  }

  if (error && !lobby) {
    return (
      <main className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center font-mono">
        <span className="text-rose-400 text-sm">{error}</span>
      </main>
    );
  }

  if (!lobby) return null;

  const countdown = formatCountdown(lobby.forfeit_deadline_at);
  const countdownActive = lobby.forfeit_deadline_at && new Date(lobby.forfeit_deadline_at).getTime() - now > 0;

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white font-mono p-4 lg:p-6 selection:bg-cyan-500 selection:text-black">
      {/* HEADER HUD */}
      <header className="flex flex-wrap items-center justify-between gap-2 mb-4 border border-[#C9A84C]/40 bg-[#12121A]/80 backdrop-blur-md rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-400 uppercase tracking-widest">Match ID</span>
          <span className="text-[#C9A84C] font-bold tracking-wider">{lobby.match_id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-400 uppercase tracking-widest">Countdown</span>
          <span className={`font-black text-lg tabular-nums ${countdownActive ? 'text-[#C9A84C]' : 'text-zinc-600'}`}>
            {countdown}
          </span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-[#00D4FF]/50 text-[#00D4FF] bg-[#00D4FF]/10">
          {lobby.status}
        </span>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* PANEL A/B: TEAM ROSTERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <TeamPanel team={lobby.team_a} accent="emerald" onReady={handleReady} readySubmitting={readySubmitting} />
        <TeamPanel team={lobby.team_b} accent="rose" onReady={handleReady} readySubmitting={readySubmitting} />
      </div>

      {/* PANEL C/D: CREDENTIALS + CHAT */}
      <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-4">
        <div className="border border-[#00D4FF]/30 bg-[#12121A]/80 backdrop-blur-md rounded-xl p-4">
          <h3 className="text-[11px] text-[#00D4FF] uppercase tracking-widest font-black mb-3">Room Credentials</h3>
          {lobby.lobby_code ? (
            <div className="rounded-lg border border-[#00D4FF]/40 bg-black/60 px-3 py-3 text-center mb-3">
              <span className="text-[10px] text-zinc-400 block mb-1">Lobby Password</span>
              <span className="text-xl font-black text-[#00D4FF] tracking-[0.2em]">{lobby.lobby_code}</span>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-4 text-center mb-3 text-xs text-zinc-500">
              รอผู้ตัดสินกรอกรหัสห้องเกม...
            </div>
          )}
          <div className="text-[10px] text-zinc-400 mb-1">Referee</div>
          <div className="text-sm text-zinc-200 font-bold mb-3">{lobby.referee?.display_name ?? 'ยังไม่มอบหมาย'}</div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-center text-[10px] text-emerald-300 uppercase tracking-widest font-bold">
            Security IP Shield Active
          </div>
        </div>

        <div className="border border-purple-500/30 bg-[#12121A]/80 backdrop-blur-md rounded-xl p-4 flex flex-col h-[420px]">
          <h3 className="text-[11px] text-purple-300 uppercase tracking-widest font-black mb-3">Lobby Realtime Chat</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
            {lobby.messages.map((m) => (
              <div key={m.id} className="text-xs">
                <span className={`font-bold ${ROLE_COLORS[m.sender_role] || 'text-zinc-300'}`}>
                  {m.is_system ? 'SYSTEM' : m.sender_name}:
                </span>{' '}
                <span className={m.is_system ? 'text-zinc-400 italic' : 'text-zinc-100'}>{m.message}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              maxLength={500}
              placeholder="พิมพ์ข้อความ..."
              className="flex-1 rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00D4FF]/60"
            />
            <button
              type="submit"
              disabled={sending || !chatInput.trim()}
              className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#00D4FF]/20 border border-[#00D4FF]/50 text-[#00D4FF] hover:bg-[#00D4FF]/30 transition-colors disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function TeamPanel({
  team,
  accent,
  onReady,
  readySubmitting,
}: {
  team: LobbyTeam | null;
  accent: 'emerald' | 'rose';
  onReady: () => void;
  readySubmitting: boolean;
}) {
  const accentClasses = accent === 'emerald'
    ? { border: 'border-emerald-500/30', text: 'text-emerald-400', btn: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30' }
    : { border: 'border-rose-500/30', text: 'text-rose-400', btn: 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30' };

  if (!team) {
    return (
      <div className={`border ${accentClasses.border} bg-[#12121A]/80 backdrop-blur-md rounded-xl p-4 flex items-center justify-center text-zinc-600 text-xs`}>
        รอจับสายคู่แข่งขัน
      </div>
    );
  }

  return (
    <div className={`border ${accentClasses.border} bg-[#12121A]/80 backdrop-blur-md rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-black uppercase tracking-wider ${accentClasses.text}`}>
          {team.name} {team.tag ? `[${team.tag}]` : ''}
        </h3>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${team.ready ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10' : 'border-zinc-600 text-zinc-500'}`}>
          {team.ready ? 'READY ✅' : 'PENDING ❌'}
        </span>
      </div>
      <ul className="space-y-1 mb-4">
        {team.members.map((m, idx) => (
          <li key={m.id ?? idx} className="text-xs text-zinc-300 flex items-center justify-between">
            <span>{m.display_name}</span>
            <span className="text-[10px] text-zinc-500 uppercase">{m.role}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onReady}
        disabled={team.ready || readySubmitting}
        className={`w-full rounded-lg py-2 text-xs font-black uppercase tracking-widest border transition-colors disabled:opacity-40 ${accentClasses.btn}`}
      >
        {team.ready ? 'Confirmed' : readySubmitting ? 'Confirming...' : 'Confirm Team Ready'}
      </button>
    </div>
  );
}
