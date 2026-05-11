import React, { useState } from 'react';
import { Clock } from 'lucide-react';

export function ScheduleInputs({ initialValue, onChange }: { initialValue?: string, onChange?: (val: string) => void }) {
  const [open, setOpen] = useState(() => {
    if (!initialValue) return "09:00";
    const match = initialValue.match(/(\d{2}:\d{2}) (AM|PM) - (\d{2}:\d{2}) (AM|PM)/);
    if (!match) return "09:00";
    return convertTo24h(match[1], match[2]);
  });
  const [close, setClose] = useState(() => {
    if (!initialValue) return "18:00";
    const match = initialValue.match(/(\d{2}:\d{2}) (AM|PM) - (\d{2}:\d{2}) (AM|PM)/);
    if (!match) return "18:00";
    return convertTo24h(match[3], match[4]);
  });
  
  const handleOpenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setOpen(e.target.value);
      onChange?.(`${formatTime(e.target.value)} - ${formatTime(close)}`);
  };
  
  const handleCloseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setClose(e.target.value);
      onChange?.(`${formatTime(open)} - ${formatTime(e.target.value)}`);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em] ml-1">Hora Apertura</label>
        <div className="relative group">
          <input 
            type="time" 
            value={open} 
            onChange={handleOpenChange} 
            className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-[1.5rem] font-black text-neutral-800 outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-200 transition-all cursor-pointer appearance-none" 
          />
          <Clock className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em] ml-1">Hora Cierre</label>
        <div className="relative group">
          <input 
            type="time" 
            value={close} 
            onChange={handleCloseChange} 
            className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-[1.5rem] font-black text-neutral-800 outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-200 transition-all cursor-pointer appearance-none" 
          />
          <Clock className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
        </div>
      </div>
      <input type="hidden" name="schedule" value={`${formatTime(open)} - ${formatTime(close)}`} />
    </div>
  );
}

export function convertTo24h(time: string, ampm: string) {
  let [h, m] = time.split(':');
  let hh = parseInt(h);
  if (ampm === 'PM' && hh < 12) hh += 12;
  if (ampm === 'AM' && hh === 12) hh = 0;
  return `${String(hh).padStart(2, '0')}:${m}`;
}

export function formatTime(time24: string) {
    let [h, m] = time24.split(':');
    let hh = parseInt(h);
    let ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12;
    hh = hh ? hh : 12;
    return `${String(hh).padStart(2, '0')}:${m} ${ampm}`;
}
