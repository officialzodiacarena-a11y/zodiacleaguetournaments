import type { Metadata } from 'next';
import { LegalPageShell, LegalSectionHeading, LegalBody } from '@/components/legal/LegalPageShell';

export const metadata: Metadata = {
  title: 'Terms of Service — Zodiac Arena',
};

export default function TermsOfServicePage() {
  return (
    <LegalPageShell title="Terms of Service — Zodiac Arena">
      <p className="text-xs text-[#94A3B8] mb-6">Last updated: September 2026</p>

      <LegalSectionHeading>ภาษาไทย</LegalSectionHeading>
      <LegalBody>
        {`การเข้าถึงหรือใช้งาน Zodiac Arena ถือว่าคุณยอมรับข้อกำหนดการให้บริการฉบับนี้ หากคุณไม่ยอมรับ กรุณางดใช้บริการของเรา`}
      </LegalBody>

      <LegalSectionHeading>1. คำชี้แจงทางกฎหมายเกี่ยวกับ Riot Games</LegalSectionHeading>
      <LegalBody>
        {`Zodiac Arena ไม่ได้รับการรับรองจาก Riot Games และไม่ได้สะท้อนมุมมองหรือความคิดเห็นของ Riot Games หรือบุคคลใดที่มีส่วนเกี่ยวข้องอย่างเป็นทางการในการผลิตหรือบริหารจัดการทรัพย์สินของ Riot Games. Riot Games และทรัพย์สินที่เกี่ยวข้องทั้งหมดเป็นเครื่องหมายการค้าหรือเครื่องหมายการค้าจดทะเบียนของ Riot Games, Inc.`}
      </LegalBody>

      <LegalSectionHeading>2. การยืนยันบัญชีเกม</LegalSectionHeading>
      <LegalBody>
        {`คุณต้องให้ข้อมูลบัญชีเกม (เช่น Riot ID) ที่ถูกต้องและเป็นความจริงเมื่อสมัครเข้าร่วมทัวร์นาเมนต์ ปัจจุบันการยืนยันตัวตนดำเนินการผ่านระบบตรวจสอบโดยทีมงาน (Manual Verification) เท่านั้น เรายังไม่ได้เชื่อมต่อ Riot Games API หรือ Riot Sign-On (RSO) แบบอัตโนมัติ หากในอนาคตมีการเปิดใช้งานการเชื่อมต่อดังกล่าว ข้อกำหนดฉบับนี้จะได้รับการปรับปรุงให้สอดคล้องกัน`}
      </LegalBody>

      <LegalSectionHeading>3. ความประพฤติของผู้ใช้</LegalSectionHeading>
      <LegalBody>
        {`เมื่อใช้งาน Zodiac Arena คุณตกลงที่จะ:
- ให้ข้อมูลที่ถูกต้องเมื่อลงทะเบียนบัญชีเกม
- รักษามารยาทที่ดีและปฏิบัติตามกติกาการแข่งขัน
- ไม่โกง แฮ็ก หรือใช้ประโยชน์ในทางที่ผิดต่อระบบของแพลตฟอร์มหรือ Riot Games API
- เคารพผู้เล่นคนอื่นและงดเว้นพฤติกรรมที่เป็นพิษ (toxic)`}
      </LegalBody>

      <LegalSectionHeading>4. การระงับหรือยุติบัญชี</LegalSectionHeading>
      <LegalBody>
        {`เราขอสงวนสิทธิ์ในการระงับหรือยุติการเข้าถึง Zodiac Arena ของคุณเมื่อใดก็ได้โดยไม่ต้องแจ้งล่วงหน้า หากคุณละเมิดข้อกำหนดฉบับนี้ กติกาการแข่งขัน หรือ Terms of Service ของ Riot Games`}
      </LegalBody>

      <LegalSectionHeading>5. ข้อจำกัดความรับผิด</LegalSectionHeading>
      <LegalBody>
        {`Zodiac Arena ให้บริการ "ตามสภาพที่เป็นอยู่" เราไม่รับผิดชอบต่อความเสียหายที่เกิดจากการหยุดทำงานหรือความไม่ถูกต้องของข้อมูลที่มาจาก Riot Games API หรือบริการของบุคคลที่สามอื่น ๆ`}
      </LegalBody>

      <LegalSectionHeading>6. การเปลี่ยนแปลงข้อกำหนด</LegalSectionHeading>
      <LegalBody>
        {`เราอาจปรับปรุงข้อกำหนดการให้บริการฉบับนี้เป็นครั้งคราว การใช้งานแพลตฟอร์มต่อไปหลังการแก้ไขถือว่าคุณยอมรับข้อกำหนดฉบับใหม่`}
      </LegalBody>

      <LegalSectionHeading>7. ติดต่อเรา</LegalSectionHeading>
      <LegalBody>
        {`หากมีคำถามเกี่ยวกับข้อกำหนดฉบับนี้ ติดต่อได้ที่: suriyabalem@gmail.com`}
      </LegalBody>

      <LegalSectionHeading>English</LegalSectionHeading>
      <LegalBody>
        {`By accessing or using Zodiac Arena, you agree to be bound by these Terms of Service.

Zodiac Arena isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

You must provide accurate game account information (e.g. your Riot ID) when registering for tournaments. Identity verification is currently performed manually by our staff — we do not yet have an automated Riot Games API or Riot Sign-On (RSO) integration; this section will be updated if that changes.

You agree to maintain good sportsmanship, follow tournament rules, avoid exploiting or hacking the platform or the Riot Games API, and treat other players with respect. We reserve the right to suspend or terminate your access at any time, without prior notice, for violations of these Terms, tournament rules, or Riot Games' own Terms of Service. The platform is provided "as is"; we are not responsible for downtime or inaccuracies originating from the Riot Games API or other third-party services. We may update these Terms from time to time — continued use after changes constitutes acceptance. For questions, contact suriyabalem@gmail.com.`}
      </LegalBody>
    </LegalPageShell>
  );
}
