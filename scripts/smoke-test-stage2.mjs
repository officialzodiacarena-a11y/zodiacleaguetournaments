// scripts/smoke-test-stage2.mjs
import http from 'http';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

const ROUTES_TO_TEST = [
  { path: '/', expectedStatus: [200], label: 'Public Cyber-HUD Landing Page (UI-LP01)' },
  { path: '/home', expectedStatus: [200], label: 'Tournament 5-Card Hub' },
  { path: '/login', expectedStatus: [200], label: 'Clean Auth Portal (API-NAV01)' },
  { path: '/tournament', expectedStatus: [200], label: 'Tournament Registry' },
  { path: '/schedule', expectedStatus: [200], label: 'Match Schedule' },
  { path: '/leaderboard', expectedStatus: [200], label: 'ZP Leaderboard' },
  { path: '/store', expectedStatus: [200], label: 'SINOPEC AP Store' },
  { path: '/api/health', expectedStatus: [200], label: 'System Health API' },
  { path: '/admin', expectedStatus: [307, 308, 302], label: 'Admin Hub Route Guard (Guest Redirect)' },
  { path: '/admin/valorant-tracker', expectedStatus: [307, 308, 302], label: 'Verification Desk Guard (Guest Redirect)' },
];

async function checkRoute(route) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}${route.path}`;
    http.get(url, (res) => {
      const isPassed = route.expectedStatus.includes(res.statusCode);
      resolve({
        path: route.path,
        label: route.label,
        statusCode: res.statusCode,
        isPassed,
      });
    }).on('error', (err) => {
      resolve({
        path: route.path,
        label: route.label,
        statusCode: 'ERR_CONN',
        error: err.message,
        isPassed: false,
      });
    });
  });
}

async function runSmokeTests() {
  console.log('\n=============================================================');
  console.log('🚀 ZODIAC ARENA — AUTOMATED SMOKE TEST SUITE (STAGE 2)');
  console.log(`📡 Target Host: ${BASE_URL}`);
  console.log('=============================================================\n');

  let allPassed = true;

  for (const route of ROUTES_TO_TEST) {
    const result = await checkRoute(route);
    const badge = result.isPassed ? '🟢 PASS' : '🔴 FAIL';
    console.log(`${badge} [${result.statusCode}] ${route.path.padEnd(28)} — ${route.label}`);
    if (!result.isPassed) allPassed = false;
  }

  console.log('\n-------------------------------------------------------------');
  if (allPassed) {
    console.log('🎉 ALL SMOKE TESTS PASSED — STAGE 2 PRODUCTION READY 100%');
  } else {
    console.log('⚠️ SOME SMOKE TESTS FAILED — PLEASE REVIEW THE LOGS ABOVE');
  }
  console.log('=============================================================\n');
}

runSmokeTests();