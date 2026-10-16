import JSZip from 'jszip';
import { DAY_METADATA } from '../data/defaultPhotos';
import { GoogleAlbumResult, TripPhoto } from '../types';
import { compressImageFile } from './photoStorage';

export interface GooglePhotosItem {
  id: string;
  description?: string;
  baseUrl: string;
  mimeType: string;
  mediaMetadata?: {
    creationTime?: string;
    width?: string;
    height?: string;
    photo?: {
      cameraMake?: string;
      cameraModel?: string;
      focalLength?: number;
      apertureFNumber?: number;
      isoEquivalent?: number;
      exposureTime?: string;
    };
  };
  filename: string;
}

export interface GooglePhotosSearchResponse {
  mediaItems?: GooglePhotosItem[];
  nextPageToken?: string;
}

/**
 * Filter out screenshots, receipts, documents, and non-photo graphics.
 * Camera photos and portraits from phones are preserved.
 */
export function isLikelyFacePhoto(item: GooglePhotosItem): boolean {
  const filename = (item.filename || '').toLowerCase();

  // Exclude common screenshot and receipt naming conventions
  const screenshotKeywords = [
    'screenshot',
    'screen shot',
    'screencapture',
    'screen_shot',
    'receipt',
    'invoice',
    'statement',
    'document',
    'scan_',
  ];

  if (screenshotKeywords.some(keyword => filename.includes(keyword))) {
    return false;
  }

  return true;
}

/**
 * Maps a Google Photos creation timestamp to the appropriate trip day (0 to 5).
 */
export function mapTimestampToDayIndex(creationTime?: string): number {
  if (!creationTime) return 0;
  try {
    const date = new Date(creationTime);
    const dayOfMonth = date.getDate();

    // Trip is Oct 15 - Oct 20
    if (dayOfMonth === 15) return 0;
    if (dayOfMonth === 16) return 1;
    if (dayOfMonth === 17) return 2;
    if (dayOfMonth === 18) return 3;
    if (dayOfMonth === 19) return 4;
    if (dayOfMonth === 20) return 5;

    // If the photo was taken on another date, map by day modulo or closest
    return Math.abs(dayOfMonth % 6);
  } catch (e) {
    return 0;
  }
}

/**
 * Automatically fetch photos from Google Photos containing faces for the trip dates.
 */
export interface GooglePhotoAlbum {
  id: string;
  title: string;
  productUrl: string;
  mediaItemsCount?: string;
  coverPhotoBaseUrl?: string;
}

/**
 * Fetch list of albums from Google Photos
 */
