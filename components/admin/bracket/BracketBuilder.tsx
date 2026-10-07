'use client';

// components/admin/bracket/BracketBuilder.tsx
// ขั้นตอนจัดสายการแข่งขัน (ปุ่มถัดไปเปิดเมื่อขั้นก่อนเสร็จ) — ใช้ API เดิม ไม่มีตรรกะ seed ใหม่:
//   POST  /api/v1/tournaments/[id]/stages   สร้างสาย
//   PATCH /api/v1/stages/[id]               แก้ Bo / เวลาเริ่ม / จำนวนทีม (เฉพาะ PENDING)
//   POST  /api/v1/stages/[id]/seed          จัดทีมลงสาย
//   PATCH /api/v1/stages/[id]/status        PENDING → SEEDING → ACTIVE
import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TournamentBracketView } from '@/components/tournament-bracket-view';
import { defaultVetoFormat, resolveStageVetoConfig } from '@/lib/veto/stageConfig';
import type { BracketMatchNode } from '@/types/bracket';
import {
  BEST_OF_PRESETS,
  BRACKET_API_FALLBACK_MESSAGE,
  BO2_NOT_ALLOWED_MESSAGE,
  BRACKET_FORMATS,
  bestOfConfigForPreset,
  bracketApiErrorMessage,
  isoToThaiParts,
  moveItem,
  presetAllowedForFormat,
  presetFromBestOfConfig,
  seedCountProblem,
  shuffled,
  thaiLocalToIso,
  type BestOfPreset,
  type BracketFormat,
} from '@/lib/tournament/bracketBuilder';
import { isPointsFormat } from '@/lib/tournament/drawRule';

export interface TournamentSummary {
  id: string;
  name: string;
  status: string;
  registrationClosesAt: string | null;
  defaultDate: string; // YYYY-MM-DD (เขตไทย) ของวันแข่ง ถ้าทัวร์มีวันเริ่ม
  approvedCount: number;
  awaitingPaymentCount: number;
  slipUploadedCount: number;
}

export interface ApprovedTeam {
  id: string;
  name: string;
  tag: string;
}

export interface BuilderStage {
  id: string;
  name: string;
  stageOrder: number;
  format: string;
  status: string;
  teamsIn: number | null;
  bestOfConfig: unknown;
  startAt: string | null;
  nodeCount: number;
}

// ค่าแนะนำรายชื่อแมพ + ที่มา (ว่าง = ยังไม่มีรอบก่อนหน้า) — เป็นแค่ค่าเริ่มต้นในช่องกรอก แอดมินแก้ได้และต้องกดสร้างเอง
export interface SuggestedMapPool {
  maps: string[];
  sourceStageName: string | null;
  sourceTournamentName: string | null;
}

interface Props {
  tournament: TournamentSummary;
  approvedTeams: ApprovedTeam[];
  stages: BuilderStage[];
  selectedStageId: string | null;
  matches: BracketMatchNode[];
  suggestedMapPool: SuggestedMapPool;
}

type Notice = { kind: 'ok' | 'error'; text: string } | null;
type ApiResult = { ok: true; data: { id?: string } | null } | { ok: false; message: string };

const STAGE_STATUS_LABEL: Record<string, string> = {
  PENDING: 'ยังไม่เริ่ม',
  SEEDING: 'จัดทีมแล้ว · รอเปิดสาย',
  ACTIVE: 'กำลังแข่ง',
  COMPLETED: 'จบแล้ว',
  CANCELLED: 'ยกเลิก',
};

const inputCls =
  'w-full rounded-lg border border-white/10 bg-[#0D0E1A] px-3 py-2 text-sm text-white placeholder:text-[#5b5f73] focus:border-[#E8B429]/60 focus:outline-none disabled:opacity-50';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-[#9397ab] mb-1';
const primaryBtn =
  'rounded-lg bg-[#E8B429] px-4 py-2 text-sm font-extrabold text-[#0D0E1A] hover:bg-[#f1c545] disabled:opacity-40 disabled:cursor-not-allowed';
const ghostBtn =
  'rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-[#cfd3e5] hover:border-white/40 disabled:opacity-40 disabled:cursor-not-allowed';

async function callApi(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<ApiResult> {
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => null)) as { data?: { id?: string }; error?: { code?: string } } | null;
    if (!res.ok) return { ok: false, message: bracketApiErrorMessage(json?.error?.code) };
    return { ok: true, data: json?.data ?? null };
  } catch {
    return { ok: false, message: BRACKET_API_FALLBACK_MESSAGE };
  }
}

