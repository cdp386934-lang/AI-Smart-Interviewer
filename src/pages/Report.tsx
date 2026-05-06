import { SkillRadar } from '../components/SkillRadar';

export function ReportPage() {
  return <div className="p-8"><SkillRadar data={[{ label: '技术', value: 88 }, { label: '沟通', value: 76 }]} /></div>;
}
