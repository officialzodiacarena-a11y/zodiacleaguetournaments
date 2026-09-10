# 🌳 Zpdoac Arena Master Data Tree & Schema Map (V1.06)

> 💎 **Last Updated:** เวลา 11:34:02 พฤหัสบดี 10/09/2026

ีวิธีใช้ = node update-tree.mjs

## 📁 1. Project Directory Architecture (Next.js App Router)

zodiac-arena/
├── app/
│   ├── admin/command-room/page.tsx               # Desktop-only Admin Console (Settle/Void/Dispute)
│   ├── api/v1/
│   │   ├── admin/
│   │   │   ├── matches/[id]/void/route.ts        # Emergency Match Void Handler
│   │   │   ├── predictions/pools/[id]/           # settle, void, retry-settle endpoints
│   │   │   └── predictions/pools/errors/         # Settlement error inspection
│   │   ├── matches/[id]/                         # ready, veto, report, dispute, replays, lobby
│   │   ├── marketplace/                          # listings (floor_price zero-leak), store orders
│   │   ├── payments/                             # intents, webhook (Omise/Crypto), refunds
│   │   ├── predictions/                          # pools, tickets (buy/my/inspect)
│   │   ├── subscriptions/                        # checkout, renew (AP/Fiat), check-access
│   │   ├── tournaments/                          # bracket, stages, award-zp, zodiac-draw
│   │   └── watch/                                # sessions start/end, heartbeat (Zero-write cap)
│   ├── overlay/match/[id]/                       # OBS Real-time 1080p Browser Source
│   ├── spectator/control/[match_id]/             # Referee & Caster HUD Controller
│   └── tournament/[tournamentId]/                # Bracket viewer, registration flow
├── lib/
│   ├── admin/requireAdminRole.ts                 # Multi-role support Admin Guard
│   ├── admin/stuckMinutes.ts                     # Match & Dispute timeout monitor
│   ├── billing/checkAccessGate.ts                # Pro Analytics & Tier gating
│   ├── tournament/                               # Bracket engines (Single/Double/Round Robin)
│   └── watch/nextResetAt.ts                      # Server-side reset calculator (Asia/Bangkok)
└── supabase/migrations/                          # Complete Stage 1 & Stage 2 Database Schemas

