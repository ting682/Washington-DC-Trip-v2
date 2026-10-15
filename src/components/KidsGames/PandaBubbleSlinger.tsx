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

interface FallingBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: SnackType;
  rot: number;
  vRot: number;
}

interface Point {
  x: number;
  y: number;
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

// Grid Geometry Constants
const COLS = 8;
const BUBBLE_RADIUS = 20;
const BUBBLE_DIAMETER = BUBBLE_RADIUS * 2;
const ROW_HEIGHT = BUBBLE_DIAMETER * 0.866; // 2R * sin(60°)
const START_Y = 28;
const WALL_LEFT = BUBBLE_RADIUS + 4;
const WALL_RIGHT = 400 - BUBBLE_RADIUS - 4;
const CEILING_Y = BUBBLE_RADIUS + 8;
const SLING_X = 200;
const SLING_Y = 346;

// Helper to calculate exact center (x, y) for cell (r, c)
function getCellCenter(r: number, c: number): Point {
  const isOdd = r % 2 !== 0;
  // Offset rows so grid is centered on 400px canvas
  const offsetX = isOdd ? 40 + BUBBLE_RADIUS * 2 : 40 + BUBBLE_RADIUS;
  return {
    x: offsetX + c * BUBBLE_DIAMETER,
    y: START_Y + r * ROW_HEIGHT,
  };
}

// 6 Hexagonal neighbors in horizontal layout
function getHexNeighbors(r: number, c: number): { r: number; c: number }[] {
  const isOdd = r % 2 !== 0;
  if (isOdd) {
    return [
      { r, c: c - 1 },
      { r, c: c + 1 },
      { r: r - 1, c },
      { r: r - 1, c: c + 1 },
      { r: r + 1, c },
      { r: r + 1, c: c + 1 },
    ];
  } else {
    return [
      { r, c: c - 1 },
      { r, c: c + 1 },
      { r: r - 1, c: c - 1 },
      { r: r - 1, c },
      { r: r + 1, c: c - 1 },
      { r: r + 1, c },
    ];
  }
}

export const PandaBubbleSlinger: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [score, setScore] = useState(0);
  const [shotsLeft, setShotsLeft] = useState(30);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [latestScore, setLatestScore] = useState<number | null>(null);

