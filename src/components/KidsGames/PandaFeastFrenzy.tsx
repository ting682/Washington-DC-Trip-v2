import React, { useEffect, useRef, useState } from 'react';
import { PandaLeaderboard } from './PandaLeaderboard';
import { sounds } from './audioEffects';

interface FallingItem {
  id: number;
  lane: 0 | 1 | 2;
  y: number;
  speed: number;
  icon: string;
  type: 'snack' | 'star' | 'heart' | 'ice' | 'magnet' | 'rock';
  points: number;
}

export const PandaFeastFrenzy: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [activePowerUp, setActivePowerUp] = useState<'ice' | 'magnet' | null>(null);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [latestScore, setLatestScore] = useState<number | null>(null);

  // Lanes X coordinates on 400px wide canvas:
  // Lane 0: 67px, Lane 1: 200px, Lane 2: 333px
  const LANE_X = [67, 200, 333];

  const pandaLaneRef = useRef<0 | 1 | 2>(1);
  const targetXRef = useRef(200);
  const currentXRef = useRef(200);
  const livesRef = useRef(5);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const itemsRef = useRef<FallingItem[]>([]);
  const animIdRef = useRef<number | null>(null);
  const lastSpawnRef = useRef(0);
  const powerUpTimerRef = useRef<{ type: 'ice' | 'magnet'; end: number } | null>(null);
  const munchTimerRef = useRef(0);

  const drawScene = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 400, 340);

    // Background gradient / tree canopy
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 340);
    bgGrad.addColorStop(0, '#ecfdf5');
    bgGrad.addColorStop(1, '#d1fae5');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 400, 340);

    // Draw 3 Lane Guides
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(133, 0);
    ctx.lineTo(133, 340);
    ctx.moveTo(267, 0);
    ctx.lineTo(267, 340);
    ctx.stroke();
    ctx.setLineDash([]);

    // Lane highlight
    const currentLane = pandaLaneRef.current;
    const laneLeft = currentLane * 133.3;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.fillRect(laneLeft, 0, 133.3, 340);

    // Ground platform
    ctx.fillStyle = '#047857';
    ctx.fillRect(0, 310, 400, 30);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, 306, 400, 4);

    // Smooth panda movement towards targetX
    currentXRef.current += (targetXRef.current - currentXRef.current) * 0.25;
    const px = currentXRef.current;
    const py = 265;

    // Panda Body & Bowl
    ctx.save();
    // Bowl
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(px - 36, py + 12, 72, 22, 8) : ctx.rect(px - 36, py + 12, 72, 22);
    ctx.fill();

    ctx.fillStyle = '#10b981';
    ctx.fillRect(px - 36, py + 10, 72, 3);

    // Panda character
    ctx.font = munchTimerRef.current > Date.now() ? '38px sans-serif' : '34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐼', px, py - 4);

    // Cheerful munch hearts when eating
    if (munchTimerRef.current > Date.now()) {
      ctx.font = '16px sans-serif';
      ctx.fillText('💖', px + 22, py - 24);
    }

    // Active power-up aura
    if (powerUpTimerRef.current && powerUpTimerRef.current.end > Date.now()) {
      ctx.strokeStyle = powerUpTimerRef.current.type === 'ice' ? '#38bdf8' : '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, 42, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  const stopGame = () => {
    setGameRunning(false);
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    sounds.playGameOver();
    const final = scoreRef.current;
    setLatestScore(final);
    setGameOver(true);
  };

  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawScene(ctx);

    const now = Date.now();
    const isEasy = difficulty === 'easy';
    const isHard = difficulty === 'hard';

    // Handle Power-up timers
    if (powerUpTimerRef.current && powerUpTimerRef.current.end < now) {
      powerUpTimerRef.current = null;
      setActivePowerUp(null);
    }

    const isFrozen = powerUpTimerRef.current?.type === 'ice';
    const isMagnet = powerUpTimerRef.current?.type === 'magnet';

    // Item Spawning
    const baseInterval = isEasy ? 1100 : isHard ? 650 : 850;
    if (now - lastSpawnRef.current > baseInterval) {
      lastSpawnRef.current = now;
      const lane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
      const rand = Math.random();

      let type: FallingItem['type'] = 'snack';
      let icon = '🎋';
      let points = 10;

      if (!isEasy && rand < (isHard ? 0.22 : 0.12)) {
        type = 'rock';
        icon = '🪨';
        points = -20;
      } else if (rand > 0.92) {
        type = 'star';
        icon = '⭐';
        points = 50;
      } else if (livesRef.current < (isEasy ? 5 : 3) && rand > 0.82) {
        type = 'heart';
        icon = '💖';
        points = 15;
      } else if (rand > 0.74) {
        type = 'ice';
        icon = '🧊';
        points = 25;
      } else if (rand > 0.66) {
        type = 'magnet';
        icon = '🧲';
        points = 25;
      } else if (rand > 0.45) {
        icon = '🍎';
        points = 15;
      } else if (rand > 0.28) {
        icon = '🍉';
        points = 20;
      }

      const speedBase = isEasy ? 1.5 : isHard ? 2.8 : 2.1;
      const speedRamp = isEasy ? Math.min(scoreRef.current * 0.005, 0.8) : Math.min(scoreRef.current * 0.015, 2.0);

      itemsRef.current.push({
        id: Math.random(),
        lane,
        y: -20,
        speed: speedBase + speedRamp,
        icon,
        type,
        points,
      });
    }

    // Process Falling Items
    const px = currentXRef.current;
    const py = 265;

    for (let i = itemsRef.current.length - 1; i >= 0; i--) {
      const item = itemsRef.current[i];
      let effectiveSpeed = isFrozen ? item.speed * 0.45 : item.speed;

      // Magnet pulls items towards panda lane if within vertical range
      if (isMagnet && item.type !== 'rock') {
        const targetX = px;
        const currentItemX = LANE_X[item.lane];
        if (currentItemX < targetX) item.lane = Math.min(2, item.lane + 1) as 0 | 1 | 2;
        else if (currentItemX > targetX) item.lane = Math.max(0, item.lane - 1) as 0 | 1 | 2;
      }

      item.y += effectiveSpeed;
      const ix = LANE_X[item.lane];

      // Draw item
      ctx.save();
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.icon, ix, item.y);
      ctx.restore();

      // Catch detection
      const inCatchZone = item.y >= py - 18 && item.y <= py + 24;
      const inLaneCatch = Math.abs(ix - px) < 46;

      if (inCatchZone && inLaneCatch) {
        // CAUGHT!
        if (item.type === 'rock') {
          sounds.playMiss();
          livesRef.current--;
          comboRef.current = 0;
          setCombo(0);
          if (livesRef.current <= 0) {
            itemsRef.current.splice(i, 1);
            stopGame();
            return;
          }
        } else {
          munchTimerRef.current = now + 400;
          if (item.type === 'heart') {
            sounds.playPowerUp();
            livesRef.current = Math.min(isEasy ? 5 : 3, livesRef.current + 1);
          } else if (item.type === 'ice') {
            sounds.playPowerUp();
            powerUpTimerRef.current = { type: 'ice', end: now + 4500 };
            setActivePowerUp('ice');
          } else if (item.type === 'magnet') {
            sounds.playPowerUp();
            powerUpTimerRef.current = { type: 'magnet', end: now + 5000 };
            setActivePowerUp('magnet');
          } else if (item.type === 'star') {
            sounds.playPowerUp();
          } else {
            sounds.playPop();
          }

          comboRef.current++;
          setCombo(comboRef.current);
          const frenzyMultiplier = comboRef.current >= 5 ? 2 : 1;
          scoreRef.current += item.points * frenzyMultiplier;
          setScore(scoreRef.current);
        }

        itemsRef.current.splice(i, 1);
        continue;
      }

      // Missed at bottom
      if (item.y > 330) {
        itemsRef.current.splice(i, 1);
        if (item.type !== 'rock' && item.type !== 'heart') {
          sounds.playMiss();
          comboRef.current = 0;
          setCombo(0);
          livesRef.current--;
          if (livesRef.current <= 0) {
            stopGame();
            return;
          }
        }
      }
    }

    // Draw UI HUD (Hearts & Combo)
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let hearts = '';
    for (let l = 0; l < livesRef.current; l++) hearts += '❤️';
    ctx.fillText(hearts, 12, 12);

    if (comboRef.current >= 3) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`🔥 ${comboRef.current}x Combo!${comboRef.current >= 5 ? ' (2X PTS)' : ''}`, 12, 34);
    }

    animIdRef.current = requestAnimationFrame(gameLoop);
  };

  const setPandaLane = (lane: 0 | 1 | 2) => {
    pandaLaneRef.current = lane;
    targetXRef.current = LANE_X[lane];
    sounds.playBounce();
    const canvas = canvasRef.current;
    if (canvas && !gameRunning) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawScene(ctx);
    }
  };

  const startGame = () => {
    const isEasy = difficulty === 'easy';
    pandaLaneRef.current = 1;
    targetXRef.current = 200;
    currentXRef.current = 200;
    livesRef.current = isEasy ? 5 : 3;
    scoreRef.current = 0;
    comboRef.current = 0;
    itemsRef.current = [];
    powerUpTimerRef.current = null;
    setActivePowerUp(null);
    lastSpawnRef.current = Date.now();
    setScore(0);
    setCombo(0);
    setGameOver(false);
    setGameRunning(true);
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    animIdRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawScene(ctx);
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setPandaLane(Math.max(0, pandaLaneRef.current - 1) as 0 | 1 | 2);
      } else if (e.key === 'ArrowRight') {
        setPandaLane(Math.min(2, pandaLaneRef.current + 1) as 0 | 1 | 2);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, []);

  const handleCanvasClick = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const third = rect.width / 3;
    if (clickX < third) setPandaLane(0);
    else if (clickX < third * 2) setPandaLane(1);
    else setPandaLane(2);
  };

  return (
    <div className="space-y-6">
      {/* GAME CARD */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-center">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              🍱 Feast Frenzy 2.0
            </span>
            {/* Difficulty Toggle */}
            <div className="flex items-center bg-slate-100 rounded-full p-0.5 border border-slate-200 text-[11px] font-bold">
              {(['easy', 'medium', 'hard'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => {
                    if (!gameRunning) setDifficulty(d);
                  }}
                  disabled={gameRunning}
                  className={`px-2.5 py-0.5 rounded-full capitalize transition cursor-pointer ${
                    difficulty === d
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activePowerUp && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-300 px-2 py-0.5 rounded-full animate-pulse">
                {activePowerUp === 'ice' ? '🧊 Ice Slow-Mo' : '🧲 Snack Magnet'}
              </span>
            )}
            <span className="font-bold text-slate-500">
              Score: <strong className="text-emerald-600 text-sm font-mono">{score}</strong>
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Tap lanes or use Left/Right to catch bamboo, fruit, and stars! Catch 🧊 for slow-motion and 🧲 to pull snacks!
        </p>

        {/* CANVAS WRAPPER */}
        <div className="relative max-w-md mx-auto rounded-2xl border-2 border-emerald-300 overflow-hidden shadow-inner h-[340px] bg-emerald-50">
          <canvas
            ref={canvasRef}
            width={400}
            height={340}
            className="w-full h-full block cursor-pointer select-none"
            onClick={e => handleCanvasClick(e.clientX)}
            onTouchStart={e => handleCanvasClick(e.touches[0].clientX)}
          />

          {(!gameRunning || gameOver) && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
              <span className="text-5xl mb-2">🐼</span>
              <h3 className="text-lg font-black">
                {gameOver ? `Game Over! Score: ${score}` : 'Panda Feast Frenzy 2.0'}
              </h3>
              <p className="text-xs text-slate-200 mt-1 mb-4 max-w-xs">
                {gameOver
                  ? score >= 150
                    ? 'Incredible! Bao Li & Qing Bao are feast champions!'
                    : 'Great effort! Enter your name below to claim your spot!'
                  : 'Tap Left, Center, or Right to feed the pandas. Catch power-ups for high score combos!'}
              </p>
              <button
                onClick={startGame}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-6 py-2.5 rounded-2xl text-xs shadow-md active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-play"></i> {gameOver ? 'Play Again' : 'Start Feasting'}
              </button>
            </div>
          )}
        </div>

        {/* 3-LANE TAP CONTROLS */}
        <div className="mt-4 grid grid-cols-3 gap-2 max-w-md mx-auto">
          <button
            onClick={() => setPandaLane(0)}
            className={`py-3 rounded-2xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-95 ${
              pandaLaneRef.current === 0 ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>⬅️ Left</span>
          </button>
          <button
            onClick={() => setPandaLane(1)}
            className={`py-3 rounded-2xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-95 ${
              pandaLaneRef.current === 1 ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>⬇️ Center</span>
          </button>
          <button
            onClick={() => setPandaLane(2)}
            className={`py-3 rounded-2xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-95 ${
              pandaLaneRef.current === 2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>Right ➡️</span>
          </button>
        </div>
      </div>

      {/* FAMILY LEADERBOARD */}
      <PandaLeaderboard
        gameKey="feast-frenzy"
        gameTitle="Panda Feast Frenzy 2.0"
        currentDifficulty={difficulty}
        latestScore={latestScore}
        onClearScore={() => setLatestScore(null)}
      />
    </div>
  );
};
