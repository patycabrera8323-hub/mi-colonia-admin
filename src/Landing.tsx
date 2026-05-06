import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, onSnapshot, query, where, updateDoc, increment } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { Store, User, Lock, Mail, Phone, Info, Tag, Eye, EyeOff, LayoutDashboard, MapPin, Clock, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { cn } from './lib/utils';

export default function Landing() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get('b');
  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Public View States
  const [publicBusiness, setPublicBusiness] = useState<any>(null);
  const [publicProducts, setPublicProducts] = useState<any[]>([]);
  const [businessLoading, setBusinessLoading] = useState(!!businessId);
  const [isBusinessVerified, setIsBusinessVerified] = useState(false);

  useEffect(() => {
    if (!businessId) return;

    const fetchBusiness = async () => {
      try {
        setBusinessLoading(true);
        // 1. Check if business owner is verified
        const userDoc = await getDoc(doc(db, 'users', businessId));
        if (userDoc.exists() && userDoc.data().payment_verified) {
          setIsBusinessVerified(true);
          
          // 2. Fetch Business Data
          const bizDoc = await getDoc(doc(db, 'businesses', businessId));
          if (bizDoc.exists()) {
            setPublicBusiness(bizDoc.data());
            
            // 3. Fetch Products (only available ones)
            const q = query(
              collection(db, 'businesses', businessId, 'products'),
              where('isAvailable', '==', true)
            );
            const unsub = onSnapshot(q, (snap) => {
              const prods: any[] = [];
              snap.forEach(d => prods.push({ id: d.id, ...d.data() }));
              setPublicProducts(prods);
            });
            return unsub;
          }
        } else {
          setIsBusinessVerified(false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setBusinessLoading(false);
      }
    };

    fetchBusiness();
  }, [businessId]);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [category, setCategory] = useState('COMIDA');
  const [businessAddress, setBusinessAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [schedule, setSchedule] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/dashboard');
      } else {
        // Sign up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        const now = Date.now();

        // 1. Create User
        try {
          await setDoc(doc(db, 'users', uid), {
            email,
            name,
            phone,
            payment_verified: false,
            role: 'owner',
            createdAt: now,
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
        }

        // 2. Create Business
        try {
          await setDoc(doc(db, 'businesses', uid), {
            ownerId: uid,
            name: businessName,
            description: businessDescription,
            category,
            isOpen: false,
            payment_verified: false,
            phone,
            address: businessAddress || 'Dirección no especificada',
            deliveryArea: deliveryArea || 'No especificada',
            schedule: schedule || 'Horario no especificado',
            createdAt: now,
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `businesses/${uid}`);
        }

        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error. Verifica tus datos e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (businessId) {
    if (businessLoading) return <div className="h-screen flex items-center justify-center bg-neutral-50 font-sans text-neutral-400">Cargando negocio...</div>;
    
    if (!isBusinessVerified || !publicBusiness) {
      return (
        <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 font-sans">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-emerald-500 mb-8 overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
          <h2 className="text-2xl font-black text-neutral-800 text-center tracking-tight uppercase">Negocio no disponible</h2>
          <p className="text-neutral-500 text-center mt-2 max-w-md">
            Este negocio no ha sido verificado aún o ya no se encuentra en nuestro directorio.
          </p>
          <button onClick={() => navigate('/')} className="mt-8 bg-blue-900 text-white px-8 py-3 rounded-xl font-black text-sm shadow-xl hover:bg-blue-800 transition-all uppercase tracking-widest">
            Volver al inicio
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-neutral-50 font-sans pb-12">
        {/* Public Header */}
        <div className="bg-blue-900 border-b-4 border-emerald-600 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
          <div className="relative z-10 max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6 text-left">
            <div className="w-32 h-32 bg-white rounded-2xl shadow-xl border-4 border-white flex-shrink-0 overflow-hidden flex items-center justify-center">
              {publicBusiness.logoUrl ? (
                <img src={publicBusiness.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Store className="w-16 h-16 text-neutral-200" />
              )}
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                <h1 className="text-3xl font-black text-white tracking-tight uppercase">{publicBusiness.name}</h1>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase",
                  publicBusiness.isOpen ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                )}>
                  {publicBusiness.isOpen ? 'ABIERTO' : 'CERRADO'}
                </span>
              </div>
              <p className="text-blue-100 text-sm mb-4 leading-relaxed max-w-2xl">{publicBusiness.description}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-200">
                  <MapPin className="w-3.5 h-3.5" /> {publicBusiness.address}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-200">
                  <Clock className="w-3.5 h-3.5" /> {publicBusiness.schedule}
                </div>
                {publicBusiness.deliveryArea && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-200">
                    <MapPin className="w-3.5 h-3.5" /> Entrega: {publicBusiness.deliveryArea}
                  </div>
                )}
                {publicBusiness.minDeliveryAmount && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-pink-200 bg-blue-950/30 px-2 py-1 rounded-lg">
                    <Tag className="w-3.5 h-3.5" /> {publicBusiness.minDeliveryAmount}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">
          {!publicBusiness.isOpen && (
             <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col items-center text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
                <h3 className="font-black text-red-900 uppercase">Negocio Cerrado</h3>
                <p className="text-red-700 text-sm mt-1">Este establecimiento no está recibiendo pedidos en este momento.</p>
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {publicProducts.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden flex flex-col group">
                {p.imageUrl && (
                  <div className="h-48 overflow-hidden">
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-lg text-neutral-900 tracking-tight leading-tight uppercase">{p.name}</h3>
                    <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg font-black text-sm">
                      ${p.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-neutral-500 text-sm leading-relaxed mb-6 flex-1">{p.description}</p>
                  
                  <button 
                    onClick={() => {
                      updateDoc(doc(db, 'businesses', businessId!, 'products', p.id), {
                        views: increment(1)
                      });
                      const text = `Hola! Me interesa el producto: *${p.name}* de su catálogo en Mi Colonia.\n\nMétodo de pago al recibir: [Efectivo / Tarjeta / Transferencia]\n\n_Visto en Mi Colonia en un Click_`;
                      window.open(`https://wa.me/${publicBusiness.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-xs tracking-widest uppercase transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Phone className="w-4 h-4" /> COMPRAR POR WHATSAPP
                  </button>
                </div>
              </div>
            ))}
          </div>

          {publicProducts.length === 0 && (
             <div className="text-center p-20 text-neutral-300">
                <Store className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="font-black uppercase tracking-tighter">No hay productos disponibles por ahora</p>
             </div>
          )}
        </main>

        <footer className="text-center py-10 opacity-30 hover:opacity-100 transition-opacity">
           <img src="/logo.png" alt="Logo" className="w-10 h-10 mx-auto grayscale mb-2" />
           <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Mi Colonia en un Click &copy; 2026</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 selection:bg-pink-500 selection:text-white font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-neutral-100">
        
        {/* Header */}
        <div className="bg-blue-900 border-b-4 border-emerald-600 p-8 text-center relative overflow-hidden">
          {/* Subtle Talavera pattern background hint */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
          
          <div className="relative z-10">
            <div className="mx-auto w-32 h-32 mb-6 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white flex items-center justify-center">
              {/* Logo: The image should be placed in public/logo.png */}
              <img 
                src="/logo.png" 
                alt="Mi Colonia Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-4xl font-display font-black text-white mb-1 tracking-tight drop-shadow-sm">MI COLONIA</h1>
            <p className="text-white text-xl font-bold tracking-widest uppercase drop-shadow-sm">
              EN UN CLICK
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          {!isLogin && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2 border-b pb-2">
                Datos Personales
              </h3>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input required type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="pl-10 w-full rounded-lg border-neutral-300 border p-2.5 focus:ring-2 focus:ring-green-700 focus:border-green-700 outline-none transition-all"
                    placeholder="Juan Pérez" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 w-full rounded-lg border-neutral-300 border p-2.5 focus:ring-2 focus:ring-green-700 focus:border-green-700 outline-none transition-all"
                    placeholder="55 1234 5678" />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {!isLogin && (
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2 border-b pb-2">
                Credenciales
              </h3>
            )}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 w-full rounded-lg border-neutral-300 border p-2.5 focus:ring-2 focus:ring-green-700 focus:border-green-700 outline-none transition-all"
                  placeholder="correo@ejemplo.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 w-full rounded-lg border-neutral-300 border p-2.5 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none transition-all"
                  placeholder="••••••••" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2 border-b pb-2 pt-2">
                Datos del Negocio
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Nombre del Negocio</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input required type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                    className="pl-10 w-full rounded-lg border-neutral-300 border p-2.5 focus:ring-2 focus:ring-green-700 focus:border-green-700 outline-none transition-all"
                    placeholder="Mi Taquería" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Descripción corta</label>
                <div className="relative">
                  <Info className="absolute left-3 top-3 w-5 h-5 text-neutral-400" />
                  <textarea required value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)}
                    className="pl-10 w-full rounded-lg border-neutral-300 border p-2.5 focus:ring-2 focus:ring-green-700 focus:border-green-700 outline-none transition-all min-h-[80px]"
                    placeholder="Deliciosos tacos de pastor..." />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Categoría</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <select required value={category} onChange={(e) => setCategory(e.target.value)}
                    className="pl-10 w-full rounded-lg border-neutral-300 border p-2.5 focus:ring-2 focus:ring-green-700 focus:border-green-700 outline-none transition-all bg-white appearance-none">
                    <option value="COMIDA">Comida</option>
                    <option value="RETAIL">Retail / Tienda</option>
                    <option value="SALUD">Salud y Belleza</option>
                    <option value="SERVICIOS">Servicios</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Dirección del Negocio</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input required type="text" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)}
                    className="pl-10 w-full rounded-lg border-neutral-300 border p-2.5 focus:ring-2 focus:ring-green-700 focus:border-green-700 outline-none transition-all"
                    placeholder="Calle, Número, Colonia" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Zona de Entrega (Hasta dónde entrega)</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input required type="text" value={deliveryArea} onChange={(e) => setDeliveryArea(e.target.value)}
                    className="pl-10 w-full rounded-lg border-neutral-300 border p-2.5 focus:ring-2 focus:ring-green-700 focus:border-green-700 outline-none transition-all"
                    placeholder="Ej: 5km a la redonda, Solo Col. Centro" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Horario de Atención</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input required type="text" value={schedule} onChange={(e) => setSchedule(e.target.value)}
                    className="pl-10 w-full rounded-lg border-neutral-300 border p-2.5 focus:ring-2 focus:ring-green-700 focus:border-green-700 outline-none transition-all"
                    placeholder="Lun-Vie 9:00 - 18:00, Sab 10:00 - 14:00" />
                </div>
              </div>
            </div>
          )}

          <button disabled={loading} type="submit"
            className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-3 rounded-lg shadow-sm transition-colors disabled:opacity-50">
            {loading ? 'Cargando...' : isLogin ? 'Entrar al Dashboard' : 'Crear mi cuenta'}
          </button>

          {user && (
            <button 
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
            >
              <LayoutDashboard className="w-5 h-5" /> IR A MI DASHBOARD
            </button>
          )}
        </form>

        <div className="px-8 pb-8 text-center">
          <p className="text-sm text-neutral-600">
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes una cuenta?'}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="ml-1 text-pink-600 font-semibold hover:underline">
              {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
