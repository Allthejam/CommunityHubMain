'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Heart,
  Sparkles,
  Trophy,
  Flame,
  RotateCcw,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WordPuzzle {
  word: string;
  category: string;
  hint: string;
}

const PUZZLES: WordPuzzle[] = [
  // Castles & Landmarks
  { word: 'EDINBURGH', category: 'Castles & Landmarks', hint: 'The historic capital city famous for its hilltop fortress.' },
  { word: 'STIRLING', category: 'Castles & Landmarks', hint: 'Key battleground castle overlooking the National Wallace Monument.' },
  { word: 'BALMORAL', category: 'Castles & Landmarks', hint: 'Royal estate situated in Royal Deeside, Aberdeenshire.' },
  { word: 'GLAMIS', category: 'Castles & Landmarks', hint: 'Childhood home of the Queen Mother in the Strathmore valley.' },
  { word: 'CULZEAN', category: 'Castles & Landmarks', hint: 'Dramatic cliff-top castle designed by Robert Adam in Ayrshire.' },
  { word: 'BEN NEVIS', category: 'Castles & Landmarks', hint: 'Highest mountain peak in the entire British Isles.' },

  // Town High Street
  { word: 'BAKERY', category: 'High Street Shops', hint: 'Fresh morning rolls, pies, cakes, and loaves.' },
  { word: 'BUTCHER', category: 'High Street Shops', hint: 'Where you find quality steaks, sausages, and fresh mince.' },
  { word: 'FLORIST', category: 'High Street Shops', hint: 'Bouquets, fresh flowers, and celebration wreaths.' },
  { word: 'PHARMACY', category: 'High Street Shops', hint: 'Healthcare advice, prescriptions, and remedies.' },
  { word: 'LIBRARY', category: 'High Street Shops', hint: 'Books, quiet study corners, community groups, and newspapers.' },
  { word: 'POST OFFICE', category: 'High Street Shops', hint: 'Parcels, stamps, banking, and travel currency.' },

  // Wildlife & Nature
  { word: 'HIGHLAND COW', category: 'Scottish Wildlife', hint: 'Hardy cattle with long horns and a woolly red coat ("Heilan Coo").' },
  { word: 'GOLDEN EAGLE', category: 'Scottish Wildlife', hint: 'Regal bird of prey soaring high across remote mountain glens.' },
  { word: 'RED DEER', category: 'Scottish Wildlife', hint: 'Largest native land mammal in Britain with impressive antlers.' },
  { word: 'PUFFIN', category: 'Scottish Wildlife', hint: 'Cute seabird with a brightly coloured orange and yellow beak.' },
  { word: 'RED SQUIRREL', category: 'Scottish Wildlife', hint: 'Native bushy-tailed woodland mammal protected in pine forests.' },
  { word: 'OTTER', category: 'Scottish Wildlife', hint: 'Playful semi-aquatic swimmer found along coastal sea lochs.' },

  // Scottish Food & Treats
  { word: 'SHORTBREAD', category: 'Traditional Treats', hint: 'Rich, crumbly biscuit made with butter, sugar, and flour.' },
  { word: 'CRANACHAN', category: 'Traditional Treats', hint: 'Dessert of whipped cream, whisky, honey, toasted oats, and raspberries.' },
  { word: 'TABLET', category: 'Traditional Treats', hint: 'Medium-hard crystalline sugary confection with condensed milk.' },
  { word: 'SCONES', category: 'Traditional Treats', hint: 'Baked quick-bread traditionally served warm with butter and jam.' },
  { word: 'CULLEN SKINK', category: 'Traditional Treats', hint: 'Thick soup made of smoked haddock, potatoes, and onions.' },
];

