import type { Metadata } from 'next';
import { LegalPageShell, LegalSectionHeading, LegalBody } from '@/components/legal/LegalPageShell';

export const metadata: Metadata = {
  title: 'Data Deletion — Zodiac Arena',
};

export default function DataDeletionPage() {
  return (
    <LegalPageShell title="Data Deletion — Zodiac Arena">
      <LegalSectionHeading>ภาษาไทย</LegalSectionHeading>
      <LegalBody>{`วิธีขอลบข้อมูลของคุณจาก Zodiac Arena`}</LegalBody>
      <LegalBody>{`คุณสามารถขอลบข้อมูลส่วนตัวทั้งหมดได้ 2 วิธี:`}</LegalBody>

      <LegalSectionHeading>วิธีที่ 1 — ผ่านแอปพลิเคชัน (แนะนำ)</LegalSectionHeading>
      <LegalBody>
        {`1. เข้าสู่ระบบที่ zodiacleaguetournaments.com
2. ไปที่ Settings → Account
3. เลือก "ลบบัญชี"
4. ยืนยันการลบ — ข้อมูลทั้งหมดจะถูกลบภายใน 30 วัน`}
      </LegalBody>

      <LegalSectionHeading>วิธีที่ 2 — ส่งคำขอทางอีเมล</LegalSectionHeading>
      <LegalBody>
        {`ส่งอีเมลมาที่ suriyabalem@gmail.com พร้อมหัวข้อ "Data Deletion Request"
ระบุอีเมลที่ใช้ลงทะเบียน — เราจะดำเนินการภายใน 30 วัน`}
      </LegalBody>

      <LegalSectionHeading>ข้อมูลที่จะถูกลบ</LegalSectionHeading>
      <LegalBody>
        {`- ข้อมูลโปรไฟล์และ Game Account
- ประวัติการแข่งขัน
- ข้อมูล AP และ ZP (ไม่สามารถกู้คืนได้)
- ข้อมูลการชำระเงิน`}
      </LegalBody>

      <LegalBody>{`หมายเหตุ: ข้อมูลบางส่วนอาจถูกเก็บไว้ตามที่กฎหมายกำหนด`}</LegalBody>

      <div className="mt-4 rounded-lg border border-[#4CAF50] bg-[#4CAF50]/10 px-4 py-3 text-sm text-[#4CAF50]">
        คำขอของคุณจะได้รับการดำเนินการภายใน 30 วัน
      </div>

      <LegalSectionHeading>English</LegalSectionHeading>
      <LegalBody>
        {`To delete your Zodiac Arena data, email suriyabalem@gmail.com with subject "Data Deletion Request" including your registered email. We will process within 30 days.`}
      </LegalBody>
    </LegalPageShell>
  );
}
