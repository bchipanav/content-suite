// ============================================
// Store global con Zustand
// ============================================
// Zustand es como un "useState" pero compartido entre toda la app.
// Cualquier componente puede leer y modificar estos valores.

import { create } from "zustand";
import type { User, Brand } from "@/types";

interface AppStore {
  // --- Auth ---
  user: User | null;
  setUser: (user: User | null) => void;

  // --- Brand seleccionada ---
  activeBrand: Brand | null;
  setActiveBrand: (brand: Brand | null) => void;

  // --- UI ---
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useStore = create<AppStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  activeBrand: null,
  setActiveBrand: (brand) => set({ activeBrand: brand }),

  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
