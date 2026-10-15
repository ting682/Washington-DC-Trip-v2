import React, { useEffect, useRef, useState } from 'react';
import { PandaLeaderboard } from './PandaLeaderboard';
import { sounds } from './audioEffects';

type SnackType = 'bamboo' | 'apple' | 'carrot' | 'grape' | 'rainbow';

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
  rainbow: '🌈',
};

const SNACK_COLORS: Record<SnackType, string> = {
  bamboo: '#10b981',
  apple: '#ef4444',
  carrot: '#f97316',
  grape: '#8b5cf6',
  rainbow: '#ec4899',
};

const REGULAR_TYPES: SnackType[] = ['bamboo', 'apple', 'carrot', 'grape'];

// Grid Geometry Constants - Full Canvas 400px Span
const COLS = 10;
const BUBBLE_RADIUS = 20;
const BUBBLE_DIAMETER = BUBBLE_RADIUS * 2;
const ROW_HEIGHT = 34.64; // 2R * sin(60°)
const START_Y = 24;
const CEILING_Y = 24;
const WALL_LEFT = BUBBLE_RADIUS; // 20
const WALL_RIGHT = 400 - BUBBLE_RADIUS; // 380
const LAUNCH_X = 200;
const LAUNCH_Y = 344;
const MAX_ROWS = 12;
const DANGER_ROW = 8;

// Synchronized Physics Constants (identically shared by raycast aimer & flying bullet)
const BULLET_SPEED = 12;
const SUB_STEPS = 6;
const STEP_SIZE = BULLET_SPEED / SUB_STEPS; // 2.0 pixels per step
const COLLISION_DIST = BUBBLE_RADIUS * 2 * 0.94; // 37.6px contact distance

// Helper to calculate exact center (x, y) for cell (r, c)
function getCellCenter(r: number, c: number): Point {
  const isOdd = r % 2 !== 0;
  const offsetX = isOdd ? BUBBLE_RADIUS * 2 : BUBBLE_RADIUS;
  return {
    x: offsetX + c * BUBBLE_DIAMETER,
    y: START_Y + r * ROW_HEIGHT,
  };
}

