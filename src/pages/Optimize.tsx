import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';

export function OptimizePage() {
  const navigate = useNavigate();
  const { currentResume, optimizedResume, optimizationResult, setOptimizedResume } = useAppStore();
  const resume = optimizedResume || currentResume;

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-large bg-surface p-4 shadow-card space-y-3">
          <h3 className="text-lg font-semibold">原始简历</h3>
          <pre className="whitespace-pre-wrap text-sm text-slate-600">{JSON.stringify(currentResume, null, 2)}</pre>
        </div>
        <div className="rounded-large bg-surface p-4 shadow-card space-y-3">
          <h3 className="text-lg font-semibold">优化建议</h3>
          {(optimizationResult?.suggestions || []).map((s, idx) => (
            <div key={idx} className="rounded-card border p-3 text-sm">
              <div className="font-medium">[{s.priority}] {s.category}</div>
              <div className="text-slate-600">{s.issue}</div>
              <div className="mt-1 text-slate-500">{s.suggestion}</div>
              <button className="mt-2 rounded-full bg-success px-3 py-1 text-white" onClick={() => setOptimizedResume({ ...(resume || { name: '', summary: '', skills: [], projects: [] }), summary: `${resume?.summary || ''}\n${s.suggestion}` })}>应用</button>
            </div>
          ))}
          {!optimizationResult?.suggestions?.length ? <div className="text-sm text-slate-500">暂无建议，先上传公司需求再生成优化结果</div> : null}
        </div>
        <div className="rounded-large bg-surface p-4 shadow-card space-y-3">
          <h3 className="text-lg font-semibold">优化后预览</h3>
          <textarea className="min-h-72 w-full rounded-card border p-3 text-sm" value={JSON.stringify(resume, null, 2)} readOnly />
        </div>
      </div>
      <div className="flex gap-3">
        <button className="rounded-full bg-primary px-5 py-3 text-white" onClick={() => navigate('/interview')}>开始面试</button>
        <button className="rounded-full border px-5 py-3" onClick={() => navigate('/upload')}>返回编辑</button>
      </div>
    </div>
  );
}
