import React, { useEffect, useRef, useState } from 'react';
import { PandaLeaderboard } from './PandaLeaderboard';
import { sounds } from './audioEffects';

type SnackType = 'bamboo' | 'apple' | 'carrot' | 'grape' | 'bomb' | 'rainbow';

interface Bubble {
  r: number;
  c: number;
  x: number;
  y: number;
  type: SnackType;
}

const SNACK_ICONS: Record<SnackType, string> = {
  bamboo: '🎋',
  apple: '🍎',
  carrot: '🥕',
  grape: '🍇',
  bomb: '💣',
  rainbow: '🌈',
};

const SNACK_COLORS: Record<SnackType, string> = {
  bamboo: '#10b981',
  apple: '#ef4444',
  carrot: '#f97316',
  grape: '#8b5cf6',
  bomb: '#1f2937',
  rainbow: '#ec4899',
};

const REGULAR_TYPES: SnackType[] = ['bamboo', 'apple', 'carrot', 'grape'];

export const PandaBubbleSlinger: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [score, setScore] = useState(0);
  const [shotsLeft, setShotsLeft] = useState(30);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [latestScore, setLatestScore] = useState<number | null>(null);

  // Bubble grid configuration: 8 columns, up to 10 rows
  const COLS = 8;
  const BUBBLE_RADIUS = 20;
  const BUBBLE_DIAMETER = BUBBLE_RADIUS * 2;
  const START_Y = 25;

  const gridRef = useRef<(Bubble | null)[][]>([]);
  const currentBulletRef = useRef<{ x: number; y: number; vx: number; vy: number; type: SnackType; active: boolean }>({
    x: 200,
    y: 350,
    vx: 0,
    vy: 0,
    type: 'bamboo',
    active: false,
  });
  const nextBulletTypeRef = useRef<SnackType>('apple');
  const aimAngleRef = useRef(-Math.PI / 2);
  const isAimingRef = useRef(false);
  const animIdRef = useRef<number | null>(null);
  const shotsFiredRef = useRef(0);
  const scoreRef = useRef(0);

  const initGrid = (isEasy: boolean, isHard: boolean) => {
    const grid: (Bubble | null)[][] = [];
    const initialRows = isEasy ? 4 : isHard ? 6 : 5;

    for (let r = 0; r < 12; r++) {
      grid[r] = [];
      const colsInRow = r % 2 === 0 ? COLS : COLS - 1;
      const offsetX = r % 2 === 0 ? BUBBLE_RADIUS + 40 : BUBBLE_RADIUS + 40 + BUBBLE_RADIUS;

      for (let c = 0; c < colsInRow; c++) {
        if (r < initialRows) {
          const rand = Math.random();
          let type: SnackType;
          if (rand > 0.96) type = 'rainbow';
          else if (rand > 0.92) type = 'bomb';
          else type = REGULAR_TYPES[Math.floor(Math.random() * REGULAR_TYPES.length)];

          grid[r][c] = {
            r,
            c,
            x: offsetX + c * BUBBLE_DIAMETER,
            y: START_Y + r * (BUBBLE_DIAMETER * 0.86),
            type,
          };
        } else {
          grid[r][c] = null;
        }
      }
    }
    return grid;
  };

  const drawScene = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 400, 400);

    // Bamboo Grove Background
    ctx.fillStyle = '#ecfdf5';
    ctx.fillRect(0, 0, 400, 400);

    // Ceiling bar
    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, 400, 8);

    // Draw Grid Bubbles
    for (let r = 0; r < gridRef.current.length; r++) {
      for (let c = 0; c < gridRef.current[r].length; c++) {
        const b = gridRef.current[r][c];
        if (b) {
          // Bubble background circle
          ctx.fillStyle = SNACK_COLORS[b.type];
          ctx.beginPath();
          ctx.arc(b.x, b.y, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(b.x - 5, b.y - 5, 5, 0, Math.PI * 2);
          ctx.fill();

          // Icon
          ctx.font = '18px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(SNACK_ICONS[b.type], b.x, b.y + 1);
        }
      }
    }

    // Aiming Laser Guide
    const isEasy = difficulty === 'easy';
    if (isAimingRef.current && !currentBulletRef.current.active) {
      ctx.save();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(200, 350);
      const guideLen = isEasy ? 250 : 120;
      const targetGX = 200 + Math.cos(aimAngleRef.current) * guideLen;
      const targetGY = 350 + Math.sin(aimAngleRef.current) * guideLen;
      ctx.lineTo(targetGX, targetGY);
      ctx.stroke();
      ctx.restore();
    }

    // Slingshot Base & Panda at bottom
    ctx.fillStyle = '#047857';
    ctx.fillRect(0, 380, 400, 20);

    // Panda Slingshot Shooter
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐼', 200, 365);

    // Next snack preview circle
    ctx.font = '18px sans-serif';
    ctx.fillText(SNACK_ICONS[nextBulletTypeRef.current], 140, 365);

    // Flying Bullet if active
    const bullet = currentBulletRef.current;
    if (bullet.active) {
      ctx.fillStyle = SNACK_COLORS[bullet.type];
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, BUBBLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SNACK_ICONS[bullet.type], bullet.x, bullet.y + 1);
    }
  };

  const fireBullet = () => {
    if (currentBulletRef.current.active || !gameRunning || shotsLeft <= 0) return;

    sounds.playBounce();
    const speed = 12;
    currentBulletRef.current = {
      x: 200,
      y: 345,
      vx: Math.cos(aimAngleRef.current) * speed,
      vy: Math.sin(aimAngleRef.current) * speed,
      type: nextBulletTypeRef.current,
      active: true,
    };

    nextBulletTypeRef.current = REGULAR_TYPES[Math.floor(Math.random() * REGULAR_TYPES.length)];
    shotsFiredRef.current++;
    setShotsLeft(prev => prev - 1);
  };

  const findMatches = (startR: number, startC: number, matchType: SnackType) => {
    const visited = new Set<string>();
    const matches: { r: number; c: number }[] = [];
    const queue: { r: number; c: number }[] = [{ r: startR, c: startC }];

    while (queue.length > 0) {
      const { r, c } = queue.pop()!;
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const b = gridRef.current[r]?.[c];
      if (!b) continue;

      if (b.type === matchType || b.type === 'rainbow' || matchType === 'rainbow') {
        matches.push({ r, c });

        // Check 6 hexagonal neighbors
        const isOddRow = r % 2 !== 0;
        const neighbors = [
          { r, c: c - 1 },
          { r, c: c + 1 },
          { r: r - 1, c: isOddRow ? c : c - 1 },
          { r: r - 1, c: isOddRow ? c + 1 : c },
          { r: r + 1, c: isOddRow ? c : c - 1 },
          { r: r + 1, c: isOddRow ? c + 1 : c },
        ];

        neighbors.forEach(n => {
          if (n.r >= 0 && n.r < 12 && n.c >= 0 && gridRef.current[n.r]?.[n.c]) {
            queue.push(n);
          }
        });
      }
    }
    return matches;
  };

  const snapBulletToGrid = () => {
    const bullet = currentBulletRef.current;
    let closestDist = Infinity;
    let targetR = 0;
    let targetC = 0;
    let targetX = bullet.x;
    let targetY = bullet.y;

    // Find closest open cell
    for (let r = 0; r < 12; r++) {
      const colsInRow = r % 2 === 0 ? COLS : COLS - 1;
      const offsetX = r % 2 === 0 ? BUBBLE_RADIUS + 40 : BUBBLE_RADIUS + 40 + BUBBLE_RADIUS;
      const y = START_Y + r * (BUBBLE_DIAMETER * 0.86);

      for (let c = 0; c < colsInRow; c++) {
        if (!gridRef.current[r][c]) {
          const x = offsetX + c * BUBBLE_DIAMETER;
          const dist = Math.hypot(x - bullet.x, y - bullet.y);
          if (dist < closestDist) {
            closestDist = dist;
            targetR = r;
            targetC = c;
            targetX = x;
            targetY = y;
          }
        }
      }
    }

    // Place in grid
    const placedBubble: Bubble = {
      r: targetR,
      c: targetC,
      x: targetX,
      y: targetY,
      type: bullet.type,
    };
    gridRef.current[targetR][targetC] = placedBubble;
    bullet.active = false;

    // Check Bomb
    if (bullet.type === 'bomb') {
      sounds.playPowerUp();
      let popped = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = targetR + dr;
          const nc = targetC + dc;
          if (gridRef.current[nr]?.[nc]) {
            gridRef.current[nr][nc] = null;
            popped++;
          }
        }
      }
      scoreRef.current += popped * 20;
      setScore(scoreRef.current);
      return;
    }

    // Find matches
    const matches = findMatches(targetR, targetC, bullet.type);
    if (matches.length >= 3 || bullet.type === 'rainbow') {
      sounds.playPowerUp();
      matches.forEach(m => {
        gridRef.current[m.r][m.c] = null;
      });
      scoreRef.current += matches.length * 30;
      setScore(scoreRef.current);
    } else {
      sounds.playMiss();
    }

    // Check if ceiling reached bottom or all bubbles cleared
    let remaining = 0;
    let lowestR = 0;
    gridRef.current.forEach(row => {
      row.forEach(b => {
        if (b) {
          remaining++;
          if (b.r > lowestR) lowestR = b.r;
        }
      });
    });

    if (remaining === 0 || lowestR >= 9 || shotsLeft <= 1) {
      stopGame();
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

    // Bullet physics
    const bullet = currentBulletRef.current;
    if (bullet.active) {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      // Bounce off side walls
      if (bullet.x <= BUBBLE_RADIUS || bullet.x >= 400 - BUBBLE_RADIUS) {
        bullet.vx *= -1;
        sounds.playBounce();
      }

      // Hit ceiling
      if (bullet.y <= BUBBLE_RADIUS + 8) {
        snapBulletToGrid();
      }

      // Hit another bubble
      for (let r = 0; r < gridRef.current.length; r++) {
        for (let c = 0; c < gridRef.current[r].length; c++) {
          const b = gridRef.current[r][c];
          if (b) {
            const dist = Math.hypot(b.x - bullet.x, b.y - bullet.y);
            if (dist < BUBBLE_DIAMETER * 0.85) {
              snapBulletToGrid();
              break;
            }
          }
        }
        if (!bullet.active) break;
      }
    }

    drawScene(ctx);
    animIdRef.current = requestAnimationFrame(gameLoop);
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const angle = Math.atan2(y - 350, x - 200);

    // Limit angle to upward directions (-170 deg to -10 deg)
    if (angle < -0.15 && angle > -Math.PI + 0.15) {
      aimAngleRef.current = angle;
    }
  };

  const startGame = () => {
    const isEasy = difficulty === 'easy';
    const isHard = difficulty === 'hard';
    gridRef.current = initGrid(isEasy, isHard);
    currentBulletRef.current.active = false;
    nextBulletTypeRef.current = 'bamboo';
    aimAngleRef.current = -Math.PI / 2;
    shotsFiredRef.current = 0;
    scoreRef.current = 0;
    setScore(0);
    setShotsLeft(isEasy ? 35 : isHard ? 20 : 25);
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
    return () => {
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
              🧩 Bubble Bamboo Slinger
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
              Shots: <strong className="text-amber-600 text-sm font-mono">{shotsLeft}</strong>
            </span>
            <span className="font-bold text-slate-500">
              Score: <strong className="text-emerald-600 text-sm font-mono">{score}</strong>
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Aim with your finger or mouse, then tap Launch to shoot! Match 3 snacks to pop clusters into Bao Li&apos;s tummy!
        </p>

        {/* CANVAS WRAPPER */}
        <div className="relative max-w-md mx-auto rounded-2xl border-2 border-emerald-300 overflow-hidden shadow-inner h-[400px] bg-emerald-50">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="w-full h-full block cursor-crosshair select-none"
            onMouseMove={e => {
              isAimingRef.current = true;
              handlePointerMove(e.clientX, e.clientY);
            }}
            onMouseLeave={() => {
              isAimingRef.current = false;
            }}
            onClick={fireBullet}
            onTouchMove={e => {
              isAimingRef.current = true;
              handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchEnd={() => {
              isAimingRef.current = false;
              fireBullet();
            }}
          />

          {(!gameRunning || gameOver) && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
              <span className="text-5xl mb-2">🐼</span>
              <h3 className="text-lg font-black">
                {gameOver ? `Puzzle Complete! Score: ${score}` : 'Panda Bubble Bamboo Slinger'}
              </h3>
              <p className="text-xs text-slate-200 mt-1 mb-4 max-w-xs">
                {gameOver
                  ? score >= 200
                    ? 'Pop master! Bao Li feasted on all the matching snacks!'
                    : 'Great aiming! Enter your name below to claim your spot!'
                  : 'Aim the slingshot to match 3 colors of fruit and bamboo! Pop big clusters for huge combos!'}
              </p>
              <button
                onClick={startGame}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-6 py-2.5 rounded-2xl text-xs shadow-md active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-play"></i> {gameOver ? 'Play Again' : 'Start Slinging'}
              </button>
            </div>
          )}
        </div>

        {/* ON-SCREEN LAUNCH BUTTON */}
        <div className="mt-4 flex items-center justify-center gap-4 max-w-md mx-auto">
          <button
            onClick={fireBullet}
            className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xs active:scale-95 transition text-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🎯 Tap to Launch Snack</span>
          </button>
        </div>
      </div>

      {/* FAMILY LEADERBOARD */}
      <PandaLeaderboard
        gameKey="bubble-slinger"
        gameTitle="Panda Bubble Bamboo Slinger"
        currentDifficulty={difficulty}
        latestScore={latestScore}
        onClearScore={() => setLatestScore(null)}
      />
    </div>
  );
};
