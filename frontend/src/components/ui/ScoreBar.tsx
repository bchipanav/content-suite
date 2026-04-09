export default function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 71 ? "bg-emerald-500" : score >= 41 ? "bg-amber-500" : "bg-red-500";
  const textColor =
    score >= 71 ? "text-emerald-700" : score >= 41 ? "text-amber-700" : "text-red-700";

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-slate-500 font-medium">Compliance</span>
        <span className={`font-bold ${textColor}`}>{score}/100</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
