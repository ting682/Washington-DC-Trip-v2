import React, { useEffect } from 'react';
import { TripPhoto } from '../../types';

interface PhotoLightboxModalProps {
  photo: TripPhoto | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onDelete?: (id: string) => void;
  onMoveDay?: (id: string, newDay: number) => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
  onOpenExport?: () => void;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  photo,
  onClose,
  onPrev,
  onNext,
  onDelete,
  onMoveDay,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount,
  onOpenExport,
}) => {
  useEffect(() => {
    if (!photo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrev && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext && hasNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photo, onPrev, onNext, hasPrev, hasNext, onClose]);

  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/70 border-b border-slate-800 text-white">
          <div className="flex items-center gap-2.5 truncate">
            <span className="text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {photo.dayLabel}
            </span>
            {currentIndex !== undefined && totalCount !== undefined && (
              <span className="text-xs text-slate-400 font-mono">
                {currentIndex + 1} of {totalCount}
              </span>
            )}
            {photo.uploadedByUser && (
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                  photo.accountOwner === 'account2'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                }`}
              >
                <i className="fa-solid fa-cloud text-[9px]"></i>
                <span>{photo.accountOwnerName || 'Cloud Storage'}</span>
              </span>
            )}
            {photo.uploadedByUser && (
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 hidden sm:flex">
                <i className="fa-solid fa-cloud-arrow-up text-[9px]"></i> Cloud Synced
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onOpenExport && (
              <button
                onClick={() => {
                  onClose();
                  onOpenExport();
                }}
                className="text-xs bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition active:scale-95"
                title="Create Google Shared Album or download archive"
              >
                <i className="fa-solid fa-share-nodes text-[11px]"></i>
                <span className="hidden sm:inline">Export Album</span>
              </button>
            )}

            <a
              href={photo.src}
              target="_blank"
              rel="noopener noreferrer"
              download={`${photo.title.replace(/\s+/g, '_')}.jpg`}
              className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
              title="Open full size / Save"
            >
              <i className="fa-solid fa-arrow-up-right-from-square text-sm"></i>
            </a>

            {photo.uploadedByUser && onDelete && (
              <button
                onClick={() => {
                  if (confirm('Delete this uploaded photo?')) {
                    onDelete(photo.id);
                    onClose();
                  }
                }}
                className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-950/50 transition cursor-pointer"
                title="Delete photo"
              >
                <i className="fa-regular fa-trash-can text-sm"></i>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Close (Esc)"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        {/* Image viewport with navigation buttons */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] max-h-[58vh] overflow-hidden select-none">
          <img
            src={photo.src}
            alt={photo.alt || photo.title}
            referrerPolicy="no-referrer"
            className="max-h-full max-w-full object-contain"
          />

          {hasPrev && onPrev && (
            <button
              onClick={onPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center transition backdrop-blur-xs border border-white/10 shadow-lg cursor-pointer hover:scale-105 active:scale-95"
              title="Previous photo (Left arrow)"
            >
              <i className="fa-solid fa-chevron-left text-base"></i>
            </button>
          )}

          {hasNext && onNext && (
            <button
              onClick={onNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center transition backdrop-blur-xs border border-white/10 shadow-lg cursor-pointer hover:scale-105 active:scale-95"
              title="Next photo (Right arrow)"
            >
              <i className="fa-solid fa-chevron-right text-base"></i>
            </button>
          )}
        </div>

        {/* Caption & details info panel */}
        <div className="p-4 sm:p-5 bg-slate-900 text-slate-200 border-t border-slate-800 overflow-y-auto max-h-[28vh]">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <h3 className="serif text-lg sm:text-xl font-bold text-white tracking-wide">
              {photo.title}
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {photo.dayTheme}
            </span>
          </div>

          {photo.caption && (
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              {photo.caption}
            </p>
          )}

          {/* Tags */}
          {photo.tags && photo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {photo.tags.map(tag => (
                <span
                  key={tag}
                  className="text-[10px] font-semibold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md border border-slate-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Attribution / Upload timestamp / Move Day Action */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-3 flex-wrap">
              {photo.credit && (
                <div>
                  {photo.creditUrl ? (
                    <a
                      href={photo.creditUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-400 transition underline underline-offset-2"
                    >
                      {photo.credit}
                    </a>
                  ) : (
                    <span>{photo.credit}</span>
                  )}
                </div>
              )}
              {photo.uploadedAt && (
                <span className="text-slate-400">
                  Uploaded {photo.uploadedAt}
                </span>
              )}
            </div>

            {photo.uploadedByUser && onMoveDay && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Move to:</span>
                <select
                  value={photo.dayIndex}
                  onChange={e => onMoveDay(photo.id, parseInt(e.target.value, 10))}
                  className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-0.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
                >
                  <option value={0}>Day 1 (Oct 15 - Arrival)</option>
                  <option value={1}>Day 2 (Oct 16 - White House)</option>
                  <option value={2}>Day 3 (Oct 17 - Smithsonian)</option>
                  <option value={3}>Day 4 (Oct 18 - Spy Museum)</option>
                  <option value={4}>Day 5 (Oct 19 - Zoo Pandas)</option>
                  <option value={5}>Day 6 (Oct 20 - Departure)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
