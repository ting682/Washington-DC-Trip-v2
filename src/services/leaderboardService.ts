import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseFirestore';

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  difficulty: 'easy' | 'medium' | 'hard';
  date: string;
  timestamp?: number;
}

const DEFAULT_SCORES: Record<string, LeaderboardEntry[]> = {
  'feast-frenzy': [
    { id: '1', name: 'Ethan', score: 260, difficulty: 'medium', date: 'Oct 14', timestamp: 1728950000000 },
    { id: '2', name: 'Luke', score: 210, difficulty: 'easy', date: 'Oct 14', timestamp: 1728950000000 },
    { id: '3', name: 'Mom', score: 180, difficulty: 'easy', date: 'Oct 14', timestamp: 1728950000000 },
    { id: '4', name: 'Dad', score: 150, difficulty: 'hard', date: 'Oct 14', timestamp: 1728950000000 },
  ],
  'zoo-dash': [
    { id: '1', name: 'Luke', score: 340, difficulty: 'medium', date: 'Oct 14', timestamp: 1728950000000 },
    { id: '2', name: 'Ethan', score: 310, difficulty: 'hard', date: 'Oct 14', timestamp: 1728950000000 },
    { id: '3', name: 'Dad', score: 220, difficulty: 'medium', date: 'Oct 14', timestamp: 1728950000000 },
    { id: '4', name: 'Mom', score: 190, difficulty: 'easy', date: 'Oct 14', timestamp: 1728950000000 },
  ],
  'bamboo-bounce': [
    { id: '1', name: 'Ethan', score: 420, difficulty: 'hard', date: 'Oct 14', timestamp: 1728950000000 },
    { id: '2', name: 'Mom', score: 380, difficulty: 'medium', date: 'Oct 14', timestamp: 1728950000000 },
    { id: '3', name: 'Luke', score: 350, difficulty: 'easy', date: 'Oct 14', timestamp: 1728950000000 },
    { id: '4', name: 'Dad', score: 290, difficulty: 'easy', date: 'Oct 14', timestamp: 1728950000000 },
  ],
  'bubble-slinger': [
    { id: '1', name: 'Luke', score: 480, difficulty: 'easy', date: 'Oct 14', timestamp: 1728950000000 },
    { id: '2', name: 'Ethan', score: 450, difficulty: 'medium', date: 'Oct 14', timestamp: 1728950000000 },
    { id: '3', name: 'Mom', score: 390, difficulty: 'medium', date: 'Oct 14', timestamp: 1728950000000 },
    { id: '4', name: 'Dad', score: 320, difficulty: 'hard', date: 'Oct 14', timestamp: 1728950000000 },
  ],
};

const getLocalScores = (gameKey: string): LeaderboardEntry[] => {
  try {
    const raw = localStorage.getItem(`dc_leaderboard_${gameKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_SCORES[gameKey] || [];
};

const saveLocalScores = (gameKey: string, entries: LeaderboardEntry[]) => {
  try {
    localStorage.setItem(`dc_leaderboard_${gameKey}`, JSON.stringify(entries));
  } catch (e) {}
};

// Merge two lists of scores without duplicates and sort descending
export const mergeScores = (
  listA: LeaderboardEntry[],
  listB: LeaderboardEntry[]
): LeaderboardEntry[] => {
  const map = new Map<string, LeaderboardEntry>();

  const add = (e: LeaderboardEntry) => {
    // Unique key by player name + score + difficulty
    const key = `${e.name.toLowerCase().trim()}_${e.score}_${e.difficulty}`;
    if (!map.has(key)) {
      map.set(key, e);
    } else {
      // Keep the one with better metadata if exists
      const existing = map.get(key)!;
      if (!existing.timestamp && e.timestamp) {
        map.set(key, e);
      }
    }
  };

  listA.forEach(add);
  listB.forEach(add);

  return Array.from(map.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);
};

/**
 * Subscribes to real-time Cloud Firestore updates for a game leaderboard.
 * Automatically synchronizes with local storage and falls back cleanly if offline.
 */
export const subscribeGameLeaderboard = (
  gameKey: string,
  onUpdate: (entries: LeaderboardEntry[], isCloudSynced: boolean) => void
): (() => void) => {
  // 1. Immediately provide local cached scores (zero latency)
  const localInitial = getLocalScores(gameKey);
  onUpdate(localInitial, false);

  // 2. Connect to Cloud Firestore
  try {
    const leaderDocRef = doc(db, 'leaderboards', gameKey);

    const unsubscribe = onSnapshot(
      leaderDocRef,
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const cloudEntries = (data?.entries as LeaderboardEntry[]) || [];

          // Merge cloud records with local records so no score is lost
          const merged = mergeScores(cloudEntries, getLocalScores(gameKey));
          saveLocalScores(gameKey, merged);
          onUpdate(merged, true);
        } else {
          // Document does not exist in Firestore yet: seed with local/defaults
          const local = getLocalScores(gameKey);
          setDoc(leaderDocRef, {
            gameKey,
            entries: local,
            updatedAt: Date.now(),
          }).catch(() => {});
          onUpdate(local, true);
        }
      },
      error => {
        console.warn(`Firestore leaderboard listener for ${gameKey}:`, error);
        // On error or offline, fallback to local storage
        onUpdate(getLocalScores(gameKey), false);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn(`Firestore init error for ${gameKey}:`, err);
    onUpdate(localInitial, false);
    return () => {};
  }
};

/**
 * Saves a new high score both to Cloud Firestore and local storage.
 */
export const recordHighScore = async (
  gameKey: string,
  entry: LeaderboardEntry
): Promise<LeaderboardEntry[]> => {
  const cleanEntry: LeaderboardEntry = {
    ...entry,
    id: entry.id || `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: entry.timestamp || Date.now(),
  };

  // 1. Update local storage immediately
  const local = getLocalScores(gameKey);
  const updated = mergeScores([cleanEntry], local);
  saveLocalScores(gameKey, updated);

  // 2. Persist to Cloud Firestore
  try {
    const leaderDocRef = doc(db, 'leaderboards', gameKey);
    const snap = await getDoc(leaderDocRef);
    let cloudList: LeaderboardEntry[] = [];
    if (snap.exists()) {
      cloudList = (snap.data()?.entries as LeaderboardEntry[]) || [];
    }
    const finalMerged = mergeScores([cleanEntry], mergeScores(cloudList, updated));

    await setDoc(leaderDocRef, {
      gameKey,
      entries: finalMerged,
      updatedAt: Date.now(),
    });

    saveLocalScores(gameKey, finalMerged);
    return finalMerged;
  } catch (err) {
    console.error('Failed to sync score to Firestore (stored locally):', err);
    return updated;
  }
};
