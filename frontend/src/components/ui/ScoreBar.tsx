// ============================================
// ScoreBar — Barra visual de compliance (0-100)
// ============================================
//   0-40:  rojo    (no cumple)
//   41-70: amarillo (parcialmente)
//   71-100: verde   (cumple)

export default function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 71 ? "bg-green-500" : score >= 41 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">Compliance</span>
        <span className="font-semibold">{score}/100</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${color} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
