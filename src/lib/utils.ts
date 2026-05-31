import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCombinations<T>(arrays: T[][]): T[][] {
  if (!arrays || arrays.length === 0) {
    return [];
  }
  return arrays.reduce<T[][]>(
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
  ).map(combo => combo.filter(val => val !== '')); // Filter out empty strings from combos
}
