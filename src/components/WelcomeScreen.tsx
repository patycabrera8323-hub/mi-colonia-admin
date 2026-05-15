import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ShieldCheck, Store, ArrowRight, Star } from 'lucide-react';

export function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome_Admin_v1');
    if (!hasSeenWelcome) {
      setTimeout(() => setIsVisible(true), 100);
    } else {
      onComplete();
    }
  }, [onComplete]);

  const handleStart = () => {
    localStorage.setItem('hasSeenWelcome_Admin_v1', 'true');
    setIsVisible(false);
    setTimeout(onComplete, 400);
  };

  if (!isVisible) return null;

  const features = [
    {
      icon: <Store className="text-orange-500" />,
      title: "Panel Profesional",
      desc: "Gestiona pedidos y negocios desde un solo lugar."
    },
    {
      icon: <Zap className="text-amber-500" />,
      title: "Tiempo Real",
      desc: "Notificaciones y actualizaciones al instante."
    },
    {
      icon: <ShieldCheck className="text-emerald-500" />,
      title: "Acceso Seguro",
      desc: "Solo personal autorizado. 100% protegido."
    }
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-white flex flex-col items-center justify-between p-8 overflow-hidden"
        >
          {/* Decorative background */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[50%] bg-orange-50 rounded-full blur-[120px] opacity-60" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[50%] bg-amber-50 rounded-full blur-[120px] opacity-60" />
          </div>

          <div className="w-full max-w-sm flex flex-col items-center mt-8">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="relative mb-6"
            >
              <div className="w-20 h-20 bg-white border-4 border-orange-500 rounded-[2rem] flex items-center justify-center shadow-xl shadow-orange-100 overflow-hidden p-3">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-orange-600 rounded-full shadow-lg flex items-center justify-center"
              >
                <Star className="w-3 h-3 text-white fill-white" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <h1 className="text-2xl font-black text-neutral-900 leading-tight">
                ¡Bienvenido,<br/>
                <span className="text-orange-600">Admin Negocios!</span>
              </h1>
              <p className="text-neutral-500 text-[10px] mt-3 font-bold px-4 leading-relaxed uppercase tracking-wider">
                Gestiona tu negocio y administra pedidos en <span className="text-orange-600">tiempo real</span> desde cualquier dispositivo.
              </p>
            </motion.div>

            {/* Features */}
            <div className="w-full space-y-5 mt-8 px-2">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 + (i * 0.1) }}
                  className="flex items-center gap-4 group"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black text-neutral-900 uppercase tracking-tight">{f.title}</h3>
                    <p className="text-[9px] text-neutral-400 font-medium leading-tight">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1 }}
            className="w-full max-w-sm pb-6 flex flex-col items-center"
          >
            <button
              onClick={handleStart}
              className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-orange-600 active:scale-95 transition-all shadow-xl shadow-black/10 mb-6"
            >
              Acceder al Panel
              <ArrowRight size={14} />
            </button>
            <div className="flex flex-col items-center gap-1 opacity-60">
              <img src="/searmo-logo.png" alt="Searmo" className="h-4 w-auto object-contain" />
              <p className="text-[6px] font-black uppercase tracking-[0.4em] text-neutral-400">Powered by Searmo</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
