import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCombinations(arrays: any[][]): any[][] {
  if (!arrays || arrays.length === 0) {
    return [];
  }
  return arrays.reduce<any[][]>(
    (acc, current) => {
      if (!current || current.length === 0) {
        // If an option has no values, we treat it as if it has one empty value
        // to not break the chain, but it won't add to the combination string.
        return acc.map(a => [...a, '']); 
      }
      if (acc.length === 0) {
        return current.map(item => [item]);
      }
      return acc.flatMap(a => current.map(c => [...a, c]));
    },
    []
  ).map((combo: any[]) => combo.filter((val: any) => val !== '')); // Filter out empty strings from combos
}

export function shuffleArray<T>(array: T[]): T[] {
  if (!array || array.length <= 1) return array ? [...array] : [];
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
