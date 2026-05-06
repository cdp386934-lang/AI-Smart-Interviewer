import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function UploadPage() {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  return <div className="mx-auto max-w-5xl p-6"><div className={`rounded-large border-2 border-dashed bg-surface p-10 ${dragging ? 'border-primary' : 'border-slate-200'}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); }}><h2 className="text-2xl font-bold">上传简历</h2><p className="mt-2 text-slate-600">支持 PDF / Word，最大 10MB</p><div className="mt-6 flex gap-3"><button className="rounded-full bg-primary px-5 py-3 text-white" onClick={() => navigate('/optimize')}>开始优化</button><button className="rounded-full border px-5 py-3" onClick={() => navigate('/interview')}>跳过优化，直接面试</button></div></div></div>;
}
