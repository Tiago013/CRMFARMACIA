'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient as api } from '@/lib/axios';
import { useAuthStore } from '@/stores/useAuthStore';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      const { access_token, user } = res.data;

      login(user, access_token);

      // Redirect based on role
      if (user.role === 'cajero') {
        router.push('/sales');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Error de conexión con el servidor.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#000000] p-4">
      {/* Background subtle grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 bg-neutral-900 dark:bg-white rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white dark:text-black font-bold text-lg">F</span>
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            FarmaAI Enterprise
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Ingresa a tu cuenta para continuar
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400 text-xs">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={15} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@farmaai.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-white focus:border-neutral-400 dark:focus:border-neutral-600 outline-none transition-colors placeholder:text-neutral-400"
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={15} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-white focus:border-neutral-400 dark:focus:border-neutral-600 outline-none transition-colors placeholder:text-neutral-400"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-neutral-900 dark:bg-white text-white dark:text-black py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white dark:border-black/30 dark:border-t-black rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-3">
            Cuentas de prueba
          </p>
          <div className="space-y-2">
            {[
              { label: 'Admin', email: 'admin@saludvital.com', pass: 'admin123', color: 'text-blue-500' },
              { label: 'Cajero 1', email: 'cajero1@saludvital.com', pass: 'cajero123', color: 'text-emerald-500' },
              { label: 'Cajero 2', email: 'cajero2@saludvital.com', pass: 'cajero123', color: 'text-amber-500' },
            ].map((cred) => (
              <button
                key={cred.email}
                type="button"
                onClick={() => { setEmail(cred.email); setPassword(cred.pass); }}
                className="w-full flex items-center justify-between p-2 rounded-md bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase ${cred.color}`}>{cred.label}</span>
                  <span className="text-xs text-neutral-500">{cred.email}</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-400">{cred.pass}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-neutral-400 mt-6">
          FarmaAI Enterprise v1.0 — Droguería Salud Vital
        </p>
      </div>
    </div>
  );
}
