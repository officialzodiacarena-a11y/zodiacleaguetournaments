// lib/overlay/agents.ts
// เมทาดาต้า Agent ของ Valorant (role, ภาพครึ่งตัว, สีประจำตัว) สำหรับ Overlay
// ที่มา: Riot's public asset CDN (https://valorant-api.com/v1/agents) — ข้อมูลสาธารณะ ไม่ใช่ของปลอม
// จับคู่กับ `agent_played` จริงจาก match_participants ด้วยชื่อ (normalize ตัวพิมพ์/สัญลักษณ์) — ไม่พบ = ไม่แสดงภาพ (ไม่เดา)

export type AgentRole = "Duelist" | "Initiator" | "Controller" | "Sentinel";

export interface AgentVisual {
  name: string;
  role: AgentRole;
  portrait: string;
  accent: string; // hex, e.g. "#26146C"
}

const AGENT_DATABASE: Record<string, AgentVisual> = {
  ASTRA: { name: "Astra", role: "Controller", portrait: "https://media.valorant-api.com/agents/41fb69c1-4189-7b37-f117-bcaf1e96f1bf/fullportrait.png", accent: "#26146C" },
  BREACH: { name: "Breach", role: "Initiator", portrait: "https://media.valorant-api.com/agents/5f8d3a7f-467b-97f3-062c-13acf203c006/fullportrait.png", accent: "#81331A" },
  BRIMSTONE: { name: "Brimstone", role: "Controller", portrait: "https://media.valorant-api.com/agents/9f0d8ba9-4140-b941-57d3-a7ad57c6b417/fullportrait.png", accent: "#363C4F" },
  CHAMBER: { name: "Chamber", role: "Sentinel", portrait: "https://media.valorant-api.com/agents/22697a3d-45bf-8dd7-4fec-84a9e28c69d7/fullportrait.png", accent: "#20435B" },
  CLOVE: { name: "Clove", role: "Controller", portrait: "https://media.valorant-api.com/agents/1dbf2edd-4729-0984-3115-daa5eed44993/fullportrait.png", accent: "#4B1D80" },
  CYPHER: { name: "Cypher", role: "Sentinel", portrait: "https://media.valorant-api.com/agents/117ed9e3-49f3-6512-3ccf-0cada7e3823b/fullportrait.png", accent: "#2F5078" },
  DEADLOCK: { name: "Deadlock", role: "Sentinel", portrait: "https://media.valorant-api.com/agents/cc8b64c8-4b25-4ff9-6e7f-37b4da43d235/fullportrait.png", accent: "#425495" },
  FADE: { name: "Fade", role: "Initiator", portrait: "https://media.valorant-api.com/agents/dade69b4-4f5a-8528-247b-219e5a1facd6/fullportrait.png", accent: "#1D2846" },
  GEKKO: { name: "Gekko", role: "Initiator", portrait: "https://media.valorant-api.com/agents/e370fa57-4757-3604-3648-499e1f642d3f/fullportrait.png", accent: "#371C5C" },
  HARBOR: { name: "Harbor", role: "Controller", portrait: "https://media.valorant-api.com/agents/95b78ed7-4637-86d9-7e41-71ba8c293152/fullportrait.png", accent: "#275146" },
  ISO: { name: "Iso", role: "Duelist", portrait: "https://media.valorant-api.com/agents/0e38b510-41a8-5780-5e8f-568b2a4f2d6c/fullportrait.png", accent: "#30336E" },
  JETT: { name: "Jett", role: "Duelist", portrait: "https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/fullportrait.png", accent: "#25607A" },
  KAYO: { name: "KAY/O", role: "Initiator", portrait: "https://media.valorant-api.com/agents/601dbbe7-43ce-be57-2a40-4abd24953621/fullportrait.png", accent: "#1C2A69" },
  KILLJOY: { name: "Killjoy", role: "Sentinel", portrait: "https://media.valorant-api.com/agents/1e58de9c-4950-5125-93e9-a0aee9f98746/fullportrait.png", accent: "#522162" },
  MIKS: { name: "Miks", role: "Controller", portrait: "https://media.valorant-api.com/agents/7c8a4701-4de6-9355-b254-e09bc2a34b72/fullportrait.png", accent: "#462B75" },
  NEON: { name: "Neon", role: "Duelist", portrait: "https://media.valorant-api.com/agents/bb2a4828-46eb-8cd1-e765-15848195d751/fullportrait.png", accent: "#413476" },
  OMEN: { name: "Omen", role: "Controller", portrait: "https://media.valorant-api.com/agents/8e253930-4c05-31dd-1b6c-968525494517/fullportrait.png", accent: "#433178" },
  PHOENIX: { name: "Phoenix", role: "Duelist", portrait: "https://media.valorant-api.com/agents/eb93336a-449b-9c1b-0a54-a891f7921d69/fullportrait.png", accent: "#74321C" },
  RAZE: { name: "Raze", role: "Duelist", portrait: "https://media.valorant-api.com/agents/f94c3b30-42be-e959-889c-5aa313dba261/fullportrait.png", accent: "#742E1E" },
  REYNA: { name: "Reyna", role: "Duelist", portrait: "https://media.valorant-api.com/agents/a3bfb853-43b2-7238-a4f1-ad90e9e46bcc/fullportrait.png", accent: "#662D62" },
  SAGE: { name: "Sage", role: "Sentinel", portrait: "https://media.valorant-api.com/agents/569fdd95-4d10-43ab-ca70-79becc718b46/fullportrait.png", accent: "#1F5148" },
  SKYE: { name: "Skye", role: "Initiator", portrait: "https://media.valorant-api.com/agents/6f2a04ca-43e0-be17-7f36-b3908627744d/fullportrait.png", accent: "#436A51" },
  SOVA: { name: "Sova", role: "Initiator", portrait: "https://media.valorant-api.com/agents/320b2a48-4d9b-a075-30f1-1f93a9b638fa/fullportrait.png", accent: "#355285" },
  TEJO: { name: "Tejo", role: "Initiator", portrait: "https://media.valorant-api.com/agents/b444168c-4e35-8076-db47-ef9bf368f384/fullportrait.png", accent: "#80451B" },
  VETO: { name: "Veto", role: "Sentinel", portrait: "https://media.valorant-api.com/agents/92eeef5d-43b5-1d4a-8d03-b3927a09034b/fullportrait.png", accent: "#1A5D65" },
  VIPER: { name: "Viper", role: "Controller", portrait: "https://media.valorant-api.com/agents/707eab51-4836-f488-046a-cda6bf494859/fullportrait.png", accent: "#1A5F46" },
  VYSE: { name: "Vyse", role: "Sentinel", portrait: "https://media.valorant-api.com/agents/efba5359-4016-a1e5-7626-b1ae76895940/fullportrait.png", accent: "#492280" },
  WAYLAY: { name: "Waylay", role: "Duelist", portrait: "https://media.valorant-api.com/agents/df1cb487-4902-002e-5c17-d28e83e78588/fullportrait.png", accent: "#482E61" },
  YORU: { name: "Yoru", role: "Duelist", portrait: "https://media.valorant-api.com/agents/7f94d92c-4234-0a36-9646-3a87eb8b5c89/fullportrait.png", accent: "#222B67" },
};

function normalize(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** คืนเมทาดาต้า Agent ถ้าชื่อที่ส่งมา (จาก `agent_played` จริง) จับคู่ได้ — ไม่พบคืน null (ไม่เดา/ไม่ fallback เป็น agent อื่น) */
export function getAgentVisual(agentName: string | null | undefined): AgentVisual | null {
  if (!agentName) return null;
  const key = normalize(agentName);
  return AGENT_DATABASE[key] ?? null;
}

export function roleInitial(role: AgentRole): string {
  return role[0];
}
