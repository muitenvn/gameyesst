/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Enemy, Boss, Projectile, Particle, DamageText, DroppedItem, TileType, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../types/game';
import { soundEngine } from '../audio/soundSystem';

let enemyIdCounter = 1;
let projectileIdCounter = 1;
let particleIdCounter = 1;
let damageTextIdCounter = 1;
let dropIdCounter = 1;

export function createEnemy(type: Enemy['type'], x: number, y: number): Enemy {
  const configs: Record<Enemy['type'], { name: string; hp: number; damage: number; def: number; w: number; h: number; color: string }> = {
    slime: { name: 'Slime Xanh', hp: 25, damage: 6, def: 1, w: 20, h: 16, color: '#48bb78' },
    spiked_slime: { name: 'Slime Gai Rừng', hp: 40, damage: 10, def: 2, w: 22, h: 18, color: '#38a169' },
    bat: { name: 'Dơi Hang Động', hp: 20, damage: 8, def: 0, w: 18, h: 14, color: '#805ad5' },
    skeleton: { name: 'Bộ Xương Thợ Mỏ', hp: 55, damage: 14, def: 3, w: 18, h: 28, color: '#cbd5e0' },
    goblin: { name: 'Yêu Tinh Rừng', hp: 45, damage: 12, def: 2, w: 20, h: 26, color: '#d69e2e' },
  };

  const cfg = configs[type];
  return {
    id: enemyIdCounter++,
    type,
    name: cfg.name,
    x,
    y,
    vx: 0,
    vy: 0,
    width: cfg.w,
    height: cfg.h,
    hp: cfg.hp,
    maxHp: cfg.hp,
    damage: cfg.damage,
    defense: cfg.def,
    facing: 1,
    grounded: false,
    hitFlashTimer: 0,
    aiTimer: Math.floor(Math.random() * 60),
    color: cfg.color,
  };
}

export function createBoss(bossId: string, spawnX: number, spawnY: number): Boss {
  if (bossId === 'boss_slime_king') {
    return {
      id: 'boss_slime_king',
      name: 'Vua Slime Khổng Lồ',
      title: 'King Slime',
      x: spawnX,
      y: spawnY - 60,
      vx: 0,
      vy: 0,
      width: 58,
      height: 48,
      hp: 600,
      maxHp: 600,
      phase: 1,
      stateTimer: 0,
      state: 'idle',
      targetX: spawnX,
      targetY: spawnY,
      hitFlashTimer: 0,
      enraged: false,
    };
  }

  if (bossId === 'boss_forest_watcher') {
    return {
      id: 'boss_forest_watcher',
      name: 'Mắt Thần Rừng Xanh',
      title: 'Forest Watcher',
      x: spawnX,
      y: spawnY - 140,
      vx: 0,
      vy: 0,
      width: 52,
      height: 52,
      hp: 900,
      maxHp: 900,
      phase: 1,
      stateTimer: 0,
      state: 'hover',
      targetX: spawnX,
      targetY: spawnY,
      hitFlashTimer: 0,
      enraged: false,
    };
  }

  if (bossId === 'boss_earth_golem') {
    return {
      id: 'boss_earth_golem',
      name: 'Hộ Vệ Đất Cổ Đại',
      title: 'Ancient Earth Golem',
      x: spawnX,
      y: spawnY - 80,
      vx: 0,
      vy: 0,
      width: 64,
      height: 72,
      hp: 1300,
      maxHp: 1300,
      phase: 1,
      stateTimer: 0,
      state: 'idle',
      targetX: spawnX,
      targetY: spawnY,
      hitFlashTimer: 0,
      enraged: false,
      fists: [
        { x: spawnX - 50, y: spawnY - 40, vx: 0, vy: 0, state: 'orbit', timer: 0 },
        { x: spawnX + 50, y: spawnY - 40, vx: 0, vy: 0, state: 'orbit', timer: 30 },
      ],
    };
  }

  // Boss 4: Sky Drake (Rồng Lửa Bầu Trời)
  const segments = [];
  for (let i = 0; i < 12; i++) {
    segments.push({ x: spawnX - i * 22, y: spawnY - 150 });
  }

  return {
    id: 'boss_sky_drake',
    name: 'Rồng Lửa Bầu Trời',
    title: 'Ignis the Sky Drake',
    x: spawnX,
    y: spawnY - 150,
    vx: 3,
    vy: 0,
    width: 60,
    height: 40,
    hp: 1800,
    maxHp: 1800,
    phase: 1,
    stateTimer: 0,
    state: 'flying',
    targetX: spawnX,
    targetY: spawnY,
    hitFlashTimer: 0,
    enraged: false,
    segments,
  };
}

