import { create } from 'zustand';
import { ReasoningPhase, ReasoningLogEntry } from '@/types/graph.types';

interface ReasoningLogState {
  entries: ReasoningLogEntry[];
  currentPhase: ReasoningPhase;
  phaseHistory: { phase: ReasoningPhase; timestamp: number }[];
  cycleCount: number;
  isAgentActive: boolean;

  // Metrics
  averageCycleTime: number;
  confidenceHistory: number[];

  // Actions
  addEntry: (entry: ReasoningLogEntry) => void;
  setCurrentPhase: (phase: ReasoningPhase) => void;
  clearEntries: () => void;
  setAgentActive: (active: boolean) => void;
}

const MAX_ENTRIES = 100;
const MAX_CONFIDENCE_HISTORY = 50;

const calculateAverageCycleTime = (history: { phase: ReasoningPhase; timestamp: number }[]): number => {
  const cycles: number[] = [];
  let cycleStart = 0;

  for (let i = 0; i < history.length; i++) {
    if (history[i].phase === 'perceiving') {
      if (cycleStart > 0) {
        cycles.push(history[i].timestamp - cycleStart);
      }
      cycleStart = history[i].timestamp;
    }
  }

  if (cycles.length === 0) return 0;
  return cycles.reduce((a, b) => a + b, 0) / cycles.length;
};

export const useReasoningLogStore = create<ReasoningLogState>((set, get) => ({
  entries: [],
  currentPhase: 'idle',
  phaseHistory: [],
  cycleCount: 0,
  isAgentActive: false,
  averageCycleTime: 0,
  confidenceHistory: [],

  addEntry: (entry) => set((state) => {
    const newEntries = [entry, ...state.entries].slice(0, MAX_ENTRIES);
    const newConfidenceHistory = [entry.confidence, ...state.confidenceHistory].slice(0, MAX_CONFIDENCE_HISTORY);

    return {
      entries: newEntries,
      confidenceHistory: newConfidenceHistory
    };
  }),

  setCurrentPhase: (phase) => set((state) => {
    const now = Date.now();
    const newPhaseHistory = [...state.phaseHistory, { phase, timestamp: now }].slice(-100);

    // Count cycles (each 'perceiving' starts a new cycle)
    const newCycleCount = phase === 'perceiving' ? state.cycleCount + 1 : state.cycleCount;

    // Calculate average cycle time
    const averageCycleTime = calculateAverageCycleTime(newPhaseHistory);

    return {
      currentPhase: phase,
      phaseHistory: newPhaseHistory,
      cycleCount: newCycleCount,
      averageCycleTime,
      isAgentActive: phase !== 'idle'
    };
  }),

  clearEntries: () => set({
    entries: [],
    phaseHistory: [],
    cycleCount: 0,
    confidenceHistory: []
  }),

  setAgentActive: (active) => set({
    isAgentActive: active,
    currentPhase: active ? 'perceiving' : 'idle'
  })
}));

// Selectors for optimized re-renders
export const selectCurrentPhase = (state: ReasoningLogState) => state.currentPhase;
export const selectRecentEntries = (state: ReasoningLogState) => state.entries.slice(0, 10);
export const selectCycleMetrics = (state: ReasoningLogState) => ({
  cycleCount: state.cycleCount,
  averageCycleTime: state.averageCycleTime
});