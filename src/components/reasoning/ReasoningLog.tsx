'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReasoningLogStore, selectCurrentPhase, selectRecentEntries, selectCycleMetrics } from '@/stores/reasoningLogStore';
import { getPhaseEmoji, getPhaseColor, getPhaseDescription } from '@/utils/phaseValidator';
import { ReasoningPhase, ReasoningLogEntry } from '@/types/graph.types';
import { PhaseIndicator } from './PhaseIndicator';
import { LogEntry } from './LogEntry';
import { CycleMetrics } from './CycleMetrics';

interface ReasoningLogProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const ReasoningLog: React.FC<ReasoningLogProps> = ({ isOpen, onToggle }) => {
  const currentPhase = useReasoningLogStore(selectCurrentPhase);
  const entries = useReasoningLogStore(selectRecentEntries);
  const metrics = useReasoningLogStore(selectCycleMetrics);

  return (
    <motion.aside
      className="reasoning-log-sidebar"
      initial={{ width: 0, opacity: 0 }}
      animate={{
        width: isOpen ? 360 : 48,
        opacity: 1
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="toggle-btn"
        aria-label={isOpen ? 'Close reasoning log' : 'Open reasoning log'}
      >
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ◀
        </motion.span>
      </button>

      {isOpen && (
        <div className="log-content">
          {/* Header */}
          <header className="log-header">
            <h2>Reasoning Log</h2>
            <span className="cycle-badge">Cycle #{metrics.cycleCount}</span>
          </header>

          {/* Current Phase Indicator */}
          <PhaseIndicator currentPhase={currentPhase} />

          {/* Cycle Metrics */}
          <CycleMetrics
            cycleCount={metrics.cycleCount}
            averageCycleTime={metrics.averageCycleTime}
          />

          {/* Phase Flow Visualization */}
          <div className="phase-flow">
            {(['perceiving', 'predicting', 'acting', 'updating_beliefs'] as ReasoningPhase[]).map((phase, index) => (
              <React.Fragment key={phase}>
                <motion.div
                  className={`phase-node ${currentPhase === phase ? 'active' : ''}`}
                  animate={{
                    scale: currentPhase === phase ? 1.2 : 1,
                    backgroundColor: currentPhase === phase ? getPhaseColor(phase) : '#374151'
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="phase-emoji">{getPhaseEmoji(phase)}</span>
                </motion.div>
                {index < 3 && (
                  <motion.div
                    className="phase-connector"
                    animate={{
                      backgroundColor: currentPhase === phase ? getPhaseColor(phase) : '#4b5563'
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Log Entries */}
          <div className="entries-container">
            <h3>Recent Activity</h3>
            <AnimatePresence mode="popLayout">
              {entries.map((entry) => (
                <LogEntry key={entry.id} entry={entry} />
              ))}
            </AnimatePresence>

            {entries.length === 0 && (
              <p className="no-entries">No activity yet. Agent is idle.</p>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .reasoning-log-sidebar {
          position: fixed;
          right: 0;
          top: 0;
          height: 100vh;
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          border-left: 1px solid #334155;
          overflow: hidden;
          z-index: 100;
          display: flex;
          flex-direction: column;
        }

        .toggle-btn {
          position: absolute;
          left: -12px;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 48px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 4px 0 0 4px;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .toggle-btn:hover {
          background: #334155;
        }

        .log-content {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }

        .log-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .log-header h2 {
          color: #f1f5f9;
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .cycle-badge {
          background: #3b82f6;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .phase-flow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 8px;
          background: #1e293b;
          border-radius: 8px;
          margin: 16px 0;
        }

        .phase-node {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .phase-node.active {
          box-shadow: 0 0 20px currentColor;
        }

        .phase-emoji {
          font-size: 18px;
        }

        .phase-connector {
          flex: 1;
          height: 2px;
          margin: 0 4px;
          border-radius: 1px;
        }

        .entries-container {
          margin-top: 20px;
        }

        .entries-container h3 {
          color: #94a3b8;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 12px;
        }

        .no-entries {
          color: #64748b;
          font-size: 14px;
          text-align: center;
          padding: 20px;
        }
      `}</style>
    </motion.aside>
  );
};

export default ReasoningLog;