// Spawn ambient enemies based on player location & day/night
export function handleEnemySpawning(
  enemies: Enemy[],
  activeBoss: Boss | null,
  playerX: number,
  playerY: number,
  tiles: Uint8Array,
  isNight: boolean
) {
  if (activeBoss) return; // Don't crowd with regular enemies during boss fights
  if (enemies.length >= 8) return;

  if (Math.random() < 0.015) {
    const isUnderground = playerY > 55 * TILE_SIZE;
    const spawnSide = Math.random() < 0.5 ? -1 : 1;
    const spawnX = playerX + spawnSide * (350 + Math.random() * 200);

    const tileX = Math.floor(spawnX / TILE_SIZE);
    if (tileX < 5 || tileX >= WORLD_WIDTH - 5) return;

    if (isUnderground) {
      // Find cave floor or air for bat
      const type: Enemy['type'] = Math.random() < 0.4 ? 'bat' : 'skeleton';
      const enemyY = playerY + (Math.random() - 0.5) * 80;
      enemies.push(createEnemy(type, spawnX, enemyY));
    } else {
      // Find surface ground
      for (let ty = 20; ty < 60; ty++) {
        const idx = ty * WORLD_WIDTH + tileX;
        if (tiles[idx] !== TileType.AIR && tiles[idx] !== TileType.PLATFORM) {
          const spawnY = (ty - 2) * TILE_SIZE;
          const type: Enemy['type'] = isNight
            ? Math.random() < 0.5
              ? 'skeleton'
              : 'goblin'
            : Math.random() < 0.7
            ? 'slime'
            : 'spiked_slime';
          enemies.push(createEnemy(type, spawnX, spawnY));
          break;
        }
      }
    }
  }
}

