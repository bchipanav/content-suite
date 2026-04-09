"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Role } from "@/types";

interface NavItem {
  label: string;
  href: string;
  roles: Role[];
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",           href: "/dashboard",     roles: ["creator", "approver_a", "approver_b"], icon: "grid" },
  { label: "Manual de Marca",     href: "/brand-manual",  roles: ["creator", "approver_a", "approver_b"], icon: "book" },
  { label: "Generar Contenido",   href: "/generate",      roles: ["creator"],                             icon: "sparkles" },
  { label: "Aprobaciones",        href: "/approvals",     roles: ["approver_a", "approver_b"],            icon: "check-circle" },
  { label: "Auditoria de Imagen", href: "/image-audit",   roles: ["approver_b"],                          icon: "image" },
];

const ICONS: Record<string, React.ReactNode> = {
  grid: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  book: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  sparkles: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  ),
  "check-circle": (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  image: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
};

const ROLE_LABELS: Record<Role, string> = {
  creator: "Creador",
  approver_a: "Brand Manager",
  approver_b: "Director",
};

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, sidebarOpen, setUser, setActiveBrand } = useStore();

  if (!user || !sidebarOpen) return null;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  function handleLogout() {
    localStorage.removeItem("access_token");
    setUser(null);
    setActiveBrand(null);
    router.push("/login");
  }

  return (
    <aside className="w-64 bg-slate-900 min-h-screen flex flex-col">
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">C</span>
          </div>
          <h1 className="text-lg font-bold text-white">Content Suite</h1>
        </div>
      </div>

      <div className="px-6 pb-6">
        <span className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
          {ROLE_LABELS[user.role]}
        </span>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {ICONS[item.icon]}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mx-3 mb-3 bg-slate-800/50 rounded-xl">
        <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
        <p className="text-xs text-slate-500 truncate mb-3">{user.email}</p>
        <button
          onClick={handleLogout}
          className="w-full text-xs text-slate-400 hover:text-white hover:bg-slate-700 px-3 py-2 rounded-lg transition-all text-left"
        >
          Cerrar sesion
        </button>
      </div>
    </aside>
  );
}
