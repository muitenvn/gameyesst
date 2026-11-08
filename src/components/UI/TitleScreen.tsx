/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Volume2, VolumeX, Music, Shield, Compass, Sparkles } from 'lucide-react';
import { soundEngine } from '../../audio/soundSystem';

interface TitleScreenProps {
  onStartGame: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  musicEnabled: boolean;
  setMusicEnabled: (v: boolean) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  soundEnabled,
  setSoundEnabled,
  musicEnabled,
  setMusicEnabled,
}) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between p-6 bg-[#0f1410] bg-radial-[at_center_center] from-[#1c271b] via-[#121913] to-[#0a0d0a] text-amber-100 select-none">
      {/* Top bar with quick sound toggles */}
      <div className="w-full max-w-4xl flex items-center justify-between text-xs text-amber-300/80">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-pixel text-sm tracking-wider">PHIÊN BẢN 2D SINH TỒN THÁM HIỂM</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              soundEngine.setSoundEnabled(next);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1e271c] border border-amber-900/60 hover:bg-[#283526] transition"
          >
            {soundEnabled ? <Volume2 size={15} className="text-emerald-400" /> : <VolumeX size={15} className="text-stone-400" />}
            <span className="text-xs">Hiệu ứng: {soundEnabled ? 'Bật' : 'Tắt'}</span>
          </button>
          <button
            onClick={() => {
              const next = !musicEnabled;
              setMusicEnabled(next);
              soundEngine.setMusicEnabled(next);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1e271c] border border-amber-900/60 hover:bg-[#283526] transition"
          >
            <Music size={15} className={musicEnabled ? 'text-amber-400' : 'text-stone-400'} />
            <span className="text-xs">Nhạc nền: {musicEnabled ? 'Bật' : 'Tắt'}</span>
          </button>
        </div>
      </div>

      {/* Hero centerpiece & bespoke inline SVG title */}
      <div className="flex flex-col items-center text-center max-w-2xl my-auto">
        {/* Bespoke inline logo */}
        <div className="relative mb-4">
          <div className="w-24 h-24 mx-auto mb-2 relative flex items-center justify-center">
            {/* Pixelated decorative sword & pickaxe crest */}
            <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
              <rect x="28" y="8" width="8" height="40" fill="#718096" />
              <rect x="24" y="24" width="16" height="6" fill="#ecc94b" />
              <rect x="29" y="48" width="6" height="10" fill="#8a5c36" />
              <rect x="20" y="10" width="8" height="8" fill="#48bb78" />
              <rect x="36" y="10" width="8" height="8" fill="#48bb78" />
              <circle cx="32" cy="18" r="4" fill="#f6ad55" />
            </svg>
          </div>

          <h1 className="font-pixel text-6xl md:text-7xl font-bold tracking-wider text-amber-200 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
            TERRACRAFT 2D
          </h1>
          <p className="text-amber-300/80 text-sm md:text-base font-medium mt-1 tracking-wide">
            Thế Giới Sinh Tồn · Khám Phá · Xây Căn Cứ & Giải Cứu Đồng Đội
          </p>
        </div>

        {/* Feature Pills */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-lg mb-8 text-left">
          <div className="bg-[#1b2419]/80 border border-emerald-900/50 p-2.5 rounded-lg flex items-center gap-2">
            <Compass className="text-emerald-400 shrink-0" size={18} />
            <div>
              <p className="text-xs font-bold text-amber-100">Khai Khoáng & Xây</p>
              <p className="text-[10px] text-amber-300/60">Đào mỏ, chặt gỗ, dựng nhà</p>
            </div>
          </div>
          <div className="bg-[#1b2419]/80 border border-emerald-900/50 p-2.5 rounded-lg flex items-center gap-2">
            <Shield className="text-amber-400 shrink-0" size={18} />
            <div>
              <p className="text-xs font-bold text-amber-100">Chiêu Mộ Đội Ngũ</p>
              <p className="text-[10px] text-amber-300/60">4 đồng đội trợ chiến</p>
            </div>
          </div>
          <div className="bg-[#1b2419]/80 border border-emerald-900/50 p-2.5 rounded-lg flex items-center gap-2">
            <Sparkles className="text-red-400 shrink-0" size={18} />
            <div>
              <p className="text-xs font-bold text-amber-100">Săn 4 Boss Huyền Thoại</p>
              <p className="text-[10px] text-amber-300/60">Vua Slime, Mắt Rừng, Rồng</p>
            </div>
          </div>
        </div>

        {/* Start Game CTA */}
        <button
          onClick={() => {
            soundEngine.playJump();
            soundEngine.startMusic(false);
            onStartGame();
          }}
          className="group relative px-10 py-4 bg-gradient-to-b from-[#489c3b] to-[#2d6824] hover:from-[#56b547] hover:to-[#387e2d] text-white font-bold text-xl rounded-xl shadow-xl border-2 border-[#78ca6a] transition-all transform active:scale-95 flex items-center gap-3 cursor-pointer"
        >
          <Play size={24} className="fill-white" />
          <span>BẮT ĐẦU PHIÊU LƯU NGAY</span>
          <span className="text-xs bg-black/30 px-2 py-0.5 rounded font-pixel tracking-wider">
            [ENTER]
          </span>
        </button>
      </div>

      {/* Control hints */}
      <div className="w-full max-w-4xl text-center py-3 border-t border-amber-900/30 text-xs text-amber-300/70 font-mono flex flex-wrap items-center justify-center gap-4">
        <span><strong className="text-amber-200">A / D</strong> Di chuyển</span>
        <span>·</span>
        <span><strong className="text-amber-200">W / Space</strong> Nhảy</span>
        <span>·</span>
        <span><strong className="text-amber-200">S</strong> Tụt thang / Cúi</span>
        <span>·</span>
        <span><strong className="text-amber-200">Chuột Trái</strong> Đào mỏ / Tấn công</span>
        <span>·</span>
        <span><strong className="text-amber-200">Chuột Phải</strong> Đặt khối</span>
        <span>·</span>
        <span><strong className="text-amber-200">E</strong> Túi đồ</span>
        <span>·</span>
        <span><strong className="text-amber-200">C</strong> Bàn chế tạo</span>
        <span>·</span>
        <span><strong className="text-amber-200">V</strong> Đồng đội</span>
        <span>·</span>
        <span><strong className="text-amber-200">Q</strong> Uống máu nhanh</span>
      </div>
    </div>
  );
};
