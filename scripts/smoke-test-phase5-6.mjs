#!/usr/bin/env node
// Smoke test for Stage 2 Phase 5 (Billing) & Phase 6 (Marketplace) checklist.
//
// What this does:
//   1. Reads .env.local for Supabase credentials.
//   2. Uses the SERVICE ROLE client to provision a throwaway test auth user +
//      players row (idempotent — safe to re-run) and a fixture vendor/listing.
//   3. Signs in as that test user via @supabase/ssr's createBrowserClient with
//      an in-memory cookie jar, so the resulting Cookie header is byte-for-byte
//      what the real Next.js app's createClient() (cookie-based SSR client)
//      expects — this is the same library version the app itself uses.
//   4. Hits the running local dev server (default http://localhost:3000) with
//      that Cookie header for the 4 checklist items, and asserts on the DB
//      state via the service-role client (not just the HTTP response shape).
//   5. Cleans up all fixture rows (and the test user) it created.
//
// Requirements: `npm run dev` must already be running in another terminal.
// Run with: node scripts/smoke-test-phase5-6.mjs [--base-url http://localhost:3000] [--keep]

import { readFileSync, existsSync } from 'node:fs';
import { createClient as createAdminSupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// ---------------------------------------------------------------------------
// 0. Env loading (no dotenv dependency — parse .env.local by hand)
// ---------------------------------------------------------------------------
function loadEnvLocal() {
  const path = '.env.local';
  if (!existsSync(path)) {
    console.error('❌ .env.local not found — run this from the project root.');
    process.exit(1);
  }
  const lines = readFileSync(path, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const args = process.argv.slice(2);
const baseUrlArg = args.indexOf('--base-url');
const BASE_URL = baseUrlArg !== -1 ? args[baseUrlArg + 1] : 'http://localhost:3000';
const KEEP_FIXTURES = args.includes('--keep');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL / anon key / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createAdminSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// ---------------------------------------------------------------------------
// Tiny reporter
// ---------------------------------------------------------------------------
const results = [];
function report(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}
function fatal(name, err) {
  report(name, false, err instanceof Error ? err.message : String(err));
}

// ---------------------------------------------------------------------------
// 1. Provision a throwaway test user + player row (idempotent by fixed email)
// ---------------------------------------------------------------------------
const TEST_EMAIL = 'smoke-test-phase56@zodiacarena.internal';
const TEST_PASSWORD = 'SmokeTest!Phase56-' + new Date().toISOString().slice(0, 10);

async function ensureTestUser() {
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) throw new Error(`listUsers failed: ${listErr.message}`);

  let user = list.users.find((u) => u.email === TEST_EMAIL);
  if (!user) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (createErr) throw new Error(`createUser failed: ${createErr.message}`);
    user = created.user;
  } else {
    const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, { password: TEST_PASSWORD });
    if (updateErr) throw new Error(`updateUserById (reset password) failed: ${updateErr.message}`);
  }

  let { data: player } = await admin.from('players').select('id, ap_balance').eq('user_id', user.id).maybeSingle();
  if (!player) {
    const { data: inserted, error: insertErr } = await admin
      .from('players')
      .insert({ user_id: user.id, display_name: 'Smoke Test Player', ap_balance: 5000 })
      .select('id, ap_balance')
      .single();
    if (insertErr) throw new Error(`players insert failed: ${insertErr.message}`);
    player = inserted;
  } else if (player.ap_balance < 1000) {
    // Top up via a ledger-consistent RPC rather than writing ap_balance directly.
    await admin.rpc('move_ap', {
      p_player_id: player.id,
      p_amount: 5000 - player.ap_balance,
      p_reason: 'ADMIN_ADJUSTMENT',
      p_idempotency_key: `smoke-topup-${Date.now()}`,
    });
    const { data: refreshed } = await admin.from('players').select('id, ap_balance').eq('id', player.id).single();
    player = refreshed;
  }

  return { authUserId: user.id, playerId: player.id, apBalanceBefore: player.ap_balance };
}

