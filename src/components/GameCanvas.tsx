/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  TileType,
  TILE_SIZE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  Player,
  Companion,
  Enemy,
  Boss,
  Projectile,
  Particle,
  DamageText,
  DroppedItem,
  ItemDef,
} from '../types/game';
import { generateWorld, recomputeLighting, WorldData } from '../engine/world';
import { GameRenderer } from '../engine/renderer';
import { ITEMS } from '../engine/items';
import { INITIAL_COMPANIONS } from '../engine/companions';
import { createEnemy, createBoss, handleEnemySpawning, updateBossAI } from '../engine/enemies';
import { soundEngine } from '../audio/soundSystem';

interface GameCanvasProps {
  onOpenInventory: () => void;
  onOpenCrafting: () => void;
  onOpenCompanions: () => void;
  onTogglePause: () => void;
  playerState: Player;
  setPlayerState: React.Dispatch<React.SetStateAction<Player>>;
  companions: Companion[];
  setCompanions: React.Dispatch<React.SetStateAction<Companion[]>>;
  activeBoss: Boss | null;
  setActiveBoss: React.Dispatch<React.SetStateAction<Boss | null>>;
  notification: string | null;
  setNotification: (msg: string | null) => void;
  touchInput: { left: boolean; right: boolean; jump: boolean; attack: boolean; down: boolean };
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  onOpenInventory,
  onOpenCrafting,
  onOpenCompanions,
  onTogglePause,
  playerState,
  setPlayerState,
  companions,
  setCompanions,
  activeBoss,
  setActiveBoss,
  setNotification,
  touchInput,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core mutable game loop state kept in refs for pure 60fps performance without React re-render lags
  const worldRef = useRef<WorldData | null>(null);
  const playerRef = useRef<Player>(playerState);
  const companionsRef = useRef<Companion[]>(companions);
  const enemiesRef = useRef<Enemy[]>([]);
  const bossRef = useRef<Boss | null>(activeBoss);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const damageTextsRef = useRef<DamageText[]>([]);
  const droppedItemsRef = useRef<DroppedItem[]>([]);
  const dayNightCycleRef = useRef<number>(0.2); // Starts in afternoon
  const screenShakeRef = useRef<number>(0);

  // Input state
  const keysRef = useRef<Record<string, boolean>>({});
  const mouseRef = useRef<{
    screenX: number;
    screenY: number;
    worldX: number;
    worldY: number;
    leftDown: boolean;
    rightDown: boolean;
  }>({
    screenX: 0,
    screenY: 0,
    worldX: 0,
    worldY: 0,
    leftDown: false,
    rightDown: false,
  });

  // Keep state sync
  useEffect(() => {
    playerRef.current = playerState;
  }, [playerState]);

  useEffect(() => {
    companionsRef.current = companions;
  }, [companions]);

  useEffect(() => {
    bossRef.current = activeBoss;
  }, [activeBoss]);

  // Initial World Generation
  useEffect(() => {
    if (!worldRef.current) {
      const generated = generateWorld();
      worldRef.current = generated;

      // Position player at spawn
      setPlayerState((prev) => ({
        ...prev,
        x: generated.spawnX,
        y: generated.spawnY,
      }));
      playerRef.current.x = generated.spawnX;
      playerRef.current.y = generated.spawnY;

      // Position initial companions near world points
      const updatedCompanions = INITIAL_COMPANIONS.map((comp) => {
        const cage = generated.companionCagePositions.find((c) => c.companionId === comp.id);
        if (cage) {
          return {
            ...comp,
            x: cage.tx * TILE_SIZE + 8,
            y: cage.ty * TILE_SIZE + 8,
          };
        }
        return { ...comp, x: generated.spawnX, y: generated.spawnY };
      });
      setCompanions(updatedCompanions);
      companionsRef.current = updatedCompanions;

      // Give starter tools
      setPlayerState((prev) => {
        const inv = [...prev.inventory];
        inv[0] = { id: 'sword_wood', count: 1 };
        inv[1] = { id: 'pickaxe_wood', count: 1 };
        inv[2] = { id: 'axe_wood', count: 1 };
        inv[3] = { id: 'torch', count: 16 };
        inv[4] = { id: 'potion_health_small', count: 5 };
        inv[5] = { id: 'berry', count: 10 };
        return { ...prev, inventory: inv };
      });

      setNotification('Chào mừng đến với Terracraft! Khám phá, đào mỏ và giải cứu các đồng đội!');
    }
  }, []);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      keysRef.current[e.code] = true;

