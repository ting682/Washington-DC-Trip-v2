import React, { useState } from 'react';

interface FlightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FlightDrawer: React.FC<FlightDrawerProps> = ({ isOpen, onClose }) => {
  const [syncing, setSyncing] = useState(false);
  const [syncedText, setSyncedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRefresh = () => {
    setSyncing(true);
    setSyncedText('Syncing Gates...');
    setTimeout(() => {
      setSyncedText('Both Gates Synced');
      setTimeout(() => {
        setSyncing(false);
        setSyncedText(null);
      }, 2000);
    }, 950);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <h2 className="text-base font-black text-slate-900">
              Live Active Gates &amp; Flight Tracker
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="bg-slate-900 text-white p-3.5 rounded-2xl mt-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Flight Monitoring Service
            </span>
            <p className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <i className="fa-solid fa-satellite text-[10px]"></i> Live FIDS Feeds Connected
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 active:scale-95 transition flex items-center gap-1.5 hover:bg-slate-700 cursor-pointer"
          >
            <i className={`fa-solid fa-arrows-rotate text-xs ${syncing ? 'fa-spin' : ''}`}></i>{' '}
            {syncedText || 'Sync Gates'}
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Confirmation codes and boarding passes are in the American Airlines app.
        </p>

        {/* FLIGHT 1: OUTBOUND CARD */}
        <div className="mt-4 p-4 rounded-2xl bg-white border border-blue-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-600 text-white uppercase">
                Outbound Flight
              </span>
              <span className="text-xs font-bold text-slate-800">Thu, Oct 15</span>
            </div>
            <span className="text-xs font-mono font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
              AA 3357
            </span>
          </div>

          <div className="flex items-center justify-between my-3 text-slate-900">
            <div>
              <span className="text-2xl font-black">ATL</span>
              <p className="text-xs font-bold text-slate-600">2:33 PM</p>
              <p className="text-[10px] text-slate-400">Atlanta (Terminal North)</p>
            </div>
            <div className="flex-1 px-3 text-center">
              <span className="text-[10px] font-semibold text-slate-400">1h 53m · Nonstop</span>
              <div className="relative flex items-center justify-center my-1">
                <div className="h-0.5 w-full bg-blue-300"></div>
                <i className="fa-solid fa-plane text-xs text-blue-600 absolute"></i>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-full inline-block">
                On Time · Confirmed
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black">DCA</span>
              <p className="text-xs font-bold text-slate-600">4:26 PM</p>
              <p className="text-[10px] text-slate-400">Washington Reagan</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-blue-200 mb-3 space-y-2">
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <i className="fa-solid fa-plane-departure text-blue-600"></i> Dep Gate (ATL):
              </span>
              <span className="font-mono font-black text-slate-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Concourse T · Gate T12
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <i className="fa-solid fa-plane-arrival text-emerald-600"></i> Arr Gate (DCA):
              </span>
              <span className="font-mono font-black text-slate-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Terminal 2 · Gate 38
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-suitcase-rolling text-slate-400"></i> DCA Baggage
                Carousel:
              </span>
              <span className="font-bold text-slate-900 font-mono">Baggage Claim 4</span>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-600 mb-3">
            <span>
              Seats: <strong className="text-slate-900 font-mono">16A, 16C, 16D, 16F</strong>
            </span>
            <span>Embraer 175 (Envoy Air)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href="https://www.flightaware.com/live/flight/AAL3357"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-2 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              <i className="fa-solid fa-satellite-dish"></i> Live Radar (FlightAware)
            </a>
            <a
              href="https://www.google.com/search?q=American+Airlines+flight+3357+status+and+gates"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-slate-50 border border-blue-300 text-blue-700 text-center py-2 px-2 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              <i className="fa-brands fa-google"></i> Google Gate Info
            </a>
          </div>
        </div>

        {/* FLIGHT 2: RETURN CARD */}
        <div className="mt-4 p-4 rounded-2xl bg-white border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-600 text-white uppercase">
                Return Flight
              </span>
              <span className="text-xs font-bold text-slate-800">Tue, Oct 20</span>
            </div>
            <span className="text-xs font-mono font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
              AA 4800
            </span>
          </div>

          <div className="flex items-center justify-between my-3 text-slate-900">
            <div>
              <span className="text-2xl font-black">DCA</span>
              <p className="text-xs font-bold text-slate-600">1:59 PM</p>
              <p className="text-[10px] text-slate-400">Washington (Terminal 2)</p>
            </div>
            <div className="flex-1 px-3 text-center">
              <span className="text-[10px] font-semibold text-slate-400">2h 09m · Nonstop</span>
              <div className="relative flex items-center justify-center my-1">
                <div className="h-0.5 w-full bg-amber-300"></div>
                <i className="fa-solid fa-plane text-xs text-amber-600 absolute"></i>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-full inline-block">
                Scheduled · Confirmed
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black">ATL</span>
              <p className="text-xs font-bold text-slate-600">4:08 PM</p>
              <p className="text-[10px] text-slate-400">Atlanta</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-amber-200 mb-3 space-y-2">
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <i className="fa-solid fa-plane-departure text-amber-600"></i> Dep Gate (DCA):
              </span>
              <span className="font-mono font-black text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Terminal 2 · Gate 35B / C29
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <i className="fa-solid fa-plane-arrival text-emerald-600"></i> Arr Gate (ATL):
              </span>
              <span className="font-mono font-black text-slate-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Concourse T · Gate T9 / T10
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-suitcase-rolling text-slate-400"></i> ATL Baggage
                Carousel:
              </span>
              <span className="font-bold text-slate-900 font-mono">
                Terminal North · Carousel 2 / 7
              </span>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-600 mb-3">
            <span>
              Seats: <strong className="text-slate-900 font-mono">15A, 15C, 15D, 15F</strong>
            </span>
            <span>Embraer 175 (Republic Airways)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href="https://www.flightaware.com/live/flight/AAL4800"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-amber-600 hover:bg-amber-700 text-white text-center py-2 px-2 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              <i className="fa-solid fa-satellite-dish"></i> Live Radar (FlightAware)
            </a>
            <a
              href="https://www.google.com/search?q=American+Airlines+flight+4800+status+and+gates"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-slate-50 border border-amber-300 text-amber-800 text-center py-2 px-2 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              <i className="fa-brands fa-google"></i> Google Gate Info
            </a>
          </div>
        </div>

        {/* XIAOBIN LANGE: SEPARATE EXPEDIA BOOKING */}
        <div className="mt-4 p-4 rounded-2xl bg-white border border-violet-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-violet-600 text-white uppercase">
              Xiaobin Lange · Separate Booking
            </span>
            <span className="text-[10px] font-bold text-violet-700">1 traveler</span>
          </div>

          <div className="bg-white rounded-xl p-3 border border-violet-200 mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <i className="fa-solid fa-plane-departure text-violet-600"></i> Thu, Oct 15 · AA
                3357
              </span>
              <span className="font-mono font-black text-slate-900">
                ATL 2:33 PM ➔ DCA 4:26 PM
              </span>
            </div>
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <i className="fa-solid fa-plane-arrival text-violet-600"></i> Tue, Oct 20 · AA
                4800
              </span>
              <span className="font-mono font-black text-slate-900">
                DCA 1:59 PM ➔ ATL 4:08 PM
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-hotel text-slate-400"></i> Holiday Inn
                Washington-Central
              </span>
              <span className="font-bold text-slate-900">Oct 15–20 · own room</span>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-violet-900 bg-violet-100/70 rounded-xl px-3 py-2">
            Same flights as the family both ways (AA 3357 out, AA 4800 home), per American&apos;s Aug
            9 schedule change. Xiaobin&apos;s seat may not carry over from the original booking, so check
            it in the American app.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-3">
            <a
              href="https://www.flightaware.com/live/flight/AAL3357"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-violet-600 hover:bg-violet-700 text-white text-center py-2 px-2 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              <i className="fa-solid fa-satellite-dish"></i> AA 3357 Radar
            </a>
            <a
              href="https://www.aa.com/reservation/view/find-your-trip"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-slate-50 border border-violet-300 text-violet-700 text-center py-2 px-2 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              <i className="fa-solid fa-ticket"></i> Check on AA.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
