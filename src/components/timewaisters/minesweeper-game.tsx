'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Flag, Bomb, Clock, Trophy, Smile, Frown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROWS = 9;
const COLS = 9;
const MINES = 10;

type CellData = {
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
};

export function MinesweeperGame() {
  const [board, setBoard] = useState<CellData[][]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [flagsLeft, setFlagsLeft] = useState(MINES);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isFlagMode, setIsFlagMode] = useState(false); // Mobile tap flag toggle
  const [bestTime, setBestTime] = useState<number | null>(null);

  // Load best time
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_minesweeper_best');
      if (saved) setBestTime(parseInt(saved, 10));
    } catch (e) {}
  }, []);

  // Timer
  useEffect(() => {
    if (!isTimerRunning || isGameOver || isWon) return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, isGameOver, isWon]);

  // Generate new board
  const startNewGame = useCallback(() => {
    // 1. Initialize empty cells
    const newBoard: CellData[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const row: CellData[] = [];
      for (let c = 0; c < COLS; c++) {
        row.push({
          row: r,
          col: c,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          adjacentMines: 0,
        });
      }
      newBoard.push(row);
    }

    // 2. Place random mines
    let planted = 0;
    while (planted < MINES) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (!newBoard[r][c].isMine) {
        newBoard[r][c].isMine = true;
        planted++;
      }
    }

    // 3. Count adjacent mines
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!newBoard[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && newBoard[nr][nc].isMine) {
                count++;
              }
            }
          }
          newBoard[r][c].adjacentMines = count;
        }
      }
    }

    setBoard(newBoard);
    setIsGameOver(false);
    setIsWon(false);
    setFlagsLeft(MINES);
    setTimer(0);
    setIsTimerRunning(false);
    setIsFlagMode(false);
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // Reveal cell and cascade zeroes
  const revealCell = (r: number, c: number, currentBoard: CellData[][]) => {
    if (
      r < 0 ||
      r >= ROWS ||
      c < 0 ||
      c >= COLS ||
      currentBoard[r][c].isRevealed ||
      currentBoard[r][c].isFlagged
    ) {
      return;
    }

    currentBoard[r][c].isRevealed = true;

    // If 0 adjacent mines, reveal neighbors recursively
    if (currentBoard[r][c].adjacentMines === 0 && !currentBoard[r][c].isMine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr !== 0 || dc !== 0) {
            revealCell(r + dr, c + dc, currentBoard);
          }
        }
      }
    }
  };

  // Handle cell click
  const handleCellClick = (r: number, c: number) => {
    if (isGameOver || isWon || board[r][c].isRevealed) return;

    if (!isTimerRunning) setIsTimerRunning(true);

    const nextBoard = board.map((row) => row.map((cell) => ({ ...cell })));

    // If in flag mode on mobile
    if (isFlagMode) {
      handleCellRightClick(r, c);
      return;
    }

    if (nextBoard[r][c].isFlagged) return;

    // Hit a mine!
    if (nextBoard[r][c].isMine) {
      // Reveal all mines
      nextBoard.forEach((row) =>
        row.forEach((cell) => {
          if (cell.isMine) cell.isRevealed = true;
        })
      );
      setBoard(nextBoard);
      setIsGameOver(true);
      setIsTimerRunning(false);
      return;
    }

    // Normal safe reveal
    revealCell(r, c, nextBoard);

    // Check win condition (all non-mine cells revealed)
    let nonMineCount = 0;
    let revealedCount = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (!nextBoard[row][col].isMine) nonMineCount++;
        if (nextBoard[row][col].isRevealed && !nextBoard[row][col].isMine) revealedCount++;
      }
    }

    if (nonMineCount === revealedCount) {
      setIsWon(true);
      setIsTimerRunning(false);
      if (!bestTime || timer < bestTime) {
        setBestTime(timer);
        try {
          localStorage.setItem('timewaisters_minesweeper_best', timer.toString());
        } catch (e) {}
      }
    }

    setBoard(nextBoard);
  };

  // Handle Right Click (Flagging)
  const handleCellRightClick = (r: number, c: number, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isGameOver || isWon || board[r][c].isRevealed) return;

    if (!isTimerRunning) setIsTimerRunning(true);

    const nextBoard = board.map((row) => row.map((cell) => ({ ...cell })));
    const target = nextBoard[r][c];

    if (!target.isFlagged && flagsLeft > 0) {
      target.isFlagged = true;
      setFlagsLeft((f) => f - 1);
    } else if (target.isFlagged) {
      target.isFlagged = false;
      setFlagsLeft((f) => f + 1);
    }
    setBoard(nextBoard);
  };

  const NUMBER_COLORS: Record<number, string> = {
    1: 'text-blue-500 font-black',
    2: 'text-emerald-500 font-black',
    3: 'text-red-500 font-black',
    4: 'text-purple-600 font-black',
    5: 'text-amber-600 font-black',
    6: 'text-teal-500 font-black',
    7: 'text-pink-500 font-black',
    8: 'text-slate-900 font-black',
  };

  return (
    <div className="flex flex-col items-center justify-center max-w-xl mx-auto w-full gap-4 select-none">
      {/* Top Bar (Score & Smiley) */}
      <div className="w-full flex items-center justify-between bg-card p-3 rounded-xl border shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 text-red-500 font-mono text-xl font-bold px-3 py-1 rounded-md border border-slate-700 min-w-[60px] text-center">
            {flagsLeft.toString().padStart(2, '0')}
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">Mines Left</span>
        </div>

        {/* Smiley Reset Button */}
        <Button
          size="sm"
          variant="secondary"
          className="h-10 w-10 p-0 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-md"
          onClick={startNewGame}
        >
          {isGameOver ? <Frown className="w-6 h-6" /> : isWon ? <Sparkles className="w-6 h-6" /> : <Smile className="w-6 h-6" />}
        </Button>

        <div className="flex items-center gap-2">
          <div className="bg-slate-900 text-red-500 font-mono text-xl font-bold px-3 py-1 rounded-md border border-slate-700 min-w-[60px] text-center">
            {timer.toString().padStart(3, '0')}
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">Seconds</span>
        </div>
      </div>

      {/* Flag Mode Toggle Button for Mobile */}
      <div className="flex items-center justify-between w-full max-w-[360px] px-1">
        <Button
          size="sm"
          variant={isFlagMode ? 'default' : 'outline'}
          className={cn('text-xs h-8 px-3', isFlagMode && 'bg-red-500 hover:bg-red-600 text-white')}
          onClick={() => setIsFlagMode((prev) => !prev)}
        >
          <Flag className="w-3.5 h-3.5 mr-1 text-red-500" /> Mode: {isFlagMode ? 'Place Flag 🚩' : 'Dig Cell ⛏️'}
        </Button>

        {bestTime && (
          <span className="text-xs font-semibold text-amber-500 flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5" /> Best: {bestTime}s
          </span>
        )}
      </div>

      {/* Minesweeper Grid (9x9) */}
      <div className="bg-slate-300 dark:bg-slate-800 p-2 sm:p-3 rounded-2xl shadow-xl border-4 border-slate-400 dark:border-slate-700 w-full max-w-[360px] aspect-square">
        <div className="grid grid-cols-9 grid-rows-9 gap-1 h-full w-full">
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => (
              <button
                key={`${rIdx}-${cIdx}`}
                onClick={() => handleCellClick(rIdx, cIdx)}
                onContextMenu={(e) => handleCellRightClick(rIdx, cIdx, e)}
                className={cn(
                  'rounded-sm font-bold text-sm sm:text-base flex items-center justify-center transition-all duration-100 select-none shadow-xs active:scale-95',
                  !cell.isRevealed
                    ? 'bg-slate-100 dark:bg-slate-600 border-2 border-slate-300 dark:border-slate-500 hover:bg-slate-200 dark:hover:bg-slate-500'
                    : cell.isMine
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-200/70 dark:bg-slate-700/70 shadow-inner'
                )}
              >
                {cell.isRevealed ? (
                  cell.isMine ? (
                    <Bomb className="w-4 h-4 animate-bounce" />
                  ) : cell.adjacentMines > 0 ? (
                    <span className={NUMBER_COLORS[cell.adjacentMines]}>{cell.adjacentMines}</span>
                  ) : (
                    ''
                  )
                ) : cell.isFlagged ? (
                  <Flag className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                ) : (
                  ''
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Win / Loss Overlay */}
      {isWon && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 p-4 rounded-xl text-center w-full max-w-[360px] animate-in fade-in zoom-in">
          <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">Minefield Cleared! 🎉</h3>
          <p className="text-xs text-muted-foreground mt-1">You cleared the field in {timer} seconds.</p>
          <Button size="sm" className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={startNewGame}>
            Play Again
          </Button>
        </div>
      )}

      {isGameOver && (
        <div className="bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 p-3 rounded-xl text-center w-full max-w-[360px] animate-in fade-in">
          <h3 className="text-base font-bold text-red-800 dark:text-red-200">BOOM! Mine Triggered 💥</h3>
          <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={startNewGame}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
