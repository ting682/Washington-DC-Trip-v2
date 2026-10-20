import React, { useEffect, useState } from 'react';
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!photo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
      if (e.key === 'ArrowLeft' && onPrev && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext && hasNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photo, onPrev, onNext, hasPrev, hasNext, onClose, showDeleteConfirm]);

  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* SAFE CONFIRMATION DIALOG FOR PHOTO DELETION */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full text-center shadow-2xl space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center text-xl border border-rose-500/30">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Delete Photo from Cloud?</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete this photo? It will be removed from the family cloud and daily itinerary for all devices.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer active:scale-95 border border-slate-700"
                >
                  Keep Photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    if (onDelete) onDelete(photo.id);
                    onClose();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer shadow-md active:scale-95"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOP BAR: Prominent Exit buttons and clear photo counter */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-950 border-b border-slate-800 text-white gap-2">
          {/* Mobile-Friendly Back / Exit Button on Left */}
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm transition cursor-pointer shadow-sm active:scale-95 border border-slate-700 shrink-0 min-h-[40px]"
            title="Exit photo viewer"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i>
            <span>Back</span>
          </button>

          {/* Photo Info Badge */}
          <div className="flex items-center gap-2 truncate min-w-0">
            <span className="text-[11px] sm:text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
              {photo.dayLabel}
            </span>
            {currentIndex !== undefined && totalCount !== undefined && (
              <span className="text-[11px] sm:text-xs text-slate-400 font-mono shrink-0">
                {currentIndex + 1} / {totalCount}
              </span>
            )}
            {photo.uploadedByUser && (
              <span
                className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full items-center gap-1 border shrink-0 hidden sm:flex ${
                  photo.accountOwner === 'account2'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                }`}
              >
                <i className="fa-solid fa-cloud text-[8px]"></i>
                <span>{photo.accountOwnerName || 'Family'}</span>
              </span>
            )}
          </div>

          {/* Actions on Right: Export, Save & Clear Distinct Close Button */}
          <div className="flex items-center gap-2 shrink-0">
            {onOpenExport && (
              <button
                onClick={() => {
                  onClose();
                  onOpenExport();
                }}
                className="text-xs bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold px-2.5 py-2 rounded-xl items-center gap-1.5 transition active:scale-95 hidden md:flex min-h-[40px]"
                title="Create Google Shared Album or download archive"
              >
                <i className="fa-solid fa-share-nodes text-[11px]"></i>
                <span>Export</span>
              </button>
            )}

            <a
              href={photo.src}
              target="_blank"
              rel="noopener noreferrer"
              download={`${photo.title.replace(/\s+/g, '_')}.jpg`}
              className="text-slate-300 hover:text-white px-2.5 py-2 rounded-xl hover:bg-slate-800 transition min-h-[40px] flex items-center justify-center"
              title="Open full size / Save"
            >
              <i className="fa-solid fa-arrow-up-right-from-square text-xs sm:text-sm"></i>
            </a>

            {/* Clear, unmistakable CLOSE button */}
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm transition cursor-pointer border border-white/20 shadow-sm active:scale-95 min-h-[40px]"
              title="Close viewer (Esc)"
              aria-label="Close photo viewer"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* IMAGE VIEWPORT WITH BIG TOUCH NAVIGATION ARROWS */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[260px] sm:min-h-[320px] max-h-[52vh] sm:max-h-[58vh] overflow-hidden select-none">
          <img
            src={photo.src}
            alt={photo.alt || photo.title}
            referrerPolicy="no-referrer"
            className="max-h-full max-w-full object-contain"
          />

          {hasPrev && onPrev && (
            <button
              onClick={onPrev}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-900/85 hover:bg-slate-800 text-white flex items-center justify-center transition backdrop-blur-xs border border-white/15 shadow-xl cursor-pointer hover:scale-105 active:scale-90"
              title="Previous photo (Left arrow)"
              aria-label="Previous photo"
            >
              <i className="fa-solid fa-chevron-left text-sm sm:text-base"></i>
            </button>
          )}

          {hasNext && onNext && (
            <button
              onClick={onNext}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-900/85 hover:bg-slate-800 text-white flex items-center justify-center transition backdrop-blur-xs border border-white/15 shadow-xl cursor-pointer hover:scale-105 active:scale-90"
              title="Next photo (Right arrow)"
              aria-label="Next photo"
            >
              <i className="fa-solid fa-chevron-right text-sm sm:text-base"></i>
            </button>
          )}
        </div>

        {/* CAPTION & DETAILS DRAWER */}
        <div className="p-3.5 sm:p-5 bg-slate-900 text-slate-200 border-t border-slate-800 overflow-y-auto max-h-[30vh]">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-2">
            <h3 className="serif text-base sm:text-xl font-bold text-white tracking-wide truncate">
              {photo.title}
            </h3>
            <span className="text-xs text-slate-400 font-medium truncate">
              {photo.dayTheme}
            </span>
          </div>

          {photo.caption && (
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
              {photo.caption}
            </p>
          )}

          {/* Tags */}
          {photo.tags && photo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
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

          {/* Attribution & Move Day Action */}
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
                <span className="text-[10px] text-slate-400 font-medium">Assign Day:</span>
                <select
                  value={photo.dayIndex}
                  onChange={e => onMoveDay(photo.id, parseInt(e.target.value, 10))}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
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

          {/* DEDICATED ISOLATED DELETE ACTION (Completely separated from close controls) */}
          {photo.uploadedByUser && onDelete && (
            <div className="mt-4 pt-3 border-t border-slate-800/80 bg-rose-950/20 border border-rose-900/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <i className="fa-solid fa-shield text-[10px]"></i>
                  <span>Cloud Photo Management</span>
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Uploaded by {photo.accountOwnerName || 'Family'} · Deletion removes from all family devices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-rose-300 hover:text-white bg-rose-900/40 hover:bg-rose-800 px-3 py-2 rounded-lg border border-rose-700/50 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                title="Permanently remove from family cloud"
              >
                <i className="fa-regular fa-trash-can text-xs"></i>
                <span>Delete from Cloud...</span>
              </button>
            </div>
          )}
        </div>

        {/* MOBILE STICKY BOTTOM EXIT BAR: One-thumb tap to exit back to photos */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 sm:hidden">
          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer min-h-[46px]"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i>
            <span>Done / Exit Photo View</span>
          </button>
        </div>
      </div>
    </div>
  );
};