// 6 Hexagonal neighbors in horizontal close-packed grid
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
  const [isVictory, setIsVictory] = useState(false);
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
    x: LAUNCH_X,
    y: LAUNCH_Y,
    vx: 0,
    vy: 0,
    type: 'bamboo',
    active: false,
  });

  const nextBulletTypeRef = useRef<SnackType>('apple');
  const aimAngleRef = useRef(-Math.PI / 2);
  const animIdRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const shotsLeftRef = useRef(30);
  const fallingBubblesRef = useRef<FallingBubble[]>([]);
  const bulletFlightFramesRef = useRef(0);

  // Get list of snack colors currently remaining in the grid
  const getRemainingSnackTypes = (): SnackType[] => {
    const types = new Set<SnackType>();
    gridRef.current.forEach(row => {
      row?.forEach(b => {
        if (b && b.type !== 'rainbow') {
          types.add(b.type);
        }
      });
    });
    return types.size > 0 ? Array.from(types) : REGULAR_TYPES;
  };

  const pickNextBulletType = (): SnackType => {
    const available = getRemainingSnackTypes();
    // 6% chance of bonus rainbow wild snack
    if (Math.random() < 0.06) return 'rainbow';
    return available[Math.floor(Math.random() * available.length)];
  };

  const initGrid = (isEasy: boolean, isHard: boolean) => {
    const grid: (Bubble | null)[][] = [];
    const initialRows = isEasy ? 4 : isHard ? 6 : 5;

    for (let r = 0; r < MAX_ROWS; r++) {
      grid[r] = [];
      const colsInRow = r % 2 === 0 ? COLS : COLS - 1;

      for (let c = 0; c < colsInRow; c++) {
        if (r < initialRows) {
          const rand = Math.random();
          let type: SnackType;
          if (rand > 0.96) type = 'rainbow';
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

  // Universal attachment snapping: Finds the closest valid attached cell to the impact point
  const getSnapCell = (
    _hitBubble: Bubble | null,
    impactX: number,
    impactY: number
  ): { r: number; c: number; x: number; y: number } => {
    const grid = gridRef.current;
    let bestR = 0;
    let bestC = 0;
    let minD = Infinity;

    // Check all cells to find valid attached empty cells
    for (let r = 0; r < MAX_ROWS; r++) {
      const colsInRow = r % 2 === 0 ? COLS : COLS - 1;
      for (let c = 0; c < colsInRow; c++) {
        if (!grid[r]?.[c]) {
          // A cell is valid if it is in row 0 (anchored to ceiling) OR adjacent to an existing bubble
          let isAttached = r === 0;
          if (!isAttached) {
            const neighbors = getHexNeighbors(r, c);
            for (const n of neighbors) {
              const nCols = n.r % 2 === 0 ? COLS : COLS - 1;
              if (n.r >= 0 && n.r < MAX_ROWS && n.c >= 0 && n.c < nCols) {
                if (grid[n.r]?.[n.c]) {
                  isAttached = true;
                  break;
                }
              }
            }
          }

          if (isAttached) {
            const center = getCellCenter(r, c);
            const d = Math.hypot(center.x - impactX, center.y - impactY);
            if (d < minD) {
              minD = d;
              bestR = r;
              bestC = c;
            }
          }
        }
      }
    }

    const center = getCellCenter(bestR, bestC);
    return { r: bestR, c: bestC, x: center.x, y: center.y };
  };

  // Raycast with wall reflection angle and exact snap prediction
  // Uses IDENTICAL constants, step size, and collision checks as the real bullet physics
  const computeAimTrajectory = (angle: number): { points: Point[]; targetGhost?: Point } => {
    const points: Point[] = [{ x: LAUNCH_X, y: LAUNCH_Y }];
    let curX = LAUNCH_X;
    let curY = LAUNCH_Y;
    let vx = Math.cos(angle) * STEP_SIZE;
    let vy = Math.sin(angle) * STEP_SIZE;
    let targetGhost: Point | undefined = undefined;

    let maxSteps = 450; // up to 900px of travel
    let bounces = 0;

    while (maxSteps > 0 && bounces < 3) {
      curX += vx;
      curY += vy;
      maxSteps--;

      // Check Left Wall Hit
      if (curX <= WALL_LEFT) {
        curX = WALL_LEFT + (WALL_LEFT - curX); // reflect overshoot
        vx = Math.abs(vx);
        bounces++;
        points.push({ x: WALL_LEFT, y: curY });
      }
      // Check Right Wall Hit
      else if (curX >= WALL_RIGHT) {
        curX = WALL_RIGHT - (curX - WALL_RIGHT); // reflect overshoot
        vx = -Math.abs(vx);
        bounces++;
        points.push({ x: WALL_RIGHT, y: curY });
      }

      // Check Ceiling Hit
      if (curY <= CEILING_Y) {
        curY = CEILING_Y;
        points.push({ x: curX, y: curY });
        const snap = getSnapCell(null, curX, curY);
        targetGhost = { x: snap.x, y: snap.y };
        return { points, targetGhost };
      }

      // Check Bubble Collisions (find closest bubble meeting collision threshold)
      let closestBubble: Bubble | null = null;
      let minBubbleDist = Infinity;

      for (let r = 0; r < MAX_ROWS; r++) {
        const colsInRow = r % 2 === 0 ? COLS : COLS - 1;
        for (let c = 0; c < colsInRow; c++) {
          const b = gridRef.current[r]?.[c];
          if (b) {
            const d = Math.hypot(b.x - curX, b.y - curY);
            if (d <= COLLISION_DIST && d < minBubbleDist) {
              minBubbleDist = d;
              closestBubble = b;
            }
          }
        }
      }

      if (closestBubble) {
        points.push({ x: curX, y: curY });
        const snap = getSnapCell(closestBubble, curX, curY);
        targetGhost = { x: snap.x, y: snap.y };
        return { points, targetGhost };
      }
    }

    points.push({ x: curX, y: curY });
    const snap = getSnapCell(null, curX, curY);
    targetGhost = { x: snap.x, y: snap.y };
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

    // Danger Zone Line at Row 8
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(8, START_Y + (DANGER_ROW + 0.5) * ROW_HEIGHT);
    ctx.lineTo(392, START_Y + (DANGER_ROW + 0.5) * ROW_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(220, 38, 38, 0.7)';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('⚠️ DANGER LINE', 390, START_Y + (DANGER_ROW + 0.5) * ROW_HEIGHT - 3);
    ctx.restore();

    // Side Wall borders
    ctx.fillStyle = '#059669';
    ctx.fillRect(0, 0, 4, 400);
    ctx.fillRect(396, 0, 4, 400);

    // Ceiling bar
    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, 400, 8);

    // Draw Grid Bubbles
    for (let r = 0; r < gridRef.current.length; r++) {
      for (let c = 0; c < (gridRef.current[r]?.length || 0); c++) {
        const b = gridRef.current[r]?.[c];
        if (b) {
          ctx.fillStyle = SNACK_COLORS[b.type] || '#10b981';
          ctx.beginPath();
          ctx.arc(b.x, b.y, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
          ctx.fill();

          // Shiny 3D bubble highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.beginPath();
          ctx.arc(b.x - 5, b.y - 5, 5, 0, Math.PI * 2);
          ctx.fill();

          // Snack Icon
          ctx.font = '18px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(SNACK_ICONS[b.type] || '🎋', b.x, b.y + 1);
        }
      }
    }

    // Draw Falling/Unattached Bubbles (Orphan cascade animation)
    fallingBubblesRef.current.forEach(fb => {
      ctx.save();
      ctx.translate(fb.x, fb.y);
      ctx.rotate(fb.rot);

      ctx.fillStyle = SNACK_COLORS[fb.type] || '#10b981';
      ctx.beginPath();
      ctx.arc(0, 0, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SNACK_ICONS[fb.type] || '🎋', 0, 1);
      ctx.restore();
    });

    // Draw Reflected Aiming Guide Lines - ALWAYS VISIBLE whenever ready to shoot!
    if (!currentBulletRef.current.active) {
      const { points, targetGhost } = computeAimTrajectory(aimAngleRef.current);

      ctx.save();
      // 1. Draw glowing green dashed guide line with bounce reflections
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Draw prominent green circular guide beads along trajectory path
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const segDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (segDist > 0) {
          const nx = (p2.x - p1.x) / segDist;
          const ny = (p2.y - p1.y) / segDist;
          for (let d = 8; d < segDist; d += 18) {
            const dotX = p1.x + nx * d;
            const dotY = p1.y + ny * d;

            // Outer dark emerald ring
            ctx.fillStyle = '#065f46';
            ctx.beginPath();
            ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
            ctx.fill();

            // Vibrant mint emerald core
            ctx.fillStyle = '#34d399';
            ctx.beginPath();
            ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 3. Draw ghost target landing circle with exact snack color and icon preview
      if (targetGhost) {
        ctx.save();
        const snackType = nextBulletTypeRef.current || 'bamboo';
        const ghostColor = SNACK_COLORS[snackType] || '#10b981';
        const ghostIcon = SNACK_ICONS[snackType] || '🎋';

        // Snapped landing slot aura
        ctx.fillStyle = ghostColor;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(targetGhost.x, targetGhost.y, BUBBLE_RADIUS + 2, 0, Math.PI * 2);
        ctx.fill();

        // High contrast dashed target boundary
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = '#047857';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(targetGhost.x, targetGhost.y, BUBBLE_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Landing snack emoji icon preview
        ctx.globalAlpha = 0.9;
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ghostIcon, targetGhost.x, targetGhost.y + 1);
        ctx.restore();
      }
      ctx.restore();
    }

    // Slingshot Base & Plinth
    ctx.fillStyle = '#047857';
    ctx.fillRect(0, 382, 400, 18);

    // Aimed Bamboo Launcher Tube
    ctx.save();
    ctx.translate(LAUNCH_X, LAUNCH_Y);
    ctx.rotate(aimAngleRef.current + Math.PI / 2);
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(-6, -26, 12, 26);
    ctx.fillStyle = '#15803d';
    ctx.fillRect(-8, -26, 16, 5);
    ctx.restore();

    // Ready Loaded Snack in Slingshot (visible when ready to shoot)
    const bullet = currentBulletRef.current;
    if (!bullet.active) {
      const readyType = nextBulletTypeRef.current || 'bamboo';
      ctx.fillStyle = SNACK_COLORS[readyType] || '#10b981';
      ctx.beginPath();
      ctx.arc(LAUNCH_X, LAUNCH_Y, BUBBLE_RADIUS - 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(LAUNCH_X - 4, LAUNCH_Y - 4, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SNACK_ICONS[readyType] || '🎋', LAUNCH_X, LAUNCH_Y + 1);
    }

    // Panda Mascot Shooter
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐼', LAUNCH_X, 368);

    // Next snack preview circle
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#065f46';
    ctx.fillText('NEXT', 60, 356);
    ctx.font = '24px sans-serif';
    ctx.fillText(SNACK_ICONS[nextBulletTypeRef.current] || '🍎', 60, 374);

    // Flying Bullet if active
    if (bullet.active) {
      ctx.fillStyle = SNACK_COLORS[bullet.type] || '#10b981';
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
      ctx.fillText(SNACK_ICONS[bullet.type] || '🎋', bullet.x, bullet.y + 1);
    }
  };

  const fireBullet = () => {
    if (currentBulletRef.current.active || !gameRunning || shotsLeftRef.current <= 0) return;

    sounds.playBounce();
    currentBulletRef.current = {
      x: LAUNCH_X,
      y: LAUNCH_Y,
      vx: Math.cos(aimAngleRef.current) * BULLET_SPEED,
      vy: Math.sin(aimAngleRef.current) * BULLET_SPEED,
      type: nextBulletTypeRef.current,
      active: true,
    };
    bulletFlightFramesRef.current = 0;

    shotsLeftRef.current -= 1;
    setShotsLeft(shotsLeftRef.current);

    // Pick next bullet from currently remaining colors on the board
    nextBulletTypeRef.current = pickNextBulletType();
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
          const colsInRow = n.r % 2 === 0 ? COLS : COLS - 1;
          if (
            n.r >= 0 &&
            n.r < MAX_ROWS &&
            n.c >= 0 &&
            n.c < colsInRow &&
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
        const colsInRow = n.r % 2 === 0 ? COLS : COLS - 1;
        if (
          n.r >= 0 &&
          n.r < MAX_ROWS &&
          n.c >= 0 &&
          n.c < colsInRow &&
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
    for (let r = 0; r < MAX_ROWS; r++) {
      const colsInRow = r % 2 === 0 ? COLS : COLS - 1;
      for (let c = 0; c < colsInRow; c++) {
        const b = grid[r]?.[c];
        if (b && !connected.has(`${r},${c}`)) {
          droppedCount++;
          grid[r][c] = null;
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
    const snap = getSnapCell(hitBubble, bullet.x, bullet.y);
    const targetR = snap.r;
    const targetC = snap.c;

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
    bulletFlightFramesRef.current = 0;

    // Check Matching Colors (3 or more, or rainbow)
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
        scoreRef.current += dropped * 50;
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

    if (remaining === 0) {
      // VICTORY! All bubbles cleared
      scoreRef.current += 500; // Big bonus for clearing board
      setScore(scoreRef.current);
      sounds.playPowerUp();
      setTimeout(() => {
        stopGame(true);
      }, 700);
      return;
    }

    if (lowestR >= DANGER_ROW || shotsLeftRef.current <= 0) {
      setTimeout(() => {
        stopGame(false);
      }, 500);
    }
  };

  const stopGame = (won: boolean = false) => {
    setGameRunning(false);
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    if (won) {
      sounds.playPowerUp();
    } else {
      sounds.playGameOver();
    }
    const final = scoreRef.current;
    setLatestScore(final);
    setIsVictory(won);
    setGameOver(true);
  };

  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sub-stepped Bullet Movement (SUB_STEPS per frame) for rock-solid precision matching raycast
    const bullet = currentBulletRef.current;
    if (bullet.active) {
      bulletFlightFramesRef.current += 1;
      // Safety timeout if bullet gets stuck or ricochets endlessly
      if (bulletFlightFramesRef.current > 180) {
        snapBulletToGrid(null);
        bullet.active = false;
        bulletFlightFramesRef.current = 0;
      } else {
        const stepVx = bullet.vx / SUB_STEPS;
        const stepVy = bullet.vy / SUB_STEPS;

        for (let s = 0; s < SUB_STEPS && bullet.active; s++) {
          bullet.x += stepVx;
          bullet.y += stepVy;

          // Bounce off left / right walls with overshoot reflection
          if (bullet.x <= WALL_LEFT) {
            bullet.x = WALL_LEFT + (WALL_LEFT - bullet.x);
            bullet.vx = Math.abs(bullet.vx);
            sounds.playBounce();
          } else if (bullet.x >= WALL_RIGHT) {
            bullet.x = WALL_RIGHT - (bullet.x - WALL_RIGHT);
            bullet.vx = -Math.abs(bullet.vx);
            sounds.playBounce();
          }

          // Out-of-bounds safety check
          if (bullet.y > 410 || bullet.x < -30 || bullet.x > 430 || bullet.y < -30) {
            bullet.active = false;
            bulletFlightFramesRef.current = 0;
            break;
          }

          // Hit ceiling
          if (bullet.y <= CEILING_Y) {
            bullet.y = CEILING_Y;
            snapBulletToGrid(null);
            break;
          }

          // Hit another bubble (find closest within threshold)
          let closestBubble: Bubble | null = null;
          let minBubbleDist = Infinity;

          for (let r = 0; r < MAX_ROWS; r++) {
            const colsInRow = r % 2 === 0 ? COLS : COLS - 1;
            for (let c = 0; c < colsInRow; c++) {
              const b = gridRef.current[r]?.[c];
              if (b) {
                const dist = Math.hypot(b.x - bullet.x, b.y - bullet.y);
                if (dist <= COLLISION_DIST && dist < minBubbleDist) {
                  minBubbleDist = dist;
                  closestBubble = b;
                }
              }
            }
          }

          if (closestBubble) {
            snapBulletToGrid(closestBubble);
            break;
          }
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
    if (rect.width === 0 || rect.height === 0) return;

    const x = (clientX - rect.left) * (400 / rect.width);
    const y = (clientY - rect.top) * (400 / rect.height);
    let angle = Math.atan2(y - LAUNCH_Y, x - LAUNCH_X);

    // If pointer is pulled below the launcher, clamp to lowest upward angle on that side
    if (y >= LAUNCH_Y) {
      angle = x >= LAUNCH_X ? -0.15 : -Math.PI + 0.15;
    } else {
      // Smoothly clamp between -171° and -9°
      angle = Math.max(-Math.PI + 0.15, Math.min(-0.15, angle));
    }

    if (Number.isFinite(angle)) {
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
    bulletFlightFramesRef.current = 0;
    scoreRef.current = 0;
    shotsLeftRef.current = isEasy ? 35 : isHard ? 24 : 30;
    setScore(0);
    setShotsLeft(shotsLeftRef.current);
    setIsVictory(false);
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

    // Keyboard controls for laptop/desktop play
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        aimAngleRef.current = Math.max(-Math.PI + 0.15, aimAngleRef.current - 0.05);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        aimAngleRef.current = Math.min(-0.15, aimAngleRef.current + 0.05);
      } else if (e.code === 'Space' || e.key === 'Enter' || e.key === 'ArrowUp') {
        e.preventDefault();
        fireBullet();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
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
          Drag or move your finger / mouse to aim! Tap or press <strong>Space</strong> to launch. Match 3 to drop clusters for huge bonus points!
        </p>

        {/* CANVAS WRAPPER */}
        <div className="relative max-w-md mx-auto rounded-2xl border-2 border-emerald-300 overflow-hidden shadow-inner h-[400px] bg-emerald-50">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            style={{ touchAction: 'none' }}
            className="w-full h-full block cursor-crosshair select-none"
            onPointerDown={e => {
              handlePointerAim(e.clientX, e.clientY);
            }}
            onPointerMove={e => {
              handlePointerAim(e.clientX, e.clientY);
            }}
            onClick={e => {
              handlePointerAim(e.clientX, e.clientY);
              fireBullet();
            }}
          />

          {(!gameRunning || gameOver) && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
              <span className="text-5xl mb-2">{isVictory ? '🎉' : '🐼'}</span>
              <h3 className="text-lg font-black">
                {isVictory
                  ? `Bamboo Grove Cleared! Score: ${score}`
                  : gameOver
                  ? `Game Over! Score: ${score}`
                  : 'Panda Bubble Bamboo Slinger'}
              </h3>
              <p className="text-xs text-slate-200 mt-1 mb-4 max-w-xs">
                {isVictory
                  ? 'Incredible shot! You cleared all the snacks from the bamboo grove! Bonus +500 points!'
                  : gameOver
                  ? score >= 250
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