export async function fetchGoogleAlbums(accessToken: string): Promise<GooglePhotoAlbum[]> {
  try {
    const res = await fetch('https://photoslibrary.googleapis.com/v1/albums?pageSize=50', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (res.status === 403) {
      throw new Error('PHOTOS_PERMISSION_NEEDED');
    }
    if (!res.ok) return [];
    const data = await res.json();
    return data.albums || [];
  } catch (err: any) {
    if (err.message === 'PHOTOS_PERMISSION_NEEDED') throw err;
    console.warn('Error fetching Google Photos albums:', err);
    return [];
  }
}

/**
 * Fetch photos from Google Photos across multiple strategies:
 * 1. User's recent media items
 * 2. Date-filtered trip photos
 * 3. Relevant trip albums (DC, Washington, Trip, Family)
 */
export async function fetchGooglePhotosForTrip(
  accessToken: string,
  options: {
    year?: number;
    requireFaces?: boolean;
    includeRecentFallback?: boolean;
    albumId?: string;
    accountOwner?: 'account1' | 'account2';
    accountOwnerName?: string;
    accountOwnerEmail?: string;
  } = {}
): Promise<TripPhoto[]> {
  const {
    year = 2026,
    requireFaces = false,
    albumId,
    accountOwner = 'account1',
    accountOwnerName,
    accountOwnerEmail,
  } = options;

  const resolvedOwnerName =
    accountOwnerName || (accountOwner === 'account2' ? 'Wife' : 'Me');

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const itemMap = new Map<string, GooglePhotosItem>();
  let permissionDenied = false;

  // Strategy A: If specific albumId provided
  if (albumId) {
    try {
      const albumSearchRes = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ albumId, pageSize: 100 }),
      });
      if (albumSearchRes.status === 403 || albumSearchRes.status === 401) permissionDenied = true;
      if (albumSearchRes.ok) {
        const data: GooglePhotosSearchResponse = await albumSearchRes.json();
        (data.mediaItems || []).forEach(item => itemMap.set(item.id, item));
      }
    } catch (e) {
      console.warn('Error fetching album items:', e);
    }
  }

  // Strategy B: Fetch recent media items directly (no strict date filter)
  try {
    const listRes = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=100', {
      headers,
    });
    if (listRes.status === 403 || listRes.status === 401) permissionDenied = true;
    if (listRes.ok) {
      const data: GooglePhotosSearchResponse = await listRes.json();
      (data.mediaItems || []).forEach(item => itemMap.set(item.id, item));
    }
  } catch (e) {
    console.warn('Error fetching recent media items:', e);
  }

  // Strategy C: Date range search across trip days for multiple possible years (current year, 2026, 2025, 2024)
  const currentYear = new Date().getFullYear();
  const searchYears = Array.from(new Set([year, currentYear, 2026, 2025, 2024]));

  for (const yr of searchYears) {
    if (itemMap.size >= 50) break;
    try {
      const datePayload: any = {
        pageSize: 100,
        filters: {
          dateFilter: {
            ranges: [
              {
                startDate: { year: yr, month: 10, day: 1 },
                endDate: { year: yr, month: 10, day: 31 },
              },
            ],
          },
          mediaTypeFilter: {
            mediaTypes: ['PHOTO'],
          },
        },
      };
      if (requireFaces) {
        datePayload.filters.contentFilter = {
          includedContentCategories: ['PEOPLE'],
        };
      }

      const searchRes = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
        method: 'POST',
        headers,
        body: JSON.stringify(datePayload),
      });
      if (searchRes.status === 403 || searchRes.status === 401) permissionDenied = true;
      if (searchRes.ok) {
        const data: GooglePhotosSearchResponse = await searchRes.json();
        (data.mediaItems || []).forEach(item => itemMap.set(item.id, item));
      }
    } catch (e) {
      console.warn(`Error searching date range for year ${yr}:`, e);
    }
  }

  // Strategy D: Search user albums (check trip-relevant albums and top user albums)
  if (itemMap.size === 0) {
    try {
      const albums = await fetchGoogleAlbums(accessToken);
      if (albums.length > 0) {
        // Prioritize trip albums, or fallback to first 5 albums
        const tripAlbums = albums.filter(a => {
          const title = (a.title || '').toLowerCase();
          return (
            title.includes('dc') ||
            title.includes('washington') ||
            title.includes('trip') ||
            title.includes('family') ||
            title.includes('2026') ||
            title.includes('oct') ||
            title.includes('vacation')
          );
        });

        const targetAlbums = tripAlbums.length > 0 ? tripAlbums.slice(0, 5) : albums.slice(0, 3);

        for (const album of targetAlbums) {
          const aRes = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
            method: 'POST',
            headers,
            body: JSON.stringify({ albumId: album.id, pageSize: 50 }),
          });
          if (aRes.ok) {
            const aData: GooglePhotosSearchResponse = await aRes.json();
            (aData.mediaItems || []).forEach(item => itemMap.set(item.id, item));
          }
        }
      }
    } catch (e: any) {
      if (e?.message === 'PHOTOS_PERMISSION_NEEDED') permissionDenied = true;
      console.warn('Error scanning user albums:', e);
    }
  }

  // If permission was denied across all endpoints, signal clearly
  if (itemMap.size === 0 && permissionDenied) {
    throw new Error('PHOTOS_PERMISSION_NEEDED');
  }

  const items = Array.from(itemMap.values());
  const validItems = items.filter(isLikelyFacePhoto);

  const tripPhotos: TripPhoto[] = validItems.map((item, idx) => {
    const dayIdx = mapTimestampToDayIndex(item.mediaMetadata?.creationTime) || (idx % 6);
    const dayMeta = DAY_METADATA.find(d => d.index === dayIdx) || DAY_METADATA[0];

    const creationDateStr = item.mediaMetadata?.creationTime
      ? new Date(item.mediaMetadata.creationTime).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : 'Trip Photo';

    const highResUrl = `${item.baseUrl}=w1200-h900`;

    return {
      id: `google-photo-${accountOwner}-${item.id}`,
      dayIndex: dayIdx,
      dayLabel: dayMeta.label,
      dayTheme: dayMeta.theme,
      src: highResUrl,
      alt: item.description || `${resolvedOwnerName}'s Photo - ${dayMeta.shortName}`,
      title: item.description || `${resolvedOwnerName}'s Photo (${dayMeta.shortName})`,
      caption: `From ${resolvedOwnerName}'s Google Photos · ${creationDateStr}`,
      credit: `${resolvedOwnerName} · Google Photos`,
      uploadedByUser: true,
      uploadedAt: creationDateStr,
      tags: ['Google Photos', resolvedOwnerName, `Day ${dayIdx + 1}`],
      accountOwner,
      accountOwnerName: resolvedOwnerName,
      accountOwnerEmail,
      googleMediaItemId: item.id,
    };
  });

  return tripPhotos;
}

