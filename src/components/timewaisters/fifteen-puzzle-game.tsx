'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  RotateCcw,
  Sparkles,
  Trophy,
  Clock,
  Shuffle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function FifteenPuzzleGame() {
  // Grid represented as 1D array of 16 elements (0 = empty space, 1-15 = numbers)
  const [tiles, setTiles] = useState<number[]>(() => [
    1, 2, 3, 4,
    5, 6, 7, 8,
    9, 10, 11, 12,
    13, 14, 15, 0,
  ]);

  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Best stats
  const [bestMoves, setBestMoves] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_15puzzle_bestmoves');
      if (saved) setBestMoves(parseInt(saved, 10));
    } catch {
      // ignore
    }
  }, []);

  // Timer
  useEffect(() => {
    if (!isPlaying || isWon) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isPlaying, isWon]);

  // Check if solved (1 to 15 in order, 0 at the end)
  const checkVictory = useCallback((current: number[]): boolean => {
    for (let i = 0; i < 15; i++) {
      if (current[i] !== i + 1) return false;
    }
    return current[15] === 0;
  }, []);

  // Guarantee solvable shuffle by applying random valid moves from the solved state
  const shuffleTiles = useCallback(() => {
    let current = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
    let emptyIdx = 15;
    let lastMovedIdx = -1;

    for (let step = 0; step < 160; step++) {
      const emptyR = Math.floor(emptyIdx / 4);
      const emptyC = emptyIdx % 4;
      const neighbors: number[] = [];

      if (emptyR > 0) neighbors.push((emptyR - 1) * 4 + emptyC);
      if (emptyR < 3) neighbors.push((emptyR + 1) * 4 + emptyC);
      if (emptyC > 0) neighbors.push(emptyR * 4 + (emptyC - 1));
      if (emptyC < 3) neighbors.push(emptyR * 4 + (emptyC + 1));

      // Avoid immediately undoing the previous move
      const valid = neighbors.filter((n) => n !== lastMovedIdx);
      const chosen = valid.length > 0 ? valid[Math.floor(Math.random() * valid.length)] : neighbors[0];

      current[emptyIdx] = current[chosen];
      current[chosen] = 0;
      lastMovedIdx = emptyIdx;
      emptyIdx = chosen;
    }

    setTiles(current);
    setMoves(0);
    setSeconds(0);
    setIsWon(false);
    setIsPlaying(true);
  }, []);

  useEffect(() => {
    shuffleTiles();
  }, [shuffleTiles]);

  // Click tile to slide
  const handleTileClick = (index: number) => {
    if (isWon) return;
    const tileVal = tiles[index];
    if (tileVal === 0) return;

    const r = Math.floor(index / 4);
    const c = index % 4;

    const emptyIdx = tiles.indexOf(0);
    const er = Math.floor(emptyIdx / 4);
    const ec = emptyIdx % 4;

    // Check if in same row or column
    const isAdjacent = (Math.abs(r - er) === 1 && c === ec) || (Math.abs(c - ec) === 1 && r === er);

    if (isAdjacent) {
      const nextTiles = [...tiles];
      nextTiles[emptyIdx] = tileVal;
      nextTiles[index] = 0;
      setTiles(nextTiles);
      setMoves((m) => m + 1);

      if (checkVictory(nextTiles)) {
        setIsWon(true);
        setIsPlaying(false);
        if (!bestMoves || moves + 1 < bestMoves) {
          setBestMoves(moves + 1);
          try {
            localStorage.setItem('timewaisters_15puzzle_bestmoves', (moves + 1).toString());
          } catch {
            // ignore
          }
        }
      }
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center">
      {/* Top Bar Stats */}
      <div className="w-full flex items-center justify-between mb-3 px-1 text-xs">
        <div className="flex items-center gap-1.5 font-mono">
          <Badge variant="outline">Moves: {moves}</Badge>
          <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatTime(seconds)}</span>
          </div>
        </div>

        {bestMoves && (
          <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold">
            <Trophy className="w-3 h-3" />
            <span>Best: {bestMoves} moves</span>
          </div>
        )}
      </div>

      {/* 4x4 Wooden Grid Card */}
      <Card className="w-full p-3 shadow-lg border-2 border-amber-950/40 rounded-2xl bg-amber-950/15">
        <div className="grid grid-cols-4 gap-2 aspect-square p-2 bg-amber-950/80 rounded-xl border border-amber-900 shadow-inner">
          {tiles.map((val, idx) => {
            const isEmpty = val === 0;
            return (
              <button
                key={idx}
                disabled={isEmpty || isWon}
                onClick={() => handleTileClick(idx)}
                className={cn(
                  'w-full h-full rounded-lg font-black text-lg sm:text-xl flex items-center justify-center transition-all duration-150 select-none shadow-md',
                  isEmpty
                    ? 'bg-transparent border-transparent opacity-0 cursor-default'
                    : 'bg-gradient-to-b from-amber-100 to-amber-200 dark:from-amber-800 dark:to-amber-900 text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700 active:scale-95 hover:brightness-105'
                )}
              >
                {!isEmpty && val}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Controls / Shuffle */}
      <div className="w-full mt-3 flex items-center justify-center gap-2">
        <Button
          variant="outline"
          onClick={shuffleTiles}
          className="gap-2 text-xs font-semibold h-10 w-full"
        >
          <Shuffle className="w-3.5 h-3.5" />
          Scramble New Puzzle
        </Button>
      </div>

      {/* Victory banner */}
      {isWon && (
        <div className="w-full mt-3 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center animate-in zoom-in-95 duration-200">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2 animate-bounce" />
          <h4 className="font-bold text-base text-emerald-900 dark:text-emerald-200 mb-1">
            Puzzle Solved! 🧩
          </h4>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 mb-3">
            Completed in <strong className="font-mono">{moves}</strong> moves and{' '}
            <strong className="font-mono">{formatTime(seconds)}</strong>!
          </p>
          <Button
            onClick={shuffleTiles}
            className="w-full h-10 font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RotateCcw className="w-4 h-4" />
            Play Another 15-Puzzle
          </Button>
        </div>
      )}
    </div>
  );
}
