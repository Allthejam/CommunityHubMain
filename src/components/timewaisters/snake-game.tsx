'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Trophy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

const GRID_SIZE = 20;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export function SnakeGame() {
  const [snake, setSnake] = useState<Point[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('UP');
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState<number>(130); // ms per step

  const dirRef = useRef<Direction>('UP');
  dirRef.current = direction;

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_snake_best');
      if (saved) setHighScore(parseInt(saved, 10));
    } catch (e) {}
  }, []);

  // Generate random food not on snake body
  const spawnFood = useCallback((currentSnake: Point[]): Point => {
    while (true) {
      const rx = Math.floor(Math.random() * GRID_SIZE);
      const ry = Math.floor(Math.random() * GRID_SIZE);
      const onSnake = currentSnake.some((seg) => seg.x === rx && seg.y === ry);
      if (!onSnake) return { x: rx, y: ry };
    }
  }, []);

  // Reset Game
  const resetGame = useCallback(() => {
    const initSnake = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ];
    setSnake(initSnake);
    setDirection('UP');
    dirRef.current = 'UP';
    setFood(spawnFood(initSnake));
    setIsGameOver(false);
    setIsPaused(false);
    setScore(0);
  }, [spawnFood]);

  // Main game tick
  useEffect(() => {
    if (isGameOver || isPaused) return;

    const interval = setInterval(() => {
      setSnake((prevSnake) => {
        const head = { ...prevSnake[0] };
        const currentDir = dirRef.current;

        if (currentDir === 'UP') head.y -= 1;
        if (currentDir === 'DOWN') head.y += 1;
        if (currentDir === 'LEFT') head.x -= 1;
        if (currentDir === 'RIGHT') head.x += 1;

        // Wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setIsGameOver(true);
          return prevSnake;
        }

        // Self collision
        if (prevSnake.some((seg) => seg.x === head.x && seg.y === head.y)) {
          setIsGameOver(true);
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Eat food check
        if (head.x === food.x && head.y === food.y) {
          const nextScore = score + 10;
          setScore(nextScore);
          if (nextScore > highScore) {
            setHighScore(nextScore);
            try {
              localStorage.setItem('timewaisters_snake_best', nextScore.toString());
            } catch (e) {}
          }
          setFood(spawnFood(newSnake));
        } else {
          newSnake.pop(); // remove tail
        }

        return newSnake;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [isGameOver, isPaused, food, score, highScore, speed, spawnFood]);

  // Change direction safely (no 180 degree turns)
  const changeDirection = useCallback((newDir: Direction) => {
    const cur = dirRef.current;
    if (newDir === 'UP' && cur !== 'DOWN') setDirection('UP');
    if (newDir === 'DOWN' && cur !== 'UP') setDirection('DOWN');
    if (newDir === 'LEFT' && cur !== 'RIGHT') setDirection('LEFT');
    if (newDir === 'RIGHT' && cur !== 'LEFT') setDirection('RIGHT');
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) changeDirection('UP');
      if (['ArrowDown', 'KeyS'].includes(e.code)) changeDirection('DOWN');
      if (['ArrowLeft', 'KeyA'].includes(e.code)) changeDirection('LEFT');
      if (['ArrowRight', 'KeyD'].includes(e.code)) changeDirection('RIGHT');
      if (e.code === 'Space') setIsPaused((p) => !p);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection]);

  return (
    <div className="flex flex-col items-center justify-center max-w-xl mx-auto w-full gap-4 select-none">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between bg-card p-3 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-black text-primary">Retro Snake</h2>
          <p className="text-[11px] text-muted-foreground">Collect apples & beat the high score.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-muted px-3 py-1 rounded-lg text-center">
            <span className="block text-[10px] uppercase font-bold text-muted-foreground">Score</span>
            <span className="text-base font-extrabold">{score}</span>
          </div>

          <div className="bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-3 py-1 rounded-lg text-center">
            <span className="block text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">Best</span>
            <span className="text-base font-extrabold text-amber-900 dark:text-amber-200">{highScore}</span>
          </div>

          <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={() => setIsPaused((p) => !p)}>
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </Button>

          <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={resetGame}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Retro Arcade Grid Screen */}
      <div className="relative bg-slate-950 p-2 rounded-2xl shadow-2xl border-4 border-slate-800 w-full max-w-[380px] aspect-square overflow-hidden">
        <div
          className="grid gap-[1px] h-full w-full bg-slate-900/50"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
            const x = idx % GRID_SIZE;
            const y = Math.floor(idx / GRID_SIZE);
            const isHead = snake[0]?.x === x && snake[0]?.y === y;
            const isSnake = snake.some((seg) => seg.x === x && seg.y === y);
            const isFood = food.x === x && food.y === y;

            return (
              <div
                key={idx}
                className={cn(
                  'rounded-xs transition-colors',
                  isHead
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                    : isSnake
                    ? 'bg-emerald-600'
                    : isFood
                    ? 'bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500'
                    : 'bg-transparent'
                )}
              />
            );
          })}
        </div>

        {/* Game Over Screen */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in">
            <h3 className="text-3xl font-black text-red-500 mb-1">Game Over!</h3>
            <p className="text-xs text-slate-300 mb-4">You scored {score} points.</p>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={resetGame}>
              Play Again
            </Button>
          </div>
        )}

        {/* Pause Screen */}
        {isPaused && !isGameOver && (
          <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center text-white text-center">
            <h3 className="text-2xl font-black mb-2">Paused</h3>
            <Button size="sm" variant="secondary" onClick={() => setIsPaused(false)}>
              Resume
            </Button>
          </div>
        )}
      </div>

      {/* Touch D-Pad for Mobile */}
      <div className="flex flex-col items-center gap-1.5 w-full max-w-[240px]">
        <Button size="sm" variant="secondary" className="w-14 h-11" onClick={() => changeDirection('UP')}>
          <ArrowUp className="w-5 h-5" />
        </Button>
        <div className="flex gap-2 w-full justify-center">
          <Button size="sm" variant="secondary" className="w-14 h-11" onClick={() => changeDirection('LEFT')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Button size="sm" variant="secondary" className="w-14 h-11" onClick={() => changeDirection('DOWN')}>
            <ArrowDown className="w-5 h-5" />
          </Button>
          <Button size="sm" variant="secondary" className="w-14 h-11" onClick={() => changeDirection('RIGHT')}>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
