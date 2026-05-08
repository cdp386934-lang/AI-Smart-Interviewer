import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import type { ResumeSummary } from '@/types/shared';

const emptyResume: ResumeSummary = { name: '', summary: '', skills: [], projects: [] };

export function UploadPage() {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const { currentResume, flowContext, setCurrentResume, setFlowContext } = useAppStore();
  const resume = currentResume || emptyResume;

  const updateResume = (patch: Partial<ResumeSummary>) => setCurrentResume({ ...resume, ...patch });

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className={`rounded-large border-2 border-dashed bg-surface p-8 ${dragging ? 'border-primary' : 'border-slate-200'}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); }}>
        <h2 className="text-2xl font-bold">上传简历</h2>
        <p className="mt-2 text-slate-600">支持 PDF / Word，最大 10MB</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="space-y-2"><div className="text-sm font-medium">公司需求 / JD（可选）</div><textarea className="min-h-32 w-full rounded-card border p-3" value={flowContext.jobDescription || ''} onChange={(e) => setFlowContext({ jobDescription: e.target.value })} placeholder="输入公司需求、岗位描述、重点技能..." /></label>
          <div className="space-y-2 rounded-card border bg-muted p-4">
            <div className="text-sm font-medium">上传说明</div>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
              <li>公司需求可选，系统会自动根据简历出题</li>
              <li>若填写 JD，AI 会优先结合岗位要求生成问题</li>
              <li>你也可以在此先编辑简历内容，再进入优化/面试</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-large bg-surface p-5 shadow-card space-y-4">
          <h3 className="text-xl font-semibold">结构化简历编辑</h3>
          <input className="w-full rounded-card border p-3" value={resume.name} onChange={(e) => updateResume({ name: e.target.value })} placeholder="姓名" />
          <textarea className="min-h-24 w-full rounded-card border p-3" value={resume.summary} onChange={(e) => updateResume({ summary: e.target.value })} placeholder="个人简介 / 自我总结" />
          <input className="w-full rounded-card border p-3" value={resume.skills.join(', ')} onChange={(e) => updateResume({ skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="技能（用英文逗号分隔）" />
          <textarea className="min-h-24 w-full rounded-card border p-3" value={resume.projects.map((p) => `${p.name}|${p.description}|${p.technologies.join(',')}`).join('\n')} onChange={(e) => updateResume({ projects: e.target.value.split('\n').filter(Boolean).map((line) => { const [name = '', description = '', techs = ''] = line.split('|'); return { name, description, technologies: techs.split(',').map((t) => t.trim()).filter(Boolean) }; }) })} placeholder="项目：name|description|tech1,tech2" />
        </div>

        <div className="rounded-large bg-surface p-5 shadow-card space-y-4">
          <h3 className="text-xl font-semibold">下一步</h3>
          <p className="text-sm text-slate-600">你可以先保存简历与公司需求，再进入优化页；也可以直接开始面试。</p>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full bg-primary px-5 py-3 text-white" onClick={() => navigate('/optimize')}>保存并继续优化</button>
            <button className="rounded-full border px-5 py-3" onClick={() => navigate('/interview')}>直接开始面试</button>
          </div>
          <div className="rounded-card border bg-muted p-4 text-sm text-slate-600">
            <div>公司名称：{flowContext.companyName || '未填写'}</div>
            <div className="mt-1">公司需求：{flowContext.jobDescription ? flowContext.jobDescription.slice(0, 80) + (flowContext.jobDescription.length > 80 ? '...' : '') : '未填写（可选）'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
