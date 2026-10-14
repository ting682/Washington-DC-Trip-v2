import React, { useEffect, useRef, useState } from 'react';
import {
  HUNT_BADGES,
  HUNT_STOPS,
  SITE_KNOWLEDGE_BASE,
  spyMissions,
  TRIVIA_QUESTIONS,
} from '../data/tripData';
import { PandaFeastFrenzy } from './KidsGames/PandaFeastFrenzy';
import { PandaZooDash } from './KidsGames/PandaZooDash';
import { PandaBambooBounce } from './KidsGames/PandaBambooBounce';
import { PandaBubbleSlinger } from './KidsGames/PandaBubbleSlinger';

export const KidsView: React.FC = () => {
  const [activeGame, setActiveGame] = useState<'panda' | 'spy' | 'trivia' | 'hunt'>('panda');
  const [pandaChoice, setPandaChoice] = useState<'frenzy' | 'dash' | 'bounce' | 'bubble' | 'classic'>('frenzy');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-[color:var(--navy)] rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            Ages 8 &amp; 11 · Washington DC Edition
          </span>
          <h2 className="serif text-2xl sm:text-3xl font-black mt-2">
            🎮 DC Junior Explorer &amp; Games
          </h2>
          <p className="text-xs sm:text-sm text-amber-100 max-w-xl mt-1">
            Play mini-games tied to the places you are visiting this week!
          </p>
        </div>
        <div className="absolute right-3 -bottom-4 text-7xl opacity-20 select-none pointer-events-none">
          🐼🕵️🚀
        </div>
      </div>

      {/* Game Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-slate-200/90 p-1 rounded-2xl max-w-2xl mx-auto text-[11px] sm:text-xs font-black">
        <button
          onClick={() => setActiveGame('panda')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeGame === 'panda' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          <span>🐼 Panda Snack Toss</span>
        </button>
        <button
          onClick={() => setActiveGame('spy')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeGame === 'spy' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          <span>🕵️ Spy Secret Ciphers</span>
        </button>
        <button
          onClick={() => setActiveGame('trivia')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeGame === 'trivia' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          <span>🧠 DC Trivia</span>
        </button>
        <button
          onClick={() => setActiveGame('hunt')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeGame === 'hunt' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          <span>🔍 Scavenger Hunt</span>
        </button>
      </div>

      {/* Mini Games */}
      {activeGame === 'panda' && (
        <div className="space-y-4">
          {/* Panda Choice Showcase Banner */}
          <div className="bg-emerald-950/5 border border-emerald-500/20 rounded-3xl p-4 sm:p-5 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
              <span className="text-2xl">🐼</span>
              <h3 className="font-black text-sm sm:text-base text-emerald-950">Panda Games Play-Test Arena</h3>
              <span className="text-[10px] bg-emerald-600 text-white font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Review &amp; Feedback Mode
              </span>
            </div>
            <p className="text-xs text-emerald-800 max-w-xl mx-auto mb-3.5 leading-relaxed">
              Test all 4 brand-new game styles below with <strong>Easy, Medium, and Hard</strong> modes &amp; <strong>Family Leaderboards</strong>!
            </p>

            {/* Sub Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl mx-auto text-xs font-black">
              <button
                onClick={() => setPandaChoice('frenzy')}
                className={`py-2.5 px-3 rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                  pandaChoice === 'frenzy'
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 scale-[1.02]'
                    : 'bg-white text-slate-700 hover:bg-emerald-50 border border-slate-200'
                }`}
              >
                <span>🍱 1. Feast Frenzy</span>
              </button>
              <button
                onClick={() => setPandaChoice('dash')}
                className={`py-2.5 px-3 rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                  pandaChoice === 'dash'
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 scale-[1.02]'
                    : 'bg-white text-slate-700 hover:bg-emerald-50 border border-slate-200'
                }`}
              >
                <span>🏃 2. Zoo Dash</span>
              </button>
              <button
                onClick={() => setPandaChoice('bounce')}
                className={`py-2.5 px-3 rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                  pandaChoice === 'bounce'
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 scale-[1.02]'
                    : 'bg-white text-slate-700 hover:bg-emerald-50 border border-slate-200'
                }`}
              >
                <span>🎋 3. Bamboo Bounce</span>
              </button>
              <button
                onClick={() => setPandaChoice('bubble')}
                className={`py-2.5 px-3 rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                  pandaChoice === 'bubble'
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 scale-[1.02]'
                    : 'bg-white text-slate-700 hover:bg-emerald-50 border border-slate-200'
                }`}
              >
                <span>🧩 4. Bubble Slinger</span>
              </button>
            </div>
          </div>

          {/* Active Game Choice Render */}
          {pandaChoice === 'frenzy' && <PandaFeastFrenzy />}
          {pandaChoice === 'dash' && <PandaZooDash />}
          {pandaChoice === 'bounce' && <PandaBambooBounce />}
          {pandaChoice === 'bubble' && <PandaBubbleSlinger />}
        </div>
      )}
      {activeGame === 'spy' && <SpyGame />}
      {activeGame === 'trivia' && <TriviaGame />}
      {activeGame === 'hunt' && <ScavengerHuntGame />}
    </div>
  );
};

