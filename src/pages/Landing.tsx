import { Link } from 'react-router-dom';

const cards = [
  { title: '简历优化', desc: '智能分析简历亮点与不足，给出优化建议。' },
  { title: '智能面试', desc: 'WebSocket 实时互动，模拟真实面试流程。' },
  { title: '能力评估', desc: '多维度评分与报告，帮助精准决策。' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-muted text-slate-900 opacity-0 animate-[fadeIn_600ms_ease-out_forwards]">
      <main className="mx-auto max-w-[1440px] px-6 py-10">
        <section className="rounded-large bg-surface p-10 shadow-card">
          <div className="flex flex-col gap-4">
            <span className="text-sm font-semibold text-primary">AI 驱动，精准面试</span>
            <h1 className="text-4xl font-bold">AI Smart Interviewer</h1>
            <p className="max-w-2xl text-slate-600">从简历上传到面试报告，一站式完成智能面试评估，帮助面试官高效、准确地做出判断。</p>
            <div className="flex gap-3">
              <Link to="/upload" className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-white shadow-card transition-transform duration-300 hover:-translate-y-1 hover:shadow-float animate-pulse">开始面试</Link>
              <Link to="/report/demo" className="inline-flex items-center rounded-full border border-slate-200 px-6 py-3 hover:bg-slate-50">查看报告示例</Link>
            </div>
          </div>
        </section>
        <section className="mt-8 grid gap-6 md:grid-cols-3">
          {cards.map((c) => <article key={c.title} className="rounded-large bg-surface p-6 shadow-card transition-transform duration-300 hover:-translate-y-1 hover:shadow-float"><h3 className="text-xl font-semibold">{c.title}</h3><p className="mt-2 text-slate-600">{c.desc}</p></article>)}
        </section>
      </main>
    </div>
  );
}