/**
 * Creates a new album in Google Photos and optionally shares it for family collaboration.
 */
export async function createGooglePhotosSharedAlbum(
  accessToken: string,
  title: string,
  options?: {
    makeCollaborative?: boolean;
    accountLabel?: string;
    mediaItemIds?: string[];
  }
): Promise<GoogleAlbumResult> {
  const makeCollaborative = options?.makeCollaborative ?? true;
  const albumTitle = title.trim() || 'Washington DC Family Trip 2026';

  // Step 1: Create the album
  const createRes = await fetch('https://photoslibrary.googleapis.com/v1/albums', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      album: {
        title: albumTitle,
      },
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    const message =
      errorData?.error?.message ||
      `Google Photos responded with status ${createRes.status}`;
    throw new Error(message);
  }

  const albumData = await createRes.json();
  const albumId: string = albumData.id;
  const productUrl: string = albumData.productUrl || `https://photos.google.com/album/${albumId}`;
  let shareableUrl = productUrl;
  let isShared = false;

  // Step 2: Try to share the album with collaboration permissions
  if (makeCollaborative) {
    try {
      const shareRes = await fetch(
        `https://photoslibrary.googleapis.com/v1/albums/${albumId}:share`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sharedAlbumOptions: {
              isCollaborative: true,
              isCommentable: true,
            },
          }),
        }
      );

      if (shareRes.ok) {
        const shareData = await shareRes.json();
        if (shareData?.shareInfo?.shareableUrl) {
          shareableUrl = shareData.shareInfo.shareableUrl;
          isShared = true;
        }
      } else {
        console.warn('Share endpoint returned status:', shareRes.status);
      }
    } catch (shareErr) {
      console.warn('Could not share album automatically:', shareErr);
    }
  }

  // Step 3: Add media items to the album if available
  let addedCount = 0;
  if (options?.mediaItemIds && options.mediaItemIds.length > 0) {
    try {
      const chunks: string[][] = [];
      for (let i = 0; i < options.mediaItemIds.length; i += 50) {
        chunks.push(options.mediaItemIds.slice(i, i + 50));
      }

      for (const chunk of chunks) {
        const batchRes = await fetch(
          `https://photoslibrary.googleapis.com/v1/albums/${albumId}:batchAddMediaItems`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              mediaItemIds: chunk,
            }),
          }
        );
        if (batchRes.ok) {
          addedCount += chunk.length;
        }
      }
    } catch (batchErr) {
      console.warn('Could not batch add media items:', batchErr);
    }
  }

  return {
    id: albumId,
    title: albumData.title || albumTitle,
    productUrl,
    shareableUrl,
    isShared,
    itemCount: addedCount,
    createdAt: new Date().toISOString(),
    creatorAccountLabel: options?.accountLabel || 'Google Photos',
  };
}

/**
 * Helper to load an image onto a canvas and return a Blob if direct CORS fetch fails.
 */
function loadImageAsBlob(src: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
        } else {
          resolve(null);
        }
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Downloads a structured ZIP archive of all trip photos organized by day folders,
 * complete with a detailed trip summary manifest and metadata JSON.
 */
