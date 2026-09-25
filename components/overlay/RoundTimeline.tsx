"use client";

import React from "react";
import { Skull, Flame, Scissors, Hourglass } from "lucide-react";
import { TEAM_A_HEX, TEAM_B_HEX } from "@/components/overlay/series";

export type RoundWinCondition = "elimination" | "spike_detonate" | "spike_defuse" | "time_expire";

export interface RoundResult {
  round_number: number;
  winner_team_id: string | null;
  game_number?: number;
  win_condition?: RoundWinCondition | null;
}

interface TimelineTeam {
  id?: string | null;
  tag: string;
}

const HALF = 12;

function WinIcon({ condition }: { condition?: RoundWinCondition | null }) {
  const cls = "w-3.5 h-3.5";
  if (condition === "spike_detonate") return <Flame className={cls} />;
  if (condition === "spike_defuse") return <Scissors className={cls} />;
  if (condition === "time_expire") return <Hourglass className={cls} />;
  return <Skull className={cls} />;
}

// Round-by-round tracker (VCT/EWC style). Only real rows from match_rounds are drawn —
// rounds without a recorded result stay empty.
export function RoundTimeline({
  rounds,
  teamA,
  teamB,
  currentRound,
}: {
  rounds: RoundResult[];
  teamA: TimelineTeam;
  teamB: TimelineTeam;
  currentRound?: number;
}) {
  const byRound = new Map(rounds.map((r) => [r.round_number, r]));
  const highest = Math.max(currentRound ?? 0, ...rounds.map((r) => r.round_number), 0);
  // 24 regulation rounds, then extend two at a time for overtime
  const total = highest <= HALF * 2 ? HALF * 2 : HALF * 2 + Math.ceil((highest - HALF * 2) / 2) * 2;
  const columns = Array.from({ length: total }, (_, i) => i + 1);

  const rows = [
    { team: teamA, hex: TEAM_A_HEX },
    { team: teamB, hex: TEAM_B_HEX },
  ];

  // gap at halftime and before overtime, like the broadcast reference
  const cellGap = (n: number) => (n === HALF + 1 || n === HALF * 2 + 1 ? "ml-3" : "");

  return (
    <div className="flex bg-[#11141b]/95 border border-white/10 rounded-md overflow-hidden">
      {/* Team column */}
      <div className="flex flex-col border-r border-white/10">
        <div className="h-6" />
        {rows.map(({ team, hex }) => (
          <div key={team.tag} className="relative flex items-center gap-2 h-9 pl-3 pr-4">
            <div className="absolute left-0 inset-y-1 w-1" style={{ backgroundColor: hex }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/images/Team_Logo/${team.tag}.png`}
              alt={team.tag}
              className="w-5 h-5 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }}
            />
            <span className="text-sm font-black text-white tracking-wide">{team.tag}</span>
          </div>
        ))}
      </div>

      {/* Round columns */}
      <div className="flex px-2">
        {columns.map((n) => {
          const result = byRound.get(n);
          const isCurrent = n === currentRound;
          return (
            <div key={n} className={`flex flex-col items-center ${cellGap(n)}`}>
              <div className="h-6 flex items-center justify-center text-[10px] font-bold text-white/60 font-mono">
                {String(n).padStart(2, "0")}
              </div>
              <div className="flex flex-col" style={isCurrent ? { outline: "2px solid #C9A84C", outlineOffset: -1 } : undefined}>
                {rows.map(({ team, hex }) => {
                  const won = result && team.id && result.winner_team_id === team.id;
                  return (
                    <div key={team.tag} className="w-8 h-9 flex items-center justify-center">
                      <div
                        className="w-6 h-6 rounded-[3px] flex items-center justify-center"
                        style={
                          won
                            ? { backgroundColor: `${hex}26`, border: `1px solid ${hex}`, color: hex }
                            : { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }
                        }
                      >
                        {won && <WinIcon condition={result.win_condition} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
