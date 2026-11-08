/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TileType, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, SURFACE_LEVEL } from '../types/game';

export interface WorldData {
  width: number;
  height: number;
  tiles: Uint8Array;
  wallTiles: Uint8Array;
  lightMap: Uint8Array;
  spawnX: number;
  spawnY: number;
  companionCagePositions: { companionId: string; tx: number; ty: number }[];
}

// Pseudo-random noise generator for deterministic, natural terrain
function simpleNoise1D(x: number, seed: number = 42): number {
  const n = Math.sin(x * 0.12 + seed) * 4 + Math.sin(x * 0.04 + seed * 2) * 8 + Math.sin(x * 0.28 + seed * 3) * 2;
  return n;
}

export function generateWorld(seed: number = Math.floor(Math.random() * 10000)): WorldData {
  const tiles = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT);
  const wallTiles = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT);
  const lightMap = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT);

  const getIdx = (tx: number, ty: number) => ty * WORLD_WIDTH + tx;

  // 1. Generate surface heightmap
  const heightMap: number[] = [];
  for (let x = 0; x < WORLD_WIDTH; x++) {
    const rawH = SURFACE_LEVEL + Math.round(simpleNoise1D(x, seed));
    // Clamp to valid range
    heightMap[x] = Math.max(28, Math.min(52, rawH));
  }

  // 2. Fill ground layers
  for (let x = 0; x < WORLD_WIDTH; x++) {
    const surfaceY = heightMap[x];
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      const idx = getIdx(x, y);
      if (y < surfaceY) {
        tiles[idx] = TileType.AIR;
      } else if (y === surfaceY) {
        tiles[idx] = TileType.GRASS;
        wallTiles[idx] = TileType.DIRT;
      } else if (y < surfaceY + 8) {
        tiles[idx] = TileType.DIRT;
        wallTiles[idx] = TileType.DIRT;
      } else {
        tiles[idx] = TileType.STONE;
        wallTiles[idx] = TileType.STONE;
      }
    }
  }

  // 3. Generate underground caves using cellular/worm noise
  for (let x = 5; x < WORLD_WIDTH - 5; x++) {
    for (let y = SURFACE_LEVEL + 5; y < WORLD_HEIGHT - 4; y++) {
      const noise =
        Math.sin(x * 0.15 + seed) * Math.cos(y * 0.18 + seed * 0.5) +
        Math.sin((x + y) * 0.08 + seed * 1.3) * 0.8;
      if (noise > 0.65) {
        const idx = getIdx(x, y);
        tiles[idx] = TileType.AIR; // Cave void!
      }
    }
  }

  // 4. Generate Ore Veins
  const spawnVein = (oreType: TileType, count: number, minY: number, maxY: number, size: number) => {
    for (let i = 0; i < count; i++) {
      const startX = 6 + Math.floor(Math.random() * (WORLD_WIDTH - 12));
      const startY = minY + Math.floor(Math.random() * (maxY - minY));
      for (let s = 0; s < size; s++) {
        const ox = startX + Math.floor((Math.random() - 0.5) * 3);
        const oy = startY + Math.floor((Math.random() - 0.5) * 3);
        if (ox >= 0 && ox < WORLD_WIDTH && oy >= 0 && oy < WORLD_HEIGHT) {
          const idx = getIdx(ox, oy);
          if (tiles[idx] === TileType.STONE || tiles[idx] === TileType.DIRT) {
            tiles[idx] = oreType;
          }
        }
      }
    }
  };

  // Copper ores (shallow)
  spawnVein(TileType.COPPER_ORE, 45, SURFACE_LEVEL + 2, 75, 5);
  // Iron ores (medium)
  spawnVein(TileType.IRON_ORE, 40, SURFACE_LEVEL + 12, 95, 5);
  // Gold ores (deep)
  spawnVein(TileType.GOLD_ORE, 25, 65, WORLD_HEIGHT - 6, 4);
  // Ruby and Amethyst gems (deep caverns)
  spawnVein(TileType.RUBY_ORE, 18, 70, WORLD_HEIGHT - 6, 3);
  spawnVein(TileType.AMETHYST_ORE, 20, 60, WORLD_HEIGHT - 6, 3);

  // 5. Generate Trees & Vegetation on surface
  for (let x = 4; x < WORLD_WIDTH - 4; x += 3 + Math.floor(Math.random() * 4)) {
    const y = heightMap[x];
    if (tiles[getIdx(x, y)] === TileType.GRASS && tiles[getIdx(x, y - 1)] === TileType.AIR) {
      // Tree height 4-7 tiles
      const treeHeight = 4 + Math.floor(Math.random() * 3);
      for (let ty = 1; ty <= treeHeight; ty++) {
        tiles[getIdx(x, y - ty)] = TileType.WOOD;
      }
      // Leaves foliage on top
      const topY = y - treeHeight;
      for (let lx = -2; lx <= 2; lx++) {
        for (let ly = -2; ly <= 0; ly++) {
          if (Math.abs(lx) === 2 && ly === -2) continue; // Round corners
          const leafX = x + lx;
          const leafY = topY + ly;
          if (leafX >= 0 && leafX < WORLD_WIDTH && leafY >= 0 && leafY < WORLD_HEIGHT) {
            const idx = getIdx(leafX, leafY);
            if (tiles[idx] === TileType.AIR) {
              tiles[idx] = TileType.LEAVES;
            }
          }
        }
      }
    }
  }

  // 6. Place companion cages and initial structures
  const companionCagePositions: { companionId: string; tx: number; ty: number }[] = [];

  // Companion 1: Linh (trapped in a forest cage to the West)
  const linhX = 40 + Math.floor(Math.random() * 15);
  const linhY = heightMap[linhX] - 1;
  tiles[getIdx(linhX, linhY)] = TileType.CAGE;
  companionCagePositions.push({ companionId: 'companion_linh', tx: linhX, ty: linhY });

  // Companion 2: Mai Dược Sĩ (trapped near mystic shrooms to the East)
  const maiX = WORLD_WIDTH - 55 + Math.floor(Math.random() * 15);
  const maiY = heightMap[maiX] - 1;
  tiles[getIdx(maiX, maiY)] = TileType.CAGE;
  companionCagePositions.push({ companionId: 'companion_mai', tx: maiX, ty: maiY });

  // Companion 3: Goran Thợ Rèn (underground stone chamber)
  const goranX = 100 + Math.floor(Math.random() * 30);
  const goranY = 72;
  // Clear a small 5x4 chamber
  for (let cx = -2; cx <= 2; cx++) {
    for (let cy = -2; cy <= 1; cy++) {
      tiles[getIdx(goranX + cx, goranY + cy)] = TileType.AIR;
      wallTiles[getIdx(goranX + cx, goranY + cy)] = TileType.STONE_BRICK;
    }
  }
  // Floor and cage
  tiles[getIdx(goranX, goranY + 1)] = TileType.STONE_BRICK;
  tiles[getIdx(goranX, goranY)] = TileType.CAGE;
  tiles[getIdx(goranX - 2, goranY)] = TileType.TORCH;
  tiles[getIdx(goranX + 2, goranY)] = TileType.TORCH;
  companionCagePositions.push({ companionId: 'companion_goran', tx: goranX, ty: goranY });

  // Spawn point (middle of the map on surface)
  const spawnTileX = Math.floor(WORLD_WIDTH / 2);
  const spawnTileY = heightMap[spawnTileX] - 2;

  // Place cozy starting campfire and starter guide signs
  const groundY = heightMap[spawnTileX];
  tiles[getIdx(spawnTileX + 2, groundY - 1)] = TileType.CAMPFIRE;
  tiles[getIdx(spawnTileX - 2, groundY - 1)] = TileType.TORCH;

  // Compute initial light map
  recomputeLighting(tiles, lightMap);

  return {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    tiles,
    wallTiles,
    lightMap,
    spawnX: spawnTileX * TILE_SIZE,
    spawnY: spawnTileY * TILE_SIZE,
    companionCagePositions,
  };
}

