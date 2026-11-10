'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Trophy, Heart, Play, Pause, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  points: number;
  alive: boolean;
}

export function BrickBreakerGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Game state mutable refs for 60fps canvas loop
  const paddleRef = useRef({ x: 150, w: 75, h: 10 });
  const ballRef = useRef({ x: 180, y: 250, dx: 3, dy: -3, radius: 6 });
  const bricksRef = useRef<Brick[]>([]);

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_brick_best');
      if (saved) setHighScore(parseInt(saved, 10));
    } catch (e) {}
  }, []);

  // Initialize Bricks
  const initBricks = useCallback(() => {
    const rows = 4;
    const cols = 6;
    const padding = 6;
    const offsetTop = 40;
    const offsetLeft = 14;
    const brickW = 52;
    const brickH = 14;

    const colors = ['#ef4444', '#f97316', '#eab308', '#10b981'];
    const pts = [40, 30, 20, 10];

    const newBricks: Brick[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        newBricks.push({
          x: offsetLeft + c * (brickW + padding),
          y: offsetTop + r * (brickH + padding),
          w: brickW,
          h: brickH,
          color: colors[r],
          points: pts[r],
          alive: true,
        });
      }
    }
    bricksRef.current = newBricks;
  }, []);

  // Reset ball & paddle
  const resetBallAndPaddle = () => {
    paddleRef.current = { x: 140, w: 75, h: 10 };
    ballRef.current = { x: 180, y: 250, dx: (Math.random() > 0.5 ? 3 : -3), dy: -3.5, radius: 6 };
  };

  // Start new game
  const startNewGame = useCallback(() => {
    initBricks();
    resetBallAndPaddle();
    setScore(0);
    setLives(3);
    setIsGameOver(false);
    setIsWon(false);
    setIsRunning(true);
  }, [initBricks]);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const gameLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Bricks
      let remainingBricks = 0;
      for (const b of bricksRef.current) {
        if (b.alive) {
          remainingBricks++;
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.roundRect(b.x, b.y, b.w, b.h, 3);
          ctx.fill();
        }
      }

      // Check win
      if (remainingBricks === 0 && isRunning) {
        setIsWon(true);
        setIsRunning(false);
        return;
      }

      // Draw Paddle
      const p = paddleRef.current;
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(p.x, canvas.height - 20, p.w, p.h, 5);
      ctx.fill();

      // Draw Ball
      const ball = ballRef.current;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      // If running, compute physics
      if (isRunning) {
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Wall collisions
        if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= canvas.width) {
          ball.dx = -ball.dx;
        }
        if (ball.y - ball.radius <= 0) {
          ball.dy = -ball.dy;
        }

        // Paddle collision
        const paddleY = canvas.height - 20;
        if (
          ball.y + ball.radius >= paddleY &&
          ball.y - ball.radius <= paddleY + p.h &&
          ball.x >= p.x &&
          ball.x <= p.x + p.w &&
          ball.dy > 0
        ) {
          // Calculate bounce angle depending on where ball hit paddle
          const hitPoint = (ball.x - (p.x + p.w / 2)) / (p.w / 2);
          ball.dx = hitPoint * 4.5;
          ball.dy = -Math.abs(ball.dy);
        }

        // Brick collisions
        for (const b of bricksRef.current) {
          if (b.alive) {
            if (
              ball.x >= b.x &&
              ball.x <= b.x + b.w &&
              ball.y - ball.radius <= b.y + b.h &&
              ball.y + ball.radius >= b.y
            ) {
              b.alive = false;
              ball.dy = -ball.dy;
              setScore((s) => {
                const nextScore = s + b.points;
                if (nextScore > highScore) {
                  setHighScore(nextScore);
                  try {
                    localStorage.setItem('timewaisters_brick_best', nextScore.toString());
                  } catch (e) {}
                }
                return nextScore;
              });
              break;
            }
          }
        }

        // Bottom drop (lose life)
        if (ball.y - ball.radius >= canvas.height) {
          setLives((l) => {
            const nextLives = l - 1;
            if (nextLives <= 0) {
              setIsGameOver(true);
              setIsRunning(false);
            } else {
              resetBallAndPaddle();
            }
            return nextLives;
          });
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [isRunning, highScore]);

  // Touch / Mouse Move on canvas
  const handleMove = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const canvasX = (clientX - rect.left) * scaleX;
    const newX = Math.max(0, Math.min(canvas.width - paddleRef.current.w, canvasX - paddleRef.current.w / 2));
    paddleRef.current.x = newX;
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 25;
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        paddleRef.current.x = Math.max(0, paddleRef.current.x - step);
      }
      if (['ArrowRight', 'KeyD'].includes(e.code)) {
        paddleRef.current.x = Math.min(canvas.width - paddleRef.current.w, paddleRef.current.x + step);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center max-w-xl mx-auto w-full gap-4 select-none">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between bg-card p-3 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-black text-primary">Brick Breaker</h2>
          <p className="text-[11px] text-muted-foreground">Slide paddle to bounce ball & smash bricks.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-muted px-3 py-1 rounded-lg text-center">
            <span className="block text-[10px] uppercase font-bold text-muted-foreground">Score</span>
            <span className="text-sm font-extrabold">{score}</span>
          </div>

          <div className="flex items-center gap-1 text-red-500 font-bold text-xs">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={cn('w-4 h-4', i < lives ? 'fill-red-500 text-red-500' : 'text-slate-300 dark:text-slate-700')}
              />
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-amber-500">
            <Trophy className="w-3.5 h-3.5" /> Best: {highScore}
          </div>

          <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={() => setIsRunning((r) => !r)}>
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </Button>

          <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={startNewGame}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Arcade Canvas (360 x 360) */}
      <div className="relative bg-slate-950 p-2 rounded-2xl shadow-2xl border-4 border-slate-800 w-full max-w-[380px] aspect-square flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={360}
          height={360}
          onMouseMove={(e) => handleMove(e.clientX)}
          onTouchMove={(e) => {
            if (e.touches[0]) handleMove(e.touches[0].clientX);
          }}
          className="w-full h-full rounded-xl cursor-ew-resize bg-slate-900"
        />

        {/* Start Overlay */}
        {!isRunning && !isGameOver && !isWon && (
          <div className="absolute inset-0 bg-slate-950/70 rounded-2xl flex flex-col items-center justify-center p-6 text-white text-center">
            <h3 className="text-2xl font-black mb-2">Ready to Break?</h3>
            <p className="text-xs text-slate-300 mb-4">Slide paddle with finger or mouse.</p>
            <Button size="sm" className="bg-primary font-bold" onClick={() => setIsRunning(true)}>
              <Play className="w-4 h-4 mr-1.5" /> Launch Ball
            </Button>
          </div>
        )}

        {/* Win Overlay */}
        {isWon && (
          <div className="absolute inset-0 bg-emerald-950/90 rounded-2xl flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in zoom-in">
            <h3 className="text-3xl font-black text-emerald-400 mb-1">Bricks Cleared! 🎉</h3>
            <p className="text-xs text-slate-200 mb-4">Final Score: {score} points.</p>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={startNewGame}>
              Play Again
            </Button>
          </div>
        )}

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/85 rounded-2xl flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in">
            <h3 className="text-3xl font-black text-red-500 mb-1">Game Over!</h3>
            <p className="text-xs text-slate-300 mb-4">You scored {score} points.</p>
            <Button size="sm" className="bg-primary font-bold" onClick={startNewGame}>
              Try Again
            </Button>
          </div>
        )}
      </div>

      {/* On-screen paddle nudge buttons for touch */}
      <div className="flex gap-4 w-full max-w-[260px] justify-center">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1 h-10 font-bold"
          onClick={() => {
            paddleRef.current.x = Math.max(0, paddleRef.current.x - 35);
          }}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Left
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="flex-1 h-10 font-bold"
          onClick={() => {
            const canvas = canvasRef.current;
            if (canvas) {
              paddleRef.current.x = Math.min(canvas.width - paddleRef.current.w, paddleRef.current.x + 35);
            }
          }}
        >
          Right <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
