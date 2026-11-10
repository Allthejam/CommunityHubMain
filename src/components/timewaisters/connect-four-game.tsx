'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Bot, Users, Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type Player = 1 | 2; // 1 = Red, 2 = Yellow (AI)
type Cell = Player | null;

const ROWS = 6;
const COLS = 7;

export function ConnectFourGame() {
  const [board, setBoard] = useState<Cell[][]>(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [isVsAi, setIsVsAi] = useState(true);
  const [winner, setWinner] = useState<Player | 'tie' | null>(null);
  const [winningCells, setWinningCells] = useState<[number, number][]>([]);
  const [scores, setScores] = useState({ p1: 0, p2: 0, ties: 0 });
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Check 4 in a row
  const checkWin = useCallback((b: Cell[][]): { winner: Player; line: [number, number][] } | null => {
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const val = b[r][c];
        if (val && val === b[r][c + 1] && val === b[r][c + 2] && val === b[r][c + 3]) {
          return { winner: val, line: [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]] };
        }
      }
    }
    // Vertical
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = b[r][c];
        if (val && val === b[r + 1][c] && val === b[r + 2][c] && val === b[r + 3][c]) {
          return { winner: val, line: [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]] };
        }
      }
    }
    // Diagonal down-right (\)
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const val = b[r][c];
        if (val && val === b[r + 1][c + 1] && val === b[r + 2][c + 2] && val === b[r + 3][c + 3]) {
          return { winner: val, line: [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]] };
        }
      }
    }
    // Diagonal up-right (/)
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const val = b[r][c];
        if (val && val === b[r - 1][c + 1] && val === b[r - 2][c + 2] && val === b[r - 3][c + 3]) {
          return { winner: val, line: [[r, c], [r - 1, c + 1], [r - 2, c + 2], [r - 3, c + 3]] };
        }
      }
    }
    return null;
  }, []);

  // Drop disc into column
  const dropDisc = useCallback((col: number, player: Player, currentBoard: Cell[][]) => {
    // Find bottom-most empty row in column
    let targetRow = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (currentBoard[r][col] === null) {
        targetRow = r;
        break;
      }
    }
    if (targetRow === -1) return null; // Col is full

    const nextBoard = currentBoard.map((row) => [...row]);
    nextBoard[targetRow][col] = player;
    return { nextBoard, targetRow };
  }, []);

  // Reset current round
  const resetBoard = useCallback(() => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setCurrentPlayer(1);
    setWinner(null);
    setWinningCells([]);
    setIsAiThinking(false);
  }, []);

  // Smart AI Move
  const getAiMove = useCallback((b: Cell[][]): number => {
    // 1. Immediate Win check for AI (player 2)
    for (let c = 0; c < COLS; c++) {
      const res = dropDisc(c, 2, b);
      if (res && checkWin(res.nextBoard)?.winner === 2) return c;
    }
    // 2. Immediate Block check against Human (player 1)
    for (let c = 0; c < COLS; c++) {
      const res = dropDisc(c, 1, b);
      if (res && checkWin(res.nextBoard)?.winner === 1) return c;
    }
    // 3. Center column preference, then outwards
    const colOrder = [3, 2, 4, 1, 5, 0, 6];
    for (const c of colOrder) {
      if (b[0][c] === null) return c;
    }
    return 0;
  }, [dropDisc, checkWin]);

  // Handle player click on column
  const handleColumnClick = useCallback((col: number) => {
    if (winner || isAiThinking || board[0][col] !== null) return;

    const res = dropDisc(col, currentPlayer, board);
    if (!res) return;

    const winResult = checkWin(res.nextBoard);
    if (winResult) {
      setBoard(res.nextBoard);
      setWinner(winResult.winner);
      setWinningCells(winResult.line);
      setScores((s) => ({
        ...s,
        [winResult.winner === 1 ? 'p1' : 'p2']: s[winResult.winner === 1 ? 'p1' : 'p2'] + 1,
      }));
      return;
    }

    // Check tie
    const isFull = res.nextBoard.every((row) => row.every((c) => c !== null));
    if (isFull) {
      setBoard(res.nextBoard);
      setWinner('tie');
      setScores((s) => ({ ...s, ties: s.ties + 1 }));
      return;
    }

    setBoard(res.nextBoard);
    const nextP = currentPlayer === 1 ? 2 : 1;
    setCurrentPlayer(nextP);

    // AI Turn trigger
    if (isVsAi && nextP === 2) {
      setIsAiThinking(true);
      setTimeout(() => {
        const aiCol = getAiMove(res.nextBoard);
        const aiRes = dropDisc(aiCol, 2, res.nextBoard);
        if (aiRes) {
          const aiWin = checkWin(aiRes.nextBoard);
          setBoard(aiRes.nextBoard);
          if (aiWin) {
            setWinner(aiWin.winner);
            setWinningCells(aiWin.line);
            setScores((s) => ({ ...s, p2: s.p2 + 1 }));
          } else if (aiRes.nextBoard.every((r) => r.every((c) => c !== null))) {
            setWinner('tie');
            setScores((s) => ({ ...s, ties: s.ties + 1 }));
          } else {
            setCurrentPlayer(1);
          }
        }
        setIsAiThinking(false);
      }, 400);
    }
  }, [board, currentPlayer, isVsAi, isAiThinking, winner, dropDisc, checkWin, getAiMove]);

  return (
    <div className="flex flex-col items-center justify-center max-w-xl mx-auto w-full gap-4 select-none">
      {/* Game Mode / Scores Top Bar */}
      <div className="w-full flex items-center justify-between bg-card p-3 rounded-xl border shadow-sm">
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={isVsAi ? 'default' : 'outline'}
            className="text-xs h-8 px-3"
            onClick={() => {
              setIsVsAi(true);
              resetBoard();
            }}
          >
            <Bot className="w-3.5 h-3.5 mr-1.5" /> vs Computer
          </Button>
          <Button
            size="sm"
            variant={!isVsAi ? 'default' : 'outline'}
            className="text-xs h-8 px-3"
            onClick={() => {
              setIsVsAi(false);
              resetBoard();
            }}
          >
            <Users className="w-3.5 h-3.5 mr-1.5" /> 2 Players
          </Button>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="flex items-center gap-1 text-red-500">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block shadow-sm" /> Red: {scores.p1}
          </span>
          <span className="flex items-center gap-1 text-amber-500">
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block shadow-sm" /> {isVsAi ? 'AI' : 'Yellow'}: {scores.p2}
          </span>
          <span className="text-muted-foreground text-[11px]">Ties: {scores.ties}</span>
        </div>
      </div>

      {/* Turn indicator */}
      <div className="flex items-center justify-between w-full px-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {winner ? (
            <Badge
              className={cn(
                'text-sm px-3 py-1 font-bold',
                winner === 1 ? 'bg-red-500 text-white' : winner === 2 ? 'bg-amber-400 text-slate-950' : 'bg-muted'
              )}
            >
              {winner === 'tie' ? "It's a Tie!" : winner === 1 ? 'Red Wins! 🎉' : isVsAi ? 'Computer Wins! 🤖' : 'Yellow Wins! 🎉'}
            </Badge>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              Current Turn:{' '}
              <span
                className={cn(
                  'font-bold inline-flex items-center gap-1',
                  currentPlayer === 1 ? 'text-red-500' : 'text-amber-500'
                )}
              >
                <span
                  className={cn(
                    'w-3.5 h-3.5 rounded-full inline-block animate-pulse',
                    currentPlayer === 1 ? 'bg-red-500' : 'bg-amber-400'
                  )}
                />
                {currentPlayer === 1 ? 'Red' : isVsAi ? 'Computer Thinking...' : 'Yellow'}
              </span>
            </span>
          )}
        </div>

        <Button size="sm" variant="outline" className="text-xs h-8 px-3" onClick={resetBoard}>
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> New Game
        </Button>
      </div>

      {/* Connect Four Board (7 Columns, 6 Rows) */}
      <div className="bg-blue-600 dark:bg-blue-800 p-3 sm:p-4 rounded-3xl shadow-2xl border-4 border-blue-700 dark:border-blue-900 w-full max-w-[420px] aspect-[7/6]">
        <div className="grid grid-cols-7 grid-rows-6 gap-2 sm:gap-2.5 h-full w-full">
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const isWinning = winningCells.some(([wr, wc]) => wr === rIdx && wc === cIdx);
              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  onClick={() => handleColumnClick(cIdx)}
                  className="relative flex items-center justify-center cursor-pointer group"
                >
                  {/* Outer circle hole cutout */}
                  <div
                    className={cn(
                      'w-full h-full rounded-full transition-transform duration-200 shadow-inner flex items-center justify-center',
                      cell === null
                        ? 'bg-blue-950/40 dark:bg-blue-950/70 group-hover:scale-105'
                        : cell === 1
                        ? 'bg-red-500 shadow-md'
                        : 'bg-amber-400 shadow-md',
                      isWinning && 'ring-4 ring-white animate-bounce'
                    )}
                  >
                    {isWinning && <Sparkles className="w-4 h-4 text-white drop-shadow" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Touch Column Selector Buttons for Mobile */}
      <div className="grid grid-cols-7 gap-1.5 w-full max-w-[420px]">
        {[0, 1, 2, 3, 4, 5, 6].map((col) => (
          <Button
            key={col}
            variant="secondary"
            size="sm"
            disabled={Boolean(winner || isAiThinking || board[0][col] !== null)}
            className="h-9 text-xs font-bold bg-muted hover:bg-primary hover:text-primary-foreground transition-all shadow-sm active:scale-95"
            onClick={() => handleColumnClick(col)}
          >
            ↓
          </Button>
        ))}
      </div>
    </div>
  );
}
