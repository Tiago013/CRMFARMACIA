'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { useBranchStore } from '@/stores/useBranchStore';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import { apiClient } from '@/lib/axios';
import { 
  LayoutDashboard, Package, Users, ShoppingCart, Settings,
  Bell, Search, Menu, X, BrainCircuit, DollarSign,
  CreditCard, LogOut, Shield, ChevronDown, Moon, Sun, Monitor, MapPin, ArrowRightLeft, MessageCircle, MessageSquare
} from 'lucide-react';
import UpgradeModal from '@/components/ui/UpgradeModal';

// Define which nav items are visible per role
const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'regente'] },
  { href: '/sales', icon: ShoppingCart, label: 'Punto de Venta', roles: ['admin', 'regente', 'cajero'] },
  { href: '/transactions', icon: ArrowRightLeft, label: 'Ventas y Compras', roles: ['admin', 'regente'] },
  { href: '/inventory', icon: Package, label: 'Inventario', roles: ['admin', 'regente'] },
  { href: '/finance', icon: DollarSign, label: 'Finanzas', roles: ['admin'] },
  { href: '/crm', icon: Users, label: 'Pacientes', roles: ['admin', 'regente'] },
  { href: '/whatsapp', icon: MessageCircle, label: 'WhatsApp', roles: ['admin', 'regente'] },
];

const INTEL_ITEMS = [
  { href: '/forecasting', icon: BrainCircuit, label: 'Forecasting IA', roles: ['admin', 'regente'] },
];

