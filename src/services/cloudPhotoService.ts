import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebaseFirestore';
import { DAY_METADATA } from '../data/defaultPhotos';
import { TripPhoto } from '../types';
import { compressImageFile, getPhotosFromStorage, savePhotosToStorage } from './photoStorage';

const CLOUD_PHOTOS_COLLECTION = 'trip_photos';
export const LOCAL_CACHE_KEY = 'dc_cloud_trip_photos_cache';

export interface CloudUploadOptions {
  accountOwner: 'account1' | 'account2' | 'family';
  accountOwnerName: string;
  targetDayIndex?: number | 'auto'; // 0 to 5, or 'auto'
  tags?: string[];
  onProgress?: (processed: number, total: number) => void;
}

/**
 * Real-time listener for cloud-stored trip photos.
 * Falls back to local cache if offline.
 */
export function subscribeToCloudPhotos(
  callback: (photos: TripPhoto[]) => void,
  onError?: (err: Error) => void
): () => void {
  // First emit locally cached photos for zero delay
  getPhotosFromStorage(LOCAL_CACHE_KEY).then(cached => {
    if (cached) {
      callback(cached);
    }
  }).catch(() => {
    callback([]);
  });

  try {
    const photosCol = collection(db, CLOUD_PHOTOS_COLLECTION);
    const q = query(photosCol, orderBy('uploadedAtTimestamp', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const photos: TripPhoto[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          photos.push({
            id: docSnap.id,
            dayIndex: typeof data.dayIndex === 'number' ? data.dayIndex : 0,
            dayLabel: data.dayLabel || 'Trip Day',
            dayTheme: data.dayTheme,
            src: data.src,
            alt: data.alt || data.title || 'Trip Photo',
            title: data.title || 'Trip Photo',
            caption: data.caption,
            credit: data.credit || 'Family Photo',
            creditUrl: data.creditUrl,
            uploadedByUser: true,
            uploadedAt: data.uploadedAtStr || 'Just now',
            tags: Array.isArray(data.tags) ? data.tags : ['Cloud Storage'],
            accountOwner: data.accountOwner || 'account1',
            accountOwnerName: data.accountOwnerName || 'Family',
          });
        });

        // Update local cache
        savePhotosToStorage(LOCAL_CACHE_KEY, photos).catch(() => {});

        callback(photos);
      },
      err => {
        console.warn('Firestore trip_photos subscription error, falling back to local storage cache:', err);
        // Ensure UI still gets cached photos even if Firestore permissions/network fail
        getPhotosFromStorage(LOCAL_CACHE_KEY).then(cached => {
          callback(cached || []);
        }).catch(() => {});
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.warn('Could not initialize trip_photos listener:', err);
    getPhotosFromStorage(LOCAL_CACHE_KEY).then(cached => {
      callback(cached || []);
    }).catch(() => {});
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Fetch cloud photos once (non-realtime)
 */
export async function getCloudPhotos(): Promise<TripPhoto[]> {
  try {
    const photosCol = collection(db, CLOUD_PHOTOS_COLLECTION);
    const q = query(photosCol, orderBy('uploadedAtTimestamp', 'desc'));
    const snapshot = await getDocs(q);
    const photos: TripPhoto[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      photos.push({
        id: docSnap.id,
        dayIndex: typeof data.dayIndex === 'number' ? data.dayIndex : 0,
        dayLabel: data.dayLabel || 'Trip Day',
        dayTheme: data.dayTheme,
        src: data.src,
        alt: data.alt || data.title || 'Trip Photo',
        title: data.title || 'Trip Photo',
        caption: data.caption,
        credit: data.credit || 'Family Photo',
        creditUrl: data.creditUrl,
        uploadedByUser: true,
        uploadedAt: data.uploadedAtStr || 'Just now',
        tags: Array.isArray(data.tags) ? data.tags : ['Cloud Storage'],
        accountOwner: data.accountOwner || 'account1',
        accountOwnerName: data.accountOwnerName || 'Family',
      });
    });

    if (photos.length > 0) {
      await savePhotosToStorage(LOCAL_CACHE_KEY, photos);
      return photos;
    }
  } catch (e) {
    console.warn('Error fetching cloud photos from Firestore, using local cache:', e);
  }

  // Fallback to local cache
  return getPhotosFromStorage(LOCAL_CACHE_KEY);
}

/**
 * Upload manual photo files to Cloud Storage (Firestore collection `trip_photos` & IndexedDB cache)
 * Compresses images for fast cloud sync and optimal document storage.
 */
export async function uploadPhotosToCloud(
  files: File[],
  options: CloudUploadOptions
): Promise<TripPhoto[]> {
  const { accountOwner, accountOwnerName, targetDayIndex = 0, onProgress } = options;
  const uploadedPhotos: TripPhoto[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      // Compress image to 1100px max dimension, quality 0.78 to guarantee fast rendering and ~120-180KB footprint
      const compressedDataUrl = await compressImageFile(file, 1100, 0.78);

      // Determine day: check explicit target or auto-detect from file timestamp
      let assignedDay = 0; // Default to Day 1 (Thursday, Oct 15 arrival)
      if (typeof targetDayIndex === 'number' && targetDayIndex >= 0 && targetDayIndex <= 5) {
        assignedDay = targetDayIndex;
      } else if (file.lastModified) {
        const modDate = new Date(file.lastModified);
        const dayOfMonth = modDate.getDate();
        if (dayOfMonth >= 15 && dayOfMonth <= 20) {
          assignedDay = dayOfMonth - 15;
        } else {
          assignedDay = 0; // Default to Day 1
        }
      } else {
        assignedDay = 0;
      }

      const dayMeta = DAY_METADATA.find(d => d.index === assignedDay) || DAY_METADATA[0];
      const rawTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Family Photo';
      const cleanTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
      const timestamp = Date.now();
      const photoId = `cloud_${accountOwner}_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;

      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

      const photoDoc = {
        title: cleanTitle,
        alt: cleanTitle,
        dayIndex: assignedDay,
        dayLabel: dayMeta.label,
        dayTheme: dayMeta.theme,
        src: compressedDataUrl,
        caption: `Uploaded by ${accountOwnerName} · ${dayMeta.label}`,
        credit: `${accountOwnerName} · Family Cloud`,
        uploadedByUser: true,
        accountOwner,
        accountOwnerName,
        uploadedAtStr: dateStr,
        uploadedAtTimestamp: timestamp,
        fileSize: file.size,
        tags: ['Cloud Storage', accountOwnerName, `Day ${assignedDay + 1}`],
      };

      // Sync to Firestore in background without blocking local rendering
      try {
        const docRef = doc(db, CLOUD_PHOTOS_COLLECTION, photoId);
        Promise.race([
          setDoc(docRef, photoDoc),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 1500)),
        ]).catch(firestoreErr => {
          console.info('Firestore background sync (photo safe in local DB):', firestoreErr?.message || firestoreErr);
        });
      } catch (firestoreErr) {
        console.warn('Firestore doc creation error:', firestoreErr);
      }

      const fullPhoto: TripPhoto = {
        id: photoId,
        ...photoDoc,
        uploadedAt: dateStr,
      };

      uploadedPhotos.push(fullPhoto);
    } catch (err) {
      console.warn('Error processing photo for cloud upload:', file.name, err);
    }

    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }

  // Persist all uploaded photos to local IndexedDB cache for instant zero-latency availability
  if (uploadedPhotos.length > 0) {
    try {
      const existing = await getPhotosFromStorage(LOCAL_CACHE_KEY);
      const existingIds = new Set(uploadedPhotos.map(p => p.id));
      const combined = [...uploadedPhotos, ...existing.filter(p => !existingIds.has(p.id))];
      await savePhotosToStorage(LOCAL_CACHE_KEY, combined);
    } catch (cacheErr) {
      console.warn('Error saving to local cache:', cacheErr);
    }

    // Explicitly dispatch event so all DayPhotoReel and TripPhotoGallery components update instantly
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dc-trip-photos-updated', {
          detail: { uploaded: uploadedPhotos, count: uploadedPhotos.length },
        })
      );
    }
  }

  return uploadedPhotos;
}

/**
 * Move / reassign a photo to a different trip day
 */
export async function updatePhotoDay(photoId: string, newDayIndex: number): Promise<void> {
  const dayMeta = DAY_METADATA.find(d => d.index === newDayIndex) || DAY_METADATA[0];

  try {
    const docRef = doc(db, CLOUD_PHOTOS_COLLECTION, photoId);
    await setDoc(
      docRef,
      {
        dayIndex: newDayIndex,
        dayLabel: dayMeta.label,
        dayTheme: dayMeta.theme,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore updatePhotoDay warning:', err);
  }

  // Update in local cache
  try {
    const cached = await getPhotosFromStorage(LOCAL_CACHE_KEY);
    const updated = cached.map(p => {
      if (p.id === photoId) {
        return {
          ...p,
          dayIndex: newDayIndex,
          dayLabel: dayMeta.label,
          dayTheme: dayMeta.theme,
          tags: (p.tags || []).map(t => (t.startsWith('Day ') ? `Day ${newDayIndex + 1}` : t)),
        };
      }
      return p;
    });
    await savePhotosToStorage(LOCAL_CACHE_KEY, updated);
  } catch (e) {
    console.warn('Error updating local photo cache:', e);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dc-trip-photos-updated'));
  }
}

/**
 * Delete a photo from Cloud Storage
 */
export async function deletePhotoFromCloud(photoId: string): Promise<void> {
  try {
    const docRef = doc(db, CLOUD_PHOTOS_COLLECTION, photoId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Error deleting photo from Firestore:', err);
  }

  // Also remove from local cache
  try {
    const cached = await getPhotosFromStorage(LOCAL_CACHE_KEY);
    const updated = cached.filter(p => p.id !== photoId);
    await savePhotosToStorage(LOCAL_CACHE_KEY, updated);
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dc-trip-photos-updated'));
  }
}
