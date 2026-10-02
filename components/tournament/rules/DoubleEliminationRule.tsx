import React from 'react';
import { RuleTemplate, RuleSection, RuleList, RuleHighlight } from './RuleTemplate';

export function DoubleEliminationRule({ bestOfText = 'ตามที่กำหนด' }: { bestOfText?: string }) {
  return (
    <RuleTemplate title="กฎกติกาการแข่งขัน (สายบน-สายล่าง)" formatName="Double Elimination (แพ้ 2 ครั้งคัดออก)">
      <RuleSection title="1. โครงสร้างการแข่งขัน (Format Structure)">
        <p>
          รูปแบบ <RuleHighlight>Double Elimination</RuleHighlight> จะแบ่งสายการแข่งขันเป็น 2 สายคือ สายบน (Upper Bracket) และ สายล่าง (Lower Bracket) ทีมที่แพ้ครั้งแรกจะยังมีโอกาสแก้ตัวในสายล่าง 
          แต่ถ้าหากแพ้อีกครั้งในสายล่าง ถือว่าตกรอบทันที (แพ้ 2 ครั้งคัดออก)
        </p>
        <RuleList items={[
          <>จำนวนเกมต่อแมตช์ (Best of): <RuleHighlight>{bestOfText}</RuleHighlight></>,
          'ทุกทีมจะเริ่มต้นที่ Upper Bracket',
          'ผู้แพ้ใน Upper Bracket จะตกลงมาเล่นใน Lower Bracket ในรอบที่สอดคล้องกัน',
          'แชมป์ของสายบน จะมาเจอกับแชมป์ของสายล่าง ในรอบชิงชนะเลิศ (Grand Final)'
        ]} />
      </RuleSection>

      <RuleSection title="2. เงื่อนไขรอบชิงชนะเลิศ (Grand Final Conditions)">
        <RuleList items={[
          'ในรอบ Grand Final ทีมที่มาจากสายบน (Upper Bracket) อาจจะได้รับสิทธิ์พิเศษ (Advantage) เช่น การได้ 1 แต้มฟรีในซีรีส์ (1-0 default win) หรือสิทธิ์เลือกฝั่ง/แบนแผนที่ก่อน ขึ้นอยู่กับข้อกำหนดของทัวร์นาเมนต์นั้นๆ',
          'ในกรณีที่ใช้กฎ "Bracket Reset" หากทีมจากสายล่างชนะในแมตช์แรก จะต้องทำการแข่งขันเพิ่มอีก 1 แมตช์เพื่อหาผู้ชนะเลิศที่แท้จริง'
        ]} />
      </RuleSection>

      <RuleSection title="3. การเลื่อนเวลาการแข่งขัน (Rescheduling)">
        <RuleList items={[
          'เนื่องจากสายล่างมักจะมีจำนวนแมตช์ที่ต้องแข่งมากกว่า ทีมในสายล่างต้องพร้อมลงแข่งขันแบบต่อเนื่องตามที่ตารางเวลาจัดไว้',
          'ไม่อนุญาตให้เลื่อนเวลาการแข่งขันหากไม่ได้แจ้งล่วงหน้า 24 ชั่วโมง และต้องได้รับความยินยอมจากอีกฝ่ายรวมถึงกรรมการ'
        ]} />
      </RuleSection>

      <RuleSection title="4. การตัดสินและบทลงโทษ (Penalties)">
        <RuleList items={[
          'ทีมที่สละสิทธิ์ในสายล่าง จะถูกจัดอันดับในทัวร์นาเมนต์ตามผลงานที่จบลงทันที',
          'กฎทั่วไปเรื่องน้ำใจนักกีฬาและการใช้โปรแกรมช่วยเล่นยังคงครอบคลุมเช่นเดียวกับรูปแบบอื่นๆ ทุกประการ'
        ]} />
      </RuleSection>
    </RuleTemplate>
  );
}
