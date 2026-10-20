import React, { useEffect, useRef, useState } from 'react';
import { DAY_METADATA, DEFAULT_TRIP_PHOTOS } from '../../data/defaultPhotos';
import {
  LOCAL_CACHE_KEY,
  subscribeToCloudPhotos,
  uploadPhotosToCloud,
} from '../../services/cloudPhotoService';
import { getPhotosFromStorage } from '../../services/photoStorage';
import { TripPhoto } from '../../types';

interface DayPhotoReelProps {
  dayIndex: number;
  onOpenFullGallery: (dayIndex: number) => void;
  onSelectPhoto: (photo: TripPhoto) => void;
}

export const DayPhotoReel: React.FC<DayPhotoReelProps> = ({
  dayIndex,
  onOpenFullGallery,
  onSelectPhoto,
}) => {
  // Initialize immediately with default photos for this day so it is never blank
  const [dayPhotos, setDayPhotos] = useState<TripPhoto[]>(() => {
    return DEFAULT_TRIP_PHOTOS.filter(p => p.dayIndex === dayIndex);
  });
  const [hasCloudPhotos, setHasCloudPhotos] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadToast, setUploadToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to sync photos for the current day
  const refreshDayPhotos = (cloudList: TripPhoto[]) => {
    const userPhotosForDay = cloudList.filter(p => p.dayIndex === dayIndex);
    const defaultPhotosForDay = DEFAULT_TRIP_PHOTOS.filter(p => p.dayIndex === dayIndex);
    // User photos appear first, followed by curated landmark photos
    setDayPhotos([...userPhotosForDay, ...defaultPhotosForDay]);
    setHasCloudPhotos(userPhotosForDay.length > 0);
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Check local storage cache immediately
    getPhotosFromStorage(LOCAL_CACHE_KEY)
      .then(cached => {
        if (!isMounted) return;
        if (cached && Array.isArray(cached)) {
          refreshDayPhotos(cached);
        }
      })
      .catch(() => {});

    // 2. Real-time subscription to cloud photos
    const unsubscribe = subscribeToCloudPhotos(cloudList => {
      if (!isMounted) return;
      refreshDayPhotos(cloudList);
    });

    // 3. Listen to app-wide photo update events
    const handleStorageUpdate = () => {
      getPhotosFromStorage(LOCAL_CACHE_KEY)
        .then(cached => {
          if (!isMounted) return;
          if (cached && Array.isArray(cached)) {
            refreshDayPhotos(cached);
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
  }, [dayIndex]);

  // Handle direct file upload for this specific day
  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    setIsUploading(true);
    setUploadToast(`Uploading ${fileArray.length} photo(s) to Day ${dayIndex + 1}...`);

    try {
      const activeRole = (localStorage.getItem('dc_active_uploader') as 'account1' | 'account2' | 'family') || 'account1';
      const uploaderName =
        activeRole === 'account2'
          ? localStorage.getItem('dc_photo_uploader_acc2') || 'Wife'
          : activeRole === 'account1'
          ? localStorage.getItem('dc_photo_uploader_acc1') || 'Ting (Me)'
          : 'Family';

      const uploaded = await uploadPhotosToCloud(fileArray, {
        accountOwner: activeRole,
        accountOwnerName: uploaderName,
        targetDayIndex: dayIndex, // Explicitly lock to this day!
      });

      // Immediate optimistic update in UI
      setDayPhotos(prev => {
        const existingIds = new Set(uploaded.map(u => u.id));
        return [...uploaded, ...prev.filter(p => !existingIds.has(p.id))];
      });
      setHasCloudPhotos(true);

      setUploadToast(`Added ${uploaded.length} photo(s) to Day ${dayIndex + 1}!`);
      setTimeout(() => setUploadToast(null), 3500);
    } catch (err) {
      console.error('Reel direct upload error:', err);
      setUploadToast('Upload error. Please try again.');
      setTimeout(() => setUploadToast(null), 4000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const dayMeta = DAY_METADATA.find(d => d.index === dayIndex) || DAY_METADATA[0];
  const userPhotoCount = dayPhotos.filter(p => p.uploadedByUser).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
      {/* Hidden file input for direct Day uploads */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleDirectUpload}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm shadow-2xs shrink-0">
            <i className="fa-solid fa-camera"></i>
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="serif font-bold text-sm text-slate-900">
                Day {dayIndex + 1} Trip Photos
              </h4>
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                {dayPhotos.length} Photos
              </span>
              {userPhotoCount > 0 && (
                <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <i className="fa-solid fa-cloud text-[8px]"></i>
                  <span>{userPhotoCount} Family Upload{userPhotoCount > 1 ? 's' : ''}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {dayMeta.theme}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Direct upload button for this day */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50"
            title={`Upload photos directly to Day ${dayIndex + 1}`}
          >
            {isUploading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
                <span>+ Upload Day {dayIndex + 1} Photos</span>
              </>
            )}
          </button>

          <button
            onClick={() => onOpenFullGallery(dayIndex)}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
          >
            <span>All Days</span>
            <i className="fa-solid fa-arrow-right text-[10px]"></i>
          </button>
        </div>
      </div>

      {/* Upload Toast notification */}
      {uploadToast && (
        <div className="mt-2.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-fadeIn">
          <span className="flex items-center gap-1.5 font-medium">
            <i className="fa-solid fa-circle-check text-emerald-600"></i>
            {uploadToast}
          </span>
          <button
            onClick={() => setUploadToast(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs ml-2 cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Horizontal thumbnail strip */}
      <div className="mt-3 flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {dayPhotos.map(photo => (
          <div
            key={photo.id}
            onClick={() => onSelectPhoto(photo)}
            className="group flex-shrink-0 w-36 rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:border-indigo-400 transition hover:shadow-xs relative"
          >
            <div className="relative h-24 bg-slate-100 overflow-hidden">
              <img
                src={photo.src}
                alt={photo.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
              {photo.uploadedByUser && (
                <span
                  className={`absolute top-1.5 right-1.5 text-[8px] font-black text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs ${
                    photo.accountOwner === 'account2' ? 'bg-rose-600' : 'bg-blue-600'
                  }`}
                >
                  <i className="fa-solid fa-cloud text-[7px]"></i>
                  <span className="truncate max-w-[50px]">{photo.accountOwnerName || 'Family'}</span>
                </span>
              )}
            </div>
            <div className="p-1.5 bg-white">
              <span className="text-[11px] font-bold text-slate-800 truncate block group-hover:text-blue-600">
                {photo.title}
              </span>
            </div>
          </div>
        ))}

        {/* Quick Upload Card right on the strip */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 w-28 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50 p-2 flex flex-col items-center justify-center text-center cursor-pointer transition hover:border-emerald-500"
        >
          <div className="w-8 h-8 rounded-full bg-white text-emerald-600 flex items-center justify-center mb-1 shadow-2xs border border-emerald-200">
            <i className="fa-solid fa-plus text-xs"></i>
          </div>
          <span className="text-[10px] font-bold text-emerald-800">Add Photo</span>
          <span className="text-[9px] text-emerald-600 font-medium">Day {dayIndex + 1}</span>
        </div>

        {/* Explore all photos shortcut card */}
        <div
          onClick={() => onOpenFullGallery(dayIndex)}
          className="flex-shrink-0 w-28 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/40 p-2 flex flex-col items-center justify-center text-center cursor-pointer transition"
        >
          <div className="w-8 h-8 rounded-full bg-white text-indigo-600 flex items-center justify-center mb-1 shadow-2xs border border-indigo-100">
            <i className="fa-solid fa-images text-xs"></i>
          </div>
          <span className="text-[10px] font-bold text-slate-700">All Photos</span>
          <span className="text-[9px] text-slate-400">Day {dayIndex + 1}</span>
        </div>
      </div>
    </div>
  );
};
