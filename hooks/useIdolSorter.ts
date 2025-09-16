
import { useState, useEffect, useCallback } from 'react';
import { Idol, Matchup, GamePhase, Group, FilterSummary } from '../types';

const SAVE_KEY = 'kpopSorterState_v2';

interface SorterState {
  idols: Idol[];
  queue: Idol[][];
  left: Idol[] | null;
  right: Idol[] | null;
  buffer: Idol[];
  history: Omit<SorterState, 'history' | 'idols'>[];
  totalInitialPairs: number;
  initialLeftLength: number;
  initialRightLength: number;
  comparisonsMade: number;
  comparisonsAtMergeStart: number;
  efficiencyLog: { actual: number; best: number; worst: number }[];
  filterSummary: FilterSummary | null;
}

const getInitialState = (): SorterState => ({
  idols: [],
  queue: [],
  left: null,
  right: null,
  buffer: [],
  history: [],
  totalInitialPairs: 0,
  initialLeftLength: 0,
  initialRightLength: 0,
  comparisonsMade: 0,
  comparisonsAtMergeStart: 0,
  efficiencyLog: [],
  filterSummary: null,
});

const useIdolSorter = () => {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.LOADING);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [sorterState, setSorterState] = useState<SorterState>(getInitialState);

  const calculateProgress = useCallback(() => {
    const {
      comparisonsMade,
      left,
      right,
      queue,
      initialLeftLength,
      initialRightLength,
      efficiencyLog,
    } = sorterState;

    if (phase === GamePhase.FINISHED) return 100;
    if (phase !== GamePhase.PLAYING) return 0;

    const calculateMergeCost = (listSizes: number[]): { best: number; worst: number } => {
      let best = 0;
      let worst = 0;
      const q = [...listSizes];
      while (q.length > 1) {
        const m = q.shift()!;
        const n = q.shift()!;
        best += Math.min(m, n);
        worst += m + n - 1;
        q.push(m + n);
      }
      return { best, worst };
    };

    let remainingBest = 0;
    let remainingWorst = 0;

    if (left && right && left.length > 0 && right.length > 0) {
      remainingBest += 1;
      remainingWorst += left.length + right.length - 1;
    }

    const futureListSizes = queue.map(l => l.length);
    if (initialLeftLength > 0 && initialRightLength > 0) {
      futureListSizes.push(initialLeftLength + initialRightLength);
    }

    const futureCost = calculateMergeCost(futureListSizes);
    remainingBest += futureCost.best;
    remainingWorst += futureCost.worst;

    let efficiencyRatio = 0.5;

    if (efficiencyLog.length > 0) {
      const totals = efficiencyLog.reduce(
        (acc, log) => {
          acc.actual += log.actual;
          acc.best += log.best;
          acc.worst += log.worst;
          return acc;
        },
        { actual: 0, best: 0, worst: 0 }
      );

      const range = totals.worst - totals.best;
      if (range > 0) {
        const rawRatio = (totals.actual - totals.best) / range;
        const clamped = Math.max(0, Math.min(1, rawRatio));
        const sampleSize = efficiencyLog.length;
        const alpha = Math.min(1, sampleSize / 10);
        efficiencyRatio = alpha * clamped + (1 - alpha) * 0.5;
      }
    }

    const noMoreComparisons =
      remainingWorst === 0 &&
      (!left || left.length === 0) &&
      (!right || right.length === 0) &&
      queue.length <= 1;

    if (noMoreComparisons) {
      return 99.9;
    }

    const estimatedRemaining = remainingBest + efficiencyRatio * (remainingWorst - remainingBest);
    const estimatedTotal = comparisonsMade + estimatedRemaining;

    let progress = estimatedTotal > 0 ? (comparisonsMade / estimatedTotal) * 100 : 0;

    const minProgress = (comparisonsMade / (comparisonsMade + remainingWorst + 1)) * 100;
    progress = Math.max(progress, minProgress);

    return Math.min(99.9, progress);
  }, [sorterState, phase]);

  const saveState = useCallback((newState: SorterState) => {
    try {
      const stateToSave = { ...newState, history: newState.history.slice(-20) };
      localStorage.setItem(SAVE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Could not save game state:', e);
    }
  }, []);

  const setNextMatchup = useCallback((state: SorterState): SorterState => {
    let { queue, left, right, buffer, initialLeftLength, initialRightLength, comparisonsMade, comparisonsAtMergeStart, efficiencyLog } = state;

    while (!left || !right || left.length === 0 || right.length === 0) {
      if (left && right) {
        if (initialLeftLength > 0 && initialRightLength > 0) {
          const actual = comparisonsMade - comparisonsAtMergeStart;
          const best = Math.min(initialLeftLength, initialRightLength);
          const worst = initialLeftLength + initialRightLength - 1;
          if (worst > best) {
            efficiencyLog = [...efficiencyLog, { actual, best, worst }];
          }
        }

        if (left.length === 0 && right.length > 0) {
          buffer.push(...right);
        } else if (right.length === 0 && left.length > 0) {
          buffer.push(...left);
        }

        left = null;
        right = null;
      }

      if (buffer.length > 0) {
        queue.push(buffer);
        buffer = [];
      }

      if (queue.length <= 1) {
        const finalRankings = queue.length === 1 ? queue[0] : buffer;
        return {
          ...state,
          queue,
          left: null,
          right: null,
          buffer: finalRankings,
          initialLeftLength: 0,
          initialRightLength: 0,
          efficiencyLog,
        };
      }

      left = queue.shift()!;
      right = queue.shift()!;
      initialLeftLength = left.length;
      initialRightLength = right.length;
      comparisonsAtMergeStart = comparisonsMade;
    }

    // ✅ Prevent idol vs. self
    while (left && right && left[0] && right[0] && left[0].id === right[0].id) {
      console.warn('Skipping matchup with identical idols:', left[0]);

      if (right.length > 1) {
        right.push(right.shift()!);
      } else if (left.length > 1) {
        left.push(left.shift()!);
      } else {
        buffer.push(left.shift()!);
        buffer.push(right.shift()!);
      }

      if (left.length === 0 || right.length === 0) {
        return setNextMatchup({
          ...state,
          queue,
          left,
          right,
          buffer,
          initialLeftLength,
          initialRightLength,
          comparisonsAtMergeStart,
          efficiencyLog,
        });
      }
    }

    return { ...state, queue, left, right, buffer, initialLeftLength, initialRightLength, comparisonsAtMergeStart, efficiencyLog };
  }, []);

  const startSorter = useCallback((selectedGroupsData: Group[], filterSummary: FilterSummary) => {
    setPhase(GamePhase.LOADING);
    setLoadingMessage('Preparing the tournament...');

    let currentId = 0;
    const idolsToSort: Idol[] = selectedGroupsData.flatMap(group =>
      group.idols.map(idol => ({
        ...idol,
        id: currentId++,
        group: group.name,
        wins: 0,
      }))
    );

    const shuffledIdols = [...idolsToSort].sort(() => Math.random() - 0.5);

    const initialState = getInitialState();
    initialState.idols = idolsToSort;
    initialState.queue = shuffledIdols.map(i => [i]);
    initialState.totalInitialPairs = idolsToSort.length;
    initialState.filterSummary = filterSummary;

    const nextState = setNextMatchup(initialState);
    setSorterState(nextState);
    saveState(nextState);
    setPhase(GamePhase.PLAYING);
  }, [saveState, setNextMatchup]);

  useEffect(() => {
    try {
      const savedStateJSON = localStorage.getItem(SAVE_KEY);
      if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);

        const isValidState =
          savedState &&
          Array.isArray(savedState.idols) &&
          Array.isArray(savedState.queue) &&
          (savedState.left === null || Array.isArray(savedState.left)) &&
          (savedState.right === null || Array.isArray(savedState.right)) &&
          Array.isArray(savedState.buffer) &&
          Array.isArray(savedState.history);

        if (isValidState && savedState.idols.length > 0) {
          let stateToLoad: SorterState = savedState;

          stateToLoad.comparisonsAtMergeStart = stateToLoad.comparisonsAtMergeStart || 0;
          stateToLoad.efficiencyLog = stateToLoad.efficiencyLog || [];
          stateToLoad.filterSummary = stateToLoad.filterSummary || null;

          let hasValidMatchup = stateToLoad.left && stateToLoad.right && stateToLoad.left.length > 0 && stateToLoad.right.length > 0;
          const isFinished = stateToLoad.queue.length <= 1 && !hasValidMatchup;

          if (!isFinished && !hasValidMatchup) {
            stateToLoad = setNextMatchup(stateToLoad);
          }

          setSorterState(stateToLoad);

          hasValidMatchup = stateToLoad.left && stateToLoad.right && stateToLoad.left.length > 0 && stateToLoad.right.length > 0;
          if (stateToLoad.queue.length <= 1 && !hasValidMatchup) {
            setPhase(GamePhase.FINISHED);
          } else {
            setPhase(GamePhase.PLAYING);
          }
          return;
        } else {
          console.warn('Saved state was found but is invalid or empty. Clearing it.');
          localStorage.removeItem(SAVE_KEY);
        }
      }
    } catch (e) {
      console.error('Failed to load saved state, clearing it:', e);
      localStorage.removeItem(SAVE_KEY);
    }
    setPhase(GamePhase.SETUP);
  }, [setNextMatchup]);

  const processChoice = useCallback((chosen: 'left' | 'right' | 'tie') => {
    setSorterState(currentState => {
      if (!currentState.left?.[0] || !currentState.right?.[0]) {
        return currentState;
      }

      // Deep copy the state before the choice to prevent mutation from subsequent steps.
      const stateToSaveInHistory: Omit<SorterState, 'history' | 'idols'> = {
        queue: JSON.parse(JSON.stringify(currentState.queue)),
        left: JSON.parse(JSON.stringify(currentState.left)),
        right: JSON.parse(JSON.stringify(currentState.right)),
        buffer: JSON.parse(JSON.stringify(currentState.buffer)),
        totalInitialPairs: currentState.totalInitialPairs,
        initialLeftLength: currentState.initialLeftLength,
        initialRightLength: currentState.initialRightLength,
        comparisonsMade: currentState.comparisonsMade,
        comparisonsAtMergeStart: currentState.comparisonsAtMergeStart,
        efficiencyLog: JSON.parse(JSON.stringify(currentState.efficiencyLog)),
        filterSummary: currentState.filterSummary ? JSON.parse(JSON.stringify(currentState.filterSummary)) : null,
      };
      const newHistory = [...currentState.history, stateToSaveInHistory];

      const newLeft = [...currentState.left];
      const newRight = [...currentState.right];
      const newBuffer = [...currentState.buffer];

      if (chosen === 'left') {
        newBuffer.push(newLeft.shift()!);
      } else if (chosen === 'right') {
        newBuffer.push(newRight.shift()!);
      } else {
        newBuffer.push(newLeft.shift()!);
        newBuffer.push(newRight.shift()!);
      }

      const stateWithChoiceMade = {
        ...currentState,
        left: newLeft,
        right: newRight,
        buffer: newBuffer,
        history: newHistory,
        comparisonsMade: currentState.comparisonsMade + 1,
      };

      const nextState = setNextMatchup(stateWithChoiceMade);

      const { queue, left, right } = nextState;
      if (queue.length <= 1 && !left && !right) {
        setPhase(GamePhase.FINISHED);
      }

      saveState(nextState);
      return nextState;
    });
  }, [saveState, setNextMatchup]);

  const handleSelect = useCallback((winnerId: number) => {
    if (!sorterState.left?.[0] || !sorterState.right?.[0]) return;
    processChoice(winnerId === sorterState.left[0].id ? 'left' : 'right');
  }, [processChoice, sorterState.left, sorterState.right]);

  const handleTie = useCallback(() => {
    if (!sorterState.left?.[0] || !sorterState.right?.[0]) return;
    processChoice('tie');
  }, [processChoice, sorterState.left, sorterState.right]);

  const handleUndo = useCallback(() => {
    setSorterState(currentState => {
      const newHistory = [...currentState.history];
      const lastState = newHistory.pop();

      if (lastState) {
        if (phase === GamePhase.FINISHED) {
          setPhase(GamePhase.PLAYING);
        }

        const restoredState = {
          ...currentState,
          ...lastState,
          history: newHistory,
        };
        saveState(restoredState);
        return restoredState;
      }
      return currentState;
    });
  }, [phase, saveState]);

  const handleRestart = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
    setSorterState(getInitialState());
    setPhase(GamePhase.SETUP);
  }, []);

  const { left, right } = sorterState;

  return {
    phase,
    matchup: left && right && left.length > 0 && right.length > 0 ? [left[0], right[0]] as Matchup : null,
    progress: calculateProgress(),
    rankedList: phase === GamePhase.FINISHED ? sorterState.queue[0] || sorterState.buffer : null,
    loadingMessage,
    startSorter,
    handleSelect,
    handleTie,
    handleUndo,
    handleRestart,
    canUndo: sorterState.history.length > 0,
    comparisonsMade: sorterState.comparisonsMade,
    comparisonNumber: sorterState.comparisonsMade + 1,
    filterSummary: sorterState.filterSummary,
  };
};

export default useIdolSorter;