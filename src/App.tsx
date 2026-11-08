/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Player, Companion, Boss } from './types/game';
import { INITIAL_COMPANIONS } from './engine/companions';
import { GameCanvas } from './components/GameCanvas';
import { TitleScreen } from './components/UI/TitleScreen';
import { GameHUD } from './components/UI/GameHUD';
import { InventoryModal } from './components/UI/InventoryModal';
import { CraftingPanel } from './components/UI/CraftingPanel';
import { CompanionsModal } from './components/UI/CompanionsModal';
import { PauseModal } from './components/UI/PauseModal';
import { TouchControls } from './components/UI/TouchControls';
import { soundEngine } from './audio/soundSystem';

export default function App() {
  const [gameMode, setGameMode] = useState<'title' | 'playing'>('title');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(false);
  const [isCraftingOpen, setIsCraftingOpen] = useState<boolean>(false);
  const [isCompanionsOpen, setIsCompanionsOpen] = useState<boolean>(false);

  // Audio toggles
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true);

  // Notifications
  const [notification, setNotification] = useState<string | null>(null);

  // Touch controls
  const [showTouchControls, setShowTouchControls] = useState<boolean>(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });
  const [touchInput, setTouchInput] = useState<{
    left: boolean;
    right: boolean;
    jump: boolean;
    attack: boolean;
    down: boolean;
  }>({
    left: false,
    right: false,
    jump: false,
    attack: false,
    down: false,
  });

  // World & Entities State
  const [playerState, setPlayerState] = useState<Player>({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    width: 14,
    height: 24,
    grounded: false,
    facing: 1,
    hp: 100,
    maxHp: 100,
    mana: 50,
    maxMana: 50,
    defense: 2,
    invulnerableTimer: 0,
    swingAngle: 0,
    swingTimer: 0,
    swingMax: 20,
    isMining: false,
    miningX: 0,
    miningY: 0,
    miningProgress: 0,
    selectedHotbarIndex: 0,
    inventory: new Array(30).fill(null),
    equippedArmor: {
      helmet: null,
      chest: null,
      boots: null,
    },
  });

  const [companions, setCompanions] = useState<Companion[]>(INITIAL_COMPANIONS);
  const [activeBoss, setActiveBoss] = useState<Boss | null>(null);

  // Notification auto-dismiss timer
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Global key listener for Title Screen [Enter] / [Space]
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (gameMode === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        soundEngine.playJump();
        soundEngine.startMusic(false);
        setGameMode('playing');
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [gameMode]);

  // Reset World Handler
  const handleResetWorld = () => {
    setIsPaused(false);
    window.location.reload();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#121612]">
      {/* 2D Canvas Viewport */}
      {gameMode === 'playing' && (
        <GameCanvas
          onOpenInventory={() => setIsInventoryOpen(true)}
          onOpenCrafting={() => setIsCraftingOpen(true)}
          onOpenCompanions={() => setIsCompanionsOpen(true)}
          onTogglePause={() => setIsPaused(!isPaused)}
          playerState={playerState}
          setPlayerState={setPlayerState}
          companions={companions}
          setCompanions={setCompanions}
          activeBoss={activeBoss}
          setActiveBoss={setActiveBoss}
          notification={notification}
          setNotification={setNotification}
          touchInput={touchInput}
        />
      )}

      {/* Title Screen */}
      {gameMode === 'title' && (
        <TitleScreen
          onStartGame={() => setGameMode('playing')}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          musicEnabled={musicEnabled}
          setMusicEnabled={setMusicEnabled}
        />
      )}

      {/* In-game HUD */}
      {gameMode === 'playing' && (
        <GameHUD
          player={playerState}
          activeBoss={activeBoss}
          companions={companions}
          notification={notification}
          onOpenInventory={() => setIsInventoryOpen(true)}
          onOpenCrafting={() => setIsCraftingOpen(true)}
          onOpenCompanions={() => setIsCompanionsOpen(true)}
          onTogglePause={() => setIsPaused(true)}
          onSelectHotbar={(idx) => setPlayerState((prev) => ({ ...prev, selectedHotbarIndex: idx }))}
          showTouchControls={showTouchControls}
          setShowTouchControls={setShowTouchControls}
        />
      )}

      {/* Mobile Touch Controls */}
      {gameMode === 'playing' && showTouchControls && (
        <TouchControls touchInput={touchInput} setTouchInput={setTouchInput} />
      )}

      {/* Modals */}
      {isInventoryOpen && (
        <InventoryModal
          player={playerState}
          setPlayer={setPlayerState}
          onClose={() => setIsInventoryOpen(false)}
        />
      )}

      {isCraftingOpen && (
        <CraftingPanel
          player={playerState}
          setPlayer={setPlayerState}
          onClose={() => setIsCraftingOpen(false)}
        />
      )}

      {isCompanionsOpen && (
        <CompanionsModal
          companions={companions}
          setCompanions={setCompanions}
          onClose={() => setIsCompanionsOpen(false)}
        />
      )}

      {isPaused && (
        <PauseModal
          onResume={() => setIsPaused(false)}
          onResetWorld={handleResetWorld}
          onReturnTitle={() => {
            setIsPaused(false);
            setGameMode('title');
          }}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          musicEnabled={musicEnabled}
          setMusicEnabled={setMusicEnabled}
        />
      )}
    </div>
  );
}
