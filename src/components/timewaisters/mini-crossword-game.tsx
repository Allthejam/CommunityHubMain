'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  RotateCcw,
  Sparkles,
  Trophy,
  CheckCircle2,
  HelpCircle,
  Clock,
  Shuffle,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CrosswordDef {
  id: number;
  title: string;
  grid: (string | null)[][]; // 5x5: letters or null for black block
  clues: {
    across: { num: number; r: number; c: number; clue: string; answer: string }[];
    down: { num: number; r: number; c: number; clue: string; answer: string }[];
  };
}

const CROSSWORD_PUZZLES: CrosswordDef[] = [
  {
    id: 1,
    title: 'Highland Breeze',
    // 5x5 grid:
    // S C O T S
    // C A L M #
    // O M E G A
    // T # L O W
    // S N O W Y
    grid: [
      ['S', 'C', 'O', 'T', 'S'],
      ['C', 'A', 'L', 'M', null],
      ['O', 'M', 'E', 'G', 'A'],
      ['T', null, 'L', 'O', 'W'],
      ['S', 'N', 'O', 'W', 'Y'],
    ],
    clues: {
      across: [
        { num: 1, r: 0, c: 0, clue: 'People of Caledonia', answer: 'SCOTS' },
        { num: 4, r: 1, c: 0, clue: 'Peaceful and tranquil', answer: 'CALM' },
        { num: 5, r: 2, c: 0, clue: 'Last letter of the Greek alphabet', answer: 'OMEGA' },
        { num: 6, r: 3, c: 2, clue: 'Not high or tall', answer: 'LOW' },
        { num: 7, r: 4, c: 0, clue: 'White winter mountain scenery', answer: 'SNOWY' },
      ],
      down: [
        { num: 1, r: 0, c: 0, clue: 'Scottish butter biscuit (abbrev.)', answer: 'SCOTS' },
        { num: 2, r: 0, c: 1, clue: 'Photograph device', answer: 'CAM' },
        { num: 3, r: 0, c: 2, clue: 'Ole! Spanish cheers', answer: 'OLELO' },
        { num: 4, r: 1, c: 3, clue: 'Glowing ember or sparkle', answer: 'GLOW' },
        { num: 5, r: 2, c: 4, clue: 'Away or distant', answer: 'AWAY' },
      ],
    },
  },
  {
    id: 2,
    title: 'Town Square',
    // B R E A D
    // L A K E S
    // U N I T Y
    // E D I T #
    // S # T E A
    grid: [
      ['B', 'R', 'E', 'A', 'D'],
      ['L', 'A', 'K', 'E', 'S'],
      ['U', 'N', 'I', 'T', 'Y'],
      ['E', 'D', 'I', 'T', null],
      ['S', null, 'T', 'E', 'A'],
    ],
    clues: {
      across: [
        { num: 1, r: 0, c: 0, clue: 'Bakery staple loaves', answer: 'BREAD' },
        { num: 4, r: 1, c: 0, clue: 'Freshwater lochs or bodies', answer: 'LAKES' },
        { num: 5, r: 2, c: 0, clue: 'Community togetherness', answer: 'UNITY' },
        { num: 6, r: 3, c: 0, clue: 'Revise written text', answer: 'EDIT' },
        { num: 7, r: 4, c: 2, clue: 'Afternoon cuppa brew', answer: 'TEA' },
      ],
      down: [
        { num: 1, r: 0, c: 0, clue: 'Melancholy music genre', answer: 'BLUES' },
        { num: 2, r: 0, c: 1, clue: 'Precipitation from skies', answer: 'RAIN' },
        { num: 3, r: 0, c: 2, clue: 'Fit together snugly', answer: 'EKIT' },
        { num: 4, r: 0, c: 3, clue: 'Past tense of consume', answer: 'ATE' },
        { num: 5, r: 0, c: 4, clue: 'Scottish slang for great ("___ yin")', answer: 'DSY' },
      ],
    },
  },
  {
    id: 3,
    title: 'Morning Brew',
    // P O E M S
    // O P E N #
    // P I P E R
    // E # T O P
    // R O S E S
    grid: [
      ['P', 'O', 'E', 'M', 'S'],
      ['O', 'P', 'E', 'N', null],
      ['P', 'I', 'P', 'E', 'R'],
      ['E', null, 'T', 'O', 'P'],
      ['R', 'O', 'S', 'E', 'S'],
    ],
    clues: {
      across: [
        { num: 1, r: 0, c: 0, clue: 'Burns Night verses', answer: 'POEMS' },
        { num: 4, r: 1, c: 0, clue: 'Unbolted shop door sign', answer: 'OPEN' },
        { num: 5, r: 2, c: 0, clue: 'Highland bagpipe musician', answer: 'PIPER' },
        { num: 6, r: 3, c: 2, clue: 'Peak or highest summit', answer: 'TOP' },
        { num: 7, r: 4, c: 0, clue: 'Thorny garden blossoms', answer: 'ROSES' },
      ],
      down: [
        { num: 1, r: 0, c: 0, clue: 'Black spice grains shaker', answer: 'POPER' },
        { num: 2, r: 0, c: 1, clue: 'Opinion questionnaire', answer: 'OPIN' },
        { num: 3, r: 0, c: 2, clue: 'Large banquet feast', answer: 'EEPS' },
        { num: 4, r: 0, c: 3, clue: 'Opposite of old', answer: 'MNOE' },
        { num: 5, r: 2, c: 4, clue: 'Traditional pub drinks', answer: 'RPS' },
      ],
    },
  },
];

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
];

