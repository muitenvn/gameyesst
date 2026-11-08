/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Volume2, VolumeX, Music, RotateCcw, Home, X } from 'lucide-react';
import { soundEngine } from '../../audio/soundSystem';

interface PauseModalProps {
  onResume: () => void;
  onResetWorld: () => void;
  onReturnTitle: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  musicEnabled: boolean;
  setMusicEnabled: (v: boolean) => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onResetWorld,
  onReturnTitle,
  soundEnabled,
  setSoundEnabled,
  musicEnabled,
  setMusicEnabled,
}) => {
  return (
    <div className="absolute inset-0 z-50 bg-black/75 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-[#1b1511] border-3 border-[#53402e] rounded-xl shadow-2xl p-6 flex flex-col gap-5 text-amber-100">
        <div className="flex items-center justify-between border-b border-[#413123] pb-2">
          <span className="font-pixel text-2xl text-amber-300 font-bold">⏸️ TẠM DỪNG TRÒ CHƠI</span>
          <button
            onClick={onResume}
            className="p-1 rounded bg-[#2b221a] hover:bg-stone-800 border border-[#4a3b2c] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Audio Toggles */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              soundEngine.setSoundEnabled(next);
            }}
            className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-[#251c15] border border-[#443223] text-xs font-pixel hover:bg-[#34271e] transition"
          >
            {soundEnabled ? <Volume2 size={16} className="text-emerald-400" /> : <VolumeX size={16} className="text-stone-400" />}
            <span>Âm thanh: {soundEnabled ? 'BẬT' : 'TẮT'}</span>
          </button>

          <button
            onClick={() => {
              const next = !musicEnabled;
              setMusicEnabled(next);
              soundEngine.setMusicEnabled(next);
            }}
            className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-[#251c15] border border-[#443223] text-xs font-pixel hover:bg-[#34271e] transition"
          >
            <Music size={16} className={musicEnabled ? 'text-amber-400' : 'text-stone-400'} />
            <span>Nhạc nền: {musicEnabled ? 'BẬT' : 'TẮT'}</span>
          </button>
        </div>

        {/* Key controls summary */}
        <div className="bg-[#140f0c] p-3 rounded-lg border border-[#3e2e21] text-xs font-mono space-y-1 text-amber-200/80">
          <p className="font-bold text-amber-300 font-pixel text-sm mb-1">HƯỚNG DẪN ĐIỀU KHIỂN:</p>
          <p>• <strong>A / D</strong>: Di chuyển trái / phải</p>
          <p>• <strong>W / Space</strong>: Nhảy lên</p>
          <p>• <strong>S</strong>: Tụt xuống bậc thang gỗ</p>
          <p>• <strong>Chuột Trái</strong>: Đào khối / Chém kiếm / Bắn tên / Dùng đồ</p>
          <p>• <strong>Chuột Phải</strong>: Đặt khối / đuốc / bàn chế tạo</p>
          <p>• <strong>1 - 9</strong>: Chọn nhanh ô trên thanh hotbar</p>
          <p>• <strong>E</strong>: Mở túi đồ (30 ô)</p>
          <p>• <strong>C</strong>: Mở lò chế tạo trang bị</p>
          <p>• <strong>V</strong>: Quản lý thành viên đồng đội</p>
          <p>• <strong>Q</strong>: Uống bình máu nhanh</p>
        </div>

        {/* Main Menu Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onResume}
            className="w-full py-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 font-pixel text-base font-bold text-white shadow transition flex items-center justify-center gap-2"
          >
            <Play size={18} />
            <span>TIẾP TỤC CHƠI</span>
          </button>

          <button
            onClick={onResetWorld}
            className="w-full py-2.5 rounded-lg bg-[#2b221a] hover:bg-amber-900/60 border border-[#4a3b2c] font-pixel text-sm text-amber-200 transition flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            <span>Tạo Thế Giới Mới (Reset)</span>
          </button>

          <button
            onClick={onReturnTitle}
            className="w-full py-2.5 rounded-lg bg-[#221712] hover:bg-red-950/60 border border-[#3e251b] font-pixel text-sm text-red-300 transition flex items-center justify-center gap-2"
          >
            <Home size={16} />
            <span>Về Màn Hình Chính</span>
          </button>
        </div>
      </div>
    </div>
  );
};
