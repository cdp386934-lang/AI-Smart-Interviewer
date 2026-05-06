import type { SkillRadarPoint } from '../app/types';

export function SkillRadar({ data }: { data: SkillRadarPoint[] }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <h3 className="mb-4 font-semibold text-slate-900">技能雷达</h3>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-sm"><span>{item.label}</span><span>{item.value}</span></div>
            <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${item.value}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
