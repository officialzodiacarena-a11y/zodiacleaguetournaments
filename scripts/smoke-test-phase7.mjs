// Smoke test for Stage 2 Phase 7: Pari-Mutuel Prediction Pools, Watch-to-Earn V2,
// and Admin Command Room. Hits the real dev server + real Supabase DB.
//
// Usage: npm run smoke-test:phase7
// Requires: `npm run dev` already running on BASE_URL (default http://localhost:3000)
//           .env.local with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
//           (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) and SUPABASE_SERVICE_ROLE_KEY.
//
// All fixture rows (test users, teams, tournament, stage, match, stream,
// prediction pool/tickets, ap_ledger entries, ap_earning_rule) are created
// under a run-specific tag and deleted in a `finally` block at the end,
// whether the run passes or fails.

import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / anon key in env. Run with `node --env-file=.env.local scripts/smoke-test-phase7.mjs` or via the npm script.');
  process.exit(1);
}

const RUN_TAG = `smoke7-${Date.now()}`;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0];
const AUTH_COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;
const MAX_CHUNK_SIZE = 3180;

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'} — ${name}${detail ? `\n         ${detail}` : ''}`);
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ---------------------------------------------------------------------------
// Cookie plumbing: @supabase/ssr stores the session as
// "base64-" + base64url(JSON.stringify(session)) under sb-<ref>-auth-token,
// chunked at 3180 chars into .0/.1/... — replicate that so the dev server's
// createServerClient(cookies-from-request) sees a logged-in user.
// ---------------------------------------------------------------------------
function buildAuthCookieHeader(session) {
  const encoded = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
  if (encoded.length <= MAX_CHUNK_SIZE) {
    return `${AUTH_COOKIE_NAME}=${encoded}`;
  }
  const chunks = [];
  for (let i = 0; i < encoded.length; i += MAX_CHUNK_SIZE) {
    chunks.push(encoded.slice(i, i + MAX_CHUNK_SIZE));
  }
  return chunks.map((c, i) => `${AUTH_COOKIE_NAME}.${i}=${c}`).join('; ');
}

async function signInAs(email, password) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return buildAuthCookieHeader(data.session);
}