export async function downloadTripPhotosZip(
  photos: TripPhoto[],
  albumTitle: string = 'Washington_DC_Family_Trip_2026',
  onProgress?: (progress: { percent: number; message: string; current: number; total: number }) => void
): Promise<void> {
  const zip = new JSZip();
  const safeAlbumTitle = albumTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  const rootFolder = zip.folder(safeAlbumTitle) || zip;

  // Build text summary manifest
  let summaryText = `========================================================\n`;
  summaryText += `  WASHINGTON, D.C. FAMILY TRIP 2026 - PHOTO ARCHIVE\n`;
  summaryText += `  Trip Dates: October 15 - October 20, 2026\n`;
  summaryText += `  Export Date: ${new Date().toLocaleString()}\n`;
  summaryText += `  Total Photos: ${photos.length}\n`;
  summaryText += `========================================================\n\n`;

  const sortedPhotos = [...photos].sort((a, b) => a.dayIndex - b.dayIndex);

  const dayCounts: Record<number, number> = {};
  for (const photo of sortedPhotos) {
    dayCounts[photo.dayIndex] = (dayCounts[photo.dayIndex] || 0) + 1;
  }

  summaryText += `PHOTO BREAKDOWN BY DAY:\n`;
  DAY_METADATA.forEach(d => {
    const count = dayCounts[d.index] || 0;
    summaryText += `  - Day ${d.index + 1} (${d.label} - ${d.theme}): ${count} photos\n`;
  });
  summaryText += `\n--------------------------------------------------------\n`;
  summaryText += `PHOTO CATALOG & ATTRIBUTION:\n\n`;

  const total = sortedPhotos.length;

  for (let i = 0; i < sortedPhotos.length; i++) {
    const photo = sortedPhotos[i];
    const dayMeta = DAY_METADATA.find(d => d.index === photo.dayIndex) || DAY_METADATA[0];
    const dayFolderClean = `Day_${photo.dayIndex + 1}_${dayMeta.shortName.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const dayFolder = rootFolder.folder(dayFolderClean) || rootFolder;

    const ownerName = photo.accountOwnerName || (photo.accountOwner === 'account2' ? 'Wife' : 'Ting');
    const photoTitleClean = (photo.title || 'Photo').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 28);
    const filename = `${String(i + 1).padStart(2, '0')}_${ownerName}_${photoTitleClean}.jpg`;

    summaryText += `[Photo ${i + 1}] ${filename}\n`;
    summaryText += `  Day: Day ${photo.dayIndex + 1} (${dayMeta.label})\n`;
    summaryText += `  Source / Contributor: ${photo.credit || ownerName}\n`;
    if (photo.caption) summaryText += `  Caption: ${photo.caption}\n`;
    if (photo.uploadedAt) summaryText += `  Timestamp: ${photo.uploadedAt}\n`;
    summaryText += `\n`;

    if (onProgress) {
      const pct = Math.round((i / (total || 1)) * 80);
      onProgress({
        percent: pct,
        message: `Packing photo ${i + 1} of ${total} (${photo.title || dayMeta.shortName})...`,
        current: i + 1,
        total,
      });
    }

    try {
      let blob: Blob | null = null;
      try {
        const response = await fetch(photo.src, { mode: 'cors' });
        if (response.ok) {
          blob = await response.blob();
        }
      } catch (fetchErr) {
        blob = await loadImageAsBlob(photo.src);
      }

      if (blob) {
        dayFolder.file(filename, blob);
      } else {
        dayFolder.file(
          `${filename}.txt`,
          `Photo Link: ${photo.src}\nTitle: ${photo.title}\nCredit: ${photo.credit}`
        );
      }
    } catch (err) {
      console.warn(`Could not add photo ${photo.id} to zip:`, err);
    }
  }

  // Add manifest text file and JSON file
  rootFolder.file('Washington_DC_Trip_Summary.txt', summaryText);
  rootFolder.file(
    'trip_photos_metadata.json',
    JSON.stringify(
      {
        tripName: 'Washington DC Family Trip 2026',
        dates: 'October 15 - October 20, 2026',
        exportedAt: new Date().toISOString(),
        totalPhotos: sortedPhotos.length,
        photos: sortedPhotos.map((p, idx) => ({
          index: idx + 1,
          id: p.id,
          dayIndex: p.dayIndex,
          dayLabel: p.dayLabel,
          dayTheme: p.dayTheme,
          title: p.title,
          caption: p.caption,
          credit: p.credit,
          accountOwner: p.accountOwner,
          accountOwnerName: p.accountOwnerName,
          uploadedAt: p.uploadedAt,
          src: p.src,
        })),
      },
      null,
      2
    )
  );

  if (onProgress) {
    onProgress({
      percent: 85,
      message: 'Compressing album into .ZIP archive...',
      current: total,
      total,
    });
  }

  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (metadata) => {
      if (onProgress) {
        const currentPct = 85 + Math.round(metadata.percent * 0.15);
        onProgress({
          percent: Math.min(99, currentPct),
          message: `Compressing archive (${Math.round(metadata.percent)}%)...`,
          current: total,
          total,
        });
      }
    }
  );

  if (onProgress) {
    onProgress({
      percent: 100,
      message: 'Download complete! Saving archive to device...',
      current: total,
      total,
    });
  }

  // Trigger browser download
  const downloadUrl = URL.createObjectURL(zipBlob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = `${safeAlbumTitle}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 8000);
}

/**
 * Creates a Google Photos Picker session for interactive user photo selection.
 * This is Google's official recommended API after the March 31, 2025 deprecation.
 */
export async function createGooglePhotosPickerSession(
  accessToken: string
): Promise<{ id: string; pickerUri: string } | null> {
  try {
    const res = await fetch('https://photospicker.googleapis.com/v1/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      console.warn('Photos picker session response status:', res.status);
      return null;
    }
    const data = await res.json();
    return { id: data.id, pickerUri: data.pickerUri };
  } catch (e) {
    console.warn('Error starting Google Photos Picker session:', e);
    return null;
  }
}

