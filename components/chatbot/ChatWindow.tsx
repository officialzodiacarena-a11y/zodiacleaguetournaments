'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageBubble, TypingIndicator, type ChatMessage } from './MessageBubble';
import { QuickReplies } from './QuickReplies';

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'สวัสดีค่ะ! หนู ZODIAC ORACLE ผู้ช่วย AI ประจำ Zodiac Arena เอง มีอะไรให้ช่วยถามได้เลยนะคะ 🚀',
};

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const history = messages.filter((m) => m !== WELCOME_MESSAGE);
    const nextMessages = [...messages, { role: 'user', content: trimmed } as ChatMessage];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const res = await fetch('/api/oracle/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversationHistory: history }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'เกิดข้อผิดพลาด');
      setMessages((prev) => [...prev, { role: 'assistant', content: json.reply }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12142A]/80 backdrop-blur-xl">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {sending && <TypingIndicator />}
      </div>

      <div className="border-t border-white/10 p-4">
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
        <div className="mb-3">
          <QuickReplies onSelect={sendMessage} disabled={sending} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            placeholder="ถาม ZODIAC ORACLE อะไรก็ได้เกี่ยวกับ Zodiac Arena..."
            className="flex-1 rounded-lg bg-[#0D0E1A] px-4 py-2.5 text-sm text-[#F9EDD8] outline-none placeholder:text-[#94A3B8] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-lg bg-[#E8B429] px-5 py-2.5 text-sm font-black text-[#0D0E1A] disabled:opacity-40"
          >
            ส่ง
          </button>
        </form>
      </div>
    </div>
  );
}
