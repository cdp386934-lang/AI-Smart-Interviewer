import React from 'react';
import type { Message } from '../app/types';

export function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow ${isUser ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 border'}`}>
        <div className="text-sm whitespace-pre-wrap leading-6">{message.content}</div>
        <div className={`mt-2 text-[11px] ${isUser ? 'text-blue-100' : 'text-slate-400'}`}>{new Date(message.timestamp).toLocaleTimeString()}</div>
      </div>
    </div>
  );
}
