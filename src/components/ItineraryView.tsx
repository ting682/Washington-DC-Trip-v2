import React, { useState } from 'react';
import { DayData, TripItem, TripPhoto } from '../types';
import { getPlacePhone, getUberDeepLink, SITE_IMAGES, SITE_KNOWLEDGE_BASE } from '../data/tripData';
import { WeatherCard } from './WeatherCard';
import { TripPhotoGallery } from './PhotoGallery/TripPhotoGallery';
import { DayPhotoReel } from './PhotoGallery/DayPhotoReel';
import { PhotoLightboxModal } from './PhotoGallery/PhotoLightboxModal';
import { deletePhotoFromCloud, updatePhotoDay } from '../services/cloudPhotoService';

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
  const [itineraryTab, setItineraryTab] = useState<'timeline' | 'gallery'>('timeline');
  const [activeFilter, setActiveFilter] = useState<'all' | 'site' | 'transit' | 'food'>('all');
  const [syncingGates, setSyncingGates] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Completed and Collapsed activities state (persisted)
  const [completedActivities, setCompletedActivities] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('dc_itinerary_completed_v1');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [collapsedActivities, setCollapsedActivities] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('dc_itinerary_collapsed_v1');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Reel photo interactions
  const [reelLightboxPhoto, setReelLightboxPhoto] = useState<TripPhoto | null>(null);
  const [galleryVersion, setGalleryVersion] = useState(0);

  const currentDay = days[activeDayIndex] || days[0];
  const items = currentDay.items || currentDay.fixedStopsBefore || [];

  const uberCount = items.filter(i => i.type === 'transit-uber').length;
  const walkCount = items.filter(i => i.type === 'transit-walk').length;
  const metroCount = items.filter(i => i.type === 'transit-metro').length;

  const getActivityKey = (dayIdx: number, item: TripItem) => {
    const safeTitle = item.title.replace(/[^a-zA-Z0-9]/g, '_');
    return `d${dayIdx}_${item.time}_${item.siteKey || safeTitle}`;
  };

  const handleToggleComplete = (key: string) => {
    setCompletedActivities(prev => {
      const isCurrentlyDone = !!prev[key];
      const nextDone = !isCurrentlyDone;
      const nextMap = { ...prev, [key]: nextDone };
      try {
        localStorage.setItem('dc_itinerary_completed_v1', JSON.stringify(nextMap));
      } catch (e) {}

      // Auto-collapse when completed; uncollapse when marked incomplete
      setCollapsedActivities(prevCollapsed => {
        const nextCollapsed = { ...prevCollapsed, [key]: nextDone };
        try {
          localStorage.setItem('dc_itinerary_collapsed_v1', JSON.stringify(nextCollapsed));
        } catch (e) {}
        return nextCollapsed;
      });

      return nextMap;
    });
  };

  const handleToggleCollapse = (key: string) => {
    setCollapsedActivities(prev => {
      const nextState = !prev[key];
      const nextMap = { ...prev, [key]: nextState };
      try {
        localStorage.setItem('dc_itinerary_collapsed_v1', JSON.stringify(nextMap));
      } catch (e) {}
      return nextMap;
    });
  };

  const handleCollapseAllCompleted = () => {
    setCollapsedActivities(prev => {
      const nextMap = { ...prev };
      items.forEach((item) => {
        const key = getActivityKey(activeDayIndex, item);
        if (completedActivities[key]) {
          nextMap[key] = true;
        }
      });
      try {
        localStorage.setItem('dc_itinerary_collapsed_v1', JSON.stringify(nextMap));
      } catch (e) {}
      return nextMap;
    });
  };

  const handleExpandAll = () => {
    setCollapsedActivities(prev => {
      const nextMap = { ...prev };
      items.forEach((item) => {
        const key = getActivityKey(activeDayIndex, item);
        nextMap[key] = false;
      });
      try {
        localStorage.setItem('dc_itinerary_collapsed_v1', JSON.stringify(nextMap));
      } catch (e) {}
      return nextMap;
    });
  };

  // Day activity completion stats
  const dayTotalCount = items.length;
  const dayCompletedCount = items.filter((item) => {
    const key = getActivityKey(activeDayIndex, item);
    return !!completedActivities[key];
  }).length;
  const dayProgressPercent =
    dayTotalCount > 0 ? Math.round((dayCompletedCount / dayTotalCount) * 100) : 0;

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

        {/* Photo Hub Navigation Tile */}
        <div
          onClick={() => setItineraryTab(itineraryTab === 'gallery' ? 'timeline' : 'gallery')}
          className={`cursor-pointer border rounded-2xl p-4 shadow-xs transition active:scale-98 ${
            itineraryTab === 'gallery'
              ? 'bg-[color:var(--navy)] text-white border-indigo-900 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${
                itineraryTab === 'gallery'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-50 text-indigo-700'
              }`}
            >
              <i className="fa-solid fa-camera-retro"></i>
            </span>
            <div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider block ${
                  itineraryTab === 'gallery' ? 'text-indigo-200' : 'text-indigo-600'
                }`}
              >
                Photo Hub
              </span>
              <h4 className="serif text-base font-bold">
                {itineraryTab === 'gallery' ? 'Return to Schedule' : 'Trip Photo Gallery'}
              </h4>
              <p
                className={`text-[11px] mt-0.5 ${
                  itineraryTab === 'gallery' ? 'text-indigo-200' : 'text-slate-500'
                }`}
              >
                {itineraryTab === 'gallery'
                  ? 'Back to timeline stops'
                  : 'Organized by day & uploads'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* CENTER COLUMN: ITINERARY STOPS / PHOTO GALLERY */}
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

        {/* View Switcher: Daily Timeline vs Trip Photo Gallery */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1.5 w-full">
            <button
              onClick={() => setItineraryTab('timeline')}
              className={`flex-1 py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                itineraryTab === 'timeline'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <i className="fa-solid fa-list-check"></i>
              <span>Day {activeDayIndex + 1} Schedule</span>
            </button>
            <button
              onClick={() => setItineraryTab('gallery')}
              className={`flex-1 py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                itineraryTab === 'gallery'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <i className="fa-solid fa-camera-retro text-indigo-500"></i>
              <span>Trip Photo Gallery</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full font-bold hidden sm:inline">
                Organized by Day
              </span>
            </button>
          </div>
        </div>

        {itineraryTab === 'gallery' ? (
          /* PHOTO GALLERY VIEW */
          <TripPhotoGallery
            key={galleryVersion}
            activeDayFilter={activeDayIndex}
            onSelectItineraryDay={idx => {
              setActiveDayIndex(idx);
              setItineraryTab('timeline');
            }}
          />
        ) : (
          /* TIMELINE VIEW */
          <>
            {/* Live Weather Forecast */}
            <WeatherCard
              activeDayIndex={activeDayIndex}
              onSelectDayIndex={idx => setActiveDayIndex(idx)}
            />

            {/* Day Photo Reel / Teaser */}
            <DayPhotoReel
              key={galleryVersion}
              dayIndex={activeDayIndex}
              onOpenFullGallery={idx => {
                setActiveDayIndex(idx);
                setItineraryTab('gallery');
              }}
              onSelectPhoto={photo => setReelLightboxPhoto(photo)}
            />

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

            {/* Day Activity Progress & Collapse / Expand Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                    dayProgressPercent === 100
                      ? 'bg-emerald-500 text-white'
                      : dayCompletedCount > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <i
                    className={`fa-solid ${
                      dayProgressPercent === 100 ? 'fa-circle-check' : 'fa-list-check'
                    }`}
                  ></i>
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {dayCompletedCount} of {dayTotalCount} stops completed
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        dayProgressPercent === 100
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {dayProgressPercent}%
                    </span>
                  </div>
                  <div className="w-36 sm:w-52 bg-slate-100 h-2 rounded-full mt-1.5 overflow-hidden border border-slate-200/60">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${dayProgressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 text-xs">
                {dayCompletedCount > 0 && (
                  <button
                    onClick={handleCollapseAllCompleted}
                    className="px-2.5 py-1.5 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 cursor-pointer text-[11px]"
                    title="Collapse all completed activities"
                  >
                    <i className="fa-solid fa-compress text-[10px]"></i>
                    <span>Collapse Completed</span>
                  </button>
                )}
                <button
                  onClick={handleExpandAll}
                  className="px-2.5 py-1.5 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 cursor-pointer text-[11px]"
                  title="Expand all activities"
                >
                  <i className="fa-solid fa-expand text-[10px]"></i>
                  <span>Expand All</span>
                </button>
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
                filteredItems.map((item) => {
                  const key = getActivityKey(activeDayIndex, item);
                  const isCompleted = !!completedActivities[key];
                  const isCollapsed = !!collapsedActivities[key];
                  return (
                    <TimelineCard
                      key={key}
                      item={item}
                      dayIndex={activeDayIndex}
                      isCompleted={isCompleted}
                      isCollapsed={isCollapsed}
                      onToggleComplete={() => handleToggleComplete(key)}
                      onToggleCollapse={() => handleToggleCollapse(key)}
                      onOpenSiteModal={onOpenSiteModal}
                      onOpenDinnerModal={onOpenDinnerModal}
                    />
                  );
                })
              )}
            </div>

            {/* Bottom Day Navigation (Forward / Backward) */}
            <div className="pt-6 pb-2 border-t border-slate-200 mt-6">
              <div className="flex items-center justify-between gap-3">
                {activeDayIndex > 0 ? (
                  <button
                    onClick={() => {
                      setActiveDayIndex(activeDayIndex - 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 p-3.5 rounded-2xl transition shadow-xs flex items-center gap-3 text-left cursor-pointer group active:scale-[0.98]"
                    aria-label={`Go to previous day: ${days[activeDayIndex - 1]?.day}`}
                  >
                    <span className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 transition">
                      <i className="fa-solid fa-arrow-left text-xs"></i>
                    </span>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                        Previous Day
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate block">
                        Day {activeDayIndex} · {days[activeDayIndex - 1]?.day.split(',')[0]}
                      </span>
                    </div>
                  </button>
                ) : (
                  <div className="flex-1 hidden sm:block" />
                )}

                {activeDayIndex < days.length - 1 ? (
                  <button
                    onClick={() => {
                      setActiveDayIndex(activeDayIndex + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 border border-blue-600 text-white p-3.5 rounded-2xl transition shadow-xs flex items-center justify-between gap-3 text-right cursor-pointer group active:scale-[0.98]"
                    aria-label={`Go to next day: ${days[activeDayIndex + 1]?.day}`}
                  >
                    <div className="min-w-0 text-left sm:text-right flex-1">
                      <span className="text-[10px] uppercase font-black tracking-wider text-blue-200 block">
                        Next Day
                      </span>
                      <span className="text-xs font-bold text-white truncate block">
                        Day {activeDayIndex + 2} · {days[activeDayIndex + 1]?.day.split(',')[0]}
                      </span>
                    </div>
                    <span className="w-9 h-9 rounded-xl bg-white/20 group-hover:bg-white/30 text-white flex items-center justify-center shrink-0 transition">
                      <i className="fa-solid fa-arrow-right text-xs"></i>
                    </span>
                  </button>
                ) : (
                  <div className="flex-1 hidden sm:block" />
                )}
              </div>
            </div>
          </>
        )}

        {/* Modal for Reel Photo Lightbox */}
        <PhotoLightboxModal
          photo={reelLightboxPhoto}
          onClose={() => setReelLightboxPhoto(null)}
          onDelete={async id => {
            try {
              await deletePhotoFromCloud(id);
              setReelLightboxPhoto(null);
              setGalleryVersion(v => v + 1);
            } catch (e) {
              console.warn('Delete photo warning:', e);
            }
          }}
          onMoveDay={async (id, newDay) => {
            try {
              await updatePhotoDay(id, newDay);
              setReelLightboxPhoto(prev => (prev ? { ...prev, dayIndex: newDay } : null));
              setGalleryVersion(v => v + 1);
            } catch (e) {
              console.warn('Move photo warning:', e);
            }
          }}
        />
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
  isCompleted: boolean;
  isCollapsed: boolean;
  onToggleComplete: () => void;
  onToggleCollapse: () => void;
  onOpenSiteModal: (siteKey: string) => void;
  onOpenDinnerModal: (dayIndex: number) => void;
}

const TimelineCard: React.FC<TimelineCardProps> = ({
  item,
  dayIndex,
  isCompleted,
  isCollapsed,
  onToggleComplete,
  onToggleCollapse,
  onOpenSiteModal,
  onOpenDinnerModal,
}) => {
  const [photoError, setPhotoError] = useState(false);
  const durationBadge = item.duration ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
      <i className="fa-regular fa-clock text-[9px] text-slate-400"></i> {item.duration}
    </span>
  ) : null;

  // COLLAPSED COMPACT VIEW
  if (isCollapsed) {
    let typeLabel = 'Sight';
    let typeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';
    let typeIcon = item.icon || 'fa-landmark text-indigo-600';

    if (item.type === 'bedtime') {
      typeLabel = 'Night Rest';
      typeColor = 'bg-amber-100 text-amber-900 border-amber-200';
      typeIcon = 'fa-moon text-amber-600';
    } else if (item.type === 'transit-uber') {
      typeLabel = 'UberXL';
      typeColor = 'bg-slate-900 text-white border-slate-900';
      typeIcon = 'fa-car-side text-slate-300';
    } else if (item.type === 'transit-walk') {
      typeLabel = 'Walk';
      typeColor = 'bg-slate-100 text-slate-700 border-slate-200';
      typeIcon = 'fa-person-walking text-slate-500';
    } else if (item.type === 'transit-metro') {
      typeLabel = 'Metro';
      typeColor = 'bg-blue-100 text-blue-800 border-blue-200';
      typeIcon = 'fa-train-subway text-blue-600';
    } else if (item.type === 'flight') {
      typeLabel = 'Flight';
      typeColor = 'bg-blue-600 text-white border-blue-600';
      typeIcon = 'fa-plane text-blue-200';
    } else if (item.type === 'food') {
      typeLabel = item.isDinner ? 'Dinner' : 'Food';
      typeColor = 'bg-rose-100 text-rose-800 border-rose-200';
      typeIcon = 'fa-utensils text-rose-600';
    }

    return (
      <div className="relative pl-9 group">
        {/* Node checkbox toggle */}
        <button
          onClick={onToggleComplete}
          className={`absolute left-2.5 -translate-x-1/2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center z-10 transition cursor-pointer ${
            isCompleted
              ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
              : 'bg-white border-2 border-slate-300 text-transparent hover:border-emerald-500'
          }`}
          title={isCompleted ? 'Mark activity incomplete' : 'Mark activity completed'}
          aria-label="Toggle completion"
        >
          <i className="fa-solid fa-check text-[10px]"></i>
        </button>

        {/* Collapsed row container */}
        <div
          onClick={onToggleCollapse}
          className={`rounded-2xl px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 border transition cursor-pointer select-none ${
            isCompleted
              ? 'bg-slate-50/90 hover:bg-slate-100/90 border-slate-200/90'
              : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <span className="text-xs font-black text-slate-500 font-mono shrink-0">
              {item.time}
            </span>
            <span
              className={`text-xs sm:text-sm font-bold truncate ${
                isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'
              }`}
            >
              {item.title}
            </span>
            <span
              className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-md border shrink-0 hidden xs:inline-flex items-center gap-1 ${typeColor}`}
            >
              <i className={`fa-solid ${typeIcon} text-[9px]`}></i>
              {typeLabel}
            </span>
            {isCompleted && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                <i className="fa-solid fa-check text-[9px]"></i>
                <span className="hidden sm:inline">Completed</span>
              </span>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 transition shadow-2xs cursor-pointer active:scale-95"
            title="Uncollapse and view activity details"
          >
            <span className="text-[11px] font-bold">Uncollapse</span>
            <i className="fa-solid fa-chevron-down text-[10px]"></i>
          </button>
        </div>
      </div>
    );
  }

  // BEDTIME CARD
  if (item.type === 'bedtime') {
    return (
      <div className="relative pl-9">
        <div
          onClick={onToggleComplete}
          className={`absolute left-2.5 -translate-x-1/2 top-4 w-7 h-7 rounded-full flex items-center justify-center shadow-xs z-10 cursor-pointer transition ${
            isCompleted
              ? 'bg-emerald-600 border-2 border-emerald-300 text-white'
              : 'bg-indigo-950 border-2 border-amber-300 text-amber-300'
          }`}
          title={isCompleted ? 'Completed - click to mark incomplete' : 'Click to complete & collapse'}
        >
          <i className={`fa-solid ${isCompleted ? 'fa-check' : 'fa-moon'} text-xs`}></i>
        </div>
        <div className="bg-[color:var(--navy)] text-white rounded-2xl p-4 border border-indigo-900 shadow-xs">
          <div className="flex items-center justify-between text-xs mb-1 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded">
                Night Rest
              </span>
              <span className="text-amber-200 font-semibold">{item.time}</span>
            </div>
            <div className="flex items-center gap-2">
              {durationBadge}
              <button
                onClick={onToggleComplete}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
                title={isCompleted ? 'Mark incomplete' : 'Mark completed & collapse'}
              >
                <i className="fa-solid fa-check text-[9px]"></i>
                <span>{isCompleted ? 'Completed' : 'Mark Done'}</span>
              </button>
              <button
                onClick={onToggleCollapse}
                className="text-white/70 hover:text-white p-1 transition cursor-pointer"
                title="Collapse activity"
              >
                <i className="fa-solid fa-chevron-up text-xs"></i>
              </button>
            </div>
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
        <div
          onClick={onToggleComplete}
          className={`absolute left-2.5 -translate-x-1/2 top-2.5 w-7 h-7 rounded-full flex items-center justify-center z-10 cursor-pointer transition ${
            isCompleted
              ? 'bg-emerald-600 border border-emerald-400 text-white'
              : 'bg-[color:var(--marble)] border border-[color:var(--mist)] text-[color:var(--ink-3)]'
          }`}
          title={isCompleted ? 'Completed - click to mark incomplete' : 'Click to complete & collapse'}
        >
          <i className={`fa-solid ${isCompleted ? 'fa-check' : 'fa-car-side'} text-[11px]`}></i>
        </div>
        <div className="leg-row">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="leg-meta">
                {item.time} · Uber
                {item.uberMeta?.time ? ` · ~${item.uberMeta.time}` : ''}
                {item.uberMeta?.estFare ? ` · ${item.uberMeta.estFare}` : ''}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={onToggleComplete}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                  title={isCompleted ? 'Mark incomplete' : 'Mark completed & collapse'}
                >
                  <i className="fa-solid fa-check text-[9px]"></i>
                  <span>{isCompleted ? 'Done' : 'Mark Done'}</span>
                </button>
                <button
                  onClick={onToggleCollapse}
                  className="text-slate-400 hover:text-slate-700 p-0.5 transition cursor-pointer"
                  title="Collapse activity"
                >
                  <i className="fa-solid fa-chevron-up text-xs"></i>
                </button>
              </div>
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
        <div
          onClick={onToggleComplete}
          className={`absolute left-2.5 -translate-x-1/2 top-2.5 w-7 h-7 rounded-full flex items-center justify-center z-10 cursor-pointer transition ${
            isCompleted
              ? 'bg-emerald-600 border border-emerald-400 text-white'
              : 'bg-[color:var(--marble)] border border-[color:var(--mist)] text-[color:var(--ink-3)]'
          }`}
          title={isCompleted ? 'Completed - click to mark incomplete' : 'Click to complete & collapse'}
        >
          <i className={`fa-solid ${isCompleted ? 'fa-check' : 'fa-person-walking'} text-[11px]`}></i>
        </div>
        <div className="leg-row">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="leg-meta">
                {item.time} · Walk{item.duration ? ` · ${item.duration}` : ''}
                {item.walkMeta?.dist ? ` · ${item.walkMeta.dist}` : ''}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={onToggleComplete}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                  title={isCompleted ? 'Mark incomplete' : 'Mark completed & collapse'}
                >
                  <i className="fa-solid fa-check text-[9px]"></i>
                  <span>{isCompleted ? 'Done' : 'Mark Done'}</span>
                </button>
                <button
                  onClick={onToggleCollapse}
                  className="text-slate-400 hover:text-slate-700 p-0.5 transition cursor-pointer"
                  title="Collapse activity"
                >
                  <i className="fa-solid fa-chevron-up text-xs"></i>
                </button>
              </div>
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
        <div
          onClick={onToggleComplete}
          className={`absolute left-2.5 -translate-x-1/2 top-4 w-7 h-7 rounded-full flex items-center justify-center shadow-xs z-10 cursor-pointer transition ${
            isCompleted
              ? 'bg-emerald-600 border-2 border-white text-white'
              : 'bg-blue-600 border-2 border-white text-white'
          }`}
          title={isCompleted ? 'Completed - click to mark incomplete' : 'Click to complete & collapse'}
        >
          <i className={`fa-solid ${isCompleted ? 'fa-check' : 'fa-train-subway'} text-xs`}></i>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs mb-1 gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded">
              Metro Direct
            </span>
            <div className="flex items-center gap-2">
              {durationBadge}
              <span className="text-blue-900 font-bold">{item.time}</span>
              <button
                onClick={onToggleComplete}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  isCompleted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white hover:bg-blue-100 text-blue-800 border border-blue-300'
                }`}
                title={isCompleted ? 'Mark incomplete' : 'Mark completed & collapse'}
              >
                <i className="fa-solid fa-check text-[9px]"></i>
                <span>{isCompleted ? 'Done' : 'Mark Done'}</span>
              </button>
              <button
                onClick={onToggleCollapse}
                className="text-blue-600/70 hover:text-blue-900 p-1 transition cursor-pointer"
                title="Collapse activity"
              >
                <i className="fa-solid fa-chevron-up text-xs"></i>
              </button>
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
    const flightPhoto = item.siteKey && SITE_IMAGES[item.siteKey] ? SITE_IMAGES[item.siteKey] : null;
    return (
      <div className="relative pl-9">
        <div
          onClick={onToggleComplete}
          className={`absolute left-2.5 -translate-x-1/2 top-4 w-7 h-7 rounded-full flex items-center justify-center shadow-xs z-10 cursor-pointer transition ${
            isCompleted
              ? 'bg-emerald-600 border-2 border-white text-white'
              : 'bg-blue-600 border-2 border-white text-white'
          }`}
          title={isCompleted ? 'Completed - click to mark incomplete' : 'Click to complete & collapse'}
        >
          <i className={`fa-solid ${isCompleted ? 'fa-check' : 'fa-plane'} text-xs`}></i>
        </div>
        <div className="bg-white rounded-2xl border border-blue-300 shadow-xs overflow-hidden">
          {flightPhoto && (
            <div className="relative h-44 overflow-hidden group">
              <img
                src={flightPhoto.src}
                alt={flightPhoto.alt}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-2.5 left-3 right-3 text-white text-[11px] font-bold drop-shadow flex items-center justify-between">
                <span className="flex items-center gap-1.5 truncate max-w-[80%]">
                  <i className="fa-solid fa-plane-departure text-blue-400"></i>
                  {flightPhoto.alt}
                </span>
                <span className="text-[10px] bg-blue-600/90 backdrop-blur-xs px-2 py-0.5 rounded font-mono font-bold shrink-0">
                  DCA
                </span>
              </div>
            </div>
          )}
          <div className="p-4">
            <div className="flex items-center justify-between text-xs mb-1 gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded">
                American Airlines
              </span>
              <div className="flex items-center gap-2">
                {durationBadge}
                <span className="text-slate-800 font-bold">{item.time}</span>
                <button
                  onClick={onToggleComplete}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                  title={isCompleted ? 'Mark incomplete' : 'Mark completed & collapse'}
                >
                  <i className="fa-solid fa-check text-[9px]"></i>
                  <span>{isCompleted ? 'Done' : 'Mark Done'}</span>
                </button>
                <button
                  onClick={onToggleCollapse}
                  className="text-slate-400 hover:text-slate-700 p-1 transition cursor-pointer"
                  title="Collapse activity"
                >
                  <i className="fa-solid fa-chevron-up text-xs"></i>
                </button>
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
      <div
        onClick={onToggleComplete}
        className={`absolute left-2.5 -translate-x-1/2 top-4 w-7 h-7 rounded-full flex items-center justify-center text-white z-10 cursor-pointer transition ${
          isCompleted
            ? 'bg-emerald-600 ring-2 ring-emerald-200 shadow-xs'
            : 'bg-[color:var(--navy)] hover:opacity-90'
        }`}
        title={isCompleted ? 'Completed - click to mark incomplete' : 'Click to complete & collapse'}
      >
        <i className={`fa-solid ${isCompleted ? 'fa-check' : (item.icon || 'fa-landmark')} text-xs`}></i>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {photo && !photoError && (
          <div className="relative group overflow-hidden">
            <img
              src={photo.src}
              alt={photo.alt}
              loading="lazy"
              referrerPolicy="no-referrer"
              className={`stop-photo ${hasSiteInfo ? 'cursor-pointer group-hover:scale-105' : ''} transition-transform duration-300`}
              onClick={() => hasSiteInfo && item.siteKey && onOpenSiteModal(item.siteKey)}
              onError={() => setPhotoError(true)}
            />
            {item.isDinner && (
              <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                <i className="fa-solid fa-utensils text-rose-400"></i>
                <span>Family Dinner</span>
              </div>
            )}
            {item.siteKey === 'holiday-inn' && (
              <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                <i className="fa-solid fa-hotel text-amber-400"></i>
                <span>Trip Home Base</span>
              </div>
            )}
          </div>
        )}
        <div className="p-4">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-slate-900">{item.time}</span>
              {durationBadge}
            </div>
            <div className="flex items-center gap-2">
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

              {/* Complete & Collapse Controls */}
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                <button
                  onClick={onToggleComplete}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    isCompleted
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300'
                  }`}
                  title={isCompleted ? 'Mark incomplete' : 'Mark completed & collapse'}
                >
                  <i className={`fa-solid fa-check text-[10px] ${isCompleted ? 'text-white' : 'text-slate-400'}`}></i>
                  <span>{isCompleted ? 'Completed' : 'Mark Done'}</span>
                </button>
                <button
                  onClick={onToggleCollapse}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
                  title="Collapse activity"
                  aria-label="Collapse activity"
                >
                  <i className="fa-solid fa-chevron-up text-xs"></i>
                </button>
              </div>
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
