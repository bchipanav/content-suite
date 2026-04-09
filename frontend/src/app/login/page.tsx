"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { access_token } = await api.login(email, password);
      localStorage.setItem("access_token", access_token);
      const user = await api.getMe();
      setUser(user as any);
      router.push("/dashboard");
    } catch {
      setError("Email o contraseña incorrectos");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Content Suite</h1>
          <p className="text-slate-400 text-sm mt-1">Plataforma de contenido con IA</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/10 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/10 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="********"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Entrando..." : "Iniciar Sesion"}
          </button>
        </form>
      </div>
    </div>
  );
}
