import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { CheckCircle, XCircle, Clock, Truck, Phone, MapPin, User, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface DriverData {
  id: string;
  name: string;
  age?: number;
  address?: string;
  phone?: string;
  email: string;
  approved: boolean;
  createdAt?: any;
}

export function DriversView() {
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'drivers'), (snap) => {
      const data: DriverData[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as DriverData));
      setDrivers(data.sort((a, b) => (a.approved ? 1 : -1) - (b.approved ? 1 : -1)));
      setIsLoading(false);
    }, (err) => {
      console.error('Error loading drivers:', err);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleApproval = async (driver: DriverData) => {
    setToggling(driver.id);
    try {
      await updateDoc(doc(db, 'drivers', driver.id), { approved: !driver.approved });
    } catch (e) {
      alert('Error al actualizar el estado del repartidor.');
    } finally {
      setToggling(null);
    }
  };

  const filtered = drivers.filter(d => {
    if (filter === 'pending') return !d.approved;
    if (filter === 'approved') return d.approved;
    return true;
  }).filter(d =>
    !search || 
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase()) ||
    d.phone?.includes(search)
  );

  const pending = drivers.filter(d => !d.approved).length;
  const approved = drivers.filter(d => d.approved).length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200 pb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-blue-950 tracking-tight flex items-center gap-4">
            <div className="bg-blue-900 p-2.5 rounded-2xl shadow-xl">
              <Truck className="w-8 h-8 text-white" />
            </div>
            Repartidores <span className="text-blue-600 ml-2">Registrados</span>
          </h1>
          <p className="text-neutral-500 font-medium mt-2">
            Gestiona las solicitudes de repartidores. Solo los aprobados pueden operar.
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          <div className="bg-white border border-amber-100 shadow-sm rounded-2xl px-5 py-3 text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-0.5">Pendientes</p>
            <p className="text-2xl font-black text-amber-600">{pending}</p>
          </div>
          <div className="bg-white border border-emerald-100 shadow-sm rounded-2xl px-5 py-3 text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-0.5">Aprobados</p>
            <p className="text-2xl font-black text-emerald-600">{approved}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-100 rounded-[3rem] shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 md:p-8 border-b border-neutral-50 bg-neutral-50/30 flex flex-col md:flex-row justify-between gap-4 items-center border-t-2 border-blue-700">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo o teléfono..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-4 bg-white border border-neutral-200 rounded-2xl text-sm font-bold text-neutral-800 outline-none focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-neutral-200 shadow-sm">
            {([['all', 'Todos', drivers.length], ['pending', 'Pendientes', pending], ['approved', 'Aprobados', approved]] as const).map(([id, label, count]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  filter === id ? "bg-blue-900 text-white shadow-md" : "text-neutral-400 hover:bg-neutral-50"
                )}
              >
                {label} <span className={cn("ml-1 px-1.5 py-0.5 rounded-full text-[9px]", filter === id ? "bg-white/20" : "bg-neutral-100")}>{count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-x-auto px-6 pb-6 pt-2">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center text-blue-600/30">
              <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="font-black uppercase tracking-widest text-[10px]">Cargando repartidores...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-24 text-neutral-300">
              <Truck className="w-16 h-16 mx-auto mb-4 opacity-10" />
              <p className="font-black uppercase tracking-tighter">Sin repartidores registrados</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap border-separate border-spacing-y-3">
              <thead>
                <tr className="text-neutral-400 font-black text-[10px] uppercase tracking-[0.2em]">
                  <th className="px-6 py-2">Repartidor</th>
                  <th className="px-6 py-2">Contacto</th>
                  <th className="px-6 py-2">Datos</th>
                  <th className="px-6 py-2 text-center">Estado</th>
                  <th className="px-6 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(driver => (
                  <tr key={driver.id} className="group transition-all hover:-translate-y-0.5">
                    <td className="px-4 py-4 bg-white border-y border-l border-neutral-100 rounded-l-[2rem] shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-700 font-black text-lg border border-blue-100 flex-shrink-0">
                          {driver.name?.charAt(0) || <User className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-black text-neutral-900 tracking-tight leading-none mb-1">{driver.name || 'Sin nombre'}</p>
                          <p className="text-[10px] font-bold text-neutral-400 truncate max-w-[160px]">{driver.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-neutral-100 shadow-sm">
                      <div className="flex flex-col gap-1">
                        {driver.phone && (
                          <div className="flex items-center gap-1.5 text-neutral-500">
                            <Phone className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">{driver.phone}</span>
                          </div>
                        )}
                        {driver.address && (
                          <div className="flex items-center gap-1.5 text-neutral-500">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium truncate max-w-[180px]">{driver.address}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-neutral-100 shadow-sm">
                      {driver.age && (
                        <span className="text-[10px] font-black text-neutral-400 bg-neutral-50 border border-neutral-100 px-3 py-1 rounded-xl">
                          {driver.age} años
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-neutral-100 shadow-sm text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        driver.approved
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                      )}>
                        {driver.approved
                          ? <><CheckCircle className="w-3 h-3" /> Aprobado</>
                          : <><Clock className="w-3 h-3" /> Pendiente</>
                        }
                      </span>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-r border-neutral-100 rounded-r-[2rem] shadow-sm text-right">
                      <button
                        onClick={() => toggleApproval(driver)}
                        disabled={toggling === driver.id}
                        className={cn(
                          "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm border-2 disabled:opacity-50",
                          driver.approved
                            ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                            : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                        )}
                      >
                        {toggling === driver.id ? '...' : driver.approved ? '✕ Revocar' : '✓ Autorizar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
