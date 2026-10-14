import React, { useState } from 'react';
import { DAY_METADATA } from '../../data/defaultPhotos';
import {
  createGooglePhotosSharedAlbum,
  downloadTripPhotosZip,
} from '../../services/googlePhotosService';
import { GoogleAccountInfo, GoogleAlbumResult, TripPhoto } from '../../types';

interface ExportSharedAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: TripPhoto[];
  acc1Info: GoogleAccountInfo;
  acc2Info: GoogleAccountInfo;
  acc1Token: string | null;
  acc2Token: string | null;
  onConnectAccount?: (accountId: 'account1' | 'account2') => void;
}

export const ExportSharedAlbumModal: React.FC<ExportSharedAlbumModalProps> = ({
  isOpen,
  onClose,
  photos,
  acc1Info,
  acc2Info,
  acc1Token,
  acc2Token,
  onConnectAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'zip' | 'guide'>('google');

  // Album Config State
  const [albumTitle, setAlbumTitle] = useState('Washington DC Family Trip 2026 (Oct 15–20)');
  const [hostAccount, setHostAccount] = useState<'account1' | 'account2'>(
    acc1Token ? 'account1' : acc2Token ? 'account2' : 'account1'
  );
  const [isCollaborative, setIsCollaborative] = useState(true);
  const [photoFilter, setPhotoFilter] = useState<'all' | 'google-only' | 'face-only'>('all');

  // Creation State
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [albumResult, setAlbumResult] = useState<GoogleAlbumResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);

  // ZIP Download State
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<{
    percent: number;
    message: string;
    current: number;
    total: number;
  }>({
    percent: 0,
    message: '',
    current: 0,
    total: 0,
  });
  const [zipSuccess, setZipSuccess] = useState(false);

  if (!isOpen) return null;

  // Filter photos based on selection
  const exportablePhotos = photos.filter((p) => {
    if (photoFilter === 'google-only') return p.uploadedByUser;
    if (photoFilter === 'face-only') {
      return (
        p.uploadedByUser &&
        p.tags?.some((t) => t.toLowerCase().includes('face'))
      );
    }
    return true;
  });

  const acc1Count = exportablePhotos.filter((p) => p.accountOwner === 'account1').length;
  const acc2Count = exportablePhotos.filter((p) => p.accountOwner === 'account2').length;
  const landmarkCount = exportablePhotos.filter((p) => !p.uploadedByUser).length;

  // Active host token
  const activeToken = hostAccount === 'account1' ? acc1Token : acc2Token;
  const activeLabel = hostAccount === 'account1' ? acc1Info.customLabel : acc2Info.customLabel;

  // Handle Google Photos Album creation
  const handleCreateAlbum = async () => {
    if (!activeToken) {
      setCreationError(
        `Please connect ${activeLabel} to Google Photos first before creating an album.`
      );
      return;
    }

    setIsCreatingAlbum(true);
    setCreationError(null);

    try {
      // Gather media item IDs from Google Photos if available
      const mediaItemIds = exportablePhotos
        .filter((p) => p.uploadedByUser && p.accountOwner === hostAccount && p.googleMediaItemId)
        .map((p) => p.googleMediaItemId as string);

      const result = await createGooglePhotosSharedAlbum(activeToken, albumTitle, {
        makeCollaborative: isCollaborative,
        accountLabel: activeLabel,
        mediaItemIds,
      });

      setAlbumResult(result);
    } catch (err: any) {
      console.warn('Google Photos album creation attempt failed:', err);
      const msg = err.message || 'Failed to create album automatically';
      setCreationError(msg);
    } finally {
      setIsCreatingAlbum(false);
    }
  };

  // Copy link handler
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyTitle = () => {
    navigator.clipboard.writeText(albumTitle);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 2500);
  };

  // Handle ZIP Download
  const handleDownloadZip = async () => {
    if (exportablePhotos.length === 0) return;
    setIsZipping(true);
    setZipSuccess(false);

    try {
      await downloadTripPhotosZip(
        exportablePhotos,
        albumTitle.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'Washington_DC_Trip_2026',
        (progress) => {
          setZipProgress(progress);
        }
      );
      setZipSuccess(true);
    } catch (err: any) {
      console.error('ZIP download failed:', err);
      alert(`Could not create ZIP archive: ${err.message || 'Unknown error'}`);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isZipping && !isCreatingAlbum) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-rose-700 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-inner">
              <i className="fa-solid fa-images text-xl text-amber-300"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  Collect & Export Trip Photos
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full border border-white/25">
                  Method 3
                </span>
              </div>
              <p className="text-xs text-blue-100">
                Create a Google Shared Album or download a full organized day-by-day archive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isZipping || isCreatingAlbum}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors disabled:opacity-50"
            title="Close"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-semibold shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('google')}
            className={`px-4 py-2.5 rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'google'
                ? 'bg-white text-blue-700 border-blue-600 shadow-2xs font-bold'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <i className="fa-brands fa-google text-blue-600"></i>
            Google Photos Shared Album
          </button>
          <button
            onClick={() => setActiveTab('zip')}
            className={`px-4 py-2.5 rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'zip'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs font-bold'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <i className="fa-solid fa-file-zipper text-indigo-600"></i>
            Download Day-by-Day .ZIP
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2.5 rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'guide'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-2xs font-bold'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <i className="fa-solid fa-users text-emerald-600"></i>
            How It Works (Guide)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: GOOGLE PHOTOS SHARED ALBUM */}
          {activeTab === 'google' && (
            <div className="space-y-5">
              {/* Photo Source Breakdown Pill */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <i className="fa-solid fa-layer-group text-slate-500"></i>
                  Photos Ready to Collect:
                  <strong className="text-slate-900 text-sm ml-1">
                    {exportablePhotos.length}
                  </strong>
                </span>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-800 font-medium px-2 py-0.5 rounded-full border border-blue-200 text-[11px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    {acc1Info.customLabel}: <strong>{acc1Count}</strong>
                  </span>
                  <span className="bg-rose-100 text-rose-800 font-medium px-2 py-0.5 rounded-full border border-rose-200 text-[11px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                    {acc2Info.customLabel}: <strong>{acc2Count}</strong>
                  </span>
                  {landmarkCount > 0 && (
                    <span className="bg-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded-full text-[11px]">
                      Landmarks: {landmarkCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Success Result Card */}
              {albumResult ? (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 space-y-4 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                      <i className="fa-solid fa-check text-lg"></i>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-emerald-950 text-base">
                        Google Shared Album Created!
                      </h3>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        &ldquo;{albumResult.title}&rdquo; is now live in your Google Photos library.
                        {albumResult.isShared &&
                          ' Collaborative permissions are active so family can contribute!'}
                      </p>
                    </div>
                  </div>

                  {/* Shareable Link Box */}
                  <div className="bg-white border border-emerald-200 rounded-lg p-3 space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                      <span>Shareable Album Link</span>
                      {copiedLink && (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <i className="fa-solid fa-check"></i> Link Copied!
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={albumResult.shareableUrl || albumResult.productUrl}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 select-all focus:outline-none"
                      />
                      <button
                        onClick={() =>
                          handleCopyLink(albumResult.shareableUrl || albumResult.productUrl)
                        }
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 shrink-0 shadow-2xs"
                      >
                        <i className="fa-regular fa-copy"></i>
                        Copy Link
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <a
                      href={albumResult.shareableUrl || albumResult.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                    >
                      <i className="fa-brands fa-google"></i>
                      Open in Google Photos
                      <i className="fa-solid fa-arrow-up-right-from-square text-[10px] opacity-80"></i>
                    </a>

                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `Here is our Washington DC 2026 family trip Google Photos album! ${albumResult.shareableUrl || albumResult.productUrl}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition-all"
                    >
                      <i className="fa-brands fa-whatsapp"></i>
                      WhatsApp
                    </a>

                    <a
                      href={`mailto:?subject=${encodeURIComponent(
                        'Washington DC Family Trip 2026 - Google Shared Album'
                      )}&body=${encodeURIComponent(
                        `Hi everyone!\n\nHere is our Google Photos shared album for the Washington DC trip:\n${albumResult.shareableUrl || albumResult.productUrl}\n\nJoin and feel free to add your favorite shots!`
                      )}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all"
                    >
                      <i className="fa-regular fa-envelope"></i>
                      Email Family
                    </a>
                  </div>

                  {/* Reset/Create Another */}
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setAlbumResult(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                    >
                      Create another album
                    </button>
                  </div>
                </div>
              ) : (
                /* Album Configuration Form */
                <div className="space-y-4">
                  {/* Album Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Album Title in Google Photos
                    </label>
                    <input
                      type="text"
                      value={albumTitle}
                      onChange={(e) => setAlbumTitle(e.target.value)}
                      placeholder="e.g. Washington DC Family Trip 2026"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>

                  {/* Host Account Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Select Host / Creator Account
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Account 1 */}
                      <button
                        type="button"
                        onClick={() => setHostAccount('account1')}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                          hostAccount === 'account1'
                            ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {acc1Info.photoURL ? (
                              <img
                                src={acc1Info.photoURL}
                                alt="avatar"
                                referrerPolicy="no-referrer"
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              '1'
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {acc1Info.customLabel}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {acc1Info.email || (acc1Token ? 'Connected' : 'Not Connected')}
                            </p>
                          </div>
                        </div>
                        {acc1Token ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Ready
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Need Connect
                          </span>
                        )}
                      </button>

                      {/* Account 2 */}
                      <button
                        type="button"
                        onClick={() => setHostAccount('account2')}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                          hostAccount === 'account2'
                            ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {acc2Info.photoURL ? (
                              <img
                                src={acc2Info.photoURL}
                                alt="avatar"
                                referrerPolicy="no-referrer"
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              '2'
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {acc2Info.customLabel}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {acc2Info.email || (acc2Token ? 'Connected' : 'Not Connected')}
                            </p>
                          </div>
                        </div>
                        {acc2Token ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Ready
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Need Connect
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Collaborative Options */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCollaborative}
                        onChange={(e) => setIsCollaborative(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">
                          Make Collaborative Shared Album
                        </span>
                        <span className="text-slate-500">
                          Enables a shareable join link so Ting and Wife can both add pictures,
                          react, and organize photos together directly in Google Photos.
                        </span>
                      </div>
                    </label>

                    {/* Filter selector */}
                    <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-600">Include:</span>
                      <button
                        type="button"
                        onClick={() => setPhotoFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                          photoFilter === 'all'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        All Merged Photos ({photos.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoFilter('google-only')}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                          photoFilter === 'google-only'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Google Photos Imports ({acc1Count + acc2Count})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoFilter('face-only')}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                          photoFilter === 'face-only'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Face Detected Only
                      </button>
                    </div>
                  </div>

                  {/* Connect prompt if token missing */}
                  {!activeToken && onConnectAccount && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>
                        <span>
                          {activeLabel} is not connected. Connect now to create this album.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onConnectAccount(hostAccount)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shrink-0 shadow-2xs"
                      >
                        Connect {activeLabel}
                      </button>
                    </div>
                  )}

                  {/* Error Notification with 1-Click Fallback */}
                  {creationError && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-3">
                      <div className="flex items-start gap-2">
                        <i className="fa-solid fa-circle-exclamation text-rose-600 mt-0.5"></i>
                        <div>
                          <p className="font-bold">Google Photos API Notice:</p>
                          <p className="text-rose-700 mt-0.5">{creationError}</p>
                        </div>
                      </div>

                      {/* Direct 2-Click Shared Album Shortcut */}
                      <div className="bg-white/80 p-3 rounded-lg border border-rose-200/60 space-y-2">
                        <p className="font-semibold text-slate-800 text-[11px]">
                          Quick 2-Click Shared Album in Google Photos:
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                          <li>Click &ldquo;Copy Album Title&rdquo; below</li>
                          <li>Open Google Photos Shared Albums page</li>
                          <li>Click &ldquo;+ Create shared album&rdquo; and paste the title!</li>
                        </ol>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleCopyTitle}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5"
                          >
                            <i className="fa-regular fa-copy"></i>
                            {copiedTitle ? 'Title Copied!' : 'Copy Album Title'}
                          </button>
                          <a
                            href="https://photos.google.com/share"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5"
                          >
                            <i className="fa-brands fa-google"></i>
                            Open Google Photos Shared Albums
                            <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Primary Create Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCreateAlbum}
                      disabled={isCreatingAlbum || !activeToken}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600 hover:from-blue-700 hover:to-rose-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
                    >
                      {isCreatingAlbum ? (
                        <>
                          <i className="fa-solid fa-circle-notch fa-spin text-white"></i>
                          Creating Shared Album in Google Photos...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-folder-plus text-base"></i>
                          Create & Share Google Photos Album ({exportablePhotos.length} Photos)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOWNLOAD .ZIP ARCHIVE */}
          {activeTab === 'zip' && (
            <div className="space-y-5">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-indigo-900">
                  <i className="fa-solid fa-box-archive text-indigo-600"></i>
                  Complete Trip Photo Archive (.ZIP)
                </div>
                <p className="text-indigo-800">
                  Generates an organized, offline ZIP archive of every trip picture sorted into clean
                  folders by day (Day 1 through Day 6) with timestamps, contributors, and a
                  comprehensive trip manifest.
                </p>
              </div>

              {/* Archive Structure Preview */}
              <div className="bg-slate-900 rounded-xl p-4 text-emerald-400 font-mono text-[11px] space-y-1.5 shadow-inner">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center justify-between">
                  <span>Folder Structure Preview</span>
                  <span className="text-slate-500 font-normal">
                    {exportablePhotos.length} photos ready
                  </span>
                </div>
                <div className="text-white font-bold">📁 Washington_DC_Family_Trip_2026/</div>
                {DAY_METADATA.map((d) => (
                  <div key={d.index} className="pl-4 text-slate-300">
                    📁 Day_{d.index + 1}_{d.shortName.replace(/[^a-zA-Z0-9]/g, '_')}/
                    <span className="text-slate-500 text-[10px] ml-2">
                      ({photos.filter((p) => p.dayIndex === d.index).length} photos)
                    </span>
                  </div>
                ))}
                <div className="pl-4 text-amber-300">📄 Washington_DC_Trip_Summary.txt</div>
                <div className="pl-4 text-blue-300">📄 trip_photos_metadata.json</div>
              </div>

              {/* Progress Bar when Zipping */}
              {isZipping && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-2">
                      <i className="fa-solid fa-circle-notch fa-spin text-indigo-600"></i>
                      {zipProgress.message || 'Building ZIP Archive...'}
                    </span>
                    <span className="font-mono text-indigo-600">{zipProgress.percent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-200 rounded-full"
                      style={{ width: `${zipProgress.percent}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-slate-500 text-right">
                    Processed {zipProgress.current} of {zipProgress.total} items
                  </p>
                </div>
              )}

              {/* Success Alert */}
              {zipSuccess && !isZipping && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-600 text-base"></i>
                  <span>
                    ZIP archive downloaded successfully! Check your device&rsquo;s Downloads folder.
                  </span>
                </div>
              )}

              {/* Download Trigger Button */}
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={isZipping || exportablePhotos.length === 0}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                {isZipping ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Preparing Download...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-download"></i>
                    Download All {exportablePhotos.length} Photos (.ZIP Archive)
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 3: STEP-BY-STEP COLLABORATION GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-700">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <i className="fa-solid fa-heart text-rose-500"></i>
                  Google Photos for Couples & Families
                </h4>
                <p className="leading-relaxed">
                  Here is the ideal workflow to collect all vacation photos together without any
                  manual uploading:
                </p>

                <div className="space-y-3 pt-1">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                      1
                    </div>
                    <div>
                      <strong className="text-slate-900 block">
                        Both Connect Google Photos in This App
                      </strong>
                      <span>
                        Use the dual connection cards in this gallery so both you and your wife
                        connect your accounts. The app automatically imports real face pictures for
                        every day of the trip.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs">
                      2
                    </div>
                    <div>
                      <strong className="text-slate-900 block">
                        Create One Shared Collaborative Album
                      </strong>
                      <span>
                        Use the &ldquo;Google Photos Shared Album&rdquo; tab here to create the
                        album. When collaborative mode is enabled, your wife can add photos directly
                        from her Google Photos app without sending files over AirDrop or messaging.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0 text-xs">
                      3
                    </div>
                    <div>
                      <strong className="text-slate-900 block">
                        Turn On Partner Sharing (Bonus Pro-Tip)
                      </strong>
                      <span>
                        In Google Photos settings on both of your phones, go to{' '}
                        <strong>Settings &rarr; Partner Sharing</strong>. Set it to automatically
                        share photos of each other from Oct 15–20. Your trip albums will stay
                        synced forever without any manual steps!
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct links */}
              <div className="flex flex-wrap gap-2 pt-2">
                <a
                  href="https://photos.google.com/share"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <i className="fa-brands fa-google text-blue-600"></i>
                  Open Google Photos Shared Albums
                  <i className="fa-solid fa-arrow-up-right-from-square text-[9px] text-slate-400"></i>
                </a>
                <a
                  href="https://photos.google.com/partner/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <i className="fa-solid fa-user-group text-rose-600"></i>
                  Google Photos Partner Sharing Settings
                  <i className="fa-solid fa-arrow-up-right-from-square text-[9px] text-slate-400"></i>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Washington, D.C. Family Trip 2026 · Photos Hub
          </span>
          <button
            onClick={onClose}
            disabled={isZipping || isCreatingAlbum}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 font-bold text-xs rounded-xl transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
