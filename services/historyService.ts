import { Idol, FilterSummary } from '../types';

const HISTORY_KEY = 'kpopSorterHistory_v1';

export interface PastSortResult {
  id: string; // ISO timestamp string, unique identifier
  date: string; // User-friendly date string
  rankedList: Idol[];
  comparisonsMade: number;
  filterSummary: FilterSummary;
}

/**
 * Retrieves the entire sort history from localStorage.
 * @returns An array of past sort results, sorted from newest to oldest.
 */
export function getHistory(): PastSortResult[] {
  try {
    const historyJSON = localStorage.getItem(HISTORY_KEY);
    if (!historyJSON) {
      return [];
    }
    const history = JSON.parse(historyJSON) as PastSortResult[];
    // Sort by ID (timestamp) descending to show newest first
    return history.sort((a, b) => b.id.localeCompare(a.id));
  } catch (e) {
    console.error("Failed to load or parse sort history:", e);
    // If parsing fails, clear the corrupted data to prevent future errors
    localStorage.removeItem(HISTORY_KEY);
    return [];
  }
}

/**
 * Adds a new completed sort to the history in localStorage.
 * @param newResult The new sort result to add.
 */
export function addSortToHistory(newResult: PastSortResult): void {
  const history = getHistory();
  // Add the new result to the beginning of the array
  history.unshift(newResult); 
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save sort to history:", e);
  }
}

/**
 * Retrieves a single sort result from history by its ID.
 * @param id The unique ID of the sort result to find.
 * @returns The found sort result, or undefined if not found.
 */
export function getSortById(id: string): PastSortResult | undefined {
  const history = getHistory();
  return history.find(result => result.id === id);
}

/**
 * Clears the entire sort history from localStorage.
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (e) {
    console.error("Failed to clear sort history:", e);
  }
}
