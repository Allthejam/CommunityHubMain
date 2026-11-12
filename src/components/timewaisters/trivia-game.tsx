'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Trophy,
  Flame,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Calendar,
  Shuffle,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Question {
  id: number;
  category: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const QUESTION_BANK: Question[] = [
  // Scottish & Local Culture
  {
    id: 1,
    category: 'Scottish & Local Culture',
    question: 'What is the official national animal of Scotland?',
    options: ['Red Deer', 'Golden Eagle', 'Unicorn', 'Highland Cow'],
    correct: 2,
    explanation: 'The unicorn has been a Scottish heraldic symbol since the 12th century, chosen for its proud and untameable spirit.',
  },
  {
    id: 2,
    category: 'Scottish & Local Culture',
    question: 'Which Scottish inventor developed the telephone in 1876?',
    options: ['James Watt', 'Alexander Graham Bell', 'John Logie Baird', 'Alexander Fleming'],
    correct: 1,
    explanation: 'Alexander Graham Bell was born in Edinburgh and patented the first practical telephone.',
  },
  {
    id: 3,
    category: 'Scottish & Local Culture',
    question: 'What traditional Scottish dish is made from oats boiled with water or milk and seasoned with salt?',
    options: ['Cullen Skink', 'Porridge', 'Haggis', 'Cranachan'],
    correct: 1,
    explanation: 'Porridge has been a staple breakfast in Scotland for centuries, traditionally stirred clockwise with a wooden spurtle.',
  },
  {
    id: 4,
    category: 'Scottish & Local Culture',
    question: 'What is the highest mountain peak in the British Isles, located in the Scottish Highlands?',
    options: ['Ben Nevis', 'Ben Macdui', 'Cairn Gorm', 'Schiehallion'],
    correct: 0,
    explanation: 'Ben Nevis stands at 1,345 metres (4,413 ft) above sea level at the western end of the Grampian Mountains.',
  },
  {
    id: 5,
    category: 'Scottish & Local Culture',
    question: 'Which Scottish poet is celebrated worldwide every year on January 25th with a supper?',
    options: ['Sir Walter Scott', 'Robert Louis Stevenson', 'Robert Burns', 'Hugh MacDiarmid'],
    correct: 2,
    explanation: 'Robert Burns (The Bard of Ayrshire) wrote Auld Lang Syne and is honoured on Burns Night.',
  },
  {
    id: 6,
    category: 'Scottish & Local Culture',
    question: 'What mythical water creature is said to inhabit Loch Ness in the Scottish Highlands?',
    options: ['Selkie', 'Kelpie', 'Nessie', 'Morag'],
    correct: 2,
    explanation: 'The Loch Ness Monster, affectionately known as Nessie, has been part of folklore since the 6th century.',
  },
  {
    id: 7,
    category: 'Scottish & Local Culture',
    question: 'Which Scottish city is nicknamed "The Granite City"?',
    options: ['Dundee', 'Glasgow', 'Aberdeen', 'Inverness'],
    correct: 2,
    explanation: 'Aberdeen is famed for its grey granite stone buildings that sparkle in sunlight after rain.',
  },

  // General Knowledge & History
  {
    id: 8,
    category: 'General Knowledge',
    question: 'What is the largest ocean on Earth?',
    options: ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean'],
    correct: 2,
    explanation: 'The Pacific Ocean covers over 63 million square miles, larger than all of Earth\'s land area combined.',
  },
  {
    id: 9,
    category: 'General Knowledge',
    question: 'Which country invented tea as a beverage around 2737 BC?',
    options: ['India', 'China', 'Japan', 'United Kingdom'],
    correct: 1,
    explanation: 'Legend has it that Chinese Emperor Shennong discovered tea when wild leaves blew into his pot of boiling water.',
  },
  {
    id: 10,
    category: 'General Knowledge',
    question: 'How many colours are there in a traditional rainbow?',
    options: ['6', '7', '8', '9'],
    correct: 1,
    explanation: 'Red, Orange, Yellow, Green, Blue, Indigo, and Violet (ROYGBIV) make 7 distinct colours.',
  },
  {
    id: 11,
    category: 'General Knowledge',
    question: 'What is the capital city of Australia?',
    options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
    correct: 2,
    explanation: 'Canberra was chosen as a compromise between Sydney and Melbourne in 1908.',
  },
  {
    id: 12,
    category: 'General Knowledge',
    question: 'What currency is used in Japan?',
    options: ['Won', 'Yuan', 'Yen', 'Ringgit'],
    correct: 2,
    explanation: 'The Japanese Yen (¥) is one of the most traded currencies in the world.',
  },

  // Science & Nature
  {
    id: 13,
    category: 'Science & Nature',
    question: 'What chemical element has the symbol "Fe" on the periodic table?',
    options: ['Fluorine', 'Iron', 'Francium', 'Lead'],
    correct: 1,
    explanation: 'Fe comes from "ferrum", the Latin word for iron.',
  },
  {
    id: 14,
    category: 'Science & Nature',
    question: 'What planet is known as the "Red Planet"?',
    options: ['Venus', 'Mars', 'Jupiter', 'Mercury'],
    correct: 1,
    explanation: 'Mars appears reddish because of widespread iron oxide (rust) covering its surface rocks and dust.',
  },
  {
    id: 15,
    category: 'Science & Nature',
    question: 'How many hearts does an octopus have?',
    options: ['1', '2', '3', '4'],
    correct: 2,
    explanation: 'An octopus has 3 hearts: two pump blood to the gills, while the third pumps it to the rest of the body.',
  },
  {
    id: 16,
    category: 'Science & Nature',
    question: 'What is the fastest land animal in the world?',
    options: ['Lion', 'Cheetah', 'Pronghorn Antelope', 'Greyhound'],
    correct: 1,
    explanation: 'Cheetahs can sprint at speeds up to 70 mph (112 km/h) in short bursts.',
  },
  {
    id: 17,
    category: 'Science & Nature',
    question: 'Which gas makes up about 78% of Earth\'s atmosphere?',
    options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Argon'],
    correct: 2,
    explanation: 'Earth\'s air is roughly 78% nitrogen, 21% oxygen, and 1% trace gases.',
  },

  // Film, TV & Entertainment
  {
    id: 18,
    category: 'Entertainment',
    question: 'Which Scottish actor played the first James Bond in 1962\'s "Dr. No"?',
    options: ['Sean Connery', 'Roger Moore', 'David Niven', 'Pierce Brosnan'],
    correct: 0,
    explanation: 'Sir Sean Connery, born in Fountainbridge, Edinburgh, set the definitive standard as Agent 007.',
  },
  {
    id: 19,
    category: 'Entertainment',
    question: 'In the movie "The Lion King", what kind of animal is Timon?',
    options: ['Warthog', 'Meerkat', 'Lemur', 'Baboon'],
    correct: 1,
    explanation: 'Timon is a meerkat, while his best buddy Pumbaa is a common warthog.',
  },
  {
    id: 20,
    category: 'Entertainment',
    question: 'Which English rock band recorded the famous album "Abbey Road" in 1969?',
    options: ['The Rolling Stones', 'The Who', 'The Beatles', 'Queen'],
    correct: 2,
    explanation: 'The Beatles created the iconic zebra-crossing album cover right outside London\'s Abbey Road Studios.',
  },
  {
    id: 21,
    category: 'Entertainment',
    question: 'Who wrote the Harry Potter fantasy book series in Edinburgh cafes?',
    options: ['J.R.R. Tolkien', 'J.K. Rowling', 'Roald Dahl', 'Philip Pullman'],
    correct: 1,
    explanation: 'J.K. Rowling penned much of the Philosopher\'s Stone in Edinburgh\'s Elephant House and Nicolson\'s Cafe.',
  },

  // Sports & Leisure
  {
    id: 22,
    category: 'Sport & Leisure',
    question: 'Which sport was invented in Scotland and played on the Old Course at St Andrews?',
    options: ['Curling', 'Golf', 'Rugby', 'Cricket'],
    correct: 1,
    explanation: 'The modern game of golf originated in 15th-century Scotland, and St Andrews is revered as the "Home of Golf".',
  },
  {
    id: 23,
    category: 'Sport & Leisure',
    question: 'What Olympic sport involves sliding heavy polished granite stones across ice towards a target?',
    options: ['Bobsleigh', 'Skeleton', 'Curling', 'Ice Hockey'],
    correct: 2,
    explanation: 'Curling was invented in medieval Scotland; its granite stones are still sourced from the Scottish island of Ailsa Craig.',
  },
  {
    id: 24,
    category: 'Sport & Leisure',
    question: 'How many players are on the pitch for one team in a standard association football match?',
    options: ['9', '10', '11', '12'],
    correct: 2,
    explanation: 'A team consists of 11 players, including one designated goalkeeper.',
  },
  {
    id: 25,
    category: 'Sport & Leisure',
    question: 'How many holes are played in a regulation round of golf?',
    options: ['9', '12', '18', '24'],
    correct: 2,
    explanation: 'In 1764, the Royal and Ancient Golf Club at St Andrews reduced their 22-hole course to 18, setting the world standard.',
  },
];

export function TriviaGame() {
  const [mode, setMode] = useState<'daily' | 'practice'>('daily');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Stats from localStorage
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    totalScore: 0,
    bestScore: 0,
    streak: 0,
    lastDailyDate: '',
  });

  // Load stats
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_trivia_stats');
      if (saved) {
        setStats(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Pick 5 questions deterministically for daily mode, or random 5 for practice
  const questions: Question[] = useMemo(() => {
    if (mode === 'daily') {
      // Simple pseudo-random hash from date string
      let hash = 0;
      for (let i = 0; i < todayStr.length; i++) {
        hash = (hash << 5) - hash + todayStr.charCodeAt(i);
        hash |= 0;
      }
      const shuffled = [...QUESTION_BANK].sort((a, b) => {
        const ha = Math.sin(hash + a.id) * 10000;
        const hb = Math.sin(hash + b.id) * 10000;
        return (ha - Math.floor(ha)) - (hb - Math.floor(hb));
      });
      return shuffled.slice(0, 5);
    } else {
      // Practice mode: shuffle randomly
      return [...QUESTION_BANK].sort(() => Math.random() - 0.5).slice(0, 5);
    }
  }, [mode, todayStr]);

  const currentQ = questions[currentIdx] || questions[0];

  const handleSelectOption = (idx: number) => {
    if (isAnswered || quizFinished) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.correct;
    const newScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(newScore);

    // If last question, finish
    if (currentIdx === questions.length - 1) {
      setTimeout(() => {
        setQuizFinished(true);
        saveFinishedStats(newScore);
      }, 1400);
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setQuizFinished(true);
      saveFinishedStats(score);
    }
  };

  const saveFinishedStats = (finalScore: number) => {
    setStats((prev) => {
      const newStreak = mode === 'daily' ? prev.streak + 1 : prev.streak;
      const updated = {
        gamesPlayed: prev.gamesPlayed + 1,
        totalScore: prev.totalScore + finalScore,
        bestScore: Math.max(prev.bestScore, finalScore),
        streak: newStreak,
        lastDailyDate: mode === 'daily' ? todayStr : prev.lastDailyDate,
      };
      try {
        localStorage.setItem('timewaisters_trivia_stats', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleRestart = (newMode: 'daily' | 'practice') => {
    setMode(newMode);
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setQuizFinished(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center">
      {/* Header bar / Mode selector */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={mode === 'daily' ? 'default' : 'outline'}
            onClick={() => handleRestart('daily')}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            Daily Quiz
          </Button>
          <Button
            size="sm"
            variant={mode === 'practice' ? 'default' : 'outline'}
            onClick={() => handleRestart('practice')}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Practice
          </Button>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full">
            <Flame className="w-3.5 h-3.5" />
            <span>Streak: {stats.streak}</span>
          </div>
          <div className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-full">
            <Trophy className="w-3.5 h-3.5" />
            <span>Best: {stats.bestScore}/5</span>
          </div>
        </div>
      </div>

      {/* Main Quiz Card */}
      {!quizFinished ? (
        <Card className="w-full shadow-md border-border/80 overflow-hidden">
          {/* Progress bar */}
          <div className="w-full bg-muted h-1.5">
            <div
              className="bg-primary h-1.5 transition-all duration-300"
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            />
          </div>

          <CardContent className="p-4 sm:p-6 flex flex-col gap-4">
            {/* Meta Row: Question counter & category */}
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs bg-muted/50 font-normal">
                Question {currentIdx + 1} of {questions.length}
              </Badge>
              <Badge variant="secondary" className="text-xs font-medium">
                {currentQ.category}
              </Badge>
            </div>

            {/* Question Text */}
            <div className="min-h-[64px] flex items-center">
              <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                {currentQ.question}
              </h3>
            </div>

            {/* Options List */}
            <div className="grid grid-cols-1 gap-2.5">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQ.correct;

                let btnStyle = 'border-border/80 hover:border-primary/50 hover:bg-muted/40';
                if (isAnswered) {
                  if (isCorrect) {
                    btnStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-medium';
                  } else {
                    btnStyle = 'opacity-40 border-border/40';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(idx)}
                    className={cn(
                      'w-full text-left p-3.5 rounded-xl border text-sm transition-all duration-150 flex items-center justify-between',
                      btnStyle
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full border border-border/60 bg-muted/30 flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </span>

                    {isAnswered && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    {isAnswered && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation reveal */}
            {isAnswered && (
              <div className="mt-2 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-start gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Did you know?</span>
                    <span>{currentQ.explanation}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Next question button */}
            {isAnswered && currentIdx < questions.length - 1 && (
              <Button
                onClick={handleNext}
                className="w-full mt-2 font-semibold gap-1.5 h-11"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Quiz Finished Screen */
        <Card className="w-full shadow-md border-border/80 text-center p-6 sm:p-8 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            {score >= 4 ? (
              <Trophy className="w-8 h-8 text-amber-500 animate-bounce" />
            ) : score >= 3 ? (
              <Sparkles className="w-8 h-8 text-primary" />
            ) : (
              <HelpCircle className="w-8 h-8 text-muted-foreground" />
            )}
          </div>

          <h3 className="text-xl sm:text-2xl font-black mb-1">
            {score === 5 ? 'Perfect 5/5! 🌟' : score >= 3 ? 'Well Done! 👏' : 'Good Effort! 📚'}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            You scored <strong className="text-foreground">{score}</strong> out of{' '}
            <strong className="text-foreground">{questions.length}</strong> in{' '}
            {mode === 'daily' ? "today's Daily Quiz" : 'Practice Quiz'}.
          </p>

          {/* Quick stats grid */}
          <div className="grid grid-cols-3 gap-2.5 mb-6 max-w-sm mx-auto">
            <div className="p-3 rounded-xl bg-muted/50 border border-border/60">
              <span className="text-xs text-muted-foreground block">Correct</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {score} / 5
              </span>
            </div>
            <div className="p-3 rounded-xl bg-muted/50 border border-border/60">
              <span className="text-xs text-muted-foreground block">Streak</span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {stats.streak} 🔥
              </span>
            </div>
            <div className="p-3 rounded-xl bg-muted/50 border border-border/60">
              <span className="text-xs text-muted-foreground block">Best</span>
              <span className="text-lg font-bold text-primary">{stats.bestScore} / 5</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 justify-center max-w-xs mx-auto">
            <Button
              onClick={() => handleRestart('practice')}
              className="gap-2 font-semibold"
            >
              <RotateCcw className="w-4 h-4" />
              Play Another Quiz
            </Button>
            <Button
              variant="outline"
              onClick={() => handleRestart('daily')}
              className="gap-2"
            >
              <Calendar className="w-4 h-4" />
              Review Daily Quiz
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
