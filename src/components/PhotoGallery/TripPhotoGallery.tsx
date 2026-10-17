import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DAY_METADATA, DEFAULT_TRIP_PHOTOS } from '../../data/defaultPhotos';
import {
  deletePhotoFromCloud,
  LOCAL_CACHE_KEY,
  subscribeToCloudPhotos,
  updatePhotoDay,
  uploadPhotosToCloud,
} from '../../services/cloudPhotoService';
import { getPhotosFromStorage, recoverFromLegacyDatabases } from '../../services/photoStorage';
import { TripPhoto } from '../../types';
import { ExportSharedAlbumModal } from './ExportSharedAlbumModal';
import { PhotoLightboxModal } from './PhotoLightboxModal';

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
  // Cloud-synced family photos from Firestore & local storage cache
  const [cloudPhotos, setCloudPhotos] = useState<TripPhoto[]>([]);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);

  // Uploader selector state
  const [activeUploader, setActiveUploader] = useState<'account1' | 'account2' | 'family'>('account1');
  const [acc1Label, setAcc1Label] = useState<string>(() => {
    return localStorage.getItem('dc_photo_uploader_acc1') || 'Ting (Me)';
  });
  const [acc2Label, setAcc2Label] = useState<string>(() => {
    return localStorage.getItem('dc_photo_uploader_acc2') || 'Wife';
  });
  const [isEditingLabels, setIsEditingLabels] = useState(false);
  const [tempAcc1Label, setTempAcc1Label] = useState(acc1Label);
  const [tempAcc2Label, setTempAcc2Label] = useState(acc2Label);

  // Target Day selector for upload - default to current itinerary day if numeric
  const [uploadTargetDay, setUploadTargetDay] = useState<number | 'auto'>(() => {
    return typeof initialDayFilter === 'number' ? initialDayFilter : 0;
  });

  // Manual Upload Progress & Status
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters & Views
  const [selectedDayFilter, setSelectedDayFilter] = useState<
    number | 'all' | 'cloud' | 'acc1' | 'acc2' | 'landmarks'
  >(initialDayFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grouped' | 'grid'>('grouped');

  // Lightbox modal state
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);

  // Method 3: End of Trip Google Shared Album & ZIP Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Cloud Drive & Shared Album links
  const [cloudStorageUrl, setCloudStorageUrl] = useState<string>(() => {
    return localStorage.getItem('dc_trip_cloud_storage_url') || 'https://drive.google.com';
  });
  const [isEditingCloudUrl, setIsEditingCloudUrl] = useState(false);
  const [tempCloudUrl, setTempCloudUrl] = useState(cloudStorageUrl);

  // Sync initialDayFilter when prop changes
  useEffect(() => {
    if (initialDayFilter !== undefined) {
      setSelectedDayFilter(initialDayFilter);
      if (typeof initialDayFilter === 'number') {
        setUploadTargetDay(initialDayFilter);
      }
    }
  }, [initialDayFilter]);

  // Subscribe to real-time Cloud Photos (Firestore) + local storage cache + automatic recovery
  useEffect(() => {
    let isMounted = true;

    // Load from local storage immediately so no delay
    getPhotosFromStorage(LOCAL_CACHE_KEY)
      .then(async cached => {
        if (!isMounted) return;
        if (cached && Array.isArray(cached) && cached.length > 0) {
          setCloudPhotos(cached);
        } else {
          // If empty, automatically scan legacy databases and localStorage
          const recovered = await recoverFromLegacyDatabases();
          if (isMounted && recovered && recovered.length > 0) {
            setCloudPhotos(recovered);
            setStatusMessage(`Restored ${recovered.length} previously uploaded photo(s)!`);
            setTimeout(() => setStatusMessage(null), 4000);
          }
        }
      })
      .catch(() => {});

    const unsubscribe = subscribeToCloudPhotos(
      photos => {
        if (!isMounted) return;
        setCloudPhotos(photos);
        setIsCloudConnected(true);
      },
      err => {
        console.warn('Cloud photo subscription notice:', err);
        setIsCloudConnected(false);
      }
    );

    // Listen to photo storage update events from any component
    const handleStorageUpdate = () => {
      getPhotosFromStorage(LOCAL_CACHE_KEY)
        .then(cached => {
          if (!isMounted) return;
          if (cached && Array.isArray(cached)) {
            setCloudPhotos(cached);
          }
        })
        .catch(() => {});
    };

    window.addEventListener('dc-trip-photos-updated', handleStorageUpdate);

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener('dc-trip-photos-updated', handleStorageUpdate);
    };
  }, []);

  // Save uploader labels
  const handleSaveLabels = () => {
    const trim1 = tempAcc1Label.trim() || 'Ting (Me)';
    const trim2 = tempAcc2Label.trim() || 'Wife';
    setAcc1Label(trim1);
    setAcc2Label(trim2);
    localStorage.setItem('dc_photo_uploader_acc1', trim1);
    localStorage.setItem('dc_photo_uploader_acc2', trim2);
    setIsEditingLabels(false);
    setStatusMessage('Uploader names updated!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Save Cloud Storage Folder link
  const handleSaveCloudUrl = () => {
    const trimmed = tempCloudUrl.trim();
    if (trimmed) {
      setCloudStorageUrl(trimmed);
      localStorage.setItem('dc_trip_cloud_storage_url', trimmed);
      setIsEditingCloudUrl(false);
      setStatusMessage('Cloud Storage / Google Drive link saved!');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // Process manual files for cloud upload
  const handleProcessFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      setErrorMessage('Please select valid image files (JPG, PNG, WebP, HEIC).');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress({ current: 0, total: fileArray.length });
    setStatusMessage(`Uploading ${fileArray.length} photo(s) to Cloud Storage...`);

    const uploaderName =
      activeUploader === 'account1'
        ? acc1Label
        : activeUploader === 'account2'
        ? acc2Label
        : 'Family';

    try {
      const uploaded = await uploadPhotosToCloud(fileArray, {
        accountOwner: activeUploader,
        accountOwnerName: uploaderName,
        targetDayIndex: uploadTargetDay,
        onProgress: (current, total) => {
          setUploadProgress({ current, total });
        },
      });

      // Immediate optimistic update in UI
      setCloudPhotos(prev => {
        const newIds = new Set(uploaded.map(p => p.id));
        return [...uploaded, ...prev.filter(p => !newIds.has(p.id))];
      });

      const targetDayLabel =
        typeof uploadTargetDay === 'number' ? `Day ${uploadTargetDay + 1}` : 'selected trip day';
      setStatusMessage(
        `Successfully added ${uploaded.length} photo(s) to ${targetDayLabel}! Saved to Family Cloud.`
      );
    } catch (err: any) {
      console.error('Cloud upload error:', err);
      setErrorMessage(`Upload error: ${err.message || 'Could not complete cloud upload'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => setStatusMessage(null), 6000);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  // Delete photo from Cloud Storage
  const handleDeletePhoto = async (photoId: string) => {
    if (confirm('Are you sure you want to delete this photo from Cloud Storage? It will be removed for everyone.')) {
      try {
        await deletePhotoFromCloud(photoId);
        setCloudPhotos(prev => prev.filter(p => p.id !== photoId));
        setStatusMessage('Photo removed from Cloud Storage.');
        if (lightboxPhotoId === photoId) {
          setLightboxPhotoId(null);
        }
        setTimeout(() => setStatusMessage(null), 3500);
      } catch (e: any) {
        setErrorMessage(`Delete failed: ${e.message}`);
        setTimeout(() => setErrorMessage(null), 4000);
      }
    }
  };

  // Reassign photo to another trip day
  const handleMovePhotoDay = async (photoId: string, newDayIndex: number) => {
    try {
      await updatePhotoDay(photoId, newDayIndex);
      const meta = DAY_METADATA.find(d => d.index === newDayIndex) || DAY_METADATA[0];
      setCloudPhotos(prev =>
        prev.map(p => {
          if (p.id === photoId) {
            return {
              ...p,
              dayIndex: newDayIndex,
              dayLabel: meta.label,
              dayTheme: meta.theme,
              tags: (p.tags || []).map(t => (t.startsWith('Day ') ? `Day ${newDayIndex + 1}` : t)),
            };
          }
          return p;
        })
      );
      setStatusMessage(`Photo moved to Day ${newDayIndex + 1} (${meta.label})!`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (e: any) {
      setErrorMessage(`Move failed: ${e.message}`);
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  // Manually trigger legacy database & cache restoration
  const handleRecoverPhotos = async () => {
    setStatusMessage('Scanning browser storage for previous uploads...');
    try {
      const recovered = await recoverFromLegacyDatabases();
      if (recovered.length > 0) {
        setCloudPhotos(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = recovered.filter(r => !existingIds.has(r.id));
          return [...newItems, ...prev];
        });
        setStatusMessage(`Restored ${recovered.length} previously uploaded photo(s)!`);
      } else {
        setStatusMessage('No previous un-synced photos found in browser history.');
      }
    } catch (e) {
      setStatusMessage('Scan completed.');
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Combine default landmark photos with Cloud Storage photos
  const allPhotos = useMemo(() => {
    return [...cloudPhotos, ...DEFAULT_TRIP_PHOTOS];
  }, [cloudPhotos]);

  // Breakdown counts
  const acc1Count = useMemo(() => {
    return cloudPhotos.filter(p => p.accountOwner === 'account1').length;
  }, [cloudPhotos]);

  const acc2Count = useMemo(() => {
    return cloudPhotos.filter(p => p.accountOwner === 'account2').length;
  }, [cloudPhotos]);

  // Filter photos
  const filteredPhotos = useMemo(() => {
    return allPhotos.filter(photo => {
      // Source / Day Filter
      if (selectedDayFilter === 'cloud') {
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
          <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shadow-2xs border border-blue-100">
            <i className="fa-solid fa-cloud-arrow-up"></i>
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="serif text-lg sm:text-xl font-bold text-slate-900">
                Family Cloud Photo Storage
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <i className="fa-solid fa-circle text-[6px] text-emerald-500 animate-pulse"></i>
                <span>{cloudPhotos.length} Cloud Uploads ({allPhotos.length} Total)</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Manual cloud photo upload &amp; real-time family sync across all devices
            </p>
          </div>
        </div>

        {/* Top Actions: Export ZIP & View Mode Toggle */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Collect into ZIP / Google Drive */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600 hover:from-blue-700 hover:to-rose-700 text-white font-bold text-xs shadow-2xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
            title="Download .ZIP archive or export shared album"
          >
            <i className="fa-solid fa-file-zipper text-xs"></i>
            <span>Download All (.ZIP)</span>
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

      {/* Status Messages */}
      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-fadeIn">
          <i className="fa-solid fa-circle-check text-emerald-600 shrink-0"></i>
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation text-rose-600 shrink-0"></i>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-700 p-1 cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* CLOUD STORAGE & MANUAL UPLOAD STUDIO */}
      <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 rounded-2xl p-4 sm:p-5 border border-blue-200/80 shadow-2xs space-y-4">
        {/* Header & Cloud Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-100/80">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm shadow-2xs">
              <i className="fa-solid fa-cloud"></i>
            </span>
            <div>
              <h4 className="serif font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>Family Cloud Photo Uploader</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isCloudConnected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <i
                    className={`fa-solid ${
                      isCloudConnected ? 'fa-signal text-emerald-600' : 'fa-triangle-exclamation text-amber-600'
                    } text-[9px]`}
                  ></i>
                  <span>{isCloudConnected ? 'Live Cloud Sync' : 'Offline Cache'}</span>
                </span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Uploaded photos sync to the app's real-time family database and appear immediately in that day's itinerary reel.
              </p>
            </div>
          </div>

          {/* Quick counts & Restore button */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-900 font-bold text-[11px] flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>{acc1Label}:</span>
              <span className="text-blue-700 font-extrabold">{acc1Count}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-900 font-bold text-[11px] flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>{acc2Label}:</span>
              <span className="text-rose-600 font-extrabold">{acc2Count}</span>
            </span>
            <button
              onClick={handleRecoverPhotos}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[11px] flex items-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
              title="Search and restore photos uploaded prior to update"
            >
              <i className="fa-solid fa-arrows-rotate text-[10px] text-indigo-600"></i>
              <span>Restore Previous Uploads</span>
            </button>
          </div>
        </div>

        {/* Upload Controls Configuration Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Uploader selection */}
          <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <i className="fa-solid fa-user-check text-blue-600"></i>
                <span>Uploading As:</span>
              </span>
              <button
                onClick={() => setIsEditingLabels(!isEditingLabels)}
                className="text-[10px] text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                {isEditingLabels ? 'Cancel' : 'Edit Names'}
              </button>
            </div>

            {!isEditingLabels ? (
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveUploader('account1')}
                  className={`py-1.5 px-2 rounded-lg font-bold text-xs transition cursor-pointer truncate flex items-center justify-center gap-1 ${
                    activeUploader === 'account1'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <i className="fa-solid fa-user text-[10px]"></i>
                  <span className="truncate">{acc1Label}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveUploader('account2')}
                  className={`py-1.5 px-2 rounded-lg font-bold text-xs transition cursor-pointer truncate flex items-center justify-center gap-1 ${
                    activeUploader === 'account2'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <i className="fa-solid fa-heart text-[10px]"></i>
                  <span className="truncate">{acc2Label}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveUploader('family')}
                  className={`py-1.5 px-2 rounded-lg font-bold text-xs transition cursor-pointer truncate flex items-center justify-center gap-1 ${
                    activeUploader === 'family'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <i className="fa-solid fa-people-roof text-[10px]"></i>
                  <span className="truncate">Family</span>
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-12 text-[10px] text-slate-500">Slot 1:</span>
                  <input
                    type="text"
                    value={tempAcc1Label}
                    onChange={e => setTempAcc1Label(e.target.value)}
                    className="flex-1 px-2 py-0.5 border border-slate-300 rounded text-xs"
                    placeholder="Ting"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-12 text-[10px] text-slate-500">Slot 2:</span>
                  <input
                    type="text"
                    value={tempAcc2Label}
                    onChange={e => setTempAcc2Label(e.target.value)}
                    className="flex-1 px-2 py-0.5 border border-slate-300 rounded text-xs"
                    placeholder="Wife"
                  />
                </div>
                <button
                  onClick={handleSaveLabels}
                  className="w-full mt-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs cursor-pointer"
                >
                  Save Names
                </button>
              </div>
            )}
          </div>

          {/* Target Itinerary Day selection */}
          <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <i className="fa-solid fa-calendar-day text-blue-600"></i>
                <span>Assign to Day:</span>
              </span>
              <span className="text-[10px] text-indigo-700 bg-indigo-50 font-bold px-1.5 py-0.5 rounded">
                {typeof uploadTargetDay === 'number'
                  ? `Day ${uploadTargetDay + 1} Selected`
                  : 'Auto-detecting'}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 mb-2">
              {[0, 1, 2, 3, 4, 5].map(idx => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setUploadTargetDay(idx)}
                  className={`py-1 px-1 rounded-md text-[11px] font-bold transition cursor-pointer text-center ${
                    uploadTargetDay === idx
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Day {idx + 1}
                </button>
              ))}
            </div>

            <select
              value={uploadTargetDay}
              onChange={e => {
                const val = e.target.value;
                setUploadTargetDay(val === 'auto' ? 'auto' : parseInt(val, 10));
              }}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="0">Day 1 · Thu Oct 15 (Arrival &amp; Ammathar Thai)</option>
              <option value="1">Day 2 · Fri Oct 16 (White House &amp; Old Town)</option>
              <option value="2">Day 3 · Sat Oct 17 (Smithsonian &amp; The Wharf)</option>
              <option value="3">Day 4 · Sun Oct 18 (Spy Museum &amp; Lincoln Sunset)</option>
              <option value="4">Day 5 · Mon Oct 19 (Zoo Pandas &amp; Capitol Hill)</option>
              <option value="5">Day 6 · Tue Oct 20 (Departure &amp; DCA Terminal 2)</option>
              <option value="auto">✨ Auto-Detect Day (from file photo date)</option>
            </select>
          </div>
        </div>

        {/* Drag & Drop Manual Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
            isDragging
              ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
              : 'border-blue-300 hover:border-blue-500 bg-white hover:bg-blue-50/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={e => {
              if (e.target.files && e.target.files.length > 0) {
                handleProcessFiles(e.target.files);
              }
            }}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shadow-xs mb-3 group-hover:scale-110 transition-transform">
            <i className={`fa-solid ${isUploading ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'}`}></i>
          </div>

          <h5 className="font-bold text-sm sm:text-base text-slate-900 mb-1">
            {isUploading
              ? 'Uploading to Cloud Storage...'
              : 'Click or Drag & Drop Photos to Upload'}
          </h5>

          <p className="text-xs text-slate-500 max-w-md">
            Select one or multiple photos from your camera roll, computer, or downloaded Google Photos. Photos are automatically compressed for high-speed cloud sync.
          </p>

          <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
            <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
              <i className="fa-solid fa-plus text-[10px]"></i>
              <span>Select Photos (Multi-select)</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              Uploading as: <strong className="text-slate-800">{activeUploader === 'account1' ? acc1Label : activeUploader === 'account2' ? acc2Label : 'Family'}</strong>
            </span>
          </div>

          {/* Upload Progress Bar */}
          {uploadProgress && (
            <div className="w-full max-w-xs mt-4">
              <div className="flex justify-between text-[11px] font-bold text-blue-900 mb-1">
                <span>Uploading...</span>
                <span>
                  {uploadProgress.current} / {uploadProgress.total}
                </span>
              </div>
              <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Cloud Storage / Google Drive Link Row */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[11px] font-bold text-slate-500 shrink-0 flex items-center gap-1">
              <i className="fa-brands fa-google-drive text-emerald-600"></i>
              <span>Shared Cloud Folder:</span>
            </span>
            {!isEditingCloudUrl ? (
              <div className="flex items-center gap-2 truncate">
                <a
                  href={cloudStorageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-600 hover:underline truncate font-mono"
                >
                  {cloudStorageUrl}
                </a>
                <button
                  onClick={() => {
                    setTempCloudUrl(cloudStorageUrl);
                    setIsEditingCloudUrl(true);
                  }}
                  className="text-slate-400 hover:text-blue-600 text-[10px] p-0.5 cursor-pointer"
                  title="Edit link"
                >
                  <i className="fa-solid fa-pen"></i>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-1 max-w-md">
                <input
                  type="url"
                  value={tempCloudUrl}
                  onChange={e => setTempCloudUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="text-xs px-2 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 font-mono text-[11px]"
                  autoFocus
                />
                <button
                  onClick={handleSaveCloudUrl}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingCloudUrl(false)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={cloudStorageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1.5 transition border border-emerald-200"
            >
              <i className="fa-brands fa-google-drive"></i>
              <span>Open Google Drive</span>
              <i className="fa-solid fa-arrow-up-right-from-square text-[8px]"></i>
            </a>
            <a
              href="https://photos.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1.5 transition"
            >
              <i className="fa-brands fa-google text-blue-600"></i>
              <span>Google Photos</span>
              <i className="fa-solid fa-arrow-up-right-from-square text-[8px]"></i>
            </a>
          </div>
        </div>
      </div>

      {/* GALLERY FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedDayFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
              selectedDayFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Photos ({allPhotos.length})
          </button>
          <button
            onClick={() => setSelectedDayFilter('cloud')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
              selectedDayFilter === 'cloud'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            <i className="fa-solid fa-cloud text-[10px]"></i>
            <span>Cloud Uploads ({cloudPhotos.length})</span>
          </button>
          <button
            onClick={() => setSelectedDayFilter('acc1')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
              selectedDayFilter === 'acc1'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>{acc1Label} ({acc1Count})</span>
          </button>
          <button
            onClick={() => setSelectedDayFilter('acc2')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
              selectedDayFilter === 'acc2'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>{acc2Label} ({acc2Count})</span>
          </button>

          <span className="text-slate-300 mx-1">|</span>

          {/* Days 1 to 6 */}
          {DAY_METADATA.map(day => {
            const count = allPhotos.filter(p => p.dayIndex === day.index).length;
            const isSelected = selectedDayFilter === day.index;
            return (
              <button
                key={day.index}
                onClick={() => setSelectedDayFilter(day.index)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Day {day.index + 1} ({count})
              </button>
            );
          })}

          <button
            onClick={() => setSelectedDayFilter('landmarks')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
              selectedDayFilter === 'landmarks'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Landmarks
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full lg:w-64">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search photos, landmarks, days..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>
      </div>

      {/* PHOTOS CONTENT: GROUPED BY DAY OR GRID VIEW */}
      {viewMode === 'grouped' ? (
        /* GROUPED BY DAY VIEW */
        <div className="space-y-8">
          {DAY_METADATA.map(day => {
            const dayPhotosList = photosByDay[day.index] || [];
            if (selectedDayFilter !== 'all' && selectedDayFilter !== day.index) {
              return null;
            }

            return (
              <div
                key={day.index}
                className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-white to-slate-50/50 shadow-2xs space-y-4"
              >
                {/* Day Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm border border-blue-100">
                      D{day.index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="serif font-bold text-base text-slate-900">
                          {day.label}: {day.shortName}
                        </h4>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                          {dayPhotosList.length} Photos
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{day.theme}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {onSelectItineraryDay && (
                      <button
                        onClick={() => onSelectItineraryDay(day.index)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <span>View Day Itinerary</span>
                        <i className="fa-solid fa-arrow-right text-[10px]"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Photos Grid for this Day */}
                {dayPhotosList.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {dayPhotosList.map(photo => (
                      <PhotoCard
                        key={photo.id}
                        photo={photo}
                        onSelect={() => setLightboxPhotoId(photo.id)}
                        onDelete={() => handleDeletePhoto(photo.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                    <i className="fa-solid fa-camera text-2xl mb-1 text-slate-300"></i>
                    <p className="text-xs font-semibold">No photos uploaded for Day {day.index + 1} yet.</p>
                    <button
                      onClick={() => {
                        setUploadTargetDay(day.index);
                        fileInputRef.current?.click();
                      }}
                      className="mt-2 text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      + Upload photos for this day
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ALL PHOTOS GRID VIEW */
        <div>
          {filteredPhotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredPhotos.map(photo => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  onSelect={() => setLightboxPhotoId(photo.id)}
                  onDelete={() => handleDeletePhoto(photo.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <i className="fa-solid fa-images text-3xl mb-2 text-slate-300"></i>
              <p className="text-sm font-semibold text-slate-600">No photos match your current filter.</p>
              <button
                onClick={() => {
                  setSelectedDayFilter('all');
                  setSearchQuery('');
                }}
                className="mt-2 text-xs text-blue-600 font-bold hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {currentLightboxPhoto && (
        <PhotoLightboxModal
          photo={currentLightboxPhoto}
          onClose={() => setLightboxPhotoId(null)}
          onPrev={handlePrevPhoto}
          onNext={handleNextPhoto}
          hasPrev={currentLightboxIndex > 0}
          hasNext={currentLightboxIndex < filteredPhotos.length - 1}
          currentIndex={currentLightboxIndex}
          totalCount={filteredPhotos.length}
          onDelete={
            currentLightboxPhoto.uploadedByUser
              ? () => handleDeletePhoto(currentLightboxPhoto.id)
              : undefined
          }
          onMoveDay={
            currentLightboxPhoto.uploadedByUser
              ? handleMovePhotoDay
              : undefined
          }
        />
      )}

      {/* Export to Shared Album / ZIP Modal */}
      <ExportSharedAlbumModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        photos={allPhotos}
        acc1Info={{
          id: 'account1',
          customLabel: acc1Label,
          email: null,
          displayName: acc1Label,
          photoURL: null,
          lastSyncTime: null,
          photoCount: acc1Count,
        }}
        acc2Info={{
          id: 'account2',
          customLabel: acc2Label,
          email: null,
          displayName: acc2Label,
          photoURL: null,
          lastSyncTime: null,
          photoCount: acc2Count,
        }}
        acc1Token={null}
        acc2Token={null}
      />
    </div>
  );
};

/**
 * Individual Photo Card Component with Cloud Badges & Actions
 */
interface PhotoCardProps {
  photo: TripPhoto;
  onSelect: () => void;
  onDelete?: () => void;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ photo, onSelect, onDelete }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      onClick={onSelect}
      className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col hover:border-blue-400"
    >
      {/* Image Thumbnail Container */}
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
                photo.accountOwner === 'account2'
                  ? 'bg-rose-600'
                  : photo.accountOwner === 'account1'
                  ? 'bg-blue-600'
                  : 'bg-indigo-600'
              }`}
            >
              <i className="fa-solid fa-cloud text-[8px]"></i>
              <span className="truncate max-w-[80px]">
                {photo.accountOwnerName || 'Cloud'}
              </span>
            </span>
          )}
        </div>

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="w-8 h-8 rounded-full bg-white/95 text-slate-800 flex items-center justify-center text-xs shadow-md">
            <i className="fa-solid fa-expand"></i>
          </span>
        </div>
      </div>

      {/* Meta info */}
      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <div>
          <h5 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition leading-snug line-clamp-1">
            {photo.title}
          </h5>
          {photo.caption && (
            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 leading-relaxed">
              {photo.caption}
            </p>
          )}
        </div>

        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <span className="truncate max-w-[120px] font-semibold">
            {photo.uploadedByUser ? (
              <span
                className={
                  photo.accountOwner === 'account2' ? 'text-rose-600 font-bold' : 'text-blue-600 font-bold'
                }
              >
                {photo.accountOwnerName}
              </span>
            ) : (
              photo.dayTheme || 'Landmark'
            )}
          </span>
          <span className="text-[9px] text-slate-400">
            {photo.uploadedAt || 'Oct 2026'}
          </span>
        </div>
      </div>
    </div>
  );
};
