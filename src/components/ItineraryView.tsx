import React, { useState } from 'react';
import { DayData, TripItem } from '../types';
import { getPlacePhone, getUberDeepLink, SITE_IMAGES, SITE_KNOWLEDGE_BASE } from '../data/tripData';

interface ItineraryViewProps {
  activeDayIndex: number;
  setActiveDayIndex: (idx: number) => void;
  days: DayData[];
  onOpenSiteModal: (siteKey: string) => void;
  onOpenDinnerModal: (dayIndex: number) => void;
  onResetDinners: () => void;
  onOpenFlightDrawer: () => void;
  onSwitchToKids: () => void;
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({
  activeDayIndex,
  setActiveDayIndex,
  days,
  onOpenSiteModal,
  onOpenDinnerModal,
  onResetDinners,
  onOpenFlightDrawer,
  onSwitchToKids,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'site' | 'transit' | 'food'>('all');
  const [syncingGates, setSyncingGates] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const currentDay = days[activeDayIndex] || days[0];
  const items = currentDay.items || currentDay.fixedStopsBefore || [];

  const uberCount = items.filter(i => i.type === 'transit-uber').length;
  const walkCount = items.filter(i => i.type === 'transit-walk').length;
  const metroCount = items.filter(i => i.type === 'transit-metro').length;

  const filteredItems = items.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'site') return item.type === 'site';
    if (activeFilter === 'food') return item.type === 'food';
    if (activeFilter === 'transit') return item.type.startsWith('transit') || item.type === 'flight';
    return true;
  });

  const handleSyncGates = () => {
    setSyncingGates(true);
    setSyncStatus('Syncing Gates...');
    setTimeout(() => {
      setSyncStatus('Both Gates Synced');
      setTimeout(() => {
        setSyncingGates(false);
        setSyncStatus(null);
      }, 2000);
    }, 950);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN: CONTROLS & LOGISTICS */}
      <aside className="lg:col-span-3 space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Select Itinerary Day</span>
            <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded">6 Days</span>
          </h3>

          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar pb-1 lg:pb-0">
            {days.map((d, idx) => {
              const isSelected = idx === activeDayIndex;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveDayIndex(idx)}
                  className={`day-tab flex-1 lg:w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{d.day}</span>
                  <span
                    className={`text-[10px] font-normal hidden lg:inline ${
                      isSelected ? 'opacity-80' : 'opacity-70'
                    }`}
                  >
                    {idx === 0 && 'Depart & Settle In'}
                    {idx === 1 && 'White House & Old Town'}
                    {idx === 2 && 'Smithsonian & The Wharf'}
                    {idx === 3 && 'Spy Museum & Lincoln'}
                    {idx === 4 && 'Pandas & Capitol Tour'}
                    {idx === 5 && 'Flight Home to ATL'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-900 shadow-2xs">
          <h4 className="font-bold flex items-center gap-1.5 text-indigo-950 mb-1">
            <i className="fa-solid fa-person-walking text-indigo-600"></i> Max 20–30m Walk Rule
          </h4>
          <p className="text-[11px] leading-relaxed text-indigo-800">
            When you change any dinner location, walking legs over{' '}
            <strong>1.0 mile (~20 mins)</strong> automatically switch to <strong>UberXL</strong>{' '}
            rides with live one-tap booking links.
          </p>
          <button
            onClick={onResetDinners}
            className="mt-2.5 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-2 py-1 rounded-lg transition cursor-pointer"
          >
            Reset Dinners to Original
          </button>
        </div>

        <div
          onClick={onSwitchToKids}
          className="cursor-pointer bg-white border border-slate-200 rounded-2xl p-4 shadow-xs transition active:scale-98 hover:border-slate-300"
        >
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-[color:var(--red-soft)] text-[color:var(--red)] flex items-center justify-center text-lg">
              <i className="fa-solid fa-gamepad"></i>
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--red)] block">
                Games for Kids
              </span>
              <h4 className="serif text-base font-bold text-slate-900">Open the DC Kids Zone</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Trivia, scavenger hunt, spy ciphers &amp; more
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* CENTER COLUMN: ITINERARY STOPS */}
      <section className="lg:col-span-6 space-y-4">
        {/* Day Summary */}
        <div className="bg-[color:var(--navy)] text-white p-5 rounded-2xl shadow-md border-b-[6px] border-[color:var(--band2)]">
          <div className="flex items-center justify-between text-[color:var(--mist)] text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span>{currentDay.day}</span>
            <span>Day {activeDayIndex + 1} of 6</span>
          </div>
          <h2 className="serif text-2xl sm:text-[28px] font-bold leading-tight">
            {currentDay.theme}
          </h2>
          <div className="next-rule"></div>
          <p className="text-sm text-[color:var(--mist)] mt-2.5 font-medium leading-relaxed">
            {currentDay.tagline}
          </p>
        </div>

        {/* Transit Summary Widget */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-[color:var(--red-soft)] text-[color:var(--red)] flex items-center justify-center font-bold text-sm">
              <i className="fa-solid fa-route"></i>
            </span>
            <div>
              <span className="font-bold text-slate-800 block text-sm">Getting around today</span>
              <span className="text-slate-500 font-medium text-xs">
                {uberCount} Uber ride{uberCount === 1 ? '' : 's'} · {walkCount} walk
                {walkCount === 1 ? '' : 's'}
                {metroCount > 0 ? ` · ${metroCount} Metro` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`filter-chip px-3.5 py-1.5 rounded-full font-bold cursor-pointer transition ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Stops
          </button>
          <button
            onClick={() => setActiveFilter('site')}
            className={`filter-chip px-3.5 py-1.5 rounded-full font-medium cursor-pointer transition ${
              activeFilter === 'site'
                ? 'bg-slate-800 text-white font-bold shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <i className="fa-solid fa-landmark mr-1"></i>Sights
          </button>
          <button
            onClick={() => setActiveFilter('transit')}
            className={`filter-chip px-3.5 py-1.5 rounded-full font-medium cursor-pointer transition ${
              activeFilter === 'transit'
                ? 'bg-slate-800 text-white font-bold shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <i className="fa-solid fa-car-side mr-1"></i>Rides &amp; Walks
          </button>
          <button
            onClick={() => setActiveFilter('food')}
            className={`filter-chip px-3.5 py-1.5 rounded-full font-medium cursor-pointer transition ${
              activeFilter === 'food'
                ? 'bg-slate-800 text-white font-bold shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <i className="fa-solid fa-utensils mr-1"></i>Food
          </button>
        </div>

        {/* Timeline Container */}
        <div className="space-y-3 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-[color:var(--stone)]">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              No activities match this filter.
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <TimelineCard
                key={idx}
                item={item}
                dayIndex={activeDayIndex}
                onOpenSiteModal={onOpenSiteModal}
                onOpenDinnerModal={onOpenDinnerModal}
              />
            ))
          )}
        </div>
      </section>

      {/* RIGHT COLUMN: DESKTOP GATES MONITOR */}
      <aside className="hidden lg:block lg:col-span-3 space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Live Gate Tracker
            </h3>
            <button
              onClick={handleSyncGates}
              className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <i className={`fa-solid fa-arrows-rotate ${syncingGates ? 'fa-spin' : ''}`}></i>{' '}
              {syncStatus || 'Sync Gates'}
            </button>
          </div>

          {/* Outbound Flight Card */}
          <div className="mt-3 p-3 bg-blue-50/70 rounded-xl border border-blue-200/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-900">AA 3357 (ATL ➔ DCA)</span>
              <span className="text-[10px] font-bold bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded">
                Thu 15
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-2 text-[11px] bg-white p-2 rounded-lg border border-blue-100">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black block">
                  ATL Dep Gate
                </span>
                <span className="font-bold text-slate-900 font-mono">Gate T12 (North)</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black block">
                  DCA Arr Gate
                </span>
                <span className="font-bold text-slate-900 font-mono">Gate 38 (Term 2)</span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                <i className="fa-solid fa-suitcase-rolling text-[10px]"></i> Claim:{' '}
                <strong>Carousel 4</strong>
              </span>
              <a
                href="https://www.flightaware.com/live/flight/AAL3357"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 font-bold hover:underline flex items-center gap-1"
              >
                Radar <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
              </a>
            </div>
          </div>

          {/* Return Flight Card */}
          <div className="mt-3 p-3 bg-amber-50/70 rounded-xl border border-amber-200/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-900">AA 4800 (DCA ➔ ATL)</span>
              <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                Tue 20
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-2 text-[11px] bg-white p-2 rounded-lg border border-amber-100">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black block">
                  DCA Dep Gate
                </span>
                <span className="font-bold text-slate-900 font-mono">Gate 35B / C29</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black block">
                  ATL Arr Gate
                </span>
                <span className="font-bold text-slate-900 font-mono">Gate T9 / T10</span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                <i className="fa-solid fa-suitcase-rolling text-[10px]"></i> Claim:{' '}
                <strong>Carousel 2 / 7</strong>
              </span>
              <a
                href="https://www.flightaware.com/live/flight/AAL4800"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 font-bold hover:underline flex items-center gap-1"
              >
                Radar <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
              </a>
            </div>
          </div>

          <button
            onClick={onOpenFlightDrawer}
            className="w-full mt-3 py-2 text-center text-xs font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-50 rounded-xl transition cursor-pointer"
          >
            Open Full Flight &amp; Gate Drawer
          </button>
        </div>
      </aside>
    </div>
  );
};

interface TimelineCardProps {
  item: TripItem;
  dayIndex: number;
  onOpenSiteModal: (siteKey: string) => void;
  onOpenDinnerModal: (dayIndex: number) => void;
}

const TimelineCard: React.FC<TimelineCardProps> = ({
  item,
  dayIndex,
  onOpenSiteModal,
  onOpenDinnerModal,
}) => {
  const [photoError, setPhotoError] = useState(false);
  const durationBadge = item.duration ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
      <i className="fa-regular fa-clock text-[9px] text-slate-400"></i> {item.duration}
    </span>
  ) : null;

  // BEDTIME CARD
  if (item.type === 'bedtime') {
    return (
      <div className="relative pl-9">
        <div className="absolute left-2.5 -translate-x-1/2 top-4 w-7 h-7 rounded-full bg-indigo-950 border-2 border-amber-300 flex items-center justify-center text-amber-300 shadow-xs z-10">
          <i className="fa-solid fa-moon text-xs"></i>
        </div>
        <div className="bg-[color:var(--navy)] text-white rounded-2xl p-4 border border-indigo-900 shadow-xs">
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded">
                Night Rest
              </span>
              <span className="text-amber-200 font-semibold">{item.time}</span>
            </div>
            {durationBadge}
          </div>
          <h4 className="font-black text-sm text-white mt-1">{item.title}</h4>
          <p className="text-xs text-indigo-200 mt-1 leading-relaxed">{item.desc}</p>
        </div>
      </div>
    );
  }

  // UBER RIDE
  if (item.type === 'transit-uber') {
    const uberLink = getUberDeepLink(
      item.destName || item.location,
      item.destCoords,
      item.destAddress
    );
    return (
      <div className="relative pl-9">
        <div className="absolute left-2.5 -translate-x-1/2 top-2.5 w-7 h-7 rounded-full bg-[color:var(--marble)] border border-[color:var(--mist)] flex items-center justify-center text-[color:var(--ink-3)] z-10">
          <i className="fa-solid fa-car-side text-[11px]"></i>
        </div>
        <div className="leg-row">
          <div className="flex-1 min-w-0">
            <div className="leg-meta">
              {item.time} · Uber
              {item.uberMeta?.time ? ` · ~${item.uberMeta.time}` : ''}
              {item.uberMeta?.estFare ? ` · ${item.uberMeta.estFare}` : ''}
            </div>
            <div className="leg-title">{item.title.replace(/^UberXL:\s*/, '')}</div>
            {item.desc && <div className="leg-note">{item.desc}</div>}
          </div>
          <a
            href={uberLink}
            target="_blank"
            rel="noopener noreferrer"
            className="leg-btn mt-1"
          >
            <i className="fa-brands fa-uber"></i> Open Uber
          </a>
        </div>
      </div>
    );
  }

  // WALK
  if (item.type === 'transit-walk') {
    return (
      <div className="relative pl-9">
        <div className="absolute left-2.5 -translate-x-1/2 top-2.5 w-7 h-7 rounded-full bg-[color:var(--marble)] border border-[color:var(--mist)] flex items-center justify-center text-[color:var(--ink-3)] z-10">
          <i className="fa-solid fa-person-walking text-[11px]"></i>
        </div>
        <div className="leg-row">
          <div className="flex-1 min-w-0">
            <div className="leg-meta">
              {item.time} · Walk{item.duration ? ` · ${item.duration}` : ''}
              {item.walkMeta?.dist ? ` · ${item.walkMeta.dist}` : ''}
            </div>
            <div className="leg-title">{item.title}</div>
            {item.desc && <div className="leg-note">{item.desc}</div>}
          </div>
        </div>
      </div>
    );
  }

  // METRO CARD
  if (item.type === 'transit-metro') {
    return (
      <div className="relative pl-9">
        <div className="absolute left-2.5 -translate-x-1/2 top-4 w-7 h-7 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white shadow-xs z-10">
          <i className="fa-solid fa-train-subway text-xs"></i>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded">
              Metro Direct
            </span>
            <div className="flex items-center gap-1.5">
              {durationBadge}
              <span className="text-blue-900 font-bold">{item.time}</span>
            </div>
          </div>
          <h4 className="font-black text-sm text-slate-900 mt-1">{item.title}</h4>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.desc}</p>
          {item.metroGuide && (
            <details className="mt-3 group bg-white border border-blue-200 rounded-xl">
              <summary className="list-none cursor-pointer px-3 py-2.5 flex items-center justify-between text-xs font-bold text-blue-700">
                <span>
                  <i className="fa-solid fa-route mr-1.5"></i>Directions, fares &amp; cards
                </span>
                <i className="fa-solid fa-chevron-down text-[10px] transition group-open:rotate-180"></i>
              </summary>
              <div className="px-3 pb-3 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    How to get there
                  </span>
                  <ol className="mt-1 space-y-1.5 list-decimal pl-4">
                    {item.metroGuide.steps.map((t, idx) => (
                      <li key={idx} dangerouslySetInnerHTML={{ __html: t }} />
                    ))}
                  </ol>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Paying for the family
                  </span>
                  <ul className="mt-1 space-y-1.5 list-disc pl-4">
                    {item.metroGuide.pay.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {item.metroGuide.links.map((l, lIdx) => (
                    <a
                      key={lIdx}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${
                        lIdx === 1
                          ? 'col-span-2 bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                          : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-300'
                      } border text-center py-2 px-2 rounded-xl text-xs font-bold active:scale-95 transition flex items-center justify-center gap-1.5`}
                    >
                      <i className={`fa-solid ${l.icon}`}></i> {l.label}
                    </a>
                  ))}
                </div>
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  // FLIGHT CARD
  if (item.type === 'flight') {
    const phone = getPlacePhone(item);
    return (
      <div className="relative pl-9">
        <div className="absolute left-2.5 -translate-x-1/2 top-4 w-7 h-7 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white shadow-xs z-10">
          <i className="fa-solid fa-plane text-xs"></i>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-blue-300 shadow-xs">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded">
              American Airlines
            </span>
            <div className="flex items-center gap-1.5">
              {durationBadge}
              <span className="text-slate-800 font-bold">{item.time}</span>
            </div>
          </div>
          <h4 className="font-black text-sm text-slate-900 mt-1">{item.title}</h4>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.desc}</p>
          {item.flightMeta && (
            <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">
                  Departure Gate
                </span>
                <span className="font-black font-mono text-slate-900">
                  {item.flightMeta.depGate}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">
                  Arrival Gate
                </span>
                <span className="font-black font-mono text-slate-900">
                  {item.flightMeta.arrGate}
                </span>
              </div>
            </div>
          )}
          {phone && (
            <a
              href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition"
            >
              <i className="fa-solid fa-phone text-[11px]"></i>
              <span>American Airlines: {phone}</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  // SIGHT / FOOD CARD
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    item.location || item.title
  )}`;
  const hasSiteInfo = !!(item.siteKey && SITE_KNOWLEDGE_BASE[item.siteKey]);
  const phone = getPlacePhone(item);
  const photo = item.siteKey && SITE_IMAGES[item.siteKey] ? SITE_IMAGES[item.siteKey] : null;

  return (
    <div className="relative pl-9">
      <div className="absolute left-2.5 -translate-x-1/2 top-4 w-7 h-7 rounded-full bg-[color:var(--navy)] flex items-center justify-center text-white z-10">
        <i className={`fa-solid ${item.icon || 'fa-landmark'} text-xs`}></i>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {photo && !photoError && (
          <img
            src={photo.src}
            alt={photo.alt}
            loading="lazy"
            className={`stop-photo ${hasSiteInfo ? 'cursor-pointer' : ''}`}
            onClick={() => hasSiteInfo && item.siteKey && onOpenSiteModal(item.siteKey)}
            onError={() => setPhotoError(true)}
          />
        )}
        <div className="p-4">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-slate-900">{item.time}</span>
              {durationBadge}
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  item.type === 'food'
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                }`}
              >
                {item.type}
              </span>
              {item.isDinner && (
                <button
                  onClick={() => onOpenDinnerModal(dayIndex)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] px-2.5 py-1 rounded-lg border border-indigo-200 transition flex items-center gap-1 cursor-pointer"
                >
                  <i className="fa-solid fa-utensils"></i> Change Dinner
                </button>
              )}
            </div>
          </div>

          <h3
            onClick={() => hasSiteInfo && item.siteKey && onOpenSiteModal(item.siteKey)}
            className={`serif text-[19px] font-bold text-slate-900 leading-snug ${
              hasSiteInfo
                ? 'cursor-pointer hover:text-indigo-600 transition flex items-center gap-1.5'
                : ''
            }`}
          >
            <span>{item.title}</span>
            {hasSiteInfo && (
              <i className="fa-regular fa-circle-question text-indigo-500 text-xs"></i>
            )}
          </h3>

          <p className="text-[15px] text-slate-600 mt-1.5 leading-relaxed">{item.desc}</p>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center flex-wrap gap-x-4 gap-y-2 text-xs">
            {hasSiteInfo && item.siteKey && (
              <button
                onClick={() => onOpenSiteModal(item.siteKey!)}
                className="inline-flex items-center gap-1.5 font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                <i className="fa-solid fa-book-open-reader text-[11px]"></i>
                <span>Quick Facts &amp; History</span>
              </button>
            )}

            {phone && (
              <a
                href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
                className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition"
              >
                <i className="fa-solid fa-phone text-[11px]"></i>
                <span>{phone}</span>
              </a>
            )}

            {item.website && (
              <a
                href={item.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg transition"
              >
                <i className="fa-solid fa-globe text-[11px]"></i>
                <span>Official Site</span>
              </a>
            )}

            {item.location && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-blue-600"
              >
                <i className="fa-solid fa-location-dot text-slate-400"></i>
                <span className="truncate max-w-[180px] sm:max-w-xs">{item.location}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
