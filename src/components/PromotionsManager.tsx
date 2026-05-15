import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, Plus, Trash2, Eye, EyeOff, Link, Store, X, ImageIcon, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

interface Promotion {
  id: string;
  title: string;
  imageUrl: string;
  businessId?: string;
  businessName?: string;
  active: boolean;
  createdAt: any;
}

export function PromotionsManager() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ title: '', imageUrl: '', businessId: '', businessName: '' });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'promotions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data: Promotion[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Promotion));
      setPromotions(data);
      setIsLoading(false);
    }, () => setIsLoading(false));
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    if (!form.title.trim() || !form.imageUrl.trim()) {
      alert('⚠️ El título y la URL de la imagen son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'promotions'), {
        title: form.title.trim(),
        imageUrl: form.imageUrl.trim(),
        businessId: form.businessId.trim() || null,
        businessName: form.businessName.trim() || null,
        active: true,
        createdAt: serverTimestamp(),
      });
      setForm({ title: '', imageUrl: '', businessId: '', businessName: '' });
      setPreview(null);
      setIsAdding(false);
    } catch (e) {
      alert('Error al guardar la promoción.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (promo: Promotion) => {
    await updateDoc(doc(db, 'promotions', promo.id), { active: !promo.active });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta promoción permanentemente?')) return;
    await deleteDoc(doc(db, 'promotions', id));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200 pb-8">
        <div>
          <h1 className="text-3xl font-black text-blue-950 tracking-tight flex items-center gap-4">
            <div className="bg-orange-500 p-2.5 rounded-2xl shadow-xl">
              <Megaphone className="w-8 h-8 text-white" />
            </div>
            Carrusel de <span className="text-orange-500 ml-2">Promociones</span>
          </h1>
          <p className="text-neutral-500 font-medium mt-2 max-w-lg">
            Los banners activos aparecerán al inicio de la App de Clientes automáticamente.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-orange-200"
        >
          <Plus className="w-5 h-5" /> Nueva Promoción
        </button>
      </div>

      {/* Stats pills */}
      <div className="flex gap-3 flex-wrap">
        <div className="bg-orange-50 border border-orange-100 rounded-2xl px-5 py-3">
          <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Total</p>
          <p className="text-2xl font-black text-orange-600">{promotions.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3">
          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Activas</p>
          <p className="text-2xl font-black text-emerald-600">{promotions.filter(p => p.active).length}</p>
        </div>
        <div className="bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-3">
          <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Inactivas</p>
          <p className="text-2xl font-black text-neutral-500">{promotions.filter(p => !p.active).length}</p>
        </div>
      </div>

      {/* Promotions List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center text-orange-400/40">
          <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-4" />
          <p className="font-black uppercase tracking-widest text-[10px]">Cargando promociones...</p>
        </div>
      ) : promotions.length === 0 ? (
        <div className="py-20 flex flex-col items-center text-neutral-300 border-2 border-dashed border-neutral-200 rounded-[3rem]">
          <Sparkles className="w-16 h-16 mb-4 opacity-20" />
          <p className="font-black uppercase tracking-wider text-sm">No hay promociones todavía</p>
          <p className="text-xs font-medium mt-1">Crea tu primera con el botón de arriba</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {promotions.map((promo) => (
            <motion.div
              key={promo.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-[2.5rem] border-2 shadow-sm overflow-hidden transition-all ${promo.active ? 'border-orange-200 shadow-orange-50' : 'border-neutral-100 opacity-60'}`}
            >
              {/* Banner Preview */}
              <div className="relative h-40 bg-neutral-100 overflow-hidden">
                <img
                  src={promo.imageUrl}
                  alt={promo.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x240/f97316/ffffff?text=Sin+Imagen'; }}
                />
                <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg ${promo.active ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-white'}`}>
                  {promo.active ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {promo.active ? 'Activa' : 'Inactiva'}
                </div>
              </div>
              {/* Info */}
              <div className="p-5 space-y-3">
                <h3 className="font-black text-neutral-900 uppercase tracking-tight truncate">{promo.title}</h3>
                {promo.businessName && (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl w-fit">
                    <Store className="w-3 h-3" /> Vinculado a: {promo.businessName}
                  </div>
                )}
                <div className="flex items-center gap-2 text-[9px] text-neutral-400 font-bold truncate">
                  <Link className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{promo.imageUrl}</span>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => toggleActive(promo)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${promo.active ? 'border-neutral-200 text-neutral-500 hover:bg-neutral-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                  >
                    {promo.active ? <><EyeOff className="w-3.5 h-3.5" /> Desactivar</> : <><Eye className="w-3.5 h-3.5" /> Activar</>}
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
                    className="ml-auto p-2.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-8">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm"
              onClick={() => setIsAdding(false)}
            />
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-t-[3rem] md:rounded-[3rem] shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-neutral-900 uppercase tracking-tight flex items-center gap-3">
                  <Megaphone className="w-6 h-6 text-orange-500" />
                  Nueva Promoción
                </h2>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-neutral-100 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">Título del Banner *</span>
                  <input
                    type="text" placeholder="Ej: 3x2 en Tacos Los Parados"
                    value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="mt-1 w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 text-sm font-bold text-neutral-800 outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-300 transition-all"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">URL de la Imagen *</span>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="url" placeholder="https://i.imgur.com/tu-imagen.jpg"
                      value={form.imageUrl}
                      onChange={e => { setForm(f => ({ ...f, imageUrl: e.target.value })); setPreview(e.target.value); }}
                      className="flex-1 bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 text-sm font-bold text-neutral-800 outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-300 transition-all"
                    />
                    <button
                      type="button" onClick={() => setPreview(form.imageUrl)}
                      className="flex-shrink-0 p-4 bg-orange-50 text-orange-500 rounded-2xl border border-orange-100 hover:bg-orange-100 transition-all"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                  </div>
                  {preview && (
                    <div className="mt-2 rounded-2xl overflow-hidden h-32 border border-neutral-200 bg-neutral-100">
                      <img src={preview} alt="Preview" className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x240/f97316/ffffff?text=URL+Inválida'; }}
                      />
                    </div>
                  )}
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">ID del Negocio (Opcional)</span>
                    <input
                      type="text" placeholder="Pega el UID"
                      value={form.businessId} onChange={e => setForm(f => ({ ...f, businessId: e.target.value }))}
                      className="mt-1 w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-orange-100 transition-all"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">Nombre del Negocio</span>
                    <input
                      type="text" placeholder="Para mostrar al cliente"
                      value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                      className="mt-1 w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-orange-100 transition-all"
                    />
                  </label>
                </div>
              </div>

              <button
                onClick={handleAdd} disabled={saving}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all active:scale-95 shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Publicar Promoción'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
