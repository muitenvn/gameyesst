/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
} from '../types/game';
import { WorldData } from './world';
import { ITEMS } from './items';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  public render(
    viewportWidth: number,
    viewportHeight: number,
    world: WorldData,
    player: Player,
    companions: Companion[],
    enemies: Enemy[],
    activeBoss: Boss | null,
    projectiles: Projectile[],
    particles: Particle[],
    damageTexts: DamageText[],
    droppedItems: DroppedItem[],
    dayNightCycle: number, // 0 to 1 (0 = noon, 0.5 = sunset, 0.75 = midnight, 1 = noon)
    hoverTileX: number | null,
    hoverTileY: number | null,
    canInteractWithHoverTile: boolean
  ) {
    const ctx = this.ctx;
    ctx.save();

    // Camera follow (center on player, clamped to world bounds)
    const camX = Math.max(0, Math.min(world.width * TILE_SIZE - viewportWidth, player.x + player.width / 2 - viewportWidth / 2));
    const camY = Math.max(0, Math.min(world.height * TILE_SIZE - viewportHeight, player.y + player.height / 2 - viewportHeight / 2));

    // 1. Draw Parallax Background (Sky / Mountains / Sun & Moon)
    this.drawBackground(viewportWidth, viewportHeight, camX, camY, dayNightCycle);

    // Apply Camera Transform
    ctx.translate(-Math.round(camX), -Math.round(camY));

    // Visible tile range
    const startTX = Math.max(0, Math.floor(camX / TILE_SIZE) - 1);
    const endTX = Math.min(world.width - 1, Math.ceil((camX + viewportWidth) / TILE_SIZE) + 1);
    const startTY = Math.max(0, Math.floor(camY / TILE_SIZE) - 1);
    const endTY = Math.min(world.height - 1, Math.ceil((camY + viewportHeight) / TILE_SIZE) + 1);

    // 2. Draw Background Walls (underground stone/dirt wallpaper)
    for (let ty = startTY; ty <= endTY; ty++) {
      for (let tx = startTX; tx <= endTX; tx++) {
        const idx = ty * world.width + tx;
        const wall = world.wallTiles[idx];
        const tile = world.tiles[idx];
        if (wall !== TileType.AIR && tile === TileType.AIR) {
          const light = Math.max(2, (world.lightMap[idx] || 0) * (dayNightCycle > 0.4 && dayNightCycle < 0.9 ? 0.6 : 1.0));
          const brightness = Math.min(1.0, 0.15 + (light / 15) * 0.4);
          this.drawWall(tx * TILE_SIZE, ty * TILE_SIZE, wall, brightness);
        }
      }
    }

    // 3. Draw Foreground Tiles (Grass, Dirt, Stone, Ores, Furniture)
    for (let ty = startTY; ty <= endTY; ty++) {
      for (let tx = startTX; tx <= endTX; tx++) {
        const idx = ty * world.width + tx;
        const tile = world.tiles[idx];
        if (tile !== TileType.AIR) {
          const rawLight = world.lightMap[idx] || 0;
          const isSunTime = dayNightCycle < 0.45 || dayNightCycle > 0.9;
          const light = Math.max(3, rawLight * (isSunTime ? 1.0 : 0.65));
          const brightness = Math.min(1.0, 0.2 + (light / 15) * 0.8);
          this.drawTile(tx * TILE_SIZE, ty * TILE_SIZE, tile, brightness, tx, ty);
        }
      }
    }

    // 4. Mining Progress Cracks
    if (player.isMining && player.miningProgress > 0) {
      this.drawMiningCracks(player.miningX * TILE_SIZE, player.miningY * TILE_SIZE, player.miningProgress);
    }

    // 5. Hover indicator
    if (hoverTileX !== null && hoverTileY !== null) {
      ctx.strokeStyle = canInteractWithHoverTile ? 'rgba(246, 224, 94, 0.7)' : 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hoverTileX * TILE_SIZE + 0.5, hoverTileY * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    }

    // 6. Dropped Items
    droppedItems.forEach((item) => this.drawDroppedItem(item));

    // 7. Recruited Companions
    companions.forEach((comp) => {
      if (comp.unlocked) {
        this.drawCompanion(comp);
      }
    });

    // 8. Player
    this.drawPlayer(player);

    // 9. Regular Enemies
    enemies.forEach((enemy) => this.drawEnemy(enemy));

    // 10. Active Boss
    if (activeBoss) {
      this.drawBoss(activeBoss);
    }

    // 11. Projectiles
    projectiles.forEach((proj) => this.drawProjectile(proj));

    // 12. Particles
    particles.forEach((part) => this.drawParticle(part));

    // 13. Damage Numbers & Floating Text
    damageTexts.forEach((dt) => this.drawDamageText(dt));

    ctx.restore();
  }

  // --- Background & Sky Parallax ---
  private drawBackground(w: number, h: number, camX: number, camY: number, cycle: number) {
    const ctx = this.ctx;

    // Day / Sunset / Night color blending
    let skyTop = '#5c94fc';
    let skyBottom = '#b8d5f8';
    let sunAlpha = 1;
    let moonAlpha = 0;

    if (cycle >= 0.4 && cycle < 0.6) {
      // Sunset / Dusk
      skyTop = '#52345e';
      skyBottom = '#d97d43';
      sunAlpha = Math.max(0, 1 - (cycle - 0.4) * 6);
      moonAlpha = Math.min(1, (cycle - 0.45) * 5);
    } else if (cycle >= 0.6 && cycle < 0.85) {
      // Midnight
      skyTop = '#0a0d18';
      skyBottom = '#181e30';
      sunAlpha = 0;
      moonAlpha = 1;
    } else if (cycle >= 0.85) {
      // Dawn / Sunrise
      skyTop = '#342f4c';
      skyBottom = '#e6985a';
      sunAlpha = (cycle - 0.85) * 6;
      moonAlpha = Math.max(0, 1 - (cycle - 0.85) * 7);
    }

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, skyTop);
    grad.addColorStop(1, skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Sun
    if (sunAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = sunAlpha;
      const sunX = (w * 0.25) - camX * 0.02;
      const sunY = 50 - camY * 0.02;
      ctx.fillStyle = '#fce570';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Moon & Stars
    if (moonAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = moonAlpha;
      const moonX = (w * 0.75) - camX * 0.02;
      const moonY = 45 - camY * 0.02;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 14, 0, Math.PI * 2);
      ctx.fill();

      // Twinkling stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 137.5) % w);
        const sy = ((i * 83.1) % (h * 0.6));
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.restore();
    }

    // Distant mountain layer (slow parallax)
    ctx.fillStyle = cycle > 0.5 ? '#151d20' : '#4d695b';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 40; x += 40) {
      const worldX = x + camX * 0.06;
      const mountainH = 60 + Math.sin(worldX * 0.008) * 35 + Math.cos(worldX * 0.02) * 20;
      ctx.lineTo(x, h - mountainH);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Near pine forest silhouette
    ctx.fillStyle = cycle > 0.5 ? '#111816' : '#2b4435';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 30; x += 25) {
      const worldX = x + camX * 0.12;
      const treeH = 30 + Math.sin(worldX * 0.03) * 18;
      ctx.lineTo(x, h - treeH);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  // --- Wall Rendering ---
  private drawWall(x: number, y: number, wall: TileType, brightness: number) {
    const ctx = this.ctx;
    ctx.save();
    let col = wall === TileType.DIRT ? '#382619' : '#2f343a';
    ctx.fillStyle = col;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Subtle brick mortar or earth speck
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
    ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);

    // Darken by lighting
    ctx.fillStyle = `rgba(0, 0, 0, ${1 - brightness})`;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.restore();
  }

  // --- Foreground Tile Rendering ---
  private drawTile(x: number, y: number, tile: TileType, brightness: number, tx: number, ty: number) {
    const ctx = this.ctx;
    ctx.save();

    switch (tile) {
      case TileType.GRASS: {
        // Top lush green with fringe, bottom rich dirt
        ctx.fillStyle = '#6b4d32'; // dirt
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#489c3b'; // green grass top
        ctx.fillRect(x, y, TILE_SIZE, 5);
        // Grassy pixel fringe
        ctx.fillStyle = '#3c8230';
        for (let i = 0; i < TILE_SIZE; i += 3) {
          ctx.fillRect(x + i, y + 4, 2, 2);
        }
        break;
      }
      case TileType.DIRT: {
        ctx.fillStyle = '#6b4d32';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        // Pebble speckles
        ctx.fillStyle = '#553c26';
        ctx.fillRect(x + 3, y + 4, 3, 2);
        ctx.fillRect(x + 10, y + 9, 2, 2);
        break;
      }
      case TileType.STONE: {
        ctx.fillStyle = '#585e64';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#44494f';
        ctx.fillRect(x + 2, y + 2, 5, 4);
        ctx.fillRect(x + 9, y + 8, 4, 5);
        ctx.fillStyle = '#737b82';
        ctx.fillRect(x + 8, y + 3, 2, 2);
        break;
      }
      case TileType.WOOD: {
        ctx.fillStyle = '#784d28';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        // Wood grain rings
        ctx.fillStyle = '#5c391b';
        ctx.fillRect(x + 2, y, 2, TILE_SIZE);
        ctx.fillRect(x + 10, y, 2, TILE_SIZE);
        break;
      }
      case TileType.LEAVES: {
        ctx.fillStyle = '#2f7d32';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#3e9c42';
        ctx.fillRect(x + 2, y + 2, 6, 6);
        ctx.fillStyle = '#225b24';
        ctx.fillRect(x + 9, y + 9, 5, 5);
        break;
      }
      case TileType.WOOD_PLANK: {
        ctx.fillStyle = '#b88956';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#8a5c36';
        ctx.fillRect(x, y + 7, TILE_SIZE, 1);
        ctx.fillRect(x + 7, y, 1, 7);
        break;
      }
      case TileType.STONE_BRICK: {
        ctx.fillStyle = '#757c85';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#4a5159';
        ctx.fillRect(x, y + 7, TILE_SIZE, 1);
        ctx.fillRect(x + (ty % 2 === 0 ? 7 : 0), y, 1, 7);
        break;
      }
      case TileType.COPPER_ORE: {
        ctx.fillStyle = '#585e64';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#c05621'; // Copper mineral
        ctx.fillRect(x + 3, y + 3, 4, 3);
        ctx.fillRect(x + 9, y + 8, 4, 4);
        break;
      }
      case TileType.IRON_ORE: {
        ctx.fillStyle = '#585e64';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#cbd5e0'; // Iron mineral
        ctx.fillRect(x + 4, y + 2, 4, 4);
        ctx.fillRect(x + 8, y + 9, 5, 4);
        break;
      }
      case TileType.GOLD_ORE: {
        ctx.fillStyle = '#585e64';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#ecc94b'; // Gold sparkle
        ctx.fillRect(x + 3, y + 4, 4, 4);
        ctx.fillRect(x + 9, y + 2, 3, 3);
        ctx.fillRect(x + 8, y + 10, 4, 3);
        break;
      }
      case TileType.RUBY_ORE: {
        ctx.fillStyle = '#585e64';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#e53e3e'; // Ruby gem
        ctx.fillRect(x + 4, y + 4, 5, 5);
        ctx.fillStyle = '#fed7d7';
        ctx.fillRect(x + 5, y + 5, 2, 2);
        break;
      }
      case TileType.AMETHYST_ORE: {
        ctx.fillStyle = '#585e64';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#9f7aea'; // Amethyst crystal
        ctx.fillRect(x + 3, y + 3, 5, 6);
        ctx.fillStyle = '#e9d8fd';
        ctx.fillRect(x + 4, y + 4, 2, 2);
        break;
      }
      case TileType.PLATFORM: {
        ctx.fillStyle = '#c99661';
        ctx.fillRect(x, y, TILE_SIZE, 4);
        ctx.fillStyle = '#8f6438';
        ctx.fillRect(x + 2, y + 4, 3, 5);
        ctx.fillRect(x + 11, y + 4, 3, 5);
        break;
      }
      case TileType.TORCH: {
        // Wooden base
        ctx.fillStyle = '#8a5c36';
        ctx.fillRect(x + 6, y + 6, 4, 10);
        // Warm flame
        ctx.fillStyle = '#f6ad55';
        ctx.fillRect(x + 5, y + 2, 6, 6);
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(x + 7, y + 1, 2, 4);
        break;
      }
      case TileType.CAMPFIRE: {
        // Crossed logs
        ctx.fillStyle = '#653818';
        ctx.fillRect(x + 1, y + 10, 14, 4);
        ctx.fillRect(x + 3, y + 8, 10, 3);
        // Crackling flame
        ctx.fillStyle = '#dd6b20';
        ctx.fillRect(x + 4, y + 3, 8, 7);
        ctx.fillStyle = '#fbd38d';
        ctx.fillRect(x + 6, y + 1, 4, 6);
        break;
      }
      case TileType.CRAFTING_TABLE: {
        ctx.fillStyle = '#975a16';
        ctx.fillRect(x + 1, y + 3, 14, 4);
        // Table legs
        ctx.fillRect(x + 2, y + 7, 3, 9);
        ctx.fillRect(x + 11, y + 7, 3, 9);
        // Tools on table
        ctx.fillStyle = '#cbd5e0';
        ctx.fillRect(x + 4, y + 1, 4, 2);
        break;
      }
      case TileType.FURNACE: {
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(x + 1, y + 1, 14, 15);
        // Oven opening with glowing coal
        ctx.fillStyle = '#dd6b20';
        ctx.fillRect(x + 4, y + 7, 8, 7);
        ctx.fillStyle = '#feebc8';
        ctx.fillRect(x + 6, y + 9, 4, 4);
        break;
      }
      case TileType.ANVIL: {
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(x + 1, y + 5, 14, 5);
        ctx.fillRect(x + 4, y + 10, 8, 6);
        ctx.fillRect(x + 2, y + 14, 12, 2);
        break;
      }
      case TileType.CHEST: {
        ctx.fillStyle = '#b7791f';
        ctx.fillRect(x + 1, y + 3, 14, 13);
        ctx.fillStyle = '#744210';
        ctx.fillRect(x + 1, y + 7, 14, 2);
        // Golden lock
        ctx.fillStyle = '#ecc94b';
        ctx.fillRect(x + 7, y + 6, 2, 4);
        break;
      }
      case TileType.CAGE: {
        // Iron bars rescue cage with trapped captive silhouette
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(x, y, TILE_SIZE, 2);
        ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
        ctx.fillRect(x, y, 2, TILE_SIZE);
        ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);
        // Vertical bars
        ctx.fillRect(x + 5, y, 2, TILE_SIZE);
        ctx.fillRect(x + 10, y, 2, TILE_SIZE);
        // Captive heart/friend indicator
        ctx.fillStyle = '#f56565';
        ctx.fillRect(x + 7, y + 6, 3, 4);
        break;
      }
    }

    // Apply lighting darkness
    if (tile !== TileType.TORCH && tile !== TileType.CAMPFIRE) {
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0, 1 - brightness)})`;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    }

    ctx.restore();
  }

  // --- Mining cracks ---
  private drawMiningCracks(x: number, y: number, progress: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const stage = Math.min(4, Math.floor(progress * 5));
    if (stage >= 0) {
      ctx.moveTo(x + 8, y + 8);
      ctx.lineTo(x + 3, y + 3);
    }
    if (stage >= 1) {
      ctx.moveTo(x + 8, y + 8);
      ctx.lineTo(x + 13, y + 5);
    }
    if (stage >= 2) {
      ctx.moveTo(x + 8, y + 8);
      ctx.lineTo(x + 5, y + 13);
    }
    if (stage >= 3) {
      ctx.moveTo(x + 8, y + 8);
      ctx.lineTo(x + 14, y + 12);
    }
    ctx.stroke();
    ctx.restore();
  }

  // --- Player ---
  private drawPlayer(p: Player) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(p.x + p.width / 2), Math.round(p.y + p.height / 2));

    if (p.invulnerableTimer > 0 && Math.floor(p.invulnerableTimer / 3) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    ctx.scale(p.facing, 1);

    // Body & clothing colors
    const skin = '#f6d8ae';
    const hair = '#5c391b';
    const shirt = p.equippedArmor.chest ? '#4a5568' : '#2b6cb0';
    const pants = '#2d3748';
    const boots = '#4a321a';

    // Bobbing walk offset
    const walkBob = Math.abs(p.vx) > 0.2 ? Math.sin(Date.now() * 0.015) * 1.5 : 0;

    // Legs
    ctx.fillStyle = pants;
    ctx.fillRect(-5, 4 + walkBob, 4, 8);
    ctx.fillRect(1, 4 - walkBob, 4, 8);
    ctx.fillStyle = boots;
    ctx.fillRect(-6, 10 + walkBob, 5, 3);
    ctx.fillRect(1, 10 - walkBob, 5, 3);

    // Torso / Shirt
    ctx.fillStyle = shirt;
    ctx.fillRect(-6, -4 + walkBob, 12, 9);
    // Belt
    ctx.fillStyle = '#8a5c36';
    ctx.fillRect(-6, 3 + walkBob, 12, 2);

    // Head
    ctx.fillStyle = skin;
    ctx.fillRect(-5, -13 + walkBob, 10, 9);
    // Eye
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(1, -10 + walkBob, 2, 2);
    // Hair
    ctx.fillStyle = hair;
    ctx.fillRect(-6, -15 + walkBob, 11, 4);
    ctx.fillRect(-6, -11 + walkBob, 3, 5);

    // Helmet if equipped
    if (p.equippedArmor.helmet) {
      ctx.fillStyle = '#a0aec0';
      ctx.fillRect(-6, -16 + walkBob, 12, 5);
      ctx.fillRect(2, -14 + walkBob, 4, 6);
    }

    // Active item swinging or holding
    const currentItem = p.inventory[p.selectedHotbarIndex];
    if (currentItem) {
      const itemDef = ITEMS[currentItem.id];
      if (itemDef) {
        ctx.save();
        ctx.translate(2, -1 + walkBob);

        let swingRot = 0;
        if (p.swingTimer > 0) {
          const swingProg = 1 - p.swingTimer / p.swingMax;
          swingRot = -Math.PI * 0.4 + swingProg * Math.PI * 0.9;
        }

        ctx.rotate(swingRot);

        // Draw weapon / tool
        if (itemDef.weaponType === 'sword' || itemDef.category === 'tool') {
          ctx.fillStyle = itemDef.iconColor;
          ctx.fillRect(2, -12, 4, 14); // Blade
          ctx.fillStyle = '#653818';
          ctx.fillRect(1, 2, 6, 2); // Crossguard
          ctx.fillRect(3, 4, 2, 4); // Handle

          // Weapon swing arc trail
          if (p.swingTimer > 0) {
            ctx.strokeStyle = itemDef.iconColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 16, -Math.PI * 0.4, Math.PI * 0.3);
            ctx.stroke();
          }
        } else if (itemDef.weaponType === 'bow') {
          ctx.strokeStyle = itemDef.iconColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(4, 0, 9, -Math.PI * 0.4, Math.PI * 0.4);
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(10, -7);
          ctx.lineTo(p.swingTimer > 0 ? 0 : 4, 0);
          ctx.lineTo(10, 7);
          ctx.stroke();
        } else if (itemDef.weaponType === 'magic') {
          ctx.fillStyle = '#8a5c36';
          ctx.fillRect(3, -12, 3, 16);
          ctx.fillStyle = itemDef.iconColor;
          ctx.beginPath();
          ctx.arc(4.5, -13, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Block / item held
          ctx.fillStyle = itemDef.iconColor;
          ctx.fillRect(4, -4, 8, 8);
        }
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // --- Companions ---
  private drawCompanion(c: Companion) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(c.x), Math.round(c.y));

    // Bobi the friendly slime
    if (c.id === 'companion_bobi') {
      const squish = Math.sin(Date.now() * 0.008) * 2;
      ctx.fillStyle = '#ecc94b';
      ctx.beginPath();
      ctx.ellipse(0, 4, 11 + squish, 9 - squish, 0, 0, Math.PI * 2);
      ctx.fill();

      // Slime smiling face
      ctx.fillStyle = '#744210';
      ctx.fillRect(-4, 2, 2, 2);
      ctx.fillRect(2, 2, 2, 2);
      ctx.fillRect(-2, 5, 4, 1);

      // Party / friendship hat
      ctx.fillStyle = '#e53e3e';
      ctx.beginPath();
      ctx.moveTo(-3, -4);
      ctx.lineTo(3, -4);
      ctx.lineTo(0, -11);
      ctx.closePath();
      ctx.fill();

      // Name tag
      ctx.font = '10px "VT323", monospace';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText('Bobi ★', 0, -14);
      ctx.restore();
      return;
    }

    ctx.scale(c.facing, 1);
    const bob = Math.abs(c.vx) > 0.1 ? Math.sin(Date.now() * 0.015) * 1.5 : 0;

    // Body
    ctx.fillStyle = c.avatarColor;
    ctx.fillRect(-5, -6 + bob, 10, 10);
    // Pants
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(-4, 4 + bob, 3, 6);
    ctx.fillRect(1, 4 - bob, 3, 6);

    // Head
    ctx.fillStyle = '#f6d8ae';
    ctx.fillRect(-4, -14 + bob, 8, 8);
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(1, -11 + bob, 2, 2);

    // Companion specific hats/accessories
    if (c.id === 'companion_linh') {
      ctx.fillStyle = '#2f855a'; // Hunter green hood
      ctx.fillRect(-5, -16 + bob, 9, 4);
      ctx.fillStyle = '#b7791f'; // Bow
      ctx.fillRect(4, -6 + bob, 2, 10);
    } else if (c.id === 'companion_goran') {
      ctx.fillStyle = '#718096'; // Blacksmith beard
      ctx.fillRect(-1, -9 + bob, 4, 4);
      ctx.fillStyle = '#4a5568'; // Iron hammer
      ctx.fillRect(3, -10 + bob, 5, 4);
      ctx.fillRect(4, -6 + bob, 2, 10);
    } else if (c.id === 'companion_mai') {
      ctx.fillStyle = '#319795'; // Herbalist hair wreath
      ctx.fillRect(-5, -16 + bob, 10, 3);
      ctx.fillStyle = '#48bb78'; // Green herbal pouch
      ctx.fillRect(3, -4 + bob, 4, 4);
    }

    // Name tag & role
    ctx.restore();
    ctx.save();
    ctx.font = '11px "VT323", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(c.name, c.x, c.y - 20);

    // Small HP bar for companion
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(c.x - 12, c.y - 18, 24, 3);
    ctx.fillStyle = '#48bb78';
    ctx.fillRect(c.x - 12, c.y - 18, (c.hp / c.maxHp) * 24, 3);
    ctx.restore();
  }

  // --- Regular Enemies ---
  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(e.x + e.width / 2), Math.round(e.y + e.height / 2));

    if (e.hitFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-e.width / 2, -e.height / 2, e.width, e.height);
      ctx.restore();
      return;
    }

    ctx.scale(e.facing, 1);

    if (e.type === 'slime' || e.type === 'spiked_slime') {
      const squish = e.grounded ? 2 : -2;
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.ellipse(0, 2, e.width / 2 - squish, e.height / 2 + squish, 0, 0, Math.PI * 2);
      ctx.fill();

      // Slime eyes
      ctx.fillStyle = '#1c4532';
      ctx.fillRect(1, -2, 2, 3);
      ctx.fillRect(5, -2, 2, 3);

      // Spikes for spiked slime
      if (e.type === 'spiked_slime') {
        ctx.fillStyle = '#22543d';
        ctx.fillRect(-4, -e.height / 2 - 2, 2, 4);
        ctx.fillRect(2, -e.height / 2 - 4, 3, 5);
        ctx.fillRect(7, -e.height / 2 - 2, 2, 4);
      }
    } else if (e.type === 'bat') {
      const flap = Math.sin(Date.now() * 0.02) * 5;
      ctx.fillStyle = '#553c9a';
      // Body
      ctx.fillRect(-4, -4, 8, 8);
      // Wings
      ctx.beginPath();
      ctx.moveTo(-4, -2);
      ctx.lineTo(-12, -4 + flap);
      ctx.lineTo(-4, 4);
      ctx.moveTo(4, -2);
      ctx.lineTo(12, -4 + flap);
      ctx.lineTo(4, 4);
      ctx.fill();
      // Glowing red eyes
      ctx.fillStyle = '#e53e3e';
      ctx.fillRect(1, -2, 2, 2);
    } else if (e.type === 'skeleton') {
      ctx.fillStyle = '#cbd5e0';
      // Skull
      ctx.fillRect(-4, -12, 8, 7);
      ctx.fillStyle = '#1a202c';
      ctx.fillRect(0, -10, 2, 2); // Eye socket
      // Ribcage & spine
      ctx.fillStyle = '#a0aec0';
      ctx.fillRect(-3, -5, 6, 8);
      // Pickaxe in hand
      ctx.fillStyle = '#718096';
      ctx.fillRect(3, -6, 2, 10);
      ctx.fillRect(2, -8, 6, 2);
    } else if (e.type === 'goblin') {
      ctx.fillStyle = '#d69e2e'; // Goblin skin
      ctx.fillRect(-4, -10, 8, 7);
      // Pointy ear
      ctx.fillRect(-7, -9, 3, 2);
      // Leather tunic
      ctx.fillStyle = '#744210';
      ctx.fillRect(-5, -3, 10, 8);
      // Spear
      ctx.fillStyle = '#a0aec0';
      ctx.fillRect(4, -14, 2, 20);
      ctx.fillStyle = '#edf2f7';
      ctx.fillRect(3, -16, 4, 3);
    }

    ctx.restore();

    // Small HP Bar
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x, e.y - 8, e.width, 3);
    ctx.fillStyle = '#e53e3e';
    ctx.fillRect(e.x, e.y - 8, (e.hp / e.maxHp) * e.width, 3);
    ctx.restore();
  }

  // --- Bosses ---
  private drawBoss(b: Boss) {
    const ctx = this.ctx;
    ctx.save();

    if (b.hitFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.restore();
      return;
    }

    // === BOSS 1: KING SLIME ===
    if (b.id === 'boss_slime_king') {
      const squish = Math.sin(b.stateTimer * 0.1) * 3;
      // Giant royal slime body
      ctx.fillStyle = b.enraged ? '#38a169' : '#3182ce';
      ctx.beginPath();
      ctx.ellipse(
        b.x + b.width / 2,
        b.y + b.height / 2 + 4,
        b.width / 2 + squish,
        b.height / 2 - squish,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Inner gelatinous glow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.ellipse(
        b.x + b.width / 2 - 8,
        b.y + b.height / 2 - 6,
        b.width / 4,
        b.height / 4,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Big friendly/royal eyes
      ctx.fillStyle = '#1a365d';
      ctx.fillRect(b.x + b.width / 2 - 12, b.y + b.height / 2 - 4, 6, 8);
      ctx.fillRect(b.x + b.width / 2 + 6, b.y + b.height / 2 - 4, 6, 8);

      // Golden Crown with Ruby jewels
      const crownY = b.y - 12 - squish;
      ctx.fillStyle = '#ecc94b';
      ctx.beginPath();
      ctx.moveTo(b.x + b.width / 2 - 16, crownY + 12);
      ctx.lineTo(b.x + b.width / 2 - 16, crownY);
      ctx.lineTo(b.x + b.width / 2 - 8, crownY + 5);
      ctx.lineTo(b.x + b.width / 2, crownY - 4);
      ctx.lineTo(b.x + b.width / 2 + 8, crownY + 5);
      ctx.lineTo(b.x + b.width / 2 + 16, crownY);
      ctx.lineTo(b.x + b.width / 2 + 16, crownY + 12);
      ctx.closePath();
      ctx.fill();

      // Crown Ruby Gem
      ctx.fillStyle = '#e53e3e';
      ctx.fillRect(b.x + b.width / 2 - 3, crownY + 4, 6, 6);
    }

    // === BOSS 2: FOREST WATCHER ===
    else if (b.id === 'boss_forest_watcher') {
      const centerX = b.x + b.width / 2;
      const centerY = b.y + b.height / 2;

      // Woody leafy outer iris
      ctx.fillStyle = b.enraged ? '#742a2a' : '#276749';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 24, 0, Math.PI * 2);
      ctx.fill();

      // Sclera
      ctx.fillStyle = '#f7fafc';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 18, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Iris
      ctx.fillStyle = b.enraged ? '#e53e3e' : '#38a169';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = '#1a202c';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Vine tendrils behind eye
      ctx.strokeStyle = '#22543d';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 + b.stateTimer * 0.05;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * 20, centerY + Math.sin(angle) * 20);
        ctx.lineTo(centerX + Math.cos(angle) * 36, centerY + Math.sin(angle) * 36);
        ctx.stroke();
      }
    }

    // === BOSS 3: ANCIENT EARTH GOLEM ===
    else if (b.id === 'boss_earth_golem') {
      // Chunky stone torso
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(b.x + 8, b.y + 12, b.width - 16, b.height - 12);
      // Mossy overgrown patches
      ctx.fillStyle = '#38a169';
      ctx.fillRect(b.x + 12, b.y + 16, 12, 8);
      ctx.fillRect(b.x + 30, b.y + 36, 14, 10);

      // Glowing Ancient Core in chest
      ctx.fillStyle = b.enraged ? '#e53e3e' : '#f6ad55';
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + 36, 9, 0, Math.PI * 2);
      ctx.fill();

      // Stone head & eye slit
      ctx.fillStyle = '#718096';
      ctx.fillRect(b.x + 16, b.y, b.width - 32, 16);
      ctx.fillStyle = '#fbd38d';
      ctx.fillRect(b.x + 22, b.y + 6, 20, 3);

      // Orbiting stone fists
      if (b.fists) {
        b.fists.forEach((fist) => {
          ctx.fillStyle = '#4a5568';
          ctx.fillRect(fist.x - 10, fist.y - 10, 20, 20);
          ctx.fillStyle = '#a0aec0';
          ctx.fillRect(fist.x - 7, fist.y - 7, 14, 4);
        });
      }
    }

    // === BOSS 4: SKY DRAKE ===
    else if (b.id === 'boss_sky_drake') {
      // Segment body
      if (b.segments) {
        b.segments.forEach((seg, idx) => {
          const size = 16 - (idx / b.segments!.length) * 8;
          ctx.fillStyle = idx % 2 === 0 ? '#dd6b20' : '#c53030';
          ctx.beginPath();
          ctx.arc(seg.x, seg.y, size, 0, Math.PI * 2);
          ctx.fill();

          // Spikes on back
          ctx.fillStyle = '#ecc94b';
          ctx.fillRect(seg.x - 2, seg.y - size - 4, 4, 6);
        });
      }

      // Dragon Head
      ctx.fillStyle = '#c53030';
      ctx.fillRect(b.x, b.y, b.width, b.height);
      // Golden horns
      ctx.fillStyle = '#ecc94b';
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - 16, b.y - 14);
      ctx.lineTo(b.x + 8, b.y);
      ctx.fill();
      // Glowing fiery dragon eye
      ctx.fillStyle = '#feebc8';
      ctx.fillRect(b.x + 12, b.y + 10, 8, 6);
      ctx.fillStyle = '#742a2a';
      ctx.fillRect(b.x + 16, b.y + 11, 3, 4);
    }

    ctx.restore();
  }

  // --- Projectiles ---
  private drawProjectile(p: Projectile) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);

    if (p.type === 'arrow') {
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);
      ctx.fillStyle = '#8a5c36';
      ctx.fillRect(-10, -1, 18, 2);
      ctx.fillStyle = p.color; // Arrowhead
      ctx.beginPath();
      ctx.moveTo(8, -3);
      ctx.lineTo(14, 0);
      ctx.lineTo(8, 3);
      ctx.fill();
    } else if (p.type === 'boomerang') {
      const rot = Date.now() * 0.02;
      ctx.rotate(rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(-10, -6);
      ctx.lineTo(0, 0);
      ctx.lineTo(10, -6);
      ctx.lineTo(6, -8);
      ctx.lineTo(0, -3);
      ctx.lineTo(-6, -8);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === 'bomb') {
      ctx.fillStyle = '#2d3748';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
      // Fuse spark
      ctx.fillStyle = '#dd6b20';
      ctx.fillRect(0, -p.radius - 3, 3, 3);
    } else {
      // Magic spore / star / fireball
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // --- Particles ---
  private drawParticle(part: Particle) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = Math.max(0, part.life / part.maxLife);
    ctx.fillStyle = part.color;
    ctx.fillRect(Math.round(part.x), Math.round(part.y), part.size, part.size);
    ctx.restore();
  }

  // --- Dropped Items ---
  private drawDroppedItem(item: DroppedItem) {
    const ctx = this.ctx;
    const itemDef = ITEMS[item.itemId];
    if (!itemDef) return;

    ctx.save();
    const bob = Math.sin(Date.now() * 0.007 + item.id) * 3;
    ctx.translate(item.x, item.y + bob);

    ctx.fillStyle = itemDef.iconColor;
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(-3, -3, 3, 3);

    ctx.restore();
  }

  // --- Floating Combat Damage Numbers ---
  private drawDamageText(dt: DamageText) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = dt.crit ? 'bold 15px "VT323", monospace' : '13px "VT323", monospace';
    ctx.textAlign = 'center';

    // Black text shadow
    ctx.fillStyle = '#000000';
    ctx.fillText(dt.text, dt.x + 1, dt.y + 1);

    ctx.fillStyle = dt.color;
    ctx.fillText(dt.text, dt.x, dt.y);
    ctx.restore();
  }
}
