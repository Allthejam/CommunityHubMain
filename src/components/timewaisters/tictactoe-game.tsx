'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Bot, Users, Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type Player = 'X' | 'O';
type Cell = Player | null;

export function TicTacToeGame() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [isVsAi, setIsVsAi] = useState(true);
  const [winner, setWinner] = useState<Player | 'tie' | null>(null);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [scores, setScores] = useState({ x: 0, o: 0, ties: 0 });
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Check 3 in a row
  const checkWin = useCallback((b: Cell[]): { winner: Player; line: number[] } | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6],             // diags
    ];

    for (const [a, bIdx, c] of lines) {
      if (b[a] && b[a] === b[bIdx] && b[a] === b[c]) {
        return { winner: b[a]!, line: [a, bIdx, c] };
      }
    }
    return null;
  }, []);

  // Smart AI Move
  const getAiMove = useCallback((b: Cell[]): number => {
    // 1. Immediate Win for O
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        const copy = [...b];
        copy[i] = 'O';
        if (checkWin(copy)?.winner === 'O') return i;
      }
    }
    // 2. Block X from winning
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        const copy = [...b];
        copy[i] = 'X';
        if (checkWin(copy)?.winner === 'X') return i;
      }
    }
    // 3. Center
    if (!b[4]) return 4;
    // 4. Corners
    const corners = [0, 2, 6, 8].filter((i) => !b[i]);
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
    // 5. Remaining
    const remaining = [1, 3, 5, 7].filter((i) => !b[i]);
    return remaining[0] ?? 0;
  }, [checkWin]);

  // Reset round
  const resetBoard = useCallback(() => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
    setWinningLine([]);
    setIsAiThinking(false);
  }, []);

  // Handle cell click
  const handleCellClick = (idx: number) => {
    if (board[idx] || winner || isAiThinking) return;

    const nextBoard = [...board];
    nextBoard[idx] = currentPlayer;

    const winResult = checkWin(nextBoard);
    if (winResult) {
      setBoard(nextBoard);
      setWinner(winResult.winner);
      setWinningLine(winResult.line);
      setScores((s) => ({
        ...s,
        [winResult.winner === 'X' ? 'x' : 'o']: s[winResult.winner === 'X' ? 'x' : 'o'] + 1,
      }));
      return;
    }

    if (nextBoard.every((c) => c !== null)) {
      setBoard(nextBoard);
      setWinner('tie');
      setScores((s) => ({ ...s, ties: s.ties + 1 }));
      return;
    }

    setBoard(nextBoard);
    const nextP: Player = currentPlayer === 'X' ? 'O' : 'X';
    setCurrentPlayer(nextP);

    // AI move
    if (isVsAi && nextP === 'O') {
      setIsAiThinking(true);
      setTimeout(() => {
        const aiIdx = getAiMove(nextBoard);
        const aiBoard = [...nextBoard];
        aiBoard[aiIdx] = 'O';

        const aiWin = checkWin(aiBoard);
        setBoard(aiBoard);

        if (aiWin) {
          setWinner(aiWin.winner);
          setWinningLine(aiWin.line);
          setScores((s) => ({ ...s, o: s.o + 1 }));
        } else if (aiBoard.every((c) => c !== null)) {
          setWinner('tie');
          setScores((s) => ({ ...s, ties: s.ties + 1 }));
        } else {
          setCurrentPlayer('X');
        }
        setIsAiThinking(false);
      }, 300);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center max-w-xl mx-auto w-full gap-4 select-none">
      {/* Top Bar */}
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
            <Bot className="w-3.5 h-3.5 mr-1.5" /> vs Bot
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
          <span className="text-blue-500">X: {scores.x}</span>
          <span className="text-rose-500">{isVsAi ? 'Bot (O)' : 'O'}: {scores.o}</span>
          <span className="text-muted-foreground text-[11px]">Ties: {scores.ties}</span>
          <Button size="sm" variant="outline" className="h-8 px-2.5 ml-1" onClick={resetBoard}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Turn indicator */}
      <div className="flex items-center justify-center w-full">
        {winner ? (
          <Badge
            className={cn(
              'text-sm px-4 py-1 font-bold',
              winner === 'X'
                ? 'bg-blue-600 text-white'
                : winner === 'O'
                ? 'bg-rose-600 text-white'
                : 'bg-muted'
            )}
          >
            {winner === 'tie' ? "It's a Draw!" : `${winner === 'X' ? 'Player X' : isVsAi ? 'Computer' : 'Player O'} Wins! 🎉`}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
            Turn:{' '}
            <strong className={cn(currentPlayer === 'X' ? 'text-blue-500' : 'text-rose-500')}>
              {currentPlayer === 'X' ? 'Player X' : isVsAi ? 'Bot Thinking...' : 'Player O'}
            </strong>
          </span>
        )}
      </div>

      {/* 3x3 Grid */}
      <div className="bg-slate-200 dark:bg-slate-800 p-3 sm:p-4 rounded-3xl shadow-xl border w-full max-w-[340px] aspect-square">
        <div className="grid grid-cols-3 grid-rows-3 gap-2.5 h-full w-full">
          {board.map((cell, idx) => {
            const isWinning = winningLine.includes(idx);

            return (
              <button
                key={idx}
                onClick={() => handleCellClick(idx)}
                className={cn(
                  'rounded-2xl font-black text-4xl sm:text-5xl flex items-center justify-center transition-all duration-150 shadow-sm active:scale-95',
                  !cell
                    ? 'bg-background hover:bg-muted'
                    : cell === 'X'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 border-2 border-blue-400'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 border-2 border-rose-400',
                  isWinning && 'ring-4 ring-amber-400 animate-bounce'
                )}
              >
                {cell}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