// ---------------------------------------------------------------------------
// 2. Sign in via the SAME @supabase/ssr code path the app uses, with an
//    in-memory cookie jar, so we get real, correctly-encoded session cookies.
// ---------------------------------------------------------------------------
async function signInAndGetCookieHeader() {
  const jar = new Map(); // name -> value

  const browserClient = createBrowserClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll() {
        return [...jar.entries()].map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) jar.set(name, value);
      },
    },
  });

  const { error } = await browserClient.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
  if (error) throw new Error(`signInWithPassword failed: ${error.message} (is email/password auth enabled on this Supabase project?)`);

  const cookieHeader = [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  return cookieHeader;
}

// ---------------------------------------------------------------------------
// 3. Fixture: vendor + one ACTIVE listing (for the marketplace zero-leak test)
// ---------------------------------------------------------------------------
async function ensureFixtureListing(playerId) {
  let { data: vendor } = await admin.from('vendors').select('id').eq('player_id', playerId).maybeSingle();
  if (!vendor) {
    const { data: inserted, error } = await admin
      .from('vendors')
      .insert({ player_id: playerId, shop_name: 'Smoke Test Shop' })
      .select('id')
      .single();
    if (error) throw new Error(`vendors insert failed: ${error.message}`);
    vendor = inserted;
  }

  const { data: listing, error: listingErr } = await admin
    .from('marketplace_listings')
    .insert({
      vendor_id: vendor.id,
      item_title: 'Smoke Test Item',
      currency_type: 'AP',
      floor_price: 999,
      status: 'ACTIVE',
    })
    .select('id')
    .single();
  if (listingErr) throw new Error(`marketplace_listings insert failed: ${listingErr.message}`);

  return { vendorId: vendor.id, listingId: listing.id };
}

