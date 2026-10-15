import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseFirestore';
import { PackingItem, PassItem } from '../types';
import { defaultCategories, defaultPacking, defaultPasses } from '../data/tripData';

export interface ChecklistData {
  packing: PackingItem[];
  passes: PassItem[];
  categories: string[];
  updatedAt?: number;
  updatedBy?: string;
}

const STORAGE_PACKING_KEY = 'dc_packing_items_v12';
const STORAGE_PASSES_KEY = 'dc_passes_items_v12';
const STORAGE_CATEGORIES_KEY = 'dc_categories_v12';
const CHECKLIST_DOC_ID = 'master';

// Load locally cached checklist items
export const getLocalChecklist = (): ChecklistData => {
  let packing = defaultPacking;
  let passes = defaultPasses;
  let categories = defaultCategories;

  try {
    const rawPacking =
      localStorage.getItem(STORAGE_PACKING_KEY) || localStorage.getItem('dc_packing_items_v11');
    if (rawPacking) {
      const parsed = JSON.parse(rawPacking);
      if (Array.isArray(parsed) && parsed.length > 0) packing = parsed;
    }
  } catch (e) {}

  try {
    const rawPasses =
      localStorage.getItem(STORAGE_PASSES_KEY) || localStorage.getItem('dc_passes_items_v11');
    if (rawPasses) {
      const parsed = JSON.parse(rawPasses);
      if (Array.isArray(parsed) && parsed.length > 0) passes = parsed;
    }
  } catch (e) {}

  try {
    const rawCats =
      localStorage.getItem(STORAGE_CATEGORIES_KEY) || localStorage.getItem('dc_categories_v11');
    if (rawCats) {
      const parsed = JSON.parse(rawCats);
      if (Array.isArray(parsed) && parsed.length > 0) categories = parsed;
    }
  } catch (e) {}

  return { packing, passes, categories };
};

// Save checklist to localStorage for zero-latency local caching
export const saveLocalChecklist = (data: ChecklistData) => {
  try {
    localStorage.setItem(STORAGE_PACKING_KEY, JSON.stringify(data.packing));
    localStorage.setItem(STORAGE_PASSES_KEY, JSON.stringify(data.passes));
    localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(data.categories));
  } catch (e) {}
};

/**
 * Smart merge function that guarantees NO items are EVER lost:
 * - Retains all cloud items
 * - Retains any locally added custom items
 * - Retains all default base items
 * - Preserves checked status
 */
export const mergeChecklistData = (
  cloud: Partial<ChecklistData> | null,
  local: ChecklistData
): ChecklistData => {
  // 1. Merge Packing Items
  const packingMap = new Map<string, PackingItem>();

  // Helper to key an item by id or by name + category
  const getItemKey = (item: PackingItem) => item.id || `${item.category}_${item.name}`.toLowerCase();

  // First seed defaults
  defaultPacking.forEach(item => packingMap.set(getItemKey(item), { ...item }));

  // Next overlay local items
  local.packing.forEach(item => {
    const key = getItemKey(item);
    const existing = packingMap.get(key);
    packingMap.set(key, { ...existing, ...item });
  });

  // Next overlay cloud items (if any)
  if (cloud && Array.isArray(cloud.packing)) {
    cloud.packing.forEach(item => {
      const key = getItemKey(item);
      const existing = packingMap.get(key);
      packingMap.set(key, { ...existing, ...item });
    });
  }

  // 2. Merge Passes Items
  const passesMap = new Map<string, PassItem>();
  const getPassKey = (p: PassItem) => p.id || p.title.toLowerCase();

  defaultPasses.forEach(p => passesMap.set(getPassKey(p), { ...p }));

  local.passes.forEach(p => {
    const key = getPassKey(p);
    const existing = passesMap.get(key);
    passesMap.set(key, { ...existing, ...p });
  });

  if (cloud && Array.isArray(cloud.passes)) {
    cloud.passes.forEach(p => {
      const key = getPassKey(p);
      const existing = passesMap.get(key);
      passesMap.set(key, { ...existing, ...p });
    });
  }

  // 3. Merge Categories
  const catSet = new Set<string>(defaultCategories);
  local.categories.forEach(c => catSet.add(c));
  if (cloud && Array.isArray(cloud.categories)) {
    cloud.categories.forEach(c => catSet.add(c));
  }
  // Ensure every item's category is in the categories list
  packingMap.forEach(i => {
    if (i.category) catSet.add(i.category);
  });

  return {
    packing: Array.from(packingMap.values()),
    passes: Array.from(passesMap.values()),
    categories: Array.from(catSet),
    updatedAt: cloud?.updatedAt || Date.now(),
  };
};

/**
 * Subscribes to real-time Cloud Firestore updates for the packing and passes list.
 * Automatic, real-time sync across all family devices without needing a passcode.
 */
export const subscribeChecklist = (
  onUpdate: (data: ChecklistData, isCloudSynced: boolean) => void
): (() => void) => {
  // 1. Immediately provide local cached items (zero flicker, works offline)
  const localInitial = getLocalChecklist();
  onUpdate(localInitial, false);

  // 2. Connect to Cloud Firestore
  try {
    const docRef = doc(db, 'trip_checklists', CHECKLIST_DOC_ID);

    const unsubscribe = onSnapshot(
      docRef,
      snapshot => {
        if (snapshot.exists()) {
          const cloudData = snapshot.data() as Partial<ChecklistData>;
          const currentLocal = getLocalChecklist();
          const merged = mergeChecklistData(cloudData, currentLocal);
          saveLocalChecklist(merged);
          onUpdate(merged, true);
        } else {
          // Document does not exist in Firestore yet: seed with local/defaults immediately
          const local = getLocalChecklist();
          setDoc(docRef, {
            packing: local.packing,
            passes: local.passes,
            categories: local.categories,
            updatedAt: Date.now(),
            updatedBy: 'Family Initial Seed',
          }).catch(err => {
            console.warn('Initial checklist Firestore seed failed:', err);
          });
          onUpdate(local, true);
        }
      },
      error => {
        console.warn('Firestore checklist subscription error:', error);
        onUpdate(getLocalChecklist(), false);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to initialize Firestore checklist:', err);
    onUpdate(localInitial, false);
    return () => {};
  }
};

/**
 * Saves checklist updates to Cloud Firestore and updates local cache immediately.
 */
export const saveChecklistToCloud = async (
  data: ChecklistData,
  updaterName?: string
): Promise<boolean> => {
  // Update local storage immediately for fast UI response
  saveLocalChecklist(data);

  try {
    const docRef = doc(db, 'trip_checklists', CHECKLIST_DOC_ID);
    await setDoc(docRef, {
      packing: data.packing,
      passes: data.passes,
      categories: data.categories,
      updatedAt: Date.now(),
      updatedBy: updaterName || 'Family Member',
    });
    return true;
  } catch (err) {
    console.error('Failed to save checklist to Firestore (saved locally):', err);
    return false;
  }
};
