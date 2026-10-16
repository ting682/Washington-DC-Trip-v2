import React, { useEffect, useState } from 'react';
import { DAY_METADATA, DEFAULT_TRIP_PHOTOS } from '../../data/defaultPhotos';
import { subscribeToCloudPhotos } from '../../services/cloudPhotoService';
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
  const [dayPhotos, setDayPhotos] = useState<TripPhoto[]>([]);
  const [hasCloudPhotos, setHasCloudPhotos] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToCloudPhotos((cloudPhotos) => {
      const all = [...cloudPhotos, ...DEFAULT_TRIP_PHOTOS];
      const forThisDay = all.filter(p => p.dayIndex === dayIndex);
      setDayPhotos(forThisDay);
      setHasCloudPhotos(cloudPhotos.some(p => p.dayIndex === dayIndex));
    });

    return () => unsubscribe();
  }, [dayIndex]);

  const dayMeta = DAY_METADATA.find(d => d.index === dayIndex) || DAY_METADATA[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm shadow-2xs">
            <i className="fa-solid fa-camera"></i>
          </span>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="serif font-bold text-sm text-slate-900">
                Day {dayIndex + 1} Trip Photos
              </h4>
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                {dayPhotos.length} Photos
              </span>
              {hasCloudPhotos && (
                <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <i className="fa-solid fa-cloud text-[8px]"></i>
                  <span>Cloud Synced</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {dayMeta.theme}
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenFullGallery(dayIndex)}
          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
        >
          <span>View Day Gallery</span>
          <i className="fa-solid fa-arrow-right text-[10px]"></i>
        </button>
      </div>

      {/* Horizontal thumbnail strip */}
      <div className="mt-3 flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {dayPhotos.map(photo => (
          <div
            key={photo.id}
            onClick={() => onSelectPhoto(photo)}
            className="group flex-shrink-0 w-36 rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:border-indigo-400 transition hover:shadow-xs"
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
                  <span className="truncate max-w-[50px]">{photo.accountOwnerName || 'Cloud'}</span>
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