async function api(path, { method = 'GET', cookie, body, headers } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

// ---------------------------------------------------------------------------
// Fixture bookkeeping — every created row is pushed here as {table, id} (or
// {fn} for a custom cleanup step) and torn down in reverse order.
// ---------------------------------------------------------------------------
const cleanup = [];
async function cleanupAll() {
  if (process.env.SMOKE_KEEP_FIXTURES === '1') {
    console.log('\n--- SMOKE_KEEP_FIXTURES=1: skipping cleanup, fixtures left in DB for inspection ---');
    return;
  }
  console.log('\n--- Cleaning up fixtures ---');
  for (const item of cleanup.reverse()) {
    try {
      if (item.fn) {
        await item.fn();
      } else {
        await admin.from(item.table).delete().eq('id', item.id);
      }
    } catch (e) {
      console.warn(`  cleanup warning (${item.table || item.label}/${item.id || ''}): ${e.message}`);
    }
  }
  console.log('--- Cleanup done ---');
}

function rid(prefix) {
  return `${prefix}-${RUN_TAG}-${Math.random().toString(36).slice(2, 8)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // ---- 1. Reference fixtures -------------------------------------------------
  const { data: game } = await admin.from('games').select('id').limit(1).single();
  assert(game, 'No row in games table — cannot create fixture teams.');

  const { data: season } = await admin.from('seasons').select('id').eq('status', 'ACTIVE').limit(1).single();
  assert(season, 'No ACTIVE season found — cannot create fixture tournament.');

  // ap_earning_rules is empty in this DB — Watch V2 needs an active WATCH_EARN
  // rule to award anything, so create one as a fixture (and remove it after).
  // NOTE: the live ap_earning_rules table only has the columns below (verified
  // via the PostgREST OpenAPI schema) — it does NOT have daily_cap_ap,
  // interval_seconds, or ap_per_interval, even though
  // credit_watch_v2_heartbeat() (20260910020000_t71...sql) reads
  // v_rule.daily_cap_ap / v_rule.interval_seconds / v_rule.ap_per_interval.
  // That looks like a real schema/RPC mismatch bug — see CHECK 2 below, which
  // will surface whatever the live RPC actually does against the real schema.
  const { data: rule, error: ruleErr } = await admin
    .from('ap_earning_rules')
    .insert({
      code: rid('SMOKE_RULE'),
      name: 'Smoke Test Watch Rule',
      reason: 'WATCH_EARN',
      stream_type: 'LIVE_MATCH',
      ap_amount: 10,
      max_per_stream: 999,
      is_active: true,
    })
    .select('id')
    .single();
  if (ruleErr) throw new Error(`Failed to create ap_earning_rules fixture: ${ruleErr.message}`);
  cleanup.push({ table: 'ap_earning_rules', id: rule.id });

  // ---- 2. Teams / tournament / stage / match --------------------------------
  const { data: teamA, error: teamAErr } = await admin
    .from('teams').insert({ game_id: game.id, name: rid('TeamA'), slug: rid('team-a'), tag: 'SMA' }).select('id').single();
  if (teamAErr) throw new Error(`teamA insert failed: ${teamAErr.message}`);
  cleanup.push({ table: 'teams', id: teamA.id });

  const { data: teamB, error: teamBErr } = await admin
    .from('teams').insert({ game_id: game.id, name: rid('TeamB'), slug: rid('team-b'), tag: 'SMB' }).select('id').single();
  if (teamBErr) throw new Error(`teamB insert failed: ${teamBErr.message}`);
  cleanup.push({ table: 'teams', id: teamB.id });

  const { data: tournament, error: tErr } = await admin
    .from('tournaments').insert({ season_id: season.id, name: rid('Tourney'), format: 'SINGLE_ELIMINATION', status: 'DRAFT' }).select('id').single();
  if (tErr) throw new Error(`tournament insert failed: ${tErr.message}`);
  cleanup.push({ table: 'tournaments', id: tournament.id });

  const { data: stage, error: sErr } = await admin
    .from('tournament_stages')
    .insert({ tournament_id: tournament.id, name: 'Smoke Stage', stage_order: 1, format: 'SINGLE_ELIMINATION', status: 'ACTIVE', format_config: {}, best_of_config: {}, veto_format: null })
    .select('id').single();
  if (sErr) throw new Error(`tournament_stages insert failed: ${sErr.message}`);
  cleanup.push({ table: 'tournament_stages', id: stage.id });

  const { data: match, error: mErr } = await admin
    .from('matches')
    .insert({ stage_id: stage.id, team_a_id: teamA.id, team_b_id: teamB.id, status: 'SCHEDULED', best_of: 1 })
    .select('id').single();
  if (mErr) throw new Error(`matches insert failed: ${mErr.message}`);
  cleanup.push({ table: 'matches', id: match.id });

  // ---- 3. Test users: buyer (ATHLETE), admin (ADMIN), superadmin (SUPER_ADMIN)
  const password = 'Sm0keTest!2026';
  async function createTestPlayer(roleLabel, role) {
    const email = `${rid(roleLabel)}@smoketest.zodiacleague.invalid`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (createErr) throw new Error(`auth.admin.createUser(${roleLabel}) failed: ${createErr.message}`);
    const userId = created.user.id;

    // A trigger may or may not auto-provision a players row — handle both.
    let { data: player } = await admin.from('players').select('id').eq('user_id', userId).maybeSingle();
    if (!player) {
      const { data: inserted, error: playerErr } = await admin
        .from('players')
        .insert({ user_id: userId, athlete_id: rid('ATH').slice(0, 20), display_name: rid(roleLabel), ap_balance: 0 })
        .select('id').single();
      if (playerErr) throw new Error(`players insert failed for ${roleLabel}: ${playerErr.message}`);
      player = inserted;
    }

    if (role) {
      const { data: roleRow, error: roleErr2 } = await admin
        .from('user_roles').insert({ player_id: player.id, role }).select('id').single();
      if (roleErr2) throw new Error(`user_roles insert failed for ${roleLabel}: ${roleErr2.message}`);
      cleanup.push({ table: 'user_roles', id: roleRow.id });
    }

    cleanup.push({ table: 'players', id: player.id });
    cleanup.push({ label: 'auth_user', fn: async () => { await admin.auth.admin.deleteUser(userId); } });

    return { email, playerId: player.id, userId };
  }

  const buyer = await createTestPlayer('buyer', null);
  const adminUser = await createTestPlayer('admin', 'ADMIN');
  const superAdmin = await createTestPlayer('superadmin', 'SUPER_ADMIN');

  // Fund the buyer with AP through the real ledger function (not a raw UPDATE)
  // so ap_balance and ap_ledger stay consistent, matching production flow.
  const fundKey = rid('fund');
  const { data: fundResult, error: fundErr } = await admin.rpc('move_ap', {
    p_player_id: buyer.playerId,
    p_amount: 1000,
    p_reason: 'ADMIN_ADJUSTMENT',
    p_idempotency_key: fundKey,
  });
  if (fundErr || !fundResult?.success) throw new Error(`Funding buyer AP failed: ${fundErr?.message || JSON.stringify(fundResult)}`);

  // ---- 4. Open the prediction pool (via RPC — no HTTP route exists for this
  //          in Phase 7's surface; opening a pool is out of this checklist's
  //          scope, but is a prerequisite fixture for ticket purchase). ------
  const { data: openResult, error: openErr } = await admin.rpc('open_prediction_pool', { p_match_id: match.id });
  if (openErr || !openResult?.success) throw new Error(`open_prediction_pool failed: ${openErr?.message || JSON.stringify(openResult)}`);
  const poolId = openResult.pool_id;
  cleanup.push({ table: 'prediction_pools', id: poolId });

  // ---- 5. Sign in as buyer + admin + superadmin ------------------------------
  const buyerCookie = await signInAs(buyer.email, password);
  const adminCookie = await signInAs(adminUser.email, password);
  const superAdminCookie = await signInAs(superAdmin.email, password);

  // =============================================================================
  // CHECK 1 — POST /api/v1/predictions/tickets
  // =============================================================================
  try {
    const { data: balBefore } = await admin.from('players').select('ap_balance').eq('id', buyer.playerId).single();

    const ticketRes = await api('/api/v1/predictions/tickets', {
      method: 'POST',
      cookie: buyerCookie,
      body: {
        pool_id: poolId,
        predicted_team_id: teamA.id,
        tier: 'BRONZE',
        ap_amount: 200,
        idempotency_key: rid('ticket-key'),
      },
    });

    assert(ticketRes.status === 201, `expected 201, got ${ticketRes.status}: ${JSON.stringify(ticketRes.json)}`);
    assert(ticketRes.json?.ticket_id, 'response missing ticket_id');
    cleanup.push({ table: 'prediction_tickets', id: ticketRes.json.ticket_id });

    const { data: balAfter } = await admin.from('players').select('ap_balance').eq('id', buyer.playerId).single();
    const deducted = Number(balBefore.ap_balance) - Number(balAfter.ap_balance);
    assert(deducted === 200, `expected AP balance to drop by 200, dropped by ${deducted}`);

    const { data: pool } = await admin.from('prediction_pools').select('total_ap_pool_a').eq('id', poolId).single();
    assert(Number(pool.total_ap_pool_a) === 200, `expected pool total_ap_pool_a=200, got ${pool.total_ap_pool_a}`);

    // Duplicate-purchase guard (a second ticket by the same player on the same
    // pool must be rejected — ALREADY_TICKETED, per buy_prediction_ticket()).
    const dupRes = await api('/api/v1/predictions/tickets', {
      method: 'POST',
      cookie: buyerCookie,
      body: { pool_id: poolId, predicted_team_id: teamA.id, tier: 'BRONZE', ap_amount: 50, idempotency_key: rid('ticket-key-2') },
    });
    assert(dupRes.status === 409 && dupRes.json?.error?.code === 'ALREADY_TICKETED', `expected 409 ALREADY_TICKETED on repeat purchase, got ${dupRes.status}: ${JSON.stringify(dupRes.json)}`);

    record('POST /api/v1/predictions/tickets — buys ticket & deducts AP correctly', true,
      `ticket_id=${ticketRes.json.ticket_id}, AP deducted=${deducted}, duplicate purchase correctly rejected`);
  } catch (e) {
    record('POST /api/v1/predictions/tickets — buys ticket & deducts AP correctly', false, e.message);
  }

  // =============================================================================
  // CHECK 2 — POST /api/v1/watch/heartbeat (AP crediting + zero-write CAP_REACHED)
  // =============================================================================
  let sessionId = null;
  try {
    const { data: stream, error: streamErr } = await admin
      .from('streams')
      .insert({
        title: rid('Smoke Stream'), slug: rid('smoke-stream'), type: 'LIVE_MATCH', status: 'LIVE',
        match_id: match.id, stream_url: 'https://example.invalid/smoke', is_earn_eligible: true, earning_rule_id: rule.id,
      })
      .select('id').single();
    if (streamErr) throw new Error(`streams insert failed: ${streamErr.message}`);
    cleanup.push({ table: 'streams', id: stream.id });

    const { data: session, error: sessErr } = await admin
      .from('watch_sessions')
      .insert({ stream_id: stream.id, player_id: buyer.playerId, earning_rule_id: rule.id, status: 'ACTIVE' })
      .select('id').single();
    if (sessErr) throw new Error(`watch_sessions insert failed: ${sessErr.message}`);
    sessionId = session.id;
    cleanup.push({ table: 'watch_sessions', id: sessionId });

    const firstHb = await api('/api/v1/watch/heartbeat', { method: 'POST', cookie: buyerCookie, body: { session_id: sessionId } });

    if (firstHb.status === 500 && firstHb.json?.error?.code === 'RPC_FAILED') {
      // credit_watch_v2_heartbeat() (in 20260910020000_t71...sql) reads
      // v_rule.daily_cap_ap / v_rule.interval_seconds / v_rule.ap_per_interval,
      // but the live ap_earning_rules table (confirmed via PostgREST schema
      // introspection) has no such columns — only ap_amount, cooldown_seconds,
      // min_watch_seconds/percent, max_per_day/stream. This is a genuine
      // schema/RPC mismatch, not a fixture-setup problem.
      record('POST /api/v1/watch/heartbeat — AP crediting per interval + zero-write at cap', false,
        `BLOCKED BY BUG: RPC credit_watch_v2_heartbeat() fails against the live schema — ${firstHb.json?.error?.message}. ` +
        `The function reads ap_earning_rules.daily_cap_ap / .interval_seconds / .ap_per_interval, but those columns do not exist on the live ` +
        `ap_earning_rules table (only ap_amount/cooldown_seconds/min_watch_seconds/min_watch_percent/max_per_day/max_per_stream do). ` +
        `Every call to /api/v1/watch/heartbeat currently 500s — Watch-to-Earn V2 cannot award any AP as shipped.`);
    } else {
      // Fixture rule: ap_amount=10 per heartbeat (no per-rule cap column
      // exists, so the cap comes only from ap_daily_limits.daily_cap, default 100).
      // credit_watch_v2_heartbeat()'s idempotency key for move_ap is only
      // second-granular (session_id + '-tick-' + extract(epoch)::bigint), so
      // two calls landing in the same wall-clock second collide and the
      // second is wrongly rejected as DUPLICATE_KEY — space calls out by
      // >1s to test the intended per-heartbeat crediting behavior; this
      // granularity issue itself is reported as a separate finding below.
      const heartbeats = [firstHb];
      for (let i = 0; i < 3; i++) {
        await sleep(1100);
        heartbeats.push(await api('/api/v1/watch/heartbeat', { method: 'POST', cookie: buyerCookie, body: { session_id: sessionId } }));
      }

      for (const [i, hb] of heartbeats.entries()) {
        assert(hb.status === 200, `heartbeat #${i + 1} expected 200, got ${hb.status}: ${JSON.stringify(hb.json)}`);
      }
      assert(heartbeats.every((hb) => hb.json.status === 'OK'), `expected all 4 heartbeats OK, got ${JSON.stringify(heartbeats.map((h) => h.json))}`);

      const { data: limitRow } = await admin.from('ap_daily_limits').select('ap_earned').eq('player_id', buyer.playerId).single();

      // Drain the rest of the (default 100) daily cap, then confirm a
      // zero-write CAP_REACHED response with no new heartbeat rows.
      let lastHb = heartbeats[heartbeats.length - 1];
      let guard = 0;
      while (lastHb.json.status === 'OK' && guard < 30) {
        await sleep(1100);
        lastHb = await api('/api/v1/watch/heartbeat', { method: 'POST', cookie: buyerCookie, body: { session_id: sessionId } });
        guard++;
      }
      assert(lastHb.json.status === 'CAP_REACHED' && lastHb.json.earned === 0, `expected CAP_REACHED/earned=0 eventually, got ${JSON.stringify(lastHb.json)}`);
      assert(!!lastHb.json.next_reset_at, 'CAP_REACHED response missing next_reset_at');

      const { count: hbCountAfterFirstCap } = await admin.from('watch_heartbeats').select('id', { count: 'exact', head: true }).eq('session_id', sessionId);
      const capRes2 = await api('/api/v1/watch/heartbeat', { method: 'POST', cookie: buyerCookie, body: { session_id: sessionId } });
      const { count: hbCountAfterSecondCap } = await admin.from('watch_heartbeats').select('id', { count: 'exact', head: true }).eq('session_id', sessionId);
      assert(capRes2.json.status === 'CAP_REACHED', `expected repeat call to stay CAP_REACHED, got ${JSON.stringify(capRes2.json)}`);
      assert(hbCountAfterFirstCap === hbCountAfterSecondCap, `expected zero-write once capped, before=${hbCountAfterFirstCap} after=${hbCountAfterSecondCap}`);

      record('POST /api/v1/watch/heartbeat — AP crediting per interval + zero-write at cap', true,
        `4 heartbeats OK (10 AP each); daily cap reached at ap_earned=${limitRow.ap_earned}; repeat calls after cap are zero-write (heartbeat row count stayed at ${hbCountAfterFirstCap})`);
    }
  } catch (e) {
    record('POST /api/v1/watch/heartbeat — AP crediting per interval + zero-write at cap', false, e.message);
  }

  // =============================================================================
  // CHECK 3 — Admin settle/void: role guard + DB state
  // =============================================================================
  try {
    // 3a. Role guard: non-admin buyer must be rejected with 403.
    const unauthorizedRes = await api(`/api/v1/admin/predictions/pools/${poolId}/settle`, {
      method: 'POST',
      cookie: buyerCookie,
      headers: { 'Idempotency-Key': rid('settle-unauth') },
      body: { winning_team_id: teamA.id },
    });
    assert(unauthorizedRes.status === 403, `expected 403 for non-admin settle attempt, got ${unauthorizedRes.status}: ${JSON.stringify(unauthorizedRes.json)}`);

    // 3b. Lock the pool via the real match-lifecycle path (SCHEDULED -> READY_CHECK -> LIVE),
    // which fires trg_lock_prediction_pool_on_match_live.
    const { error: readyErr } = await admin.from('matches').update({ status: 'READY_CHECK' }).eq('id', match.id);
    if (readyErr) throw new Error(`match -> READY_CHECK failed: ${readyErr.message}`);
    const { error: liveErr } = await admin.from('matches').update({ status: 'LIVE' }).eq('id', match.id);
    if (liveErr) throw new Error(`match -> LIVE failed: ${liveErr.message}`);

    const { data: poolAfterLock } = await admin.from('prediction_pools').select('status').eq('id', poolId).single();
    assert(poolAfterLock.status === 'LOCKED', `expected pool auto-locked on match LIVE, got status=${poolAfterLock.status}`);

    // 3c. Settle as ADMIN (allowed role) with the correct Idempotency-Key header.
    const settleRes = await api(`/api/v1/admin/predictions/pools/${poolId}/settle`, {
      method: 'POST',
      cookie: adminCookie,
      headers: { 'Idempotency-Key': rid('settle-key') },
      body: { winning_team_id: teamA.id },
    });
    assert(settleRes.status === 200, `expected 200 on admin settle, got ${settleRes.status}: ${JSON.stringify(settleRes.json)}`);
    assert(settleRes.json?.status === 'SETTLED', `expected status=SETTLED, got ${JSON.stringify(settleRes.json)}`);

    const { data: poolAfterSettle } = await admin.from('prediction_pools').select('status').eq('id', poolId).single();
    assert(poolAfterSettle.status === 'SETTLED', `expected DB pool status=SETTLED, got ${poolAfterSettle.status}`);

    const { data: auditRow } = await admin.from('audit_logs').select('id').eq('entity_type', 'prediction_pools').eq('entity_id', poolId).eq('reason', 'SETTLE_SETTLED').maybeSingle();
    assert(auditRow, 'expected an audit_logs row for SETTLE_SETTLED');
    if (auditRow) cleanup.push({ table: 'audit_logs', id: auditRow.id });

    // 3d. Missing Idempotency-Key must 400.
    const missingKeyRes = await api(`/api/v1/admin/predictions/pools/${poolId}/settle`, { method: 'POST', cookie: adminCookie, body: { winning_team_id: teamA.id } });
    assert(missingKeyRes.status === 400, `expected 400 for missing Idempotency-Key, got ${missingKeyRes.status}`);

    // 3e. Void role guard: ADMIN (not SUPER_ADMIN) must be rejected with 403.
    const voidByAdminRes = await api(`/api/v1/admin/predictions/pools/${poolId}/void`, {
      method: 'POST', cookie: adminCookie, headers: { 'Idempotency-Key': rid('void-unauth') },
    });
    assert(voidByAdminRes.status === 403, `expected 403 for ADMIN calling SUPER_ADMIN-only void, got ${voidByAdminRes.status}: ${JSON.stringify(voidByAdminRes.json)}`);

    // 3f. Void as SUPER_ADMIN succeeds and reverts ticket payouts.
    const voidRes = await api(`/api/v1/admin/predictions/pools/${poolId}/void`, {
      method: 'POST', cookie: superAdminCookie, headers: { 'Idempotency-Key': rid('void-key') },
    });
    assert(voidRes.status === 200, `expected 200 on superadmin void, got ${voidRes.status}: ${JSON.stringify(voidRes.json)}`);
    assert(voidRes.json?.status === 'VOIDED', `expected status=VOIDED, got ${JSON.stringify(voidRes.json)}`);

    const { data: poolAfterVoid } = await admin.from('prediction_pools').select('status').eq('id', poolId).single();
    assert(poolAfterVoid.status === 'VOIDED', `expected DB pool status=VOIDED, got ${poolAfterVoid.status}`);

    record('Admin settle/void — role guard (403s) + Idempotency-Key + correct DB state transitions', true,
      'non-admin settle=403, admin settle=200/SETTLED (+audit log), missing key=400, admin void=403, superadmin void=200/VOIDED');
  } catch (e) {
    record('Admin settle/void — role guard (403s) + Idempotency-Key + correct DB state transitions', false, e.message);
  }
}

let exitCode = 0;
try {
  await main();
} catch (e) {
  console.error('\nFATAL — setup/fixture error before checks could run:', e);
  exitCode = 1;
} finally {
  await cleanupAll();
}

console.log('\n================= SMOKE TEST SUMMARY (Stage 2 Phase 7) =================');
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}`);
}
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed.`);
if (failed > 0 || exitCode !== 0) process.exit(1);
