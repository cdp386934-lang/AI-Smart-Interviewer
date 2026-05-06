export function SkillRadar({ data }: { data: Array<{ skill: string; score: number; fullMark: number }>; animated?: boolean; size?: number }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-card">
      <h3 className="mb-4 font-semibold">技能雷达</h3>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.skill}>
            <div className="flex justify-between text-sm"><span>{item.skill}</span><span>{item.score}</span></div>
            <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-primary" style={{ width: `${item.score}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