// ==========================================
// GAME 1: PANDA GAME COMPONENT
// ==========================================
const PandaGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('dc_panda_hi') || '0', 10);
    } catch (e) {
      return 0;
    }
  });
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [overlayTitle, setOverlayTitle] = useState('Panda Bamboo Catcher');
  const [overlaySubtitle, setOverlaySubtitle] = useState('Catch bamboo for the National Zoo pandas!');
  const [difficulty, setDifficulty] = useState<'easy' | 'challenge'>('easy');

  // Game state refs for animation loop
  // Wider basket (95px) for easy mode, 70px for challenge
  const basketRef = useRef({ x: 152, y: 272, width: 96, height: 28 });
  const itemsRef = useRef<{ x: number; y: number; speed: number; icon: string; isHeart?: boolean }[]>([]);
  const livesRef = useRef(5);
  const scoreRef = useRef(0);
  const animIdRef = useRef<number | null>(null);
  const lastSpawnRef = useRef(0);

  const drawScene = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 400, 320);

    // Ground
    ctx.fillStyle = '#059669';
    ctx.fillRect(0, 305, 400, 15);

    // Basket
    const b = basketRef.current;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(b.x, b.y, b.width, b.height, 8) : ctx.rect(b.x, b.y, b.width, b.height);
    ctx.fill();

    ctx.fillStyle = '#10b981';
    ctx.fillRect(b.x, b.y - 3, b.width, 4);

    ctx.font = '22px sans-serif';
    ctx.fillText('🐼', b.x + (b.width / 2) - 13, b.y + 22);
  };

  const stopGame = () => {
    setGameRunning(false);
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    const finalScore = scoreRef.current;
    if (finalScore > highScore) {
      setHighScore(finalScore);
      try {
        localStorage.setItem('dc_panda_hi', finalScore.toString());
      } catch (e) {}
    }
    setGameOver(true);
    setOverlayTitle(`Game Over! Score: ${finalScore}`);
    setOverlaySubtitle(
      finalScore >= 100
        ? 'Amazing job! Bao Li & Qing Bao are super full and happy!'
        : 'Great effort! Play again to beat your record!'
    );
  };

  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawScene(ctx);

    const isEasy = difficulty === 'easy';
    const now = Date.now();
    const spawnDelay = isEasy ? 1100 : 750;

    // Gentle controlled spawn
    if (now - lastSpawnRef.current > spawnDelay && Math.random() < 0.04) {
      lastSpawnRef.current = now;
      const needHeart = livesRef.current < (isEasy ? 5 : 3);
      const isHeart = needHeart && Math.random() < 0.15; // 15% chance to drop bonus heart!

      // Speed is much slower in easy mode: 1.2 to 2.2 max
      const baseSpeed = isEasy ? 1.2 : 2.0;
      const speedGrowth = isEasy ? Math.min(scoreRef.current * 0.008, 1.0) : Math.min(scoreRef.current * 0.03, 2.5);

      itemsRef.current.push({
        x: Math.random() * 320 + 20,
        y: -20,
        speed: baseSpeed + speedGrowth,
        icon: isHeart ? '💖' : Math.random() > 0.3 ? '🎋' : Math.random() > 0.5 ? '🍎' : '⭐',
        isHeart,
      });
    }

    const b = basketRef.current;
    for (let i = itemsRef.current.length - 1; i >= 0; i--) {
      const item = itemsRef.current[i];
      item.y += item.speed;

      ctx.font = '24px sans-serif';
      ctx.fillText(item.icon, item.x, item.y);

      // Generous Collision Box
      const hitMargin = isEasy ? 16 : 8;
      if (
        item.y >= b.y - 14 &&
        item.y <= b.y + b.height + 12 &&
        item.x + 22 >= b.x - hitMargin &&
        item.x <= b.x + b.width + hitMargin
      ) {
        if (item.isHeart) {
          const maxLives = isEasy ? 5 : 3;
          livesRef.current = Math.min(maxLives, livesRef.current + 1);
        } else if (item.icon === '⭐') {
          scoreRef.current += 25;
        } else {
          scoreRef.current += 10;
        }
        setScore(scoreRef.current);
        itemsRef.current.splice(i, 1);
        continue;
      }

      // Missed item
      if (item.y > 325) {
        const wasHeart = item.isHeart;
        itemsRef.current.splice(i, 1);
        // Missing a bonus heart doesn't count against lives
        if (!wasHeart) {
          livesRef.current--;
          if (livesRef.current <= 0) {
            stopGame();
            return;
          }
        }
      }
    }

    // Hearts
    ctx.font = '16px sans-serif';
    let hearts = '';
    for (let l = 0; l < livesRef.current; l++) hearts += '❤️';
    ctx.fillText(hearts, 15, 25);

    animIdRef.current = requestAnimationFrame(gameLoop);
  };

  const startGame = () => {
    const isEasy = difficulty === 'easy';
    basketRef.current.width = isEasy ? 96 : 70;
    basketRef.current.x = Math.max(5, Math.min(400 - basketRef.current.width - 5, basketRef.current.x));
    scoreRef.current = 0;
    livesRef.current = isEasy ? 5 : 3;
    itemsRef.current = [];
    lastSpawnRef.current = Date.now();
    setScore(0);
    setGameOver(false);
    setGameRunning(true);
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    animIdRef.current = requestAnimationFrame(gameLoop);
  };

  const moveBasket = (delta: number) => {
    const maxBound = 400 - basketRef.current.width - 5;
    basketRef.current.x = Math.max(5, Math.min(maxBound, basketRef.current.x + delta));
    const canvas = canvasRef.current;
    if (canvas && !gameRunning) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawScene(ctx);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawScene(ctx);
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') moveBasket(-45);
      if (e.key === 'ArrowRight') moveBasket(45);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, []);

  const handlePointer = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 400 / rect.width;
    const touchX = (clientX - rect.left) * scaleX;
    const maxBound = 400 - basketRef.current.width - 5;
    basketRef.current.x = Math.max(5, Math.min(maxBound, touchX - basketRef.current.width / 2));
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-center">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            🐾 Feed Bao Li &amp; Qing Bao
          </span>
          {/* Difficulty Mode Toggle */}
          <div className="flex items-center bg-slate-100 rounded-full p-0.5 border border-slate-200 text-[11px]">
            <button
              onClick={() => {
                if (!gameRunning) {
                  setDifficulty('easy');
                  basketRef.current.width = 96;
                }
              }}
              disabled={gameRunning}
              className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
                difficulty === 'easy'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Easy (Kids)
            </button>
            <button
              onClick={() => {
                if (!gameRunning) {
                  setDifficulty('challenge');
                  basketRef.current.width = 70;
                }
              }}
              disabled={gameRunning}
              className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
                difficulty === 'challenge'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Classic
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-500">
            Score: <strong className="text-emerald-600 text-sm font-mono">{score}</strong>
          </span>
          <span className="font-bold text-slate-500">
            High: <strong className="text-slate-800 text-sm font-mono">{highScore}</strong>
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-3">
        Slide the panda with your finger or mouse (or use the arrow buttons below) to catch bamboo 🎋, apples 🍎, and stars ⭐! Catch floating hearts 💖 to restore extra lives!
      </p>

      {/* GAME CANVAS WRAPPER */}
      <div className="relative max-w-md mx-auto bg-gradient-to-b from-sky-100 to-emerald-50 rounded-2xl border-2 border-slate-300 overflow-hidden shadow-inner h-[320px]">
        <canvas
          ref={canvasRef}
          width={400}
          height={320}
          className="w-full h-full block cursor-pointer"
          onTouchMove={e => {
            if (gameRunning) {
              handlePointer(e.touches[0].clientX);
              e.preventDefault();
            }
          }}
          onTouchStart={e => {
            if (gameRunning) handlePointer(e.touches[0].clientX);
          }}
          onMouseMove={e => {
            if (gameRunning) handlePointer(e.clientX);
          }}
        />

        {(!gameRunning || gameOver) && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
            <span className="text-5xl mb-2">🐼</span>
            <h3 className="text-lg font-black">{overlayTitle}</h3>
            <p className="text-xs text-slate-200 mt-1 mb-4">{overlaySubtitle}</p>
            <button
              onClick={startGame}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-6 py-2.5 rounded-2xl text-xs shadow-md active:scale-95 transition flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-play"></i> {gameOver ? 'Play Again' : 'Start Playing'}
            </button>
          </div>
        )}
      </div>

      {/* ON-SCREEN PHONE CONTROLS */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          onClick={() => moveBasket(-55)}
          className="w-16 h-12 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-2xl flex items-center justify-center shadow-xs active:scale-90 transition text-lg cursor-pointer"
          aria-label="Move left"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <span className="text-xs text-slate-400 font-semibold">Tap arrows or drag panda</span>
        <button
          onClick={() => moveBasket(55)}
          className="w-16 h-12 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-2xl flex items-center justify-center shadow-xs active:scale-90 transition text-lg cursor-pointer"
          aria-label="Move right"
        >
          <i className="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// GAME 2: SPY CIPHER DECODER
// ==========================================
const SpyGame: React.FC = () => {
  const [missionIndex, setMissionIndex] = useState(0);
  const [answerInput, setAnswerInput] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; isCorrect: boolean } | null>(null);
  const [agentRank, setAgentRank] = useState('Rank: Junior Agent');

  const currentMission = spyMissions[missionIndex];

  const handleCheck = () => {
    const cleanInput = answerInput.trim().toUpperCase();
    if (cleanInput === currentMission.answer) {
      setFeedback({ text: '✅ DECRYPTED! Mission accomplished Agent!', isCorrect: true });
      if (missionIndex < spyMissions.length - 1) {
        setTimeout(() => {
          setMissionIndex(prev => prev + 1);
          setAnswerInput('');
          setFeedback(null);
        }, 1100);
      } else {
        setAgentRank('Rank: MASTER SPY 🎖️');
        setFeedback({
          text: '🏆 All Missions Decoded! You are ready for the Spy Museum!',
          isCorrect: true,
        });
      }
    } else {
      setFeedback({ text: '❌ Access Denied. Check your cipher shift!', isCorrect: false });
    }
  };

  const handleNext = () => {
    setMissionIndex(prev => (prev + 1) % spyMissions.length);
    setAnswerInput('');
    setFeedback(null);
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-slate-800">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🕵️</span>
          <div>
            <h3 className="text-sm font-black text-slate-900">Spy Museum Cipher Breaker</h3>
            <p className="text-xs text-slate-500">Decrypt secret intelligence before mission day</p>
          </div>
        </div>
        <span className="bg-purple-100 text-purple-800 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full">
          {agentRank}
        </span>
      </div>

      <div className="bg-slate-900 text-emerald-400 font-mono p-5 rounded-2xl mb-4 text-center border border-slate-800">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
          Encrypted Classified Clue:
        </span>
        <p className="text-xl sm:text-2xl font-bold tracking-widest text-amber-300 my-1">
          {currentMission.display}
        </p>
        <p className="text-xs text-slate-400 mt-2 font-sans italic">Clue: {currentMission.hint}</p>
      </div>

      <div className="max-w-md mx-auto space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={answerInput}
            onChange={e => setAnswerInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCheck()}
            placeholder="Enter solution here..."
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleCheck}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
          >
            Decrypt 🔓
          </button>
        </div>
        <div className="text-xs font-bold text-center min-h-[20px]">
          {feedback && (
            <span className={feedback.isCorrect ? 'text-emerald-600' : 'text-rose-500'}>
              {feedback.text}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>
          Mission Progress:{' '}
          <strong className="text-slate-800">
            {missionIndex + 1} / {spyMissions.length}
          </strong>
        </span>
        <button
          onClick={handleNext}
          className="text-purple-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
        >
          Next Mission Clue <i className="fa-solid fa-arrow-right text-[10px]"></i>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// GAME 3: DC TRIVIA CHALLENGE
// ==========================================
const TriviaGame: React.FC = () => {
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [gameState, setGameState] = useState<'start' | 'play' | 'result'>('start');
  const [roundIndices, setRoundIndices] = useState<number[]>([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('dc_trivia_best') || '0', 10);
    } catch (e) {
      return 0;
    }
  });
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);

  // Unique sites for dropdown
  const siteCounts: Record<string, number> = {};
  TRIVIA_QUESTIONS.forEach(q => {
    siteCounts[q[0]] = (siteCounts[q[0]] || 0) + 1;
  });

  const getSiteTitle = (key: string) => {
    if (key === 'dc') return 'Washington, D.C.';
    return SITE_KNOWLEDGE_BASE[key]?.title || key;
  };

  const startRound = () => {
    const pool = TRIVIA_QUESTIONS.map((_, i) => i).filter(
      i => selectedSite === 'all' || TRIVIA_QUESTIONS[i][0] === selectedSite
    );

    // Shuffle pool
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, Math.min(10, shuffled.length));

    setRoundIndices(chosen);
    setCurrentRoundIdx(0);
    setScore(0);
    setSelectedAnswer(null);

    // Prepare first question's choices
    if (chosen.length > 0) {
      const q = TRIVIA_QUESTIONS[chosen[0]];
      const choices = [q[2], ...q[3]].sort(() => Math.random() - 0.5);
      setShuffledChoices(choices);
    }

    setGameState('play');
  };

  const handleAnswer = (choice: string) => {
    if (selectedAnswer !== null) return;
    const q = TRIVIA_QUESTIONS[roundIndices[currentRoundIdx]];
    const isCorrect = choice === q[2];
    setSelectedAnswer(choice);
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    const nextIdx = currentRoundIdx + 1;
    if (nextIdx < roundIndices.length) {
      setCurrentRoundIdx(nextIdx);
      setSelectedAnswer(null);
      const q = TRIVIA_QUESTIONS[roundIndices[nextIdx]];
      const choices = [q[2], ...q[3]].sort(() => Math.random() - 0.5);
      setShuffledChoices(choices);
    } else {
      // Results
      const finalScore = score;
      if (finalScore > bestScore) {
        setBestScore(finalScore);
        try {
          localStorage.setItem('dc_trivia_best', finalScore.toString());
        } catch (e) {}
      }
      setGameState('result');
    }
  };

  const currentQ = roundIndices.length > 0 ? TRIVIA_QUESTIONS[roundIndices[currentRoundIdx]] : null;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-slate-800">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧠</span>
          <div>
            <h3 className="text-sm font-black text-slate-900">DC Trivia Challenge</h3>
            <p className="text-xs text-slate-500">
              {TRIVIA_QUESTIONS.length} questions about the places on our trip
            </p>
          </div>
        </div>
        <span className="bg-sky-100 text-sky-800 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
          Best: {bestScore}/10
        </span>
      </div>

      {/* START SCREEN */}
      {gameState === 'start' && (
        <div className="max-w-md mx-auto text-center space-y-3">
          <p className="text-xs text-slate-600">
            Pick a place (or all of them), then answer 10 questions. Choose A, B, C or D!
          </p>
          <select
            value={selectedSite}
            onChange={e => setSelectedSite(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">🌎 All places ({TRIVIA_QUESTIONS.length} questions)</option>
            {Object.keys(siteCounts).map(k => (
              <option key={k} value={k}>
                {getSiteTitle(k)} ({siteCounts[k]})
              </option>
            ))}
          </select>
          <button
            onClick={startRound}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-black px-6 py-3 rounded-2xl text-sm shadow-md active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-play"></i> Start 10 Questions
          </button>
        </div>
      )}

      {/* QUESTION SCREEN */}
      {gameState === 'play' && currentQ && (
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-slate-500">
              Question <strong className="text-slate-900">{currentRoundIdx + 1}</strong> of{' '}
              {roundIndices.length}
            </span>
            <span className="font-bold text-slate-500">
              Score: <strong className="text-sky-700 font-mono text-sm">{score}</strong>
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-sky-500 transition-all duration-300"
              style={{ width: `${((currentRoundIdx + 1) / roundIndices.length) * 100}%` }}
            ></div>
          </div>
          <span className="inline-block text-[10px] font-black uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full mb-2">
            {getSiteTitle(currentQ[0])}
          </span>
          <p className="text-base sm:text-lg font-black text-slate-900 leading-snug mb-4">
            {currentQ[1]}
          </p>
          <div className="grid gap-2">
            {shuffledChoices.map((choice, i) => {
              const letter = 'ABCD'[i];
              const isCorrectAnswer = choice === currentQ[2];
              const isSelected = choice === selectedAnswer;

              let btnStyle =
                'bg-slate-50 hover:bg-sky-50 border-slate-200 hover:border-sky-300 text-slate-800';
              if (selectedAnswer !== null) {
                if (isCorrectAnswer) {
                  btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-black';
                } else if (isSelected) {
                  btnStyle = 'bg-rose-50 border-rose-500 text-rose-950';
                } else {
                  btnStyle = 'bg-slate-50 border-slate-200 opacity-60 text-slate-500';
                }
              }

              return (
                <button
                  key={i}
                  disabled={selectedAnswer !== null}
                  onClick={() => handleAnswer(choice)}
                  className={`w-full text-left flex items-center gap-3 border-2 rounded-2xl px-3 py-3 text-sm font-bold transition cursor-pointer ${btnStyle}`}
                >
                  <span className="w-8 h-8 shrink-0 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center font-black text-slate-700">
                    {letter}
                  </span>
                  <span>{choice}</span>
                </button>
              );
            })}
          </div>

          <div className="text-sm font-bold text-center min-h-[24px] mt-3">
            {selectedAnswer !== null && (
              <span>
                {selectedAnswer === currentQ[2] ? (
                  <span className="text-emerald-600">✅ Correct! Nice work, explorer!</span>
                ) : (
                  <span className="text-rose-600">
                    ❌ Not quite. The answer is: <strong>{currentQ[2]}</strong>
                  </span>
                )}
              </span>
            )}
          </div>

          {selectedAnswer !== null && (
            <button
              onClick={handleNextQuestion}
              className="w-full mt-3 bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-2xl text-sm active:scale-95 transition cursor-pointer"
            >
              {currentRoundIdx === roundIndices.length - 1 ? (
                'See My Score 🏆'
              ) : (
                <>
                  Next Question <i className="fa-solid fa-arrow-right text-xs"></i>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* RESULTS SCREEN */}
      {gameState === 'result' && (
        <div className="max-w-md mx-auto text-center space-y-3">
          <div className="text-5xl">
            {score === 10 ? '🏆' : score >= 7 ? '🌟' : score >= 4 ? '👍' : '📚'}
          </div>
          <p className="text-lg font-black text-slate-900">
            {score === 10
              ? 'Perfect score! DC Expert!'
              : score >= 7
              ? 'Awesome job, explorer!'
              : score >= 4
              ? 'Good try! Keep exploring!'
              : 'Keep learning, you will get there!'}
          </p>
          <p className="text-sm text-slate-600">
            You got {score} out of {roundIndices.length} right
            {selectedSite === 'all' ? '.' : ` about ${getSiteTitle(selectedSite)}.`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={startRound}
              className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-black py-3 rounded-2xl text-sm active:scale-95 transition cursor-pointer"
            >
              <i className="fa-solid fa-rotate-right"></i> Play Again
            </button>
            <button
              onClick={() => setGameState('start')}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black py-3 rounded-2xl text-sm active:scale-95 transition cursor-pointer"
            >
              Change Place
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// GAME 4: DC SCAVENGER HUNT
// ==========================================
const ScavengerHuntGame: React.FC = () => {
  const [huntState, setHuntState] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem('dc_scavenger_hunt_v1') || '{}');
    } catch (e) {
      return {};
    }
  });

  const [openStopIndex, setOpenStopIndex] = useState<number | null>(0);

  let found = 0;
  let total = 0;
  let points = 0;
  let maxPoints = 0;

  HUNT_STOPS.forEach((stop, si) =>
    stop[3].forEach(([_, pts], ti) => {
      total++;
      maxPoints += pts;
      if (huntState[`${si}-${ti}`]) {
        found++;
        points += pts;
      }
    })
  );

  const currentBadge =
    found === total
      ? HUNT_BADGES[HUNT_BADGES.length - 1]
      : HUNT_BADGES.filter(b => points >= b.min).pop() || HUNT_BADGES[0];

  const nextBadge = HUNT_BADGES.find(b => b.min > points);

  const toggleTask = (si: number, ti: number) => {
    const key = `${si}-${ti}`;
    setHuntState(prev => {
      const updated = { ...prev };
      if (updated[key]) {
        delete updated[key];
      } else {
        updated[key] = Date.now();
      }
      try {
        localStorage.setItem('dc_scavenger_hunt_v1', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const resetHunt = () => {
    if (
      !confirm(
        'Start the scavenger hunt over? This clears every checkmark on this phone.'
      )
    )
      return;
    setHuntState({});
    try {
      localStorage.removeItem('dc_scavenger_hunt_v1');
    } catch (e) {}
  };

  let lastDay = '';

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-slate-800">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          <div>
            <h3 className="text-sm font-black text-slate-900">DC Scavenger Hunt</h3>
            <p className="text-xs text-slate-500">
              Find it, tap it, earn points! ⭐ items are worth 25.
            </p>
          </div>
        </div>
        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-full whitespace-nowrap">
          {currentBadge.label}
        </span>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4">
        <div className="flex items-center justify-between text-xs font-bold mb-1.5">
          <span className="text-amber-900">
            {found} of {total} found
          </span>
          <span className="text-amber-900">
            <span className="font-mono text-sm">{points}</span> pts
          </span>
        </div>
        <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-amber-200">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${total ? (found / total) * 100 : 0}%` }}
          ></div>
        </div>
        <p className="text-[10px] text-amber-800 mt-1.5">
          {found === total
            ? '🎉 You found everything! Official DC Master Detectives!'
            : nextBadge
            ? `${nextBadge.min - points} more points to become ${nextBadge.label}`
            : `Find everything (${maxPoints} pts) to finish the hunt!`}
        </p>
      </div>

      <div className="space-y-3">
        {HUNT_STOPS.map(([day, place, emoji, tasks], si) => {
          const showDayHeader = day !== lastDay;
          lastDay = day;
          const doneCount = tasks.filter((_, ti) => huntState[`${si}-${ti}`]).length;
          const complete = doneCount === tasks.length;
          const isOpen = openStopIndex === si;

          return (
            <React.Fragment key={si}>
              {showDayHeader && (
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 pt-1">
                  {day}
                </div>
              )}
              <div
                className={`rounded-2xl border ${
                  complete
                    ? 'border-emerald-300 bg-emerald-50/60'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <button
                  onClick={() => setOpenStopIndex(isOpen ? null : si)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-sm font-black text-slate-900">
                    <span className="text-lg">{emoji}</span>
                    <span>{place}</span>
                  </span>
                  <span
                    className={`flex items-center gap-2 text-xs font-bold ${
                      complete ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {complete && '✅ '} {doneCount}/{tasks.length}
                    <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-[10px]`}></i>
                  </span>
                </button>

                {isOpen && (
                  <div className="px-2 pb-2 space-y-1.5">
                    {tasks.map(([task, pts], ti) => {
                      const on = !!huntState[`${si}-${ti}`];
                      return (
                        <button
                          key={ti}
                          onClick={() => toggleTask(si, ti)}
                          className={`w-full flex items-center gap-3 text-left rounded-xl px-3 py-2.5 border-2 transition cursor-pointer ${
                            on
                              ? 'bg-emerald-100 border-emerald-400'
                              : 'bg-white border-slate-200 hover:border-amber-300'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center text-xs font-black ${
                              on
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-300 text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                          <span
                            className={`flex-1 text-xs font-bold ${
                              on
                                ? 'text-emerald-900 line-through decoration-emerald-400'
                                : 'text-slate-800'
                            }`}
                          >
                            {task}
                          </span>
                          <span
                            className={`text-[10px] font-black whitespace-nowrap ${
                              pts > 10 ? 'text-amber-600' : 'text-slate-400'
                            }`}
                          >
                            {pts > 10 ? '⭐ ' : ''}+{pts}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 text-center">
        <button
          onClick={resetHunt}
          className="text-xs font-bold text-slate-400 hover:text-rose-600 cursor-pointer"
        >
          <i className="fa-solid fa-rotate-left"></i> Start the hunt over
        </button>
      </div>
    </div>
  );
};