const BOTTOM_ITEMS = [
  { href: '/billing', icon: CreditCard, label: 'Suscripción (SaaS)', roles: ['admin'] },
  { href: '/saas', icon: Shield, label: 'Super Admin', roles: ['admin'] },
  { href: '/whatsapp', icon: MessageSquare, label: 'WhatsApp', roles: ['admin', 'regente'] },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  regente: 'Regente',
  cajero: 'Cajero',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  regente: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  cajero: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  
  const router = useRouter();
  const pathname = usePathname();
  
  const { user, isAuthenticated, logout } = useAuthStore();
  const userRole = user?.role || 'cajero';

  // Real-time events
  useRealtimeEvents();

  // Auth Redirect & Stale State Recovery
  useEffect(() => {
    if (!isAuthenticated) {
      // Si la cookie existe pero el store dice que no estamos autenticados (estado corrupto),
      // forzamos la limpieza de la cookie para romper el bucle infinito del middleware.
      if (typeof document !== 'undefined') {
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      
      // Also sign out of Supabase to clear its cookies
      import('@/utils/supabase/client').then(({ createClient }) => {
        const supabase = createClient();
        supabase.auth.signOut().then(() => {
          router.push('/login');
        });
      });
    }
  }, [isAuthenticated, router]);
  // Command Palette Shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Theme Initializer
  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const handleLogout = async () => {
    logout();
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FBFBFB] dark:bg-[#0A0A0A]">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(userRole));
  const visibleIntel = INTEL_ITEMS.filter(item => item.roles.includes(userRole));
  const visibleBottom = BOTTOM_ITEMS.filter(item => item.roles.includes(userRole));
  const initials = `${(user.first_name || user.email)[0]}${(user.last_name || '')[0] || ''}`.toUpperCase();

  return (
    <div className="flex h-screen bg-[#FBFBFB] dark:bg-[#0A0A0A] text-neutral-900 dark:text-neutral-100 font-sans selection:bg-indigo-500/30">
      
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-[#FBFBFB] dark:bg-[#0A0A0A] border-r border-neutral-200/60 dark:border-neutral-800/60 flex-col shrink-0 fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0 flex' : '-translate-x-full hidden md:flex'}`}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-neutral-200/60 dark:border-neutral-800/60">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-neutral-900 dark:bg-white rounded flex items-center justify-center mr-2">
              <span className="text-white dark:text-black font-bold text-xs">F</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">FarmaAI</span>
            <span className="ml-2 text-[8px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">PRO</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-neutral-500 hover:text-neutral-900">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          <div className="px-2 mb-2">
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">General</span>
          </div>
          {visibleNav.map(item => (
            <NavItem key={item.href} href={item.href} icon={<item.icon size={16} strokeWidth={2} />} label={item.label} active={pathname.startsWith(item.href)} />
          ))}
          
          {visibleIntel.length > 0 && (
            <>
              <div className="px-2 mb-2 mt-6">
                <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Inteligencia</span>
              </div>
              {visibleIntel.map(item => (
                <NavItem key={item.href} href={item.href} icon={<item.icon size={16} strokeWidth={2} />} label={item.label} active={pathname.startsWith(item.href)} />
              ))}
            </>
          )}
        </nav>
        
        <div className="p-2 border-t border-neutral-200/60 dark:border-neutral-800/60 flex flex-col space-y-0.5">
          {visibleBottom.map(item => (
            <NavItem key={item.href} href={item.href} icon={<item.icon size={16} strokeWidth={2} />} label={item.label} active={pathname.startsWith(item.href)} />
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Topbar */}
        <header className="h-14 bg-[#FBFBFB] dark:bg-[#0A0A0A] border-b border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center flex-1">
            <button onClick={() => setMobileMenuOpen(true)} className="mr-4 md:hidden text-neutral-500 hover:text-neutral-900">
              <Menu size={20} />
            </button>
            {/* Command Palette Trigger */}
            <button 
              onClick={() => setShowCommandPalette(true)}
              className="hidden md:flex items-center bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md px-2.5 py-1.5 w-64 text-neutral-500 cursor-text hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors shadow-sm"
            >
              <Search size={14} className="mr-2 opacity-70" />
              <span className="text-xs font-medium">Buscar en FarmaAI...</span>
              <div className="ml-auto flex items-center space-x-1">
                <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 rounded px-1.5 py-0.5 font-mono">⌘</span>
                <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 rounded px-1.5 py-0.5 font-mono">K</span>
              </div>
            </button>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* Branch Selector (Multi-Sede Phase 26.12) */}
            {['admin', 'regente'].includes(userRole) && (
              <BranchSelector showBranchMenu={showBranchMenu} setShowBranchMenu={setShowBranchMenu} />
            )}

            {/* Role Badge */}
            <span className={`hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${ROLE_COLORS[userRole] || ROLE_COLORS.cajero}`}>
              <Shield size={10} /> {ROLE_LABELS[userRole] || userRole}
            </span>

            {/* Notifications (Phase 26.5) */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white rounded-md transition-colors relative"
              >
                <Bell size={18} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-[#FBFBFB] dark:border-[#0A0A0A]"></span>
              </button>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 top-10 w-80 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-[400px]">
                    <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-[#111111]">
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Notificaciones</h3>
                      <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Marcar leídas</button>
                    </div>
                    <div className="overflow-y-auto p-2 space-y-1">
                      <div className="p-2 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-md cursor-pointer border-l-2 border-red-500 bg-red-50/50 dark:bg-red-900/10">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white">Stock Crítico</span>
                          <span className="text-[10px] text-neutral-400">Hace 5m</span>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">Losartán 50mg (Quedan 3 unidades).</p>
                      </div>
                      <div className="p-2 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-md cursor-pointer border-l-2 border-amber-500">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white">Vencimiento FEFO</span>
                          <span className="text-[10px] text-neutral-400">Hace 1h</span>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">Lote L2026D4 vence en 15 días.</p>
                      </div>
                      <div className="p-2 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-md cursor-pointer border-l-2 border-blue-500">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white">Refill de Paciente</span>
                          <span className="text-[10px] text-neutral-400">Hace 2h</span>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">Carlos Gómez necesita Metformina.</p>
                      </div>
                    </div>
                    <div className="p-2 border-t border-neutral-100 dark:border-neutral-800 text-center bg-neutral-50 dark:bg-[#111111]">
                      <button className="text-xs text-neutral-500 font-medium hover:text-neutral-900 dark:hover:text-white">Ver todas</button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Theme Toggle (Phase 26.7) */}
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 rounded-md p-0.5">
              <button onClick={() => handleThemeChange('light')} className={`p-1 rounded text-neutral-500 ${theme === 'light' ? 'bg-white shadow-sm text-neutral-900' : 'hover:text-neutral-900'}`}>
                <Sun size={14} />
              </button>
              <button onClick={() => handleThemeChange('dark')} className={`p-1 rounded text-neutral-500 ${theme === 'dark' ? 'bg-neutral-800 shadow-sm text-white' : 'hover:text-white'}`}>
                <Moon size={14} />
              </button>
              <button onClick={() => handleThemeChange('system')} className={`p-1 rounded text-neutral-500 ${theme === 'system' ? 'bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-white' : 'hover:text-neutral-900 dark:hover:text-white'}`}>
                <Monitor size={14} />
              </button>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md px-1.5 py-1 transition-colors ml-1"
              >
                <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {initials}
                </div>
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-10 w-56 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111111]">
                      <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors font-medium"
                      >
                        <LogOut size={14} />
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-white dark:bg-[#000000]">
          {children}
        </div>

        {/* Command Palette Modal (Phase 26.6) */}
        {showCommandPalette && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] bg-neutral-900/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#0A0A0A] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                <Search size={18} className="text-neutral-400 mr-3" />
                <input 
                  type="text" 
                  placeholder="Buscar pacientes, productos, acciones... (Ej: Nueva venta)" 
                  className="w-full bg-transparent outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400"
                  autoFocus
                />
                <span className="text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded ml-2">ESC</span>
              </div>
              <div className="p-2 max-h-96 overflow-y-auto">
                <div className="px-3 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">Acciones Rápidas</div>
                <button onClick={() => { router.push('/sales'); setShowCommandPalette(false); }} className="w-full text-left px-3 py-2.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                  <ShoppingCart size={16} className="text-indigo-500" /> Ir al POS (Nueva Venta)
                </button>
                <button onClick={() => { router.push('/inventory'); setShowCommandPalette(false); }} className="w-full text-left px-3 py-2.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                  <Package size={16} className="text-emerald-500" /> Ingresar Producto al Inventario
                </button>
                <div className="px-3 py-2 mt-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">Búsquedas Recientes</div>
                <div className="text-center py-8 text-neutral-400 text-sm">Empieza a escribir para buscar...</div>
              </div>
            </div>
            <div className="absolute inset-0 -z-10" onClick={() => setShowCommandPalette(false)} />
          </div>
        )}
        
        <UpgradeModal />
      </main>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string, icon: ReactNode, label: string, active?: boolean }) {
  return (
    <Link 
      href={href}
      className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium group transition-all ${
        active 
          ? 'bg-neutral-100 dark:bg-[#111111] text-neutral-900 dark:text-white' 
          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-[#111111] hover:text-neutral-900 dark:hover:text-white'
      }`}
    >
      <span className={`transition-colors ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400 group-hover:text-indigo-500'}`}>
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

function BranchSelector({ showBranchMenu, setShowBranchMenu }: { showBranchMenu: boolean, setShowBranchMenu: (v: boolean) => void }) {
  const { activeBranch, availableBranches, setBranches, setActiveBranch } = useBranchStore();


  useEffect(() => {
    // Fetch branches on mount
    const fetchBranches = async () => {
      try {
        const { data } = await apiClient.get('/auth/branches');
        if (data && Array.isArray(data)) {
          setBranches(data);
        }
      } catch (err) {
        console.error('Failed to load branches', err);
      }
    };
    fetchBranches();
  }, [setBranches]);

  if (!activeBranch) return null;

  return (
    <div className="relative hidden sm:block">
      <button 
        onClick={() => setShowBranchMenu(!showBranchMenu)}
        className="flex items-center gap-1.5 px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors text-xs font-medium text-neutral-600 dark:text-neutral-300"
      >
        <MapPin size={14} /> {activeBranch.name} <ChevronDown size={12} />
      </button>
      {showBranchMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowBranchMenu(false)} />
          <div className="absolute right-0 top-8 w-48 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl z-50 p-1">
            <div className="px-2 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Cambiar Sucursal</div>
            {availableBranches.map((branch: any) => (
              <button 
                key={branch.id}
                onClick={() => {
                  setActiveBranch(branch.id);
                  setShowBranchMenu(false);
                  // Reload page to re-fetch all queries with the new branch header
                  window.location.reload();
                }}
                className={`w-full text-left px-2 py-1.5 text-xs rounded flex justify-between items-center ${
                  branch.id === activeBranch.id 
                    ? 'font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' 
                    : 'font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-500'
                }`}
              >
                {branch.name}
                {branch.id === activeBranch.id && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
