'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  RotateCcw,
  Sparkles,
  Trophy,
  Clock,
  Layers,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type CardColor = 'red' | 'black';

interface PlayingCard {
  id: string;
  suit: Suit;
  rank: number; // 1 = Ace, 11 = J, 12 = Q, 13 = K
  color: CardColor;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const RANK_LABELS: Record<number, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

export function FreeCellGame() {
  // 8 tableau columns
  const [cascades, setCascades] = useState<PlayingCard[][]>([]);
  // 4 free cells (null or 1 card each)
  const [freeCells, setFreeCells] = useState<(PlayingCard | null)[]>([null, null, null, null]);
  // 4 foundation piles (hearts, diamonds, clubs, spades)
  const [foundations, setFoundations] = useState<Record<Suit, PlayingCard[]>>({
    hearts: [],
    diamonds: [],
    clubs: [],
    spades: [],
  });

  const [selectedCard, setSelectedCard] = useState<{
    card: PlayingCard;
    source: 'freecell' | 'cascade';
    sourceIdx: number;
    cardIdx?: number;
  } | null>(null);

  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isWon, setIsWon] = useState(false);

  // Best stats
  const [bestMoves, setBestMoves] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_freecell_bestmoves');
      if (saved) setBestMoves(parseInt(saved, 10));
    } catch {
      // ignore
    }
  }, []);

  // Timer
  useEffect(() => {
    if (isWon) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isWon]);

  // Generate Deck & Deal
  const initGame = useCallback(() => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const deck: PlayingCard[] = [];

    suits.forEach((suit) => {
      for (let rank = 1; rank <= 13; rank++) {
        deck.push({
          id: `${suit}-${rank}`,
          suit,
          rank,
          color: suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black',
        });
      }
    });

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Deal into 8 cascades
    const newCascades: PlayingCard[][] = Array(8).fill(null).map(() => []);
    deck.forEach((card, idx) => {
      newCascades[idx % 8].push(card);
    });

    setCascades(newCascades);
    setFreeCells([null, null, null, null]);
    setFoundations({ hearts: [], diamonds: [], clubs: [], spades: [] });
    setSelectedCard(null);
    setMoves(0);
    setSeconds(0);
    setIsWon(false);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Check win condition (all 4 foundations have 13 cards)
  useEffect(() => {
    const totalFoundationCards =
      foundations.hearts.length +
      foundations.diamonds.length +
      foundations.clubs.length +
      foundations.spades.length;

    if (totalFoundationCards === 52) {
      setIsWon(true);
      if (!bestMoves || moves < bestMoves) {
        setBestMoves(moves);
        try {
          localStorage.setItem('timewaisters_freecell_bestmoves', moves.toString());
        } catch {
          // ignore
        }
      }
    }
  }, [foundations, moves, bestMoves]);

  // Auto move eligible cards to foundations
  const autoSendToFoundations = useCallback(() => {
    let changed = false;
    let nextCascades = cascades.map((col) => [...col]);
    let nextFreeCells = [...freeCells];
    let nextFoundations = {
      hearts: [...foundations.hearts],
      diamonds: [...foundations.diamonds],
      clubs: [...foundations.clubs],
      spades: [...foundations.spades],
    };

    // Helper: can card go to its foundation?
    const canMoveToFoundation = (card: PlayingCard) => {
      const targetPile = nextFoundations[card.suit];
      if (targetPile.length === 0) return card.rank === 1;
      return targetPile[targetPile.length - 1].rank === card.rank - 1;
    };

    // Check freecells
    nextFreeCells.forEach((c, idx) => {
      if (c && canMoveToFoundation(c)) {
        nextFoundations[c.suit].push(c);
        nextFreeCells[idx] = null;
        changed = true;
      }
    });

    // Check cascades tops
    nextCascades.forEach((col, cIdx) => {
      if (col.length > 0) {
        const top = col[col.length - 1];
        if (canMoveToFoundation(top)) {
          nextFoundations[top.suit].push(top);
          col.pop();
          changed = true;
        }
      }
    });

    if (changed) {
      setCascades(nextCascades);
      setFreeCells(nextFreeCells);
      setFoundations(nextFoundations);
      setMoves((m) => m + 1);
      setSelectedCard(null);
    }
  }, [cascades, freeCells, foundations]);

  // Click on a free cell
  const handleFreeCellClick = (cellIdx: number) => {
    const cellCard = freeCells[cellIdx];

    // If already selected, maybe place here?
    if (selectedCard) {
      if (cellCard === null) {
        // Move selected card to free cell
        const nextFree = [...freeCells];
        nextFree[cellIdx] = selectedCard.card;

        // Remove from source
        if (selectedCard.source === 'freecell') {
          nextFree[selectedCard.sourceIdx] = null;
        } else {
          const nextCascades = cascades.map((col) => [...col]);
          nextCascades[selectedCard.sourceIdx].pop();
          setCascades(nextCascades);
        }

        setFreeCells(nextFree);
        setSelectedCard(null);
        setMoves((m) => m + 1);
        return;
      }
    }

    // Otherwise select the card inside the free cell
    if (cellCard) {
      if (selectedCard?.card.id === cellCard.id) {
        setSelectedCard(null);
      } else {
        setSelectedCard({
          card: cellCard,
          source: 'freecell',
          sourceIdx: cellIdx,
        });
      }
    }
  };

  // Click on a foundation pile
  const handleFoundationClick = (suit: Suit) => {
    if (!selectedCard) return;

    const pile = foundations[suit];
    const card = selectedCard.card;

    if (card.suit === suit) {
      const isValid = pile.length === 0 ? card.rank === 1 : pile[pile.length - 1].rank === card.rank - 1;

      if (isValid) {
        const nextFoundations = { ...foundations, [suit]: [...pile, card] };

        // Remove from source
        if (selectedCard.source === 'freecell') {
          const nextFree = [...freeCells];
          nextFree[selectedCard.sourceIdx] = null;
          setFreeCells(nextFree);
        } else {
          const nextCascades = cascades.map((col) => [...col]);
          nextCascades[selectedCard.sourceIdx].pop();
          setCascades(nextCascades);
        }

        setFoundations(nextFoundations);
        setSelectedCard(null);
        setMoves((m) => m + 1);
      }
    }
  };

  // Click on a cascade column
  const handleCascadeClick = (colIdx: number) => {
    const column = cascades[colIdx];

    // If we have a selected card, try to drop it here
    if (selectedCard) {
      const topCard = column.length > 0 ? column[column.length - 1] : null;

      // Valid placement: empty column or rank - 1 and alternating color
      const canDrop =
        topCard === null ||
        (topCard.rank === selectedCard.card.rank + 1 && topCard.color !== selectedCard.card.color);

      if (canDrop) {
        const nextCascades = cascades.map((col) => [...col]);

        if (selectedCard.source === 'freecell') {
          const nextFree = [...freeCells];
          nextFree[selectedCard.sourceIdx] = null;
          setFreeCells(nextFree);
          nextCascades[colIdx].push(selectedCard.card);
        } else {
          // Source is cascade
          if (selectedCard.sourceIdx === colIdx) {
            setSelectedCard(null);
            return;
          }
          const movedCard = nextCascades[selectedCard.sourceIdx].pop()!;
          nextCascades[colIdx].push(movedCard);
        }

        setCascades(nextCascades);
        setSelectedCard(null);
        setMoves((m) => m + 1);
        return;
      }
    }

    // If no card selected, select top card of column
    if (column.length > 0) {
      const top = column[column.length - 1];
      if (selectedCard?.card.id === top.id) {
        setSelectedCard(null);
      } else {
        setSelectedCard({
          card: top,
          source: 'cascade',
          sourceIdx: colIdx,
          cardIdx: column.length - 1,
        });
      }
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      {/* Top Header Controls */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5 text-xs">
          <Badge variant="outline" className="font-mono">
            Moves: {moves}
          </Badge>
          <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full font-mono text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatTime(seconds)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={autoSendToFoundations}
            className="h-7 text-xs font-semibold gap-1 px-2.5 text-primary"
          >
            <Zap className="w-3 h-3 fill-current" />
            Auto Move
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={initGame}
            className="h-7 text-xs font-semibold gap-1 px-2 text-muted-foreground"
          >
            <RotateCcw className="w-3 h-3" />
            New Deal
          </Button>
        </div>
      </div>

      {/* Top Row: Free Cells (4) + Foundations (4) */}
      <div className="w-full grid grid-cols-8 gap-1.5 mb-3 px-0.5">
        {/* 4 Free Cells */}
        {freeCells.map((card, idx) => {
          const isSelected = selectedCard?.source === 'freecell' && selectedCard.sourceIdx === idx;
          return (
            <button
              key={`free-${idx}`}
              onClick={() => handleFreeCellClick(idx)}
              className={cn(
                'aspect-[2.5/3.5] rounded-md border-2 border-dashed flex flex-col items-center justify-center relative transition-all text-xs font-bold',
                card
                  ? card.color === 'red'
                    ? 'bg-card text-rose-600 border-border shadow-sm'
                    : 'bg-card text-slate-900 dark:text-slate-100 border-border shadow-sm'
                  : 'border-muted-foreground/30 bg-muted/20 hover:border-primary/50',
                isSelected && 'ring-2 ring-primary border-primary scale-105'
              )}
            >
              {card ? (
                <>
                  <span className="text-[11px] leading-none">{RANK_LABELS[card.rank]}</span>
                  <span className="text-sm leading-none">{SUIT_SYMBOLS[card.suit]}</span>
                </>
              ) : (
                <span className="text-[9px] text-muted-foreground/40">FREE</span>
              )}
            </button>
          );
        })}

        {/* 4 Foundations */}
        {(['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]).map((suit) => {
          const pile = foundations[suit];
          const top = pile.length > 0 ? pile[pile.length - 1] : null;
          const isRed = suit === 'hearts' || suit === 'diamonds';

          return (
            <button
              key={`foundation-${suit}`}
              onClick={() => handleFoundationClick(suit)}
              className={cn(
                'aspect-[2.5/3.5] rounded-md border-2 flex flex-col items-center justify-center relative transition-all text-xs font-bold shadow-sm',
                top
                  ? isRed
                    ? 'bg-card text-rose-600 border-rose-300'
                    : 'bg-card text-slate-900 dark:text-slate-100 border-slate-300'
                  : 'border-border/60 bg-muted/30 hover:border-primary/50'
              )}
            >
              {top ? (
                <>
                  <span className="text-[11px] leading-none">{RANK_LABELS[top.rank]}</span>
                  <span className="text-sm leading-none">{SUIT_SYMBOLS[suit]}</span>
                </>
              ) : (
                <span className={cn('text-sm opacity-30', isRed ? 'text-rose-500' : 'text-slate-500')}>
                  {SUIT_SYMBOLS[suit]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 8 Tableau Columns Card */}
      <Card className="w-full p-2 sm:p-3 shadow-md border-border/80 min-h-[340px] bg-slate-900/5 dark:bg-slate-950/40">
        <div className="grid grid-cols-8 gap-1 items-start">
          {cascades.map((col, cIdx) => (
            <div
              key={`col-${cIdx}`}
              onClick={() => handleCascadeClick(cIdx)}
              className="flex flex-col gap-0.5 min-h-[300px] cursor-pointer rounded p-0.5 hover:bg-muted/30 transition-colors"
            >
              {col.length === 0 ? (
                <div className="w-full aspect-[2.5/3.5] rounded border border-dashed border-muted-foreground/20" />
              ) : (
                col.map((card, idx) => {
                  const isTop = idx === col.length - 1;
                  const isSelected =
                    selectedCard?.source === 'cascade' &&
                    selectedCard.sourceIdx === cIdx &&
                    selectedCard.cardIdx === idx;

                  return (
                    <div
                      key={card.id}
                      className={cn(
                        'w-full aspect-[2.5/3.5] rounded border shadow-sm flex flex-col items-center justify-center font-bold text-xs transition-all duration-100 select-none -mt-7 sm:-mt-8 first:mt-0',
                        card.color === 'red'
                          ? 'bg-card text-rose-600 border-border/90'
                          : 'bg-card text-slate-900 dark:text-slate-100 border-border/90',
                        isSelected && 'ring-2 ring-primary border-primary -translate-y-1 z-20 shadow-md',
                        isTop && 'hover:border-primary/60'
                      )}
                    >
                      <span className="text-[10px] sm:text-xs leading-none">{RANK_LABELS[card.rank]}</span>
                      <span className="text-xs sm:text-sm leading-none">{SUIT_SYMBOLS[card.suit]}</span>
                    </div>
                  );
                })
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Victory banner */}
      {isWon && (
        <div className="w-full mt-3 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center animate-in zoom-in-95 duration-200">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2 animate-bounce" />
          <h4 className="font-bold text-base text-emerald-900 dark:text-emerald-200 mb-1">
            FreeCell Solved! 🌟
          </h4>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 mb-3">
            Completed in <strong className="font-mono">{moves}</strong> moves and{' '}
            <strong className="font-mono">{formatTime(seconds)}</strong>!
          </p>
          <Button
            onClick={initGame}
            className="w-full h-10 font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RotateCcw className="w-4 h-4" />
            Play New FreeCell Deal
          </Button>
        </div>
      )}
    </div>
  );
}