  const gridRef = useRef<(Bubble | null)[][]>([]);
  const currentBulletRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    type: SnackType;
    active: boolean;
  }>({
    x: SLING_X,
    y: SLING_Y,
    vx: 0,
    vy: 0,
    type: 'bamboo',
    active: false,
  });

  const nextBulletTypeRef = useRef<SnackType>('apple');
  const aimAngleRef = useRef(-Math.PI / 2);
  const isAimingRef = useRef(false);
  const animIdRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const fallingBubblesRef = useRef<FallingBubble[]>([]);

  const initGrid = (isEasy: boolean, isHard: boolean) => {
    const grid: (Bubble | null)[][] = [];
    const initialRows = isEasy ? 4 : isHard ? 6 : 5;

    for (let r = 0; r < 12; r++) {
      grid[r] = [];
      const colsInRow = r % 2 === 0 ? COLS : COLS - 1;

      for (let c = 0; c < colsInRow; c++) {
        if (r < initialRows) {
          const rand = Math.random();
          let type: SnackType;
          if (rand > 0.96) type = 'rainbow';
          else if (rand > 0.92) type = 'bomb';
          else type = REGULAR_TYPES[Math.floor(Math.random() * REGULAR_TYPES.length)];

          const center = getCellCenter(r, c);
          grid[r][c] = {
            r,
            c,
            x: center.x,
            y: center.y,
            type,
          };
        } else {
          grid[r][c] = null;
        }
      }
    }
    return grid;
  };

  // Raycast with wall reflection angle
  const computeAimTrajectory = (angle: number): { points: Point[]; targetGhost?: Point } => {
    const points: Point[] = [{ x: SLING_X, y: SLING_Y }];
    let curX = SLING_X;
    let curY = SLING_Y;
    let vx = Math.cos(angle);
    let vy = Math.sin(angle);
    let targetGhost: Point | undefined = undefined;

    // Up to 2 wall bounces
    let maxDistance = 550;
    for (let bounce = 0; bounce < 3 && maxDistance > 0; bounce++) {
      let step = 0;
      let hitWall = false;

      while (step < 300 && maxDistance > 0) {
        curX += vx * 3;
        curY += vy * 3;
        maxDistance -= 3;
        step += 3;

        // Check Wall Hit
        if (curX <= WALL_LEFT) {
          curX = WALL_LEFT;
          points.push({ x: curX, y: curY });
          vx = Math.abs(vx); // reflect right
          hitWall = true;
          break;
        } else if (curX >= WALL_RIGHT) {
          curX = WALL_RIGHT;
          points.push({ x: curX, y: curY });
          vx = -Math.abs(vx); // reflect left
          hitWall = true;
          break;
        }

        // Check Ceiling Hit
        if (curY <= CEILING_Y) {
          curY = CEILING_Y;
          points.push({ x: curX, y: curY });
          targetGhost = { x: curX, y: curY };
          return { points, targetGhost };
        }

        // Check collision with any existing bubble
        for (let r = 0; r < 12; r++) {
          const colsInRow = r % 2 === 0 ? COLS : COLS - 1;
          for (let c = 0; c < colsInRow; c++) {
            const b = gridRef.current[r]?.[c];
            if (b) {
              const d = Math.hypot(b.x - curX, b.y - curY);
              if (d <= BUBBLE_DIAMETER * 0.94) {
                points.push({ x: curX, y: curY });
                targetGhost = { x: curX, y: curY };
                return { points, targetGhost };
              }
            }
          }
        }
      }

      if (!hitWall) {
        points.push({ x: curX, y: curY });
        targetGhost = { x: curX, y: curY };
        break;
      }
    }

    return { points, targetGhost };
  };

  const drawScene = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 400, 400);

    // Bamboo Grove Background
    const bg = ctx.createLinearGradient(0, 0, 0, 400);
    bg.addColorStop(0, '#f0fdf4');
    bg.addColorStop(1, '#dcfce7');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 400, 400);

    // Side Wall borders
    ctx.fillStyle = '#059669';
    ctx.fillRect(0, 0, 4, 400);
    ctx.fillRect(396, 0, 4, 400);

    // Ceiling bar
    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, 400, 8);

    // Draw Grid Bubbles
    for (let r = 0; r < gridRef.current.length; r++) {
      for (let c = 0; c < gridRef.current[r].length; c++) {
        const b = gridRef.current[r][c];
        if (b) {
          ctx.fillStyle = SNACK_COLORS[b.type];
          ctx.beginPath();
          ctx.arc(b.x, b.y, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
          ctx.fill();

          // Shiny highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
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

    // Draw Falling/Unattached Bubbles (Orphan cascade animation)
    fallingBubblesRef.current.forEach(fb => {
      ctx.save();
      ctx.translate(fb.x, fb.y);
      ctx.rotate(fb.rot);

      ctx.fillStyle = SNACK_COLORS[fb.type];
      ctx.beginPath();
      ctx.arc(0, 0, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SNACK_ICONS[fb.type], 0, 1);
      ctx.restore();
    });

    // Draw Reflected Aiming Guide Lines
    if (isAimingRef.current && !currentBulletRef.current.active && gameRunning) {
      const { points, targetGhost } = computeAimTrajectory(aimAngleRef.current);

      ctx.save();
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw ghost target landing circle
      if (targetGhost) {
        ctx.strokeStyle = SNACK_COLORS[nextBulletTypeRef.current];
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(targetGhost.x, targetGhost.y, BUBBLE_RADIUS - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    // Slingshot Base & Panda at bottom
    ctx.fillStyle = '#047857';
    ctx.fillRect(0, 382, 400, 18);

    // Panda Slingshot Shooter
    ctx.font = '38px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐼', SLING_X, 362);

    // Next snack preview circle
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#065f46';
    ctx.fillText('NEXT', 135, 348);
    ctx.font = '22px sans-serif';
    ctx.fillText(SNACK_ICONS[nextBulletTypeRef.current], 135, 368);

    // Flying Bullet if active
    const bullet = currentBulletRef.current;
    if (bullet.active) {
      ctx.fillStyle = SNACK_COLORS[bullet.type];
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, BUBBLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(bullet.x - 5, bullet.y - 5, 5, 0, Math.PI * 2);
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
    const speed = 13;
    currentBulletRef.current = {
      x: SLING_X,
      y: SLING_Y - 10,
      vx: Math.cos(aimAngleRef.current) * speed,
      vy: Math.sin(aimAngleRef.current) * speed,
      type: nextBulletTypeRef.current,
      active: true,
    };

    nextBulletTypeRef.current = REGULAR_TYPES[Math.floor(Math.random() * REGULAR_TYPES.length)];
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

        const neighbors = getHexNeighbors(r, c);
        neighbors.forEach(n => {
          if (
            n.r >= 0 &&
            n.r < 12 &&
            n.c >= 0 &&
            n.c < (n.r % 2 === 0 ? COLS : COLS - 1) &&
            gridRef.current[n.r]?.[n.c]
          ) {
            queue.push(n);
          }
        });
      }
    }
    return matches;
  };

  // Drop any unattached floating bubbles (orphaned clusters)
  const dropFloatingBubbles = (): number => {
    const grid = gridRef.current;
    const connected = new Set<string>();
    const queue: { r: number; c: number }[] = [];

    // All bubbles in row 0 are anchored to the ceiling
    for (let c = 0; c < COLS; c++) {
      if (grid[0]?.[c]) {
        connected.add(`0,${c}`);
        queue.push({ r: 0, c });
      }
    }

    // BFS to find all attached bubbles
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const neighbors = getHexNeighbors(curr.r, curr.c);
      for (const n of neighbors) {
        const key = `${n.r},${n.c}`;
        if (
          n.r >= 0 &&
          n.r < 12 &&
          n.c >= 0 &&
          n.c < (n.r % 2 === 0 ? COLS : COLS - 1) &&
          grid[n.r]?.[n.c] &&
          !connected.has(key)
        ) {
          connected.add(key);
          queue.push(n);
        }
      }
    }

    // Any bubble in the grid NOT connected to row 0 falls down!
    let droppedCount = 0;
    for (let r = 0; r < 12; r++) {
      const colsInRow = r % 2 === 0 ? COLS : COLS - 1;
      for (let c = 0; c < colsInRow; c++) {
        const b = grid[r]?.[c];
        if (b && !connected.has(`${r},${c}`)) {
          grid[r][c] = null;
          droppedCount++;

          fallingBubblesRef.current.push({
            x: b.x,
            y: b.y,
            vx: (Math.random() - 0.5) * 4,
            vy: -2 - Math.random() * 2, // initial upward pop before falling
            type: b.type,
            rot: Math.random() * Math.PI,
            vRot: (Math.random() - 0.5) * 0.2,
          });
        }
      }
    }

    return droppedCount;
  };

  // Accurate neighbor-based snapping
  const snapBulletToGrid = (hitBubble: Bubble | null) => {
    const bullet = currentBulletRef.current;
    const grid = gridRef.current;
    let targetR = 0;
    let targetC = 0;

    if (hitBubble === null) {
      // Hit the ceiling: snap into row 0 closest to bullet.x
      let bestC = 0;
      let minD = Infinity;
      for (let c = 0; c < COLS; c++) {
        if (!grid[0][c]) {
          const center = getCellCenter(0, c);
          const d = Math.abs(center.x - bullet.x);
          if (d < minD) {
            minD = d;
            bestC = c;
          }
        }
      }
      targetR = 0;
      targetC = bestC;
    } else {
      // Hit a bubble: snap into the closest EMPTY hexagonal neighbor of that collided bubble!
      const neighbors = getHexNeighbors(hitBubble.r, hitBubble.c);
      let bestNeighbor: { r: number; c: number } | null = null;
      let minD = Infinity;

      neighbors.forEach(n => {
        if (
          n.r >= 0 &&
          n.r < 12 &&
          n.c >= 0 &&
          n.c < (n.r % 2 === 0 ? COLS : COLS - 1) &&
          !grid[n.r][n.c]
        ) {
          const center = getCellCenter(n.r, n.c);
          const d = Math.hypot(center.x - bullet.x, center.y - bullet.y);
          if (d < minD) {
            minD = d;
            bestNeighbor = n;
          }
        }
      });

      if (bestNeighbor) {
        targetR = (bestNeighbor as { r: number; c: number }).r;
        targetC = (bestNeighbor as { r: number; c: number }).c;
      } else {
        // Fallback: closest overall empty cell near the hit
        let bestDist = Infinity;
        for (let r = 0; r < 12; r++) {
          const colsInRow = r % 2 === 0 ? COLS : COLS - 1;
          for (let c = 0; c < colsInRow; c++) {
            if (!grid[r][c]) {
              const center = getCellCenter(r, c);
              const d = Math.hypot(center.x - bullet.x, center.y - bullet.y);
              if (d < bestDist) {
                bestDist = d;
                targetR = r;
                targetC = c;
              }
            }
          }
        }
      }
    }

    // Place bubble into grid
    const center = getCellCenter(targetR, targetC);
    const placed: Bubble = {
      r: targetR,
      c: targetC,
      x: center.x,
      y: center.y,
      type: bullet.type,
    };
    grid[targetR][targetC] = placed;
    bullet.active = false;

    // Check Bomb
    if (bullet.type === 'bomb') {
      sounds.playPowerUp();
      let popped = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = targetR + dr;
          const nc = targetC + dc;
          if (grid[nr]?.[nc]) {
            grid[nr][nc] = null;
            popped++;
          }
        }
      }
      scoreRef.current += popped * 25;
      setScore(scoreRef.current);
      const dropped = dropFloatingBubbles();
      if (dropped > 0) {
        scoreRef.current += dropped * 40;
        setScore(scoreRef.current);
      }
      return;
    }

    // Check Matching Colors (3 or more)
    const matches = findMatches(targetR, targetC, bullet.type);
    if (matches.length >= 3 || bullet.type === 'rainbow') {
      sounds.playPowerUp();
      matches.forEach(m => {
        grid[m.r][m.c] = null;
      });
      scoreRef.current += matches.length * 30;
      setScore(scoreRef.current);

      // DROP ALL UNATTACHED FLOATING BUBBLES!
      const dropped = dropFloatingBubbles();
      if (dropped > 0) {
        sounds.playPowerUp();
        scoreRef.current += dropped * 40;
        setScore(scoreRef.current);
      }
    } else {
      sounds.playMiss();
    }

    // Check Game Over Conditions
    let remaining = 0;
    let lowestR = 0;
    grid.forEach(row => {
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

    // Sub-stepped Bullet Movement (4 sub-steps per frame) for rock-solid precision
    const bullet = currentBulletRef.current;
    if (bullet.active) {
      const steps = 4;
      const stepVx = bullet.vx / steps;
      const stepVy = bullet.vy / steps;

      for (let s = 0; s < steps && bullet.active; s++) {
        bullet.x += stepVx;
        bullet.y += stepVy;

        // Bounce off left / right walls
        if (bullet.x <= WALL_LEFT) {
          bullet.x = WALL_LEFT;
          bullet.vx = Math.abs(bullet.vx);
          sounds.playBounce();
        } else if (bullet.x >= WALL_RIGHT) {
          bullet.x = WALL_RIGHT;
          bullet.vx = -Math.abs(bullet.vx);
          sounds.playBounce();
        }

        // Hit ceiling
        if (bullet.y <= CEILING_Y) {
          snapBulletToGrid(null);
          break;
        }

        // Hit another bubble
        let collidedBubble: Bubble | null = null;
        for (let r = 0; r < 12; r++) {
          const colsInRow = r % 2 === 0 ? COLS : COLS - 1;
          for (let c = 0; c < colsInRow; c++) {
            const b = gridRef.current[r]?.[c];
            if (b) {
              const dist = Math.hypot(b.x - bullet.x, b.y - bullet.y);
              if (dist <= BUBBLE_DIAMETER * 0.90) {
                collidedBubble = b;
                break;
              }
            }
          }
          if (collidedBubble) break;
        }

        if (collidedBubble) {
          snapBulletToGrid(collidedBubble);
          break;
        }
      }
    }

    // Update Falling/Tumbling Bubbles
    for (let i = fallingBubblesRef.current.length - 1; i >= 0; i--) {
      const fb = fallingBubblesRef.current[i];
      fb.x += fb.vx;
      fb.y += fb.vy;
      fb.vy += 0.55; // gravity
      fb.rot += fb.vRot;

      if (fb.y > 450) {
        fallingBubblesRef.current.splice(i, 1);
      }
    }

    drawScene(ctx);
    animIdRef.current = requestAnimationFrame(gameLoop);
  };

  const handlePointerAim = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (400 / rect.width);
    const y = (clientY - rect.top) * (400 / rect.height);
    const angle = Math.atan2(y - SLING_Y, x - SLING_X);

    // Limit upward angle (-170 deg to -10 deg)
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
    fallingBubblesRef.current = [];
    aimAngleRef.current = -Math.PI / 2;
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
          Drag to aim the <strong>bounce angle</strong> off walls! Match 3 colors to pop clusters—unattached snacks tumble down for big bonus points!
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
              handlePointerAim(e.clientX, e.clientY);
            }}
            onMouseLeave={() => {
              isAimingRef.current = false;
            }}
            onClick={fireBullet}
            onTouchStart={e => {
              isAimingRef.current = true;
              handlePointerAim(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchMove={e => {
              isAimingRef.current = true;
              handlePointerAim(e.touches[0].clientX, e.touches[0].clientY);
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
                  : 'Aim off the walls to bounce into matching clusters! Pop clusters to drop unattached snacks!'}
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
