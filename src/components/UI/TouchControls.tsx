/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Crosshair } from 'lucide-react';

interface TouchControlsProps {
  touchInput: { left: boolean; right: boolean; jump: boolean; attack: boolean; down: boolean };
  setTouchInput: React.Dispatch<
    React.SetStateAction<{ left: boolean; right: boolean; jump: boolean; attack: boolean; down: boolean }>
  >;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ touchInput, setTouchInput }) => {
  const setKey = (key: keyof typeof touchInput, val: boolean) => {
    setTouchInput((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none flex justify-between items-end p-4 pb-16">
      {/* Left D-pad (Move Left / Right / Down) */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onTouchStart={() => setKey('left', true)}
          onTouchEnd={() => setKey('left', false)}
          onMouseDown={() => setKey('left', true)}
          onMouseUp={() => setKey('left', false)}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition ${
            touchInput.left
              ? 'bg-amber-600 border-amber-300 scale-95'
              : 'bg-black/50 border-amber-900/60 active:bg-amber-700/60'
          }`}
        >
          <ArrowLeft size={24} className="text-amber-100" />
        </button>

        <div className="flex flex-col gap-2">
          <button
            onTouchStart={() => setKey('down', true)}
            onTouchEnd={() => setKey('down', false)}
            onMouseDown={() => setKey('down', true)}
            onMouseUp={() => setKey('down', false)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition ${
              touchInput.down
                ? 'bg-amber-600 border-amber-300 scale-95'
                : 'bg-black/50 border-amber-900/60 active:bg-amber-700/60'
            }`}
          >
            <ArrowDown size={20} className="text-amber-100" />
          </button>
        </div>

        <button
          onTouchStart={() => setKey('right', true)}
          onTouchEnd={() => setKey('right', false)}
          onMouseDown={() => setKey('right', true)}
          onMouseUp={() => setKey('right', false)}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition ${
            touchInput.right
              ? 'bg-amber-600 border-amber-300 scale-95'
              : 'bg-black/50 border-amber-900/60 active:bg-amber-700/60'
          }`}
        >
          <ArrowRight size={24} className="text-amber-100" />
        </button>
      </div>

      {/* Right Action buttons (Jump & Attack / Mine) */}
      <div className="pointer-events-auto flex items-center gap-3">
        <button
          onTouchStart={() => setKey('jump', true)}
          onTouchEnd={() => setKey('jump', false)}
          onMouseDown={() => setKey('jump', true)}
          onMouseUp={() => setKey('jump', false)}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition ${
            touchInput.jump
              ? 'bg-emerald-600 border-emerald-300 scale-95'
              : 'bg-black/50 border-emerald-900/60 active:bg-emerald-700/60'
          }`}
        >
          <ArrowUp size={24} className="text-emerald-200" />
        </button>

        <button
          onTouchStart={() => setKey('attack', true)}
          onTouchEnd={() => setKey('attack', false)}
          onMouseDown={() => setKey('attack', true)}
          onMouseUp={() => setKey('attack', false)}
          className={`w-16 h-16 rounded-3xl flex items-center justify-center border-2 transition shadow-xl ${
            touchInput.attack
              ? 'bg-rose-600 border-rose-300 scale-95'
              : 'bg-gradient-to-br from-amber-700 to-rose-800 border-rose-400'
          }`}
        >
          <Crosshair size={28} className="text-white" />
        </button>
      </div>
    </div>
  );
};
