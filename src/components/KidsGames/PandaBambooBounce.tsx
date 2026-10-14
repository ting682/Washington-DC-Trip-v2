import React, { useEffect, useRef, useState } from 'react';
import { PandaLeaderboard } from './PandaLeaderboard';
import { sounds } from './audioEffects';

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'standard' | 'cloud' | 'spring' | 'broken';
  hasStar?: boolean;
  vx?: number;
}

export const PandaBambooBounce: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [altitude, setAltitude] = useState(0);
  const [score, setScore] = useState(0);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [latestScore, setLatestScore] = useState<number | null>(null);

  // Player state
  const pandaRef = useRef({
    x: 180,
    y: 280,
    vx: 0,
    vy: -10,
    width: 34,
    height: 34,
  });

  const platformsRef = useRef<Platform[]>([]);
  const cameraYRef = useRef(0);
  const maxAltitudeRef = useRef(0);
  const scoreRef = useRef(0);
  const animIdRef = useRef<number | null>(null);

  const initPlatforms = (isEasy: boolean, isHard: boolean) => {
    const list: Platform[] = [
      { x: 150, y: 350, width: 100, height: 14, type: 'standard' },
    ];
    let y = 300;
    while (y > -2000) {
      y -= isEasy ? 50 + Math.random() * 20 : isHard ? 70 + Math.random() * 35 : 60 + Math.random() * 25;
      const width = isEasy ? 85 : isHard ? 60 : 72;
      const x = Math.random() * (380 - width) + 10;
      const rand = Math.random();

      let type: Platform['type'] = 'standard';
      let vx = 0;
      if (!isEasy && rand < 0.25) {
        type = 'cloud';
        vx = (Math.random() - 0.5) * (isHard ? 2.5 : 1.5);
      } else if (rand > 0.85) {
        type = 'spring';
      } else if (isHard && rand > 0.65) {
        type = 'broken';
      }

      list.push({
        x,
        y,
        width,
        height: 14,
        type,
        vx,
        hasStar: Math.random() < 0.25,
      });
    }
    return list;
  };

  const drawScene = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 400, 380);

    // Sky gradient that gets deeper blue as you go higher
    const progress = Math.min(maxAltitudeRef.current / 3000, 1);
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 380);
    skyGrad.addColorStop(0, progress > 0.5 ? '#1e1b4b' : '#38bdf8');
    skyGrad.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 400, 380);

    ctx.save();
    ctx.translate(0, -cameraYRef.current);

    // Draw Platforms
    platformsRef.current.forEach(p => {
      if (p.type === 'spring') {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(p.x, p.y, p.width, p.height, 6) : ctx.rect(p.x, p.y, p.width, p.height);
        ctx.fill();
        ctx.font = '16px sans-serif';
        ctx.fillText('🍄', p.x + p.width / 2 - 8, p.y + 4);
      } else if (p.type === 'cloud') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(p.x, p.y, p.width, p.height, 7) : ctx.rect(p.x, p.y, p.width, p.height);
        ctx.fill();
      } else if (p.type === 'broken') {
        ctx.fillStyle = '#b45309';
        ctx.fillRect(p.x, p.y, p.width, p.height);
      } else {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(p.x, p.y, p.width, p.height, 6) : ctx.rect(p.x, p.y, p.width, p.height);
        ctx.fill();
        ctx.fillStyle = '#059669';
        ctx.fillRect(p.x, p.y + 3, p.width, 3);
      }

      if (p.hasStar) {
        ctx.font = '18px sans-serif';
        ctx.fillText('⭐', p.x + p.width / 2 - 9, p.y - 6);
      }
    });

    // Draw Panda
    const pd = pandaRef.current;
    ctx.font = '34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐼', pd.x + pd.width / 2, pd.y + pd.height / 2);

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

    const pd = pandaRef.current;
    const isEasy = difficulty === 'easy';
    const isHard = difficulty === 'hard';

    // Move panda X and wrap screen
    pd.x += pd.vx;
    if (pd.x < -20) pd.x = 380;
    else if (pd.x > 380) pd.x = -20;

    // Apply gravity
    pd.y += pd.vy;
    pd.vy += 0.38;

    // Only bounce when falling DOWN
    if (pd.vy > 0) {
      platformsRef.current.forEach(p => {
        const hitX = pd.x + pd.width > p.x && pd.x < p.x + p.width;
        const hitY = pd.y + pd.height >= p.y && pd.y + pd.height <= p.y + p.height + 12;

        if (hitX && hitY) {
          if (p.type === 'broken') {
            sounds.playMiss();
            p.y += 1000; // breaks away!
          } else if (p.type === 'spring') {
            sounds.playPowerUp();
            pd.vy = -16.5; // giant bounce!
          } else {
            sounds.playBounce();
            pd.vy = isEasy ? -11.5 : -10.5;
          }

          if (p.hasStar) {
            sounds.playPop();
            p.hasStar = false;
            scoreRef.current += 50;
            setScore(scoreRef.current);
          }
        }
      });
    }

    // Moving cloud platforms
    platformsRef.current.forEach(p => {
      if (p.vx) {
        p.x += p.vx;
        if (p.x < 10 || p.x > 390 - p.width) p.vx *= -1;
      }
    });

    // Camera follow upwards
    if (pd.y < cameraYRef.current + 180) {
      cameraYRef.current = pd.y - 180;
    }

    // Calculate altitude
    const currentAlt = Math.max(0, Math.floor((300 - pd.y) / 5));
    if (currentAlt > maxAltitudeRef.current) {
      maxAltitudeRef.current = currentAlt;
      setAltitude(currentAlt);
      scoreRef.current = Math.max(scoreRef.current, currentAlt * 2);
      setScore(scoreRef.current);
    }

    // Generate higher platforms infinitely
    const highestPlatform = platformsRef.current[platformsRef.current.length - 1];
    if (highestPlatform && highestPlatform.y > cameraYRef.current - 600) {
      let y = highestPlatform.y;
      for (let i = 0; i < 15; i++) {
        y -= isEasy ? 50 + Math.random() * 20 : isHard ? 70 + Math.random() * 35 : 60 + Math.random() * 25;
        const width = isEasy ? 85 : isHard ? 60 : 72;
        const x = Math.random() * (380 - width) + 10;
        platformsRef.current.push({
          x,
          y,
          width,
          height: 14,
          type: Math.random() > 0.85 ? 'spring' : Math.random() < 0.25 && !isEasy ? 'cloud' : 'standard',
          vx: Math.random() < 0.25 && !isEasy ? (Math.random() - 0.5) * 2 : 0,
          hasStar: Math.random() < 0.3,
        });
      }
    }

    // Fall below bottom of screen = Game Over
    if (pd.y > cameraYRef.current + 420) {
      stopGame();
      return;
    }

    drawScene(ctx);
    animIdRef.current = requestAnimationFrame(gameLoop);
  };

  const moveX = (dir: number) => {
    pandaRef.current.vx = dir * 6;
  };

  const stopX = () => {
    pandaRef.current.vx = 0;
  };

  const startGame = () => {
    const isEasy = difficulty === 'easy';
    const isHard = difficulty === 'hard';
    pandaRef.current = {
      x: 180,
      y: 280,
      vx: 0,
      vy: -11,
      width: 34,
      height: 34,
    };
    platformsRef.current = initPlatforms(isEasy, isHard);
    cameraYRef.current = 100;
    maxAltitudeRef.current = 0;
    scoreRef.current = 0;
    setAltitude(0);
    setScore(0);
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
      if (e.key === 'ArrowLeft') moveX(-1);
      else if (e.key === 'ArrowRight') moveX(1);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') stopX();
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
              🎋 Bamboo Bounce
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
              Height: <strong className="text-blue-600 text-sm font-mono">{altitude}ft</strong>
            </span>
            <span className="font-bold text-slate-500">
              Score: <strong className="text-emerald-600 text-sm font-mono">{score}</strong>
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Bounce Bao Li up through the clouds! Steer with Left/Right arrows or on-screen buttons. Bounce on 🍄 for mega jumps!
        </p>

        {/* CANVAS WRAPPER */}
        <div className="relative max-w-md mx-auto rounded-2xl border-2 border-emerald-300 overflow-hidden shadow-inner h-[380px] bg-sky-100">
          <canvas
            ref={canvasRef}
            width={400}
            height={380}
            className="w-full h-full block cursor-pointer select-none"
          />

          {(!gameRunning || gameOver) && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
              <span className="text-5xl mb-2">🐼</span>
              <h3 className="text-lg font-black">
                {gameOver ? `Sky Fall! Altitude: ${altitude}ft · Score: ${score}` : "Bao Li's Bamboo Bounce"}
              </h3>
              <p className="text-xs text-slate-200 mt-1 mb-4 max-w-xs">
                {gameOver
                  ? altitude >= 300
                    ? 'Sky high! Bao Li bounced all the way above the clouds!'
                    : 'Great bounces! Enter your name below to claim your spot!'
                  : 'Bounce on bamboo stalks and fluffy clouds to climb higher into the sky!'}
              </p>
              <button
                onClick={startGame}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-6 py-2.5 rounded-2xl text-xs shadow-md active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-play"></i> {gameOver ? 'Bounce Again' : 'Start Bouncing'}
              </button>
            </div>
          )}
        </div>

        {/* ON-SCREEN STEER BUTTONS */}
        <div className="mt-4 flex items-center justify-center gap-4 max-w-md mx-auto">
          <button
            onMouseDown={() => moveX(-1)}
            onMouseUp={stopX}
            onTouchStart={() => moveX(-1)}
            onTouchEnd={stopX}
            className="flex-1 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black rounded-2xl shadow-xs active:scale-95 transition text-base cursor-pointer"
            aria-label="Steer Left"
          >
            <span>⬅️ Left</span>
          </button>
          <span className="text-xs text-slate-400 font-semibold shrink-0">Hold to steer</span>
          <button
            onMouseDown={() => moveX(1)}
            onMouseUp={stopX}
            onTouchStart={() => moveX(1)}
            onTouchEnd={stopX}
            className="flex-1 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black rounded-2xl shadow-xs active:scale-95 transition text-base cursor-pointer"
            aria-label="Steer Right"
          >
            <span>Right ➡️</span>
          </button>
        </div>
      </div>

      {/* FAMILY LEADERBOARD */}
      <PandaLeaderboard
        gameKey="bamboo-bounce"
        gameTitle="Bao Li's Bamboo Bounce"
        currentDifficulty={difficulty}
        latestScore={latestScore}
        onClearScore={() => setLatestScore(null)}
      />
    </div>
  );
};
