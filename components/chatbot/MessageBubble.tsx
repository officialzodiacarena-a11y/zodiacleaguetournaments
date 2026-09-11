import ReactMarkdown from 'react-markdown';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function formatBotMessage(content: string) {
  if (!content) return '';

  return content
    // ดักจับรูปแบบตัวเลขข้อ 1. 2. 3. หรือ **1. หรือ Emoji + ตัวเลข
    .replace(/([^\n])(\s*(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*)*\*{0,2}\d+[\.\)]\s*\*{0,2})/gu, '$1\n\n$2')
    // เคาะบรรทัดใหม่สำหรับประโยคปิดท้ายที่มีอิโมจิ
    .replace(/([^\n])(\s*(?:ขอให้|ลุยเลย|สู้ๆ|สอบถามเพิ่มเติม))/g, '$1\n\n$2')
    // บังคับเปลี่ยนการเคาะบรรทัดเดี่ยวให้เป็น Markdown Paragraph
    .replace(/([^\n])\n([^\n])/g, '$1\n\n$2')
    .trim();
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} my-2`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed backdrop-blur-md transition-all ${
          isUser
            ? 'rounded-br-sm bg-[#E8B429] font-medium text-[#0D0E1A] shadow-md'
            : 'rounded-bl-sm border border-white/10 bg-[#1D203F]/95 text-[#F9EDD8]'
        }`}
        style={!isUser ? { boxShadow: '0 0 20px rgba(232,180,41,0.12)' } : undefined}
      >
        {!isUser && (
          <div className="mb-2 flex items-center gap-1.5 border-b border-white/10 pb-1.5">
            <span className="text-xs">🔮</span>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#E8B429]">
              ZODIAC ORACLE
            </span>
          </div>
        )}

        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        ) : (
          <div className="space-y-3 break-words text-sm leading-relaxed text-[#F9EDD8] [&>p]:mb-2.5 [&>p]:leading-relaxed [&>strong]:font-bold [&>strong]:text-[#E8B429]">
            <ReactMarkdown>{formatBotMessage(message.content)}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start my-2">
      <div
        className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-white/10 bg-[#1D203F]/90 px-4 py-3"
        style={{ boxShadow: '0 0 20px rgba(232,180,41,0.08)' }}
      >
        <span className="text-xs">🔮</span>
        <span className="text-xs text-[#94A3B8]">กำลังค้นหาคำตอบ...</span>
        <div className="flex items-center gap-1 pl-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E8B429]"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
