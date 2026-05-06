import React from 'react';
import { useAuth } from './contexts/AuthContext';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Store, LayoutDashboard, Users, Settings } from 'lucide-react';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from './lib/utils';
import { motion } from 'motion/react';
import AdminDashboard from './AdminDashboard';
import OwnerDashboard from './OwnerDashboard';

export default function DashboardLayout() {
  const { user, userData, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = React.useState<'admin' | 'owner'>('owner');

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

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-blue-900 border-r-4 border-emerald-600 flex flex-col items-stretch sticky top-0 shrink-0 shadow-xl z-20 h-auto md:h-screen">
        <div className="p-6 border-b border-blue-800/50 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-white mb-4 shadow-lg overflow-hidden border-2 border-emerald-500">
            <img 
              src="/logo.png" 
              alt="Mi Colonia Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center w-full">
            <h2 className="text-white font-display font-black text-2xl tracking-tight leading-tight mb-1 drop-shadow-sm">MI COLONIA</h2>
            <p className="text-white font-bold text-[10px] tracking-widest uppercase mb-3 drop-shadow-sm">EN UN CLICK</p>
            <div className="w-12 h-px bg-blue-700/50 mx-auto mb-3"></div>
            <p className="text-emerald-400 text-[10px] font-semibold tracking-wider uppercase">
              {isAdmin ? 'Súper Usuario' : 'Dueño de Negocio'}
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto hidden md:block">
          {isAdmin && (
            <>
              <NavItem 
                icon={<Users />} 
                label="Usuarios y Negocios" 
                active={viewMode === 'admin'} 
                onClick={() => setViewMode('admin')} 
              />
            </>
          )}
          {!isAdmin && (
            <NavItem 
              icon={<LayoutDashboard />} 
              label="Mi Tienda" 
              active={true} 
              onClick={() => navigate('/dashboard')} 
            />
          )}
          <NavItem 
            icon={<Store />} 
            label="Ver Directorio Público" 
            active={false} 
            onClick={() => navigate('/')} 
          />
        </nav>

        <div className="p-4 border-t border-blue-800 hidden md:block">
          <div className="mb-4">
            <p className="text-sm font-medium text-white">{userData?.name || user.email}</p>
            <p className="text-xs text-blue-400">{user.email}</p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 text-blue-200 hover:text-white hover:bg-blue-800 p-2 rounded-md transition-colors text-sm">
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
        
        {/* Mobile Navbar */}
        <div className="flex md:hidden items-center justify-between p-4 border-t border-blue-800">
          <p className="text-sm text-white truncate max-w-[150px]">{userData?.name}</p>
          <button onClick={handleLogout} className="text-blue-200 hover:text-white p-2">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto bg-neutral-50 p-4 md:p-8">
        {isAdmin ? (
          <AdminDashboard />
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn("flex items-center gap-3 p-3 rounded-lg text-sm font-medium cursor-pointer transition-colors", 
      active ? "bg-white/10 text-white" : "text-blue-200 hover:bg-white/5 hover:text-white"
    )}>
      {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
      {label}
    </div>
  );
}
