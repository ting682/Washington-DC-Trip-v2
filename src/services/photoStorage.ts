import { TripPhoto } from '../types';

const DB_NAME = 'DCTripPhotosDB';
const DB_VERSION = 1;
const PHOTO_STORE = 'photos';
const META_STORE = 'metadata';

// Open or initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save photos array to IndexedDB (and fallback to localStorage with lightweight entries)
 */
export async function savePhotosToStorage(key: string, photos: TripPhoto[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([PHOTO_STORE, META_STORE], 'readwrite');
    const photoStore = tx.objectStore(PHOTO_STORE);
    const metaStore = tx.objectStore(META_STORE);

    // Save individual photos
    for (const photo of photos) {
      photoStore.put(photo);
    }

    // Save the list of photo IDs for this key
    const photoIds = photos.map(p => p.id);
    metaStore.put({ key, photoIds, updatedAt: Date.now() }, key);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Notify other components via custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dc-trip-photos-updated', { detail: { key, count: photos.length } }));
    }
  } catch (err) {
    console.warn('IndexedDB write failed, attempting localStorage fallback:', err);
    try {
      // If saving full photos, strip very large base64 if it risks quota
      localStorage.setItem(key, JSON.stringify(photos));
    } catch (localErr) {
      console.warn('LocalStorage quota exceeded as well:', localErr);
    }
  }
}

/**
 * Load photos array from IndexedDB or localStorage fallback
 */
export async function getPhotosFromStorage(key: string): Promise<TripPhoto[]> {
  try {
    const db = await openDB();
    const tx = db.transaction([PHOTO_STORE, META_STORE], 'readonly');
    const metaStore = tx.objectStore(META_STORE);
    const photoStore = tx.objectStore(PHOTO_STORE);

    const meta = await new Promise<any>((resolve, reject) => {
      const req = metaStore.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (meta && Array.isArray(meta.photoIds) && meta.photoIds.length > 0) {
      const photos: TripPhoto[] = [];
      for (const id of meta.photoIds) {
        const photo = await new Promise<TripPhoto | undefined>((resolve, reject) => {
          const req = photoStore.get(id);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        if (photo) photos.push(photo);
      }
      return photos;
    }
  } catch (err) {
    console.warn('IndexedDB read failed, falling back to localStorage:', err);
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading from localStorage fallback:', e);
  }

  return [];
}

/**
 * Remove specific photo from storage
 */
export async function deletePhotoFromStorage(key: string, photoId: string): Promise<TripPhoto[]> {
  const current = await getPhotosFromStorage(key);
  const updated = current.filter(p => p.id !== photoId);
  await savePhotosToStorage(key, updated);

  try {
    const db = await openDB();
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    tx.objectStore(PHOTO_STORE).delete(photoId);
  } catch (e) {}

  return updated;
}

/**
 * Resize and compress an image file to prevent huge memory / storage issues
 * Produces crisp high-res image (max 1600px) with ~200-300KB footprint
 */
export async function compressImageFile(file: File, maxDimension = 1600, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
