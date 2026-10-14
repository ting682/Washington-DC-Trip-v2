import React from 'react';

interface HeaderProps {
  moodLabel: string;
  moodIcon: string;
  activeView: 'itinerary' | 'checklist' | 'kids';
  setActiveView: (view: 'itinerary' | 'checklist' | 'kids') => void;
  onOpenFlightDrawer: () => void;
  onOpenInfoModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  moodLabel,
  moodIcon,
  activeView,
  setActiveView,
  onOpenFlightDrawer,
  onOpenInfoModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 lg:px-8 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[color:var(--navy)] flex items-center justify-center text-white shadow-xs">
            <i className="fa-solid fa-monument text-lg"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <i className={`fa-solid ${moodIcon} text-[11px] text-[color:var(--red)]`}></i>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                {moodLabel || 'Live Trip Companion'}
              </span>
            </div>
            <h1 className="text-[21px] sm:text-2xl lg:text-[28px] font-black text-slate-900 leading-tight">
              Washington, DC Vacation
            </h1>
          </div>
        </div>

        {/* Desktop Navigation & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveView('itinerary')}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer ${
                activeView === 'itinerary'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fa-solid fa-calendar-day"></i> Schedule
            </button>
            <button
              onClick={() => setActiveView('checklist')}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer ${
                activeView === 'checklist'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fa-solid fa-list-check"></i> Checklists
            </button>
            <button
              onClick={() => setActiveView('kids')}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeView === 'kids'
                  ? 'bg-amber-500 text-white shadow-xs font-black'
                  : 'text-amber-600 hover:text-amber-700 bg-amber-50/50'
              }`}
            >
              <i className="fa-solid fa-gamepad"></i> Kids Zone
            </button>
          </div>

          <button
            onClick={onOpenFlightDrawer}
            className="h-10 px-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center gap-1.5 text-xs font-bold hover:bg-blue-100 active:scale-95 transition shadow-xs cursor-pointer"
          >
            <i className="fa-solid fa-plane-departure text-blue-600"></i>
            <span className="hidden sm:inline whitespace-nowrap">Live Gates &amp; Flights</span>
            <span className="sm:hidden">Flights</span>
          </button>

          <button
            onClick={onOpenInfoModal}
            className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition cursor-pointer"
            aria-label="Trip Info and Hub"
          >
            <i className="fa-solid fa-circle-info text-base"></i>
          </button>
        </div>
      </div>
    </header>
  );
};
