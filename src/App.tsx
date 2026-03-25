/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Heart, Play, RefreshCw, Music } from 'lucide-react';

import bearSrc from './assets/bear.png';
import bgSrc from './assets/background.png';
import itemSrc from './assets/item.png';
import item1Src from './assets/item1.png';
import item2Src from './assets/item2.png';
import item3Src from './assets/item3.png';

// Game Constants
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const BEAR_WIDTH = 100; // Increased from 80
const BEAR_HEIGHT = 125; // Increased from 100
const ITEM_SIZE = 45; // Slightly increased
const INITIAL_SPEED = 2.5;
const SPEED_INCREMENT = 0.02; // Increase per item spawned

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  imageIndex: number;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  
  // Image refs
  const bearImg = useRef<HTMLImageElement | null>(null);
  const bgImg = useRef<HTMLImageElement | null>(null);
  const itemImgs = useRef<HTMLImageElement[]>([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  const bearPos = useRef({ x: CANVAS_WIDTH / 2 - BEAR_WIDTH / 2 });
  const items = useRef<GameObject[]>([]);
  const frameId = useRef<number>(0);
  const lastTime = useRef<number>(0);
  const speedMultiplier = useRef(1);

  // Load assets
  useEffect(() => {
    const loadImg = (src: string) => {
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null as any); // Fallback to drawing if image fails
      });
    };

    Promise.all([
      loadImg(bearSrc),
      loadImg(bgSrc),
      loadImg(itemSrc),
      loadImg(item1Src),
      loadImg(item2Src),
      loadImg(item3Src)
    ]).then(([bear, bg, ...itemsList]) => {
      bearImg.current = bear;
      bgImg.current = bg;
      itemImgs.current = itemsList.filter(img => img !== null);
      setAssetsLoaded(true);
    });
  }, []);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('bear-catcher-highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // Handle Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        bearPos.current.x = Math.max(0, bearPos.current.x - 25);
      } else if (e.key === 'ArrowRight') {
        bearPos.current.x = Math.min(CANVAS_WIDTH - BEAR_WIDTH, bearPos.current.x + 25);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const x = (e.clientX - rect.left) * scaleX;
      bearPos.current.x = Math.max(0, Math.min(CANVAS_WIDTH - BEAR_WIDTH, x - BEAR_WIDTH / 2));
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const x = (e.touches[0].clientX - rect.left) * scaleX;
      bearPos.current.x = Math.max(0, Math.min(CANVAS_WIDTH - BEAR_WIDTH, x - BEAR_WIDTH / 2));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const spawnItem = () => {
    const x = Math.random() * (CANVAS_WIDTH - ITEM_SIZE);
    const imageIndex = Math.floor(Math.random() * itemImgs.current.length);
    // Minimal random variance (0.5 instead of 2.0)
    const baseSpeed = INITIAL_SPEED + (Math.random() * 0.5);
    items.current.push({
      x,
      y: -ITEM_SIZE,
      width: ITEM_SIZE,
      height: ITEM_SIZE,
      speed: baseSpeed * speedMultiplier.current,
      imageIndex
    });
  };

  const gameLoop = (time: number) => {
    if (gameState !== 'PLAYING') return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Background
    if (bgImg.current) {
      ctx.drawImage(bgImg.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#E5E7EB';
      ctx.fillRect(50, 150, 300, 300);
      ctx.fillStyle = '#D1D5DB';
      for (let i = 0; i < 6; i++) ctx.fillRect(70 + i * 50, 200, 20, 250);
      ctx.beginPath();
      ctx.moveTo(40, 150); ctx.lineTo(200, 80); ctx.lineTo(360, 150);
      ctx.fillStyle = '#9CA3AF'; ctx.fill();
    }

    // Draw Bear
    const bx = bearPos.current.x;
    const by = CANVAS_HEIGHT - BEAR_HEIGHT - 20;
    
    if (bearImg.current) {
      ctx.drawImage(bearImg.current, bx, by, BEAR_WIDTH, BEAR_HEIGHT);
    } else {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(bx + 10, by + 30, 60, 60);
      ctx.fillRect(bx + 15, by, 50, 40);
      ctx.fillRect(bx + 10, by - 5, 15, 15);
      ctx.fillRect(bx + 55, by - 5, 15, 15);
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(bx + 15, by - 10, 50, 15);
      ctx.fillStyle = '#D97706';
      ctx.fillRect(bx + 5, by + 50, 70, 30);
    }

    // Update and Draw Items
    if (time - lastTime.current > 1000 / speedMultiplier.current) {
      spawnItem();
      lastTime.current = time;
      speedMultiplier.current += SPEED_INCREMENT; // Noticeable speed increase per item
    }

    for (let i = items.current.length - 1; i >= 0; i--) {
      const item = items.current[i];
      item.y += item.speed;

      const currentItemImg = itemImgs.current[item.imageIndex];
      if (currentItemImg) {
        ctx.drawImage(currentItemImg, item.x, item.y, item.width, item.height);
      } else {
        ctx.fillStyle = '#FBBF24';
        ctx.beginPath();
        ctx.arc(item.x + 20, item.y + 20, 15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Collision Detection
      if (
        item.y + item.height > by + 40 &&
        item.y < by + 80 &&
        item.x + item.width > bx &&
        item.x < bx + BEAR_WIDTH
      ) {
        setScore(s => {
          const newScore = s + 10;
          // Small speed boost every 100 points
          if (newScore % 100 === 0) {
            speedMultiplier.current += 0.05;
          }
          return newScore;
        });
        items.current.splice(i, 1);
        continue;
      }

      // Missed Item
      if (item.y > CANVAS_HEIGHT) {
        setLives(l => {
          if (l <= 1) {
            setGameState('GAMEOVER');
            return 0;
          }
          return l - 1;
        });
        items.current.splice(i, 1);
      }
    }

    frameId.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    if (gameState === 'PLAYING') {
      frameId.current = requestAnimationFrame(gameLoop);
    } else {
      cancelAnimationFrame(frameId.current);
    }
    return () => cancelAnimationFrame(frameId.current);
  }, [gameState]);

  const startGame = () => {
    setScore(0);
    setLives(3);
    items.current = [];
    speedMultiplier.current = 1;
    setGameState('PLAYING');
  };

  useEffect(() => {
    if (gameState === 'GAMEOVER') {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('bear-catcher-highscore', score.toString());
      }
    }
  }, [gameState, score, highScore]);

  return (
    <div className="fixed inset-0 bg-zinc-900 flex flex-col items-center justify-center font-arco text-white overflow-hidden touch-none">
      <div className="relative bg-zinc-800 p-1 rounded-2xl shadow-2xl border-2 border-zinc-700 w-full max-w-[400px] aspect-[2/3]">
        {/* HUD */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10 pointer-events-none">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="font-bold text-xl leading-none">{score}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                className={`w-5 h-5 transition-all duration-300 ${i < lives ? 'text-red-500 fill-red-500 scale-110' : 'text-zinc-600 scale-90'}`}
              />
            ))}
          </div>
        </div>

        {/* Game Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full rounded-xl bg-sky-200 cursor-none touch-none object-cover"
        />

        {/* Overlays */}
        <AnimatePresence>
          {gameState === 'START' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded-xl z-20 p-6"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="text-center"
              >
                <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight text-yellow-400 italic uppercase leading-tight drop-shadow-lg">
                  Нескучный<br/>Мишка
                </h1>
                <p className="text-zinc-200 mb-10 text-lg">Лови всё, что падает!</p>
                <button
                  onClick={startGame}
                  className="group relative px-10 py-5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                >
                  <Play className="w-6 h-6 fill-current" />
                  <span className="text-xl">ИГРАТЬ</span>
                </button>
                <div className="mt-10 text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">
                  Двигай пальцем или мышкой
                </div>
              </motion.div>
            </motion.div>
          )}

          {gameState === 'GAMEOVER' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md rounded-xl z-20 p-6"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="text-center w-full"
              >
                <h2 className="text-4xl font-black mb-6 text-red-500 italic uppercase drop-shadow-lg">Конец игры</h2>
                <div className="space-y-6 mb-10">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-zinc-400 text-xs uppercase font-bold tracking-widest mb-1">Твой счёт</p>
                    <p className="text-7xl font-black text-white">{score}</p>
                  </div>
                  {score >= highScore && score > 0 && (
                    <motion.p
                      animate={{ scale: [1, 1.1, 1], rotate: [-2, 2, -2] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="text-yellow-400 font-bold text-xl"
                    >
                      🎉 НОВЫЙ РЕКОРД! 🎉
                    </motion.p>
                  )}
                  <div className="flex justify-center gap-8">
                    <div>
                      <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Рекорд</p>
                      <p className="text-2xl font-bold text-zinc-300">{highScore}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={startGame}
                  className="w-full max-w-[240px] px-8 py-5 bg-white text-black font-bold rounded-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 mx-auto shadow-xl"
                >
                  <RefreshCw className="w-6 h-6" />
                  <span className="text-lg">ЕЩЁ РАЗ</span>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="mt-6 flex items-center gap-6 text-zinc-500 opacity-60">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Ярославль</span>
        </div>
      </div>
    </div>
  );
}
