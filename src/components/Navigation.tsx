import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings, 
  Package, 
  ShoppingCart, 
  Wrench, 
  ShieldCheck,
  Users, 
  BarChart3, 
  LogOut,
  Smartphone,
  CreditCard,
  FileText,
  X
} from 'lucide-react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

export default function Navigation({ 
  profile, 
  onLogout,
  isMobileOpen,
  onCloseMobile
}: { 
  profile: UserProfile | null;
  onLogout: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Pusat Servis', icon: Wrench, path: '/services' },
    { name: 'Garansi & Retur', icon: ShieldCheck, path: '/warranty' },
    { name: 'Pembayaran', icon: CreditCard, path: '/payments' },
    { name: 'Laporan Ringkas', icon: BarChart3, path: '/reports' },
    { name: 'Laporan Detail', icon: FileText, path: '/detailed-reports' },
    { name: 'Kasir POS', icon: ShoppingCart, path: '/pos' },
    { name: 'Inventaris', icon: Package, path: '/inventory' },
    { name: 'Karyawan', icon: Users, path: '/employees', roles: ['admin'] },
    { name: 'Aset', icon: Settings, path: '/assets' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside className={cn(
        "bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 z-50",
        "fixed inset-y-0 left-0 w-64 md:static md:translate-x-0 md:flex",
        isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white leading-tight">SMARTPHONE</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Service ERP</p>
            </div>
          </div>
          {onCloseMobile && (
            <button 
              onClick={onCloseMobile}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            if (item.roles && profile && !item.roles.includes(profile.role)) return null;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onCloseMobile?.()}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                  isActive 
                    ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className="w-5 h-5" />
                    {item.name}
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">
              {profile?.displayName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{profile?.displayName}</p>
              <p className="text-[10px] text-slate-500 uppercase font-black">{profile?.role}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            Keluar Sesi
          </button>
        </div>
      </aside>
    </>
  );
}
