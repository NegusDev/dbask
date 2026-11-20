// src/core/agent/observability.ts
/**
 * One tool call as seen by an {@link AgentObserver}.
 *
 * @experimental New fields and event types may be added in any release.
 */
export type AgentToolEvent =
  | {
      type: 'tool-start';
      name: string;
      input: unknown;
    }
  | {
      type: 'tool-end';
      name: string;
      input: unknown;
      success: boolean;
      durationMs: number;
      data?: unknown;
      error?: string;
      databaseExecutionAttempted?: boolean;
    };

/**
 * Receives tool events while the agent runs.
 *
 * @experimental May change in any release.
 */
export interface AgentObserver {
  onToolEvent(event: AgentToolEvent): void;
}

export const noopAgentObserver: AgentObserver = {
  onToolEvent: () => undefined,
};
