import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '@/types/shared';

export function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}><div className={`max-w-[75%] rounded-large px-4 py-3 ${isUser ? 'bg-primary text-white' : 'bg-[#f0f7ff] text-slate-900'}`}>{message.role === 'system' ? <div className="text-center text-xs text-slate-500">{message.content}</div> : <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>}</div></div>;
}
