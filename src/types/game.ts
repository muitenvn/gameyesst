/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const TILE_SIZE = 16; // 16x16 pixel tiles
export const WORLD_WIDTH = 260; // 260 tiles wide
export const WORLD_HEIGHT = 110; // 110 tiles deep
export const SURFACE_LEVEL = 42; // Surface elevation

export enum TileType {
  AIR = 0,
  DIRT = 1,
  GRASS = 2,
  STONE = 3,
  WOOD = 4,
  LEAVES = 5,
  COPPER_ORE = 6,
  IRON_ORE = 7,
  GOLD_ORE = 8,
  RUBY_ORE = 9,
  AMETHYST_ORE = 10,
  WOOD_PLANK = 11,
  STONE_BRICK = 12,
  PLATFORM = 13,
  TORCH = 14,
  CAMPFIRE = 15,
  CRAFTING_TABLE = 16,
  FURNACE = 17,
  ANVIL = 18,
  CHEST = 19,
  CAGE = 20, // Companion rescue cage!
  MUSHROOM_BLOCK = 21,
  TALL_GRASS = 22,
  FLOWER = 23,
}

export type ItemCategory = 'weapon' | 'tool' | 'block' | 'consumable' | 'material' | 'summon' | 'armor';

export type WeaponType = 'sword' | 'bow' | 'magic' | 'boomerang' | 'bomb';

export interface ItemDef {
  id: string;
  name: string;
  nameVi: string;
  category: ItemCategory;
  description: string;
  stackable: boolean;
  maxStack: number;
  iconColor: string;
  tileType?: TileType; // If placeable block
  // Combat stats
  damage?: number;
  knockback?: number;
  useTime?: number; // Swing/action cooldown in frames (60fps)
  manaCost?: number;
  weaponType?: WeaponType;
  range?: number;
  critChance?: number; // 0 to 100
  projectileSpeed?: number;
  // Consumable stats
  healHp?: number;
  healMana?: number;
  // Mining tool power
  pickaxePower?: number;
  axePower?: number;
  // Defense
  defense?: number;
  // Summon target
  bossSummonId?: string;
}

export interface InventoryItem {
  id: string;
  count: number;
}

export interface CraftingRecipe {
  id: string;
  resultId: string;
  resultCount: number;
  ingredients: { itemId: string; count: number }[];
  station: 'none' | 'table' | 'furnace' | 'anvil';
  description?: string;
}

export interface Companion {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  unlocked: boolean;
  recruited: boolean;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  state: 'follow' | 'guard' | 'rest';
  guardX?: number;
  guardY?: number;
  attackCooldown: number;
  perkDescription: string;
  weaponType: 'bow' | 'hammer' | 'heal' | 'tackle';
  dialogue: string;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  fromPlayer: boolean;
  color: string;
  trailColor?: string;
  life: number;
  maxLife: number;
  gravity?: number;
  piercing?: number;
  type: 'arrow' | 'magic_spore' | 'star' | 'fireball' | 'boomerang' | 'bomb' | 'boss_thorn' | 'boss_glob';
  boomerangReturning?: boolean;
  boomerangOwnerX?: number;
  boomerangOwnerY?: number;
}

export interface Enemy {
  id: number;
  type: 'slime' | 'spiked_slime' | 'bat' | 'skeleton' | 'goblin';
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  damage: number;
  defense: number;
  facing: 1 | -1;
  grounded: boolean;
  hitFlashTimer: number;
  aiTimer: number;
  color: string;
}

export interface Boss {
  id: string;
  name: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  phase: number;
  stateTimer: number;
  state: string;
  targetX: number;
  targetY: number;
  hitFlashTimer: number;
  enraged: boolean;
  segments?: { x: number; y: number }[]; // For wyrm boss
  fists?: { x: number; y: number; vx: number; vy: number; state: string; timer: number }[]; // For Golem boss
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  gravity?: number;
}

export interface DamageText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  crit: boolean;
  life: number;
}

export interface DroppedItem {
  id: number;
  itemId: string;
  count: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  grounded: boolean;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  defense: number;
  invulnerableTimer: number;
  swingAngle: number;
  swingTimer: number;
  swingMax: number;
  isMining: boolean;
  miningX: number;
  miningY: number;
  miningProgress: number; // 0 to 1
  selectedHotbarIndex: number; // 0 to 8
  inventory: (InventoryItem | null)[]; // 30 slots
  equippedArmor: {
    helmet: string | null;
    chest: string | null;
    boots: string | null;
  };
}
