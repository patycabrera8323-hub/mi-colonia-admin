import React, { useEffect, useState, useMemo } from 'react';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Store, UserCheck, ShieldCheck, Search, CheckCircle, 
  XCircle, Trash2, Settings, X, BarChart3, PieChart as PieChartIcon,
  CreditCard, AlertTriangle, ArrowRight, Filter, Users
} from 'lucide-react';
import { cn } from './lib/utils';
import { UserData } from './contexts/AuthContext';
import { BusinessProductsManager } from './components/BusinessProductsManager';
import { OrdersView } from './components/OrdersView';
import { ScheduleInputs } from './components/ScheduleInputs';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface BusinessData {
  id: string; 
  ownerId: string;
  name: string;
  description: string;
  category: string;
  isOpen: boolean;
  payment_verified: boolean;
  phone: string;
  address: string;
  deliveryArea: string;
  minDeliveryAmount?: string;
  paymentMethod: string;
  schedule: string;
  logoUrl?: string;
  createdAt: number;
}

interface UserDocument extends UserData {
  id: string;
}

export default function AdminDashboard({ viewMode = 'admin' }: { viewMode?: string }) {
  const [users, setUsers] = useState<UserDocument[]>([]);
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'verified'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [commercialStatus, setCommercialStatus] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const u: UserDocument[] = [];
      snap.forEach(d => u.push({ id: d.id, ...d.data() } as UserDocument));
      setUsers(u);
      setIsLoading(false);
    }, err => {
      handleFirestoreError(err, OperationType.LIST, 'users');
      setIsLoading(false);
    });

    const unsubBiz = onSnapshot(collection(db, 'businesses'), (snap) => {
      const b: BusinessData[] = [];
      snap.forEach(d => b.push({ id: d.id, ...d.data() } as BusinessData));
      setBusinesses(b);
    }, err => handleFirestoreError(err, OperationType.LIST, 'businesses'));

    return () => { unsubUsers(); unsubBiz(); };
  }, []);

  const stats = useMemo(() => {
    const allIds = new Set([
      ...users.map(u => u.id),
      ...businesses.map(b => b.id)
    ]);
    let total = 0;
    let verified = 0;
    allIds.forEach(id => {
      const user = users.find(u => u.id === id);
      const business = businesses.find(b => b.id === id);
      // Quitamos el filtro de admin para que todo sea visible
      if (user && user.role === 'user' && !business) return;
      
      total++;
      if (user?.payment_verified === true || business?.payment_verified === true) {
        verified++;
      }
    });

    const pendingCount = total - verified;
    
    // Ahora contamos todos los negocios abiertos sin excepción
    const openCount = businesses.filter(b => b.isOpen === true).length;
    
    return {
      total,
      verified,
      pending: pendingCount,
      open: openCount,
      percentVerified: total ? Math.round((verified / total) * 100) : 0
    };
  }, [users, businesses]);

  const chartData = useMemo(() => {
    const categories: Record<string, number> = {};
    businesses.forEach(b => {
      const cat = b.category || 'OTRO';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [businesses]);

  const rankingData = useMemo(() => {
    // Generate a simple ranking based on "Inventory" (number of products would be better, but we only have category here)
    // Let's just show top categories for data analysis
    return chartData.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [chartData]);

  const pieData = [
    { name: 'Pagados', value: stats.verified, color: '#10b981' },
    { name: 'Pendientes', value: stats.pending, color: '#f59e0b' }
  ];

  const toggleVerification = async (u: UserDocument) => {
    try {
      const newVal = !u.payment_verified;
      // Update User document
      await updateDoc(doc(db, 'users', u.id), { payment_verified: newVal });
      
      // Also update Business document for consistency if it exists
      const hasBiz = businesses.some(b => b.id === u.id);
      if (hasBiz) {
        await updateDoc(doc(db, 'businesses', u.id), { payment_verified: newVal });
      }
      
      alert(`Estado de pago de ${u.name} actualizado a: ${newVal ? 'VERIFICADO' : 'PENDIENTE'}`);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${u.id}`);
    }
  };

  const toggleBusinessOpen = async (b: BusinessData) => {
    try {
      await updateDoc(doc(db, 'businesses', b.id), { isOpen: !b.isOpen });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `businesses/${b.id}`);
    }
  };

  const toggleSystemOrders = async (b: BusinessData) => {
    try {
      const newSystem = b.orderSystem === 'internal' ? 'whatsapp' : 'internal';
      await updateDoc(doc(db, 'businesses', b.id), { orderSystem: newSystem });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `businesses/${b.id}`);
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'businesses', id));
      await deleteDoc(doc(db, 'users', id));
      setDeletingId(null);
      setSelectedId(null);
      alert('Registro eliminado correctamente.');
    } catch (e) {
      console.error('Error en deleteRecord:', e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      alert('Error al eliminar: ' + errorMsg);
      handleFirestoreError(e, OperationType.DELETE, `users/${id}`);
    }
  };

  const records = useMemo(() => {
    const allIds = new Set([
      ...users.map(u => u.id),
      ...businesses.map(b => b.id)
    ]);

    const result: { user: UserDocument | any, business?: BusinessData }[] = [];
    allIds.forEach(id => {
      const user = users.find(u => u.id === id);
      const business = businesses.find(b => b.id === id);
      
      // Permitimos ver todo en la tabla
      if (user && user.role === 'user' && !business) return;

      result.push({
        user: user || { id, name: 'Sin Usuario', email: 'N/A', role: 'owner', payment_verified: business?.payment_verified || false },
        business
      });
    });
    
    return result;
  }, [users, businesses]);

  const selectedRecord = useMemo(() => {
    if (!selectedId || !records.length) return null;
    return records.find(r => r.user.id === selectedId) || null;
  }, [selectedId, records]);

  const filteredRecords = useMemo(() => {
    let result = records;
    
    if (filterMode === 'pending') result = result.filter(r => r.user.payment_verified !== true);
    if (filterMode === 'verified') result = result.filter(r => r.user.payment_verified === true);

    const s = search.toLowerCase();
    if (s) {
      result = result.filter(r => 
        (r.user.name || '').toLowerCase().includes(s) || 
        (r.business?.name || '').toLowerCase().includes(s) ||
        (r.user.email || '').toLowerCase().includes(s)
      );
    }
    return result;
  }, [records, search, filterMode]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 font-sans selection:bg-blue-100">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200 pb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-blue-950 tracking-tight flex items-center gap-4">
            <div className="bg-blue-900 p-2.5 rounded-2xl shadow-xl">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            {viewMode === 'admin' && <>Súper Usuario <span className="text-blue-600 ml-2">Admin</span></>}
            {viewMode === 'analytics' && <>Métricas y <span className="text-blue-600 ml-2">Finanzas</span></>}
            {viewMode === 'support' && <>Centro de <span className="text-blue-600 ml-2">Soporte</span></>}
            {viewMode === 'settings' && <>Configuración <span className="text-blue-600 ml-2">Global</span></>}
          </h1>
          <p className="text-neutral-500 font-medium mt-2 max-w-lg">
            Monitoriza el pulso de la plataforma, valida pagos y gestiona el ecosistema de negocios en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-2xl border border-neutral-100 shadow-sm">
             <p className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em] mb-0.5">Estado de la Red</p>
             <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> SISTEMA ACTIVO
             </div>
          </div>
        </div>
      </div>

      {/* 📈 SECCIÓN DE ANALÍTICAS Y FINANZAS */}
      {viewMode === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Verification Pie Chart */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-100 shadow-sm lg:col-span-1 flex flex-col items-center">
          <h3 className="text-xs font-black uppercase text-neutral-400 tracking-widest text-center mb-4 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-blue-600" /> Estado de Pagos
          </h3>
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-2">
            <p className="text-3xl font-black text-neutral-900">{stats.percentVerified}%</p>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none">Verificados</p>
          </div>
        </div>

        {/* Category Bar Chart */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-100 shadow-sm lg:col-span-2">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                 <BarChart3 className="w-4 h-4 text-blue-600" /> TOP CATEGORÍAS (DEMANDA)
              </h3>
              <p className="text-[10px] font-bold text-blue-900 bg-blue-50 px-3 py-1 rounded-lg">Análisis de Mercado</p>
           </div>
           <div className="w-full h-56">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={rankingData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900 }} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                 <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                 <Bar dataKey="value" fill="#1e3a8a" radius={[6, 6, 0, 0]} barSize={40} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Quick Stats Column */}
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-emerald-500 p-6 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 flex flex-col justify-between h-[48%] relative overflow-hidden group">
            <CheckCircle className="absolute -right-4 -top-4 w-24 h-24 opacity-10 transform rotate-12 group-hover:scale-110 transition-transform" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Activos</p>
            <div>
              <p className="text-4xl font-black leading-none">{stats.open}</p>
              <p className="text-xs font-medium opacity-90 mt-1">Negocios abiertos hoy</p>
            </div>
            <ArrowRight className="w-5 h-5 mt-4 opacity-50 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className={cn(
            "p-6 rounded-[2.5rem] shadow-xl flex flex-col justify-between h-[48%] relative overflow-hidden group transition-all",
            stats.pending > 0 ? "bg-amber-500 text-white shadow-amber-100" : "bg-neutral-900 text-white shadow-neutral-100"
          )}>
            <AlertTriangle className="absolute -right-4 -top-4 w-24 h-24 opacity-10 transform rotate-12 group-hover:scale-110 transition-transform" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Falta de Pago</p>
            <div>
              <p className="text-4xl font-black leading-none">{stats.pending}</p>
              <p className="text-xs font-medium opacity-90 mt-1">Negocios pendientes</p>
            </div>
            <ArrowRight className="w-5 h-5 mt-4 opacity-50 group-hover:translate-x-1 transition-transform" />
          </div>
          </div>
        </div>
      )}

      {/* 👥 SECCIÓN DE USUARIOS Y NEGOCIOS (TABLA) */}
      {viewMode === 'admin' && (
        <div className="bg-white border border-neutral-100 rounded-[3rem] shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-6 md:p-8 border-b border-neutral-50 bg-neutral-50/30 flex flex-col md:flex-row justify-between gap-6 items-center border-t-2 border-emerald-500">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Buscar por negocio o dueño..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-4 bg-white border border-neutral-200 rounded-2xl text-sm font-bold text-neutral-800 outline-none focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
            />
          </div>
          
          <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-x-auto w-full md:w-auto flex-wrap">
            <FilterBtn active={filterMode === 'all'} label="Gral" onClick={() => setFilterMode('all')} count={stats.total} />
            <FilterBtn active={filterMode === 'pending'} label="Pendientes" onClick={() => setFilterMode('pending')} count={stats.pending} />
            <FilterBtn active={filterMode === 'verified'} label="Pagados" onClick={() => setFilterMode('verified')} count={stats.verified} />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto px-6 pb-6 pt-2">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-blue-600/30">
               <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
               <p className="font-black uppercase tracking-widest text-[10px]">Consultando registros maestros...</p>
            </div>
          ) : (
            <>
              <table className="w-full text-left text-sm whitespace-nowrap border-separate border-spacing-y-4">
            <thead>
              <tr className="text-neutral-400 font-black text-[10px] uppercase tracking-[0.2em]">
                <th className="px-6 py-2">Dueño</th>
                <th className="px-6 py-2">Establecimiento</th>
                <th className="px-6 py-2 text-center">Estatus de Pago</th>
                <th className="px-6 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.user.id} className="group transition-all hover:-translate-y-1">
                  <td className="px-4 py-4 md:px-6 md:py-5 bg-white border-y border-l border-neutral-100 rounded-l-[2rem] shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xs border border-blue-100 flex-shrink-0">
                        {record.user.name?.charAt(0) || <Users className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-neutral-900 tracking-tight uppercase leading-none mb-1">{record.user.name || 'Sin Nombre'}</span>
                        <span className="text-[10px] font-bold text-neutral-400 truncate max-w-[120px]">{record.user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 md:px-6 md:py-5 bg-white border-y border-neutral-100 shadow-sm">
                    {record.business ? (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <Store className="w-4 h-4 text-blue-600" />
                          <span className="font-black text-blue-950 uppercase tracking-tighter text-base leading-none">{record.business.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-100">{record.business.category}</span>
                           <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md", record.business.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                             {record.business.isOpen ? 'Abierto' : 'Cerrado'}
                           </span>
                           <button 
                             onClick={() => toggleSystemOrders(record.business!)}
                             className={cn(
                               "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md transition-all active:scale-95",
                               record.business.orderSystem === 'internal' ? "bg-blue-600 text-white shadow-sm" : "bg-blue-50 text-blue-400 border border-blue-100"
                             )}
                           >
                             {record.business.orderSystem === 'internal' ? '💻 Sistema ON' : '💬 Solo WhatsApp'}
                           </button>
                        </div>
                      </div>
                    ) : (
                      <span className="bg-neutral-50 px-3 py-1.5 rounded-xl text-neutral-400 font-black text-[10px] uppercase tracking-widest border border-dashed border-neutral-200">Sin Datos Comerciales</span>
                    )}
                  </td>
                  <td className="px-4 py-4 md:px-6 md:py-5 bg-white border-y border-neutral-100 shadow-sm text-center">
                    <button 
                      onClick={() => toggleVerification(record.user)}
                      className={cn(
                        "inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all active:scale-95 shadow-sm uppercase tracking-widest border-2",
                        record.user.payment_verified === true
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100" 
                          : "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 shadow-md ring-2 ring-amber-100"
                      )}
                    >
                      {record.user.payment_verified === true ? <CheckCircle className="w-3.5 h-3.5"/> : <CreditCard className="w-3.5 h-3.5"/>}
                      {record.user.payment_verified === true ? 'Alta Confirmada' : 'Pendiente de Pago'}
                    </button>
                  </td>
                  <td className="px-4 py-4 md:px-6 md:py-5 bg-white border-y border-r border-neutral-100 rounded-r-[2rem] shadow-sm text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => setSelectedId(record.user.id)}
                        className="px-6 py-3 bg-blue-900 text-white hover:bg-black rounded-2xl text-[10px] font-black transition-all shadow-lg shadow-blue-100 uppercase tracking-widest active:scale-95"
                      >
                        Gestionar
                      </button>
                      <button 
                        onClick={() => setDeletingId(record.user.id)}
                        className="p-3 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"
                        title="Eliminar Expediente"
                      >
                        <Trash2 className="w-6 h-6" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRecords.length === 0 && (
            <div className="text-center p-32 text-neutral-300">
               <Search className="w-20 h-20 mx-auto mb-6 opacity-5" />
               <p className="font-black uppercase tracking-tighter text-lg">Sin resultados para tu búsqueda</p>
            </div>
          )}
        </>
      )}
    </div>
  </div>
)}
      {/* 📦 SECCIÓN DE PEDIDOS (ADMIN - GLOBAL O PERSONAL) */}
      {(viewMode === 'orders' || viewMode === 'my-orders') && (
        <OrdersView viewMode={viewMode} />
      )}

      {/* 💬 SECCIÓN DE SOPORTE Y MENSAJES */}
      {viewMode === 'support' && (
        <div className="bg-white border border-neutral-100 rounded-[3rem] shadow-sm p-8 md:p-16 text-center space-y-6">
           <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-12 h-12 text-blue-600" />
           </div>
           <h2 className="text-3xl font-black text-blue-950 uppercase tracking-tighter">¿Necesitas ayuda con el sistema?</h2>
           <p className="text-neutral-500 max-w-lg mx-auto font-medium">
             Este es tu canal directo de comunicación con soporte técnico. Si algo falla o necesitas implementar nuevas funciones, contáctame:
            </p>
           <div className="flex flex-col items-center gap-4 pt-6">
             <a href="https://wa.me/5215620950668" target="_blank" rel="noopener noreferrer" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-200">
               Enviar WhatsApp a Soporte
             </a>
             <p className="text-sm font-bold text-neutral-400">Email: seramoco@gmail.com</p>
           </div>
        </div>
      )}

      {/* ⚙️ SECCIÓN DE CONFIGURACIÓN GLOBAL (RECOMENDACIONES) */}
      {viewMode === 'settings' && (
        <div className="bg-white border border-neutral-100 rounded-[3rem] shadow-sm p-8 md:p-12">
           <h2 className="text-2xl font-black text-blue-950 uppercase tracking-tighter mb-8 border-b border-neutral-100 pb-6">Ajustes del Ecosistema</h2>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-4">
                <div className="bg-blue-50 p-6 rounded-3xl">
                  <h3 className="font-black text-blue-900 uppercase text-sm mb-2">Costos de Suscripción</h3>
                  <p className="text-xs text-blue-700/80 mb-4">Define cuánto vas a cobrar mensual o anualmente a los negocios por estar en NegocioYa.</p>
                  <input type="text" placeholder="$0.00 MXN / Mes" disabled className="w-full bg-white rounded-xl p-3 text-sm font-bold cursor-not-allowed opacity-50" />
                </div>
                <div className="bg-purple-50 p-6 rounded-3xl">
                  <h3 className="font-black text-purple-900 uppercase text-sm mb-2">Categorías Permitidas</h3>
                  <p className="text-xs text-purple-700/80 mb-4">Añade o quita categorías (Comida, Salud, etc.) según lo que más pida la gente.</p>
                  <button disabled className="bg-purple-200 text-purple-600 px-4 py-2 rounded-xl text-xs font-bold uppercase w-full opacity-50">Gestionar Etiquetas</button>
                </div>
             </div>
             
             <div className="space-y-4">
                <div className="bg-emerald-50 p-6 rounded-3xl">
                  <h3 className="font-black text-emerald-900 uppercase text-sm mb-2">Datos Bancarios para Cobros</h3>
                  <p className="text-xs text-emerald-700/80 mb-4">Las cuentas donde los negocios te depositarán su membresía antes de que los actives.</p>
                  <input type="text" placeholder="CLABE o Tarjeta" disabled className="w-full bg-white rounded-xl p-3 text-sm font-bold cursor-not-allowed opacity-50" />
                </div>
                <div className="bg-amber-50 p-6 rounded-3xl">
                  <h3 className="font-black text-amber-900 uppercase text-sm mb-2">Reglas de Suspensión</h3>
                  <p className="text-xs text-amber-700/80 mb-4">¿Cuántos días de gracia le das a un negocio antes de ocultarlo si no paga?</p>
                  <input type="text" placeholder="Ej. 5 días" disabled className="w-full bg-white rounded-xl p-3 text-sm font-bold cursor-not-allowed opacity-50" />
                </div>
             </div>
           </div>
           
           <div className="mt-8 text-center border-t border-neutral-100 pt-8">
             <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
               * Estas funciones requieren desarrollo de base de datos *
             </p>
           </div>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-2xl z-50 flex items-center justify-center p-0 md:p-12 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-neutral-50 w-full lg:max-w-7xl md:rounded-[4rem] shadow-2xl border border-white/30 overflow-hidden flex flex-col my-auto"
            >
              {/* Profile Header */}
              <div className="sticky top-0 z-50 p-6 md:p-10 bg-blue-900 text-white flex justify-between items-center relative overflow-hidden border-b-4 border-emerald-500 shadow-xl">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-pulse"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
                   <div className="hidden md:flex w-20 h-20 bg-white/10 rounded-[2.5rem] items-center justify-center backdrop-blur-xl border border-white/20 shadow-inner">
                      <Settings className="w-10 h-10 text-pink-400" />
                   </div>
                   <div>
                      <h2 className="text-2xl md:text-4xl font-black tracking-tighter uppercase leading-none mb-2">Expediente de Negocio</h2>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-blue-300 font-black tracking-[0.4em] uppercase opacity-70 truncate max-w-[200px] md:max-w-full">UID: {selectedRecord.user.id}</span>
                      </div>
                   </div>
                </div>
                <button 
                  onClick={() => setSelectedId(null)}
                  className="relative z-10 p-4 md:p-6 bg-red-500/20 md:bg-transparent hover:bg-white/10 rounded-2xl md:rounded-3xl transition-all active:scale-95 group border border-white/10 backdrop-blur-md shadow-2xl"
                >
                  <X className="w-6 h-6 md:w-8 md:h-8 group-hover:rotate-90 transition-transform text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-16 space-y-12 md:space-y-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                   {/* Finance and Identity */}
                   <div className="space-y-6 md:space-y-8">
                      <Header label="Identidad Legal y Estado" icon={<Users className="w-5 h-5" />} />
                      <div className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-neutral-100 shadow-sm space-y-8">
                        <form 
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            try {
                              await updateDoc(doc(db, 'users', selectedRecord.user.id), {
                                name: formData.get('name'),
                                phone: formData.get('phone'),
                              });
                              alert('✅ Perfil actualizado con éxito');
                            } catch (err) {
                              handleFirestoreError(err, OperationType.UPDATE, `users/${selectedRecord.user.id}`);
                            }
                          }}
                          className="space-y-8"
                        >
                           <Field label="Responsable Legítimo" name="name" defaultValue={selectedRecord.user.name} />
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <Field label="Vía de Contacto" name="phone" defaultValue={selectedRecord.user.phone} />
                             <Field label="Email de Cuenta" name="email" defaultValue={selectedRecord.user.email} readOnly />
                           </div>
                          
                           <div className="pt-8 border-t border-neutral-50 space-y-6">
                             <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                               <div className="flex flex-col gap-2">
                                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Vigencia de Membresía del Dueño</p>
                                  <button 
                                    type="button"
                                    onClick={() => toggleVerification(selectedRecord.user)}
                                    className={cn(
                                      "flex items-center gap-3 px-6 py-2.5 rounded-2xl border-2 transition-all shadow-sm active:scale-95 group",
                                      selectedRecord.user.payment_verified === true ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100" : "bg-amber-50 text-amber-600 border-amber-200 animate-pulse hover:bg-amber-100"
                                    )}>
                                     <div className={cn("w-2.5 h-2.5 rounded-full shadow-inner", selectedRecord.user.payment_verified === true ? "bg-emerald-500" : "bg-amber-500")} />
                                     <span className="text-[11px] font-black uppercase tracking-widest">
                                        {selectedRecord.user.payment_verified === true ? 'Pago del Dueño: OK' : 'Marcar Pago Dueño'}
                                     </span>
                                  </button>
                               </div>

                               {selectedRecord.business && (
                                 <div className="flex flex-col gap-2">
                                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Vigencia de este Negocio</p>
                                    <button 
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          const newVal = !(selectedRecord.business?.payment_verified);
                                          await updateDoc(doc(db, 'businesses', selectedRecord.user.id), { payment_verified: newVal });
                                          alert('✅ Estado del negocio actualizado');
                                        } catch (err) {
                                          handleFirestoreError(err, OperationType.UPDATE, `businesses/${selectedRecord.user.id}`);
                                        }
                                      }}
                                      className={cn(
                                        "flex items-center gap-3 px-6 py-2.5 rounded-2xl border-2 transition-all shadow-sm active:scale-95 group",
                                        selectedRecord.business.payment_verified === true ? "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100" : "bg-amber-50 text-amber-600 border-amber-200 animate-pulse hover:bg-amber-100"
                                      )}>
                                       <div className={cn("w-2.5 h-2.5 rounded-full shadow-inner", selectedRecord.business.payment_verified === true ? "bg-blue-500" : "bg-amber-500")} />
                                       <span className="text-[11px] font-black uppercase tracking-widest">
                                          {selectedRecord.business.payment_verified === true ? 'Estatus Negocio: PAGADO' : 'Marcar Negocio Pagado'}
                                       </span>
                                    </button>
                                 </div>
                               )}
                             </div>
                             
                             <div className="flex justify-end pt-4">
                               <button type="submit" className="w-full md:w-auto bg-blue-900 text-white px-10 py-4 rounded-3xl text-[11px] font-black hover:bg-black transition-all shadow-2xl shadow-blue-100 uppercase tracking-[0.2em] active:scale-95">
                                 Guardar Datos Personales
                               </button>
                             </div>
                           </div>
                        </form>
                      </div>
                   </div>

                   {/* Commercial Activity */}
                   <div className="space-y-6 md:space-y-8">
                      <Header label="Estructura Comercial" icon={<Store className="w-5 h-5" />} />
                      <div className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-neutral-100 shadow-sm space-y-8">
                        {selectedRecord.business ? (
                          <form 
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const formData = new FormData(e.currentTarget);
                              try {
                                  await updateDoc(doc(db, 'businesses', selectedRecord.user.id), {
                                    name: formData.get('name'),
                                    description: formData.get('description'),
                                    category: formData.get('category'),
                                    address: formData.get('address'),
                                    deliveryArea: formData.get('deliveryArea'),
                                    minDeliveryAmount: formData.get('minDeliveryAmount'),
                                    paymentMethod: formData.get('paymentMethod'),
                                    schedule: formData.get('schedule') as string,
                                  });
                                setCommercialStatus('✅ Cambios guardados correctamente');
                                setTimeout(() => setCommercialStatus(null), 3000);
                              } catch (err) {
                                handleFirestoreError(err, OperationType.UPDATE, `businesses/${selectedRecord.user.id}`);
                              }
                            }}
                            className="space-y-8"
                          >
                             {commercialStatus && (
                                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-xs font-black text-center animate-pulse">
                                  {commercialStatus}
                                </div>
                             )}
                             <div className="flex justify-between items-center gap-4">
                                <div className="bg-blue-900 px-6 py-2 rounded-2xl text-[10px] font-black text-white uppercase tracking-[0.3em] shadow-lg">
                                   {selectedRecord.business?.category}
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => selectedRecord.business && toggleBusinessOpen(selectedRecord.business)}
                                  className={cn(
                                    "px-6 py-2 rounded-2xl transition-all border-2 active:scale-95 font-black text-[10px] uppercase tracking-widest flex items-center gap-3",
                                    selectedRecord.business?.isOpen 
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                      : "bg-red-50 text-red-600 border-red-100"
                                  )}
                                >
                                  {selectedRecord.business?.isOpen ? 'Negocio Abierto' : 'Negocio Cerrado'}
                                  <div className={cn("w-2 h-2 rounded-full", selectedRecord.business?.isOpen ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                                </button>
                             </div>

                             <Field label="Nombre del Establecimiento" name="name" defaultValue={selectedRecord.business?.name} />
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em] ml-2">Misión y Visión Comercial</label>
                                <textarea name="description" defaultValue={selectedRecord.business?.description} className="w-full bg-neutral-50 rounded-[2rem] border border-neutral-100 p-6 text-xs font-semibold text-neutral-600 outline-none focus:ring-4 focus:ring-blue-100 transition-all min-h-[120px] shadow-inner" />
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Field label="Rubro Comercial" name="category" defaultValue={selectedRecord.business?.category} isSelect options={['COMIDA', 'RETAIL', 'SALUD', 'SERVICIOS']} />
                                <Field label="Zona de Entrega" name="deliveryArea" defaultValue={selectedRecord.business?.deliveryArea} />
                                <Field label="Envías a partir de (Opcional)" name="minDeliveryAmount" defaultValue={selectedRecord.business?.minDeliveryAmount || ''} />
                                <Field label="Forma de Pago" name="paymentMethod" defaultValue={selectedRecord.business?.paymentMethod} />
                                <Field label="Dirección Física" name="address" defaultValue={selectedRecord.business?.address} />
                             </div>
                             
                             <ScheduleInputs initialValue={selectedRecord.business?.schedule} />

                             <div className="pt-8 border-t border-neutral-50 flex justify-end">
                                <button type="submit" className="w-full md:w-auto bg-emerald-500 text-white px-10 py-4 rounded-3xl text-[11px] font-black hover:bg-emerald-600 transition-all shadow-2xl shadow-emerald-100 uppercase tracking-[0.2em] active:scale-95">
                                  Guardar Comercial
                                </button>
                             </div>
                          </form>
                        ) : (
                          <div className="py-24 text-center text-neutral-300">
                             <AlertTriangle className="w-16 h-16 mx-auto mb-6 opacity-5" />
                             <p className="font-black uppercase tracking-tighter text-sm">Sin configuración activa</p>
                          </div>
                        )}
                      </div>
                   </div>
                </div>

                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                   <h3 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tighter uppercase">Productos de este Negocio</h3>
                   <div className="h-0.5 bg-neutral-100 flex-1 hidden md:block" />
                 </div>
                 <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] border border-neutral-100 shadow-sm p-4">
                   <BusinessProductsManager businessId={selectedRecord.user.id} />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-neutral-950/60 backdrop-blur-md"
                onClick={() => setDeletingId(null)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl border border-neutral-100 text-center space-y-6"
              >
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Trash2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-neutral-900 tracking-tight uppercase">¿ELIMINAR TODO?</h3>
                  <p className="text-neutral-500 font-medium leading-relaxed">
                    Esta acción borrará permanentemente al usuario y toda la configuración de su negocio. No se puede revertir.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => deleteRecord(deletingId)}
                    className="w-full py-4 bg-red-600 hover:bg-black text-white font-black rounded-2xl transition-all shadow-xl shadow-red-100 uppercase tracking-widest text-xs"
                  >
                    Confirmar Eliminación
                  </button>
                  <button 
                    onClick={() => setDeletingId(null)}
                    className="w-full py-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 font-bold rounded-2xl transition-all uppercase tracking-widest text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

function Header({ label, icon }: { label: string, icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 mb-4 ml-4">
      <div className="bg-blue-100 p-3 rounded-2xl text-blue-900 shadow-sm">
        {icon}
      </div>
      <h3 className="text-xl font-black text-blue-950 uppercase tracking-tighter">{label}</h3>
    </div>
  );
}

function FilterBtn({ active, label, onClick, count }: { active: boolean, label: string, onClick: () => void, count: number }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-6 py-3 rounded-2xl text-[10px] font-black transition-all flex items-center gap-3 uppercase tracking-widest shrink-0",
        active 
          ? "bg-blue-950 text-white shadow-xl shadow-blue-100" 
          : "bg-white text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 shadow-sm border border-neutral-100"
      )}
    >
      {label}
      <span className={cn(
        "px-2 py-0.5 rounded-lg text-[10px] font-black tracking-normal border", 
        active ? "bg-white/10 border-white/20 text-white" : "bg-neutral-50 border-neutral-200 text-neutral-500 shadow-inner"
      )}>
        {count}
      </span>
    </button>
  );
}

function Field({ label, name, defaultValue, readOnly, isSelect, options, placeholder, pattern }: { label: string, name: string, defaultValue?: string, readOnly?: boolean, isSelect?: boolean, options?: string[], placeholder?: string, pattern?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em] ml-2">{label}</label>
      {isSelect ? (
        <select 
          name={name} 
          defaultValue={defaultValue} 
          className="w-full bg-neutral-50 rounded-[1.5rem] border border-neutral-100 p-4 text-xs font-black text-neutral-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-inner"
        >
          {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <div className="relative group">
          <input 
            name={name} 
            readOnly={readOnly}
            defaultValue={defaultValue} 
            placeholder={placeholder}
            pattern={pattern}
            type="text"
            className={cn(
              "w-full rounded-[1.5rem] border p-4 text-xs font-black transition-all shadow-inner outline-none",
              readOnly 
                ? "bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed" 
                : "bg-neutral-50 text-neutral-950 border-neutral-100 focus:ring-4 focus:ring-blue-100"
            )} 
          />
          {readOnly && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Settings className="w-3 h-3 text-neutral-300" /></div>}
        </div>
      )}
    </div>
  );
}
