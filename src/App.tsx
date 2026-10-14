import React, { useEffect, useMemo, useState } from 'react';
import { CountdownTicker } from './components/CountdownTicker';
import { Header } from './components/Header';
import { ItineraryView } from './components/ItineraryView';
import { ChecklistView } from './components/ChecklistView';
import { KidsView } from './components/KidsView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SiteDetailModal } from './components/Modals/SiteDetailModal';
import { DinnerModal } from './components/Modals/DinnerModal';
import { FlightDrawer } from './components/Modals/FlightDrawer';
import { InfoModal } from './components/Modals/InfoModal';
import { AlexaModal } from './components/Modals/AlexaModal';
import {
  computeTripDay,
  DAY_MOODS,
  defaultCategories,
  defaultPacking,
  defaultPasses,
  initialTripData,
} from './data/tripData';
import { DinnerItem, PackingItem, PassItem } from './types';

const SHEET_API =
  'https://script.google.com/macros/s/AKfycbxOk6PWWv7F7CDydHwzbKfuq9W6Pl68zMG7fzBNQmI2M3qkMEnxKFhNrMvVCJ1M7MZ3rg/exec';
const SYNC_QUEUE_KEY = 'dc_sync_queue_v1';
const SYNC_CODE_KEY = 'dc_family_code_v1';
const SYNC_NAME_KEY = 'dc_family_name_v1';

