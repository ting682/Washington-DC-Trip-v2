import React, { useEffect, useMemo, useState } from 'react';
import { DAY_METADATA, DEFAULT_TRIP_PHOTOS } from '../../data/defaultPhotos';
import { googleSignIn, logout } from '../../services/googleAuth';
import { fetchGooglePhotosForTrip } from '../../services/googlePhotosService';
import { GoogleAccountInfo, TripPhoto } from '../../types';
import { ExportSharedAlbumModal } from './ExportSharedAlbumModal';
import { PhotoLightboxModal } from './PhotoLightboxModal';

// Storage keys
const COMBINED_STORAGE_KEY = 'dc_family_trip_google_photos_v1';
const ACC1_PHOTOS_KEY = 'dc_trip_google_photos_acc1';
const ACC2_PHOTOS_KEY = 'dc_trip_google_photos_acc2';
const ACC1_INFO_KEY = 'dc_trip_google_info_acc1';
const ACC2_INFO_KEY = 'dc_trip_google_info_acc2';
const ACC1_TOKEN_KEY = 'dc_trip_google_token_acc1';
const ACC2_TOKEN_KEY = 'dc_trip_google_token_acc2';

interface TripPhotoGalleryProps {
  activeDayFilter?: number | 'all';
  onSelectItineraryDay?: (dayIndex: number) => void;
  inlineMode?: boolean;
}

