import React, { useEffect, useRef, useState } from 'react';
import { PandaLeaderboard } from './PandaLeaderboard';
import { sounds } from './audioEffects';

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  icon: string;
  type: 'ground' | 'air';
}

interface Collectible {
  x: number;
  y: number;
  icon: string;
  points: number;
  isHeart?: boolean;
}

export const PandaZooDash: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [distance, setDistance] = useState(0);
  const [score, setScore] = useState(0);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [latestScore, setLatestScore] = useState<number | null>(null);

  // Player physics
  const playerRef = useRef({
    x: 50,
    y: 220,
    vy: 0,
    groundY: 220,
    width: 36,
    height: 36,
    isJumping: false,
    canDoubleJump: true,
    isDucking: false,
  });

  const livesRef = useRef(5);
  const scoreRef = useRef(0);
  const distanceRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const snacksRef = useRef<Collectible[]>([]);
  const animIdRef = useRef<number | null>(null);
  const speedRef = useRef(3.5);
  const lastObstacleSpawnRef = useRef(0);
  const lastSnackSpawnRef = useRef(0);
  const sceneryOffsetRef = useRef(0);

  const drawScene = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 420, 300);

    // Sky & Zoo Trees
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 240);
    skyGrad.addColorStop(0, '#e0f2fe');
    skyGrad.addColorStop(1, '#f0fdf4');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 420, 240);

    // Parallax Zoo Trees in background
    ctx.fillStyle = '#bbf7d0';
    for (let i = 0; i < 6; i++) {
      const treeX = ((i * 120 - sceneryOffsetRef.current * 0.4) % 720 + 720) % 720 - 50;
      ctx.beginPath();
      ctx.arc(treeX, 170, 32, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground path (National Zoo brick & grass pathway)
    ctx.fillStyle = '#059669';
    ctx.fillRect(0, 240, 420, 60);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, 240, 420, 4);

    // Pavement dashes
    ctx.fillStyle = '#047857';
    for (let x = 0; x < 450; x += 40) {
      const dashX = (x - (sceneryOffsetRef.current % 40) + 420) % 420;
      ctx.fillRect(dashX, 265, 20, 3);
    }

    // Draw Obstacles
    obstaclesRef.current.forEach(obs => {
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(obs.icon, obs.x + obs.width / 2, obs.y + obs.height);
    });

    // Draw Snacks
    snacksRef.current.forEach(snk => {
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(snk.icon, snk.x, snk.y);
    });

    // Draw Panda Player
    const p = playerRef.current;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (p.isDucking) {
      ctx.font = '28px sans-serif';
      ctx.fillText('🐼', p.x + p.width / 2, p.y + p.height / 2 + 6);
    } else {
      ctx.font = '34px sans-serif';
      ctx.fillText('🐼', p.x + p.width / 2, p.y + p.height / 2);
    }
    ctx.restore();

    // Hearts HUD
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let hearts = '';
    for (let l = 0; l < livesRef.current; l++) hearts += '❤️';
    ctx.fillText(hearts, 12, 12);
  };

  const jump = () => {
    const p = playerRef.current;
    const isEasy = difficulty === 'easy';

    if (!p.isJumping) {
      p.vy = -10.5;
      p.isJumping = true;
      p.canDoubleJump = isEasy;
      sounds.playJump();
    } else if (p.canDoubleJump) {
      p.vy = -9.5;
      p.canDoubleJump = false;
      sounds.playBounce();
    }
  };

  const duck = (ducking: boolean) => {
    const p = playerRef.current;
    p.isDucking = ducking;
    if (ducking && p.isJumping) {
      p.vy += 6; // quick drop
    }
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

    const isEasy = difficulty === 'easy';
    const isHard = difficulty === 'hard';

    // Update Distance & Score
    distanceRef.current += 1;
    if (distanceRef.current % 10 === 0) {
      setDistance(Math.floor(distanceRef.current / 10));
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }

    sceneryOffsetRef.current += speedRef.current;

    // Player Gravity Physics
    const p = playerRef.current;
    p.y += p.vy;
    p.vy += 0.55; // gravity

    if (p.y >= p.groundY) {
      p.y = p.groundY;
      p.vy = 0;
      p.isJumping = false;
      p.canDoubleJump = isEasy;
    }

    // Spawn Obstacles
    const now = Date.now();
    const minObstacleGap = isEasy ? 1800 : isHard ? 1000 : 1350;
    if (now - lastObstacleSpawnRef.current > minObstacleGap && Math.random() < 0.05) {
      lastObstacleSpawnRef.current = now;
      const isAir = !isEasy && Math.random() < 0.35;
      obstaclesRef.current.push({
        x: 430,
        y: isAir ? 180 : 220,
        width: 28,
        height: 28,
        icon: isAir ? '🦅' : Math.random() > 0.5 ? '🐢' : '🪨',
        type: isAir ? 'air' : 'ground',
      });
    }

    // Spawn Snacks
    if (now - lastSnackSpawnRef.current > 750 && Math.random() < 0.07) {
      lastSnackSpawnRef.current = now;
      const snackY = Math.random() > 0.5 ? 210 : 160;
      const isHeart = livesRef.current < (isEasy ? 5 : 3) && Math.random() < 0.15;
      snacksRef.current.push({
        x: 430,
        y: snackY,
        icon: isHeart ? '💖' : Math.random() > 0.4 ? '🎋' : '🍎',
        points: isHeart ? 15 : 20,
        isHeart,
      });
    }

    // Update & check Obstacles
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
      const obs = obstaclesRef.current[i];
      obs.x -= speedRef.current;

      // Collision check with player
      const hitX = p.x + p.width > obs.x + 4 && p.x < obs.x + obs.width - 4;
      const hitY = p.y + p.height > obs.y + 4 && p.y < obs.y + obs.height;

      // If ducking, pass under air obstacles safely!
      const safeDuck = p.isDucking && obs.type === 'air';

      if (hitX && hitY && !safeDuck) {
        sounds.playMiss();
        livesRef.current--;
        obstaclesRef.current.splice(i, 1);
        if (livesRef.current <= 0) {
          stopGame();
          return;
        }
        continue;
      }

      if (obs.x < -40) {
        obstaclesRef.current.splice(i, 1);
      }
    }

    // Update & check Snacks
    for (let i = snacksRef.current.length - 1; i >= 0; i--) {
      const snk = snacksRef.current[i];
      snk.x -= speedRef.current;

      const hitX = p.x + p.width > snk.x - 14 && p.x < snk.x + 14;
      const hitY = p.y + p.height > snk.y - 14 && p.y < snk.y + 14;

      if (hitX && hitY) {
        if (snk.isHeart) {
          sounds.playPowerUp();
          livesRef.current = Math.min(isEasy ? 5 : 3, livesRef.current + 1);
        } else {
          sounds.playPop();
        }
        scoreRef.current += snk.points;
        setScore(scoreRef.current);
        snacksRef.current.splice(i, 1);
        continue;
      }

      if (snk.x < -30) {
        snacksRef.current.splice(i, 1);
      }
    }

    drawScene(ctx);
    animIdRef.current = requestAnimationFrame(gameLoop);
  };

  const startGame = () => {
    const isEasy = difficulty === 'easy';
    const isHard = difficulty === 'hard';
    speedRef.current = isEasy ? 3.0 : isHard ? 5.2 : 4.0;
    livesRef.current = isEasy ? 5 : 3;
    scoreRef.current = 0;
    distanceRef.current = 0;
    obstaclesRef.current = [];
    snacksRef.current = [];
    playerRef.current.y = 220;
    playerRef.current.vy = 0;
    playerRef.current.isJumping = false;
    playerRef.current.isDucking = false;
    lastObstacleSpawnRef.current = Date.now();
    lastSnackSpawnRef.current = Date.now();
    setScore(0);
    setDistance(0);
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
      if (e.code === 'Space' || e.key === 'ArrowUp') {
        e.preventDefault();
        jump();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        duck(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        duck(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-center">
        {/* Top Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              🏃 Panda Zoo Dash
            </span>
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
            <span className="font-bold text-slate-500">
              Dist: <strong className="text-blue-600 text-sm font-mono">{distance}m</strong>
            </span>
            <span className="font-bold text-slate-500">
              Score: <strong className="text-emerald-600 text-sm font-mono">{score}</strong>
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Tap or press Space / Up to jump (Double-tap in Easy mode!). Press Down to duck under birds!
        </p>

        {/* CANVAS WRAPPER */}
        <div className="relative max-w-md mx-auto rounded-2xl border-2 border-emerald-300 overflow-hidden shadow-inner h-[300px] bg-sky-50">
          <canvas
            ref={canvasRef}
            width={420}
            height={300}
            className="w-full h-full block cursor-pointer select-none"
            onClick={jump}
            onTouchStart={jump}
          />

          {(!gameRunning || gameOver) && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
              <span className="text-5xl mb-2">🐼</span>
              <h3 className="text-lg font-black">
                {gameOver ? `Dash Over! Distance: ${distance}m · Score: ${score}` : 'National Zoo Panda Dash'}
              </h3>
              <p className="text-xs text-slate-200 mt-1 mb-4 max-w-xs">
                {gameOver
                  ? distance >= 50
                    ? 'Super speedy! Bao Li dashed through the whole park!'
                    : 'Great run! Enter your name below to claim your spot!'
                  : 'Bao Li is on the run! Jump over tortoises and benches, collect bamboo treats!'}
              </p>
              <button
                onClick={startGame}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-6 py-2.5 rounded-2xl text-xs shadow-md active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-play"></i> {gameOver ? 'Dash Again' : 'Start Running'}
              </button>
            </div>
          )}
        </div>

        {/* LARGE TOUCH ACTION BUTTONS */}
        <div className="mt-4 flex items-center justify-center gap-3 max-w-md mx-auto">
          <button
            onClick={jump}
            className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-xs active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>⬆️ JUMP</span>
            {difficulty === 'easy' && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-normal">x2 Double</span>}
          </button>
          <button
            onMouseDown={() => duck(true)}
            onMouseUp={() => duck(false)}
            onTouchStart={() => duck(true)}
            onTouchEnd={() => duck(false)}
            className="w-28 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-2xl shadow-xs active:scale-95 transition cursor-pointer"
          >
            <span>⬇️ DUCK</span>
          </button>
        </div>
      </div>

      {/* FAMILY LEADERBOARD */}
      <PandaLeaderboard
        gameKey="zoo-dash"
        gameTitle="National Zoo Panda Dash"
        currentDifficulty={difficulty}
        latestScore={latestScore}
        onClearScore={() => setLatestScore(null)}
      />
    </div>
  );
};
