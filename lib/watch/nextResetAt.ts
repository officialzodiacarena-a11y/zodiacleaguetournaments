// Q4: next_reset_at MUST be computed server-side — Asia/Bangkok (UTC+7, no
// DST) midnight of the next day, returned as an ISO string with the +07:00
// offset so the client never has to do timezone math itself.
//
// Method: shift the current instant forward by +7h so its UTC field getters
// read as "Bangkok wall-clock time", truncate to the day, add one day — that
// gives the correct next-midnight-in-Bangkok date. The offset suffix is
// always literally "+07:00" since Thailand has no DST.
export function computeNextResetAtBangkok(now: Date = new Date()): string {
  const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
  const bangkokWallClock = new Date(now.getTime() + BANGKOK_OFFSET_MS);

  const nextDay = new Date(
    Date.UTC(bangkokWallClock.getUTCFullYear(), bangkokWallClock.getUTCMonth(), bangkokWallClock.getUTCDate() + 1)
  );

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${nextDay.getUTCFullYear()}-${pad(nextDay.getUTCMonth() + 1)}-${pad(nextDay.getUTCDate())}T00:00:00+07:00`;
}
