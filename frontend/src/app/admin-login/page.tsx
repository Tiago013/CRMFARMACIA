'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Shield } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();

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
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Import auth store dynamically or use it at top level. 
      const { useAuthStore } = await import('@/stores/useAuthStore');

      // Fetch the full profile from our DB as a System Admin
      const profileRes = await fetch('/api/auth/admin-profile');
      if (!profileRes.ok) {
         throw new Error('Acceso Denegado: No tienes privilegios de Super Administrador.');
      }
      
      const profileData = await profileRes.json();

      // Ensure Zustand auth store is updated!
      useAuthStore.getState().login(profileData, data.session?.access_token || '');

      router.push('/saas');
      router.refresh();
      
    } catch (err: any) {
      const detail = err?.message || 'Error de autenticación con Supabase.';
      setError(detail);
      
      // Clean up corrupt cookies just in case
      if (typeof document !== 'undefined') {
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 text-white">
      {/* Background subtle grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-900/50">
            <Shield className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            SaaS Control Center
          </h1>
          <p className="text-sm text-indigo-300 mt-1">
            FarmaAI Super Admin Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0A0A0A] border border-indigo-900/50 rounded-xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-900 rounded-lg text-red-400 text-xs">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={15} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@farmaai.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#111111] border border-neutral-800 rounded-lg text-sm text-white focus:border-indigo-500 outline-none transition-colors placeholder:text-neutral-600"
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Contraseña maestra
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={15} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-[#111111] border border-neutral-800 rounded-lg text-sm text-white focus:border-indigo-500 outline-none transition-colors placeholder:text-neutral-600"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/30 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verificando credenciales...
                </span>
              ) : (
                'Acceder al Control Center'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-neutral-600 mt-6 font-mono">
          ACCESO RESTRINGIDO - MONITORIZADO
        </p>
      </div>
    </div>
  );
}
