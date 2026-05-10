import React, { useState } from 'react';

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
      <div className="space-y-1.5">
        <label className="text-xs font-black uppercase text-neutral-500">Hora Apertura</label>
        <input type="time" value={open} onChange={handleOpenChange} className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-black uppercase text-neutral-500">Hora Cierre</label>
        <input type="time" value={close} onChange={handleCloseChange} className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium" />
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