export function MiniCrosswordGame() {
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const puzzle = CROSSWORD_PUZZLES[puzzleIdx];

  // User input grid
  const [userGrid, setUserGrid] = useState<string[][]>(() =>
    Array(5).fill('').map(() => Array(5).fill(''))
  );

  const [selectedCell, setSelectedCell] = useState<[number, number]>([0, 0]);
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [isSolved, setIsSolved] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Stats
  const [bestTime, setBestTime] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_minicrossword_best');
      if (saved) setBestTime(parseInt(saved, 10));
    } catch {
      // ignore
    }
  }, []);

  // Timer loop
  useEffect(() => {
    if (isSolved) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isSolved]);

  // Check victory
  const checkVictory = useCallback(
    (grid: string[][]) => {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const expected = puzzle.grid[r][c];
          if (expected !== null) {
            if (grid[r][c]?.toUpperCase() !== expected) {
              return false;
            }
          }
        }
      }
      return true;
    },
    [puzzle]
  );

  // Cell selection
  const handleCellClick = (r: number, c: number) => {
    if (puzzle.grid[r][c] === null) return;
    if (selectedCell[0] === r && selectedCell[1] === c) {
      setDirection((prev) => (prev === 'across' ? 'down' : 'across'));
    } else {
      setSelectedCell([r, c]);
    }
  };

  // Input letter
  const handleInputLetter = (char: string) => {
    if (isSolved) return;
    const [r, c] = selectedCell;
    if (puzzle.grid[r][c] === null) return;

    if (char === '⌫') {
      const newGrid = userGrid.map((row) => [...row]);
      newGrid[r][c] = '';
      setUserGrid(newGrid);

      // Move back
      if (direction === 'across' && c > 0 && puzzle.grid[r][c - 1] !== null) {
        setSelectedCell([r, c - 1]);
      } else if (direction === 'down' && r > 0 && puzzle.grid[r - 1][c] !== null) {
        setSelectedCell([r - 1, c]);
      }
      return;
    }

    // Place letter
    const newGrid = userGrid.map((row) => [...row]);
    newGrid[r][c] = char.toUpperCase();
    setUserGrid(newGrid);

    // Check solve
    if (checkVictory(newGrid)) {
      setIsSolved(true);
      if (!bestTime || timerSeconds < bestTime) {
        setBestTime(timerSeconds);
        try {
          localStorage.setItem('timewaisters_minicrossword_best', timerSeconds.toString());
        } catch {
          // ignore
        }
      }
      return;
    }

    // Advance to next valid cell
    if (direction === 'across') {
      for (let nc = c + 1; nc < 5; nc++) {
        if (puzzle.grid[r][nc] !== null) {
          setSelectedCell([r, nc]);
          break;
        }
      }
    } else {
      for (let nr = r + 1; nr < 5; nr++) {
        if (puzzle.grid[nr][c] !== null) {
          setSelectedCell([nr, c]);
          break;
        }
      }
    }
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleInputLetter('⌫');
      } else if (e.key === 'ArrowRight' && selectedCell[1] < 4) {
        setSelectedCell([selectedCell[0], selectedCell[1] + 1]);
      } else if (e.key === 'ArrowLeft' && selectedCell[1] > 0) {
        setSelectedCell([selectedCell[0], selectedCell[1] - 1]);
      } else if (e.key === 'ArrowDown' && selectedCell[0] < 4) {
        setSelectedCell([selectedCell[0] + 1, selectedCell[1]]);
      } else if (e.key === 'ArrowUp' && selectedCell[0] > 0) {
        setSelectedCell([selectedCell[0] - 1, selectedCell[1]]);
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleInputLetter(e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Switch puzzle
  const nextPuzzle = () => {
    setPuzzleIdx((prev) => (prev + 1) % CROSSWORD_PUZZLES.length);
    setUserGrid(Array(5).fill('').map(() => Array(5).fill('')));
    setSelectedCell([0, 0]);
    setIsSolved(false);
    setTimerSeconds(0);
  };

  // Reveal letter hint
  const revealCurrentLetter = () => {
    const [r, c] = selectedCell;
    const correctChar = puzzle.grid[r][c];
    if (correctChar) {
      const newGrid = userGrid.map((row) => [...row]);
      newGrid[r][c] = correctChar;
      setUserGrid(newGrid);
      if (checkVictory(newGrid)) setIsSolved(true);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Find active clue text
  const currentClue = useMemo(() => {
    const [r, c] = selectedCell;
    const list = direction === 'across' ? puzzle.clues.across : puzzle.clues.down;
    const match = list.find((item) =>
      direction === 'across'
        ? item.r === r && c >= item.c && c < item.c + item.answer.length
        : item.c === c && r >= item.r && r < item.r + item.answer.length
    );
    return match ? `${match.num} ${direction.toUpperCase()}: ${match.clue}` : '';
  }, [selectedCell, direction, puzzle]);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <Badge variant="outline" className="text-xs bg-muted/50 font-normal">
          {puzzle.title}
        </Badge>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <div className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(timerSeconds)}</span>
          </div>
          {bestTime && (
            <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full">
              <Trophy className="w-3.5 h-3.5" />
              <span>Best: {formatTime(bestTime)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Active Clue Header Pill */}
      <div className="w-full mb-3 p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-center text-primary min-h-[40px] flex items-center justify-center">
        {currentClue || 'Tap any square to view clue'}
      </div>

      {/* 5x5 Crossword Board */}
      <Card className="w-full p-3 shadow-md border-border/80 flex flex-col items-center mb-3">
        <div className="grid grid-cols-5 gap-1.5 border-4 border-muted rounded-xl p-1 bg-muted/40">
          {puzzle.grid.map((row, r) =>
            row.map((cell, c) => {
              const isBlock = cell === null;
              const isSelected = selectedCell[0] === r && selectedCell[1] === c;
              const val = userGrid[r][c];

              // Find clue number to display in top-left corner
              const clueNum =
                puzzle.clues.across.find((a) => a.r === r && a.c === c)?.num ||
                puzzle.clues.down.find((d) => d.r === r && d.c === c)?.num;

              return (
                <button
                  key={`${r}-${c}`}
                  disabled={isBlock}
                  onClick={() => handleCellClick(r, c)}
                  className={cn(
                    'w-11 h-11 sm:w-13 sm:h-13 rounded-lg flex items-center justify-center font-black text-base sm:text-lg relative transition-all duration-150',
                    isBlock
                      ? 'bg-slate-900 border-transparent cursor-default'
                      : isSelected
                      ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-1'
                      : 'bg-card text-foreground border border-border/80 hover:bg-muted/60'
                  )}
                >
                  {/* Clue number badge */}
                  {clueNum && !isBlock && (
                    <span
                      className={cn(
                        'absolute top-0.5 left-1 text-[9px] font-bold leading-none',
                        isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      )}
                    >
                      {clueNum}
                    </span>
                  )}
                  {val}
                </button>
              );
            })
          )}
        </div>
      </Card>

      {/* Clues Peek & Clue list toggle */}
      <div className="w-full flex items-center justify-between gap-2 mb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDirection((prev) => (prev === 'across' ? 'down' : 'across'))}
          className="h-8 text-xs font-semibold"
        >
          Direction: {direction.toUpperCase()} (Switch)
        </Button>
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={revealCurrentLetter}
            className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            Reveal Letter
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={nextPuzzle}
            className="h-8 text-xs gap-1"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Next Puzzle
          </Button>
        </div>
      </div>

      {/* On-screen Alphabet Keyboard */}
      {!isSolved ? (
        <div className="w-full flex flex-col gap-1.5 px-1">
          {KEYBOARD_ROWS.map((row, rIdx) => (
            <div key={rIdx} className="flex justify-center gap-1">
              {row.map((key) => (
                <button
                  key={key}
                  onClick={() => handleInputLetter(key)}
                  className={cn(
                    'h-10 rounded-md font-bold text-xs sm:text-sm border transition-all active:scale-95 shadow-sm',
                    key === '⌫'
                      ? 'px-3 bg-muted/80 text-muted-foreground border-border'
                      : 'px-2.5 sm:px-3 bg-card text-foreground border-border/80 hover:bg-muted/40'
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : (
        /* Victory Screen */
        <div className="w-full p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center animate-in zoom-in-95 duration-200">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2 animate-bounce" />
          <h4 className="font-bold text-base text-emerald-900 dark:text-emerald-200 mb-1">
            Mini Crossword Solved! 🎉
          </h4>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 mb-4">
            Completed in <strong className="font-mono">{formatTime(timerSeconds)}</strong>!
          </p>
          <Button
            onClick={nextPuzzle}
            className="w-full h-10 font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RotateCcw className="w-4 h-4" />
            Play Next Mini Crossword
          </Button>
        </div>
      )}
    </div>
  );
}