const MAX_MISTAKES = 6;
const BALLOON_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#10b981', // Green
  '#06b6d4', // Cyan
  '#8b5cf6', // Purple
];

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export function WordRescueGame() {
  const [puzzle, setPuzzle] = useState<WordPuzzle>(() => PUZZLES[0]);
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [showHint, setShowHint] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    played: 0,
    wins: 0,
    streak: 0,
    bestStreak: 0,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_wordrescue_stats');
      if (saved) setStats(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  // Pick random puzzle
  const pickNewPuzzle = useCallback(() => {
    const random = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
    setPuzzle(random);
    setGuessedLetters(new Set());
    setShowHint(false);
  }, []);

  useEffect(() => {
    pickNewPuzzle();
  }, [pickNewPuzzle]);

  const mistakes = useMemo(() => {
    let count = 0;
    guessedLetters.forEach((letter) => {
      if (!puzzle.word.includes(letter)) {
        count++;
      }
    });
    return count;
  }, [guessedLetters, puzzle.word]);

  const balloonsRemaining = MAX_MISTAKES - mistakes;

  // Check if player won
  const isWon = useMemo(() => {
    if (!puzzle.word) return false;
    for (const char of puzzle.word) {
      if (char !== ' ' && !guessedLetters.has(char)) {
        return false;
      }
    }
    return true;
  }, [puzzle.word, guessedLetters]);

  const isLost = mistakes >= MAX_MISTAKES;
  const isGameOver = isWon || isLost;

  // Handle letter guess
  const guessLetter = (letter: string) => {
    if (isGameOver || guessedLetters.has(letter)) return;
    const nextGuessed = new Set(guessedLetters);
    nextGuessed.add(letter);
    setGuessedLetters(nextGuessed);

    // If game completes with this move
    const isCorrect = puzzle.word.includes(letter);
    const nextMistakes = isCorrect ? mistakes : mistakes + 1;

    let won = true;
    for (const ch of puzzle.word) {
      if (ch !== ' ' && !nextGuessed.has(ch)) {
        won = false;
        break;
      }
    }

    if (won) {
      saveStats(true);
    } else if (nextMistakes >= MAX_MISTAKES) {
      saveStats(false);
    }
  };

  const saveStats = (won: boolean) => {
    setStats((prev) => {
      const newStreak = won ? prev.streak + 1 : 0;
      const updated = {
        played: prev.played + 1,
        wins: won ? prev.wins + 1 : prev.wins,
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
      };
      try {
        localStorage.setItem('timewaisters_wordrescue_stats', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <Badge variant="outline" className="text-xs bg-muted/50 font-normal">
          {puzzle.category}
        </Badge>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full">
            <Flame className="w-3.5 h-3.5" />
            <span>Streak: {stats.streak}</span>
          </div>
          <div className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-full">
            <Trophy className="w-3.5 h-3.5" />
            <span>Best: {stats.bestStreak}</span>
          </div>
        </div>
      </div>

      {/* Main Mascot & Balloon Display */}
      <Card className="w-full shadow-md border-border/80 overflow-hidden mb-4">
        <CardContent className="p-4 flex flex-col items-center">
          {/* Balloons visual */}
          <div className="w-full flex items-center justify-center gap-2 mb-2 py-3 min-h-[70px]">
            {Array.from({ length: MAX_MISTAKES }).map((_, i) => {
              const popped = i < mistakes;
              const color = BALLOON_COLORS[i % BALLOON_COLORS.length];
              return (
                <div
                  key={i}
                  className="flex flex-col items-center transition-all duration-300"
                >
                  <div
                    className={cn(
                      'w-7 h-9 rounded-[50%_50%_50%_50%_/_60%_60%_40%_40%] shadow-sm transition-all duration-300 flex items-center justify-center text-[10px]',
                      popped ? 'scale-0 opacity-0' : 'scale-100 opacity-100 hover:scale-110'
                    )}
                    style={{ backgroundColor: color }}
                  >
                    <span className="text-white/80 font-bold">🎈</span>
                  </div>
                  {/* Balloon string */}
                  <div
                    className={cn(
                      'w-px h-4 bg-muted-foreground/40 transition-all duration-200',
                      popped && 'opacity-0'
                    )}
                  />
                </div>
              );
            })}
          </div>

          {/* Mascot Status */}
          <div className="text-center mb-3">
            <span className="text-2xl animate-bounce">
              {isWon ? '🎉 🐶 🌟' : isLost ? '🪂 🐶 (Safe Landing!)' : '🐶 🎈'}
            </span>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {isWon
                ? 'Rescue Complete! Mascot is celebrating!'
                : isLost
                ? 'Out of balloons! The mascot parachuted down safely.'
                : `${balloonsRemaining} balloons holding the mascot aloft!`}
            </p>
          </div>

          {/* Word display slots */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-4">
            {puzzle.word.split('').map((char, idx) => {
              if (char === ' ') {
                return <div key={idx} className="w-3 sm:w-4" />;
              }
              const isRevealed = guessedLetters.has(char) || isGameOver;
              return (
                <div
                  key={idx}
                  className={cn(
                    'w-8 h-10 sm:w-9 sm:h-11 rounded-lg border-2 flex items-center justify-center text-base sm:text-lg font-black transition-all',
                    isRevealed
                      ? guessedLetters.has(char)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-rose-500 bg-rose-500/10 text-rose-500'
                      : 'border-muted-foreground/30 bg-muted/20'
                  )}
                >
                  {isRevealed ? char : ''}
                </div>
              );
            })}
          </div>

          {/* Hint disclosure */}
          <div className="w-full flex flex-col items-center">
            {!showHint && !isGameOver ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHint(true)}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                Need a clue?
              </Button>
            ) : (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 text-center w-full">
                💡 <strong>Clue:</strong> {puzzle.hint}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* On-screen Alphabet Keyboard */}
      {!isGameOver ? (
        <div className="w-full flex flex-col gap-1.5 px-1">
          {KEYBOARD_ROWS.map((row, rIdx) => (
            <div key={rIdx} className="flex justify-center gap-1">
              {row.map((letter) => {
                const isGuessed = guessedLetters.has(letter);
                const isCorrect = isGuessed && puzzle.word.includes(letter);
                const isWrong = isGuessed && !puzzle.word.includes(letter);

                return (
                  <button
                    key={letter}
                    disabled={isGuessed}
                    onClick={() => guessLetter(letter)}
                    className={cn(
                      'h-10 px-2 sm:px-2.5 rounded-md font-bold text-xs sm:text-sm border transition-all active:scale-95',
                      isCorrect
                        ? 'bg-emerald-500 text-white border-emerald-600 opacity-60'
                        : isWrong
                        ? 'bg-muted/40 text-muted-foreground/40 border-transparent opacity-40 line-through'
                        : 'bg-card text-card-foreground border-border/80 hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        /* Game Over / Win Banner */
        <div className="w-full flex flex-col items-center gap-3 animate-in zoom-in-95 duration-200">
          <div
            className={cn(
              'w-full p-4 rounded-xl border text-center',
              isWon
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-900 dark:text-rose-200'
            )}
          >
            <h4 className="font-bold text-base mb-1">
              {isWon ? 'You Saved the Mascot! 🎉' : 'Balloons Popped! 🪂'}
            </h4>
            <p className="text-xs">
              The secret word was <strong className="underline">{puzzle.word}</strong>.
            </p>
          </div>

          <Button
            onClick={pickNewPuzzle}
            className="w-full h-11 font-semibold gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Play Next Word Rescue
          </Button>
        </div>
      )}
    </div>
  );
}
