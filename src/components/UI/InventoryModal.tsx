/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Trash2, Shield, Sword, Pickaxe, Sparkles } from 'lucide-react';
import { Player, InventoryItem, ItemDef } from '../../types/game';
import { ITEMS } from '../../engine/items';
import { soundEngine } from '../../audio/soundSystem';

interface InventoryModalProps {
  player: Player;
  setPlayer: React.Dispatch<React.SetStateAction<Player>>;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ player, setPlayer, onClose }) => {
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(0);

  const selectedItem = selectedSlotIndex !== null ? player.inventory[selectedSlotIndex] : null;
  const selectedItemDef: ItemDef | null = selectedItem ? ITEMS[selectedItem.id] : null;

  const handleDropItem = () => {
    if (selectedSlotIndex === null || !selectedItem) return;
    const newInv = [...player.inventory];
    newInv[selectedSlotIndex] = null;
    setPlayer((prev) => ({ ...prev, inventory: newInv }));
    soundEngine.playMine();
  };

  const handleEquipArmor = (itemDef: ItemDef) => {
    if (itemDef.category !== 'armor') return;
    setPlayer((prev) => {
      const newArmor = { ...prev.equippedArmor, chest: itemDef.id };
      return { ...prev, equippedArmor: newArmor };
    });
    soundEngine.playCraft();
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-[#1b1511] border-3 border-[#53402e] rounded-xl shadow-2xl p-5 flex flex-col gap-4 text-amber-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#413123] pb-2">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-xl text-amber-300 font-bold">🎒 TÚI ĐỒ VÀ TRANG BỊ</span>
            <span className="text-xs text-amber-300/60 font-pixel">(30 Ô Chứa)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-[#2b221a] hover:bg-red-900/60 border border-[#4a3b2c] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content: 30 Slots Grid & Details Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 30 Inventory Slots (5 rows x 6 cols) */}
          <div className="md:col-span-2 grid grid-cols-6 gap-2">
            {player.inventory.map((slot, idx) => {
              const itemDef = slot ? ITEMS[slot.id] : null;
              const isSelected = selectedSlotIndex === idx;
              const isHotbar = idx < 9;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedSlotIndex(idx)}
                  className={`w-14 h-14 rounded-lg cursor-pointer flex flex-col items-center justify-between p-1 relative transition ${
                    isSelected
                      ? 'bg-[#4a3721] border-2 border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                      : isHotbar
                      ? 'bg-[#292018] border-2 border-[#54402d]'
                      : 'bg-[#201913] border-2 border-[#3d2e20]'
                  }`}
                >
                  <span className="text-[10px] font-pixel text-amber-400/60 self-start leading-none">
                    {idx + 1}
                  </span>

                  {itemDef ? (
                    <div
                      className="w-6 h-6 rounded-sm shadow-sm"
                      style={{ backgroundColor: itemDef.iconColor }}
                    />
                  ) : (
                    <div className="w-6 h-6" />
                  )}

                  {slot && slot.count > 1 ? (
                    <span className="text-[11px] font-pixel text-amber-200 font-bold self-end leading-none tabular-nums">
                      {slot.count}
                    </span>
                  ) : (
                    <span className="text-[10px] opacity-0">0</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Details & Equipment Panel */}
          <div className="bg-[#140f0c] border border-[#3e2e21] rounded-lg p-3 flex flex-col justify-between">
            {selectedItemDef ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 border-b border-[#3e2e21] pb-2">
                  <div
                    className="w-8 h-8 rounded-md shrink-0 shadow-sm"
                    style={{ backgroundColor: selectedItemDef.iconColor }}
                  />
                  <div>
                    <h3 className="font-pixel text-base font-bold text-amber-200 leading-tight">
                      {selectedItemDef.nameVi}
                    </h3>
                    <p className="text-[11px] text-amber-400/70 font-mono">
                      {selectedItemDef.category.toUpperCase()}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-amber-100/80 leading-relaxed">
                  {selectedItemDef.description}
                </p>

                {/* Combat & Tool stats */}
                <div className="grid grid-cols-2 gap-1.5 text-xs font-pixel pt-1 border-t border-[#3e2e21]">
                  {selectedItemDef.damage && (
                    <span className="flex items-center gap-1 text-red-400">
                      <Sword size={12} /> Sát thương: {selectedItemDef.damage}
                    </span>
                  )}
                  {selectedItemDef.pickaxePower && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <Pickaxe size={12} /> Đào mỏ: Cấp {selectedItemDef.pickaxePower}
                    </span>
                  )}
                  {selectedItemDef.defense && (
                    <span className="flex items-center gap-1 text-blue-400">
                      <Shield size={12} /> Giáp: +{selectedItemDef.defense}
                    </span>
                  )}
                  {selectedItemDef.healHp && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Sparkles size={12} /> Hồi: +{selectedItemDef.healHp} HP
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  {selectedItemDef.category === 'armor' && (
                    <button
                      onClick={() => handleEquipArmor(selectedItemDef)}
                      className="flex-1 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-xs font-pixel text-white transition"
                    >
                      Mặc Trang Bị
                    </button>
                  )}
                  <button
                    onClick={handleDropItem}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-red-950/80 hover:bg-red-900 border border-red-800 text-xs font-pixel text-red-200 transition"
                  >
                    <Trash2 size={13} />
                    <span>Vứt</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-xs text-amber-400/40 font-pixel">
                Chọn một ô đồ để xem thông tin chi tiết
              </div>
            )}

            {/* Armor Equipped summary */}
            <div className="mt-3 pt-2 border-t border-[#3e2e21] text-xs font-pixel flex items-center justify-between text-amber-300/80">
              <span>Áo Giáp: {player.equippedArmor.chest ? 'Đã trang bị (+10 Giáp)' : 'Chưa mặc'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
