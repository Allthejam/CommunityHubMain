'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  Info,
  Shield,
  Search,
  Eye,
  Heart,
  Grid,
  BookOpen,
  Crosshair,
  Zap,
  Crown,
  Anchor,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useActiveCommunityId } from '@/hooks/use-active-community-id';
import { cn } from '@/lib/utils';

// Game Components (21 Games)
import { SudokuGame } from '@/components/timewaisters/sudoku-game';
import { ConnectFourGame } from '@/components/timewaisters/connect-four-game';
import { Game2048 } from '@/components/timewaisters/game-2048';
import { WordGuessGame } from '@/components/timewaisters/word-guess-game';
import { SnakeGame } from '@/components/timewaisters/snake-game';
import { MinesweeperGame } from '@/components/timewaisters/minesweeper-game';
import { SolitaireGame } from '@/components/timewaisters/solitaire-game';
import { BrickBreakerGame } from '@/components/timewaisters/brick-breaker-game';
import { MemoryMatchGame } from '@/components/timewaisters/memory-match-game';
import { WordSearchGame } from '@/components/timewaisters/word-search-game';
import { TicTacToeGame } from '@/components/timewaisters/tictactoe-game';
import { TriviaGame } from '@/components/timewaisters/trivia-game';
import { BattleshipGame } from '@/components/timewaisters/battleship-game';
import { WordRescueGame } from '@/components/timewaisters/word-rescue-game';
import { TownHopperGame } from '@/components/timewaisters/town-hopper-game';
import { CheckersGame } from '@/components/timewaisters/checkers-game';
import { MiniCrosswordGame } from '@/components/timewaisters/mini-crossword-game';
import { FreeCellGame } from '@/components/timewaisters/freecell-game';
import { FifteenPuzzleGame } from '@/components/timewaisters/fifteen-puzzle-game';
import { BlackjackGame } from '@/components/timewaisters/blackjack-game';
import { ReversiGame } from '@/components/timewaisters/reversi-game';

type GameId =
  | 'sudoku'
  | 'connect4'
  | '2048'
  | 'wordle'
  | 'snake'
  | 'minesweeper'
  | 'solitaire'
  | 'brickbreaker'
  | 'memory'
  | 'wordsearch'
  | 'tictactoe'
  | 'trivia'
  | 'battleship'
  | 'wordrescue'
  | 'townhopper'
  | 'checkers'
  | 'minicrossword'
  | 'freecell'
  | '15puzzle'
  | 'blackjack'
  | 'reversi';

interface GameInstructions {
  objective: string;
  howToPlay: string[];
  proTip: string;
}

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
  instructions: GameInstructions;
}

