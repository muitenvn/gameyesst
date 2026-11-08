/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Heart, Sparkles, Shield, Backpack, Hammer, Users, Pause, Sun, Moon } from 'lucide-react';
import { Player, Boss, Companion } from '../../types/game';
import { ITEMS } from '../../engine/items';

interface GameHUDProps {
  player: Player;
  activeBoss: Boss | null;
  companions: Companion[];
  notification: string | null;
  onOpenInventory: () => void;
  onOpenCrafting: () => void;
  onOpenCompanions: () => void;
  onTogglePause: () => void;
  onSelectHotbar: (index: number) => void;
  showTouchControls: boolean;
  setShowTouchControls: (v: boolean) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  player,
  activeBoss,
  companions,
  notification,
  onOpenInventory,
  onOpenCrafting,
  onOpenCompanions,
  onTogglePause,
  onSelectHotbar,
  showTouchControls,
  setShowTouchControls,
}) => {
  const recruitedCount = companions.filter((c) => c.unlocked).length;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-3 select-none">
      {/* Top Header Cluster */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Player HP & Mana status */}
        <div className="pointer-events-auto flex flex-col gap-1.5 bg-[#171310]/85 border-2 border-[#4a3b2c] p-2 rounded-lg shadow-lg">
          {/* HP */}
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-red-500 fill-red-500 shrink-0" />
            <div className="w-36 h-4 bg-stone-900 border border-stone-700 rounded-sm overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100))}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center font-pixel text-xs text-white font-bold tabular-nums drop-shadow">
                {player.hp} / {player.maxHp} HP
              </span>
            </div>
          </div>

          {/* Mana */}
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-sky-400 fill-sky-400 shrink-0" />
            <div className="w-36 h-3 bg-stone-900 border border-stone-700 rounded-sm overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-sky-700 to-sky-400 transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, (player.mana / player.maxMana) * 100))}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center font-pixel text-[10px] text-sky-100 font-bold tabular-nums drop-shadow">
                {player.mana} / {player.maxMana} MANA
              </span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between text-[11px] text-amber-200/90 font-pixel pt-0.5 border-t border-amber-900/40">
            <span className="flex items-center gap-1">
              <Shield size={12} className="text-amber-400" />
              Giáp: {player.defense + (player.equippedArmor.chest ? 10 : 0)}
            </span>
            <span className="flex items-center gap-1">
              <Users size={12} className="text-emerald-400" />
              Đồng đội: {recruitedCount}/4
            </span>
          </div>
        </div>

        {/* Center: Boss HP Bar or Notification */}
        <div className="flex-1 max-w-md mx-4 flex flex-col items-center">
          {activeBoss && (
            <div className="pointer-events-auto w-full bg-[#1e1313]/90 border-2 border-red-800 p-2 rounded-lg shadow-2xl animate-fade-in">
              <div className="flex justify-between items-center mb-1 text-xs font-bold text-red-200 font-pixel">
                <span className="text-amber-300">⚔️ {activeBoss.name.toUpperCase()}</span>
                <span className="tabular-nums">
                  {Math.max(0, activeBoss.hp)} / {activeBoss.maxHp}
                </span>
              </div>
              <div className="w-full h-4 bg-stone-950 border border-stone-800 rounded-sm overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 via-red-600 to-rose-500 transition-all duration-100"
                  style={{ width: `${Math.max(0, Math.min(100, (activeBoss.hp / activeBoss.maxHp) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {notification && !activeBoss && (
            <div className="pointer-events-auto bg-[#172017]/90 border border-emerald-600/70 text-emerald-200 text-xs px-4 py-1.5 rounded-full shadow-lg font-pixel tracking-wider text-center animate-bounce">
              {notification}
            </div>
          )}
        </div>

        {/* Right: Quick action buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-[#171310]/85 border-2 border-[#4a3b2c] p-1.5 rounded-lg shadow-lg">
          <button
            onClick={onOpenInventory}
            title="Túi Đồ [E]"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#2b221a] hover:bg-[#3d3125] border border-[#5a4632] text-xs font-pixel text-amber-100 transition active:scale-95"
          >
            <Backpack size={15} className="text-amber-400" />
            <span className="hidden sm:inline">Túi Đồ (E)</span>
          </button>
          <button
            onClick={onOpenCrafting}
            title="Chế Tạo [C]"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#2b221a] hover:bg-[#3d3125] border border-[#5a4632] text-xs font-pixel text-amber-100 transition active:scale-95"
          >
            <Hammer size={15} className="text-orange-400" />
            <span className="hidden sm:inline">Chế Tạo (C)</span>
          </button>
          <button
            onClick={onOpenCompanions}
            title="Đồng Đội [V]"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#2b221a] hover:bg-[#3d3125] border border-[#5a4632] text-xs font-pixel text-amber-100 transition active:scale-95"
          >
            <Users size={15} className="text-emerald-400" />
            <span className="hidden sm:inline">Đồng Đội ({recruitedCount})</span>
          </button>
          <button
            onClick={onTogglePause}
            title="Tạm Dừng [ESC]"
            className="p-1.5 rounded bg-[#2b221a] hover:bg-[#3d3125] border border-[#5a4632] text-amber-100 transition active:scale-95"
          >
            <Pause size={15} />
          </button>
        </div>
      </div>

      {/* Bottom Center: Hotbar */}
      <div className="flex flex-col items-center gap-1">
        {/* Mobile touch controls toggle */}
        <div className="pointer-events-auto flex items-center gap-2 mb-1">
          <button
            onClick={() => setShowTouchControls(!showTouchControls)}
            className="text-[11px] font-pixel px-2 py-0.5 rounded bg-black/60 border border-stone-700 text-stone-300 hover:text-white"
          >
            {showTouchControls ? 'Ẩn phím ảo cảm ứng' : 'Hiện phím ảo cảm ứng'}
          </button>
        </div>

        {/* 9 Hotbar Slots */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-[#171310]/90 border-2 border-[#4a3b2c] p-2 rounded-xl shadow-2xl">
          {player.inventory.slice(0, 9).map((slot, idx) => {
            const itemDef = slot ? ITEMS[slot.id] : null;
            const isSelected = player.selectedHotbarIndex === idx;

            return (
              <div
                key={idx}
                onClick={() => onSelectHotbar(idx)}
                className={`w-12 h-12 rounded-lg cursor-pointer flex flex-col items-center justify-between p-1 transition-all relative ${
                  isSelected
                    ? 'bg-[#4a3721] border-2 border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)] scale-105'
                    : 'bg-[#2b221a] border-2 border-[#5a4632] hover:border-amber-400/60'
                }`}
              >
                {/* Hotkey index */}
                <span className="text-[10px] font-pixel text-amber-400/80 self-start leading-none">
                  {idx + 1}
                </span>

                {/* Item icon */}
                {itemDef ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div
                      className="w-5 h-5 rounded-sm shadow-sm"
                      style={{ backgroundColor: itemDef.iconColor }}
                    />
                  </div>
                ) : (
                  <div className="flex-1" />
                )}

                {/* Stack count */}
                {slot && slot.count > 1 && (
                  <span className="text-[11px] font-pixel text-amber-200 font-bold self-end leading-none tabular-nums">
                    {slot.count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
