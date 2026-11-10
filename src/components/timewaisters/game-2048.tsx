'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Trophy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Sparkles, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

type Grid = number[][];

const SIZE = 4;

const TILE_COLORS: Record<number, string> = {
  2: 'bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100 font-bold',
  4: 'bg-amber-200 text-amber-950 dark:bg-amber-800/60 dark:text-amber-100 font-bold',
  8: 'bg-orange-400 text-white shadow-sm font-extrabold',
  16: 'bg-orange-500 text-white shadow-sm font-extrabold',
  32: 'bg-orange-600 text-white shadow font-black',
  64: 'bg-red-500 text-white shadow font-black',
  128: 'bg-yellow-400 text-slate-950 shadow-md font-black text-2xl',
  256: 'bg-yellow-500 text-slate-950 shadow-md font-black text-2xl',
  512: 'bg-yellow-600 text-white shadow-lg font-black text-2xl',
  1024: 'bg-amber-500 text-white shadow-lg font-black text-xl ring-2 ring-yellow-300',
  2048: 'bg-emerald-500 text-white shadow-xl font-black text-xl ring-4 ring-yellow-400 animate-pulse',
};

export function Game2048() {
  const [grid, setGrid] = useState<Grid>(() => Array(SIZE).fill(0).map(() => Array(SIZE).fill(0)));
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasDismissedWin, setHasDismissedWin] = useState(false);

  // Load best score
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_2048_best');
      if (saved) setBestScore(parseInt(saved, 10));
    } catch (e) {}
  }, []);

  // Add random tile (2 or 4)
  const addRandomTile = useCallback((board: Grid): Grid => {
    const emptyCells: [number, number][] = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) emptyCells.push([r, c]);
      }
    }
    if (emptyCells.length === 0) return board;

    const [randR, randC] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const val = Math.random() < 0.9 ? 2 : 4;
    const newBoard = board.map((row) => [...row]);
    newBoard[randR][randC] = val;
    return newBoard;
  }, []);

  // Initialize new game
  const startNewGame = useCallback(() => {
    let board = Array(SIZE).fill(0).map(() => Array(SIZE).fill(0));
    board = addRandomTile(board);
    board = addRandomTile(board);
    setGrid(board);
    setScore(0);
    setIsWon(false);
    setIsGameOver(false);
    setHasDismissedWin(false);
  }, [addRandomTile]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // Check Game Over
  const checkGameOver = useCallback((board: Grid) => {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) return false;
        if (c < SIZE - 1 && board[r][c] === board[r][c + 1]) return false;
        if (r < SIZE - 1 && board[r][c] === board[r + 1][c]) return false;
      }
    }
    return true;
  }, []);

  // Slide & Merge Row Left
  const slideRow = (row: number[]): { newRow: number[]; gainedScore: number } => {
    const filtered = row.filter((val) => val !== 0);
    const newRow: number[] = [];
    let gainedScore = 0;

    for (let i = 0; i < filtered.length; i++) {
      if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
        const merged = filtered[i] * 2;
        newRow.push(merged);
        gainedScore += merged;
        i++; // skip next merged element
      } else {
        newRow.push(filtered[i]);
      }
    }

    while (newRow.length < SIZE) {
      newRow.push(0);
    }
    return { newRow, gainedScore };
  };

  // Move grid in direction
  const move = useCallback(
    (direction: 'left' | 'right' | 'up' | 'down') => {
      if (isGameOver) return;

      let changed = false;
      let totalGained = 0;
      let newGrid: Grid = grid.map((r) => [...r]);

      if (direction === 'left') {
        for (let r = 0; r < SIZE; r++) {
          const { newRow, gainedScore } = slideRow(newGrid[r]);
          if (newRow.some((val, idx) => val !== newGrid[r][idx])) changed = true;
          newGrid[r] = newRow;
          totalGained += gainedScore;
        }
      } else if (direction === 'right') {
        for (let r = 0; r < SIZE; r++) {
          const reversed = [...newGrid[r]].reverse();
          const { newRow, gainedScore } = slideRow(reversed);
          const restored = newRow.reverse();
          if (restored.some((val, idx) => val !== newGrid[r][idx])) changed = true;
          newGrid[r] = restored;
          totalGained += gainedScore;
        }
      } else if (direction === 'up') {
        for (let c = 0; c < SIZE; c++) {
          const col = [newGrid[0][c], newGrid[1][c], newGrid[2][c], newGrid[3][c]];
          const { newRow, gainedScore } = slideRow(col);
          for (let r = 0; r < SIZE; r++) {
            if (newGrid[r][c] !== newRow[r]) changed = true;
            newGrid[r][c] = newRow[r];
          }
          totalGained += gainedScore;
        }
      } else if (direction === 'down') {
        for (let c = 0; c < SIZE; c++) {
          const col = [newGrid[3][c], newGrid[2][c], newGrid[1][c], newGrid[0][c]];
          const { newRow, gainedScore } = slideRow(col);
          const restored = newRow.reverse();
          for (let r = 0; r < SIZE; r++) {
            if (newGrid[r][c] !== restored[r]) changed = true;
            newGrid[r][c] = restored[r];
          }
          totalGained += gainedScore;
        }
      }

      if (changed) {
        const nextGrid = addRandomTile(newGrid);
        setGrid(nextGrid);
        const nextScore = score + totalGained;
        setScore(nextScore);

        if (nextScore > bestScore) {
          setBestScore(nextScore);
          try {
            localStorage.setItem('timewaisters_2048_best', nextScore.toString());
          } catch (e) {}
        }

        // Check 2048 tile win
        if (!hasDismissedWin && nextGrid.some((row) => row.some((val) => val === 2048))) {
          setIsWon(true);
        }

        // Check game over
        if (checkGameOver(nextGrid)) {
          setIsGameOver(true);
        }
      }
    },
    [grid, isGameOver, score, bestScore, hasDismissedWin, addRandomTile, checkGameOver]
  );

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'ArrowLeft') move('left');
        if (e.key === 'ArrowRight') move('right');
        if (e.key === 'ArrowUp') move('up');
        if (e.key === 'ArrowDown') move('down');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  // Touch swipe support
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 30) {
      if (absX > absY) {
        move(dx > 0 ? 'right' : 'left');
      } else {
        move(dy > 0 ? 'down' : 'up');
      }
    }
    touchStartRef.current = null;
  };

  return (
    <div className="flex flex-col items-center justify-center max-w-xl mx-auto w-full gap-4 select-none">
      {/* Top Bar (Score & Best Score) */}
      <div className="w-full flex items-center justify-between bg-card p-3 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-primary">2048</h2>
          <p className="text-[11px] text-muted-foreground">Join the numbers to get to 2048!</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-muted px-3 py-1.5 rounded-lg text-center min-w-[70px]">
            <span className="block text-[10px] uppercase font-bold text-muted-foreground">Score</span>
            <span className="text-base font-extrabold text-foreground">{score}</span>
          </div>

          <div className="bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-3 py-1.5 rounded-lg text-center min-w-[70px]">
            <span className="block text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">Best</span>
            <span className="text-base font-extrabold text-amber-900 dark:text-amber-200">{bestScore}</span>
          </div>

          <Button size="sm" variant="outline" className="h-10 px-3 ml-1" onClick={startNewGame}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick Strategy Bar */}
      <div className="w-full max-w-[400px] flex items-center justify-between bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 rounded-lg text-xs text-amber-800 dark:text-amber-200">
        <span className="flex items-center gap-1.5 font-medium">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span><strong>Rule:</strong> Same numbers merge (2+2=4). <strong>Tip:</strong> Keep highest tile in a corner!</span>
        </span>
      </div>

      {/* 2048 Grid (4x4) with Swipe Support */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative bg-slate-300 dark:bg-slate-800 p-3 sm:p-4 rounded-2xl shadow-xl w-full max-w-[400px] aspect-square"
      >
        <div className="grid grid-cols-4 grid-rows-4 gap-2.5 sm:gap-3 h-full w-full">
          {grid.map((row, rIdx) =>
            row.map((cell, cIdx) => (
              <div
                key={`${rIdx}-${cIdx}`}
                className={cn(
                  'rounded-xl flex items-center justify-center font-extrabold text-xl sm:text-2xl transition-all duration-150',
                  cell === 0 ? 'bg-slate-200 dark:bg-slate-700/50' : TILE_COLORS[cell] || 'bg-slate-900 text-white'
                )}
              >
                {cell > 0 ? cell : ''}
              </div>
            ))
          )}
        </div>

        {/* Win Overlay */}
        {isWon && (
          <div className="absolute inset-0 bg-amber-500/90 dark:bg-amber-950/90 rounded-2xl flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in zoom-in">
            <Sparkles className="w-12 h-12 mb-2 animate-bounce" />
            <h3 className="text-3xl font-black mb-1">You Reached 2048!</h3>
            <p className="text-xs opacity-90 mb-4">Incredible job! Keep playing to reach 4096 or restart.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setIsWon(false)}>
                Keep Playing
              </Button>
              <Button size="sm" variant="outline" className="text-slate-900 bg-white" onClick={startNewGame}>
                New Game
              </Button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-900/85 rounded-2xl flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in">
            <h3 className="text-3xl font-black mb-1 text-red-400">Game Over!</h3>
            <p className="text-xs text-slate-300 mb-4">No more moves left. Final score: {score}</p>
            <Button size="sm" className="bg-primary text-primary-foreground font-bold" onClick={startNewGame}>
              Try Again
            </Button>
          </div>
        )}
      </div>

      {/* On-Screen Arrow Pad for Mobile & Casual Controls */}
      <div className="flex flex-col items-center gap-1.5 w-full max-w-[240px]">
        <Button size="sm" variant="secondary" className="w-14 h-11" onClick={() => move('up')}>
          <ArrowUp className="w-5 h-5" />
        </Button>
        <div className="flex gap-2 w-full justify-center">
          <Button size="sm" variant="secondary" className="w-14 h-11" onClick={() => move('left')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Button size="sm" variant="secondary" className="w-14 h-11" onClick={() => move('down')}>
            <ArrowDown className="w-5 h-5" />
          </Button>
          <Button size="sm" variant="secondary" className="w-14 h-11" onClick={() => move('right')}>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
