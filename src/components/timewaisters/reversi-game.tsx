'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  RotateCcw,
  Sparkles,
  Trophy,
  Bot,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Player = 'black' | 'white';
type Board = (Player | null)[][];

const DIRECTIONS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

export function ReversiGame() {
  const [board, setBoard] = useState<Board>(() => initBoard());
  const [turn, setTurn] = useState<Player>('black');
  const [isVsAi, setIsVsAi] = useState(true);
  const [winner, setWinner] = useState<Player | 'tie' | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Scores
  const [stats, setStats] = useState({ blackWins: 0, whiteWins: 0 });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_reversi_stats');
      if (saved) setStats(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  function initBoard(): Board {
    const b: Board = Array(8).fill(null).map(() => Array(8).fill(null));
    b[3][3] = 'white';
    b[3][4] = 'black';
    b[4][3] = 'black';
    b[4][4] = 'white';
    return b;
  }

  // Count disks
  const counts = useMemo(() => {
    let black = 0;
    let white = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] === 'black') black++;
        if (board[r][c] === 'white') white++;
      }
    }
    return { black, white };
  }, [board]);

  // Find flippable disks for a move
  const getFlippableDisks = useCallback(
    (b: Board, r: number, c: number, player: Player): [number, number][] => {
      if (b[r][c] !== null) return [];
      const opponent: Player = player === 'black' ? 'white' : 'black';
      const toFlip: [number, number][] = [];

      for (const [dr, dc] of DIRECTIONS) {
        let nr = r + dr;
        let nc = c + dc;
        const line: [number, number][] = [];

        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr][nc] === opponent) {
          line.push([nr, nc]);
          nr += dr;
          nc += dc;
        }

        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr][nc] === player && line.length > 0) {
          toFlip.push(...line);
        }
      }

      return toFlip;
    },
    []
  );

  // Get all legal moves for current player
  const legalMoves = useMemo(() => {
    const moves: { r: number; c: number; flips: [number, number][] }[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const flips = getFlippableDisks(board, r, c, turn);
        if (flips.length > 0) {
          moves.push({ r, c, flips });
        }
      }
    }
    return moves;
  }, [board, turn, getFlippableDisks]);

  // AI Move
  const triggerAiMove = useCallback(
    (currentBoard: Board) => {
      setIsAiThinking(true);
      setTimeout(() => {
        // Collect white moves
        const whiteMoves: { r: number; c: number; flips: [number, number][] }[] = [];
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const flips = getFlippableDisks(currentBoard, r, c, 'white');
            if (flips.length > 0) whiteMoves.push({ r, c, flips });
          }
        }

        if (whiteMoves.length === 0) {
          // AI passes
          setIsAiThinking(false);
          setTurn('black');
          return;
        }

        // Prioritize corners (0,0), (0,7), (7,0), (7,7)
        const cornerMoves = whiteMoves.filter(
          (m) =>
            (m.r === 0 || m.r === 7) && (m.c === 0 || m.c === 7)
        );

        const chosen =
          cornerMoves.length > 0
            ? cornerMoves[0]
            : whiteMoves.sort((a, b) => b.flips.length - a.flips.length)[0];

        // Apply move
        const nextBoard = currentBoard.map((row) => [...row]);
        nextBoard[chosen.r][chosen.c] = 'white';
        chosen.flips.forEach(([fr, fc]) => {
          nextBoard[fr][fc] = 'white';
        });

        setBoard(nextBoard);
        setIsAiThinking(false);
        setTurn('black');
      }, 500);
    },
    [getFlippableDisks]
  );

  // Check end of game
  useEffect(() => {
    if (winner) return;

    // Check if black has moves
    let blackHasMoves = false;
    let whiteHasMoves = false;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (!blackHasMoves && getFlippableDisks(board, r, c, 'black').length > 0) blackHasMoves = true;
        if (!whiteHasMoves && getFlippableDisks(board, r, c, 'white').length > 0) whiteHasMoves = true;
      }
    }

    if (!blackHasMoves && !whiteHasMoves) {
      // Game over!
      if (counts.black > counts.white) {
        setWinner('black');
        saveWin('black');
      } else if (counts.white > counts.black) {
        setWinner('white');
        saveWin('white');
      } else {
        setWinner('tie');
      }
    } else if (turn === 'black' && !blackHasMoves) {
      // Black passes
      setTurn('white');
      if (isVsAi) triggerAiMove(board);
    } else if (turn === 'white' && !whiteHasMoves) {
      // White passes
      setTurn('black');
    }
  }, [board, turn, counts, winner, isVsAi, getFlippableDisks, triggerAiMove]);

  const saveWin = (w: Player) => {
    setStats((prev) => {
      const updated = {
        blackWins: w === 'black' ? prev.blackWins + 1 : prev.blackWins,
        whiteWins: w === 'white' ? prev.whiteWins + 1 : prev.whiteWins,
      };
      try {
        localStorage.setItem('timewaisters_reversi_stats', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Player click
  const handleCellClick = (r: number, c: number) => {
    if (winner || isAiThinking) return;
    if (isVsAi && turn === 'white') return;

    const move = legalMoves.find((m) => m.r === r && m.c === c);
    if (!move) return;

    const nextBoard = board.map((row) => [...row]);
    nextBoard[r][c] = turn;
    move.flips.forEach(([fr, fc]) => {
      nextBoard[fr][fc] = turn;
    });

    setBoard(nextBoard);

    const nextPlayer: Player = turn === 'black' ? 'white' : 'black';
    setTurn(nextPlayer);

    if (isVsAi && nextPlayer === 'white') {
      triggerAiMove(nextBoard);
    }
  };

  const handleReset = () => {
    setBoard(initBoard());
    setTurn('black');
    setWinner(null);
    setIsAiThinking(false);
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      {/* Top Bar Mode & Scores */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={isVsAi ? 'default' : 'outline'}
            onClick={() => {
              setIsVsAi(true);
              handleReset();
            }}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <Bot className="w-3.5 h-3.5" />
            vs AI
          </Button>
          <Button
            size="sm"
            variant={!isVsAi ? 'default' : 'outline'}
            onClick={() => {
              setIsVsAi(false);
              handleReset();
            }}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            Pass & Play
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold">
          <div className="bg-slate-900 text-white px-2.5 py-1 rounded-full shadow-sm">
            ⚫ {counts.black}
          </div>
          <div className="bg-slate-100 dark:bg-slate-200 text-slate-900 px-2.5 py-1 rounded-full shadow-sm">
            ⚪ {counts.white}
          </div>
        </div>
      </div>

      {/* Turn Status */}
      <div className="w-full flex items-center justify-between mb-3 px-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Turn:</span>
          <Badge
            variant="outline"
            className={cn(
              'font-bold',
              turn === 'black'
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-slate-100 dark:bg-slate-200 text-slate-900'
            )}
          >
            {turn === 'black' ? '⚫ Black (You)' : isVsAi ? '⚪ White (AI Thinking...)' : '⚪ White'}
          </Badge>
        </div>
        <span className="text-muted-foreground font-mono">
          {legalMoves.length} valid moves
        </span>
      </div>

      {/* 8x8 Felt Board Card */}
      <Card className="w-full p-2 sm:p-3 shadow-md border-border/80 flex flex-col items-center">
        <div className="grid grid-cols-8 gap-0.5 border-4 border-emerald-950 rounded-lg overflow-hidden bg-emerald-950 shadow-inner">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isLegal = legalMoves.some((m) => m.r === r && m.c === c);

              return (
                <button
                  key={`${r}-${c}`}
                  disabled={!isLegal && cell === null}
                  onClick={() => handleCellClick(r, c)}
                  className="w-9 h-9 sm:w-11 sm:h-11 bg-emerald-700 dark:bg-emerald-800 flex items-center justify-center relative transition-all duration-150 hover:brightness-105"
                >
                  {/* Legal move indicator dot */}
                  {isLegal && !cell && (
                    <span className="w-3 h-3 rounded-full bg-emerald-300/80 shadow-sm animate-pulse" />
                  )}

                  {/* Reversi Disk */}
                  {cell && (
                    <div
                      className={cn(
                        'w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-md flex items-center justify-center transition-all duration-200 border-2 active:scale-95',
                        cell === 'black'
                          ? 'bg-slate-900 border-slate-700 text-white'
                          : 'bg-slate-100 border-slate-300 text-slate-900'
                      )}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </Card>

      {/* Victory or Reset */}
      <div className="w-full mt-3 flex flex-col items-center gap-2">
        {winner && (
          <div className="w-full p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-center font-bold text-sm animate-in zoom-in-95">
            🎉{' '}
            {winner === 'black'
              ? `Black Wins! (${counts.black} to ${counts.white})`
              : winner === 'white'
              ? `White Wins! (${counts.white} to ${counts.black})`
              : 'It’s a Tie!'}
          </div>
        )}

        <Button
          variant="outline"
          onClick={handleReset}
          className="gap-2 text-xs font-semibold h-10 w-full"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Reversi Board
        </Button>
      </div>
    </div>
  );
}
