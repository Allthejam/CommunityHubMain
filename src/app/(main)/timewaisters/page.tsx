'use client';

import React, { useState } from 'react';
import {
  Gamepad2,
  Trophy,
  Sparkles,
  ArrowLeft,
  Flame,
  Clock,
  Bot,
  Brain,
  Hash,
  Bomb,
  Layers,
  Compass,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveCommunityId } from '@/hooks/use-active-community-id';
import { cn } from '@/lib/utils';

// Game Components
import { SudokuGame } from '@/components/timewaisters/sudoku-game';
import { ConnectFourGame } from '@/components/timewaisters/connect-four-game';
import { Game2048 } from '@/components/timewaisters/game-2048';
import { WordGuessGame } from '@/components/timewaisters/word-guess-game';
import { SnakeGame } from '@/components/timewaisters/snake-game';
import { MinesweeperGame } from '@/components/timewaisters/minesweeper-game';

type GameId = 'sudoku' | 'connect4' | '2048' | 'wordle' | 'snake' | 'minesweeper';

interface GameMeta {
  id: GameId;
  title: string;
  tagline: string;
  category: 'brain' | 'classic' | 'arcade';
  badge: string;
  icon: any;
  color: string;
  timeEstimate: string;
  component: React.ComponentType;
}

const GAMES: GameMeta[] = [
  {
    id: 'sudoku',
    title: 'Sudoku',
    tagline: 'Classic 9x9 number puzzle with pencil notes, mistake checker, and difficulty levels.',
    category: 'brain',
    badge: 'Brain Teaser',
    icon: Hash,
    color: 'from-amber-500 to-orange-500 text-amber-500',
    timeEstimate: '3-8 mins',
    component: SudokuGame,
  },
  {
    id: 'connect4',
    title: 'Connect 4',
    tagline: 'Drop colored discs into the 7x6 board to connect four in a line vs AI or a friend.',
    category: 'classic',
    badge: 'Strategy',
    icon: Layers,
    color: 'from-blue-500 to-indigo-600 text-blue-500',
    timeEstimate: '2-5 mins',
    component: ConnectFourGame,
  },
  {
    id: 'wordle',
    title: 'Town Word Guess',
    tagline: 'Guess the hidden 5-letter word in 6 attempts with color-coded clue tiles.',
    category: 'brain',
    badge: 'Daily Challenge',
    icon: Brain,
    color: 'from-emerald-500 to-teal-600 text-emerald-500',
    timeEstimate: '2-4 mins',
    component: WordGuessGame,
  },
  {
    id: '2048',
    title: '2048',
    tagline: 'Swipe and slide matching numbers to double tiles all the way to 2048.',
    category: 'arcade',
    badge: 'Addictive',
    icon: Sparkles,
    color: 'from-yellow-500 to-amber-600 text-yellow-500',
    timeEstimate: '3-6 mins',
    component: Game2048,
  },
  {
    id: 'snake',
    title: 'Retro Snake',
    tagline: 'Classic Nokia arcade game. Guide the snake, gobble apples, and avoid walls.',
    category: 'arcade',
    badge: 'Retro Arcade',
    icon: Gamepad2,
    color: 'from-green-500 to-emerald-600 text-green-500',
    timeEstimate: '2-5 mins',
    component: SnakeGame,
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    tagline: 'Uncover the 9x9 field, flag hidden explosives, and clear the board safely.',
    category: 'classic',
    badge: 'Precision',
    icon: Bomb,
    color: 'from-rose-500 to-red-600 text-rose-500',
    timeEstimate: '1-4 mins',
    component: MinesweeperGame,
  },
];

export default function TimeWaistersPage() {
  const [activeGameId, setActiveGameId] = useState<GameId | null>(null);
  const [filter, setFilter] = useState<'all' | 'brain' | 'classic' | 'arcade'>('all');
  const { communityName, isVisiting, visitedCommunityName } = useActiveCommunityId();

  const activeGame = GAMES.find((g) => g.id === activeGameId);

  const filteredGames = GAMES.filter((g) => {
    if (filter === 'all') return true;
    return g.category === filter;
  });

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Visitor Indicator Badge if visiting another community */}
      {isVisiting && visitedCommunityName && (
        <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs">
          <span className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
            <span>
              Visiting Hub: <strong className="underline underline-offset-2">{visitedCommunityName}</strong>
            </span>
          </span>
          <Badge variant="outline" className="border-amber-400 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[11px] font-bold">
            Visitor Mode
          </Badge>
        </div>
      )}

      {/* Main Header / Breadcrumb */}
      {!activeGame ? (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Gamepad2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  Time Waisters
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Take a 5-minute coffee break with classic games and daily brain teasers in {communityName}.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats / Streak Pill */}
          <div className="flex items-center gap-3 bg-muted/60 p-2 sm:p-2.5 rounded-xl border border-border/60">
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 rounded-lg text-xs font-bold text-amber-800 dark:text-amber-300">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Coffee Break Ready</span>
            </div>
            <div className="text-xs text-muted-foreground pr-2 font-medium hidden sm:inline">
              6 Games Available
            </div>
          </div>
        </div>
      ) : (
        /* In-Game Header */
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveGameId(null)}
              className="gap-1.5 font-bold text-xs"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Arcade
            </Button>
            <div className="flex items-center gap-2">
              <activeGame.icon className={cn('w-5 h-5', activeGame.color.split(' ')[2])} />
              <h2 className="text-lg sm:text-xl font-black">{activeGame.title}</h2>
              <Badge variant="secondary" className="text-[11px] hidden sm:inline">
                {activeGame.badge}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setActiveGameId(null)}
            >
              Change Game
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {!activeGame ? (
        /* ─── Arcade Game Selector Lobby ─── */
        <div className="space-y-6">
          {/* Category Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as any)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid grid-cols-4 w-full sm:w-auto">
                <TabsTrigger value="all">All Games</TabsTrigger>
                <TabsTrigger value="brain">Brain & Word</TabsTrigger>
                <TabsTrigger value="classic">Classics</TabsTrigger>
                <TabsTrigger value="arcade">Arcade</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Game Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGames.map((game) => {
              const IconComponent = game.icon;
              return (
                <Card
                  key={game.id}
                  className="group relative overflow-hidden border transition-all duration-200 hover:shadow-lg hover:border-primary/50 flex flex-col justify-between cursor-pointer"
                  onClick={() => setActiveGameId(game.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className={cn('p-3 rounded-2xl bg-gradient-to-br shadow-sm text-white', game.color.split(' ').slice(0, 2).join(' '))}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <Badge variant="secondary" className="text-[11px] font-bold">
                        {game.badge}
                      </Badge>
                    </div>

                    <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                      {game.title}
                    </CardTitle>
                    <CardDescription className="text-xs leading-relaxed line-clamp-2">
                      {game.tagline}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" /> {game.timeEstimate}
                      </span>
                      <Button size="sm" className="h-8 px-4 font-bold rounded-lg group-hover:bg-primary transition-all">
                        Play Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─── Active Playable Game Container ─── */
        <div className="bg-card border rounded-2xl p-4 sm:p-6 shadow-sm min-h-[500px] flex flex-col items-center justify-center">
          <activeGame.component />
        </div>
      )}
    </div>
  );
}
