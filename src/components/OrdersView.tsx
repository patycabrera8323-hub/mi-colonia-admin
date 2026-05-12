import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { PackageOpen, Clock, ChefHat, CheckCircle2, MapPin, ShoppingBag, Phone, MessageSquare, Truck, Bike, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface OrderData {
  id: string;
  clientId: string;
  storeId: string;
  storeName?: string;
  status: 'pending' | 'preparing' | 'delivered' | 'completed';
  deliveryLocation?: {
    address: string;
    lat: number;
    lng: number;
  };
  pickupLocation?: {
    address: string;
    lat: number;
    lng: number;
  };
  items: OrderItem[];
  total: number;
  paymentMethod: string;
  createdAt: any;
  driverId: string | null;
  notes?: string;
}

const statusConfig = {
  pending: { label: 'Orden Recibida', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  preparing: { label: 'Preparando Orden', icon: ChefHat, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  accepted: { label: 'Repartidor Asignado', icon: Truck, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  picked_up: { label: 'Pedido Recolectado', icon: ShoppingBag, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  on_way: { label: 'Repartidor en Camino', icon: Bike, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  delivered: { label: 'Entregado a Cliente', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  completed: { label: 'Compra Finalizada', icon: ShoppingBag, color: 'text-neutral-500', bg: 'bg-neutral-100', border: 'border-neutral-200' },
};

export function OrdersView({ viewMode }: { viewMode: string }) {
  const { user, isAdmin } = useAuth();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [drivers, setDrivers] = useState<Record<string, string>>({}); // {id: name}
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const prevOrdersRef = React.useRef<OrderData[]>([]);

  useEffect(() => {
    // Fetch driver names map
    const unsubDrivers = onSnapshot(collection(db, 'drivers'), (snap) => {
      const driverMap: Record<string, string> = {};
      snap.forEach(doc => {
        driverMap[doc.id] = doc.data().name || 'Repartidor';
      });
      setDrivers(driverMap);
    });
    return () => unsubDrivers();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Request notification permission
    if ("Notification" in window) {
      Notification.requestPermission();
    }

    let q;
    if (isAdmin && viewMode !== 'my-orders') {
      q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'orders'), where('storeId', '==', user.uid), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData: OrderData[] = [];
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const newData = change.doc.data() as OrderData;
          const oldData = prevOrdersRef.current.find(o => o.id === change.doc.id);
          
          // Trigger notification if status changed to accepted
          if (newData.status === 'accepted' && (!oldData || oldData.status !== 'accepted')) {
            sendNotification(`¡Pedido Aceptado!`, `El repartidor ha tomado el pedido #${change.doc.id.slice(0,6)}`);
          }
        }
      });

      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() } as OrderData);
      });

      ordersData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
        return timeB - timeA;
      });

      prevOrdersRef.current = ordersData;
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAdmin]); // Removed orders from deps

  const sendNotification = (title: string, body: string) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    // Play sound first (always works if tab is open)
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (ae) {}

    // Show visual notification
    try {
      if (navigator.serviceWorker && Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body,
            icon: '/logo.png',
            vibrate: [200, 100, 200],
            tag: 'order-update',
            renotify: true
          });
        });
      } else {
        const n = new Notification(title, { body, icon: '/logo.png' });
        setTimeout(() => n.close(), 5000);
      }
    } catch (e) {
      console.warn("Error showing notification:", e);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'pending' | 'preparing' | 'delivered' | 'completed') => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Fecha desconocida';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('es-MX', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-neutral-400 font-medium">Cargando pedidos...</div>;
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const today = new Date();
  const todayTotal = orders
    .filter(o => o.status === 'completed')
    .filter(o => {
      if (!o.createdAt) return false;
      const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      return isSameDay(d, today);
    })
    .reduce((acc, o) => acc + (o.total || 0), 0);

  const activeOrders = orders.filter(o => o.status !== 'completed');
  const historyOrders = orders.filter(o => o.status === 'completed');

  const displayedOrders = showHistory ? historyOrders : activeOrders;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h2 className="text-2xl font-black text-blue-950 uppercase tracking-tighter flex items-center gap-3">
          <PackageOpen className="w-8 h-8 text-blue-600" />
          {isAdmin ? 'Todos los Pedidos' : 'Gestión de Pedidos'}
        </h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if ("Notification" in window) {
                Notification.requestPermission().then(permission => {
                  if (permission === "granted") {
                    sendNotification("Sistema Activo", "Ahora recibirás avisos de los repartidores.");
                  }
                });
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-100 transition-all"
          >
            <Clock className="w-3.5 h-3.5" /> Activar Avisos
          </button>
          
          <button 
            onClick={() => sendNotification("Prueba de Sonido", "Si escuchas esto, las notificaciones están activas.")}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-50 text-neutral-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-neutral-100 hover:bg-neutral-100 transition-all"
          >
            <Zap className="w-3.5 h-3.5" /> Probar
          </button>
          {!isAdmin && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-600/70">Ventas Hoy</span>
              <span className="font-black text-lg">${todayTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex bg-neutral-100 p-1 rounded-2xl">
            <button
              onClick={() => setShowHistory(false)}
              className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", !showHistory ? "bg-white text-blue-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900")}
            >
              Activos ({activeOrders.length})
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", showHistory ? "bg-white text-blue-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900")}
            >
              Historial ({historyOrders.length})
            </button>
          </div>
        </div>
      </div>

      {displayedOrders.length === 0 ? (
        <div className="bg-white border border-neutral-100 rounded-3xl p-12 text-center shadow-sm">
          <ShoppingBag className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
          <h3 className="text-xl font-black text-neutral-800 uppercase tracking-tight">
            {showHistory ? 'Sin Historial' : 'Sin Pedidos Activos'}
          </h3>
          <p className="text-neutral-500 mt-2 font-medium">
            {showHistory ? 'Aquí aparecerán los pedidos finalizados.' : 'Cuando los clientes realicen compras, aparecerán aquí.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {displayedOrders.map((order) => {
              const currentStatus = order.status || 'pending';
              const config = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.pending;
              const StatusIcon = config.icon;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={cn("bg-white border rounded-[2rem] p-6 shadow-sm flex flex-col transition-all", config.border)}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-1">ID: {order.id.slice(0, 6)}</p>
                      <h3 className="font-black text-neutral-900 text-lg uppercase leading-tight">{order.clientId}</h3>
                      <p className="text-xs text-neutral-500 font-medium flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" /> {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className={cn("px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-black uppercase tracking-wider", config.bg, config.color)}>
                      <StatusIcon className="w-4 h-4" />
                      {config.label}
                    </div>
                  </div>

                  {isAdmin && order.storeName && (
                    <div className="mb-4 text-[10px] font-black bg-neutral-50 px-3 py-2 rounded-xl text-neutral-400 border border-neutral-100 flex items-center justify-between">
                      <span>🏪 ESTABLECIMIENTO:</span>
                      <span className="text-blue-600 uppercase tracking-tighter">{order.storeName}</span>
                    </div>
                  )}

                  {order.driverId && (
                    <div className="mb-4 text-[10px] font-black bg-cyan-50 px-3 py-2 rounded-xl text-cyan-600 border border-cyan-100 flex items-center justify-between animate-pulse">
                      <span>🚚 REPARTIDOR ASIGNADO:</span>
                      <span className="uppercase tracking-tighter">{drivers[order.driverId] || 'Cargando...'}</span>
                    </div>
                  )}

                  {/* Items */}
                  <div className="flex-1 bg-neutral-50 rounded-2xl p-4 mb-4 border border-neutral-100/50">
                    <ul className="space-y-3">
                      {order.items?.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-start text-sm">
                          <span className="font-bold text-neutral-700">
                            <span className="text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded mr-2 text-xs">{item.quantity}x</span>
                            {item.name}
                          </span>
                          <span className="font-black text-neutral-900">${(item.price * item.quantity).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 pt-3 border-t border-neutral-200 flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-neutral-500 tracking-widest">Total</span>
                      <span className="text-xl font-black text-emerald-600">${(order.total || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Address */}
                  {order.deliveryLocation?.address && (
                    <div className="mb-4 flex items-start gap-2 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                      <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs font-medium text-blue-900 leading-relaxed">{order.deliveryLocation.address}</p>
                    </div>
                  )}
                  
                  {/* Order Notes / Comments */}
                  {order.notes && (
                    <div className="mb-6 bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Comentarios del Cliente
                      </p>
                      <p className="text-sm font-medium text-amber-900 leading-relaxed italic">
                        "{order.notes}"
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {order.status !== 'completed' ? (
                    <div className="mt-auto">
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 text-center">Cambiar Estado</p>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                          onClick={() => updateOrderStatus(order.id, 'pending')}
                          className={cn("py-2 rounded-xl text-xs font-black uppercase transition-all border-2", 
                            currentStatus === 'pending' ? "bg-amber-100 border-amber-200 text-amber-700" : "bg-white border-neutral-100 text-neutral-400 hover:border-amber-200 hover:text-amber-600"
                          )}
                        >
                          Recibida
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                          className={cn("py-2 rounded-xl text-xs font-black uppercase transition-all border-2", 
                            currentStatus === 'preparing' ? "bg-blue-100 border-blue-200 text-blue-700" : "bg-white border-neutral-100 text-neutral-400 hover:border-blue-200 hover:text-blue-600"
                          )}
                        >
                          Preparando
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => updateOrderStatus(order.id, 'delivered')}
                          className={cn("py-2 rounded-xl text-xs font-black uppercase transition-all border-2", 
                            currentStatus === 'delivered' ? "bg-emerald-100 border-emerald-200 text-emerald-700" : "bg-white border-neutral-100 text-neutral-400 hover:border-emerald-200 hover:text-emerald-600"
                          )}
                        >
                          A Repartidor
                        </button>
                        <button
                          onClick={() => {
                            if(confirm("¿Estás seguro de marcar esta orden como finalizada? Se moverá al historial y sumará a tus ventas del día.")) {
                              updateOrderStatus(order.id, 'completed')
                            }
                          }}
                          className="py-2 rounded-xl text-xs font-black uppercase transition-all border-2 bg-neutral-900 border-black text-white hover:bg-neutral-800"
                        >
                          Finalizar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-auto pt-4 border-t border-neutral-100 text-center">
                       <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Esta orden está en el historial</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