// ---------------------------------------------------------------------------
// Test 1 — POST /api/v1/subscriptions/checkout
// ---------------------------------------------------------------------------
async function testCheckout(cookieHeader, playerId) {
  const idempotencyKey = `smoke-checkout-${crypto.randomUUID()}`;
  const res = await fetch(`${BASE_URL}/api/v1/subscriptions/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({ plan_code: 'PRO_CLUB', subscriber_type: 'PLAYER', subscriber_id: playerId, idempotency_key: idempotencyKey }),
  });
  const json = await res.json().catch(() => ({}));

  if (res.status !== 200 || !json.invoice_id) {
    report('Phase 5 #1: POST /subscriptions/checkout', false, `HTTP ${res.status} — ${JSON.stringify(json)}`);
    return null;
  }

  const expiresAt = new Date(json.expires_at).getTime();
  const minutesFromNow = (expiresAt - Date.now()) / 60000;
  const expiresAtOk = minutesFromNow > 25 && minutesFromNow < 35;

  const { data: dbRow, error: dbErr } = await admin
    .from('subscription_invoices')
    .select('id, status, expires_at')
    .eq('id', json.invoice_id)
    .maybeSingle();

  const dbOk = !dbErr && dbRow && dbRow.status === 'PENDING';

  report(
    'Phase 5 #1: POST /subscriptions/checkout',
    expiresAtOk && dbOk,
    `invoice_id=${json.invoice_id}, expires_at=${json.expires_at} (${minutesFromNow.toFixed(1)}min from now), db_row_found=${Boolean(dbRow)}, db_status=${dbRow?.status}`
  );

  return { invoiceId: json.invoice_id, subscriptionId: dbRow ? (await admin.from('subscription_invoices').select('subscription_id').eq('id', json.invoice_id).single()).data?.subscription_id : null };
}

// ---------------------------------------------------------------------------
// Test 2 — POST /api/v1/subscriptions/renew
// ---------------------------------------------------------------------------
async function testRenew(cookieHeader, playerId, subscriptionId, apBalanceBefore) {
  if (!subscriptionId) {
    report('Phase 5 #2: POST /subscriptions/renew', false, 'skipped — no subscription_id from checkout test');
    return;
  }

  const idempotencyKey = `smoke-renew-${crypto.randomUUID()}`;
  const res = await fetch(`${BASE_URL}/api/v1/subscriptions/renew`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader, 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ subscription_id: subscriptionId }),
  });
  const json = await res.json().catch(() => ({}));

  const { data: playerAfter } = await admin.from('players').select('ap_balance').eq('id', playerId).single();
  const apDecreased = playerAfter && playerAfter.ap_balance < apBalanceBefore;

  const httpOk = res.status === 200 && json.current_status === 'ACTIVE';

  report(
    'Phase 5 #2: POST /subscriptions/renew',
    httpOk && apDecreased,
    `HTTP ${res.status}, current_status=${json.current_status}, ap_deducted=${json.ap_deducted}, ap_balance ${apBalanceBefore} -> ${playerAfter?.ap_balance}`
  );
}

// ---------------------------------------------------------------------------
// Test 3 — GET /api/v1/marketplace/listings (no auth needed) — floor_price leak check
// ---------------------------------------------------------------------------
async function testListingsNoLeak() {
  const res = await fetch(`${BASE_URL}/api/v1/marketplace/listings?limit=50`);
  const json = await res.json().catch(() => ({}));

  if (res.status !== 200 || !Array.isArray(json.listings)) {
    report('Phase 6 #3: GET /marketplace/listings (floor_price leak)', false, `HTTP ${res.status} — ${JSON.stringify(json)}`);
    return;
  }

  const leaked = json.listings.some((row) => Object.prototype.hasOwnProperty.call(row, 'floor_price'));
  const rawText = JSON.stringify(json);
  const leakedInRawText = rawText.includes('floor_price');

  report(
    'Phase 6 #3: GET /marketplace/listings (floor_price leak)',
    !leaked && !leakedInRawText,
    `listings_returned=${json.listings.length}, floor_price_field_present=${leaked}, floor_price_substring_in_payload=${leakedInRawText}`
  );
}

// ---------------------------------------------------------------------------
// Test 4 — POST /api/v1/ap/transfer/request-otp
// ---------------------------------------------------------------------------
async function testRequestOtp(cookieHeader) {
  const res = await fetch(`${BASE_URL}/api/v1/ap/transfer/request-otp`, {
    method: 'POST',
    headers: { Cookie: cookieHeader },
  });
  const json = await res.json().catch(() => ({}));

  const notServerError = res.status !== 500;
  const hasPayload = res.status === 200 && json.sent === true && typeof json.expires_at === 'string';

  report(
    'Phase 6 #4: POST /ap/transfer/request-otp',
    notServerError && hasPayload,
    `HTTP ${res.status} — ${JSON.stringify(json)}`
  );
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------
async function cleanup({ authUserId, playerId, listingId, vendorId, invoiceId, subscriptionId }) {
  if (KEEP_FIXTURES) {
    console.log('\n(--keep passed — leaving fixture rows and test user in place)');
    return;
  }
  if (listingId) await admin.from('marketplace_listings').delete().eq('id', listingId);
  if (vendorId) await admin.from('vendors').delete().eq('id', vendorId);
  if (invoiceId) await admin.from('subscription_invoices').delete().eq('id', invoiceId);
  if (subscriptionId) await admin.from('subscriptions').delete().eq('id', subscriptionId);
  if (playerId) await admin.from('ap_ledger').delete().eq('player_id', playerId);
  if (playerId) await admin.from('players').delete().eq('id', playerId);
  if (authUserId) await admin.auth.admin.deleteUser(authUserId);
  console.log('\n(cleaned up all fixture rows and the test user)');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`Smoke testing against ${BASE_URL} — make sure \`npm run dev\` is running.\n`);

  let ctx = {};
  try {
    const { authUserId, playerId, apBalanceBefore } = await ensureTestUser();
    ctx.authUserId = authUserId;
    ctx.playerId = playerId;

    const cookieHeader = await signInAndGetCookieHeader();
    const { vendorId, listingId } = await ensureFixtureListing(playerId);
    ctx.vendorId = vendorId;
    ctx.listingId = listingId;

    const checkoutResult = await testCheckout(cookieHeader, playerId);
    if (checkoutResult) {
      ctx.invoiceId = checkoutResult.invoiceId;
      ctx.subscriptionId = checkoutResult.subscriptionId;
    }

    await testRenew(cookieHeader, playerId, ctx.subscriptionId, apBalanceBefore);
    await testListingsNoLeak();
    await testRequestOtp(cookieHeader);
  } catch (err) {
    fatal('Smoke test setup', err);
  } finally {
    await cleanup(ctx);
  }

  console.log('\n--- Summary ---');
  const passed = results.filter((r) => r.pass).length;
  console.log(`${passed}/${results.length} checks passed`);
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}

main();
