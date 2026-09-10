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
        {`Zodiac Arena ("เรา") ให้ความสำคัญกับความเป็นส่วนตัวของผู้ใช้งาน นโยบายนี้อธิบายวิธีที่เราเก็บรวบรวม ใช้ และปกป้องข้อมูลของคุณ`}
      </LegalBody>

      <LegalSectionHeading>1. ข้อมูลที่เราเก็บ</LegalSectionHeading>
      <LegalBody>
        {`- ชื่อและอีเมล (จาก Social Login: Google, Facebook, TikTok)
- ข้อมูล Game Account ที่คุณเชื่อมต่อ
- ประวัติการแข่งขันและผลการแข่งขัน
- ข้อมูลการชำระเงิน (ไม่รวม crypto wallet private key)`}
      </LegalBody>

      <LegalSectionHeading>2. วิธีที่เราใช้ข้อมูล</LegalSectionHeading>
      <LegalBody>
        {`- เพื่อสร้างและจัดการบัญชีผู้ใช้
- เพื่อจัดการการแข่งขันและ Leaderboard
- เพื่อแจ้งผลการแข่งขันและ Rewards
- เพื่อปรับปรุงบริการ`}
      </LegalBody>

      <LegalSectionHeading>3. การแชร์ข้อมูล</LegalSectionHeading>
      <LegalBody>
        {`เราไม่ขายข้อมูลส่วนตัวของคุณ ข้อมูลจะถูกแชร์เฉพาะเมื่อจำเป็นต่อการให้บริการหรือตามที่กฎหมายกำหนด`}
      </LegalBody>

      <LegalSectionHeading>4. ความปลอดภัย</LegalSectionHeading>
      <LegalBody>{`ข้อมูลทั้งหมดถูกเข้ารหัสและจัดเก็บบน Supabase (SOC 2 compliant)`}</LegalBody>

      <LegalSectionHeading>5. ติดต่อเรา</LegalSectionHeading>
      <LegalBody>
        {`หากมีคำถามเกี่ยวกับนโยบายนี้ ติดต่อได้ที่: suriyabalem@gmail.com`}
      </LegalBody>

      <LegalSectionHeading>English</LegalSectionHeading>
      <LegalBody>
        {`Zodiac Arena collects minimal user data necessary to operate our esports tournament platform. We do not sell personal data. All data is encrypted and stored securely. For questions, contact suriyabalem@gmail.com`}
      </LegalBody>
    </LegalPageShell>
  );
}
