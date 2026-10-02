import React from 'react';
import { RuleTemplate, RuleSection, RuleList, RuleHighlight } from './RuleTemplate';

export function ZodiacArenaSystemRule({ bestOfText = 'ตามที่กำหนด' }: { bestOfText?: string }) {
  return (
    <RuleTemplate title="กฎกติกาการแข่งขัน (ระบบ ZODIAC)" formatName="Zodiac Arena System (VLP Points)">
      <RuleSection title="1. โครงสร้างระบบ ZODIAC (The Zodiac System Structure)">
        <p>
          <RuleHighlight>Zodiac Arena System</RuleHighlight> เป็นระบบการแข่งขันเอกลักษณ์เฉพาะของแพลตฟอร์ม Zodiac League 
          ที่ผสมผสานระหว่างการแข่งขันแบบ Ladder และโครงสร้างฤดูกาล (Seasonal) ทีมและผู้เล่นจะต้องสะสมแต้มพิเศษเรียกว่า <RuleHighlight>VLP (Valor League Points)</RuleHighlight> 
          เพื่อแย่งชิงสิทธิ์ในรอบ Championship
        </p>
        <RuleList items={[
          <>รูปแบบการแข่งขันในแมตช์ปกติ (Best of): <RuleHighlight>{bestOfText}</RuleHighlight></>,
          'ทีมสามารถท้าประลอง (Challenge) หรือถูกจับคู่โดย AI Oracle ตามความเหมาะสมของ VLP และระดับฝีมือ',
          'ทุกแมตช์ที่แข่งขัน จะมีแต้ม VLP เป็นเดิมพัน (Stake) ทีมที่ชนะจะได้รับ VLP จากฝ่ายตรงข้าม (หรือจากระบบ) ตามสัดส่วนที่ระบบคำนวณ'
        ]} />
      </RuleSection>

      <RuleSection title="2. การได้มาและสูญเสีย VLP (Earning & Losing VLP)">
        <RuleList items={[
          'Base Points: ทีมชนะจะได้รับแต้มพื้นฐานตามระดับขั้น (Tier) ของทัวร์นาเมนต์',
          'Multiplier Bonus: ชนะต่อเนื่อง (Win Streak) จะได้รับโบนัส VLP ทวีคูณ',
          'Bounty System: หากเอาชนะทีมที่มีอันดับสูงกว่า หรือทีมที่มี Win Streak ยาวนาน จะได้รับแต้มพิเศษ (Bounty Hunter Points)',
          'ทีมที่ปฏิเสธคำท้า (Dodging) บ่อยครั้ง หรือละทิ้งการแข่งกลางคัน จะถูกหัก VLP ทันที'
        ]} />
      </RuleSection>

      <RuleSection title="3. กฎเกณฑ์พิเศษใน Zodiac Arena (Arena Special Rules)">
        <p>เพื่อเพิ่มความท้าทาย ระบบอาจสุ่มแทรกกฎกติกาพิเศษประจำแมตช์ (Modifiers) เข้ามา เช่น:</p>
        <RuleList items={[
          'Blind Pick/Draft: กฎการเลือกตัวแชมเปี้ยนหรือเอเจนท์ที่จำกัดเวลา',
          'Double Stakes: แมตช์ที่เปิดให้ลงเดิมพัน VLP เพิ่มขึ้นเป็นสองเท่าสำหรับผู้ที่มีความมั่นใจสูง',
          'คณะกรรมการหรือระบบ AI Oracle มีสิทธิ์ชี้ขาดให้เกิดแมตช์สำคัญพิเศษ (Showdown) เมื่อสถิติถึงเกณฑ์'
        ]} />
      </RuleSection>

      <RuleSection title="4. การผ่านเข้าสู่บทสรุปแห่งฤดูกาล (Zodiac Championship)">
        <RuleList items={[
          'เมื่อหมดรอบการสะสม VLP ประจำฤดูกาล (Season Cut-off) ทีมที่มีแต้ม VLP สูงสุดตามโควตา จะได้ผ่านเข้าสู่รอบ Zodiac Championship',
          'ในรอบ Championship จะเปลี่ยนรูปแบบการแข่งเป็นโครงสร้างสายแบบผสม (เช่น Double Elimination + Gauntlet)',
          'การใช้โปรแกรมปั๊มแต้ม (Win-trading/Smurfing) จะทำให้สูญเสีย VLP ทั้งหมด และแบนไอดีถาวรจากระบบ Zodiac Arena Protocol ทันที'
        ]} />
      </RuleSection>
    </RuleTemplate>
  );
}
