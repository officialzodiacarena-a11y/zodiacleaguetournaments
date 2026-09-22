import type { Metadata } from 'next';
import { LegalPageShell, LegalSectionHeading, LegalBody } from '@/components/legal/LegalPageShell';

export const metadata: Metadata = {
  title: 'Privacy Policy — Zodiac Arena',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy — Zodiac Arena">
      <p className="text-xs text-[#94A3B8] mb-6">Last updated: September 2026</p>

      <LegalSectionHeading>ภาษาไทย</LegalSectionHeading>
      <LegalBody>
        {`Zodiac Arena ("เรา") ให้ความสำคัญกับความเป็นส่วนตัวของผู้ใช้งาน นโยบายนี้อธิบายวิธีที่เราเก็บรวบรวม ใช้ และปกป้องข้อมูลของคุณเมื่อคุณใช้งานแพลตฟอร์มจัดการแข่งขันอีสปอร์ตของเรา`}
      </LegalBody>

      <LegalSectionHeading>1. ข้อมูลที่เราเก็บ</LegalSectionHeading>
      <LegalBody>
        {`- ชื่อและอีเมล (จาก Social Login: Google, Facebook, TikTok)
- ข้อมูลบัญชีเกมที่คุณให้ไว้เพื่อยืนยันตัวตน เช่น Riot ID / เกมแท็ก (ปัจจุบันตรวจสอบด้วยระบบ Manual Athlete Verification โดยทีมงาน ยังไม่ได้เชื่อมต่อ Riot Games API แบบอัตโนมัติ)
- ประวัติการแข่งขันและผลการแข่งขันภายใน Zodiac Arena
- ข้อมูลการชำระเงิน (ไม่รวม crypto wallet private key)`}
      </LegalBody>

      <LegalSectionHeading>2. วิธีที่เราใช้ข้อมูล</LegalSectionHeading>
      <LegalBody>
        {`- เพื่อสร้างและจัดการบัญชีผู้ใช้
- เพื่อยืนยันตัวตนผู้เล่นและป้องกันการโกงในทัวร์นาเมนต์
- เพื่อจัดการการแข่งขันและ Leaderboard
- เพื่อแจ้งผลการแข่งขันและ Rewards
- เพื่อปรับปรุงบริการ`}
      </LegalBody>

      <LegalSectionHeading>3. การแชร์ข้อมูล</LegalSectionHeading>
      <LegalBody>
        {`เราไม่ขาย เช่า หรือแลกเปลี่ยนข้อมูลส่วนตัวของคุณให้บุคคลที่สาม ข้อมูลจะถูกแชร์เฉพาะกับผู้ให้บริการที่จำเป็นต่อการให้บริการ (เช่น Vercel และ Supabase สำหรับ hosting และฐานข้อมูล) หรือตามที่กฎหมายกำหนด สถิติการแข่งขันและชื่อในเกมของคุณอาจแสดงต่อผู้ใช้อื่นบนแพลตฟอร์มในลักษณะสาธารณะ`}
      </LegalBody>

      <LegalSectionHeading>4. Riot Games และการเชื่อมต่อ API ในอนาคต</LegalSectionHeading>
      <LegalBody>
        {`ปัจจุบัน Zodiac Arena ยังไม่ได้เชื่อมต่อ Riot Games API หรือ Riot Sign-On (RSO) แบบอัตโนมัติ การยืนยันบัญชีเกมทำผ่านระบบตรวจสอบโดยทีมงาน (Manual Verification) เท่านั้น หากในอนาคตเราเปิดใช้งานการเชื่อมต่อ Riot Games API เราจะปรับปรุงนโยบายนี้ให้ระบุชัดเจนว่าเก็บข้อมูลใดผ่าน API ดังกล่าว และจะปฏิบัติตาม Riot Games API Terms of Service รวมถึงข้อกำหนดด้าน GDPR ของ Riot เช่น เมื่อ Riot ส่งคำขอลบข้อมูลผู้ใช้ (ผ่านรายชื่อ account ID) มายังเรา เราจะต้องลบข้อมูลที่เกี่ยวข้องภายในระบบของเราด้วยเช่นกัน`}
      </LegalBody>

      <LegalSectionHeading>5. ความปลอดภัย</LegalSectionHeading>
      <LegalBody>{`ข้อมูลทั้งหมดถูกเข้ารหัสและจัดเก็บบน Supabase (SOC 2 compliant)`}</LegalBody>

      <LegalSectionHeading>6. สิทธิของคุณและการลบข้อมูล</LegalSectionHeading>
      <LegalBody>
        {`คุณมีสิทธิ์เข้าถึง แก้ไข หรือขอให้ลบข้อมูลส่วนตัวของคุณได้ทุกเมื่อ หากต้องการลบบัญชีและข้อมูลที่เกี่ยวข้องบน Zodiac Arena กรุณาติดต่อทีมงานผ่านอีเมลด้านล่าง`}
      </LegalBody>

      <LegalSectionHeading>7. ติดต่อเรา</LegalSectionHeading>
      <LegalBody>
        {`หากมีคำถามเกี่ยวกับนโยบายนี้ ติดต่อได้ที่: suriyabalem@gmail.com`}
      </LegalBody>

      <LegalSectionHeading>English</LegalSectionHeading>
      <LegalBody>
        {`Zodiac Arena collects the minimal data necessary to operate our esports tournament platform: your name and email (via Social Login), the in-game account details you submit for identity verification, your tournament history and results, and payment data (excluding any crypto wallet private keys).

Game account verification is currently performed manually by our staff (Manual Athlete Verification) — we do not yet have an automated Riot Games API or Riot Sign-On (RSO) integration. If we enable such an integration in the future, we will update this policy accordingly and comply with Riot Games' API Terms of Service, including honoring Riot's GDPR-driven account deletion requests by deleting the corresponding data on our end.

We do not sell, rent, or trade your personal data. Data is shared only with essential service providers (Vercel, Supabase) or as required by law. Your public tournament stats and in-game name may be visible to other users. All data is encrypted and stored securely on Supabase (SOC 2 compliant). You may request access, correction, or deletion of your data at any time by contacting suriyabalem@gmail.com.`}
      </LegalBody>
    </LegalPageShell>
  );
}