      // Number keys 1-9 for hotbar selection
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        setPlayerState((prev) => ({ ...prev, selectedHotbarIndex: num - 1 }));
      }

      // Hotkeys
      if (e.key === 'e' || e.key === 'E') {
        onOpenInventory();
      }
      if (e.key === 'c' || e.key === 'C') {
        onOpenCrafting();
      }
      if (e.key === 'v' || e.key === 'V') {
        onOpenCompanions();
      }
      if (e.key === 'Escape') {
        onTogglePause();
      }
      if (e.key === 'q' || e.key === 'Q') {
        // Quick heal potion
        quickHeal();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
      keysRef.current[e.code] = false;
    };

    const handleBlur = () => {
      keysRef.current = {};
      mouseRef.current.leftDown = false;
      mouseRef.current.rightDown = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Quick Heal from inventory
  const quickHeal = () => {
    const p = playerRef.current;
    if (p.hp >= p.maxHp) return;

    for (let i = 0; i < p.inventory.length; i++) {
      const slot = p.inventory[i];
      if (slot && (slot.id === 'potion_health_small' || slot.id === 'potion_health_large' || slot.id === 'berry')) {
        const itemDef = ITEMS[slot.id];
        const healAmt = itemDef.healHp || 20;
        p.hp = Math.min(p.maxHp, p.hp + healAmt);
        soundEngine.playHeal();

        // Spawn heal particles
        for (let k = 0; k < 10; k++) {
          particlesRef.current.push({
            x: p.x + p.width / 2,
            y: p.y + p.height / 2,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 3,
            color: '#48bb78',
            size: 3,
            life: 25,
            maxLife: 25,
          });
        }
        damageTextsRef.current.push({
          id: Math.random(),
          x: p.x + p.width / 2,
          y: p.y - 10,
          text: `+${healAmt} HP`,
          color: '#48bb78',
          crit: true,
          life: 40,
        });

        // Deduct item
        slot.count--;
        if (slot.count <= 0) p.inventory[i] = null;
        setPlayerState({ ...p });
        break;
      }
    }
  };

  // Main 60fps Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = new GameRenderer(ctx);
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const rawDt = (time - lastTime) / 1000;
      lastTime = time;
      const dt = Math.min(rawDt, 0.05); // Clamp dt to prevent tunneling on lag spike

      if (worldRef.current) {
        updateSimulation(dt);
        renderGame(renderer, canvas);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // --- Game Simulation Step ---
  const updateSimulation = (dt: number) => {
    const world = worldRef.current;
    if (!world) return;

    const p = playerRef.current;
    const keys = keysRef.current;

    // Advance day/night cycle
    dayNightCycleRef.current = (dayNightCycleRef.current + 0.00015) % 1;
    const isNight = dayNightCycleRef.current > 0.45 && dayNightCycleRef.current < 0.85;

    // Shake decay
    if (screenShakeRef.current > 0) {
      screenShakeRef.current *= 0.88;
      if (screenShakeRef.current < 0.2) screenShakeRef.current = 0;
    }

    // Invulnerability decay
    if (p.invulnerableTimer > 0) p.invulnerableTimer--;
    if (p.swingTimer > 0) p.swingTimer--;

    // Mana passive regen
    if (p.mana < p.maxMana && Math.random() < 0.15) {
      p.mana = Math.min(p.maxMana, p.mana + 1);
    }

    // 1. Player Controls & Horizontal Movement
    const moveLeft = keys['a'] || keys['arrowleft'] || touchInput.left;
    const moveRight = keys['d'] || keys['arrowright'] || touchInput.right;
    const moveJump = keys['w'] || keys[' '] || keys['arrowup'] || touchInput.jump;
    const moveDown = keys['s'] || keys['arrowdown'] || touchInput.down;

    const accel = 0.8;
    const maxSpeed = 3.8;
    const friction = 0.78;

    if (moveLeft) {
      p.vx = Math.max(-maxSpeed, p.vx - accel);
      p.facing = -1;
    } else if (moveRight) {
      p.vx = Math.min(maxSpeed, p.vx + accel);
      p.facing = 1;
    } else {
      p.vx *= friction;
      if (Math.abs(p.vx) < 0.1) p.vx = 0;
    }

    // Jumping
    if (moveJump && p.grounded) {
      p.vy = -6.4;
      p.grounded = false;
      soundEngine.playJump();
    }

    // Gravity
    p.vy = Math.min(10, p.vy + 0.32);

    // 2. Tile Collision & Physics for Player
    resolveTileCollisions(p, world, moveDown);

    // 3. Mouse / Touch continuous action (mining, attacking, building)
    handlePlayerActions(world, moveDown);

    // 4. Update Companions
    updateCompanionsAI(world);

    // 5. Update Ambient Enemies
    handleEnemySpawning(enemiesRef.current, bossRef.current, p.x, p.y, world.tiles, isNight);
    updateEnemies(world);

    // 6. Update Active Boss
    if (bossRef.current) {
      updateBossAI(
        bossRef.current,
        p.x,
        p.y,
        projectilesRef.current,
        particlesRef.current,
        enemiesRef.current
      );

      // Check Boss Defeat
      if (bossRef.current.hp <= 0) {
        handleBossDefeated(bossRef.current);
        bossRef.current = null;
        setActiveBoss(null);
      }
    }

    // 7. Update Projectiles
    updateProjectiles(world);

    // 8. Update Particles
    particlesRef.current.forEach((part) => {
      part.x += part.vx;
      part.y += part.vy;
      if (part.gravity) part.vy += part.gravity;
      part.life--;
    });
    particlesRef.current = particlesRef.current.filter((part) => part.life > 0);

    // 9. Update Damage Numbers
    damageTextsRef.current.forEach((dtText) => {
      dtText.y -= 0.6;
      dtText.life--;
    });
    damageTextsRef.current = damageTextsRef.current.filter((dtText) => dtText.life > 0);

    // 10. Update Dropped Items (Magnetic pickup)
    updateDroppedItems();

    // 11. Campfire Healing Aura Check
    checkCampfireAura(world);
  };

  // --- Tile Collisions ---
  const resolveTileCollisions = (entity: { x: number; y: number; vx: number; vy: number; width: number; height: number; grounded: boolean }, world: WorldData, dropPlatform: boolean) => {
    // Horizontal resolution
    entity.x += entity.vx;
    let minTX = Math.floor(entity.x / TILE_SIZE);
    let maxTX = Math.floor((entity.x + entity.width - 0.1) / TILE_SIZE);
    let minTY = Math.floor(entity.y / TILE_SIZE);
    let maxTY = Math.floor((entity.y + entity.height - 0.1) / TILE_SIZE);

    for (let ty = minTY; ty <= maxTY; ty++) {
      for (let tx = minTX; tx <= maxTX; tx++) {
        if (isSolidTile(world, tx, ty)) {
          if (entity.vx > 0) {
            entity.x = tx * TILE_SIZE - entity.width;
            entity.vx = 0;
          } else if (entity.vx < 0) {
            entity.x = (tx + 1) * TILE_SIZE;
            entity.vx = 0;
          }
        }
      }
    }

    // Vertical resolution
    entity.grounded = false;
    entity.y += entity.vy;
    minTX = Math.floor(entity.x / TILE_SIZE);
    maxTX = Math.floor((entity.x + entity.width - 0.1) / TILE_SIZE);
    minTY = Math.floor(entity.y / TILE_SIZE);
    maxTY = Math.floor((entity.y + entity.height - 0.1) / TILE_SIZE);

    for (let ty = minTY; ty <= maxTY; ty++) {
      for (let tx = minTX; tx <= maxTX; tx++) {
        const isSolid = isSolidTile(world, tx, ty);
        const isPlat = isPlatformTile(world, tx, ty);

        if (isSolid) {
          if (entity.vy > 0) {
            entity.y = ty * TILE_SIZE - entity.height;
            entity.vy = 0;
            entity.grounded = true;
          } else if (entity.vy < 0) {
            entity.y = (ty + 1) * TILE_SIZE;
            entity.vy = 0;
          }
        } else if (isPlat && !dropPlatform && entity.vy > 0) {
          const platTop = ty * TILE_SIZE;
          const prevBottom = entity.y + entity.height - entity.vy;
          if (prevBottom <= platTop + 4) {
            entity.y = platTop - entity.height;
            entity.vy = 0;
            entity.grounded = true;
          }
        }
      }
    }
  };

  const isSolidTile = (world: WorldData, tx: number, ty: number): boolean => {
    if (tx < 0 || tx >= world.width || ty < 0 || ty >= world.height) return true;
    const tile = world.tiles[ty * world.width + tx];
    return (
      tile !== TileType.AIR &&
      tile !== TileType.PLATFORM &&
      tile !== TileType.TORCH &&
      tile !== TileType.CAMPFIRE
    );
  };

  const isPlatformTile = (world: WorldData, tx: number, ty: number): boolean => {
    if (tx < 0 || tx >= world.width || ty < 0 || ty >= world.height) return false;
    return world.tiles[ty * world.width + tx] === TileType.PLATFORM;
  };

  // --- Player Actions: Mining / Attack / Placing / Using ---
  const handlePlayerActions = (world: WorldData, dropPlatform: boolean) => {
    const p = playerRef.current;
    const mouse = mouseRef.current;
    const isAttacking = mouse.leftDown || touchInput.attack;
    const isPlacing = mouse.rightDown;

    const currentItem = p.inventory[p.selectedHotbarIndex];
    const itemDef = currentItem ? ITEMS[currentItem.id] : null;

    // Calculate hover tile in world coords
    const tileX = Math.floor(mouse.worldX / TILE_SIZE);
    const tileY = Math.floor(mouse.worldY / TILE_SIZE);

    // Player reach limit (6 tiles distance)
    const pCenterTX = Math.floor((p.x + p.width / 2) / TILE_SIZE);
    const pCenterTY = Math.floor((p.y + p.height / 2) / TILE_SIZE);
    const inReach = Math.hypot(tileX - pCenterTX, tileY - pCenterTY) <= 6;

    // LEFT CLICK ACTION
    if (isAttacking) {
      if (itemDef) {
        // Weapon or Tool swinging
        if (p.swingTimer <= 0) {
          p.swingTimer = itemDef.useTime || 18;
          p.swingMax = p.swingTimer;

          if (itemDef.weaponType === 'sword') {
            soundEngine.playSwing();
            swingMeleeAttack(p, itemDef);
          } else if (itemDef.weaponType === 'bow') {
            soundEngine.playShoot();
            shootBow(p, itemDef, mouse.worldX, mouse.worldY);
          } else if (itemDef.weaponType === 'magic') {
            if (p.mana >= (itemDef.manaCost || 5)) {
              p.mana -= itemDef.manaCost || 5;
              soundEngine.playShoot();
              castMagic(p, itemDef, mouse.worldX, mouse.worldY);
            }
          } else if (itemDef.weaponType === 'boomerang') {
            soundEngine.playSwing();
            throwBoomerang(p, itemDef, mouse.worldX, mouse.worldY);
          } else if (itemDef.weaponType === 'bomb' && currentItem) {
            soundEngine.playSwing();
            throwBomb(p, itemDef, mouse.worldX, mouse.worldY);
            currentItem.count--;
            if (currentItem.count <= 0) p.inventory[p.selectedHotbarIndex] = null;
          } else if (itemDef.category === 'consumable' && currentItem) {
            useConsumable(p, currentItem, itemDef);
          } else if (itemDef.category === 'summon' && currentItem) {
            useSummonToken(p, currentItem, itemDef);
          }
        }

        // Mining / Chopping Tiles
        if (inReach && tileX >= 0 && tileX < world.width && tileY >= 0 && tileY < world.height) {
          const idx = tileY * world.width + tileX;
          const tile = world.tiles[idx];
          if (tile !== TileType.AIR) {
            handleTileMining(world, p, tileX, tileY, tile, itemDef);
          } else {
            p.isMining = false;
          }
        }
      } else {
        // Bare hands mining or hitting
        if (inReach && tileX >= 0 && tileX < world.width && tileY >= 0 && tileY < world.height) {
          const idx = tileY * world.width + tileX;
          const tile = world.tiles[idx];
          if (tile !== TileType.AIR) {
            handleTileMining(world, p, tileX, tileY, tile, null);
          }
        }
      }
    } else {
      p.isMining = false;
      p.miningProgress = 0;
    }

    // RIGHT CLICK ACTION: Place block or interact
    if (isPlacing && inReach && tileX >= 0 && tileX < world.width && tileY >= 0 && tileY < world.height) {
      const idx = tileY * world.width + tileX;
      const targetTile = world.tiles[idx];

      if (targetTile === TileType.AIR) {
        if (itemDef && itemDef.tileType !== undefined && currentItem) {
          // Check player intersection
          const pBox = { x: p.x, y: p.y, w: p.width, h: p.height };
          const tBox = { x: tileX * TILE_SIZE, y: tileY * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };
          const overlaps =
            itemDef.tileType !== TileType.TORCH &&
            itemDef.tileType !== TileType.PLATFORM &&
            itemDef.tileType !== TileType.CAMPFIRE &&
            pBox.x < tBox.x + tBox.w &&
            pBox.x + pBox.w > tBox.x &&
            pBox.y < tBox.y + tBox.h &&
            pBox.y + pBox.h > tBox.y;

          if (!overlaps) {
            world.tiles[idx] = itemDef.tileType;
            recomputeLighting(world.tiles, world.lightMap);
            soundEngine.playPlace();

            currentItem.count--;
            if (currentItem.count <= 0) p.inventory[p.selectedHotbarIndex] = null;
            mouse.rightDown = false; // Single place per click
          }
        }
      }
    }
  };

  // --- Tile Mining logic ---
  const handleTileMining = (
    world: WorldData,
    p: Player,
    tx: number,
    ty: number,
    tile: TileType,
    itemDef: ItemDef | null
  ) => {
    p.isMining = true;
    p.miningX = tx;
    p.miningY = ty;

    // Check cage rescue
    if (tile === TileType.CAGE) {
      freeTrappedCompanion(world, tx, ty);
      return;
    }

    // Speed calculation based on tool
    let mineSpeed = 0.05;
    const isPickaxe = itemDef?.pickaxePower;
    const isAxe = itemDef?.axePower;

    if (tile === TileType.WOOD || tile === TileType.LEAVES) {
      mineSpeed = isAxe ? 0.08 * (itemDef?.axePower || 1) : 0.04;
    } else if (tile === TileType.DIRT || tile === TileType.GRASS) {
      mineSpeed = 0.09 * (isPickaxe ? itemDef?.pickaxePower || 1 : 1);
    } else {
      // Stone & ores
      mineSpeed = isPickaxe ? 0.035 * (itemDef?.pickaxePower || 1) : 0.01;
    }

    p.miningProgress += mineSpeed;

    // Spawn mining chips & play audio
    if (Math.random() < 0.3) {
      if (tile === TileType.WOOD) soundEngine.playChop();
      else soundEngine.playMine();

      particlesRef.current.push({
        x: tx * TILE_SIZE + Math.random() * TILE_SIZE,
        y: ty * TILE_SIZE + Math.random() * TILE_SIZE,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 3,
        color: tile === TileType.WOOD ? '#8a5c36' : '#718096',
        size: 2,
        life: 15,
        maxLife: 15,
      });
    }

    // Break tile!
    if (p.miningProgress >= 1) {
      p.miningProgress = 0;
      p.isMining = false;
      const idx = ty * world.width + tx;
      world.tiles[idx] = TileType.AIR;
      recomputeLighting(world.tiles, world.lightMap);

      // Spawn drop item
      const dropItemId = getDropItemForTile(tile);
      if (dropItemId) {
        droppedItemsRef.current.push({
          id: Math.random(),
          itemId: dropItemId,
          count: 1,
          x: tx * TILE_SIZE + 8,
          y: ty * TILE_SIZE + 4,
          vx: (Math.random() - 0.5) * 2,
          vy: -3,
          life: 900,
        });
      }
    }
  };

  // Rescue companion from cage
  const freeTrappedCompanion = (world: WorldData, tx: number, ty: number) => {
    const idx = ty * world.width + tx;
    world.tiles[idx] = TileType.AIR;
    recomputeLighting(world.tiles, world.lightMap);

    // Find which companion was trapped here
    const cagePos = world.companionCagePositions.find((c) => c.tx === tx && c.ty === ty);
    const targetCompId = cagePos ? cagePos.companionId : 'companion_linh';

    setCompanions((prev) =>
      prev.map((comp) => {
        if (comp.id === targetCompId) {
          soundEngine.playRecruit();
          setNotification(`🎉 ĐÃ GIẢI CỨU THÀNH VIÊN MỚI: ${comp.name} (${comp.role})!`);
          return {
            ...comp,
            unlocked: true,
            recruited: true,
            state: 'follow',
            x: tx * TILE_SIZE,
            y: ty * TILE_SIZE,
          };
        }
        return comp;
      })
    );
  };

  const getDropItemForTile = (tile: TileType): string | null => {
    switch (tile) {
      case TileType.GRASS:
      case TileType.DIRT:
        return 'block_dirt';
      case TileType.STONE:
        return 'block_stone';
      case TileType.WOOD:
        return 'block_wood';
      case TileType.LEAVES:
        return Math.random() < 0.25 ? 'berry' : null;
      case TileType.WOOD_PLANK:
        return 'block_plank';
      case TileType.STONE_BRICK:
        return 'block_stone_brick';
      case TileType.PLATFORM:
        return 'block_platform';
      case TileType.TORCH:
        return 'torch';
      case TileType.CAMPFIRE:
        return 'campfire';
      case TileType.CRAFTING_TABLE:
        return 'crafting_table';
      case TileType.FURNACE:
        return 'furnace';
      case TileType.ANVIL:
        return 'anvil';
      case TileType.CHEST:
        return 'chest';
      case TileType.COPPER_ORE:
        return 'ore_copper';
      case TileType.IRON_ORE:
        return 'ore_iron';
      case TileType.GOLD_ORE:
        return 'ore_gold';
      case TileType.RUBY_ORE:
        return 'gem_ruby';
      case TileType.AMETHYST_ORE:
        return 'gem_amethyst';
      default:
        return null;
    }
  };

  // --- Weapon Swings & Combat ---
  const swingMeleeAttack = (p: Player, itemDef: ItemDef) => {
    const swingBox = {
      x: p.facing === 1 ? p.x + p.width : p.x - 32,
      y: p.y - 10,
      w: 36,
      h: p.height + 20,
    };

    let hitSomeone = false;
    const baseDamage = itemDef.damage || 8;
    const isCrit = Math.random() * 100 < (itemDef.critChance || 5);
    const finalDamage = Math.round(baseDamage * (isCrit ? 1.8 : 1.0));

    // Hit regular enemies
    enemiesRef.current.forEach((enemy) => {
      if (
        enemy.x < swingBox.x + swingBox.w &&
        enemy.x + enemy.width > swingBox.x &&
        enemy.y < swingBox.y + swingBox.h &&
        enemy.y + enemy.height > swingBox.y
      ) {
        hitSomeone = true;
        enemy.hp -= Math.max(1, finalDamage - enemy.defense);
        enemy.vx = p.facing * (itemDef.knockback || 5);
        enemy.vy = -3;
        enemy.hitFlashTimer = 6;
        soundEngine.playHit();

        damageTextsRef.current.push({
          id: Math.random(),
          x: enemy.x + enemy.width / 2,
          y: enemy.y - 10,
          text: `${finalDamage}`,
          color: isCrit ? '#f6e05e' : '#ffffff',
          crit: isCrit,
          life: 35,
        });

        // Spawn hit particles
        for (let i = 0; i < 6; i++) {
          particlesRef.current.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height / 2,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            color: '#e53e3e',
            size: 2,
            life: 15,
            maxLife: 15,
          });
        }
      }
    });

    // Hit active Boss
    const boss = bossRef.current;
    if (boss) {
      if (
        boss.x < swingBox.x + swingBox.w &&
        boss.x + boss.width > swingBox.x &&
        boss.y < swingBox.y + swingBox.h &&
        boss.y + boss.height > swingBox.y
      ) {
        hitSomeone = true;
        boss.hp -= finalDamage;
        boss.hitFlashTimer = 6;
        screenShakeRef.current = 4;
        soundEngine.playHit();

        damageTextsRef.current.push({
          id: Math.random(),
          x: boss.x + boss.width / 2 + (Math.random() - 0.5) * 20,
          y: boss.y - 12,
          text: `${finalDamage}`,
          color: isCrit ? '#f6e05e' : '#ffffff',
          crit: isCrit,
          life: 40,
        });
      }
    }

    // Sunfire blade special spark burst!
    if (itemDef.id === 'sword_sunfire') {
      projectilesRef.current.push({
        id: Math.random(),
        x: p.x + p.width / 2 + p.facing * 16,
        y: p.y + p.height / 2,
        vx: p.facing * 9,
        vy: 0,
        radius: 5,
        damage: 16,
        fromPlayer: true,
        color: '#e86a17',
        life: 45,
        maxLife: 45,
        type: 'fireball',
      });
    }
  };

  const shootBow = (p: Player, itemDef: ItemDef, targetX: number, targetY: number) => {
    const angle = Math.atan2(targetY - (p.y + p.height / 2), targetX - (p.x + p.width / 2));
    const speed = itemDef.projectileSpeed || 11;
    const isCrit = Math.random() * 100 < (itemDef.critChance || 10);
    const dmg = Math.round((itemDef.damage || 10) * (isCrit ? 1.7 : 1.0));

    projectilesRef.current.push({
      id: Math.random(),
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 4,
      damage: dmg,
      fromPlayer: true,
      color: itemDef.id === 'bow_phoenix' ? '#e05328' : '#8a5c36',
      life: 80,
      maxLife: 80,
      gravity: 0.1,
      type: 'arrow',
      piercing: itemDef.id === 'bow_phoenix' ? 3 : 1,
    });
  };

  const castMagic = (p: Player, itemDef: ItemDef, targetX: number, targetY: number) => {
    const angle = Math.atan2(targetY - (p.y + p.height / 2), targetX - (p.x + p.width / 2));
    const speed = itemDef.projectileSpeed || 8;
    const dmg = itemDef.damage || 15;

    if (itemDef.id === 'wand_starfall') {
      // Meteor drops from sky
      projectilesRef.current.push({
        id: Math.random(),
        x: targetX + (Math.random() - 0.5) * 40,
        y: p.y - 300,
        vx: (Math.random() - 0.5) * 2,
        vy: 12,
        radius: 7,
        damage: dmg,
        fromPlayer: true,
        color: '#ecc94b',
        life: 60,
        maxLife: 60,
        type: 'star',
      });
    } else {
      projectilesRef.current.push({
        id: Math.random(),
        x: p.x + p.width / 2,
        y: p.y + p.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 5,
        damage: dmg,
        fromPlayer: true,
        color: itemDef.iconColor,
        life: 70,
        maxLife: 70,
        type: itemDef.id === 'wand_nature' ? 'magic_spore' : 'fireball',
      });
    }
  };

  const throwBoomerang = (p: Player, itemDef: ItemDef, targetX: number, targetY: number) => {
    const angle = Math.atan2(targetY - (p.y + p.height / 2), targetX - (p.x + p.width / 2));
    const speed = itemDef.projectileSpeed || 8;

    projectilesRef.current.push({
      id: Math.random(),
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 6,
      damage: itemDef.damage || 12,
      fromPlayer: true,
      color: itemDef.iconColor,
      life: 60,
      maxLife: 60,
      type: 'boomerang',
      boomerangReturning: false,
    });
  };

  const throwBomb = (p: Player, itemDef: ItemDef, targetX: number, targetY: number) => {
    const angle = Math.atan2(targetY - (p.y + p.height / 2), targetX - (p.x + p.width / 2));
    projectilesRef.current.push({
      id: Math.random(),
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: Math.cos(angle) * 7,
      vy: Math.sin(angle) * 7 - 2,
      radius: 6,
      damage: 55,
      fromPlayer: true,
      color: '#2d3748',
      life: 75,
      maxLife: 75,
      gravity: 0.25,
      type: 'bomb',
    });
  };

  const useConsumable = (p: Player, slot: { id: string; count: number }, itemDef: ItemDef) => {
    let used = false;
    if (itemDef.healHp && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + itemDef.healHp);
      soundEngine.playHeal();
      damageTextsRef.current.push({
        id: Math.random(),
        x: p.x + p.width / 2,
        y: p.y - 12,
        text: `+${itemDef.healHp} HP`,
        color: '#48bb78',
        crit: true,
        life: 40,
      });
      used = true;
    }
    if (itemDef.healMana && p.mana < p.maxMana) {
      p.mana = Math.min(p.maxMana, p.mana + itemDef.healMana);
      soundEngine.playHeal();
      used = true;
    }

    if (used) {
      slot.count--;
      if (slot.count <= 0) p.inventory[p.selectedHotbarIndex] = null;
    }
  };

  // Boss summon
  const useSummonToken = (p: Player, slot: { id: string; count: number }, itemDef: ItemDef) => {
    if (bossRef.current) {
      setNotification('Một Boss khổng lồ đã đang xuất hiện rồi!');
      return;
    }
    if (itemDef.bossSummonId) {
      const newBoss = createBoss(itemDef.bossSummonId, p.x, p.y);
      bossRef.current = newBoss;
      setActiveBoss(newBoss);
      soundEngine.playBossRoar();
      soundEngine.startMusic(true);
      screenShakeRef.current = 8;
      setNotification(`⚠️ ${newBoss.name.toUpperCase()} ĐÃ XUẤT HIỆN!`);

      slot.count--;
      if (slot.count <= 0) p.inventory[p.selectedHotbarIndex] = null;
    }
  };

  // --- Update Projectiles ---
  const updateProjectiles = (world: WorldData) => {
    projectilesRef.current.forEach((proj) => {
      proj.x += proj.vx;
      proj.y += proj.vy;
      if (proj.gravity) proj.vy += proj.gravity;
      proj.life--;

      // Boomerang return logic
      if (proj.type === 'boomerang') {
        const p = playerRef.current;
        if (proj.life < proj.maxLife * 0.5) {
          proj.boomerangReturning = true;
          const dx = p.x + p.width / 2 - proj.x;
          const dy = p.y + p.height / 2 - proj.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 18) {
            proj.life = 0; // Caught back!
          } else {
            proj.vx = (dx / dist) * 9;
            proj.vy = (dy / dist) * 9;
          }
        }
      }

      // Bomb explosion logic
      if (proj.type === 'bomb' && proj.life <= 1) {
        soundEngine.playExplosion();
        screenShakeRef.current = 6;
        const blastRadius = 3;
        const centerTX = Math.floor(proj.x / TILE_SIZE);
        const centerTY = Math.floor(proj.y / TILE_SIZE);

        for (let ox = -blastRadius; ox <= blastRadius; ox++) {
          for (let oy = -blastRadius; oy <= blastRadius; oy++) {
            if (ox * ox + oy * oy <= blastRadius * blastRadius) {
              const bx = centerTX + ox;
              const by = centerTY + oy;
              if (bx >= 0 && bx < world.width && by >= 0 && by < world.height) {
                const idx = by * world.width + bx;
                const tile = world.tiles[idx];
                if (tile !== TileType.AIR && tile !== TileType.CAGE) {
                  world.tiles[idx] = TileType.AIR;
                  const drop = getDropItemForTile(tile);
                  if (drop && Math.random() < 0.6) {
                    droppedItemsRef.current.push({
                      id: Math.random(),
                      itemId: drop,
                      count: 1,
                      x: bx * TILE_SIZE + 8,
                      y: by * TILE_SIZE + 8,
                      vx: (Math.random() - 0.5) * 4,
                      vy: -4,
                      life: 900,
                    });
                  }
                }
              }
            }
          }
        }
        recomputeLighting(world.tiles, world.lightMap);
      }

      // Hit detection with regular enemies
      if (proj.fromPlayer) {
        enemiesRef.current.forEach((enemy) => {
          if (
            proj.life > 0 &&
            Math.hypot(enemy.x + enemy.width / 2 - proj.x, enemy.y + enemy.height / 2 - proj.y) <
              enemy.width / 2 + proj.radius
          ) {
            enemy.hp -= proj.damage;
            enemy.hitFlashTimer = 6;
            soundEngine.playHit();

            damageTextsRef.current.push({
              id: Math.random(),
              x: enemy.x + enemy.width / 2,
              y: enemy.y - 8,
              text: `${proj.damage}`,
              color: '#ffffff',
              crit: false,
              life: 30,
            });

            if (proj.piercing && proj.piercing > 1) {
              proj.piercing--;
            } else if (proj.type !== 'boomerang') {
              proj.life = 0;
            }
          }
        });

        // Hit active Boss
        const boss = bossRef.current;
        if (
          boss &&
          proj.life > 0 &&
          Math.hypot(boss.x + boss.width / 2 - proj.x, boss.y + boss.height / 2 - proj.y) <
            boss.width / 2 + proj.radius
        ) {
          boss.hp -= proj.damage;
          boss.hitFlashTimer = 6;
          soundEngine.playHit();

          damageTextsRef.current.push({
            id: Math.random(),
            x: boss.x + boss.width / 2 + (Math.random() - 0.5) * 20,
            y: boss.y - 10,
            text: `${proj.damage}`,
            color: '#f6e05e',
            crit: true,
            life: 35,
          });

          if (proj.piercing && proj.piercing > 1) {
            proj.piercing--;
          } else if (proj.type !== 'boomerang') {
            proj.life = 0;
          }
        }
      } else {
        // Hostile projectile hitting player
        const p = playerRef.current;
        if (
          p.invulnerableTimer <= 0 &&
          Math.hypot(p.x + p.width / 2 - proj.x, p.y + p.height / 2 - proj.y) <
            p.width / 2 + proj.radius
        ) {
          const totalDef = p.defense + (p.equippedArmor.chest ? 10 : 0);
          const dmg = Math.max(1, proj.damage - Math.floor(totalDef * 0.4));
          p.hp -= dmg;
          p.invulnerableTimer = 35;
          screenShakeRef.current = 5;
          soundEngine.playHit();

          damageTextsRef.current.push({
            id: Math.random(),
            x: p.x + p.width / 2,
            y: p.y - 12,
            text: `-${dmg}`,
            color: '#e53e3e',
            crit: false,
            life: 35,
          });
          proj.life = 0;

          if (p.hp <= 0) {
            handlePlayerDefeat();
          }
        }
      }
    });

    projectilesRef.current = projectilesRef.current.filter((p) => p.life > 0);
  };

  // --- Update Regular Enemies ---
  const updateEnemies = (world: WorldData) => {
    const p = playerRef.current;

    enemiesRef.current.forEach((enemy) => {
      enemy.aiTimer++;
      if (enemy.hitFlashTimer > 0) enemy.hitFlashTimer--;

      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const dist = Math.hypot(dx, dy);

      if (enemy.type === 'bat') {
        // Flying wavy path toward player
        enemy.vx = Math.sign(dx) * 1.8;
        enemy.vy = Math.sin(enemy.aiTimer * 0.08) * 1.5 + Math.sign(dy) * 0.8;
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
      } else {
        // Ground walker
        if (dist < 320) {
          enemy.facing = dx > 0 ? 1 : -1;
          enemy.vx = enemy.facing * 1.5;

          // Jump over obstacles
          const aheadTX = Math.floor((enemy.x + enemy.facing * 16) / TILE_SIZE);
          const aheadTY = Math.floor((enemy.y + enemy.height - 4) / TILE_SIZE);
          if (isSolidTile(world, aheadTX, aheadTY) && enemy.grounded) {
            enemy.vy = -5.5;
            enemy.grounded = false;
          }
        } else {
          enemy.vx *= 0.9;
        }

        enemy.vy = Math.min(8, enemy.vy + 0.3);
        resolveTileCollisions(enemy, world, false);
      }

      // Check contact damage with player
      if (
        p.invulnerableTimer <= 0 &&
        p.x < enemy.x + enemy.width &&
        p.x + p.width > enemy.x &&
        p.y < enemy.y + enemy.height &&
        p.y + p.height > enemy.y
      ) {
        const totalDef = p.defense + (p.equippedArmor.chest ? 10 : 0);
        const dmg = Math.max(1, enemy.damage - Math.floor(totalDef * 0.4));
        p.hp -= dmg;
        p.invulnerableTimer = 40;
        p.vx = Math.sign(p.x - enemy.x) * 4;
        p.vy = -3;
        screenShakeRef.current = 4;
        soundEngine.playHit();

        damageTextsRef.current.push({
          id: Math.random(),
          x: p.x + p.width / 2,
          y: p.y - 12,
          text: `-${dmg}`,
          color: '#e53e3e',
          crit: false,
          life: 35,
        });

        if (p.hp <= 0) {
          handlePlayerDefeat();
        }
      }
    });

    // Check enemy deaths and spawn loot
    enemiesRef.current = enemiesRef.current.filter((enemy) => {
      if (enemy.hp <= 0) {
        soundEngine.playHit();
        // Drop slime gel or feathers
        const lootId =
          enemy.type === 'bat'
            ? 'material_feather'
            : enemy.type === 'skeleton'
            ? 'ore_iron'
            : 'material_gel';
        droppedItemsRef.current.push({
          id: Math.random(),
          itemId: lootId,
          count: 1 + Math.floor(Math.random() * 3),
          x: enemy.x + enemy.width / 2,
          y: enemy.y + enemy.height / 2,
          vx: (Math.random() - 0.5) * 3,
          vy: -3,
          life: 900,
        });
        return false;
      }
      return true;
    });
  };

  // --- Update Companions AI ---
  const updateCompanionsAI = (world: WorldData) => {
    const p = playerRef.current;

    companionsRef.current.forEach((comp) => {
      if (!comp.unlocked || !comp.recruited) return;

      if (comp.attackCooldown > 0) comp.attackCooldown--;

      const targetX = comp.state === 'guard' && comp.guardX ? comp.guardX : p.x - p.facing * 30;
      const targetY = comp.state === 'guard' && comp.guardY ? comp.guardY : p.y;
      const dx = targetX - comp.x;
      const dist = Math.hypot(dx, targetY - comp.y);

      // Follow player movement
      if (dist > 450) {
        // Teleport if fell too far behind
        comp.x = p.x;
        comp.y = p.y;
        comp.vx = 0;
        comp.vy = 0;
      } else if (Math.abs(dx) > 35) {
        comp.facing = dx > 0 ? 1 : -1;
        comp.vx = comp.facing * 2.5;

        // Jump over blocks
        const aheadTX = Math.floor((comp.x + comp.facing * 16) / TILE_SIZE);
        const aheadTY = Math.floor((comp.y + 10) / TILE_SIZE);
        if (isSolidTile(world, aheadTX, aheadTY)) {
          comp.vy = -5.8;
        }
      } else {
        comp.vx *= 0.8;
      }

      comp.vy = Math.min(8, comp.vy + 0.3);
      comp.x += comp.vx;
      comp.y += comp.vy;
      // Resolve companion collisions lightly
      const groundTY = Math.floor((comp.y + 16) / TILE_SIZE);
      const groundTX = Math.floor(comp.x / TILE_SIZE);
      if (isSolidTile(world, groundTX, groundTY)) {
        comp.y = groundTY * TILE_SIZE - 16;
        comp.vy = 0;
      }

      // Action based on companion type
      if (comp.attackCooldown <= 0) {
        if (comp.id === 'companion_linh') {
          // Linh shoots nearest enemy
          const target = findNearestTarget(comp.x, comp.y, 280);
          if (target) {
            comp.attackCooldown = 80;
            const angle = Math.atan2(target.y - comp.y, target.x - comp.x);
            projectilesRef.current.push({
              id: Math.random(),
              x: comp.x,
              y: comp.y - 6,
              vx: Math.cos(angle) * 10,
              vy: Math.sin(angle) * 10,
              radius: 3,
              damage: 16,
              fromPlayer: true,
              color: '#48bb78',
              life: 60,
              maxLife: 60,
              type: 'arrow',
            });
            soundEngine.playShoot();
          }
        } else if (comp.id === 'companion_goran') {
          // Goran strikes nearby enemy
          const target = findNearestTarget(comp.x, comp.y, 60);
          if (target) {
            comp.attackCooldown = 65;
            soundEngine.playSwing();
            if ('hp' in target) {
              target.hp -= 26;
              damageTextsRef.current.push({
                id: Math.random(),
                x: target.x,
                y: target.y - 10,
                text: '26 (Goran)',
                color: '#ed8936',
                crit: true,
                life: 35,
              });
            }
          }
        } else if (comp.id === 'companion_mai') {
          // Mai heals player and team
          if (p.hp < p.maxHp) {
            comp.attackCooldown = 180;
            p.hp = Math.min(p.maxHp, p.hp + 18);
            soundEngine.playHeal();
            damageTextsRef.current.push({
              id: Math.random(),
              x: p.x + p.width / 2,
              y: p.y - 10,
              text: '+18 HP (Mai)',
              color: '#38b2ac',
              crit: true,
              life: 35,
            });
          }
        } else if (comp.id === 'companion_bobi') {
          // Bobi tackles enemy or gathers distant items
          const target = findNearestTarget(comp.x, comp.y, 120);
          if (target) {
            comp.attackCooldown = 70;
            comp.vx = Math.sign(target.x - comp.x) * 6;
            comp.vy = -4;
            if ('hp' in target) {
              target.hp -= 12;
            }
          }
        }
      }
    });
  };

  const findNearestTarget = (x: number, y: number, maxDist: number) => {
    let closest: Enemy | Boss | null = null;
    let minDist = maxDist;

    // Check boss first
    const boss = bossRef.current;
    if (boss) {
      const d = Math.hypot(boss.x + boss.width / 2 - x, boss.y + boss.height / 2 - y);
      if (d < minDist) {
        minDist = d;
        closest = boss;
      }
    }

    enemiesRef.current.forEach((enemy) => {
      const d = Math.hypot(enemy.x + enemy.width / 2 - x, enemy.y + enemy.height / 2 - y);
      if (d < minDist) {
        minDist = d;
        closest = enemy;
      }
    });

    return closest;
  };

  // --- Dropped Items Magnet Pickup ---
  const updateDroppedItems = () => {
    const p = playerRef.current;
    const hasBobi = companionsRef.current.some((c) => c.id === 'companion_bobi' && c.unlocked);
    const pickupRadius = hasBobi ? 120 : 55; // Bobi extends pickup radius!

    droppedItemsRef.current.forEach((item) => {
      item.x += item.vx;
      item.y += item.vy;
      item.vy = Math.min(6, item.vy + 0.25);
      item.life--;

      const dx = p.x + p.width / 2 - item.x;
      const dy = p.y + p.height / 2 - item.y;
      const dist = Math.hypot(dx, dy);

      if (dist < pickupRadius) {
        // Magnet suction
        item.vx += (dx / dist) * 1.5;
        item.vy += (dy / dist) * 1.5;

        if (dist < 18) {
          // Picked up!
          addItemToInventory(item.itemId, item.count);
          soundEngine.playPickup();
          item.life = 0;
        }
      } else {
        item.vx *= 0.9;
      }
    });

    droppedItemsRef.current = droppedItemsRef.current.filter((item) => item.life > 0);
  };

  const addItemToInventory = (itemId: string, count: number) => {
    const p = playerRef.current;
    const itemDef = ITEMS[itemId];
    if (!itemDef) return;

    // Try stacking first
    if (itemDef.stackable) {
      for (let i = 0; i < p.inventory.length; i++) {
        const slot = p.inventory[i];
        if (slot && slot.id === itemId && slot.count < itemDef.maxStack) {
          const space = itemDef.maxStack - slot.count;
          const add = Math.min(space, count);
          slot.count += add;
          count -= add;
          if (count <= 0) {
            setPlayerState({ ...p });
            return;
          }
        }
      }
    }

    // Put in empty slot
    for (let i = 0; i < p.inventory.length; i++) {
      if (!p.inventory[i]) {
        p.inventory[i] = { id: itemId, count };
        setPlayerState({ ...p });
        return;
      }
    }
  };

  // --- Campfire Aura check ---
  const checkCampfireAura = (world: WorldData) => {
    const p = playerRef.current;
    if (Math.random() < 0.05) {
      const pTX = Math.floor(p.x / TILE_SIZE);
      const pTY = Math.floor(p.y / TILE_SIZE);

      for (let ox = -7; ox <= 7; ox++) {
        for (let oy = -7; oy <= 7; oy++) {
          const tx = pTX + ox;
          const ty = pTY + oy;
          if (tx >= 0 && tx < world.width && ty >= 0 && ty < world.height) {
            if (world.tiles[ty * world.width + tx] === TileType.CAMPFIRE) {
              if (p.hp < p.maxHp) {
                p.hp = Math.min(p.maxHp, p.hp + 2);
                particlesRef.current.push({
                  x: p.x + Math.random() * p.width,
                  y: p.y - 4,
                  vx: (Math.random() - 0.5) * 1.5,
                  vy: -1.5,
                  color: '#dd6b20',
                  size: 2,
                  life: 20,
                  maxLife: 20,
                });
              }
              return;
            }
          }
        }
      }
    }
  };

  // --- Boss Defeated ---
  const handleBossDefeated = (boss: Boss) => {
    soundEngine.playBossDefeat();
    soundEngine.startMusic(false);
    screenShakeRef.current = 10;
    setNotification(`🏆 CHIẾN THẮNG! BẠN ĐÃ ĐÁNH BẠI ${boss.name.toUpperCase()}!`);

    // Huge explosion particles
    for (let i = 0; i < 40; i++) {
      particlesRef.current.push({
        x: boss.x + boss.width / 2,
        y: boss.y + boss.height / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        color: '#ecc94b',
        size: 4 + Math.random() * 4,
        life: 45,
        maxLife: 45,
      });
    }

    // Epic Boss Loot Drop
    if (boss.id === 'boss_slime_king') {
      droppedItemsRef.current.push(
        { id: Math.random(), itemId: 'material_gel', count: 40, x: boss.x, y: boss.y, vx: -2, vy: -4, life: 900 },
        { id: Math.random(), itemId: 'gem_ruby', count: 2, x: boss.x + 10, y: boss.y, vx: 2, vy: -5, life: 900 },
        { id: Math.random(), itemId: 'potion_health_large', count: 3, x: boss.x - 10, y: boss.y, vx: 0, vy: -4, life: 900 }
      );
      // Unlock Bobi companion!
      setCompanions((prev) =>
        prev.map((c) => (c.id === 'companion_bobi' ? { ...c, unlocked: true, recruited: true } : c))
      );
    } else if (boss.id === 'boss_forest_watcher') {
      droppedItemsRef.current.push(
        { id: Math.random(), itemId: 'wand_nature', count: 1, x: boss.x, y: boss.y, vx: 0, vy: -5, life: 900 },
        { id: Math.random(), itemId: 'gem_amethyst', count: 3, x: boss.x + 10, y: boss.y, vx: 3, vy: -4, life: 900 },
        { id: Math.random(), itemId: 'potion_health_large', count: 5, x: boss.x - 10, y: boss.y, vx: -3, vy: -4, life: 900 }
      );
    } else if (boss.id === 'boss_earth_golem') {
      droppedItemsRef.current.push(
        { id: Math.random(), itemId: 'sword_sunfire', count: 1, x: boss.x, y: boss.y, vx: 0, vy: -5, life: 900 },
        { id: Math.random(), itemId: 'bar_gold', count: 15, x: boss.x + 10, y: boss.y, vx: 2, vy: -4, life: 900 },
        { id: Math.random(), itemId: 'armor_gold', count: 1, x: boss.x - 10, y: boss.y, vx: -2, vy: -4, life: 900 }
      );
    } else if (boss.id === 'boss_sky_drake') {
      droppedItemsRef.current.push(
        { id: Math.random(), itemId: 'bow_phoenix', count: 1, x: boss.x, y: boss.y, vx: 0, vy: -6, life: 900 },
        { id: Math.random(), itemId: 'sword_crystal', count: 1, x: boss.x + 15, y: boss.y, vx: 3, vy: -5, life: 900 },
        { id: Math.random(), itemId: 'bar_gold', count: 25, x: boss.x - 15, y: boss.y, vx: -3, vy: -5, life: 900 }
      );
    }
  };

  // Player Defeat Respawn
  const handlePlayerDefeat = () => {
    const p = playerRef.current;
    const world = worldRef.current;
    if (!world) return;

    soundEngine.playHit();
    setNotification('Bạn đã ngã xuống! Đang hồi sinh tại điểm xuất phát...');
    p.hp = p.maxHp;
    p.x = world.spawnX;
    p.y = world.spawnY;
    p.vx = 0;
    p.vy = 0;
    p.invulnerableTimer = 100;
  };

  // --- Render Frame ---
  const renderGame = (renderer: GameRenderer, canvas: HTMLCanvasElement) => {
    const world = worldRef.current;
    if (!world) return;

    // Viewport auto-resize
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    const mouse = mouseRef.current;
    const p = playerRef.current;
    const camX = Math.max(0, Math.min(world.width * TILE_SIZE - canvas.width, p.x + p.width / 2 - canvas.width / 2));
    const camY = Math.max(0, Math.min(world.height * TILE_SIZE - canvas.height, p.y + p.height / 2 - canvas.height / 2));

    // Update mouse world coordinates
    mouse.worldX = mouse.screenX + camX;
    mouse.worldY = mouse.screenY + camY;

    const hoverTX = Math.floor(mouse.worldX / TILE_SIZE);
    const hoverTY = Math.floor(mouse.worldY / TILE_SIZE);
    const pCenterTX = Math.floor((p.x + p.width / 2) / TILE_SIZE);
    const pCenterTY = Math.floor((p.y + p.height / 2) / TILE_SIZE);
    const canReach = Math.hypot(hoverTX - pCenterTX, hoverTY - pCenterTY) <= 6;

    renderer.render(
      canvas.width,
      canvas.height,
      world,
      p,
      companionsRef.current,
      enemiesRef.current,
      bossRef.current,
      projectilesRef.current,
      particlesRef.current,
      damageTextsRef.current,
      droppedItemsRef.current,
      dayNightCycleRef.current,
      hoverTX,
      hoverTY,
      canReach
    );
  };

  // Mouse Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    mouseRef.current.screenX = e.clientX;
    mouseRef.current.screenY = e.clientY;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) mouseRef.current.leftDown = true;
    if (e.button === 2) mouseRef.current.rightDown = true;
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) mouseRef.current.leftDown = false;
    if (e.button === 2) mouseRef.current.rightDown = false;
  };

  // Touch Handlers for mobile aiming
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      mouseRef.current.screenX = e.touches[0].clientX;
      mouseRef.current.screenY = e.touches[0].clientY;
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};
