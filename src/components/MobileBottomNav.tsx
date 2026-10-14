import React from 'react';

interface MobileBottomNavProps {
  activeView: 'itinerary' | 'checklist' | 'kids';
  setActiveView: (view: 'itinerary' | 'checklist' | 'kids') => void;
  onOpenFlightDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  setActiveView,
  onOpenFlightDrawer,
}) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-2 flex justify-around items-center">
      <button
        onClick={() => setActiveView('itinerary')}
        className={`flex flex-col items-center gap-1 cursor-pointer ${
          activeView === 'itinerary' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <i className="fa-solid fa-calendar-day text-lg"></i>
        <span className="text-[12px] font-bold">Schedule</span>
      </button>
      <button
        onClick={() => setActiveView('checklist')}
        className={`flex flex-col items-center gap-1 cursor-pointer ${
          activeView === 'checklist' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <i className="fa-solid fa-list-check text-lg"></i>
        <span className="text-[12px] font-bold">Checklists</span>
      </button>
      <button
        onClick={() => setActiveView('kids')}
        className={`flex flex-col items-center gap-1 cursor-pointer ${
          activeView === 'kids' ? 'text-amber-500 font-bold' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <i className="fa-solid fa-gamepad text-lg"></i>
        <span className="text-[12px] font-bold">Games</span>
      </button>
      <button
        onClick={onOpenFlightDrawer}
        className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 cursor-pointer"
      >
        <i className="fa-solid fa-door-open text-lg"></i>
        <span className="text-[12px] font-bold">Gates</span>
      </button>
    </nav>
  );
};
