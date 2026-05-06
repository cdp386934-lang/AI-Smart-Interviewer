import { z } from 'zod';

const ScenarioSchema = z.object({
  name: z.string(),
  steps: z.array(z.string()),
  expected: z.array(z.string()),
});

const scenarios = [
  {
    name: '完整流程测试',
    steps: [
      '上传简历',
      '解析成功',
      '生成优化建议',
      '开始技术面试 5 轮',
      '项目深挖 3 轮',
      '行为面试 2 轮',
      '生成报告',
      '查看报告',
    ],
    expected: ['状态连续推进', '报告可生成', '评分与追问逻辑生效'],
  },
  {
    name: '异常场景测试',
    steps: ['损坏 PDF', 'AI 格式错误', '网络中断', '并发面试'],
    expected: ['降级策略可用', '会话恢复正常', '多会话隔离'],
  },
] as const;

async function main() {
  const result = scenarios.map((s) => ScenarioSchema.parse(s));
  console.log(JSON.stringify({ ok: true, scenarios: result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