```text
zodiac/
├── app/
│   ├── admin/
│   │   ├── command-room/
│   │   │   └── page.tsx
│   │   └── store/
│   ├── api/
│   │   ├── ave/
│   │   │   └── chat/
│   │   │       └── route.ts
│   │   ├── cron/
│   │   │   ├── abuse-analysis/
│   │   │   │   └── route.ts
│   │   │   ├── clean-expired-orders/
│   │   │   │   └── route.ts
│   │   │   ├── match-reminders/
│   │   │   │   └── route.ts
│   │   │   ├── recalculate-player-stats/
│   │   │   │   └── route.ts
│   │   │   ├── reconcile-zp/
│   │   │   │   └── route.ts
│   │   │   ├── reset-daily-ap/
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
│   │       ├── admin/
│   │       │   ├── earning-rules/
│   │       │   │   ├── [id]/
│   │       │   │   │   └── route.ts
│   │       │   │   └── route.ts
│   │       │   ├── finals/
│   │       │   │   ├── circuit-lock/
│   │       │   │   │   └── route.ts
│   │       │   │   ├── season-archive/
│   │       │   │   │   └── route.ts
│   │       │   │   └── season-reset/
│   │       │   │       └── route.ts
│   │       │   ├── matches/
│   │       │   │   └── [id]/
│   │       │   │       └── void/
│   │       │   │           └── route.ts
│   │       │   ├── predictions/
│   │       │   │   └── pools/
│   │       │   │       ├── errors/
│   │       │   │       │   └── route.ts
│   │       │   │       └── [id]/
│   │       │   │           ├── retry-settle/
│   │       │   │           │   └── route.ts
│   │       │   │           ├── settle/
│   │       │   │           │   └── route.ts
│   │       │   │           └── void/
│   │       │   │               └── route.ts
│   │       │   ├── store/
│   │       │   │   ├── items/
│   │       │   │   │   ├── [id]/
│   │       │   │   │   │   └── route.ts
│   │       │   │   │   └── route.ts
│   │       │   │   ├── shipments/
│   │       │   │   │   └── [id]/
│   │       │   │   │       └── route.ts
│   │       │   │   └── variants/
│   │       │   │       └── [id]/
│   │       │   │           └── route.ts
│   │       │   ├── streams/
│   │       │   │   ├── [id]/
│   │       │   │   │   └── route.ts
│   │       │   │   └── route.ts
│   │       │   ├── themes/
│   │       │   │   ├── [id]/
│   │       │   │   │   └── route.ts
│   │       │   │   └── route.ts
│   │       │   └── verifications/
│   │       │       ├── [id]/
│   │       │       │   ├── approve/
│   │       │       │   │   └── route.ts
│   │       │       │   ├── reject/
│   │       │       │   │   └── route.ts
│   │       │       │   └── revoke/
│   │       │       │       └── route.ts
│   │       │       └── route.ts
│   │       ├── bracket-nodes/
│   │       │   └── [id]/
│   │       │       ├── void/
│   │       │       │   └── route.ts
│   │       │       └── route.ts
│   │       ├── circuits/
│   │       │   └── [id]/
│   │       │       ├── recalculate/
│   │       │       │   └── route.ts
│   │       │       └── standings/
│   │       │           └── route.ts
│   │       ├── hall-of-fame/
│   │       │   └── route.ts
│   │       ├── matches/
│   │       │   └── [id]/
│   │       │       ├── dispute/
│   │       │       │   ├── resolve/
│   │       │       │   │   └── route.ts
│   │       │       │   └── route.ts
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
│   │       │       ├── participants/
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
│   │       ├── payments/
│   │       │   ├── intents/
│   │       │   │   ├── crypto/
│   │       │   │   │   └── route.ts
│   │       │   │   ├── [id]/
│   │       │   │   │   └── route.ts
│   │       │   │   └── route.ts
│   │       │   ├── refunds/
│   │       │   │   └── route.ts
│   │       │   └── webhook/
│   │       │       ├── crypto/
│   │       │       │   └── route.ts
│   │       │       └── omise/
│   │       │           └── route.ts
│   │       ├── players/
│   │       │   ├── [id]/
│   │       │   │   ├── replays/
│   │       │   │   │   └── route.ts
│   │       │   │   └── stats/
│   │       │   │       └── route.ts
│   │       │   ├── leaderboard/
│   │       │   │   └── route.ts
│   │       │   ├── me/
│   │       │   │   ├── ap/
│   │       │   │   │   └── route.ts
│   │       │   │   ├── game-account/
│   │       │   │   │   ├── evidence/
│   │       │   │   │   │   └── route.ts
│   │       │   │   │   └── route.ts
│   │       │   │   ├── inventory/
│   │       │   │   │   ├── [variantId]/
│   │       │   │   │   │   ├── equip/
│   │       │   │   │   │   │   └── route.ts
│   │       │   │   │   │   └── unequip/
│   │       │   │   │   │       └── route.ts
│   │       │   │   │   └── route.ts
│   │       │   │   ├── payments/
│   │       │   │   │   └── route.ts
│   │       │   │   └── shipping-addresses/
│   │       │   │       ├── [id]/
│   │       │   │       │   └── route.ts
│   │       │   │       └── route.ts
│   │       │   └── search/
│   │       │       └── route.ts
│   │       ├── predictions/
│   │       │   ├── pools/
│   │       │   │   └── route.ts
│   │       │   └── tickets/
│   │       │       ├── [id]/
│   │       │       │   └── route.ts
│   │       │       ├── my/
│   │       │       │   └── route.ts
│   │       │       └── route.ts
│   │       ├── prize-payouts/
│   │       │   └── [id]/
│   │       │       └── approve/
│   │       │           └── route.ts
│   │       ├── rewards/
│   │       │   └── redeem/
│   │       │       └── route.ts
│   │       ├── seasons/
│   │       │   └── [id]/
│   │       │       ├── recalculate/
│   │       │       │   └── route.ts
│   │       │       └── standings/
│   │       │           └── route.ts
│   │       ├── stages/
│   │       │   └── [id]/
│   │       │       ├── bracket/
│   │       │       │   └── route.ts
│   │       │       ├── seed/
│   │       │       │   └── route.ts
│   │       │       ├── status/
│   │       │       │   └── route.ts
│   │       │       └── route.ts
│   │       ├── store/
│   │       │   ├── items/
│   │       │   │   └── route.ts
│   │       │   └── orders/
│   │       │       ├── [id]/
│   │       │       │   ├── checkout/
│   │       │       │   │   └── route.ts
│   │       │       │   └── shipment/
│   │       │       │       └── route.ts
│   │       │       └── route.ts
│   │       ├── streams/
│   │       │   ├── [id]/
│   │       │   │   └── watch/
│   │       │   │       ├── claim/
│   │       │   │       │   └── route.ts
│   │       │   │       ├── heartbeat/
│   │       │   │       │   └── route.ts
│   │       │   │       └── start/
│   │       │   │           └── route.ts
│   │       │   └── route.ts
│   │       ├── themes/
│   │       │   └── active/
│   │       │       └── route.ts
│   │       ├── tournament/
│   │       │   ├── bracket/
│   │       │   │   └── report-result/
│   │       │   │       └── route.ts
│   │       │   ├── circuit/
│   │       │   │   ├── award-weekly/
│   │       │   │   │   └── route.ts
│   │       │   │   └── evaluate-monthly-qualifiers/
│   │       │   │       └── route.ts
│   │       │   └── prize/
│   │       │       └── settle/
│   │       │           └── route.ts
│   │       ├── tournaments/
│   │       │   └── [id]/
│   │       │       ├── award-zp/
│   │       │       │   └── route.ts
│   │       │       ├── matches/
│   │       │       │   └── route.ts
│   │       │       ├── prize-payouts/
│   │       │       │   └── route.ts
│   │       │       ├── stages/
│   │       │       │   └── route.ts
│   │       │       ├── zodiac-draw/
│   │       │       │   └── route.ts
│   │       │       └── route.ts
│   │       ├── wallet/
│   │       │   └── cashout/
│   │       │       └── route.ts
│   │       └── watch/
│   │           ├── heartbeat/
│   │           │   └── route.ts
│   │           └── sessions/
│   │               ├── [id]/
│   │               │   └── end/
│   │               │       └── route.ts
│   │               └── start/
│   │                   └── route.ts
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
│   ├── admin/
│   │   ├── requireAdminRole.ts
│   │   └── stuckMinutes.ts
│   ├── matchmaking/
│   ├── payments/
│   │   ├── cryptoRate.ts
│   │   ├── omise.ts
│   │   └── webhookAuth.ts
│   ├── season/
│   │   └── pickRelevantSeason.ts
│   ├── supabase/
│   │   ├── admin.ts
│   │   ├── client.ts
│   │   └── server.ts
│   ├── team/
│   │   └── rosterEligibility.ts
│   ├── tournament/
│   │   ├── bracket12Engine.ts
│   │   ├── circuitPoints.ts
│   │   ├── generateDoubleEliminationBracket.ts
│   │   ├── generateRoundRobinBracket.ts
│   │   ├── generateSingleEliminationBracket.ts
│   │   ├── leaderboardService.ts
│   │   └── prizeCalculator.ts
│   └── watch/
│       └── nextResetAt.ts
```
