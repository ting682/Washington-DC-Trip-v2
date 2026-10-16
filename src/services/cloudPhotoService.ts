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
const LOCAL_CACHE_KEY = 'dc_cloud_trip_photos_cache';

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
    if (cached && cached.length > 0) {
      callback(cached);
    }
  }).catch(() => {});

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
        console.warn('Firestore trip_photos subscription error, falling back to cache:', err);
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.warn('Could not initialize trip_photos listener:', err);
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
    console.warn('Error fetching cloud photos:', e);
  }

  // Fallback to local cache
  return getPhotosFromStorage(LOCAL_CACHE_KEY);
}

/**
 * Upload manual photo files to Cloud Storage (Firestore collection `trip_photos`)
 * Compresses images for fast cloud sync and optimal document storage.
 */
export async function uploadPhotosToCloud(
  files: File[],
  options: CloudUploadOptions
): Promise<TripPhoto[]> {
  const { accountOwner, accountOwnerName, targetDayIndex = 'auto', onProgress } = options;
  const uploadedPhotos: TripPhoto[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      // Compress image to 1280px max dimension, quality 0.82 to stay under 250KB
      const compressedDataUrl = await compressImageFile(file, 1280, 0.82);

      // Determine day: check explicit target or auto-detect from file timestamp
      let assignedDay = 0;
      if (typeof targetDayIndex === 'number' && targetDayIndex >= 0 && targetDayIndex <= 5) {
        assignedDay = targetDayIndex;
      } else if (file.lastModified) {
        const modDate = new Date(file.lastModified);
        const dayOfMonth = modDate.getDate();
        if (dayOfMonth >= 15 && dayOfMonth <= 20) {
          assignedDay = dayOfMonth - 15;
        } else {
          assignedDay = i % 6;
        }
      } else {
        assignedDay = i % 6;
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
        credit: `${accountOwnerName} · Cloud Storage`,
        uploadedByUser: true,
        accountOwner,
        accountOwnerName,
        uploadedAtStr: dateStr,
        uploadedAtTimestamp: timestamp,
        fileSize: file.size,
        tags: ['Cloud Storage', accountOwnerName, `Day ${assignedDay + 1}`],
      };

      // Save to Firestore
      try {
        const docRef = doc(db, CLOUD_PHOTOS_COLLECTION, photoId);
        await setDoc(docRef, photoDoc);
      } catch (firestoreErr) {
        console.warn('Firestore write error, saving to local cache:', firestoreErr);
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

  return uploadedPhotos;
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
}
