import React from 'react';
import { RuleTemplate, RuleSection, RuleList, RuleHighlight } from './RuleTemplate';

export function RoundRobinRule({ bestOfText = 'ตามที่กำหนด' }: { bestOfText?: string }) {
  return (
    <RuleTemplate title="กฎกติกาการแข่งขัน (แบบพบกันหมด)" formatName="Round Robin">
      <RuleSection title="1. โครงสร้างการแข่งขัน (Format Structure)">
        <p>
          ระบบ <RuleHighlight>Round Robin</RuleHighlight> เป็นรูปแบบที่ทุกทีมในสาย หรือในทัวร์นาเมนต์ จะต้องทำการแข่งขันพบกันหมดทุกทีม 
          โดยจะมีการเก็บคะแนนรวมเมื่อจบทุกแมตช์ เพื่อจัดอันดับหาสุดยอดทีม
        </p>
        <RuleList items={[
          <>จำนวนเกมต่อแมตช์ (Best of): <RuleHighlight>{bestOfText}</RuleHighlight></>,
          'ทีมจะได้รับคะแนนตามผลการแข่งขัน ชนะ/เสมอ/แพ้',
          'ตารางเวลาแข่งขันจะถูกกำหนดไว้ล่วงหน้า ทุกทีมต้องแข่งขันตามตารางอย่างเคร่งครัด'
        ]} />
      </RuleSection>

      <RuleSection title="2. ระบบการคิดคะแนน (Point System)">
        <p>ระบบคะแนนมาตรฐาน (อาจปรับเปลี่ยนตามเกมที่แข่งขัน):</p>
        <RuleList items={[
          'ชนะ (Win): ได้รับ 3 คะแนน',
          'เสมอ (Draw): ได้รับ 1 คะแนน (หากเกมนั้นมีระบบเสมอ)',
          'แพ้ (Loss): ได้รับ 0 คะแนน',
          'ชนะบาย / ปรับชนะ (Default Win): จะได้รับคะแนนเต็ม 3 คะแนน พร้อมด้วยจำนวนเกมเป็น 2-0 หรือ 1-0 (ตามรูปแบบ Best Of)'
        ]} />
      </RuleSection>

      <RuleSection title="3. กฎกรณีคะแนนเท่ากัน (Tiebreakers)">
        <p>หากแข่งครบทุกแมตช์แล้วมีทีมคะแนนเท่ากัน จะพิจารณาตัดสินหาผู้ชนะตามลำดับต่อไปนี้:</p>
        <RuleList ordered items={[
          'Head-to-Head: ทีมที่ชนะในการพบกันเองจะได้อันดับสูงกว่า',
          'Game Differential: ผลต่างของเกมที่ชนะลบด้วยเกมที่แพ้ (รวมตลอดทุกแมตช์)',
          'Total Games Won: จำนวนรอบเกมที่ชนะรวมกันได้เยอะที่สุด',
          'Tiebreaker Match: แข่งขันแมตช์ตัดสินพิเศษ (Bo1) หากคะแนนทั้ง 3 ข้อด้านบนยังเท่ากัน'
        ]} />
      </RuleSection>

      <RuleSection title="4. การสละสิทธิ์กลางคัน (Mid-Tournament Withdrawals)">
        <RuleList items={[
          'หากทีมใดสละสิทธิ์หรือถูกดิสควอลิฟาย (Disqualified) กลางทัวร์นาเมนต์ ผลการแข่งขันที่แข่งไปแล้วของทีมนั้นจะถูก "ยกเลิก (Voided)" ทันที',
          'ทีมอื่นๆ ที่อยู่ในตารางทั้งหมด จะถือว่าไม่ได้แข่งกับทีมที่ถอนตัว เพื่อรักษาความยุติธรรม',
          'ทีมที่ถอนตัวกลางคันจะโดนแบนจากการแข่งขัน Zodiac Arena ขั้นต่ำ 1 ซีซั่น'
        ]} />
      </RuleSection>
    </RuleTemplate>
  );
}
