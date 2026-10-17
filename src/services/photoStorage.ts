import { TripPhoto } from '../types';

const DB_NAME = 'DCTripPhotosDB_v2';
const DB_VERSION = 1;
const PHOTO_STORE = 'photos';
const META_STORE = 'metadata';

// In-memory cache for ultra-fast zero-latency reads and fallback immunity
let memoryCache: Record<string, TripPhoto[]> = {};

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
 * Save photos array to IndexedDB (with memory cache and localStorage fallback)
 */
export async function savePhotosToStorage(key: string, photos: TripPhoto[]): Promise<void> {
  // Always update in-memory cache first so UI responds immediately
  memoryCache[key] = [...photos];

  try {
    const db = await openDB();
    const tx = db.transaction([PHOTO_STORE, META_STORE], 'readwrite');
    const photoStore = tx.objectStore(PHOTO_STORE);
    const metaStore = tx.objectStore(META_STORE);

    // Save individual photos in parallel within transaction
    for (const photo of photos) {
      photoStore.put(photo);
    }

    // Save the list of photo IDs for this key
    const photoIds = photos.map(p => p.id);
    metaStore.put({ key, photoIds, updatedAt: Date.now() }, key);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('Transaction aborted'));
    });

    // Notify other components via custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dc-trip-photos-updated', {
          detail: { key, count: photos.length },
        })
      );
    }
  } catch (err) {
    console.warn('IndexedDB write warning, attempting safe storage fallback:', err);
    try {
      // Store in localStorage with defensive quota handling
      const serialized = JSON.stringify(photos);
      localStorage.setItem(key, serialized);
    } catch (localErr) {
      console.warn('LocalStorage quota limit reached, photo safely preserved in memory:', localErr);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dc-trip-photos-updated', {
          detail: { key, count: photos.length },
        })
      );
    }
  }
}

/**
 * Load photos array from IndexedDB or memory/localStorage fallback
 * Uses atomic getAll() to avoid transaction closure bugs.
 */
export async function getPhotosFromStorage(key: string): Promise<TripPhoto[]> {
  // 1. If in-memory cache exists and is populated, return immediately
  if (memoryCache[key] && memoryCache[key].length > 0) {
    return memoryCache[key];
  }

  // 2. Query IndexedDB cleanly with getAll()
  try {
    const db = await openDB();

    // Use a single read transaction to get metadata and all photos
    const allStoredPhotos = await new Promise<TripPhoto[]>((resolve, reject) => {
      const tx = db.transaction([PHOTO_STORE, META_STORE], 'readonly');
      const photoStore = tx.objectStore(PHOTO_STORE);
      const metaStore = tx.objectStore(META_STORE);

      const metaReq = metaStore.get(key);
      const allReq = photoStore.getAll();

      tx.oncomplete = () => {
        const meta = metaReq.result;
        const all = allReq.result || [];
        if (meta && Array.isArray(meta.photoIds) && meta.photoIds.length > 0) {
          const idSet = new Set(meta.photoIds);
          // Return in the order of photoIds
          const map = new Map<string, TripPhoto>();
          for (const p of all) {
            map.set(p.id, p);
          }
          const ordered: TripPhoto[] = [];
          for (const id of meta.photoIds) {
            const item = map.get(id);
            if (item) ordered.push(item);
          }
          resolve(ordered.length > 0 ? ordered : all);
        } else {
          resolve(all);
        }
      };

      tx.onerror = () => reject(tx.error);
    });

    if (allStoredPhotos && allStoredPhotos.length > 0) {
      memoryCache[key] = allStoredPhotos;
      return allStoredPhotos;
    }
  } catch (err) {
    console.warn('IndexedDB read notice, checking localStorage fallback:', err);
  }

  // 3. Fallback to localStorage
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCache[key] = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading from localStorage fallback:', e);
  }

  return memoryCache[key] || [];
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
 * Resize and compress an image file with error resilience
 * Produces crisp high-res image (max 1200px) with ~100-180KB footprint
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1200,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      if (!result) {
        resolve('');
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width || 800;
          let height = img.height || 600;

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
            resolve(result);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl || result);
        } catch (err) {
          console.warn('Canvas compression error, using original data URL:', err);
          resolve(result);
        }
      };

      img.onerror = () => {
        resolve(result);
      };

      img.src = result;
    };

    reader.onerror = () => {
      resolve('');
    };

    reader.readAsDataURL(file);
  });
}
