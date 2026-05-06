import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Trash2, Edit2, PackageOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ProductData {
  id: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  createdAt: number;
  imageUrl?: string;
}

export function BusinessProductsManager({ businessId }: { businessId: string }) {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pImage, setPImage] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
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
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setPImage(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!businessId) return;
    const pRef = collection(db, 'businesses', businessId, 'products');
    const unsub = onSnapshot(pRef, (snap) => {
      const prods: ProductData[] = [];
      snap.forEach((d) => prods.push({ id: d.id, ...d.data() } as ProductData));
      setProducts(prods);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `businesses/${businessId}/products`));
    return () => unsub();
  }, [businessId]);

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const priceNum = parseFloat(pPrice);
      if (isNaN(priceNum) || priceNum < 0) throw new Error("Precio inválido");

      if (editingId) {
        const updateData: any = {
          name: pName,
          description: pDesc,
          price: priceNum,
        };
        if (pImage) updateData.imageUrl = pImage;
        await updateDoc(doc(db, 'businesses', businessId, 'products', editingId), updateData);
      } else {
        const newRef = doc(collection(db, 'businesses', businessId, 'products'));
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
      handleFirestoreError(error, OperationType.WRITE, `businesses/${businessId}/products`);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setPName('');
    setPDesc('');
    setPPrice('');
    setPImage('');
  };

  const openEdit = (p: ProductData) => {
    setEditingId(p.id);
    setPName(p.name);
    setPDesc(p.description);
    setPPrice(String(p.price));
    setPImage(p.imageUrl || '');
    setShowForm(true);
  };

  const toggleAvailability = async (p: ProductData) => {
    try {
      await updateDoc(doc(db, 'businesses', businessId, 'products', p.id), {
        isAvailable: !p.isAvailable
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `businesses/${businessId}/products/${p.id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este producto remotamente?')) return;
    try {
      await deleteDoc(doc(db, 'businesses', businessId, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `businesses/${businessId}/products/${id}`);
    }
  };

  return (
    <div className="bg-neutral-100 p-4 border-t border-neutral-200">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-bold text-neutral-700 flex items-center gap-2">
          <PackageOpen className="w-4 h-4"/> Gestión de Menú
        </h4>
        <button 
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors">
          {showForm ? 'Cancelar' : '+ Nuevo Producto'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleProductSubmit} className="mb-4 bg-white p-4 rounded border border-neutral-200 shadow-sm space-y-3 overflow-hidden">
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Nombre del producto" type="text" value={pName} onChange={e=>setPName(e.target.value)}
                className="col-span-2 md:col-span-1 border-neutral-300 rounded border p-2 text-sm focus:ring-blue-600" />
              <input required placeholder="Precio ($)" type="number" step="0.01" value={pPrice} onChange={e=>setPPrice(e.target.value)}
                className="col-span-2 md:col-span-1 border-neutral-300 rounded border p-2 text-sm focus:ring-blue-600" />
              <div className="col-span-2 flex items-center gap-3">
                <input type="file" accept="image/*" onChange={handleImageUpload}
                  className="flex-1 text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {pImage && (
                  <div className="relative w-10 h-10 rounded overflow-hidden border border-neutral-200 shrink-0">
                    <img src={pImage} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setPImage('')} className="absolute top-0 right-0 bg-white/80 rounded block p-0.5 text-red-500">
                      <Trash2 className="w-2 h-2" />
                    </button>
                  </div>
                )}
              </div>
              <textarea required placeholder="Descripción..." value={pDesc} onChange={e=>setPDesc(e.target.value)}
                className="col-span-2 border-neutral-300 rounded border p-2 text-sm focus:ring-blue-600 min-h-[60px]" />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="bg-blue-800 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-blue-900">
                {editingId ? 'Guardar Cambios' : 'Crear'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {products.map(p => (
          <div key={p.id} className="bg-white p-3 rounded border border-neutral-200 flex justify-between items-start shadow-sm gap-2">
            <div className="flex items-start gap-2 flex-1">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded border border-neutral-200 shrink-0" />
              ) : (
                <div className="w-10 h-10 bg-neutral-100 rounded border border-neutral-200 flex items-center justify-center shrink-0">
                  <PackageOpen className="w-4 h-4 text-neutral-400" />
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-neutral-900 leading-tight">{p.name} <span className="text-green-700 ml-1">${p.price}</span></p>
                <p className="text-xs text-neutral-500 line-clamp-2 leading-tight">{p.description}</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-1 shrink-0">
              <button 
                onClick={() => toggleAvailability(p)}
                className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", p.isAvailable ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-600")}
              >
                {p.isAvailable ? 'Disp' : 'Agotado'}
              </button>
              <button onClick={() => openEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5"/></button>
              <button onClick={() => deleteProduct(p.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
