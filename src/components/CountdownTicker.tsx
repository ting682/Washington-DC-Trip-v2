import React, { useEffect, useState } from 'react';

export const CountdownTicker: React.FC = () => {
  const [countdownText, setCountdownText] = useState('Calculating...');

  useEffect(() => {
    const updateCountdown = () => {
      const departureTime = new Date('October 15, 2026 11:30:00 EDT').getTime();
      const now = new Date().getTime();
      const diff = departureTime - now;

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdownText(`${days}d ${hours}h ${mins}m ${secs}s`);
      } else {
        setCountdownText('En Route!');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="bg-[color:var(--navy)] text-white px-4 lg:px-8 py-2.5 text-xs shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-amber-400 font-bold flex items-center gap-1.5">
              <i className="fa-solid fa-car-side text-xs animate-bounce-slow"></i>
              <span>Departure Countdown:</span>
            </span>
            <span className="text-slate-300 font-medium">Leave 2232 Shenley Park Ln</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] hidden sm:inline">
              Target: Oct 15 @ 11:30 AM EDT
            </span>
            <div className="font-mono font-bold text-amber-300 text-xs sm:text-sm bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-700">
              {countdownText}
            </div>
          </div>
        </div>
      </div>
      <div className="horizon" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </>
  );
};
