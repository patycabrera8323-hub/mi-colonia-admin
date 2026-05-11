import React from 'react';
import { useAuth } from './contexts/AuthContext';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Store, LayoutDashboard, Users, Settings as SettingsIcon, Menu, X, PieChart, MessageSquare, Package, ShoppingBag } from 'lucide-react';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from './lib/utils';
import AdminDashboard from './AdminDashboard';
import OwnerDashboard from './OwnerDashboard';

export default function DashboardLayout() {
  const { user, userData, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = React.useState<'admin' | 'owner' | 'orders' | 'analytics' | 'support' | 'settings'>('owner');
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!loading) {
      setViewMode(isAdmin ? 'admin' : 'owner');
    }
  }, [isAdmin, loading]);

  if (loading) return <div className="h-screen flex items-center justify-center">Cargando...</div>;
  if (!user) return <Navigate to="/" />;

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleNavClick = (mode: any) => {
    setViewMode(mode);
    setMobileMenuOpen(false); // Cerrar menú en celular al hacer clic
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col md:flex-row font-sans relative">
      
      {/* 📱 Mobile Top Header (Delgado y elegante para ahorrar espacio) */}
      <div className="md:hidden bg-blue-900 text-white p-3 flex items-center justify-between sticky top-0 z-30 shadow-md border-b-2 border-emerald-500">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-white p-0.5 shadow-sm">
             <img src="/logo.png" alt="Logo" className="w-full h-full object-cover rounded-full" />
           </div>
           <div>
             <span className="font-black tracking-tight text-sm uppercase">Mi Colonia</span>
             <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest leading-none">
               {isAdmin ? 'Súper Admin' : 'Dueño'}
             </p>
           </div>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl hover:bg-white/20 transition-all active:scale-95 border border-white/10"
        >
          <span className="text-[10px] font-black uppercase tracking-widest">{mobileMenuOpen ? 'Cerrar' : 'Menú'}</span>
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 🌑 Overlay oscuro para cuando el menú está abierto en celular */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-blue-950/60 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 💻 Sidebar (Fija en PC, Deslizable en Celular) */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-blue-900 border-r-4 border-emerald-600 flex flex-col items-stretch shadow-2xl transition-transform duration-300 ease-in-out",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 border-b border-blue-800/50 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-white mb-4 shadow-lg overflow-hidden border-2 border-emerald-500">
            <img 
              src="/logo.png" 
              alt="Mi Colonia Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center w-full">
            <h2 className="text-orange-500 font-display font-black text-2xl tracking-tight leading-tight mb-1 drop-shadow-sm">MI COLONIA V2</h2>
            <p className="text-white font-bold text-[10px] tracking-widest uppercase mb-3 drop-shadow-sm">ACTUALIZADO ✅</p>
            <div className="w-12 h-px bg-blue-700/50 mx-auto mb-3"></div>
            <p className="text-emerald-400 text-[10px] font-semibold tracking-wider uppercase">
              {isAdmin ? 'Súper Usuario' : 'Dueño de Negocio'}
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* 🛠 SECCIÓN DE ADMINISTRACIÓN (Solo visible para Súper Admin) */}
          {isAdmin && (
            <div className="space-y-1">
              <p className="px-3 text-[9px] font-black text-blue-400 uppercase tracking-[0.3em] mb-2 opacity-70">Panel de Control Admin</p>
              <NavItem 
                icon={<Users />} 
                label="Usuarios y Negocios" 
                active={viewMode === 'admin'} 
                onClick={() => handleNavClick('admin')} 
              />
              <NavItem 
                icon={<ShoppingBag />} 
                label="PEDIDOS GLOBAL (ADMIN)" 
                active={viewMode === 'orders'} 
                onClick={() => handleNavClick('orders')} 
              />
              <NavItem 
                icon={<PieChart />} 
                label="Analíticas Globales" 
                active={viewMode === 'analytics'} 
                onClick={() => handleNavClick('analytics')} 
              />
              <NavItem 
                icon={<MessageSquare />} 
                label="Soporte y Mensajes" 
                active={viewMode === 'support'} 
                onClick={() => handleNavClick('support')} 
              />
              <NavItem 
                icon={<SettingsIcon />} 
                label="Configuración Global" 
                active={viewMode === 'settings'} 
                onClick={() => handleNavClick('settings')} 
              />
            </div>
          )}

          {/* 🏪 SECCIÓN DE MI NEGOCIO (Visible para todos: Dueños y Admin) */}
          <div className="space-y-1">
            <p className="px-3 text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-2 opacity-70">Mi Negocio / Tienda</p>
            <NavItem 
              icon={<ShoppingBag />} 
              label="MIS PEDIDOS" 
              active={viewMode === 'my-orders' || viewMode === 'orders'} 
              onClick={() => handleNavClick(isAdmin ? 'my-orders' : 'orders')} 
              highlight={true}
            />
            <NavItem 
              icon={<LayoutDashboard />} 
              label="Mi Tienda" 
              active={viewMode === 'owner'} 
              onClick={() => handleNavClick('owner')} 
            />
            <NavItem 
              icon={<PieChart />} 
              label="Estadísticas" 
              active={viewMode === 'analytics'} 
              onClick={() => handleNavClick('analytics')} 
            />
            <NavItem 
              icon={<MessageSquare />} 
              label="Soporte Técnico" 
              active={viewMode === 'support'} 
              onClick={() => handleNavClick('support')} 
            />
            <NavItem 
              icon={<SettingsIcon />} 
              label="Configuración" 
              active={viewMode === 'settings'} 
              onClick={() => handleNavClick('settings')} 
            />
          </div>

          <div className="my-2 h-px bg-blue-800/20 mx-3"></div>

          <NavItem 
            icon={<Store />} 
            label="Ver Directorio Público" 
            active={false} 
            onClick={() => { setMobileMenuOpen(false); navigate('/'); }} 
          />
        </nav>

        <div className="p-4 border-t border-blue-800 bg-blue-950/20">
          <div className="mb-4">
            <p className="text-sm font-bold text-white truncate">{userData?.name || user.email}</p>
            <p className="text-[10px] text-blue-400 truncate uppercase tracking-widest">{user.email}</p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:text-white hover:bg-red-600 hover:border-red-500 p-3 rounded-xl transition-all text-sm font-black uppercase tracking-widest active:scale-95 shadow-sm">
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-[calc(100vh-56px)] md:h-screen overflow-y-auto bg-neutral-50 p-4 md:p-8">
        {isAdmin ? (
          <AdminDashboard viewMode={viewMode} />
        ) : (
          <OwnerDashboard viewMode={viewMode} />
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, highlight }: { icon: React.ReactNode, label: string, active: boolean, onClick?: () => void, highlight?: boolean }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl text-sm font-bold cursor-pointer transition-all duration-200 group relative overflow-hidden", 
        active 
          ? "bg-white text-blue-900 shadow-lg shadow-blue-950/20" 
          : cn(
              "text-blue-200 hover:bg-white/10 hover:text-white",
              highlight && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse"
            )
      )}>
      <div className={cn(
        "p-1.5 rounded-lg transition-colors",
        active ? "bg-blue-100 text-blue-900" : "bg-blue-800/50 text-blue-300 group-hover:text-white"
      )}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" })}
      </div>
      <span className={cn(active ? "font-black uppercase tracking-tight" : "font-medium")}>
        {label}
      </span>
      {highlight && !active && (
        <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50" />
      )}
    </div>
  );
}
