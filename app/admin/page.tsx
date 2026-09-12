// app/admin/page.tsx
import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { 
  ShieldAlert, 
  UserCheck, 
  Store, 
  Package, 
  FolderTree, 
  Truck, 
  Activity, 
  AlertTriangle, 
  Coins, 
  Terminal,
  ExternalLink,
  Radio
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface TelemetryStats {
  pendingDisputes: number;
  pendingVerifications: number;
  liveMatchesCount: number;
  totalApRevenue: number;
  paidOrdersCount: number;
  pendingShipments: number;
}

export default async function AdminMasterHubPage() {
  const supabase = await createClient();

  // ---------------------------------------------------------------------------
  // 1. RBAC Server Gate (AD01-01 Compliant & Schema-Accurate)
  // ---------------------------------------------------------------------------
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!player) {
    redirect('/?error=unauthorized_admin_access');
  }

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('player_id', player.id)
    .is('revoked_at', null);

  const roles = (userRoles ?? []).map((r) => r.role);
  const isSuperAdmin = roles.includes('SUPER_ADMIN');
  const isAdmin = roles.includes('ADMIN') || isSuperAdmin;
  const isReferee = roles.includes('REFEREE');
  const isMarketplaceAdmin = roles.includes('MARKETPLACE_ADMIN') || isAdmin;

  // กรองเฉพาะบทบาทที่ได้รับอนุญาตตามสเปก UI-AD01
  const isAuthorized = isAdmin || isReferee || isMarketplaceAdmin;
  if (!isAuthorized) {
    redirect('/?error=unauthorized_admin_access');
  }

  // กำหนดสิทธิ์ระดับการ์ดย่อย
  const canAccessMatchOps = isAdmin || isReferee;
  const canAccessMarketplace = isMarketplaceAdmin;

  // ---------------------------------------------------------------------------
  // 2. Fault-Tolerant Real-time Telemetry Fetching (AD01-02 Compliant)
  // ใช้ Promise.allSettled เพื่อป้องกัน Error 500 กรณีตารางว่างหรือ DB Glitch
  // ---------------------------------------------------------------------------
  const results = await Promise.allSettled([
    // [0] ข้อพิพาทคงค้าง (prediction_pools SETTLEMENT_ERROR หรือ disputes PENDING)
    supabase
      .from('prediction_pools')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'SETTLEMENT_ERROR'),
    // [1] คำขอตรวจ Riot ID รออนุมัติ
    supabase
      .from('game_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('verification_status', 'PENDING'),
    // [2] แมตช์ที่กำลังแข่งขันสด (LIVE)
    supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'LIVE'),
    // [3] ยอดรวมคำสั่งซื้อ AP
    supabase
      .from('orders')
      .select('total_price_ap')
      .eq('status', 'PAID'),
    // [4] พัสดุรอการจัดส่ง
    supabase
      .from('shipments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING'),
  ]);

  // แกะข้อมูลพร้อม Fallback ค่าเริ่มต้นเป็น 0
  const pendingDisputes = results[0].status === 'fulfilled' ? results[0].value.count ?? 0 : 0;
  const pendingVerifications = results[1].status === 'fulfilled' ? results[1].value.count ?? 0 : 0;
  const liveMatchesCount = results[2].status === 'fulfilled' ? results[2].value.count ?? 0 : 0;
  
  const paidOrdersData = results[3].status === 'fulfilled' ? results[3].value.data ?? [] : [];
  const paidOrdersCount = paidOrdersData.length;
  const totalApRevenue = paidOrdersData.reduce(
    (sum: number, o: { total_price_ap?: number | null }) => sum + (o.total_price_ap ?? 0), 
    0
  );

  const pendingShipments = results[4].status === 'fulfilled' ? results[4].value.count ?? 0 : 0;

  const stats: TelemetryStats = {
    pendingDisputes,
    pendingVerifications,
    liveMatchesCount,
    totalApRevenue,
    paidOrdersCount,
    pendingShipments,
  };

  // แสดงผล Primary Role
  const primaryRole = isSuperAdmin 
    ? 'SUPER_ADMIN' 
    : isAdmin 
    ? 'ADMIN' 
    : isReferee 
    ? 'REFEREE' 
    : 'MARKETPLACE_ADMIN';

  return (
    <div className="min-h-screen bg-[#0D0E1A] text-[#F9EDD8] font-sans p-6 md:p-10 select-none">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ====================================================================
            BLOCK 1: HEADER & LIVE TELEMETRY STRIP
        ==================================================================== */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E8B429]/15 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 rounded-full bg-[#4CAF50] animate-ping" />
              <span className="text-[11px] font-mono tracking-widest text-[#4CAF50] uppercase">
                TELEMETRY: OPERATIONAL
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-[11px] font-mono text-[#E8B429] bg-[#E8B429]/10 px-2.5 py-0.5 rounded border border-[#E8B429]/20 font-bold">
                OPERATOR ROLE: {primaryRole}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wider text-white">
              ZODIAC <span className="text-[#E8B429]">OPERATIONS COMMAND HUB</span>
            </h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              ศูนย์บัญชาการควบคุมการแข่งขัน ตรวจสอบสถิตินักกีฬา และจัดการระบบร้านค้า SINOPEC
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#1A1C2E] px-3.5 py-2 text-xs font-semibold text-[#94A3B8] hover:text-white hover:border-white/20 transition-all"
            >
              <span>Athlete Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Real-time KPI Metric Telemetry */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Live Matches */}
          <div className="rounded-xl border border-white/5 bg-[#1A1C2E] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#94A3B8] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">แมตช์กำลังแข่งสด</span>
              <Radio className={`w-4 h-4 ${stats.liveMatchesCount > 0 ? 'text-[#4CAF50] animate-pulse' : 'text-zinc-500'}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black ${stats.liveMatchesCount > 0 ? 'text-[#4CAF50]' : 'text-white'}`}>
                {stats.liveMatchesCount}
              </span>
              <span className="text-[10px] text-zinc-500">LIVE ARENA</span>
            </div>
          </div>

          {/* Pending Disputes */}
          <div className="rounded-xl border border-white/5 bg-[#1A1C2E] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#94A3B8] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">ข้อพิพาท/Error</span>
              <AlertTriangle className={`w-4 h-4 ${stats.pendingDisputes > 0 ? 'text-[#E3322F]' : 'text-zinc-500'}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black ${stats.pendingDisputes > 0 ? 'text-[#E3322F]' : 'text-white'}`}>
                {stats.pendingDisputes}
              </span>
              <span className="text-[10px] text-zinc-500">POOLS STUCK</span>
            </div>
          </div>

          {/* Pending Verifications */}
          <div className="rounded-xl border border-white/5 bg-[#1A1C2E] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#94A3B8] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">รอตรวจ Riot ID</span>
              <UserCheck className={`w-4 h-4 ${stats.pendingVerifications > 0 ? 'text-[#F59E0B]' : 'text-zinc-500'}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black ${stats.pendingVerifications > 0 ? 'text-[#F59E0B]' : 'text-white'}`}>
                {stats.pendingVerifications}
              </span>
              <span className="text-[10px] text-zinc-500">REQUESTS</span>
            </div>
          </div>

          {/* AP Marketplace Turnover */}
          <div className="rounded-xl border border-white/5 bg-[#1A1C2E] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#94A3B8] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">ยอดหมุนเวียน AP รวม</span>
              <Coins className="w-4 h-4 text-[#E8B429]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#E8B429]">
                {stats.totalApRevenue.toLocaleString()}
              </span>
              <span className="text-[10px] text-zinc-500">AP ({stats.paidOrdersCount} คำสั่งซื้อ)</span>
            </div>
          </div>

        </div>

        {/* ====================================================================
            BLOCK 2: SUB-SYSTEM GATEWAY GRID (6 CARDS)
        ==================================================================== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#94A3B8]">
              SUB-SYSTEM GATEWAY MATRIX
            </h2>
            <span className="text-[11px] font-mono text-zinc-500">6 Specialized Modules</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* 1. Command Room */}
            <Link
              href="/admin/command-room"
              className={`group relative overflow-hidden rounded-xl border bg-[#1A1C2E] p-6 transition-all duration-200 hover:-translate-y-1 ${
                canAccessMatchOps 
                  ? 'border-[#E3322F]/30 hover:border-[#E3322F] hover:shadow-[0_8px_30px_rgba(227,50,47,0.15)]' 
                  : 'opacity-40 pointer-events-none border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E3322F]/15 border border-[#E3322F]/30 text-[#E3322F]">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                {stats.pendingDisputes > 0 && (
                  <span className="rounded-full bg-[#E3322F]/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#E3322F] border border-[#E3322F]/40">
                    {stats.pendingDisputes} ACTIONS REQUIRED
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-[#E3322F] transition-colors">
                Command Room
              </h3>
              <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">
                จัดการข้อพิพาทการแข่งขัน ตัดสินผลแมตช์ฉุกเฉิน และสั่ง Void แมตช์/พูลทำนายผล
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-[#E3322F]">
                <span>เข้าสู่ศูนย์ควบคุมข้อพิพาท</span>
                <span>→</span>
              </div>
            </Link>

            {/* 2. Player Verification Desk */}
            <Link
              href="/admin/valorant-tracker"
              className={`group relative overflow-hidden rounded-xl border bg-[#1A1C2E] p-6 transition-all duration-200 hover:-translate-y-1 ${
                canAccessMatchOps 
                  ? 'border-[#F59E0B]/30 hover:border-[#F59E0B] hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]' 
                  : 'opacity-40 pointer-events-none border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B]">
                  <UserCheck className="w-5 h-5" />
                </div>
                {stats.pendingVerifications > 0 && (
                  <span className="rounded-full bg-[#F59E0B]/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#F59E0B] border border-[#F59E0B]/40">
                    {stats.pendingVerifications} PENDING
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-[#F59E0B] transition-colors">
                Player Verification Desk
              </h3>
              <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">
                ตรวจสอบหลักฐาน Riot ID สถิติย้อนหลัง และอนุมัติสถานะ Verified Athlete
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-[#F59E0B]">
                <span>เข้าสู่แผนกตรวจเอกสาร</span>
                <span>→</span>
              </div>
            </Link>

            {/* 3. Marketplace Overview */}
            <Link
              href="/admin/marketplace"
              className={`group relative overflow-hidden rounded-xl border bg-[#1A1C2E] p-6 transition-all duration-200 hover:-translate-y-1 ${
                canAccessMarketplace 
                  ? 'border-[#4CAF50]/30 hover:border-[#4CAF50] hover:shadow-[0_8px_30px_rgba(76,175,80,0.15)]' 
                  : 'opacity-40 pointer-events-none border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4CAF50]/15 border border-[#4CAF50]/30 text-[#4CAF50]">
                  <Store className="w-5 h-5" />
                </div>
                <span className="rounded-full bg-[#4CAF50]/15 px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#4CAF50]">
                  SINOPEC PARTNER
                </span>
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-[#4CAF50] transition-colors">
                Marketplace Hub
              </h3>
              <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">
                แดชบอร์ดภาพรวมร้านค้า ยอดขายสินค้าพาร์ตเนอร์ และสต็อกสินค้าพร้อมแลก
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-[#4CAF50]">
                <span>ดูสถิติร้านค้า</span>
                <span>→</span>
              </div>
            </Link>

            {/* 4. Product Catalog */}
            <Link
              href="/admin/marketplace/catalog"
              className={`group relative overflow-hidden rounded-xl border bg-[#1A1C2E] p-6 transition-all duration-200 hover:-translate-y-1 ${
                canAccessMarketplace 
                  ? 'border-white/10 hover:border-[#E8B429] hover:shadow-[0_8px_30px_rgba(232,180,41,0.12)]' 
                  : 'opacity-40 pointer-events-none border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8B429]/15 border border-[#E8B429]/30 text-[#E8B429]">
                  <Package className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono text-zinc-500">AP / THB PRICING</span>
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-[#E8B429] transition-colors">
                Product Catalog
              </h3>
              <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">
                จัดการรายการสินค้า Variant สต็อกจริงและสต็อกสำรอง (Reserved Stock)
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-[#E8B429]">
                <span>จัดการสต็อกสินค้า</span>
                <span>→</span>
              </div>
            </Link>

            {/* 5. Category Tree */}
            <Link
              href="/admin/marketplace/categories"
              className={`group relative overflow-hidden rounded-xl border bg-[#1A1C2E] p-6 transition-all duration-200 hover:-translate-y-1 ${
                canAccessMarketplace 
                  ? 'border-white/10 hover:border-white/30' 
                  : 'opacity-40 pointer-events-none border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white">
                  <FolderTree className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono text-zinc-500">HIERARCHY</span>
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-white transition-colors">
                Category Tree
              </h3>
              <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">
                จัดหมวดหมู่สินค้าโครงสร้างแม่-ลูก (Parent-Child) และจัดสรรสินค้าแบรนด์ SINOPEC
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-[#94A3B8] group-hover:text-white">
                <span>จัดการหมวดหมู่</span>
                <span>→</span>
              </div>
            </Link>

            {/* 6. Shipment Tracking */}
            <Link
              href="/admin/marketplace/shipments"
              className={`group relative overflow-hidden rounded-xl border bg-[#1A1C2E] p-6 transition-all duration-200 hover:-translate-y-1 ${
                canAccessMarketplace 
                  ? 'border-[#38BDF8]/30 hover:border-[#38BDF8] hover:shadow-[0_8px_30px_rgba(56,189,248,0.15)]' 
                  : 'opacity-40 pointer-events-none border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[#38BDF8]">
                  <Truck className="w-5 h-5" />
                </div>
                {stats.pendingShipments > 0 && (
                  <span className="rounded-full bg-[#38BDF8]/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#38BDF8] border border-[#38BDF8]/40">
                    {stats.pendingShipments} TO SHIP
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-[#38BDF8] transition-colors">
                Shipment Tracking
              </h3>
              <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">
                ติดตามคำสั่งซื้อสินค้าจริง อัปเดตเลขพัสดุ (Kerry / Flash / ไปรษณีย์ไทย)
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-[#38BDF8]">
                <span>จัดการการจัดส่ง</span>
                <span>→</span>
              </div>
            </Link>

          </div>
        </section>

        {/* ====================================================================
            BLOCK 3: AUTOMATED CRON & ENGINE STATUS STRIP
        ==================================================================== */}
        <footer className="rounded-xl border border-white/5 bg-[#121424] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/5 text-[#94A3B8]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Automated Cron Services & Edge Functions</p>
              <p className="text-[11px] text-[#94A3B8]">
                Status: Veto Auto-pick, Match Reminders, Walkover Engine, AP Anomaly Alerts are active.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/api/health"
              target="_blank"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#1A1C2E] px-3 py-1.5 text-[11px] font-mono text-[#94A3B8] hover:text-white transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-[#4CAF50]" />
              <span>/api/health</span>
            </Link>
          </div>
        </footer>

      </div>
    </div>
  );
}
