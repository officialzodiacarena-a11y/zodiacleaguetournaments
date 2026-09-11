import { ChatWindow } from '@/components/chatbot/ChatWindow';

export default function ChatbotPage() {
  return (
    <main className="min-h-screen bg-[#0D0E1A] p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 text-center">
          <h1 className="text-xl font-black text-[#F9EDD8]">
            AVE <span className="text-[#E8B429]">AI Assistant</span>
          </h1>
          <p className="text-xs text-[#94A3B8]">ถามเรื่อง AP, สินค้า SINOPEC, ทัวร์นาเมนต์ และ Watch-to-Earn</p>
        </div>
        <ChatWindow />
      </div>
    </main>
  );
}
