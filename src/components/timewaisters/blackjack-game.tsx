'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  RotateCcw,
  Sparkles,
  Trophy,
  Coins,
  Shield,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

interface CardDef {
  id: string;
  suit: Suit;
  rank: number; // 1 = Ace, 2-10, 11=J, 12=Q, 13=K
  color: 'red' | 'black';
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

export function BlackjackGame() {
  const [bankroll, setBankroll] = useState(500);
  const [bet, setBet] = useState(25);
  const [gameState, setGameState] = useState<'betting' | 'player_turn' | 'dealer_turn' | 'gameover'>('betting');

  const [deck, setDeck] = useState<CardDef[]>([]);
  const [playerHand, setPlayerHand] = useState<CardDef[]>([]);
  const [dealerHand, setDealerHand] = useState<CardDef[]>([]);
  const [message, setMessage] = useState('Place your bet and tap Deal Cards!');
  const [result, setResult] = useState<'win' | 'lose' | 'push' | 'blackjack' | null>(null);

  // Load bankroll
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_blackjack_bankroll');
      if (saved) setBankroll(parseInt(saved, 10));
    } catch {
      // ignore
    }
  }, []);

  const saveBankroll = (val: number) => {
    setBankroll(val);
    try {
      localStorage.setItem('timewaisters_blackjack_bankroll', val.toString());
    } catch {
      // ignore
    }
  };

  // Build deck
  const createFreshDeck = (): CardDef[] => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const cards: CardDef[] = [];
    suits.forEach((suit) => {
      for (let rank = 1; rank <= 13; rank++) {
        cards.push({
          id: `${suit}-${rank}-${Math.random()}`,
          suit,
          rank,
          color: suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black',
        });
      }
    });
    // Shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  };

  // Calculate hand score with Ace flexibility (1 or 11)
  const calculateScore = (hand: CardDef[]): number => {
    let sum = 0;
    let aces = 0;

    hand.forEach((c) => {
      if (c.rank === 1) {
        aces += 1;
        sum += 11;
      } else if (c.rank >= 10) {
        sum += 10;
      } else {
        sum += c.rank;
      }
    });

    while (sum > 21 && aces > 0) {
      sum -= 10;
      aces -= 1;
    }

    return sum;
  };

  const playerScore = useMemo(() => calculateScore(playerHand), [playerHand]);
  const dealerScore = useMemo(
    () => (gameState === 'betting' || gameState === 'player_turn' ? calculateScore(dealerHand.slice(0, 1)) : calculateScore(dealerHand)),
    [dealerHand, gameState]
  );
  const fullDealerScore = useMemo(() => calculateScore(dealerHand), [dealerHand]);

  // Deal
  const handleDeal = () => {
    if (bet > bankroll) {
      setMessage('Insufficient funds! Lower your bet.');
      return;
    }

    const currentDeck = createFreshDeck();
    const p1 = currentDeck.pop()!;
    const d1 = currentDeck.pop()!;
    const p2 = currentDeck.pop()!;
    const d2 = currentDeck.pop()!;

    const initialPlayer = [p1, p2];
    const initialDealer = [d1, d2];

    setDeck(currentDeck);
    setPlayerHand(initialPlayer);
    setDealerHand(initialDealer);
    setResult(null);

    const pScore = calculateScore(initialPlayer);
    const dScore = calculateScore(initialDealer);

    // Check immediate Blackjacks
    if (pScore === 21 && dScore === 21) {
      setGameState('gameover');
      setResult('push');
      setMessage('Push! Both you and Dealer dealt Blackjack! 🤝');
    } else if (pScore === 21) {
      setGameState('gameover');
      setResult('blackjack');
      const winAmt = Math.floor(bet * 1.5);
      saveBankroll(bankroll + winAmt);
      setMessage(`BLACKJACK! You win $${winAmt}! 🌟`);
    } else {
      setGameState('player_turn');
      setMessage('Hit, Stand, or Double Down?');
    }
  };

  // Player Hit
  const handleHit = () => {
    if (gameState !== 'player_turn') return;
    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const nextPlayerHand = [...playerHand, card];

    setDeck(newDeck);
    setPlayerHand(nextPlayerHand);

    const score = calculateScore(nextPlayerHand);
    if (score > 21) {
      // Bust
      setGameState('gameover');
      setResult('lose');
      saveBankroll(bankroll - bet);
      setMessage(`Bust with ${score}! You lose $${bet}. 💥`);
    } else if (score === 21) {
      // Auto stand on 21
      handleStand(nextPlayerHand, newDeck);
    }
  };

  // Player Double Down
  const handleDoubleDown = () => {
    if (gameState !== 'player_turn' || playerHand.length !== 2) return;
    if (bet * 2 > bankroll) {
      setMessage('Not enough chips to double down!');
      return;
    }

    const doubleBet = bet * 2;
    setBet(doubleBet);

    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const nextPlayerHand = [...playerHand, card];

    setDeck(newDeck);
    setPlayerHand(nextPlayerHand);

    const score = calculateScore(nextPlayerHand);
    if (score > 21) {
      setGameState('gameover');
      setResult('lose');
      saveBankroll(bankroll - doubleBet);
      setMessage(`Bust with ${score}! You lose $${doubleBet}. 💥`);
    } else {
      handleStand(nextPlayerHand, newDeck, doubleBet);
    }
  };

  // Player Stand -> Dealer Turn
  const handleStand = (
    finalPlayerHand = playerHand,
    currentDeck = deck,
    activeBet = bet
  ) => {
    setGameState('dealer_turn');
    let nextDealerHand = [...dealerHand];
    let workingDeck = [...currentDeck];

    // Dealer hits until 17 or more
    let dScore = calculateScore(nextDealerHand);
    while (dScore < 17) {
      const card = workingDeck.pop()!;
      nextDealerHand.push(card);
      dScore = calculateScore(nextDealerHand);
    }

    setDealerHand(nextDealerHand);
    setDeck(workingDeck);
    setGameState('gameover');

    const pScore = calculateScore(finalPlayerHand);

    if (dScore > 21) {
      setResult('win');
      saveBankroll(bankroll + activeBet);
      setMessage(`Dealer busts with ${dScore}! You win $${activeBet}! 🎉`);
    } else if (pScore > dScore) {
      setResult('win');
      saveBankroll(bankroll + activeBet);
      setMessage(`You win $${activeBet}! (${pScore} vs Dealer ${dScore}) 🏆`);
    } else if (pScore < dScore) {
      setResult('lose');
      saveBankroll(bankroll - activeBet);
      setMessage(`Dealer wins with ${dScore} vs your ${pScore}. 💀`);
    } else {
      setResult('push');
      setMessage(`Push! Tied at ${pScore}. Bets returned. 🤝`);
    }
  };

  const handleResetBankroll = () => {
    saveBankroll(500);
    setBet(25);
    setGameState('betting');
    setMessage('Bankroll topped back up to $500!');
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      {/* Top Bankroll Bar */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">
          <Coins className="w-4 h-4" />
          <span>Bankroll: ${bankroll}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {bankroll < 10 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetBankroll}
              className="h-7 text-xs font-semibold"
            >
              Reload $500
            </Button>
          )}
          <Badge variant="outline" className="font-mono text-xs">
            Bet: ${bet}
          </Badge>
        </div>
      </div>

      {/* Message Feed Pill */}
      <div className="w-full mb-3 p-2.5 rounded-xl bg-muted/60 border border-border/80 text-xs font-medium text-center min-h-[40px] flex items-center justify-center">
        <span
          className={cn(
            result === 'win' || result === 'blackjack'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : result === 'lose'
              ? 'text-rose-600 dark:text-rose-400 font-bold'
              : 'text-foreground'
          )}
        >
          {message}
        </span>
      </div>

      {/* Green Felt Casino Table Card */}
      <Card className="w-full p-4 shadow-lg border-2 border-emerald-900 rounded-2xl bg-emerald-800 text-white flex flex-col gap-4">
        {/* Dealer Hand */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-emerald-200 mb-1.5">
            <span>DEALER</span>
            <span>
              {gameState === 'betting' || gameState === 'player_turn' ? `Shows: ${dealerScore}` : `Total: ${fullDealerScore}`}
            </span>
          </div>
          <div className="flex items-center gap-2 min-h-[72px]">
            {dealerHand.map((card, idx) => {
              const isHoleCard = idx === 1 && (gameState === 'betting' || gameState === 'player_turn');
              return (
                <div
                  key={card.id}
                  className={cn(
                    'w-12 h-17 sm:w-14 sm:h-20 rounded-md border shadow-md flex flex-col items-center justify-center font-bold text-xs select-none transition-all',
                    isHoleCard
                      ? 'bg-blue-900 border-blue-400 text-blue-200'
                      : card.color === 'red'
                      ? 'bg-white text-rose-600 border-rose-300'
                      : 'bg-white text-slate-900 border-slate-300'
                  )}
                >
                  {isHoleCard ? (
                    <span className="text-base">🂠</span>
                  ) : (
                    <>
                      <span className="text-xs sm:text-sm leading-none">{RANK_LABELS[card.rank]}</span>
                      <span className="text-sm sm:text-base leading-none">{SUIT_SYMBOLS[card.suit]}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-emerald-700/60 my-1" />

        {/* Player Hand */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-emerald-200 mb-1.5">
            <span>YOUR HAND</span>
            <span>{playerHand.length > 0 ? `Total: ${playerScore}` : ''}</span>
          </div>
          <div className="flex items-center gap-2 min-h-[72px]">
            {playerHand.map((card) => (
              <div
                key={card.id}
                className={cn(
                  'w-12 h-17 sm:w-14 sm:h-20 rounded-md border shadow-md flex flex-col items-center justify-center font-bold text-xs select-none transition-all',
                  card.color === 'red'
                    ? 'bg-white text-rose-600 border-rose-300'
                    : 'bg-white text-slate-900 border-slate-300'
                )}
              >
                <span className="text-xs sm:text-sm leading-none">{RANK_LABELS[card.rank]}</span>
                <span className="text-sm sm:text-base leading-none">{SUIT_SYMBOLS[card.suit]}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Action Controls */}
      <div className="w-full mt-4 flex flex-col gap-2.5">
        {gameState === 'player_turn' ? (
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={handleHit}
              className="h-11 font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
            >
              HIT
            </Button>
            <Button
              onClick={() => handleStand()}
              className="h-11 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              STAND
            </Button>
            <Button
              variant="outline"
              disabled={playerHand.length !== 2 || bet * 2 > bankroll}
              onClick={handleDoubleDown}
              className="h-11 font-bold text-xs"
            >
              DOUBLE (2x)
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {/* Bet Chip selector */}
            <div className="flex items-center justify-center gap-2">
              {[10, 25, 50, 100].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBet(amt)}
                  className={cn(
                    'w-11 h-11 rounded-full border-2 font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center',
                    bet === amt
                      ? 'border-amber-400 bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                      : 'border-border/80 bg-card hover:bg-muted/50 text-foreground'
                  )}
                >
                  ${amt}
                </button>
              ))}
            </div>

            <Button
              onClick={handleDeal}
              className="w-full h-11 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              DEAL CARDS (${bet})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