/**
 * Checks if a Google Photos Picker session has media items selected by the user.
 */
export async function pollPhotosPickerSessionReady(
  accessToken: string,
  sessionId: string
): Promise<boolean> {
  try {
    const res = await fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.mediaItemsSet);
  } catch (e) {
    return false;
  }
}

/**
 * Retrieves media items chosen by the user in a Google Photos Picker session.
 */
export async function fetchGooglePhotosPickerMediaItems(
  accessToken: string,
  sessionId: string,
  options: {
    accountOwner?: 'account1' | 'account2';
    accountOwnerName?: string;
  } = {}
): Promise<TripPhoto[]> {
  const { accountOwner = 'account1', accountOwnerName } = options;
  const resolvedOwner = accountOwnerName || (accountOwner === 'account2' ? 'Wife' : 'Me');

  try {
    const res = await fetch(
      `https://photospicker.googleapis.com/v1/mediaItems?sessionId=${sessionId}&pageSize=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.mediaItems || [];

    return items.map((item: any, idx: number) => {
      const createTime = item.createTime || item.mediaFile?.createTime;
      const dayIdx = mapTimestampToDayIndex(createTime) || (idx % 6);
      const dayMeta = DAY_METADATA.find(d => d.index === dayIdx) || DAY_METADATA[0];
      const filename = item.mediaFile?.filename || `Google Photo ${idx + 1}`;
      const baseUrl = item.mediaFile?.baseUrl;
      const src = baseUrl ? `${baseUrl}=w1600-h1200` : '';

      return {
        id: `picker-${accountOwner}-${item.id || Date.now() + '_' + idx}`,
        dayIndex: dayIdx,
        dayLabel: dayMeta.label,
        dayTheme: dayMeta.theme,
        src,
        alt: filename,
        title: filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        caption: `From ${resolvedOwner}'s Google Photos · ${dayMeta.label}`,
        credit: `${resolvedOwner} · Google Photos`,
        uploadedByUser: true,
        tags: ['Google Photos', resolvedOwner, `Day ${dayIdx + 1}`],
        accountOwner,
        accountOwnerName: resolvedOwner,
        googleMediaItemId: item.id,
      };
    });
  } catch (e) {
    console.warn('Error fetching picker media items:', e);
    return [];
  }
}

/**
 * Process client-selected photos (from camera roll or files) into optimized TripPhoto objects,
 * mapping timestamps automatically to trip days (Oct 15 = Day 1, etc.).
 */
export async function parsePhotoFilesForTrip(
  files: File[],
  options: {
    accountOwner: 'account1' | 'account2';
    accountOwnerName: string;
    targetDayIndex?: number | 'auto';
  }
): Promise<TripPhoto[]> {
  const { accountOwner, accountOwnerName, targetDayIndex = 'auto' } = options;
  const results: TripPhoto[] = [];

  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    try {
      const compressedSrc = await compressImageFile(file, 1600, 0.85);

      // Map day index: check explicit target, or auto-detect from file.lastModified
      let assignedDay = 0;
      if (typeof targetDayIndex === 'number' && targetDayIndex >= 0 && targetDayIndex <= 5) {
        assignedDay = targetDayIndex;
      } else if (file.lastModified) {
        const modDate = new Date(file.lastModified);
        const dayOfMonth = modDate.getDate();
        if (dayOfMonth >= 15 && dayOfMonth <= 20) {
          assignedDay = dayOfMonth - 15;
        } else {
          assignedDay = idx % 6;
        }
      } else {
        assignedDay = idx % 6;
      }

      const dayMeta = DAY_METADATA.find(d => d.index === assignedDay) || DAY_METADATA[0];
      const rawTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Trip Photo';
      const cleanTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

      results.push({
        id: `photo-${accountOwner}-${Date.now()}-${idx}`,
        title: cleanTitle,
        alt: cleanTitle,
        dayLabel: dayMeta.label,
        caption: `From ${accountOwnerName}'s Camera · ${dayMeta.label}`,
        src: compressedSrc,
        dayIndex: assignedDay,
        dayTheme: dayMeta.theme,
        credit: `${accountOwnerName} · Photo`,
        tags: ['Google Photos', accountOwnerName, `Day ${assignedDay + 1}`],
        uploadedByUser: true,
        accountOwner,
        accountOwnerName,
        uploadedAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
      });
    } catch (err) {
      console.warn('Error reading photo file:', file.name, err);
    }
  }

  return results;
}
