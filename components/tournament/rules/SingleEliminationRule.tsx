import React from 'react';
import { RuleTemplate, RuleSection, RuleList, RuleHighlight } from './RuleTemplate';

export function SingleEliminationRule({ bestOfText = 'ตามที่กำหนด' }: { bestOfText?: string }) {
  return (
    <RuleTemplate title="กฎกติกาการแข่งขัน (Knockout)" formatName="Single Elimination (แพ้คัดออก)">
      <RuleSection title="1. โครงสร้างการแข่งขัน (Format Structure)">
        <p>
          การแข่งขันรูปแบบ <RuleHighlight>Single Elimination</RuleHighlight> หรือ แข่งขันแบบแพ้คัดออก เป็นรูปแบบที่เน้นความเฉียบขาด ทีมที่ปราชัยในการแข่งขันจะถูกคัดออกจากการแข่งขันทันที และไม่มีโอกาสในสายล่าง (Lower Bracket)
        </p>
        <RuleList items={[
          <>จำนวนเกมต่อแมตช์ (Best of): <RuleHighlight>{bestOfText}</RuleHighlight></>,
          'ทีมที่ชนะจะผ่านเข้าสู่รอบต่อไป (Advance)',
          'สายการแข่งขัน (Bracket) จะถูกสุ่มวาง (Seeding) โดยระบบอิงตามลำดับ หรือดุลยพินิจของคณะกรรมการ'
        ]} />
      </RuleSection>

      <RuleSection title="2. เงื่อนไขการตัดสินชนะ (Victory Conditions)">
        <RuleList items={[
          'ทีมที่ทำผลงานชนะถึงจำนวนเกมที่กำหนดก่อน (เช่น ชนะ 2 ใน 3 สำหรับ Bo3) ถือเป็นผู้ชนะในแมตช์นั้น',
          'ในกรณีที่มีการเสมอกัน (Tie) ซึ่งเป็นไปได้ยากในรูปแบบมาตรฐาน หากมีข้อพิพาทให้ถือคำตัดสินของคณะกรรมการเป็นที่สิ้นสุด',
          'ไม่อนุญาตให้มีการขอแข่งใหม่ (Rematch) ยกเว้นกรณีปัญหาทางเทคนิคที่ฝั่งผู้จัดงาน (Server Crash) เท่านั้น'
        ]} />
      </RuleSection>

      <RuleSection title="3. กฎการมาสายและการปรับแพ้ (Tardiness & Forfeits)">
        <RuleList items={[
          'ทุกทีมต้องมารายงานตัวเตรียมพร้อมก่อนเวลาเริ่มการแข่งขันอย่างน้อย 15 นาที',
          'หากทีมใดมาสายเกินกว่า 10 นาที จากเวลาแข่งขันทางการ จะถูกปรับแพ้ในเกมแรกทันที (Default Loss)',
          'หากเกิน 15 นาที จะถือว่าสละสิทธิ์และถูกปรับแพ้ทั้งแมตช์ (Disqualified)'
        ]} />
      </RuleSection>

      <RuleSection title="4. น้ำใจนักกีฬาและการกระทำผิด (Sportsmanship & Infractions)">
        <RuleList items={[
          'ห้ามใช้โปรแกรมช่วยเล่น, บัคของเกม, หรือสคริปต์ใดๆ โดยเด็ดขาด ตรวจพบมีโทษแบนถาวรและริบเงินรางวัล',
          'ห้ามพิมพ์ข้อความยั่วยุ หรือแสดงพฤติกรรมที่ไม่เหมาะสม (Toxic behavior) หากมีการร้องเรียนจะพิจารณาตัดสิทธิ์ทันที'
        ]} />
      </RuleSection>
    </RuleTemplate>
  );
}