// Boss AI Updates
export function updateBossAI(
  boss: Boss,
  playerX: number,
  playerY: number,
  projectiles: Projectile[],
  particles: Particle[],
  enemies: Enemy[]
) {
  boss.stateTimer++;
  if (boss.hitFlashTimer > 0) boss.hitFlashTimer--;

  // Check enrage threshold at 50% HP
  if (boss.hp < boss.maxHp * 0.5 && !boss.enraged) {
    boss.enraged = true;
    soundEngine.playBossRoar();
    // Burst particles
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: boss.x + boss.width / 2,
        y: boss.y + boss.height / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        color: '#f56565',
        size: 4 + Math.random() * 3,
        life: 30,
        maxLife: 30,
      });
    }
  }

  // === BOSS 1: KING SLIME ===
  if (boss.id === 'boss_slime_king') {
    const dx = playerX - (boss.x + boss.width / 2);

    if (boss.state === 'idle') {
      boss.vx *= 0.85;
      if (boss.stateTimer > 70) {
        boss.state = 'charge';
        boss.stateTimer = 0;
      }
    } else if (boss.state === 'charge') {
      // Squash windup
      if (boss.stateTimer > 35) {
        // High Leap!
        soundEngine.playJump();
        const leapSpeed = boss.enraged ? 8.5 : 7.0;
        boss.vx = Math.sign(dx) * leapSpeed;
        boss.vy = boss.enraged ? -14 : -12;
        boss.state = 'jump';
        boss.stateTimer = 0;
      }
    } else if (boss.state === 'jump') {
      boss.vy += 0.45; // gravity
      boss.x += boss.vx;
      boss.y += boss.vy;

      // Ground slam check
      if (boss.vy > 0 && boss.y > playerY - 10) {
        boss.y = playerY - 10;
        boss.vy = 0;
        boss.vx = 0;
        boss.state = 'idle';
        boss.stateTimer = 0;
        soundEngine.playExplosion();

        // Spawn mini slimes occasionally when stomping
        if (enemies.length < 5 && Math.random() < 0.6) {
          enemies.push(createEnemy('slime', boss.x - 20, boss.y));
          enemies.push(createEnemy('slime', boss.x + boss.width + 10, boss.y));
        }

        // Particle shockwave
        for (let i = 0; i < 15; i++) {
          particles.push({
            x: boss.x + boss.width / 2,
            y: boss.y + boss.height,
            vx: (Math.random() - 0.5) * 6,
            vy: -Math.random() * 4,
            color: '#48bb78',
            size: 3 + Math.random() * 3,
            life: 25,
            maxLife: 25,
          });
        }
      }
    }
    return;
  }

  // === BOSS 2: FOREST WATCHER (EYE) ===
  if (boss.id === 'boss_forest_watcher') {
    const targetX = playerX;
    const targetY = playerY - 100;
    const dx = targetX - (boss.x + boss.width / 2);
    const dy = targetY - (boss.y + boss.height / 2);

    if (boss.state === 'hover') {
      // Smooth floating hover
      boss.vx += (dx * 0.03 - boss.vx) * 0.1;
      boss.vy += (dy * 0.03 - boss.vy) * 0.1;
      boss.x += boss.vx;
      boss.y += boss.vy;

      // Shoot thorns periodically
      const shootInterval = boss.enraged ? 60 : 90;
      if (boss.stateTimer % shootInterval === 0) {
        soundEngine.playShoot();
        const angle = Math.atan2(playerY - boss.y, playerX - boss.x);
        projectiles.push({
          id: projectileIdCounter++,
          x: boss.x + boss.width / 2,
          y: boss.y + boss.height / 2,
          vx: Math.cos(angle) * 5,
          vy: Math.sin(angle) * 5,
          radius: 4,
          damage: 14,
          fromPlayer: false,
          color: '#48bb78',
          life: 80,
          maxLife: 80,
          type: 'boss_thorn',
        });
      }

      if (boss.stateTimer > 200) {
        boss.state = 'dash_windup';
        boss.stateTimer = 0;
      }
    } else if (boss.state === 'dash_windup') {
      boss.vx *= 0.9;
      boss.vy *= 0.9;
      if (boss.stateTimer > 40) {
        soundEngine.playBossRoar();
        const angle = Math.atan2(playerY - boss.y, playerX - boss.x);
        const dashSpeed = boss.enraged ? 13 : 9.5;
        boss.vx = Math.cos(angle) * dashSpeed;
        boss.vy = Math.sin(angle) * dashSpeed;
        boss.state = 'dash';
        boss.stateTimer = 0;
      }
    } else if (boss.state === 'dash') {
      boss.x += boss.vx;
      boss.y += boss.vy;
      boss.vx *= 0.97;
      boss.vy *= 0.97;

      if (boss.stateTimer > 45) {
        boss.state = 'hover';
        boss.stateTimer = 0;
      }
    }
    return;
  }

  // === BOSS 3: ANCIENT EARTH GOLEM ===
  if (boss.id === 'boss_earth_golem') {
    const dx = playerX - (boss.x + boss.width / 2);
    // Slow walking towards player
    boss.vx = Math.sign(dx) * 1.0;
    boss.x += boss.vx;

    // Manage orbiting fists
    if (boss.fists) {
      boss.fists.forEach((fist, idx) => {
        fist.timer++;
        if (fist.state === 'orbit') {
          const orbitAngle = (boss.stateTimer * 0.05) + idx * Math.PI;
          const desiredX = boss.x + boss.width / 2 + Math.cos(orbitAngle) * 45;
          const desiredY = boss.y + 20 + Math.sin(orbitAngle) * 25;
          fist.x += (desiredX - fist.x) * 0.2;
          fist.y += (desiredY - fist.y) * 0.2;

          if (fist.timer > (boss.enraged ? 100 : 160)) {
            fist.state = 'punch';
            fist.timer = 0;
            const angle = Math.atan2(playerY - fist.y, playerX - fist.x);
            fist.vx = Math.cos(angle) * 8;
            fist.vy = Math.sin(angle) * 8;
            soundEngine.playSwing();
          }
        } else if (fist.state === 'punch') {
          fist.x += fist.vx;
          fist.y += fist.vy;
          if (fist.timer > 30) {
            fist.state = 'return';
            fist.timer = 0;
          }
        } else if (fist.state === 'return') {
          const targetX = boss.x + (idx === 0 ? -20 : boss.width + 20);
          const targetY = boss.y + 20;
          fist.x += (targetX - fist.x) * 0.12;
          fist.y += (targetY - fist.y) * 0.12;
          if (Math.hypot(targetX - fist.x, targetY - fist.y) < 15) {
            fist.state = 'orbit';
            fist.timer = 0;
          }
        }
      });
    }
    return;
  }

  // === BOSS 4: SKY DRAKE ===
  if (boss.id === 'boss_sky_drake') {
    // Flying wyrm looping in sine waves around player
    const targetX = playerX;
    const targetY = playerY - 80;
    const angleToTarget = Math.atan2(targetY - boss.y, targetX - boss.x);

    const speed = boss.enraged ? 7.0 : 5.5;
    boss.vx += Math.cos(angleToTarget) * 0.25;
    boss.vy += Math.sin(angleToTarget) * 0.25;

    // Clamp speed
    const currentSpeed = Math.hypot(boss.vx, boss.vy);
    if (currentSpeed > speed) {
      boss.vx = (boss.vx / currentSpeed) * speed;
      boss.vy = (boss.vy / currentSpeed) * speed;
    }

    boss.x += boss.vx;
    boss.y += boss.vy;

    // Follow segments
    if (boss.segments && boss.segments.length > 0) {
      let prevX = boss.x;
      let prevY = boss.y;
      for (let i = 0; i < boss.segments.length; i++) {
        const seg = boss.segments[i];
        const segDx = prevX - seg.x;
        const segDy = prevY - seg.y;
        const dist = Math.hypot(segDx, segDy);
        if (dist > 18) {
          seg.x += (segDx / dist) * (dist - 18);
          seg.y += (segDy / dist) * (dist - 18);
        }
        prevX = seg.x;
        prevY = seg.y;
      }
    }

    // Spit fireballs
    if (boss.stateTimer % (boss.enraged ? 70 : 100) === 0) {
      soundEngine.playShoot();
      const fireAngle = Math.atan2(playerY - boss.y, playerX - boss.x);
      projectiles.push({
        id: projectileIdCounter++,
        x: boss.x + boss.width / 2,
        y: boss.y + boss.height / 2,
        vx: Math.cos(fireAngle) * 6,
        vy: Math.sin(fireAngle) * 6,
        radius: 6,
        damage: 20,
        fromPlayer: false,
        color: '#ed8936',
        life: 90,
        maxLife: 90,
        type: 'fireball',
      });
    }
  }
}
