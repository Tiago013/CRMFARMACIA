'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  Settings,
  Bell,
  Search,
  Menu,
  X,
  BrainCircuit,
  DollarSign,
  CreditCard
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#FBFBFB] dark:bg-[#0A0A0A] text-neutral-900 dark:text-neutral-100 font-sans selection:bg-indigo-500/30">
      
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-[#FBFBFB] dark:bg-[#0A0A0A] border-r border-neutral-200/60 dark:border-neutral-800/60 flex-col shrink-0 fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0 flex' : '-translate-x-full hidden md:flex'}`}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-neutral-200/60 dark:border-neutral-800/60">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-neutral-900 dark:bg-white rounded flex items-center justify-center mr-2">
              <span className="text-white dark:text-black font-bold text-xs">F</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">FarmaAI</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-neutral-500 hover:text-neutral-900">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          <div className="px-2 mb-2">
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">General</span>
          </div>
          <NavItem href="/dashboard" icon={<LayoutDashboard size={16} strokeWidth={2} />} label="Dashboard" />
          <NavItem href="/sales" icon={<ShoppingCart size={16} strokeWidth={2} />} label="Punto de Venta" />
          <NavItem href="/inventory" icon={<Package size={16} strokeWidth={2} />} label="Inventario" />
          <NavItem href="/finance" icon={<DollarSign size={16} strokeWidth={2} />} label="Finanzas" />
          <NavItem href="/crm" icon={<Users size={16} strokeWidth={2} />} label="Pacientes" />
          
          <div className="px-2 mb-2 mt-6">
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Inteligencia</span>
          </div>
          <NavItem href="/forecasting" icon={<BrainCircuit size={16} strokeWidth={2} />} label="Forecasting IA" />
        </nav>
        
        <div className="p-2 border-t border-neutral-200/60 dark:border-neutral-800/60 flex flex-col space-y-0.5">
          <NavItem href="/billing" icon={<CreditCard size={16} strokeWidth={2} />} label="Suscripción (SaaS)" />
          <NavItem href="/settings" icon={<Settings size={16} strokeWidth={2} />} label="Configuración" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Topbar */}
        <header className="h-14 bg-[#FBFBFB] dark:bg-[#0A0A0A] border-b border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center flex-1">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="mr-4 md:hidden text-neutral-500 hover:text-neutral-900"
            >
              <Menu size={20} />
            </button>
            {/* Command Palette Placeholder */}
            <div className="hidden md:flex items-center bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-2.5 py-1.5 w-64 text-neutral-500 cursor-text hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors">
              <Search size={14} className="mr-2 opacity-70" />
              <span className="text-xs font-medium">Buscar...</span>
              <div className="ml-auto flex items-center space-x-1">
                <span className="text-[10px] border border-neutral-300 dark:border-neutral-700 rounded px-1.5 py-0.5">⌘</span>
                <span className="text-[10px] border border-neutral-300 dark:border-neutral-700 rounded px-1.5 py-0.5">K</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors relative">
              <Bell size={18} strokeWidth={2} />
              <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-blue-500 rounded-full border border-[#FBFBFB] dark:border-[#0A0A0A]"></span>
            </button>
            <div className="w-7 h-7 bg-gradient-to-tr from-neutral-800 to-neutral-600 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-inner cursor-pointer border border-neutral-200 dark:border-neutral-700 ring-2 ring-transparent hover:ring-neutral-200 dark:hover:ring-neutral-700 transition-all">
              JD
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-white dark:bg-[#000000]">
          {children}
        </div>
        
      </main>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string, icon: ReactNode, label: string }) {
  return (
    <Link 
      href={href}
      className="flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all text-sm font-medium group"
    >
      <span className="text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}
