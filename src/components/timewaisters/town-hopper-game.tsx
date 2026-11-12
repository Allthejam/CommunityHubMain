'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Trophy,
  RotateCcw,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function TownHopperGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_townhopper_highscore');
      if (saved) setHighScore(parseInt(saved, 10));
    } catch {
      // ignore
    }
  }, []);

  const saveHighScore = (newScore: number) => {
    if (newScore > highScore) {
      setHighScore(newScore);
      try {
        localStorage.setItem('timewaisters_townhopper_highscore', newScore.toString());
      } catch {
        // ignore
      }
    }
  };

  // Game internal loop refs
  const stateRef = useRef({
    gameState: 'idle' as 'idle' | 'playing' | 'gameover',
    score: 0,
    birdY: 200,
    birdVelocity: 0,
    gravity: 0.38,
    jump: -6.5,
    pipes: [] as { x: number; top: number; bottom: number; passed: boolean }[],
    pipeSpeed: 2.2,
    pipeSpawnTimer: 0,
    clouds: [] as { x: number; y: number; speed: number; r: number }[],
  });

  // Flap jump function
  const flap = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState === 'idle') {
      s.gameState = 'playing';
      s.score = 0;
      s.birdY = 200;
      s.birdVelocity = s.jump;
      s.pipes = [];
      setGameState('playing');
      setScore(0);
    } else if (s.gameState === 'playing') {
      s.birdVelocity = s.jump;
    } else if (s.gameState === 'gameover') {
      s.gameState = 'playing';
      s.score = 0;
      s.birdY = 200;
      s.birdVelocity = s.jump;
      s.pipes = [];
      setGameState('playing');
      setScore(0);
    }
  }, []);

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flap]);

  // Main Canvas Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const s = stateRef.current;

    // Init clouds
    if (s.clouds.length === 0) {
      s.clouds = [
        { x: 40, y: 60, speed: 0.4, r: 24 },
        { x: 180, y: 110, speed: 0.3, r: 30 },
        { x: 300, y: 75, speed: 0.5, r: 20 },
      ];
    }

    const width = 360;
    const height = 480;
    const birdX = 80;
    const birdRadius = 14;
    const pipeGap = 125;
    const groundHeight = 50;

    const loop = () => {
      // 1. Clear background
      const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
      skyGradient.addColorStop(0, '#38bdf8'); // sky blue
      skyGradient.addColorStop(0.7, '#bae6fd');
      skyGradient.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw & move clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      s.clouds.forEach((c) => {
        if (s.gameState === 'playing') {
          c.x -= c.speed;
          if (c.x < -60) c.x = width + 40;
        }
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.arc(c.x + c.r * 0.7, c.y - c.r * 0.2, c.r * 0.8, 0, Math.PI * 2);
        ctx.arc(c.x - c.r * 0.7, c.y + c.r * 0.1, c.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Draw skyline hills
      ctx.fillStyle = '#6ee7b7';
      ctx.beginPath();
      ctx.moveTo(0, height - groundHeight);
      ctx.quadraticCurveTo(80, height - groundHeight - 40, 180, height - groundHeight - 15);
      ctx.quadraticCurveTo(280, height - groundHeight + 10, width, height - groundHeight - 30);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fill();

      // 4. Update Game State
      if (s.gameState === 'playing') {
        s.birdVelocity += s.gravity;
        s.birdY += s.birdVelocity;

        // Pipe spawning
        s.pipeSpawnTimer++;
        if (s.pipeSpawnTimer > 95) {
          s.pipeSpawnTimer = 0;
          const minPipe = 50;
          const maxPipe = height - groundHeight - pipeGap - minPipe;
          const topHeight = Math.floor(Math.random() * (maxPipe - minPipe + 1)) + minPipe;
          s.pipes.push({
            x: width,
            top: topHeight,
            bottom: height - groundHeight - (topHeight + pipeGap),
            passed: false,
          });
        }

        // Move pipes & collision
        for (let i = s.pipes.length - 1; i >= 0; i--) {
          const p = s.pipes[i];
          p.x -= s.pipeSpeed;

          // Check score pass
          if (!p.passed && p.x + 48 < birdX) {
            p.passed = true;
            s.score += 1;
            setScore(s.score);
          }

          // Collision detection with pipe
          const inX = birdX + birdRadius > p.x && birdX - birdRadius < p.x + 48;
          const inTop = s.birdY - birdRadius < p.top;
          const inBottom = s.birdY + birdRadius > height - groundHeight - p.bottom;

          if (inX && (inTop || inBottom)) {
            // Crash!
            s.gameState = 'gameover';
            setGameState('gameover');
            saveHighScore(s.score);
          }

          // Remove off-screen pipes
          if (p.x < -60) {
            s.pipes.splice(i, 1);
          }
        }

        // Ground / ceiling collision
        if (s.birdY + birdRadius >= height - groundHeight || s.birdY - birdRadius <= 0) {
          s.gameState = 'gameover';
          setGameState('gameover');
          saveHighScore(s.score);
        }
      }

      // 5. Draw Pipes (Town Chimneys / Stone Pillars)
      s.pipes.forEach((p) => {
        // Top chimney
        const topGrad = ctx.createLinearGradient(p.x, 0, p.x + 48, 0);
        topGrad.addColorStop(0, '#b45309');
        topGrad.addColorStop(0.5, '#d97706');
        topGrad.addColorStop(1, '#92400e');
        ctx.fillStyle = topGrad;
        ctx.fillRect(p.x, 0, 48, p.top);
        // Chimney rim
        ctx.fillStyle = '#78350f';
        ctx.fillRect(p.x - 3, p.top - 16, 54, 16);

        // Bottom chimney
        const botY = height - groundHeight - p.bottom;
        ctx.fillStyle = topGrad;
        ctx.fillRect(p.x, botY, 48, p.bottom);
        // Chimney rim
        ctx.fillStyle = '#78350f';
        ctx.fillRect(p.x - 3, botY, 54, 16);
      });

      // 6. Draw Ground
      ctx.fillStyle = '#15803d'; // grass
      ctx.fillRect(0, height - groundHeight, width, 12);
      ctx.fillStyle = '#713f12'; // soil
      ctx.fillRect(0, height - groundHeight + 12, width, groundHeight - 12);

      // 7. Draw Bird / Mascot
      ctx.save();
      ctx.translate(birdX, s.birdY);
      const angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, s.birdVelocity * 0.08));
      ctx.rotate(angle);

      // Mascot body (cute yellow chick/mascot)
      ctx.fillStyle = '#facc15'; // bright yellow
      ctx.beginPath();
      ctx.arc(0, 0, birdRadius, 0, Math.PI * 2);
      ctx.fill();

      // Wing
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(-4, 2, 7, 5, s.birdVelocity < 0 ? -0.4 : 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(6, -4, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(7.5, -4, 2, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(11, -2);
      ctx.lineTo(19, 1);
      ctx.lineTo(11, 4);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // 8. On-screen Score / Overlay text
      if (s.gameState === 'playing') {
        ctx.font = 'bold 36px monospace';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillText(s.score.toString(), width / 2 - 10, 62);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(s.score.toString(), width / 2 - 12, 60);
      } else if (s.gameState === 'idle') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
        ctx.fillRect(20, 160, width - 40, 130);

        ctx.font = 'bold 22px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('Town Hopper', width / 2, 205);

        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#fde047';
        ctx.fillText('Tap Screen or Space to Flap', width / 2, 240);
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('Dodge the chimneys to score points!', width / 2, 262);
        ctx.textAlign = 'start';
      } else if (s.gameState === 'gameover') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(20, 150, width - 40, 150);

        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#f43f5e';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over!', width / 2, 195);

        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Score: ${s.score}`, width / 2, 230);

        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#facc15';
        ctx.fillText('Tap to Try Again', width / 2, 265);
        ctx.textAlign = 'start';
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [saveHighScore]);

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center">
      {/* Top Bar Stats */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <Badge variant="outline" className="text-xs bg-muted/50 font-normal">
          One-Finger Reflex
        </Badge>
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5" />
            <span>High Score: {highScore}</span>
          </div>
        </div>
      </div>

      {/* Canvas Arcade Frame */}
      <Card
        className="w-full shadow-lg border-2 border-border/80 overflow-hidden cursor-pointer select-none rounded-2xl relative"
        onClick={flap}
      >
        <canvas
          ref={canvasRef}
          width={360}
          height={480}
          className="w-full h-auto block touch-none"
        />
      </Card>

      {/* Big Touch Action Button for Mobile */}
      <div className="w-full mt-3 flex items-center justify-center gap-3">
        <Button
          onClick={flap}
          size="lg"
          className="w-full h-12 text-base font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md active:scale-95 transition-all gap-2"
        >
          <Zap className="w-5 h-5 fill-current" />
          <span>{gameState === 'gameover' ? 'Play Again (Tap / Flap)' : 'TAP TO FLAP'}</span>
        </Button>
      </div>
    </div>
  );
}