export function recomputeLighting(tiles: Uint8Array, lightMap: Uint8Array) {
  // Sunlight propagation from top
  for (let x = 0; x < WORLD_WIDTH; x++) {
    let sun = 15;
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      const idx = y * WORLD_WIDTH + x;
      const tile = tiles[idx];
      if (tile === TileType.AIR || tile === TileType.PLATFORM || tile === TileType.TORCH) {
        lightMap[idx] = sun;
      } else {
        sun = Math.max(0, sun - 4);
        lightMap[idx] = sun;
      }
    }
  }

  // Radial light from light sources (torches, campfires, glowing ores)
  const queue: { x: number; y: number; light: number }[] = [];

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const idx = y * WORLD_WIDTH + x;
      const tile = tiles[idx];
      let emit = 0;
      if (tile === TileType.TORCH) emit = 15;
      else if (tile === TileType.CAMPFIRE) emit = 15;
      else if (tile === TileType.RUBY_ORE || tile === TileType.AMETHYST_ORE) emit = 9;
      else if (tile === TileType.GOLD_ORE) emit = 7;

      if (emit > lightMap[idx]) {
        lightMap[idx] = emit;
        queue.push({ x, y, light: emit });
      }
    }
  }

  // Simple BFS spread for torches
  let head = 0;
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  while (head < queue.length) {
    const cur = queue[head++];
    if (cur.light <= 1) continue;

    for (let d = 0; d < 4; d++) {
      const nx = cur.x + dirs[d][0];
      const ny = cur.y + dirs[d][1];
      if (nx >= 0 && nx < WORLD_WIDTH && ny >= 0 && ny < WORLD_HEIGHT) {
        const nidx = ny * WORLD_WIDTH + nx;
        const isSolid =
          tiles[nidx] !== TileType.AIR &&
          tiles[nidx] !== TileType.PLATFORM &&
          tiles[nidx] !== TileType.TORCH;
        const decay = isSolid ? 3 : 1;
        const nextLight = cur.light - decay;
        if (nextLight > lightMap[nidx]) {
          lightMap[nidx] = nextLight;
          queue.push({ x: nx, y: ny, light: nextLight });
        }
      }
    }
  }
}
