// components/entry-fee/PaymentTransferArtwork.tsx
// Artwork "ช่องทางการโอนเงิน" ของพี่ไอซ์ — ห้ามแก้รูป แก้ได้เฉพาะกรอบรอบนอก
import Image from 'next/image';

const ARTWORK_SRC = '/images/entry-fee/payment-transfer.jpg';

const buttonClass =
  'inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-[#334B5C] bg-[#12142A] px-4 text-xs font-bold text-[#F9EDD8] hover:border-[#E8B429]';

const cornerBase = 'pointer-events-none absolute h-5 w-5 border-[#E8B429]';

export function PaymentTransferArtwork() {
  return (
    <section
      className="relative mx-auto mb-6 w-full max-w-[480px] rounded-2xl border border-[#334B5C] bg-[#1A1C2E] p-3 shadow-[0_0_24px_rgba(232,180,41,0.12)]"
      aria-label="ช่องทางการโอนเงิน"
    >
      <span className={`${cornerBase} left-1.5 top-1.5 rounded-tl-lg border-l-2 border-t-2`} aria-hidden="true" />
      <span className={`${cornerBase} right-1.5 top-1.5 rounded-tr-lg border-r-2 border-t-2`} aria-hidden="true" />
      <span className={`${cornerBase} bottom-1.5 left-1.5 rounded-bl-lg border-b-2 border-l-2`} aria-hidden="true" />
      <span className={`${cornerBase} bottom-1.5 right-1.5 rounded-br-lg border-b-2 border-r-2`} aria-hidden="true" />

      <div className="px-2 pb-3 pt-2 text-center">
        <div className="text-sm font-extrabold text-[#F9EDD8]">ช่องทางการโอนเงิน</div>
        <div className="mt-1 text-xs text-[#94A3B8]">ตรวจชื่อบัญชีให้ตรงก่อนโอนทุกครั้ง</div>
      </div>

      <div className="overflow-hidden rounded-lg bg-[#12142A]">
        <Image
          src={ARTWORK_SRC}
          width={1254}
          height={1254}
          sizes="(max-width: 640px) 100vw, 480px"
          alt="ช่องทางการโอนเงิน ธนาคารกสิกรไทย บจก. โซดิแอคเมเนจเม้น"
          className="block aspect-square h-auto w-full object-contain"
        />
      </div>

      <div className="mt-3 flex gap-3">
        <a href={ARTWORK_SRC} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          ดูรูปเต็ม
        </a>
        <a href={ARTWORK_SRC} download="payment-transfer.jpg" className={buttonClass}>
          บันทึกรูป
        </a>
      </div>
    </section>
  );
}
