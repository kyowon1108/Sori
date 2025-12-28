'use client';

import { useMemo } from 'react';
import {
  AgentPhase,
  AgentPhaseInfo,
  AGENT_PHASES,
  ToolExecution,
  TOOL_DISPLAY_NAMES,
} from '@/types/calls';

interface AgentStatusProps {
  currentPhase: AgentPhase | null;
  toolExecutions: ToolExecution[];
  isProcessing: boolean;
  className?: string;
}

/**
 * AgentStatus - Displays the current agent processing phase and tool executions.
 *
 * Shows a visual indicator of the Perceive-Plan-Act-Reflect loop
 * and any tools being executed.
 */
export function AgentStatus({
  currentPhase,
  toolExecutions,
  isProcessing,
  className = '',
}: AgentStatusProps) {
  // Phase visualization
  const phases: AgentPhase[] = ['perceive', 'plan', 'act', 'reflect'];

  const currentPhaseIndex = useMemo(() => {
    if (!currentPhase) return -1;
    return phases.indexOf(currentPhase);
  }, [currentPhase]);

  if (!isProcessing && toolExecutions.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gray-50 rounded-lg p-3 ${className}`}>
      {/* Phase Progress */}
      {isProcessing && currentPhase && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">
              AI 처리 중
            </span>
            <span className="text-xs text-gray-500">
              {AGENT_PHASES[currentPhase]?.description}
            </span>
          </div>

          {/* Phase Steps */}
          <div className="flex items-center gap-1">
            {phases.map((phase, index) => {
              const phaseInfo = AGENT_PHASES[phase];
              const isActive = phase === currentPhase;
              const isPast = currentPhaseIndex > index;
              const isFuture = currentPhaseIndex < index;

              return (
                <div key={phase} className="flex items-center flex-1">
                  {/* Step Circle */}
                  <div
                    className={`
                      flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                      transition-all duration-300
                      ${isActive ? 'bg-blue-500 text-white ring-2 ring-blue-200' : ''}
                      ${isPast ? 'bg-green-500 text-white' : ''}
                      ${isFuture ? 'bg-gray-200 text-gray-400' : ''}
                    `}
                  >
                    {isPast ? (
                      <CheckIcon className="w-3 h-3" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  {/* Connector Line */}
                  {index < phases.length - 1 && (
                    <div
                      className={`
                        flex-1 h-0.5 mx-1 transition-all duration-300
                        ${isPast ? 'bg-green-500' : 'bg-gray-200'}
                      `}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Phase Labels */}
          <div className="flex items-center mt-1">
            {phases.map((phase, index) => (
              <div
                key={`label-${phase}`}
                className="flex-1 text-center text-[10px] text-gray-500"
              >
                {AGENT_PHASES[phase].label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tool Executions */}
      {toolExecutions.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-gray-600">도구 실행</span>
          {toolExecutions.map((tool) => (
            <ToolExecutionItem key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ToolExecutionItem - Displays a single tool execution status.
 */
function ToolExecutionItem({ tool }: { tool: ToolExecution }) {
  const displayName = TOOL_DISPLAY_NAMES[tool.toolName] || tool.toolName;

  const statusStyles = {
    pending: 'bg-gray-100 text-gray-600',
    executing: 'bg-blue-100 text-blue-700 animate-pulse',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };

  const statusLabels = {
    pending: '대기 중',
    executing: '실행 중',
    completed: '완료',
    failed: '실패',
  };

  return (
    <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
      <div className="flex items-center gap-2">
        <ToolIcon className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-700">{displayName}</span>
      </div>
      <span
        className={`
          px-2 py-0.5 rounded-full text-xs font-medium
          ${statusStyles[tool.status]}
        `}
      >
        {statusLabels[tool.status]}
      </span>
    </div>
  );
}

/**
 * TypingIndicator - Shows when the AI is composing a response.
 */
export function TypingIndicator({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-gray-500 ${className}`}>
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm">AI가 응답을 작성하고 있어요...</span>
    </div>
  );
}

// Icon Components
function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ToolIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

export default AgentStatus;
