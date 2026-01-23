import { ReasoningPhase } from '@/types/graph.types';

// Valid state transitions for Active Inference loop
const VALID_TRANSITIONS: Record<ReasoningPhase, ReasoningPhase[]> = {
  idle: ['perceiving'],
  perceiving: ['predicting', 'idle'],
  predicting: ['acting', 'perceiving'], // Can loop back if prediction fails
  acting: ['updating_beliefs', 'predicting'], // Can retry prediction
  updating_beliefs: ['perceiving', 'idle'] // Complete cycle or stop
};

export const isValidTransition = (from: ReasoningPhase, to: ReasoningPhase): boolean => {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
};

export const getPhaseEmoji = (phase: ReasoningPhase): string => {
  const emojis: Record<ReasoningPhase, string> = {
    idle: '⏸️',
    perceiving: '👁️',
    predicting: '🔮',
    acting: '⚡',
    updating_beliefs: '🧠'
  };
  return emojis[phase];
};

export const getPhaseColor = (phase: ReasoningPhase): string => {
  const colors: Record<ReasoningPhase, string> = {
    idle: '#6b7280',
    perceiving: '#3b82f6',
    predicting: '#8b5cf6',
    acting: '#f59e0b',
    updating_beliefs: '#10b981'
  };
  return colors[phase];
};

export const getPhaseDescription = (phase: ReasoningPhase): string => {
  const descriptions: Record<ReasoningPhase, string> = {
    idle: 'Agent is inactive',
    perceiving: 'Gathering sensory data from graph state',
    predicting: 'Generating predictions based on beliefs',
    acting: 'Executing action to minimize prediction error',
    updating_beliefs: 'Updating internal model with new evidence'
  };
  return descriptions[phase];
};