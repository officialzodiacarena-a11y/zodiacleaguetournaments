const COINGECKO_ID_MAP: Record<string, string> = {
  USDT: 'tether',
  BUSD: 'binance-usd',
  BNB: 'binancecoin',
};

export const SUPPORTED_TOKENS = Object.keys(COINGECKO_ID_MAP);

// ล็อกอัตราแลกเปลี่ยน ณ เวลาสร้าง payment intent — ใช้ CoinGecko public API (ไม่ต้องใช้ key)
export async function getTokenToThbRate(tokenSymbol: string): Promise<number> {
  const coingeckoId = COINGECKO_ID_MAP[tokenSymbol.toUpperCase()];
  if (!coingeckoId) {
    throw new Error(`ไม่รองรับโทเคน ${tokenSymbol}`);
  }

  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=thb`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    throw new Error('ไม่สามารถดึงอัตราแลกเปลี่ยนได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
  }

  const json = (await res.json()) as Record<string, { thb?: number }>;
  const rate = json?.[coingeckoId]?.thb;

  if (typeof rate !== 'number' || rate <= 0) {
    throw new Error('อัตราแลกเปลี่ยนที่ได้รับไม่ถูกต้อง');
  }

  return rate;
}
