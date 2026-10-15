import React, { useEffect, useRef, useState } from 'react';
import { PandaLeaderboard } from './PandaLeaderboard';
import { sounds } from './audioEffects';

interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  icon: string;
  type: 'ground' | 'air';
  smashed?: boolean;
}

interface Collectible {
  id: number;
  x: number;
  y: number;
  icon: string;
  points: number;
  isHeart?: boolean;
  isSuper?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

export const PandaZooDash: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [distance, setDistance] = useState(0);
  const [score, setScore] = useState(0);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [isSuperActive, setIsSuperActive] = useState(false);
  const [milestoneBanner, setMilestoneBanner] = useState<string | null>(null);

  // Player physics with tight, snappy, kid-friendly arc
  const playerRef = useRef({
    x: 55,
    y: 220,
    vy: 0,
    groundY: 220,
    width: 38,
    height: 38,
    isJumping: false,
    canDoubleJump: true,
    isDucking: false,
    rotation: 0,
    squashStretch: 1, // > 1 stretched, < 1 squashed
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    invincibleTimer: 0, // brief immunity on damage
    superTimer: 0, // Golden Panda boost duration
    hurtBlink: 0,
  });

  const livesRef = useRef(5);
  const scoreRef = useRef(0);
  const distanceRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const snacksRef = useRef<Collectible[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const animIdRef = useRef<number | null>(null);
  const speedRef = useRef(3.5);
  const lastObstacleSpawnRef = useRef(0);
  const lastSnackSpawnRef = useRef(0);
  const sceneryOffsetRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastMilestoneRef = useRef(0);
  const nextIdRef = useRef(1);

  // Physics tuning constants (TIGHT & SNAPPY, not floaty)
  const JUMP_VELOCITY = -7.8; // Tuned so panda peaks at ~45px height, cleanly clearing obstacles without floating
  const DOUBLE_JUMP_VELOCITY = -6.8;
  const GRAVITY = 0.65; // Snappy crisp gravity

  // Spawn visual sparkle / dust particles
  const spawnDust = (x: number, y: number, count = 3, color = 'rgba(255,255,255,0.7)') => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: x + (Math.random() * 12 - 6),
        y: y + (Math.random() * 4 - 2),
        vx: -speedRef.current * 0.4 - Math.random() * 1.5,
        vy: -Math.random() * 1.5,
        color,
        size: 3 + Math.random() * 3,
        alpha: 1,
        life: 0,
        maxLife: 15 + Math.random() * 10,
      });
    }
  };

  const spawnSparkles = (x: number, y: number, color: string, count = 6) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.5 - 0.25);
      const spd = 2 + Math.random() * 2.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        size: 4 + Math.random() * 3,
        alpha: 1,
        life: 0,
        maxLife: 20 + Math.random() * 10,
      });
    }
  };

  const addFloatingText = (text: string, x: number, y: number, color: string) => {
    floatingTextsRef.current.push({
      id: nextIdRef.current++,
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -1.8,
    });
  };

  // Jump execution with coyote & buffer awareness
  const triggerJump = () => {
    const p = playerRef.current;
    const isEasy = difficulty === 'easy';
    const isMedium = difficulty === 'medium';

    if (!p.isJumping || p.coyoteTimer > 0) {
      // Ground jump
      p.vy = JUMP_VELOCITY;
      p.isJumping = true;
      p.coyoteTimer = 0;
      p.squashStretch = 1.25; // stretch upward
      p.canDoubleJump = isEasy || isMedium || p.superTimer > 0;
      spawnDust(p.x + p.width / 2, p.y + p.height, 4, '#cbd5e1');
      sounds.playJump();
    } else if (p.canDoubleJump) {
      // Somersault double-jump!
      p.vy = DOUBLE_JUMP_VELOCITY;
      p.canDoubleJump = false;
      p.rotation = 0.1; // trigger backflip spin
      p.squashStretch = 1.15;
      spawnSparkles(p.x + p.width / 2, p.y + p.height / 2, '#34d399', 5);
      sounds.playBounce();
    } else {
      // Buffer jump if near ground
      p.jumpBufferTimer = 8;
    }
  };

  // Variable jump cut: release jump to drop early (prevents overshooting and floatiness)
  const cutJump = () => {
    const p = playerRef.current;
    if (p.isJumping && p.vy < -2.5) {
      p.vy *= 0.45; // Cut vertical velocity immediately on release
    }
  };

  const duck = (ducking: boolean) => {
    const p = playerRef.current;
    p.isDucking = ducking;
    if (ducking) {
      sounds.playSlide();
      if (p.isJumping) {
        // Fast drop stomp
        p.vy = Math.max(p.vy + 5, 4);
      } else {
        spawnDust(p.x + p.width / 2, p.y + p.height, 5, '#e2e8f0');
      }
    }
  };

  const stopGame = () => {
    setGameRunning(false);
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    sounds.playGameOver();
    const final = scoreRef.current;
    setLatestScore(final);
    setGameOver(true);
    setIsSuperActive(false);
  };

  const drawScene = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 420, 300);
    const p = playerRef.current;
    const isSuper = p.superTimer > 0;

    // 1. SKY GRADIENT (Bright Smithsonian morning sky)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 240);
    if (isSuper) {
      skyGrad.addColorStop(0, '#fef08a'); // Golden celebration sky!
      skyGrad.addColorStop(1, '#ecfdf5');
    } else {
      skyGrad.addColorStop(0, '#bae6fd');
      skyGrad.addColorStop(0.6, '#e0f2fe');
      skyGrad.addColorStop(1, '#f0fdf4');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 420, 240);

    // 2. PARALLAX CLOUDS
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    for (let c = 0; c < 4; c++) {
      const cloudX = ((c * 150 - sceneryOffsetRef.current * 0.15) % 600 + 600) % 600 - 60;
      const cloudY = 35 + (c % 2) * 22;
      ctx.beginPath();
      ctx.arc(cloudX, cloudY, 18, 0, Math.PI * 2);
      ctx.arc(cloudX + 16, cloudY - 6, 22, 0, Math.PI * 2);
      ctx.arc(cloudX + 34, cloudY, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. DISTANT ROCK CREEK PARK GREEN HILLS
    ctx.fillStyle = isSuper ? '#fef9c3' : '#dcfce7';
    ctx.beginPath();
    ctx.moveTo(0, 240);
    for (let h = 0; h <= 420; h += 30) {
      const hillY = 175 + Math.sin((h + sceneryOffsetRef.current * 0.25) * 0.015) * 14;
      ctx.lineTo(h, hillY);
    }
    ctx.lineTo(420, 240);
    ctx.closePath();
    ctx.fill();

    // 4. NATIONAL ZOO ASIA TRAIL & BAMBOO GROVES (Midground)
    for (let i = 0; i < 7; i++) {
      const treeX = ((i * 90 - sceneryOffsetRef.current * 0.5) % 630 + 630) % 630 - 40;
      
      // Bamboo Stalks
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(treeX, 140, 6, 100);
      ctx.fillRect(treeX + 12, 130, 5, 110);
      
      // Bamboo segments
      ctx.fillStyle = '#15803d';
      ctx.fillRect(treeX - 1, 160, 8, 2);
      ctx.fillRect(treeX - 1, 185, 8, 2);
      ctx.fillRect(treeX - 1, 210, 8, 2);

      // Lush Leaves
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(treeX + 3, 140, 16, 7, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(treeX + 16, 130, 14, 6, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // National Zoo Asian Pagoda Lantern every few trees
      if (i % 2 === 0) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(treeX - 18, 168, 10, 14);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(treeX - 16, 172, 6, 6);
      }
    }

    // 5. ZOO PATHWAY & BRICK PAVEMENT (Foreground)
    // Grassy border
    ctx.fillStyle = '#059669';
    ctx.fillRect(0, 240, 420, 60);

    // Stone pathway curb
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, 240, 420, 6);

    // Decorative pathway stones
    ctx.fillStyle = '#047857';
    for (let x = 0; x < 460; x += 35) {
      const stoneX = ((x - (sceneryOffsetRef.current % 35)) + 460) % 460 - 20;
      ctx.fillRect(stoneX, 260, 22, 5);
      ctx.fillRect(stoneX + 10, 280, 18, 4);
    }

    // 6. DRAW OBSTACLES
    obstaclesRef.current.forEach(obs => {
      ctx.save();
      if (obs.smashed) {
        ctx.globalAlpha = 0.4;
      }
      ctx.font = '26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(obs.icon, obs.x + obs.width / 2, obs.y + obs.height);

      // Shadow below obstacle
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath();
      ctx.ellipse(obs.x + obs.width / 2, 242, obs.width * 0.4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 7. DRAW COLLECTIBLES
    snacksRef.current.forEach(snk => {
      ctx.save();
      // Gentle bobbing effect
      const bobY = snk.y + Math.sin((frameCountRef.current + snk.id * 10) * 0.12) * 3;

      // Glow behind special items
      if (snk.isSuper) {
        const glowRad = 16 + Math.sin(frameCountRef.current * 0.2) * 4;
        const radGrad = ctx.createRadialGradient(snk.x, bobY, 4, snk.x, bobY, glowRad);
        radGrad.addColorStop(0, 'rgba(250, 204, 21, 0.8)');
        radGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(snk.x, bobY, glowRad, 0, Math.PI * 2);
        ctx.fill();
      } else if (snk.isHeart) {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
        ctx.beginPath();
        ctx.arc(snk.x, bobY, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.font = snk.isSuper ? '26px sans-serif' : '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(snk.icon, snk.x, bobY);
      ctx.restore();
    });

    // 8. PARTICLES (Dust, sparkles, star bursts)
    particlesRef.current.forEach(part => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, part.alpha);
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 9. DRAW PANDA PLAYER (Squash, Stretch, Somersault & Reactions!)
    ctx.save();
    const centerX = p.x + p.width / 2;
    const centerY = p.y + p.height / 2;

    // Player Shadow
    const shadowScale = Math.max(0.3, 1 - (p.groundY - p.y) / 80);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(centerX, 243, (p.width * 0.45) * shadowScale, 3.5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hurt blink effect
    if (p.invincibleTimer > 0 && Math.floor(frameCountRef.current / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    ctx.translate(centerX, centerY);

    // Apply somersault rotation or duck roll
    if (p.rotation !== 0) {
      ctx.rotate(p.rotation);
    }

    // Apply squash and stretch
    ctx.scale(2 - p.squashStretch, p.squashStretch);

    // Super Golden Panda Glow
    if (isSuper) {
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 18;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (p.isDucking) {
      // Rolling duck
      ctx.font = '28px sans-serif';
      ctx.fillText('🐼', 0, 6);
      // Slide speed wind lines
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-18, 12);
      ctx.lineTo(-30, 12);
      ctx.moveTo(-15, 6);
      ctx.lineTo(-26, 6);
      ctx.stroke();
    } else {
      // Running bounce
      const runBob = !p.isJumping ? Math.sin(frameCountRef.current * 0.3) * 2.5 : 0;
      ctx.font = '36px sans-serif';
      ctx.fillText('🐼', 0, runBob);
    }

    ctx.restore();

    // 10. FLOATING SCORE TEXTS (+20, +50, +1 ❤️)
    floatingTextsRef.current.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    // 11. HUD: LIVES & ACTIVE BOOST
    ctx.save();
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let hearts = '';
    for (let l = 0; l < livesRef.current; l++) hearts += '❤️ ';
    ctx.fillText(hearts, 12, 12);

    if (isSuper) {
      // Golden dash banner in HUD
      ctx.fillStyle = '#854d0e';
      ctx.font = 'bold 11px sans-serif';
      const remainingSec = Math.ceil(p.superTimer / 60);
      ctx.fillText(`⚡ GOLDEN DASH: ${remainingSec}s`, 12, 34);
    }
    ctx.restore();
  };

  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    frameCountRef.current += 1;
    const isEasy = difficulty === 'easy';
    const isHard = difficulty === 'hard';

    // Update Distance & Score
    distanceRef.current += 1;
    const currentMeters = Math.floor(distanceRef.current / 8);
    if (distanceRef.current % 8 === 0) {
      setDistance(currentMeters);
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }

    // Check Zoo Milestones (50m, 100m, 175m, 250m)
    const milestones = [
      { m: 50, name: '🦁 Lion Ridge Passed!' },
      { m: 100, name: '🐼 Giant Panda Pavilion Reach!' },
      { m: 175, name: '🐘 Elephant Trails Explored!' },
      { m: 250, name: '🏆 Smithsonian Zoo Champion!' },
    ];
    for (const ms of milestones) {
      if (currentMeters >= ms.m && lastMilestoneRef.current < ms.m) {
        lastMilestoneRef.current = ms.m;
        setMilestoneBanner(ms.name);
        sounds.playMilestone();
        spawnSparkles(210, 100, '#fbbf24', 16);
        setTimeout(() => setMilestoneBanner(null), 3000);
      }
    }

    sceneryOffsetRef.current += speedRef.current;

    // Player Gravity & Jump Physics
    const p = playerRef.current;
    p.y += p.vy;
    p.vy += GRAVITY;

    // Rotation flip animation during somersault
    if (p.rotation !== 0) {
      p.rotation += 0.25;
      if (p.rotation >= Math.PI * 2) {
        p.rotation = 0;
      }
    }

    // Squash & Stretch decay back to 1
    p.squashStretch += (1 - p.squashStretch) * 0.15;

    // Timers
    if (p.coyoteTimer > 0) p.coyoteTimer -= 1;
    if (p.jumpBufferTimer > 0) p.jumpBufferTimer -= 1;
    if (p.invincibleTimer > 0) p.invincibleTimer -= 1;
    if (p.superTimer > 0) {
      p.superTimer -= 1;
      // Sparkle trail during Super Panda Dash
      if (frameCountRef.current % 3 === 0) {
        spawnSparkles(p.x + Math.random() * 20, p.y + Math.random() * 20, '#fbbf24', 2);
      }
      if (p.superTimer === 0) setIsSuperActive(false);
    }

    // Ground landing check
    if (p.y >= p.groundY) {
      const wasAirborne = p.isJumping;
      p.y = p.groundY;
      p.vy = 0;
      p.isJumping = false;
      p.rotation = 0;
      p.canDoubleJump = isEasy || difficulty === 'medium' || p.superTimer > 0;
      p.coyoteTimer = 6; // 6 frames coyote grace period

      if (wasAirborne) {
        p.squashStretch = 0.78; // land squash
        spawnDust(p.x + p.width / 2, p.y + p.height, 4, '#cbd5e1');

        // Check buffered jump (player tapped right before hitting ground)
        if (p.jumpBufferTimer > 0) {
          p.jumpBufferTimer = 0;
          triggerJump();
        }
      }
    }

    // Run footstep dust when moving on ground
    if (!p.isJumping && frameCountRef.current % 9 === 0) {
      spawnDust(p.x + 4, p.y + p.height - 2, 2, '#94a3b8');
    }

    // Spawn Obstacles (Balanced spacing so jumps are achievable and fun)
    const now = Date.now();
    const minObstacleGap = isEasy ? 2000 : isHard ? 1100 : 1500;
    if (now - lastObstacleSpawnRef.current > minObstacleGap && Math.random() < 0.05) {
      lastObstacleSpawnRef.current = now;
      const isAir = !isEasy && Math.random() < 0.32;
      obstaclesRef.current.push({
        id: nextIdRef.current++,
        x: 430,
        y: isAir ? 182 : 222, // Ground obstacle sits right on the path
        width: 28,
        height: 26,
        icon: isAir ? '🦅' : Math.random() > 0.5 ? '🐢' : '🪨',
        type: isAir ? 'air' : 'ground',
      });
    }

    // Spawn Snacks & Super Bamboo
    if (now - lastSnackSpawnRef.current > 700 && Math.random() < 0.08) {
      lastSnackSpawnRef.current = now;
      const snackY = Math.random() > 0.45 ? 205 : 160;
      const isHeart = livesRef.current < (isEasy ? 5 : 3) && Math.random() < 0.16;
      const isSuper = !isHeart && p.superTimer <= 0 && Math.random() < 0.07;

      snacksRef.current.push({
        id: nextIdRef.current++,
        x: 430,
        y: isSuper ? 175 : snackY,
        icon: isSuper ? '🌟🎋' : isHeart ? '💖' : Math.random() > 0.4 ? '🎋' : '🍎',
        points: isSuper ? 100 : isHeart ? 25 : 20,
        isHeart,
        isSuper,
      });
    }

    // Update & check Obstacles
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
      const obs = obstaclesRef.current[i];
      obs.x -= speedRef.current;

      // Forgiving, kid-friendly hitboxes
      const hitX = p.x + p.width - 6 > obs.x + 6 && p.x + 6 < obs.x + obs.width - 6;
      const hitY = p.y + p.height - 4 > obs.y + 4 && p.y + 4 < obs.y + obs.height;

      // If ducking, pass under air obstacles safely
      const safeDuck = p.isDucking && obs.type === 'air';

      if (hitX && hitY && !safeDuck && !obs.smashed) {
        if (p.superTimer > 0) {
          // Smash obstacle during Super Bamboo dash!
          obs.smashed = true;
          spawnSparkles(obs.x + 14, obs.y + 14, '#f59e0b', 8);
          sounds.playPop();
          scoreRef.current += 30;
          setScore(scoreRef.current);
          addFloatingText('+30 SMASH!', obs.x, obs.y - 10, '#f59e0b');
        } else if (p.invincibleTimer <= 0) {
          // Take damage
          sounds.playMiss();
          livesRef.current -= 1;
          p.invincibleTimer = 45; // brief invulnerability
          p.squashStretch = 0.8;
          spawnSparkles(p.x + p.width / 2, p.y + p.height / 2, '#ef4444', 8);
          obstaclesRef.current.splice(i, 1);

          if (livesRef.current <= 0) {
            stopGame();
            return;
          }
          continue;
        }
      }

      if (obs.x < -40) {
        obstaclesRef.current.splice(i, 1);
      }
    }

    // Update & check Snacks (with Golden Bamboo Magnet)
    for (let i = snacksRef.current.length - 1; i >= 0; i--) {
      const snk = snacksRef.current[i];

      // Magnet pull toward panda during Super Dash
      if (p.superTimer > 0) {
        const dx = p.x - snk.x;
        const dy = p.y - snk.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          snk.x += (dx / dist) * 7;
          snk.y += (dy / dist) * 7;
        }
      }

      snk.x -= speedRef.current;

      const hitX = p.x + p.width > snk.x - 16 && p.x < snk.x + 16;
      const hitY = p.y + p.height > snk.y - 16 && p.y < snk.y + 16;

      if (hitX && hitY) {
        if (snk.isSuper) {
          sounds.playSuperBamboo();
          p.superTimer = 360; // 6 seconds of Golden Dash!
          setIsSuperActive(true);
          spawnSparkles(snk.x, snk.y, '#eab308', 14);
          addFloatingText('⚡ GOLDEN DASH! +100', snk.x, snk.y - 15, '#eab308');
        } else if (snk.isHeart) {
          sounds.playPowerUp();
          const maxHearts = isEasy ? 5 : 4;
          livesRef.current = Math.min(maxHearts, livesRef.current + 1);
          spawnSparkles(snk.x, snk.y, '#f43f5e', 8);
          addFloatingText('+1 ❤️', snk.x, snk.y - 15, '#f43f5e');
        } else {
          sounds.playPop();
          spawnSparkles(snk.x, snk.y, '#10b981', 5);
          addFloatingText(`+${snk.points}`, snk.x, snk.y - 15, '#10b981');
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

    // Update Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const part = particlesRef.current[i];
      part.x += part.vx;
      part.y += part.vy;
      part.life += 1;
      part.alpha = 1 - part.life / part.maxLife;
      if (part.life >= part.maxLife) {
        particlesRef.current.splice(i, 1);
      }
    }

    // Update Floating Text
    for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
      const ft = floatingTextsRef.current[i];
      ft.y += ft.vy;
      ft.alpha -= 0.025;
      if (ft.alpha <= 0) {
        floatingTextsRef.current.splice(i, 1);
      }
    }

    drawScene(ctx);
    animIdRef.current = requestAnimationFrame(gameLoop);
  };

  const startGame = () => {
    const isEasy = difficulty === 'easy';
    const isHard = difficulty === 'hard';
    speedRef.current = isEasy ? 3.0 : isHard ? 4.8 : 3.8;
    livesRef.current = isEasy ? 5 : difficulty === 'medium' ? 4 : 3;
    scoreRef.current = 0;
    distanceRef.current = 0;
    lastMilestoneRef.current = 0;
    obstaclesRef.current = [];
    snacksRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    playerRef.current.y = 220;
    playerRef.current.vy = 0;
    playerRef.current.isJumping = false;
    playerRef.current.isDucking = false;
    playerRef.current.rotation = 0;
    playerRef.current.squashStretch = 1;
    playerRef.current.superTimer = 0;
    playerRef.current.invincibleTimer = 0;
    lastObstacleSpawnRef.current = Date.now();
    lastSnackSpawnRef.current = Date.now();
    setScore(0);
    setDistance(0);
    setGameOver(false);
    setIsSuperActive(false);
    setMilestoneBanner(null);
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
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        triggerJump();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        duck(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        cutJump();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
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
  }, [difficulty]);

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
                  {d === 'easy' ? 'Easy (Cub)' : d === 'medium' ? 'Medium' : 'Hard'}
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
          Tap or press <strong>Space / Up</strong> to hop (Tap lightly for small hop, hold to leap! Double-tap for somersault!). Press <strong>Down / Slide</strong> to duck under eagles!
        </p>

        {/* CANVAS WRAPPER */}
        <div className="relative max-w-md mx-auto rounded-2xl border-2 border-emerald-300 overflow-hidden shadow-inner h-[300px] bg-sky-50">
          <canvas
            ref={canvasRef}
            width={420}
            height={300}
            className="w-full h-full block cursor-pointer select-none"
            onPointerDown={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relY = e.clientY - rect.top;
              // If clicked in bottom 25%, duck/slide; otherwise jump!
              if (relY > rect.height * 0.75) {
                duck(true);
              } else {
                triggerJump();
              }
            }}
            onPointerUp={() => {
              cutJump();
              duck(false);
            }}
          />

          {/* CELEBRATION MILESTONE BANNER */}
          {milestoneBanner && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-black text-xs px-4 py-1.5 rounded-full shadow-lg border-2 border-white animate-bounce flex items-center gap-2 pointer-events-none">
              <span>🎉</span>
              <span>{milestoneBanner}</span>
            </div>
          )}

          {/* SUPER GOLDEN DASH GLOW EFFECT */}
          {isSuperActive && (
            <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow animate-pulse pointer-events-none">
              ⚡ BAMBOO MAGNET ON!
            </div>
          )}

          {/* OVERLAY: START OR GAME OVER */}
          {(!gameRunning || gameOver) && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
              <span className="text-5xl mb-2 animate-bounce">🐼</span>
              <h3 className="text-lg font-black">
                {gameOver ? `Zoo Dash Over! Distance: ${distance}m · Score: ${score}` : 'National Zoo Panda Dash'}
              </h3>
              <p className="text-xs text-slate-200 mt-1 mb-4 max-w-xs">
                {gameOver
                  ? distance >= 100
                    ? '🌟 Amazing run! Bao Li sprinted all the way across the National Zoo!'
                    : 'Great effort! Enter your name below to claim your spot on the leaderboard!'
                  : 'Bao Li is dashing through the National Zoo! Hop over turtles & rocks, duck under eagles, and grab Golden Bamboo treats!'}
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

        {/* LARGE TOUCH ACTION BUTTONS FOR KIDS */}
        <div className="mt-4 flex items-center justify-center gap-3 max-w-md mx-auto">
          <button
            onPointerDown={triggerJump}
            onPointerUp={cutJump}
            className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer select-none"
          >
            <span>⬆️ JUMP</span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-normal">
              {difficulty === 'easy' ? 'Double Leap' : 'Crisp Hop'}
            </span>
          </button>
          <button
            onPointerDown={() => duck(true)}
            onPointerUp={() => duck(false)}
            onPointerLeave={() => duck(false)}
            className="w-32 py-3.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer select-none"
          >
            <span>⬇️ SLIDE</span>
            <span className="text-[10px] opacity-80">💨</span>
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
