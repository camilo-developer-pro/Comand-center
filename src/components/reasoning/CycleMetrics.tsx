'use client';

import React from 'react';

interface CycleMetricsProps {
  cycleCount: number;
  averageCycleTime: number;
}

export const CycleMetrics: React.FC<CycleMetricsProps> = ({
  cycleCount,
  averageCycleTime
}) => {
  const formatTime = (ms: number): string => {
    if (ms === 0) return '--';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="cycle-metrics">
      <div className="metric">
        <span className="metric-value">{cycleCount}</span>
        <span className="metric-label">Total Cycles</span>
      </div>
      <div className="metric">
        <span className="metric-value">{formatTime(averageCycleTime)}</span>
        <span className="metric-label">Avg. Cycle Time</span>
      </div>

      <style jsx>{`
        .cycle-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin: 12px 0;
        }

        .metric {
          background: #0f172a;
          padding: 12px;
          border-radius: 8px;
          text-align: center;
        }

        .metric-value {
          display: block;
          color: #f1f5f9;
          font-size: 24px;
          font-weight: 700;
          font-family: monospace;
        }

        .metric-label {
          color: #64748b;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  );
};