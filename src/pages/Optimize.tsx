import { useNavigate } from 'react-router-dom';

export function OptimizePage() {
  const navigate = useNavigate();
  return <div className="mx-auto max-w-6xl p-6"><div className="grid gap-6 lg:grid-cols-3"><div className="rounded-large bg-surface p-4 shadow-card">原始简历</div><div className="rounded-large bg-surface p-4 shadow-card">优化建议</div><div className="rounded-large bg-surface p-4 shadow-card">优化后预览</div></div><div className="mt-6 flex gap-3"><button className="rounded-full bg-primary px-5 py-3 text-white" onClick={() => navigate('/interview')}>开始面试</button></div></div>;
}
