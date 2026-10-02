import React from 'react';
import { RuleTemplate, RuleSection, RuleList, RuleHighlight } from './RuleTemplate';

export function GroupStageRule({ bestOfText = 'ตามที่กำหนด' }: { bestOfText?: string }) {
  return (
    <RuleTemplate title="กฎกติกาการแข่งขัน (รอบแบ่งกลุ่ม)" formatName="Group Stage">
      <RuleSection title="1. โครงสร้างการแข่งขัน (Format Structure)">
        <p>
          ระบบ <RuleHighlight>Group Stage</RuleHighlight> จะแบ่งทีมทั้งหมดออกเป็นกลุ่มย่อย (เช่น กลุ่ม A, B, C, D) 
          ทีมในแต่ละกลุ่มจะแข่งขันกันเองภายในกลุ่ม (แบบพบกันหมด Single หรือ Double Round-Robin) เพื่อหาตัวแทนกลุ่มเข้าสู่รอบ Playoffs ถัดไป
        </p>
        <RuleList items={[
          <>จำนวนเกมต่อแมตช์ (Best of) ในรอบแบ่งกลุ่ม: <RuleHighlight>{bestOfText}</RuleHighlight></>,
          'จำนวนทีมที่ผ่านเข้ารอบของแต่ละกลุ่ม จะถูกประกาศให้ทราบก่อนเริ่มการแข่งขัน (เช่น เอา 2 อันดับแรกของกลุ่ม)',
          'การจัดสายรอบ Playoffs (Seeding) จะอิงตามอันดับของรอบแบ่งกลุ่ม เช่น ที่ 1 กลุ่ม A พบ ที่ 2 กลุ่ม B'
        ]} />
      </RuleSection>

      <RuleSection title="2. ระบบการคิดคะแนนและผลเสมอ (Points & Ties)">
        <p>การคิดคะแนนภายในกลุ่มจะใช้ระบบเดียวกับ Round Robin ทั่วไป คือ ชนะ 3 แต้ม, เสมอ 1 แต้ม (ถ้ามี), แพ้ 0 แต้ม 
        ในกรณีที่มีทีมคะแนนรวมเท่ากันในกลุ่ม จะพิจารณาดังนี้:</p>
        <RuleList ordered items={[
          'พิจารณาจากสถิติ Head-to-Head ของทีมที่คะแนนเท่ากัน',
          'ผลต่างคะแนน ได้-เสีย (Game/Round Differential) ภายในกลุ่ม',
          'ถ้าแย่งอันดับเข้ารอบกันแบบชี้ชะตา (เช่น แย่งที่ 2) คณะกรรมการจะจัดให้มีแมตช์ Tiebreaker ทันทีหลังจบแมตช์สุดท้าย'
        ]} />
      </RuleSection>

      <RuleSection title="3. กฎการมาสายและการเลื่อนเวลา (Tardiness)">
        <RuleList items={[
          'รอบ Group Stage มักจะมีตารางแข่งขันที่รัดตัว ห้ามมาสายเกิน 10 นาที หากเกินเวลาจะปรับแพ้ในแมตช์นั้นทันที',
          'ไม่สามารถขอเลื่อนเวลาแข่งข้ามวันได้ ต้องแข่งขันภายในช่วงเวลาที่ตารางระบุไว้',
          'ผู้เข้าแข่งขันต้อง Standby พร้อมแข่งแมตช์ถัดไปหากทีมในกลุ่มพร้อม'
        ]} />
      </RuleSection>

      <RuleSection title="4. การประพฤติตน (Conduct)">
        <RuleList items={[
          'ผู้เล่นทุกคนต้องปฏิบัติตามกฎน้ำใจนักกีฬาอย่างเคร่งครัด',
          'ห้ามกระทำการ สมยอม (Match-fixing) เพื่อปั้นคะแนนให้อีกทีมเข้ารอบ หากตรวจสอบพบ คณะกรรมการจะตัดสิทธิ์ออกจากการแข่งขันและแบนถาวรทั้งสองทีม'
        ]} />
      </RuleSection>
    </RuleTemplate>
  );
}