const GAMES: GameMeta[] = [
  {
    id: 'solitaire',
    title: 'Klondike Solitaire',
    tagline: 'The timeless card game. Sort all 52 cards into the 4 suit foundations from Ace to King.',
    category: 'classic',
    badge: 'Popular Classic',
    icon: Trophy,
    color: 'from-emerald-600 to-teal-700 text-emerald-600',
    timeEstimate: '5-10 mins',
    component: SolitaireGame,
    instructions: {
      objective: 'Build all 52 cards up into the 4 foundation piles by suit, starting from Ace through to King.',
      howToPlay: [
        'On the tableau columns below, build cards down in descending rank with alternating colors (e.g. Red 6 on Black 7).',
        'Kings (K) or groups starting with a King can fill empty tableau columns.',
        'Tap the stock pile on the top left to draw fresh cards to the waste pile.',
        'Tap or double-tap cards to move them automatically to the foundation piles.',
      ],
      proTip: 'Always focus on making moves that uncover face-down cards in the tableau before drawing new cards from the stock pile!',
    },
  },
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
    instructions: {
      objective: 'Fill the 9x9 grid so every single row, column, and 3x3 box contains the numbers 1 through 9 with no duplicates.',
      howToPlay: [
        'Tap an empty cell on the board to select it.',
        'Tap a number from 1 to 9 on the bottom keypad to place it.',
        'Turn on "Notes Mode" to pencil in small candidate numbers when you are unsure.',
        'Use "Erase" to clear a cell, or "Hint" if you get stuck on a tricky square.',
      ],
      proTip: 'Look for rows, columns, or 3x3 blocks that already have 6 or 7 numbers filled in—they only have 2 or 3 numbers missing, making them easiest to solve first!',
    },
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
    instructions: {
      objective: 'Be the first player to form an unbroken horizontal, vertical, or diagonal line of 4 discs.',
      howToPlay: [
        'Tap any of the 7 column slots (or use the arrow buttons below) to drop your disc into that column.',
        'Discs drop down to the lowest unoccupied slot in that column.',
        'Red always moves first, followed by Yellow.',
        'Choose "vs Computer" to challenge the AI, or "2 Players" to pass and play with someone on the same device.',
      ],
      proTip: 'Control the center column! Discs placed in the middle column offer the highest number of 4-in-a-row combinations in every direction. Always watch the board closely to block your opponent before they get 4!',
    },
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
    instructions: {
      objective: 'Merge matching numbers together by sliding tiles until you create the magic 2048 tile!',
      howToPlay: [
        'Swipe in any direction (or use Arrow keys / on-screen arrow buttons) to slide all tiles across the board.',
        'When two tiles with the SAME number collide, they merge into one (2+2=4, 4+4=8, 8+8=16, 16+16=32, 32+32=64, ..., 1024+1024=2048).',
        'Every single time you move, a new 2 or 4 appears in an empty space.',
        'The game ends when the entire board fills up and no more merges can be made.',
      ],
      proTip: '🌟 THE GOLDEN CORNER RULE: Pick one corner (e.g. bottom-right) and NEVER move tiles away from it. Keep your highest number locked in that corner at all times, and build descending chains next to it. Never swipe Up unless you have zero other legal moves!',
    },
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
    instructions: {
      objective: 'Guess the secret 5-letter word in 6 attempts or fewer.',
      howToPlay: [
        'Type a 5-letter word using the on-screen keypad (or physical keyboard) and press Enter.',
        'Green tile (🟩): The letter is correct and in the exact right spot.',
        'Yellow tile (🟨): The letter is in the word, but in a different position.',
        'Gray tile (⬛): The letter is not in the secret word at all.',
        'Use the color feedback on the keyboard to narrow down remaining letters.',
      ],
      proTip: 'Start your first guess with words rich in common vowels (A, E, I, O) and frequent consonants like R, S, T, L.',
    },
  },
  {
    id: 'brickbreaker',
    title: 'Brick Breaker',
    tagline: 'Slide your paddle to bounce the ball and smash colorful brick rows.',
    category: 'arcade',
    badge: 'Arcade Action',
    icon: Grid,
    color: 'from-rose-500 to-orange-600 text-rose-500',
    timeEstimate: '2-5 mins',
    component: BrickBreakerGame,
    instructions: {
      objective: 'Destroy every brick on the screen by bouncing the ball off your paddle without dropping it.',
      howToPlay: [
        'Move your paddle left and right by dragging with your finger/mouse or using the Arrow keys.',
        'Bounce the ball into the bricks to shatter them and earn points.',
        'You have 3 lives—if the ball slips past your paddle and falls off the bottom, you lose a life.',
      ],
      proTip: 'Hitting the ball with the outer edges of your paddle deflects it at sharp sideways angles. Use this to send the ball above the brick wall for rapid-fire combo clears!',
    },
  },
  {
    id: 'memory',
    title: 'Memory Match',
    tagline: 'Flip cards two at a time to find all 8 matching pairs in fewest moves.',
    category: 'brain',
    badge: 'Casual & Relaxing',
    icon: Eye,
    color: 'from-purple-500 to-indigo-600 text-purple-500',
    timeEstimate: '1-3 mins',
    component: MemoryMatchGame,
    instructions: {
      objective: 'Find and uncover all 8 matching pairs of cards in the fewest number of flips.',
      howToPlay: [
        'Tap any face-down card to reveal its picture.',
        'Tap a second card. If the symbols match, they stay face up!',
        'If they do not match, remember their positions before they flip back down.',
      ],
      proTip: 'Say the card names in your head (e.g. "top-right is coffee, bottom-left is tree") to easily recall them when you see their counterpart!',
    },
  },
  {
    id: 'wordsearch',
    title: 'Word Search',
    tagline: 'Search the letter grid to find 6 hidden words horizontally, vertically, or diagonally.',
    category: 'brain',
    badge: 'Word Puzzle',
    icon: Search,
    color: 'from-teal-500 to-cyan-600 text-teal-500',
    timeEstimate: '2-4 mins',
    component: WordSearchGame,
    instructions: {
      objective: 'Locate and circle all 6 hidden words concealed inside the 10x10 letter grid.',
      howToPlay: [
        'Words may be hidden across, down, or diagonally.',
        'Tap the FIRST letter of a hidden word.',
        'Then tap the LAST letter of the word to highlight the whole word.',
        'The word list at the bottom will cross off words as you discover them.',
      ],
      proTip: 'Scan the grid for rare letters (like K, P, L, or double letters) to spot words much faster than reading line by line.',
    },
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
    instructions: {
      objective: 'Steer the snake around the screen to eat red apples, grow longer, and achieve the highest score possible.',
      howToPlay: [
        'Use the on-screen directional D-pad, keyboard Arrow keys, or WASD to steer the snake.',
        'Each red apple eaten scores 10 points and extends your snake by one segment.',
        'Hitting the outer border walls or crashing into your own tail ends the game.',
        'Press Spacebar or the Pause button at any time to take a break.',
      ],
      proTip: 'Travel around the outer perimeter of the screen in wide loops instead of turning back into the middle so you never get trapped by your own tail.',
    },
  },
  {
    id: 'tictactoe',
    title: 'Noughts & Crosses',
    tagline: 'The classic 3x3 game. Challenge the smart bot or pass and play with a friend.',
    category: 'classic',
    badge: 'Quick 30s',
    icon: Bot,
    color: 'from-blue-600 to-cyan-600 text-blue-600',
    timeEstimate: '30s - 1 min',
    component: TicTacToeGame,
    instructions: {
      objective: 'Be the first player to place 3 of your marks in a horizontal, vertical, or diagonal line.',
      howToPlay: [
        'Player X moves first, followed by Player O.',
        'Tap any empty square on the 3x3 grid to claim it.',
        'Select "vs Bot" to play against the computer AI or "2 Players" to play with a friend.',
      ],
      proTip: 'Taking the center square on turn 1 gives you the strongest winning chances and blocks the most lines!',
    },
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
    instructions: {
      objective: 'Uncover every single safe square on the 9x9 board without detonating any of the 10 hidden mines.',
      howToPlay: [
        'Tap an unopened square to dig it up.',
        'Numbers on revealed squares tell you exactly how many mines are touching that square (including diagonals).',
        'Toggle "Mode: Place Flag 🚩" (or right-click on desktop) to place a flag on tiles where you suspect a mine.',
        'If you tap an empty cell with 0 touching mines, the board automatically opens all surrounding safe tiles for you!',
      ],
      proTip: 'If a revealed square shows "1" and is only touching one unrevealed tile, that tile is guaranteed to be a mine—flag it right away to stay safe!',
    },
  },
  {
    id: 'trivia',
    title: 'Daily Pub Quiz',
    tagline: '5 daily trivia questions covering culture, history, nature, and entertainment.',
    category: 'brain',
    badge: 'Daily 5-Min',
    icon: BookOpen,
    color: 'from-amber-600 to-yellow-600 text-amber-600',
    timeEstimate: '2-4 mins',
    component: TriviaGame,
    instructions: {
      objective: 'Answer all 5 daily multiple-choice questions correctly to build your winning streak and score 5/5.',
      howToPlay: [
        'Choose "Daily Quiz" for today\'s global community questions, or "Practice" for unlimited rounds.',
        'Read the question and select one of the four possible answers (A, B, C, or D).',
        'Green confirms the right answer; red indicates an incorrect guess.',
        'Read the "Did you know?" insight box after each question to learn fascinating trivia.',
      ],
      proTip: 'Eliminate two obviously wrong answers first—this instantly doubles your chances of picking the right one!',
    },
  },
  {
    id: 'battleship',
    title: 'Battleship Radar',
    tagline: 'Deploy your naval warships on the 10x10 ocean grid and sink the enemy fleet.',
    category: 'classic',
    badge: 'Naval Warfare',
    icon: Crosshair,
    color: 'from-sky-600 to-blue-700 text-sky-600',
    timeEstimate: '3-6 mins',
    component: BattleshipGame,
    instructions: {
      objective: 'Locate and sink all 5 enemy warships (Carrier, Battleship, Cruiser, Submarine, Destroyer) before your own fleet is eliminated.',
      howToPlay: [
        'Press "Randomize Fleet" to position your ships, then tap "Engage Battle!" to start radar combat.',
        'Tap any coordinate on the 10x10 Radar grid to fire a salvo at enemy waters.',
        'Red flames mark direct hits; blue ripples mark splashes in open ocean.',
        'Toggle between "Radar" (attack mode) and "My Fleet" (defense mode) to monitor ship damage.',
      ],
      proTip: 'When you score a direct hit on an enemy vessel, systematically fire at the 4 adjacent coordinates (North, South, East, West) to trace and sink the rest of the ship!',
    },
  },
  {
    id: 'wordrescue',
    title: 'Word Rescue',
    tagline: 'Save the floating town mascot before 6 balloons pop in this friendly word puzzle.',
    category: 'brain',
    badge: 'Word Puzzle',
    icon: Heart,
    color: 'from-pink-500 to-rose-600 text-pink-500',
    timeEstimate: '1-3 mins',
    component: WordRescueGame,
    instructions: {
      objective: 'Guess the mystery word letter-by-letter to safely rescue the floating town mascot before 6 balloons pop.',
      howToPlay: [
        'Read the category clue at the top (Castles, High Street, Scottish Wildlife, or Traditional Treats).',
        'Tap letters on the on-screen keyboard to make your guesses.',
        'Every incorrect letter pops 1 balloon—you have 6 total chances.',
        'Tap "Need a clue?" if you need an extra hint for difficult words.',
      ],
      proTip: 'Start by guessing the most frequent vowels (E, A, O, I) before testing common consonants like T, R, S, and N.',
    },
  },
  {
    id: 'townhopper',
    title: 'Town Hopper',
    tagline: 'One-finger reflex arcade. Tap to flap and navigate through town chimneys and pillars.',
    category: 'arcade',
    badge: 'One-Finger Reflex',
    icon: Zap,
    color: 'from-amber-500 to-orange-600 text-amber-500',
    timeEstimate: '1-3 mins',
    component: TownHopperGame,
    instructions: {
      objective: 'Steer the flying town mascot through the gaps between town chimneys without colliding with obstacles or the ground.',
      howToPlay: [
        'Tap anywhere on the game canvas, press the big "TAP TO FLAP" button, or press Spacebar on desktop to flap upwards.',
        'Gravity pulls the mascot downwards when you are not tapping.',
        'Pass cleanly between upper and lower chimneys to score 1 point per obstacle.',
        'Keep your rhythm steady to beat your personal best high score!',
      ],
      proTip: 'Use short, gentle taps to maintain a level cruising altitude—falling too low requires frantic tapping that makes controlling the mascot harder.',
    },
  },
  {
    id: 'checkers',
    title: 'Checkers (Draughts)',
    tagline: 'Classic 8x8 board game. Jump opponent pieces and reach the back rank to crown a King.',
    category: 'classic',
    badge: 'Board Game',
    icon: Crown,
    color: 'from-red-600 to-amber-700 text-red-600',
    timeEstimate: '3-8 mins',
    component: CheckersGame,
    instructions: {
      objective: 'Capture all opponent pieces or block them so they have no legal moves remaining.',
      howToPlay: [
        'Red pieces start at the bottom and move first, stepping diagonally forward one dark square.',
        'Jump over an adjacent opponent piece into the empty space directly beyond to capture and remove it.',
        'Advance a piece to the opponent\'s back rank (row 0 for Red, row 7 for White) to crown it as a King (👑).',
        'Kings gain the power to move and jump both forwards and backwards diagonally.',
      ],
      proTip: 'Keep your own back-row pieces stationed in place as long as possible—this prevents your opponent from easily crowning their pieces Kings early in the match!',
    },
  },
  {
    id: 'minicrossword',
    title: 'Mini Crossword (5x5)',
    tagline: 'Bite-sized 5x5 daily crossword with Across & Down clues and letter reveal helper.',
    category: 'brain',
    badge: 'Daily 2-Min',
    icon: Grid,
    color: 'from-blue-600 to-indigo-700 text-blue-600',
    timeEstimate: '2-4 mins',
    component: MiniCrosswordGame,
    instructions: {
      objective: 'Fill the entire 5x5 crossword grid with the correct intersecting letters based on the Across and Down clues.',
      howToPlay: [
        'Tap any square to select it; tap it again to switch typing direction between Across and Down.',
        'Use the on-screen letter keyboard or physical keyboard to type in letters.',
        'Tap "Reveal Letter" if you get stuck on a tricky intersecting clue.',
        'Tap "Next Puzzle" to solve another mini crossword anytime.',
      ],
      proTip: 'Solve the shortest 3-letter and 4-letter clues first—their letters will automatically give you free hints for the longer 5-letter words!',
    },
  },
  {
    id: 'freecell',
    title: 'FreeCell Solitaire',
    tagline: 'The strategic card classic. Use 4 free reserve cells to build all 4 suit foundations.',
    category: 'classic',
    badge: 'Card Classic',
    icon: Layers,
    color: 'from-emerald-700 to-teal-800 text-emerald-700',
    timeEstimate: '5-10 mins',
    component: FreeCellGame,
    instructions: {
      objective: 'Move all 52 cards into the 4 foundation piles by suit from Ace up to King.',
      howToPlay: [
        'All cards are dealt face-up into 8 tableau cascades.',
        'Use the 4 Free Cells in the top-left as temporary holding spots for any single card.',
        'Build tableau cascades downward in alternating colors (e.g. Red 7 on Black 8).',
        'Tap "Auto Move" at any time to automatically promote safe cards into the foundation piles.',
      ],
      proTip: 'Keep your 4 free cells as empty as possible—having 3 or 4 open free cells allows you to move long runs of cards at once!',
    },
  },
  {
    id: '15puzzle',
    title: 'Sliding 15-Puzzle',
    tagline: 'Slide scrambled wooden tiles into numerical order 1 to 15 in this classic test of logic.',
    category: 'brain',
    badge: 'Slide Logic',
    icon: Hash,
    color: 'from-amber-700 to-orange-800 text-amber-700',
    timeEstimate: '2-5 mins',
    component: FifteenPuzzleGame,
    instructions: {
      objective: 'Arrange the 15 numbered wooden tiles in numerical order from 1 to 15, leaving the empty space in the bottom-right.',
      howToPlay: [
        'Tap any tile adjacent to the empty square to slide it into the empty space.',
        'Work row by row, starting by positioning tiles 1, 2, 3, and 4 in the top row.',
        'Continue with rows 2 and 3 until the puzzle falls into place.',
        'Press "Scramble New Puzzle" for a fresh guaranteed-solvable challenge.',
      ],
      proTip: 'Solve the top row (1, 2, 3, 4) first, then the second row (5, 6, 7, 8). Once the top two rows are locked in, solve the remaining two rows together!',
    },
  },
  {
    id: 'blackjack',
    title: 'Blackjack 21',
    tagline: 'Arcade casino cards. Beat the dealer by getting closest to 21 without busting!',
    category: 'classic',
    badge: 'Arcade Casino',
    icon: Coins,
    color: 'from-emerald-600 to-green-700 text-emerald-600',
    timeEstimate: '1-3 mins',
    component: BlackjackGame,
    instructions: {
      objective: 'Score closer to 21 than the dealer without exceeding 21 ("busting").',
      howToPlay: [
        'Select your bet amount ($10, $25, $50, $100) and tap "DEAL CARDS".',
        'Tap "HIT" to take another card, or "STAND" to end your turn and let the dealer play.',
        'Tap "DOUBLE (2x)" on your initial 2 cards to double your wager and receive exactly 1 more card.',
        'A natural 21 (Ace + 10/J/Q/K) is a Blackjack and pays 3:2!',
      ],
      proTip: 'Always stand on hard 17 or higher, and always hit if your hand is 11 or lower—the dealer must hit until they reach at least 17!',
    },
  },
  {
    id: 'reversi',
    title: 'Reversi (Othello)',
    tagline: 'Trap and flip opponent disks on the 8x8 felt board. A minute to learn, a lifetime to master.',
    category: 'classic',
    badge: 'Board Game',
    icon: Shield,
    color: 'from-emerald-800 to-slate-900 text-emerald-800',
    timeEstimate: '3-7 mins',
    component: ReversiGame,
    instructions: {
      objective: 'Have the majority of disks showing your color when the 8x8 board fills or neither player can move.',
      howToPlay: [
        'Black pieces move first. Tap any glowing green indicator dot to place your disk.',
        'Your placed disk must trap one or more opponent disks in a straight line between itself and another disk of your color.',
        'All trapped opponent disks immediately flip to your color!',
        'Switch between "vs AI" and "Pass & Play" at the top.',
      ],
      proTip: 'Corners are the most powerful squares on the board because they can NEVER be flipped back—seize corners whenever possible and avoid giving them away!',
    },
  },
];

