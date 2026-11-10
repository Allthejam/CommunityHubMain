'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Trophy, Delete, CheckCircle2, XCircle, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const WORD_LIST = [
  'SPEYS', 'RIVER', 'HIGHS', 'SCOTS', 'LOCAL', 'TOWNS', 'PARKS', 'TRAIL', 'HILLS', 'GLENS',
  'TREES', 'LOCHS', 'STONE', 'CABIN', 'FERRY', 'NORTH', 'SOUTH', 'BEACH', 'CLIFF', 'CLOUD',
  'SHEEP', 'CROFT', 'FARMS', 'SHOPS', 'STARS', 'SUNNY', 'STORM', 'GREEN', 'WATER', 'ROADS',
  'HOMES', 'PEAKS', 'HEATH', 'ROBIN', 'APPLE', 'BREAD', 'MUSIC', 'STORY', 'DREAM', 'SMILE',
  'HAPPY', 'LIGHT', 'HEART', 'PLANT', 'RIDGE', 'BROOK', 'VALES', 'SHIRE', 'CASTL', 'FORTH',
];

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

type LetterState = 'correct' | 'present' | 'absent' | 'empty';

export function WordGuessGame() {
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [stats, setStats] = useState({ played: 0, won: 0, streak: 0, maxStreak: 0 });
  const [message, setMessage] = useState<string | null>(null);

  // Load stats
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_wordle_stats');
      if (saved) setStats(JSON.parse(saved));
    } catch (e) {}
  }, []);

  // Pick new word
  const startNewGame = useCallback(() => {
    const random = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    setTargetWord(random);
    setGuesses([]);
    setCurrentGuess('');
    setIsGameOver(false);
    setIsWon(false);
    setMessage(null);
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // Flash temporary message
  const flashMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2000);
  };

  // Submit current guess
  const submitGuess = useCallback(() => {
    if (currentGuess.length !== WORD_LENGTH) {
      flashMessage('Not enough letters');
      return;
    }

    const nextGuesses = [...guesses, currentGuess];
    setGuesses(nextGuesses);
    setCurrentGuess('');

    if (currentGuess === targetWord) {
      setIsWon(true);
      setIsGameOver(true);
      setStats((prev) => {
        const next = {
          played: prev.played + 1,
          won: prev.won + 1,
          streak: prev.streak + 1,
          maxStreak: Math.max(prev.maxStreak, prev.streak + 1),
        };
        try {
          localStorage.setItem('timewaisters_wordle_stats', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    } else if (nextGuesses.length >= MAX_GUESSES) {
      setIsGameOver(true);
      setStats((prev) => {
        const next = {
          ...prev,
          played: prev.played + 1,
          streak: 0,
        };
        try {
          localStorage.setItem('timewaisters_wordle_stats', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    }
  }, [currentGuess, guesses, targetWord]);

  // Handle on-screen key click
  const handleKeyClick = useCallback(
    (key: string) => {
      if (isGameOver) return;
      if (key === 'ENTER') {
        submitGuess();
      } else if (key === 'BACKSPACE') {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (currentGuess.length < WORD_LENGTH && /^[A-Z]$/.test(key)) {
        setCurrentGuess((prev) => prev + key);
      }
    },
    [isGameOver, currentGuess, submitGuess]
  );

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;
      const key = e.key.toUpperCase();
      if (key === 'ENTER') {
        submitGuess();
      } else if (key === 'BACKSPACE') {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
        setCurrentGuess((prev) => prev + key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameOver, currentGuess, submitGuess]);

  // Get letter evaluation state
  const getLetterState = (guess: string, index: number): LetterState => {
    const char = guess[index];
    if (targetWord[index] === char) return 'correct';
    if (targetWord.includes(char)) return 'present';
    return 'absent';
  };

  // Keyboard letter color map
  const keyboardState = React.useMemo(() => {
    const map: Record<string, LetterState> = {};
    for (const g of guesses) {
      for (let i = 0; i < g.length; i++) {
        const char = g[i];
        const state = getLetterState(g, i);
        if (state === 'correct') {
          map[char] = 'correct';
        } else if (state === 'present' && map[char] !== 'correct') {
          map[char] = 'present';
        } else if (state === 'absent' && !map[char]) {
          map[char] = 'absent';
        }
      }
    }
    return map;
  }, [guesses, targetWord]);

  const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
  ];

  return (
    <div className="flex flex-col items-center justify-center max-w-xl mx-auto w-full gap-4 select-none">
      {/* Top Bar Stats */}
      <div className="w-full flex items-center justify-between bg-card p-3 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-black text-primary">Town Word Guess</h2>
          <p className="text-[11px] text-muted-foreground">Guess the 5-letter word in 6 tries.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-bold text-orange-500">
            <Flame className="w-4 h-4" /> Streak: {stats.streak}
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
            <Trophy className="w-4 h-4 text-amber-500" /> Won: {stats.won}/{stats.played}
          </div>
          <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={startNewGame}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Floating Notice / Error */}
      {message && (
        <div className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow animate-bounce">
          {message}
        </div>
      )}

      {/* 6x5 Wordle Guess Grid */}
      <div className="flex flex-col gap-1.5 w-full max-w-[320px]">
        {Array.from({ length: MAX_GUESSES }).map((_, rowIdx) => {
          const guess = guesses[rowIdx];
          const isCurrentRow = rowIdx === guesses.length;

          return (
            <div key={rowIdx} className="grid grid-cols-5 gap-1.5 h-12 sm:h-14">
              {Array.from({ length: WORD_LENGTH }).map((_, colIdx) => {
                let char = '';
                let state: LetterState = 'empty';

                if (guess) {
                  char = guess[colIdx] || '';
                  state = getLetterState(guess, colIdx);
                } else if (isCurrentRow) {
                  char = currentGuess[colIdx] || '';
                }

                return (
                  <div
                    key={colIdx}
                    className={cn(
                      'flex items-center justify-center font-black text-xl sm:text-2xl rounded-lg uppercase border-2 transition-all duration-200',
                      state === 'empty' && char && 'border-slate-400 dark:border-slate-500 scale-105',
                      state === 'empty' && !char && 'border-slate-200 dark:border-slate-800 bg-background',
                      state === 'correct' && 'bg-emerald-500 border-emerald-600 text-white shadow-sm',
                      state === 'present' && 'bg-amber-400 border-amber-500 text-slate-950 shadow-sm',
                      state === 'absent' && 'bg-slate-300 dark:bg-slate-800 border-slate-400 dark:border-slate-750 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    {char}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Win / Loss Banner */}
      {isGameOver && (
        <div
          className={cn(
            'p-4 rounded-xl border text-center w-full max-w-[320px] animate-in fade-in zoom-in',
            isWon
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-900 dark:text-emerald-100'
              : 'bg-red-50 dark:bg-red-950/50 border-red-300 text-red-900 dark:text-red-100'
          )}
        >
          <div className="flex items-center justify-center gap-1.5 font-black text-base mb-1">
            {isWon ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
            {isWon ? 'Splendid! You guessed it!' : `The word was: ${targetWord}`}
          </div>
          <p className="text-xs opacity-80 mb-2">Solved in {guesses.length} of {MAX_GUESSES} attempts.</p>
          <Button size="sm" className="font-bold" onClick={startNewGame}>
            Play Next Word
          </Button>
        </div>
      )}

      {/* Touch Keyboard */}
      <div className="flex flex-col gap-1.5 w-full max-w-[480px] mt-1">
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex justify-center gap-1 w-full">
            {row.map((key) => {
              const state = keyboardState[key];
              const isActionKey = key === 'ENTER' || key === 'BACKSPACE';

              return (
                <button
                  key={key}
                  onClick={() => handleKeyClick(key)}
                  className={cn(
                    'h-11 sm:h-12 rounded-md font-bold text-xs sm:text-sm flex items-center justify-center transition-colors active:scale-95 shadow-sm',
                    isActionKey ? 'px-2 sm:px-3 text-[11px] bg-slate-300 dark:bg-slate-700' : 'flex-1 bg-slate-200 dark:bg-slate-800 text-foreground',
                    state === 'correct' && 'bg-emerald-500 text-white font-black',
                    state === 'present' && 'bg-amber-400 text-slate-950 font-black',
                    state === 'absent' && 'bg-slate-400/50 dark:bg-slate-900/60 opacity-60 text-muted-foreground'
                  )}
                >
                  {key === 'BACKSPACE' ? <Delete className="w-4 h-4" /> : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
