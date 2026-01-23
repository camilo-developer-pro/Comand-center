'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ReasoningPhase } from '@/types/graph.types';
import { getPhaseEmoji, getPhaseColor, getPhaseDescription } from '@/utils/phaseValidator';

interface PhaseIndicatorProps {
  currentPhase: ReasoningPhase;
}

export const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({ currentPhase }) => {
  const phaseColor = getPhaseColor(currentPhase);
  const isActive = currentPhase !== 'idle';

  return (
    <motion.div
      className="phase-indicator"
      animate={{
        borderColor: phaseColor,
        boxShadow: isActive ? `0 0 30px ${phaseColor}40` : 'none'
      }}
      transition={{ duration: 0.5 }}
    >
      <div className="indicator-content">
        <motion.div
          className="pulse-ring"
          animate={isActive ? {
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5]
          } : {}}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{ backgroundColor: phaseColor }}
        />

        <span className="phase-emoji">{getPhaseEmoji(currentPhase)}</span>

        <div className="phase-text">
          <span className="phase-label" style={{ color: phaseColor }}>
            {currentPhase.replace('_', ' ').toUpperCase()}
          </span>
          <span className="phase-description">
            {getPhaseDescription(currentPhase)}
          </span>
        </div>
      </div>

      <style jsx>{`
        .phase-indicator {
          background: #1e293b;
          border: 2px solid;
          border-radius: 12px;
          padding: 16px;
          position: relative;
          overflow: hidden;
        }

        .indicator-content {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 1;
        }

        .pulse-ring {
          position: absolute;
          left: 8px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          opacity: 0.5;
        }

        .phase-emoji {
          font-size: 24px;
          width: 32px;
          text-align: center;
        }

        .phase-text {
          display: flex;
          flex-direction: column;
        }

        .phase-label {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .phase-description {
          color: #94a3b8;
          font-size: 12px;
          margin-top: 2px;
        }
      `}</style>
    </motion.div>
  );
};