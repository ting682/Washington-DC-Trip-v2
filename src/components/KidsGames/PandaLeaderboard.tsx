import React, { useState, useEffect } from 'react';

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  difficulty: 'easy' | 'medium' | 'hard';
  date: string;
}

interface PandaLeaderboardProps {
  gameKey: string;
  gameTitle: string;
  currentDifficulty: 'easy' | 'medium' | 'hard';
  latestScore: number | null;
  onClearScore?: () => void;
}

const DEFAULT_SCORES: Record<string, LeaderboardEntry[]> = {
  'feast-frenzy': [
    { id: '1', name: 'Ethan', score: 260, difficulty: 'medium', date: 'Oct 14' },
    { id: '2', name: 'Luke', score: 210, difficulty: 'easy', date: 'Oct 14' },
    { id: '3', name: 'Mom', score: 180, difficulty: 'easy', date: 'Oct 14' },
    { id: '4', name: 'Dad', score: 150, difficulty: 'hard', date: 'Oct 14' },
  ],
  'zoo-dash': [
    { id: '1', name: 'Luke', score: 340, difficulty: 'medium', date: 'Oct 14' },
    { id: '2', name: 'Ethan', score: 310, difficulty: 'hard', date: 'Oct 14' },
    { id: '3', name: 'Dad', score: 220, difficulty: 'medium', date: 'Oct 14' },
    { id: '4', name: 'Mom', score: 190, difficulty: 'easy', date: 'Oct 14' },
  ],
  'bamboo-bounce': [
    { id: '1', name: 'Ethan', score: 420, difficulty: 'hard', date: 'Oct 14' },
    { id: '2', name: 'Mom', score: 380, difficulty: 'medium', date: 'Oct 14' },
    { id: '3', name: 'Luke', score: 350, difficulty: 'easy', date: 'Oct 14' },
    { id: '4', name: 'Dad', score: 290, difficulty: 'easy', date: 'Oct 14' },
  ],
  'bubble-slinger': [
    { id: '1', name: 'Luke', score: 480, difficulty: 'easy', date: 'Oct 14' },
    { id: '2', name: 'Ethan', score: 450, difficulty: 'medium', date: 'Oct 14' },
    { id: '3', name: 'Mom', score: 390, difficulty: 'medium', date: 'Oct 14' },
    { id: '4', name: 'Dad', score: 320, difficulty: 'hard', date: 'Oct 14' },
  ],
};

const FAMILY_PRESETS = ['Ethan', 'Luke', 'Mom', 'Dad', 'Grandma', 'Panda Fan'];

export const PandaLeaderboard: React.FC<PandaLeaderboardProps> = ({
  gameKey,
  gameTitle,
  currentDifficulty,
  latestScore,
  onClearScore,
}) => {
  const storageKey = `dc_leaderboard_${gameKey}`;
  const [entries, setEntries] = useState<LeaderboardEntry[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_SCORES[gameKey] || [];
  });

  const [filter, setFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [playerName, setPlayerName] = useState('');
  const [savedThisRound, setSavedThisRound] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries));
    } catch (e) {}
  }, [entries, storageKey]);

  useEffect(() => {
    setSavedThisRound(false);
  }, [latestScore]);

  const handleSaveScore = (nameToSave: string) => {
    const finalName = (nameToSave || playerName).trim() || 'Junior Explorer';
    if (latestScore === null || latestScore <= 0 || savedThisRound) return;

    const newEntry: LeaderboardEntry = {
      id: Date.now().toString(),
      name: finalName,
      score: latestScore,
      difficulty: currentDifficulty,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };

    setEntries(prev => {
      const updated = [...prev, newEntry].sort((a, b) => b.score - a.score).slice(0, 15);
      return updated;
    });

    setSavedThisRound(true);
    setPlayerName('');
    if (onClearScore) onClearScore();
  };

  const handleResetLeaderboard = () => {
    if (window.confirm('Reset this game leaderboard back to default family records?')) {
      const defaults = DEFAULT_SCORES[gameKey] || [];
      setEntries(defaults);
      try {
        localStorage.setItem(storageKey, JSON.stringify(defaults));
      } catch (e) {}
    }
  };

  const filteredEntries = entries.filter(e => filter === 'all' || e.difficulty === filter);

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-md">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <div>
            <h4 className="font-black text-sm text-amber-300">Family Hall of Fame</h4>
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
            <span className="text-[10px] text-slate-400">Save to Leaderboard</span>
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
              placeholder="Or type any name..."
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

      {/* Leaderboard Table */}
      {filteredEntries.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500">
          No records yet for this difficulty! Play a round to claim 1st place!
        </div>
      ) : (
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 text-xs">
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
        <span>Family records stay saved on this device.</span>
        <button
          onClick={handleResetLeaderboard}
          className="hover:text-rose-400 transition cursor-pointer underline"
        >
          Reset Scores
        </button>
      </div>
    </div>
  );
};
