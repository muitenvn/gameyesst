/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Users, Shield, Heart, MapPin, Check, Lock } from 'lucide-react';
import { Companion } from '../../types/game';
import { soundEngine } from '../../audio/soundSystem';

interface CompanionsModalProps {
  companions: Companion[];
  setCompanions: React.Dispatch<React.SetStateAction<Companion[]>>;
  onClose: () => void;
}

export const CompanionsModal: React.FC<CompanionsModalProps> = ({ companions, setCompanions, onClose }) => {
  const handleSetState = (compId: string, newState: 'follow' | 'guard' | 'rest') => {
    setCompanions((prev) =>
      prev.map((c) => (c.id === compId ? { ...c, state: newState } : c))
    );
    soundEngine.playPickup();
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-3xl bg-[#1b1511] border-3 border-[#53402e] rounded-xl shadow-2xl p-5 flex flex-col gap-4 text-amber-100 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#413123] pb-2">
          <div className="flex items-center gap-2">
            <Users className="text-emerald-400" size={20} />
            <span className="font-pixel text-xl text-amber-300 font-bold">
              ĐỘI NGŨ THÀNH VIÊN ĐỒNG ĐỘI
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-[#2b221a] hover:bg-red-900/60 border border-[#4a3b2c] transition"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-amber-200/80 font-pixel">
          Khám phá khắp bản đồ để phá vỡ lồng giam và chiêu mộ các đồng đội. Họ sẽ sát cánh chiến đấu, hỗ trợ đào khoáng và bảo vệ căn cứ của bạn!
        </p>

        {/* 4 Companion Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto max-h-[60vh] pr-1">
          {companions.map((comp) => {
            const isUnlocked = comp.unlocked;

            return (
              <div
                key={comp.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition ${
                  isUnlocked
                    ? 'bg-[#221a14] border-[#4f3c2b] shadow-md'
                    : 'bg-[#15100c] border-[#2c2016] opacity-75'
                }`}
              >
                {/* Companion Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-pixel text-lg font-bold shadow-md shrink-0"
                      style={{ backgroundColor: comp.avatarColor, color: '#1a202c' }}
                    >
                      {isUnlocked ? comp.name.charAt(0) : <Lock size={16} className="text-stone-700" />}
                    </div>

                    <div>
                      <h4 className="font-pixel text-base font-bold text-amber-200">
                        {comp.name}
                      </h4>
                      <p className="text-[11px] text-amber-400/70 font-mono">
                        {comp.role}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-pixel px-2 py-0.5 rounded border ${
                      isUnlocked
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                        : 'bg-stone-900 text-stone-400 border-stone-800'
                    }`}
                  >
                    {isUnlocked ? 'ĐÃ CHIÊU MỘ' : 'CHƯA TÌM THẤY'}
                  </span>
                </div>

                {/* Perk & Lore */}
                <div className="bg-[#17110c] p-2.5 rounded-lg border border-[#33251a] text-xs">
                  <p className="text-amber-100/90 font-medium leading-relaxed mb-1">
                    ✨ <strong className="text-amber-300">Đặc Quyền:</strong> {comp.perkDescription}
                  </p>
                  {isUnlocked ? (
                    <p className="text-[11px] text-emerald-400/80 italic">
                      &quot;{comp.dialogue}&quot;
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-400/60 flex items-center gap-1">
                      <MapPin size={11} /> Vị trí gợi ý: Khám phá lồng sắt trong rừng hoặc hang động sâu.
                    </p>
                  )}
                </div>

                {/* Companion Action Controls (if unlocked) */}
                {isUnlocked ? (
                  <div className="flex items-center gap-1.5 pt-1 border-t border-[#33251a]">
                    <span className="text-[11px] font-pixel text-amber-300/80 mr-1">Lệnh:</span>
                    <button
                      onClick={() => handleSetState(comp.id, 'follow')}
                      className={`flex-1 py-1 rounded text-xs font-pixel transition ${
                        comp.state === 'follow'
                          ? 'bg-emerald-800 text-white font-bold'
                          : 'bg-[#2b221a] text-stone-300 hover:bg-[#382b20]'
                      }`}
                    >
                      Đi Theo
                    </button>
                    <button
                      onClick={() => handleSetState(comp.id, 'guard')}
                      className={`flex-1 py-1 rounded text-xs font-pixel transition ${
                        comp.state === 'guard'
                          ? 'bg-amber-800 text-white font-bold'
                          : 'bg-[#2b221a] text-stone-300 hover:bg-[#382b20]'
                      }`}
                    >
                      Bảo Vệ Căn Cứ
                    </button>
                    <button
                      onClick={() => handleSetState(comp.id, 'rest')}
                      className={`flex-1 py-1 rounded text-xs font-pixel transition ${
                        comp.state === 'rest'
                          ? 'bg-stone-700 text-white font-bold'
                          : 'bg-[#2b221a] text-stone-300 hover:bg-[#382b20]'
                      }`}
                    >
                      Nghỉ Ngơi
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-1 text-[11px] font-pixel text-stone-400">
                    Phá vỡ lồng sắt giam giữ bằng Cuốc hoặc Rìu để giải cứu
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