function formatThai(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' });
}

function StepCard({
  n,
  title,
  state,
  children,
}: {
  n: number;
  title: string;
  state: 'done' | 'active' | 'locked';
  children: React.ReactNode;
}) {
  const ring =
    state === 'done' ? 'border-[#4CAF50]/40' : state === 'active' ? 'border-[#E8B429]/50' : 'border-white/10 opacity-60';
  const badge =
    state === 'done'
      ? 'bg-[#4CAF50]/20 text-[#4CAF50] border-[#4CAF50]/40'
      : state === 'active'
        ? 'bg-[#E8B429]/15 text-[#E8B429] border-[#E8B429]/40'
        : 'bg-white/5 text-[#75798c] border-white/10';
  return (
    <section className={`rounded-xl border bg-[#1A1C2E] p-4 sm:p-5 ${ring}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black ${badge}`}>
          {state === 'done' ? '✓' : n}
        </span>
        <h2 className="text-sm font-extrabold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

// เหตุผลที่ยังสร้างรอบไม่ได้เพราะรายชื่อแมพ (null = ใช้ได้) · จำนวนขั้น Veto ตามค่าเริ่มต้นที่ฟอร์มนี้ส่ง (ฟอร์มนี้ไม่ได้ส่ง veto_format)
function mapPoolBlockReason(maps: string[], pendingInput: string, stepCount: number): string | null {
  if (pendingInput.trim() !== '') return 'มีชื่อแมพที่พิมพ์ค้างอยู่ — กด "เพิ่มแมพ" ก่อน หรือลบข้อความในช่อง';
  if (maps.length === 0) return `ยังไม่มีรายชื่อแมพ — ต้องมีอย่างน้อย ${stepCount} แมพ`;
  const seen = new Set<string>();
  for (const m of maps) {
    const key = m.trim().toLowerCase();
    if (seen.has(key)) return `มีชื่อแมพซ้ำ: ${m}`;
    seen.add(key);
  }
  if (maps.length < stepCount) return `จำนวนแมพ (${maps.length}) น้อยกว่าจำนวนขั้น Veto (${stepCount})`;
  const checked = resolveStageVetoConfig({ map_pool: maps }, { requireMapPool: true });
  return checked.ok ? null : checked.problems.join('; ');
}

export function BracketBuilder({ tournament, approvedTeams, stages, selectedStageId, matches, suggestedMapPool }: Props) {
  const router = useRouter();
  const stage = stages.find((s) => s.id === selectedStageId) ?? null;
  const nextStageOrder = stages.reduce((max, s) => Math.max(max, s.stageOrder), 0) + 1;

  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [showCreate, setShowCreate] = useState(stages.length === 0);

  // ฟอร์มสร้างสาย
  const [name, setName] = useState('สายหลัก');
  const [format, setFormat] = useState<BracketFormat>('SINGLE_ELIMINATION');
  const [teamsIn, setTeamsIn] = useState(String(Math.max(approvedTeams.length, 2)));
  const [preset, setPreset] = useState<BestOfPreset>('BO1_ALL');
  const [date, setDate] = useState(tournament.defaultDate);
  const [time, setTime] = useState('20:00');
  const [maps, setMaps] = useState<string[]>(suggestedMapPool.maps);
  const [mapInput, setMapInput] = useState('');
  const vetoStepCount = defaultVetoFormat().sequence.length;
  const mapBlockReason = mapPoolBlockReason(maps, mapInput, vetoStepCount);

  function addMap() {
    const value = mapInput.trim();
    if (!value) return;
    setMaps((prev) => [...prev, value]);
    setMapInput('');
  }

  // ฟอร์มแก้สายที่ยัง PENDING
  const stageParts = isoToThaiParts(stage?.startAt);
  const [editTeamsIn, setEditTeamsIn] = useState(String(stage?.teamsIn ?? ''));
  const [editPreset, setEditPreset] = useState<BestOfPreset>(presetFromBestOfConfig(stage?.bestOfConfig) ?? 'BO1_ALL');
  const [editDate, setEditDate] = useState(stageParts?.date ?? tournament.defaultDate);
  const [editTime, setEditTime] = useState(stageParts?.time ?? '20:00');
  const [editKey, setEditKey] = useState(stage?.id ?? '');
  if ((stage?.id ?? '') !== editKey) {
    // เปลี่ยนสายที่เลือก → โหลดค่าของสายนั้นลงฟอร์มแก้
    setEditKey(stage?.id ?? '');
    setEditTeamsIn(String(stage?.teamsIn ?? ''));
    setEditPreset(presetFromBestOfConfig(stage?.bestOfConfig) ?? 'BO1_ALL');
    setEditDate(stageParts?.date ?? tournament.defaultDate);
    setEditTime(stageParts?.time ?? '20:00');
  }

  // ลำดับ seed: เริ่มจากรายชื่อทีม APPROVED · คงลำดับที่แอดมินจัดไว้ แม้รายชื่อรีเฟรช
  const [order, setOrder] = useState<string[]>(() => approvedTeams.map((t) => t.id));
  const teamById = useMemo(() => new Map(approvedTeams.map((t) => [t.id, t])), [approvedTeams]);
  const effectiveOrder = useMemo(() => {
    const kept = order.filter((id) => teamById.has(id));
    const missing = approvedTeams.map((t) => t.id).filter((id) => !kept.includes(id));
    return [...kept, ...missing];
  }, [order, approvedTeams, teamById]);

  const stagePending = stage?.status === 'PENDING';
  const bracketGenerated = (stage?.nodeCount ?? 0) > 0;
  const step2Done = !!stage;
  const step3Done = bracketGenerated;
  const step4Done = stage?.status === 'ACTIVE' || stage?.status === 'COMPLETED';

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setNotice(null);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  function fail(text: string) {
    setNotice({ kind: 'error', text });
  }

  async function createStage() {
    const teams = Number(teamsIn);
    if (!name.trim()) return fail('กรุณาตั้งชื่อสาย');
    if (!Number.isInteger(teams) || teams < 2) return fail('จำนวนทีมต้องเป็นจำนวนเต็มตั้งแต่ 2 ขึ้นไป');
    const startAt = thaiLocalToIso(date, time);
    if (!startAt) return fail('กรุณาเลือกวันที่และเวลาเริ่มแข่ง (เวลาไทย)');
    if (mapBlockReason) return fail(mapBlockReason);
    if (!presetAllowedForFormat(preset, format)) return fail(BO2_NOT_ALLOWED_MESSAGE);

    await run('create', async () => {
      const res = await callApi(`/api/v1/tournaments/${tournament.id}/stages`, 'POST', {
        name: name.trim(),
        stage_order: nextStageOrder,
        format,
        teams_in: teams,
        best_of_config: bestOfConfigForPreset(preset),
        start_at: startAt,
        map_pool: maps.map((m) => m.trim()),
      });
      if (!res.ok) return fail(res.message);
      setNotice({ kind: 'ok', text: 'สร้างสายแล้ว — ต่อไปจัดทีมลงสาย' });
      setShowCreate(false);
      router.push(`/admin/tournaments/${tournament.id}/bracket${res.data?.id ? `?stage=${res.data.id}` : ''}`);
      router.refresh();
    });
  }

  async function saveStageEdits() {
    if (!stage) return;
    const teams = Number(editTeamsIn);
    if (!Number.isInteger(teams) || teams < 2) return fail('จำนวนทีมต้องเป็นจำนวนเต็มตั้งแต่ 2 ขึ้นไป');
    const startAt = thaiLocalToIso(editDate, editTime);
    if (!startAt) return fail('กรุณาเลือกวันที่และเวลาเริ่มแข่ง (เวลาไทย)');
    if (!bracketGenerated && !presetAllowedForFormat(editPreset, stage.format)) return fail(BO2_NOT_ALLOWED_MESSAGE);

    await run('edit', async () => {
      // Bo ถูกคัดลอกลงโหนดตอน seed แล้วแก้ทีหลังไม่ย้อนไปโหนด → ส่งเฉพาะตอนยังไม่ได้จัดสาย
      const body: Record<string, unknown> = { teams_in: teams, start_at: startAt };
      if (!bracketGenerated) body.best_of_config = bestOfConfigForPreset(editPreset);
      const res = await callApi(`/api/v1/stages/${stage.id}`, 'PATCH', body);
      if (!res.ok) return fail(res.message);
      setNotice({ kind: 'ok', text: 'บันทึกการแก้ไขแล้ว' });
      router.refresh();
    });
  }

  async function confirmSeed() {
    if (!stage) return;
    const problem = seedCountProblem(effectiveOrder.length, stage.teamsIn);
    if (problem) return fail(problem);
    if (!window.confirm(`ยืนยันจัด ${effectiveOrder.length} ทีมลงสาย "${stage.name}" ตามลำดับที่เห็น?\nจัดแล้วแก้ลำดับไม่ได้`)) return;

    await run('seed', async () => {
      const res = await callApi(`/api/v1/stages/${stage.id}/seed`, 'POST', {
        seeded_teams: effectiveOrder.map((teamId, i) => ({ team_id: teamId, seed: i + 1 })),
      });
      if (!res.ok) return fail(res.message);
      setNotice({ kind: 'ok', text: 'จัดทีมลงสายแล้ว — ตรวจสายด้านล่าง แล้วกด "เริ่มแข่ง" เมื่อพร้อม' });
      router.refresh();
    });
  }

  async function startStage() {
    if (!stage) return;
    if (!window.confirm(`เปิดสาย "${stage.name}" ให้เริ่มแข่งจริง?\nระบบจะสร้างแมตช์ตามเวลาที่ตั้งไว้`)) return;

    await run('start', async () => {
      if (stage.status === 'PENDING') {
        const toSeeding = await callApi(`/api/v1/stages/${stage.id}/status`, 'PATCH', { status: 'SEEDING' });
        if (!toSeeding.ok) return fail(toSeeding.message);
      }
      const toActive = await callApi(`/api/v1/stages/${stage.id}/status`, 'PATCH', { status: 'ACTIVE' });
      if (!toActive.ok) return fail(toActive.message);
      setNotice({ kind: 'ok', text: 'เปิดสายแล้ว — สายอยู่ในสถานะกำลังแข่ง' });
      router.refresh();
    });
  }

  const closes = tournament.registrationClosesAt;

  return (
    <div className="space-y-4 mt-3">
      <header>
        <h1 className="text-lg font-extrabold tracking-wide text-white">จัดสายการแข่งขัน</h1>
        <p className="text-sm text-[#cfd3e5] mt-0.5">{tournament.name}</p>
      </header>

      {/* ขั้น 1 — ข้อมูลทัวร์ */}
      <StepCard n={1} title="ทัวร์ที่เลือก" state="done">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#cfd3e5]">
          <span>สถานะ: <b className="text-white">{tournament.status}</b></span>
          <span>ปิดรับสมัคร: <b className="text-white">{formatThai(closes)}</b></span>
          <span>อนุมัติแล้ว: <b className="text-[#4CAF50]">{tournament.approvedCount}</b></span>
          <span>รอตรวจสลิป: <b className="text-white">{tournament.slipUploadedCount}</b></span>
          <span>รอชำระ: <b className="text-white">{tournament.awaitingPaymentCount}</b></span>
        </div>
        <Link
          href={`/admin/entry-payments?tournament=${tournament.id}`}
          className="mt-3 inline-block text-xs font-bold text-[#E8B429] hover:underline"
        >
          ไปตรวจค่าสมัคร / อนุมัติทีม →
        </Link>
      </StepCard>

      {notice && (
        <div
          role="status"
          className={`rounded-xl border p-3 text-sm font-bold ${
            notice.kind === 'ok'
              ? 'border-[#4CAF50]/40 bg-[#4CAF50]/10 text-[#7bd67f]'
              : 'border-[#E3322F]/40 bg-[#E3322F]/10 text-[#ff8a87]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* ขั้น 2 — สร้างสาย / เลือกสาย */}
      <StepCard n={2} title="สร้างสาย" state={step2Done ? 'done' : 'active'}>
        {stages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {stages.map((s) => (
              <Link
                key={s.id}
                href={`/admin/tournaments/${tournament.id}/bracket?stage=${s.id}`}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                  s.id === stage?.id
                    ? 'border-[#E8B429]/50 bg-[#E8B429]/15 text-[#E8B429]'
                    : 'border-white/10 bg-[#0D0E1A] text-[#9397ab] hover:border-white/30'
                }`}
              >
                {s.name} · {STAGE_STATUS_LABEL[s.status] ?? s.status}
              </Link>
            ))}
            <button type="button" className={ghostBtn} onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? 'ซ่อนฟอร์ม' : '+ สร้างสายใหม่'}
            </button>
          </div>
        )}

        {showCreate && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="stage-name">ชื่อสาย</label>
              <input id="stage-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className={labelCls} htmlFor="stage-format">รูปแบบ</label>
              <select
                id="stage-format"
                className={inputCls}
                value={format}
                onChange={(e) => {
                  const next = e.target.value as BracketFormat;
                  setFormat(next);
                  if (!presetAllowedForFormat(preset, next)) setPreset('BO1_ALL');
                }}
              >
                {BRACKET_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="stage-teams">จำนวนทีม</label>
              <input
                id="stage-teams"
                className={inputCls}
                inputMode="numeric"
                value={teamsIn}
                onChange={(e) => setTeamsIn(e.target.value.replace(/\D/g, ''))}
              />
              <p className="text-[11px] text-[#75798c] mt-1">ตั้งต้นเท่าจำนวนทีมที่อนุมัติแล้ว ({tournament.approvedCount} ทีม)</p>
            </div>
            <div>
              <label className={labelCls} htmlFor="stage-bo">Bo (จำนวนเกมต่อแมตช์)</label>
              <select id="stage-bo" className={inputCls} value={preset} onChange={(e) => setPreset(e.target.value as BestOfPreset)}>
                {BEST_OF_PRESETS.map((p) => (
                  <option key={p.value} value={p.value} disabled={!presetAllowedForFormat(p.value, format)}>{p.label}</option>
                ))}
              </select>
              {(preset === 'BO2_ALL' && isPointsFormat(format)) || !isPointsFormat(format) ? (
                <p data-testid="stage-bo-hint" className="text-[11px] text-[#75798c] mt-1">
                  {isPointsFormat(format)
                    ? 'Bo2: จบ 1–1 = เสมอ ได้ทีมละ 1 แต้ม (ชนะ 3 · แพ้ 0)'
                    : 'Bo2 เลือกได้เฉพาะสายแบบเก็บคะแนน (Round Robin · Group Stage · Swiss · Zodiac Arena System)'}
                </p>
              ) : null}
            </div>
            <div>
              <label className={labelCls} htmlFor="stage-date">วันที่แข่ง (เวลาไทย)</label>
              <input id="stage-date" type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls} htmlFor="stage-time">เวลาเริ่ม (เวลาไทย)</label>
              <input id="stage-time" type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
              <p className="text-[11px] text-[#75798c] mt-1">รอบถัดไปจะ +1 ชั่วโมงอัตโนมัติ</p>
            </div>
            <div className="sm:col-span-2" data-testid="map-pool-field">
              <label className={labelCls} htmlFor="stage-map-input">รายชื่อแมพของรอบนี้</label>
              {maps.length > 0 && (
                <ul className="flex flex-wrap gap-2 mb-2" aria-label="รายชื่อแมพของรอบนี้">
                  {maps.map((m, i) => (
                    <li
                      key={`${m}-${i}`}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0D0E1A] pl-3 pr-1 py-1 text-xs text-white"
                    >
                      <span>{m}</span>
                      <button
                        type="button"
                        className="rounded px-2 py-0.5 text-[#9397ab] hover:text-white disabled:opacity-40"
                        aria-label={`ลบแมพ ${m}`}
                        disabled={busy !== null}
                        onClick={() => setMaps((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  id="stage-map-input"
                  className={inputCls}
                  placeholder="ชื่อแมพ"
                  value={mapInput}
                  disabled={busy !== null}
                  onChange={(e) => setMapInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addMap();
                    }
                  }}
                />
                <button type="button" className={ghostBtn} disabled={busy !== null || mapInput.trim() === ''} onClick={addMap}>
                  เพิ่มแมพ
                </button>
              </div>
              <p className="text-[11px] text-[#75798c] mt-1" data-testid="map-pool-summary">
                {maps.length} แมพ · {vetoStepCount} ขั้น Veto ·{' '}
                {suggestedMapPool.sourceStageName
                  ? `คัดลอกจากรอบ ${suggestedMapPool.sourceStageName} ของทัวร์ ${suggestedMapPool.sourceTournamentName ?? ''}`
                  : 'ยังไม่มีรอบก่อนหน้า กรุณาใส่รายชื่อแมพ'}
              </p>
              <p className="text-[11px] font-bold text-[#E8B429] mt-1">ตรวจรายชื่อให้ตรงกับแมพที่เปิดในแพทช์ล่าสุดของเกมก่อนกดสร้าง</p>
            </div>
            <div className="sm:col-span-2">
              <button type="button" className={primaryBtn} disabled={busy !== null || mapBlockReason !== null} onClick={createStage}>
                {busy === 'create' ? 'กำลังสร้าง…' : 'สร้างสาย'}
              </button>
              {mapBlockReason && (
                <p className="text-[11px] text-[#ff8f8f] mt-1" role="status" data-testid="map-pool-block-reason">
                  สร้างไม่ได้: {mapBlockReason}
                </p>
              )}
            </div>
          </div>
        )}

        {stage && !showCreate && (
          <div className="rounded-lg border border-white/10 bg-[#0D0E1A] p-3 text-xs text-[#cfd3e5] space-y-3">
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              <span>สาย: <b className="text-white">{stage.name}</b></span>
              <span>รูปแบบ: <b className="text-white">{stage.format.replace(/_/g, ' ')}</b></span>
              <span>สถานะ: <b className="text-white">{STAGE_STATUS_LABEL[stage.status] ?? stage.status}</b></span>
              <span>เริ่ม: <b className="text-white">{formatThai(stage.startAt)}</b></span>
              <span>จำนวนทีม: <b className="text-white">{stage.teamsIn ?? '-'}</b></span>
            </div>

            {stagePending ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className={labelCls} htmlFor="edit-teams">จำนวนทีม</label>
                  <input
                    id="edit-teams"
                    className={inputCls}
                    inputMode="numeric"
                    value={editTeamsIn}
                    disabled={bracketGenerated}
                    onChange={(e) => setEditTeamsIn(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="edit-bo">Bo</label>
                  <select
                    id="edit-bo"
                    className={inputCls}
                    value={editPreset}
                    disabled={bracketGenerated}
                    onChange={(e) => setEditPreset(e.target.value as BestOfPreset)}
                  >
                    {BEST_OF_PRESETS.map((p) => (
                      <option key={p.value} value={p.value} disabled={!presetAllowedForFormat(p.value, stage.format)}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="edit-date">วันที่ (เวลาไทย)</label>
                  <input id="edit-date" type="date" className={inputCls} value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="edit-time">เวลาเริ่ม</label>
                  <input id="edit-time" type="time" className={inputCls} value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                </div>
                <div className="sm:col-span-4 flex flex-wrap items-center gap-3">
                  <button type="button" className={ghostBtn} disabled={busy !== null} onClick={saveStageEdits}>
                    {busy === 'edit' ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}
                  </button>
                  <span className="text-[11px] text-[#75798c]">
                    {bracketGenerated
                      ? 'จัดทีมลงสายแล้ว — แก้ได้เฉพาะเวลาเริ่ม (Bo และจำนวนทีมถูกใช้สร้างสายไปแล้ว) · รอบถัดไป +1 ชั่วโมงอัตโนมัติ'
                      : 'แก้ Bo / เวลาเริ่มได้เฉพาะตอนสายยังไม่เริ่ม · รอบถัดไป +1 ชั่วโมงอัตโนมัติ'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-[#75798c]">สายนี้เริ่มแล้ว แก้ไข Bo / เวลาเริ่มไม่ได้</p>
            )}
          </div>
        )}
      </StepCard>

      {/* ขั้น 3 — จัดทีมลงสาย */}
      <StepCard n={3} title="จัดทีมลงสาย (seed)" state={step3Done ? 'done' : step2Done ? 'active' : 'locked'}>
        {!stage ? (
          <p className="text-xs text-[#75798c]">สร้างสายในขั้นที่ 2 ก่อน</p>
        ) : bracketGenerated ? (
          <p className="text-xs text-[#9be3a0]">จัดทีมลงสายแล้ว ({stage.nodeCount} โหนด) — ดูสายในขั้นที่ 5</p>
        ) : !stagePending ? (
          <p className="text-xs text-[#75798c]">สายนี้ไม่อยู่ในสถานะที่จัดทีมได้</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className={ghostBtn} disabled={busy !== null} onClick={() => setOrder(shuffled(effectiveOrder))}>
                🎲 สุ่มลำดับ
              </button>
              <span className="text-xs text-[#9397ab]">
                ทีมที่อนุมัติแล้ว <b className="text-white">{effectiveOrder.length}</b> ทีม · สายตั้งไว้{' '}
                <b className="text-white">{stage.teamsIn ?? '-'}</b> ทีม
              </span>
            </div>

            {effectiveOrder.length === 0 ? (
              <p className="text-xs text-[#fbbf24]">ยังไม่มีทีมที่อนุมัติ — ไปอนุมัติทีมที่หน้าตรวจค่าสมัครก่อน</p>
            ) : (
              <ol className="space-y-1.5">
                {effectiveOrder.map((id, i) => {
                  const t = teamById.get(id);
                  return (
                    <li key={id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0D0E1A] px-3 py-2">
                      <span className="w-6 text-center text-xs font-black text-[#E8B429]">{i + 1}</span>
                      <span className="flex-1 min-w-0 truncate text-sm font-bold text-white">
                        {t?.name ?? id}
                        {t?.tag ? <span className="ml-1 text-[#9397ab] font-normal">[{t.tag}]</span> : null}
                      </span>
                      <button
                        type="button"
                        aria-label={`เลื่อน ${t?.name ?? ''} ขึ้น`}
                        className={ghostBtn}
                        disabled={busy !== null || i === 0}
                        onClick={() => setOrder(moveItem(effectiveOrder, i, i - 1))}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        aria-label={`เลื่อน ${t?.name ?? ''} ลง`}
                        className={ghostBtn}
                        disabled={busy !== null || i === effectiveOrder.length - 1}
                        onClick={() => setOrder(moveItem(effectiveOrder, i, i + 1))}
                      >
                        ▼
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}

            {(() => {
              const problem = seedCountProblem(effectiveOrder.length, stage.teamsIn);
              return problem ? <p className="text-xs font-bold text-[#fbbf24]">{problem}</p> : null;
            })()}

            <button
              type="button"
              className={primaryBtn}
              disabled={busy !== null || seedCountProblem(effectiveOrder.length, stage.teamsIn) !== null}
              onClick={confirmSeed}
            >
              {busy === 'seed' ? 'กำลังจัดสาย…' : 'ยืนยันจัดสาย'}
            </button>
          </div>
        )}
      </StepCard>

      {/* ขั้น 4 — เปิดสาย */}
      <StepCard n={4} title="เปิดสาย" state={step4Done ? 'done' : step3Done ? 'active' : 'locked'}>
        {!stage || !bracketGenerated ? (
          <p className="text-xs text-[#75798c]">จัดทีมลงสายในขั้นที่ 3 ก่อน</p>
        ) : stage.status === 'ACTIVE' ? (
          <p className="text-xs text-[#9be3a0]">สายนี้กำลังแข่ง</p>
        ) : stage.status === 'COMPLETED' || stage.status === 'CANCELLED' ? (
          <p className="text-xs text-[#75798c]">สายนี้{STAGE_STATUS_LABEL[stage.status]}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-[#9397ab]">
              ตรวจสายและเวลาเริ่ม (<b className="text-white">{formatThai(stage.startAt)}</b>) ให้ถูกต้องก่อน — เปิดแล้วระบบจะสร้างแมตช์ตามเวลา
            </p>
            <button type="button" className={primaryBtn} disabled={busy !== null} onClick={startStage}>
              {busy === 'start' ? 'กำลังเปิดสาย…' : 'เริ่มแข่ง'}
            </button>
          </div>
        )}
      </StepCard>

      {/* ขั้น 5 — ดูสาย */}
      <StepCard n={5} title="ดูสาย" state={matches.length > 0 ? 'done' : 'locked'}>
        {matches.length === 0 ? (
          <p className="text-xs text-[#75798c]">สายจะแสดงที่นี่หลังจัดทีมลงสาย</p>
        ) : (
          <div className="space-y-3">
            <Link href={`/tournament/${tournament.id}/bracket`} className="inline-block text-xs font-bold text-[#E8B429] hover:underline">
              เปิดหน้าสายที่ผู้เล่นเห็น →
            </Link>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <TournamentBracketView
                data={{
                  tournamentId: tournament.id,
                  tournamentName: tournament.name,
                  subMetaText: `${stage?.name ?? ''} · ${(stage?.format ?? '').replace(/_/g, ' ')} · ${stage?.teamsIn ?? '-'} TEAMS`,
                  prizeZpText: '—',
                  matches,
                }}
              />
            </div>
          </div>
        )}
      </StepCard>
    </div>
  );
}
