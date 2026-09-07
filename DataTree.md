# 🌳 Zpdoac Arena Master Data Tree & Schema Map (V1.06)

> 💎 **Last Updated:** เวลา 21:23:04 จันทร์ 07/09/2026

ีวิธีใช้ = node update-tree.mjs

## 📁 1. Project Directory Architecture (Next.js App Router)

```text
zodiac/
├── app/
│   ├── admin/
│   │   └── store/
│   ├── api/
│   │   ├── arena/
│   │   │   └── ticket/
│   │   │       └── spend/
│   │   │           └── route.ts
│   │   ├── ave/
│   │   │   └── chat/
│   │   │       └── route.ts
│   │   ├── cron/
│   │   │   ├── match-reminders/
│   │   │   │   └── route.ts
│   │   │   ├── veto-autopick/
│   │   │   │   └── route.ts
│   │   │   └── walkover/
│   │   │       └── route.ts
│   │   ├── health/
│   │   │   └── route.ts
│   │   ├── integrity/
│   │   │   └── classify/
│   │   │       ├── route.ts
│   │   │       └── TierBadge.tsx
│   │   └── v1/
│   │       ├── bracket-nodes/
│   │       │   └── [id]/
│   │       │       ├── void/
│   │       │       │   └── route.ts
│   │       │       └── route.ts
│   │       ├── daily/
│   │       │   ├── matchmake/
│   │       │   │   └── route.ts
│   │       │   └── settle-winner/
│   │       │       └── route.ts
│   │       ├── matches/
│   │       │   └── [id]/
│   │       │       ├── games/
│   │       │       │   ├── [game_number]/
│   │       │       │   │   ├── participants/
│   │       │       │   │   │   └── route.ts
│   │       │       │   │   └── route.ts
│   │       │       │   └── route.ts
│   │       │       ├── lobby/
│   │       │       │   ├── messages/
│   │       │       │   │   └── route.ts
│   │       │       │   └── route.ts
│   │       │       ├── ready/
│   │       │       │   └── route.ts
│   │       │       ├── replays/
│   │       │       │   └── route.ts
│   │       │       ├── report/
│   │       │       │   └── route.ts
│   │       │       ├── result/
│   │       │       │   └── route.ts
│   │       │       ├── schedule/
│   │       │       │   └── route.ts
│   │       │       ├── status/
│   │       │       │   └── route.ts
│   │       │       └── veto/
│   │       │           ├── action/
│   │       │           │   └── route.ts
│   │       │           └── route.ts
│   │       ├── mercenary/
│   │       │   └── join/
│   │       │       └── route.ts
│   │       ├── players/
│   │       │   └── [id]/
│   │       │       └── replays/
│   │       │           └── route.ts
│   │       ├── rewards/
│   │       │   └── redeem/
│   │       │       └── route.ts
│   │       ├── stages/
│   │       │   └── [id]/
│   │       │       ├── bracket/
│   │       │       │   └── route.ts
│   │       │       ├── seed/
│   │       │       │   └── route.ts
│   │       │       ├── status/
│   │       │       │   └── route.ts
│   │       │       └── route.ts
│   │       ├── tournament/
│   │       │   ├── bracket/
│   │       │   │   ├── create-monthly/
│   │       │   │   │   └── route.ts
│   │       │   │   ├── create-weekly/
│   │       │   │   │   └── route.ts
│   │       │   │   └── report-result/
│   │       │   │       └── route.ts
│   │       │   ├── circuit/
│   │       │   │   ├── award-weekly/
│   │       │   │   │   └── route.ts
│   │       │   │   └── evaluate-monthly-qualifiers/
│   │       │   │       └── route.ts
│   │       │   ├── prize/
│   │       │   │   └── settle/
│   │       │   │       └── route.ts
│   │       │   └── swiss/
│   │       │       ├── finalize-top8/
│   │       │       │   └── route.ts
│   │       │       └── generate-pairing/
│   │       │           └── route.ts
│   │       ├── tournaments/
│   │       │   └── [id]/
│   │       │       ├── matches/
│   │       │       │   └── route.ts
│   │       │       ├── stages/
│   │       │       │   └── route.ts
│   │       │       └── route.ts
│   │       └── wallet/
│   │           └── cashout/
│   │               └── route.ts
│   ├── auth/
│   │   ├── callback/
│   │   │   ├── riot/
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── riot/
│   │   │   └── route.ts
│   │   └── signout/
│   │       └── route.ts
│   ├── dashboard/
│   │   └── page.tsx
│   ├── home/
│   │   └── page.tsx
│   ├── leaderboard/
│   │   └── page.tsx
│   ├── lobby/
│   ├── login/
│   │   └── page.tsx
│   ├── matches/
│   │   ├── [id]/
│   │   │   └── lobby/
│   │   │       └── page.tsx
│   │   └── page.tsx
│   ├── match-history/
│   │   └── page.tsx
│   ├── match-result/
│   │   └── [matchid]/
│   │       └── page.tsx
│   ├── overlay/
│   │   └── match/
│   │       └── [id]/
│   │           ├── mvp/
│   │           │   └── route.ts
│   │           └── page.tsx
│   ├── profile/
│   │   ├── [userId]/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── schedule/
│   │   └── page.tsx
│   ├── spectator/
│   │   └── control/
│   │       └── [match_id]/
│   │           └── page.tsx
│   ├── status/
│   │   └── page.tsx
│   ├── subscribe/
│   │   └── page.tsx
│   ├── teams/
│   │   └── [teamId]/
│   │       └── page.tsx
│   ├── tournament/
│   │   ├── daily/
│   │   │   ├── lobby/
│   │   │   │   └── [lobbyId]/
│   │   │   │       └── page.tsx
│   │   │   └── page.tsx
│   │   ├── monthly/
│   │   │   └── page.tsx
│   │   ├── [tournamentId]/
│   │   │   ├── bracket/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── weekly/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── waiting-room/
│   │   └── [lobbyId]/
│   │       └── page.tsx
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── arena/
│   │   └── ticketService.ts
│   ├── matchmaking/
│   │   └── dailyArenaTierEngine.ts
│   ├── season/
│   │   └── pickRelevantSeason.ts
│   ├── supabase/
│   │   ├── admin.ts
│   │   ├── client.ts
│   │   └── server.ts
│   ├── team/
│   │   └── rosterEligibility.ts
│   └── tournament/
│       ├── bracketEngine.ts
│       ├── circuitPoints.ts
│       ├── generateDoubleEliminationBracket.ts
│       ├── generateRoundRobinBracket.ts
│       ├── generateSingleEliminationBracket.ts
│       ├── leaderboardService.ts
│       ├── monthlyDoubleElim.ts
│       ├── prizeCalculator.ts
│       └── swissPairing.ts
```
