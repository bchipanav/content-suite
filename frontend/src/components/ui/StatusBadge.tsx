const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_review: { label: "Pendiente",  color: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  approved:       { label: "Aprobado",   color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  rejected:       { label: "Rechazado",  color: "bg-red-50 text-red-700 ring-red-600/20" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending_review;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${config.color}`}>
      {config.label}
    </span>
  );
}
