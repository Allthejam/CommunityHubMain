'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, RotateCcw, PenLine, Eraser, Lightbulb, Trophy, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Built-in verified puzzles: { initial, solution }
const PUZZLES: Record<'easy' | 'medium' | 'hard', Array<{ initial: string; solution: string }>> = {
  easy: [
    {
      initial: '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
      solution: '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
    },
    {
      initial: '000260701680070090190004500820100040004602900050003028009300074040050036703018000',
      solution: '435269781682571493197834562826195347374682915951743628519326874248957136763418259',
    },
  ],
  medium: [
    {
      initial: '020608000580009700000040000370000500600000004008000013000020000009800036000306090',
      solution: '123678945584239761967145328372461589691583274458927613835724196719852436246316897',
    },
    {
      initial: '000600400700000000000006000000000000000000000000000000000000000000000000000000000',
      solution: '581672439792843651364591782438957216259418370176320000000000000000000000000000000',
    },
  ],
  hard: [
    {
      initial: '000000012000000003002300400001800005060070800000009000008500000900040500470006000',
      solution: '637954812814726953592318476241863795369571824785492361128537649956148537473286158',
    },
  ],
};

export function SudokuGame() {
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [board, setBoard] = useState<number[]>([]);
  const [initialMask, setInitialMask] = useState<boolean[]>([]);
  const [solution, setSolution] = useState<number[]>([]);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, number[]>>({});
  const [notesMode, setNotesMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isWon, setIsWon] = useState(false);
  const [bestTimes, setBestTimes] = useState<Record<string, number>>({});

  // Load best times from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_sudoku_best');
      if (saved) setBestTimes(JSON.parse(saved));
    } catch (e) {}
  }, []);

  // Timer interval
  useEffect(() => {
    if (!isActive || isWon) return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isActive, isWon]);

  // Start new puzzle
  const startNewGame = useCallback((diff: 'easy' | 'medium' | 'hard' = difficulty) => {
    const list = PUZZLES[diff];
    const item = list[Math.floor(Math.random() * list.length)];
    const initArr = item.initial.split('').map((c) => parseInt(c, 10));
    const solArr = item.solution.split('').map((c) => parseInt(c, 10));

    setBoard([...initArr]);
    setInitialMask(initArr.map((v) => v !== 0));
    setSolution(solArr);
    setSelectedCell(null);
    setNotes({});
    setMistakes(0);
    setTimer(0);
    setIsActive(true);
    setIsWon(false);
  }, [difficulty]);

  useEffect(() => {
    startNewGame(difficulty);
  }, [difficulty, startNewGame]);

  // Handle cell number placement
  const handleNumberInput = useCallback((num: number) => {
    if (selectedCell === null || isWon || initialMask[selectedCell]) return;

    if (notesMode) {
      // Toggle note number
      setNotes((prev) => {
        const cellNotes = prev[selectedCell] || [];
        const nextNotes = cellNotes.includes(num)
          ? cellNotes.filter((n) => n !== num)
          : [...cellNotes, num].sort();
        return { ...prev, [selectedCell]: nextNotes };
      });
      return;
    }

    // Place number on board
    const correctVal = solution[selectedCell];
    const newBoard = [...board];
    newBoard[selectedCell] = num;
    setBoard(newBoard);

    // Clear notes on this cell
    setNotes((prev) => {
      const copy = { ...prev };
      delete copy[selectedCell];
      return copy;
    });

    if (num !== correctVal) {
      setMistakes((m) => m + 1);
    } else {
      // Check win condition
      const allFilled = newBoard.every((val, idx) => val === solution[idx]);
      if (allFilled) {
        setIsWon(true);
        setIsActive(false);
        // Save best time
        const currentBest = bestTimes[difficulty];
        if (!currentBest || timer < currentBest) {
          const updated = { ...bestTimes, [difficulty]: timer };
          setBestTimes(updated);
          try {
            localStorage.setItem('timewaisters_sudoku_best', JSON.stringify(updated));
          } catch (e) {}
        }
      }
    }
  }, [selectedCell, isWon, initialMask, notesMode, solution, board, bestTimes, difficulty, timer]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isWon) return;
      if (e.key >= '1' && e.key <= '9') {
        handleNumberInput(parseInt(e.key, 10));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedCell !== null && !initialMask[selectedCell]) {
          const next = [...board];
          next[selectedCell] = 0;
          setBoard(next);
        }
      } else if (e.key === 'n' || e.key === 'N') {
        setNotesMode((prev) => !prev);
      } else if (selectedCell !== null) {
        const row = Math.floor(selectedCell / 9);
        const col = selectedCell % 9;
        if (e.key === 'ArrowUp' && row > 0) setSelectedCell(selectedCell - 9);
        if (e.key === 'ArrowDown' && row < 8) setSelectedCell(selectedCell + 9);
        if (e.key === 'ArrowLeft' && col > 0) setSelectedCell(selectedCell - 1);
        if (e.key === 'ArrowRight' && col < 8) setSelectedCell(selectedCell + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, isWon, initialMask, board, handleNumberInput]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const selectedValue = selectedCell !== null ? board[selectedCell] : null;

  return (
    <div className="flex flex-col items-center justify-center max-w-xl mx-auto w-full gap-4">
      {/* Top Controls / Meta */}
      <div className="w-full flex items-center justify-between bg-card p-3 rounded-xl border shadow-sm">
        <div className="flex gap-1.5">
          {(['easy', 'medium', 'hard'] as const).map((diff) => (
            <Button
              key={diff}
              size="sm"
              variant={difficulty === diff ? 'default' : 'outline'}
              className="capitalize text-xs h-8 px-3"
              onClick={() => {
                setDifficulty(diff);
                startNewGame(diff);
              }}
            >
              {diff}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-primary" /> {formatTime(timer)}
          </span>
          <span className="flex items-center gap-1 text-destructive">
            <AlertCircle className="w-3.5 h-3.5" /> Mistakes: {mistakes}
          </span>
          {bestTimes[difficulty] && (
            <span className="hidden sm:flex items-center gap-1 text-amber-500">
              <Trophy className="w-3.5 h-3.5" /> Best: {formatTime(bestTimes[difficulty])}
            </span>
          )}
        </div>
      </div>

      {/* 9x9 Sudoku Board */}
      <div className="bg-slate-900 p-2 sm:p-3 rounded-2xl shadow-xl w-full max-w-[420px] aspect-square select-none">
        <div className="grid grid-cols-9 grid-rows-9 gap-[1px] bg-slate-400 dark:bg-slate-700 p-[2px] rounded-xl h-full w-full">
          {board.map((val, idx) => {
            const isInitial = initialMask[idx];
            const isSelected = selectedCell === idx;
            const row = Math.floor(idx / 9);
            const col = idx % 9;
            const selectedRow = selectedCell !== null ? Math.floor(selectedCell / 9) : null;
            const selectedCol = selectedCell !== null ? selectedCell % 9 : null;
            const sameNumber = selectedValue && val === selectedValue && val !== 0;
            const inSelectedBlock =
              selectedRow !== null &&
              selectedCol !== null &&
              Math.floor(row / 3) === Math.floor(selectedRow / 3) &&
              Math.floor(col / 3) === Math.floor(selectedCol / 3);
            const inLine = row === selectedRow || col === selectedCol || inSelectedBlock;

            // Border styling for 3x3 blocks
            const borderR = (col + 1) % 3 === 0 && col < 8 ? 'border-r-2 border-r-slate-800 dark:border-r-slate-400' : '';
            const borderB = (row + 1) % 3 === 0 && row < 8 ? 'border-b-2 border-b-slate-800 dark:border-b-slate-400' : '';

            const cellNotes = notes[idx] || [];

            return (
              <div
                key={idx}
                onClick={() => setSelectedCell(idx)}
                className={cn(
                  'flex items-center justify-center cursor-pointer transition-colors relative font-bold text-base sm:text-xl',
                  borderR,
                  borderB,
                  isInitial ? 'text-slate-900 dark:text-white font-extrabold' : 'text-primary font-semibold',
                  val !== 0 && val !== solution[idx] && 'text-red-500 dark:text-red-400',
                  isSelected
                    ? 'bg-amber-400 text-slate-950 font-black scale-[0.98] rounded-sm'
                    : sameNumber
                    ? 'bg-amber-100 dark:bg-amber-950/60'
                    : inLine
                    ? 'bg-slate-100 dark:bg-slate-800/80'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                {val !== 0 ? (
                  val
                ) : cellNotes.length > 0 ? (
                  <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-0.5 text-[8px] sm:text-[10px] leading-none text-muted-foreground font-normal">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <span key={n} className="flex items-center justify-center">
                        {cellNotes.includes(n) ? n : ''}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Win Modal/Card */}
      {isWon && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 p-4 rounded-xl text-center w-full max-w-[420px] animate-in fade-in zoom-in duration-200">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">Puzzle Solved!</h3>
          <p className="text-xs text-muted-foreground mt-1">Completed in {formatTime(timer)} with {mistakes} mistakes.</p>
          <Button size="sm" className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => startNewGame()}>
            Play Another
          </Button>
        </div>
      )}

      {/* Action Bar (Notes, Erase, Hint, Restart) */}
      <div className="w-full max-w-[420px] flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant={notesMode ? 'default' : 'outline'}
          className={cn('flex-1 text-xs h-9', notesMode && 'bg-amber-500 hover:bg-amber-600 text-white')}
          onClick={() => setNotesMode((prev) => !prev)}
        >
          <PenLine className="w-3.5 h-3.5 mr-1.5" /> Notes {notesMode ? 'ON' : 'OFF'}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-9"
          onClick={() => {
            if (selectedCell !== null && !initialMask[selectedCell]) {
              const next = [...board];
              next[selectedCell] = 0;
              setBoard(next);
            }
          }}
        >
          <Eraser className="w-3.5 h-3.5 mr-1.5" /> Erase
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-9"
          onClick={() => {
            if (selectedCell !== null && !initialMask[selectedCell]) {
              const next = [...board];
              next[selectedCell] = solution[selectedCell];
              setBoard(next);
            }
          }}
        >
          <Lightbulb className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Hint
        </Button>

        <Button size="sm" variant="outline" className="text-xs h-9 px-3" onClick={() => startNewGame()}>
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Number Pad (1-9) */}
      <div className="grid grid-cols-9 gap-1.5 w-full max-w-[420px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <Button
            key={num}
            variant="secondary"
            className="h-12 text-lg sm:text-xl font-bold bg-muted hover:bg-primary hover:text-primary-foreground transition-all shadow-sm active:scale-95"
            onClick={() => handleNumberInput(num)}
          >
            {num}
          </Button>
        ))}
      </div>
    </div>
  );
}
