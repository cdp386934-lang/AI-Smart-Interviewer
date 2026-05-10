import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { useAppStore } from '@/store';
import type { ResumeSummary } from '@/types/shared';

export function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [uploading, setUploading] = useState(false);
  const { flowContext, setFlowContext, setCurrentResume } = useAppStore();

  const handleFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setFileSize(`${(file.size / 1024 / 1024).toFixed(2)} MB`);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiClient.resume.upload(formData);
      const structured = result.structured;
      const mapped: ResumeSummary = {
        name: structured.basicInfo.name,
        summary: structured.rawText.slice(0, 120),
        skills: [...(structured.skills.proficient || []), ...(structured.skills.familiar || [])],
        projects: structured.projects.map((p) => ({ name: p.name, description: p.description, technologies: p.techStack || [] })),
      };
      setCurrentResume(mapped);
      setFlowContext({ sourceResume: mapped });
    } finally {
      setUploading(false);
    }
  };

  const hasResume = Boolean(fileName || flowContext.sourceResume);

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div
        className={`rounded-large border-2 border-dashed bg-surface p-8 ${dragging ? 'border-primary' : 'border-slate-200'}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <h2 className="text-2xl font-bold">上传简历</h2>
        <p className="mt-2 text-slate-600">支持 PDF / Word，最大 10MB</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button className="rounded-full bg-primary px-5 py-3 text-white" onClick={() => fileInputRef.current?.click()}>选择简历文件</button>
          <span className="text-sm text-slate-500">拖拽文件到此区域也可以</span>
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => void handleFile(e.target.files?.[0])} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <div className="text-sm font-medium">公司需求 / JD（可选）</div>
            <textarea className="min-h-32 w-full rounded-card border p-3" value={flowContext.jobDescription || ''} onChange={(e) => setFlowContext({ jobDescription: e.target.value })} placeholder="输入公司需求、岗位描述、重点技能..." />
          </label>
          <div className="space-y-2 rounded-card border bg-muted p-4">
            <div className="text-sm font-medium">上传说明</div>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
              <li>必须先上传简历文件，后续面试才能继续</li>
              <li>公司需求可选，填写后 AI 会优先结合岗位要求出题</li>
              <li>你不需要手动格式化简历，系统会自动读取文件并转换</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-card border bg-slate-50 p-4 text-sm text-slate-700">
          <div>已选择文件：{hasResume ? fileName || flowContext.sourceResume?.name : '未选择'}</div>
          <div className="mt-1">文件大小：{fileSize || '未选择'}</div>
          <div className="mt-1">上传状态：{uploading ? '上传中 / 解析中...' : '等待上传'}</div>
        </div>
      </div>

      <div className="rounded-large bg-surface p-5 shadow-card space-y-4">
        <h3 className="text-xl font-semibold">下一步</h3>
        <p className="text-sm text-slate-600">上传简历之后，你只能选择以下两个动作：先去优化，或者直接开始面试。</p>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-full bg-primary px-5 py-3 text-white disabled:opacity-50" disabled={!hasResume || uploading} onClick={() => navigate('/optimize')}>上传优化</button>
          <button className="rounded-full border px-5 py-3 disabled:opacity-50" disabled={!hasResume || uploading} onClick={() => navigate('/interview')}>直接面试</button>
        </div>
        <div className="rounded-card border bg-muted p-4 text-sm text-slate-600">
          <div>公司名称：{flowContext.companyName || '未填写'}</div>
          <div className="mt-1">公司需求：{flowContext.jobDescription ? flowContext.jobDescription.slice(0, 80) + (flowContext.jobDescription.length > 80 ? '...' : '') : '未填写（可选）'}</div>
        </div>
      </div>
    </div>
  );
}
