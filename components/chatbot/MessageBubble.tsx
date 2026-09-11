export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed backdrop-blur-md ${
          isUser
            ? 'rounded-br-sm bg-[#E8B429]/90 text-[#0D0E1A]'
            : 'rounded-bl-sm border border-white/10 bg-white/[0.06] text-[#F9EDD8]'
        }`}
        style={!isUser ? { boxShadow: '0 0 20px rgba(232,180,41,0.08)' } : undefined}
      >
        {!isUser && <span className="mb-0.5 block text-[10px] font-black uppercase tracking-widest text-[#E8B429]">ZODIAC ORACLE</span>}
        <span className="whitespace-pre-wrap">{message.content}</span>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.06] px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E8B429]"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
