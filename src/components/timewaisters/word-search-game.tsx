'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Trophy, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const GRID_SIZE = 10;

interface WordPlacement {
  word: string;
  cells: [number, number][]; // [r, c]
  found: boolean;
}

const WORD_SETS = [
  ['SPEY', 'GLEN', 'HILL', 'LOCH', 'PARK', 'TOWN'],
  ['SCOT', 'RIVER', 'CASTLE', 'HEATH', 'TRAIL', 'FOREST'],
  ['APPLE', 'BREAD', 'MUSIC', 'STORY', 'CLOUD', 'LIGHT'],
];

export function WordSearchGame() {
  const [grid, setGrid] = useState<string[][]>([]);
  const [words, setWords] = useState<WordPlacement[]>([]);
  const [selectedStart, setSelectedStart] = useState<[number, number] | null>(null);
  const [timer, setTimer] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [bestTime, setBestTime] = useState<number | null>(null);

  // Load best time
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_wordsearch_best');
      if (saved) setBestTime(parseInt(saved, 10));
    } catch (e) {}
  }, []);

  // Timer
  useEffect(() => {
    if (isWon) return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isWon]);

  // Generate word search puzzle
  const startNewGame = useCallback(() => {
    const rawWords = WORD_SETS[Math.floor(Math.random() * WORD_SETS.length)];
    const newGrid: string[][] = Array(GRID_SIZE).fill('').map(() => Array(GRID_SIZE).fill(''));
    const placements: WordPlacement[] = [];

    // Directions: [dr, dc]
    const dirs: [number, number][] = [
      [0, 1],  // horizontal
      [1, 0],  // vertical
      [1, 1],  // diagonal down-right
    ];

    for (const w of rawWords) {
      let placed = false;
      let tries = 0;

      while (!placed && tries < 100) {
        tries++;
        const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
        const maxR = dr === 1 ? GRID_SIZE - w.length : GRID_SIZE - 1;
        const maxC = dc === 1 ? GRID_SIZE - w.length : GRID_SIZE - 1;
        const startR = Math.floor(Math.random() * (maxR + 1));
        const startC = Math.floor(Math.random() * (maxC + 1));

        // Check can place
        let canPlace = true;
        const cells: [number, number][] = [];
        for (let i = 0; i < w.length; i++) {
          const r = startR + dr * i;
          const c = startC + dc * i;
          if (newGrid[r][c] !== '' && newGrid[r][c] !== w[i]) {
            canPlace = false;
            break;
          }
          cells.push([r, c]);
        }

        if (canPlace) {
          cells.forEach(([r, c], i) => {
            newGrid[r][c] = w[i];
          });
          placements.push({ word: w, cells, found: false });
          placed = true;
        }
      }
    }

    // Fill empty cells with random letters
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!newGrid[r][c]) {
          newGrid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
      }
    }

    setGrid(newGrid);
    setWords(placements);
    setSelectedStart(null);
    setTimer(0);
    setIsWon(false);
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // Handle cell click (select start, then select end)
  const handleCellClick = (r: number, c: number) => {
    if (isWon) return;

    if (!selectedStart) {
      setSelectedStart([r, c]);
      return;
    }

    const [sr, sc] = selectedStart;
    setSelectedStart(null);

    // Check if [sr, sc] to [r, c] matches any word
    const matched = words.find((w) => {
      if (w.found) return false;
      const first = w.cells[0];
      const last = w.cells[w.cells.length - 1];

      const matchForward = first[0] === sr && first[1] === sc && last[0] === r && last[1] === c;
      const matchBackward = first[0] === r && first[1] === c && last[0] === sr && last[1] === sc;
      return matchForward || matchBackward;
    });

    if (matched) {
      const nextWords = words.map((w) => (w.word === matched.word ? { ...w, found: true } : w));
      setWords(nextWords);

      // Check win
      if (nextWords.every((w) => w.found)) {
        setIsWon(true);
        if (!bestTime || timer < bestTime) {
          setBestTime(timer);
          try {
            localStorage.setItem('timewaisters_wordsearch_best', timer.toString());
          } catch (e) {}
        }
      }
    }
  };

  const isCellFound = (r: number, c: number) => {
    return words.some((w) => w.found && w.cells.some(([cr, cc]) => cr === r && cc === c));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center max-w-xl mx-auto w-full gap-4 select-none">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between bg-card p-3 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-black text-primary">Word Search</h2>
          <p className="text-[11px] text-muted-foreground">Find all 6 hidden words in the grid.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-primary" /> {formatTime(timer)}
          </div>

          {bestTime && (
            <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-amber-500">
              <Trophy className="w-3.5 h-3.5" /> Best: {formatTime(bestTime)}
            </div>
          )}

          <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={startNewGame}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Tip Banner */}
      <div className="w-full max-w-[380px] text-center text-xs text-muted-foreground bg-muted/50 py-1 px-3 rounded-lg border">
        {selectedStart
          ? 'Now tap the LAST letter of the word!'
          : 'Tap the FIRST letter of a word, then tap the LAST letter.'}
      </div>

      {/* 10x10 Word Search Grid */}
      <div className="bg-slate-100 dark:bg-slate-900/60 p-2 sm:p-3 rounded-3xl shadow-xl border w-full max-w-[380px] aspect-square">
        <div className="grid grid-cols-10 grid-rows-10 gap-1 h-full w-full">
          {grid.map((row, r) =>
            row.map((letter, c) => {
              const isSelected = selectedStart && selectedStart[0] === r && selectedStart[1] === c;
              const found = isCellFound(r, c);

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  className={cn(
                    'rounded-md font-extrabold text-xs sm:text-sm flex items-center justify-center transition-all duration-150',
                    isSelected
                      ? 'bg-amber-400 text-slate-950 scale-110 shadow z-10'
                      : found
                      ? 'bg-emerald-500 text-white font-black'
                      : 'bg-background hover:bg-muted text-foreground'
                  )}
                >
                  {letter}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Word List Checklist */}
      <div className="flex flex-wrap items-center justify-center gap-2 w-full max-w-[380px]">
        {words.map((w) => (
          <Badge
            key={w.word}
            variant={w.found ? 'default' : 'outline'}
            className={cn(
              'px-2.5 py-1 text-xs font-bold transition-all',
              w.found && 'bg-emerald-600 line-through opacity-75 text-white'
            )}
          >
            {w.found ? '✓ ' : ''}{w.word}
          </Badge>
        ))}
      </div>

      {/* Win Banner */}
      {isWon && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-400 p-4 rounded-xl text-center w-full max-w-[380px] animate-in fade-in zoom-in">
          <Sparkles className="w-10 h-10 text-emerald-500 mx-auto mb-2 animate-bounce" />
          <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">All Words Found! 🎉</h3>
          <p className="text-xs text-muted-foreground mt-1">Solved in {formatTime(timer)}.</p>
          <Button size="sm" className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={startNewGame}>
            Play Next Puzzle
          </Button>
        </div>
      )}
    </div>
  );
}
