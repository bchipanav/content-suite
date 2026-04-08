// ============================================
// StatusBadge — Etiqueta visual para estados
// ============================================
// Muestra el estado de un borrador con color:
//   pending_review    → amarillo (esperando)
//   approved_a        → azul (falta una aprobación)
//   approved          → verde (listo)
//   rejected          → rojo (rechazado)
//   revision_requested → naranja (necesita cambios)

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_review:     { label: "Pendiente",   color: "bg-yellow-100 text-yellow-800" },
  approved:           { label: "Aprobado",    color: "bg-green-100 text-green-800" },
  rejected:           { label: "Rechazado",   color: "bg-red-100 text-red-800" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending_review;

  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
