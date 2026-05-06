import type { Message } from '@/types/shared';

export function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return <div className={`mb-3 flex ${isUser ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${isUser ? 'bg-primary text-white' : 'bg-[#f0f7ff] text-slate-900'}`}>{message.content}</div></div>;
}
