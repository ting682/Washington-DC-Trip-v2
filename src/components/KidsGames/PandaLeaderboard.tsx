import React, { useState, useEffect } from 'react';
import {
  LeaderboardEntry,
  subscribeGameLeaderboard,
  recordHighScore,
} from '../../services/leaderboardService';

export type { LeaderboardEntry };

interface PandaLeaderboardProps {
  gameKey: string;
  gameTitle: string;
  currentDifficulty: 'easy' | 'medium' | 'hard';
  latestScore: number | null;
  onClearScore?: () => void;
}

const FAMILY_PRESETS = ['Anna', 'Amy', 'Ethan', 'Luke', 'Mom', 'Dad', 'Grandma', 'Panda Fan'];

export const PandaLeaderboard: React.FC<PandaLeaderboardProps> = ({
  gameKey,
  gameTitle,
  currentDifficulty,
  latestScore,
  onClearScore,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [filter, setFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [playerName, setPlayerName] = useState('');
  const [savedThisRound, setSavedThisRound] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreName, setRestoreName] = useState('Anna');
  const [restoreScore, setRestoreScore] = useState<number | ''>(450);
  const [restoreDiff, setRestoreDiff] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Real-time synchronization with Cloud Firestore (persists across all devices & deployments)
  useEffect(() => {
    const unsubscribe = subscribeGameLeaderboard(gameKey, (updatedEntries, synced) => {
      setEntries(updatedEntries);
      setIsCloudSynced(synced);
    });
    return () => unsubscribe();
  }, [gameKey]);

  useEffect(() => {
    setSavedThisRound(false);
  }, [latestScore]);

  const handleSaveScore = async (nameToSave: string) => {
    const finalName = (nameToSave || playerName).trim() || 'Junior Explorer';
    if (latestScore === null || latestScore <= 0 || savedThisRound) return;

    const newEntry: LeaderboardEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: finalName,
      score: latestScore,
      difficulty: currentDifficulty,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      timestamp: Date.now(),
    };

    setSavedThisRound(true);
    setPlayerName('');
    if (onClearScore) onClearScore();

    // Persist immediately to Cloud Firestore and local storage
    const updated = await recordHighScore(gameKey, newEntry);
    setEntries(updated);
  };

  const handleRestorePastScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (restoreScore === '' || Number(restoreScore) <= 0) return;

    const restoredEntry: LeaderboardEntry = {
      id: `${Date.now()}_restored`,
      name: restoreName.trim() || 'Daughter',
      score: Number(restoreScore),
      difficulty: restoreDiff,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      timestamp: Date.now(),
    };

    const updated = await recordHighScore(gameKey, restoredEntry);
    setEntries(updated);
    setShowRestoreModal(false);
  };

  const filteredEntries = entries.filter(e => filter === 'all' || e.difficulty === filter);

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-black text-sm text-amber-300">Family Hall of Fame</h4>
              {isCloudSynced ? (
                <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  ☁️ Cloud Saved
                </span>
              ) : (
                <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                  💾 Local Cached
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">{gameTitle} High Scores</p>
          </div>
        </div>

        {/* Difficulty Filter Tabs */}
        <div className="flex items-center bg-slate-800 rounded-full p-0.5 border border-slate-700 text-[10px] font-bold">
          {(['all', 'easy', 'medium', 'hard'] as const).map(d => (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className={`px-2 py-0.5 rounded-full capitalize transition cursor-pointer ${
                filter === d ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Save Score Prompt if player just finished a game */}
      {latestScore !== null && latestScore > 0 && !savedThisRound && (
        <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-3.5 mb-4 animate-fade-in">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              <span>🎉 New Score:</span>
              <strong className="text-base text-amber-400 font-mono font-black">{latestScore} pts</strong>
              <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full uppercase">
                {currentDifficulty}
              </span>
            </span>
            <span className="text-[10px] text-slate-400">Save to Cloud Leaderboard</span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2.5">
            <span className="text-[10px] text-slate-400 self-center mr-1">Quick pick:</span>
            {FAMILY_PRESETS.map(preset => (
              <button
                key={preset}
                onClick={() => handleSaveScore(preset)}
                className="text-[11px] font-bold bg-slate-800 hover:bg-amber-400 hover:text-slate-950 px-2.5 py-1 rounded-lg border border-slate-700 transition cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              handleSaveScore(playerName);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Or type player name..."
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              maxLength={16}
            />
            <button
              type="submit"
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-4 py-1.5 rounded-xl text-xs transition cursor-pointer shadow-xs active:scale-95 shrink-0"
            >
              Save 🏅
            </button>
          </form>
        </div>
      )}

      {/* Manual Restore / Add Past Score Modal Form */}
      {showRestoreModal && (
        <form
          onSubmit={handleRestorePastScore}
          className="bg-slate-800/90 border border-amber-400/40 rounded-2xl p-4 mb-4 text-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              <span>🔄</span> Restore or Add High Score
            </span>
            <button
              type="button"
              onClick={() => setShowRestoreModal(false)}
              className="text-slate-400 hover:text-white cursor-pointer text-sm"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] text-slate-300">
            Enter your daughter's name and high score below to permanently save it to Cloud Firestore across all family devices:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Player Name</label>
              <input
                type="text"
                value={restoreName}
                onChange={e => setRestoreName(e.target.value)}
                placeholder="e.g. Daughter"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Score (Points)</label>
              <input
                type="number"
                value={restoreScore}
                onChange={e => setRestoreScore(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 450"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Difficulty</label>
              <select
                value={restoreDiff}
                onChange={e => setRestoreDiff(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowRestoreModal(false)}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg cursor-pointer"
            >
              Save Forever in Cloud ☁️
            </button>
          </div>
        </form>
      )}

      {/* Leaderboard Table */}
      {filteredEntries.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500">
          No records yet for this difficulty! Play a round to claim 1st place!
        </div>
      ) : (
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 text-xs">
          {filteredEntries.map((entry, index) => {
            const isTop3 = index < 3;
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-2 rounded-xl transition ${
                  index === 0
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200'
                    : isTop3
                    ? 'bg-slate-800/80 border border-slate-700 text-slate-200'
                    : 'bg-slate-800/40 border border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-bold w-5 text-center text-sm">{medal}</span>
                  <div className="min-w-0">
                    <span className="font-bold text-white block truncate">{entry.name}</span>
                    <span className="text-[9px] text-slate-400">
                      {entry.date} · <span className="capitalize">{entry.difficulty}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-amber-400 text-sm">{entry.score}</span>
                  <span className="text-[10px] text-slate-400">pts</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <span>☁️ Scores permanently sync across devices & future revisions.</span>
        <button
          onClick={() => setShowRestoreModal(true)}
          className="text-amber-400 hover:text-amber-300 transition cursor-pointer underline flex items-center gap-1 font-bold"
        >
          <span>➕ Restore / Add Score</span>
        </button>
      </div>
    </div>
  );
};
