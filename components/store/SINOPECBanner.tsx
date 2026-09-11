export function SINOPECBanner() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 border-[#E8B429] p-6"
      style={{
        background: 'linear-gradient(135deg, rgba(232,180,41,0.15), rgba(13,14,26,0.9))',
        boxShadow: '0 0 40px rgba(232,180,41,0.25)',
      }}
    >
      <div className="relative z-10 flex flex-col items-start gap-2">
        <span className="rounded-full border border-[#E8B429]/60 bg-[#E8B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#E8B429]">
          Official Partner
        </span>
        <h2 className="text-2xl font-black tracking-tight text-[#F9EDD8] sm:text-3xl">
          SINOPEC <span className="text-[#E8B429]">× ZODIAC ARENA</span>
        </h2>
        <p className="max-w-xl text-sm text-[#94A3B8]">
          แลกแต้ม AP เป็นน้ำมันเครื่อง คูปองเติมน้ำมัน และสินค้าพรีเมียมจาก SINOPEC ได้แล้ววันนี้
        </p>
      </div>
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, #E8B429, transparent 70%)' }}
      />
    </div>
  );
}
