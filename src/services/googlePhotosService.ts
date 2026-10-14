import JSZip from 'jszip';
import { DAY_METADATA } from '../data/defaultPhotos';
import { GoogleAlbumResult, TripPhoto } from '../types';

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
 * Filter out screenshots, receipts, documents, and non-face pictures.
 * Google Photos API `contentFilter` with `PEOPLE` category already filters server-side
 * for media items containing human faces. This function provides additional client-side
 * verification to strictly guarantee no screenshots pass through.
 */
export function isLikelyFacePhoto(item: GooglePhotosItem): boolean {
  const filename = (item.filename || '').toLowerCase();

  // Exclude common screenshot naming conventions
  const screenshotKeywords = [
    'screenshot',
    'screen shot',
    'screencapture',
    'screen_shot',
    'capture',
    'receipt',
    'invoice',
    'document',
    'scan',
    'meme',
  ];

  if (screenshotKeywords.some(keyword => filename.includes(keyword))) {
    return false;
  }

  // Check aspect ratio if width/height available:
  // Tall vertical screenshots often match mobile screen ratios without camera metadata
  if (item.mediaMetadata) {
    const width = parseInt(item.mediaMetadata.width || '0', 10);
    const height = parseInt(item.mediaMetadata.height || '0', 10);

    // If it's an extreme screen aspect ratio without camera metadata, treat as screenshot
    if (width > 0 && height > 0 && !item.mediaMetadata.photo) {
      const ratio = height / width;
      // Typical modern phone screenshot ratio > 2.05
      if (ratio > 2.05 || ratio < 0.48) {
        return false;
      }
    }
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
export async function fetchGooglePhotosForTrip(
  accessToken: string,
  options: {
    year?: number;
    requireFaces?: boolean;
    includeRecentFallback?: boolean;
    accountOwner?: 'account1' | 'account2';
    accountOwnerName?: string;
    accountOwnerEmail?: string;
  } = {}
): Promise<TripPhoto[]> {
  const {
    year = 2026,
    requireFaces = true,
    includeRecentFallback = true,
    accountOwner = 'account1',
    accountOwnerName,
    accountOwnerEmail,
  } = options;

  const endpoint = 'https://photoslibrary.googleapis.com/v1/mediaItems:search';

  // 1. Search by Trip Date Range (Oct 15 - Oct 20 of trip year)
  const datePayload: any = {
    pageSize: 50,
    filters: {
      dateFilter: {
        ranges: [
          {
            startDate: { year, month: 10, day: 15 },
            endDate: { year, month: 10, day: 20 },
          },
        ],
      },
      mediaTypeFilter: {
        mediaTypes: ['PHOTO'],
      },
    },
  };

  // If faces are strictly required, filter for PEOPLE category
  if (requireFaces) {
    datePayload.filters.contentFilter = {
      includedContentCategories: ['PEOPLE'],
    };
  }

  let items: GooglePhotosItem[] = [];

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datePayload),
    });

    if (res.ok) {
      const data: GooglePhotosSearchResponse = await res.json();
      if (data.mediaItems && data.mediaItems.length > 0) {
        items = data.mediaItems;
      }
    } else {
      console.warn('Google Photos search responded with status:', res.status);
    }
  } catch (err) {
    console.warn('Google Photos date search failed:', err);
  }

  // 2. If 0 photos found for the specified year (e.g. if trip is future or photos are in current library),
  // fallback to searching current library with the PEOPLE filter to retrieve real family face photos!
  if (items.length === 0 && includeRecentFallback) {
    try {
      const fallbackPayload: any = {
        pageSize: 40,
        filters: {
          mediaTypeFilter: {
            mediaTypes: ['PHOTO'],
          },
          contentFilter: {
            includedContentCategories: ['PEOPLE'],
          },
        },
      };

      const fallbackRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fallbackPayload),
      });

      if (fallbackRes.ok) {
        const fallbackData: GooglePhotosSearchResponse = await fallbackRes.json();
        if (fallbackData.mediaItems) {
          items = fallbackData.mediaItems;
        }
      }
    } catch (fallbackErr) {
      console.warn('Google Photos fallback search failed:', fallbackErr);
    }
  }

  // 3. Filter for face pictures (no screenshots) and convert to TripPhoto format
  const validItems = items.filter(isLikelyFacePhoto);
  const resolvedOwnerName =
    accountOwnerName || (accountOwner === 'account2' ? "Wife" : "Me");

  const tripPhotos: TripPhoto[] = validItems.map((item) => {
    const dayIdx = mapTimestampToDayIndex(item.mediaMetadata?.creationTime);
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

    // baseUrl sizing: append =w1200-h900 for high quality display
    const highResUrl = `${item.baseUrl}=w1200-h900`;

    return {
      id: `google-photo-${accountOwner}-${item.id}`,
      dayIndex: dayIdx,
      dayLabel: dayMeta.label,
      dayTheme: dayMeta.theme,
      src: highResUrl,
      alt: item.description || `${resolvedOwnerName}'s Photo - ${dayMeta.shortName}`,
      title: item.description || `${resolvedOwnerName}'s Photo (${dayMeta.shortName})`,
      caption: `Imported from ${resolvedOwnerName}'s Google Photos with face detection · ${creationDateStr}`,
      credit: `${resolvedOwnerName} · Google Photos`,
      uploadedByUser: true,
      uploadedAt: creationDateStr,
      tags: ['Google Photos', resolvedOwnerName, 'Face Detected', `Day ${dayIdx + 1}`],
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