export const App: React.FC = () => {
  // Navigation & View
  const [activeView, setActiveView] = useState<'itinerary' | 'checklist' | 'kids'>('itinerary');
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Time-of-day Mood
  const [moodKey, setMoodKey] = useState<string>('midday');

  // Modals
  const [selectedSiteKey, setSelectedSiteKey] = useState<string | null>(null);
  const [editingDinnerDay, setEditingDinnerDay] = useState<number | null>(null);
  const [isFlightDrawerOpen, setIsFlightDrawerOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isAlexaModalOpen, setIsAlexaModalOpen] = useState(false);

  // Persistent Custom Dinners
  const [customDinners, setCustomDinners] = useState<Record<number, DinnerItem>>(() => {
    try {
      const saved = localStorage.getItem('dc_custom_dinners_v12');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Persistent Checklists
  const [packingCategories, setPackingCategories] = useState<string[]>(() => {
    try {
      const saved =
        localStorage.getItem('dc_categories_v12') || localStorage.getItem('dc_categories_v11');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return defaultCategories;
  });

  const [packingItems, setPackingItems] = useState<PackingItem[]>(() => {
    try {
      const saved =
        localStorage.getItem('dc_packing_items_v12') || localStorage.getItem('dc_packing_items_v11');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return defaultPacking;
  });

  const [passesItems, setPassesItems] = useState<PassItem[]>(() => {
    try {
      const saved =
        localStorage.getItem('dc_passes_items_v12') || localStorage.getItem('dc_passes_items_v11');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return defaultPasses;
  });

  // Google Sheet Sync State
  const [syncState, setSyncState] = useState<'idle' | 'saving' | 'offline' | 'nocode'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [queueCount, setQueueCount] = useState<number>(0);

  // Compute Itinerary Days with custom dinners & distances
  const computedDays = useMemo(() => {
    return initialTripData.map((dayData, idx) => {
      const customDinner = customDinners[idx] || null;
      return computeTripDay(dayData, idx, customDinner);
    });
  }, [customDinners]);

  // Determine and apply Day Mood
  useEffect(() => {
    const applyMood = () => {
      let key = 'midday';
      try {
        const q = new URLSearchParams(window.location.search).get('mood');
        if (q && DAY_MOODS[q]) {
          key = q;
        } else {
          const h = new Date().getHours();
          if (h >= 5 && h < 11) key = 'morning';
          else if (h >= 11 && h < 17) key = 'midday';
          else if (h >= 17 && h < 21) key = 'evening';
          else key = 'night';
        }
      } catch (e) {}

      setMoodKey(key);
      const mood = DAY_MOODS[key];
      if (mood) {
        const root = document.documentElement;
        Object.entries(mood.vars).forEach(([k, v]) => root.style.setProperty('--' + k, v));
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', mood.vars.marble);
      }
    };

    applyMood();
    const interval = setInterval(applyMood, 60000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') applyMood();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Google Sheet Sync Operations
  const postToSheet = async (body: any) => {
    const res = await fetch(SHEET_API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const queueSyncOp = async (op: any) => {
    if (!SHEET_API) return;
    let queue: any[] = [];
    try {
      queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
    } catch (e) {}
    queue.push(op);
    setQueueCount(queue.length);
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {}

    const code = localStorage.getItem(SYNC_CODE_KEY);
    if (!code) {
      setSyncState('nocode');
      return;
    }
    flushSyncQueue();
  };

  const flushSyncQueue = async () => {
    const code = localStorage.getItem(SYNC_CODE_KEY);
    if (!code) {
      setSyncState('nocode');
      return;
    }
    let queue: any[] = [];
    try {
      queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
    } catch (e) {}
    if (!queue.length) return;

    setSyncState('saving');
    try {
      while (queue.length > 0) {
        const op = queue[0];
        const by = localStorage.getItem(SYNC_NAME_KEY) || 'Website';
        const data = await postToSheet({ ...op, code, by });
        if (!data.ok && data.error === 'wrong passcode') {
          localStorage.removeItem(SYNC_CODE_KEY);
          setSyncState('nocode');
          return;
        }
        queue.shift();
        setQueueCount(queue.length);
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
        if (data.ok && data.packing && data.passes) {
          applyRemoteSnapshot(data);
        }
      }
      setSyncState('idle');
      setLastSyncTime(new Date());
    } catch (e) {
      setSyncState('offline');
    }
  };

  const applyRemoteSnapshot = (data: any) => {
    if (!data || !data.ok || !Array.isArray(data.packing)) return;
    const remotePacking: PackingItem[] = data.packing.map((i: any) => ({
      id: i.id,
      name: i.name,
      category: i.category || 'Essentials',
      checked: !!i.checked,
    }));
    const remotePasses: PassItem[] = data.passes.map((i: any) => ({
      id: i.id,
      title: i.title,
      time: i.time,
      conf: i.conf,
      checked: !!i.checked,
    }));

    setPackingItems(remotePacking);
    setPassesItems(remotePasses);

    setPackingCategories(prev => {
      const merged = [...prev];
      remotePacking.forEach(i => {
        if (!merged.includes(i.category)) merged.push(i.category);
      });
      localStorage.setItem('dc_categories_v12', JSON.stringify(merged));
      return merged;
    });

    localStorage.setItem('dc_packing_items_v12', JSON.stringify(remotePacking));
    localStorage.setItem('dc_passes_items_v12', JSON.stringify(remotePasses));
    setLastSyncTime(new Date());
  };

  const syncWithSheet = async () => {
    if (!SHEET_API) return;
    const code = localStorage.getItem(SYNC_CODE_KEY);
    if (!code) {
      setSyncState('nocode');
    }
    try {
      const res = await fetch(SHEET_API, { cache: 'no-store' });
      const data = await res.json();
      applyRemoteSnapshot(data);
      if (localStorage.getItem(SYNC_CODE_KEY)) {
        setSyncState('idle');
      }
    } catch (e) {
      setSyncState('offline');
    }
  };

  const promptFamilyCode = async () => {
    const code = prompt('Family passcode (so your changes save to the shared Master List):');
    if (!code) return;
    try {
      const res = await postToSheet({ op: 'check', code: code.trim() });
      if (!res.ok) {
        alert("That passcode didn't work. Please try again.");
        return;
      }
    } catch (e) {
      alert("Couldn't reach the Master List. Check your connection and try again.");
      return;
    }
    localStorage.setItem(SYNC_CODE_KEY, code.trim());
    if (!localStorage.getItem(SYNC_NAME_KEY)) {
      const name = prompt("Your first name (shows in the Sheet's history):", '');
      if (name && name.trim()) {
        localStorage.setItem(SYNC_NAME_KEY, name.trim().slice(0, 40));
      }
    }
    setSyncState('idle');
    flushSyncQueue();
    syncWithSheet();
  };

  useEffect(() => {
    syncWithSheet();
    const handleOnline = () => syncWithSheet();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const handleApplyDinner = (dIdx: number, dinner: DinnerItem) => {
    const updated = { ...customDinners, [dIdx]: dinner };
    setCustomDinners(updated);
    try {
      localStorage.setItem('dc_custom_dinners_v12', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleResetDinners = () => {
    if (!confirm('Reset all changed dinners back to the original trip itinerary?')) return;
    setCustomDinners({});
    try {
      localStorage.removeItem('dc_custom_dinners_v12');
    } catch (e) {}
  };

  // Sync Status Messages
  let syncStatusText = '';
  let syncActionText: string | null = null;
  if (syncState === 'nocode') {
    syncStatusText = `<span><i class="fa-solid fa-cloud text-slate-400"></i> Showing the family Master List. Your changes stay on this phone${
      queueCount ? ` (${queueCount} waiting)` : ''
    }.</span>`;
    syncActionText = 'Enter passcode';
  } else if (syncState === 'saving') {
    syncStatusText = `<span><i class="fa-solid fa-rotate fa-spin text-indigo-500"></i> Saving to the family Master List…</span>`;
  } else if (syncState === 'offline') {
    syncStatusText = `<span><i class="fa-solid fa-wifi text-amber-500"></i> Offline${
      queueCount
        ? ` · ${queueCount} change${queueCount > 1 ? 's' : ''} will save when you're back online`
        : ' · showing the last saved list'
    }</span>`;
    syncActionText = 'Retry';
  } else {
    const t = lastSyncTime
      ? lastSyncTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '';
    syncStatusText = `<span><i class="fa-solid fa-cloud text-emerald-500"></i> Synced with the family Master List${
      t ? ` · ${t}` : ''
    }</span>`;
    syncActionText = 'Refresh';
  }

  const currentMood = DAY_MOODS[moodKey] || DAY_MOODS.midday;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 antialiased pb-24 lg:pb-12">
      {/* Top App Bar */}
      <Header
        moodLabel={currentMood.label}
        moodIcon={currentMood.icon}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenFlightDrawer={() => setIsFlightDrawerOpen(true)}
        onOpenInfoModal={() => setIsInfoModalOpen(true)}
      />

      {/* Live Countdown & Smart Trip Ticker */}
      <CountdownTicker />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-4 lg:pt-6">
        {activeView === 'itinerary' && (
          <ItineraryView
            activeDayIndex={activeDayIndex}
            setActiveDayIndex={setActiveDayIndex}
            days={computedDays}
            onOpenSiteModal={key => setSelectedSiteKey(key)}
            onOpenDinnerModal={dIdx => setEditingDinnerDay(dIdx)}
            onResetDinners={handleResetDinners}
            onOpenFlightDrawer={() => setIsFlightDrawerOpen(true)}
            onSwitchToKids={() => setActiveView('kids')}
          />
        )}

        {activeView === 'checklist' && (
          <ChecklistView
            packingItems={packingItems}
            setPackingItems={setPackingItems}
            packingCategories={packingCategories}
            setPackingCategories={setPackingCategories}
            passesItems={passesItems}
            setPassesItems={setPassesItems}
            onOpenAlexaModal={() => setIsAlexaModalOpen(true)}
            syncStatusText={syncStatusText}
            syncActionText={syncActionText}
            onSyncAction={() => {
              if (syncState === 'nocode') {
                promptFamilyCode();
              } else {
                syncWithSheet();
              }
            }}
            onSyncItemChange={queueSyncOp}
          />
        )}

        {activeView === 'kids' && <KidsView />}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenFlightDrawer={() => setIsFlightDrawerOpen(true)}
      />

      {/* Modals */}
      <SiteDetailModal
        siteKey={selectedSiteKey}
        onClose={() => setSelectedSiteKey(null)}
        websiteUrl={
          selectedSiteKey
            ? computedDays
                .flatMap(d => d.items || [])
                .find(i => i.siteKey === selectedSiteKey)?.website
            : undefined
        }
      />

      <DinnerModal
        dayIndex={editingDinnerDay}
        dayLabel={
          editingDinnerDay !== null
            ? `Day ${editingDinnerDay + 1} (${computedDays[editingDinnerDay]?.day})`
            : ''
        }
        isOpen={editingDinnerDay !== null}
        onClose={() => setEditingDinnerDay(null)}
        onApplyDinner={handleApplyDinner}
      />

      <FlightDrawer isOpen={isFlightDrawerOpen} onClose={() => setIsFlightDrawerOpen(false)} />

      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />

      <AlexaModal
        isOpen={isAlexaModalOpen}
        onClose={() => setIsAlexaModalOpen(false)}
        packingItems={packingItems}
      />
    </div>
  );
};
export default App;
