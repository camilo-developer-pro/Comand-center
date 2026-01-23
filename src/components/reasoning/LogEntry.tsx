'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ReasoningLogEntry } from '@/types/graph.types';
import { getPhaseColor, getPhaseEmoji } from '@/utils/phaseValidator';

interface LogEntryProps {
  entry: ReasoningLogEntry;
}

export const LogEntry: React.FC<LogEntryProps> = ({ entry }) => {
  const timeAgo = React.useMemo(() => {
    const seconds = Math.floor((Date.now() - entry.timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  }, [entry.timestamp]);

  const confidencePercent = Math.round(entry.confidence * 100);

  return (
    <motion.div
      className="log-entry"
      initial={{ opacity: 0, x: 20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <div className="entry-header">
        <span
          className="entry-phase"
          style={{ color: getPhaseColor(entry.phase) }}
        >
          {getPhaseEmoji(entry.phase)} {entry.phase.replace('_', ' ')}
        </span>
        <span className="entry-time">{timeAgo}</span>
      </div>

      <p className="entry-description">{entry.description}</p>

      <div className="entry-footer">
        <div className="confidence-bar">
          <div
            className="confidence-fill"
            style={{
              width: `${confidencePercent}%`,
              backgroundColor: confidencePercent > 70 ? '#10b981' :
                              confidencePercent > 40 ? '#f59e0b' : '#ef4444'
            }}
          />
        </div>
        <span className="confidence-label">{confidencePercent}% confidence</span>
      </div>

      {entry.affectedNodes.length > 0 && (
        <div className="affected-nodes">
          {entry.affectedNodes.slice(0, 3).map(nodeId => (
            <span key={nodeId} className="node-badge">{nodeId}</span>
          ))}
          {entry.affectedNodes.length > 3 && (
            <span className="node-badge more">+{entry.affectedNodes.length - 3}</span>
          )}
        </div>
      )}

      <style jsx>{`
        .log-entry {
          background: #0f172a;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 8px;
          border-left: 3px solid #334155;
        }

        .entry-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .entry-phase {
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .entry-time {
          color: #64748b;
          font-size: 11px;
        }

        .entry-description {
          color: #e2e8f0;
          font-size: 13px;
          line-height: 1.4;
          margin: 0 0 10px 0;
        }

        .entry-footer {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .confidence-bar {
          flex: 1;
          height: 4px;
          background: #374151;
          border-radius: 2px;
          overflow: hidden;
        }

        .confidence-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .confidence-label {
          color: #94a3b8;
          font-size: 11px;
          white-space: nowrap;
        }

        .affected-nodes {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 8px;
        }

        .node-badge {
          background: #1e293b;
          color: #94a3b8;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-family: monospace;
        }

        .node-badge.more {
          background: #334155;
        }
      `}</style>
    </motion.div>
  );
};