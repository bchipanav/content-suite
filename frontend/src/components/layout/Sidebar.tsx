"use client";

// ============================================
// Sidebar — Navegación principal
// ============================================

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Role } from "@/types";

interface NavItem {
  label: string;
  href: string;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["creator", "approver_a", "approver_b"],
  },
  {
    label: "Manual de Marca",
    href: "/brand-manual",
    roles: ["creator", "approver_a", "approver_b"],
  },
  {
    label: "Generar Contenido",
    href: "/generate",
    roles: ["creator"],
  },
  {
    label: "Aprobaciones",
    href: "/approvals",
    roles: ["approver_a", "approver_b"],
  },
  {
    label: "Auditoría de Imagen",
    href: "/image-audit",
    roles: ["approver_b"],
  },
];

export default function Sidebar() {
  const router = useRouter();
  const { user, sidebarOpen, setUser, setActiveBrand } = useStore();

  if (!user || !sidebarOpen) return null;

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user.role)
  );

  const roleLabels: Record<Role, string> = {
    creator: "Creador",
    approver_a: "Aprobador A",
    approver_b: "Aprobador B",
  };

  function handleLogout() {
    localStorage.removeItem("access_token");
    setUser(null);
    setActiveBrand(null);
    router.push("/login");
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Content Suite</h1>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          {roleLabels[user.role]}
        </span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-4 space-y-1">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Usuario + Cerrar sesión */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-sm font-medium truncate">{user.full_name}</p>
        <p className="text-xs text-gray-500 truncate mb-3">{user.email}</p>
        <button
          onClick={handleLogout}
          className="w-full text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors text-left"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
