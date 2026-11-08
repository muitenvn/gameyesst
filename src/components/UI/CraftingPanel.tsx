/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Hammer, Check, AlertCircle } from 'lucide-react';
import { Player, CraftingRecipe } from '../../types/game';
import { RECIPES } from '../../engine/crafting';
import { ITEMS } from '../../engine/items';
import { soundEngine } from '../../audio/soundSystem';

interface CraftingPanelProps {
  player: Player;
  setPlayer: React.Dispatch<React.SetStateAction<Player>>;
  onClose: () => void;
}

export const CraftingPanel: React.FC<CraftingPanelProps> = ({ player, setPlayer, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe>(RECIPES[0]);

  // Helper to count item quantity in inventory
  const getItemCount = (itemId: string): number => {
    let total = 0;
    player.inventory.forEach((slot) => {
      if (slot && slot.id === itemId) total += slot.count;
    });
    return total;
  };

  // Check if player has enough materials for recipe
  const canCraft = (recipe: CraftingRecipe): boolean => {
    return recipe.ingredients.every((ing) => getItemCount(ing.itemId) >= ing.count);
  };

  // Perform Crafting
  const handleCraft = (recipe: CraftingRecipe) => {
    if (!canCraft(recipe)) return;

    const newInv = [...player.inventory];

    // Deduct ingredients
    recipe.ingredients.forEach((ing) => {
      let needed = ing.count;
      for (let i = 0; i < newInv.length; i++) {
        const slot = newInv[i];
        if (slot && slot.id === ing.itemId) {
          const take = Math.min(slot.count, needed);
          slot.count -= take;
          needed -= take;
          if (slot.count <= 0) newInv[i] = null;
          if (needed <= 0) break;
        }
      }
    });

    // Add crafted result
    const resultDef = ITEMS[recipe.resultId];
    let toAdd = recipe.resultCount;

    if (resultDef && resultDef.stackable) {
      for (let i = 0; i < newInv.length; i++) {
        const slot = newInv[i];
        if (slot && slot.id === recipe.resultId && slot.count < resultDef.maxStack) {
          const space = resultDef.maxStack - slot.count;
          const add = Math.min(space, toAdd);
          slot.count += add;
          toAdd -= add;
          if (toAdd <= 0) break;
        }
      }
    }

    if (toAdd > 0) {
      for (let i = 0; i < newInv.length; i++) {
        if (!newInv[i]) {
          newInv[i] = { id: recipe.resultId, count: toAdd };
          toAdd = 0;
          break;
        }
      }
    }

    setPlayer((prev) => ({ ...prev, inventory: newInv }));
    soundEngine.playCraft();
  };

  // Filter recipes
  const filteredRecipes = RECIPES.filter((r) => {
    const itemDef = ITEMS[r.resultId];
    if (!itemDef) return true;
    if (activeCategory === 'all') return true;
    if (activeCategory === 'weapon') return itemDef.category === 'weapon';
    if (activeCategory === 'tool') return itemDef.category === 'tool';
    if (activeCategory === 'block') return itemDef.category === 'block';
    if (activeCategory === 'consumable') return itemDef.category === 'consumable';
    if (activeCategory === 'summon') return itemDef.category === 'summon';
    return true;
  });

  const selectedResultDef = ITEMS[selectedRecipe.resultId];

  return (
    <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-3xl bg-[#1b1511] border-3 border-[#53402e] rounded-xl shadow-2xl p-5 flex flex-col gap-4 text-amber-100 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#413123] pb-2">
          <div className="flex items-center gap-2">
            <Hammer className="text-amber-400" size={20} />
            <span className="font-pixel text-xl text-amber-300 font-bold">LÒ CHẾ TẠO DỤNG CỤ & VŨ KHÍ</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-[#2b221a] hover:bg-red-900/60 border border-[#4a3b2c] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 text-xs font-pixel">
          {[
            { id: 'all', label: 'Tất Cả' },
            { id: 'weapon', label: 'Vũ Khí' },
            { id: 'tool', label: 'Công Cụ' },
            { id: 'block', label: 'Xây Dựng' },
            { id: 'consumable', label: 'Dược Phẩm' },
            { id: 'summon', label: 'Triệu Hồi Boss' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg border transition ${
                activeCategory === cat.id
                  ? 'bg-amber-800/80 border-amber-400 text-amber-100 font-bold'
                  : 'bg-[#251c15] border-[#443223] text-amber-300/70 hover:bg-[#34271e]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Main Body: Recipe List & Detail Crafting Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
          {/* Scrollable Recipe List */}
          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[50vh] pr-1">
            {filteredRecipes.map((recipe) => {
              const resDef = ITEMS[recipe.resultId];
              const isReady = canCraft(recipe);
              const isSelected = selectedRecipe.id === recipe.id;

              return (
                <div
                  key={recipe.id}
                  onClick={() => setSelectedRecipe(recipe)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition ${
                    isSelected
                      ? 'bg-[#433120] border-amber-300'
                      : 'bg-[#221a14] border-[#382b1e] hover:bg-[#2d221a]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-sm shadow shrink-0"
                      style={{ backgroundColor: resDef?.iconColor || '#777' }}
                    />
                    <div>
                      <p className="font-pixel text-sm font-bold text-amber-200">
                        {resDef?.nameVi || recipe.resultId} {recipe.resultCount > 1 ? `x${recipe.resultCount}` : ''}
                      </p>
                      <p className="text-[10px] text-amber-400/60 font-mono">
                        {recipe.station === 'none'
                          ? 'Bàn Tay'
                          : recipe.station === 'table'
                          ? 'Bàn Chế Tạo'
                          : recipe.station === 'furnace'
                          ? 'Lò Luyện Kim'
                          : 'Đe Rèn Sắt'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-pixel px-2 py-0.5 rounded ${
                      isReady
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700'
                        : 'bg-stone-900/80 text-stone-400'
                    }`}
                  >
                    {isReady ? 'Có thể tạo' : 'Thiếu nguyên liệu'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Selected Recipe Detail Card */}
          <div className="bg-[#140f0c] border border-[#3e2e21] rounded-xl p-4 flex flex-col justify-between">
            {selectedResultDef && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 border-b border-[#3e2e21] pb-3">
                  <div
                    className="w-12 h-12 rounded-lg shadow-md shrink-0"
                    style={{ backgroundColor: selectedResultDef.iconColor }}
                  />
                  <div>
                    <h3 className="font-pixel text-lg font-bold text-amber-200">
                      {selectedResultDef.nameVi} {selectedRecipe.resultCount > 1 ? `(x${selectedRecipe.resultCount})` : ''}
                    </h3>
                    <p className="text-xs text-amber-400/80 font-mono">
                      Yêu cầu trạm: {selectedRecipe.station === 'none' ? 'Bàn tay' : selectedRecipe.station.toUpperCase()}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-amber-100/80 leading-relaxed">
                  {selectedRecipe.description || selectedResultDef.description}
                </p>

                {/* Required Ingredients */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-[#3e2e21]">
                  <p className="text-xs font-pixel text-amber-300 font-bold">NGUYÊN LIỆU CẦN THIẾT:</p>
                  <div className="flex flex-col gap-1">
                    {selectedRecipe.ingredients.map((ing) => {
                      const ingDef = ITEMS[ing.itemId];
                      const currentCount = getItemCount(ing.itemId);
                      const hasEnough = currentCount >= ing.count;

                      return (
                        <div
                          key={ing.itemId}
                          className="flex items-center justify-between text-xs font-pixel bg-[#1c1612] px-2 py-1 rounded"
                        >
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-3.5 h-3.5 rounded-xs"
                              style={{ backgroundColor: ingDef?.iconColor || '#888' }}
                            />
                            <span className="text-amber-200">{ingDef?.nameVi || ing.itemId}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`tabular-nums ${hasEnough ? 'text-emerald-400' : 'text-red-400 font-bold'}`}>
                              {currentCount} / {ing.count}
                            </span>
                            {hasEnough ? (
                              <Check size={13} className="text-emerald-400" />
                            ) : (
                              <AlertCircle size={13} className="text-red-400" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Craft Button */}
            <button
              onClick={() => handleCraft(selectedRecipe)}
              disabled={!canCraft(selectedRecipe)}
              className={`w-full py-3 rounded-lg font-pixel text-base font-bold mt-4 transition cursor-pointer flex items-center justify-center gap-2 ${
                canCraft(selectedRecipe)
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white shadow-lg active:scale-95'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
              }`}
            >
              <Hammer size={18} />
              <span>CHẾ TẠO NGAY</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
