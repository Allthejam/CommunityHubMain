'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Trophy, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Color = 'red' | 'black';

interface Card {
  id: string;
  suit: Suit;
  rank: number; // 1 = Ace, 11 = J, 12 = Q, 13 = K
  color: Color;
  faceUp: boolean;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
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

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    const color: Color = suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        color,
        faceUp: false,
      });
    }
  }
  // Shuffle Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function SolitaireGame() {
  const [stock, setStock] = useState<Card[]>([]);
  const [waste, setWaste] = useState<Card[]>([]);
  const [foundations, setFoundations] = useState<Card[][]>([[], [], [], []]);
  const [tableau, setTableau] = useState<Card[][]>([[], [], [], [], [], [], []]);
  const [selectedCard, setSelectedCard] = useState<{ source: 'waste' | 'tableau'; col?: number; index?: number } | null>(null);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [bestTime, setBestTime] = useState<number | null>(null);

  // Load best time
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_solitaire_best');
      if (saved) setBestTime(parseInt(saved, 10));
    } catch (e) {}
  }, []);

  // Timer
  useEffect(() => {
    if (isWon || moves === 0) return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isWon, moves]);

  // Start new game
  const startNewGame = useCallback(() => {
    const deck = createDeck();
    const newTableau: Card[][] = [[], [], [], [], [], [], []];

    // Deal 1 to 7 cards into tableau
    for (let c = 0; c < 7; c++) {
      for (let r = 0; r <= c; r++) {
        const card = deck.pop()!;
        card.faceUp = r === c; // top card face up
        newTableau[c].push(card);
      }
    }

    setStock(deck);
    setWaste([]);
    setFoundations([[], [], [], []]);
    setTableau(newTableau);
    setSelectedCard(null);
    setMoves(0);
    setTimer(0);
    setIsWon(false);
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // Draw card from stock
  const drawCard = () => {
    if (stock.length === 0) {
      if (waste.length === 0) return;
      // Recycle waste back to stock
      const recycled = [...waste].reverse().map((c) => ({ ...c, faceUp: false }));
      setStock(recycled);
      setWaste([]);
      setMoves((m) => m + 1);
      return;
    }

    const nextStock = [...stock];
    const card = nextStock.pop()!;
    card.faceUp = true;
    setStock(nextStock);
    setWaste((w) => [...w, card]);
    setMoves((m) => m + 1);
    setSelectedCard(null);
  };

  // Check can place on Foundation
  const canPlaceOnFoundation = (card: Card, foundation: Card[]): boolean => {
    if (foundation.length === 0) return card.rank === 1; // Ace starts
    const top = foundation[foundation.length - 1];
    return top.suit === card.suit && card.rank === top.rank + 1;
  };

  // Check can place on Tableau
  const canPlaceOnTableau = (card: Card, column: Card[]): boolean => {
    if (column.length === 0) return card.rank === 13; // King starts empty column
    const top = column[column.length - 1];
    return top.color !== card.color && top.rank === card.rank + 1;
  };

  // Auto-move card to foundation on double click or tap
  const tryAutoMoveToFoundation = (card: Card, from: 'waste' | 'tableau', colIdx?: number): boolean => {
    for (let f = 0; f < 4; f++) {
      if (canPlaceOnFoundation(card, foundations[f])) {
        // Place on foundation f
        const nextFoundations = foundations.map((fPile, idx) =>
          idx === f ? [...fPile, card] : [...fPile]
        );
        setFoundations(nextFoundations);

        if (from === 'waste') {
          setWaste((w) => w.slice(0, -1));
        } else if (from === 'tableau' && colIdx !== undefined) {
          const nextTab = tableau.map((col, idx) => {
            if (idx !== colIdx) return [...col];
            const updated = col.slice(0, -1);
            if (updated.length > 0 && !updated[updated.length - 1].faceUp) {
              updated[updated.length - 1].faceUp = true;
            }
            return updated;
          });
          setTableau(nextTab);
        }

        setMoves((m) => m + 1);
        setSelectedCard(null);

        // Check win
        const totalFoundationCards = nextFoundations.reduce((sum, fPile) => sum + fPile.length, 0);
        if (totalFoundationCards === 52) {
          setIsWon(true);
          if (!bestTime || timer < bestTime) {
            setBestTime(timer);
            try {
              localStorage.setItem('timewaisters_solitaire_best', timer.toString());
            } catch (e) {}
          }
        }
        return true;
      }
    }
    return false;
  };

  // Handle click on Tableau Column
  const handleTableauClick = (colIdx: number) => {
    const col = tableau[colIdx];

    // If no card is selected, select the top card (or chain)
    if (!selectedCard) {
      if (col.length > 0) {
        const topCard = col[col.length - 1];
        if (!topCard.faceUp) {
          // Flip top card
          const nextTab = tableau.map((c, i) => {
            if (i !== colIdx) return [...c];
            const updated = [...c];
            updated[updated.length - 1].faceUp = true;
            return updated;
          });
          setTableau(nextTab);
          setMoves((m) => m + 1);
          return;
        }
        // Try quick auto move to foundation
        const moved = tryAutoMoveToFoundation(topCard, 'tableau', colIdx);
        if (!moved) {
          setSelectedCard({ source: 'tableau', col: colIdx, index: col.length - 1 });
        }
      }
      return;
    }

    // A card is already selected, try to move it to colIdx
    if (selectedCard.source === 'waste') {
      const movingCard = waste[waste.length - 1];
      if (canPlaceOnTableau(movingCard, col)) {
        setWaste((w) => w.slice(0, -1));
        setTableau((prev) =>
          prev.map((c, i) => (i === colIdx ? [...c, movingCard] : [...c]))
        );
        setMoves((m) => m + 1);
      }
      setSelectedCard(null);
    } else if (selectedCard.source === 'tableau' && selectedCard.col !== undefined && selectedCard.index !== undefined) {
      if (selectedCard.col === colIdx) {
        setSelectedCard(null);
        return;
      }

      const sourceCol = tableau[selectedCard.col];
      const movingCards = sourceCol.slice(selectedCard.index);
      const leadCard = movingCards[0];

      if (canPlaceOnTableau(leadCard, col)) {
        // Transfer cards
        const nextTableau = tableau.map((c, i) => {
          if (i === selectedCard.col) {
            const trimmed = c.slice(0, selectedCard.index);
            if (trimmed.length > 0 && !trimmed[trimmed.length - 1].faceUp) {
              trimmed[trimmed.length - 1].faceUp = true;
            }
            return trimmed;
          }
          if (i === colIdx) {
            return [...c, ...movingCards];
          }
          return [...c];
        });

        setTableau(nextTableau);
        setMoves((m) => m + 1);
      }
      setSelectedCard(null);
    }
  };

  // Handle click on Waste Pile
  const handleWasteClick = () => {
    if (waste.length === 0) return;
    const top = waste[waste.length - 1];
    const moved = tryAutoMoveToFoundation(top, 'waste');
    if (!moved) {
      setSelectedCard((prev) => (prev?.source === 'waste' ? null : { source: 'waste' }));
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center max-w-2xl mx-auto w-full gap-4 select-none">
      {/* Top Bar (Moves & Time) */}
      <div className="w-full flex items-center justify-between bg-card p-3 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-black text-primary">Klondike Solitaire</h2>
          <p className="text-[11px] text-muted-foreground">Tap cards to move or send to foundations.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-muted px-3 py-1 rounded-lg text-center">
            <span className="block text-[10px] uppercase font-bold text-muted-foreground">Moves</span>
            <span className="text-sm font-extrabold">{moves}</span>
          </div>

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

      {/* Solitaire Green Felt Mat */}
      <div className="bg-emerald-800 dark:bg-emerald-950 p-3 sm:p-4 rounded-3xl shadow-2xl border-4 border-emerald-900 w-full min-h-[460px] flex flex-col gap-4">
        {/* Top Row: Stock & Waste on Left, 4 Foundations on Right */}
        <div className="grid grid-cols-7 gap-2">
          {/* Stock Pile */}
          <div
            onClick={drawCard}
            className={cn(
              'aspect-[2.5/3.5] rounded-lg border-2 border-dashed border-emerald-600/60 flex items-center justify-center cursor-pointer font-bold transition-all duration-150',
              stock.length > 0 ? 'bg-blue-600 border-white text-white shadow-md hover:scale-105' : 'bg-emerald-900/40 text-emerald-300/60'
            )}
          >
            {stock.length > 0 ? (
              <span className="text-xs">🔄 {stock.length}</span>
            ) : (
              <span className="text-xs">♻️</span>
            )}
          </div>

          {/* Waste Pile */}
          <div
            onClick={handleWasteClick}
            className={cn(
              'aspect-[2.5/3.5] rounded-lg border-2 border-emerald-600/40 flex items-center justify-center cursor-pointer transition-all',
              waste.length > 0 ? 'bg-white shadow-md' : 'bg-emerald-900/30',
              selectedCard?.source === 'waste' && 'ring-4 ring-amber-400 scale-105'
            )}
          >
            {waste.length > 0 ? (
              <CardDisplay card={waste[waste.length - 1]} />
            ) : null}
          </div>

          {/* Blank Spacer */}
          <div className="aspect-[2.5/3.5]" />

          {/* 4 Foundations */}
          {foundations.map((fPile, fIdx) => (
            <div
              key={fIdx}
              className={cn(
                'aspect-[2.5/3.5] rounded-lg border-2 border-emerald-600/60 flex items-center justify-center font-bold text-lg',
                fPile.length > 0 ? 'bg-white shadow-md' : 'bg-emerald-900/40 text-emerald-500/50'
              )}
            >
              {fPile.length > 0 ? (
                <CardDisplay card={fPile[fPile.length - 1]} />
              ) : (
                SUIT_SYMBOLS[SUITS[fIdx]]
              )}
            </div>
          ))}
        </div>

        {/* Bottom Row: 7 Tableau Columns */}
        <div className="grid grid-cols-7 gap-2 flex-1 items-start">
          {tableau.map((col, colIdx) => {
            const isColSelected = selectedCard?.source === 'tableau' && selectedCard.col === colIdx;

            return (
              <div
                key={colIdx}
                onClick={() => handleTableauClick(colIdx)}
                className="flex flex-col relative min-h-[140px] rounded-lg border-2 border-dashed border-emerald-600/30 p-0.5 cursor-pointer"
              >
                {col.length === 0 ? (
                  <div className="h-14 rounded-md flex items-center justify-center text-xs text-emerald-500/40 font-bold">
                    K
                  </div>
                ) : (
                  col.map((card, cardIdx) => {
                    const isSelected = isColSelected && selectedCard?.index === cardIdx;
                    return (
                      <div
                        key={card.id}
                        className={cn(
                          'rounded-md shadow-xs transition-all duration-100',
                          cardIdx > 0 && '-mt-8 sm:-mt-9',
                          card.faceUp ? 'bg-white' : 'bg-blue-600 border border-blue-400',
                          isSelected && 'ring-4 ring-amber-400 scale-105 z-10'
                        )}
                      >
                        {card.faceUp ? (
                          <div className="aspect-[2.5/3.5] p-1 flex flex-col justify-between">
                            <CardDisplay card={card} />
                          </div>
                        ) : (
                          <div className="aspect-[2.5/3.5] flex items-center justify-center text-white/40 text-[10px]">
                            ♠
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Win Banner */}
      {isWon && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-400 p-4 rounded-xl text-center w-full max-w-md animate-in fade-in zoom-in">
          <Sparkles className="w-10 h-10 text-emerald-500 mx-auto mb-2 animate-bounce" />
          <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">Solitaire Completed! 🎉</h3>
          <p className="text-xs text-muted-foreground mt-1">Solved in {formatTime(timer)} with {moves} moves.</p>
          <Button size="sm" className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={startNewGame}>
            Play Again
          </Button>
        </div>
      )}
    </div>
  );
}

// Small Card Component Helper
function CardDisplay({ card }: { card: Card }) {
  const isRed = card.color === 'red';
  return (
    <div className={cn('w-full h-full flex flex-col justify-between p-1 leading-none font-bold select-none', isRed ? 'text-red-600' : 'text-slate-900')}>
      <div className="text-xs sm:text-sm flex items-center justify-between">
        <span>{RANK_LABELS[card.rank]}</span>
        <span className="text-[10px]">{SUIT_SYMBOLS[card.suit]}</span>
      </div>
      <div className="text-center text-base sm:text-xl">{SUIT_SYMBOLS[card.suit]}</div>
      <div className="text-xs sm:text-sm flex items-center justify-between rotate-180">
        <span>{RANK_LABELS[card.rank]}</span>
        <span className="text-[10px]">{SUIT_SYMBOLS[card.suit]}</span>
      </div>
    </div>
  );
}
