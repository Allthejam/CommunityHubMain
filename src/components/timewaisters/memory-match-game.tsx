'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Trophy, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardItem {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const ICONS = ['☕', '🌲', '⭐', '❤️', '🏔️', '🎵', '📷', '📚'];

export function MemoryMatchGame() {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [bestMoves, setBestMoves] = useState<number | null>(null);

  // Load best moves
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_memory_best');
      if (saved) setBestMoves(parseInt(saved, 10));
    } catch (e) {}
  }, []);

  // Initialize new game
  const startNewGame = useCallback(() => {
    const pairs = [...ICONS, ...ICONS];
    // Shuffle Fisher-Yates
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }

    setCards(
      pairs.map((sym, idx) => ({
        id: idx,
        symbol: sym,
        isFlipped: false,
        isMatched: false,
      }))
    );
    setFlippedIndices([]);
    setMoves(0);
    setIsWon(false);
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // Handle card click
  const handleCardClick = (index: number) => {
    if (
      flippedIndices.length === 2 ||
      cards[index].isFlipped ||
      cards[index].isMatched
    ) {
      return;
    }

    const nextFlipped = [...flippedIndices, index];
    const nextCards = cards.map((c, i) => (i === index ? { ...c, isFlipped: true } : c));
    setCards(nextCards);
    setFlippedIndices(nextFlipped);

    // If 2 cards are flipped, check for match
    if (nextFlipped.length === 2) {
      const nextMoves = moves + 1;
      setMoves(nextMoves);
      const [idx1, idx2] = nextFlipped;

      if (cards[idx1].symbol === cards[idx2].symbol) {
        // Match!
        setTimeout(() => {
          setCards((prev) => {
            const updated = prev.map((c, i) =>
              i === idx1 || i === idx2 ? { ...c, isMatched: true } : c
            );
            // Check win
            if (updated.every((c) => c.isMatched)) {
              setIsWon(true);
              if (!bestMoves || nextMoves < bestMoves) {
                setBestMoves(nextMoves);
                try {
                  localStorage.setItem('timewaisters_memory_best', nextMoves.toString());
                } catch (e) {}
              }
            }
            return updated;
          });
          setFlippedIndices([]);
        }, 300);
      } else {
        // No match -> flip back after 700ms
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === idx1 || i === idx2 ? { ...c, isFlipped: false } : c
            )
          );
          setFlippedIndices([]);
        }, 700);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center max-w-xl mx-auto w-full gap-4 select-none">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between bg-card p-3 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-black text-primary">Memory Match</h2>
          <p className="text-[11px] text-muted-foreground">Find all 8 matching pairs in fewest moves.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-muted px-3 py-1 rounded-lg text-center">
            <span className="block text-[10px] uppercase font-bold text-muted-foreground">Moves</span>
            <span className="text-sm font-extrabold">{moves}</span>
          </div>

          {bestMoves && (
            <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-amber-500">
              <Trophy className="w-3.5 h-3.5" /> Best: {bestMoves} moves
            </div>
          )}

          <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={startNewGame}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 4x4 Card Grid */}
      <div className="bg-slate-100 dark:bg-slate-900/60 p-3 sm:p-4 rounded-3xl shadow-xl border w-full max-w-[380px] aspect-square">
        <div className="grid grid-cols-4 grid-rows-4 gap-2.5 sm:gap-3 h-full w-full">
          {cards.map((card, idx) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(idx)}
              className={cn(
                'rounded-2xl flex items-center justify-center font-extrabold text-2xl sm:text-3xl transition-all duration-200 shadow-sm active:scale-95',
                card.isMatched
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 border-2 border-emerald-400 opacity-90'
                  : card.isFlipped
                  ? 'bg-amber-100 dark:bg-amber-950/80 border-2 border-amber-400 scale-105'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow'
              )}
            >
              {card.isFlipped || card.isMatched ? card.symbol : '❓'}
            </button>
          ))}
        </div>
      </div>

      {/* Win Banner */}
      {isWon && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-400 p-4 rounded-xl text-center w-full max-w-[380px] animate-in fade-in zoom-in">
          <Sparkles className="w-10 h-10 text-emerald-500 mx-auto mb-2 animate-bounce" />
          <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">All Pairs Found! 🎉</h3>
          <p className="text-xs text-muted-foreground mt-1">Solved in {moves} moves.</p>
          <Button size="sm" className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={startNewGame}>
            Play Another Round
          </Button>
        </div>
      )}
    </div>
  );
}