export const TripPhotoGallery: React.FC<TripPhotoGalleryProps> = ({
  activeDayFilter: initialDayFilter = 'all',
  onSelectItineraryDay,
  inlineMode = false,
}) => {
  // Account 1 (Me / Husband / Ting)
  const [acc1Info, setAcc1Info] = useState<GoogleAccountInfo>({
    id: 'account1',
    customLabel: 'Ting (Me)',
    email: null,
    displayName: null,
    photoURL: null,
    lastSyncTime: null,
    photoCount: 0,
  });
  const [acc1Photos, setAcc1Photos] = useState<TripPhoto[]>([]);
  const [acc1Token, setAcc1Token] = useState<string | null>(null);
  const [isAcc1Connecting, setIsAcc1Connecting] = useState(false);
  const [isAcc1Syncing, setIsAcc1Syncing] = useState(false);
  const [isEditingAcc1Label, setIsEditingAcc1Label] = useState(false);
  const [tempAcc1Label, setTempAcc1Label] = useState('');

  // Account 2 (Wife / Partner)
  const [acc2Info, setAcc2Info] = useState<GoogleAccountInfo>({
    id: 'account2',
    customLabel: "Wife's Account",
    email: null,
    displayName: null,
    photoURL: null,
    lastSyncTime: null,
    photoCount: 0,
  });
  const [acc2Photos, setAcc2Photos] = useState<TripPhoto[]>([]);
  const [acc2Token, setAcc2Token] = useState<string | null>(null);
  const [isAcc2Connecting, setIsAcc2Connecting] = useState(false);
  const [isAcc2Syncing, setIsAcc2Syncing] = useState(false);
  const [isEditingAcc2Label, setIsEditingAcc2Label] = useState(false);
  const [tempAcc2Label, setTempAcc2Label] = useState('');

  // Status & Feedback
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Gallery Filters & View
  const [selectedDayFilter, setSelectedDayFilter] = useState<
    number | 'all' | 'google' | 'acc1' | 'acc2' | 'landmarks'
  >(initialDayFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grouped' | 'grid'>('grouped');

  // Lightbox modal state
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);

  // Method 3: End of Trip Google Shared Album & ZIP Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Sync initialDayFilter when prop changes
  useEffect(() => {
    if (initialDayFilter !== undefined) {
      setSelectedDayFilter(initialDayFilter);
    }
  }, [initialDayFilter]);

  // Load saved accounts & photos on mount
  useEffect(() => {
    try {
      // Load Acc 1
      const savedInfo1 = localStorage.getItem(ACC1_INFO_KEY);
      if (savedInfo1) {
        const parsed = JSON.parse(savedInfo1);
        setAcc1Info(parsed);
      }
      const savedPhotos1 = localStorage.getItem(ACC1_PHOTOS_KEY);
      if (savedPhotos1) {
        const parsed = JSON.parse(savedPhotos1);
        if (Array.isArray(parsed)) setAcc1Photos(parsed);
      }
      const savedToken1 = localStorage.getItem(ACC1_TOKEN_KEY);
      if (savedToken1) setAcc1Token(savedToken1);

      // Load Acc 2
      const savedInfo2 = localStorage.getItem(ACC2_INFO_KEY);
      if (savedInfo2) {
        const parsed = JSON.parse(savedInfo2);
        setAcc2Info(parsed);
      }
      const savedPhotos2 = localStorage.getItem(ACC2_PHOTOS_KEY);
      if (savedPhotos2) {
        const parsed = JSON.parse(savedPhotos2);
        if (Array.isArray(parsed)) setAcc2Photos(parsed);
      }
      const savedToken2 = localStorage.getItem(ACC2_TOKEN_KEY);
      if (savedToken2) setAcc2Token(savedToken2);

      // Fallback migration: If old single-account photos exist and acc1 has none
      if (!savedPhotos1) {
        const legacy = localStorage.getItem(COMBINED_STORAGE_KEY);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAcc1Photos(parsed);
            localStorage.setItem(ACC1_PHOTOS_KEY, JSON.stringify(parsed));
          }
        }
      }
    } catch (e) {
      console.warn('Error loading cached Google Photos accounts:', e);
    }
  }, []);

  // Update combined storage whenever acc1 or acc2 photos change
  useEffect(() => {
    const combinedGoogle = [...acc1Photos, ...acc2Photos];
    try {
      localStorage.setItem(COMBINED_STORAGE_KEY, JSON.stringify(combinedGoogle));
    } catch (e) {
      console.warn('Error saving combined Google Photos:', e);
    }
  }, [acc1Photos, acc2Photos]);

  // Save helper for Account 1
  const updateAccount1Data = (
    infoUpdates: Partial<GoogleAccountInfo>,
    photos?: TripPhoto[],
    token?: string | null
  ) => {
    setAcc1Info(prev => {
      const next = { ...prev, ...infoUpdates, photoCount: photos ? photos.length : prev.photoCount };
      localStorage.setItem(ACC1_INFO_KEY, JSON.stringify(next));
      return next;
    });
    if (photos !== undefined) {
      setAcc1Photos(photos);
      localStorage.setItem(ACC1_PHOTOS_KEY, JSON.stringify(photos));
    }
    if (token !== undefined) {
      setAcc1Token(token);
      if (token) localStorage.setItem(ACC1_TOKEN_KEY, token);
      else localStorage.removeItem(ACC1_TOKEN_KEY);
    }
  };

  // Save helper for Account 2
  const updateAccount2Data = (
    infoUpdates: Partial<GoogleAccountInfo>,
    photos?: TripPhoto[],
    token?: string | null
  ) => {
    setAcc2Info(prev => {
      const next = { ...prev, ...infoUpdates, photoCount: photos ? photos.length : prev.photoCount };
      localStorage.setItem(ACC2_INFO_KEY, JSON.stringify(next));
      return next;
    });
    if (photos !== undefined) {
      setAcc2Photos(photos);
      localStorage.setItem(ACC2_PHOTOS_KEY, JSON.stringify(photos));
    }
    if (token !== undefined) {
      setAcc2Token(token);
      if (token) localStorage.setItem(ACC2_TOKEN_KEY, token);
      else localStorage.removeItem(ACC2_TOKEN_KEY);
    }
  };

  // Import photos logic for an account
  const runPhotosImport = async (
    target: 'account1' | 'account2',
    token: string,
    ownerName: string,
    ownerEmail?: string | null
  ) => {
    const isAcc1 = target === 'account1';
    if (isAcc1) setIsAcc1Syncing(true);
    else setIsAcc2Syncing(true);

    setErrorMessage(null);
    setStatusMessage(`Searching Google Photos for ${ownerName} with face detection filter...`);

    try {
      const imported = await fetchGooglePhotosForTrip(token, {
        year: 2026,
        requireFaces: true,
        includeRecentFallback: true,
        accountOwner: target,
        accountOwnerName: ownerName,
        accountOwnerEmail: ownerEmail || undefined,
      });

      const timeNow = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      if (isAcc1) {
        updateAccount1Data({ lastSyncTime: timeNow, photoCount: imported.length }, imported, token);
      } else {
        updateAccount2Data({ lastSyncTime: timeNow, photoCount: imported.length }, imported, token);
      }

      setStatusMessage(
        `Successfully synced ${imported.length} face-verified photo(s) from ${ownerName}!`
      );
    } catch (err: any) {
      console.error(`Error importing photos for ${target}:`, err);
      setErrorMessage(
        `Unable to fetch photos for ${ownerName}. The Google token may have expired. Try clicking "Connect / Re-sync".`
      );
    } finally {
      if (isAcc1) setIsAcc1Syncing(false);
      else setIsAcc2Syncing(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Connect Account 1
  const handleConnectAcc1 = async () => {
    setIsAcc1Connecting(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn({ promptAccountSelect: true });
      if (res && res.accessToken) {
        const displayName = res.user.displayName || 'Ting';
        const label = acc1Info.customLabel || displayName;
        updateAccount1Data(
          {
            displayName: res.user.displayName,
            email: res.user.email,
            photoURL: res.user.photoURL,
          },
          undefined,
          res.accessToken
        );
        await runPhotosImport('account1', res.accessToken, label, res.user.email);
      }
    } catch (err: any) {
      console.error('Account 1 sign-in failed:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage('Authentication was not completed. Please try again.');
      }
    } finally {
      setIsAcc1Connecting(false);
    }
  };

  // Connect Account 2 (Wife)
  const handleConnectAcc2 = async () => {
    setIsAcc2Connecting(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn({ promptAccountSelect: true });
      if (res && res.accessToken) {
        const displayName = res.user.displayName || "Wife";
        const label = acc2Info.customLabel || `${displayName}'s Account`;
        updateAccount2Data(
          {
            displayName: res.user.displayName,
            email: res.user.email,
            photoURL: res.user.photoURL,
          },
          undefined,
          res.accessToken
        );
        await runPhotosImport('account2', res.accessToken, label, res.user.email);
      }
    } catch (err: any) {
      console.error('Account 2 sign-in failed:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage("Authentication for Wife's account was not completed. Please try again.");
      }
    } finally {
      setIsAcc2Connecting(false);
    }
  };

  // Disconnect Account 1
  const handleDisconnectAcc1 = () => {
    if (confirm(`Disconnect ${acc1Info.customLabel} and remove their imported photos from the gallery?`)) {
      updateAccount1Data(
        {
          email: null,
          displayName: null,
          photoURL: null,
          lastSyncTime: null,
          photoCount: 0,
        },
        [],
        null
      );
      setStatusMessage(`${acc1Info.customLabel} was disconnected.`);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  // Disconnect Account 2
  const handleDisconnectAcc2 = () => {
    if (confirm(`Disconnect ${acc2Info.customLabel} and remove their imported photos from the gallery?`)) {
      updateAccount2Data(
        {
          email: null,
          displayName: null,
          photoURL: null,
          lastSyncTime: null,
          photoCount: 0,
        },
        [],
        null
      );
      setStatusMessage(`${acc2Info.customLabel} was disconnected.`);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  // Sync both accounts
  const handleSyncBoth = async () => {
    if (acc1Token) {
      await runPhotosImport('account1', acc1Token, acc1Info.customLabel, acc1Info.email);
    }
    if (acc2Token) {
      await runPhotosImport('account2', acc2Token, acc2Info.customLabel, acc2Info.email);
    }
  };

  // Save updated label for Account 1
  const handleSaveAcc1Label = () => {
    if (tempAcc1Label.trim()) {
      const newLabel = tempAcc1Label.trim();
      // Also update photos tags and captions
      const updatedPhotos = acc1Photos.map(p => ({
        ...p,
        accountOwnerName: newLabel,
        title: p.title.replace(acc1Info.customLabel, newLabel),
        caption: p.caption?.replace(acc1Info.customLabel, newLabel),
        credit: `${newLabel} · Google Photos`,
      }));
      updateAccount1Data({ customLabel: newLabel }, updatedPhotos);
    }
    setIsEditingAcc1Label(false);
  };

  // Save updated label for Account 2
  const handleSaveAcc2Label = () => {
    if (tempAcc2Label.trim()) {
      const newLabel = tempAcc2Label.trim();
      const updatedPhotos = acc2Photos.map(p => ({
        ...p,
        accountOwnerName: newLabel,
        title: p.title.replace(acc2Info.customLabel, newLabel),
        caption: p.caption?.replace(acc2Info.customLabel, newLabel),
        credit: `${newLabel} · Google Photos`,
      }));
      updateAccount2Data({ customLabel: newLabel }, updatedPhotos);
    }
    setIsEditingAcc2Label(false);
  };

  // Delete individual photo
  const handleDeletePhoto = (photoId: string) => {
    if (acc1Photos.some(p => p.id === photoId)) {
      const filtered = acc1Photos.filter(p => p.id !== photoId);
      updateAccount1Data({ photoCount: filtered.length }, filtered);
    } else if (acc2Photos.some(p => p.id === photoId)) {
      const filtered = acc2Photos.filter(p => p.id !== photoId);
      updateAccount2Data({ photoCount: filtered.length }, filtered);
    }
  };

  // Combine default landmark photos with photos from BOTH accounts
  const allPhotos = useMemo(() => {
    return [...acc1Photos, ...acc2Photos, ...DEFAULT_TRIP_PHOTOS];
  }, [acc1Photos, acc2Photos]);

  const totalGooglePhotos = acc1Photos.length + acc2Photos.length;

  // Filter photos
  const filteredPhotos = useMemo(() => {
    return allPhotos.filter(photo => {
      // Source / Day Filter
      if (selectedDayFilter === 'google') {
        if (!photo.uploadedByUser) return false;
      } else if (selectedDayFilter === 'acc1') {
        if (photo.accountOwner !== 'account1') return false;
      } else if (selectedDayFilter === 'acc2') {
        if (photo.accountOwner !== 'account2') return false;
      } else if (selectedDayFilter === 'landmarks') {
        if (photo.uploadedByUser) return false;
      } else if (selectedDayFilter !== 'all') {
        if (photo.dayIndex !== selectedDayFilter) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = photo.title.toLowerCase().includes(q);
        const matchCaption = (photo.caption || '').toLowerCase().includes(q);
        const matchTheme = (photo.dayTheme || '').toLowerCase().includes(q);
        const matchOwner = (photo.accountOwnerName || '').toLowerCase().includes(q);
        const matchTags = (photo.tags || []).some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchCaption && !matchTheme && !matchOwner && !matchTags) return false;
      }

      return true;
    });
  }, [allPhotos, selectedDayFilter, searchQuery]);

  // Lightbox navigation
  const currentLightboxIndex = filteredPhotos.findIndex(p => p.id === lightboxPhotoId);
  const currentLightboxPhoto =
    currentLightboxIndex >= 0 ? filteredPhotos[currentLightboxIndex] : null;

  const handlePrevPhoto = () => {
    if (currentLightboxIndex > 0) {
      setLightboxPhotoId(filteredPhotos[currentLightboxIndex - 1].id);
    }
  };

  const handleNextPhoto = () => {
    if (currentLightboxIndex < filteredPhotos.length - 1) {
      setLightboxPhotoId(filteredPhotos[currentLightboxIndex + 1].id);
    }
  };

  // Group photos by day for grouped view
  const photosByDay = useMemo(() => {
    const map: Record<number, TripPhoto[]> = {};
    DAY_METADATA.forEach(d => {
      map[d.index] = [];
    });
    filteredPhotos.forEach(p => {
      if (map[p.dayIndex]) {
        map[p.dayIndex].push(p);
      } else {
        map[p.dayIndex] = [p];
      }
    });
    return map;
  }, [filteredPhotos]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-lg shadow-2xs border border-indigo-100">
            <i className="fa-solid fa-camera-retro"></i>
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="serif text-lg sm:text-xl font-bold text-slate-900">
                Combined Family Trip Photos
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                {allPhotos.length} Total ({totalGooglePhotos} from 2 Google Accounts)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Merging Google Photos from both you &amp; your wife into a unified itinerary gallery
            </p>
          </div>
        </div>

        {/* Actions: Method 3 Export & View Mode Toggle */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Collect into Google Shared Album / ZIP (Method 3) */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600 hover:from-blue-700 hover:to-rose-700 text-white font-bold text-xs shadow-2xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
            title="Create Google Shared Album or download .ZIP archive"
          >
            <i className="fa-solid fa-share-nodes text-xs"></i>
            <span>Collect / Shared Album</span>
            <span className="text-[9px] bg-white/20 text-white font-black px-1.5 py-0.5 rounded-full hidden sm:inline">
              Method 3
            </span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 text-slate-600">
            <button
              onClick={() => setViewMode('grouped')}
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'grouped' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
              title="Grouped by Itinerary Day"
            >
              <i className="fa-solid fa-layer-group mr-1"></i> By Day
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
              title="All Photos Grid"
            >
              <i className="fa-solid fa-table-cells mr-1"></i> Grid
            </button>
          </div>
        </div>
      </div>

      {/* DUAL GOOGLE PHOTOS CONNECTIONS HUB */}
      <div className="bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40 rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm shadow-2xs">
              <i className="fa-brands fa-google"></i>
            </span>
            <div>
              <h4 className="serif font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>Dual Google Photos Sync</span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <i className="fa-solid fa-shield-heart text-[9px]"></i>
                  <span>Face Filter Active · Screenshots Blocked</span>
                </span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Connect both accounts separately. Pictures taken during the trip (Oct 15–20) are automatically fetched and merged.
              </p>
            </div>
          </div>

          {acc1Info.email && acc2Info.email && (
            <button
              onClick={handleSyncBoth}
              disabled={isAcc1Syncing || isAcc2Syncing}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer self-start sm:self-auto"
            >
              <i className={`fa-solid fa-arrows-rotate text-[11px] ${isAcc1Syncing || isAcc2Syncing ? 'fa-spin' : ''}`}></i>
              <span>Sync Both Accounts</span>
            </button>
          )}
        </div>

        {/* Two Connection Cards (Husband & Wife) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Slot 1: Ting (Me) */}
          <div className="bg-white rounded-xl border border-blue-200/90 p-3.5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-blue-50">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold font-mono">
                    1
                  </span>
                  {!isEditingAcc1Label ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-blue-950">
                        {acc1Info.customLabel}
                      </span>
                      <button
                        onClick={() => {
                          setTempAcc1Label(acc1Info.customLabel);
                          setIsEditingAcc1Label(true);
                        }}
                        className="text-slate-400 hover:text-blue-600 text-[10px] p-0.5 cursor-pointer"
                        title="Rename label"
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={tempAcc1Label}
                        onChange={e => setTempAcc1Label(e.target.value)}
                        className="text-xs px-1.5 py-0.5 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-28"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveAcc1Label}
                        className="text-emerald-600 hover:text-emerald-700 text-xs px-1"
                        title="Save"
                      >
                        <i className="fa-solid fa-check"></i>
                      </button>
                    </div>
                  )}
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    acc1Info.email
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {acc1Info.email ? 'Connected' : 'Not Connected'}
                </span>
              </div>

              {/* Status details */}
              <div className="py-2.5">
                {acc1Info.email ? (
                  <div className="flex items-center gap-2.5">
                    {acc1Info.photoURL ? (
                      <img
                        src={acc1Info.photoURL}
                        alt="Avatar"
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full border border-blue-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                        {acc1Info.customLabel.charAt(0)}
                      </div>
                    )}
                    <div className="text-xs">
                      <p className="font-semibold text-slate-900 truncate max-w-[190px]">
                        {acc1Info.displayName || acc1Info.email}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[190px]">
                        {acc1Info.email}
                      </p>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span className="font-bold text-blue-700">
                          {acc1Photos.length} face photos
                        </span>
                        {acc1Info.lastSyncTime && (
                          <span>Synced {acc1Info.lastSyncTime}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-1">
                    Connect your primary Google account to automatically import your photos with faces.
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              {!acc1Info.email ? (
                <button
                  onClick={handleConnectAcc1}
                  disabled={isAcc1Connecting}
                  className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <i className="fa-brands fa-google text-xs"></i>
                  <span>{isAcc1Connecting ? 'Connecting...' : `Connect ${acc1Info.customLabel}`}</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (acc1Token) {
                        runPhotosImport('account1', acc1Token, acc1Info.customLabel, acc1Info.email);
                      } else {
                        handleConnectAcc1();
                      }
                    }}
                    disabled={isAcc1Syncing}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <i className={`fa-solid fa-arrows-rotate text-[11px] ${isAcc1Syncing ? 'fa-spin' : ''}`}></i>
                    <span>{isAcc1Syncing ? 'Syncing Faces...' : 'Sync Photos'}</span>
                  </button>
                  <button
                    onClick={handleDisconnectAcc1}
                    className="p-1.5 px-2.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs transition cursor-pointer"
                    title="Disconnect account"
                  >
                    <i className="fa-solid fa-right-from-bracket"></i>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Slot 2: Wife's Account */}
          <div className="bg-white rounded-xl border border-rose-200/90 p-3.5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-rose-50">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold font-mono">
                    2
                  </span>
                  {!isEditingAcc2Label ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-rose-950">
                        {acc2Info.customLabel}
                      </span>
                      <button
                        onClick={() => {
                          setTempAcc2Label(acc2Info.customLabel);
                          setIsEditingAcc2Label(true);
                        }}
                        className="text-slate-400 hover:text-rose-600 text-[10px] p-0.5 cursor-pointer"
                        title="Rename label"
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={tempAcc2Label}
                        onChange={e => setTempAcc2Label(e.target.value)}
                        className="text-xs px-1.5 py-0.5 border border-rose-300 rounded focus:outline-none focus:ring-1 focus:ring-rose-500 w-28"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveAcc2Label}
                        className="text-emerald-600 hover:text-emerald-700 text-xs px-1"
                        title="Save"
                      >
                        <i className="fa-solid fa-check"></i>
                      </button>
                    </div>
                  )}
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    acc2Info.email
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {acc2Info.email ? 'Connected' : 'Not Connected'}
                </span>
              </div>

              {/* Status details */}
              <div className="py-2.5">
                {acc2Info.email ? (
                  <div className="flex items-center gap-2.5">
                    {acc2Info.photoURL ? (
                      <img
                        src={acc2Info.photoURL}
                        alt="Avatar"
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full border border-rose-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-xs">
                        {acc2Info.customLabel.charAt(0)}
                      </div>
                    )}
                    <div className="text-xs">
                      <p className="font-semibold text-slate-900 truncate max-w-[190px]">
                        {acc2Info.displayName || acc2Info.email}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[190px]">
                        {acc2Info.email}
                      </p>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span className="font-bold text-rose-700">
                          {acc2Photos.length} face photos
                        </span>
                        {acc2Info.lastSyncTime && (
                          <span>Synced {acc2Info.lastSyncTime}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-1">
                    Connect your wife's Google account to combine her photos into the trip itinerary.
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              {!acc2Info.email ? (
                <button
                  onClick={handleConnectAcc2}
                  disabled={isAcc2Connecting}
                  className="w-full py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <i className="fa-brands fa-google text-xs"></i>
                  <span>{isAcc2Connecting ? 'Connecting...' : `Connect ${acc2Info.customLabel}`}</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (acc2Token) {
                        runPhotosImport('account2', acc2Token, acc2Info.customLabel, acc2Info.email);
                      } else {
                        handleConnectAcc2();
                      }
                    }}
                    disabled={isAcc2Syncing}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <i className={`fa-solid fa-arrows-rotate text-[11px] ${isAcc2Syncing ? 'fa-spin' : ''}`}></i>
                    <span>{isAcc2Syncing ? 'Syncing Faces...' : 'Sync Photos'}</span>
                  </button>
                  <button
                    onClick={handleDisconnectAcc2}
                    className="p-1.5 px-2.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs transition cursor-pointer"
                    title="Disconnect account"
                  >
                    <i className="fa-solid fa-right-from-bracket"></i>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Method 3: End of Trip Collection & Google Shared Album Card */}
        <div className="bg-white/95 border border-indigo-200/90 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs text-sm">
              <i className="fa-solid fa-wand-magic-sparkles"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900">
                  End of Trip: Collect into Google Shared Album
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200">
                  Method 3
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Combine all {allPhotos.length} photos ({totalGooglePhotos} Google Photos imports + landmark highlights) into a single collaborative album or download an offline day-by-day .ZIP archive.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600 hover:from-blue-700 hover:to-rose-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer"
          >
            <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
            <span>Export &amp; Share Album</span>
          </button>
        </div>

        {/* Live sync / error notifications */}
        {statusMessage && (
          <div className="text-xs bg-white/95 p-2.5 rounded-xl border border-blue-200 text-blue-900 flex items-center gap-2 shadow-2xs">
            <i className="fa-solid fa-circle-check text-emerald-600"></i>
            <span className="font-medium">{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="text-xs bg-red-50 p-2.5 rounded-xl border border-red-200 text-red-800 flex items-center gap-2 shadow-2xs">
            <i className="fa-solid fa-circle-exclamation text-red-600"></i>
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Day and Account Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          <button
            onClick={() => setSelectedDayFilter('all')}
            className={`filter-chip px-3 py-1.5 rounded-full font-bold cursor-pointer transition flex items-center gap-1 ${
              selectedDayFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>All Days</span>
            <span className="text-[10px] opacity-75">({allPhotos.length})</span>
          </button>

          {DAY_METADATA.map(d => {
            const count = allPhotos.filter(p => p.dayIndex === d.index).length;
            const isSelected = selectedDayFilter === d.index;
            return (
              <button
                key={d.index}
                onClick={() => setSelectedDayFilter(d.index)}
                className={`filter-chip px-3 py-1.5 rounded-full font-bold cursor-pointer transition flex items-center gap-1 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Day {d.index + 1}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}

          {/* Account 1 specific filter */}
          {acc1Photos.length > 0 && (
            <button
              onClick={() => setSelectedDayFilter('acc1')}
              className={`filter-chip px-3 py-1.5 rounded-full font-bold cursor-pointer transition flex items-center gap-1 ${
                selectedDayFilter === 'acc1'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
              }`}
            >
              <i className="fa-brands fa-google text-[9px]"></i>
              <span>{acc1Info.customLabel} ({acc1Photos.length})</span>
            </button>
          )}

          {/* Account 2 specific filter */}
          {acc2Photos.length > 0 && (
            <button
              onClick={() => setSelectedDayFilter('acc2')}
              className={`filter-chip px-3 py-1.5 rounded-full font-bold cursor-pointer transition flex items-center gap-1 ${
                selectedDayFilter === 'acc2'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <i className="fa-brands fa-google text-[9px]"></i>
              <span>{acc2Info.customLabel} ({acc2Photos.length})</span>
            </button>
          )}

          {/* Combined Google filter */}
          {totalGooglePhotos > 0 && (
            <button
              onClick={() => setSelectedDayFilter('google')}
              className={`filter-chip px-3 py-1.5 rounded-full font-bold cursor-pointer transition flex items-center gap-1 ${
                selectedDayFilter === 'google'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <i className="fa-solid fa-users text-[9px]"></i>
              <span>All Family ({totalGooglePhotos})</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] md:w-56">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search sights, people..."
            className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>
      </div>

      {/* Main Gallery Content */}
      {filteredPhotos.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-2.5 text-lg">
            <i className="fa-regular fa-image"></i>
          </div>
          <p className="font-bold text-slate-700 text-sm">No photos found for this filter</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Try adjusting your search terms or connect both Google Photos accounts above to automatically import photos from the trip!
          </p>
        </div>
      ) : viewMode === 'grouped' && selectedDayFilter === 'all' ? (
        // GROUPED BY DAY
        <div className="space-y-8">
          {DAY_METADATA.map(day => {
            const dayPhotos = photosByDay[day.index] || [];
            if (dayPhotos.length === 0) return null;

            const acc1DayCount = dayPhotos.filter(p => p.accountOwner === 'account1').length;
            const acc2DayCount = dayPhotos.filter(p => p.accountOwner === 'account2').length;

            return (
              <div key={day.index} className="space-y-3">
                {/* Day Section Header */}
                <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold font-mono">
                      {day.index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="serif font-bold text-sm text-slate-900">
                          {day.label} — {day.theme}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          ({dayPhotos.length} photos)
                        </span>
                        {acc1DayCount > 0 && (
                          <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-md">
                            {acc1Info.customLabel}: {acc1DayCount}
                          </span>
                        )}
                        {acc2DayCount > 0 && (
                          <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-md">
                            {acc2Info.customLabel}: {acc2DayCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onSelectItineraryDay && (
                      <button
                        onClick={() => onSelectItineraryDay(day.index)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <span>View Day Schedule</span>
                        <i className="fa-solid fa-arrow-right text-[10px]"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Day Photos Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {dayPhotos.map(photo => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      onClick={() => setLightboxPhotoId(photo.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // GRID VIEW OR SPECIFIC FILTER
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredPhotos.map(photo => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              onClick={() => setLightboxPhotoId(photo.id)}
            />
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      <PhotoLightboxModal
        photo={currentLightboxPhoto}
        onClose={() => setLightboxPhotoId(null)}
        onPrev={handlePrevPhoto}
        onNext={handleNextPhoto}
        onDelete={handleDeletePhoto}
        hasPrev={currentLightboxIndex > 0}
        hasNext={currentLightboxIndex < filteredPhotos.length - 1}
        currentIndex={currentLightboxIndex}
        totalCount={filteredPhotos.length}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* Method 3: End of Trip Google Shared Album & ZIP Export Modal */}
      <ExportSharedAlbumModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        photos={allPhotos}
        acc1Info={acc1Info}
        acc2Info={acc2Info}
        acc1Token={acc1Token}
        acc2Token={acc2Token}
        onConnectAccount={(accId) => {
          setIsExportModalOpen(false);
          if (accId === 'account1') {
            handleConnectAcc1();
          } else {
            handleConnectAcc2();
          }
        }}
      />
    </div>
  );
};

interface PhotoCardProps {
  photo: TripPhoto;
  onClick: () => void;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ photo, onClick }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col"
    >
      {/* Image thumbnail container */}
      <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
        {!imageError ? (
          <img
            src={photo.src}
            alt={photo.alt || photo.title}
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 p-3 text-center">
            <i className="fa-solid fa-landmark text-2xl mb-1 text-slate-300"></i>
            <span className="text-[11px] font-semibold">{photo.title}</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none gap-1">
          <span className="text-[10px] font-bold bg-slate-950/70 text-white backdrop-blur-xs px-2 py-0.5 rounded-full uppercase tracking-wider">
            Day {photo.dayIndex + 1}
          </span>
          {photo.uploadedByUser && (
            <span
              className={`text-[9px] font-bold text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs ${
                photo.accountOwner === 'account2' ? 'bg-rose-600' : 'bg-blue-600'
              }`}
            >
              <i className="fa-brands fa-google text-[8px]"></i>
              <span className="truncate max-w-[80px]">
                {photo.accountOwnerName || 'Google Photos'}
              </span>
            </span>
          )}
        </div>

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="w-9 h-9 rounded-full bg-white/90 text-slate-800 flex items-center justify-center text-xs shadow-md">
            <i className="fa-solid fa-expand"></i>
          </span>
        </div>
      </div>

      {/* Meta info */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition leading-snug line-clamp-1">
            {photo.title}
          </h4>
          {photo.caption && (
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {photo.caption}
            </p>
          )}
        </div>

        {/* Attribution and expand indicator */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <span className="truncate max-w-[130px] font-medium">
            {photo.accountOwnerName ? (
              <span className={photo.accountOwner === 'account2' ? 'text-rose-600 font-bold' : 'text-blue-600 font-bold'}>
                {photo.accountOwnerName}
              </span>
            ) : photo.tags?.[0] ? (
              `#${photo.tags[0]}`
            ) : (
              photo.dayTheme
            )}
          </span>
          <span className="text-slate-300 group-hover:text-blue-500 transition font-bold">
            Expand <i className="fa-solid fa-chevron-right text-[8px] ml-0.5"></i>
          </span>
        </div>
      </div>
    </div>
  );
};
