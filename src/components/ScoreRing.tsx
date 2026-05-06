export function ScoreRing({ score }: { score: number; size?: number; strokeWidth?: number; animated?: boolean }) {
  return <div className="flex h-24 w-24 items-center justify-center rounded-full border-8 border-indigo-500 text-2xl font-bold">{score}</div>;
}