export default function TimeWaistersPage() {
  const [activeGameId, setActiveGameId] = useState<GameId | null>(null);
  const [filter, setFilter] = useState<'all' | 'brain' | 'classic' | 'arcade'>('all');
  const topRef = useRef<HTMLDivElement | null>(null);

  // Automatically scroll instantly to the very top whenever entering a game or returning to the arcade
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        topRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
      });
    }
  }, [activeGameId]);
  const [inspectingInstructionsGame, setInspectingInstructionsGame] = useState<GameMeta | null>(null);
  const { communityName, isVisiting, visitedCommunityName } = useActiveCommunityId();

  const activeGame = GAMES.find((g) => g.id === activeGameId);

  const filteredGames = GAMES.filter((g) => {
    if (filter === 'all') return true;
    return g.category === filter;
  });

  return (
    <div ref={topRef} className="container max-w-6xl mx-auto py-6 px-3 sm:px-6 space-y-6 overflow-x-hidden">
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
              11 Games Available
            </div>
          </div>
        </div>
      ) : (
        /* In-Game Header: Fully responsive on mobile and desktop without horizontal overflow */
        <div className="flex flex-col gap-2.5 border-b pb-3 w-full">
          {/* Top row on mobile & desktop: Navigation on left, How to Play on right */}
          <div className="flex items-center justify-between gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveGameId(null);
                if (typeof window !== 'undefined') window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
              }}
              className="gap-1.5 font-bold text-xs h-8 px-3 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Arcade</span>
            </Button>

            {/* How to Play Button neatly placed on the right */}
            <Button
              variant="secondary"
              size="sm"
              className="text-xs font-bold gap-1.5 h-8 px-3 bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 shrink-0"
              onClick={() => setInspectingInstructionsGame(activeGame)}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>How to Play</span>
            </Button>
          </div>

          {/* Title row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <activeGame.icon className={cn('w-5 h-5 sm:w-6 sm:h-6 shrink-0', activeGame.color.split(' ')[2])} />
              <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate">{activeGame.title}</h2>
              <Badge variant="secondary" className="text-[11px] shrink-0">
                {activeGame.badge}
              </Badge>
            </div>

            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
              ⏱️ {activeGame.timeEstimate}
            </span>
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
                <TabsTrigger value="all">All Games ({GAMES.length})</TabsTrigger>
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
                  onClick={() => { setActiveGameId(game.id); if (typeof window !== 'undefined') window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className={cn('p-3 rounded-2xl bg-gradient-to-br shadow-sm text-white', game.color.split(' ').slice(0, 2).join(' '))}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingInstructionsGame(game);
                          }}
                        >
                          <HelpCircle className="w-3.5 h-3.5 mr-1 text-primary" /> Rules
                        </Button>
                        <Badge variant="secondary" className="text-[11px] font-bold">
                          {game.badge}
                        </Badge>
                      </div>
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
                      <Button size="sm" className="h-8 px-4 font-bold rounded-lg group-hover:bg-primary transition-all" onClick={(e) => { e.stopPropagation(); setActiveGameId(game.id); if (typeof window !== 'undefined') window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }}>
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
        <div className="bg-card border rounded-2xl p-2.5 sm:p-6 shadow-sm min-h-[480px] flex flex-col items-center justify-center w-full overflow-hidden">
          <activeGame.component />
        </div>
      )}

      {/* ─── Universal How to Play / Instructions Dialog ─── */}
      <Dialog
        open={Boolean(inspectingInstructionsGame)}
        onOpenChange={(open) => {
          if (!open) setInspectingInstructionsGame(null);
        }}
      >
        <DialogContent className="max-w-md sm:max-w-lg">
          {inspectingInstructionsGame && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn('p-2 rounded-xl bg-gradient-to-br text-white shadow-xs', inspectingInstructionsGame.color.split(' ').slice(0, 2).join(' '))}>
                    <inspectingInstructionsGame.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black">
                      How to Play {inspectingInstructionsGame.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      {inspectingInstructionsGame.badge} • Estimated play: {inspectingInstructionsGame.timeEstimate}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 text-sm mt-2">
                {/* Objective */}
                <div className="bg-muted/50 p-3 rounded-xl border border-border/60">
                  <h4 className="font-bold text-xs uppercase text-primary mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    The Objective
                  </h4>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    {inspectingInstructionsGame.instructions.objective}
                  </p>
                </div>

                {/* How to Play Steps */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-primary" />
                    Rules & Controls
                  </h4>
                  <ul className="space-y-1.5 text-xs sm:text-sm">
                    {inspectingInstructionsGame.instructions.howToPlay.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed text-foreground">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pro Strategy Tip */}
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3 rounded-xl">
                  <h4 className="font-bold text-xs uppercase text-amber-800 dark:text-amber-300 mb-1 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-500" />
                    Winning Strategy Tip
                  </h4>
                  <p className="text-xs sm:text-sm text-amber-950 dark:text-amber-200/90 leading-relaxed font-medium">
                    {inspectingInstructionsGame.instructions.proTip}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-2 border-t">
                <Button
                  className="font-bold text-xs"
                  onClick={() => {
                    setActiveGameId(inspectingInstructionsGame.id);
                    setInspectingInstructionsGame(null);
                    if (typeof window !== 'undefined') window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                  }}
                >
                  Play {inspectingInstructionsGame.title}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
