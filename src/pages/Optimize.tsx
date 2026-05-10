import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';

export function OptimizePage() {
  const navigate = useNavigate();
  const { currentResume, flowContext, setOptimizedResume } = useAppStore();

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="rounded-large bg-surface p-5 shadow-card">
        <h2 className="text-2xl font-bold">简历优化</h2>
        <p className="mt-2 text-slate-600">这里用于查看系统给出的优化建议，但不会要求你手动格式化简历。</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-large bg-surface p-4 shadow-card">
          <h3 className="mb-3 text-lg font-semibold">原始简历</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <div>姓名：{currentResume?.name || '未填写'}</div>
            <div>摘要：{currentResume?.summary || '未填写'}</div>
            <div>技能：{currentResume?.skills.join('、') || '未填写'}</div>
          </div>
        </div>

        <div className="rounded-large bg-surface p-4 shadow-card">
          <h3 className="mb-3 text-lg font-semibold">优化建议</h3>
          <div className="space-y-3 text-sm text-slate-600">
            <div>公司需求：{flowContext.jobDescription || '未填写（可选）'}</div>
            <div>建议：系统会根据简历和公司需求给出内容优化建议。</div>
            <div>说明：不需要你在这里手工格式化简历。</div>
          </div>
        </div>

        <div className="rounded-large bg-surface p-4 shadow-card">
          <h3 className="mb-3 text-lg font-semibold">优化后预览</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <div>系统会在这里显示优化后的简历版本。</div>
            <div>如果你不想优化，也可以直接进入面试。</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-full bg-primary px-5 py-3 text-white"
          onClick={() => {
            if (currentResume) setOptimizedResume(currentResume);
            navigate('/interview');
          }}
        >
          上传优化
        </button>
        <button className="rounded-full border px-5 py-3" onClick={() => navigate('/interview')}>
          直接面试
        </button>
      </div>
    </div>
  );
}
