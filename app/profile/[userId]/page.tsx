/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Star } from 'lucide-react';
import AthleteTelemetryHUD from '@/components/dashboard/AthleteTelemetryHUD';

const supabase = createClient();

interface PlayerIdentity {
  id: string;
  athlete_id: string;
  display_name: string;
  avatar_url: string | null;
  status: string;
}

// Athlete Profile — public passport view for any player in the system,
// keyed by players.id. Mounts AthleteTelemetryHUD (SPEC-TELEMETRY-HUD-A5-V26-
// FIXES) so any "view profile" link, once Riot ID linking rolls out, lands
// here and shows the same real-data HUD whether it's your own profile or
// someone else's (AP balance only renders for the owner — see the HUD's
// isSelf handling).
export default function AthleteProfilePage() {
  const params = useParams();
  const playerId = params?.userId as string;

  const [player, setPlayer] = useState<PlayerIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!playerId) return;

    let isMounted = true;

    const fetchPlayer = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, athlete_id, display_name, avatar_url, status')
        .eq('id', playerId)
        .single();

      if (!isMounted) return;

      if (error || !data) {
        setNotFound(true);
      } else {
        setPlayer(data);
      }
      setLoading(false);
    };

    fetchPlayer();

    return () => {
      isMounted = false;
    };
  }, [playerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0E1A] flex items-center justify-center">
        <div className="text-[#E8B429] animate-pulse font-mono tracking-widest text-sm uppercase">
          LOADING ATHLETE PROFILE...
        </div>
      </div>
    );
  }

  if (notFound || !player) {
    return (
      <div className="min-h-screen bg-[#0D0E1A] flex items-center justify-center">
        <span className="text-zinc-500 font-mono text-sm">PLAYER NOT FOUND</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0E1A]">
      {/* IDENTITY STRIP */}
      <div className="border-b border-white/10 bg-[#121424] px-4 md:px-6 py-5">
        <div className="max-w-[1400px] mx-auto flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#2b2741] to-[#1a1c2e] border-2 border-[#E8B429] flex items-center justify-center text-2xl overflow-hidden shrink-0">
            {player.avatar_url ? (
              <img src={player.avatar_url} alt={player.display_name} className="w-full h-full object-cover" />
            ) : (
              '⚡'
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-mono font-black text-white tracking-wider">{player.display_name}</h1>
              {player.status === 'ACTIVE' && (
                <span className="inline-flex items-center gap-1 bg-[#E8B429]/15 border border-[#E8B429]/40 text-[#E8B429] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3 fill-[#E8B429]" /> ACTIVE
                </span>
              )}
            </div>
            <span className="text-xs font-mono text-neutral-500">{player.athlete_id}</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto">
        <AthleteTelemetryHUD playerId={player.id} />
      </div>
    </div>
  );
}
