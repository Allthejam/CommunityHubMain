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
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Player = 'red' | 'white';

interface Piece {
  player: Player;
  isKing: boolean;
}

type BoardState = (Piece | null)[][];

interface Move {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  jumpedR?: number;
  jumpedC?: number;
}

export function CheckersGame() {
  const [board, setBoard] = useState<BoardState>(() => initBoard());
  const [turn, setTurn] = useState<Player>('red'); // Red moves first (bottom to top)
  const [isVsAi, setIsVsAi] = useState(true);
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);
  const [winner, setWinner] = useState<Player | 'tie' | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Scores / stats
  const [scores, setScores] = useState({ red: 0, white: 0 });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_checkers_scores');
      if (saved) setScores(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  function initBoard(): BoardState {
    const b: BoardState = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        // Dark squares only: (r + c) % 2 === 1
        if ((r + c) % 2 === 1) {
          if (r < 3) {
            b[r][c] = { player: 'white', isKing: false };
          } else if (r > 4) {
            b[r][c] = { player: 'red', isKing: false };
          }
        }
      }
    }
    return b;
  }

  // Count pieces
  const pieceCounts = useMemo(() => {
    let red = 0;
    let white = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p?.player === 'red') red++;
        if (p?.player === 'white') white++;
      }
    }
    return { red, white };
  }, [board]);

  // Compute all valid moves for a given position
  const getMovesForPiece = useCallback(
    (b: BoardState, r: number, c: number): Move[] => {
      const piece = b[r][c];
      if (!piece) return [];

      const moves: Move[] = [];
      const directions: [number, number][] = [];

      // Red moves up (-1), White moves down (+1)
      if (piece.player === 'red' || piece.isKing) {
        directions.push([-1, -1], [-1, 1]);
      }
      if (piece.player === 'white' || piece.isKing) {
        directions.push([1, -1], [1, 1]);
      }

      for (const [dr, dc] of directions) {
        const nr = r + dr;
        const nc = c + dc;

        // Simple step
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          if (!b[nr][nc]) {
            moves.push({ fromR: r, fromC: c, toR: nr, toC: nc });
          } else if (b[nr][nc]?.player !== piece.player) {
            // Check jump
            const jnr = nr + dr;
            const jnc = nc + dc;
            if (jnr >= 0 && jnr < 8 && jnc >= 0 && jnc < 8 && !b[jnr][jnc]) {
              moves.push({
                fromR: r,
                fromC: c,
                toR: jnr,
                toC: jnc,
                jumpedR: nr,
                jumpedC: nc,
              });
            }
          }
        }
      }

      return moves;
    },
    []
  );

  // Available moves for currently selected piece
  const validMovesForSelected = useMemo(() => {
    if (!selectedPos) return [];
    return getMovesForPiece(board, selectedPos[0], selectedPos[1]);
  }, [selectedPos, board, getMovesForPiece]);

  // Execute a move
  const executeMove = useCallback(
    (move: Move, currentBoard: BoardState): BoardState => {
      const nextBoard = currentBoard.map((row) => [...row]);
      const piece = nextBoard[move.fromR][move.fromC]!;
      nextBoard[move.fromR][move.fromC] = null;

      // Handle jump removal
      if (move.jumpedR !== undefined && move.jumpedC !== undefined) {
        nextBoard[move.jumpedR][move.jumpedC] = null;
      }

      // Check kinging
      let isKing = piece.isKing;
      if (piece.player === 'red' && move.toR === 0) isKing = true;
      if (piece.player === 'white' && move.toR === 7) isKing = true;

      nextBoard[move.toR][move.toC] = { ...piece, isKing };
      return nextBoard;
    },
    []
  );

  // Check game over
  const checkGameOver = useCallback(
    (b: BoardState, nextTurn: Player) => {
      let redCount = 0;
      let whiteCount = 0;
      let hasValidMove = false;

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = b[r][c];
          if (p?.player === 'red') redCount++;
          if (p?.player === 'white') whiteCount++;
          if (p?.player === nextTurn && !hasValidMove) {
            const moves = getMovesForPiece(b, r, c);
            if (moves.length > 0) hasValidMove = true;
          }
        }
      }

      if (redCount === 0 || (!hasValidMove && nextTurn === 'red')) {
        setWinner('white');
        updateScore('white');
        return true;
      }
      if (whiteCount === 0 || (!hasValidMove && nextTurn === 'white')) {
        setWinner('red');
        updateScore('red');
        return true;
      }
      return false;
    },
    [getMovesForPiece]
  );

  const updateScore = (w: Player) => {
    setScores((prev) => {
      const updated = {
        red: w === 'red' ? prev.red + 1 : prev.red,
        white: w === 'white' ? prev.white + 1 : prev.white,
      };
      try {
        localStorage.setItem('timewaisters_checkers_scores', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Bot AI move
  const triggerAiMove = useCallback(
    (currentBoard: BoardState) => {
      setIsAiThinking(true);
      setTimeout(() => {
        // Gather all valid moves for white
        const allMoves: Move[] = [];
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            if (currentBoard[r][c]?.player === 'white') {
              allMoves.push(...getMovesForPiece(currentBoard, r, c));
            }
          }
        }

        if (allMoves.length === 0) {
          setWinner('red');
          updateScore('red');
          setIsAiThinking(false);
          return;
        }

        // Prioritize jumps/captures
        const jumpMoves = allMoves.filter((m) => m.jumpedR !== undefined);
        const chosen =
          jumpMoves.length > 0
            ? jumpMoves[Math.floor(Math.random() * jumpMoves.length)]
            : allMoves[Math.floor(Math.random() * allMoves.length)];

        const newBoard = executeMove(chosen, currentBoard);
        setBoard(newBoard);
        setIsAiThinking(false);

        if (!checkGameOver(newBoard, 'red')) {
          setTurn('red');
        }
      }, 500);
    },
    [getMovesForPiece, executeMove, checkGameOver]
  );

  // Handle cell click
  const handleCellClick = (r: number, c: number) => {
    if (winner || isAiThinking) return;
    if (isVsAi && turn === 'white') return;

    const clickedPiece = board[r][c];

    // If clicking own piece, select it
    if (clickedPiece && clickedPiece.player === turn) {
      setSelectedPos([r, c]);
      return;
    }

    // If a piece is already selected, check if clicking a valid destination
    if (selectedPos) {
      const matchMove = validMovesForSelected.find((m) => m.toR === r && m.toC === c);
      if (matchMove) {
        const nextBoard = executeMove(matchMove, board);
        setBoard(nextBoard);
        setSelectedPos(null);

        const nextPlayer: Player = turn === 'red' ? 'white' : 'red';
        setTurn(nextPlayer);

        if (!checkGameOver(nextBoard, nextPlayer)) {
          if (isVsAi && nextPlayer === 'white') {
            triggerAiMove(nextBoard);
          }
        }
        return;
      }
    }

    // Otherwise deselect
    setSelectedPos(null);
  };

  const handleReset = () => {
    setBoard(initBoard());
    setTurn('red');
    setSelectedPos(null);
    setWinner(null);
    setIsAiThinking(false);
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      {/* Top Header Controls */}
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

        <div className="flex items-center gap-2 text-xs font-semibold">
          <div className="flex items-center gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-full">
            <span>Red: {scores.red}</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-500/10 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-full">
            <span>White: {scores.white}</span>
          </div>
        </div>
      </div>

      {/* Turn & Piece Status */}
      <div className="w-full flex items-center justify-between mb-3 px-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Turn:</span>
          <Badge
            variant="outline"
            className={cn(
              'font-bold',
              turn === 'red'
                ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400'
                : 'bg-slate-200 dark:bg-slate-800 text-foreground'
            )}
          >
            {turn === 'red' ? '🔴 Red (You)' : isVsAi ? '⚪ White (AI Thinking...)' : '⚪ White'}
          </Badge>
        </div>
        <div className="text-muted-foreground font-mono">
          🔴 {pieceCounts.red} vs ⚪ {pieceCounts.white}
        </div>
      </div>

      {/* 8x8 Board Card */}
      <Card className="w-full p-2 sm:p-3 shadow-md border-border/80 flex flex-col items-center">
        <div className="grid grid-cols-8 gap-0.5 border-4 border-amber-950 rounded-lg overflow-hidden bg-amber-950 shadow-inner">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isDark = (r + c) % 2 === 1;
              const isSelected = selectedPos && selectedPos[0] === r && selectedPos[1] === c;
              const isValidDestination = validMovesForSelected.some(
                (m) => m.toR === r && m.toC === c
              );

              return (
                <button
                  key={`${r}-${c}`}
                  disabled={!isDark}
                  onClick={() => handleCellClick(r, c)}
                  className={cn(
                    'w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center relative transition-all duration-150',
                    isDark ? 'bg-amber-900/90' : 'bg-amber-100 dark:bg-amber-200/90 cursor-default',
                    isSelected && 'ring-2 ring-amber-400 z-10'
                  )}
                >
                  {/* Destination indicator dot */}
                  {isValidDestination && (
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-400/90 shadow-md animate-pulse z-10" />
                  )}

                  {/* Checker piece */}
                  {cell && (
                    <div
                      className={cn(
                        'w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-md flex items-center justify-center transition-transform active:scale-95 border-2',
                        cell.player === 'red'
                          ? 'bg-gradient-to-b from-rose-500 to-rose-700 border-rose-300 text-white'
                          : 'bg-gradient-to-b from-slate-100 to-slate-300 border-slate-400 text-slate-800'
                      )}
                    >
                      {cell.isKing && (
                        <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 fill-current animate-pulse" />
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </Card>

      {/* Winner overlay or Reset button */}
      <div className="w-full mt-3 flex flex-col items-center gap-2">
        {winner && (
          <div className="w-full p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-center font-bold text-sm animate-in zoom-in-95">
            🎉 {winner === 'red' ? 'Red Wins the Game!' : 'White Wins the Game!'}
          </div>
        )}

        <Button
          variant="outline"
          onClick={handleReset}
          className="gap-2 text-xs font-semibold h-10 w-full"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Draughts Board
        </Button>
      </div>
    </div>
  );
}
