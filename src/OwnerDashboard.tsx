import React, { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { doc, onSnapshot, collection, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { AlertCircle, Store, PackageOpen, Plus, Trash2, Edit2, CheckCircle2, MapPin, Clock, Phone, Settings, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useNavigate } from 'react-router-dom';
import { ScheduleInputs } from './components/ScheduleInputs';
import { OrdersView } from './components/OrdersView';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface BusinessData {
  ownerId: string;
  name: string;
  description: string;
  category: string;
  isOpen: boolean;
  phone: string;
  address: string;
  deliveryArea: string;
  minDeliveryAmount?: string;
  paymentMethod: string;
  schedule: string;
  logoUrl?: string;
  acceptsSystemOrders?: boolean;
  createdAt: number;
}

interface ProductData {
  id: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  createdAt: number;
  imageUrl?: string;
  views?: number;
}

export default function OwnerDashboard({ viewMode = 'owner' }: { viewMode?: string }) {
  const { user, userData, isAdmin } = useAuth();
  const navigate = useNavigate();
   const [business, setBusiness] = useState<BusinessData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Product Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pImage, setPImage] = useState('');

  // Business Form State
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [bName, setBName] = useState('');
  const [bDesc, setBDesc] = useState('');
  const [bCat, setBCat] = useState('');
  const [bPhone, setBPhone] = useState('');
  const [bAddr, setBAddr] = useState('');
  const [bDelivery, setBDelivery] = useState('');
  const [bMinDelivery, setBMinDelivery] = useState('');
  const [bSched, setBSched] = useState('');
  const [bPayment, setBPayment] = useState('');
  const [bLogo, setBLogo] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'product') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = type === 'logo' ? 200 : 400;
        const MAX_HEIGHT = type === 'logo' ? 200 : 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to tiny size for Firestore
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        if (type === 'logo') setBLogo(dataUrl);
        else setPImage(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageUpload(e, 'product');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageUpload(e, 'logo');
  };


  useEffect(() => {
    if (!user) return;
    
    // Subscribe to Business
    const bRef = doc(db, 'businesses', user.uid);
    const unsubB = onSnapshot(bRef, (docSnap) => {
      if (docSnap.exists()) {
        setBusiness(docSnap.data() as BusinessData);
      }
      setIsLoaded(true);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `businesses/${user.uid}`);
      setIsLoaded(true);
    });

    // Subscribe to Products
    const pRef = collection(db, 'businesses', user.uid, 'products');
    const unsubP = onSnapshot(pRef, (snap) => {
      const prods: ProductData[] = [];
      snap.forEach((d) => prods.push({ id: d.id, ...d.data() } as ProductData));
      setProducts(prods);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `businesses/${user.uid}/products`));

    unsubBRef.current = unsubB;
    unsubPRef.current = unsubP;

    return () => {
      unsubB();
      unsubP();
    };
  }, [user]);

  const unsubBRef = React.useRef<() => void>();
  const unsubPRef = React.useRef<() => void>();

  const openBusinessEdit = () => {
    if (!business) return;
    setBName(business.name);
    setBDesc(business.description);
    setBCat(business.category);
    setBPhone(business.phone);
    setBAddr(business.address);
    setBDelivery(business.deliveryArea || '');
    setBMinDelivery(business.minDeliveryAmount || '');
    setBPayment(business.paymentMethod || '');
    setBSched(business.schedule);
    setBLogo(business.logoUrl || '');
    setShowBusinessForm(true);
  };

  const currentUrl = window.location.origin;
  const businessUrl = user ? `${currentUrl}/?b=${user.uid}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(businessUrl);
    alert('¡Enlace copiado al portapapeles!');
  };

  const isVerified = userData?.payment_verified === true;

  const handleBusinessUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!isVerified && !isAdmin) {
      alert("Tu cuenta aún no ha sido verificada para realizar cambios.");
      return;
    }
    try {
      const updateData: any = {
        name: bName,
        description: bDesc,
        category: bCat,
        phone: bPhone,
        address: bAddr,
        deliveryArea: bDelivery,
        minDeliveryAmount: bMinDelivery,
        paymentMethod: bPayment,
        schedule: bSched,
      };
      if (bLogo) updateData.logoUrl = bLogo;
      await updateDoc(doc(db, 'businesses', user.uid), updateData);
      setShowBusinessForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `businesses/${user.uid}`);
    }
  };

  const deleteBusiness = async () => {
    if (!user) return;
    try {
      // 1. Delete products subcollection (manual since client-side)
      for (const p of products) {
        await deleteDoc(doc(db, 'businesses', user.uid, 'products', p.id));
      }
      // 2. Delete business doc
      await deleteDoc(doc(db, 'businesses', user.uid));
      // 3. Delete user doc (might need rules but typically owners delete themselves)
      await deleteDoc(doc(db, 'users', user.uid));
      // 4. Logout since user is gone
      await signOut(auth);
      navigate('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `businesses/${user.uid}`);
    }
  };

  const toggleBusinessStatus = async () => {
    if (!user || !business) return;
    
    // Si no es admin y no está verificado, le recordamos que necesita verificación para ser PÚBLICO
    // Pero permitimos el toggle para que vea que el botón "funciona" en su panel
    try {
      await updateDoc(doc(db, 'businesses', user.uid), {
        isOpen: !business.isOpen
      });
      console.log("Estado del negocio actualizado:", !business.isOpen);
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      handleFirestoreError(error, OperationType.UPDATE, `businesses/${user.uid}`);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!isVerified && !isAdmin) {
      alert("No puedes agregar o editar productos hasta que tu cuenta sea verificada.");
      return;
    }

    try {
      const priceNum = parseFloat(pPrice);
      if (isNaN(priceNum) || priceNum < 0) throw new Error("Precio inválido");

      if (editingId) {
        // update
        const updateData: any = {
          name: pName,
          description: pDesc,
          price: priceNum,
        };
        if (pImage) updateData.imageUrl = pImage;
        await updateDoc(doc(db, 'businesses', user.uid, 'products', editingId), updateData);
      } else {
        // create
        const newRef = doc(collection(db, 'businesses', user.uid, 'products'));
        const createData: any = {
          name: pName,
          description: pDesc,
          price: priceNum,
          isAvailable: true,
          createdAt: Date.now()
        };
        if (pImage) createData.imageUrl = pImage;
        await setDoc(newRef, createData);
      }
      setShowForm(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `businesses/${user.uid}/products`);
    }
  }; // Wait, I need to fix how products are added!

  const openEdit = (p: ProductData) => {
    setEditingId(p.id);
    setPName(p.name);
    setPDesc(p.description);
    setPPrice(String(p.price));
    setPImage(p.imageUrl || '');
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setPName('');
    setPDesc('');
    setPPrice('');
    setPImage('');
  };

  const toggleProductAvailability = async (p: ProductData) => {
    if (!user) return;
    if (!isVerified && !isAdmin) {
      alert("Tu cuenta está pendiente de verificación.");
      return;
    }
    try {
      await updateDoc(doc(db, 'businesses', user.uid, 'products', p.id), {
        isAvailable: !p.isAvailable
      });
    } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `businesses/${user.uid}/products/${p.id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!user) return;
    if (!isVerified && !isAdmin) {
      alert("No tienes permisos para borrar productos en este momento.");
      return;
    }
    if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
    try {
      await deleteDoc(doc(db, 'businesses', user.uid, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `businesses/${user.uid}/products/${id}`);
    }
  };

  if (!isLoaded) return <div className="h-screen flex items-center justify-center bg-neutral-50 font-sans text-neutral-400">Cargando datos...</div>;

  if (!business) {
    return (
      <div className="max-w-xl mx-auto mt-20 p-8 bg-white rounded-[3rem] border border-neutral-100 shadow-xl text-center">
        <Store className="w-20 h-20 text-neutral-200 mx-auto mb-6" />
        <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-tighter mb-4">Configuración Incompleta</h2>
        <p className="text-neutral-500 mb-8 font-medium">No hemos encontrado un perfil para tu negocio. Esto puede ocurrir si el registro no se completó correctamente.</p>
        <button 
          onClick={() => navigate('/')}
          className="w-full bg-blue-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all"
        >
          Volver al Registro
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4 md:px-0 font-sans">
      
      {/* 🏠 SECCIÓN PRINCIPAL: GESTIÓN DE TIENDA */}
      {viewMode === 'owner' && (
        <>
          {/* Business Header Section */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-neutral-100 overflow-hidden">
        <div className="h-40 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_50%,_white,_transparent)]"></div>
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        </div>
        
        <div className="relative px-6 md:px-8 pb-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
            {/* Logo Section */}
            <div className="relative shrink-0 -mt-16 md:-mt-20 self-center md:self-start">
              <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-[2rem] shadow-2xl border-[6px] border-white overflow-hidden flex items-center justify-center bg-neutral-50 transition-all hover:scale-[1.02]">
                {business.logoUrl ? (
                  <img src={business.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-16 md:w-20 h-16 md:h-20 text-neutral-200" />
                )}
              </div>
              <button 
                onClick={openBusinessEdit}
                className="absolute -bottom-1 -right-1 p-2 bg-emerald-500 text-white rounded-xl shadow-lg hover:bg-emerald-600 transition-all hover:scale-110 active:scale-95 border-2 border-white"
              >
                <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            {/* Title & Info Section */}
            <div className="flex-1 space-y-4 w-full pt-2 md:pt-6 text-center md:text-left">
              <div className="space-y-1">
                <div className="flex flex-col md:flex-row items-center md:items-baseline gap-2 md:gap-3">
                  <h1 className="text-3xl md:text-4xl font-black text-neutral-900 tracking-tight leading-tight uppercase">{business?.name || 'Nombre no especificado'}</h1>
                  <span className="bg-blue-50 px-3 py-1 rounded-lg text-[9px] md:text-[10px] font-black text-blue-700 uppercase tracking-widest border border-blue-100">
                    {business?.category || 'Sin Categoría'}
                  </span>
                </div>
                <p className="text-neutral-500 text-base md:text-lg font-medium leading-tight max-w-2xl">{business?.description || 'Sin descripción'}</p>
              </div>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-8 pt-4 border-t border-neutral-50">
                <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-neutral-400">
                  <MapPin className="w-4 h-4 text-emerald-500" /> 
                  <span className="text-neutral-600 truncate max-w-[200px] md:max-w-none">{business?.address || 'Sin dirección'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-neutral-400">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  <span className="text-neutral-600">{business?.phone || 'Sin teléfono'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-neutral-400">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span className="text-neutral-600">Entrega: {business?.deliveryArea || 'No especificada'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-neutral-400">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span className="text-neutral-600">{business?.schedule || 'Sin horario'}</span>
                </div>
              </div>
            </div>

            {/* Actions Menu Section */}
            <div className="flex flex-col gap-4 shrink-0 w-full md:w-64 md:pt-6">
              <div className="flex items-center justify-between gap-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-100 shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-0.5">Estado</span>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", business.isOpen ? "bg-emerald-500 animate-pulse" : "bg-red-400")}></div>
                    <span className={cn("text-xs font-black uppercase tracking-tight", business.isOpen ? "text-emerald-700" : "text-red-500")}>
                      {business.isOpen ? 'Abierto' : 'Cerrado'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={toggleBusinessStatus}
                  className={cn("relative inline-flex h-6 w-10 items-center rounded-full transition-all focus:outline-none shadow-inner",
                    business.isOpen ? 'bg-emerald-500' : 'bg-neutral-300'
                  )}
                >
                  <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md", 
                      business.isOpen ? 'translate-x-[1.25rem]' : 'translate-x-1'
                    )} 
                  />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => window.open(`${currentUrl}/?b=${user.uid}`, '_blank')}
                  className="flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black transition-all shadow-lg shadow-emerald-100 active:scale-95 uppercase tracking-widest"
                >
                  <Store className="w-3.5 h-3.5" /> Ver Tienda
                </button>
                <button 
                  onClick={openBusinessEdit} 
                  className="flex items-center justify-center gap-2 py-3 bg-white hover:bg-neutral-50 text-neutral-900 rounded-xl text-[10px] font-black transition-all border border-neutral-200 shadow-sm active:scale-95 uppercase tracking-widest"
                >
                  <Settings className="w-3.5 h-3.5" /> Perfil
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!userData?.payment_verified && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-3xl p-6 flex items-start gap-5 shadow-sm overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 rotate-12">
            <AlertCircle className="w-20 h-20 text-orange-900" />
          </div>
          <div className="bg-white p-3.5 rounded-2xl shadow-sm relative z-10 border border-amber-100">
            <AlertCircle className="w-7 h-7 text-amber-600 shrink-0" />
          </div>
          <div className="relative z-10">
            <h3 className="font-black text-amber-900 tracking-tight text-xl mb-1 uppercase">Pendiente de Verificación</h3>
            <p className="text-amber-800 text-sm font-medium leading-relaxed max-w-3xl">
              Tu negocio no será visible en el directorio principal hasta que el equipo confirme tu pago. 
              <span className="block mt-2 font-bold opacity-80">¡Sin embargo, ya puedes comenzar a llenar tu menú y configurar tu perfil!</span>
            </p>
          </div>
        </motion.div>
      ) || (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-6 flex items-center gap-5 shadow-sm relative overflow-hidden">
           <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-emerald-100">
             <CheckCircle2 className="w-7 h-7 text-emerald-600" />
           </div>
           <div>
             <h3 className="font-black text-emerald-900 tracking-tight text-lg uppercase leading-none">Negocio Verificado</h3>
             <p className="text-emerald-700 text-sm font-bold opacity-80 mt-1">Tu negocio está activo y visible para todos los clientes en el directorio.</p>
           </div>
        </div>
      )}
    </>
  )}

  {/* 📈 SECCIÓN DE ESTADÍSTICAS DEL NEGOCIO */}
  {viewMode === 'analytics' && (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-blue-950 uppercase tracking-tighter">Rendimiento de {business.name}</h2>
        <p className="text-sm text-neutral-500 font-medium">Analiza el impacto de tus productos y las visitas de tus clientes.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-neutral-100">
          <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest mb-6">Comparativa de Precios</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={products.filter(p => p.isAvailable).slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" hide />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="price" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-center text-neutral-400 font-bold uppercase mt-4">Top 5 Productos Activos</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-neutral-100">
          <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest mb-6">Popularidad (Vistas)</h3>
          <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={products.filter(p => p.isAvailable).sort((a,b) => (b.views || 0) - (a.views || 0)).slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" hide />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="views" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-center text-neutral-400 font-bold uppercase mt-4">Productos con más Interacción</p>
        </div>
      </div>

      <div className="bg-blue-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
         <div className="relative z-10">
           <h3 className="text-lg font-black uppercase tracking-tight mb-2">Tip para vender más</h3>
           <p className="text-blue-100 text-sm max-w-xl">
             Los negocios que actualizan sus fotos al menos una vez al mes tienen un 40% más de clics en el directorio. ¡Mantén tu menú fresco!
           </p>
         </div>
         <Store className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
      </div>
    </div>
  )}

   {/* 📦 SECCIÓN DE PEDIDOS (DUEÑO) */}
   {(viewMode === 'orders' || viewMode === 'my-orders') && (
     <OrdersView viewMode={viewMode} />
   )}

  {/* 💬 SECCIÓN DE SOPORTE PARA DUEÑOS */}
  {viewMode === 'support' && (
    <div className="bg-white border border-neutral-100 rounded-[3rem] shadow-sm p-8 md:p-16 text-center space-y-6">
       <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Phone className="w-10 h-10 text-emerald-600" />
       </div>
       <h2 className="text-3xl font-black text-blue-950 uppercase tracking-tighter">¿Problemas con tu tienda?</h2>
       <p className="text-neutral-500 max-w-lg mx-auto font-medium">
         Si tienes problemas para subir fotos, editar precios o si tu negocio no aparece como verificado, escríbenos directamente.
       </p>
       <div className="flex flex-col items-center gap-4 pt-6">
         <a href="https://wa.me/5215620950668" target="_blank" rel="noopener noreferrer" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-200">
           Chat Directo con Soporte
         </a>
         <p className="text-sm font-bold text-neutral-400">Atención de Lunes a Viernes de 9am a 6pm</p>
       </div>
    </div>
  )}

  {/* ⚙️ SECCIÓN DE CONFIGURACIÓN DEL DUEÑO */}
  {viewMode === 'settings' && (
    <div className="bg-white border border-neutral-100 rounded-[3rem] shadow-sm p-8 md:p-12">
       <h2 className="text-2xl font-black text-blue-950 uppercase tracking-tighter mb-8 border-b border-neutral-100 pb-6">Ajustes de Mi Membresía</h2>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="space-y-4">
            <div className={cn("p-6 rounded-3xl", isVerified ? "bg-emerald-50" : "bg-amber-50")}>
              <h3 className={cn("font-black uppercase text-sm mb-2", isVerified ? "text-emerald-900" : "text-amber-900")}>Estado de Cuenta</h3>
              <p className="text-xs font-bold mb-4 opacity-70">
                {isVerified ? "Tu suscripción está ACTIVA y al corriente." : "Tu suscripción está PENDIENTE de pago o verificación."}
              </p>
              <div className="bg-white rounded-xl p-3 text-xs font-black text-center border border-neutral-100">
                PRÓXIMO PAGO: <span className="text-blue-600">PENDIENTE</span>
              </div>
            </div>
         </div>
         
         <div className="space-y-4">
          {isAdmin && (
            <div className="bg-neutral-50 p-6 rounded-3xl border border-neutral-100">
              <h3 className="font-black text-neutral-900 uppercase text-sm mb-2">Eliminar mi Negocio</h3>
              <p className="text-xs text-neutral-500 mb-4">Si decides cerrar tu tienda definitivamente, puedes borrar todos tus datos aquí.</p>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3 border-2 border-red-100 text-red-500 hover:bg-red-50 rounded-xl text-xs font-black uppercase transition-all"
              >
                Cerrar Tienda Definitivamente
              </button>
            </div>
          )}
         </div>
       </div>
       
       <div className="mt-8 p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-center gap-4">
          <Settings className="w-8 h-8 text-blue-600" />
          <p className="text-xs font-bold text-blue-900 leading-relaxed">
            Próximamente podrás cambiar tu contraseña y vincular más métodos de contacto desde aquí.
          </p>
       </div>
    </div>
  )}

  {/* Contenido original de gestión de productos solo visible en modo 'owner' */}
  {viewMode === 'owner' && (
    <>
      {/* Products Section */}

      {/* Business Edit Modal */}
      <AnimatePresence>
        {showBusinessForm && (
          <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-neutral-200"
            >
              <div className="p-6 bg-blue-900 text-white flex justify-between items-center">
                <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                  <Settings className="w-5 h-5" /> CONFIGURAR NEGOCIO
                </h2>
                <button onClick={() => setShowBusinessForm(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleBusinessUpdate} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 md:col-span-2">
                    <label className="text-xs font-black uppercase text-neutral-400 tracking-widest">Logo del Negocio</label>
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 bg-neutral-100 rounded-2xl border-2 border-dashed border-neutral-300 flex items-center justify-center overflow-hidden shrink-0">
                        {bLogo ? <img src={bLogo} className="w-full h-full object-cover" /> : <Store className="w-8 h-8 text-neutral-300" />}
                      </div>
                      <div className="flex-1">
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="block w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all cursor-pointer" />
                        <p className="text-[10px] text-neutral-400 mt-2">Recomendado: Imagen cuadrada, formato JPG o PNG.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-neutral-500">Nombre del Negocio</label>
                    <input required value={bName} onChange={e=>setBName(e.target.value)} className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-neutral-500">Categoría</label>
                    <select value={bCat} onChange={e=>setBCat(e.target.value)} className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium appearance-none">
                      <option value="COMIDA">Comida</option>
                      <option value="RETAIL">Retail / Tienda</option>
                      <option value="SALUD">Salud y Belleza</option>
                      <option value="SERVICIOS">Servicios</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-black uppercase text-neutral-500">Descripción (De qué va tu negocio)</label>
                    <textarea required value={bDesc} onChange={e=>setBDesc(e.target.value)} className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium min-h-[100px]" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-neutral-500">Teléfono (WhatsApp)</label>
                    <input required value={bPhone} onChange={e=>setBPhone(e.target.value)} className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium" placeholder="55 1234 5678" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-neutral-500">Dirección Física</label>
                    <input required value={bAddr} onChange={e=>setBAddr(e.target.value)} className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium" placeholder="Calle Ejemplo #123, Col. Centro" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-neutral-500">Zona de Entrega</label>
                    <input required value={bDelivery} onChange={e=>setBDelivery(e.target.value)} className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium" placeholder="Ej: 5km a la redonda o Col. Centro" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-neutral-500">Forma de Pago</label>
                    <input required value={bPayment} onChange={e=>setBPayment(e.target.value)} className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium" placeholder="Ej: Efectivo, Tarjeta, Transferencia" />
                  </div>

                  <div className="space-y-1.5 pt-4 border-t border-neutral-100 md:col-span-2">
                    <label className="text-xs font-black uppercase text-neutral-500 flex items-center gap-2">
                      Envías a partir de
                      <span className="text-[10px] bg-neutral-100 text-neutral-400 px-2 py-0.5 rounded-full font-bold">Opcional</span>
                    </label>
                    <input value={bMinDelivery} onChange={e=>setBMinDelivery(e.target.value)} className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium" placeholder="Ej: A partir de 3 piezas, o Compra mínima de $150" />
                  </div>

                  <div className="space-y-1.5 md:col-span-2 mt-4">
                    <label className="text-xs font-black uppercase text-neutral-500">Horario de Atención</label>
                    <ScheduleInputs initialValue={bSched} onChange={setBSched} />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button type="button" onClick={() => setShowBusinessForm(false)} className="flex-1 py-3 px-6 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold rounded-xl transition-all">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all">
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-red-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 border border-red-100 text-center"
            >
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trash2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight mb-2">¿ELIMINAR NEGOCIO?</h2>
              <p className="text-neutral-500 leading-relaxed mb-8">
                Esta acción es irreversible. Se borrarán todos tus productos, fotos y datos de cuenta permanentemente.
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={deleteBusiness} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg shadow-red-200 transition-all uppercase tracking-widest text-sm">
                  Sí, eliminar para siempre
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 font-bold rounded-2xl transition-all">
                  No, mantener negocio
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Products Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-neutral-100 overflow-hidden">
        <div className="p-8 border-b border-neutral-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-neutral-50/30">
          <div>
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight uppercase">Menú de Productos</h2>
            <p className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-[0.2em] mt-1">Gesti&oacute;n de cat&aacute;logo público</p>
          </div>
          <button 
            disabled={!isVerified && !isAdmin}
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className={cn(
              "flex items-center gap-2 px-8 py-3.5 rounded-2xl text-xs font-black transition-all shadow-lg active:scale-95 uppercase tracking-widest",
              (!isVerified && !isAdmin) ? "bg-neutral-100 text-neutral-400 cursor-not-allowed" : "bg-neutral-900 hover:bg-black text-white"
            )}>
            {showForm ? <><X className="w-4 h-4" /> Cerrar</> : <><Plus className="w-4 h-4" /> Nuevo Producto</>}
          </button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-neutral-100 overflow-hidden bg-neutral-50/20"
            >
              <form onSubmit={handleProductSubmit} className="p-8 md:p-12 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">Nombre del producto</label>
                    <input required type="text" value={pName} onChange={e=>setPName(e.target.value)}
                      className="w-full bg-white border-neutral-200 rounded-2xl shadow-sm p-4 font-bold text-neutral-800 outline-none focus:ring-2 focus:ring-pink-500/20 transition-all border" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">Precio (MXN)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                      <input required type="number" step="0.01" min="0" value={pPrice} onChange={e=>setPPrice(e.target.value)}
                        className="w-full bg-white border-neutral-200 rounded-2xl shadow-sm p-4 pl-8 font-bold text-neutral-800 outline-none focus:ring-2 focus:ring-pink-500/20 transition-all border" />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">Foto Ilustrativa</label>
                    <div className="flex items-center gap-6 bg-white p-6 rounded-3xl border border-neutral-200/50 shadow-sm transition-all hover:border-blue-200">
                      <div className="w-24 h-24 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-blue-300">
                        {pImage ? <img src={pImage} className="w-full h-full object-cover" /> : <PackageOpen className="w-10 h-10 text-neutral-200" />}
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        <input type="file" accept="image/*" onChange={handleProductImageUpload}
                          className="block w-full text-xs text-neutral-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer" />
                        {pImage && <button type="button" onClick={() => setPImage('')} className="text-[10px] font-black text-red-500 hover:underline text-left uppercase tracking-tighter">Eliminar foto seleccionada</button>}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">Descripción del Producto</label>
                    <textarea required value={pDesc} onChange={e=>setPDesc(e.target.value)}
                      className="w-full bg-white border-neutral-200 rounded-3xl shadow-sm p-4 font-medium text-neutral-600 outline-none focus:ring-2 focus:ring-pink-500/20 transition-all border min-h-[120px]" />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button type="submit" className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black text-sm hover:bg-emerald-600 shadow-xl shadow-emerald-100 active:scale-95 transition-all uppercase tracking-widest">
                    {editingId ? 'Actualizar Producto' : 'Crear Producto'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-4 pb-4">
          {products.length === 0 ? (
            <div className="p-20 text-center text-neutral-400">
              <div className="w-24 h-24 bg-neutral-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-neutral-100 shadow-inner">
                <PackageOpen className="w-12 h-12 text-neutral-200" />
              </div>
              <h3 className="text-xl font-black text-neutral-800 tracking-tight uppercase">Catálogo Vacío</h3>
              <p className="text-sm font-medium text-neutral-500 mt-2">Comienza agregando tu primer producto para que tus clientes lo vean.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 divide-y divide-neutral-50">
              {products.map((p) => (
                <div key={p.id} className="p-6 md:p-8 flex flex-col md:flex-row gap-8 justify-between items-center hover:bg-neutral-50/50 transition-all group rounded-3xl">
                  <div className="flex flex-1 items-center gap-6 w-full">
                    <div className="relative shrink-0">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-24 h-24 object-cover rounded-3xl border border-neutral-100 shadow-md transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="w-24 h-24 bg-neutral-50 rounded-3xl border border-neutral-100 flex items-center justify-center shadow-sm">
                          <Store className="w-10 h-10 text-neutral-200" />
                        </div>
                      )}
                      {!p.isAvailable && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-3xl flex items-center justify-center font-black text-[10px] text-red-500 uppercase tracking-widest">Agotado</div>}
                    </div>
                    <div className="space-y-1.5 overflow-hidden">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="font-black text-xl text-neutral-900 transition-colors group-hover:text-blue-900 tracking-tight">{p.name}</h4>
                        <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg font-black text-sm">
                          ${(p.price || 0).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-500 font-medium leading-relaxed max-w-xl line-clamp-2">{p.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 shrink-0 w-full md:w-auto pt-6 md:pt-0 border-t md:border-t-0 border-neutral-50">
                    <div className="flex flex-col items-center gap-2 flex-1 md:flex-none">
                      <span className={cn(
                        "text-[9px] uppercase font-black tracking-widest text-center",
                        p.isAvailable ? "text-emerald-500" : "text-neutral-400"
                      )}>
                        {p.isAvailable ? 'Disponible' : 'Agotado'}
                      </span>
                      <button onClick={() => toggleProductAvailability(p)}
                        className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none shadow-inner",
                          p.isAvailable ? 'bg-emerald-500' : 'bg-neutral-200'
                        )}>
                        <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md", 
                          p.isAvailable ? 'translate-x-6' : 'translate-x-1'
                        )} />
                      </button>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openEdit(p)} 
                        className="p-4 bg-white text-blue-500 hover:bg-blue-50 rounded-2xl transition-all border border-neutral-100 shadow-sm group-hover:shadow-md"
                        title="Editar Producto"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => deleteProduct(p.id)} 
                        className="p-4 bg-white text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-neutral-100 shadow-sm group-hover:shadow-md"
                        title="Eliminar Producto"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
               ))}
            </div>
          )}
        </div>
      </div>
    </>
  )}
    </div>
  );
}
