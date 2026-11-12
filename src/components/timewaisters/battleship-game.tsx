'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  RotateCcw,
  Sparkles,
  Trophy,
  Shield,
  Crosshair,
  Flame,
  Volume2,
  VolumeX,
  Radar,
  Anchor,
  Shuffle,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const GRID_SIZE = 10;

interface ShipDef {
  id: string;
  name: string;
  size: number;
}

const SHIPS: ShipDef[] = [
  { id: 'carrier', name: 'Carrier', size: 5 },
  { id: 'battleship', name: 'Battleship', size: 4 },
  { id: 'cruiser', name: 'Cruiser', size: 3 },
  { id: 'submarine', name: 'Submarine', size: 3 },
  { id: 'destroyer', name: 'Destroyer', size: 2 },
];

type CellState = 'empty' | 'ship' | 'hit' | 'miss';

interface PlacedShip {
  ship: ShipDef;
  coords: [number, number][];
  hits: number;
}

export function BattleshipGame() {
  const [phase, setPhase] = useState<'placement' | 'playing' | 'gameover'>('placement');
  const [playerGrid, setPlayerGrid] = useState<CellState[][]>(() =>
    Array(GRID_SIZE).fill('empty').map(() => Array(GRID_SIZE).fill('empty'))
  );
  const [enemyGrid, setEnemyGrid] = useState<CellState[][]>(() =>
    Array(GRID_SIZE).fill('empty').map(() => Array(GRID_SIZE).fill('empty'))
  );

  const [playerShips, setPlayerShips] = useState<PlacedShip[]>([]);
  const [enemyShips, setEnemyShips] = useState<PlacedShip[]>([]);

  const [activeTab, setActiveTab] = useState<'radar' | 'fleet'>('radar');
  const [turn, setTurn] = useState<'player' | 'enemy'>('player');
  const [log, setLog] = useState<string>('Deploy your fleet or hit Randomize to begin!');
  const [winner, setWinner] = useState<'player' | 'enemy' | null>(null);

  const [shotsFired, setShotsFired] = useState(0);
  const [shotsHit, setShotsHit] = useState(0);

  // Stats
  const [stats, setStats] = useState({
    wins: 0,
    losses: 0,
    bestShots: 0,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('timewaisters_battleship_stats');
      if (saved) setStats(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  // Helper to place ships randomly without overlap
  const generateRandomFleet = useCallback((): { grid: CellState[][]; ships: PlacedShip[] } => {
    const grid: CellState[][] = Array(GRID_SIZE).fill('empty').map(() => Array(GRID_SIZE).fill('empty'));
    const placed: PlacedShip[] = [];

    for (const ship of SHIPS) {
      let isPlaced = false;
      let attempts = 0;

      while (!isPlaced && attempts < 200) {
        attempts++;
        const isHorizontal = Math.random() < 0.5;
        const r = Math.floor(Math.random() * (isHorizontal ? GRID_SIZE : GRID_SIZE - ship.size + 1));
        const c = Math.floor(Math.random() * (isHorizontal ? GRID_SIZE - ship.size + 1 : GRID_SIZE));

        const coords: [number, number][] = [];
        let canPlace = true;

        for (let i = 0; i < ship.size; i++) {
          const nr = isHorizontal ? r : r + i;
          const nc = isHorizontal ? c + i : c;
          if (grid[nr][nc] !== 'empty') {
            canPlace = false;
            break;
          }
          coords.push([nr, nc]);
        }

        if (canPlace) {
          coords.forEach(([nr, nc]) => {
            grid[nr][nc] = 'ship';
          });
          placed.push({ ship, coords, hits: 0 });
          isPlaced = true;
        }
      }
    }

    return { grid, ships: placed };
  }, []);

  // Setup initial fleet
  const randomizePlayerFleet = useCallback(() => {
    const { grid, ships } = generateRandomFleet();
    setPlayerGrid(grid);
    setPlayerShips(ships);
    setLog('Fleet deployed! Press "Engage Battle" when ready.');
  }, [generateRandomFleet]);

  useEffect(() => {
    randomizePlayerFleet();
  }, [randomizePlayerFleet]);

  const startGame = () => {
    const enemyFleet = generateRandomFleet();
    setEnemyGrid(enemyFleet.grid);
    setEnemyShips(enemyFleet.ships);

    setPhase('playing');
    setActiveTab('radar');
    setTurn('player');
    setShotsFired(0);
    setShotsHit(0);
    setLog('Radar online! Tap any ocean coordinate to fire your salvo.');
  };

  // Bot AI state: memory of hits to pursue
  const [botHuntTargets, setBotHuntTargets] = useState<[number, number][]>([]);

  // Player fires at enemy grid
  const handlePlayerFire = (r: number, c: number) => {
    if (phase !== 'playing' || turn !== 'player') return;
    if (enemyGrid[r][c] === 'hit' || enemyGrid[r][c] === 'miss') return;

    setShotsFired((prev) => prev + 1);

    const isShip = enemyGrid[r][c] === 'ship';
    const newEnemyGrid = enemyGrid.map((row) => [...row]);

    if (isShip) {
      newEnemyGrid[r][c] = 'hit';
      setShotsHit((prev) => prev + 1);

      // Check which ship was hit
      let justSunkName: string | null = null;
      const updatedShips = enemyShips.map((s) => {
        const match = s.coords.some(([sr, sc]) => sr === r && sc === c);
        if (match) {
          const newHits = s.hits + 1;
          if (newHits === s.ship.size) justSunkName = s.ship.name;
          return { ...s, hits: newHits };
        }
        return s;
      });
      setEnemyShips(updatedShips);

      // Check win condition
      const allSunk = updatedShips.every((s) => s.hits === s.ship.size);
      if (allSunk) {
        setWinner('player');
        setPhase('gameover');
        setLog('VICTORY! You have eliminated the entire enemy fleet!');
        saveStats(true, shotsFired + 1);
        setEnemyGrid(newEnemyGrid);
        return;
      }

      setLog(
        justSunkName
          ? `DIRECT HIT! You sank the enemy ${justSunkName}! 💥`
          : `DIRECT HIT on coordinate ${String.fromCharCode(65 + r)}${c + 1}! 🔥`
      );
    } else {
      newEnemyGrid[r][c] = 'miss';
      setLog(`Splash! Miss at ${String.fromCharCode(65 + r)}${c + 1}. Enemy is targeting... 🌊`);
    }

    setEnemyGrid(newEnemyGrid);
    setTurn('enemy');

    // Bot responds after a short pause
    setTimeout(() => {
      handleBotTurn();
    }, 700);
  };

  // Bot AI firing routine
  const handleBotTurn = () => {
    setPlayerGrid((currentPGrid) => {
      let r = 0;
      let c = 0;
      let valid = false;

      // Look in hunt targets first
      const targets = [...botHuntTargets];
      while (targets.length > 0 && !valid) {
        const [tr, tc] = targets.shift()!;
        if (
          tr >= 0 &&
          tr < GRID_SIZE &&
          tc >= 0 &&
          tc < GRID_SIZE &&
          currentPGrid[tr][tc] !== 'hit' &&
          currentPGrid[tr][tc] !== 'miss'
        ) {
          r = tr;
          c = tc;
          valid = true;
        }
      }

      // If no valid hunt targets, pick random unhit cell
      if (!valid) {
        let attempts = 0;
        while (!valid && attempts < 200) {
          attempts++;
          r = Math.floor(Math.random() * GRID_SIZE);
          c = Math.floor(Math.random() * GRID_SIZE);
          if (currentPGrid[r][c] !== 'hit' && currentPGrid[r][c] !== 'miss') {
            valid = true;
          }
        }
      }

      const isHit = currentPGrid[r][c] === 'ship';
      const updatedPGrid = currentPGrid.map((row) => [...row]);

      if (isHit) {
        updatedPGrid[r][c] = 'hit';
        // Add adjacent cells to hunt targets
        const adjacent: [number, number][] = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ];
        setBotHuntTargets([...targets, ...adjacent]);

        // Check if player lost
        setPlayerShips((prevPShips) => {
          let pSunkName: string | null = null;
          const updated = prevPShips.map((s) => {
            const match = s.coords.some(([sr, sc]) => sr === r && sc === c);
            if (match) {
              const newHits = s.hits + 1;
              if (newHits === s.ship.size) pSunkName = s.ship.name;
              return { ...s, hits: newHits };
            }
            return s;
          });

          const allPlayerSunk = updated.every((s) => s.hits === s.ship.size);
          if (allPlayerSunk) {
            setWinner('enemy');
            setPhase('gameover');
            setLog('DEFEAT! All your ships have been sunk. 💀');
            saveStats(false, shotsFired);
          } else {
            setLog(
              pSunkName
                ? `WARNING! Enemy sank your ${pSunkName}! 🚨`
                : `ALERT! Enemy hit your ship at ${String.fromCharCode(65 + r)}${c + 1}!`
            );
          }
          return updated;
        });
      } else {
        updatedPGrid[r][c] = 'miss';
        setBotHuntTargets(targets);
        setLog(`Enemy fired at ${String.fromCharCode(65 + r)}${c + 1} and MISSED. Your turn!`);
      }

      setTurn('player');
      return updatedPGrid;
    });
  };

  const saveStats = (won: boolean, finalShots: number) => {
    setStats((prev) => {
      const updated = {
        wins: won ? prev.wins + 1 : prev.wins,
        losses: won ? prev.losses : prev.losses + 1,
        bestShots: won ? (prev.bestShots === 0 ? finalShots : Math.min(prev.bestShots, finalShots)) : prev.bestShots,
      };
      try {
        localStorage.setItem('timewaisters_battleship_stats', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const resetGame = () => {
    setPhase('placement');
    setWinner(null);
    setBotHuntTargets([]);
    randomizePlayerFleet();
  };

  // Fleet status summaries
  const enemyShipsAfloat = useMemo(
    () => enemyShips.filter((s) => s.hits < s.ship.size).length,
    [enemyShips]
  );
  const playerShipsAfloat = useMemo(
    () => playerShips.filter((s) => s.hits < s.ship.size).length,
    [playerShips]
  );

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      {/* Top Status Bar */}
      <div className="w-full flex items-center justify-between mb-3 px-1 text-xs">
        <div className="flex items-center gap-1.5">
          <Badge variant={phase === 'playing' ? 'default' : 'secondary'} className="gap-1">
            <Radar className="w-3.5 h-3.5 animate-pulse" />
            {phase === 'placement' ? 'Fleet Prep' : phase === 'playing' ? (turn === 'player' ? 'Your Fire' : 'Enemy Salvo') : 'Game Over'}
          </Badge>
          {phase === 'playing' && (
            <span className="text-muted-foreground font-mono">
              Shots: {shotsFired} ({shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0}%)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">
            W: {stats.wins} / L: {stats.losses}
          </div>
          {stats.bestShots > 0 && (
            <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full">
              Best: {stats.bestShots}
            </div>
          )}
        </div>
      </div>

      {/* Radar Log / Tactical Feed */}
      <div className="w-full mb-3 p-2.5 rounded-xl bg-muted/60 border border-border/80 text-xs font-mono text-center flex items-center justify-center min-h-[42px] leading-snug">
        <span className={cn(
          log.includes('DIRECT HIT') || log.includes('VICTORY') ? 'text-emerald-600 dark:text-emerald-400 font-bold' :
          log.includes('WARNING') || log.includes('ALERT') || log.includes('DEFEAT') ? 'text-rose-600 dark:text-rose-400 font-bold' :
          'text-muted-foreground'
        )}>
          {log}
        </span>
      </div>

      {/* View Switcher during Battle */}
      {phase === 'playing' && (
        <div className="flex items-center justify-center gap-2 mb-3">
          <Button
            size="sm"
            variant={activeTab === 'radar' ? 'default' : 'outline'}
            onClick={() => setActiveTab('radar')}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <Crosshair className="w-3.5 h-3.5" />
            Radar (Attack: {enemyShipsAfloat}/5 left)
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'fleet' ? 'default' : 'outline'}
            onClick={() => setActiveTab('fleet')}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <Shield className="w-3.5 h-3.5" />
            My Fleet ({playerShipsAfloat}/5 left)
          </Button>
        </div>
      )}

      {/* 10x10 Grid View */}
      <Card className="w-full shadow-md border-border/80 p-2 sm:p-4 flex flex-col items-center">
        {/* Column coordinate labels (A-J) */}
        <div className="flex items-center justify-center mb-1">
          <div className="w-5 sm:w-6" />
          {Array.from({ length: GRID_SIZE }).map((_, c) => (
            <div key={c} className="w-7 sm:w-8 text-center text-[10px] font-mono text-muted-foreground">
              {c + 1}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="flex flex-col gap-1">
          {(activeTab === 'radar' && phase === 'playing' ? enemyGrid : playerGrid).map((row, r) => (
            <div key={r} className="flex items-center gap-1">
              {/* Row label */}
              <div className="w-5 sm:w-6 text-[10px] font-mono font-bold text-muted-foreground text-center">
                {String.fromCharCode(65 + r)}
              </div>

              {/* Grid cells */}
              {row.map((cell, c) => {
                const isTargetGrid = activeTab === 'radar' && phase === 'playing';
                const isHit = cell === 'hit';
                const isMiss = cell === 'miss';
                const isShipVisible = !isTargetGrid && cell === 'ship';

                return (
                  <button
                    key={c}
                    disabled={!isTargetGrid || phase !== 'playing' || turn !== 'player' || isHit || isMiss}
                    onClick={() => handlePlayerFire(r, c)}
                    className={cn(
                      'w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center transition-all duration-150 relative text-xs',
                      isTargetGrid
                        ? isHit
                          ? 'bg-rose-500 text-white font-bold animate-in zoom-in-75'
                          : isMiss
                          ? 'bg-blue-500/20 text-blue-500'
                          : 'bg-slate-900/60 hover:bg-slate-800 border border-slate-700/60 active:scale-95'
                        : isHit
                        ? 'bg-rose-600 text-white font-bold'
                        : isMiss
                        ? 'bg-blue-500/30 text-blue-500'
                        : isShipVisible
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'bg-slate-900/40 border border-slate-800/80'
                    )}
                  >
                    {isHit && <Flame className="w-4 h-4 animate-bounce" />}
                    {isMiss && <span className="w-2 h-2 rounded-full bg-blue-400" />}
                    {isShipVisible && !isHit && <span className="w-2.5 h-2.5 rounded bg-emerald-300/80" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Fleet Ships Status Pill List */}
        <div className="w-full mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-center gap-2">
          {(activeTab === 'radar' && phase === 'playing' ? enemyShips : playerShips).map((ps) => {
            const isSunk = ps.hits >= ps.ship.size;
            return (
              <Badge
                key={ps.ship.id}
                variant={isSunk ? 'destructive' : 'outline'}
                className={cn('text-[11px] gap-1 px-2 py-0.5', isSunk && 'line-through opacity-70')}
              >
                <Anchor className="w-3 h-3" />
                {ps.ship.name} ({ps.ship.size})
              </Badge>
            );
          })}
        </div>
      </Card>

      {/* Control Buttons */}
      <div className="w-full flex items-center justify-center gap-2.5 mt-4">
        {phase === 'placement' ? (
          <>
            <Button
              variant="outline"
              onClick={randomizePlayerFleet}
              className="gap-2 text-xs font-semibold"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Randomize Fleet
            </Button>
            <Button
              onClick={startGame}
              className="gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Crosshair className="w-3.5 h-3.5" />
              Engage Battle!
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            onClick={resetGame}
            className="gap-2 text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Naval Mission
          </Button>
        )}
      </div>
    </div>
  );
}
