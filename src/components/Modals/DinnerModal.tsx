import React, { useState } from 'react';
import { geocodeAddress, PRESET_DINNERS } from '../../data/tripData';
import { DinnerItem } from '../../types';

interface DinnerModalProps {
  dayIndex: number | null;
  dayLabel: string;
  isOpen: boolean;
  onClose: () => void;
  onApplyDinner: (dayIndex: number, dinner: DinnerItem) => void;
}

export const DinnerModal: React.FC<DinnerModalProps> = ({
  dayIndex,
  dayLabel,
  isOpen,
  onClose,
  onApplyDinner,
}) => {
  const [customName, setCustomName] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  if (!isOpen || dayIndex === null) return null;

  const handleSelectPreset = (preset: (typeof PRESET_DINNERS)[0]) => {
    const newDinner: DinnerItem = {
      time: '6:00 PM',
      duration: '1 hr 30 min',
      name: preset.name,
      location: preset.address,
      website: preset.website,
      desc: 'Custom dinner selection. Travel routes automatically updated.',
      coords: { lat: preset.lat, lng: preset.lng },
    };
    onApplyDinner(dayIndex, newDinner);
    onClose();
  };

  const handleApplyCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = customName.trim();
    const addr = customAddress.trim();
    if (!name) return;

    setIsGeocoding(true);
    let coords = null;
    try {
      coords = await geocodeAddress(addr ? `${name}, ${addr}` : `${name}, Washington, DC`);
      if (!coords && addr) {
        coords = await geocodeAddress(addr);
      }
    } catch (err) {}

    const newDinner: DinnerItem = {
      time: '6:00 PM',
      duration: '1 hr 30 min',
      name: name,
      location: addr || `${name}, Washington, DC`,
      website: '',
      desc: 'Custom family dinner choice. Real-time routes updated.',
      coords: coords,
    };

    onApplyDinner(dayIndex, newDinner);
    setCustomName('');
    setCustomAddress('');
    setIsGeocoding(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-600 block tracking-wider">
              {dayLabel} Dinner
            </span>
            <h3 className="text-base font-black text-slate-900">Change Dinner Restaurant</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-2">
          Changing dinner automatically recalculates transit times. If the walk is{' '}
          <strong>&gt;20–30 mins</strong>, it switches to UberXL.
        </p>

        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Pick a Popular Alternative:
          </label>
          <div className="space-y-1.5">
            {PRESET_DINNERS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPreset(preset)}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition flex items-center justify-between text-xs cursor-pointer"
              >
                <div>
                  <strong className="text-slate-900 block">{preset.name}</strong>
                  <span className="text-[11px] text-slate-500">{preset.address}</span>
                </div>
                <span className="text-indigo-600 font-bold text-xs">Select ➔</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleApplyCustom} className="mt-4 pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Or Enter Any Custom Restaurant:
          </label>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Restaurant Name (e.g., Carmine's)"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Address (e.g., 425 7th St NW)"
              value={customAddress}
              onChange={e => setCustomAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isGeocoding}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isGeocoding ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Geocoding &amp; Calculating...
                </>
              ) : (
                'Apply Custom Dinner & Recalculate'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
